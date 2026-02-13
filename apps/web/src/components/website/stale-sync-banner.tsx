type StaleSyncBannerProps = {
	isStale: boolean;
	lastUpdatedAt: Date | string | null;
	staleReason: string | null;
};

function toDisplayDate(value: Date | string | null) {
	if (!value) {
		return "Unavailable";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Unavailable";
	}

	return date.toLocaleString();
}

export function StaleSyncBanner(props: StaleSyncBannerProps) {
	if (!props.isStale) {
		return null;
	}

	return (
		<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
			<p className="font-medium text-sm">Website data may be delayed</p>
			<p className="mt-1 text-xs">
				Last updated: {toDisplayDate(props.lastUpdatedAt)}
			</p>
			{props.staleReason ? (
				<p className="mt-1 text-xs">Reason: {props.staleReason}</p>
			) : null}
		</div>
	);
}
