import { useMemo, useState } from "react";

import { GiftsItemTable } from "./gifts-item-table";

type GiftsItem = {
	id: string;
	title: string;
	description: string | null;
	targetAmountPaise: number;
	amountRaisedPaise: number;
	remainingAmountPaise: number;
	progressPercent: number;
	isCompleted: boolean;
};

type GiftsAdminView = {
	upiPayeeName: string | null;
	upiId: string | null;
	upiQrImageUrl: string | null;
	messageNote: string | null;
	prePublishNote: string | null;
	items: GiftsItem[];
	status: "draft" | "published" | "hidden" | "disabled";
};

function toPaise(value: string) {
	const amount = Number.parseFloat(value);
	if (!Number.isFinite(amount)) {
		return null;
	}
	return Math.round(amount * 100);
}

export function GiftsModeEditor(input: {
	view: GiftsAdminView;
	disabled?: boolean;
	onSaveDraft: (payload: {
		upiPayeeName: string | null;
		upiId: string | null;
		upiQrImageUrl: string | null;
		messageNote: string | null;
		prePublishNote: string | null;
	}) => void;
	onUpsertItem: (payload: {
		itemId?: string;
		title: string;
		description: string | null;
		targetAmountPaise: number;
	}) => void;
	onArchiveItem: (itemId: string) => void;
}) {
	const [draft, setDraft] = useState({
		upiPayeeName: input.view.upiPayeeName ?? "",
		upiId: input.view.upiId ?? "",
		upiQrImageUrl: input.view.upiQrImageUrl ?? "",
		messageNote: input.view.messageNote ?? "",
		prePublishNote: input.view.prePublishNote ?? "",
	});

	const [itemEditor, setItemEditor] = useState({
		itemId: "",
		title: "",
		description: "",
		targetAmountInr: "",
	});

	const canPublish = useMemo(
		() => draft.prePublishNote.trim().length > 0,
		[draft.prePublishNote],
	);

	const handleSaveDraft = () => {
		input.onSaveDraft({
			upiPayeeName: draft.upiPayeeName.trim() || null,
			upiId: draft.upiId.trim() || null,
			upiQrImageUrl: draft.upiQrImageUrl.trim() || null,
			messageNote: draft.messageNote.trim() || null,
			prePublishNote: draft.prePublishNote.trim() || null,
		});
	};

	const handleSaveItem = () => {
		const targetAmountPaise = toPaise(itemEditor.targetAmountInr);
		if (!targetAmountPaise || targetAmountPaise <= 0) {
			return;
		}

		if (itemEditor.title.trim().length === 0) {
			return;
		}

		input.onUpsertItem({
			itemId: itemEditor.itemId || undefined,
			title: itemEditor.title.trim(),
			description: itemEditor.description.trim() || null,
			targetAmountPaise,
		});

		setItemEditor({
			itemId: "",
			title: "",
			description: "",
			targetAmountInr: "",
		});
	};

	return (
		<div className="grid gap-4">
			<section className="grid gap-3 rounded-lg border p-4">
				<h2 className="font-semibold text-lg">Gift Mode Draft</h2>
				<div className="grid gap-3 md:grid-cols-2">
					<label className="grid gap-1 text-sm">
						UPI Payee Name
						<input
							className="rounded-md border bg-background px-3 py-2"
							disabled={input.disabled}
							onChange={(event) =>
								setDraft((previous) => ({
									...previous,
									upiPayeeName: event.target.value,
								}))
							}
							placeholder="Asha Sharma"
							value={draft.upiPayeeName}
						/>
					</label>
					<label className="grid gap-1 text-sm">
						UPI ID
						<input
							className="rounded-md border bg-background px-3 py-2"
							disabled={input.disabled}
							onChange={(event) =>
								setDraft((previous) => ({
									...previous,
									upiId: event.target.value,
								}))
							}
							placeholder="name@bank"
							value={draft.upiId}
						/>
					</label>
				</div>

				<label className="grid gap-1 text-sm">
					UPI QR Image URL (optional)
					<input
						className="rounded-md border bg-background px-3 py-2"
						disabled={input.disabled}
						onChange={(event) =>
							setDraft((previous) => ({
								...previous,
								upiQrImageUrl: event.target.value,
							}))
						}
						placeholder="https://..."
						value={draft.upiQrImageUrl}
					/>
				</label>

				<label className="grid gap-1 text-sm">
					Message note
					<textarea
						className="min-h-20 rounded-md border bg-background px-3 py-2"
						disabled={input.disabled}
						onChange={(event) =>
							setDraft((previous) => ({
								...previous,
								messageNote: event.target.value,
							}))
						}
						placeholder="Thank you for helping us build these essentials"
						value={draft.messageNote}
					/>
				</label>

				<label className="grid gap-1 text-sm">
					Pre-publish note (required)
					<textarea
						className="min-h-20 rounded-md border bg-background px-3 py-2"
						disabled={input.disabled}
						onChange={(event) =>
							setDraft((previous) => ({
								...previous,
								prePublishNote: event.target.value,
							}))
						}
						placeholder="Reviewed by family. Safe to publish."
						value={draft.prePublishNote}
					/>
				</label>

				<div className="flex flex-wrap items-center gap-3">
					<button
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={input.disabled}
						onClick={handleSaveDraft}
						type="button"
					>
						Save Draft Details
					</button>
					<span className="text-muted-foreground text-xs">
						Publish note guard: {canPublish ? "ready" : "missing required note"}
					</span>
				</div>
			</section>

			<section className="grid gap-3 rounded-lg border p-4">
				<h2 className="font-semibold text-lg">Wishlist Items</h2>
				<div className="grid gap-3 md:grid-cols-2">
					<label className="grid gap-1 text-sm">
						Item title
						<input
							className="rounded-md border bg-background px-3 py-2"
							disabled={input.disabled}
							onChange={(event) =>
								setItemEditor((previous) => ({
									...previous,
									title: event.target.value,
								}))
							}
							placeholder="Mixer Grinder"
							value={itemEditor.title}
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Target amount (INR)
						<input
							className="rounded-md border bg-background px-3 py-2"
							disabled={input.disabled}
							onChange={(event) =>
								setItemEditor((previous) => ({
									...previous,
									targetAmountInr: event.target.value,
								}))
							}
							placeholder="5000"
							value={itemEditor.targetAmountInr}
						/>
					</label>
				</div>

				<label className="grid gap-1 text-sm">
					Description
					<input
						className="rounded-md border bg-background px-3 py-2"
						disabled={input.disabled}
						onChange={(event) =>
							setItemEditor((previous) => ({
								...previous,
								description: event.target.value,
							}))
						}
						placeholder="For kitchen setup"
						value={itemEditor.description}
					/>
				</label>

				<div className="flex items-center gap-3">
					<button
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={input.disabled}
						onClick={handleSaveItem}
						type="button"
					>
						Add or Update Item
					</button>
				</div>

				<GiftsItemTable
					disabled={input.disabled}
					items={input.view.items}
					onArchive={(item) => input.onArchiveItem(item.id)}
					onEdit={(item) => {
						setItemEditor({
							itemId: item.id,
							title: item.title,
							description: item.description ?? "",
							targetAmountInr: (item.targetAmountPaise / 100).toFixed(2),
						});
					}}
				/>
			</section>
		</div>
	);
}
