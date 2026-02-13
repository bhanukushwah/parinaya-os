---
phase: 02-guest-model-import-pipeline-and-audience-selection
plan: "03"
subsystem: api
tags: [orpc, drizzle, csv-parse, import-pipeline, dedupe]
requires:
  - "02-01"
  - "02-02"
provides:
  - Shared deterministic import pipeline for CSV, contacts, and manual rows
  - Import row warning persistence for malformed/no-phone inputs with inviteable=false
  - Guest import API router with run/list/detail/warnings endpoints
affects: [guest-management, import-pipeline, audience-builder, audit]
tech-stack:
  added: [csv-parse]
  patterns: [channel adapters to canonical rows, import run idempotency replay, warning-first row persistence]
key-files:
  created:
    - packages/api/src/services/guest-import-types.ts
    - packages/api/src/services/guest-import-csv.ts
    - packages/api/src/services/guest-import-contacts.ts
    - packages/api/src/services/guest-import.ts
    - packages/api/src/routers/guest-imports.ts
  modified:
    - packages/api/src/services/audit-log.ts
    - packages/api/src/routers/index.ts
    - packages/api/package.json
    - package.json
    - bun.lock
key-decisions:
  - "All sources are normalized into one canonical row shape before persistence to prevent channel-specific behavior drift."
  - "Malformed and missing-phone rows are written to guest_import_rows with non-inviteable outcomes instead of being dropped."
  - "Import run idempotency replays existing run results by (weddingId, idempotencyKey) for deterministic retries."
completed: 2026-02-13
---

# Phase 02-03 Summary

**Delivered a single deterministic import engine for CSV, contacts, and manual inputs with persisted warning rows, workspace-wide phone dedupe, and role-gated API access.**

## Accomplishments

- Added import adapters for CSV parsing (`csv-parse`) and contacts/manual payload normalization into one canonical row contract.
- Implemented shared `runGuestImport` ingest->normalize->resolve->persist flow reusing `upsertGuestIdentity` and deterministic phone dedupe semantics.
- Persisted malformed/no-phone rows as warning outcomes (`warning_malformed_phone`/`skipped_no_phone`) with `isInviteable=false`.
- Applied side/tag normalization to both `guest_people` and `guest_units`, including tag sync via shared tag assignment helper.
- Added import procedures (`importCsv`, `importContacts`, `importManualRows`) plus run list/detail/warning queries and composed `guestImports` into app router.

## Task Commits

1. Task 1 - `54085ca` - `feat(02-03): add import-channel adapters and dependencies`
2. Task 2 - `457b5a0` - `feat(02-03): implement shared import pipeline with deterministic outcomes`
3. Task 3 - `6209a5f` - `feat(02-03): expose import procedures and route composition`

## Files Created/Modified

- `packages/api/src/services/guest-import-types.ts` - Shared canonical import row/channel/outcome contracts.
- `packages/api/src/services/guest-import-csv.ts` - CSV adapter using `csv-parse` stream parser to produce canonical rows.
- `packages/api/src/services/guest-import-contacts.ts` - Contacts/manual adapter mapping into canonical rows.
- `packages/api/src/services/guest-import.ts` - Shared deterministic import pipeline, row/run persistence, counters, idempotency replay, and audit wiring.
- `packages/api/src/routers/guest-imports.ts` - Protected import endpoints and run/warning retrieval endpoints.
- `packages/api/src/routers/index.ts` - Added `guestImports` router composition.
- `packages/api/src/services/audit-log.ts` - Added guest import start/complete audit action constants.
- `packages/api/package.json` - Added `csv-parse` dependency.
- `package.json` - Added `csv-parse` catalog version.
- `bun.lock` - Lockfile update after dependency install.

## Verification

- ✅ `bunx tsc --noEmit -p packages/api/tsconfig.json` passed after full pipeline + router wiring.
- ✅ CSV/contacts/manual endpoints all call the same shared pipeline (`runGuestImport`) in `packages/api/src/routers/guest-imports.ts`.
- ✅ Warning persistence is explicit for malformed/no-phone rows with `isInviteable=false` in `packages/api/src/services/guest-import.ts`.
- ✅ Side/tags are normalized and synced onto both person and guest-unit records in `packages/api/src/services/guest-import.ts`.
- ✅ Import run counters persist created/updated/reactivated/warning/skipped/failed totals on run completion.

## Deviations from Plan

None - plan executed as specified.
