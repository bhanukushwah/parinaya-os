import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import {
	guestPeople,
	guestSideEnum,
	guestUnitMembers,
	guestUnits,
} from "@parinaya-os/db/schema/guests";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	getRoleByMembership,
} from "../policies/authorize";
import { AUDIT_ACTIONS, writeAuditLog } from "../services/audit-log";
import { upsertGuestIdentity } from "../services/guest-identity";

const weddingScopedInput = z.object({
	weddingId: z.string().min(1),
});

const personCreateInput = z.object({
	weddingId: z.string().min(1),
	fullName: z.string().trim().min(1),
	phone: z.string().trim().min(1),
	side: z.enum(guestSideEnum.enumValues).optional(),
	notes: z.string().trim().max(2_000).optional().nullable(),
	reasonNote: z.string().trim().max(500).optional(),
});

const personEditInput = z.object({
	weddingId: z.string().min(1),
	personId: z.string().min(1),
	fullName: z.string().trim().min(1).optional(),
	phone: z.string().trim().min(1).optional(),
	side: z.enum(guestSideEnum.enumValues).optional(),
	notes: z.string().trim().max(2_000).optional().nullable(),
	reasonNote: z.string().trim().max(500).optional(),
});

const personArchiveInput = z.object({
	weddingId: z.string().min(1),
	personId: z.string().min(1),
	reasonNote: z.string().trim().max(500).optional(),
});

const guestUnitCreateInput = z.object({
	weddingId: z.string().min(1),
	displayName: z.string().trim().min(1),
	deliveryPhone: z.string().trim().min(1),
	side: z.enum(guestSideEnum.enumValues).optional(),
	reasonNote: z.string().trim().max(500).optional(),
});

const guestUnitEditInput = z.object({
	weddingId: z.string().min(1),
	guestUnitId: z.string().min(1),
	displayName: z.string().trim().min(1).optional(),
	deliveryPhone: z.string().trim().min(1).optional(),
	side: z.enum(guestSideEnum.enumValues).optional(),
	reasonNote: z.string().trim().max(500).optional(),
});

const guestUnitArchiveInput = z.object({
	weddingId: z.string().min(1),
	guestUnitId: z.string().min(1),
	reasonNote: z.string().trim().max(500).optional(),
});

const assignPersonInput = z.object({
	weddingId: z.string().min(1),
	guestUnitId: z.string().min(1),
	personId: z.string().min(1),
	relationshipLabel: z.string().trim().max(100).optional().nullable(),
	isPrimaryContact: z.boolean().optional(),
	reasonNote: z.string().trim().max(500).optional(),
});

