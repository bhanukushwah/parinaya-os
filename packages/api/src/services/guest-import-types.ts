export type GuestImportChannel = "csv" | "contacts" | "manual-row";

export type GuestImportRowOutcome =
	| "created"
	| "updated"
	| "reactivated"
	| "warning_malformed_phone"
	| "skipped_no_phone";

export type GuestImportCanonicalRow = {
	rowNumber: number;
	fullName: string | null;
	phone: string | null;
	side: string | null;
	tags: string[];
	guestUnitName: string | null;
	notes: string | null;
	relationshipLabel: string | null;
	isPrimaryContact?: boolean;
	sourcePayload: Record<string, unknown>;
};
