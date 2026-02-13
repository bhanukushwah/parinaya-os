import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		WHATSAPP_API_BASE_URL: z.url(),
		WHATSAPP_ACCESS_TOKEN: z.string().min(1),
		WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
		WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
		WHATSAPP_WEBHOOK_APP_SECRET: z.string().min(1),
		WEBSITE_ACCESS_TOKEN_SECRET: z.string().min(16),
		WEBSITE_OTP_TTL_SECONDS: z.coerce.number().int().min(60).default(300),
		WEBSITE_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
		WEBSITE_TRUSTED_SESSION_TTL_DAYS: z.coerce
			.number()
			.int()
			.min(1)
			.max(60)
			.default(30),
		WEBSITE_SYNC_STALE_THRESHOLD_SECONDS: z.coerce
			.number()
			.int()
			.min(10)
			.default(120),
		GIFTS_STALE_THRESHOLD_SECONDS: z.coerce.number().int().min(30).default(300),
		GIFTS_UNAVAILABLE_MESSAGE: z
			.string()
			.min(8)
			.default("Gifts are currently unavailable. Please check back later."),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
