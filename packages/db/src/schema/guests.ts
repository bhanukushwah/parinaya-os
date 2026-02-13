import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { weddingEvents } from "./events";
import { weddingMemberships } from "./governance";

export const guestSideEnum = pgEnum("guest_side", [
	"bride",
	"groom",
	"neutral",
]);

export const audienceOverrideTypeEnum = pgEnum("audience_override_type", [
	"include",
	"exclude",
]);

export const guestIdentities = pgTable(
	"guest_identities",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		normalizedPhoneE164: text("normalized_phone_e164").notNull(),
		displayLabel: text("display_label"),
		isActive: boolean("is_active").default(true).notNull(),
		isInviteable: boolean("is_inviteable").default(true).notNull(),
		deactivatedAt: timestamp("deactivated_at"),
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
		uniqueIndex("guest_identities_wedding_phone_unique").on(
			table.weddingId,
			table.normalizedPhoneE164,
		),
		index("guest_identities_wedding_active_idx").on(
			table.weddingId,
			table.isActive,
			table.isInviteable,
		),
	],
);

export const guestPeople = pgTable(
	"guest_people",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		identityId: text("identity_id").references(() => guestIdentities.id, {
			onDelete: "set null",
		}),
		fullName: text("full_name").notNull(),
		givenName: text("given_name"),
		familyName: text("family_name"),
		nickname: text("nickname"),
		side: guestSideEnum("side").default("neutral").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		isInviteable: boolean("is_inviteable").default(true).notNull(),
		notes: text("notes"),
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
		uniqueIndex("guest_people_identity_unique").on(table.identityId),
		index("guest_people_wedding_side_idx").on(
			table.weddingId,
			table.side,
			table.isActive,
		),
		index("guest_people_wedding_inviteable_idx").on(
			table.weddingId,
			table.isInviteable,
		),
	],
);

export const guestUnits = pgTable(
	"guest_units",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		displayName: text("display_name").notNull(),
		side: guestSideEnum("side").default("neutral").notNull(),
		deliveryIdentityId: text("delivery_identity_id").references(
			() => guestIdentities.id,
			{ onDelete: "set null" },
		),
		isActive: boolean("is_active").default(true).notNull(),
		isInviteable: boolean("is_inviteable").default(true).notNull(),
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
		uniqueIndex("guest_units_active_delivery_identity_unique")
			.on(table.weddingId, table.deliveryIdentityId)
			.where(
				sql`${table.isActive} = true and ${table.deliveryIdentityId} is not null`,
			),
		index("guest_units_wedding_side_idx").on(
			table.weddingId,
			table.side,
			table.isActive,
		),
		index("guest_units_wedding_inviteable_idx").on(
			table.weddingId,
			table.isInviteable,
		),
	],
);

export const guestUnitMembers = pgTable(
	"guest_unit_members",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		guestUnitId: text("guest_unit_id")
			.notNull()
			.references(() => guestUnits.id, { onDelete: "cascade" }),
		personId: text("person_id")
			.notNull()
			.references(() => guestPeople.id, { onDelete: "cascade" }),
		relationshipLabel: text("relationship_label"),
		isPrimaryContact: boolean("is_primary_contact").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		leftAt: timestamp("left_at"),
		createdByMembershipId: text("created_by_membership_id").references(
			(): AnyPgColumn => weddingMemberships.id,
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
		uniqueIndex("guest_unit_members_one_active_membership_per_person").on(
			table.weddingId,
			table.personId,
		),
		uniqueIndex("guest_unit_members_unique_active_pair")
			.on(table.guestUnitId, table.personId)
			.where(sql`${table.isActive} = true`),
		index("guest_unit_members_wedding_unit_active_idx").on(
			table.weddingId,
			table.guestUnitId,
			table.isActive,
		),
	],
);

export const guestTags = pgTable(
	"guest_tags",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		key: text("key").notNull(),
		label: text("label").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
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
		uniqueIndex("guest_tags_wedding_key_unique").on(table.weddingId, table.key),
		index("guest_tags_wedding_active_idx").on(table.weddingId, table.isActive),
	],
);

