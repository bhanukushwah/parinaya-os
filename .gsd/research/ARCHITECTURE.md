# ParinayaOS Project Research - Architecture

**Researched:** 2026-02-13  
**Scope:** Brownfield architecture for WhatsApp-first wedding operations at high guest volume  
**Confidence:** HIGH (aligned to PROJECT.md constraints + PRD.md feature contracts)

<research_summary>

## Summary

ParinayaOS should use a domain-driven, event-oriented architecture on top of the existing typed monorepo baseline (React web, Elysia server, oRPC, Better Auth, Drizzle/Postgres). The core architectural decision is to treat **Wedding coordination state** (People, GuestUnits, Events, Invitations, RSVPs) as the system of record, and treat **WhatsApp Cloud API** as an external transport channel that is integrated asynchronously through an outbox + webhook ingestion pipeline.

For high guest volume (1000+ guests, 8-10 events), the architecture should separate interactive admin operations (low-latency reads/writes) from bulk/async operations (import, broadcast, delivery reconciliation, exports). This avoids coupling user-facing performance to external API throughput and webhook bursts.

**Primary recommendation:** Build bounded contexts first (Guest, Event, Invitation/RSVP, Messaging, Website/Export), then wire them via transactional domain events and idempotent async workers before expanding UX breadth.

</research_summary>

<architecture_patterns>

## Component Boundaries

### 1) Admin Experience Boundary (Web App)

- **Responsibility:** Parent/Admin-facing CRUD, bulk selection, dashboard counters, exports trigger, audit timeline views.
- **Inputs:** Typed oRPC queries/mutations only.
- **Outputs:** Domain commands (create event, invite audience, override RSVP, publish website).
- **Hard boundary:** No direct Meta API calls, no direct database access outside server contracts.

### 2) Core API Boundary (Server Domain Layer)

- **Responsibility:** Validate commands, enforce auth/roles/side visibility, persist domain state, emit domain events.
- **Subdomains:**
  - Wedding + roles
  - People + GuestUnits + dedupe
  - Events + visibility + ordering
  - Invitations + RSVP aggregates
  - Website + gifts config
- **Hard boundary:** Must remain source of truth; never trust webhook payload as canonical without reconciliation rules.

### 3) Messaging Orchestration Boundary (WhatsApp Integration)

- **Responsibility:**
  - Convert internal invite/reminder intents into template/interactives
  - Enqueue sends with throttling by phone number tier/window constraints
  - Process delivery/read/failure status callbacks
  - Process inbound replies and map to RSVP intents
- **Hard boundary:** Isolated adapter around WhatsApp Cloud API contracts; no product logic embedded in template handlers.

### 4) Async Processing Boundary (Workers + Queues)

- **Responsibility:** Bulk import normalization, send campaigns, webhook fan-in processing, export generation, retries, dead-letter recovery.
- **Hard boundary:** All long-running and retry-prone jobs run here, not in request/response path.

### 5) Projection/Read Model Boundary (Operational Views)

- **Responsibility:** Fast dashboard counters, pending lists, per-event headcount summaries, message status rollups.
- **Hard boundary:** Derived from canonical tables/events; rebuildable and eventually consistent.

### 6) Public Surface Boundary (Wedding Website + Guest Tokens)

- **Responsibility:** Public/invite-only website rendering, tokenized guest-specific visibility, WhatsApp CTA and optional fallback RSVP.
- **Hard boundary:** No admin privilege escalation path; token scopes must be limited to specific wedding/guest unit visibility.

### 7) Compliance/Audit Boundary

- **Responsibility:** Consent/opt-in ledger, Do-Not-Message enforcement, retention windows, critical-change audit log.
- **Hard boundary:** Messaging send path must query compliance state before enqueue.

## Data Flow (Explicit)

### A) Outbound Invite/Reminder Flow

1. Admin selects GuestUnits for Event(s) in web UI.
2. API validates permissions, event visibility, and target eligibility.
3. API persists `Invitation` intent and writes `MessageOutbox` records in same transaction.
4. Worker dequeues outbox rows, applies throughput/window checks, calls WhatsApp Cloud API.
5. Provider message IDs are stored and correlated.
6. Webhook status updates arrive (`sent`, `delivered`, `read`, `failed`) and update `MessageLog` + projections.
7. Dashboard reads projection tables for near-real-time status.

### B) Inbound RSVP Flow (Interactive + Fallback)

1. Guest replies via interactive button/list or plain text numeric fallback.
2. Webhook endpoint verifies signature, stores raw payload idempotently.
3. Parser maps payload to RSVP intent (`Yes/No/Maybe`, count bucket/exact, event scope).
4. Domain service applies state transition rules to `RSVP` records.
5. Aggregate projections (event headcount, pending list) update asynchronously.
6. Admin UI reflects updates via polling/revalidate or live push.

### C) Contact Import Flow (Google/CSV/Phone)

1. Source contacts enter staging table with provenance metadata.
2. Normalizer enforces phone E.164 and deterministic dedupe by phone.
3. Domain creates/updates `Person` and optional unit-of-one `GuestUnit`.
4. Conflicts/duplicates are surfaced as merge suggestions (not silent destructive merge).
5. Projection refreshes searchable guest index.

### D) Website Publish Flow

1. Admin updates website config/privacy/cover.
2. API persists config and bumps website version stamp.
3. Public site serves cached render keyed by version stamp.
4. Event edits invalidate impacted website cache and update `last_updated` marker.

## State Ownership Model

