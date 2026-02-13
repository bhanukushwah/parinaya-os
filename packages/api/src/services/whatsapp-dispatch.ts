import { db } from "@parinaya-os/db";
import {
	inviteDoNotMessages,
	inviteMessages,
	inviteSendRuns,
} from "@parinaya-os/db/schema/whatsapp";
import { and, eq, isNull } from "drizzle-orm";
import { buildAudience } from "./audience-builder";
import { AUDIT_ACTIONS, writeAuditLog } from "./audit-log";
import {
	createDoNotMessageLookup,
	evaluateSendEligibility,
} from "./whatsapp-policy";
import { sendTemplateInvite } from "./whatsapp-provider";

type DispatchInviteRunInput = {
	weddingId: string;
	eventId: string;
	actorMembershipId: string;
	templateName: string;
	templateLanguage: string;
	audience: {
		side?: "bride" | "groom" | "neutral" | null;
		tagIds?: string[];
		search?: string | null;
		includeGuestUnitIds?: string[];
		excludeGuestUnitIds?: string[];
	};
};

export type DispatchInviteRunResult = {
	runId: string;
	weddingId: string;
	eventId: string;
	totalCandidates: number;
	eligibleCount: number;
	blockedCount: number;
	sentCount: number;
	failedCount: number;
	status: "completed" | "failed" | "partial";
	createdAt: Date;
	completedAt: Date;
};

function deriveRunStatus(input: {
	eligibleCount: number;
	blockedCount: number;
	sentCount: number;
	failedCount: number;
}): "completed" | "failed" | "partial" {
	if (input.failedCount > 0 && input.sentCount === 0) {
		return "failed";
	}

	if (input.failedCount > 0) {
		return "partial";
	}

	if (input.blockedCount > 0 && input.eligibleCount > 0) {
		return "partial";
	}

	return "completed";
}

export async function dispatchInviteRun(
	input: DispatchInviteRunInput,
): Promise<DispatchInviteRunResult> {
	const startedAt = new Date();
	const audience = await buildAudience({
		weddingId: input.weddingId,
		side: input.audience.side,
		tagIds: input.audience.tagIds,
		search: input.audience.search,
		includeGuestUnitIds: input.audience.includeGuestUnitIds,
		excludeGuestUnitIds: input.audience.excludeGuestUnitIds,
	});

	const runId = crypto.randomUUID();
	await db.insert(inviteSendRuns).values({
		id: runId,
		weddingId: input.weddingId,
		eventId: input.eventId,
		status: "running",
		templateName: input.templateName,
		templateLanguage: input.templateLanguage,
		audienceSnapshot: {
			filters: input.audience,
			trace: audience.trace,
		},
		totalCandidates: audience.recipients.recipientCount,
		startedAt,
		createdByMembershipId: input.actorMembershipId,
		updatedByMembershipId: input.actorMembershipId,
	});

	const activeDnmRows = await db.query.inviteDoNotMessages.findMany({
		columns: {
			phoneE164: true,
			reasonNote: true,
		},
		where: and(
			eq(inviteDoNotMessages.weddingId, input.weddingId),
			eq(inviteDoNotMessages.isActive, true),
			isNull(inviteDoNotMessages.revokedAt),
		),
	});

	const dnmLookup = createDoNotMessageLookup(activeDnmRows);

	let eligibleCount = 0;
	let blockedCount = 0;
	let sentCount = 0;
	let failedCount = 0;

	for (const target of audience.recipients.recipients) {
		const firstSource = target.sources[0];
		const eligibility = evaluateSendEligibility({
			recipientPhoneE164: target.phoneE164,
			sourceCount: target.sources.length,
			isInviteable: true,
			doNotMessageEntry: dnmLookup.get(target.phoneE164) ?? null,
			providerConfigured: true,
		});

		if (!eligibility.allowed) {
			blockedCount += 1;
			await db.insert(inviteMessages).values({
				id: crypto.randomUUID(),
				inviteRunId: runId,
				weddingId: input.weddingId,
				eventId: input.eventId,
				recipientGuestUnitId: firstSource?.guestUnitId ?? null,
				recipientPhoneE164: target.phoneE164,
				lifecycleStatus: "failed",
				isBlocked: true,
				rejectionReason: eligibility.reason,
				providerErrorMessage: eligibility.detail,
				failedAt: new Date(),
				lastStatusAt: new Date(),
			});
			continue;
		}

		eligibleCount += 1;
		const providerResult = await sendTemplateInvite({
			recipientPhoneE164: target.phoneE164,
			templateName: input.templateName,
			templateLanguage: input.templateLanguage,
		});

		if (providerResult.ok) {
			sentCount += 1;
			await db.insert(inviteMessages).values({
				id: crypto.randomUUID(),
				inviteRunId: runId,
				weddingId: input.weddingId,
				eventId: input.eventId,
				recipientGuestUnitId: firstSource?.guestUnitId ?? null,
				recipientPhoneE164: target.phoneE164,
				lifecycleStatus: "sent",
				isBlocked: false,
				providerMessageId: providerResult.providerMessageId,
				dispatchedAt: new Date(),
				lastStatusAt: new Date(),
			});
			continue;
		}

		failedCount += 1;
		await db.insert(inviteMessages).values({
			id: crypto.randomUUID(),
			inviteRunId: runId,
			weddingId: input.weddingId,
			eventId: input.eventId,
			recipientGuestUnitId: firstSource?.guestUnitId ?? null,
			recipientPhoneE164: target.phoneE164,
			lifecycleStatus: "failed",
			isBlocked: false,
			providerErrorCode: providerResult.errorCode,
			providerErrorMessage: providerResult.errorMessage,
			failedAt: new Date(),
			lastStatusAt: new Date(),
		});
	}

	const completedAt = new Date();
	const status = deriveRunStatus({
		eligibleCount,
		blockedCount,
		sentCount,
		failedCount,
	});

	await db
		.update(inviteSendRuns)
		.set({
			status,
			eligibleCount,
			blockedCount,
			sentCount,
			failedCount,
			completedAt,
			failedAt: status === "failed" ? completedAt : null,
			failureReason:
				status === "failed" && failedCount > 0
					? "No recipient dispatches succeeded."
					: null,
			updatedByMembershipId: input.actorMembershipId,
		})
		.where(eq(inviteSendRuns.id, runId));

	await writeAuditLog(db, {
		weddingId: input.weddingId,
		actorMembershipId: input.actorMembershipId,
		actionType: AUDIT_ACTIONS.INVITE_SEND,
		targetType: "invite",
		targetId: runId,
		afterSummary: {
			eventId: input.eventId,
			templateName: input.templateName,
			templateLanguage: input.templateLanguage,
			totalCandidates: audience.recipients.recipientCount,
			eligibleCount,
			blockedCount,
			sentCount,
			failedCount,
			status,
		},
	});

	return {
		runId,
		weddingId: input.weddingId,
		eventId: input.eventId,
		totalCandidates: audience.recipients.recipientCount,
		eligibleCount,
		blockedCount,
		sentCount,
		failedCount,
		status,
		createdAt: startedAt,
		completedAt,
	};
}
