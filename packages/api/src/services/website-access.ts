import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { db } from "@parinaya-os/db";
import {
	websiteOtpChallenges,
	websiteTrustedSessions,
} from "@parinaya-os/db/schema/rsvp";
import { env } from "@parinaya-os/env/server";
import { and, eq, gt } from "drizzle-orm";

import { normalizePhoneToE164 } from "./phone-normalization";

function hashWithSecret(value: string) {
	return createHash("sha256")
		.update(`${env.WEBSITE_ACCESS_TOKEN_SECRET}:${value}`)
		.digest("hex");
}

function safeCompare(a: string, b: string) {
	const aBuffer = Buffer.from(a);
	const bBuffer = Buffer.from(b);
	if (aBuffer.length !== bBuffer.length) {
		return false;
	}

	return timingSafeEqual(aBuffer, bBuffer);
}

function createOtpCode() {
	return String(randomInt(100000, 999999));
}

export async function issueWebsiteOtp(input: {
	weddingId: string;
	phone: string;
	defaultCountry?: "IN";
}) {
	const normalized = normalizePhoneToE164({
		phone: input.phone,
		defaultCountry: input.defaultCountry,
	});

	if (!normalized.ok) {
		return {
			ok: false as const,
			error: normalized.errorCode,
			message: normalized.message,
		};
	}

	const code = createOtpCode();
	const challenge = {
		id: crypto.randomUUID(),
		weddingId: input.weddingId,
		normalizedPhoneE164: normalized.normalizedPhoneE164,
		codeHash: hashWithSecret(code),
		expiresAt: new Date(Date.now() + env.WEBSITE_OTP_TTL_SECONDS * 1000),
		attemptsRemaining: env.WEBSITE_OTP_MAX_ATTEMPTS,
	};

	await db.insert(websiteOtpChallenges).values(challenge);

	return {
		ok: true as const,
		challengeId: challenge.id,
		normalizedPhoneE164: challenge.normalizedPhoneE164,
		expiresAt: challenge.expiresAt,
		debugOtpCode: env.NODE_ENV === "test" ? code : undefined,
	};
}

export async function verifyWebsiteOtp(input: {
	weddingId: string;
	challengeId: string;
	code: string;
}) {
	const challenge = await db.query.websiteOtpChallenges.findFirst({
		where: and(
			eq(websiteOtpChallenges.id, input.challengeId),
			eq(websiteOtpChallenges.weddingId, input.weddingId),
		),
	});

	if (!challenge) {
		return {
			ok: false as const,
			error: "challenge_not_found",
			message: "OTP challenge not found.",
		};
	}

	if (challenge.status !== "pending") {
		return {
			ok: false as const,
			error: "challenge_not_pending",
			message: "OTP challenge is no longer active.",
		};
	}

	if (challenge.expiresAt.getTime() <= Date.now()) {
		await db
			.update(websiteOtpChallenges)
			.set({
				status: "expired",
				updatedAt: new Date(),
			})
			.where(eq(websiteOtpChallenges.id, challenge.id));

		return {
			ok: false as const,
			error: "challenge_expired",
			message: "OTP challenge expired. Start again.",
		};
	}

	if (challenge.attemptsRemaining <= 0) {
		await db
			.update(websiteOtpChallenges)
			.set({
				status: "locked",
				updatedAt: new Date(),
			})
			.where(eq(websiteOtpChallenges.id, challenge.id));

		return {
			ok: false as const,
			error: "challenge_locked",
			message: "OTP attempts exceeded. Start again.",
		};
	}

	const candidateHash = hashWithSecret(input.code.trim());
	if (!safeCompare(candidateHash, challenge.codeHash)) {
		const remaining = challenge.attemptsRemaining - 1;
		await db
			.update(websiteOtpChallenges)
			.set({
				attemptsRemaining: Math.max(0, remaining),
				status: remaining > 0 ? "pending" : "locked",
				updatedAt: new Date(),
			})
			.where(eq(websiteOtpChallenges.id, challenge.id));

		return {
			ok: false as const,
			error: "invalid_code",
			message: "Invalid OTP code.",
		};
	}

	const sessionToken = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(
		now.getTime() + env.WEBSITE_TRUSTED_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
	);

	await db.transaction(async (tx) => {
		await tx
			.update(websiteOtpChallenges)
			.set({
				status: "verified",
				verifiedAt: now,
				updatedAt: now,
			})
			.where(eq(websiteOtpChallenges.id, challenge.id));

		await tx.insert(websiteTrustedSessions).values({
			id: crypto.randomUUID(),
			weddingId: input.weddingId,
			normalizedPhoneE164: challenge.normalizedPhoneE164,
			tokenHash: hashWithSecret(sessionToken),
			expiresAt,
			isRevoked: false,
			lastSeenAt: now,
		});
	});

	return {
		ok: true as const,
		sessionToken,
		normalizedPhoneE164: challenge.normalizedPhoneE164,
		expiresAt,
	};
}

export async function verifyWebsiteTrustedSession(input: {
	weddingId: string;
	sessionToken: string;
}) {
	const tokenHash = hashWithSecret(input.sessionToken);
	const session = await db.query.websiteTrustedSessions.findFirst({
		where: and(
			eq(websiteTrustedSessions.weddingId, input.weddingId),
			eq(websiteTrustedSessions.tokenHash, tokenHash),
			eq(websiteTrustedSessions.isRevoked, false),
			gt(websiteTrustedSessions.expiresAt, new Date()),
		),
	});

	if (!session) {
		return null;
	}

	await db
		.update(websiteTrustedSessions)
		.set({
			lastSeenAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(websiteTrustedSessions.id, session.id));

	return {
		sessionId: session.id,
		normalizedPhoneE164: session.normalizedPhoneE164,
		expiresAt: session.expiresAt,
	};
}
