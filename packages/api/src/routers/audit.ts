import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { auditLogs } from "@parinaya-os/db/schema/governance";
import { and, desc, eq, gte, inArray, lte, notInArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	forbiddenError,
	getRoleByMembership,
} from "../policies/authorize";
import { AUDIT_ACTIONS } from "../services/audit-log";

const coordinatorHiddenActions: string[] = [
	AUDIT_ACTIONS.ROLE_CHANGE,
	AUDIT_ACTIONS.EVENT_VISIBILITY_CHANGE,
];

const listAuditInput = z.object({
	weddingId: z.string().min(1),
	actionTypes: z.array(z.string().min(1)).optional(),
	actorMembershipId: z.string().min(1).optional(),
	targetType: z
		.enum(["wedding", "event", "membership", "guest", "invite", "system"])
		.optional(),
	targetId: z.string().min(1).optional(),
	fromDate: z.coerce.date().optional(),
	toDate: z.coerce.date().optional(),
	limit: z.number().int().positive().max(200).default(100),
});

const getAuditDetailInput = z.object({
	weddingId: z.string().min(1),
	auditLogId: z.string().min(1),
});

export const auditRouter = {
	list: protectedProcedure
		.input(listAuditInput)
		.handler(async ({ context, input }) => {
			const role = await getRoleByMembership({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});
			assertMembershipRole(role);
			assertCan(role, "audit.read");

			const whereClauses = [eq(auditLogs.weddingId, input.weddingId)];

			if (input.actionTypes && input.actionTypes.length > 0) {
				whereClauses.push(inArray(auditLogs.actionType, input.actionTypes));
			}
			if (input.actorMembershipId) {
				whereClauses.push(
					eq(auditLogs.actorMembershipId, input.actorMembershipId),
				);
			}
			if (input.targetType) {
				whereClauses.push(eq(auditLogs.targetType, input.targetType));
			}
			if (input.targetId) {
				whereClauses.push(eq(auditLogs.targetId, input.targetId));
			}
			if (input.fromDate) {
				whereClauses.push(gte(auditLogs.createdAt, input.fromDate));
			}
			if (input.toDate) {
				whereClauses.push(lte(auditLogs.createdAt, input.toDate));
			}
			if (role === "coordinator") {
				whereClauses.push(
					notInArray(auditLogs.actionType, coordinatorHiddenActions),
				);
			}

			const rows = await db.query.auditLogs.findMany({
				where: and(...whereClauses),
				with: {
					actorMembership: {
						columns: {
							id: true,
							userId: true,
							role: true,
						},
					},
				},
				orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
				limit: input.limit,
			});

			return rows.map((entry) => ({
				id: entry.id,
				action: entry.actionType,
				time: entry.createdAt,
				target: {
					type: entry.targetType,
					id: entry.targetId,
				},
				actor: entry.actorMembership
					? {
							membershipId: entry.actorMembership.id,
							userId: entry.actorMembership.userId,
							role: entry.actorMembership.role,
						}
					: null,
				beforeSummary: entry.beforeSummary,
				afterSummary: entry.afterSummary,
				reasonNote: entry.reasonNote,
			}));
		}),

	detail: protectedProcedure
		.input(getAuditDetailInput)
		.handler(async ({ context, input }) => {
			const role = await getRoleByMembership({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});
			assertMembershipRole(role);
			assertCan(role, "audit.read");

			const auditLog = await db.query.auditLogs.findFirst({
				where: and(
					eq(auditLogs.id, input.auditLogId),
					eq(auditLogs.weddingId, input.weddingId),
				),
				with: {
					actorMembership: {
						columns: {
							id: true,
							userId: true,
							role: true,
						},
					},
				},
			});

			if (!auditLog) {
				throw new ORPCError("NOT_FOUND");
			}

			if (
				role === "coordinator" &&
				coordinatorHiddenActions.includes(auditLog.actionType)
			) {
				throw forbiddenError();
			}

			return {
				id: auditLog.id,
				action: auditLog.actionType,
				time: auditLog.createdAt,
				target: {
					type: auditLog.targetType,
					id: auditLog.targetId,
				},
				actor: auditLog.actorMembership
					? {
							membershipId: auditLog.actorMembership.id,
							userId: auditLog.actorMembership.userId,
							role: auditLog.actorMembership.role,
						}
					: null,
				beforeSummary: auditLog.beforeSummary,
				afterSummary: auditLog.afterSummary,
				reasonNote: auditLog.reasonNote,
			};
		}),
};
