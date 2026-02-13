type GiftsStatus = "draft" | "published" | "hidden" | "disabled";

function statusLabel(status: GiftsStatus) {
	if (status === "draft") {
		return "Draft";
	}
	if (status === "published") {
		return "Published";
	}
	if (status === "hidden") {
		return "Hidden";
	}
	return "Disabled";
}

export function GiftsSafetyControls(input: {
	status: GiftsStatus;
	prePublishNote: string | null;
	disabled?: boolean;
	errorMessage?: string | null;
	onTransition: (action: "publish" | "hide" | "disable") => void;
}) {
	const hasPrePublishNote = (input.prePublishNote ?? "").trim().length > 0;
	const canPublish =
		(input.status === "draft" || input.status === "hidden") &&
		hasPrePublishNote;
	const canHide = input.status === "published";
	const canDisable = input.status === "published" || input.status === "hidden";

	return (
		<section className="grid gap-3 rounded-lg border p-4">
			<div>
				<h2 className="font-semibold text-lg">Safety Controls</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Current status: <strong>{statusLabel(input.status)}</strong>
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					className="rounded-md border border-emerald-400 px-3 py-2 text-emerald-700 text-sm disabled:opacity-60"
					disabled={input.disabled || !canPublish}
					onClick={() => input.onTransition("publish")}
					type="button"
				>
					Publish
				</button>
				<button
					className="rounded-md border border-amber-400 px-3 py-2 text-amber-700 text-sm disabled:opacity-60"
					disabled={input.disabled || !canHide}
					onClick={() => input.onTransition("hide")}
					type="button"
				>
					Hide
				</button>
				<button
					className="rounded-md border border-red-400 px-3 py-2 text-red-700 text-sm disabled:opacity-60"
					disabled={input.disabled || !canDisable}
					onClick={() => input.onTransition("disable")}
					type="button"
				>
					Disable
				</button>
			</div>

			<ul className="list-disc pl-5 text-muted-foreground text-xs">
				<li>Publish requires pre-publish note.</li>
				<li>Hide temporarily removes gifts from guest website view.</li>
				<li>
					Disable blocks contributions and returns mode to draft recovery path.
				</li>
			</ul>

			{!hasPrePublishNote ? (
				<p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
					Add pre-publish note before publishing.
				</p>
			) : null}

			{input.errorMessage ? (
				<p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-sm">
					{input.errorMessage}
				</p>
			) : null}
		</section>
	);
}
