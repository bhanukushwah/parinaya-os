type RsvpStickyCtaProps = {
	label: "Complete RSVP" | "Update RSVP";
	intent: "start" | "update";
	href: string | null;
	isFlowAvailable: boolean;
	onFlowUnavailable?: (intent: "start" | "update") => void;
};

export function RsvpStickyCta(props: RsvpStickyCtaProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
			<div className="mx-auto flex w-full max-w-4xl items-center gap-2">
				<a
					className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-4 py-3 font-medium text-sm text-white transition hover:bg-emerald-700"
					href={props.isFlowAvailable && props.href ? props.href : undefined}
					onClick={(event) => {
						if (props.isFlowAvailable && props.href) {
							return;
						}

						event.preventDefault();
						props.onFlowUnavailable?.(props.intent);
					}}
					rel="noreferrer"
					target="_blank"
				>
					{props.label}
				</a>
				<span className="hidden rounded-md border px-3 py-2 text-muted-foreground text-xs md:inline-flex">
					{props.intent === "update"
						? "You can revise responses anytime"
						: "Takes 3 WhatsApp replies max"}
				</span>
			</div>
		</div>
	);
}
