---
phase: 02-guest-model-import-pipeline-and-audience-selection
plan: "05"
subsystem: web
tags: [dashboard, orpc, guest-management, imports, audience-preview, tanstack-router]
requires:
  - "02-02"
  - "02-03"
  - "02-04"
provides:
  - Dashboard guest-management route for People + GuestUnit operations and assignment workflows
  - Dashboard imports route for CSV, contacts, and manual-row channels with warning visibility
  - Event audience builder route with server-driven preview/precheck recipient counts and override controls
  - Regenerated TanStack route tree wiring for new dashboard routes
affects: [phase-02-operations-ui, import-operator-workflow, audience-pre-send-preview]
tech-stack:
  added: []
  patterns: [oRPC domain-driven route wiring, mutation-refetch dashboard flows, server-truth audience count rendering]
key-files:
  created:
    - apps/web/src/routes/dashboard.guests.tsx
    - apps/web/src/routes/dashboard.imports.tsx
    - apps/web/src/routes/dashboard.events.$eventId.audience.tsx
  modified:
    - apps/web/src/routes/dashboard.tsx
    - apps/web/src/routeTree.gen.ts
key-decisions:
  - "Guest assignment/reassignment stays server authoritative: UI always calls assign/remove mutations and refreshes from backend state."
  - "Import route executes all channels through dedicated guestImports procedures while warning rows remain visible for malformed/no-phone outcomes."
  - "Audience preview count is rendered directly from `orpc.audience.preview` response and precheck uses the same resolver path for deterministic consistency."
completed: 2026-02-13
---

# Phase 02-05 Summary

**Delivered phase-02 operator dashboard surfaces so guest management, import execution, and audience recipient previews are now usable through web routes wired to the completed backend domains.**

## Accomplishments

- Added `/dashboard/guests` with People + GuestUnit creation flows, assignment/reassignment actions, membership visibility, and server-error-based edit gating.
- Added `/dashboard/imports` with CSV/contacts/manual-row launchers, run status counters, warning-row visibility, and selected run detail loading.
- Added `/dashboard/events/$eventId/audience` with side/tags/search AND filters, explicit include/exclude GuestUnit overrides, server preview count rendering, and precheck action.
- Updated dashboard landing navigation to expose guest and import operations.
- Regenerated `apps/web/src/routeTree.gen.ts` to include all new routes with typed route tree integration.

## Task Commits

1. Task 1 - `1ca1d94` - `feat(02-05): build guests dashboard management route`
2. Task 2 - `6b5c45c` - `feat(02-05): build imports dashboard route`
3. Task 3 - `58d5005` - `feat(02-05): build event audience preview route`

## Files Created/Modified

- `apps/web/src/routes/dashboard.guests.tsx` - Guest operations UI for People/GuestUnit data and assignment workflows.
- `apps/web/src/routes/dashboard.imports.tsx` - Unified import operations UI spanning CSV, contacts, and manual-row channels with warning summaries.
- `apps/web/src/routes/dashboard.events.$eventId.audience.tsx` - Audience builder UI using server preview/precheck as pre-send count truth source.
- `apps/web/src/routes/dashboard.tsx` - Dashboard card links for guest and import operational routes.
- `apps/web/src/routeTree.gen.ts` - Generated route tree now containing `/dashboard/guests`, `/dashboard/imports`, and `/dashboard/events/$eventId/audience`.

## Verification

- ✅ `bun run --filter web build` passed (and regenerated route tree artifacts).
- ✅ `bunx tsc --noEmit -p apps/web/tsconfig.json` passed with all new routes.
- ✅ Generated route tree contains `/dashboard/guests`, `/dashboard/imports`, and `/dashboard/events/$eventId/audience` entries.
- ⚠ UI-only behavioral checks (interactive CRUD/import/audience flows) require runtime data/session and were not fully human-verified in this execution.

## Deviations from Plan

None - all planned tasks executed and committed atomically.
