import { db } from "@parinaya-os/db";
import { guestUnits } from "@parinaya-os/db/schema/guests";
import { and, eq, inArray } from "drizzle-orm";

export type ResolveRecipientsInput = {
	weddingId: string;
	guestUnitIds: string[];
};

export type ResolvedRecipientSource = {
	guestUnitId: string;
	type: "guest-unit" | "person";
	personId: string | null;
};

export type ResolvedRecipientTarget = {
	phoneE164: string;
	sources: ResolvedRecipientSource[];
};

export type ResolveRecipientsResult = {
	recipientCount: number;
	totalCandidateGuestUnits: number;
	resolvedGuestUnits: number;
	skippedGuestUnitIds: string[];
	recipients: ResolvedRecipientTarget[];
};

function normalizeGuestUnitIds(guestUnitIds: string[]): string[] {
	return Array.from(
		new Set(
			guestUnitIds.map((guestUnitId) => guestUnitId.trim()).filter(Boolean),
		),
	);
}

function upsertRecipientTarget(input: {
	targetMap: Map<string, ResolvedRecipientTarget>;
	phoneE164: string;
	source: ResolvedRecipientSource;
}) {
	const existing = input.targetMap.get(input.phoneE164);
	if (!existing) {
		input.targetMap.set(input.phoneE164, {
			phoneE164: input.phoneE164,
			sources: [input.source],
		});
		return;
	}

	existing.sources.push(input.source);
}

function resolveGuestUnitDeliveryPhone(unit: {
	isInviteable: boolean;
	deliveryIdentity: {
		normalizedPhoneE164: string;
		isActive: boolean;
		isInviteable: boolean;
	} | null;
}): string | null {
	if (!unit.isInviteable) {
		return null;
	}

	if (!unit.deliveryIdentity?.normalizedPhoneE164) {
		return null;
	}

	if (!unit.deliveryIdentity.isActive || !unit.deliveryIdentity.isInviteable) {
		return null;
	}

	return unit.deliveryIdentity.normalizedPhoneE164;
}

export async function resolveRecipients(
	input: ResolveRecipientsInput,
): Promise<ResolveRecipientsResult> {
	const normalizedGuestUnitIds = normalizeGuestUnitIds(input.guestUnitIds);

	if (normalizedGuestUnitIds.length === 0) {
		return {
			recipientCount: 0,
			totalCandidateGuestUnits: 0,
			resolvedGuestUnits: 0,
			skippedGuestUnitIds: [],
			recipients: [],
		};
	}

	const units = await db.query.guestUnits.findMany({
		columns: {
			id: true,
			isInviteable: true,
			isActive: true,
		},
		where: and(
			eq(guestUnits.weddingId, input.weddingId),
			eq(guestUnits.isActive, true),
			inArray(guestUnits.id, normalizedGuestUnitIds),
		),
		with: {
			deliveryIdentity: {
				columns: {
					normalizedPhoneE164: true,
					isActive: true,
					isInviteable: true,
				},
			},
			members: {
				where: (member, { eq }) => eq(member.isActive, true),
				with: {
					person: {
						columns: {
							id: true,
							isActive: true,
							isInviteable: true,
						},
						with: {
							identity: {
								columns: {
									normalizedPhoneE164: true,
									isActive: true,
									isInviteable: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const unitById = new Map(units.map((unit) => [unit.id, unit]));
	const targetMap = new Map<string, ResolvedRecipientTarget>();
	const skippedGuestUnitIds: string[] = [];

	for (const guestUnitId of normalizedGuestUnitIds) {
		const unit = unitById.get(guestUnitId);
		if (!unit || !unit.isActive) {
			skippedGuestUnitIds.push(guestUnitId);
			continue;
		}

		const guestUnitPhone = resolveGuestUnitDeliveryPhone(unit);
		if (guestUnitPhone) {
			upsertRecipientTarget({
				targetMap,
				phoneE164: guestUnitPhone,
				source: {
					guestUnitId,
					type: "guest-unit",
					personId: null,
				},
			});
			continue;
		}

		for (const member of unit.members) {
			const person = member.person;
			if (!person.isActive || !person.isInviteable) {
				continue;
			}

			const personIdentity = person.identity;
			if (
				!personIdentity?.normalizedPhoneE164 ||
				!personIdentity.isActive ||
				!personIdentity.isInviteable
			) {
				continue;
			}

			upsertRecipientTarget({
				targetMap,
				phoneE164: personIdentity.normalizedPhoneE164,
				source: {
					guestUnitId,
					type: "person",
					personId: person.id,
				},
			});
		}
	}

	const recipients = Array.from(targetMap.values());

	return {
		recipientCount: recipients.length,
		totalCandidateGuestUnits: normalizedGuestUnitIds.length,
		resolvedGuestUnits: units.length,
		skippedGuestUnitIds,
		recipients,
	};
}
