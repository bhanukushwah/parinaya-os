# Pitfalls Research

**Domain:** WhatsApp-first, family-centric wedding coordination in India (brownfield expansion)
**Researched:** 2026-02-13
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Breaking RSVP history when retrofitting People -> GuestUnit

**What goes wrong:**
Teams add GuestUnit support on top of an existing person-centric model, then merges/splits overwrite historical RSVP and invitation state.

**Why it happens:**
Identity boundaries are unclear during migration; RSVP rows are rewritten instead of versioned/relinked with deterministic rules.

**How to avoid:**
Define canonical identity rules first (`Person`, `GuestUnit`, `UnitMember`, `Invitation`, `RSVP`), write merge/split conflict policy before UI, and run backfill with reversible migration scripts and audit events.

**Warning signs:**
- Same guest shows different RSVP counts across dashboard vs export
- Merge actions silently change old event counts
- Support asks "which record is source of truth?"

**Phase to address:**
Phase 1 - Data foundation and migration safety

---

### Pitfall 2: Non-idempotent WhatsApp webhook ingestion

**What goes wrong:**
Duplicate, delayed, or out-of-order delivery/reply webhooks create phantom states (e.g., message marked unread after read, RSVP processed twice).

**Why it happens:**
Cloud API webhooks are treated as exactly-once, and handlers mutate state directly without dedupe keys/version checks.

**How to avoid:**
Use idempotency keys from message IDs, append-only raw event store, monotonic status transitions, and retry-safe processors with dead-letter handling.

**Warning signs:**
- Reprocessing the same payload changes business state
- Sudden spikes in duplicate RSVP updates
- "Impossible" status transitions in logs

**Phase to address:**
Phase 4 - WhatsApp messaging + webhook pipeline

---

### Pitfall 3: Policy-unsafe messaging flows (opt-in, 24-hour window, DNM)

**What goes wrong:**
Invites/reminders are sent outside allowed template/service windows or to opted-out numbers, creating compliance and account risk.

**Why it happens:**
Product flow is built for convenience first; policy checks are added late as UI hints instead of send-time enforcement.

**How to avoid:**
Enforce policy in server-side send gate: opt-in state, conversation window, approved template mapping, and hard Do-Not-Message block with audit trail.

**Warning signs:**
- Manual "please ignore" fixes in operations channel
- STOP requests visible in chat but not enforced in sends
- Messaging failures concentrated on template/window errors

**Phase to address:**
Phase 4 - WhatsApp messaging + compliance controls

---

### Pitfall 4: Phone normalization drift across import channels

**What goes wrong:**
Google/CSV/manual imports create duplicate people for one real number, or worse, merge different people incorrectly.

**Why it happens:**
Each import path applies different normalization; dedupe is done after insert or by name+phone heuristics.

**How to avoid:**
Create one shared normalization pipeline (E.164 + country defaults + validation), dedupe on canonical phone hash, and require explicit merge UI for conflicts.

**Warning signs:**
- Duplicate rate grows with each import batch
- Bulk invite count differs from unique reachable phone count
- Operators stop trusting one-tap merge

**Phase to address:**
Phase 2 - Contact import + guest model

---

### Pitfall 5: Slow bulk audience operations at real wedding scale

**What goes wrong:**
Selection/invite/export flows work in dev but collapse with 1000+ guests and 8-10 events.

**Why it happens:**
N+1 queries, row-by-row updates, and unindexed filter dimensions (side/tags/status/event).

**How to avoid:**
Design for set-based mutations, async job queue for heavy actions, list virtualization, and DB indexes aligned to filter/sort patterns from day one.

**Warning signs:**
- "Invite 200 units" takes >10s
- Mobile browser freezes on filtered lists
- Export generation blocks request thread

**Phase to address:**
Phase 3 and Phase 7 - Audience operations + dashboard/export performance

---

### Pitfall 6: Authorization leakage in side-scoped collaboration

**What goes wrong:**
Side Admins accidentally see or edit opposite-side data through unscoped RPC procedures or shared list endpoints.

**Why it happens:**
Brownfield auth checks are route-level only; new wedding-domain scoping is not embedded in query layer and export endpoints.

**How to avoid:**
Implement domain authorization matrix (`Owner/Admin/Side Admin/Viewer`) in server policy layer, enforce row-level filters in every read/write/export, and add negative tests.

**Warning signs:**
- Same request returns different sides when query params change
- Side Admin can export all guests via CSV endpoint
- Permission checks duplicated inconsistently per handler

**Phase to address:**
Phase 8 - Roles, permissions, and security hardening

---

### Pitfall 7: Privacy leaks via personalized website links/tokens

**What goes wrong:**
Invite-only events become publicly accessible through guessable tokens, referrer leaks, or shared links without token binding.

