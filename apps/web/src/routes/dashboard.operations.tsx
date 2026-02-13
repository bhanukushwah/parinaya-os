import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { OperationsFilters } from "@/components/operations/operations-filters";
import { OperationsMetricsCards } from "@/components/operations/operations-metrics-cards";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

type OperationsSearch = {
	weddingId: string;
	eventId: "all" | string;
	side: "all" | "bride" | "groom" | "neutral";
	rsvpStatus: "all" | "responded" | "accepted" | "declined" | "pending";
};

const DEFAULT_FILTERS: Pick<
	OperationsSearch,
	"eventId" | "side" | "rsvpStatus"
> = {
	eventId: "all",
	side: "all",
	rsvpStatus: "all",
};

function parseSearch(search: Record<string, unknown>): OperationsSearch {
	const weddingId =
		typeof search.weddingId === "string" ? search.weddingId : "";
	const eventId = typeof search.eventId === "string" ? search.eventId : "all";
	const side =
		typeof search.side === "string" &&
		(search.side === "all" ||
			search.side === "bride" ||
			search.side === "groom" ||
			search.side === "neutral")
			? search.side
			: "all";
	const rsvpStatus =
		typeof search.rsvpStatus === "string" &&
		(search.rsvpStatus === "all" ||
			search.rsvpStatus === "responded" ||
			search.rsvpStatus === "accepted" ||
			search.rsvpStatus === "declined" ||
			search.rsvpStatus === "pending")
			? search.rsvpStatus
			: "all";

	return {
		weddingId,
		eventId,
		side,
		rsvpStatus,
	};
}

export const Route = createFileRoute("/dashboard/operations")({
	component: DashboardOperationsRoute,
	validateSearch: (search) => parseSearch(search as Record<string, unknown>),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
	},
});

function DashboardOperationsRoute() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	const filtersInput = {
		weddingId: search.weddingId,
		eventId: search.eventId,
		side: search.side,
		rsvpStatus: search.rsvpStatus,
	};

	const hasWeddingId = search.weddingId.trim().length > 0;

	const filterOptionsQuery = useQuery({
		...orpc.operations.filterOptions.queryOptions({
			input: {
				weddingId: search.weddingId,
			},
		}),
		enabled: hasWeddingId,
	});

	const metricsQuery = useQuery({
		...orpc.operations.metrics.queryOptions({
			input: filtersInput,
		}),
		enabled: hasWeddingId,
	});

	const previewQuery = useQuery({
		...orpc.operations.previewRows.queryOptions({
			input: filtersInput,
		}),
		enabled: hasWeddingId,
	});

	const exportMutation = useMutation({
		mutationFn: () => client.operations.exportCsv(filtersInput),
		onSuccess: (response) => {
			const csvBlob = new Blob([response.csv], {
				type: "text/csv;charset=utf-8",
			});
			const url = URL.createObjectURL(csvBlob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = response.fileName;
			anchor.click();
			URL.revokeObjectURL(url);
		},
	});

	const updateSearch = (next: Partial<OperationsSearch>) => {
		void navigate({
			to: "/dashboard/operations",
			search: (previous) => ({
				...previous,
				...next,
			}),
		});
	};

	const onResetFilters = () => {
		updateSearch({
			eventId: DEFAULT_FILTERS.eventId,
			side: DEFAULT_FILTERS.side,
			rsvpStatus: DEFAULT_FILTERS.rsvpStatus,
		});
	};

	const rowCount = previewQuery.data?.rowCount ?? 0;
	const metrics = metricsQuery.data?.metrics ?? {
		invited: 0,
		responded: 0,
		accepted: 0,
		declined: 0,
		pending: 0,
	};

	const isFilteredAwayFromDefault =
		search.eventId !== "all" ||
		search.side !== "all" ||
		search.rsvpStatus !== "all";

	let emptyStateMessage: string | null = null;
	if (hasWeddingId && rowCount === 0 && isFilteredAwayFromDefault) {
		emptyStateMessage =
			"No records for selected filters. Reset filters to broaden results.";
	} else if (hasWeddingId && rowCount === 0) {
		emptyStateMessage = "No inviteable recipients match current filters.";
	} else if (hasWeddingId && metrics.invited > 0 && metrics.responded === 0) {
		emptyStateMessage = "Awaiting RSVP responses for this audience.";
	}

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Parent Operations Dashboard
				</h1>
				<p className="text-muted-foreground text-sm">
					Live invited/responded/accepted/declined/pending visibility with
					count-aligned export preparation.
				</p>
			</header>

			<section className="grid gap-2 rounded-lg border p-4">
				<label className="grid gap-1 text-sm" htmlFor="operations-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="operations-wedding-id"
						onChange={(event) =>
							updateSearch({
								weddingId: event.target.value,
							})
						}
						placeholder="wed_..."
						value={search.weddingId}
					/>
				</label>
			</section>

			<OperationsFilters
				disabled={!hasWeddingId || filterOptionsQuery.isLoading}
				events={filterOptionsQuery.data?.events ?? []}
				onChange={updateSearch}
				onReset={onResetFilters}
				value={{
					eventId: search.eventId,
					side: search.side,
					rsvpStatus: search.rsvpStatus,
				}}
			/>

			{metricsQuery.isError ? (
				<p className="text-red-600 text-sm">{metricsQuery.error.message}</p>
			) : null}
			{previewQuery.isError ? (
				<p className="text-red-600 text-sm">{previewQuery.error.message}</p>
			) : null}

			<OperationsMetricsCards
				dataAsOf={
					metricsQuery.data?.dataAsOf ?? previewQuery.data?.dataAsOf ?? null
				}
				metrics={metrics}
			/>

			<section className="rounded-lg border p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">Export Preview</h2>
						<p className="text-muted-foreground text-sm">
							Rows in export: <strong>{rowCount}</strong>
						</p>
					</div>
					<button
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!hasWeddingId || exportMutation.isPending}
						onClick={() => exportMutation.mutate()}
						type="button"
					>
						{exportMutation.isPending ? "Preparing export..." : "Export CSV"}
					</button>
				</div>

				{filterOptionsQuery.isLoading && hasWeddingId ? (
					<p className="mt-3 text-sm">Loading filter options...</p>
				) : null}
				{metricsQuery.isLoading && hasWeddingId ? (
					<p className="mt-3 text-sm">Loading operations metrics...</p>
				) : null}
				{previewQuery.isLoading && hasWeddingId ? (
					<p className="mt-3 text-sm">Loading export preview count...</p>
				) : null}
				{exportMutation.isError ? (
					<p className="mt-3 text-red-600 text-sm">
						{exportMutation.error.message}
					</p>
				) : null}
				{emptyStateMessage ? (
					<p className="mt-3 rounded-md border border-dashed p-3 text-sm">
						{emptyStateMessage}
					</p>
				) : null}
			</section>
		</div>
	);
}
