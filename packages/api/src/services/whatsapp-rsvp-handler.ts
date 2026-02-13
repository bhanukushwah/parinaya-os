import { db } from "@parinaya-os/db";
import { guestUnitMembers, guestUnits } from "@parinaya-os/db/schema/guests";
import {
	rsvpFlowSessions,
	rsvpPersonResponses,
} from "@parinaya-os/db/schema/rsvp";
import { and, desc, eq, sql } from "drizzle-orm";

import {
	advanceRsvpFlow,
	parseAttendanceEdits,
	parseRsvpChoice,
	type RsvpChoice,
} from "./whatsapp-rsvp-flow";

type PersonResponseRecord = {
	personId: string;
	response: RsvpChoice;
};

type RsvpSessionRecord = {
	id: string;
	weddingId: string;
	eventId: string;
	guestUnitId: string;
	phoneE164: string;
	flowStatus: "active" | "completed" | "cancelled" | "expired";
	stepIndex: number;
	finalResponse: RsvpChoice | null;
	completedAt: Date | null;
};

type RsvpRepository = {
	findGuestUnitByPhone(input: {
		weddingId: string;
		phoneE164: string;
	}): Promise<{ guestUnitId: string; identityId: string | null } | null>;
	listGuestUnitPeople(input: {
		weddingId: string;
		guestUnitId: string;
	}): Promise<Array<{ personId: string }>>;
	findLatestSession(input: {
		weddingId: string;
		eventId: string;
		phoneE164: string;
	}): Promise<RsvpSessionRecord | null>;
	createSession(input: {
		weddingId: string;
		eventId: string;
		guestUnitId: string;
		identityId: string | null;
		phoneE164: string;
		providerConversationId?: string | null;
		providerMessageId?: string | null;
	}): Promise<RsvpSessionRecord>;
	updateSession(input: {
		sessionId: string;
		stepIndex: number;
		flowStatus: "active" | "completed";
		finalResponse: RsvpChoice | null;
		providerMessageId?: string | null;
		providerConversationId?: string | null;
		confirmationSummary?: Record<string, unknown>;
	}): Promise<void>;
	upsertPersonResponses(input: {
		sessionId: string;
		weddingId: string;
		eventId: string;
		guestUnitId: string;
		responses: PersonResponseRecord[];
	}): Promise<number>;
	countResponses(input: {
		weddingId: string;
		eventId: string;
		guestUnitId: string;
	}): Promise<{ accepted: number; declined: number; total: number }>;
};

export type HandleWhatsAppRsvpInput = {
	weddingId: string;
	eventId: string;
	phoneE164: string;
	messageText: string;
	providerConversationId?: string | null;
	providerMessageId?: string | null;
};

export type WhatsAppRsvpHandlerResult = {
	status: "not-invitee" | "invalid-input" | "progressed" | "completed";
	step: 1 | 2 | 3;
	label: "Complete RSVP" | "Update RSVP";
	nextAction: "start" | "attendance" | "confirm" | "done" | "retry";
	message: string;
	summary?: {
		accepted: number;
		declined: number;
		total: number;
	};
};

