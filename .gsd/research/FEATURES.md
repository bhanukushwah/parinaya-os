# Feature Research - Milestone v1.0 Core Wedding OS

**Product:** ParinayaOS
**Domain:** Indian WhatsApp-first wedding operations
**Researched:** 2026-02-13
**Confidence:** HIGH

## Scope Lens For This Milestone

This document scopes only the wedding-domain capabilities listed in `.gsd/PROJECT.md` under **Current Milestone: v1.0 Core Wedding OS**. Foundation/auth/runtime are treated as already validated inputs.

## Table Stakes

Missing any of these breaks basic operational reliability for Parent Admins and Family Coordinators.

| Feature area | Why table stake in India | Complexity | Key dependency notes | Requirement-scoping guidance |
| --- | --- | --- | --- | --- |
| Multi-event operations (5-10+ events, ordering, visibility, auditability) | Indian weddings are multi-function by default (Haldi/Sangeet/Wedding/Reception etc.) | MEDIUM | Depends on Event model, sort order persistence, visibility flags, audit events | v1 must support create/edit/reorder + public vs invite-only; keep templates minimal and deterministic |
| Guest core: People + GuestUnit (family-first) | Invite and RSVP behavior is household-first, not individual-first | HIGH | Depends on `Person` with canonical phone, `GuestUnit` membership rules, primary recipient selection | v1 should allow unit-of-one invites; do not block send flow for incomplete grouping |
| High-speed onboarding (Google Contacts, CSV, manual/phone input) with deterministic dedupe | Real operators start from messy contacts and need speed over perfection | HIGH | Depends on E.164 normalization, duplicate merge policy, source attribution, bulk edits | v1 success gate: import 300+ contacts quickly and safely; prioritize deterministic phone dedupe over fuzzy matching |
| Event-wise audience selection + bulk invite actions | Different sides/tags attend different functions | MEDIUM | Depends on side/tag taxonomy, invitation mapping table, fast filter + bulk selection UX | v1 should include side/tag/search filters and explicit selected-count feedback before send |
| WhatsApp core loop: Cloud API invites, RSVP capture, webhook/status tracking, compliance controls | WhatsApp is the actual guest interface in India | HIGH | Depends on template lifecycle, webhook idempotency, opt-in + 24h policy handling, DND/STOP enforcement | v1 must ship reliable send->status->reply loop with numeric fallback parsing and audit trails |
| Parent operations dashboard + vendor-ready CSV exports | Parents need answers in seconds, not dashboards in theory | MEDIUM | Depends on RSVP state model, aggregate queries, export schema stability | v1 should optimize for three tasks: reception count, pending RSVPs, export for vendor calls |
| Lightweight wedding website sync + WhatsApp RSVP CTA | Families need one link that stays current under change | MEDIUM | Depends on publish state, event visibility mapping, tokenized invite-only access | v1 should be auto-generated and low bandwidth; no theme-builder surface |
| Gifts modes (Blessings/UPI/links) + controls | India gifting often uses UPI/link-first behavior | MEDIUM | Depends on GiftConfig, QR/media handling, role guard, audit logging | v1 should avoid payment rails entirely; keep owner-controlled edits by default |
| Role-based collaboration + critical audit logs | Multi-family operators need accountability and safe delegation | HIGH | Depends on Better Auth role projection, server authorization checks, append-only audit entries | v1 should lock critical edits (event time, RSVP override, gifts) behind scoped roles and log all changes |

## Differentiators

These are the highest-leverage capabilities that make ParinayaOS distinctly Indian and WhatsApp-native.

