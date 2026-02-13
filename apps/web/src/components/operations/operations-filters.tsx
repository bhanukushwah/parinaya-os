type OperationsFilterValue = {
	eventId: string;
	side: "all" | "bride" | "groom" | "neutral";
	rsvpStatus: "all" | "responded" | "accepted" | "declined" | "pending";
};

type OperationsEventOption = {
	id: string;
	title: string;
	eventDate: Date | null;
};

type OperationsFiltersProps = {
	value: OperationsFilterValue;
	events: OperationsEventOption[];
	onChange: (next: Partial<OperationsFilterValue>) => void;
	onReset: () => void;
	disabled?: boolean;
};

function formatEventLabel(event: OperationsEventOption) {
	if (!event.eventDate) {
		return event.title;
	}

	return `${event.title} (${new Date(event.eventDate).toLocaleDateString()})`;
}

export function OperationsFilters(props: OperationsFiltersProps) {
	return (
		<section className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
			<label className="grid gap-1 text-sm" htmlFor="operations-event-filter">
				Event
				<select
					className="rounded-md border bg-background px-3 py-2"
					disabled={props.disabled}
					id="operations-event-filter"
					onChange={(event) =>
						props.onChange({
							eventId: event.target.value,
						})
					}
					value={props.value.eventId}
				>
					<option value="all">all events</option>
					{props.events.map((event) => (
						<option key={event.id} value={event.id}>
							{formatEventLabel(event)}
						</option>
					))}
				</select>
			</label>

			<label className="grid gap-1 text-sm" htmlFor="operations-side-filter">
				Side
				<select
					className="rounded-md border bg-background px-3 py-2"
					disabled={props.disabled}
					id="operations-side-filter"
					onChange={(event) =>
						props.onChange({
							side: event.target.value as OperationsFilterValue["side"],
						})
					}
					value={props.value.side}
				>
					<option value="all">all sides</option>
					<option value="bride">bride</option>
					<option value="groom">groom</option>
					<option value="neutral">neutral</option>
				</select>
			</label>

			<label className="grid gap-1 text-sm" htmlFor="operations-rsvp-filter">
				RSVP status
				<select
					className="rounded-md border bg-background px-3 py-2"
					disabled={props.disabled}
					id="operations-rsvp-filter"
					onChange={(event) =>
						props.onChange({
							rsvpStatus: event.target
								.value as OperationsFilterValue["rsvpStatus"],
						})
					}
					value={props.value.rsvpStatus}
				>
					<option value="all">all statuses</option>
					<option value="responded">responded</option>
					<option value="accepted">accepted</option>
					<option value="declined">declined</option>
					<option value="pending">pending</option>
				</select>
			</label>

			<div className="flex items-end">
				<button
					className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
					disabled={props.disabled}
					onClick={props.onReset}
					type="button"
				>
					Reset filters
				</button>
			</div>
		</section>
	);
}