const defaultRepository: RsvpRepository = {
	async findGuestUnitByPhone(input) {
		const guestUnit = await db.query.guestUnits.findFirst({
			where: and(
				eq(guestUnits.weddingId, input.weddingId),
				eq(guestUnits.isActive, true),
			),
			columns: {
				id: true,
				deliveryIdentityId: true,
			},
			with: {
				deliveryIdentity: {
					columns: {
						id: true,
						normalizedPhoneE164: true,
						isActive: true,
					},
				},
			},
		});

		if (
			!guestUnit?.deliveryIdentity ||
			guestUnit.deliveryIdentity.normalizedPhoneE164 !== input.phoneE164 ||
			!guestUnit.deliveryIdentity.isActive
		) {
			return null;
		}

		return {
			guestUnitId: guestUnit.id,
			identityId: guestUnit.deliveryIdentity.id,
		};
	},

	async listGuestUnitPeople(input) {
		const members = await db.query.guestUnitMembers.findMany({
			where: and(
				eq(guestUnitMembers.weddingId, input.weddingId),
				eq(guestUnitMembers.guestUnitId, input.guestUnitId),
				eq(guestUnitMembers.isActive, true),
			),
			columns: {
				personId: true,
			},
		});

		return members;
	},

	async findLatestSession(input) {
		const session = await db.query.rsvpFlowSessions.findFirst({
			where: and(
				eq(rsvpFlowSessions.weddingId, input.weddingId),
				eq(rsvpFlowSessions.eventId, input.eventId),
				eq(rsvpFlowSessions.phoneE164, input.phoneE164),
			),
			orderBy: [desc(rsvpFlowSessions.updatedAt)],
			columns: {
				id: true,
				weddingId: true,
				eventId: true,
				guestUnitId: true,
				phoneE164: true,
				flowStatus: true,
				stepIndex: true,
				finalResponse: true,
				completedAt: true,
			},
		});

		return session ?? null;
	},

	async createSession(input) {
		const [created] = await db
			.insert(rsvpFlowSessions)
			.values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				eventId: input.eventId,
				guestUnitId: input.guestUnitId,
				identityId: input.identityId,
				phoneE164: input.phoneE164,
				providerConversationId: input.providerConversationId ?? null,
				lastProviderMessageId: input.providerMessageId ?? null,
				currentStep: "identity-response",
				stepIndex: 1,
				flowStatus: "active",
			})
			.returning({
				id: rsvpFlowSessions.id,
				weddingId: rsvpFlowSessions.weddingId,
				eventId: rsvpFlowSessions.eventId,
				guestUnitId: rsvpFlowSessions.guestUnitId,
				phoneE164: rsvpFlowSessions.phoneE164,
				flowStatus: rsvpFlowSessions.flowStatus,
				stepIndex: rsvpFlowSessions.stepIndex,
				finalResponse: rsvpFlowSessions.finalResponse,
				completedAt: rsvpFlowSessions.completedAt,
			});

		if (!created) {
			throw new Error("Failed to create RSVP flow session");
		}

		return created;
	},

	async updateSession(input) {
		const stepByIndex = {
			1: "identity-response",
			2: "attendance-details",
			3: "final-confirmation",
		} as const;

		await db
			.update(rsvpFlowSessions)
			.set({
				stepIndex: input.stepIndex,
				currentStep: stepByIndex[input.stepIndex as 1 | 2 | 3],
				flowStatus: input.flowStatus,
				finalResponse: input.finalResponse,
				completedAt: input.flowStatus === "completed" ? new Date() : null,
				confirmationSummary: input.confirmationSummary ?? null,
				providerConversationId: input.providerConversationId ?? null,
				lastProviderMessageId: input.providerMessageId ?? null,
				lastInboundAt: new Date(),
			})
			.where(eq(rsvpFlowSessions.id, input.sessionId));
	},

	async upsertPersonResponses(input) {
		for (const response of input.responses) {
			const existing = await db.query.rsvpPersonResponses.findFirst({
				where: and(
					eq(rsvpPersonResponses.weddingId, input.weddingId),
					eq(rsvpPersonResponses.eventId, input.eventId),
					eq(rsvpPersonResponses.personId, response.personId),
				),
				columns: {
					id: true,
					responseRevision: true,
				},
			});

			if (existing) {
				await db
					.update(rsvpPersonResponses)
					.set({
						flowSessionId: input.sessionId,
						guestUnitId: input.guestUnitId,
						response: response.response,
						responseRevision: existing.responseRevision + 1,
						respondedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(rsvpPersonResponses.id, existing.id));
				continue;
			}

			await db.insert(rsvpPersonResponses).values({
				id: crypto.randomUUID(),
				flowSessionId: input.sessionId,
				weddingId: input.weddingId,
				eventId: input.eventId,
				guestUnitId: input.guestUnitId,
				personId: response.personId,
				response: response.response,
				source: "whatsapp",
				responseRevision: 1,
			});
		}

		return input.responses.length;
	},

	async countResponses(input) {
		const [row] = await db
			.select({
				accepted: sql<number>`sum(case when ${rsvpPersonResponses.response} = 'accept' then 1 else 0 end)`,
				declined: sql<number>`sum(case when ${rsvpPersonResponses.response} = 'decline' then 1 else 0 end)`,
				total: sql<number>`count(*)`,
			})
			.from(rsvpPersonResponses)
			.where(
				and(
					eq(rsvpPersonResponses.weddingId, input.weddingId),
					eq(rsvpPersonResponses.eventId, input.eventId),
					eq(rsvpPersonResponses.guestUnitId, input.guestUnitId),
				),
			);

		return {
			accepted: row?.accepted ?? 0,
			declined: row?.declined ?? 0,
			total: row?.total ?? 0,
		};
	},
};

function getLabel(session: RsvpSessionRecord | null) {
	if (!session || session.flowStatus !== "completed") {
		return "Complete RSVP" as const;
	}

	return "Update RSVP" as const;
}

