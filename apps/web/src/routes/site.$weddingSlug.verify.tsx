import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { client } from "@/utils/orpc";

export const Route = createFileRoute("/site/$weddingSlug/verify")({
	component: WebsiteVerifyRoute,
});

function WebsiteVerifyRoute() {
	const navigate = useNavigate();
	const { weddingSlug } = Route.useParams();

	const [phone, setPhone] = useState("");
	const [challengeId, setChallengeId] = useState<string | null>(null);
	const [code, setCode] = useState("");

	const startOtpMutation = useMutation({
		mutationFn: async () => {
			return client.website.startOtp({
				weddingId: weddingSlug,
				phone,
				defaultCountry: "IN",
			});
		},
		onSuccess: (data) => {
			if (data.ok) {
				setChallengeId(data.challengeId);
			}
		},
	});

	const verifyOtpMutation = useMutation({
		mutationFn: async () => {
			if (!challengeId) {
				throw new Error("Start OTP verification first.");
			}

			return client.website.verifyOtp({
				weddingId: weddingSlug,
				challengeId,
				code,
			});
		},
		onSuccess: (data) => {
			if (!data.ok) {
				return;
			}

			void navigate({
				to: "/site/$weddingSlug",
				params: {
					weddingSlug,
				},
				search: {
					session: data.sessionToken,
				},
			});
		},
	});

	return (
		<div className="container mx-auto grid max-w-md gap-4 px-4 py-8">
			<header className="space-y-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					Verify invite access
				</h1>
				<p className="text-muted-foreground text-sm">
					OTP verification unlocks schedule and protected wedding details.
				</p>
			</header>

			<section className="grid gap-2 rounded-lg border p-4">
				<label className="font-medium text-sm" htmlFor="phone-input">
					Phone number
				</label>
				<input
					className="rounded-md border px-3 py-2 text-sm"
					id="phone-input"
					onChange={(event) => setPhone(event.target.value)}
					placeholder="+91..."
					value={phone}
				/>
				<button
					className="mt-2 rounded-md border px-3 py-2 text-sm"
					disabled={startOtpMutation.isPending || phone.trim().length < 4}
					onClick={() => startOtpMutation.mutate()}
					type="button"
				>
					{startOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
				</button>
				{startOtpMutation.isError ? (
					<p className="text-destructive text-xs">
						{startOtpMutation.error.message}
					</p>
				) : null}
			</section>

			<section className="grid gap-2 rounded-lg border p-4">
				<label className="font-medium text-sm" htmlFor="otp-input">
					OTP code
				</label>
				<input
					className="rounded-md border px-3 py-2 text-sm"
					id="otp-input"
					onChange={(event) => setCode(event.target.value)}
					placeholder="123456"
					value={code}
				/>
				<button
					className="mt-2 rounded-md border px-3 py-2 text-sm"
					disabled={verifyOtpMutation.isPending || !challengeId}
					onClick={() => verifyOtpMutation.mutate()}
					type="button"
				>
					{verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
				</button>
				{verifyOtpMutation.isError ? (
					<p className="text-destructive text-xs">
						{verifyOtpMutation.error.message}
					</p>
				) : null}
			</section>
		</div>
	);
}
