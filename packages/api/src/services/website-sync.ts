import { db } from "@parinaya-os/db";
import { weddingEvents } from "@parinaya-os/db/schema/events";
import {
	rsvpFlowSessions,
	rsvpPersonResponses,
	websiteSyncStates,
} from "@parinaya-os/db/schema/rsvp";
import { env } from "@parinaya-os/env/server";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

export type WebsiteCtaState = {
	label: "Complete RSVP" | "Update RSVP";
	intent: "start" | "update";
	whatsappDeepLink: string | null;
	isFlowAvailable: boolean;
};

export type WebsiteFreshness = {
	lastUpdatedAt: Date | null;
	isStale: boolean;
	lagSeconds: number;
	staleReason: string | null;
};

export type WebsiteSnapshot = {
	weddingId: string;
	events: Array<{
		eventId: string;
		title: string;
		description: string | null;
		startsAt: Date | null;
		endsAt: Date | null;
	}>;
	rsvpSummary: {
		accepted: number;
		declined: number;
		total: number;
	};
	freshness: WebsiteFreshness;
	cta: WebsiteCtaState;
	protected: {
		schedule: Array<{
			eventId: string;
			title: string;
			startsAt: Date | null;
			endsAt: Date | null;
		}>;
		recentRsvpActivity: Array<{
			sessionId: string;
			finalResponse: "accept" | "decline" | null;
			updatedAt: Date;
		}>;
	};
};

export async function buildWebsiteSnapshot(input: {
	weddingId: string;
	phoneE164?: string | null;
	includeProtected?: boolean;
}): Promise<WebsiteSnapshot> {
	const publishedEvents = await db.query.weddingEvents.findMany({
		where: and(
			eq(weddingEvents.weddingId, input.weddingId),
			eq(weddingEvents.status, "published"),
		),
		orderBy: [asc(weddingEvents.sortOrder), asc(weddingEvents.createdAt)],
		columns: {
			id: true,
			title: true,
			description: true,
			startsAt: true,
			endsAt: true,
		},
	});

	const [rsvpSummary] = await db
		.select({
			accepted: sql<number>`sum(case when ${rsvpPersonResponses.response} = 'accept' then 1 else 0 end)`,
			declined: sql<number>`sum(case when ${rsvpPersonResponses.response} = 'decline' then 1 else 0 end)`,
			total: sql<number>`count(*)`,
		})
		.from(rsvpPersonResponses)
		.where(eq(rsvpPersonResponses.weddingId, input.weddingId));

	const [latestEventUpdate] = await db
		.select({
			value: sql<Date | null>`max(${weddingEvents.updatedAt})`,
		})
		.from(weddingEvents)
		.where(eq(weddingEvents.weddingId, input.weddingId));

	const [latestResponseUpdate] = await db
		.select({
			value: sql<Date | null>`max(${rsvpPersonResponses.updatedAt})`,
		})
		.from(rsvpPersonResponses)
		.where(eq(rsvpPersonResponses.weddingId, input.weddingId));

	const [persistedFreshness] = await db
		.select({
			lastUpdatedAt: websiteSyncStates.lastUpdatedAt,
			isStale: websiteSyncStates.isStale,
			lagSeconds: websiteSyncStates.lagSeconds,
			staleReason: websiteSyncStates.staleReason,
		})
		.from(websiteSyncStates)
		.where(
			and(
				eq(websiteSyncStates.weddingId, input.weddingId),
				isNull(websiteSyncStates.eventId),
			),
		)
		.orderBy(desc(websiteSyncStates.updatedAt))
		.limit(1);

	const lastSourceUpdatedAt =
		latestResponseUpdate?.value ?? latestEventUpdate?.value ?? null;

	const now = Date.now();
	const lagSeconds = lastSourceUpdatedAt
		? Math.max(0, Math.floor((now - lastSourceUpdatedAt.getTime()) / 1000))
		: (persistedFreshness?.lagSeconds ?? 0);

	const staleThreshold = env.WEBSITE_SYNC_STALE_THRESHOLD_SECONDS;
	const computedStale = lagSeconds > staleThreshold;

	const freshness: WebsiteFreshness = {
		lastUpdatedAt:
			persistedFreshness?.lastUpdatedAt ??
			lastSourceUpdatedAt ??
			persistedFreshness?.lastUpdatedAt ??
			null,
		isStale: persistedFreshness?.isStale ?? computedStale,
		lagSeconds,
		staleReason:
			persistedFreshness?.staleReason ??
			(computedStale ? "lag-threshold-exceeded" : null),
	};

	const lastKnownSession = input.phoneE164
		? await db.query.rsvpFlowSessions.findFirst({
				where: and(
					eq(rsvpFlowSessions.weddingId, input.weddingId),
					eq(rsvpFlowSessions.phoneE164, input.phoneE164),
				),
				orderBy: [desc(rsvpFlowSessions.updatedAt)],
				columns: {
					flowStatus: true,
					phoneE164: true,
				},
			})
		: null;

	const cta: WebsiteCtaState = {
		label:
			lastKnownSession?.flowStatus === "completed"
				? "Update RSVP"
				: "Complete RSVP",
		intent: lastKnownSession?.flowStatus === "completed" ? "update" : "start",
		whatsappDeepLink: input.phoneE164
			? `https://wa.me/${input.phoneE164.replace(/\D/g, "")}`
			: null,
		isFlowAvailable: publishedEvents.length > 0,
	};

	const recentRsvpActivity = input.includeProtected
		? await db.query.rsvpFlowSessions.findMany({
				where: eq(rsvpFlowSessions.weddingId, input.weddingId),
				orderBy: [desc(rsvpFlowSessions.updatedAt)],
				limit: 10,
				columns: {
					id: true,
					finalResponse: true,
					updatedAt: true,
				},
			})
		: [];

	return {
		weddingId: input.weddingId,
		events: publishedEvents.map((event) => ({
			eventId: event.id,
			title: event.title,
			description: event.description,
			startsAt: event.startsAt,
			endsAt: event.endsAt,
		})),
		rsvpSummary: {
			accepted: rsvpSummary?.accepted ?? 0,
			declined: rsvpSummary?.declined ?? 0,
			total: rsvpSummary?.total ?? 0,
		},
		freshness,
		cta,
		protected: {
			schedule: publishedEvents.map((event) => ({
				eventId: event.id,
				title: event.title,
				startsAt: event.startsAt,
				endsAt: event.endsAt,
			})),
			recentRsvpActivity: recentRsvpActivity.map((entry) => ({
				sessionId: entry.id,
				finalResponse: entry.finalResponse,
				updatedAt: entry.updatedAt,
			})),
		},
	};
}
