import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	assertMembershipRole,
	getRoleByMembership,
} from "../policies/authorize";
import {
	getOperationsDataset,
	getOperationsFilterOptions,
	normalizeOperationsFilters,
	OPERATIONS_RSVP_FILTER_VALUES,
	OPERATIONS_SIDE_FILTER_VALUES,
} from "../services/operations-dashboard";
import { buildOperationsCsv } from "../services/operations-export";

const operationsFiltersInput = z.object({
	weddingId: z.string().min(1),
	eventId: z.union([z.literal("all"), z.string().min(1)]).default("all"),
	side: z
		.enum(OPERATIONS_SIDE_FILTER_VALUES)
		.default(OPERATIONS_SIDE_FILTER_VALUES[0]),
	rsvpStatus: z
		.enum(OPERATIONS_RSVP_FILTER_VALUES)
		.default(OPERATIONS_RSVP_FILTER_VALUES[0]),
});

const weddingScopedInput = z.object({
	weddingId: z.string().min(1),
});

async function assertParentOperationsAccess(input: {
	weddingId: string;
	userId: string;
}) {
	const role = await getRoleByMembership({
		weddingId: input.weddingId,
		userId: input.userId,
	});

	assertMembershipRole(role);

	if (role !== "owner" && role !== "admin") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only Parent Admin can access operations dashboard data.",
		});
	}
}

export const operationsRouter = {
	metrics: protectedProcedure
		.input(operationsFiltersInput)
		.handler(async ({ context, input }) => {
			await assertParentOperationsAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const filters = normalizeOperationsFilters({
				eventId: input.eventId,
				side: input.side,
				rsvpStatus: input.rsvpStatus,
			});

			const dataset = await getOperationsDataset({
				weddingId: input.weddingId,
				filters,
			});

			return {
				weddingId: input.weddingId,
				filters: dataset.filters,
				metrics: dataset.metrics,
				rowCount: dataset.rows.length,
				dataAsOf: dataset.dataAsOf,
			};
		}),

	previewRows: protectedProcedure
		.input(operationsFiltersInput)
		.handler(async ({ context, input }) => {
			await assertParentOperationsAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const filters = normalizeOperationsFilters({
				eventId: input.eventId,
				side: input.side,
				rsvpStatus: input.rsvpStatus,
			});

			const dataset = await getOperationsDataset({
				weddingId: input.weddingId,
				filters,
			});

			return {
				weddingId: input.weddingId,
				filters: dataset.filters,
				rowCount: dataset.rows.length,
				dataAsOf: dataset.dataAsOf,
			};
		}),

	filterOptions: protectedProcedure
		.input(weddingScopedInput)
		.handler(async ({ context, input }) => {
			await assertParentOperationsAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			return getOperationsFilterOptions({
				weddingId: input.weddingId,
			});
		}),

	exportCsv: protectedProcedure
		.input(operationsFiltersInput)
		.handler(async ({ context, input }) => {
			await assertParentOperationsAccess({
				weddingId: input.weddingId,
				userId: context.session.user.id,
			});

			const filters = normalizeOperationsFilters({
				eventId: input.eventId,
				side: input.side,
				rsvpStatus: input.rsvpStatus,
			});

			const dataset = await getOperationsDataset({
				weddingId: input.weddingId,
				filters,
			});

			const exported = buildOperationsCsv(dataset.rows);
			const eventToken =
				filters.eventId === "all" ? "all-events" : `event-${filters.eventId}`;
			const fileName = `operations-${eventToken}-${new Date().toISOString().slice(0, 10)}.csv`;

			return {
				weddingId: input.weddingId,
				filters,
				rowCount: exported.rowCount,
				dataAsOf: dataset.dataAsOf,
				headers: exported.headers,
				csv: exported.csv,
				fileName,
				generatedAt: new Date(),
			};
		}),
};
