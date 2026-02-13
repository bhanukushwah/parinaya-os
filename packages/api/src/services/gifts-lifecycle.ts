import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import {
	giftAuditEvents,
	giftContributions,
	giftItems,
	giftsModes,
} from "@parinaya-os/db/schema/gifts";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import { and, asc, eq, isNull } from "drizzle-orm";

import { AUDIT_ACTIONS, writeAuditLog } from "./audit-log";

export type GiftsLifecycleStatus =
	| "draft"
	| "published"
	| "hidden"
	| "disabled";
export type GiftsLifecycleAction = "publish" | "hide" | "disable";

export function canManageGiftsRole(role: string | null | undefined) {
	return role === "admin" || role === "coordinator";
}

export function validatePrePublishNoteForPublish(input: {
	action: GiftsLifecycleAction;
	prePublishNote: string | null;
}) {
	if (input.action !== "publish") {
		return;
	}

	if (!input.prePublishNote || input.prePublishNote.trim().length === 0) {
		badRequest("Pre-publish note is required before publishing gifts mode.");
	}
}

export function resolveGiftsModeTransition(input: {
	action: GiftsLifecycleAction;
	currentStatus: GiftsLifecycleStatus;
}) {
	if (input.action === "publish") {
		if (input.currentStatus !== "draft" && input.currentStatus !== "hidden") {
			badRequest("Gifts can only be published from draft or hidden state.");
		}
		return "published" as const;
	}

	if (input.action === "hide") {
		if (input.currentStatus !== "published") {
			badRequest("Gifts can only be hidden when currently published.");
		}
		return "hidden" as const;
	}

	if (input.currentStatus !== "published" && input.currentStatus !== "hidden") {
		badRequest("Gifts can only be disabled from published or hidden state.");
	}

	return "disabled" as const;
}

type Membership = {
	id: string;
	role: "owner" | "admin" | "coordinator";
};

function forbiddenError(message: string): never {
	throw new ORPCError("FORBIDDEN", { message });
}

function badRequest(message: string): never {
	throw new ORPCError("BAD_REQUEST", { message });
}

function mapActionType(action: GiftsLifecycleAction) {
	if (action === "publish") {
		return AUDIT_ACTIONS.GIFT_PUBLISH;
	}

	if (action === "hide") {
		return AUDIT_ACTIONS.GIFT_HIDE;
	}

	return AUDIT_ACTIONS.GIFT_DISABLE;
}

function mapGiftAuditAction(action: GiftsLifecycleAction) {
	if (action === "publish") {
		return "gift.publish" as const;
	}

	if (action === "hide") {
		return "gift.hide" as const;
	}

	return "gift.disable" as const;
}

async function getMembership(input: { weddingId: string; userId: string }) {
	return db.query.weddingMemberships.findFirst({
		columns: {
			id: true,
			role: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, input.weddingId),
			eq(weddingMemberships.userId, input.userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});
}

function assertGiftsOperator(
	membership: Membership | null | undefined,
): asserts membership is Membership {
	if (!membership) {
		forbiddenError("Only admin or coordinator can manage gifts mode.");
	}

	if (!canManageGiftsRole(membership.role)) {
		forbiddenError("Only admin or coordinator can manage gifts mode.");
	}
}

export async function ensureGiftsMode(input: { weddingId: string }) {
	const existing = await db.query.giftsModes.findFirst({
		where: eq(giftsModes.weddingId, input.weddingId),
	});

	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(giftsModes)
		.values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			modeStatus: "draft",
			lastStateChangedAt: new Date(),
		})
		.returning();

	if (!created) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unable to initialize gifts mode.",
		});
	}

	return created;
}

