import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import { and, eq, isNull } from "drizzle-orm";

export type WeddingRole = "owner" | "admin" | "coordinator";

export type GovernedAction =
	| "event.create"
	| "event.update"
	| "event.archive"
	| "event.restore"
	| "event.reorder"
	| "event.visibility.change"
	| "guest.read"
	| "guest.edit"
	| "governance.role.change"
	| "audit.read";

const FORBIDDEN_MESSAGE = "You do not have access to perform this action.";

const POLICY_MATRIX: Record<WeddingRole, Set<GovernedAction>> = {
	owner: new Set<GovernedAction>([
		"event.create",
		"event.update",
		"event.archive",
		"event.restore",
		"event.reorder",
		"event.visibility.change",
		"guest.read",
		"guest.edit",
		"governance.role.change",
		"audit.read",
	]),
	admin: new Set<GovernedAction>([
		"event.create",
		"event.update",
		"event.archive",
		"event.restore",
		"event.reorder",
		"event.visibility.change",
		"guest.read",
		"guest.edit",
		"governance.role.change",
		"audit.read",
	]),
	coordinator: new Set<GovernedAction>([
		"event.create",
		"event.update",
		"event.archive",
		"event.restore",
		"event.reorder",
		"guest.read",
		"guest.edit",
		"audit.read",
	]),
};

function throwForbidden() {
	throw new ORPCError("FORBIDDEN", {
		message: FORBIDDEN_MESSAGE,
	});
}

export function assertCan(role: WeddingRole, action: GovernedAction): void {
	const isAllowed = POLICY_MATRIX[role]?.has(action) ?? false;
	if (!isAllowed) {
		throwForbidden();
	}
}

export function assertRoleChangeAllowed(
	actorRole: WeddingRole,
	targetRole: WeddingRole,
): void {
	if (actorRole === "owner") {
		return;
	}
	if (actorRole === "admin" && targetRole === "coordinator") {
		return;
	}
	throwForbidden();
}

export async function getRoleByMembership(params: {
	weddingId: string;
	userId: string;
}): Promise<WeddingRole | null> {
	const membership = await db.query.weddingMemberships.findFirst({
		columns: {
			role: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, params.weddingId),
			eq(weddingMemberships.userId, params.userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});

	return membership?.role ?? null;
}

export function assertMembershipRole(
	role: WeddingRole | null,
): asserts role is WeddingRole {
	if (!role) {
		throwForbidden();
	}
}

export function forbiddenError() {
	return new ORPCError("FORBIDDEN", {
		message: FORBIDDEN_MESSAGE,
	});
}
