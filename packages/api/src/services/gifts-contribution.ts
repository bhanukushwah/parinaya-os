import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import {
	giftAuditEvents,
	giftContributions,
	giftItems,
	giftsModes,
} from "@parinaya-os/db/schema/gifts";
import { and, eq, sql } from "drizzle-orm";

import { AUDIT_ACTIONS, writeAuditLog } from "./audit-log";

function invalidContribution(message: string): never {
	throw new ORPCError("BAD_REQUEST", { message });
}

export function validateContributionInput(amountPaise: number) {
	if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
		invalidContribution(
			"Contribution amount must be a positive integer paise value.",
		);
	}
}

export function computeRemainingGiftAmount(input: {
	targetAmountPaise: number;
	amountRaisedPaise: number;
}) {
	return Math.max(0, input.targetAmountPaise - input.amountRaisedPaise);
}

export function validateContributionAgainstRemaining(input: {
	remainingAmountPaise: number;
	amountPaise: number;
}) {
	if (input.remainingAmountPaise === 0) {
		invalidContribution("Gift item is already fully funded.");
	}

	if (input.amountPaise > input.remainingAmountPaise) {
		invalidContribution(
			`Contribution exceeds remaining target amount (${input.remainingAmountPaise} paise).`,
		);
	}
}

export async function createGiftContribution(input: {
	weddingId: string;
	modeId: string;
	itemId: string;
	amountPaise: number;
	contributorName?: string | null;
	contributorPhoneE164?: string | null;
	note?: string | null;
}) {
	validateContributionInput(input.amountPaise);

	return db.transaction(async (tx) => {
		const mode = await tx.query.giftsModes.findFirst({
			where: and(
				eq(giftsModes.id, input.modeId),
				eq(giftsModes.weddingId, input.weddingId),
			),
		});

		if (!mode) {
			throw new ORPCError("NOT_FOUND", { message: "Gifts mode not found." });
		}

		if (mode.modeStatus !== "published") {
			invalidContribution("Gifts are currently unavailable for contributions.");
		}

		const lockedRows = await tx.execute<{
			id: string;
			target_amount_paise: number;
			amount_raised_paise: number;
			is_archived: boolean;
		}>(sql`
			select
				id,
				target_amount_paise,
				amount_raised_paise,
				is_archived
			from gift_items
			where id = ${input.itemId}
				and gifts_mode_id = ${input.modeId}
				and wedding_id = ${input.weddingId}
			for update
		`);

		const item = lockedRows.rows[0];
		if (!item) {
			throw new ORPCError("NOT_FOUND", { message: "Gift item not found." });
		}

		if (item.is_archived) {
			invalidContribution("Archived gift items do not accept contributions.");
		}

		const remaining = computeRemainingGiftAmount({
			targetAmountPaise: item.target_amount_paise,
			amountRaisedPaise: item.amount_raised_paise,
		});

		validateContributionAgainstRemaining({
			remainingAmountPaise: remaining,
			amountPaise: input.amountPaise,
		});

		const now = new Date();
		const [createdContribution] = await tx
			.insert(giftContributions)
			.values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				giftsModeId: input.modeId,
				giftItemId: input.itemId,
				amountPaise: input.amountPaise,
				contributorName: input.contributorName ?? null,
				contributorPhoneE164: input.contributorPhoneE164 ?? null,
				note: input.note ?? null,
				source: "website",
			})
			.returning();

		const [updatedItem] = await tx
			.update(giftItems)
			.set({
				amountRaisedPaise: sql`${giftItems.amountRaisedPaise} + ${input.amountPaise}`,
				completedAt:
					item.amount_raised_paise + input.amountPaise >=
					item.target_amount_paise
						? now
						: null,
				updatedAt: now,
			})
			.where(eq(giftItems.id, input.itemId))
			.returning();

		if (!createdContribution || !updatedItem) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Unable to persist contribution.",
			});
		}

		await tx.insert(giftAuditEvents).values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			giftsModeId: input.modeId,
			giftItemId: input.itemId,
			actorMembershipId: null,
			actionType: "gift.contribution.create",
			beforeSummary: {
				amountRaisedPaise: item.amount_raised_paise,
				targetAmountPaise: item.target_amount_paise,
			},
			afterSummary: {
				amountRaisedPaise: updatedItem.amountRaisedPaise,
				targetAmountPaise: updatedItem.targetAmountPaise,
				remainingAmountPaise: Math.max(
					0,
					updatedItem.targetAmountPaise - updatedItem.amountRaisedPaise,
				),
			},
		});

		await writeAuditLog(tx, {
			weddingId: input.weddingId,
			actorMembershipId: null,
			actionType: AUDIT_ACTIONS.GIFT_EDIT,
			targetType: "gift",
			targetId: input.itemId,
			beforeSummary: {
				amountRaisedPaise: item.amount_raised_paise,
			},
			afterSummary: {
				amountRaisedPaise: updatedItem.amountRaisedPaise,
			},
			reasonNote: "gift.contribution.create",
		});

		return {
			contribution: createdContribution,
			item: updatedItem,
		};
	});
}
