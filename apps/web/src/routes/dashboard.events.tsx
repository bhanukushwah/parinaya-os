import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/events")({
	component: EventsDashboardRoute,
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

function EventsDashboardRoute() {
	const [weddingId, setWeddingId] = useState("");
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [reasonNote, setReasonNote] = useState("");

	const eventsQuery = useQuery({
		...orpc.events.listForOperator.queryOptions({
			input: {
				weddingId,
			},
		}),
		enabled: weddingId.trim().length > 0,
	});

	const eventRows = useMemo(
		() =>
			[...(eventsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
		[eventsQuery.data],
	);

	const createMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			title: string;
			slug: string;
			description?: string;
		}) => client.events.create(input),
		onSuccess: () => {
			setTitle("");
			setSlug("");
			setDescription("");
			void eventsQuery.refetch();
		},
	});

	const editMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			eventId: string;
			title?: string;
			slug?: string;
			description?: string;
			status?: "draft" | "published" | "archived";
			visibility?: "public" | "invite-only";
			reasonNote?: string;
		}) => client.events.edit(input),
		onSuccess: () => {
			void eventsQuery.refetch();
		},
	});

	const archiveMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			eventId: string;
			reasonNote?: string;
		}) => client.events.archive(input),
		onSuccess: () => {
			void eventsQuery.refetch();
		},
	});

	const restoreMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			eventId: string;
			reasonNote?: string;
		}) => client.events.restore(input),
		onSuccess: () => {
			void eventsQuery.refetch();
		},
	});

	const reorderMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			orderedEventIds: string[];
			reasonNote?: string;
		}) => client.events.reorder(input),
		onSuccess: () => {
			void eventsQuery.refetch();
		},
	});

	const isWorking =
		createMutation.isPending ||
		editMutation.isPending ||
		archiveMutation.isPending ||
		restoreMutation.isPending ||
		reorderMutation.isPending;

	const isFormValid =
		title.trim().length > 0 &&
		slug.trim().length > 0 &&
		weddingId.trim().length > 0;

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Event Governance
				</h1>
				<p className="text-muted-foreground text-sm">
					Create, update, archive, restore, reorder, and tune visibility with
					API-backed persistence.
				</p>
			</header>

			<section className="rounded-lg border p-4">
				<label
					className="mb-2 block font-medium text-sm"
					htmlFor="wedding-id-input"
				>
					Wedding workspace ID
				</label>
				<input
					className="w-full rounded-md border bg-background px-3 py-2 text-sm"
					id="wedding-id-input"
					onChange={(event) => setWeddingId(event.target.value)}
					placeholder="wed_..."
					value={weddingId}
				/>
			</section>

			<section className="rounded-lg border p-4">
				<h2 className="font-semibold text-lg">Create event</h2>
				<div className="mt-3 grid gap-3 md:grid-cols-3">
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Event title"
						value={title}
					/>
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setSlug(event.target.value)}
						placeholder="event-slug"
						value={slug}
					/>
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setDescription(event.target.value)}
						placeholder="Optional description"
						value={description}
					/>
				</div>

				<button
					className="mt-3 inline-flex rounded-md border px-3 py-2 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!isFormValid || isWorking}
					onClick={() => {
						if (!isFormValid) {
							return;
						}

						createMutation.mutate({
							weddingId,
							title: title.trim(),
							slug: slug.trim(),
							description: description.trim() || undefined,
						});
					}}
					type="button"
				>
					{createMutation.isPending ? "Creating..." : "Create event"}
				</button>
			</section>

			<section className="rounded-lg border p-4">
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-lg">Managed events</h2>
					<input
						className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setReasonNote(event.target.value)}
						placeholder="Optional reason note for audit"
						value={reasonNote}
					/>
				</div>

				{eventsQuery.isLoading ? (
					<p className="mt-3 text-sm">Loading events...</p>
				) : null}
				{eventsQuery.isError ? (
					<p className="mt-3 text-red-600 text-sm">
						{eventsQuery.error.message}
					</p>
				) : null}

				{!eventsQuery.isLoading && eventRows.length === 0 ? (
					<p className="mt-3 text-muted-foreground text-sm">
						No events found for this workspace yet.
					</p>
				) : null}

				<div className="mt-4 grid gap-3">
					{eventRows.map((eventItem, index) => {
						const canMoveUp = index > 0;
						const canMoveDown = index < eventRows.length - 1;

						return (
							<article className="rounded-md border p-3" key={eventItem.id}>
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="font-semibold">{eventItem.title}</h3>
									<span className="rounded border px-2 py-0.5 text-xs uppercase">
										{eventItem.status}
									</span>
									<span className="rounded border px-2 py-0.5 text-xs">
										{eventItem.visibility}
									</span>
									<span className="text-muted-foreground text-xs">
										#{eventItem.sortOrder}
									</span>
								</div>

								<p className="mt-2 text-muted-foreground text-xs">
									slug: {eventItem.slug}
								</p>
								<p className="text-muted-foreground text-sm">
									{eventItem.description ?? "No description"}
								</p>

								<div className="mt-3 flex flex-wrap gap-2">
									<button
										className="rounded-md border px-2 py-1 text-xs"
										disabled={isWorking}
										onClick={() => {
											const nextStatus =
												eventItem.status === "published"
													? "draft"
													: "published";
											editMutation.mutate({
												weddingId,
												eventId: eventItem.id,
												status: nextStatus,
												reasonNote: reasonNote.trim() || undefined,
											});
										}}
										type="button"
									>
										{eventItem.status === "published" ? "Set Draft" : "Publish"}
									</button>

									<button
										className="rounded-md border px-2 py-1 text-xs"
										disabled={isWorking}
										onClick={() => {
											const nextVisibility =
												eventItem.visibility === "public"
													? "invite-only"
													: "public";
											editMutation.mutate({
												weddingId,
												eventId: eventItem.id,
												visibility: nextVisibility,
												reasonNote: reasonNote.trim() || undefined,
											});
										}}
										type="button"
									>
										{eventItem.visibility === "public"
											? "Make Invite-only"
											: "Make Public"}
									</button>

									{eventItem.status === "archived" ? (
										<button
											className="rounded-md border px-2 py-1 text-xs"
											disabled={isWorking}
											onClick={() => {
												restoreMutation.mutate({
													weddingId,
													eventId: eventItem.id,
													reasonNote: reasonNote.trim() || undefined,
												});
											}}
											type="button"
										>
											Restore
										</button>
									) : (
										<button
											className="rounded-md border px-2 py-1 text-xs"
											disabled={isWorking}
											onClick={() => {
												archiveMutation.mutate({
													weddingId,
													eventId: eventItem.id,
													reasonNote: reasonNote.trim() || undefined,
												});
											}}
											type="button"
										>
											Archive
										</button>
									)}

									<button
										className="rounded-md border px-2 py-1 text-xs"
										disabled={isWorking || !canMoveUp}
										onClick={() => {
											if (!canMoveUp) {
												return;
											}

											const reordered = [...eventRows];
											const previousItem = reordered[index - 1];
											reordered[index - 1] =
												reordered[index] ?? reordered[index - 1];
											reordered[index] = previousItem ?? reordered[index];

											reorderMutation.mutate({
												weddingId,
												orderedEventIds: reordered.map((entry) => entry.id),
												reasonNote: reasonNote.trim() || undefined,
											});
										}}
										type="button"
									>
										Move up
									</button>

									<button
										className="rounded-md border px-2 py-1 text-xs"
										disabled={isWorking || !canMoveDown}
										onClick={() => {
											if (!canMoveDown) {
												return;
											}

											const reordered = [...eventRows];
											const nextItem = reordered[index + 1];
											reordered[index + 1] =
												reordered[index] ?? reordered[index + 1];
											reordered[index] = nextItem ?? reordered[index];

											reorderMutation.mutate({
												weddingId,
												orderedEventIds: reordered.map((entry) => entry.id),
												reasonNote: reasonNote.trim() || undefined,
											});
										}}
										type="button"
									>
										Move down
									</button>
								</div>
							</article>
						);
					})}
				</div>
			</section>
		</div>
	);
}
