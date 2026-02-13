import type { invitePolicyRejectionReasonEnum } from "@parinaya-os/db/schema/whatsapp";

export type InvitePolicyRejectionReason =
	(typeof invitePolicyRejectionReasonEnum.enumValues)[number];

export type DoNotMessageEntry = {
	phoneE164: string;
	reasonNote: string | null;
};

export type InviteEligibilityInput = {
	recipientPhoneE164: string | null;
	sourceCount: number;
	isInviteable: boolean;
	doNotMessageEntry?: DoNotMessageEntry | null;
	providerConfigured: boolean;
};

export type InviteEligibilityResult =
	| {
			allowed: true;
			reason: null;
			detail: null;
	  }
	| {
			allowed: false;
			reason: InvitePolicyRejectionReason;
			detail: string;
	  };

export function evaluateSendEligibility(
	input: InviteEligibilityInput,
): InviteEligibilityResult {
	if (!input.providerConfigured) {
		return {
			allowed: false,
			reason: "provider_configuration_missing",
			detail:
				"Provider configuration is missing required WhatsApp credentials.",
		};
	}

	if (!input.recipientPhoneE164) {
		return {
			allowed: false,
			reason: "missing_phone",
			detail: "Recipient has no normalized E.164 phone number.",
		};
	}

	if (input.sourceCount <= 0) {
		return {
			allowed: false,
			reason: "missing_source",
			detail: "Recipient could not be mapped to a guest source.",
		};
	}

	if (!input.isInviteable) {
		return {
			allowed: false,
			reason: "recipient_not_inviteable",
			detail: "Recipient is not inviteable.",
		};
	}

	if (input.doNotMessageEntry) {
		return {
			allowed: false,
			reason: "dnm_blocked",
			detail:
				input.doNotMessageEntry.reasonNote ??
				"Recipient is blocked by Do-Not-Message policy.",
		};
	}

	return {
		allowed: true,
		reason: null,
		detail: null,
	};
}

export function createDoNotMessageLookup(
	rows: Array<{ phoneE164: string; reasonNote: string | null }>,
): Map<string, DoNotMessageEntry> {
	return new Map(rows.map((row) => [row.phoneE164, row]));
}
