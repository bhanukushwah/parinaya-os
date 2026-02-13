import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import {
	weddingMemberships,
	weddingRoleEnum,
} from "@parinaya-os/db/schema/governance";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	assertRoleChangeAllowed,
	forbiddenError,
	getRoleByMembership,
} from "../policies/authorize";
import { AUDIT_ACTIONS, writeAuditLog } from "../services/audit-log";

const listMembershipsInput = z.object({
	weddingId: z.string().min(1),
});

const changeRoleInput = z.object({
	weddingId: z.string().min(1),
	membershipId: z.string().min(1),
	nextRole: z.enum(weddingRoleEnum.enumValues),
	reasonNote: z.string().trim().min(1).max(500).optional(),
});

async function getMembershipForUser(weddingId: string, userId: string) {
	return db.query.weddingMemberships.findFirst({
		where: and(
			eq(weddingMemberships.weddingId, weddingId),
			eq(weddingMemberships.userId, userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});
}

export const governanceRouter = {
	listMemberships: protectedProcedure
		.input(listMembershipsInput)
		.handler(async ({ context, input }) => {
			const role = await getRoleByMembership({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});
			assertMembershipRole(role);
			assertCan(role, "governance.role.change");

			return db.query.weddingMemberships.findMany({
				columns: {
					id: true,
					weddingId: true,
					userId: true,
					role: true,
					isActive: true,
					joinedAt: true,
					revokedAt: true,
					createdAt: true,
					updatedAt: true,
				},
				where: and(
					eq(weddingMemberships.weddingId, input.weddingId),
					eq(weddingMemberships.isActive, true),
					isNull(weddingMemberships.revokedAt),
				),
				orderBy: [
					asc(weddingMemberships.createdAt),
					asc(weddingMemberships.id),
				],
			});
		}),

	changeRole: protectedProcedure
		.input(changeRoleInput)
		.handler(async ({ context, input }) => {
			const actorMembership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			const actorRole = actorMembership?.role ?? null;
			assertMembershipRole(actorRole);
			if (!actorMembership) {
				throw forbiddenError();
			}
			assertCan(actorRole, "governance.role.change");

			const reasonNote = input.reasonNote?.trim() || null;

			return db.transaction(async (tx) => {
				const targetMembership = await tx.query.weddingMemberships.findFirst({
					where: and(
						eq(weddingMemberships.id, input.membershipId),
						eq(weddingMemberships.weddingId, input.weddingId),
						eq(weddingMemberships.isActive, true),
						isNull(weddingMemberships.revokedAt),
					),
				});

				if (!targetMembership) {
					throw new ORPCError("NOT_FOUND");
				}

				assertRoleChangeAllowed(actorRole, targetMembership.role);
				assertRoleChangeAllowed(actorRole, input.nextRole);

				const [updatedMembership] = await tx
					.update(weddingMemberships)
					.set({
						role: input.nextRole,
					})
					.where(
						and(
							eq(weddingMemberships.id, targetMembership.id),
							eq(weddingMemberships.weddingId, input.weddingId),
						),
					)
					.returning({
						id: weddingMemberships.id,
						userId: weddingMemberships.userId,
						role: weddingMemberships.role,
						updatedAt: weddingMemberships.updatedAt,
					});

				if (!updatedMembership) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: actorMembership.id,
					actionType: AUDIT_ACTIONS.ROLE_CHANGE,
					targetType: "membership",
					targetId: targetMembership.id,
					beforeSummary: {
						membershipId: targetMembership.id,
						userId: targetMembership.userId,
						role: targetMembership.role,
					},
					afterSummary: {
						membershipId: updatedMembership.id,
						userId: updatedMembership.userId,
						role: updatedMembership.role,
					},
					reasonNote,
				});

				return updatedMembership;
			});
		}),
};
