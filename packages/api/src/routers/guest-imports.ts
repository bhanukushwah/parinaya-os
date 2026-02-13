import { ORPCError } from "@orpc/server";
import { db } from "@parinaya-os/db";
import { weddingMemberships } from "@parinaya-os/db/schema/governance";
import {
	guestImportRows,
	guestImportRuns,
} from "@parinaya-os/db/schema/guests";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertCan,
	assertMembershipRole,
	getRoleByMembership,
} from "../policies/authorize";
import { runGuestImport } from "../services/guest-import";
import {
	adaptContactsImportRows,
	adaptManualImportRows,
} from "../services/guest-import-contacts";
import { parseGuestImportCsv } from "../services/guest-import-csv";

const weddingScopedInput = z.object({
	weddingId: z.string().min(1),
});

const csvImportInput = z.object({
	weddingId: z.string().min(1),
	csvContent: z.string().min(1),
	sourceFileName: z.string().trim().min(1).max(255).optional(),
	idempotencyKey: z.string().trim().min(1).max(255).optional(),
	sourceFingerprint: z.string().trim().min(1).max(255).optional(),
	defaultCountry: z.enum(["IN", "US"]).optional(),
});

const contactImportRowInput = z.object({
	name: z.string().trim().max(200).optional().nullable(),
	phone: z.string().trim().max(100).optional().nullable(),
	side: z.string().trim().max(30).optional().nullable(),
	tags: z
		.union([z.array(z.string().trim().max(100)), z.string().trim()])
		.optional()
		.nullable(),
	guestUnitName: z.string().trim().max(200).optional().nullable(),
	notes: z.string().trim().max(2_000).optional().nullable(),
	relationshipLabel: z.string().trim().max(100).optional().nullable(),
	isPrimaryContact: z.boolean().optional().nullable(),
	sourcePayload: z.record(z.string(), z.unknown()).optional(),
});

const contactsImportInput = z.object({
	weddingId: z.string().min(1),
	rows: z.array(contactImportRowInput).min(1),
	idempotencyKey: z.string().trim().min(1).max(255).optional(),
	sourceFingerprint: z.string().trim().min(1).max(255).optional(),
	defaultCountry: z.enum(["IN", "US"]).optional(),
});

const manualImportRowInput = z.object({
	fullName: z.string().trim().max(200).optional().nullable(),
	phone: z.string().trim().max(100).optional().nullable(),
	side: z.string().trim().max(30).optional().nullable(),
	tags: z
		.union([z.array(z.string().trim().max(100)), z.string().trim()])
		.optional()
		.nullable(),
	guestUnitName: z.string().trim().max(200).optional().nullable(),
	notes: z.string().trim().max(2_000).optional().nullable(),
	relationshipLabel: z.string().trim().max(100).optional().nullable(),
	isPrimaryContact: z.boolean().optional().nullable(),
	sourcePayload: z.record(z.string(), z.unknown()).optional(),
});

const manualImportInput = z.object({
	weddingId: z.string().min(1),
	rows: z.array(manualImportRowInput).min(1),
	idempotencyKey: z.string().trim().min(1).max(255).optional(),
	sourceFingerprint: z.string().trim().min(1).max(255).optional(),
	defaultCountry: z.enum(["IN", "US"]).optional(),
});

const importRunDetailInput = z.object({
	weddingId: z.string().min(1),
	runId: z.string().min(1),
});

const warningRowsInput = z.object({
	weddingId: z.string().min(1),
	runId: z.string().min(1).optional(),
	limit: z.number().int().positive().max(500).default(200),
});

async function getMembershipForUser(weddingId: string, userId: string) {
	return db.query.weddingMemberships.findFirst({
		columns: {
			id: true,
			role: true,
		},
		where: and(
			eq(weddingMemberships.weddingId, weddingId),
			eq(weddingMemberships.userId, userId),
			eq(weddingMemberships.isActive, true),
			isNull(weddingMemberships.revokedAt),
		),
	});
}

async function assertImportAccess(input: {
	weddingId: string;
	userId: string;
	mode: "read" | "edit";
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});
	assertMembershipRole(role);
	assertCan(role, input.mode === "edit" ? "guest.edit" : "guest.read");
}

export const guestImportsRouter = {
	importCsv: protectedProcedure
		.input(csvImportInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}

			const rows = await parseGuestImportCsv({
				csvContent: input.csvContent,
			});

			return runGuestImport({
				weddingId: input.weddingId,
				actorMembershipId: membership.id,
				channel: "csv",
				rows,
				idempotencyKey: input.idempotencyKey,
				sourceFileName: input.sourceFileName,
				sourceFingerprint: input.sourceFingerprint,
				defaultCountry: input.defaultCountry,
			});
		}),

	importContacts: protectedProcedure
		.input(contactsImportInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}

			const rows = adaptContactsImportRows(input.rows);
			return runGuestImport({
				weddingId: input.weddingId,
				actorMembershipId: membership.id,
				channel: "contacts",
				rows,
				idempotencyKey: input.idempotencyKey,
				sourceFingerprint: input.sourceFingerprint,
				defaultCountry: input.defaultCountry,
			});
		}),

	importManualRows: protectedProcedure
		.input(manualImportInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "edit",
			});

			const membership = await getMembershipForUser(
				input.weddingId,
				context.session.user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}

			const rows = adaptManualImportRows(input.rows);
			return runGuestImport({
				weddingId: input.weddingId,
				actorMembershipId: membership.id,
				channel: "manual-row",
				rows,
				idempotencyKey: input.idempotencyKey,
				sourceFingerprint: input.sourceFingerprint,
				defaultCountry: input.defaultCountry,
			});
		}),

	listRuns: protectedProcedure
		.input(weddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "read",
			});

			return db.query.guestImportRuns.findMany({
				where: eq(guestImportRuns.weddingId, input.weddingId),
				orderBy: [desc(guestImportRuns.createdAt), desc(guestImportRuns.id)],
				limit: 100,
			});
		}),

	getRunDetail: protectedProcedure
		.input(importRunDetailInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "read",
			});

			const run = await db.query.guestImportRuns.findFirst({
				where: and(
					eq(guestImportRuns.id, input.runId),
					eq(guestImportRuns.weddingId, input.weddingId),
				),
				with: {
					rows: {
						orderBy: [desc(guestImportRows.rowNumber)],
					},
				},
			});

			if (!run) {
				throw new ORPCError("NOT_FOUND");
			}

			return run;
		}),

	listWarningRows: protectedProcedure
		.input(warningRowsInput)
		.handler(async ({ context, input }) => {
			await assertImportAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
				mode: "read",
			});

			return db.query.guestImportRows.findMany({
				where: and(
					eq(guestImportRows.weddingId, input.weddingId),
					input.runId
						? eq(guestImportRows.importRunId, input.runId)
						: undefined,
					or(
						eq(guestImportRows.isInviteable, false),
						eq(guestImportRows.outcome, "warning_malformed_phone"),
						eq(guestImportRows.outcome, "skipped_no_phone"),
					),
				),
				orderBy: [desc(guestImportRows.createdAt), desc(guestImportRows.id)],
				limit: input.limit,
			});
		}),
};
