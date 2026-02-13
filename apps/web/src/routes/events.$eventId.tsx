import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import AccessDenied from "@/components/governance/access-denied";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/events/$eventId")({
	component: EventDetailRoute,
	validateSearch: (search: Record<string, unknown>) => ({
		weddingId: typeof search.weddingId === "string" ? search.weddingId : "",
	}),
	beforeLoad: async ({ search }) => {
		if (!search.weddingId) {
			throw redirect({
				to: "/",
			});
		}

		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function EventDetailRoute() {
	const { eventId } = Route.useParams();
	const { weddingId } = Route.useSearch();

	const detailQuery = useQuery(
		orpc.events.getDetail.queryOptions({
			input: {
				weddingId,
				eventId,
			},
		}),
	);

	if (detailQuery.isError) {
		return (
			<div className="container mx-auto px-4 py-6">
				<AccessDenied
					message="This event is invite-only and not available for your account right now."
					title="You cannot open this event"
				/>
			</div>
		);
	}

	if (detailQuery.isLoading) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-muted-foreground text-sm">
					Loading event details...
				</p>
			</div>
		);
	}

	if (!detailQuery.data) {
		return (
			<div className="container mx-auto px-4 py-6">
				<AccessDenied
					message="This event link is no longer available."
					title="Event unavailable"
				/>
			</div>
		);
	}

	const eventData = detailQuery.data;

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<header className="rounded-lg border p-5">
				<p className="text-muted-foreground text-xs uppercase tracking-wide">
					Event detail
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					{eventData.title}
				</h1>
				<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
					<span className="rounded border px-2 py-1 uppercase">
						{eventData.status}
					</span>
					<span className="rounded border px-2 py-1">
						{eventData.visibility}
					</span>
				</div>
			</header>

			<section className="mt-4 rounded-lg border p-5">
				<h2 className="font-semibold text-lg">About this event</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					{eventData.description ?? "No description yet."}
				</p>
			</section>
		</div>
	);
}
