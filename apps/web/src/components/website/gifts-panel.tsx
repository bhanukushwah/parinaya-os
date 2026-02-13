import { useState } from "react";

import { GiftsUnavailableBanner } from "./gifts-unavailable-banner";

type GiftItem = {
	id: string;
	title: string;
	description: string | null;
	targetAmountPaise: number;
	amountRaisedPaise: number;
	progressPercent: number;
	isCompleted: boolean;
};

function formatInr(valuePaise: number) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 2,
	}).format(valuePaise / 100);
}

export function GiftsPanel(input: {
	modeStatus: "draft" | "published" | "hidden" | "disabled";
	availabilityMessage: string | null;
	upiPayeeName: string | null;
	upiId: string | null;
	upiQrImageUrl: string | null;
	messageNote: string | null;
	items: GiftItem[];
	onContribute: (payload: {
		itemId: string;
		amountPaise: number;
		contributorName: string | null;
		note: string | null;
	}) => void;
	isSubmitting?: boolean;
}) {
	const [amountByItem, setAmountByItem] = useState<Record<string, string>>({});
	const [name, setName] = useState("");
	const [note, setNote] = useState("");

	const isAvailable = input.modeStatus === "published";

	return (
		<section className="grid gap-4 rounded-xl border p-5">
			<h2 className="font-semibold text-lg">Gifts</h2>

			<GiftsUnavailableBanner
				message={input.availabilityMessage}
				modeStatus={input.modeStatus}
			/>

			{input.messageNote ? (
				<p className="text-muted-foreground text-sm">{input.messageNote}</p>
			) : null}

			{input.upiId ? (
				<div className="rounded-lg border bg-muted/20 p-4 text-sm">
					<p>
						<strong>UPI ID:</strong> {input.upiId}
					</p>
					{input.upiPayeeName ? (
						<p>
							<strong>Payee:</strong> {input.upiPayeeName}
						</p>
					) : null}
					{input.upiQrImageUrl ? (
						<a
							className="inline-flex pt-1 text-rose-700 text-xs underline"
							href={input.upiQrImageUrl}
							rel="noreferrer"
							target="_blank"
						>
							Open QR image
						</a>
					) : null}
				</div>
			) : null}

			<div className="grid gap-4">
				{input.items.map((item) => (
					<article className="rounded-lg border p-4" key={item.id}>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 className="font-medium text-sm">{item.title}</h3>
								{item.description ? (
									<p className="mt-1 text-muted-foreground text-xs">
										{item.description}
									</p>
								) : null}
							</div>
							{item.isCompleted ? (
								<span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800 text-xs">
									Completed
								</span>
							) : null}
						</div>

						<div className="mt-3 grid gap-1 text-xs">
							<p>Target: {formatInr(item.targetAmountPaise)}</p>
							<p>Raised: {formatInr(item.amountRaisedPaise)}</p>
							<p>Progress: {item.progressPercent}%</p>
							<div className="h-2 rounded-full bg-muted">
								<div
									className="h-2 rounded-full bg-emerald-600"
									style={{
										width: `${Math.max(0, Math.min(100, item.progressPercent))}%`,
									}}
								/>
							</div>
						</div>

						<div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px_auto]">
							<input
								className="rounded-md border px-3 py-2 text-sm"
								onChange={(event) =>
									setAmountByItem((previous) => ({
										...previous,
										[item.id]: event.target.value,
									}))
								}
								placeholder="Amount (INR)"
								value={amountByItem[item.id] ?? ""}
							/>
							<button
								className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
								disabled={!isAvailable || input.isSubmitting}
								onClick={() => {
									const amount = Number.parseFloat(amountByItem[item.id] ?? "");
									if (!Number.isFinite(amount) || amount <= 0) {
										return;
									}

									input.onContribute({
										itemId: item.id,
										amountPaise: Math.round(amount * 100),
										contributorName: name.trim() || null,
										note: note.trim() || null,
									});
								}}
								type="button"
							>
								Contribute
							</button>
						</div>
					</article>
				))}
			</div>

			<div className="grid gap-2 rounded-lg border border-dashed p-3">
				<p className="font-medium text-xs">Optional contribution details</p>
				<input
					className="rounded-md border px-3 py-2 text-sm"
					onChange={(event) => setName(event.target.value)}
					placeholder="Your name"
					value={name}
				/>
				<input
					className="rounded-md border px-3 py-2 text-sm"
					onChange={(event) => setNote(event.target.value)}
					placeholder="Note"
					value={note}
				/>
			</div>
		</section>
	);
}
