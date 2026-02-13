---
phase: 01-multi-event-foundation-governance-controls
plan: "04"
subsystem: ui
tags: [tanstack-router, react-query, orpc, governance, audit]
requires:
  - "01-02"
  - "01-03"
provides:
  - Dashboard event-management route with API-backed lifecycle controls and persistence
  - Invite-only-safe event detail route with guided access-denied fallback
  - Central audit dashboard route with actor/action/target/before-after visibility and filters
affects: [web-routes, governance, audit, events]
tech-stack:
  added: []
  patterns: [operator event query + mutation refetch loop, guided denial fallback, central audit filter table]
key-files:
  created:
    - apps/web/src/routes/dashboard.events.tsx
    - apps/web/src/routes/events.$eventId.tsx
    - apps/web/src/components/governance/access-denied.tsx
    - apps/web/src/routes/dashboard.audit.tsx
    - apps/web/src/routeTree.gen.ts
  modified:
    - apps/web/src/routes/dashboard.tsx
    - packages/api/src/routers/events.ts
key-decisions:
  - "Added a protected events.listForOperator API query so dashboard lifecycle controls are API-backed and persistent across refresh."
  - "Invite-only event deep-link flow uses login-first routing and friendly denial copy without role/escalation leakage."
  - "Audit UI shows required governance row fields with action/date filters while relying on backend policy filtering."
patterns-established:
  - "dashboard/events route mutates through oRPC client and refetches listForOperator for post-mutation state convergence."
  - "events/$eventId route renders a reusable AccessDenied component when access is blocked."
  - "dashboard/audit route consumes audit.list with filter inputs and renders before/after summaries inline."
completed: 2026-02-13
---

# Phase 01-04 Summary

**Shipped operator-facing governance UI surfaces for event lifecycle controls, invite-only denial experience, and central audit visibility backed by real API procedures.**

## Accomplishments

- Built `/dashboard/events` with event create/edit/archive/restore/reorder/visibility controls wired to oRPC events procedures and API refetch persistence.
- Added `/events/$eventId` detail route with login-first invite-only access behavior and friendly guided denial fallback using reusable `AccessDenied` UI.
- Built `/dashboard/audit` with filters and full row fidelity for actor/time/action/target/before/after/reason.
- Updated `/dashboard` to expose direct navigation entry points for events management and audit review.
- Added `events.listForOperator` in API router to provide operator list data required for UI lifecycle management.

## Task Commits

1. Task 1 - `0234c7a` — `feat(01-04): build dashboard event management route`
2. Task 2 - `65a0332` — `feat(01-04): implement invite-only access denied flow`
3. Task 3 - `f2d9b78` — `feat(01-04): build central audit page with filters`

## Files Created/Modified

- `apps/web/src/routes/dashboard.events.tsx` - Event governance UI route with API list query and lifecycle mutations.
- `apps/web/src/routes/dashboard.tsx` - Dashboard navigation cards linking to events and audit operator views.
- `packages/api/src/routers/events.ts` - Added protected `listForOperator` query for persisted operator event listing.
- `apps/web/src/routes/events.$eventId.tsx` - Invite-only-safe event detail route with login-first and denial fallback.
- `apps/web/src/components/governance/access-denied.tsx` - Friendly guided denial component with sign in/home actions.
- `apps/web/src/routes/dashboard.audit.tsx` - Central audit page with action/date filters and required row detail columns.
- `apps/web/src/routeTree.gen.ts` - Generated route tree including new dashboard and event routes.

## Verification

- ⚠️ `bun run check-types` (workspace) still fails on pre-existing blocker: `apps/server/src/index.ts(33,7) TS6133 'app' is declared but its value is never read`.
- ✅ `bun run check-types` in `apps/web` passes.
- ✅ `bun run build` in `apps/web` passes and includes new routes; bundle size warning is informational.
- ✅ `/dashboard/events` is wired to API (`orpc.events.listForOperator` + lifecycle mutations) with post-mutation refetch for persisted refresh behavior.
- ✅ Invite-only unauthorized path uses guided denial component and does not expose escalation/role internals.
- ✅ `/dashboard/audit` renders actor/time/action/target/before/after/reason with action/date filter controls.

## Deviations from Plan

- Added `events.listForOperator` backend query in `packages/api/src/routers/events.ts` because existing API exposed lifecycle mutations but no operator-safe list endpoint for dashboard persistence.
- Ran TanStack router generation step (`bunx @tanstack/router-cli generate`) to create tracked `apps/web/src/routeTree.gen.ts` and unblock web route typing.
