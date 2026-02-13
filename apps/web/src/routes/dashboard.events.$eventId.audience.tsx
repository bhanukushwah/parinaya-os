import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

const sideFilterOptions = ["", "bride", "groom", "neutral"] as const;

export const Route = createFileRoute("/dashboard/events/$eventId/audience")({
	component: DashboardEventAudienceRoute,
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

function DashboardEventAudienceRoute() {
	const { eventId } = Route.useParams();
	const [weddingId, setWeddingId] = useState("");
	const [side, setSide] = useState<(typeof sideFilterOptions)[number]>("");
	const [tagIdsInput, setTagIdsInput] = useState("");
	const [search, setSearch] = useState("");
	const [includeGuestUnitIdsInput, setIncludeGuestUnitIdsInput] = useState("");
	const [excludeGuestUnitIdsInput, setExcludeGuestUnitIdsInput] = useState("");

	const parseIdList = (value: string) =>
		Array.from(
			new Set(
				value
					.split(",")
					.map((entry) => entry.trim())
					.filter(Boolean),
			),
		);

	const tagIds = useMemo(() => parseIdList(tagIdsInput), [tagIdsInput]);
	const includeGuestUnitIds = useMemo(
		() => parseIdList(includeGuestUnitIdsInput),
		[includeGuestUnitIdsInput],
	);
	const excludeGuestUnitIds = useMemo(
		() => parseIdList(excludeGuestUnitIdsInput),
		[excludeGuestUnitIdsInput],
	);

	const audienceInput = useMemo(
		() => ({
			weddingId,
			eventId,
			side: side || undefined,
			tagIds: tagIds.length > 0 ? tagIds : undefined,
			search: search.trim() || undefined,
			includeGuestUnitIds:
				includeGuestUnitIds.length > 0 ? includeGuestUnitIds : undefined,
			excludeGuestUnitIds:
				excludeGuestUnitIds.length > 0 ? excludeGuestUnitIds : undefined,
		}),
		[
			weddingId,
			eventId,
			side,
			tagIds,
			search,
			includeGuestUnitIds,
			excludeGuestUnitIds,
		],
	);

	const previewQuery = useQuery({
		...orpc.audience.preview.queryOptions({ input: audienceInput }),
		enabled: weddingId.trim().length > 0 && eventId.trim().length > 0,
	});

	const precheckMutation = useMutation({
		mutationFn: () => client.audience.precheckSend(audienceInput),
	});

	const recipientCount = previewQuery.data?.recipients.count ?? 0;

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Audience Builder
				</h1>
				<p className="text-muted-foreground text-sm">
					Server-backed audience preview for event <code>{eventId}</code>. Side,
					tags, and search use AND semantics before include/exclude overrides.
				</p>
			</header>

			<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
				<label className="grid gap-1 text-sm" htmlFor="audience-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="audience-wedding-id"
						onChange={(event) => setWeddingId(event.target.value)}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>
				<label className="grid gap-1 text-sm" htmlFor="audience-side-filter">
					Side filter
					<select
						className="rounded-md border bg-background px-3 py-2"
						id="audience-side-filter"
						onChange={(event) =>
							setSide(event.target.value as (typeof sideFilterOptions)[number])
						}
						value={side}
					>
						{sideFilterOptions.map((option) => (
							<option key={option} value={option}>
								{option || "all sides"}
							</option>
						))}
					</select>
				</label>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setTagIdsInput(event.target.value)}
					placeholder="Tag IDs (comma-separated, all must match)"
					value={tagIdsInput}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search text across names/phones"
					value={search}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
					onChange={(event) => setIncludeGuestUnitIdsInput(event.target.value)}
					placeholder="Include guest unit IDs (comma-separated override)"
					value={includeGuestUnitIdsInput}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
					onChange={(event) => setExcludeGuestUnitIdsInput(event.target.value)}
					placeholder="Exclude guest unit IDs (comma-separated override)"
					value={excludeGuestUnitIdsInput}
				/>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<article className="rounded-lg border p-4 md:col-span-2">
					<h2 className="font-semibold text-lg">Preview Result</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Pre-send recipient count below is always server-computed after
						dedupe.
					</p>

					{previewQuery.isLoading ? (
						<p className="mt-3 text-sm">Computing preview...</p>
					) : null}
					{previewQuery.isError ? (
						<p className="mt-3 text-red-600 text-sm">
							{previewQuery.error.message}
						</p>
					) : null}

					{previewQuery.data ? (
						<div className="mt-3 space-y-3">
							<div className="rounded-md border p-3">
								<p className="text-muted-foreground text-xs uppercase">
									Recipient count
								</p>
								<p className="font-semibold text-2xl">{recipientCount}</p>
								<p className="text-muted-foreground text-xs">
									resolved guest units:{" "}
									{previewQuery.data.recipients.resolvedGuestUnits} / candidate
									units: {previewQuery.data.recipients.totalCandidateGuestUnits}
								</p>
							</div>

							<div className="rounded-md border p-3 text-xs">
								<p className="font-medium">Filter trace (AND then overrides)</p>
								<p className="mt-1">
									after side:{" "}
									{previewQuery.data.audience.trace.counts.afterSide} · after
									tags: {previewQuery.data.audience.trace.counts.afterTags} ·
									after search:{" "}
									{previewQuery.data.audience.trace.counts.afterSearch} · final:{" "}
									{previewQuery.data.audience.trace.counts.final}
								</p>
								<p className="mt-1">
									included overrides:{" "}
									{previewQuery.data.audience.trace.overrides.included} ·
									excluded overrides:{" "}
									{previewQuery.data.audience.trace.overrides.excluded}
								</p>
							</div>

							<div className="rounded-md border p-3">
								<p className="font-medium text-sm">Recipient sample</p>
								<div className="mt-2 max-h-48 space-y-2 overflow-auto">
									{previewQuery.data.recipients.sample.map((entry) => (
										<div
											className="rounded border p-2 text-xs"
											key={`${entry.phoneE164}-${entry.primarySource}`}
										>
											<p className="font-medium">{entry.phoneE164}</p>
											<p className="text-muted-foreground">
												source: {entry.primarySource} · source count:{" "}
												{entry.sourceCount}
											</p>
											<p className="text-muted-foreground">
												guest units: {entry.guestUnitIds.join(", ")}
											</p>
										</div>
									))}
									{previewQuery.data.recipients.sample.length === 0 ? (
										<p className="text-muted-foreground text-xs">
											No recipient sample available.
										</p>
									) : null}
								</div>
							</div>
						</div>
					) : null}
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Send Precheck</h2>
					<p className="mt-1 text-muted-foreground text-xs">
						Runs same resolver path used for preview and adds send readiness
						fields.
					</p>
					<button
						className="mt-3 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!weddingId.trim() || precheckMutation.isPending}
						onClick={() => precheckMutation.mutate()}
						type="button"
					>
						{precheckMutation.isPending
							? "Running precheck..."
							: "Run precheck"}
					</button>
					{precheckMutation.isError ? (
						<p className="mt-2 text-red-600 text-xs">
							{precheckMutation.error.message}
						</p>
					) : null}
					{precheckMutation.data ? (
						<div className="mt-3 rounded-md border p-2 text-xs">
							<p>
								ready to send:{" "}
								{precheckMutation.data.readyToSend ? "yes" : "no"}
							</p>
							<p>
								checked by membership:{" "}
								{precheckMutation.data.checkedByMembershipId ?? "system"}
							</p>
							<p>
								checked at:{" "}
								{new Date(precheckMutation.data.checkedAt).toLocaleString()}
							</p>
							<p>
								server recipient count: {precheckMutation.data.recipients.count}
							</p>
						</div>
					) : null}
				</article>
			</section>
		</div>
	);
}
