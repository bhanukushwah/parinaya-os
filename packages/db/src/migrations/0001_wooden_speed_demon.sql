CREATE TYPE "public"."audience_override_type" AS ENUM('include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."guest_import_channel" AS ENUM('csv', 'contacts', 'manual-row');--> statement-breakpoint
CREATE TYPE "public"."guest_import_row_outcome" AS ENUM('created', 'updated', 'reactivated', 'warning_malformed_phone', 'skipped_no_phone');--> statement-breakpoint
CREATE TYPE "public"."guest_import_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."guest_side" AS ENUM('bride', 'groom', 'neutral');--> statement-breakpoint
CREATE TABLE "event_audience_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"audience_selection_id" text NOT NULL,
	"guest_unit_id" text NOT NULL,
	"override_type" "audience_override_type" NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_audience_selection_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"audience_selection_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_audience_selections" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text NOT NULL,
	"side" "guest_side",
	"search_text" text,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"normalized_phone_e164" text NOT NULL,
	"display_label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_inviteable" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_import_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"wedding_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"source_payload" jsonb NOT NULL,
	"raw_name" text,
	"raw_phone" text,
	"normalized_phone_e164" text,
	"resolved_identity_id" text,
	"resolved_person_id" text,
	"resolved_guest_unit_id" text,
	"outcome" "guest_import_row_outcome" DEFAULT 'skipped_no_phone' NOT NULL,
	"is_inviteable" boolean DEFAULT false NOT NULL,
	"warning_detail" text,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_import_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"channel" "guest_import_channel" NOT NULL,
	"status" "guest_import_run_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text,
	"source_file_name" text,
	"source_fingerprint" text,
	"rows_total" integer DEFAULT 0 NOT NULL,
	"rows_processed" integer DEFAULT 0 NOT NULL,
	"rows_created" integer DEFAULT 0 NOT NULL,
	"rows_updated" integer DEFAULT 0 NOT NULL,
	"rows_reactivated" integer DEFAULT 0 NOT NULL,
	"rows_warning" integer DEFAULT 0 NOT NULL,
	"rows_skipped" integer DEFAULT 0 NOT NULL,
	"rows_failed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_people" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"identity_id" text,
	"full_name" text NOT NULL,
	"given_name" text,
	"family_name" text,
	"nickname" text,
	"side" "guest_side" DEFAULT 'neutral' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_inviteable" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_person_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"person_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"applied_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_unit_members" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"guest_unit_id" text NOT NULL,
	"person_id" text NOT NULL,
	"relationship_label" text,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_unit_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"guest_unit_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"applied_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_units" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"display_name" text NOT NULL,
	"side" "guest_side" DEFAULT 'neutral' NOT NULL,
	"delivery_identity_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_inviteable" boolean DEFAULT true NOT NULL,
	"created_by_membership_id" text,
	"updated_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_audience_overrides" ADD CONSTRAINT "event_audience_overrides_audience_selection_id_event_audience_selections_id_fk" FOREIGN KEY ("audience_selection_id") REFERENCES "public"."event_audience_selections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_overrides" ADD CONSTRAINT "event_audience_overrides_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_overrides" ADD CONSTRAINT "event_audience_overrides_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_selection_tags" ADD CONSTRAINT "event_audience_selection_tags_audience_selection_id_event_audience_selections_id_fk" FOREIGN KEY ("audience_selection_id") REFERENCES "public"."event_audience_selections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_selection_tags" ADD CONSTRAINT "event_audience_selection_tags_tag_id_guest_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."guest_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_selections" ADD CONSTRAINT "event_audience_selections_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_selections" ADD CONSTRAINT "event_audience_selections_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audience_selections" ADD CONSTRAINT "event_audience_selections_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_identities" ADD CONSTRAINT "guest_identities_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_identities" ADD CONSTRAINT "guest_identities_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_rows" ADD CONSTRAINT "guest_import_rows_import_run_id_guest_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."guest_import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_rows" ADD CONSTRAINT "guest_import_rows_resolved_identity_id_guest_identities_id_fk" FOREIGN KEY ("resolved_identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_rows" ADD CONSTRAINT "guest_import_rows_resolved_person_id_guest_people_id_fk" FOREIGN KEY ("resolved_person_id") REFERENCES "public"."guest_people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_rows" ADD CONSTRAINT "guest_import_rows_resolved_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("resolved_guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_runs" ADD CONSTRAINT "guest_import_runs_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_runs" ADD CONSTRAINT "guest_import_runs_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_people" ADD CONSTRAINT "guest_people_identity_id_guest_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_people" ADD CONSTRAINT "guest_people_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_people" ADD CONSTRAINT "guest_people_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_person_tags" ADD CONSTRAINT "guest_person_tags_person_id_guest_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."guest_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_person_tags" ADD CONSTRAINT "guest_person_tags_tag_id_guest_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."guest_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_person_tags" ADD CONSTRAINT "guest_person_tags_applied_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("applied_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_tags" ADD CONSTRAINT "guest_tags_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_tags" ADD CONSTRAINT "guest_tags_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_members" ADD CONSTRAINT "guest_unit_members_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_members" ADD CONSTRAINT "guest_unit_members_person_id_guest_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."guest_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_members" ADD CONSTRAINT "guest_unit_members_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_members" ADD CONSTRAINT "guest_unit_members_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_tags" ADD CONSTRAINT "guest_unit_tags_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_tags" ADD CONSTRAINT "guest_unit_tags_tag_id_guest_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."guest_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_unit_tags" ADD CONSTRAINT "guest_unit_tags_applied_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("applied_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_units" ADD CONSTRAINT "guest_units_delivery_identity_id_guest_identities_id_fk" FOREIGN KEY ("delivery_identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_units" ADD CONSTRAINT "guest_units_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_units" ADD CONSTRAINT "guest_units_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_audience_overrides_unique" ON "event_audience_overrides" USING btree ("audience_selection_id","guest_unit_id","override_type");--> statement-breakpoint
CREATE INDEX "event_audience_overrides_lookup_idx" ON "event_audience_overrides" USING btree ("audience_selection_id","override_type");--> statement-breakpoint
CREATE UNIQUE INDEX "event_audience_selection_tags_unique" ON "event_audience_selection_tags" USING btree ("audience_selection_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_audience_selections_event_unique" ON "event_audience_selections" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_audience_selections_wedding_event_idx" ON "event_audience_selections" USING btree ("wedding_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_identities_wedding_phone_unique" ON "guest_identities" USING btree ("wedding_id","normalized_phone_e164");--> statement-breakpoint
CREATE INDEX "guest_identities_wedding_active_idx" ON "guest_identities" USING btree ("wedding_id","is_active","is_inviteable");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_import_rows_run_row_unique" ON "guest_import_rows" USING btree ("import_run_id","row_number");--> statement-breakpoint
CREATE INDEX "guest_import_rows_wedding_outcome_idx" ON "guest_import_rows" USING btree ("wedding_id","outcome","is_inviteable");--> statement-breakpoint
CREATE INDEX "guest_import_rows_phone_lookup_idx" ON "guest_import_rows" USING btree ("wedding_id","normalized_phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_import_runs_wedding_idempotency_unique" ON "guest_import_runs" USING btree ("wedding_id","idempotency_key") WHERE "guest_import_runs"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "guest_import_runs_wedding_status_idx" ON "guest_import_runs" USING btree ("wedding_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_people_identity_unique" ON "guest_people" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "guest_people_wedding_side_idx" ON "guest_people" USING btree ("wedding_id","side","is_active");--> statement-breakpoint
CREATE INDEX "guest_people_wedding_inviteable_idx" ON "guest_people" USING btree ("wedding_id","is_inviteable");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_person_tags_person_tag_unique" ON "guest_person_tags" USING btree ("person_id","tag_id");--> statement-breakpoint
CREATE INDEX "guest_person_tags_wedding_tag_idx" ON "guest_person_tags" USING btree ("wedding_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_tags_wedding_key_unique" ON "guest_tags" USING btree ("wedding_id","key");--> statement-breakpoint
CREATE INDEX "guest_tags_wedding_active_idx" ON "guest_tags" USING btree ("wedding_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_unit_members_one_active_membership_per_person" ON "guest_unit_members" USING btree ("wedding_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_unit_members_unique_active_pair" ON "guest_unit_members" USING btree ("guest_unit_id","person_id") WHERE "guest_unit_members"."is_active" = true;--> statement-breakpoint
CREATE INDEX "guest_unit_members_wedding_unit_active_idx" ON "guest_unit_members" USING btree ("wedding_id","guest_unit_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_unit_tags_unit_tag_unique" ON "guest_unit_tags" USING btree ("guest_unit_id","tag_id");--> statement-breakpoint
CREATE INDEX "guest_unit_tags_wedding_tag_idx" ON "guest_unit_tags" USING btree ("wedding_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_units_active_delivery_identity_unique" ON "guest_units" USING btree ("wedding_id","delivery_identity_id") WHERE "guest_units"."is_active" = true and "guest_units"."delivery_identity_id" is not null;--> statement-breakpoint
CREATE INDEX "guest_units_wedding_side_idx" ON "guest_units" USING btree ("wedding_id","side","is_active");--> statement-breakpoint
CREATE INDEX "guest_units_wedding_inviteable_idx" ON "guest_units" USING btree ("wedding_id","is_inviteable");