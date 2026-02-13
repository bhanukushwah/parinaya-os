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

const { projectWebsiteResponse } = await import("./website");

describe("website router", () => {
	it("returns summary-only payload for unverified visitors", () => {
		const response = projectWebsiteResponse({
			snapshot: {
				weddingId: "wedding-a",
				events: [
					{
						eventId: "event-1",
						title: "Sangeet",
						description: "Evening celebration",
						startsAt: null,
						endsAt: null,
					},
				],
				rsvpSummary: { accepted: 10, declined: 2, total: 12 },
				freshness: {
					lastUpdatedAt: new Date("2026-02-13T10:00:00Z"),
					isStale: true,
					lagSeconds: 240,
					staleReason: "lag-threshold-exceeded",
				},
				cta: {
					label: "Complete RSVP",
					intent: "start",
					whatsappDeepLink: "https://wa.me/919999999999",
					isFlowAvailable: true,
				},
				protected: {
					schedule: [
						{
							eventId: "event-1",
							title: "Sangeet",
							startsAt: null,
							endsAt: null,
						},
					],
					recentRsvpActivity: [],
					gifts: {
						modeStatus: "draft",
						availabilityMessage: "Gifts are not visible right now.",
						upiPayeeName: null,
						upiId: null,
						upiQrImageUrl: null,
						messageNote: null,
						items: [],
					},
				},
			},
			trustedSession: null,
		});

		expect(response.requiresVerification).toBe(true);
		expect(response.summary.weddingId).toBe("wedding-a");
		expect(response.protected).toBeNull();
		expect(response.freshness.isStale).toBe(true);
		expect(response.freshness.lastUpdatedAt).toBeDefined();
	});

	it("returns protected payload when trusted session is present", () => {
		const response = projectWebsiteResponse({
			snapshot: {
				weddingId: "wedding-a",
				events: [],
				rsvpSummary: { accepted: 4, declined: 1, total: 5 },
				freshness: {
					lastUpdatedAt: null,
					isStale: false,
					lagSeconds: 10,
					staleReason: null,
				},
				cta: {
					label: "Update RSVP",
					intent: "update",
					whatsappDeepLink: "https://wa.me/919999999999",
					isFlowAvailable: true,
				},
				protected: {
					schedule: [
						{
							eventId: "event-2",
							title: "Reception",
							startsAt: null,
							endsAt: null,
						},
					],
					recentRsvpActivity: [
						{
							sessionId: "session-1",
							finalResponse: "accept",
							updatedAt: new Date(),
						},
					],
					gifts: {
						modeStatus: "published",
						availabilityMessage: null,
						upiPayeeName: "Asha",
						upiId: "asha@upi",
						upiQrImageUrl: null,
						messageNote: "Thank you",
						items: [
							{
								id: "gift-1",
								title: "Mixer",
								description: null,
								targetAmountPaise: 500000,
								amountRaisedPaise: 125000,
								progressPercent: 25,
								isCompleted: false,
							},
						],
					},
				},
			},
			trustedSession: {
				sessionId: "trusted-1",
				normalizedPhoneE164: "+919999999999",
				expiresAt: new Date(Date.now() + 1000),
			},
		});

		expect(response.requiresVerification).toBe(false);
		expect(response.protected?.schedule.length).toBe(1);
		expect(response.verifiedSession?.expiresAt).toBeInstanceOf(Date);
		expect(response.cta.label).toBe("Update RSVP");
	});
});
