import { db } from "@parinaya-os/db";
import { type guestSideEnum, guestUnits } from "@parinaya-os/db/schema/guests";
import { asc } from "drizzle-orm";

type GuestSide = (typeof guestSideEnum.enumValues)[number];

export type BuildAudienceInput = {
	weddingId: string;
	side?: GuestSide | null;
	tagIds?: string[];
	search?: string | null;
	includeGuestUnitIds?: string[];
	excludeGuestUnitIds?: string[];
};

export type BuildAudienceResult = {
	guestUnitIds: string[];
	trace: {
		totalActiveUnits: number;
		counts: {
			afterSide: number;
			afterTags: number;
			afterSearch: number;
			final: number;
		};
		activeFilters: {
			side: boolean;
			tags: boolean;
			search: boolean;
		};
		normalized: {
			side: GuestSide | null;
			tagIds: string[];
			search: string | null;
			includeGuestUnitIds: string[];
			excludeGuestUnitIds: string[];
		};
		overrides: {
			included: number;
			excluded: number;
		};
	};
};

type AudienceCandidate = {
	id: string;
	side: GuestSide;
	displayName: string;
	deliveryPhone: string | null;
	memberNames: string[];
	memberPhones: string[];
	tagIds: Set<string>;
};

function normalizeSide(side: string | null | undefined): GuestSide | null {
	const normalized = side?.trim().toLowerCase();
	if (
		normalized === "bride" ||
		normalized === "groom" ||
		normalized === "neutral"
	) {
		return normalized;
	}
	return null;
}

function normalizeIdList(values: string[] | undefined): string[] {
	return Array.from(
		new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []),
	);
}

function normalizeSearch(search: string | null | undefined): string | null {
	const normalized = search?.trim().toLowerCase() ?? "";
	return normalized.length > 0 ? normalized : null;
}

function buildSearchBlob(candidate: AudienceCandidate): string {
	const pieces = [
		candidate.displayName,
		candidate.side,
		candidate.deliveryPhone ?? "",
		...candidate.memberNames,
		...candidate.memberPhones,
	];

	return pieces.join(" ").toLowerCase();
}

function passesTagAndFilter(
	candidate: AudienceCandidate,
	requiredTagIds: string[],
) {
	if (requiredTagIds.length === 0) {
		return true;
	}

	for (const tagId of requiredTagIds) {
		if (!candidate.tagIds.has(tagId)) {
			return false;
		}
	}

	return true;
}

export async function buildAudience(
	input: BuildAudienceInput,
): Promise<BuildAudienceResult> {
	const normalizedSide = normalizeSide(input.side);
	const normalizedTagIds = normalizeIdList(input.tagIds);
	const normalizedSearch = normalizeSearch(input.search);
	const normalizedIncludeIds = normalizeIdList(input.includeGuestUnitIds);
	const normalizedExcludeIds = normalizeIdList(input.excludeGuestUnitIds);

	const activeUnits = await db.query.guestUnits.findMany({
		columns: {
			id: true,
			side: true,
			displayName: true,
		},
		where: (unit, { and, eq }) =>
			and(eq(unit.weddingId, input.weddingId), eq(unit.isActive, true)),
		orderBy: [asc(guestUnits.displayName), asc(guestUnits.id)],
		with: {
			deliveryIdentity: {
				columns: {
					normalizedPhoneE164: true,
				},
			},
			tags: {
				columns: {
					tagId: true,
				},
			},
			members: {
				where: (member, { eq }) => eq(member.isActive, true),
				with: {
					person: {
						columns: {
							fullName: true,
							isActive: true,
						},
						with: {
							identity: {
								columns: {
									normalizedPhoneE164: true,
								},
							},
							tags: {
								columns: {
									tagId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const candidates: AudienceCandidate[] = activeUnits.map((unit) => {
		const memberTagIds = unit.members
			.filter((member) => member.isActive)
			.flatMap((member) => member.person.tags.map((tag) => tag.tagId));

		const tagIds = new Set<string>([
			...unit.tags.map((tag) => tag.tagId),
			...memberTagIds,
		]);

		const memberNames = unit.members
			.filter((member) => member.person.isActive)
			.map((member) => member.person.fullName);

		const memberPhones = unit.members
			.map((member) => member.person.identity?.normalizedPhoneE164 ?? null)
			.filter((phone): phone is string => Boolean(phone));

		return {
			id: unit.id,
			side: unit.side,
			displayName: unit.displayName,
			deliveryPhone: unit.deliveryIdentity?.normalizedPhoneE164 ?? null,
			memberNames,
			memberPhones,
			tagIds,
		};
	});

	const afterSide = normalizedSide
		? candidates.filter((candidate) => candidate.side === normalizedSide)
		: candidates;

	const afterTags = afterSide.filter((candidate) =>
		passesTagAndFilter(candidate, normalizedTagIds),
	);

	const afterSearch = normalizedSearch
		? afterTags.filter((candidate) =>
				buildSearchBlob(candidate).includes(normalizedSearch),
			)
		: afterTags;

	const baseIdSet = new Set(candidates.map((candidate) => candidate.id));
	const selectedIds = new Set(afterSearch.map((candidate) => candidate.id));

	let included = 0;
	for (const includeId of normalizedIncludeIds) {
		if (baseIdSet.has(includeId) && !selectedIds.has(includeId)) {
			selectedIds.add(includeId);
			included += 1;
		}
	}

	let excluded = 0;
	for (const excludeId of normalizedExcludeIds) {
		if (selectedIds.has(excludeId)) {
			selectedIds.delete(excludeId);
			excluded += 1;
		}
	}

	const finalGuestUnitIds = candidates
		.map((candidate) => candidate.id)
		.filter((candidateId) => selectedIds.has(candidateId));

	return {
		guestUnitIds: finalGuestUnitIds,
		trace: {
			totalActiveUnits: candidates.length,
			counts: {
				afterSide: afterSide.length,
				afterTags: afterTags.length,
				afterSearch: afterSearch.length,
				final: finalGuestUnitIds.length,
			},
			activeFilters: {
				side: Boolean(normalizedSide),
				tags: normalizedTagIds.length > 0,
				search: Boolean(normalizedSearch),
			},
			normalized: {
				side: normalizedSide,
				tagIds: normalizedTagIds,
				search: normalizedSearch,
				includeGuestUnitIds: normalizedIncludeIds,
				excludeGuestUnitIds: normalizedExcludeIds,
			},
			overrides: {
				included,
				excluded,
			},
		},
	};
}
