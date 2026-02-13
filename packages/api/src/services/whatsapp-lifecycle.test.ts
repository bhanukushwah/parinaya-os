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

const { evaluateLifecycleTransition } = await import("./whatsapp-lifecycle");

describe("whatsapp lifecycle", () => {
	it("accepts forward transitions from sent to delivered and read", () => {
		const sentToDelivered = evaluateLifecycleTransition("sent", "delivered");
		expect(sentToDelivered.apply).toBe(true);
		expect(sentToDelivered.isDuplicate).toBe(false);

		const deliveredToRead = evaluateLifecycleTransition("delivered", "read");
		expect(deliveredToRead.apply).toBe(true);
		expect(deliveredToRead.isDuplicate).toBe(false);
	});

	it("accepts transition to failed from non-terminal states", () => {
		const fromSent = evaluateLifecycleTransition("sent", "failed");
		expect(fromSent.apply).toBe(true);
		expect(fromSent.isDuplicate).toBe(false);

		const fromDelivered = evaluateLifecycleTransition("delivered", "failed");
		expect(fromDelivered.apply).toBe(true);
		expect(fromDelivered.isDuplicate).toBe(false);

		const fromRead = evaluateLifecycleTransition("read", "failed");
		expect(fromRead.apply).toBe(true);
		expect(fromRead.isDuplicate).toBe(false);
	});

	it("rejects duplicate webhook replay with same status", () => {
		const duplicateSent = evaluateLifecycleTransition("sent", "sent");
		expect(duplicateSent.apply).toBe(false);
		expect(duplicateSent.isDuplicate).toBe(true);

		const duplicateDelivered = evaluateLifecycleTransition(
			"delivered",
			"delivered",
		);
		expect(duplicateDelivered.apply).toBe(false);
		expect(duplicateDelivered.isDuplicate).toBe(true);

		const duplicateFailed = evaluateLifecycleTransition("failed", "failed");
		expect(duplicateFailed.apply).toBe(false);
		expect(duplicateFailed.isDuplicate).toBe(true);
	});

	it("rejects out-of-order regressions", () => {
		const readToDelivered = evaluateLifecycleTransition("read", "delivered");
		expect(readToDelivered.apply).toBe(false);
		expect(readToDelivered.isDuplicate).toBe(true);

		const readToSent = evaluateLifecycleTransition("read", "sent");
		expect(readToSent.apply).toBe(false);
		expect(readToSent.isDuplicate).toBe(true);

		const deliveredToSent = evaluateLifecycleTransition("delivered", "sent");
		expect(deliveredToSent.apply).toBe(false);
		expect(deliveredToSent.isDuplicate).toBe(true);
	});

	it("keeps failed terminal even when newer non-failed statuses arrive", () => {
		const failedToSent = evaluateLifecycleTransition("failed", "sent");
		expect(failedToSent.apply).toBe(false);
		expect(failedToSent.isDuplicate).toBe(true);

		const failedToDelivered = evaluateLifecycleTransition(
			"failed",
			"delivered",
		);
		expect(failedToDelivered.apply).toBe(false);
		expect(failedToDelivered.isDuplicate).toBe(true);

		const failedToRead = evaluateLifecycleTransition("failed", "read");
		expect(failedToRead.apply).toBe(false);
		expect(failedToRead.isDuplicate).toBe(true);
	});
});
