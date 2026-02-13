# Architecture Research - ParinayaOS v1.0 Core Wedding OS

**Researched:** 2026-02-13  
**Scope:** Integration architecture for new v1.0 capabilities on top of existing baseline  
**Confidence:** HIGH

## Baseline to Preserve

Validated baseline already exists and should be extended, not replaced:

- Monorepo split: `apps/web`, `apps/server`, `packages/*`.
- Typed app path: web -> oRPC client -> Elysia server -> router procedures.
- Auth/session baseline: Better Auth with protected procedures.
- Data baseline: Postgres + Drizzle with env validation and Turbo workflows.

Architectural principle for v1.0: **all new domain behavior lands in server/domain modules and async workers; web stays a typed consumer.**

## New Components and Services Needed

These are net-new capabilities required by v1.0 scope.

| New component/service | Purpose | Reliability role |
| --- | --- | --- |
| `WeddingDomain` (models + services) | Wedding, events, visibility, ordering, role-scoped operations | Canonical write authority |
| `GuestDomain` (Person + GuestUnit + UnitMember + dedupe) | Family-first identity model and deterministic phone dedupe | Prevents double sends and count drift |
| `InvitationDomain` + `RSVPDomain` | Event-wise targeting, invite lifecycle, RSVP state transitions | Canonical RSVP correctness |
| `MessagingOutbox` | Transactional queue table for send intents | Decouples user action from provider latency |
| `WhatsAppAdapter` | Meta Cloud API integration wrapper | External API isolation boundary |
| `WebhookIngestion` | Verify signature, store raw payloads, idempotent intake | Exactly-once effects on at-least-once delivery |
| `MessageWorker` runtime | Outbox dequeue, retries, throttling, dead-lettering | Send reliability under burst load |
| `ProjectionWorker` runtime | Headcount/pending/status projections | Fast read models, rebuildable |
| `ImportPipeline` | Google/CSV/phone ingest + normalization + merge suggestions | Data quality gate before invites |
| `ExportPipeline` | Vendor CSV generation from projections/canonical snapshots | Non-blocking heavy reads |
| `WebsitePublishService` | Versioned public payloads + cache invalidation | Public consistency and privacy control |
| `ConsentPolicyService` | Opt-in, 24h window, DNM hard-stop checks | Compliance boundary on send path |
| `AuditLogService` | Append-only actor + before/after + reason records | Trust and forensic traceability |

## Existing Components to Modify

These baseline components need extension to host new milestone capabilities.

| Existing component | Required modification |
| --- | --- |
| `packages/db` schema | Add wedding/event/guest/invitation/rsvp/messaging/projection/consent/audit tables and indexes |
| `packages/api/src/routers/index.ts` (or split routers) | Expand from scaffold routes to domain routers for events, guests, invitations, RSVP, dashboard, exports, website |
| `packages/api/src/context.ts` + auth middleware | Add wedding scope and role policy context for owner/admin/side-admin/viewer enforcement |
| `apps/server/src/index.ts` | Add webhook route mount, worker bootstrap wiring, and safer route segmentation for public/api surfaces |
| `apps/web` route/modules | Replace demo/prototype surfaces with parent operations flows (event mgmt, guest ops, bulk actions, dashboard, website settings) |
| `packages/env` | Add validated envs for WhatsApp credentials, webhook verification, queue/redis config, projection tuning |
| Existing observability path | Add correlation IDs and structured logs across command -> outbox -> provider -> webhook -> projection |

## Data Flow Changes (Delta from Current Baseline)

### 1) Outbound invite/reminder flow (new async spine)

1. Web action creates invite command through typed RPC.
2. Domain transaction writes canonical invite state + outbox rows atomically.
3. Worker dequeues outbox, applies compliance/throttle checks, sends via WhatsApp adapter.
4. Provider IDs and send attempts are persisted.
5. Status webhooks update message lifecycle and trigger projection updates.
6. Dashboard reads projection tables, not raw provider responses.

### 2) Inbound RSVP flow (webhook to canonical transition)

