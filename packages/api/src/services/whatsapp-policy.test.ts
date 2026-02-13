import { describe, expect, it } from "bun:test";

import {
	createDoNotMessageLookup,
	evaluateSendEligibility,
} from "./whatsapp-policy";

describe("whatsapp policy", () => {
	it("blocks when provider configuration is missing", () => {
		const result = evaluateSendEligibility({
			recipientPhoneE164: "+919999999999",
			sourceCount: 1,
			isInviteable: true,
			providerConfigured: false,
		});

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toBe("provider_configuration_missing");
		}
	});

	it("blocks recipients with missing phone or source mapping", () => {
		const missingPhone = evaluateSendEligibility({
			recipientPhoneE164: null,
			sourceCount: 1,
			isInviteable: true,
			providerConfigured: true,
		});
		expect(missingPhone.allowed).toBe(false);
		if (!missingPhone.allowed) {
			expect(missingPhone.reason).toBe("missing_phone");
		}

		const missingSource = evaluateSendEligibility({
			recipientPhoneE164: "+919999999999",
			sourceCount: 0,
			isInviteable: true,
			providerConfigured: true,
		});
		expect(missingSource.allowed).toBe(false);
		if (!missingSource.allowed) {
			expect(missingSource.reason).toBe("missing_source");
		}
	});

	it("blocks non-inviteable recipients", () => {
		const result = evaluateSendEligibility({
			recipientPhoneE164: "+919999999999",
			sourceCount: 2,
			isInviteable: false,
			providerConfigured: true,
		});

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toBe("recipient_not_inviteable");
		}
	});

	it("blocks do-not-message recipients and surfaces reason", () => {
		const lookup = createDoNotMessageLookup([
			{
				phoneE164: "+919999999999",
				reasonNote: "Guest requested no further WhatsApp outreach",
			},
		]);

		const result = evaluateSendEligibility({
			recipientPhoneE164: "+919999999999",
			sourceCount: 1,
			isInviteable: true,
			doNotMessageEntry: lookup.get("+919999999999") ?? null,
			providerConfigured: true,
		});

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toBe("dnm_blocked");
			expect(result.detail).toContain("requested no further WhatsApp outreach");
		}
	});

	it("allows eligible recipients with valid provider and no policy block", () => {
		const result = evaluateSendEligibility({
			recipientPhoneE164: "+919888888888",
			sourceCount: 2,
			isInviteable: true,
			providerConfigured: true,
			doNotMessageEntry: null,
		});

		expect(result.allowed).toBe(true);
		if (result.allowed) {
			expect(result.reason).toBeNull();
			expect(result.detail).toBeNull();
		}
	});
});
