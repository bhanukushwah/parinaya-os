# Feature Research

**Domain:** WhatsApp-first wedding coordination platform in India
**Researched:** 2026-02-13
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features expected for a credible India wedding coordination product. Missing these creates immediate trust and usability failure for Parent Admin + Family Coordinator workflows.

| Feature | Why Expected | Complexity | Key Dependencies | v1/v2 Behavior Expectation |
| --- | --- | --- | --- | --- |
| Multi-event wedding management (5-10+ events) | Indian weddings are inherently multi-function; single-event tools are unusable | MEDIUM | Wedding + Event models, ordering, event visibility rules | v1: create/edit/reorder events with public/invite-only flags; v2: richer defaults/templates + higher scale handling |
| Family-centric guest model (GuestUnit + People) | Invitations and RSVPs are household-first, not purely individual | HIGH | Person normalization (phone), GuestUnit membership, invite mapping | v1: invite ungrouped people as unit-of-one; v2: smoother merge/split conflict handling |
| Fast guest import + deterministic dedupe | Operators begin from phone contacts/CSV, not manual entry | HIGH | Google Contacts integration, CSV parser, E.164 normalization, duplicate merge rules | v1: Google + CSV + manual, phone-number dedupe; v2: stronger bulk cleanup and merge ergonomics |
| Event-wise audience selection + bulk invite actions | Not all guests attend all events; must support side/tag/search filtering | MEDIUM | Tags/sides taxonomy, Invitation state model, fast list ops | v1: filter + bulk select + counts; v2: smarter defaults and saved audiences |
| WhatsApp RSVP capture with zero login | WhatsApp is the practical guest UI in this market | HIGH | Meta Cloud API templates, webhook ingestion, status tracking, consent enforcement | v1: <=3 interaction RSVP, fallback parsing, DND support; v2: better reminder automation within policy |
| Parent-first dashboard + CSV exports | Core value is operational clarity (counts, pending, vendor sheets) | MEDIUM | Aggregation queries, RSVP confidence logic, export pipeline | v1: per-event counts + pending + vendor-ready exports; v2: improved operational views and prioritization |
| Lightweight wedding website synced to event source-of-truth | Families need one shareable link with always-current details | MEDIUM | Website config, event publish states, privacy/token gating | v1: publishable itinerary + WhatsApp CTA; v2: improved personalization without builder complexity |
| Gifts/registry (UPI/link-first, non-payment) | Gift expectations exist; India behavior is UPI/link oriented | MEDIUM | Gift config model, media storage for QR, role permissions/audit | v1: blessings/UPI/links; v2: optional reservation improvements |
| Role-based collaboration + critical audit logs | Multiple family operators edit live data; traceability is required | HIGH | Auth roles, authorization guards, audit event pipeline | v1: Owner/Admin/Side Admin/Viewer with critical edit logs; v2: tighter side-scoped controls + review workflows |

### Differentiators (Competitive Advantage)

Features that materially separate ParinayaOS from generic wedding platforms and directly reinforce the India-specific operating model.

| Feature | Value Proposition | Complexity | Key Dependencies | Why It Differentiates |
| --- | --- | --- | --- | --- |
| Household-first RSVP with uncertain count support (bucket + confidence) | Matches real RSVP behavior before final confirmations | HIGH | GuestUnit model, RSVP confidence states, aggregation math | Competing global tools optimize for precise individual RSVP too early |
| Zero-login WhatsApp-native RSVP flow with policy-aware fallback | Converts higher response in actual user channel while staying compliant | HIGH | Interactive templates, webhook parser, numeric fallback interpreter, DND controls | Practical execution of WhatsApp-first promise, not just link-sharing |
| Import-now, clean-later workflow (Saved As vs Invite Name + bulk cleanup) | Dramatically reduces setup friction for 300+ contact weddings | MEDIUM | Dual-name schema, inline editing UX, normalization utilities | Most tools assume clean data upfront; this embraces messy contact reality |
| Private/public event visibility across WhatsApp and website | Handles different invite audiences across multi-event weddings | HIGH | Event visibility rules, personalized token links, invite mapping | Critical for Indian multi-function guest segmentation, often weak in competitors |
| Parent-operational UX (one-tap counts/pending/export) | Delivers decisions-in-seconds for the real operators | MEDIUM | Fast aggregations, mobile-first IA, prefiltered exports | Strongly aligned to Parent Admin utility instead of couple-centric design-first UX |
| Gifts safety model (owner-only edits + audit + optional lock) | Reduces trust/fraud anxiety around editable gift details | MEDIUM | Role system, audit log, gift lock state | Region-appropriate gift handling without entering payments risk |

