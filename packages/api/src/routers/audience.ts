import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { weddingEvents } from "@parinaya-os/db/schema/events";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import { guestSideEnum } from "@parinaya-os/db/schema/guests";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	getRoleByMembership,
} from "../policies/authorize";
import { buildAudience } from "../services/audience-builder";

const audienceInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.string().min(1),
	side: z.enum(guestSideEnum.enumValues).optional().nullable(),
	tagIds: z.array(z.string().min(1)).optional(),
	search: z.string().trim().optional().nullable(),
	includeGuestUnitIds: z.array(z.string().min(1)).optional(),
	excludeGuestUnitIds: z.array(z.string().min(1)).optional(),
});

async function assertAudienceAccess(input: {
	weddingId: string;
	userId: string;
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);
	assertCan(role, "event.update");
}

async function getMembershipForUser(weddingId: string, userId: string) {
	return db.query.weddingMemberships.findFirst({
		columns: {
			id: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, weddingId),
			eq(weddingMemberships.userId, userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});
}

async function resolveAudienceForEvent(input: z.infer<typeof audienceInput>) {
	const event = await db.query.weddingEvents.findFirst({
		columns: {
			id: true,
		},
		where: and(
			eq(weddingEvents.id, input.eventId),
			eq(weddingEvents.weddingId, input.weddingId),
		),
	});

	if (!event) {
		throw new ORPCError("NOT_FOUND", {
			message: "Event not found for this workspace.",
		});
	}

	const audience = await buildAudience({
		weddingId: input.weddingId,
		side: input.side,
		tagIds: input.tagIds,
		search: input.search,
		includeGuestUnitIds: input.includeGuestUnitIds,
		excludeGuestUnitIds: input.excludeGuestUnitIds,
	});

	const recipients = audience.recipients;

	const recipientSample = recipients.recipients.slice(0, 20).map((target) => ({
		phoneE164: target.phoneE164,
		primarySource: target.sources[0]?.type ?? "person",
		sourceCount: target.sources.length,
		guestUnitIds: Array.from(
			new Set(target.sources.map((source) => source.guestUnitId)),
		),
	}));

	return {
		audience,
		recipients: {
			count: recipients.recipientCount,
			totalCandidateGuestUnits: recipients.totalCandidateGuestUnits,
			resolvedGuestUnits: recipients.resolvedGuestUnits,
			skippedGuestUnitIds: recipients.skippedGuestUnitIds,
			sample: recipientSample,
		},
	};
}

export const audienceRouter = {
	preview: protectedProcedure
		.input(audienceInput)
		.handler(async ({ context, input }) => {
			await assertAudienceAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			return resolveAudienceForEvent(input);
		}),

	precheckSend: protectedProcedure
		.input(audienceInput)
		.handler(async ({ context, input }) => {
			await assertAudienceAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);

			const resolved = await resolveAudienceForEvent(input);
			return {
				...resolved,
				eventId: input.eventId,
				weddingId: input.weddingId,
				readyToSend: resolved.recipients.count > 0,
				checkedByMembershipId: membership?.id ?? null,
				checkedAt: new Date(),
			};
		}),
};