- **Canonical tables:** Wedding, Event, Person, GuestUnit, UnitMember, Invitation, RSVP, MessageLog, WebsiteConfig, GiftConfig, AuditLog, Consent.
- **External truth (non-canonical):** WhatsApp delivery lifecycle and inbound payloads.
- **Rule:** External events can mutate canonical state only through validated domain transitions + idempotency keys.

</architecture_patterns>

<sequencing_implications>

## Build-Order Implications (Concrete)

### Sequence 1 - Domain Kernel Before Channel Features

- Build Wedding/Event/GuestUnit/Invitation/RSVP schema + role checks first.
- Reason: Messaging and website are downstream consumers of these entities.

### Sequence 2 - Idempotent Messaging Spine Before RSVP UX Polish

- Build outbox, queue workers, webhook verification, correlation IDs, retry/DLQ.
- Reason: Without this spine, high-volume sending and reliable state tracking will collapse.

### Sequence 3 - Read Projections Before Parent Dashboard Promise

- Build aggregation/projection jobs for event counters, pending RSVP, status funnels.
- Reason: direct heavy SQL over canonical tables will degrade at 1000+ guest scale.

### Sequence 4 - Import + Dedupe Before Bulk Invite Features

- Ship source import, normalization, deterministic dedupe, merge workflow.
- Reason: garbage-in contact data multiplies messaging failures and duplicate sends.

### Sequence 5 - Compliance Gate Before Automated Reminders

- Implement opt-in ledger, DNM, 24h window policy checks in send pipeline.
- Reason: policy violations create account quality degradation and delivery risk.

### Sequence 6 - Public Website After Privacy/Token Enforcement

- Implement token scopes and event-visibility checks before broad sharing UX.
- Reason: invite-only event leakage is a hard trust failure.

### Suggested Phase Skeleton for Roadmap Structuring

1. **Foundation Expansion:** Domain schema + role guardrails + audit primitives.
2. **Guest Operations:** Import/dedupe + GuestUnit workflows + bulk selection.
3. **Messaging Core:** Outbox/queue, Cloud API adapter, webhook ingestion, status tracking.
4. **RSVP Intelligence:** Interactive + fallback parsing, RSVP transitions, headcount projections.
5. **Parent Operations Surface:** Dashboard, pending queues, exports.
6. **Public Experience:** Website publish/privacy/tokenized views + gifts config.
7. **Hardening:** Throughput tuning, failure drills, retention/compliance automation.

</sequencing_implications>

<failure_modes>

## Failure Modes and Operational Concerns

### WhatsApp/API-Level Failures

- **Template rejection / quality downgrade / tier throttling** -> send backlog growth.
- **Mitigation:** queue rate control, campaign chunking, template health telemetry, fallback share mode.

### Webhook Reliability Failures

- **Duplicate, out-of-order, delayed callbacks** -> incorrect status/RSVP transitions.
- **Mitigation:** signed payload verify, idempotency key store, monotonic transition rules.

### Data Integrity Failures

- **Duplicate persons/units from imports** -> double messaging, count drift.
- **Mitigation:** deterministic phone dedupe, merge conflict workflow, immutable import provenance.

### Aggregation Drift

- **Dashboard counts diverge from canonical RSVP rows** under async lag.
- **Mitigation:** projection lag metrics, reconciliation jobs, "as of" timestamp in UI.

### Bulk Operation Hotspots

- **Mass invite/export triggers DB and queue contention.**
- **Mitigation:** batched writes, cursor-based processing, backpressure, per-wedding concurrency caps.

### Security/Privacy Failures

- **Invite-only events exposed via weak token design.**
- **Mitigation:** scoped signed tokens, short expiry/rotation, strict audience predicates.

### Compliance Failures

- **Sends to DNM or outside allowed windows.**
- **Mitigation:** compliance check in enqueue path (hard stop), immutable consent ledger, audit reporting.

### Observability Gaps

- **No per-wedding traceability for message lifecycle.**
- **Mitigation:** correlation IDs from command -> outbox -> provider message ID -> webhook event.

## Minimum Operational SLO Targets (Planning Anchors)

- Admin action acknowledgement (invite queued): p95 < 1.5s.
- RSVP webhook to dashboard visibility: p95 < 5s.
- Bulk invite enqueue (200 units): < 10s.
- Export generation (1000 guests): p95 < 10s.
- Webhook processing success rate: > 99.9% with replay support.

</failure_modes>

<implementation_notes>

## Brownfield Fit Notes

- Reuse existing typed contract path (web -> oRPC -> Elysia) as the only write path for admin actions.
- Add a dedicated messaging module package/service adapter rather than scattering API calls in route handlers.
- Keep worker runtime isolated from request runtime but sharing schema/contracts package.
- Add projection tables/materialized views incrementally; avoid premature distributed architecture.

</implementation_notes>

<sources>

## Sources

### Primary

- `.gsd/PROJECT.md` - product constraints, validated baseline, scaling and compliance requirements.
- `docs/PRD.md` - feature contracts, data model targets, WhatsApp behavior and acceptance criteria.

### Secondary

- Existing monorepo architecture assumptions from PROJECT context referencing `.gsd/codebase/*` artifacts.

</sources>

<metadata>

## Metadata

- **Research type:** Project Research (Architecture dimension)
- **Milestone context:** Brownfield subsequent milestone
- **Decision readiness:** Ready to inform roadmap phase decomposition
- **Valid until:** Next major scope change or WhatsApp policy/throughput constraint updates

</metadata>
