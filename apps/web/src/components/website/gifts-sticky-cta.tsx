export function GiftsStickyCta(input: {
	isVisible: boolean;
	isAvailable: boolean;
	onOpen: () => void;
}) {
	if (!input.isVisible) {
		return null;
	}

	return (
		<div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-xl justify-center px-4 md:bottom-6">
			<button
				className="w-full rounded-full border border-rose-300 bg-white/95 px-5 py-3 font-medium text-rose-800 text-sm shadow-sm backdrop-blur disabled:cursor-not-allowed disabled:opacity-70"
				disabled={!input.isAvailable}
				onClick={input.onOpen}
				type="button"
			>
				{input.isAvailable
					? "View Gifts & Contribute"
					: "Gifts currently unavailable"}
			</button>
		</div>
	);
}
