import { describe, expect, it } from "bun:test";

import {
	applyOperationsFilters,
	computeOperationsDataAsOf,
	computeOperationsMetrics,
	normalizeOperationsFilters,
	type OperationsDatasetRow,
	sortOperationsRows,
} from "./operations-dashboard";

function makeRow(
	overrides: Partial<OperationsDatasetRow> & {
		eventId: string;
		guestUnitId: string;
		personId: string;
	},
): OperationsDatasetRow {
	return {
		eventId: overrides.eventId,
		eventTitle: overrides.eventTitle ?? `Event ${overrides.eventId}`,
		eventDate: overrides.eventDate ?? new Date("2026-02-01T10:00:00.000Z"),
		side: overrides.side ?? "neutral",
		guestUnitId: overrides.guestUnitId,
		guestUnitName: overrides.guestUnitName ?? `Unit ${overrides.guestUnitId}`,
		deliveryPhoneE164: overrides.deliveryPhoneE164 ?? "+919000000000",
		personId: overrides.personId,
		personName: overrides.personName ?? `Person ${overrides.personId}`,
		rsvpStatus: overrides.rsvpStatus ?? "pending",
		respondedAt: overrides.respondedAt ?? null,
		lastInviteStatus: overrides.lastInviteStatus ?? "sent",
		lastInviteAt:
			overrides.lastInviteAt ?? new Date("2026-02-01T09:00:00.000Z"),
	};
}

describe("operations dashboard service", () => {
	it("normalizes event/side/rsvp filters with all defaults", () => {
		const normalized = normalizeOperationsFilters({
			eventId: "",
			side: "unknown",
			rsvpStatus: "n/a",
		});

		expect(normalized).toEqual({
			eventId: "all",
			side: "all",
			rsvpStatus: "all",
		});
	});

	it("applies strict AND semantics across event + side + rsvp filters", () => {
		const rows: OperationsDatasetRow[] = [
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-1",
				personId: "p-1",
				side: "bride",
				rsvpStatus: "accepted",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-2",
				personId: "p-2",
				side: "bride",
				rsvpStatus: "declined",
			}),
			makeRow({
				eventId: "evt-2",
				guestUnitId: "gu-3",
				personId: "p-3",
				side: "groom",
				rsvpStatus: "accepted",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-4",
				personId: "p-4",
				side: "groom",
				rsvpStatus: "pending",
			}),
		];

		const filtered = applyOperationsFilters(rows, {
			eventId: "evt-1",
			side: "bride",
			rsvpStatus: "accepted",
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.personId).toBe("p-1");
	});

	it("maps responded filter to accepted+declined only", () => {
		const rows: OperationsDatasetRow[] = [
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-1",
				personId: "p-1",
				rsvpStatus: "accepted",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-2",
				personId: "p-2",
				rsvpStatus: "declined",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-3",
				personId: "p-3",
				rsvpStatus: "pending",
			}),
		];

		const filtered = applyOperationsFilters(rows, {
			eventId: "all",
			side: "all",
			rsvpStatus: "responded",
		});

		expect(filtered.map((row) => row.personId)).toEqual(["p-1", "p-2"]);
	});

	it("computes person-level metrics with pending = invited - responded", () => {
		const rows: OperationsDatasetRow[] = [
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-1",
				personId: "p-1",
				rsvpStatus: "accepted",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-2",
				personId: "p-2",
				rsvpStatus: "declined",
			}),
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-3",
				personId: "p-3",
				rsvpStatus: "pending",
			}),
		];

		const metrics = computeOperationsMetrics(rows);

		expect(metrics).toEqual({
			invited: 3,
			responded: 2,
			accepted: 1,
			declined: 1,
			pending: 1,
		});
	});

	it("projects freshness timestamp from latest filtered update", () => {
		const dataAsOf = computeOperationsDataAsOf([
			{ updatedAt: new Date("2026-02-12T10:00:00.000Z") },
			{ updatedAt: new Date("2026-02-12T10:05:00.000Z") },
			{ updatedAt: new Date("2026-02-12T09:59:59.000Z") },
		]);

		expect(dataAsOf?.toISOString()).toBe("2026-02-12T10:05:00.000Z");
		expect(computeOperationsDataAsOf([])).toBeNull();
	});

	it("sorts rows deterministically by event date -> side -> unit -> person", () => {
		const rows: OperationsDatasetRow[] = [
			makeRow({
				eventId: "evt-b",
				eventDate: new Date("2026-02-20T10:00:00.000Z"),
				guestUnitId: "gu-2",
				guestUnitName: "Sharma Family",
				personId: "p-2",
				personName: "Ravi",
				side: "groom",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-18T10:00:00.000Z"),
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-1",
				personName: "Asha",
				side: "bride",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-18T10:00:00.000Z"),
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-3",
				personName: "Zoya",
				side: "bride",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-18T10:00:00.000Z"),
				guestUnitId: "gu-3",
				guestUnitName: "Kapoor Family",
				personId: "p-4",
				personName: "Neha",
				side: "groom",
			}),
		];

		const sorted = sortOperationsRows(rows);

		expect(sorted.map((row) => row.personName)).toEqual([
			"Asha",
			"Zoya",
			"Neha",
			"Ravi",
		]);
	});
});
