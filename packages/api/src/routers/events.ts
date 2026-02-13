import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import {
	eventLifecycleStatusEnum,
	eventVisibilityEnum,
	eventVisibilityGrants,
	weddingEvents,
} from "@parinaya-os/db/schema/events";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import { and, asc, desc, eq, gt, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	forbiddenError,
	getRoleByMembership,
} from "../policies/authorize";
import { AUDIT_ACTIONS, writeAuditLog } from "../services/audit-log";

const createEventInput = z.object({
	weddingId: z.string().min(1),
	title: z.string().min(1),
	slug: z.string().min(1),
	description: z.string().optional(),
	startsAt: z.coerce.date().optional().nullable(),
	endsAt: z.coerce.date().optional().nullable(),
});

const editEventInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1),
	title: z.string().min(1).optional(),
	slug: z.string().min(1).optional(),
	description: z.string().optional().nullable(),
	startsAt: z.coerce.date().optional().nullable(),
	endsAt: z.coerce.date().optional().nullable(),
	status: z.enum(eventLifecycleStatusEnum.enumValues).optional(),
	visibility: z.enum(eventVisibilityEnum.enumValues).optional(),
	reasonNote: z.string().optional(),
});

const eventIdentityInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1),
	reasonNote: z.string().optional(),
});

const reorderInput = z.object({
	weddingId: z.string().min(1),
	orderedEventIds: z.array(z.string().min(1)).min(1),
	reasonNote: z.string().optional(),
});

const eventReadInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1),
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

async function assertAuthorizedForMutation(input: {
	weddingId: string;
	userId: string;
	action: Parameters<typeof assertCan>[1];
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);
	assertCan(role, input.action);
}

