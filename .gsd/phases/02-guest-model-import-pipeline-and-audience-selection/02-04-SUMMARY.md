---
phase: 02-guest-model-import-pipeline-and-audience-selection
plan: "04"
subsystem: api
tags: [orpc, drizzle, audience, recipient-resolution, deterministic-filtering]
requires:
  - "02-01"
  - "02-02"
  - "02-03"
provides:
  - Deterministic server-side audience builder with side/tags/search AND semantics
  - Shared recipient resolver with guest-unit-first fallback and phone-level dedupe
  - Audience preview and pre-send precheck procedures using identical count path
affects: [audience-builder, invite-send-precheck, dashboard-counting, phase-03-delivery]
tech-stack:
  added: []
  patterns: [single audience pipeline for preview and precheck, override-after-filter semantics, shared recipient dedupe resolver]
key-files:
  created:
    - packages/api/src/services/audience-builder.ts
    - packages/api/src/services/recipient-resolver.ts
    - packages/api/src/routers/audience.ts
  modified:
    - packages/api/src/routers/index.ts
key-decisions:
  - "Audience filtering now runs in deterministic stages (side -> tags AND -> search -> include/exclude overrides)."
  - "Recipient count correctness is centralized in one shared resolver reused by both preview and pre-send precheck."
  - "Delivery target selection is guest-unit delivery identity first, then active/inviteable member identities when unit-level target is absent."
completed: 2026-02-13
---

# Phase 02-04 Summary

**Delivered deterministic audience filtering and shared recipient resolution so preview and pre-send counts remain consistent and deduped by eligible delivery targets.**

## Accomplishments

- Added `buildAudience` service to apply side, tags, and search filters with strict AND semantics across active filters.
- Implemented include/exclude GuestUnit overrides as a post-filter deterministic stage with trace metadata for transparency.
- Added shared `resolveRecipients` service enforcing active + inviteable eligibility and dedupe by normalized E.164 phone.
- Added `audienceRouter` preview and `precheckSend` procedures, both wired to the same `buildAudience` + `resolveRecipients` path.
- Composed `audience` into the app router for typed dashboard/API consumption.

## Task Commits

1. Task 1 - `8049b08` - `feat(02-04): build deterministic audience filter service`
2. Task 2 - `da21e39` - `feat(02-04): implement shared recipient resolution for preview and precheck`
3. Task 3 - `592c0f0` - `feat(02-04): expose audience preview and send precheck procedures`

## Files Created/Modified

- `packages/api/src/services/audience-builder.ts` - Deterministic audience stage pipeline with side/tags/search filtering and manual include/exclude overrides.
- `packages/api/src/services/recipient-resolver.ts` - Shared recipient target resolver with fallback and normalized-phone dedupe semantics.
- `packages/api/src/routers/audience.ts` - Protected preview + pre-send precheck procedures returning recipient count and sampled target metadata.
- `packages/api/src/routers/index.ts` - App router composition update adding `audience` domain.

## Verification

- ✅ `bunx tsc --noEmit -p packages/api/tsconfig.json` passed.
- ✅ Side + tags + search filters execute with AND semantics across active filters in `buildAudience`.
- ✅ Manual include/exclude GuestUnit overrides are applied after base filtering in `buildAudience`.
- ✅ Preview and pre-send procedures call the same `resolveRecipients` path.
- ✅ Recipient count equals unique active eligible delivery targets after fallback + dedupe.

## Deviations from Plan

None - plan executed as specified.
