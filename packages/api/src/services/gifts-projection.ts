import type {
	giftContributions,
	giftItems,
	giftsModeStatusEnum,
	giftsModes,
} from "@parinaya-os/db/schema/gifts";

type GiftsModeRow = typeof giftsModes.$inferSelect;
type GiftItemRow = typeof giftItems.$inferSelect;
type GiftContributionRow = typeof giftContributions.$inferSelect;

export type ProjectableGiftItem = GiftItemRow & {
	contributions?: GiftContributionRow[];
};

export type GiftsModeStatus = (typeof giftsModeStatusEnum.enumValues)[number];

export type GiftsAvailability = {
	isAvailable: boolean;
	status: GiftsModeStatus;
	message: string | null;
};

export type GuestGiftContribution = {
	id: string;
	amountPaise: number;
	createdAt: Date;
};

export type AdminGiftContribution = GuestGiftContribution & {
	contributorName: string | null;
	contributorPhoneE164: string | null;
	note: string | null;
	source: "website" | "manual";
};

export type GuestGiftItemView = {
	id: string;
	title: string;
	description: string | null;
	targetAmountPaise: number;
	amountRaisedPaise: number;
	remainingAmountPaise: number;
	progressPercent: number;
	isCompleted: boolean;
	contributions: GuestGiftContribution[];
};

export type AdminGiftItemView = Omit<GuestGiftItemView, "contributions"> & {
	contributions: AdminGiftContribution[];
};

export type GiftsGuestView = {
	modeId: string;
	weddingId: string;
	status: GiftsModeStatus;
	availability: GiftsAvailability;
	upiPayeeName: string | null;
	upiId: string | null;
	upiQrImageUrl: string | null;
	messageNote: string | null;
	items: GuestGiftItemView[];
	updatedAt: Date;
};

export type GiftsAdminView = Omit<GiftsGuestView, "items"> & {
	prePublishNote: string | null;
	draftRevision: number;
	lastPublishedRevision: number;
	publishedAt: Date | null;
	hiddenAt: Date | null;
	disabledAt: Date | null;
	disabledReason: string | null;
	items: AdminGiftItemView[];
};

export function computeGiftAvailability(
	status: GiftsModeStatus,
	unavailableMessage: string,
): GiftsAvailability {
	if (status === "published") {
		return {
			isAvailable: true,
			status,
			message: null,
		};
	}

	const message =
		status === "disabled"
			? unavailableMessage
			: "Gifts are not visible right now.";

	return {
		isAvailable: false,
		status,
		message,
	};
}

function computeProgress(targetAmountPaise: number, amountRaisedPaise: number) {
	if (targetAmountPaise <= 0) {
		return {
			progressPercent: 0,
			remainingAmountPaise: 0,
		};
	}

	const clampedRaised = Math.max(
		0,
		Math.min(amountRaisedPaise, targetAmountPaise),
	);

	return {
		progressPercent: Math.round((clampedRaised / targetAmountPaise) * 100),
		remainingAmountPaise: Math.max(0, targetAmountPaise - clampedRaised),
	};
}

export function projectGuestGiftsView(input: {
	mode: GiftsModeRow;
	items: ProjectableGiftItem[];
	unavailableMessage: string;
}): GiftsGuestView {
	return {
		modeId: input.mode.id,
		weddingId: input.mode.weddingId,
		status: input.mode.modeStatus,
		availability: computeGiftAvailability(
			input.mode.modeStatus,
			input.unavailableMessage,
		),
		upiPayeeName: input.mode.upiPayeeName,
		upiId: input.mode.upiId,
		upiQrImageUrl: input.mode.upiQrImageUrl,
		messageNote: input.mode.messageNote,
		items: input.items.map((item) => {
			const progress = computeProgress(
				item.targetAmountPaise,
				item.amountRaisedPaise,
			);
			return {
				id: item.id,
				title: item.title,
				description: item.description,
				targetAmountPaise: item.targetAmountPaise,
				amountRaisedPaise: item.amountRaisedPaise,
				remainingAmountPaise: progress.remainingAmountPaise,
				progressPercent: progress.progressPercent,
				isCompleted: item.amountRaisedPaise >= item.targetAmountPaise,
				contributions: (item.contributions ?? []).map((contribution) => ({
					id: contribution.id,
					amountPaise: contribution.amountPaise,
					createdAt: contribution.createdAt,
				})),
			};
		}),
		updatedAt: input.mode.updatedAt,
	};
}

export function projectAdminGiftsView(input: {
	mode: GiftsModeRow;
	items: ProjectableGiftItem[];
	unavailableMessage: string;
}): GiftsAdminView {
	const guest = projectGuestGiftsView(input);

	return {
		...guest,
		prePublishNote: input.mode.prePublishNote,
		draftRevision: input.mode.draftRevision,
		lastPublishedRevision: input.mode.lastPublishedRevision,
		publishedAt: input.mode.publishedAt,
		hiddenAt: input.mode.hiddenAt,
		disabledAt: input.mode.disabledAt,
		disabledReason: input.mode.disabledReason,
		items: input.items.map((item) => {
			const progress = computeProgress(
				item.targetAmountPaise,
				item.amountRaisedPaise,
			);
			return {
				id: item.id,
				title: item.title,
				description: item.description,
				targetAmountPaise: item.targetAmountPaise,
				amountRaisedPaise: item.amountRaisedPaise,
				remainingAmountPaise: progress.remainingAmountPaise,
				progressPercent: progress.progressPercent,
				isCompleted: item.amountRaisedPaise >= item.targetAmountPaise,
				contributions: (item.contributions ?? []).map((contribution) => ({
					id: contribution.id,
					amountPaise: contribution.amountPaise,
					contributorName: contribution.contributorName,
					contributorPhoneE164: contribution.contributorPhoneE164,
					note: contribution.note,
					source: contribution.source,
					createdAt: contribution.createdAt,
				})),
			};
		}),
	};
}
