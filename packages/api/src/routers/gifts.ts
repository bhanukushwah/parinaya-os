import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { giftItems } from "@parinaya-os/db/schema/gifts";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { createGiftContribution } from "../services/gifts-contribution";
import {
	archiveGiftItem,
	ensureGiftsMode,
	transitionGiftsMode,
	updateGiftsDraft,
	upsertGiftItem,
} from "../services/gifts-lifecycle";
import {
	projectAdminGiftsView,
	projectGuestGiftsView,
} from "../services/gifts-projection";
import { verifyWebsiteTrustedSession } from "../services/website-access";

export const giftsWeddingScopedInput = z.object({
	weddingId: z.string().min(1),
});

export const giftsAdminDraftInput = z.object({
	weddingId: z.string().min(1),
	upiPayeeName: z.string().trim().min(1).max(120).nullable().optional(),
	upiId: z.string().trim().min(1).max(120).nullable().optional(),
	upiQrImageUrl: z.string().trim().url().nullable().optional(),
	messageNote: z.string().trim().max(400).nullable().optional(),
	prePublishNote: z.string().trim().max(400).nullable().optional(),
	reasonNote: z.string().trim().max(240).nullable().optional(),
});

export const giftsUpsertItemInput = z.object({
	weddingId: z.string().min(1),
	itemId: z.string().min(1).optional(),
	title: z.string().trim().min(1).max(140),
	description: z.string().trim().max(400).nullable().optional(),
	targetAmountPaise: z.number().int().positive(),
	sortOrder: z.number().int().nonnegative().optional(),
	reasonNote: z.string().trim().max(240).nullable().optional(),
});

export const giftsArchiveItemInput = z.object({
	weddingId: z.string().min(1),
	itemId: z.string().min(1),
});

export const giftsLifecycleInput = z.object({
	weddingId: z.string().min(1),
	action: z.enum(["publish", "hide", "disable"]),
	reasonNote: z.string().trim().max(240).nullable().optional(),
	disableReason: z.string().trim().max(240).nullable().optional(),
});

export const giftsGuestViewInput = z.object({
	weddingId: z.string().min(1),
	trustedSessionToken: z.string().min(1),
});

export const giftsContributionInput = z.object({
	weddingId: z.string().min(1),
	trustedSessionToken: z.string().min(1),
	itemId: z.string().min(1),
	amountPaise: z.number().int().positive(),
	contributorName: z.string().trim().max(120).nullable().optional(),
	contributorPhoneE164: z.string().trim().max(20).nullable().optional(),
	note: z.string().trim().max(400).nullable().optional(),
});

async function assertOperatorMembership(input: {
	weddingId: string;
	userId: string;
}) {
	const membership = await db.query.weddingMemberships.findFirst({
		columns: {
			role: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, input.weddingId),
			eq(weddingMemberships.userId, input.userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});

	if (!membership) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only admin or coordinator can manage gifts mode.",
		});
	}

	if (membership.role !== "admin" && membership.role !== "coordinator") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only admin or coordinator can manage gifts mode.",
		});
	}
}

async function loadModeWithItems(weddingId: string) {
	const mode = await ensureGiftsMode({ weddingId });

	const items = await db.query.giftItems.findMany({
		where: and(
			eq(giftItems.giftsModeId, mode.id),
			eq(giftItems.isArchived, false),
		),
		orderBy: [asc(giftItems.sortOrder), asc(giftItems.createdAt)],
		with: {
			contributions: {
				orderBy: (contribution, { asc: contributionAsc }) => [
					contributionAsc(contribution.createdAt),
				],
			},
		},
	});

	return { mode, items };
}

export const giftsRouter = {
	adminView: protectedProcedure
		.input(giftsWeddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertOperatorMembership({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const payload = await loadModeWithItems(input.weddingId);
			return projectAdminGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	updateDraft: protectedProcedure
		.input(giftsAdminDraftInput)
		.handler(async ({ context, input }) => {
			await updateGiftsDraft({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				upiPayeeName: input.upiPayeeName,
				upiId: input.upiId,
				upiQrImageUrl: input.upiQrImageUrl,
				messageNote: input.messageNote,
				prePublishNote: input.prePublishNote,
				reasonNote: input.reasonNote,
			});

			const payload = await loadModeWithItems(input.weddingId);
			return projectAdminGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	upsertItem: protectedProcedure
		.input(giftsUpsertItemInput)
		.handler(async ({ context, input }) => {
			await upsertGiftItem({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				itemId: input.itemId,
				title: input.title,
				description: input.description,
				targetAmountPaise: input.targetAmountPaise,
				sortOrder: input.sortOrder,
				reasonNote: input.reasonNote,
			});

			const payload = await loadModeWithItems(input.weddingId);
			return projectAdminGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	archiveItem: protectedProcedure
		.input(giftsArchiveItemInput)
		.handler(async ({ context, input }) => {
			await archiveGiftItem({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				itemId: input.itemId,
			});

			const payload = await loadModeWithItems(input.weddingId);
			return projectAdminGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	transitionMode: protectedProcedure
		.input(giftsLifecycleInput)
		.handler(async ({ context, input }) => {
			await transitionGiftsMode({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: input.action,
				reasonNote: input.reasonNote,
				disableReason: input.disableReason,
			});

			const payload = await loadModeWithItems(input.weddingId);
			return projectAdminGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	guestView: publicProcedure
		.input(giftsGuestViewInput)
		.handler(async ({ input }) => {
			const trustedSession = await verifyWebsiteTrustedSession({
				weddingId: input.weddingId,
				sessionToken: input.trustedSessionToken,
			});

			if (!trustedSession) {
				throw new ORPCError("FORBIDDEN", {
					message: "Invite-only gifts require verified website access.",
				});
			}

			const payload = await loadModeWithItems(input.weddingId);
			return projectGuestGiftsView({
				mode: payload.mode,
				items: payload.items,
				unavailableMessage:
					"Gifts are currently unavailable. Please check back later.",
			});
		}),

	contribute: publicProcedure
		.input(giftsContributionInput)
		.handler(async ({ input }) => {
			const trustedSession = await verifyWebsiteTrustedSession({
				weddingId: input.weddingId,
				sessionToken: input.trustedSessionToken,
			});

			if (!trustedSession) {
				throw new ORPCError("FORBIDDEN", {
					message: "Invite-only gifts require verified website access.",
				});
			}

			const mode = await ensureGiftsMode({ weddingId: input.weddingId });
			const contribution = await createGiftContribution({
				weddingId: input.weddingId,
				modeId: mode.id,
				itemId: input.itemId,
				amountPaise: input.amountPaise,
				contributorName: input.contributorName,
				contributorPhoneE164:
					input.contributorPhoneE164 ?? trustedSession.normalizedPhoneE164,
				note: input.note,
			});

			return {
				ok: true as const,
				itemId: contribution.item.id,
				amountRaisedPaise: contribution.item.amountRaisedPaise,
			};
		}),
};
