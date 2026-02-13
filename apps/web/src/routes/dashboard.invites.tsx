import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

const sideFilterOptions = ["", "bride", "groom", "neutral"] as const;

export const Route = createFileRoute("/dashboard/invites")({
	component: DashboardInvitesRoute,
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

function parseIdList(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(",")
				.map((entry) => entry.trim())
				.filter(Boolean),
		),
	);
}

function DashboardInvitesRoute() {
	const [weddingId, setWeddingId] = useState("");
	const [eventId, setEventId] = useState("");
	const [templateName, setTemplateName] = useState("wedding_invite_v1");
	const [templateLanguage, setTemplateLanguage] = useState("en");
	const [side, setSide] = useState<(typeof sideFilterOptions)[number]>("");
	const [tagIdsInput, setTagIdsInput] = useState("");
	const [search, setSearch] = useState("");
	const [includeGuestUnitIdsInput, setIncludeGuestUnitIdsInput] = useState("");
	const [excludeGuestUnitIdsInput, setExcludeGuestUnitIdsInput] = useState("");

	const tagIds = useMemo(() => parseIdList(tagIdsInput), [tagIdsInput]);
	const includeGuestUnitIds = useMemo(
		() => parseIdList(includeGuestUnitIdsInput),
		[includeGuestUnitIdsInput],
	);
	const excludeGuestUnitIds = useMemo(
		() => parseIdList(excludeGuestUnitIdsInput),
		[excludeGuestUnitIdsInput],
	);

	const sendInput = useMemo(
		() => ({
			weddingId,
			eventId,
			templateName: templateName.trim(),
			templateLanguage: templateLanguage.trim(),
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
			templateName,
			templateLanguage,
			side,
			tagIds,
			search,
			includeGuestUnitIds,
			excludeGuestUnitIds,
		],
	);

	const canRun =
		weddingId.trim().length > 0 &&
		eventId.trim().length > 0 &&
		templateName.trim().length > 0 &&
		templateLanguage.trim().length > 0;

	const runsQuery = useQuery({
		...orpc.invites.listRuns.queryOptions({
			input: {
				weddingId,
				eventId: eventId.trim() || undefined,
			},
		}),
		enabled: weddingId.trim().length > 0,
	});

	const precheckMutation = useMutation({
		mutationFn: () => client.invites.precheckSend(sendInput),
	});

	const sendMutation = useMutation({
		mutationFn: () => client.invites.sendRun(sendInput),
		onSuccess: () => {
			void runsQuery.refetch();
		},
	});

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Invite Operations
				</h1>
				<p className="text-muted-foreground text-sm">
					Trigger WhatsApp template send runs and inspect server-owned lifecycle
					outcomes.
				</p>
			</header>

			<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setWeddingId(event.target.value)}
					placeholder="Wedding workspace ID"
					value={weddingId}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setEventId(event.target.value)}
					placeholder="Event ID"
					value={eventId}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setTemplateName(event.target.value)}
					placeholder="Template name"
					value={templateName}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setTemplateLanguage(event.target.value)}
					placeholder="Template language code"
					value={templateLanguage}
				/>
				<select
					className="rounded-md border bg-background px-3 py-2 text-sm"
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
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setTagIdsInput(event.target.value)}
					placeholder="Tag IDs (comma-separated)"
					value={tagIdsInput}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search text"
					value={search}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
					onChange={(event) => setIncludeGuestUnitIdsInput(event.target.value)}
					placeholder="Include guest unit IDs (comma-separated)"
					value={includeGuestUnitIdsInput}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
					onChange={(event) => setExcludeGuestUnitIdsInput(event.target.value)}
					placeholder="Exclude guest unit IDs (comma-separated)"
					value={excludeGuestUnitIdsInput}
				/>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Precheck</h2>
					<p className="mt-1 text-muted-foreground text-xs">
						Compliance precheck uses the same server resolver + policy pipeline
						as send.
					</p>
					<button
						className="mt-3 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!canRun || precheckMutation.isPending}
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
						<div className="mt-3 space-y-1 rounded-md border p-3 text-xs">
							<p>total candidates: {precheckMutation.data.totalCandidates}</p>
							<p>eligible: {precheckMutation.data.eligibleCount}</p>
							<p>blocked: {precheckMutation.data.blockedCount}</p>
							<p>
								ready to send:{" "}
								{precheckMutation.data.readyToSend ? "yes" : "no"}
							</p>
						</div>
					) : null}
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Send Run</h2>
					<p className="mt-1 text-muted-foreground text-xs">
						Creates persisted invite/message outcomes with blocked reasons and
						provider correlation ids.
					</p>
					<button
						className="mt-3 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!canRun || sendMutation.isPending}
						onClick={() => sendMutation.mutate()}
						type="button"
					>
						{sendMutation.isPending ? "Sending..." : "Start send run"}
					</button>
					{sendMutation.isError ? (
						<p className="mt-2 text-red-600 text-xs">
							{sendMutation.error.message}
						</p>
					) : null}
					{sendMutation.data ? (
						<div className="mt-3 space-y-1 rounded-md border p-3 text-xs">
							<p>run id: {sendMutation.data.runId}</p>
							<p>eligible: {sendMutation.data.eligibleCount}</p>
							<p>blocked: {sendMutation.data.blockedCount}</p>
							<p>sent: {sendMutation.data.sentCount}</p>
							<p>failed: {sendMutation.data.failedCount}</p>
							<p>status: {sendMutation.data.status}</p>
							<Link
								className="inline-flex pt-1 font-medium underline"
								params={{ runId: sendMutation.data.runId }}
								search={{ weddingId }}
								to="/dashboard/invites/$runId"
							>
								Open run detail
							</Link>
						</div>
					) : null}
				</article>
			</section>

			<section className="rounded-lg border p-4">
				<h2 className="font-semibold text-lg">Recent Runs</h2>
				{runsQuery.isLoading ? (
					<p className="mt-3 text-sm">Loading runs...</p>
				) : null}
				{runsQuery.isError ? (
					<p className="mt-3 text-red-600 text-sm">{runsQuery.error.message}</p>
				) : null}
				<div className="mt-3 grid gap-3">
					{(runsQuery.data ?? []).map((run) => (
						<article className="rounded-md border p-3" key={run.id}>
							<div className="flex flex-wrap items-center gap-2">
								<p className="font-medium text-sm">{run.id}</p>
								<span className="rounded border px-2 py-0.5 text-xs uppercase">
									{run.status}
								</span>
							</div>
							<p className="mt-1 text-muted-foreground text-xs">
								event: {run.eventId} · eligible: {run.eligibleCount} · blocked:{" "}
								{run.blockedCount} · sent: {run.sentCount} · failed:{" "}
								{run.failedCount}
							</p>
							<Link
								className="mt-2 inline-flex font-medium text-xs underline"
								params={{ runId: run.id }}
								search={{ weddingId }}
								to="/dashboard/invites/$runId"
							>
								View lifecycle detail
							</Link>
						</article>
					))}
					{runsQuery.data && runsQuery.data.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No invite runs found for this workspace.
						</p>
					) : null}
				</div>
			</section>
		</div>
	);
}