export async function updateGiftsDraft(input: {
	weddingId: string;
	userId: string;
	upiPayeeName?: string | null;
	upiId?: string | null;
	upiQrImageUrl?: string | null;
	messageNote?: string | null;
	prePublishNote?: string | null;
	reasonNote?: string | null;
}) {
	const membership = await getMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertGiftsOperator(membership);

	const mode = await ensureGiftsMode({ weddingId: input.weddingId });

	const [updated] = await db
		.update(giftsModes)
		.set({
			upiPayeeName:
				input.upiPayeeName === undefined
					? mode.upiPayeeName
					: input.upiPayeeName,
			upiId: input.upiId === undefined ? mode.upiId : input.upiId,
			upiQrImageUrl:
				input.upiQrImageUrl === undefined
					? mode.upiQrImageUrl
					: input.upiQrImageUrl,
			messageNote:
				input.messageNote === undefined ? mode.messageNote : input.messageNote,
			prePublishNote:
				input.prePublishNote === undefined
					? mode.prePublishNote
					: input.prePublishNote,
			draftRevision: mode.draftRevision + 1,
			updatedAt: new Date(),
		})
		.where(eq(giftsModes.id, mode.id))
		.returning();

	if (!updated) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unable to update gifts draft.",
		});
	}

	await db.transaction(async (tx) => {
		await tx.insert(giftAuditEvents).values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			giftsModeId: mode.id,
			actorMembershipId: membership.id,
			actionType: "gift.edit",
			beforeSummary: {
				modeStatus: mode.modeStatus,
				draftRevision: mode.draftRevision,
			},
			afterSummary: {
				modeStatus: updated.modeStatus,
				draftRevision: updated.draftRevision,
			},
			reasonNote: input.reasonNote ?? null,
		});

		await writeAuditLog(tx, {
			weddingId: input.weddingId,
			actorMembershipId: membership.id,
			actionType: AUDIT_ACTIONS.GIFT_EDIT,
			targetType: "gift",
			targetId: mode.id,
			beforeSummary: {
				modeStatus: mode.modeStatus,
				draftRevision: mode.draftRevision,
			},
			afterSummary: {
				modeStatus: updated.modeStatus,
				draftRevision: updated.draftRevision,
			},
			reasonNote: input.reasonNote ?? null,
		});
	});

	return updated;
}

export async function transitionGiftsMode(input: {
	weddingId: string;
	userId: string;
	action: GiftsLifecycleAction;
	reasonNote?: string | null;
	disableReason?: string | null;
}) {
	const membership = await getMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertGiftsOperator(membership);

	const mode = await ensureGiftsMode({ weddingId: input.weddingId });

	validatePrePublishNoteForPublish({
		action: input.action,
		prePublishNote: mode.prePublishNote,
	});

	const nextStatus = resolveGiftsModeTransition({
		action: input.action,
		currentStatus: mode.modeStatus,
	});

	const now = new Date();
	const [updated] = await db
		.update(giftsModes)
		.set({
			modeStatus: nextStatus,
			publishedAt: nextStatus === "published" ? now : mode.publishedAt,
			hiddenAt: nextStatus === "hidden" ? now : null,
			disabledAt: nextStatus === "disabled" ? now : null,
			disabledReason:
				nextStatus === "disabled" ? (input.disableReason ?? null) : null,
			lastStateChangedAt: now,
			lastPublishedRevision:
				nextStatus === "published"
					? Math.max(mode.lastPublishedRevision, mode.draftRevision)
					: mode.lastPublishedRevision,
		})
		.where(eq(giftsModes.id, mode.id))
		.returning();

	if (!updated) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unable to transition gifts mode.",
		});
	}

	if (nextStatus === "disabled") {
		await db
			.update(giftsModes)
			.set({
				modeStatus: "draft",
				updatedAt: new Date(),
			})
			.where(eq(giftsModes.id, mode.id));
	}

	await db.transaction(async (tx) => {
		await tx.insert(giftAuditEvents).values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			giftsModeId: mode.id,
			actorMembershipId: membership.id,
			actionType: mapGiftAuditAction(input.action),
			beforeSummary: {
				modeStatus: mode.modeStatus,
				publishedAt: mode.publishedAt,
				hiddenAt: mode.hiddenAt,
				disabledAt: mode.disabledAt,
			},
			afterSummary: {
				modeStatus: nextStatus,
				publishedAt: updated.publishedAt,
				hiddenAt: updated.hiddenAt,
				disabledAt: updated.disabledAt,
				disabledReason: updated.disabledReason,
			},
			reasonNote: input.reasonNote ?? null,
		});

		await writeAuditLog(tx, {
			weddingId: input.weddingId,
			actorMembershipId: membership.id,
			actionType: mapActionType(input.action),
			targetType: "gift",
			targetId: mode.id,
			beforeSummary: {
				modeStatus: mode.modeStatus,
			},
			afterSummary: {
				modeStatus: nextStatus,
				draftRevision: mode.draftRevision,
			},
			reasonNote: input.reasonNote ?? null,
		});
	});

	const refreshed = await db.query.giftsModes.findFirst({
		where: eq(giftsModes.id, mode.id),
	});

	if (!refreshed) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unable to load updated gifts mode.",
		});
	}

	return refreshed;
}

