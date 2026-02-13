import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import {
	inviteDoNotMessages,
	inviteMessages,
	inviteSendRuns,
} from "@parinaya-os/db/schema/whatsapp";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	getRoleByMembership,
} from "../policies/authorize";
import { buildAudience } from "../services/audience-builder";
import { dispatchInviteRun } from "../services/whatsapp-dispatch";
import {
	createDoNotMessageLookup,
	evaluateSendEligibility,
} from "../services/whatsapp-policy";

const weddingScopedInput = z.object({
	weddingId: z.string().min(1),
});

const sendInviteRunInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1),
	templateName: z.string().trim().min(1).max(120),
	templateLanguage: z.string().trim().min(1).max(16).default("en"),
	side: z.enum(["bride", "groom", "neutral"]).optional().nullable(),
	tagIds: z.array(z.string().min(1)).optional(),
	search: z.string().trim().optional().nullable(),
	includeGuestUnitIds: z.array(z.string().min(1)).optional(),
	excludeGuestUnitIds: z.array(z.string().min(1)).optional(),
});

const listInviteRunsInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1).optional(),
	limit: z.number().int().positive().max(100).default(50),
});

const inviteRunDetailInput = z.object({
	weddingId: z.string().min(1),
	runId: z.string().min(1),
});

async function getMembershipForUser(weddingId: string, userId: string) {
	return db.query.weddingMemberships.findFirst({
		columns: {
			id: true,
			role: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, weddingId),
			eq(weddingMemberships.userId, userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});
}

async function assertInviteReadAccess(input: {
	weddingId: string;
	userId: string;
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);
	assertCan(role, "guest.read");
}

async function assertInviteSendAccess(input: {
	weddingId: string;
	userId: string;
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);

	if (role !== "owner" && role !== "admin") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only Parent Admin can trigger invite sends.",
		});
	}
}

export const invitesRouter = {
	precheckSend: protectedProcedure
		.input(sendInviteRunInput)
		.handler(async ({ context, input }) => {
			await assertInviteReadAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const audience = await buildAudience({
				weddingId: input.weddingId,
				side: input.side,
				tagIds: input.tagIds,
				search: input.search,
				includeGuestUnitIds: input.includeGuestUnitIds,
				excludeGuestUnitIds: input.excludeGuestUnitIds,
			});

			const dnmRows = await db.query.inviteDoNotMessages.findMany({
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
			const dnmLookup = createDoNotMessageLookup(dnmRows);

			let eligibleCount = 0;
			let blockedCount = 0;
			const blockedSamples: Array<{
				phoneE164: string;
				reason: string;
			}> = [];

			for (const recipient of audience.recipients.recipients) {
				const eligibility = evaluateSendEligibility({
					recipientPhoneE164: recipient.phoneE164,
					sourceCount: recipient.sources.length,
					isInviteable: true,
					doNotMessageEntry: dnmLookup.get(recipient.phoneE164) ?? null,
					providerConfigured: true,
				});

				if (eligibility.allowed) {
					eligibleCount += 1;
					continue;
				}

				blockedCount += 1;
				if (blockedSamples.length < 25) {
					blockedSamples.push({
						phoneE164: recipient.phoneE164,
						reason: eligibility.reason,
					});
				}
			}

			return {
				weddingId: input.weddingId,
				eventId: input.eventId,
				templateName: input.templateName,
				templateLanguage: input.templateLanguage,
				totalCandidates: audience.recipients.recipientCount,
				eligibleCount,
				blockedCount,
				readyToSend: eligibleCount > 0,
				blockedSamples,
				audienceTrace: audience.trace,
				checkedAt: new Date(),
			};
		}),

	sendRun: protectedProcedure
		.input(sendInviteRunInput)
		.handler(async ({ context, input }) => {
			await assertInviteSendAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}

			return dispatchInviteRun({
				weddingId: input.weddingId,
				eventId: input.eventId,
				actorMembershipId: membership.id,
				templateName: input.templateName,
				templateLanguage: input.templateLanguage,
				audience: {
					side: input.side,
					tagIds: input.tagIds,
					search: input.search,
					includeGuestUnitIds: input.includeGuestUnitIds,
					excludeGuestUnitIds: input.excludeGuestUnitIds,
				},
			});
		}),

	listRuns: protectedProcedure
		.input(listInviteRunsInput)
		.handler(async ({ context, input }) => {
			await assertInviteReadAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			return db.query.inviteSendRuns.findMany({
				where: and(
					eq(inviteSendRuns.weddingId, input.weddingId),
					input.eventId ? eq(inviteSendRuns.eventId, input.eventId) : undefined,
				),
				orderBy: [desc(inviteSendRuns.createdAt), desc(inviteSendRuns.id)],
				limit: input.limit,
			});
		}),

	getRunDetail: protectedProcedure
		.input(inviteRunDetailInput)
		.handler(async ({ context, input }) => {
			await assertInviteReadAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const run = await db.query.inviteSendRuns.findFirst({
				where: and(
					eq(inviteSendRuns.id, input.runId),
					eq(inviteSendRuns.weddingId, input.weddingId),
				),
				with: {
					messages: {
						orderBy: [
							desc(inviteMessages.lastStatusAt),
							desc(inviteMessages.createdAt),
						],
						with: {
							transitions: {
								orderBy: (transition, { desc }) => [desc(transition.appliedAt)],
								limit: 10,
							},
							webhookReceipts: {
								orderBy: (receipt, { desc }) => [desc(receipt.receivedAt)],
								limit: 10,
							},
						},
					},
				},
			});

			if (!run) {
				throw new ORPCError("NOT_FOUND", {
					message: "Invite send run not found.",
				});
			}

			return run;
		}),

	listDoNotMessageEntries: protectedProcedure
		.input(weddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertInviteReadAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			return db.query.inviteDoNotMessages.findMany({
				where: and(
					eq(inviteDoNotMessages.weddingId, input.weddingId),
					eq(inviteDoNotMessages.isActive, true),
					isNull(inviteDoNotMessages.revokedAt),
				),
				orderBy: [desc(inviteDoNotMessages.createdAt)],
				limit: 200,
			});
		}),
};
