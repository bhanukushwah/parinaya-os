import { describe, expect, it } from "bun:test";
import type { OperationsDatasetRow } from "./operations-dashboard";
import {
	buildOperationsCsv,
	OPERATIONS_EXPORT_HEADERS,
	serializeOperationsCsv,
	toOperationsExportRecord,
} from "./operations-export";

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
		eventDate: overrides.eventDate ?? new Date("2026-02-20T10:00:00.000Z"),
		side: overrides.side ?? "neutral",
		guestUnitId: overrides.guestUnitId,
		guestUnitName: overrides.guestUnitName ?? `Unit ${overrides.guestUnitId}`,
		deliveryPhoneE164:
			overrides.deliveryPhoneE164 === undefined
				? "+919000000000"
				: overrides.deliveryPhoneE164,
		personId: overrides.personId,
		personName: overrides.personName ?? `Person ${overrides.personId}`,
		rsvpStatus: overrides.rsvpStatus ?? "pending",
		respondedAt: overrides.respondedAt ?? null,
		lastInviteStatus: overrides.lastInviteStatus ?? null,
		lastInviteAt: overrides.lastInviteAt ?? null,
	};
}

describe("operations export service", () => {
	it("keeps stable header order for CSV contract", () => {
		expect(OPERATIONS_EXPORT_HEADERS).toEqual([
			"event_id",
			"event_title",
			"event_date",
			"side",
			"guest_unit_id",
			"guest_unit_name",
			"delivery_phone_e164",
			"person_id",
			"person_name",
			"rsvp_status",
			"responded_at",
			"last_invite_status",
			"last_invite_at",
		]);
	});

	it("maps nullable fields to empty strings without schema drift", () => {
		const record = toOperationsExportRecord(
			makeRow({
				eventId: "evt-1",
				guestUnitId: "gu-1",
				personId: "p-1",
				rsvpStatus: "pending",
				respondedAt: null,
				lastInviteStatus: null,
				lastInviteAt: null,
				deliveryPhoneE164: null,
			}),
		);

		expect(record.responded_at).toBe("");
		expect(record.last_invite_status).toBe("");
		expect(record.last_invite_at).toBe("");
		expect(record.delivery_phone_e164).toBe("");
	});

	it("sorts output rows deterministically before serialization", () => {
		const firstRun = buildOperationsCsv([
			makeRow({
				eventId: "evt-b",
				eventDate: new Date("2026-02-21T08:00:00.000Z"),
				side: "groom",
				guestUnitId: "gu-2",
				guestUnitName: "Sharma Family",
				personId: "p-2",
				personName: "Ravi",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-20T08:00:00.000Z"),
				side: "bride",
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-1",
				personName: "Asha",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-20T08:00:00.000Z"),
				side: "bride",
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-3",
				personName: "Zoya",
			}),
		]);

		const secondRun = buildOperationsCsv([
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-20T08:00:00.000Z"),
				side: "bride",
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-3",
				personName: "Zoya",
			}),
			makeRow({
				eventId: "evt-b",
				eventDate: new Date("2026-02-21T08:00:00.000Z"),
				side: "groom",
				guestUnitId: "gu-2",
				guestUnitName: "Sharma Family",
				personId: "p-2",
				personName: "Ravi",
			}),
			makeRow({
				eventId: "evt-a",
				eventDate: new Date("2026-02-20T08:00:00.000Z"),
				side: "bride",
				guestUnitId: "gu-1",
				guestUnitName: "Arora Family",
				personId: "p-1",
				personName: "Asha",
			}),
		]);

		expect(firstRun.csv).toBe(secondRun.csv);
		expect(firstRun.records.map((record) => record.person_name)).toEqual([
			"Asha",
			"Zoya",
			"Ravi",
		]);
	});

	it("escapes commas and quotes in CSV cells", () => {
		const csv = serializeOperationsCsv([
			{
				event_id: "evt-1",
				event_title: 'Sangeet, "Night"',
				event_date: "2026-02-20",
				side: "bride",
				guest_unit_id: "gu-1",
				guest_unit_name: 'Arora, "Family"',
				delivery_phone_e164: "+919000000000",
				person_id: "p-1",
				person_name: 'Asha "A"',
				rsvp_status: "accepted",
				responded_at: "2026-02-20T12:00:00.000Z",
				last_invite_status: "read",
				last_invite_at: "2026-02-20T09:00:00.000Z",
			},
		]);

		expect(csv).toContain('"Sangeet, ""Night"""');
		expect(csv).toContain('"Arora, ""Family"""');
		expect(csv).toContain('"Asha ""A"""');
	});

	it("returns headers-only CSV for empty datasets", () => {
		const exportResult = buildOperationsCsv([]);
		const expectedHeaderLine = `${OPERATIONS_EXPORT_HEADERS.join(",")}\n`;

		expect(exportResult.rowCount).toBe(0);
		expect(exportResult.csv).toBe(expectedHeaderLine);
		expect(exportResult.records).toEqual([]);
	});
});
