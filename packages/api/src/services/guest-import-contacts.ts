import type { GuestImportCanonicalRow } from "./guest-import-types";

export type ContactImportInputRow = {
	name?: string | null;
	phone?: string | null;
	side?: string | null;
	tags?: string[] | string | null;
	guestUnitName?: string | null;
	notes?: string | null;
	relationshipLabel?: string | null;
	isPrimaryContact?: boolean | null;
	sourcePayload?: Record<string, unknown>;
};

export type ManualImportInputRow = {
	fullName?: string | null;
	phone?: string | null;
	side?: string | null;
	tags?: string[] | string | null;
	guestUnitName?: string | null;
	notes?: string | null;
	relationshipLabel?: string | null;
	isPrimaryContact?: boolean | null;
	sourcePayload?: Record<string, unknown>;
};

function normalizeTags(tags: string[] | string | null | undefined): string[] {
	if (!tags) {
		return [];
	}

	if (Array.isArray(tags)) {
		return tags
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}

	return tags
		.split(/[;,]/g)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function adaptContactsImportRows(
	rows: ContactImportInputRow[],
): GuestImportCanonicalRow[] {
	return rows.map((row, index) => ({
		rowNumber: index + 1,
		fullName: row.name?.trim() || null,
		phone: row.phone?.trim() || null,
		side: row.side?.trim() || null,
		tags: normalizeTags(row.tags),
		guestUnitName: row.guestUnitName?.trim() || null,
		notes: row.notes?.trim() || null,
		relationshipLabel: row.relationshipLabel?.trim() || null,
		isPrimaryContact:
			typeof row.isPrimaryContact === "boolean"
				? row.isPrimaryContact
				: undefined,
		sourcePayload: row.sourcePayload ?? row,
	}));
}

export function adaptManualImportRows(
	rows: ManualImportInputRow[],
): GuestImportCanonicalRow[] {
	return rows.map((row, index) => ({
		rowNumber: index + 1,
		fullName: row.fullName?.trim() || null,
		phone: row.phone?.trim() || null,
		side: row.side?.trim() || null,
		tags: normalizeTags(row.tags),
		guestUnitName: row.guestUnitName?.trim() || null,
		notes: row.notes?.trim() || null,
		relationshipLabel: row.relationshipLabel?.trim() || null,
		isPrimaryContact:
			typeof row.isPrimaryContact === "boolean"
				? row.isPrimaryContact
				: undefined,
		sourcePayload: row.sourcePayload ?? row,
	}));
}
