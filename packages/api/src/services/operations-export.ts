import {
	type OperationsDatasetRow,
	sortOperationsRows,
} from "./operations-dashboard";

export const OPERATIONS_EXPORT_HEADERS = [
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
] as const;

export type OperationsExportHeader = (typeof OPERATIONS_EXPORT_HEADERS)[number];

export type OperationsExportRecord = Record<OperationsExportHeader, string>;

function escapeCsvCell(value: string) {
	if (
		value.includes(",") ||
		value.includes("\n") ||
		value.includes("\r") ||
		value.includes('"')
	) {
		return `"${value.replaceAll('"', '""')}"`;
	}

	return value;
}

function toDateOnlyIso(value: Date | null): string {
	if (!value) {
		return "";
	}

	return value.toISOString().slice(0, 10);
}

function toTimestampIso(value: Date | null): string {
	if (!value) {
		return "";
	}

	return value.toISOString();
}

export function toOperationsExportRecord(
	row: OperationsDatasetRow,
): OperationsExportRecord {
	return {
		event_id: row.eventId,
		event_title: row.eventTitle,
		event_date: toDateOnlyIso(row.eventDate),
		side: row.side,
		guest_unit_id: row.guestUnitId,
		guest_unit_name: row.guestUnitName,
		delivery_phone_e164: row.deliveryPhoneE164 ?? "",
		person_id: row.personId,
		person_name: row.personName,
		rsvp_status: row.rsvpStatus,
		responded_at: toTimestampIso(row.respondedAt),
		last_invite_status: row.lastInviteStatus ?? "",
		last_invite_at: toTimestampIso(row.lastInviteAt),
	};
}

export function serializeOperationsCsv(records: OperationsExportRecord[]) {
	const headerLine = OPERATIONS_EXPORT_HEADERS.join(",");
	if (records.length === 0) {
		return `${headerLine}\n`;
	}

	const rowLines = records.map((record) =>
		OPERATIONS_EXPORT_HEADERS.map((header) =>
			escapeCsvCell(record[header] ?? ""),
		).join(","),
	);

	return `${headerLine}\n${rowLines.join("\n")}\n`;
}

export function buildOperationsCsv(rows: OperationsDatasetRow[]) {
	const sortedRows = sortOperationsRows(rows);
	const records = sortedRows.map(toOperationsExportRecord);
	return {
		headers: OPERATIONS_EXPORT_HEADERS,
		records,
		csv: serializeOperationsCsv(records),
		rowCount: sortedRows.length,
	};
}
