import { Readable } from "node:stream";
import { parse } from "csv-parse";

import type { GuestImportCanonicalRow } from "./guest-import-types";

type CsvRecord = Record<string, string | undefined>;

const NAME_HEADERS = ["name", "full_name", "fullName", "person_name", "person"];
const PHONE_HEADERS = [
	"phone",
	"mobile",
	"tel",
	"contact_phone",
	"delivery_phone",
];
const SIDE_HEADERS = ["side", "family_side"];
const TAG_HEADERS = ["tags", "tag_labels", "tag_list"];
const UNIT_HEADERS = [
	"guest_unit",
	"household",
	"family",
	"unit",
	"display_name",
];
const NOTES_HEADERS = ["notes", "note"];
const RELATIONSHIP_HEADERS = ["relationship", "relationship_label"];
const PRIMARY_CONTACT_HEADERS = ["is_primary_contact", "primary_contact"];

function pickField(record: CsvRecord, headers: string[]): string | undefined {
	for (const header of headers) {
		const value = record[header];
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (["true", "1", "yes", "y"].includes(normalized)) {
		return true;
	}
	if (["false", "0", "no", "n"].includes(normalized)) {
		return false;
	}
	return undefined;
}

function parseTags(value: string | undefined): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(/[;,]/g)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export async function parseGuestImportCsv(input: {
	csvContent: string;
}): Promise<GuestImportCanonicalRow[]> {
	const rows: GuestImportCanonicalRow[] = [];
	const parser = parse({
		bom: true,
		columns: true,
		trim: true,
		skip_empty_lines: true,
		relax_column_count: true,
		max_record_size: 64 * 1024,
	});

	Readable.from([input.csvContent]).pipe(parser);

	let rowNumber = 0;
	for await (const row of parser) {
		rowNumber += 1;
		const record = row as CsvRecord;

		rows.push({
			rowNumber,
			fullName: pickField(record, NAME_HEADERS) ?? null,
			phone: pickField(record, PHONE_HEADERS) ?? null,
			side: pickField(record, SIDE_HEADERS) ?? null,
			tags: parseTags(pickField(record, TAG_HEADERS)),
			guestUnitName: pickField(record, UNIT_HEADERS) ?? null,
			notes: pickField(record, NOTES_HEADERS) ?? null,
			relationshipLabel: pickField(record, RELATIONSHIP_HEADERS) ?? null,
			isPrimaryContact: parseBoolean(
				pickField(record, PRIMARY_CONTACT_HEADERS),
			),
			sourcePayload: record,
		});
	}

	return rows;
}
