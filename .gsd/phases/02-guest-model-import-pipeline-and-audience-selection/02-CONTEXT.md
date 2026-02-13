# Phase 2: Guest Model, Import Pipeline, and Audience Selection - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver family-first guest data operations with deterministic identity handling and audience targeting.

</domain>

<decisions>
## Implementation Decisions

### Audience builder rules

- Audience inputs combine `side` + `tags` + `search` in the same query.
- Filter logic is `AND` across all active filters.
- Manual override is supported after filter results: explicit include and explicit exclude of specific `GuestUnit` records.
- Pre-send recipient count is the count of unique, active, eligible invite targets after dedupe and eligibility checks.

### Dedupe and identity rules

- Primary identity key is normalized phone only.
- Matching normalized phone with different names auto-merges into one person identity.
- If a matching identity is archived/deactivated, reactivate the existing target instead of creating a duplicate.
- Dedupe scope is workspace-wide.

### Import mapping behavior

- Import flow supports CSV upload, contacts import, and manual row entry.
- Minimum required field for an active invite target is phone.
- Rows with malformed phone values are imported with warning state and marked not inviteable.
- Side and tags mapping applies to both `People` and `GuestUnit`, using normalization.

### People vs GuestUnit behavior

- `GuestUnit` represents the household/family invite unit.
- A person may belong to one active `GuestUnit` at a time per workspace.
- Editing is available to Parent Admin and Family Coordinator, within role boundaries.
- Delivery resolution uses hybrid fallback: `GuestUnit`-level target first, then per-person if missing.

### KiloCode's Discretion

- Choose implementation details only where not specified above.
- Do not introduce product behavior outside this phase boundary.

</decisions>

<specifics>
## Specific Ideas

- Keep all identity operations deterministic by normalizing phone data at ingestion and matching stages.
- Ensure import warnings are visible and actionable without blocking non-inviteable record persistence.
- Treat audience count as a send-readiness metric, not a raw filter match count.

</specifics>

<deferred>
## Deferred Ideas

- Secondary identity signals (email/name heuristics) beyond phone-only matching.
- Multi-membership support where a person can be active in multiple `GuestUnit` records.

</deferred>

---

_Phase: 02-guest-model-import-pipeline-and-audience-selection_
_Context gathered: 2026-02-13_