function stepFromIndex(value: number): 1 | 2 | 3 {
	if (value >= 3) {
		return 3;
	}

	if (value <= 1) {
		return 1;
	}

	return 2;
}

export async function handleWhatsAppRsvpInput(
	input: HandleWhatsAppRsvpInput,
	deps: { repository?: RsvpRepository } = {},
): Promise<WhatsAppRsvpHandlerResult> {
	const repository = deps.repository ?? defaultRepository;
	const resolvedGuest = await repository.findGuestUnitByPhone({
		weddingId: input.weddingId,
		phoneE164: input.phoneE164,
	});

	if (!resolvedGuest) {
		return {
			status: "not-invitee",
			step: 1,
			label: "Complete RSVP",
			nextAction: "retry",
			message:
				"We could not match this number to an invite. Please use your invite WhatsApp thread.",
		};
	}

	let session = await repository.findLatestSession({
		weddingId: input.weddingId,
		eventId: input.eventId,
		phoneE164: input.phoneE164,
	});
	const hadCompletedSession = session?.flowStatus === "completed";

	if (!session || session.flowStatus !== "active") {
		session = await repository.createSession({
			weddingId: input.weddingId,
			eventId: input.eventId,
			guestUnitId: resolvedGuest.guestUnitId,
			identityId: resolvedGuest.identityId,
			phoneE164: input.phoneE164,
			providerConversationId: input.providerConversationId,
			providerMessageId: input.providerMessageId,
		});
	}

	const attendanceEdits = parseAttendanceEdits(input.messageText);
	if (attendanceEdits.length > 0) {
		const guestUnitPeople = await repository.listGuestUnitPeople({
			weddingId: input.weddingId,
			guestUnitId: session.guestUnitId,
		});

		const personIdSet = new Set(
			guestUnitPeople.map((person) => person.personId),
		);
		const scopedEdits = attendanceEdits.filter((edit) =>
			personIdSet.has(edit.personId),
		);

		if (scopedEdits.length > 0) {
			await repository.upsertPersonResponses({
				sessionId: session.id,
				weddingId: input.weddingId,
				eventId: input.eventId,
				guestUnitId: session.guestUnitId,
				responses: scopedEdits,
			});
		}
	}

	const flow = advanceRsvpFlow({
		state: {
			step: stepFromIndex(session.stepIndex),
			isCompleted: session.flowStatus === "completed",
			finalResponse: session.finalResponse,
			hasExistingResponse: session.flowStatus === "completed",
		},
		messageText: input.messageText,
		personResponseCount: attendanceEdits.length,
	});

	if (flow.nextAction === "invalid-input") {
		return {
			status: "invalid-input",
			step: flow.step,
			label: hadCompletedSession ? "Update RSVP" : getLabel(session),
			nextAction: "retry",
			message: flow.errorMessage ?? "Invalid RSVP input.",
		};
	}

	const parsedChoice = parseRsvpChoice(input.messageText);
	const nextFinalResponse =
		flow.finalResponse ?? session.finalResponse ?? parsedChoice ?? "accept";

	let responseSummary:
		| { accepted: number; declined: number; total: number }
		| undefined;

	if (flow.isCompleted) {
		responseSummary = await repository.countResponses({
			weddingId: input.weddingId,
			eventId: input.eventId,
			guestUnitId: session.guestUnitId,
		});
	}

	await repository.updateSession({
		sessionId: session.id,
		stepIndex: flow.step,
		flowStatus: flow.isCompleted ? "completed" : "active",
		finalResponse: nextFinalResponse,
		providerConversationId: input.providerConversationId,
		providerMessageId: input.providerMessageId,
		confirmationSummary: responseSummary,
	});

	if (flow.isCompleted) {
		return {
			status: "completed",
			step: 3,
			label: "Update RSVP",
			nextAction: "done",
			message: `RSVP confirmed. Accepted: ${responseSummary?.accepted ?? 0}, Declined: ${responseSummary?.declined ?? 0}. Reply update anytime to revise.`,
			summary: responseSummary,
		};
	}

	return {
		status: "progressed",
		step: flow.step,
		label: hadCompletedSession ? "Update RSVP" : getLabel(session),
		nextAction: flow.step === 2 ? "attendance" : "confirm",
		message:
			flow.step === 2
				? "Share person responses as personId=accept,personId=decline."
				: "Review your updates and reply confirm to finalize RSVP.",
	};
}