export const eventsRouter = {
	create: protectedProcedure
		.input(createEventInput)
		.handler(async ({ context, input }) => {
			await assertAuthorizedForMutation({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "event.create",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);
			const maxSortOrderRow = await db.query.weddingEvents.findFirst({
				columns: {
					sortOrder: true,
				},
				where: eq(weddingEvents.weddingId, input.weddingId),
				orderBy: [desc(weddingEvents.sortOrder)],
			});

			return db.transaction(async (tx) => {
				const [createdEvent] = await tx
					.insert(weddingEvents)
					.values({
						id: crypto.randomUUID(),
						weddingId: input.weddingId,
						title: input.title,
						slug: input.slug,
						description: input.description ?? null,
						startsAt: input.startsAt ?? null,
						endsAt: input.endsAt ?? null,
						status: "draft",
						visibility: "invite-only",
						sortOrder: (maxSortOrderRow?.sortOrder ?? -1) + 1,
						createdByMembershipId: membership?.id ?? null,
					})
					.returning();

				if (!createdEvent) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.EVENT_CREATE,
					targetType: "event",
					targetId: createdEvent.id,
					beforeSummary: null,
					afterSummary: {
						title: createdEvent.title,
						status: createdEvent.status,
						visibility: createdEvent.visibility,
						sortOrder: createdEvent.sortOrder,
					},
				});

				return createdEvent;
			});
		}),

	edit: protectedProcedure
		.input(editEventInput)
		.handler(async ({ context, input }) => {
			await assertAuthorizedForMutation({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "event.update",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeEvent = await tx.query.weddingEvents.findFirst({
					where: and(
						eq(weddingEvents.id, input.eventId),
						eq(weddingEvents.weddingId, input.weddingId),
					),
				});

				if (!beforeEvent) {
					throw new ORPCError("NOT_FOUND");
				}

				const [updatedEvent] = await tx
					.update(weddingEvents)
					.set({
						title: input.title ?? beforeEvent.title,
						slug: input.slug ?? beforeEvent.slug,
						description: input.description ?? beforeEvent.description,
						startsAt: input.startsAt ?? beforeEvent.startsAt,
						endsAt: input.endsAt ?? beforeEvent.endsAt,
						status: input.status ?? beforeEvent.status,
						visibility: input.visibility ?? beforeEvent.visibility,
						publishedAt:
							(input.status ?? beforeEvent.status) === "published" &&
							!beforeEvent.publishedAt
								? new Date()
								: beforeEvent.publishedAt,
						archivedAt:
							(input.status ?? beforeEvent.status) === "archived"
								? new Date()
								: (input.status ?? beforeEvent.status) === "draft"
									? null
									: beforeEvent.archivedAt,
					})
					.where(
						and(
							eq(weddingEvents.id, input.eventId),
							eq(weddingEvents.weddingId, input.weddingId),
						),
					)
					.returning();

				if (!updatedEvent) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				const actionType =
					beforeEvent.visibility !== updatedEvent.visibility
						? AUDIT_ACTIONS.EVENT_VISIBILITY_CHANGE
						: AUDIT_ACTIONS.EVENT_EDIT;

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType,
					targetType: "event",
					targetId: updatedEvent.id,
					beforeSummary: {
						title: beforeEvent.title,
						status: beforeEvent.status,
						visibility: beforeEvent.visibility,
						sortOrder: beforeEvent.sortOrder,
					},
					afterSummary: {
						title: updatedEvent.title,
						status: updatedEvent.status,
						visibility: updatedEvent.visibility,
						sortOrder: updatedEvent.sortOrder,
					},
					reasonNote: input.reasonNote,
				});

				return updatedEvent;
			});
		}),

	archive: protectedProcedure
		.input(eventIdentityInput)
		.handler(async ({ context, input }) => {
			await assertAuthorizedForMutation({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "event.archive",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeEvent = await tx.query.weddingEvents.findFirst({
					where: and(
						eq(weddingEvents.id, input.eventId),
						eq(weddingEvents.weddingId, input.weddingId),
					),
				});

				if (!beforeEvent) {
					throw new ORPCError("NOT_FOUND");
				}

				const [archivedEvent] = await tx
					.update(weddingEvents)
					.set({
						status: "archived",
						archivedAt: new Date(),
					})
					.where(
						and(
							eq(weddingEvents.id, input.eventId),
							eq(weddingEvents.weddingId, input.weddingId),
						),
					)
					.returning();

				if (!archivedEvent) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.EVENT_ARCHIVE,
					targetType: "event",
					targetId: archivedEvent.id,
					beforeSummary: {
						status: beforeEvent.status,
						archivedAt: beforeEvent.archivedAt,
					},
					afterSummary: {
						status: archivedEvent.status,
						archivedAt: archivedEvent.archivedAt,
					},
					reasonNote: input.reasonNote,
				});

				return archivedEvent;
			});
		}),

	restore: protectedProcedure
		.input(eventIdentityInput)
		.handler(async ({ context, input }) => {
			await assertAuthorizedForMutation({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "event.restore",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeEvent = await tx.query.weddingEvents.findFirst({
					where: and(
						eq(weddingEvents.id, input.eventId),
						eq(weddingEvents.weddingId, input.weddingId),
					),
				});

				if (!beforeEvent) {
					throw new ORPCError("NOT_FOUND");
				}

				const [restoredEvent] = await tx
					.update(weddingEvents)
					.set({
						status: "draft",
						archivedAt: null,
					})
					.where(
						and(
							eq(weddingEvents.id, input.eventId),
							eq(weddingEvents.weddingId, input.weddingId),
						),
					)
					.returning();

				if (!restoredEvent) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.EVENT_RESTORE,
					targetType: "event",
					targetId: restoredEvent.id,
					beforeSummary: {
						status: beforeEvent.status,
						archivedAt: beforeEvent.archivedAt,
					},
					afterSummary: {
						status: restoredEvent.status,
						archivedAt: restoredEvent.archivedAt,
					},
					reasonNote: input.reasonNote,
				});

				return restoredEvent;
			});
		}),

	reorder: protectedProcedure
		.input(reorderInput)
		.handler(async ({ context, input }) => {
			await assertAuthorizedForMutation({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				action: "event.reorder",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			return db.transaction(async (tx) => {
				const beforeOrder = await tx.query.weddingEvents.findMany({
					columns: {
						id: true,
						sortOrder: true,
					},
					where: eq(weddingEvents.weddingId, input.weddingId),
					orderBy: [asc(weddingEvents.sortOrder), asc(weddingEvents.id)],
				});

				if (beforeOrder.length !== input.orderedEventIds.length) {
					throw forbiddenError();
				}

				for (const [index, eventId] of input.orderedEventIds.entries()) {
					const updatedRows = await tx
						.update(weddingEvents)
						.set({ sortOrder: index })
						.where(
							and(
								eq(weddingEvents.id, eventId),
								eq(weddingEvents.weddingId, input.weddingId),
							),
						)
						.returning({ id: weddingEvents.id });

					if (updatedRows.length === 0) {
						throw forbiddenError();
					}
				}

				const afterOrder = await tx.query.weddingEvents.findMany({
					columns: {
						id: true,
						sortOrder: true,
					},
					where: eq(weddingEvents.weddingId, input.weddingId),
					orderBy: [asc(weddingEvents.sortOrder), asc(weddingEvents.id)],
				});

				await writeAuditLog(tx, {
					weddingId: input.weddingId,
					actorMembershipId: membership?.id ?? null,
					actionType: AUDIT_ACTIONS.EVENT_REORDER,
					targetType: "event",
					targetId: null,
					beforeSummary: {
						order: beforeOrder,
					},
					afterSummary: {
						order: afterOrder,
					},
					reasonNote: input.reasonNote,
				});

				return afterOrder;
			});
		}),

	listPublic: publicProcedure
		.input(
			z.object({
				weddingId: z.string().min(1),
			}),
		)
		.handler(async ({ input }) => {
			return db.query.weddingEvents.findMany({
				where: and(
					eq(weddingEvents.weddingId, input.weddingId),
					eq(weddingEvents.status, "published"),
					eq(weddingEvents.visibility, "public"),
					isNull(weddingEvents.archivedAt),
				),
				orderBy: [asc(weddingEvents.sortOrder), asc(weddingEvents.id)],
			});
		}),

	getDetail: publicProcedure
		.input(eventReadInput)
		.handler(async ({ context, input }) => {
			const event = await db.query.weddingEvents.findFirst({
				where: and(
					eq(weddingEvents.id, input.eventId),
					eq(weddingEvents.weddingId, input.weddingId),
				),
			});

			if (!event) {
				throw new ORPCError("NOT_FOUND");
			}

			if (event.visibility === "invite-only") {
				if (!context.session?.user) {
					throw new ORPCError("UNAUTHORIZED");
				}

				const now = new Date();
				const eligibility = await db.query.eventVisibilityGrants.findFirst({
					where: and(
						eq(eventVisibilityGrants.eventId, event.id),
						eq(eventVisibilityGrants.principalType, "user"),
						eq(eventVisibilityGrants.principalId, context.session.user.id),
						isNull(eventVisibilityGrants.revokedAt),
						or(
							isNull(eventVisibilityGrants.expiresAt),
							gt(eventVisibilityGrants.expiresAt, now),
						),
					),
				});

				if (!eligibility) {
					throw forbiddenError();
				}
			}

			return event;
		}),
};
