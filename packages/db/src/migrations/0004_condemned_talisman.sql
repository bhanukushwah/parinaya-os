CREATE TYPE "public"."rsvp_final_response" AS ENUM('accept', 'decline');--> statement-breakpoint
CREATE TYPE "public"."rsvp_flow_status" AS ENUM('active', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rsvp_flow_step" AS ENUM('identity-response', 'attendance-details', 'final-confirmation');--> statement-breakpoint
CREATE TYPE "public"."rsvp_source" AS ENUM('whatsapp', 'website');--> statement-breakpoint
CREATE TYPE "public"."website_otp_challenge_status" AS ENUM('pending', 'verified', 'expired', 'locked');--> statement-breakpoint
CREATE TYPE "public"."website_sync_stale_reason" AS ENUM('lag-threshold-exceeded', 'sync-error', 'never-synced', 'manual-override');--> statement-breakpoint
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
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_identity_id_guest_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."guest_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_flow_sessions" ADD CONSTRAINT "rsvp_flow_sessions_last_invite_message_id_invite_messages_id_fk" FOREIGN KEY ("last_invite_message_id") REFERENCES "public"."invite_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_flow_session_id_rsvp_flow_sessions_id_fk" FOREIGN KEY ("flow_session_id") REFERENCES "public"."rsvp_flow_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_guest_unit_id_guest_units_id_fk" FOREIGN KEY ("guest_unit_id") REFERENCES "public"."guest_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_person_responses" ADD CONSTRAINT "rsvp_person_responses_person_id_guest_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."guest_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_sync_states" ADD CONSTRAINT "website_sync_states_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rsvp_flow_sessions_wedding_event_phone_idx" ON "rsvp_flow_sessions" USING btree ("wedding_id","event_id","phone_e164");--> statement-breakpoint
CREATE INDEX "rsvp_flow_sessions_wedding_status_updated_idx" ON "rsvp_flow_sessions" USING btree ("wedding_id","flow_status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_flow_sessions_one_active_phone_unique" ON "rsvp_flow_sessions" USING btree ("wedding_id","event_id","phone_e164") WHERE "rsvp_flow_sessions"."flow_status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_person_responses_event_person_unique" ON "rsvp_person_responses" USING btree ("wedding_id","event_id","person_id");--> statement-breakpoint
CREATE INDEX "rsvp_person_responses_guest_unit_response_idx" ON "rsvp_person_responses" USING btree ("guest_unit_id","response","updated_at");--> statement-breakpoint
CREATE INDEX "website_otp_challenges_wedding_phone_status_idx" ON "website_otp_challenges" USING btree ("wedding_id","normalized_phone_e164","status");--> statement-breakpoint
CREATE UNIQUE INDEX "website_sync_states_wedding_event_unique" ON "website_sync_states" USING btree ("wedding_id","event_id") WHERE "website_sync_states"."event_id" is not null;--> statement-breakpoint
CREATE INDEX "website_sync_states_wedding_stale_idx" ON "website_sync_states" USING btree ("wedding_id","is_stale","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "website_trusted_sessions_token_hash_unique" ON "website_trusted_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "website_trusted_sessions_wedding_phone_active_idx" ON "website_trusted_sessions" USING btree ("wedding_id","normalized_phone_e164","expires_at");