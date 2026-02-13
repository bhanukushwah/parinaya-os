import { db } from "@parinaya-os/db";
import { weddingEvents } from "@parinaya-os/db/schema/events";
import {
	guestSideEnum,
	guestUnitMembers,
	guestUnits,
} from "@parinaya-os/db/schema/guests";
import {
	type rsvpFinalResponseEnum,
	rsvpPersonResponses,
} from "@parinaya-os/db/schema/rsvp";
import { inviteMessages } from "@parinaya-os/db/schema/whatsapp";
import { and, asc, eq, inArray } from "drizzle-orm";

type GuestSide = (typeof guestSideEnum.enumValues)[number];
type RsvpResponse = (typeof rsvpFinalResponseEnum.enumValues)[number];

export const OPERATIONS_SIDE_FILTER_VALUES = [
	"all",
	...guestSideEnum.enumValues,
] as const;

export const OPERATIONS_RSVP_FILTER_VALUES = [
	"all",
	"responded",
	"accepted",
	"declined",
	"pending",
] as const;

export type OperationsSideFilter =
	(typeof OPERATIONS_SIDE_FILTER_VALUES)[number];
export type OperationsRsvpFilter =
	(typeof OPERATIONS_RSVP_FILTER_VALUES)[number];

export type OperationsFilters = {
	eventId: string | "all";
	side: OperationsSideFilter;
	rsvpStatus: OperationsRsvpFilter;
};

export type OperationsDatasetRow = {
	eventId: string;
	eventTitle: string;
	eventDate: Date | null;
	side: GuestSide;
	guestUnitId: string;
	guestUnitName: string;
	deliveryPhoneE164: string | null;
	personId: string;
	personName: string;
	rsvpStatus: "accepted" | "declined" | "pending";
	respondedAt: Date | null;
	lastInviteStatus: "sent" | "delivered" | "read" | "failed" | null;
	lastInviteAt: Date | null;
};

export type OperationsDataset = {
	filters: OperationsFilters;
	metrics: {
		invited: number;
		responded: number;
		accepted: number;
		declined: number;
		pending: number;
	};
	dataAsOf: Date | null;
	rows: OperationsDatasetRow[];
};

export type OperationsFilterOptions = {
	events: Array<{
		id: string;
		title: string;
		eventDate: Date | null;
	}>;
	sides: typeof OPERATIONS_SIDE_FILTER_VALUES;
	rsvpStatuses: typeof OPERATIONS_RSVP_FILTER_VALUES;
};

type InviteCandidateRow = {
	eventId: string;
	eventTitle: string;
	eventDate: Date | null;
	eventUpdatedAt: Date;
	guestUnitId: string;
	guestUnitName: string;
	guestUnitUpdatedAt: Date;
	deliveryPhoneE164: string | null;
	personId: string;
	personName: string;
	personSide: GuestSide;
	personUpdatedAt: Date;
	lastInviteStatus: "sent" | "delivered" | "read" | "failed" | null;
	lastInviteAt: Date | null;
	lastInviteUpdatedAt: Date;
};

type InviteStatusRow = {
	eventId: string;
	guestUnitId: string;
	eventTitle: string;
	eventDate: Date | null;
	eventUpdatedAt: Date;
	guestUnitName: string;
	guestUnitUpdatedAt: Date;
	deliveryPhoneE164: string | null;
	lastInviteStatus: "sent" | "delivered" | "read" | "failed";
	lastInviteAt: Date | null;
	lastInviteUpdatedAt: Date;
};

function toDatasetKey(eventId: string, personId: string) {
	return `${eventId}::${personId}`;
}

function normalizeEventId(eventId: string | null | undefined): string | "all" {
	if (!eventId) {
		return "all";
	}
	const normalized = eventId.trim();
	return normalized.length > 0 ? normalized : "all";
}

export function normalizeOperationsFilters(input: {
	eventId?: string | null;
	side?: string | null;
	rsvpStatus?: string | null;
}): OperationsFilters {
	const side = input.side?.trim().toLowerCase() ?? "all";
	const rsvpStatus = input.rsvpStatus?.trim().toLowerCase() ?? "all";

	return {
		eventId: normalizeEventId(input.eventId),
		side: OPERATIONS_SIDE_FILTER_VALUES.includes(side as OperationsSideFilter)
			? (side as OperationsSideFilter)
			: "all",
		rsvpStatus: OPERATIONS_RSVP_FILTER_VALUES.includes(
			rsvpStatus as OperationsRsvpFilter,
		)
			? (rsvpStatus as OperationsRsvpFilter)
			: "all",
	};
}

