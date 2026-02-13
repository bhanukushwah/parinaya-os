import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { GiftsModeEditor } from "@/components/gifts/gifts-mode-editor";
import { GiftsSafetyControls } from "@/components/gifts/gifts-safety-controls";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

type GiftsSearch = {
	weddingId?: string;
};

function parseSearch(search: Record<string, unknown>): GiftsSearch {
	const weddingId =
		typeof search.weddingId === "string" ? search.weddingId.trim() : "";

	return {
		weddingId: weddingId.length > 0 ? weddingId : undefined,
	};
}

export const Route = createFileRoute("/dashboard/gifts")({
	component: DashboardGiftsRoute,
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

function DashboardGiftsRoute() {
	const navigate = Route.useNavigate();
	const search = Route.useSearch();
	const [mutationError, setMutationError] = useState<string | null>(null);

	const weddingId = search.weddingId ?? "";
	const hasWeddingId = weddingId.length > 0;

	const giftsQuery = useQuery({
		...orpc.gifts.adminView.queryOptions({
			input: {
				weddingId,
			},
		}),
		enabled: hasWeddingId,
	});

	const refetchGifts = () => {
		void giftsQuery.refetch();
	};

	const draftMutation = useMutation({
		mutationFn: (payload: {
			upiPayeeName: string | null;
			upiId: string | null;
			upiQrImageUrl: string | null;
			messageNote: string | null;
			prePublishNote: string | null;
		}) =>
			client.gifts.updateDraft({
				weddingId,
				...payload,
			}),
		onError: (error) => {
			setMutationError(error.message);
		},
		onSuccess: () => {
			setMutationError(null);
			refetchGifts();
		},
	});

	const upsertItemMutation = useMutation({
		mutationFn: (payload: {
			itemId?: string;
			title: string;
			description: string | null;
			targetAmountPaise: number;
		}) =>
			client.gifts.upsertItem({
				weddingId,
				...payload,
			}),
		onError: (error) => {
			setMutationError(error.message);
		},
		onSuccess: () => {
			setMutationError(null);
			refetchGifts();
		},
	});

	const archiveItemMutation = useMutation({
		mutationFn: (itemId: string) =>
			client.gifts.archiveItem({
				weddingId,
				itemId,
			}),
		onError: (error) => {
			setMutationError(error.message);
		},
		onSuccess: () => {
			setMutationError(null);
			refetchGifts();
		},
	});

	const transitionMutation = useMutation({
		mutationFn: (action: "publish" | "hide" | "disable") =>
			client.gifts.transitionMode({
				weddingId,
				action,
				disableReason:
					action === "disable"
						? "Disabled from dashboard safety controls"
						: undefined,
			}),
		onError: (error) => {
			setMutationError(error.message);
		},
		onSuccess: () => {
			setMutationError(null);
			refetchGifts();
		},
	});

	const isMutating = useMemo(
		() =>
			draftMutation.isPending ||
			upsertItemMutation.isPending ||
			archiveItemMutation.isPending ||
			transitionMutation.isPending,
		[
			draftMutation.isPending,
			upsertItemMutation.isPending,
			archiveItemMutation.isPending,
			transitionMutation.isPending,
		],
	);

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Gifts Dashboard
				</h1>
				<p className="text-muted-foreground text-sm">
					Manage UPI details, wishlist items, and publish/hide/disable safety
					controls.
				</p>
			</header>

			<section className="grid gap-2 rounded-lg border p-4">
				<label className="grid gap-1 text-sm" htmlFor="gifts-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="gifts-wedding-id"
						onChange={(event) => {
							void navigate({
								to: "/dashboard/gifts",
								search: {
									weddingId: event.target.value,
								},
							});
						}}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>
			</section>

			{!hasWeddingId ? (
				<p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
					Enter a wedding workspace ID to load gifts mode controls.
				</p>
			) : null}

			{giftsQuery.isLoading && hasWeddingId ? (
				<p className="text-muted-foreground text-sm">Loading gifts state...</p>
			) : null}

			{giftsQuery.isError ? (
				<p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-sm">
					{giftsQuery.error.message}
				</p>
			) : null}

			{giftsQuery.data ? (
				<>
					<GiftsSafetyControls
						disabled={isMutating}
						errorMessage={mutationError}
						onTransition={(action) => transitionMutation.mutate(action)}
						prePublishNote={giftsQuery.data.prePublishNote}
						status={giftsQuery.data.status}
					/>

					<GiftsModeEditor
						disabled={isMutating}
						onArchiveItem={(itemId) => archiveItemMutation.mutate(itemId)}
						onSaveDraft={(payload) => draftMutation.mutate(payload)}
						onUpsertItem={(payload) => upsertItemMutation.mutate(payload)}
						view={giftsQuery.data}
					/>
				</>
			) : null}

			{mutationError ? (
				<p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-sm">
					{mutationError.includes("FORBIDDEN")
						? "Only admin/coordinator can edit, publish, hide, or disable gifts."
						: mutationError}
				</p>
			) : null}
		</div>
	);
}