| Feature area | Strategic value | Complexity | Key dependency notes | Requirement-scoping guidance |
| --- | --- | --- | --- | --- |
| Household-first RSVP with uncertain-count support (bucket + confidence) | Mirrors real RSVP reality before final numbers settle | HIGH | Depends on GuestUnit RSVP model, count bucket + optional exact count, confidence field | v1 should support Estimated vs Confirmed and compute expected range per event |
| Zero-login WhatsApp RSVP in <=3 interactions | Converts better for elders and family groups than web forms | HIGH | Depends on interactive templates, reply parser, language-safe copy, webhook latency | v1 should optimize tap/tap/tap flow and fallback numeric replies (1/2/3/4/5+) |
| Import-now clean-later workflow (`saved_as_name` vs `invite_name`) | Cuts setup friction for large weddings with messy contact books | MEDIUM | Depends on dual-name fields, inline list editing, bulk cleanup actions | v1 should make invite name editing optional but quick; do not force pre-send cleanup |
| Private/public event visibility across website + invite links | Supports segmented audience operations across events | HIGH | Depends on event visibility policy, invite token resolution, website rendering guards | v1 should enforce invite-only events never leak on public link |
| Parent-first operational UX (counts/pending/export first) | Aligns product with who actually runs logistics | MEDIUM | Depends on task-centric IA, fast mobile list performance, high-contrast/low-cognitive controls | v1 requirements should prioritize decision actions over cosmetic analytics |
| Gifts trust/safety model (owner-only edits + audit + optional lock) | Reduces scam anxiety around editable payout details | MEDIUM | Depends on permission matrix, audit history, optional lock state near wedding date | v1 should include ownership guardrails before adding advanced registry depth |

## Anti-Features

These are common requests that would dilute milestone outcomes or create avoidable risk.

| Anti-feature area | Why requested | Complexity trap | Key dependency/risk notes | v1 alternative |
| --- | --- | --- | --- | --- |
| Full website theme builder | Couples want visual uniqueness | HIGH | Pulls engineering into template engines, asset pipelines, design tooling support | Keep auto-generated website with minimal branding controls |
| In-app gift payments/escrow | Feels convenient and monetizable | VERY HIGH | Payment compliance, fraud risk, dispute workflows, reconciliation overhead | UPI/link-first gifting with explicit off-platform payment responsibility |
| Email-first invite + RSVP channel | Familiar from global tools | MEDIUM | Splits delivery state and weakens WhatsApp response loop quality | Keep WhatsApp primary, optional tokenized web fallback only |
| Mandatory perfect family grouping before send | Appeals to data-purity mindset | HIGH | Blocks urgent operations and increases setup abandonment | Allow unit-of-one invites and progressive grouping |
| Dense seating and meal-planning core module | Common wedding software expectation | HIGH | Adds heavy data model + UI complexity unrelated to core milestone promise | Defer beyond v1 until coordination OS is stable |
| Open edit permissions for all collaborators | Feels faster in short term | MEDIUM | High accidental-change risk, weak accountability, trust erosion | Keep scoped roles + audit log for critical surfaces |
| In-app chat replacing WhatsApp | "All-in-one" aspiration | VERY HIGH | Rebuilds chat infrastructure without clear user adoption upside | Use WhatsApp for conversation; keep ParinayaOS as system-of-record |

## Cross-Feature Dependency Map

```text
[Phone normalization + dedupe]
  -> enables [People import quality]
  -> enables [GuestUnit integrity]

[GuestUnit integrity]
  -> enables [Event-wise invitations]
  -> enables [Household RSVP aggregation]

[Event-wise invitations]
  -> enables [WhatsApp send orchestration]
  -> enables [Website invite-only visibility]

[WhatsApp send orchestration + webhooks]
  -> enables [Live RSVP + status tracking]
  -> enables [Parent dashboard reliability]

[RSVP model (status/count/confidence)]
  -> enables [Headcount ranges]
  -> enables [Vendor export correctness]

[Role/permission model + audit logs]
  -> protects [Events, RSVP overrides, GiftConfig]
```

## Requirement Scoping Cuts (Actionable)

- Must-have v1 slice: multi-event + guest model + import/dedupe + event-wise invites + WhatsApp RSVP loop + parent dashboard/exports + lightweight website + gifts basics + roles/audit.
- Quality gates to encode in requirements: deterministic phone dedupe, <=3-step WhatsApp RSVP, dashboard update within seconds after webhook, and no invite-only event leakage on public website links.
- Complexity containment: avoid fuzzy dedupe, avoid custom chat, avoid payment rails, avoid theme-builder and seating modules in v1 requirement set.
- Sequencing guidance: lock data model and invitation mapping before WhatsApp orchestration; ship role/audit guardrails before enabling collaborative critical edits.

## Sources

- `.gsd/PROJECT.md` - milestone goal, active requirements, constraints, and out-of-scope boundaries.
- `docs/PRD.md` - India-specific workflows, acceptance criteria, and WhatsApp policy constraints.

---
*Feature research for: ParinayaOS v1.0 Core Wedding OS*
*Researched: 2026-02-13*
