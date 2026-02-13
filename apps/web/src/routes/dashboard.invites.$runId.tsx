import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/invites/$runId")({
	component: DashboardInviteRunDetailRoute,
	validateSearch: (search: Record<string, unknown>) => ({
		weddingId: typeof search.weddingId === "string" ? search.weddingId : "",
	}),
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

function DashboardInviteRunDetailRoute() {
	const { runId } = Route.useParams();
	const search = Route.useSearch();
	const [weddingId, setWeddingId] = useState(search.weddingId);

	const runDetailQuery = useQuery({
		...orpc.invites.getRunDetail.queryOptions({
			input: {
				weddingId,
				runId,
			},
		}),
		enabled: weddingId.trim().length > 0,
	});

	const run = runDetailQuery.data;

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Invite Run Detail
				</h1>
				<p className="text-muted-foreground text-sm">
					Run <code>{runId}</code> with server-owned lifecycle statuses.
				</p>
			</header>

			<section className="rounded-lg border p-4">
				<label className="grid gap-1 text-sm" htmlFor="invite-run-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="invite-run-wedding-id"
						onChange={(event) => setWeddingId(event.target.value)}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>
			</section>

			{runDetailQuery.isLoading ? (
				<p className="text-sm">Loading invite run...</p>
			) : null}
			{runDetailQuery.isError ? (
				<p className="text-red-600 text-sm">{runDetailQuery.error.message}</p>
			) : null}

			{run ? (
				<>
					<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
						<div className="rounded-md border p-3">
							<p className="text-muted-foreground text-xs uppercase">
								Run status
							</p>
							<p className="font-semibold text-lg">{run.status}</p>
							<p className="text-muted-foreground text-xs">
								event: {run.eventId}
							</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-muted-foreground text-xs uppercase">
								Counters
							</p>
							<p className="text-xs">
								eligible: {run.eligibleCount} · blocked: {run.blockedCount}
							</p>
							<p className="text-xs">
								sent: {run.sentCount} · failed: {run.failedCount}
							</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-muted-foreground text-xs uppercase">
								Template
							</p>
							<p className="text-xs">{run.templateName}</p>
							<p className="text-xs">language: {run.templateLanguage}</p>
						</div>
					</section>

					<section className="rounded-lg border p-4">
						<h2 className="font-semibold text-lg">Per-message lifecycle</h2>
						<p className="mt-1 text-muted-foreground text-xs">
							Statuses below come directly from persisted API state and webhook
							transitions.
						</p>

						<div className="mt-3 overflow-x-auto">
							<table className="w-full border text-left text-xs">
								<thead>
									<tr className="bg-muted/30">
										<th className="border px-2 py-1">Recipient</th>
										<th className="border px-2 py-1">Status</th>
										<th className="border px-2 py-1">Blocked reason</th>
										<th className="border px-2 py-1">Provider message id</th>
										<th className="border px-2 py-1">Latest status at</th>
									</tr>
								</thead>
								<tbody>
									{run.messages.map((message) => (
										<tr key={message.id}>
											<td className="border px-2 py-1">
												{message.recipientPhoneE164}
											</td>
											<td className="border px-2 py-1">
												{message.lifecycleStatus}
											</td>
											<td className="border px-2 py-1">
												{message.rejectionReason ?? "-"}
											</td>
											<td className="border px-2 py-1">
												{message.providerMessageId ?? "-"}
											</td>
											<td className="border px-2 py-1">
												{message.lastStatusAt
													? new Date(message.lastStatusAt).toLocaleString()
													: "-"}
											</td>
										</tr>
									))}
									{run.messages.length === 0 ? (
										<tr>
											<td
												className="border px-2 py-3 text-muted-foreground"
												colSpan={5}
											>
												No messages persisted for this run.
											</td>
										</tr>
									) : null}
								</tbody>
							</table>
						</div>
					</section>

					<section className="rounded-lg border p-4">
						<h2 className="font-semibold text-lg">
							Lifecycle transition trace
						</h2>
						<div className="mt-3 grid gap-3">
							{run.messages.map((message) => (
								<article
									className="rounded-md border p-3"
									key={`${message.id}-trace`}
								>
									<p className="font-medium text-xs">
										{message.recipientPhoneE164}
									</p>
									<div className="mt-2 space-y-1 text-xs">
										{message.transitions.map((transition) => (
											<p key={transition.id}>
												{transition.fromStatus ?? "-"} → {transition.toStatus} ·{" "}
												{transition.source} · duplicate:{" "}
												{transition.isDuplicate ? "yes" : "no"}
											</p>
										))}
										{message.transitions.length === 0 ? (
											<p className="text-muted-foreground">
												No transitions yet.
											</p>
										) : null}
									</div>
								</article>
							))}
						</div>
					</section>
				</>
			) : null}
		</div>
	);
}
