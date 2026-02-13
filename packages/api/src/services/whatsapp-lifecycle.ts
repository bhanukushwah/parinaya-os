import { db } from "@parinaya-os/db";
import {
	inviteLifecycleTransitions,
	inviteMessages,
} from "@parinaya-os/db/schema/whatsapp";
import { eq } from "drizzle-orm";

type LifecycleStatus = "sent" | "delivered" | "read" | "failed";

const STATUS_RANK: Record<Exclude<LifecycleStatus, "failed">, number> = {
	sent: 1,
	delivered: 2,
	read: 3,
};

export type LifecycleTransitionDecision = {
	apply: boolean;
	isDuplicate: boolean;
	reason: string;
};

export type ApplyLifecycleTransitionInput = {
	providerMessageId: string;
	toStatus: LifecycleStatus;
	providerEventAt: Date | null;
	webhookReceiptId: string | null;
};

export type ApplyLifecycleTransitionResult = {
	applied: boolean;
	isDuplicate: boolean;
	reason: string;
	messageId: string;
	weddingId: string;
	fromStatus: LifecycleStatus;
	toStatus: LifecycleStatus;
};

export function evaluateLifecycleTransition(
	fromStatus: LifecycleStatus,
	toStatus: LifecycleStatus,
): LifecycleTransitionDecision {
	if (fromStatus === toStatus) {
		return {
			apply: false,
			isDuplicate: true,
			reason: "Duplicate status received.",
		};
	}

	if (fromStatus === "failed") {
		return {
			apply: false,
			isDuplicate: true,
			reason: "Failed is terminal and cannot be regressed.",
		};
	}

	if (toStatus === "failed") {
		return {
			apply: true,
			isDuplicate: false,
			reason: "Failed transition accepted as terminal.",
		};
	}

	const fromRank =
		STATUS_RANK[fromStatus as Exclude<LifecycleStatus, "failed">];
	const toRank = STATUS_RANK[toStatus as Exclude<LifecycleStatus, "failed">];

	if (toRank > fromRank) {
		return {
			apply: true,
			isDuplicate: false,
			reason: "Forward transition accepted.",
		};
	}

	return {
		apply: false,
		isDuplicate: true,
		reason: "Out-of-order transition rejected to preserve monotonic state.",
	};
}

function buildStatusPatch(input: {
	toStatus: LifecycleStatus;
	providerEventAt: Date | null;
}) {
	const statusAt = input.providerEventAt ?? new Date();

	return {
		lifecycleStatus: input.toStatus,
		lastStatusAt: statusAt,
		deliveredAt: input.toStatus === "delivered" ? statusAt : undefined,
		readAt: input.toStatus === "read" ? statusAt : undefined,
		failedAt: input.toStatus === "failed" ? statusAt : undefined,
	};
}

export async function applyLifecycleTransition(
	input: ApplyLifecycleTransitionInput,
): Promise<ApplyLifecycleTransitionResult | null> {
	const message = await db.query.inviteMessages.findFirst({
		where: eq(inviteMessages.providerMessageId, input.providerMessageId),
		columns: {
			id: true,
			weddingId: true,
			lifecycleStatus: true,
		},
	});

	if (!message) {
		return null;
	}

	const decision = evaluateLifecycleTransition(
		message.lifecycleStatus,
		input.toStatus,
	);

	await db.insert(inviteLifecycleTransitions).values({
		id: crypto.randomUUID(),
		inviteMessageId: message.id,
		weddingId: message.weddingId,
		fromStatus: message.lifecycleStatus,
		toStatus: input.toStatus,
		source: "webhook",
		webhookReceiptId: input.webhookReceiptId,
		providerEventAt: input.providerEventAt,
		isDuplicate: decision.isDuplicate,
		reasonNote: decision.reason,
	});

	if (decision.apply) {
		await db
			.update(inviteMessages)
			.set(
				buildStatusPatch({
					toStatus: input.toStatus,
					providerEventAt: input.providerEventAt,
				}),
			)
			.where(eq(inviteMessages.id, message.id));
	}

	return {
		applied: decision.apply,
		isDuplicate: decision.isDuplicate,
		reason: decision.reason,
		messageId: message.id,
		weddingId: message.weddingId,
		fromStatus: message.lifecycleStatus,
		toStatus: input.toStatus,
	};
}
