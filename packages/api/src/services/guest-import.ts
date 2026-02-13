import { db } from "@parinaya-os/db";
import {
	guestImportRows,
	guestImportRuns,
	guestPeople,
	guestPersonTags,
	guestTags,
	guestUnitMembers,
	guestUnits,
	guestUnitTags,
} from "@parinaya-os/db/schema/guests";
import { and, desc, eq, inArray } from "drizzle-orm";

import { AUDIT_ACTIONS, writeAuditLog } from "./audit-log";
import { upsertGuestIdentity } from "./guest-identity";
import type {
	GuestImportCanonicalRow,
	GuestImportChannel,
	GuestImportRowOutcome,
} from "./guest-import-types";

type ImportMutationClient = Pick<
	typeof db,
	"query" | "insert" | "update" | "delete"
>;

export type GuestImportRunResult = {
	runId: string;
	status: "completed" | "partial" | "failed";
	counters: {
		total: number;
		processed: number;
		created: number;
		updated: number;
		reactivated: number;
		warning: number;
		skipped: number;
		failed: number;
	};
	rows: Array<{
		id: string;
		rowNumber: number;
		outcome: GuestImportRowOutcome;
		isInviteable: boolean;
		warningDetail: string | null;
	}>;
	idempotencyReused: boolean;
};

export type RunGuestImportInput = {
	weddingId: string;
	actorMembershipId: string | null;
	channel: GuestImportChannel;
	rows: GuestImportCanonicalRow[];
	idempotencyKey?: string | null;
	sourceFileName?: string | null;
	sourceFingerprint?: string | null;
	defaultCountry?: "IN" | "US";
};

function normalizeSide(
	side: string | null | undefined,
): "bride" | "groom" | "neutral" {
	const normalized = side?.trim().toLowerCase();
	if (normalized === "bride" || normalized === "groom") {
		return normalized;
	}
	return "neutral";
}

function normalizeTagKey(rawTag: string): string {
	return rawTag
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function humanizeTagLabel(key: string): string {
	return key
		.split("-")
		.filter((part) => part.length > 0)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}

async function syncTagAssignments(input: {
	client: ImportMutationClient;
	weddingId: string;
	personId: string;
	guestUnitId: string;
	tags: string[];
	actorMembershipId: string | null;
}): Promise<void> {
	const tagKeys = Array.from(
		new Set(input.tags.map((tag) => normalizeTagKey(tag)).filter(Boolean)),
	);

	if (tagKeys.length === 0) {
		await input.client
			.delete(guestPersonTags)
			.where(eq(guestPersonTags.personId, input.personId));
		await input.client
			.delete(guestUnitTags)
			.where(eq(guestUnitTags.guestUnitId, input.guestUnitId));
		return;
	}

	for (const key of tagKeys) {
		await input.client
			.insert(guestTags)
			.values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				key,
				label: humanizeTagLabel(key),
				isActive: true,
				createdByMembershipId: input.actorMembershipId,
				updatedByMembershipId: input.actorMembershipId,
			})
			.onConflictDoUpdate({
				target: [guestTags.weddingId, guestTags.key],
				set: {
					isActive: true,
					label: humanizeTagLabel(key),
					updatedByMembershipId: input.actorMembershipId,
				},
			});
	}

	const resolvedTags = await input.client.query.guestTags.findMany({
		columns: { id: true },
		where: and(
			eq(guestTags.weddingId, input.weddingId),
			inArray(guestTags.key, tagKeys),
		),
	});

	const tagIds = resolvedTags.map((tag) => tag.id);
	await input.client
		.delete(guestPersonTags)
		.where(eq(guestPersonTags.personId, input.personId));
	await input.client
		.delete(guestUnitTags)
		.where(eq(guestUnitTags.guestUnitId, input.guestUnitId));

	if (tagIds.length === 0) {
		return;
	}

	await input.client.insert(guestPersonTags).values(
		tagIds.map((tagId) => ({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			personId: input.personId,
			tagId,
			appliedByMembershipId: input.actorMembershipId,
		})),
	);

	await input.client.insert(guestUnitTags).values(
		tagIds.map((tagId) => ({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			guestUnitId: input.guestUnitId,
			tagId,
			appliedByMembershipId: input.actorMembershipId,
		})),
	);
}

