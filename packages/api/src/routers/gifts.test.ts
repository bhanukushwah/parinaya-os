import { describe, expect, it } from "bun:test";

process.env.DATABASE_URL ??=
	"postgresql://postgres:password@localhost:5432/postgres";
process.env.BETTER_AUTH_SECRET ??= "12345678901234567890123456789012";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.CORS_ORIGIN ??= "http://localhost:3001";
process.env.WHATSAPP_API_BASE_URL ??= "https://graph.facebook.com/v21.0";
process.env.WHATSAPP_ACCESS_TOKEN ??= "test-token";
process.env.WHATSAPP_PHONE_NUMBER_ID ??= "test-phone-number-id";
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??= "test-verify-token";
process.env.WHATSAPP_WEBHOOK_APP_SECRET ??= "test-app-secret";
process.env.WEBSITE_ACCESS_TOKEN_SECRET ??= "test-website-secret-value";
process.env.WEBSITE_OTP_TTL_SECONDS ??= "300";
process.env.WEBSITE_OTP_MAX_ATTEMPTS ??= "5";
process.env.WEBSITE_TRUSTED_SESSION_TTL_DAYS ??= "30";
process.env.WEBSITE_SYNC_STALE_THRESHOLD_SECONDS ??= "120";
process.env.GIFTS_STALE_THRESHOLD_SECONDS ??= "300";
process.env.GIFTS_UNAVAILABLE_MESSAGE ??=
	"Gifts are currently unavailable. Please check back later.";

const { projectAdminGiftsView, projectGuestGiftsView } = await import(
	"../services/gifts-projection"
);
const {
	giftsAdminDraftInput,
	giftsContributionInput,
	giftsLifecycleInput,
	giftsRouter,
} = await import("./gifts");

describe("gifts router", () => {
	it("exports expected procedures", () => {
		expect(Object.keys(giftsRouter).sort()).toEqual([
			"adminView",
			"archiveItem",
			"contribute",
			"guestView",
			"transitionMode",
			"updateDraft",
			"upsertItem",
		]);
	});

	it("validates lifecycle and draft payload contracts", () => {
		expect(() =>
			giftsLifecycleInput.parse({
				weddingId: "wed-1",
				action: "publish",
			}),
		).not.toThrow();

		expect(() =>
			giftsLifecycleInput.parse({
				weddingId: "wed-1",
				action: "unknown",
			}),
		).toThrow();

		expect(() =>
			giftsAdminDraftInput.parse({
				weddingId: "wed-1",
				prePublishNote: "Ready to publish",
			}),
		).not.toThrow();
	});

	it("validates contribution contract", () => {
		expect(() =>
			giftsContributionInput.parse({
				weddingId: "wed-1",
				trustedSessionToken: "session-token",
				itemId: "item-1",
				amountPaise: 100,
			}),
		).not.toThrow();

		expect(() =>
			giftsContributionInput.parse({
				weddingId: "wed-1",
				trustedSessionToken: "",
				itemId: "item-1",
				amountPaise: 100,
			}),
		).toThrow();
	});

	it("keeps contributor identities hidden in guest projection only", () => {
		const mode = {
			id: "mode-1",
			weddingId: "wed-1",
			modeStatus: "published",
			upiPayeeName: "Asha",
			upiId: "asha@upi",
			upiQrImageUrl: null,
			messageNote: "Thank you",
			prePublishNote: "Approved",
			draftRevision: 1,
			lastPublishedRevision: 1,
			publishedAt: new Date("2026-02-13T10:00:00.000Z"),
			hiddenAt: null,
			disabledAt: null,
			disabledReason: null,
			updatedAt: new Date("2026-02-13T10:00:00.000Z"),
		} as any;

		const items = [
			{
				id: "item-1",
				title: "Mixer Grinder",
				description: null,
				targetAmountPaise: 500000,
				amountRaisedPaise: 100000,
				contributions: [
					{
						id: "con-1",
						amountPaise: 100000,
						contributorName: "Aditi",
						contributorPhoneE164: "+919999999999",
						note: "Blessings",
						source: "website",
						createdAt: new Date("2026-02-13T10:00:00.000Z"),
					},
				],
			},
		] as any;

		const guest = projectGuestGiftsView({
			mode,
			items,
			unavailableMessage: "Gifts unavailable",
		});

		const admin = projectAdminGiftsView({
			mode,
			items,
			unavailableMessage: "Gifts unavailable",
		});

		expect(guest.items[0]?.contributions[0]).toEqual({
			id: "con-1",
			amountPaise: 100000,
			createdAt: new Date("2026-02-13T10:00:00.000Z"),
		});
		expect(admin.items[0]?.contributions[0]?.contributorName).toBe("Aditi");
	});
});
