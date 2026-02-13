export function GiftsUnavailableBanner(input: {
	message: string | null;
	modeStatus: "draft" | "published" | "hidden" | "disabled";
}) {
	if (input.modeStatus === "published") {
		return null;
	}

	return (
		<div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
			<h3 className="font-medium text-amber-900 text-sm">Gifts unavailable</h3>
			<p className="mt-1 text-amber-800 text-sm">
				{input.message ?? "Gifts are not visible right now."}
			</p>
		</div>
	);
}