**Why it happens:**
Website is treated as static public content while adding private event visibility as a late conditional.

**How to avoid:**
Use high-entropy signed tokens with expiry/rotation, strict token-to-GuestUnit binding, referrer-safe CTA handling, and cache controls for private pages.

**Warning signs:**
- Access logs show multiple units using same token unexpectedly
- Private events indexed/shared outside intended audience
- "Public link" and "invite-only link" return similar payloads

**Phase to address:**
Phase 6 - Website privacy and tokenized access

---

### Pitfall 8: Dashboard/website/message-state drift (multiple truths)

**What goes wrong:**
Counts on dashboard, website schedule, and message logs disagree after edits/retries, forcing families back to spreadsheets.

**Why it happens:**
Separate read models are updated inconsistently; no reconciliation jobs or freshness markers.

**How to avoid:**
Define one canonical write model, asynchronous projections with replay capability, reconciliation jobs, and "last updated" metadata surfaced to users.

**Warning signs:**
- Parent asks why export and tile count differ
- Event edit appears on website but not invite preview
- Frequent manual recounts before vendor sharing

**Phase to address:**
Phase 5 and Phase 7 - RSVP consistency + reporting reliability

---

### Pitfall 9: Audit logs added too late to be useful

**What goes wrong:**
Critical changes (event time edits, RSVP overrides, gift config changes) lack actor/before-after context when disputes happen.

**Why it happens:**
Audit is deferred as a "compliance enhancement" after core features ship.

**How to avoid:**
Add append-only audit events with actor, timestamp, before/after snapshot, reason code, and UI surfacing in every critical workflow from first implementation.

**Warning signs:**
- Logs show only "updated_at" without who/what
- Team cannot reconstruct why headcount changed
- Gift/UPI edits cannot be traced to a user

**Phase to address:**
Phase 1 and Phase 8 - Event model instrumentation + governance

---

### Pitfall 10: RSVP parser brittle to real WhatsApp behavior

**What goes wrong:**
Structured flows work in demo, but real guests reply in mixed language/format, causing dropped or wrong RSVP updates.

**Why it happens:**
Parser assumes button/list-only responses and English numeric patterns.

**How to avoid:**
Build tolerant parser with confidence scoring, support common free-text variants (including Hinglish patterns), and route low-confidence replies to human-review queue.

**Warning signs:**
- High share of "unrecognized response" events
- Families manually correcting RSVP frequently
- Parser accuracy drops during high-volume invite windows

**Phase to address:**
Phase 5 - RSVP engine and fallback handling

## Integration Gotchas

| Integration | Common mistake | Correct approach |
| --- | --- | --- |
| WhatsApp Cloud API | Treating webhooks as ordered/exactly-once | Idempotent consumers + state machine transitions |
| WhatsApp templates | Designing UX around free-form sends only | Template inventory mapped to journey/state |
| Google Contacts API | Assuming long-lived sync token and complete contact fields | Paginated fetch + token expiry handling + partial data tolerance |
| CSV import | Import-time schema looseness with silent coercion | Strict validation report + per-row error feedback |

## Performance Traps

| Trap | Symptoms | Prevention | When it breaks |
| --- | --- | --- | --- |
| Row-by-row invite writes | Slow bulk invite, DB saturation | Batch writes + queue workers | 200+ units per action |
| Unindexed RSVP filters | Dashboard lag on parent queries | Composite indexes by wedding/event/status/side | 50k+ RSVP rows |
| Recomputing counts on request | Export/timeouts during peak | Materialized projections + incremental refresh | 8-10 events, 1000+ guests |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention phase | Verification |
| --- | --- | --- |
| RSVP history corruption | Phase 1 | Merge/split simulation keeps historical totals stable |
| Webhook duplication/order issues | Phase 4 | Replay same/out-of-order payloads without state corruption |
| Policy-unsafe sends | Phase 4 | Send gate blocks non-compliant messages with auditable reason |
| Import dedupe drift | Phase 2 | Cross-source import test yields deterministic unique people |
| Bulk operation slowness | Phase 3/7 | 1000-guest benchmark meets invite/export SLA |
| Side-role data leakage | Phase 8 | Negative authorization tests pass for all role/scope combos |
| Website privacy leak | Phase 6 | Token abuse tests fail closed; private events never exposed |
| Cross-surface state drift | Phase 5/7 | Reconciliation job reports zero unresolved divergence |
| Missing auditability | Phase 1/8 | Critical edits include actor + before/after in audit view |
| Fragile free-text RSVP parsing | Phase 5 | Parser confidence and manual-review fallback hit target |

## Sources

- `.gsd/PROJECT.md`
- `docs/PRD.md`
- Brownfield implementation risk patterns from production messaging/workflow systems

---

_Pitfalls research for: ParinayaOS_
_Researched: 2026-02-13_
