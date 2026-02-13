import { z } from "zod";

import { publicProcedure } from "../index";
import {
	issueWebsiteOtp,
	verifyWebsiteOtp,
	verifyWebsiteTrustedSession,
} from "../services/website-access";
import { buildWebsiteSnapshot } from "../services/website-sync";

const snapshotInput = z.object({
	weddingId: z.string().min(1),
	trustedSessionToken: z.string().min(1).optional(),
});

const otpStartInput = z.object({
	weddingId: z.string().min(1),
	phone: z.string().min(4),
	defaultCountry: z.literal("IN").optional(),
});

const otpVerifyInput = z.object({
	weddingId: z.string().min(1),
	challengeId: z.string().min(1),
	code: z.string().min(4).max(8),
});

export const websiteRouter = {
	getSnapshot: publicProcedure
		.input(snapshotInput)
		.handler(async ({ input }) => {
			const trustedSession = input.trustedSessionToken
				? await verifyWebsiteTrustedSession({
						weddingId: input.weddingId,
						sessionToken: input.trustedSessionToken,
					})
				: null;

			const snapshot = await buildWebsiteSnapshot({
				weddingId: input.weddingId,
				phoneE164: trustedSession?.normalizedPhoneE164 ?? null,
				includeProtected: Boolean(trustedSession),
			});

			return projectWebsiteResponse({
				snapshot,
				trustedSession,
			});
		}),

	startOtp: publicProcedure.input(otpStartInput).handler(async ({ input }) => {
		return issueWebsiteOtp(input);
	}),

	verifyOtp: publicProcedure
		.input(otpVerifyInput)
		.handler(async ({ input }) => {
			return verifyWebsiteOtp(input);
		}),
};

export function projectWebsiteResponse(input: {
	snapshot: Awaited<ReturnType<typeof buildWebsiteSnapshot>>;
	trustedSession: Awaited<ReturnType<typeof verifyWebsiteTrustedSession>>;
}) {
	if (!input.trustedSession) {
		return {
			requiresVerification: true,
			freshness: input.snapshot.freshness,
			cta: input.snapshot.cta,
			summary: {
				weddingId: input.snapshot.weddingId,
				events: input.snapshot.events,
				rsvpSummary: input.snapshot.rsvpSummary,
			},
			protected: null,
		};
	}

	return {
		requiresVerification: false,
		freshness: input.snapshot.freshness,
		cta: input.snapshot.cta,
		summary: {
			weddingId: input.snapshot.weddingId,
			events: input.snapshot.events,
			rsvpSummary: input.snapshot.rsvpSummary,
		},
		protected: input.snapshot.protected,
		verifiedSession: {
			expiresAt: input.trustedSession.expiresAt,
		},
	};
}
