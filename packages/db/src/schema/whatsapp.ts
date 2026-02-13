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
import { weddingMemberships } from "./governance";
import { guestIdentities, guestUnits } from "./guests";

export const inviteSendRunStatusEnum = pgEnum("invite_send_run_status", [
	"pending",
	"running",
	"completed",
	"failed",
	"partial",
]);

export const inviteMessageLifecycleStatusEnum = pgEnum(
	"invite_message_lifecycle_status",
	["sent", "delivered", "read", "failed"],
);

export const invitePolicyRejectionReasonEnum = pgEnum(
	"invite_policy_rejection_reason",
	[
		"dnm_blocked",
		"recipient_not_inviteable",
		"missing_phone",
		"missing_source",
		"provider_configuration_missing",
	],
);

export const inviteWebhookAuthResultEnum = pgEnum(
	"invite_webhook_auth_result",
	["verified", "invalid_signature", "invalid_payload", "unknown"],
);

export const inviteWebhookReceiptStatusEnum = pgEnum(
	"invite_webhook_receipt_status",
	["accepted", "ignored", "rejected"],
);

export const inviteLifecycleTransitionSourceEnum = pgEnum(
	"invite_lifecycle_transition_source",
	["dispatch", "webhook"],
);

export const inviteSendRuns = pgTable(
	"invite_send_runs",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		status: inviteSendRunStatusEnum("status").default("pending").notNull(),
		templateName: text("template_name").notNull(),
		templateLanguage: text("template_language").default("en").notNull(),
		audienceSnapshot: jsonb("audience_snapshot").notNull(),
		totalCandidates: integer("total_candidates").default(0).notNull(),
		eligibleCount: integer("eligible_count").default(0).notNull(),
		blockedCount: integer("blocked_count").default(0).notNull(),
		sentCount: integer("sent_count").default(0).notNull(),
		failedCount: integer("failed_count").default(0).notNull(),
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		failedAt: timestamp("failed_at"),
		failureReason: text("failure_reason"),
		createdByMembershipId: text("created_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		updatedByMembershipId: text("updated_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("invite_send_runs_wedding_event_created_idx").on(
			table.weddingId,
			table.eventId,
			table.createdAt,
		),
		index("invite_send_runs_wedding_status_created_idx").on(
			table.weddingId,
			table.status,
			table.createdAt,
		),
	],
);

export const inviteMessages = pgTable(
	"invite_messages",
	{
		id: text("id").primaryKey(),
		inviteRunId: text("invite_run_id")
			.notNull()
			.references(() => inviteSendRuns.id, { onDelete: "cascade" }),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		recipientGuestUnitId: text("recipient_guest_unit_id").references(
			() => guestUnits.id,
			{ onDelete: "set null" },
		),
		recipientIdentityId: text("recipient_identity_id").references(
			() => guestIdentities.id,
			{ onDelete: "set null" },
		),
		recipientPhoneE164: text("recipient_phone_e164").notNull(),
		lifecycleStatus: inviteMessageLifecycleStatusEnum("lifecycle_status")
			.default("failed")
			.notNull(),
		isBlocked: boolean("is_blocked").default(false).notNull(),
		rejectionReason: invitePolicyRejectionReasonEnum("rejection_reason"),
		providerMessageId: text("provider_message_id"),
		providerErrorCode: text("provider_error_code"),
		providerErrorMessage: text("provider_error_message"),
		dispatchedAt: timestamp("dispatched_at"),
		deliveredAt: timestamp("delivered_at"),
		readAt: timestamp("read_at"),
		failedAt: timestamp("failed_at"),
		lastStatusAt: timestamp("last_status_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("invite_messages_run_created_idx").on(
			table.inviteRunId,
			table.createdAt,
		),
		index("invite_messages_event_status_idx").on(
			table.eventId,
			table.lifecycleStatus,
			table.lastStatusAt,
		),
		index("invite_messages_wedding_phone_idx").on(
			table.weddingId,
			table.recipientPhoneE164,
		),
		uniqueIndex("invite_messages_provider_message_id_unique")
			.on(table.providerMessageId)
			.where(sql`${table.providerMessageId} is not null`),
	],
);

export const inviteWebhookReceipts = pgTable(
	"invite_webhook_receipts",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id"),
		inviteMessageId: text("invite_message_id").references(
			() => inviteMessages.id,
			{
				onDelete: "set null",
			},
		),
		providerMessageId: text("provider_message_id"),
		eventStatus: inviteMessageLifecycleStatusEnum("event_status"),
		eventAt: timestamp("event_at"),
		authResult: inviteWebhookAuthResultEnum("auth_result")
			.default("unknown")
			.notNull(),
		receiptStatus: inviteWebhookReceiptStatusEnum("receipt_status")
			.default("ignored")
			.notNull(),
		dedupeKey: text("dedupe_key").notNull(),
		payload: jsonb("payload").notNull(),
		headers: jsonb("headers"),
		errorDetail: text("error_detail"),
		receivedAt: timestamp("received_at").defaultNow().notNull(),
		processedAt: timestamp("processed_at"),
	},
	(table) => [
		uniqueIndex("invite_webhook_receipts_dedupe_key_unique").on(
			table.dedupeKey,
		),
		index("invite_webhook_receipts_message_event_idx").on(
			table.providerMessageId,
			table.eventStatus,
			table.eventAt,
		),
		index("invite_webhook_receipts_wedding_received_idx").on(
			table.weddingId,
			table.receivedAt,
		),
	],
);

