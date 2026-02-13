---
phase: 02-guest-model-import-pipeline-and-audience-selection
plan: "01"
subsystem: database
tags: [drizzle, postgres, guests, import-pipeline, audience]
requires:
  - "01-01"
provides:
  - Guest identity/people/guest-unit schema with workspace-scoped normalized phone dedupe constraints
  - Import run and row persistence with warning outcomes and inviteable-state observability
  - Event audience selection persistence with side/tags/search and manual include/exclude overrides
affects: [guest-management, import, audience-builder, invites]
tech-stack:
  added: []
  patterns: [identity-first dedupe schema, partial unique active-membership constraints, import run telemetry tables]
key-files:
  created:
    - packages/db/src/schema/guests.ts
    - packages/db/src/migrations/0001_wooden_speed_demon.sql
    - packages/db/src/migrations/0002_parched_triathlon.sql
  modified:
    - packages/db/src/schema/index.ts
    - packages/db/src/migrations/meta/_journal.json
    - packages/db/src/migrations/meta/0001_snapshot.json
    - packages/db/src/migrations/meta/0002_snapshot.json
key-decisions:
  - "Kept normalized phone as workspace-scoped canonical identity key via unique index on `(wedding_id, normalized_phone_e164)` for deterministic dedupe."
  - "Stored malformed/no-phone import rows with explicit non-inviteable outcomes instead of dropping rows."
  - "Modeled audience selection and overrides against `GuestUnit` so event targeting can persist include/exclude intent."
completed: 2026-02-13
---

# Phase 02-01 Summary

**Shipped the Phase 2 database foundation for deterministic guest identity, household membership constraints, import observability, and persisted audience selection overrides.**

## Accomplishments

- Added `packages/db/src/schema/guests.ts` with guest identities, people, guest units, memberships, tags, audience selection, and import pipeline entities.
- Enforced workspace-scoped deterministic identity and active-target behavior with normalized phone uniqueness and active-membership partial unique indexes.
- Persisted import runs/rows with status counters, idempotency keys, row outcomes (`created`, `updated`, `reactivated`, `warning_malformed_phone`, `skipped_no_phone`), and row-level `isInviteable` state.
- Wired guest schema barrel export and generated migration SQL + snapshots for the full phase-02 schema surface.

## Task Commits

1. Task 1 - `5327cbf` — `feat(02-01): add deterministic guest identity household primitives`
2. Task 2 - `9133bf1` — `feat(02-01): add import run and row observability entities`
3. Task 3 - `e3a848d` — `feat(02-01): export guest schema and generate migration SQL`

## Files Created/Modified

- `packages/db/src/schema/guests.ts` - Guest domain enums/tables/relations for identities, people, guest units, tags, audience selections, and import runs/rows.
- `packages/db/src/schema/index.ts` - Added guest schema barrel export.
- `packages/db/src/migrations/0001_wooden_speed_demon.sql` - Generated SQL for phase-02 guest/import/audience tables, FKs, enums, and indexes.
- `packages/db/src/migrations/0002_parched_triathlon.sql` - Follow-up generated SQL tightening one-active-membership index predicate.
- `packages/db/src/migrations/meta/0001_snapshot.json` - Drizzle schema snapshot after phase-02 additions.
- `packages/db/src/migrations/meta/0002_snapshot.json` - Drizzle snapshot after active-membership index correction.
- `packages/db/src/migrations/meta/_journal.json` - Migration journal entries for phase-02 migrations.

## Verification

- ✅ `bun run db:generate` succeeded and generated migration SQL under `packages/db/src/migrations`.
- ✅ `bunx tsc --noEmit -p packages/db/tsconfig.json` succeeded after schema integration.
- ✅ Generated SQL enforces workspace-scoped deterministic phone identity (`guest_identities_wedding_phone_unique`) and active membership constraint (`guest_unit_members_one_active_membership_per_person ... WHERE is_active = true`).
- ✅ Import row schema persists warning/non-inviteable outcomes (`warning_malformed_phone`, `skipped_no_phone`) without dropping rows.

## Deviations from Plan

- Auto-fixed one schema correctness issue during Task 3 migration verification: converted `guest_unit_members_one_active_membership_per_person` to a partial unique index (`WHERE is_active = true`) so inactive historical memberships do not violate the one-active-membership invariant.
