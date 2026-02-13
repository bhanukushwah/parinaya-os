import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

const defaultCountryOptions = ["IN", "US"] as const;

export const Route = createFileRoute("/dashboard/imports")({
	component: DashboardImportsRoute,
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

function DashboardImportsRoute() {
	const [weddingId, setWeddingId] = useState("");
	const [defaultCountry, setDefaultCountry] =
		useState<(typeof defaultCountryOptions)[number]>("IN");
	const [idempotencyKey, setIdempotencyKey] = useState("");
	const [sourceFingerprint, setSourceFingerprint] = useState("");
	const [csvContent, setCsvContent] = useState(
		"name,phone,side,tags,guestUnitName\nPriya,+919999999999,bride,family|close,Sharma Family",
	);
	const [contactsPayload, setContactsPayload] = useState(
		JSON.stringify(
			[
				{
					name: "Aman",
					phone: "+919111111111",
					side: "groom",
					tags: ["friends"],
				},
			],
			null,
			2,
		),
	);
	const [manualRowsPayload, setManualRowsPayload] = useState(
		JSON.stringify(
			[
				{
					fullName: "Naina",
					phone: "+919222222222",
					side: "neutral",
					tags: ["vendors"],
					guestUnitName: "Planner Team",
				},
			],
			null,
			2,
		),
	);
	const [selectedRunId, setSelectedRunId] = useState("");

	const runsQuery = useQuery({
		...orpc.guestImports.listRuns.queryOptions({
			input: { weddingId },
		}),
		enabled: weddingId.trim().length > 0,
	});

	const warningRowsQuery = useQuery({
		...orpc.guestImports.listWarningRows.queryOptions({
			input: {
				weddingId,
				runId: selectedRunId || undefined,
				limit: 200,
			},
		}),
		enabled: weddingId.trim().length > 0,
	});

	const runDetailQuery = useQuery({
		...orpc.guestImports.getRunDetail.queryOptions({
			input: {
				weddingId,
				runId: selectedRunId,
			},
		}),
		enabled: weddingId.trim().length > 0 && selectedRunId.trim().length > 0,
	});

	const importBaseInput = useMemo(
		() => ({
			defaultCountry,
			idempotencyKey: idempotencyKey.trim() || undefined,
			sourceFingerprint: sourceFingerprint.trim() || undefined,
		}),
		[defaultCountry, idempotencyKey, sourceFingerprint],
	);

	const refreshImportsData = () => {
		void runsQuery.refetch();
		void warningRowsQuery.refetch();
		if (selectedRunId) {
			void runDetailQuery.refetch();
		}
	};

	const csvImportMutation = useMutation({
		mutationFn: () =>
			client.guestImports.importCsv({
				weddingId,
				csvContent,
				sourceFileName: "dashboard.csv",
				...importBaseInput,
			}),
		onSuccess: (run) => {
			setSelectedRunId(run.runId);
			refreshImportsData();
		},
	});

	const contactsImportMutation = useMutation({
		mutationFn: () =>
			client.guestImports.importContacts({
				weddingId,
				rows: parseJsonArray(contactsPayload),
				...importBaseInput,
			}),
		onSuccess: (run) => {
			setSelectedRunId(run.runId);
			refreshImportsData();
		},
	});

	const manualRowsImportMutation = useMutation({
		mutationFn: () =>
			client.guestImports.importManualRows({
				weddingId,
				rows: parseJsonArray(manualRowsPayload),
				...importBaseInput,
			}),
		onSuccess: (run) => {
			setSelectedRunId(run.runId);
			refreshImportsData();
		},
	});

	const isImporting =
		csvImportMutation.isPending ||
		contactsImportMutation.isPending ||
		manualRowsImportMutation.isPending;

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">Guest Imports</h1>
				<p className="text-muted-foreground text-sm">
					Execute CSV, contacts, and manual-row imports through the same backend
					pipeline and inspect warning-only rows.
				</p>
			</header>

			<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
				<label className="grid gap-1 text-sm" htmlFor="imports-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="imports-wedding-id"
						onChange={(event) => setWeddingId(event.target.value)}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>
				<label className="grid gap-1 text-sm" htmlFor="imports-country">
					Default country
					<select
						className="rounded-md border bg-background px-3 py-2"
						id="imports-country"
						onChange={(event) =>
							setDefaultCountry(
								event.target.value as (typeof defaultCountryOptions)[number],
							)
						}
						value={defaultCountry}
					>
						{defaultCountryOptions.map((country) => (
							<option key={country} value={country}>
								{country}
							</option>
						))}
					</select>
				</label>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setIdempotencyKey(event.target.value)}
					placeholder="Idempotency key (optional)"
					value={idempotencyKey}
				/>
				<input
					className="rounded-md border bg-background px-3 py-2 text-sm"
					onChange={(event) => setSourceFingerprint(event.target.value)}
					placeholder="Source fingerprint (optional)"
					value={sourceFingerprint}
				/>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">CSV Import</h2>
					<textarea
						className="mt-2 min-h-44 w-full rounded-md border bg-background p-2 font-mono text-xs"
						onChange={(event) => setCsvContent(event.target.value)}
						value={csvContent}
					/>
					<button
						className="mt-2 rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!weddingId.trim() || !csvContent.trim() || isImporting}
						onClick={() => csvImportMutation.mutate()}
						type="button"
					>
						{csvImportMutation.isPending ? "Running..." : "Run CSV import"}
					</button>
					{csvImportMutation.isError ? (
						<p className="mt-2 text-red-600 text-xs">
							{csvImportMutation.error.message}
						</p>
					) : null}
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Contacts Import</h2>
					<textarea
						className="mt-2 min-h-44 w-full rounded-md border bg-background p-2 font-mono text-xs"
						onChange={(event) => setContactsPayload(event.target.value)}
						value={contactsPayload}
					/>
					<button
						className="mt-2 rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!weddingId.trim() || isImporting}
						onClick={() => contactsImportMutation.mutate()}
						type="button"
					>
						{contactsImportMutation.isPending
							? "Running..."
							: "Run contacts import"}
					</button>
					{contactsImportMutation.isError ? (
						<p className="mt-2 text-red-600 text-xs">
							{contactsImportMutation.error.message}
						</p>
					) : null}
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Manual Rows Import</h2>
					<textarea
						className="mt-2 min-h-44 w-full rounded-md border bg-background p-2 font-mono text-xs"
						onChange={(event) => setManualRowsPayload(event.target.value)}
						value={manualRowsPayload}
					/>
					<button
						className="mt-2 rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={!weddingId.trim() || isImporting}
						onClick={() => manualRowsImportMutation.mutate()}
						type="button"
					>
						{manualRowsImportMutation.isPending
							? "Running..."
							: "Run manual rows import"}
					</button>
					{manualRowsImportMutation.isError ? (
						<p className="mt-2 text-red-600 text-xs">
							{manualRowsImportMutation.error.message}
						</p>
					) : null}
				</article>
			</section>

			<section className="rounded-lg border p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="font-semibold text-lg">Import Runs</h2>
					<select
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setSelectedRunId(event.target.value)}
						value={selectedRunId}
					>
						<option value="">All warning rows</option>
						{(runsQuery.data ?? []).map((run) => (
							<option key={run.id} value={run.id}>
								{run.channel} · {run.status} · {run.id.slice(0, 8)}
							</option>
						))}
					</select>
				</div>
				{runsQuery.isLoading ? (
					<p className="mt-3 text-sm">Loading runs...</p>
				) : null}
				{runsQuery.isError ? (
					<p className="mt-3 text-red-600 text-sm">{runsQuery.error.message}</p>
				) : null}
				<div className="mt-3 grid gap-2">
					{(runsQuery.data ?? []).map((run) => (
						<div className="rounded-md border p-2 text-sm" key={run.id}>
							<p className="font-medium">
								{run.channel} · {run.status}
							</p>
							<p className="text-muted-foreground text-xs">
								created: {run.rowsCreated} · updated: {run.rowsUpdated} ·
								reactivated: {run.rowsReactivated} · warning: {run.rowsWarning}{" "}
								· skipped: {run.rowsSkipped} · failed: {run.rowsFailed}
							</p>
						</div>
					))}
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Selected Run Detail</h2>
					{runDetailQuery.isLoading ? (
						<p className="mt-2 text-sm">Loading run detail...</p>
					) : null}
					{runDetailQuery.isError ? (
						<p className="mt-2 text-red-600 text-sm">
							{runDetailQuery.error.message}
						</p>
					) : null}
					<p className="mt-2 text-xs">
						Rows captured: {runDetailQuery.data?.rows.length ?? 0}
					</p>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Warning Rows</h2>
					<p className="text-muted-foreground text-xs">
						Malformed/no-phone rows remain visible and marked non-inviteable.
					</p>
					{warningRowsQuery.isLoading ? (
						<p className="mt-2 text-sm">Loading warning rows...</p>
					) : null}
					{warningRowsQuery.isError ? (
						<p className="mt-2 text-red-600 text-sm">
							{warningRowsQuery.error.message}
						</p>
					) : null}
					<div className="mt-2 max-h-60 space-y-2 overflow-auto">
						{(warningRowsQuery.data ?? []).map((row) => (
							<div className="rounded-md border p-2 text-xs" key={row.id}>
								<p className="font-medium">
									row {row.rowNumber} · {row.outcome}
								</p>
								<p className="text-muted-foreground">
									inviteable: {row.isInviteable ? "yes" : "no"} ·{" "}
									{row.warningDetail ?? "no warning detail"}
								</p>
							</div>
						))}
					</div>
				</article>
			</section>
		</div>
	);
}

function parseJsonArray(payload: string) {
	const parsed = JSON.parse(payload) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error("Payload must be a JSON array.");
	}
	return parsed;
}
