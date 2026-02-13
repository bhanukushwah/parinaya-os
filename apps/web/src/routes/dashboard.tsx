import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		return { session };
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();

	const privateData = useQuery(orpc.privateData.queryOptions());

	return (
		<div className="container mx-auto grid max-w-5xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Operations Dashboard
				</h1>
				<p className="text-muted-foreground text-sm">
					Welcome {session.data?.user.name}
				</p>
				<p className="text-muted-foreground text-sm">
					API: {privateData.data?.message}
				</p>
			</header>

			<section className="grid gap-4 md:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Invite Delivery</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Run WhatsApp invite sends with compliance precheck and lifecycle
						status monitoring.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/invites"
					>
						Open invite operations
					</Link>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Guest Operations</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Create people, create guest units, and control
						assignment/reassignment workflows.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/guests"
					>
						Open guest operations
					</Link>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Event Governance</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage lifecycle, visibility, and display order for every event.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/events"
					>
						Open event manager
					</Link>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Audit Visibility</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Review actor, action, before/after snapshots, and reason notes.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/audit"
					>
						Open central audit
					</Link>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Gifts Controls</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Prepare UPI and wishlist gifting details, then publish/hide/disable
						with explicit safeguards.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/gifts"
					>
						Open gifts dashboard
					</Link>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Import Pipeline</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Launch CSV, contacts, and manual-row imports and inspect warning
						visibility for non-inviteable rows.
					</p>
					<Link
						className="mt-4 inline-flex font-medium text-sm underline"
						to="/dashboard/imports"
					>
						Open import operations
					</Link>
				</article>
			</section>
		</div>
	);
}
