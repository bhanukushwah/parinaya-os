import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { weddingMemberships } from "./governance";

export const eventLifecycleStatusEnum = pgEnum("event_lifecycle_status", [
	"draft",
	"published",
	"archived",
]);

export const eventVisibilityEnum = pgEnum("event_visibility", [
	"public",
	"invite-only",
]);

export const visibilityGrantPrincipalTypeEnum = pgEnum(
	"visibility_grant_principal_type",
	["user", "guest", "group", "contact"],
);

export const weddingEvents = pgTable(
	"wedding_events",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		description: text("description"),
		status: eventLifecycleStatusEnum("status").default("draft").notNull(),
		visibility: eventVisibilityEnum("visibility")
			.default("invite-only")
			.notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		startsAt: timestamp("starts_at"),
		endsAt: timestamp("ends_at"),
		publishedAt: timestamp("published_at"),
		archivedAt: timestamp("archived_at"),
		createdByMembershipId: text("created_by_membership_id").references(
			() => weddingMemberships.id,
			{
				onDelete: "set null",
			},
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("wedding_events_wedding_slug_unique").on(
			table.weddingId,
			table.slug,
		),
		index("wedding_events_wedding_sort_idx").on(
			table.weddingId,
			table.sortOrder,
		),
		index("wedding_events_wedding_visibility_idx").on(
			table.weddingId,
			table.status,
			table.visibility,
		),
	],
);

export const eventVisibilityGrants = pgTable(
	"event_visibility_grants",
	{
		id: text("id").primaryKey(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		principalType: visibilityGrantPrincipalTypeEnum("principal_type").notNull(),
		principalId: text("principal_id").notNull(),
		grantedByMembershipId: text("granted_by_membership_id").references(
			() => weddingMemberships.id,
			{
				onDelete: "set null",
			},
		),
		expiresAt: timestamp("expires_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("event_visibility_grants_unique_active").on(
			table.eventId,
			table.principalType,
			table.principalId,
		),
		index("event_visibility_grants_principal_lookup_idx").on(
			table.principalType,
			table.principalId,
		),
		index("event_visibility_grants_event_created_idx").on(
			table.eventId,
			table.createdAt,
		),
	],
);

export const weddingEventsRelations = relations(
	weddingEvents,
	({ many, one }) => ({
		createdByMembership: one(weddingMemberships, {
			fields: [weddingEvents.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		visibilityGrants: many(eventVisibilityGrants),
	}),
);

export const eventVisibilityGrantsRelations = relations(
	eventVisibilityGrants,
	({ one }) => ({
		event: one(weddingEvents, {
			fields: [eventVisibilityGrants.eventId],
			references: [weddingEvents.id],
		}),
		grantedByMembership: one(weddingMemberships, {
			fields: [eventVisibilityGrants.grantedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);
