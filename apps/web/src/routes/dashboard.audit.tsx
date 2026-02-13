import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/audit")({
	component: DashboardAuditRoute,
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

function DashboardAuditRoute() {
	const [weddingId, setWeddingId] = useState("");
	const [actionFilter, setActionFilter] = useState("");
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");

	const actionTypes = useMemo(
		() =>
			actionFilter
				.split(",")
				.map((entry) => entry.trim())
				.filter(Boolean),
		[actionFilter],
	);

	const auditQuery = useQuery({
		...orpc.audit.list.queryOptions({
			input: {
				weddingId,
				actionTypes: actionTypes.length > 0 ? actionTypes : undefined,
				fromDate: fromDate ? new Date(fromDate) : undefined,
				toDate: toDate ? new Date(toDate) : undefined,
			},
		}),
		enabled: weddingId.trim().length > 0,
	});

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Central Audit Log
				</h1>
				<p className="text-muted-foreground text-sm">
					Investigate governance and operational actions with actor, target,
					before/after snapshots, and reason notes.
				</p>
			</header>

			<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
				<label
					className="grid gap-1 text-sm md:col-span-2"
					htmlFor="audit-wedding-id"
				>
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						id="audit-wedding-id"
						onChange={(event) => setWeddingId(event.target.value)}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>

				<label className="grid gap-1 text-sm" htmlFor="audit-from-date">
					From date
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						id="audit-from-date"
						onChange={(event) => setFromDate(event.target.value)}
						type="date"
						value={fromDate}
					/>
				</label>

				<label className="grid gap-1 text-sm" htmlFor="audit-to-date">
					To date
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						id="audit-to-date"
						onChange={(event) => setToDate(event.target.value)}
						type="date"
						value={toDate}
					/>
				</label>

				<label
					className="grid gap-1 text-sm md:col-span-4"
					htmlFor="audit-action-types"
				>
					Action filters (comma-separated)
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						id="audit-action-types"
						onChange={(event) => setActionFilter(event.target.value)}
						placeholder="event.create, event.visibility.change, invite.send, guest.edit"
						value={actionFilter}
					/>
				</label>
			</section>

			<section className="overflow-x-auto rounded-lg border">
				<table className="w-full min-w-[1100px] border-collapse text-left text-sm">
					<thead className="bg-muted/50">
						<tr>
							<th className="border-b px-3 py-2 font-medium">Actor</th>
							<th className="border-b px-3 py-2 font-medium">Time</th>
							<th className="border-b px-3 py-2 font-medium">Action</th>
							<th className="border-b px-3 py-2 font-medium">Target</th>
							<th className="border-b px-3 py-2 font-medium">Before</th>
							<th className="border-b px-3 py-2 font-medium">After</th>
							<th className="border-b px-3 py-2 font-medium">Reason</th>
						</tr>
					</thead>
					<tbody>
						{auditQuery.isLoading ? (
							<tr>
								<td className="px-3 py-3 text-muted-foreground" colSpan={7}>
									Loading audit rows...
								</td>
							</tr>
						) : null}

						{auditQuery.isError ? (
							<tr>
								<td className="px-3 py-3 text-red-600" colSpan={7}>
									{auditQuery.error.message}
								</td>
							</tr>
						) : null}

						{!auditQuery.isLoading && (auditQuery.data?.length ?? 0) === 0 ? (
							<tr>
								<td className="px-3 py-3 text-muted-foreground" colSpan={7}>
									No audit rows found for the selected filters.
								</td>
							</tr>
						) : null}

						{(auditQuery.data ?? []).map((entry) => (
							<tr className="align-top" key={entry.id}>
								<td className="border-t px-3 py-3">
									{entry.actor ? (
										<div>
											<p className="font-medium">{entry.actor.role}</p>
											<p className="text-muted-foreground text-xs">
												{entry.actor.userId}
											</p>
										</div>
									) : (
										<span className="text-muted-foreground text-xs">
											system
										</span>
									)}
								</td>
								<td className="border-t px-3 py-3 text-xs">
									{new Date(entry.time).toLocaleString()}
								</td>
								<td className="border-t px-3 py-3">
									<span className="rounded border px-2 py-0.5 text-xs">
										{entry.action}
									</span>
								</td>
								<td className="border-t px-3 py-3 text-xs">
									{entry.target.type}
									<br />
									<span className="text-muted-foreground">
										{entry.target.id ?? "-"}
									</span>
								</td>
								<td className="border-t px-3 py-3 text-xs">
									{formatSummary(entry.beforeSummary)}
								</td>
								<td className="border-t px-3 py-3 text-xs">
									{formatSummary(entry.afterSummary)}
								</td>
								<td className="border-t px-3 py-3 text-xs">
									{entry.reasonNote ?? "-"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
		</div>
	);
}

function formatSummary(summary: unknown) {
	if (!summary) {
		return "-";
	}

	if (typeof summary === "string") {
		return summary;
	}

	if (typeof summary === "number" || typeof summary === "boolean") {
		return String(summary);
	}

	return JSON.stringify(summary);
}
