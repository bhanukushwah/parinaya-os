---
phase: 02-guest-model-import-pipeline-and-audience-selection
plan: "02"
subsystem: api
tags: [orpc, drizzle, guest-management, phone-normalization, authorization]
requires:
  - "02-01"
provides:
  - Phone normalization utility for deterministic E.164 identity keying
  - Workspace-scoped guest identity upsert/reactivation service with typed outcomes
  - Guests API router for People/GuestUnit CRUD and membership assignment flows
affects: [guest-management, import-pipeline, audience-builder, audit]
tech-stack:
  added: [libphonenumber-js]
  patterns: [phone-only identity keying, role-gated guest domain procedures, audit-on-mutation]
key-files:
  created:
    - packages/api/src/services/phone-normalization.ts
    - packages/api/src/services/guest-identity.ts
    - packages/api/src/routers/guests.ts
  modified:
    - packages/api/src/policies/authorize.ts
    - packages/api/src/routers/index.ts
    - packages/api/package.json
    - package.json
key-decisions:
  - "Kept identity resolution strictly phone-only via canonical E.164 normalization and removed secondary name/email matching from identity keys."
  - "Handled matching archived identity records through reactivation (`isActive=true`, `deactivatedAt=null`) to avoid duplicate active identities."
  - "Enforced guest mutations through a single `guest.edit` audit action family and role-gated procedure checks."
completed: 2026-02-13
---

# Phase 02-02 Summary

**Delivered deterministic guest-domain API procedures that normalize phone identity once, dedupe/reactivate workspace identities, and enforce role-bound People/GuestUnit edits with audit traces.**

## Accomplishments

- Added a shared phone normalization service based on `libphonenumber-js/max` that returns typed `missing_phone`, `malformed_phone`, and `invalid_phone` outcomes.
- Added reusable identity service logic that upserts by `(weddingId, normalizedPhoneE164)`, updates display metadata, and reactivates matching inactive identities.
- Added `guestsRouter` with People and GuestUnit create/edit/archive/list procedures, assignment/removal flows, and `guest.edit` audit writes for all mutating operations.
- Wired guest-domain authorization and router composition so Parent Admin/Family Coordinator role members can manage guest records through centralized policy checks.

## Task Commits

1. Task 1 - `38ddb0b` - `feat(02-02): add shared phone normalization service for deterministic identity keying`
2. Task 2 - `613526d` - `feat(02-02): implement workspace-wide identity upsert/reactivation domain service`
3. Task 3 - `cebe475` - `feat(02-02): add guests router for people and guestunit management within role boundaries`

## Files Created/Modified

- `packages/api/src/services/phone-normalization.ts` - Canonical E.164 normalization and structured failure outcomes for phone inputs.
- `packages/api/src/services/guest-identity.ts` - Deterministic identity upsert/reactivation service with typed outcomes.
- `packages/api/src/routers/guests.ts` - Guest domain procedures for People/GuestUnit CRUD and membership management with audit writes.
- `packages/api/src/policies/authorize.ts` - Added `guest.read` and `guest.edit` policy actions.
- `packages/api/src/routers/index.ts` - Added `guests` domain to app router exports.
- `packages/api/package.json` - Added `libphonenumber-js` dependency (catalog reference).
- `package.json` - Added `libphonenumber-js` workspace catalog entry.

## Verification

- ✅ `bunx tsc --noEmit -p packages/api/tsconfig.json` passed after all task implementations.
- ✅ Deterministic phone-only identity behavior is encoded in `upsertGuestIdentity` by normalization + lookup on `(weddingId, normalizedPhoneE164)` with outcomes `created|updated|reactivated`.
- ✅ Reactivation path is encoded by setting `isActive: true` and `deactivatedAt: null` for matching inactive identities.
- ✅ One-active-membership invariant is preserved by existing DB partial unique index (`guest_unit_members_one_active_membership_per_person`) and router-side deactivation-before-assignment flow.
- ✅ Guest mutations emit `guest.edit` audit events through `writeAuditLog(... actionType: AUDIT_ACTIONS.GUEST_EDIT ...)` across mutating guest procedures.

## Deviations from Plan

None - plan executed as specified.
