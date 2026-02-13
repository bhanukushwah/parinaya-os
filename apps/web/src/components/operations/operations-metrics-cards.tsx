import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type OperationsMetrics = {
	invited: number;
	responded: number;
	accepted: number;
	declined: number;
	pending: number;
};

type OperationsMetricsCardsProps = {
	metrics: OperationsMetrics;
	dataAsOf: Date | null;
};

function formatDataAsOf(value: Date | null) {
	if (!value) {
		return "Data as of unavailable";
	}

	return `Data as of ${new Date(value).toLocaleString()}`;
}

export function OperationsMetricsCards(props: OperationsMetricsCardsProps) {
	const cards: Array<{ key: keyof OperationsMetrics; label: string }> = [
		{ key: "invited", label: "Invited" },
		{ key: "responded", label: "Responded" },
		{ key: "accepted", label: "Accepted" },
		{ key: "declined", label: "Declined" },
		{ key: "pending", label: "Pending" },
	];

	return (
		<section className="grid gap-3 md:grid-cols-5">
			{cards.map((card) => (
				<Card key={card.key} size="sm">
					<CardHeader>
						<CardTitle>{card.label}</CardTitle>
						<CardDescription>person-level scope</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="font-semibold text-2xl">{props.metrics[card.key]}</p>
					</CardContent>
				</Card>
			))}
			<p className="text-muted-foreground text-xs md:col-span-5">
				{formatDataAsOf(props.dataAsOf)}
			</p>
		</section>
	);
}
