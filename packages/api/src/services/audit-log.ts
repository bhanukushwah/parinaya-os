import type { db } from "@parinaya-os/db";
import { auditLogs } from "@parinaya-os/db/schema/governance";

export const AUDIT_ACTIONS = {
	EVENT_ARCHIVE: "event.archive",
	EVENT_CREATE: "event.create",
	EVENT_EDIT: "event.edit",
	EVENT_REORDER: "event.reorder",
	EVENT_RESTORE: "event.restore",
	EVENT_VISIBILITY_CHANGE: "event.visibility.change",
	GUEST_EDIT: "guest.edit",
	INVITE_SEND: "invite.send",
	ROLE_CHANGE: "role.change",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditTargetType =
	| "wedding"
	| "event"
	| "membership"
	| "guest"
	| "invite"
	| "system";

type JsonSummary = Record<string, unknown> | null;

type AuditInsertClient = Pick<typeof db, "insert">;

export type AuditLogWriteInput = {
	weddingId: string;
	actorMembershipId: string | null;
	actionType: AuditAction;
	targetType: AuditTargetType;
	targetId?: string | null;
	beforeSummary?: JsonSummary;
	afterSummary?: JsonSummary;
	reasonNote?: string | null;
};

export async function writeAuditLog(
	client: AuditInsertClient,
	input: AuditLogWriteInput,
): Promise<void> {
	await client.insert(auditLogs).values({
		id: crypto.randomUUID(),
		weddingId: input.weddingId,
		actorMembershipId: input.actorMembershipId,
		actionType: input.actionType,
		targetType: input.targetType,
		targetId: input.targetId ?? null,
		beforeSummary: input.beforeSummary ?? null,
		afterSummary: input.afterSummary ?? null,
		reasonNote: input.reasonNote ?? null,
	});
}
