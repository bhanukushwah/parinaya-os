export function GiftsNavTab(input: {
	active: boolean;
	enabled: boolean;
	onClick: () => void;
}) {
	if (!input.enabled) {
		return null;
	}

	return (
		<button
			className={`rounded-full border px-3 py-1 text-sm transition ${
				input.active
					? "border-rose-300 bg-rose-50 text-rose-800"
					: "border-muted-foreground/30 text-muted-foreground"
			}`}
			onClick={input.onClick}
			type="button"
		>
			Gifts
		</button>
	);
}