1. Webhook payload is signature-verified and stored raw with idempotency key.
2. Parser maps payload (interactive or fallback text) to RSVP intent.
3. Domain transition applies monotonic RSVP rules on canonical tables.
4. Projection worker refreshes headcount/pending/read-models.
5. Admin UI sees eventual-consistent update with freshness timestamp.

### 3) Import and dedupe flow (quality-first ingest)

1. Contacts land in staging with source metadata.
2. Shared normalizer enforces canonical phone format.
3. Deterministic dedupe and merge policy produce Person/GuestUnit writes.
4. Conflicts are surfaced for operator review; no silent destructive merge.
5. Search and selection projections refresh for bulk invite operations.

### 4) Website publish flow (versioned public projection)

1. Admin updates website/privacy config.
2. Domain increments publish version and stores visibility-filtered payload state.
3. Public renderer serves versioned projection.
4. Event/invite visibility changes invalidate and republish derived website payload.

## Reliability Boundaries (Messaging, Webhooks, Projections)

### Messaging reliability boundary

- Canonical invitation state is internal; WhatsApp is transport only.
- Sending is async-only through outbox/worker path.
- Retryable errors stay in queue with capped exponential backoff and DLQ.
- Compliance checks (opt-in, DNM, template/window) are hard gate before provider call.
- Operator-visible status is sourced from persisted state, never direct API response.

### Webhook reliability boundary

- Webhook endpoint is ingestion only: verify, persist, ack fast.
- Idempotency key required per provider event/message ID.
- Processing is replay-safe and order-tolerant with monotonic state transitions.
- Raw payload store is append-only for audit/reprocessing.
- Failed processing routes to retry/DLQ without losing original payload.

### Projection reliability boundary

- Projections are derived/read-only and can be rebuilt from canonical events/tables.
- Every parent-facing aggregate includes `as_of` freshness marker.
- Reconciliation jobs compare projection vs canonical to detect drift.
- Export pipeline reads projection or stable snapshots, not live mutable joins under load.
- SLO guardrails:
  - invite queue acknowledgement p95 < 1.5s
  - webhook-to-dashboard p95 < 5s
  - bulk enqueue (200 units) < 10s
  - export (1000 guests) p95 < 10s

## Sequencing and Build Order (Roadmap-Ready)

This order minimizes rework and protects reliability-critical dependencies.

1. **Domain foundation and policy core**
   - Schema expansion, role matrix, audit primitives, canonical entities.
2. **Guest ingestion and identity integrity**
   - Import pipeline, normalization, deterministic dedupe, merge workflows.
3. **Messaging infrastructure spine**
   - Outbox, worker runtime, WhatsApp adapter, retry/DLQ, correlation IDs.
4. **Webhook and RSVP state machine**
   - Verified ingestion, parser, idempotent RSVP transitions, replay safety.
5. **Projection and parent operations surface**
   - Headcount/pending/status projections, dashboard queries, exports.
6. **Public website and privacy controls**
   - Versioned publish pipeline, token/visibility enforcement, WhatsApp CTA.
7. **Hardening and operational readiness**
   - Reconciliation jobs, load tuning, failure drills, compliance reporting.

## Suggested Phase Structure for ROADMAP

- **Phase 1: Core Domain and Access Control** - canonical models, roles, audit foundation.
- **Phase 2: Guest Operations** - imports, dedupe, GuestUnit workflows, bulk audience selection.
- **Phase 3: Messaging Core** - outbox/workers/adapter/send reliability.
- **Phase 4: RSVP and Webhook Reliability** - idempotent ingestion + transition engine.
- **Phase 5: Dashboard and Exports** - projection-backed parent operational views.
- **Phase 6: Website, Privacy, and Gifts** - publish pipeline and scoped public access.
- **Phase 7: Reliability Hardening** - reconciliation, scale tuning, compliance/ops guardrails.

## Sources

- `.gsd/PROJECT.md` (validated baseline + active milestone scope)
- `.gsd/codebase/ARCHITECTURE.md`
- `.gsd/codebase/INTEGRATIONS.md`
- `.gsd/codebase/CONCERNS.md`
- `docs/PRD.md`
