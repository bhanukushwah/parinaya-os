CREATE TYPE "public"."gift_audit_action" AS ENUM('gift.publish', 'gift.hide', 'gift.disable', 'gift.edit', 'gift.item.edit', 'gift.contribution.create');--> statement-breakpoint
CREATE TYPE "public"."gift_contribution_source" AS ENUM('website', 'manual');--> statement-breakpoint
CREATE TYPE "public"."gifts_mode_status" AS ENUM('draft', 'published', 'hidden', 'disabled');--> statement-breakpoint
ALTER TYPE "public"."audit_target_type" ADD VALUE 'gift' BEFORE 'invite';--> statement-breakpoint
CREATE TABLE "gift_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"gifts_mode_id" text NOT NULL,
	"gift_item_id" text,
	"actor_membership_id" text,
	"action_type" "gift_audit_action" NOT NULL,
	"before_summary" jsonb,
	"after_summary" jsonb,
	"reason_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"gifts_mode_id" text NOT NULL,
	"gift_item_id" text NOT NULL,
	"contributor_name" text,
	"contributor_phone_e164" text,
	"note" text,
	"amount_paise" integer NOT NULL,
	"source" "gift_contribution_source" DEFAULT 'website' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_items" (
	"id" text PRIMARY KEY NOT NULL,
	"gifts_mode_id" text NOT NULL,
	"wedding_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_amount_paise" integer NOT NULL,
	"amount_raised_paise" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts_modes" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"mode_status" "gifts_mode_status" DEFAULT 'draft' NOT NULL,
	"upi_payee_name" text,
	"upi_id" text,
	"upi_qr_image_url" text,
	"message_note" text,
	"pre_publish_note" text,
	"disabled_reason" text,
	"draft_revision" integer DEFAULT 1 NOT NULL,
	"last_published_revision" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"hidden_at" timestamp,
	"disabled_at" timestamp,
	"last_state_changed_at" timestamp,
	"published_projection" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_gift_item_id_gift_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."gift_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_actor_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD CONSTRAINT "gift_contributions_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD CONSTRAINT "gift_contributions_gift_item_id_gift_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."gift_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_items" ADD CONSTRAINT "gift_items_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_audit_events_wedding_created_idx" ON "gift_audit_events" USING btree ("wedding_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_audit_events_mode_created_idx" ON "gift_audit_events" USING btree ("gifts_mode_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_audit_events_actor_created_idx" ON "gift_audit_events" USING btree ("actor_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_contributions_item_created_idx" ON "gift_contributions" USING btree ("gift_item_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_contributions_mode_created_idx" ON "gift_contributions" USING btree ("gifts_mode_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_contributions_wedding_created_idx" ON "gift_contributions" USING btree ("wedding_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_items_mode_sort_idx" ON "gift_items" USING btree ("gifts_mode_id","sort_order");--> statement-breakpoint
CREATE INDEX "gift_items_wedding_archived_idx" ON "gift_items" USING btree ("wedding_id","is_archived","updated_at");--> statement-breakpoint
CREATE INDEX "gift_items_wedding_completion_idx" ON "gift_items" USING btree ("wedding_id","completed_at");--> statement-breakpoint
CREATE INDEX "gift_items_wedding_progress_idx" ON "gift_items" USING btree ("wedding_id","target_amount_paise","amount_raised_paise");--> statement-breakpoint
CREATE UNIQUE INDEX "gifts_modes_wedding_unique" ON "gifts_modes" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "gifts_modes_wedding_status_updated_idx" ON "gifts_modes" USING btree ("wedding_id","mode_status","updated_at");
