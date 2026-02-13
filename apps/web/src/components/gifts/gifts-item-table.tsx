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

function formatInrFromPaise(value: number) {
	const amount = value / 100;
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 2,
	}).format(amount);
}

export function GiftsItemTable(input: {
	items: GiftsItem[];
	onEdit: (item: GiftsItem) => void;
	onArchive: (item: GiftsItem) => void;
	disabled?: boolean;
}) {
	if (input.items.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
				No wishlist items added yet.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border">
			<table className="w-full min-w-[720px] text-sm">
				<thead className="bg-muted/40 text-left">
					<tr>
						<th className="px-3 py-2 font-medium">Item</th>
						<th className="px-3 py-2 font-medium">Target</th>
						<th className="px-3 py-2 font-medium">Raised</th>
						<th className="px-3 py-2 font-medium">Progress</th>
						<th className="px-3 py-2 font-medium">Status</th>
						<th className="px-3 py-2 font-medium">Actions</th>
					</tr>
				</thead>
				<tbody>
					{input.items.map((item) => (
						<tr className="border-t align-top" key={item.id}>
							<td className="px-3 py-3">
								<p className="font-medium">{item.title}</p>
								{item.description ? (
									<p className="mt-1 text-muted-foreground text-xs">
										{item.description}
									</p>
								) : null}
							</td>
							<td className="px-3 py-3">
								{formatInrFromPaise(item.targetAmountPaise)}
							</td>
							<td className="px-3 py-3">
								<p>{formatInrFromPaise(item.amountRaisedPaise)}</p>
								<p className="text-muted-foreground text-xs">
									Remaining {formatInrFromPaise(item.remainingAmountPaise)}
								</p>
							</td>
							<td className="px-3 py-3">
								<div className="h-2 w-full rounded-full bg-muted">
									<div
										className="h-2 rounded-full bg-emerald-600"
										style={{
											width: `${Math.max(0, Math.min(100, item.progressPercent))}%`,
										}}
									/>
								</div>
								<p className="mt-1 text-muted-foreground text-xs">
									{item.progressPercent}% complete
								</p>
							</td>
							<td className="px-3 py-3">
								{item.isCompleted ? (
									<span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800 text-xs">
										Completed
									</span>
								) : (
									<span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800 text-xs">
										In progress
									</span>
								)}
							</td>
							<td className="space-x-2 px-3 py-3">
								<button
									className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
									disabled={input.disabled}
									onClick={() => input.onEdit(item)}
									type="button"
								>
									Edit
								</button>
								<button
									className="rounded-md border border-red-300 px-2 py-1 text-red-700 text-xs disabled:opacity-50"
									disabled={input.disabled}
									onClick={() => input.onArchive(item)}
									type="button"
								>
									Archive
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
