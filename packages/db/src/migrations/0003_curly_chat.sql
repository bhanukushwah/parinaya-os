CREATE TYPE "public"."invite_lifecycle_transition_source" AS ENUM('dispatch', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."invite_message_lifecycle_status" AS ENUM('sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invite_policy_rejection_reason" AS ENUM('dnm_blocked', 'recipient_not_inviteable', 'missing_phone', 'missing_source', 'provider_configuration_missing');--> statement-breakpoint
CREATE TYPE "public"."invite_send_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."invite_webhook_auth_result" AS ENUM('verified', 'invalid_signature', 'invalid_payload', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."invite_webhook_receipt_status" AS ENUM('accepted', 'ignored', 'rejected');--> statement-breakpoint
CREATE TABLE "invite_do_not_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"identity_id" text,
	"phone_e164" text NOT NULL,
	"reason_note" text,
	"source_label" text DEFAULT 'operator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_membership_id" text,
	"revoked_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_lifecycle_transitions" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_message_id" text NOT NULL,
	"wedding_id" text NOT NULL,
	"from_status" "invite_message_lifecycle_status",
	"to_status" "invite_message_lifecycle_status" NOT NULL,
	"source" "invite_lifecycle_transition_source" NOT NULL,
	"webhook_receipt_id" text,
	"provider_event_at" timestamp,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"reason_note" text,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_run_id" text NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text NOT NULL,
	"recipient_guest_unit_id" text,
	"recipient_identity_id" text,
	"recipient_phone_e164" text NOT NULL,
	"lifecycle_status" "invite_message_lifecycle_status" DEFAULT 'failed' NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"rejection_reason" "invite_policy_rejection_reason",
	"provider_message_id" text,
	"provider_error_code" text,
	"provider_error_message" text,
	"dispatched_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"last_status_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_send_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text NOT NULL,
	"status" "invite_send_run_status" DEFAULT 'pending' NOT NULL,
	"template_name" text NOT NULL,
	"template_language" text DEFAULT 'en' NOT NULL,
	"audience_snapshot" jsonb NOT NULL,
	"total_candidates" integer DEFAULT 0 NOT NULL,
	"eligible_count" integer DEFAULT 0 NOT NULL,
	"blocked_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE "invite_webhook_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text,
	"invite_message_id" text,
	"provider_message_id" text,
	"event_status" "invite_message_lifecycle_status",
	"event_at" timestamp,
	"auth_result" "invite_webhook_auth_result" DEFAULT 'unknown' NOT NULL,
	"receipt_status" "invite_webhook_receipt_status" DEFAULT 'ignored' NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"error_detail" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "invite_do_not_messages" ADD CONSTRAINT "invite_do_not_messages_identity_id_guest_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_do_not_messages" ADD CONSTRAINT "invite_do_not_messages_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_do_not_messages" ADD CONSTRAINT "invite_do_not_messages_revoked_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("revoked_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_lifecycle_transitions" ADD CONSTRAINT "invite_lifecycle_transitions_invite_message_id_invite_messages_id_fk" FOREIGN KEY ("invite_message_id") REFERENCES "public"."invite_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_lifecycle_transitions" ADD CONSTRAINT "invite_lifecycle_transitions_webhook_receipt_id_invite_webhook_receipts_id_fk" FOREIGN KEY ("webhook_receipt_id") REFERENCES "public"."invite_webhook_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_messages" ADD CONSTRAINT "invite_messages_invite_run_id_invite_send_runs_id_fk" FOREIGN KEY ("invite_run_id") REFERENCES "public"."invite_send_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_messages" ADD CONSTRAINT "invite_messages_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_messages" ADD CONSTRAINT "invite_messages_recipient_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("recipient_guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_messages" ADD CONSTRAINT "invite_messages_recipient_identity_id_guest_identities_id_fk" FOREIGN KEY ("recipient_identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_send_runs" ADD CONSTRAINT "invite_send_runs_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_send_runs" ADD CONSTRAINT "invite_send_runs_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_send_runs" ADD CONSTRAINT "invite_send_runs_updated_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_webhook_receipts" ADD CONSTRAINT "invite_webhook_receipts_invite_message_id_invite_messages_id_fk" FOREIGN KEY ("invite_message_id") REFERENCES "public"."invite_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invite_do_not_messages_wedding_phone_active_unique" ON "invite_do_not_messages" USING btree ("wedding_id","phone_e164") WHERE "invite_do_not_messages"."is_active" = true and "invite_do_not_messages"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "invite_do_not_messages_wedding_active_idx" ON "invite_do_not_messages" USING btree ("wedding_id","is_active");--> statement-breakpoint
CREATE INDEX "invite_lifecycle_transitions_message_applied_idx" ON "invite_lifecycle_transitions" USING btree ("invite_message_id","applied_at");--> statement-breakpoint
CREATE INDEX "invite_lifecycle_transitions_wedding_status_idx" ON "invite_lifecycle_transitions" USING btree ("wedding_id","to_status","applied_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_lifecycle_transitions_webhook_dedupe_unique" ON "invite_lifecycle_transitions" USING btree ("webhook_receipt_id","to_status") WHERE "invite_lifecycle_transitions"."webhook_receipt_id" is not null;--> statement-breakpoint
CREATE INDEX "invite_messages_run_created_idx" ON "invite_messages" USING btree ("invite_run_id","created_at");--> statement-breakpoint
CREATE INDEX "invite_messages_event_status_idx" ON "invite_messages" USING btree ("event_id","lifecycle_status","last_status_at");--> statement-breakpoint
CREATE INDEX "invite_messages_wedding_phone_idx" ON "invite_messages" USING btree ("wedding_id","recipient_phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_messages_provider_message_id_unique" ON "invite_messages" USING btree ("provider_message_id") WHERE "invite_messages"."provider_message_id" is not null;--> statement-breakpoint
CREATE INDEX "invite_send_runs_wedding_event_created_idx" ON "invite_send_runs" USING btree ("wedding_id","event_id","created_at");--> statement-breakpoint
CREATE INDEX "invite_send_runs_wedding_status_created_idx" ON "invite_send_runs" USING btree ("wedding_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_webhook_receipts_dedupe_key_unique" ON "invite_webhook_receipts" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "invite_webhook_receipts_message_event_idx" ON "invite_webhook_receipts" USING btree ("provider_message_id","event_status","event_at");--> statement-breakpoint
CREATE INDEX "invite_webhook_receipts_wedding_received_idx" ON "invite_webhook_receipts" USING btree ("wedding_id","received_at");