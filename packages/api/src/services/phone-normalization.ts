import {
	type CountryCode,
	ParseError,
	parsePhoneNumberWithError,
} from "libphonenumber-js/max";

export type PhoneNormalizationErrorCode =
	| "missing_phone"
	| "malformed_phone"
	| "invalid_phone";

export type PhoneNormalizationSuccess = {
	ok: true;
	normalizedPhoneE164: string;
	rawPhone: string;
};

export type PhoneNormalizationFailure = {
	ok: false;
	errorCode: PhoneNormalizationErrorCode;
	message: string;
	rawPhone: string | null;
};

export type NormalizePhoneInput = {
	phone: string | null | undefined;
	defaultCountry?: CountryCode;
};

export type NormalizePhoneResult =
	| PhoneNormalizationSuccess
	| PhoneNormalizationFailure;

export function normalizePhoneToE164(
	input: NormalizePhoneInput,
): NormalizePhoneResult {
	const rawPhone = input.phone?.trim() ?? "";

	if (rawPhone.length === 0) {
		return {
			ok: false,
			errorCode: "missing_phone",
			message: "Phone number is required.",
			rawPhone: input.phone ?? null,
		};
	}

	try {
		const parsedPhone = parsePhoneNumberWithError(rawPhone, {
			defaultCountry: input.defaultCountry,
			extract: false,
		});

		if (!parsedPhone.isValid()) {
			return {
				ok: false,
				errorCode: "invalid_phone",
				message: "Phone number is not valid.",
				rawPhone,
			};
		}

		return {
			ok: true,
			normalizedPhoneE164: parsedPhone.number,
			rawPhone,
		};
	} catch (error) {
		if (error instanceof ParseError) {
			return {
				ok: false,
				errorCode: "malformed_phone",
				message: error.message,
				rawPhone,
			};
		}

		return {
			ok: false,
			errorCode: "malformed_phone",
			message: "Phone number format could not be parsed.",
			rawPhone,
		};
	}
}