async function processImportRow(input: {
	client: ImportMutationClient;
	runId: string;
	weddingId: string;
	actorMembershipId: string | null;
	row: GuestImportCanonicalRow;
	defaultCountry?: "IN" | "US";
}): Promise<GuestImportRowOutcome> {
	const side = normalizeSide(input.row.side);

	const identityResult = await upsertGuestIdentity({
		client: input.client,
		weddingId: input.weddingId,
		phone: input.row.phone,
		displayLabel: input.row.fullName,
		actorMembershipId: input.actorMembershipId,
		defaultCountry: input.defaultCountry,
	});

	if (!identityResult.ok) {
		const outcome: GuestImportRowOutcome =
			identityResult.errorCode === "missing_phone"
				? "skipped_no_phone"
				: "warning_malformed_phone";

		await input.client.insert(guestImportRows).values({
			id: crypto.randomUUID(),
			importRunId: input.runId,
			weddingId: input.weddingId,
			rowNumber: input.row.rowNumber,
			sourcePayload: input.row.sourcePayload,
			rawName: input.row.fullName,
			rawPhone: input.row.phone,
			normalizedPhoneE164: null,
			resolvedIdentityId: null,
			resolvedPersonId: null,
			resolvedGuestUnitId: null,
			outcome,
			isInviteable: false,
			warningDetail: identityResult.message,
			processingError: null,
		});

		return outcome;
	}

	const existingPerson = await input.client.query.guestPeople.findFirst({
		where: and(
			eq(guestPeople.weddingId, input.weddingId),
			eq(guestPeople.identityId, identityResult.identity.id),
		),
	});

	const fullName =
		input.row.fullName?.trim() || existingPerson?.fullName || "Guest";

	const [person] = existingPerson
		? await input.client
				.update(guestPeople)
				.set({
					fullName,
					side,
					notes: input.row.notes ?? existingPerson.notes,
					isActive: true,
					isInviteable: true,
					updatedByMembershipId: input.actorMembershipId,
				})
				.where(eq(guestPeople.id, existingPerson.id))
				.returning()
		: await input.client
				.insert(guestPeople)
				.values({
					id: crypto.randomUUID(),
					weddingId: input.weddingId,
					identityId: identityResult.identity.id,
					fullName,
					side,
					notes: input.row.notes,
					isActive: true,
					isInviteable: true,
					createdByMembershipId: input.actorMembershipId,
					updatedByMembershipId: input.actorMembershipId,
				})
				.returning();

	if (!person) {
		throw new Error(
			`Could not upsert guest person for row ${input.row.rowNumber}`,
		);
	}

	const existingGuestUnit = await input.client.query.guestUnits.findFirst({
		where: and(
			eq(guestUnits.weddingId, input.weddingId),
			eq(guestUnits.deliveryIdentityId, identityResult.identity.id),
		),
	});

	const displayName = input.row.guestUnitName?.trim() || person.fullName;
	const [guestUnit] = existingGuestUnit
		? await input.client
				.update(guestUnits)
				.set({
					displayName,
					side,
					deliveryIdentityId: identityResult.identity.id,
					isActive: true,
					isInviteable: true,
					updatedByMembershipId: input.actorMembershipId,
				})
				.where(eq(guestUnits.id, existingGuestUnit.id))
				.returning()
		: await input.client
				.insert(guestUnits)
				.values({
					id: crypto.randomUUID(),
					weddingId: input.weddingId,
					displayName,
					side,
					deliveryIdentityId: identityResult.identity.id,
					isActive: true,
					isInviteable: true,
					createdByMembershipId: input.actorMembershipId,
					updatedByMembershipId: input.actorMembershipId,
				})
				.returning();

	if (!guestUnit) {
		throw new Error(
			`Could not upsert guest unit for row ${input.row.rowNumber}`,
		);
	}

	await input.client
		.update(guestUnitMembers)
		.set({
			isActive: false,
			leftAt: new Date(),
			updatedByMembershipId: input.actorMembershipId,
		})
		.where(
			and(
				eq(guestUnitMembers.weddingId, input.weddingId),
				eq(guestUnitMembers.personId, person.id),
				eq(guestUnitMembers.isActive, true),
			),
		);

	await input.client
		.insert(guestUnitMembers)
		.values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			guestUnitId: guestUnit.id,
			personId: person.id,
			relationshipLabel: input.row.relationshipLabel,
			isPrimaryContact: input.row.isPrimaryContact ?? false,
			isActive: true,
			createdByMembershipId: input.actorMembershipId,
			updatedByMembershipId: input.actorMembershipId,
		})
		.onConflictDoNothing();

	await syncTagAssignments({
		client: input.client,
		weddingId: input.weddingId,
		personId: person.id,
		guestUnitId: guestUnit.id,
		tags: input.row.tags,
		actorMembershipId: input.actorMembershipId,
	});

	await input.client.insert(guestImportRows).values({
		id: crypto.randomUUID(),
		importRunId: input.runId,
		weddingId: input.weddingId,
		rowNumber: input.row.rowNumber,
		sourcePayload: input.row.sourcePayload,
		rawName: input.row.fullName,
		rawPhone: input.row.phone,
		normalizedPhoneE164: identityResult.normalizedPhoneE164,
		resolvedIdentityId: identityResult.identity.id,
		resolvedPersonId: person.id,
		resolvedGuestUnitId: guestUnit.id,
		outcome: identityResult.outcome,
		isInviteable: true,
		warningDetail: null,
		processingError: null,
	});

	await writeAuditLog(input.client, {
		weddingId: input.weddingId,
		actorMembershipId: input.actorMembershipId,
		actionType: AUDIT_ACTIONS.GUEST_EDIT,
		targetType: "guest",
		targetId: guestUnit.id,
		beforeSummary: null,
		afterSummary: {
			importRowNumber: input.row.rowNumber,
			outcome: identityResult.outcome,
			personId: person.id,
			guestUnitId: guestUnit.id,
		},
	});

	return identityResult.outcome;
}