function compareNullableDateAsc(left: Date | null, right: Date | null) {
	if (left && right) {
		return left.getTime() - right.getTime();
	}
	if (left) {
		return -1;
	}
	if (right) {
		return 1;
	}
	return 0;
}

function maxDate(...values: Array<Date | null | undefined>): Date | null {
	let current: Date | null = null;
	for (const value of values) {
		if (!value) {
			continue;
		}
		if (!current || value.getTime() > current.getTime()) {
			current = value;
		}
	}
	return current;
}

function mapRsvpStatus(
	response: RsvpResponse | null,
): "accepted" | "declined" | "pending" {
	if (response === "accept") {
		return "accepted";
	}
	if (response === "decline") {
		return "declined";
	}
	return "pending";
}

function passRsvpFilter(
	status: OperationsDatasetRow["rsvpStatus"],
	filter: OperationsRsvpFilter,
) {
	if (filter === "all") {
		return true;
	}
	if (filter === "responded") {
		return status === "accepted" || status === "declined";
	}
	if (filter === "accepted") {
		return status === "accepted";
	}
	if (filter === "declined") {
		return status === "declined";
	}
	return status === "pending";
}

export function applyOperationsFilters(
	rows: OperationsDatasetRow[],
	filters: OperationsFilters,
) {
	let filtered = rows;

	if (filters.eventId !== "all") {
		filtered = filtered.filter((row) => row.eventId === filters.eventId);
	}

	if (filters.side !== "all") {
		filtered = filtered.filter((row) => row.side === filters.side);
	}

	if (filters.rsvpStatus !== "all") {
		filtered = filtered.filter((row) =>
			passRsvpFilter(row.rsvpStatus, filters.rsvpStatus),
		);
	}

	return filtered;
}

export function computeOperationsMetrics(rows: OperationsDatasetRow[]) {
	const invited = rows.length;
	let accepted = 0;
	let declined = 0;

	for (const row of rows) {
		if (row.rsvpStatus === "accepted") {
			accepted += 1;
			continue;
		}

		if (row.rsvpStatus === "declined") {
			declined += 1;
		}
	}

	const responded = accepted + declined;
	const pending = Math.max(0, invited - responded);

	return {
		invited,
		responded,
		accepted,
		declined,
		pending,
	};
}

export function sortOperationsRows(rows: OperationsDatasetRow[]) {
	return [...rows].sort((left, right) => {
		const eventDateCompare = compareNullableDateAsc(
			left.eventDate,
			right.eventDate,
		);
		if (eventDateCompare !== 0) {
			return eventDateCompare;
		}

		const sideCompare = left.side.localeCompare(right.side);
		if (sideCompare !== 0) {
			return sideCompare;
		}

		const guestUnitCompare = left.guestUnitName.localeCompare(
			right.guestUnitName,
		);
		if (guestUnitCompare !== 0) {
			return guestUnitCompare;
		}

		const personCompare = left.personName.localeCompare(right.personName);
		if (personCompare !== 0) {
			return personCompare;
		}

		const eventIdCompare = left.eventId.localeCompare(right.eventId);
		if (eventIdCompare !== 0) {
			return eventIdCompare;
		}

		return left.personId.localeCompare(right.personId);
	});
}

export function computeOperationsDataAsOf(
	rows: Array<{ updatedAt: Date }>,
): Date | null {
	if (rows.length === 0) {
		return null;
	}

	const firstRow = rows.at(0);
	if (!firstRow) {
		return null;
	}

	let latest = firstRow.updatedAt;
	for (const row of rows) {
		if (row.updatedAt.getTime() > latest.getTime()) {
			latest = row.updatedAt;
		}
	}

	return latest;
}

