# ParinayaOS v1.0 Core Wedding OS - Stack Additions

## Context

- Baseline is already validated and should remain unchanged: Bun + Turbo + React/Vite + Elysia/oRPC + Better Auth + Drizzle/Postgres.
- v1.0 work is domain expansion, not platform migration: multi-event ops, People/GuestUnit import + dedupe, WhatsApp invite/RSVP loop, parent dashboard/exports, lightweight website + gifts + role/audit controls.
- Reliability risk is in async workflows (bulk invite sends, webhooks, imports, exports), so additions should focus on queueing, idempotency, and operational observability.

## Recommended additions

- **Async orchestration:** `bullmq@^5` + `ioredis@^5` + dedicated worker app (`apps/worker`) for invite send jobs, webhook follow-up jobs, import normalization/dedupe jobs, and export generation.
- **WhatsApp adapter layer:** first-party Meta Cloud API client module in `packages/domain` or `packages/shared` using Elysia server-side fetch/http client; keep Graph version env-pinned (`WHATSAPP_GRAPH_VERSION`) and enforce template/window checks before enqueue.
- **Webhook safety:** signature verification + idempotency keys persisted in Postgres (`webhook_events` table); process via queue, not inline request path.
- **Import/dedupe pipeline:** `libphonenumber-js` for E.164 normalization, `fast-csv` for CSV streaming parse, Google People API ingestion using existing auth/session context for operator-initiated imports.
- **Search + projection performance:** Postgres `pg_trgm` extension and targeted indexes for phone/name/tag queries; projection tables/materialized views for parent dashboard counters and pending RSVP views.
- **Exports + artifacts:** `fast-csv` or `csv-stringify` for streaming CSV output; S3-compatible object storage (`@aws-sdk/client-s3`) for generated exports and optional webhook raw payload archival.
- **Role/audit hardening:** explicit role/permission matrix in app domain tables + append-only audit log table capturing actor, action, before/after snapshot, reason, and source channel (dashboard/website/webhook).

## Integration points

- **`apps/server` (Elysia):** add command endpoints/procedures for event management, People/GuestUnit CRUD/import trigger, invite orchestration, RSVP intake, dashboard reads, and export creation.
- **`apps/worker` (new):** BullMQ consumers for `invites.send`, `webhooks.process`, `imports.contacts`, `exports.generate`, `reconciliation.run`.
- **`packages/contracts` (oRPC):** add strongly typed contracts for multi-event operations, guest-unit selection/bulk actions, dashboard summaries, and export job status polling.
- **`packages/db` (Drizzle):** add tables for `events`, `event_visibility`, `people`, `guest_units`, `guest_unit_members`, `invite_dispatch`, `rsvp_responses`, `webhook_events`, `consent_ledger`, `audit_logs`, `export_jobs`.
- **`apps/web` (React/Vite):** parent dashboard views consume projection endpoints; lightweight website renders public/invite-only event visibility and gifts mode from server projections.
- **Compliance path:** all outbound sends pass through server-side policy gate (opt-in, DNM, template/window rule), never enforced only in UI.

## Avoid

- Do not replatform frontend/backend/auth stack during this milestone.
- Do not use Twilio/other BSP as primary WhatsApp path; v1 requirement is direct Meta Cloud API.
- Do not introduce Kafka/RabbitMQ or Elasticsearch/OpenSearch in v1; complexity is not justified for current scale.
- Do not process WhatsApp webhooks or bulk sends synchronously inside request handlers.
- Do not implement guest-login-heavy flows; keep WhatsApp-first zero-login interaction model.

## Risks

- **Webhook ordering + duplication:** out-of-order statuses can corrupt RSVP/invite state without strict idempotent transitions.
- **Phone identity drift:** inconsistent normalization across import channels can cause wrong merges/split households.
- **Compliance violations:** missing DNM/window/template enforcement can degrade quality rating and delivery.
- **Projection staleness:** parent dashboard/export counters can drift from canonical writes without reconciliation jobs and freshness metadata.
- **Queue operational debt:** retries/DLQ/replay tooling must be shipped early or failures become opaque in production.