export const guestPersonTags = pgTable(
	"guest_person_tags",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		personId: text("person_id")
			.notNull()
			.references(() => guestPeople.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => guestTags.id, { onDelete: "cascade" }),
		appliedByMembershipId: text("applied_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("guest_person_tags_person_tag_unique").on(
			table.personId,
			table.tagId,
		),
		index("guest_person_tags_wedding_tag_idx").on(table.weddingId, table.tagId),
	],
);

export const guestUnitTags = pgTable(
	"guest_unit_tags",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		guestUnitId: text("guest_unit_id")
			.notNull()
			.references(() => guestUnits.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => guestTags.id, { onDelete: "cascade" }),
		appliedByMembershipId: text("applied_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("guest_unit_tags_unit_tag_unique").on(
			table.guestUnitId,
			table.tagId,
		),
		index("guest_unit_tags_wedding_tag_idx").on(table.weddingId, table.tagId),
	],
);

export const eventAudienceSelections = pgTable(
	"event_audience_selections",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		eventId: text("event_id")
			.notNull()
			.references(() => weddingEvents.id, { onDelete: "cascade" }),
		side: guestSideEnum("side"),
		searchText: text("search_text"),
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
		uniqueIndex("event_audience_selections_event_unique").on(table.eventId),
		index("event_audience_selections_wedding_event_idx").on(
			table.weddingId,
			table.eventId,
		),
	],
);

