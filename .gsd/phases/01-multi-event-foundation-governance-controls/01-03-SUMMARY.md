---
phase: 01-multi-event-foundation-governance-controls
plan: "03"
subsystem: api
tags: [orpc, drizzle, governance, audit, rbac]
requires:
  - "01-01"
  - "01-02"
provides:
  - Governance router membership listing and role-change procedures with boundary enforcement
  - Central audit query router with coordinator-safe visibility filtering
  - App router composition exposing events, governance, and audit domains
affects: [governance, audit, app-router]
tech-stack:
  added: []
  patterns: [role-boundary guardrails, role-change audit coupling, role-aware audit visibility]
key-files:
  created:
    - packages/api/src/routers/governance.ts
    - packages/api/src/routers/audit.ts
  modified:
    - packages/api/src/routers/index.ts
key-decisions:
  - "Role changes are server-enforced through authorize policy boundaries for both target current role and requested next role."
  - "Every role change writes an audit row with before/after membership role summary and optional reason note."
  - "Coordinator audit reads hide governance-only actions while retaining routine operations visibility."
patterns-established:
  - "governanceRouter uses assertCan + assertRoleChangeAllowed before membership mutation."
  - "auditRouter centralizes action/date/actor/target filtering for central audit page consumption."
  - "appRouter exposes events/governance/audit domains as typed surfaces for web clients."
completed: 2026-02-13
---

# Phase 01-03 Summary

**Implemented governance and audit API surfaces with router composition, including role-change boundary enforcement, role-change audit writes, and coordinator-safe central audit visibility.**

## Accomplishments

- Added `governanceRouter` with `listMemberships` and `changeRole` procedures enforcing owner/admin boundaries via authorize policy checks.
- Ensured role changes support optional `reasonNote` and always emit audit entries with before/after role summaries.
- Added `auditRouter` with central `list` and `detail` procedures supporting action/date/actor/target filters.
- Implemented coordinator-safe audit visibility by excluding governance-only entries while preserving routine logs such as `invite.send` and `guest.edit`.
- Composed `events`, `governance`, and `audit` into `appRouter` while preserving existing `healthCheck` and `privateData` routes.

## Task Commits

1. Task 1 - `f2a10cd` — `feat(01-03): implement governance role membership operations`
2. Task 2 - `21a16cd` — `feat(01-03): implement central audit query router`
3. Task 3 - `b591cc7` — `feat(01-03): compose governance audit and events app router domains`

## Files Created/Modified

- `packages/api/src/routers/governance.ts` - Membership listing and role change mutations with authorize policy guardrails and audit writes.
- `packages/api/src/routers/audit.ts` - Central audit list/detail queries with role-aware filtering for coordinator-safe visibility.
- `packages/api/src/routers/index.ts` - App router composition wiring events, governance, and audit domains.

## Verification

- ⚠️ `bun run check-types` fails due to pre-existing workspace blocker in `apps/server/src/index.ts` (`TS6133: 'app' is declared but its value is never read`).
- ✅ `bunx tsc --noEmit -p packages/api/tsconfig.json` passes.
- ⚠️ `bun run check-types` in `apps/web` fails due to pre-existing web route type-generation issues (`routeTree.gen` missing and route literal generic mismatches).
- ✅ `assertRoleChangeAllowed(` enforcement is present in governance role-change flow for both current target role and requested next role.
- ✅ `writeAuditLog(` is invoked in governance role-change transaction with before/after summaries and optional reason note.
- ✅ Audit coordinator visibility filter excludes governance-only actions while routine categories remain queryable.

## Deviations from Plan

- Workspace and web typecheck blockers are pre-existing and outside this plan scope; API package checks for implemented files pass.