async function getLatestInviteByEventUnit(input: {
	weddingId: string;
	eventId: string | "all";
}) {
	const inviteRows = await db.query.inviteMessages.findMany({
		columns: {
			eventId: true,
			recipientGuestUnitId: true,
			lifecycleStatus: true,
			lastStatusAt: true,
			updatedAt: true,
		},
		where: and(
			eq(inviteMessages.weddingId, input.weddingId),
			input.eventId === "all"
				? undefined
				: eq(inviteMessages.eventId, input.eventId),
		),
		with: {
			event: {
				columns: {
					id: true,
					title: true,
					startsAt: true,
					updatedAt: true,
				},
			},
			recipientGuestUnit: {
				columns: {
					id: true,
					displayName: true,
					updatedAt: true,
					isActive: true,
					isInviteable: true,
				},
				with: {
					deliveryIdentity: {
						columns: {
							normalizedPhoneE164: true,
						},
					},
				},
			},
		},
	});

	const latestByKey = new Map<string, InviteStatusRow>();

	for (const inviteRow of inviteRows) {
		if (!inviteRow.recipientGuestUnitId || !inviteRow.recipientGuestUnit) {
			continue;
		}

		if (
			!inviteRow.recipientGuestUnit.isActive ||
			!inviteRow.recipientGuestUnit.isInviteable
		) {
			continue;
		}

		const key = `${inviteRow.eventId}::${inviteRow.recipientGuestUnitId}`;
		const lastInviteUpdatedAt = maxDate(
			inviteRow.lastStatusAt,
			inviteRow.updatedAt,
		) as Date;

		const candidate: InviteStatusRow = {
			eventId: inviteRow.event.id,
			eventTitle: inviteRow.event.title,
			eventDate: inviteRow.event.startsAt,
			eventUpdatedAt: inviteRow.event.updatedAt,
			guestUnitId: inviteRow.recipientGuestUnit.id,
			guestUnitName: inviteRow.recipientGuestUnit.displayName,
			guestUnitUpdatedAt: inviteRow.recipientGuestUnit.updatedAt,
			deliveryPhoneE164:
				inviteRow.recipientGuestUnit.deliveryIdentity?.normalizedPhoneE164 ??
				null,
			lastInviteStatus: inviteRow.lifecycleStatus,
			lastInviteAt: inviteRow.lastStatusAt,
			lastInviteUpdatedAt,
		};

		const existing = latestByKey.get(key);
		if (!existing) {
			latestByKey.set(key, candidate);
			continue;
		}

		if (
			candidate.lastInviteUpdatedAt.getTime() >
			existing.lastInviteUpdatedAt.getTime()
		) {
			latestByKey.set(key, candidate);
		}
	}

	return latestByKey;
}

async function buildInviteCandidateRows(input: {
	weddingId: string;
	eventId: string | "all";
}): Promise<InviteCandidateRow[]> {
	const latestByEventUnit = await getLatestInviteByEventUnit(input);
	if (latestByEventUnit.size === 0) {
		return [];
	}

	const guestUnitIds = Array.from(
		new Set(
			Array.from(latestByEventUnit.values()).map(
				(latestRow) => latestRow.guestUnitId,
			),
		),
	);

	const units = await db.query.guestUnits.findMany({
		columns: {
			id: true,
		},
		where: and(
			eq(guestUnits.weddingId, input.weddingId),
			eq(guestUnits.isActive, true),
			inArray(guestUnits.id, guestUnitIds),
		),
		with: {
			members: {
				columns: {
					guestUnitId: true,
					personId: true,
					isActive: true,
				},
				where: eq(guestUnitMembers.isActive, true),
				with: {
					person: {
						columns: {
							id: true,
							fullName: true,
							side: true,
							isActive: true,
							isInviteable: true,
							updatedAt: true,
						},
					},
				},
			},
		},
	});

	const rows: InviteCandidateRow[] = [];
	for (const unit of units) {
		const latestRowsForUnit = Array.from(latestByEventUnit.values()).filter(
			(latestRow) => latestRow.guestUnitId === unit.id,
		);

		for (const latestRow of latestRowsForUnit) {
			for (const membership of unit.members) {
				if (!membership.isActive) {
					continue;
				}

				if (!membership.person.isActive || !membership.person.isInviteable) {
					continue;
				}

				rows.push({
					eventId: latestRow.eventId,
					eventTitle: latestRow.eventTitle,
					eventDate: latestRow.eventDate,
					eventUpdatedAt: latestRow.eventUpdatedAt,
					guestUnitId: latestRow.guestUnitId,
					guestUnitName: latestRow.guestUnitName,
					guestUnitUpdatedAt: latestRow.guestUnitUpdatedAt,
					deliveryPhoneE164: latestRow.deliveryPhoneE164,
					personId: membership.person.id,
					personName: membership.person.fullName,
					personSide: membership.person.side,
					personUpdatedAt: membership.person.updatedAt,
					lastInviteStatus: latestRow.lastInviteStatus,
					lastInviteAt: latestRow.lastInviteAt,
					lastInviteUpdatedAt: latestRow.lastInviteUpdatedAt,
				});
			}
		}
	}

	const dedupedByEventPerson = new Map<string, InviteCandidateRow>();
	for (const row of rows) {
		const key = toDatasetKey(row.eventId, row.personId);
		const existing = dedupedByEventPerson.get(key);
		if (!existing) {
			dedupedByEventPerson.set(key, row);
			continue;
		}

		if (
			row.lastInviteUpdatedAt.getTime() > existing.lastInviteUpdatedAt.getTime()
		) {
			dedupedByEventPerson.set(key, row);
		}
	}

	return Array.from(dedupedByEventPerson.values());
}

