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

const { handleWhatsAppRsvpInput } = await import("./whatsapp-rsvp-handler");

function createRepositoryStub() {
	let latestSession: any = null;
	const counters = {
		accepted: 0,
		declined: 0,
		total: 0,
	};

	return {
		repository: {
			async findGuestUnitByPhone() {
				return {
					guestUnitId: "unit-1",
					identityId: "identity-1",
				};
			},
			async listGuestUnitPeople() {
				return [{ personId: "p1" }, { personId: "p2" }];
			},
			async findLatestSession() {
				return latestSession;
			},
			async createSession(input: any) {
				latestSession = {
					id: "session-1",
					weddingId: input.weddingId,
					eventId: input.eventId,
					guestUnitId: input.guestUnitId,
					phoneE164: input.phoneE164,
					flowStatus: "active",
					stepIndex: 1,
					finalResponse: null,
					completedAt: null,
				};
				return latestSession;
			},
			async updateSession(input: any) {
				latestSession = {
					...latestSession,
					stepIndex: input.stepIndex,
					flowStatus: input.flowStatus,
					finalResponse: input.finalResponse,
					completedAt: input.flowStatus === "completed" ? new Date() : null,
				};
			},
			async upsertPersonResponses(input: any) {
				counters.accepted = input.responses.filter(
					(entry: any) => entry.response === "accept",
				).length;
				counters.declined = input.responses.filter(
					(entry: any) => entry.response === "decline",
				).length;
				counters.total = input.responses.length;
				return counters.total;
			},
			async countResponses() {
				return counters;
			},
		},
	};
}

describe("whatsapp rsvp handler", () => {
	it("progresses invitee through three-step RSVP flow", async () => {
		const deps = createRepositoryStub();

		const step1 = await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "accept",
			},
			deps,
		);

		expect(step1.step).toBe(2);
		expect(step1.nextAction).toBe("attendance");

		const step2 = await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "p1=accept,p2=decline",
			},
			deps,
		);

		expect(step2.step).toBe(3);
		expect(step2.nextAction).toBe("confirm");

		const step3 = await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "confirm",
			},
			deps,
		);

		expect(step3.status).toBe("completed");
		expect(step3.summary).toEqual({ accepted: 1, declined: 1, total: 2 });
		expect(step3.message).toContain("Accepted: 1");
	});

	it("returns retry guidance for invalid replies", async () => {
		const deps = createRepositoryStub();
		const response = await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "hello there",
			},
			deps,
		);

		expect(response.status).toBe("invalid-input");
		expect(response.nextAction).toBe("retry");
	});

	it("supports update reentry with state-aware label", async () => {
		const deps = createRepositoryStub();

		await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "accept",
			},
			deps,
		);
		await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "p1=accept,p2=decline",
			},
			deps,
		);
		await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "confirm",
			},
			deps,
		);

		const replay = await handleWhatsAppRsvpInput(
			{
				weddingId: "w-1",
				eventId: "e-1",
				phoneE164: "+919999999999",
				messageText: "accept",
			},
			deps,
		);

		expect(replay.label).toBe("Update RSVP");
		expect(["progressed", "invalid-input"]).toContain(replay.status);
	});
});