### Anti-Features (Commonly Requested, Often Problematic)

Features that appear attractive but conflict with domain reality, v1/v2 delivery constraints, or core product behavior.

| Anti-Feature | Why Requested | Why Problematic | Better Alternative |
| --- | --- | --- | --- |
| Full wedding website theme builder | Couples want visual uniqueness | Pulls product into design tooling, slows core coordination loop, increases support burden | Keep auto-generated site with minimal customization and strong content freshness |
| In-app payment collection/escrow for gifts | Seems like monetization and convenience | Regulatory/compliance complexity, fraud exposure, support overhead outside core coordination | UPI/link-first gifting with clear off-platform payment responsibility |
| Email-first invitation + RSVP stack | Familiar from global products | Low adoption for Indian family workflows; weakens WhatsApp-first conversion | WhatsApp-first outbound + optional web fallback |
| Mandatory perfect family grouping before invites | Feels "clean data" upfront | Blocks urgent sending, increases abandonment during setup | Allow unit-of-one invites; progressively improve grouping later |
| Dense per-guest meal/seating planner in core flow | Common wedding-planner request | High complexity, low v1 leverage, distracts from guest/event reliability | Defer to post-v2 modules after core coordination PMF |
| Open edit rights for all collaborators | Reduces perceived bottlenecks | Causes accidental/bad edits to events/gifts, destroys trust in source-of-truth | Role-based permissions + audit + restricted critical actions |
| Real-time custom chat inside product | "All-in-one" narrative appeal | Reinvents WhatsApp behavior poorly; heavy moderation/storage cost | Use WhatsApp for communication, product for operational state and exports |

## Feature Dependencies

```text
[Phone normalization + dedupe]
  └──requires──> [People import (Google/CSV/manual)]
  └──enables──>  [GuestUnit membership]

[GuestUnit membership]
  └──requires──> [Person model with E.164 phone]
  └──enables──>  [Event-wise invitation mapping]

[Event-wise invitation mapping]
  └──requires──> [Multi-event management]
  └──enables──>  [WhatsApp messaging + RSVP capture]

[WhatsApp messaging + RSVP capture]
  └──requires──> [Template management + opt-in policy handling]
  └──requires──> [Webhook ingestion + status processing]
  └──enables──>  [Dashboard counts + pending lists]

[Dashboard counts + exports]
  └──requires──> [RSVP state + confidence model]
  └──requires──> [Fast aggregate queries]

[Website publish + visibility]
  └──requires──> [Event visibility flags]
  └──requires──> [Tokenized invite-only access]
  └──enhances──> [WhatsApp invite CTA conversion]

[Gifts config]
  └──requires──> [Role permissions + audit logging]

[Role-based collaboration]
  └──requires──> [Auth + org role model]
  └──protects──> [Events, RSVP overrides, gifts]

[Theme builder ambitions]
  └──conflicts──> [Lightweight parent-friendly UX + fast publish]

[In-app payments]
  └──conflicts──> [Non-payment product boundary + low compliance overhead]
```

### Dependency Notes

- **Phone normalization is foundational:** dedupe and merge integrity depend on canonical phone identity (E.164), otherwise RSVP and messaging states drift.
- **GuestUnit before invitation orchestration:** household-level RSVP and event targeting both rely on stable invitation units.
- **WhatsApp reliability needs policy + webhook layers together:** sending without consent/window handling or receipt tracking creates legal and operational failure.
- **Dashboard quality is downstream of RSVP model quality:** confidence/range outputs are only useful if RSVP and merge rules are deterministic.
- **Website privacy correctness depends on invitation mapping:** invite-only events require tokenized linkage to selected audiences.
- **Gifts safety is not standalone:** gift features without role restrictions and audit logs create social trust and fraud risk.

## v1 vs v2 Capability Expectations

### v1 (Must deliver product promise)

- Multi-event setup, family-centric guest model, import + dedupe, event-wise invites, WhatsApp RSVP with fallback, parent dashboard + exports, lightweight website publish, gifts basics, role/audit baseline.

### v2 (Depth and scale enhancements)

- Better merge/split conflict resolution, smarter invite defaults and saved audience segments, stronger reminder orchestration under WhatsApp policy, richer operational prioritization views, improved token/privacy controls, safer gifts lock/review workflows.

## Sources

- `.gsd/PROJECT.md` - validated constraints, active requirements, and out-of-scope boundaries.
- `docs/PRD.md` - detailed feature requirements, acceptance criteria, user journeys, and India-specific operating assumptions.

---
*Feature research for: WhatsApp-first wedding coordination platform in India*
*Researched: 2026-02-13*
