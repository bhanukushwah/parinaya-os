# Phase 5: Parent Operations Dashboard and Exports - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers real-time operational visibility and vendor-ready CSV outputs for existing guest/invite/RSVP data. Scope is limited to counts, filtering, and exports for event coordination decisions.

</domain>

<decisions>
## Implementation Decisions

### Metric Definitions

- Canonical counting grain for RSVP metrics is **person-level**.
- `invited`: count of active, inviteable people belonging to currently selected event audience (after side/status filters).
- `responded`: count of people with a current RSVP response record for the selected event (`accept` or `decline`).
- `accepted`: count of people whose current RSVP response is `accept`.
- `declined`: count of people whose current RSVP response is `decline`.
- `pending`: `invited - responded` (clamped at zero).
- Dashboard counts are computed from current DB state at query time (live operational view, not historical snapshots).

### Filter Behavior

- Default filter state on load: `event=all`, `side=all`, `rsvpStatus=all`.
- Filters compose with strict **AND** logic.
- `rsvpStatus` filtering maps to:
  - `accepted` -> response `accept`
  - `declined` -> response `decline`
  - `responded` -> response in (`accept`, `decline`)
  - `pending` -> no RSVP response for invited person
- Filter state persists in URL query params so operators can reload/share the same view.
- Provide a single `Reset filters` action that returns to `all/all/all`.

### Export Contract

- CSV export uses **person-detail rows** as the default contract (one row per intended person record).
- Each row includes guest-unit context to remain vendor-usable without additional joins.
- Stable header order:
  - `event_id,event_title,event_date,side,guest_unit_id,guest_unit_name,delivery_phone_e164,person_id,person_name,rsvp_status,responded_at,last_invite_status,last_invite_at`
- Export data uses the exact same filter/query semantics as dashboard counts.
- Export ordering is deterministic: event date -> side -> guest unit name -> person name.

### Ops Readability

- Dashboard shows `Data as of <timestamp>` from the max relevant update timestamp for the filtered dataset.
- Before export, UI shows expected export row count using the same query contract.
- Empty-state behavior:
  - No invited records: `No inviteable recipients match current filters.`
  - Invited exists but no responses: `Awaiting RSVP responses for this audience.`
  - Filtered result empty: `No records for selected filters. Reset filters to broaden results.`

### KiloCode's Discretion

- Visualization choice for count cards/table arrangement.
- Exact placement and styling of filter controls and empty-state components.
- CSV generation mechanism (streamed vs buffered) as long as header/order contract remains stable.

</decisions>

<specifics>
## Specific Ideas

- Maintain strict count/export alignment by reusing a shared query builder/service between dashboard and export endpoints.
- Include operational freshness indicator prominently near primary counts to reduce stale-data confusion during live coordination.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 5 scope.

</deferred>

---

_Phase: 05-parent-operations-dashboard-and-exports_
_Context gathered: 2026-02-13_
