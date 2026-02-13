CREATE TYPE "public"."event_lifecycle_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'invite-only');--> statement-breakpoint
CREATE TYPE "public"."visibility_grant_principal_type" AS ENUM('user', 'guest', 'group', 'contact');--> statement-breakpoint
CREATE TYPE "public"."audit_target_type" AS ENUM('wedding', 'event', 'membership', 'guest', 'invite', 'system');--> statement-breakpoint
CREATE TYPE "public"."wedding_role" AS ENUM('owner', 'admin', 'coordinator');--> statement-breakpoint
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_visibility_grants" ADD CONSTRAINT "event_visibility_grants_event_id_wedding_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."wedding_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_visibility_grants" ADD CONSTRAINT "event_visibility_grants_granted_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("granted_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_events" ADD CONSTRAINT "wedding_events_created_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_memberships" ADD CONSTRAINT "wedding_memberships_invited_by_membership_id_wedding_memberships_id_fk" FOREIGN KEY ("invited_by_membership_id") REFERENCES "public"."wedding_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "event_visibility_grants_unique_active" ON "event_visibility_grants" USING btree ("event_id","principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "event_visibility_grants_principal_lookup_idx" ON "event_visibility_grants" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "event_visibility_grants_event_created_idx" ON "event_visibility_grants" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_events_wedding_slug_unique" ON "wedding_events" USING btree ("wedding_id","slug");--> statement-breakpoint
CREATE INDEX "wedding_events_wedding_sort_idx" ON "wedding_events" USING btree ("wedding_id","sort_order");--> statement-breakpoint
CREATE INDEX "wedding_events_wedding_visibility_idx" ON "wedding_events" USING btree ("wedding_id","status","visibility");--> statement-breakpoint
CREATE INDEX "audit_logs_wedding_created_idx" ON "audit_logs" USING btree ("wedding_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_memberships_wedding_user_unique" ON "wedding_memberships" USING btree ("wedding_id","user_id");--> statement-breakpoint
CREATE INDEX "wedding_memberships_wedding_role_idx" ON "wedding_memberships" USING btree ("wedding_id","role","is_active");--> statement-breakpoint
CREATE INDEX "wedding_memberships_wedding_created_idx" ON "wedding_memberships" USING btree ("wedding_id","created_at");