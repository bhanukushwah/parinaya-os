import { env } from "@parinaya-os/env/server";

export type SendTemplateInviteInput = {
	recipientPhoneE164: string;
	templateName: string;
	templateLanguage: string;
	components?: Array<Record<string, unknown>>;
};

export type SendTemplateInviteResult =
	| {
			ok: true;
			providerMessageId: string;
			raw: unknown;
	  }
	| {
			ok: false;
			errorCode: string;
			errorMessage: string;
			raw: unknown;
	  };

type MetaTemplateResponse = {
	messages?: Array<{ id?: string }>;
	error?: {
		code?: number;
		message?: string;
		type?: string;
	};
};

function mapProviderError(
	payload: MetaTemplateResponse,
	fallback: string,
): {
	errorCode: string;
	errorMessage: string;
} {
	const code = payload.error?.code;
	const type = payload.error?.type;
	const message = payload.error?.message;

	if (typeof code === "number") {
		return {
			errorCode: String(code),
			errorMessage: message ?? fallback,
		};
	}

	if (type) {
		return {
			errorCode: type,
			errorMessage: message ?? fallback,
		};
	}

	return {
		errorCode: "provider_error",
		errorMessage: message ?? fallback,
	};
}

export async function sendTemplateInvite(
	input: SendTemplateInviteInput,
): Promise<SendTemplateInviteResult> {
	if (env.NODE_ENV === "test") {
		return {
			ok: true,
			providerMessageId: `test-${crypto.randomUUID()}`,
			raw: {
				testMode: true,
			},
		};
	}

	const endpoint = `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

	const body = {
		messaging_product: "whatsapp",
		to: input.recipientPhoneE164,
		type: "template",
		template: {
			name: input.templateName,
			language: {
				code: input.templateLanguage,
			},
			components: input.components,
		},
	};

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		const payload = (await response.json()) as MetaTemplateResponse;

		if (!response.ok) {
			const providerError = mapProviderError(
				payload,
				"Provider request failed.",
			);
			return {
				ok: false,
				errorCode: providerError.errorCode,
				errorMessage: providerError.errorMessage,
				raw: payload,
			};
		}

		const providerMessageId = payload.messages?.[0]?.id;
		if (!providerMessageId) {
			return {
				ok: false,
				errorCode: "provider_missing_message_id",
				errorMessage:
					"Provider accepted request but did not return a message id.",
				raw: payload,
			};
		}

		return {
			ok: true,
			providerMessageId,
			raw: payload,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown provider error";
		return {
			ok: false,
			errorCode: "provider_network_error",
			errorMessage: message,
			raw: {
				error: message,
			},
		};
	}
}