const removePersonInput = z.object({
	weddingId: z.string().min(1),
	personId: z.string().min(1),
	guestUnitId: z.string().min(1).optional(),
	reasonNote: z.string().trim().max(500).optional(),
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

async function assertGuestAccess(input: {
	weddingId: string;
	userId: string;
	action: "guest.read" | "guest.edit";
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);
	assertCan(role, input.action);
}

export const guestsRouter = {
	listPeople: protectedProcedure
		.input(weddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.read",
			});

			return db.query.guestPeople.findMany({
				where: eq(guestPeople.weddingId, input.weddingId),
				orderBy: [asc(guestPeople.fullName), asc(guestPeople.id)],
				with: {
					identity: true,
				},
			});
		}),

	createPerson: protectedProcedure
		.input(personCreateInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const identityResult = await upsertGuestIdentity({
					client: tx,
					weddingId: input.weddingId,
					phone: input.phone,
					displayLabel: input.fullName,
					actorMembershipId: membership?.id,
				});

				if (!identityResult.ok) {
					throw new ORPCError("BAD_REQUEST", {
						message: identityResult.message,
					});
				}

				const existingPerson = await tx.query.guestPeople.findFirst({
					where: and(
						eq(guestPeople.weddingId, input.weddingId),
						eq(guestPeople.identityId, identityResult.identity.id),
					),
				});

				if (existingPerson) {
					const [updatedPerson] = await tx
						.update(guestPeople)
						.set({
							fullName: input.fullName,
							side: input.side ?? existingPerson.side,
							notes: input.notes ?? existingPerson.notes,
							isActive: true,
							isInviteable: true,
							updatedByMembershipId: membership?.id ?? null,
						})
						.where(eq(guestPeople.id, existingPerson.id))
						.returning();

					if (!updatedPerson) {
						throw new ORPCError("INTERNAL_SERVER_ERROR");
					}

					await writeAuditLog(tx, {
						weddingId: input.weddingId,
						actorMembershipId: membership?.id ?? null,
						actionType: AUDIT_ACTIONS.GUEST_EDIT,
						targetType: "guest",
						targetId: updatedPerson.id,
						beforeSummary: {
							fullName: existingPerson.fullName,
							isActive: existingPerson.isActive,
						},
						afterSummary: {
							fullName: updatedPerson.fullName,
							identityOutcome: identityResult.outcome,
						},
						reasonNote: input.reasonNote,
					});

					return updatedPerson;
				}

				const [createdPerson] = await tx
					.insert(guestPeople)
					.values({
						id: crypto.randomUUID(),
						weddingId: input.weddingId,
						identityId: identityResult.identity.id,
						fullName: input.fullName,
						side: input.side ?? "neutral",
						notes: input.notes ?? null,
						isActive: true,
						isInviteable: true,
						createdByMembershipId: membership?.id ?? null,
						updatedByMembershipId: membership?.id ?? null,
					})
					.returning();

				if (!createdPerson) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: createdPerson.id,
					beforeSummary: null,
					afterSummary: {
						fullName: createdPerson.fullName,
						identityOutcome: identityResult.outcome,
					},
					reasonNote: input.reasonNote,
				});

				return createdPerson;
			});
		}),

	editPerson: protectedProcedure
		.input(personEditInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforePerson = await tx.query.guestPeople.findFirst({
					where: and(
						eq(guestPeople.id, input.personId),
						eq(guestPeople.weddingId, input.weddingId),
					),
				});

				if (!beforePerson) {
					throw new ORPCError("NOT_FOUND");
				}

				let resolvedIdentityId = beforePerson.identityId;
				let identityOutcome: string | null = null;

				if (input.phone) {
					const identityResult = await upsertGuestIdentity({
						client: tx,
						weddingId: input.weddingId,
						phone: input.phone,
						displayLabel: input.fullName ?? beforePerson.fullName,
						actorMembershipId: membership?.id,
					});

					if (!identityResult.ok) {
						throw new ORPCError("BAD_REQUEST", {
							message: identityResult.message,
						});
					}

					resolvedIdentityId = identityResult.identity.id;
					identityOutcome = identityResult.outcome;
				}

				const [updatedPerson] = await tx
					.update(guestPeople)
					.set({
						fullName: input.fullName ?? beforePerson.fullName,
						side: input.side ?? beforePerson.side,
						notes: input.notes !== undefined ? input.notes : beforePerson.notes,
						identityId: resolvedIdentityId,
						isInviteable: Boolean(resolvedIdentityId),
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(
						and(
							eq(guestPeople.id, input.personId),
							eq(guestPeople.weddingId, input.weddingId),
						),
					)
					.returning();

				if (!updatedPerson) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: updatedPerson.id,
					beforeSummary: {
						fullName: beforePerson.fullName,
						identityId: beforePerson.identityId,
						side: beforePerson.side,
					},
					afterSummary: {
						fullName: updatedPerson.fullName,
						identityId: updatedPerson.identityId,
						side: updatedPerson.side,
						identityOutcome,
					},
					reasonNote: input.reasonNote,
				});

				return updatedPerson;
			});
		}),

	archivePerson: protectedProcedure
		.input(personArchiveInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforePerson = await tx.query.guestPeople.findFirst({
					where: and(
						eq(guestPeople.id, input.personId),
						eq(guestPeople.weddingId, input.weddingId),
					),
				});

				if (!beforePerson) {
					throw new ORPCError("NOT_FOUND");
				}

				const [archivedPerson] = await tx
					.update(guestPeople)
					.set({
						isActive: false,
						isInviteable: false,
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(eq(guestPeople.id, beforePerson.id))
					.returning();

				if (!archivedPerson) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await tx
					.update(guestUnitMembers)
					.set({
						isActive: false,
						leftAt: new Date(),
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(
						and(
							eq(guestUnitMembers.weddingId, input.weddingId),
							eq(guestUnitMembers.personId, beforePerson.id),
							eq(guestUnitMembers.isActive, true),
						),
					);

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: archivedPerson.id,
					beforeSummary: {
						isActive: beforePerson.isActive,
						isInviteable: beforePerson.isInviteable,
					},
					afterSummary: {
						isActive: archivedPerson.isActive,
						isInviteable: archivedPerson.isInviteable,
					},
					reasonNote: input.reasonNote,
				});

				return archivedPerson;
			});
		}),

	listGuestUnits: protectedProcedure
		.input(weddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.read",
			});

			return db.query.guestUnits.findMany({
				where: eq(guestUnits.weddingId, input.weddingId),
				orderBy: [asc(guestUnits.displayName), asc(guestUnits.id)],
				with: {
					deliveryIdentity: true,
					members: {
						where: eq(guestUnitMembers.isActive, true),
						with: {
							person: true,
						},
					},
				},
			});
		}),

	createGuestUnit: protectedProcedure
		.input(guestUnitCreateInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const identityResult = await upsertGuestIdentity({
					client: tx,
					weddingId: input.weddingId,
					phone: input.deliveryPhone,
					displayLabel: input.displayName,
					actorMembershipId: membership?.id,
				});

				if (!identityResult.ok) {
					throw new ORPCError("BAD_REQUEST", {
						message: identityResult.message,
					});
				}

				const [createdGuestUnit] = await tx
					.insert(guestUnits)
					.values({
						id: crypto.randomUUID(),
						weddingId: input.weddingId,
						displayName: input.displayName,
						side: input.side ?? "neutral",
						deliveryIdentityId: identityResult.identity.id,
						isActive: true,
						isInviteable: true,
						createdByMembershipId: membership?.id ?? null,
						updatedByMembershipId: membership?.id ?? null,
					})
					.returning();

				if (!createdGuestUnit) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: createdGuestUnit.id,
					beforeSummary: null,
					afterSummary: {
						displayName: createdGuestUnit.displayName,
						identityOutcome: identityResult.outcome,
					},
					reasonNote: input.reasonNote,
				});

				return createdGuestUnit;
			});
		}),

	editGuestUnit: protectedProcedure
		.input(guestUnitEditInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeGuestUnit = await tx.query.guestUnits.findFirst({
					where: and(
						eq(guestUnits.id, input.guestUnitId),
						eq(guestUnits.weddingId, input.weddingId),
					),
				});

				if (!beforeGuestUnit) {
					throw new ORPCError("NOT_FOUND");
				}

				let deliveryIdentityId = beforeGuestUnit.deliveryIdentityId;
				let inviteable = beforeGuestUnit.isInviteable;
				let identityOutcome: string | null = null;

				if (input.deliveryPhone) {
					const identityResult = await upsertGuestIdentity({
						client: tx,
						weddingId: input.weddingId,
						phone: input.deliveryPhone,
						displayLabel: input.displayName ?? beforeGuestUnit.displayName,
						actorMembershipId: membership?.id,
					});

					if (!identityResult.ok) {
						throw new ORPCError("BAD_REQUEST", {
							message: identityResult.message,
						});
					}

					deliveryIdentityId = identityResult.identity.id;
					inviteable = true;
					identityOutcome = identityResult.outcome;
				}

				const [updatedGuestUnit] = await tx
					.update(guestUnits)
					.set({
						displayName: input.displayName ?? beforeGuestUnit.displayName,
						side: input.side ?? beforeGuestUnit.side,
						deliveryIdentityId,
						isInviteable: inviteable,
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(eq(guestUnits.id, beforeGuestUnit.id))
					.returning();

				if (!updatedGuestUnit) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: updatedGuestUnit.id,
					beforeSummary: {
						displayName: beforeGuestUnit.displayName,
						deliveryIdentityId: beforeGuestUnit.deliveryIdentityId,
					},
					afterSummary: {
						displayName: updatedGuestUnit.displayName,
						deliveryIdentityId: updatedGuestUnit.deliveryIdentityId,
						identityOutcome,
					},
					reasonNote: input.reasonNote,
				});

				return updatedGuestUnit;
			});
		}),

	archiveGuestUnit: protectedProcedure
		.input(guestUnitArchiveInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeGuestUnit = await tx.query.guestUnits.findFirst({
					where: and(
						eq(guestUnits.id, input.guestUnitId),
						eq(guestUnits.weddingId, input.weddingId),
					),
				});

				if (!beforeGuestUnit) {
					throw new ORPCError("NOT_FOUND");
				}

				const [archivedGuestUnit] = await tx
					.update(guestUnits)
					.set({
						isActive: false,
						isInviteable: false,
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(eq(guestUnits.id, beforeGuestUnit.id))
					.returning();

				if (!archivedGuestUnit) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await tx
					.update(guestUnitMembers)
					.set({
						isActive: false,
						leftAt: new Date(),
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(
						and(
							eq(guestUnitMembers.weddingId, input.weddingId),
							eq(guestUnitMembers.guestUnitId, beforeGuestUnit.id),
							eq(guestUnitMembers.isActive, true),
						),
					);

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: archivedGuestUnit.id,
					beforeSummary: {
						isActive: beforeGuestUnit.isActive,
						isInviteable: beforeGuestUnit.isInviteable,
					},
					afterSummary: {
						isActive: archivedGuestUnit.isActive,
						isInviteable: archivedGuestUnit.isInviteable,
					},
					reasonNote: input.reasonNote,
				});

				return archivedGuestUnit;
			});
		}),

	assignPersonToGuestUnit: protectedProcedure
		.input(assignPersonInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const person = await tx.query.guestPeople.findFirst({
					where: and(
						eq(guestPeople.id, input.personId),
						eq(guestPeople.weddingId, input.weddingId),
						eq(guestPeople.isActive, true),
					),
				});
				const guestUnit = await tx.query.guestUnits.findFirst({
					where: and(
						eq(guestUnits.id, input.guestUnitId),
						eq(guestUnits.weddingId, input.weddingId),
						eq(guestUnits.isActive, true),
					),
				});

				if (!person || !guestUnit) {
					throw new ORPCError("NOT_FOUND");
				}

				await tx
					.update(guestUnitMembers)
					.set({
						isActive: false,
						leftAt: new Date(),
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(
						and(
							eq(guestUnitMembers.weddingId, input.weddingId),
							eq(guestUnitMembers.personId, input.personId),
							eq(guestUnitMembers.isActive, true),
						),
					);

				const [createdMembership] = await tx
					.insert(guestUnitMembers)
					.values({
						id: crypto.randomUUID(),
						weddingId: input.weddingId,
						guestUnitId: input.guestUnitId,
						personId: input.personId,
						relationshipLabel: input.relationshipLabel ?? null,
						isPrimaryContact: input.isPrimaryContact ?? false,
						isActive: true,
						createdByMembershipId: membership?.id ?? null,
						updatedByMembershipId: membership?.id ?? null,
					})
					.returning();

				if (!createdMembership) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: createdMembership.id,
					beforeSummary: null,
					afterSummary: {
						personId: createdMembership.personId,
						guestUnitId: createdMembership.guestUnitId,
						isActive: createdMembership.isActive,
					},
					reasonNote: input.reasonNote,
				});

				return createdMembership;
			});
		}),

	removePersonFromGuestUnit: protectedProcedure
		.input(removePersonInput)
		.handler(async ({ context, input }) => {
			await assertGuestAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "guest.edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const activeMembership = await tx.query.guestUnitMembers.findFirst({
					where: and(
						eq(guestUnitMembers.weddingId, input.weddingId),
						eq(guestUnitMembers.personId, input.personId),
						eq(guestUnitMembers.isActive, true),
						input.guestUnitId
							? eq(guestUnitMembers.guestUnitId, input.guestUnitId)
							: undefined,
					),
				});

				if (!activeMembership) {
					throw new ORPCError("NOT_FOUND");
				}

				const [updatedMembership] = await tx
					.update(guestUnitMembers)
					.set({
						isActive: false,
						leftAt: new Date(),
						updatedByMembershipId: membership?.id ?? null,
					})
					.where(eq(guestUnitMembers.id, activeMembership.id))
					.returning();

				if (!updatedMembership) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.GUEST_EDIT,
					targetType: "guest",
					targetId: updatedMembership.id,
					beforeSummary: {
						isActive: activeMembership.isActive,
						guestUnitId: activeMembership.guestUnitId,
						personId: activeMembership.personId,
					},
					afterSummary: {
						isActive: updatedMembership.isActive,
						guestUnitId: updatedMembership.guestUnitId,
						personId: updatedMembership.personId,
					},
					reasonNote: input.reasonNote,
				});

				return updatedMembership;
			});
		}),
};
