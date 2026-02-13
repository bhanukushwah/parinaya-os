import { relations } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const weddingRoleEnum = pgEnum("wedding_role", [
	"owner",
	"admin",
	"coordinator",
]);

export const auditTargetTypeEnum = pgEnum("audit_target_type", [
	"wedding",
	"event",
	"membership",
	"guest",
	"invite",
	"system",
]);

export const weddingMemberships = pgTable(
	"wedding_memberships",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		userId: text("user_id").notNull(),
		role: weddingRoleEnum("role").default("coordinator").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		invitedByMembershipId: text("invited_by_membership_id").references(
			(): AnyPgColumn => weddingMemberships.id,
			{
				onDelete: "set null",
			},
		),
		joinedAt: timestamp("joined_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("wedding_memberships_wedding_user_unique").on(
			table.weddingId,
			table.userId,
		),
		index("wedding_memberships_wedding_role_idx").on(
			table.weddingId,
			table.role,
			table.isActive,
		),
		index("wedding_memberships_wedding_created_idx").on(
			table.weddingId,
			table.createdAt,
		),
	],
);

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: text("id").primaryKey(),
		weddingId: text("wedding_id").notNull(),
		actorMembershipId: text("actor_membership_id").references(
			() => weddingMemberships.id,
			{
				onDelete: "set null",
			},
		),
		actionType: text("action_type").notNull(),
		targetType: auditTargetTypeEnum("target_type").notNull(),
		targetId: text("target_id"),
		beforeSummary: jsonb("before_summary"),
		afterSummary: jsonb("after_summary"),
		reasonNote: text("reason_note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("audit_logs_wedding_created_idx").on(
			table.weddingId,
			table.createdAt,
		),
		index("audit_logs_actor_created_idx").on(
			table.actorMembershipId,
			table.createdAt,
		),
		index("audit_logs_created_at_idx").on(table.createdAt),
	],
);

export const weddingMembershipsRelations = relations(
	weddingMemberships,
	({ many, one }) => ({
		invitedByMembership: one(weddingMemberships, {
			fields: [weddingMemberships.invitedByMembershipId],
			references: [weddingMemberships.id],
		}),
		invitedMemberships: many(weddingMemberships),
		actorAuditLogs: many(auditLogs),
	}),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	actorMembership: one(weddingMemberships, {
		fields: [auditLogs.actorMembershipId],
		references: [weddingMemberships.id],
	}),
}));
