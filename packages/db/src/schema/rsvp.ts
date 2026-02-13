import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { weddingEvents } from "./events";
import { guestIdentities, guestPeople, guestUnits } from "./guests";
import { inviteMessages } from "./whatsapp";

export const rsvpFlowStepEnum = pgEnum("rsvp_flow_step", [
	"identity-response",
	"attendance-details",
	"final-confirmation",
]);

export const rsvpFlowStatusEnum = pgEnum("rsvp_flow_status", [
	"active",
	"completed",
	"cancelled",
	"expired",
]);

export const rsvpFinalResponseEnum = pgEnum("rsvp_final_response", [
	"accept",
	"decline",
]);

export const rsvpSourceEnum = pgEnum("rsvp_source", ["whatsapp", "website"]);

export const websiteSyncStaleReasonEnum = pgEnum("website_sync_stale_reason", [
	"lag-threshold-exceeded",
	"sync-error",
	"never-synced",
	"manual-override",
]);

export const websiteOtpChallengeStatusEnum = pgEnum(
	"website_otp_challenge_status",
	["pending", "verified", "expired", "locked"],
);

export const rsvpFlowSessions = pgTable(
	"rsvp_flow_sessions",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		guestUnitId: text("guest_unit_id")
			.notNull()
			.references(() => guestUnits.id, { onDelete: "cascade" }),
		identityId: text("identity_id").references(() => guestIdentities.id, {
			onDelete: "set null",
		}),
		lastInviteMessageId: text("last_invite_message_id").references(
			() => inviteMessages.id,
			{ onDelete: "set null" },
		),
		phoneE164: text("phone_e164").notNull(),
		flowStatus: rsvpFlowStatusEnum("flow_status").default("active").notNull(),
		currentStep: rsvpFlowStepEnum("current_step")
			.default("identity-response")
			.notNull(),
		stepIndex: integer("step_index").default(1).notNull(),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
		expiresAt: timestamp("expires_at"),
		lastInboundAt: timestamp("last_inbound_at"),
		lastOutboundAt: timestamp("last_outbound_at"),
		finalResponse: rsvpFinalResponseEnum("final_response"),
		confirmationSummary: jsonb("confirmation_summary"),
		providerConversationId: text("provider_conversation_id"),
		lastProviderMessageId: text("last_provider_message_id"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("rsvp_flow_sessions_wedding_event_phone_idx").on(
			table.weddingId,
			table.eventId,
			table.phoneE164,
		),
		index("rsvp_flow_sessions_wedding_status_updated_idx").on(
			table.weddingId,
			table.flowStatus,
			table.updatedAt,
		),
		uniqueIndex("rsvp_flow_sessions_one_active_phone_unique")
			.on(table.weddingId, table.eventId, table.phoneE164)
			.where(sql`${table.flowStatus} = 'active'`),
	],
);

export const rsvpPersonResponses = pgTable(
	"rsvp_person_responses",
	{
		id: text("id").primaryKey(),
		flowSessionId: text("flow_session_id")
			.notNull()
			.references(() => rsvpFlowSessions.id, { onDelete: "cascade" }),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		guestUnitId: text("guest_unit_id")
			.notNull()
			.references(() => guestUnits.id, { onDelete: "cascade" }),
		personId: text("person_id")
			.notNull()
			.references(() => guestPeople.id, { onDelete: "cascade" }),
		response: rsvpFinalResponseEnum("response").notNull(),
		source: rsvpSourceEnum("source").default("whatsapp").notNull(),
		responseRevision: integer("response_revision").default(1).notNull(),
		respondedAt: timestamp("responded_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		metadata: jsonb("metadata"),
	},
	(table) => [
		uniqueIndex("rsvp_person_responses_event_person_unique").on(
			table.weddingId,
			table.eventId,
			table.personId,
		),
		index("rsvp_person_responses_guest_unit_response_idx").on(
			table.guestUnitId,
			table.response,
			table.updatedAt,
		),
	],
);

export const websiteSyncStates = pgTable(
	"website_sync_states",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id").references(() => weddingEvents.id, {
			onDelete: "cascade",
		}),
		snapshotVersion: integer("snapshot_version").default(1).notNull(),
		lastUpdatedAt: timestamp("last_updated_at"),
		lastSuccessfulSyncAt: timestamp("last_successful_sync_at"),
		lagSeconds: integer("lag_seconds").default(0).notNull(),
		isStale: boolean("is_stale").default(false).notNull(),
		staleReason: websiteSyncStaleReasonEnum("stale_reason"),
		lastErrorDetail: text("last_error_detail"),
		lastErrorAt: timestamp("last_error_at"),
		projection: jsonb("projection"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("website_sync_states_wedding_event_unique")
			.on(table.weddingId, table.eventId)
			.where(sql`${table.eventId} is not null`),
		index("website_sync_states_wedding_stale_idx").on(
			table.weddingId,
			table.isStale,
			table.updatedAt,
		),
	],
);

