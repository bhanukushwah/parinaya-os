import { db } from "@parinaya-os/db";
import { guestIdentities } from "@parinaya-os/db/schema/guests";
import { and, eq } from "drizzle-orm";

import {
	type NormalizePhoneInput,
	normalizePhoneToE164,
} from "./phone-normalization";

type GuestIdentityMutationClient = Pick<
	typeof db,
	"query" | "insert" | "update"
>;

export type GuestIdentityUpsertOutcome = "created" | "updated" | "reactivated";

export type GuestIdentityUpsertSuccess = {
	ok: true;
	normalizedPhoneE164: string;
	outcome: GuestIdentityUpsertOutcome;
	identity: {
		id: string;
		weddingId: string;
		normalizedPhoneE164: string;
		displayLabel: string | null;
		isActive: boolean;
		isInviteable: boolean;
		deactivatedAt: Date | null;
		updatedAt: Date;
	};
};

export type GuestIdentityUpsertFailure = {
	ok: false;
	errorCode: "missing_phone" | "malformed_phone" | "invalid_phone";
	message: string;
	rawPhone: string | null;
};

export type UpsertGuestIdentityInput = {
	weddingId: string;
	phone: string | null | undefined;
	displayLabel?: string | null;
	actorMembershipId?: string | null;
	defaultCountry?: NormalizePhoneInput["defaultCountry"];
	client?: GuestIdentityMutationClient;
};

export type UpsertGuestIdentityResult =
	| GuestIdentityUpsertSuccess
	| GuestIdentityUpsertFailure;

export async function upsertGuestIdentity(
	input: UpsertGuestIdentityInput,
): Promise<UpsertGuestIdentityResult> {
	const normalized = normalizePhoneToE164({
		phone: input.phone,
		defaultCountry: input.defaultCountry,
	});

	if (!normalized.ok) {
		return normalized;
	}

	const client = input.client ?? db;
	const displayLabel = input.displayLabel?.trim() || null;
	const existingIdentity = await client.query.guestIdentities.findFirst({
		where: and(
			eq(guestIdentities.weddingId, input.weddingId),
			eq(guestIdentities.normalizedPhoneE164, normalized.normalizedPhoneE164),
		),
	});

	if (!existingIdentity) {
		const [createdIdentity] = await client
			.insert(guestIdentities)
			.values({
				id: crypto.randomUUID(),
				weddingId: input.weddingId,
				normalizedPhoneE164: normalized.normalizedPhoneE164,
				displayLabel,
				isActive: true,
				isInviteable: true,
				deactivatedAt: null,
				createdByMembershipId: input.actorMembershipId ?? null,
				updatedByMembershipId: input.actorMembershipId ?? null,
			})
			.returning();

		if (!createdIdentity) {
			throw new Error("Failed to create guest identity.");
		}

		return {
			ok: true,
			normalizedPhoneE164: normalized.normalizedPhoneE164,
			outcome: "created",
			identity: createdIdentity,
		};
	}

	const outcome: GuestIdentityUpsertOutcome =
		existingIdentity.isActive && !existingIdentity.deactivatedAt
			? "updated"
			: "reactivated";

	const [updatedIdentity] = await client
		.update(guestIdentities)
		.set({
			displayLabel: displayLabel ?? existingIdentity.displayLabel,
			isActive: true,
			isInviteable: true,
			deactivatedAt: null,
			updatedByMembershipId: input.actorMembershipId ?? null,
		})
		.where(eq(guestIdentities.id, existingIdentity.id))
		.returning();

	if (!updatedIdentity) {
		throw new Error("Failed to update guest identity.");
	}

	return {
		ok: true,
		normalizedPhoneE164: normalized.normalizedPhoneE164,
		outcome,
		identity: updatedIdentity,
	};
}