export const eventAudienceSelectionTags = pgTable(
	"event_audience_selection_tags",
	{
		id: text("id").primaryKey(),
		audienceSelectionId: text("audience_selection_id")
			.notNull()
			.references(() => eventAudienceSelections.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => guestTags.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("event_audience_selection_tags_unique").on(
			table.audienceSelectionId,
			table.tagId,
		),
	],
);

export const eventAudienceOverrides = pgTable(
	"event_audience_overrides",
	{
		id: text("id").primaryKey(),
		audienceSelectionId: text("audience_selection_id")
			.notNull()
			.references(() => eventAudienceSelections.id, { onDelete: "cascade" }),
		guestUnitId: text("guest_unit_id")
			.notNull()
			.references(() => guestUnits.id, { onDelete: "cascade" }),
		overrideType: audienceOverrideTypeEnum("override_type").notNull(),
		createdByMembershipId: text("created_by_membership_id").references(
			() => weddingMemberships.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("event_audience_overrides_unique").on(
			table.audienceSelectionId,
			table.guestUnitId,
			table.overrideType,
		),
		index("event_audience_overrides_lookup_idx").on(
			table.audienceSelectionId,
			table.overrideType,
		),
	],
);

export const guestIdentitiesRelations = relations(
	guestIdentities,
	({ many, one }) => ({
		people: many(guestPeople),
		deliveryGuestUnits: many(guestUnits),
		createdByMembership: one(weddingMemberships, {
			fields: [guestIdentities.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		updatedByMembership: one(weddingMemberships, {
			fields: [guestIdentities.updatedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export const guestPeopleRelations = relations(guestPeople, ({ many, one }) => ({
	identity: one(guestIdentities, {
		fields: [guestPeople.identityId],
		references: [guestIdentities.id],
	}),
	memberships: many(guestUnitMembers),
	tags: many(guestPersonTags),
	createdByMembership: one(weddingMemberships, {
		fields: [guestPeople.createdByMembershipId],
		references: [weddingMemberships.id],
	}),
	updatedByMembership: one(weddingMemberships, {
		fields: [guestPeople.updatedByMembershipId],
		references: [weddingMemberships.id],
	}),
}));

export const guestUnitsRelations = relations(guestUnits, ({ many, one }) => ({
	deliveryIdentity: one(guestIdentities, {
		fields: [guestUnits.deliveryIdentityId],
		references: [guestIdentities.id],
	}),
	members: many(guestUnitMembers),
	tags: many(guestUnitTags),
	audienceOverrides: many(eventAudienceOverrides),
	createdByMembership: one(weddingMemberships, {
		fields: [guestUnits.createdByMembershipId],
		references: [weddingMemberships.id],
	}),
	updatedByMembership: one(weddingMemberships, {
		fields: [guestUnits.updatedByMembershipId],
		references: [weddingMemberships.id],
	}),
}));

export const guestUnitMembersRelations = relations(
	guestUnitMembers,
	({ one }) => ({
		guestUnit: one(guestUnits, {
			fields: [guestUnitMembers.guestUnitId],
			references: [guestUnits.id],
		}),
		person: one(guestPeople, {
			fields: [guestUnitMembers.personId],
			references: [guestPeople.id],
		}),
		createdByMembership: one(weddingMemberships, {
			fields: [guestUnitMembers.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		updatedByMembership: one(weddingMemberships, {
			fields: [guestUnitMembers.updatedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export const guestTagsRelations = relations(guestTags, ({ many, one }) => ({
	personTags: many(guestPersonTags),
	unitTags: many(guestUnitTags),
	audienceSelectionTags: many(eventAudienceSelectionTags),
	createdByMembership: one(weddingMemberships, {
		fields: [guestTags.createdByMembershipId],
		references: [weddingMemberships.id],
	}),
	updatedByMembership: one(weddingMemberships, {
		fields: [guestTags.updatedByMembershipId],
		references: [weddingMemberships.id],
	}),
}));

export const guestPersonTagsRelations = relations(
	guestPersonTags,
	({ one }) => ({
		person: one(guestPeople, {
			fields: [guestPersonTags.personId],
			references: [guestPeople.id],
		}),
		tag: one(guestTags, {
			fields: [guestPersonTags.tagId],
			references: [guestTags.id],
		}),
		appliedByMembership: one(weddingMemberships, {
			fields: [guestPersonTags.appliedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export const guestUnitTagsRelations = relations(guestUnitTags, ({ one }) => ({
	guestUnit: one(guestUnits, {
		fields: [guestUnitTags.guestUnitId],
		references: [guestUnits.id],
	}),
	tag: one(guestTags, {
		fields: [guestUnitTags.tagId],
		references: [guestTags.id],
	}),
	appliedByMembership: one(weddingMemberships, {
		fields: [guestUnitTags.appliedByMembershipId],
		references: [weddingMemberships.id],
	}),
}));

export const eventAudienceSelectionsRelations = relations(
	eventAudienceSelections,
	({ many, one }) => ({
		event: one(weddingEvents, {
			fields: [eventAudienceSelections.eventId],
			references: [weddingEvents.id],
		}),
		tags: many(eventAudienceSelectionTags),
		overrides: many(eventAudienceOverrides),
		createdByMembership: one(weddingMemberships, {
			fields: [eventAudienceSelections.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
		updatedByMembership: one(weddingMemberships, {
			fields: [eventAudienceSelections.updatedByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);

export const eventAudienceSelectionTagsRelations = relations(
	eventAudienceSelectionTags,
	({ one }) => ({
		audienceSelection: one(eventAudienceSelections, {
			fields: [eventAudienceSelectionTags.audienceSelectionId],
			references: [eventAudienceSelections.id],
		}),
		tag: one(guestTags, {
			fields: [eventAudienceSelectionTags.tagId],
			references: [guestTags.id],
		}),
	}),
);

export const eventAudienceOverridesRelations = relations(
	eventAudienceOverrides,
	({ one }) => ({
		audienceSelection: one(eventAudienceSelections, {
			fields: [eventAudienceOverrides.audienceSelectionId],
			references: [eventAudienceSelections.id],
		}),
		guestUnit: one(guestUnits, {
			fields: [eventAudienceOverrides.guestUnitId],
			references: [guestUnits.id],
		}),
		createdByMembership: one(weddingMemberships, {
			fields: [eventAudienceOverrides.createdByMembershipId],
			references: [weddingMemberships.id],
		}),
	}),
);
