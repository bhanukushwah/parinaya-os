import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

const sideOptions = ["neutral", "bride", "groom"] as const;

export const Route = createFileRoute("/dashboard/guests" as never)({
	component: DashboardGuestsRoute,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
	},
});

function DashboardGuestsRoute() {
	const [weddingId, setWeddingId] = useState("");
	const [personName, setPersonName] = useState("");
	const [personPhone, setPersonPhone] = useState("");
	const [personSide, setPersonSide] =
		useState<(typeof sideOptions)[number]>("neutral");
	const [personTags, setPersonTags] = useState("");
	const [personNotes, setPersonNotes] = useState("");
	const [unitName, setUnitName] = useState("");
	const [unitPhone, setUnitPhone] = useState("");
	const [unitSide, setUnitSide] =
		useState<(typeof sideOptions)[number]>("neutral");
	const [unitTags, setUnitTags] = useState("");
	const [selectedPersonId, setSelectedPersonId] = useState("");
	const [selectedGuestUnitId, setSelectedGuestUnitId] = useState("");
	const [relationshipLabel, setRelationshipLabel] = useState("");
	const [isPrimaryContact, setIsPrimaryContact] = useState(false);
	const [reasonNote, setReasonNote] = useState("");
	const [editAccessDenied, setEditAccessDenied] = useState(false);

	const peopleQuery = useQuery({
		...orpc.guests.listPeople.queryOptions({
			input: { weddingId },
		}),
		enabled: weddingId.trim().length > 0,
	});

	const guestUnitsQuery = useQuery({
		...orpc.guests.listGuestUnits.queryOptions({
			input: { weddingId },
		}),
		enabled: weddingId.trim().length > 0,
	});

	const activeMembershipByPersonId = useMemo(() => {
		const entries: Array<
			[string, { guestUnitId: string; guestUnitName: string }]
		> = (guestUnitsQuery.data ?? []).flatMap((guestUnit) =>
			guestUnit.members
				.filter((member) => member.isActive)
				.map(
					(member) =>
						[
							member.personId,
							{
								guestUnitId: guestUnit.id,
								guestUnitName: guestUnit.displayName,
							},
						] as [string, { guestUnitId: string; guestUnitName: string }],
				),
		);
		return new Map(entries);
	}, [guestUnitsQuery.data]);

	const normalizeTagIds = (value: string) =>
		Array.from(
			new Set(
				value
					.split(",")
					.map((entry) => entry.trim())
					.filter(Boolean),
			),
		);

	const runRefresh = () => {
		void peopleQuery.refetch();
		void guestUnitsQuery.refetch();
	};

	const handleMutationError = (error: Error) => {
		if (error.message.toLowerCase().includes("forbidden")) {
			setEditAccessDenied(true);
		}
	};

	const createPersonMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			fullName: string;
			phone: string;
			side: "neutral" | "bride" | "groom";
			notes?: string;
			reasonNote?: string;
		}) => client.guests.createPerson(input),
		onSuccess: () => {
			setEditAccessDenied(false);
			setPersonName("");
			setPersonPhone("");
			setPersonTags("");
			setPersonNotes("");
			runRefresh();
		},
		onError: handleMutationError,
	});

	const createGuestUnitMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			displayName: string;
			deliveryPhone: string;
			side: "neutral" | "bride" | "groom";
			reasonNote?: string;
		}) => client.guests.createGuestUnit(input),
		onSuccess: () => {
			setEditAccessDenied(false);
			setUnitName("");
			setUnitPhone("");
			setUnitTags("");
			runRefresh();
		},
		onError: handleMutationError,
	});

	const assignPersonMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			personId: string;
			guestUnitId: string;
			relationshipLabel?: string;
			isPrimaryContact?: boolean;
			reasonNote?: string;
		}) => client.guests.assignPersonToGuestUnit(input),
		onSuccess: () => {
			setEditAccessDenied(false);
			runRefresh();
		},
		onError: handleMutationError,
	});

	const removePersonMutation = useMutation({
		mutationFn: (input: {
			weddingId: string;
			personId: string;
			reasonNote?: string;
		}) => client.guests.removePersonFromGuestUnit(input),
		onSuccess: () => {
			setEditAccessDenied(false);
			runRefresh();
		},
		onError: handleMutationError,
	});

	const isMutating =
		createPersonMutation.isPending ||
		createGuestUnitMutation.isPending ||
		assignPersonMutation.isPending ||
		removePersonMutation.isPending;

	const disableEditControls = editAccessDenied || isMutating;
	const normalizedPersonTags = normalizeTagIds(personTags);
	const normalizedUnitTags = normalizeTagIds(unitTags);

	return (
		<div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="font-semibold text-3xl tracking-tight">
					Guest Operations
				</h1>
				<p className="text-muted-foreground text-sm">
					Manage people, guest units, and one-active-membership assignments via
					server-enforced role boundaries.
				</p>
			</header>

			<section className="rounded-lg border p-4">
				<label className="grid gap-1 text-sm" htmlFor="guest-wedding-id">
					Wedding workspace ID
					<input
						className="rounded-md border bg-background px-3 py-2"
						id="guest-wedding-id"
						onChange={(event) => setWeddingId(event.target.value)}
						placeholder="wed_..."
						value={weddingId}
					/>
				</label>
				{editAccessDenied ? (
					<p className="mt-2 text-amber-700 text-sm">
						Edit actions were rejected by server authorization. Controls stay
						disabled until a successful mutation confirms access.
					</p>
				) : null}
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Create Person</h2>
					<div className="mt-3 grid gap-2">
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setPersonName(event.target.value)}
							placeholder="Full name"
							value={personName}
						/>
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setPersonPhone(event.target.value)}
							placeholder="Phone"
							value={personPhone}
						/>
						<select
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) =>
								setPersonSide(
									event.target.value as (typeof sideOptions)[number],
								)
							}
							value={personSide}
						>
							{sideOptions.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setPersonTags(event.target.value)}
							placeholder="Tag IDs (comma-separated)"
							value={personTags}
						/>
						<textarea
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setPersonNotes(event.target.value)}
							placeholder="Notes"
							rows={3}
							value={personNotes}
						/>
					</div>
					<p className="mt-2 text-muted-foreground text-xs">
						Normalized tags:{" "}
						{normalizedPersonTags.length > 0
							? normalizedPersonTags.join(", ")
							: "none"}
					</p>
					<button
						className="mt-3 rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={
							disableEditControls ||
							!weddingId.trim() ||
							!personName.trim() ||
							!personPhone.trim()
						}
						onClick={() =>
							createPersonMutation.mutate({
								weddingId,
								fullName: personName.trim(),
								phone: personPhone.trim(),
								side: personSide,
								notes: personNotes.trim() || undefined,
								reasonNote: reasonNote.trim() || undefined,
							})
						}
						type="button"
					>
						{createPersonMutation.isPending ? "Creating..." : "Create person"}
					</button>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Create Guest Unit</h2>
					<div className="mt-3 grid gap-2">
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setUnitName(event.target.value)}
							placeholder="Unit display name"
							value={unitName}
						/>
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setUnitPhone(event.target.value)}
							placeholder="Delivery phone"
							value={unitPhone}
						/>
						<select
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) =>
								setUnitSide(event.target.value as (typeof sideOptions)[number])
							}
							value={unitSide}
						>
							{sideOptions.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
						<input
							className="rounded-md border bg-background px-3 py-2 text-sm"
							onChange={(event) => setUnitTags(event.target.value)}
							placeholder="Tag IDs (comma-separated)"
							value={unitTags}
						/>
					</div>
					<p className="mt-2 text-muted-foreground text-xs">
						Normalized tags:{" "}
						{normalizedUnitTags.length > 0
							? normalizedUnitTags.join(", ")
							: "none"}
					</p>
					<button
						className="mt-3 rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={
							disableEditControls ||
							!weddingId.trim() ||
							!unitName.trim() ||
							!unitPhone.trim()
						}
						onClick={() =>
							createGuestUnitMutation.mutate({
								weddingId,
								displayName: unitName.trim(),
								deliveryPhone: unitPhone.trim(),
								side: unitSide,
								reasonNote: reasonNote.trim() || undefined,
							})
						}
						type="button"
					>
						{createGuestUnitMutation.isPending
							? "Creating..."
							: "Create guest unit"}
					</button>
				</article>
			</section>

			<section className="rounded-lg border p-4">
				<h2 className="font-semibold text-lg">Assignment + Reassignment</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Assigning a person to a new guest unit automatically deactivates prior
					active membership on the server.
				</p>
				<div className="mt-3 grid gap-2 md:grid-cols-2">
					<select
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setSelectedPersonId(event.target.value)}
						value={selectedPersonId}
					>
						<option value="">Select person</option>
						{(peopleQuery.data ?? []).map((person) => (
							<option key={person.id} value={person.id}>
								{person.fullName} ({person.side})
							</option>
						))}
					</select>
					<select
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setSelectedGuestUnitId(event.target.value)}
						value={selectedGuestUnitId}
					>
						<option value="">Select guest unit</option>
						{(guestUnitsQuery.data ?? []).map((guestUnit) => (
							<option key={guestUnit.id} value={guestUnit.id}>
								{guestUnit.displayName} ({guestUnit.side})
							</option>
						))}
					</select>
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm"
						onChange={(event) => setRelationshipLabel(event.target.value)}
						placeholder="Relationship label (optional)"
						value={relationshipLabel}
					/>
					<label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
						<input
							checked={isPrimaryContact}
							onChange={(event) => setIsPrimaryContact(event.target.checked)}
							type="checkbox"
						/>
						Primary contact
					</label>
					<input
						className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
						onChange={(event) => setReasonNote(event.target.value)}
						placeholder="Reason note for audit trails (optional)"
						value={reasonNote}
					/>
				</div>
				<div className="mt-3 flex flex-wrap gap-2">
					<button
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={
							disableEditControls ||
							!weddingId.trim() ||
							!selectedPersonId ||
							!selectedGuestUnitId
						}
						onClick={() =>
							assignPersonMutation.mutate({
								weddingId,
								personId: selectedPersonId,
								guestUnitId: selectedGuestUnitId,
								relationshipLabel: relationshipLabel.trim() || undefined,
								isPrimaryContact,
								reasonNote: reasonNote.trim() || undefined,
							})
						}
						type="button"
					>
						{assignPersonMutation.isPending
							? "Assigning..."
							: "Assign / reassign"}
					</button>
					<button
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
						disabled={
							disableEditControls || !weddingId.trim() || !selectedPersonId
						}
						onClick={() =>
							removePersonMutation.mutate({
								weddingId,
								personId: selectedPersonId,
								reasonNote: reasonNote.trim() || undefined,
							})
						}
						type="button"
					>
						{removePersonMutation.isPending
							? "Removing..."
							: "Remove active membership"}
					</button>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">People</h2>
					{peopleQuery.isLoading ? (
						<p className="mt-2 text-sm">Loading people...</p>
					) : null}
					{peopleQuery.isError ? (
						<p className="mt-2 text-red-600 text-sm">
							{peopleQuery.error.message}
						</p>
					) : null}
					<div className="mt-3 grid gap-2">
						{(peopleQuery.data ?? []).map((person) => {
							const activeMembership = activeMembershipByPersonId.get(
								person.id,
							);
							return (
								<div className="rounded-md border p-2" key={person.id}>
									<p className="font-medium text-sm">{person.fullName}</p>
									<p className="text-muted-foreground text-xs">
										{person.identity?.normalizedPhoneE164 ??
											"No normalized phone"}{" "}
										· {person.side} · {person.isActive ? "active" : "archived"}
									</p>
									<p className="mt-1 text-xs">
										Active guest unit:{" "}
										{activeMembership?.guestUnitName ?? "unassigned"}
									</p>
								</div>
							);
						})}
					</div>
				</article>

				<article className="rounded-lg border p-4">
					<h2 className="font-semibold text-lg">Guest Units</h2>
					{guestUnitsQuery.isLoading ? (
						<p className="mt-2 text-sm">Loading guest units...</p>
					) : null}
					{guestUnitsQuery.isError ? (
						<p className="mt-2 text-red-600 text-sm">
							{guestUnitsQuery.error.message}
						</p>
					) : null}
					<div className="mt-3 grid gap-2">
						{(guestUnitsQuery.data ?? []).map((guestUnit) => (
							<div className="rounded-md border p-2" key={guestUnit.id}>
								<p className="font-medium text-sm">{guestUnit.displayName}</p>
								<p className="text-muted-foreground text-xs">
									{guestUnit.deliveryIdentity?.normalizedPhoneE164 ??
										"No delivery identity"}{" "}
									· {guestUnit.side} ·{" "}
									{guestUnit.isActive ? "active" : "archived"}
								</p>
								<p className="mt-1 text-xs">
									Members:{" "}
									{guestUnit.members
										.map((member) => member.person.fullName)
										.join(", ") || "none"}
								</p>
							</div>
						))}
					</div>
				</article>
			</section>
		</div>
	);
}
