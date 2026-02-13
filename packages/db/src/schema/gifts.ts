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

import { weddingMemberships } from "./governance";

export const giftsModeStatusEnum = pgEnum("gifts_mode_status", [
	"draft",
	"published",
	"hidden",
	"disabled",
]);

export const giftContributionSourceEnum = pgEnum("gift_contribution_source", [
	"website",
	"manual",
]);

export const giftAuditActionEnum = pgEnum("gift_audit_action", [
	"gift.publish",
	"gift.hide",
	"gift.disable",
	"gift.edit",
	"gift.item.edit",
	"gift.contribution.create",
]);

export const giftsModes = pgTable(
	"gifts_modes",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		modeStatus: giftsModeStatusEnum("mode_status").default("draft").notNull(),
		upiPayeeName: text("upi_payee_name"),
		upiId: text("upi_id"),
		upiQrImageUrl: text("upi_qr_image_url"),
		messageNote: text("message_note"),
		prePublishNote: text("pre_publish_note"),
		disabledReason: text("disabled_reason"),
		draftRevision: integer("draft_revision").default(1).notNull(),
		lastPublishedRevision: integer("last_published_revision")
			.default(0)
			.notNull(),
		publishedAt: timestamp("published_at"),
		hiddenAt: timestamp("hidden_at"),
		disabledAt: timestamp("disabled_at"),
		lastStateChangedAt: timestamp("last_state_changed_at"),
		publishedProjection: jsonb("published_projection"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("gifts_modes_wedding_unique").on(table.weddingId),
		index("gifts_modes_wedding_status_updated_idx").on(
			table.weddingId,
			table.modeStatus,
			table.updatedAt,
		),
	],
);

export const giftItems = pgTable(
	"gift_items",
	{
		id: text("id").primaryKey(),
		giftsModeId: text("gifts_mode_id")
			.notNull()
			.references(() => giftsModes.id, { onDelete: "cascade" }),
		weddingId: text("wedding_id").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		targetAmountPaise: integer("target_amount_paise").notNull(),
		amountRaisedPaise: integer("amount_raised_paise").default(0).notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		isArchived: boolean("is_archived").default(false).notNull(),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("gift_items_mode_sort_idx").on(table.giftsModeId, table.sortOrder),
		index("gift_items_wedding_archived_idx").on(
			table.weddingId,
			table.isArchived,
			table.updatedAt,
		),
		index("gift_items_wedding_completion_idx").on(
			table.weddingId,
			table.completedAt,
		),
		index("gift_items_wedding_progress_idx").on(
			table.weddingId,
			table.targetAmountPaise,
			table.amountRaisedPaise,
		),
	],
);

export const giftContributions = pgTable(
	"gift_contributions",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		giftsModeId: text("gifts_mode_id")
			.notNull()
			.references(() => giftsModes.id, { onDelete: "cascade" }),
		giftItemId: text("gift_item_id")
			.notNull()
			.references(() => giftItems.id, { onDelete: "cascade" }),
		contributorName: text("contributor_name"),
		contributorPhoneE164: text("contributor_phone_e164"),
		note: text("note"),
		amountPaise: integer("amount_paise").notNull(),
		source: giftContributionSourceEnum("source").default("website").notNull(),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("gift_contributions_item_created_idx").on(
			table.giftItemId,
			table.createdAt,
		),
		index("gift_contributions_mode_created_idx").on(
			table.giftsModeId,
			table.createdAt,
		),
		index("gift_contributions_wedding_created_idx").on(
			table.weddingId,
			table.createdAt,
		),
	],
);

export const giftAuditEvents = pgTable(
	"gift_audit_events",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		giftsModeId: text("gifts_mode_id")
			.notNull()
			.references(() => giftsModes.id, { onDelete: "cascade" }),
		giftItemId: text("gift_item_id").references(() => giftItems.id, {
			onDelete: "set null",
		}),
		actorMembershipId: text("actor_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		actionType: giftAuditActionEnum("action_type").notNull(),
		beforeSummary: jsonb("before_summary"),
		afterSummary: jsonb("after_summary"),
		reasonNote: text("reason_note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("gift_audit_events_wedding_created_idx").on(
			table.weddingId,
			table.createdAt,
		),
		index("gift_audit_events_mode_created_idx").on(
			table.giftsModeId,
			table.createdAt,
		),
		index("gift_audit_events_actor_created_idx").on(
			table.actorMembershipId,
			table.createdAt,
		),
	],
);

export const giftsModesRelations = relations(giftsModes, ({ many }) => ({
	items: many(giftItems),
	contributions: many(giftContributions),
	auditEvents: many(giftAuditEvents),
}));

export const giftItemsRelations = relations(giftItems, ({ many, one }) => ({
	mode: one(giftsModes, {
		fields: [giftItems.giftsModeId],
		references: [giftsModes.id],
	}),
	contributions: many(giftContributions),
	auditEvents: many(giftAuditEvents),
}));

export const giftContributionsRelations = relations(
	giftContributions,
	({ one }) => ({
		mode: one(giftsModes, {
			fields: [giftContributions.giftsModeId],
			references: [giftsModes.id],
		}),
		item: one(giftItems, {
			fields: [giftContributions.giftItemId],
			references: [giftItems.id],
		}),
	}),
);

export const giftAuditEventsRelations = relations(
	giftAuditEvents,
	({ one }) => ({
		mode: one(giftsModes, {
			fields: [giftAuditEvents.giftsModeId],
			references: [giftsModes.id],
		}),
		item: one(giftItems, {
			fields: [giftAuditEvents.giftItemId],
			references: [giftItems.id],
		}),
		actorMembership: one(weddingMemberships, {
			fields: [giftAuditEvents.actorMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export function computeGiftProgressPercent(input: {
	targetAmountPaise: number;
	amountRaisedPaise: number;
}) {
	if (input.targetAmountPaise <= 0) {
		return 0;
	}

	const boundedRaised = Math.max(
		0,
		Math.min(input.amountRaisedPaise, input.targetAmountPaise),
	);

	return Math.round((boundedRaised / input.targetAmountPaise) * 100);
}

export function remainingGiftAmountPaise(input: {
	targetAmountPaise: number;
	amountRaisedPaise: number;
}) {
	return Math.max(0, input.targetAmountPaise - input.amountRaisedPaise);
}

export function canAcceptGiftContribution(modeStatus: string) {
	return modeStatus === "published";
}

export const giftLifecycleTransitionSql = sql`
	case
		when 1 = 1 then 'managed-in-service'
	end
`;