export async function getOperationsDataset(input: {
	weddingId: string;
	filters: OperationsFilters;
}): Promise<OperationsDataset> {
	const candidateRows = await buildInviteCandidateRows({
		weddingId: input.weddingId,
		eventId: input.filters.eventId,
	});

	if (candidateRows.length === 0) {
		return {
			filters: input.filters,
			metrics: {
				invited: 0,
				responded: 0,
				accepted: 0,
				declined: 0,
				pending: 0,
			},
			dataAsOf: null,
			rows: [],
		};
	}

	const personIds = Array.from(
		new Set(candidateRows.map((candidateRow) => candidateRow.personId)),
	);
	const eventIds = Array.from(
		new Set(candidateRows.map((candidateRow) => candidateRow.eventId)),
	);

	const responses = await db.query.rsvpPersonResponses.findMany({
		columns: {
			eventId: true,
			personId: true,
			response: true,
			respondedAt: true,
			updatedAt: true,
		},
		where: and(
			eq(rsvpPersonResponses.weddingId, input.weddingId),
			inArray(rsvpPersonResponses.eventId, eventIds),
			inArray(rsvpPersonResponses.personId, personIds),
		),
	});

	const responseByEventPerson = new Map(
		responses.map((responseRow) => [
			toDatasetKey(responseRow.eventId, responseRow.personId),
			responseRow,
		]),
	);

	const rowsWithMeta = candidateRows.map((candidateRow) => {
		const response = responseByEventPerson.get(
			toDatasetKey(candidateRow.eventId, candidateRow.personId),
		);
		const rsvpStatus = mapRsvpStatus(response?.response ?? null);
		const updatedAt = maxDate(
			candidateRow.eventUpdatedAt,
			candidateRow.guestUnitUpdatedAt,
			candidateRow.personUpdatedAt,
			candidateRow.lastInviteUpdatedAt,
			response?.updatedAt,
		) as Date;

		const row: OperationsDatasetRow = {
			eventId: candidateRow.eventId,
			eventTitle: candidateRow.eventTitle,
			eventDate: candidateRow.eventDate,
			side: candidateRow.personSide,
			guestUnitId: candidateRow.guestUnitId,
			guestUnitName: candidateRow.guestUnitName,
			deliveryPhoneE164: candidateRow.deliveryPhoneE164,
			personId: candidateRow.personId,
			personName: candidateRow.personName,
			rsvpStatus,
			respondedAt: response?.respondedAt ?? null,
			lastInviteStatus: candidateRow.lastInviteStatus,
			lastInviteAt: candidateRow.lastInviteAt,
		};

		return {
			row,
			updatedAt,
		};
	});

	const filteredRowsWithMeta = rowsWithMeta.filter(({ row }) => {
		if (input.filters.side !== "all" && row.side !== input.filters.side) {
			return false;
		}

		return passRsvpFilter(row.rsvpStatus, input.filters.rsvpStatus);
	});

	const dataAsOf = computeOperationsDataAsOf(filteredRowsWithMeta);

	const rows = sortOperationsRows(
		filteredRowsWithMeta.map((entry) => entry.row),
	);
	const metrics = computeOperationsMetrics(rows);

	return {
		filters: input.filters,
		metrics,
		dataAsOf,
		rows,
	};
}

export async function getOperationsFilterOptions(input: {
	weddingId: string;
}): Promise<OperationsFilterOptions> {
	const events = await db
		.select({
			id: weddingEvents.id,
			title: weddingEvents.title,
			eventDate: weddingEvents.startsAt,
		})
		.from(weddingEvents)
		.where(eq(weddingEvents.weddingId, input.weddingId))
		.orderBy(
			asc(weddingEvents.startsAt),
			asc(weddingEvents.title),
			asc(weddingEvents.id),
		);

	return {
		events,
		sides: OPERATIONS_SIDE_FILTER_VALUES,
		rsvpStatuses: OPERATIONS_RSVP_FILTER_VALUES,
	};
}
