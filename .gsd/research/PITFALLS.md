# Pitfalls Research - ParinayaOS v1.0 Core Wedding OS

**Scope:** Brownfield wedding-domain expansion with WhatsApp-first operations at real wedding scale (1000+ guests, 8-10 events).
**Researched:** 2026-02-13
**Use:** Roadmap input for phase-level risk prevention.

## Roadmap-Critical Pitfalls

| Pitfall | Warning signs | Prevention strategy | Phase to address |
| --- | --- | --- | --- |
| **Identity and dedupe correctness fails across import channels** | Duplicate people keep increasing after each import; invite count differs from unique reachable numbers; merges frequently need manual rollback | Enforce one canonical phone normalization pipeline (E.164 + country defaults), dedupe before write using deterministic identity keys, and require explicit merge workflows with audit trail | **Phase 2 - Guest model + imports** |
| **People -> GuestUnit migration corrupts historical RSVP state** | Historical event totals change after merge/split; old exports no longer match prior snapshots; support cannot identify source-of-truth row | Define immutable identity boundaries (`Person`, `GuestUnit`, membership, invitation, RSVP) before UI work, use versioned relinking rules, and run reversible backfills with simulation checks | **Phase 1 - Data foundation** |
| **WhatsApp policy non-compliance (opt-in, 24h window, DNM)** | Template/window errors spike; STOP/DNM contacts still receive reminders; ops team relies on manual suppression lists | Implement server-side send gate that hard-blocks non-compliant sends, with opt-in state model, conversation-window checks, approved-template mapping, and auditable reject reasons | **Phase 4 - WhatsApp compliance controls** |
| **Webhook ingestion is non-idempotent and order-sensitive** | Replay of same payload changes state; duplicate RSVP updates appear; message statuses move backward (read -> sent) | Store raw events append-only, dedupe by provider message/event IDs, enforce monotonic status transitions, and process via retry-safe workers + dead-letter queue | **Phase 4 - Messaging pipeline reliability** |
| **Role leakage in side-scoped collaboration** | Side Admin can export all guests; API response scope changes with crafted params; permission checks differ by endpoint | Centralize authorization matrix (`Owner/Admin/Side Admin/Viewer`) in policy layer, apply row-level scoping to read/write/export, and add negative auth tests for all role-scope combinations | **Phase 8 - Roles and security hardening** |
| **Projection drift across dashboard, website, and exports** | Website schedule differs from dashboard; export totals mismatch tiles; users perform manual recount before sharing with vendors | Keep one canonical write model, build async projections with replay/rebuild support, run scheduled reconciliation jobs, and expose freshness/version markers in UI | **Phase 5 + Phase 7 - RSVP/reporting consistency** |
| **Bulk operations collapse at wedding scale** | Invite 200+ units takes >10s; list interactions freeze on mobile; export jobs timeout under peak load | Use set-based DB mutations, queue heavy fan-out tasks, add indexes for side/tag/status/event filters, and enforce performance SLOs with scale fixtures in CI | **Phase 3 + Phase 7 - Audience operations + reporting performance** |
| **Website privacy boundaries are bypassed** | Private events accessible through shared links; multiple units use same token; invite-only payload appears in public response paths | Use high-entropy signed tokens bound to GuestUnit and scope, add expiry/rotation, disable cache for private payloads, and run abuse tests for token replay/link sharing | **Phase 6 - Website privacy and access control** |
| **RSVP parser fails on real-world WhatsApp replies** | High unrecognized-reply rate; manual RSVP correction load grows during invite peaks; free-text replies are dropped silently | Support mixed-format reply parsing (buttons + free text), add confidence scoring and human-review queue, and track parser precision/recall with language variants | **Phase 5 - RSVP capture robustness** |

## Phase Gating Checks (Roadmap-Ready)

- **Phase 2 gate:** Cross-source import replay yields stable unique identity count and zero silent merges.
- **Phase 4 gate:** Non-compliant send attempts are blocked with explicit machine-readable reasons; webhook replay is state-stable.
- **Phase 5/7 gate:** Dashboard, website, and export projections reconcile within defined freshness SLO.
- **Phase 8 gate:** Negative authorization suite proves no cross-side data read/write/export leakage.

## Sources

- `.gsd/PROJECT.md`
- `docs/PRD.md`
- Production reliability patterns for messaging/event-driven coordination systems
