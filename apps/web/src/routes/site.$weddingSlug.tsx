import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { RsvpStickyCta } from "@/components/website/rsvp-sticky-cta";
import { StaleSyncBanner } from "@/components/website/stale-sync-banner";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/site/$weddingSlug")({
	component: WeddingWebsiteRoute,
	validateSearch: (search: Record<string, unknown>) => ({
		session:
			typeof search.session === "string" && search.session.length > 0
				? search.session
				: undefined,
	}),
});

function WeddingWebsiteRoute() {
	const { weddingSlug } = Route.useParams();
	const { session } = Route.useSearch();

	const snapshotQuery = useQuery(
		orpc.website.getSnapshot.queryOptions({
			input: {
				weddingId: weddingSlug,
				trustedSessionToken: session,
			},
		}),
	);

	const queueIntentMutation = useMutation({
		mutationFn: async (intent: "start" | "update") => {
			return Promise.resolve({
				intent,
				acknowledgedAt: new Date().toISOString(),
			});
		},
	});

	if (snapshotQuery.isLoading) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<p className="text-muted-foreground text-sm">Loading website...</p>
			</div>
		);
	}

	if (snapshotQuery.isError || !snapshotQuery.data) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<p className="text-destructive text-sm">
					Unable to load wedding website snapshot.
				</p>
			</div>
		);
	}

	const data = snapshotQuery.data;

	return (
		<div className="pb-24">
			<div className="container mx-auto grid max-w-4xl gap-5 px-4 py-8">
				<header className="space-y-3 rounded-xl border p-6">
					<p className="text-muted-foreground text-xs uppercase tracking-wide">
						Wedding website
					</p>
					<h1 className="font-semibold text-3xl tracking-tight">
						{weddingSlug}
					</h1>
					<p className="text-muted-foreground text-sm">
						Live schedule and RSVP status synced from canonical event records.
					</p>
				</header>

				<StaleSyncBanner
					isStale={data.freshness.isStale}
					lastUpdatedAt={data.freshness.lastUpdatedAt}
					staleReason={data.freshness.staleReason}
				/>

				<section className="grid gap-3 rounded-xl border p-5">
					<h2 className="font-semibold text-lg">Public Summary</h2>
					<p className="text-muted-foreground text-sm">
						RSVP totals - Accepted: {data.summary.rsvpSummary.accepted},
						Declined: {data.summary.rsvpSummary.declined}, Total:{" "}
						{data.summary.rsvpSummary.total}
					</p>
					<div className="grid gap-2">
						{data.summary.events.map((event) => (
							<article className="rounded-lg border p-3" key={event.eventId}>
								<h3 className="font-medium text-sm">{event.title}</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									{event.description ??
										"Details available after RSVP verification."}
								</p>
							</article>
						))}
					</div>
				</section>

				{data.requiresVerification ? (
					<section className="rounded-xl border border-dashed p-5">
						<h2 className="font-semibold text-lg">Invite-only details</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Verify with OTP to view protected schedule, venue and guest
							updates.
						</p>
						<a
							className="mt-3 inline-flex rounded-md border px-3 py-2 text-sm"
							href={`/site/${weddingSlug}/verify`}
						>
							Verify phone access
						</a>
					</section>
				) : null}

				{data.protected ? (
					<section className="rounded-xl border p-5">
						<h2 className="font-semibold text-lg">Protected Schedule</h2>
						<ul className="mt-2 grid gap-2">
							{data.protected.schedule.map((item) => (
								<li
									className="rounded-md border p-3 text-sm"
									key={item.eventId}
								>
									{item.title}
								</li>
							))}
						</ul>
					</section>
				) : null}
			</div>

			<RsvpStickyCta
				href={data.cta.whatsappDeepLink}
				intent={data.cta.intent}
				isFlowAvailable={data.cta.isFlowAvailable}
				label={data.cta.label}
				onFlowUnavailable={(intent) => {
					queueIntentMutation.mutate(intent);
				}}
			/>
		</div>
	);
}