export async function listGiftItems(input: { weddingId: string }) {
	const mode = await ensureGiftsMode({ weddingId: input.weddingId });

	return db.query.giftItems.findMany({
		where: eq(giftItems.giftsModeId, mode.id),
		orderBy: [asc(giftItems.sortOrder), asc(giftItems.createdAt)],
		with: {
			contributions: {
				orderBy: [asc(giftContributions.createdAt)],
			},
		},
	});
}

export async function upsertGiftItem(input: {
	weddingId: string;
	userId: string;
	itemId?: string;
	title: string;
	description?: string | null;
	targetAmountPaise: number;
	sortOrder?: number;
	reasonNote?: string | null;
}) {
	const membership = await getMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertGiftsOperator(membership);

	if (input.targetAmountPaise <= 0) {
		badRequest("Target amount must be positive.");
	}

	const mode = await ensureGiftsMode({ weddingId: input.weddingId });

	if (input.itemId) {
		const existing = await db.query.giftItems.findFirst({
			where: and(
				eq(giftItems.id, input.itemId),
				eq(giftItems.giftsModeId, mode.id),
			),
		});

		if (!existing) {
			throw new ORPCError("NOT_FOUND", { message: "Gift item not found." });
		}

		const [updated] = await db
			.update(giftItems)
			.set({
				title: input.title,
				description: input.description ?? null,
				targetAmountPaise: input.targetAmountPaise,
				sortOrder: input.sortOrder ?? existing.sortOrder,
				updatedAt: new Date(),
			})
			.where(eq(giftItems.id, existing.id))
			.returning();

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Unable to update gift item.",
			});
		}

		await db.transaction(async (tx) => {
			await tx.insert(giftAuditEvents).values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				giftsModeId: mode.id,
				giftItemId: updated.id,
				actorMembershipId: membership.id,
				actionType: "gift.item.edit",
				beforeSummary: {
					title: existing.title,
					targetAmountPaise: existing.targetAmountPaise,
				},
				afterSummary: {
					title: updated.title,
					targetAmountPaise: updated.targetAmountPaise,
				},
				reasonNote: input.reasonNote ?? null,
			});

			await writeAuditLog(tx, {
				weddingId: input.weddingId,
				actorMembershipId: membership.id,
				actionType: AUDIT_ACTIONS.GIFT_EDIT,
				targetType: "gift",
				targetId: updated.id,
				beforeSummary: {
					title: existing.title,
					targetAmountPaise: existing.targetAmountPaise,
				},
				afterSummary: {
					title: updated.title,
					targetAmountPaise: updated.targetAmountPaise,
				},
				reasonNote: input.reasonNote ?? null,
			});
		});

		return updated;
	}

	const [created] = await db
		.insert(giftItems)
		.values({
			id: crypto.randomUUID(),
			giftsModeId: mode.id,
			weddingId: input.weddingId,
			title: input.title,
			description: input.description ?? null,
			targetAmountPaise: input.targetAmountPaise,
			sortOrder: input.sortOrder ?? 0,
		})
		.returning();

	if (!created) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unable to create gift item.",
		});
	}

	return created;
}

export async function archiveGiftItem(input: {
	weddingId: string;
	userId: string;
	itemId: string;
}) {
	const membership = await getMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertGiftsOperator(membership);

	const mode = await ensureGiftsMode({ weddingId: input.weddingId });

	const [updated] = await db
		.update(giftItems)
		.set({
			isArchived: true,
			updatedAt: new Date(),
		})
		.where(
			and(eq(giftItems.id, input.itemId), eq(giftItems.giftsModeId, mode.id)),
		)
		.returning();

	if (!updated) {
		throw new ORPCError("NOT_FOUND", { message: "Gift item not found." });
	}

	return updated;
}