export async function runGuestImport(
	input: RunGuestImportInput,
): Promise<GuestImportRunResult> {
	if (input.idempotencyKey) {
		const existingRun = await db.query.guestImportRuns.findFirst({
			where: and(
				eq(guestImportRuns.weddingId, input.weddingId),
				eq(guestImportRuns.idempotencyKey, input.idempotencyKey),
			),
			with: {
				rows: {
					orderBy: [desc(guestImportRows.rowNumber)],
				},
			},
		});

		if (existingRun) {
			return {
				runId: existingRun.id,
				status:
					existingRun.status === "partial" || existingRun.status === "failed"
						? existingRun.status
						: "completed",
				counters: {
					total: existingRun.rowsTotal,
					processed: existingRun.rowsProcessed,
					created: existingRun.rowsCreated,
					updated: existingRun.rowsUpdated,
					reactivated: existingRun.rowsReactivated,
					warning: existingRun.rowsWarning,
					skipped: existingRun.rowsSkipped,
					failed: existingRun.rowsFailed,
				},
				rows: existingRun.rows
					.map((row) => ({
						id: row.id,
						rowNumber: row.rowNumber,
						outcome: row.outcome,
						isInviteable: row.isInviteable,
						warningDetail: row.warningDetail,
					}))
					.reverse(),
				idempotencyReused: true,
			};
		}
	}

	return db.transaction(async (tx) => {
		const [run] = await tx
			.insert(guestImportRuns)
			.values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				channel: input.channel,
				status: "running",
				idempotencyKey: input.idempotencyKey ?? null,
				sourceFileName: input.sourceFileName ?? null,
				sourceFingerprint: input.sourceFingerprint ?? null,
				rowsTotal: input.rows.length,
				startedAt: new Date(),
				createdByMembershipId: input.actorMembershipId,
				updatedByMembershipId: input.actorMembershipId,
			})
			.returning();

		if (!run) {
			throw new Error("Could not create guest import run.");
		}

		await writeAuditLog(tx, {
			weddingId: input.weddingId,
			actorMembershipId: input.actorMembershipId,
			actionType: AUDIT_ACTIONS.GUEST_IMPORT_STARTED,
			targetType: "guest",
			targetId: run.id,
			afterSummary: {
				channel: input.channel,
				rowsTotal: input.rows.length,
			},
		});

		const counters = {
			processed: 0,
			created: 0,
			updated: 0,
			reactivated: 0,
			warning: 0,
			skipped: 0,
			failed: 0,
		};

		for (const row of input.rows) {
			try {
				const outcome = await processImportRow({
					client: tx,
					runId: run.id,
					weddingId: input.weddingId,
					actorMembershipId: input.actorMembershipId,
					row,
					defaultCountry: input.defaultCountry,
				});

				counters.processed += 1;
				if (outcome === "created") {
					counters.created += 1;
				}
				if (outcome === "updated") {
					counters.updated += 1;
				}
				if (outcome === "reactivated") {
					counters.reactivated += 1;
				}
				if (outcome === "warning_malformed_phone") {
					counters.warning += 1;
				}
				if (outcome === "skipped_no_phone") {
					counters.skipped += 1;
				}
			} catch (error) {
				counters.failed += 1;
				await tx.insert(guestImportRows).values({
					id: crypto.randomUUID(),
					importRunId: run.id,
					weddingId: input.weddingId,
					rowNumber: row.rowNumber,
					sourcePayload: row.sourcePayload,
					rawName: row.fullName,
					rawPhone: row.phone,
					normalizedPhoneE164: null,
					resolvedIdentityId: null,
					resolvedPersonId: null,
					resolvedGuestUnitId: null,
					outcome: "warning_malformed_phone",
					isInviteable: false,
					warningDetail: "Row failed during persistence.",
					processingError:
						error instanceof Error ? error.message : "Unknown processing error",
				});
			}
		}

		const status: "completed" | "partial" | "failed" =
			counters.failed > 0 && counters.processed === 0
				? "failed"
				: counters.failed > 0
					? "partial"
					: "completed";

		const [updatedRun] = await tx
			.update(guestImportRuns)
			.set({
				status,
				rowsProcessed: counters.processed,
				rowsCreated: counters.created,
				rowsUpdated: counters.updated,
				rowsReactivated: counters.reactivated,
				rowsWarning: counters.warning,
				rowsSkipped: counters.skipped,
				rowsFailed: counters.failed,
				completedAt: new Date(),
				failedAt: status === "failed" ? new Date() : null,
				failureReason:
					status === "failed" ? "All rows failed to process." : null,
				updatedByMembershipId: input.actorMembershipId,
			})
			.where(eq(guestImportRuns.id, run.id))
			.returning();

		if (!updatedRun) {
			throw new Error("Could not finalize guest import run.");
		}

		const persistedRows = await tx.query.guestImportRows.findMany({
			where: eq(guestImportRows.importRunId, run.id),
			orderBy: [guestImportRows.rowNumber],
		});

		await writeAuditLog(tx, {
			weddingId: input.weddingId,
			actorMembershipId: input.actorMembershipId,
			actionType: AUDIT_ACTIONS.GUEST_IMPORT_COMPLETED,
			targetType: "guest",
			targetId: run.id,
			afterSummary: {
				status,
				rowsProcessed: counters.processed,
				rowsCreated: counters.created,
				rowsUpdated: counters.updated,
				rowsReactivated: counters.reactivated,
				rowsWarning: counters.warning,
				rowsSkipped: counters.skipped,
				rowsFailed: counters.failed,
			},
		});

		return {
			runId: run.id,
			status,
			counters: {
				total: updatedRun.rowsTotal,
				processed: counters.processed,
				created: counters.created,
				updated: counters.updated,
				reactivated: counters.reactivated,
				warning: counters.warning,
				skipped: counters.skipped,
				failed: counters.failed,
			},
			rows: persistedRows.map((row) => ({
				id: row.id,
				rowNumber: row.rowNumber,
				outcome: row.outcome,
				isInviteable: row.isInviteable,
				warningDetail: row.warningDetail,
			})),
			idempotencyReused: false,
		};
	});
}