export const websiteOtpChallenges = pgTable(
	"website_otp_challenges",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		normalizedPhoneE164: text("normalized_phone_e164").notNull(),
		codeHash: text("code_hash").notNull(),
		status: websiteOtpChallengeStatusEnum("status")
			.default("pending")
			.notNull(),
		attemptsRemaining: integer("attempts_remaining").default(5).notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		verifiedAt: timestamp("verified_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("website_otp_challenges_wedding_phone_status_idx").on(
			table.weddingId,
			table.normalizedPhoneE164,
			table.status,
		),
	],
);

export const websiteTrustedSessions = pgTable(
	"website_trusted_sessions",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		normalizedPhoneE164: text("normalized_phone_e164").notNull(),
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		isRevoked: boolean("is_revoked").default(false).notNull(),
		revokedAt: timestamp("revoked_at"),
		lastSeenAt: timestamp("last_seen_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("website_trusted_sessions_token_hash_unique").on(
			table.tokenHash,
		),
		index("website_trusted_sessions_wedding_phone_active_idx").on(
			table.weddingId,
			table.normalizedPhoneE164,
			table.expiresAt,
		),
	],
);

export const rsvpFlowSessionsRelations = relations(
	rsvpFlowSessions,
	({ many, one }) => ({
		event: one(weddingEvents, {
			fields: [rsvpFlowSessions.eventId],
			references: [weddingEvents.id],
		}),
		guestUnit: one(guestUnits, {
			fields: [rsvpFlowSessions.guestUnitId],
			references: [guestUnits.id],
		}),
		identity: one(guestIdentities, {
			fields: [rsvpFlowSessions.identityId],
			references: [guestIdentities.id],
		}),
		lastInviteMessage: one(inviteMessages, {
			fields: [rsvpFlowSessions.lastInviteMessageId],
			references: [inviteMessages.id],
		}),
		personResponses: many(rsvpPersonResponses),
	}),
);

export const rsvpPersonResponsesRelations = relations(
	rsvpPersonResponses,
	({ one }) => ({
		flowSession: one(rsvpFlowSessions, {
			fields: [rsvpPersonResponses.flowSessionId],
			references: [rsvpFlowSessions.id],
		}),
		event: one(weddingEvents, {
			fields: [rsvpPersonResponses.eventId],
			references: [weddingEvents.id],
		}),
		guestUnit: one(guestUnits, {
			fields: [rsvpPersonResponses.guestUnitId],
			references: [guestUnits.id],
		}),
		person: one(guestPeople, {
			fields: [rsvpPersonResponses.personId],
			references: [guestPeople.id],
		}),
	}),
);

export const websiteSyncStatesRelations = relations(
	websiteSyncStates,
	({ one }) => ({
		event: one(weddingEvents, {
			fields: [websiteSyncStates.eventId],
			references: [weddingEvents.id],
		}),
	}),
);
