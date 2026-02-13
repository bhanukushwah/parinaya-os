CREATE TYPE "public"."event_lifecycle_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'invite-only');--> statement-breakpoint
CREATE TYPE "public"."visibility_grant_principal_type" AS ENUM('user', 'guest', 'group', 'contact');--> statement-breakpoint
CREATE TYPE "public"."gift_audit_action" AS ENUM('gift.publish', 'gift.hide', 'gift.disable', 'gift.edit', 'gift.item.edit', 'gift.contribution.create');--> statement-breakpoint
CREATE TYPE "public"."gift_contribution_source" AS ENUM('website', 'manual');--> statement-breakpoint
CREATE TYPE "public"."gifts_mode_status" AS ENUM('draft', 'published', 'hidden', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."audit_target_type" AS ENUM('wedding', 'event', 'membership', 'guest', 'gift', 'invite', 'system');--> statement-breakpoint
CREATE TYPE "public"."wedding_role" AS ENUM('owner', 'admin', 'coordinator');--> statement-breakpoint
CREATE TYPE "public"."audience_override_type" AS ENUM('include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."guest_import_channel" AS ENUM('csv', 'contacts', 'manual-row');--> statement-breakpoint
CREATE TYPE "public"."guest_import_row_outcome" AS ENUM('created', 'updated', 'reactivated', 'warning_malformed_phone', 'skipped_no_phone');--> statement-breakpoint
CREATE TYPE "public"."guest_import_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."guest_side" AS ENUM('bride', 'groom', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."rsvp_final_response" AS ENUM('accept', 'decline');--> statement-breakpoint
CREATE TYPE "public"."rsvp_flow_status" AS ENUM('active', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rsvp_flow_step" AS ENUM('identity-response', 'attendance-details', 'final-confirmation');--> statement-breakpoint
CREATE TYPE "public"."rsvp_source" AS ENUM('whatsapp', 'website');--> statement-breakpoint
CREATE TYPE "public"."website_otp_challenge_status" AS ENUM('pending', 'verified', 'expired', 'locked');--> statement-breakpoint
CREATE TYPE "public"."website_sync_stale_reason" AS ENUM('lag-threshold-exceeded', 'sync-error', 'never-synced', 'manual-override');--> statement-breakpoint
CREATE TYPE "public"."invite_lifecycle_transition_source" AS ENUM('dispatch', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."invite_message_lifecycle_status" AS ENUM('sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invite_policy_rejection_reason" AS ENUM('dnm_blocked', 'recipient_not_inviteable', 'missing_phone', 'missing_source', 'provider_configuration_missing');--> statement-breakpoint
CREATE TYPE "public"."invite_send_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."invite_webhook_auth_result" AS ENUM('verified', 'invalid_signature', 'invalid_payload', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."invite_webhook_receipt_status" AS ENUM('accepted', 'ignored', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_visibility_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"principal_type" "visibility_grant_principal_type" NOT NULL,
	"principal_id" text NOT NULL,
	"granted_by_membership_id" text,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wedding_events" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "event_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"visibility" "event_visibility" DEFAULT 'invite-only' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"actor_membership_id" text,
	"action_type" text NOT NULL,
	"target_type" "audit_target_type" NOT NULL,
	"target_id" text,
	"before_summary" jsonb,
	"after_summary" jsonb,
	"reason_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wedding_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "wedding_role" DEFAULT 'coordinator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_by_membership_id" text,
	"joined_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "rsvp_flow_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text NOT NULL,
	"guest_unit_id" text NOT NULL,
	"identity_id" text,
	"last_invite_message_id" text,
	"phone_e164" text NOT NULL,
	"flow_status" "rsvp_flow_status" DEFAULT 'active' NOT NULL,
	"current_step" "rsvp_flow_step" DEFAULT 'identity-response' NOT NULL,
	"step_index" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"last_inbound_at" timestamp,
	"last_outbound_at" timestamp,
	"final_response" "rsvp_final_response",
	"confirmation_summary" jsonb,
	"provider_conversation_id" text,
	"last_provider_message_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_person_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_session_id" text NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text NOT NULL,
	"guest_unit_id" text NOT NULL,
	"person_id" text NOT NULL,
	"response" "rsvp_final_response" NOT NULL,
	"source" "rsvp_source" DEFAULT 'whatsapp' NOT NULL,
	"response_revision" integer DEFAULT 1 NOT NULL,
	"responded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "website_otp_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"normalized_phone_e164" text NOT NULL,
	"code_hash" text NOT NULL,
	"status" "website_otp_challenge_status" DEFAULT 'pending' NOT NULL,
	"attempts_remaining" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_sync_states" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"event_id" text,
	"snapshot_version" integer DEFAULT 1 NOT NULL,
	"last_updated_at" timestamp,
	"last_successful_sync_at" timestamp,
	"lag_seconds" integer DEFAULT 0 NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"stale_reason" "website_sync_stale_reason",
	"last_error_detail" text,
	"last_error_at" timestamp,
	"projection" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_trusted_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_id" text NOT NULL,
	"normalized_phone_e164" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_visibility_grants" ADD CONSTRAINT "event_visibility_grants_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_visibility_grants" ADD CONSTRAINT "event_visibility_grants_granted_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("granted_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_events" ADD CONSTRAINT "wedding_events_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_gift_item_id_gift_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."gift_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_audit_events" ADD CONSTRAINT "gift_audit_events_actor_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD CONSTRAINT "gift_contributions_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD CONSTRAINT "gift_contributions_gift_item_id_gift_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."gift_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_items" ADD CONSTRAINT "gift_items_gifts_mode_id_gifts_modes_id_fk" FOREIGN KEY ("gifts_mode_id") REFERENCES "public"."gifts_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_memberships" ADD CONSTRAINT "wedding_memberships_invited_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("invited_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_identity_id_guest_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_last_invite_message_id_invite_messages_id_fk" FOREIGN KEY ("last_invite_message_id") REFERENCES "public"."invite_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_flow_session_id_rsvp_flow_sessions_id_fk" FOREIGN KEY ("flow_session_id") REFERENCES "public"."rsvp_flow_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_person_id_guest_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."guest_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_sync_states" ADD CONSTRAINT "website_sync_states_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "event_visibility_grants_unique_active" ON "event_visibility_grants" USING btree ("event_id","principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "event_visibility_grants_principal_lookup_idx" ON "event_visibility_grants" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "event_visibility_grants_event_created_idx" ON "event_visibility_grants" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_events_wedding_slug_unique" ON "wedding_events" USING btree ("wedding_id","slug");--> statement-breakpoint
CREATE INDEX "wedding_events_wedding_sort_idx" ON "wedding_events" USING btree ("wedding_id","sort_order");--> statement-breakpoint
CREATE INDEX "wedding_events_wedding_visibility_idx" ON "wedding_events" USING btree ("wedding_id","status","visibility");--> statement-breakpoint
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
CREATE INDEX "gifts_modes_wedding_status_updated_idx" ON "gifts_modes" USING btree ("wedding_id","mode_status","updated_at");--> statement-breakpoint
CREATE INDEX "audit_logs_wedding_created_idx" ON "audit_logs" USING btree ("wedding_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_memberships_wedding_user_unique" ON "wedding_memberships" USING btree ("wedding_id","user_id");--> statement-breakpoint
CREATE INDEX "wedding_memberships_wedding_role_idx" ON "wedding_memberships" USING btree ("wedding_id","role","is_active");--> statement-breakpoint
CREATE INDEX "wedding_memberships_wedding_created_idx" ON "wedding_memberships" USING btree ("wedding_id","created_at");--> statement-breakpoint
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
CREATE UNIQUE INDEX "guest_unit_members_one_active_membership_per_person" ON "guest_unit_members" USING btree ("wedding_id","person_id") WHERE "guest_unit_members"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_unit_members_unique_active_pair" ON "guest_unit_members" USING btree ("guest_unit_id","person_id") WHERE "guest_unit_members"."is_active" = true;--> statement-breakpoint
CREATE INDEX "guest_unit_members_wedding_unit_active_idx" ON "guest_unit_members" USING btree ("wedding_id","guest_unit_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_unit_tags_unit_tag_unique" ON "guest_unit_tags" USING btree ("guest_unit_id","tag_id");--> statement-breakpoint
CREATE INDEX "guest_unit_tags_wedding_tag_idx" ON "guest_unit_tags" USING btree ("wedding_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_units_active_delivery_identity_unique" ON "guest_units" USING btree ("wedding_id","delivery_identity_id") WHERE "guest_units"."is_active" = true and "guest_units"."delivery_identity_id" is not null;--> statement-breakpoint
CREATE INDEX "guest_units_wedding_side_idx" ON "guest_units" USING btree ("wedding_id","side","is_active");--> statement-breakpoint
CREATE INDEX "guest_units_wedding_inviteable_idx" ON "guest_units" USING btree ("wedding_id","is_inviteable");--> statement-breakpoint
CREATE INDEX "rsvp_flow_sessions_wedding_event_phone_idx" ON "rsvp_flow_sessions" USING btree ("wedding_id","event_id","phone_e164");--> statement-breakpoint
CREATE INDEX "rsvp_flow_sessions_wedding_status_updated_idx" ON "rsvp_flow_sessions" USING btree ("wedding_id","flow_status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_flow_sessions_one_active_phone_unique" ON "rsvp_flow_sessions" USING btree ("wedding_id","event_id","phone_e164") WHERE "rsvp_flow_sessions"."flow_status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_person_responses_event_person_unique" ON "rsvp_person_responses" USING btree ("wedding_id","event_id","person_id");--> statement-breakpoint
CREATE INDEX "rsvp_person_responses_guest_unit_response_idx" ON "rsvp_person_responses" USING btree ("guest_unit_id","response","updated_at");--> statement-breakpoint
CREATE INDEX "website_otp_challenges_wedding_phone_status_idx" ON "website_otp_challenges" USING btree ("wedding_id","normalized_phone_e164","status");--> statement-breakpoint
CREATE UNIQUE INDEX "website_sync_states_wedding_event_unique" ON "website_sync_states" USING btree ("wedding_id","event_id") WHERE "website_sync_states"."event_id" is not null;--> statement-breakpoint
CREATE INDEX "website_sync_states_wedding_stale_idx" ON "website_sync_states" USING btree ("wedding_id","is_stale","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "website_trusted_sessions_token_hash_unique" ON "website_trusted_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "website_trusted_sessions_wedding_phone_active_idx" ON "website_trusted_sessions" USING btree ("wedding_id","normalized_phone_e164","expires_at");--> statement-breakpoint
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