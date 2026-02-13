# Phase 1: Multi-Event Foundation + Governance Controls - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish event lifecycle and visibility controls with enforceable role and audit governance for all critical changes.

</domain>

<decisions>
## Implementation Decisions

### Event lifecycle rules

- Archived events must support soft restore.
- Event ordering is a global custom order, not per-user or per-view sorting.
- Concurrent edits resolve with last write wins.
- New events default to `draft` and `invite-only`.

### Visibility enforcement UX

- Invite-only link access flow is login first, then eligibility enforcement.
- Switching an event from public to invite-only revokes access immediately.
- Invite-only events never appear in public listings.
- Access-denied messaging uses a friendly, guided tone.

### Role boundary outcomes

- Blocked actions return a generic error only; do not expose required-role or escalation details.
- Role changes are permitted for owner and admin, with admin handling coordinator-level changes under owner top-level control context.
- Role-change reason note is optional.
- Coordinator permissions are balanced for operations: routine event and guest edits allowed, governance controls restricted.

### Audit trail expectations

- Audit retention target is 12 months.
- Audit access pattern is a central audit page.
- Minimum row detail includes a before/after summary, with actor/time/action context implied by audit requirements.
- Coordinators can view routine operational logs, including invite-send and guest-edit logs.

### KiloCode's Discretion

- Choose implementation details only where not specified above.
- Do not introduce new product behavior beyond the captured decisions.

</decisions>

<specifics>
## Specific Ideas

- No explicit external product references were provided.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 01-multi-event-foundation-governance-controls_
_Context gathered: 2026-02-13_