export const inviteLifecycleTransitions = pgTable(
	"invite_lifecycle_transitions",
	{
		id: text("id").primaryKey(),
		inviteMessageId: text("invite_message_id")
			.notNull()
			.references(() => inviteMessages.id, { onDelete: "cascade" }),
		weddingId: text("wedding_id").notNull(),
		fromStatus: inviteMessageLifecycleStatusEnum("from_status"),
		toStatus: inviteMessageLifecycleStatusEnum("to_status").notNull(),
		source: inviteLifecycleTransitionSourceEnum("source").notNull(),
		webhookReceiptId: text("webhook_receipt_id").references(
			() => inviteWebhookReceipts.id,
			{ onDelete: "set null" },
		),
		providerEventAt: timestamp("provider_event_at"),
		isDuplicate: boolean("is_duplicate").default(false).notNull(),
		reasonNote: text("reason_note"),
		appliedAt: timestamp("applied_at").defaultNow().notNull(),
	},
	(table) => [
		index("invite_lifecycle_transitions_message_applied_idx").on(
			table.inviteMessageId,
			table.appliedAt,
		),
		index("invite_lifecycle_transitions_wedding_status_idx").on(
			table.weddingId,
			table.toStatus,
			table.appliedAt,
		),
		uniqueIndex("invite_lifecycle_transitions_webhook_dedupe_unique")
			.on(table.webhookReceiptId, table.toStatus)
			.where(sql`${table.webhookReceiptId} is not null`),
	],
);

export const inviteDoNotMessages = pgTable(
	"invite_do_not_messages",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		identityId: text("identity_id").references(() => guestIdentities.id, {
			onDelete: "set null",
		}),
		phoneE164: text("phone_e164").notNull(),
		reasonNote: text("reason_note"),
		sourceLabel: text("source_label").default("operator").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdByMembershipId: text("created_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		revokedByMembershipId: text("revoked_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		revokedAt: timestamp("revoked_at"),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("invite_do_not_messages_wedding_phone_active_unique")
			.on(table.weddingId, table.phoneE164)
			.where(sql`${table.isActive} = true and ${table.revokedAt} is null`),
		index("invite_do_not_messages_wedding_active_idx").on(
			table.weddingId,
			table.isActive,
		),
	],
);

export const inviteSendRunsRelations = relations(
	inviteSendRuns,
	({ many, one }) => ({
		event: one(weddingEvents, {
			fields: [inviteSendRuns.eventId],
			references: [weddingEvents.id],
		}),
		messages: many(inviteMessages),
		createdByMembership: one(weddingMemberships, {
			fields: [inviteSendRuns.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		updatedByMembership: one(weddingMemberships, {
			fields: [inviteSendRuns.updatedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export const inviteMessagesRelations = relations(
	inviteMessages,
	({ many, one }) => ({
		run: one(inviteSendRuns, {
			fields: [inviteMessages.inviteRunId],
			references: [inviteSendRuns.id],
		}),
		event: one(weddingEvents, {
			fields: [inviteMessages.eventId],
			references: [weddingEvents.id],
		}),
		recipientGuestUnit: one(guestUnits, {
			fields: [inviteMessages.recipientGuestUnitId],
			references: [guestUnits.id],
		}),
		recipientIdentity: one(guestIdentities, {
			fields: [inviteMessages.recipientIdentityId],
			references: [guestIdentities.id],
		}),
		webhookReceipts: many(inviteWebhookReceipts),
		transitions: many(inviteLifecycleTransitions),
	}),
);

export const inviteWebhookReceiptsRelations = relations(
	inviteWebhookReceipts,
	({ many, one }) => ({
		message: one(inviteMessages, {
			fields: [inviteWebhookReceipts.inviteMessageId],
			references: [inviteMessages.id],
		}),
		transitions: many(inviteLifecycleTransitions),
	}),
);

export const inviteLifecycleTransitionsRelations = relations(
	inviteLifecycleTransitions,
	({ one }) => ({
		message: one(inviteMessages, {
			fields: [inviteLifecycleTransitions.inviteMessageId],
			references: [inviteMessages.id],
		}),
		webhookReceipt: one(inviteWebhookReceipts, {
			fields: [inviteLifecycleTransitions.webhookReceiptId],
			references: [inviteWebhookReceipts.id],
		}),
	}),
);

export const inviteDoNotMessagesRelations = relations(
	inviteDoNotMessages,
	({ one }) => ({
		identity: one(guestIdentities, {
			fields: [inviteDoNotMessages.identityId],
			references: [guestIdentities.id],
		}),
		createdByMembership: one(weddingMemberships, {
			fields: [inviteDoNotMessages.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		revokedByMembership: one(weddingMemberships, {
			fields: [inviteDoNotMessages.revokedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);
