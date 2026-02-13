# State

## Current Position

- Phase: 2 (in progress)
- Plan: 02-04 complete (Phase 2 in progress)
- Status: Phase 2 now includes deterministic audience filtering and shared pre-send recipient resolution
- Last activity: 2026-02-13 — Executed 02-04 audience filter + recipient resolver plan

## Accumulated Context

- Milestone initialized: `v1.0` — **Core Wedding OS** (focus: Core v1 OS).
- Product direction remains WhatsApp-first wedding coordination with Parent Admin + Family Coordinator operator model.
- Active scope centers on events, guest model/import/dedupe, WhatsApp invites + RSVP, parent dashboard/exports, website/gifts, and roles/audit.
- `REQUIREMENTS.md` now includes full v1.0 traceability to roadmap phases (20/20 mapped, 0 unmapped).
- `ROADMAP.md` now defines 6 execution phases for milestone v1.0.
- Phase 1 now has persisted schema primitives for event lifecycle (`draft|published|archived`), visibility (`public|invite-only`), eligibility grants, role memberships, and audit logs.
- Phase 1 now also has centralized API authorization policy helpers (`assertCan`, membership role resolution, generic forbidden errors) for reusable role enforcement.
- Event API domain procedures now support create/edit/archive/restore/reorder commands with same-transaction audit writes to prevent mutation-without-audit gaps.
- Public reads now enforce visibility boundaries: list endpoint only returns published public events; invite-only detail uses auth-first then eligibility check against active grants with generic forbidden fallback.
- Audit action taxonomy now includes `role.change`, `event.visibility.change`, `invite.send`, and `guest.edit` for forward-compatible producer wiring in later phases.
- Governance API domain now includes `listMemberships` and `changeRole` procedures with owner/admin boundary enforcement via `assertRoleChangeAllowed` and mandatory role-change audit writes.
- Audit API domain now exposes centralized `list` and `detail` query procedures with action/date/actor/target filters and coordinator-safe visibility that excludes governance-only actions while preserving routine logs.
- App router composition now exports `events`, `governance`, and `audit` domains alongside existing health/private procedures for typed client consumption.
- Events router now exposes `listForOperator` protected query so dashboard event management can render persisted lifecycle state from API data.
- Web app now includes `/dashboard/events` with create/edit/archive/restore/reorder/visibility controls wired to oRPC mutations with post-mutation refetch.
- Web app now includes `/events/$eventId` invite-only-safe detail route with login-first access flow and friendly guided denial messaging for unauthorized members.
- Web app now includes `/dashboard/audit` central audit table with action/date filters and actor/time/action/target/before/after/reason row fidelity.
- Route tree artifact is now generated and tracked at `apps/web/src/routeTree.gen.ts` for typed route integration.
- Migration artifacts for schema baseline exist at `packages/db/src/migrations/0000_common_kid_colt.sql` with Drizzle metadata snapshots.
- Verification note: `bun run db:generate` passed; workspace `bun run check-types` remains blocked by pre-existing `apps/server/src/index.ts` unused variable (`TS6133`).
- Verification note (01-02): `bunx tsc --noEmit -p packages/api/tsconfig.json` passed for new API modules; workspace `bun run check-types` still fails on the same pre-existing `apps/server/src/index.ts` `TS6133` blocker.
- Verification note (01-03): `bunx tsc --noEmit -p packages/api/tsconfig.json` passed; `apps/web` typecheck is currently blocked by pre-existing route-tree generation/type wiring issues (`routeTree.gen` missing and route literal generic mismatches).
- Verification note (01-04): `apps/web` typecheck passes after route generation; workspace `bun run check-types` is still blocked by pre-existing `apps/server/src/index.ts` `TS6133`.
- Verification result (phase): `.gsd/phases/01-multi-event-foundation-governance-controls/01-VERIFICATION.md` passed.
- Phase 2 database primitives now exist in `packages/db/src/schema/guests.ts` for identities, people, guest units, memberships, tags, event audience selection overrides, import runs, and import rows.
- Deterministic phone identity constraints are now enforced via workspace-scoped unique normalized phone index and active-target related indexes in generated migrations.
- Import telemetry schema now persists row outcomes (`created|updated|reactivated|warning_malformed_phone|skipped_no_phone`) and row inviteability state for warning visibility without data loss.
- Migration artifacts for phase-02 schema are now generated at `packages/db/src/migrations/0001_wooden_speed_demon.sql` and `packages/db/src/migrations/0002_parched_triathlon.sql` with updated metadata snapshots.
- Verification note (02-01): `bun run db:generate` and `bunx tsc --noEmit -p packages/db/tsconfig.json` passed; known workspace blocker remains `apps/server/src/index.ts` `TS6133` (pre-existing, unchanged).
- Phase 2 API layer now includes `packages/api/src/routers/guests.ts` with role-gated People/GuestUnit CRUD, membership assignment/removal, and `guest.edit` audit writes.
- Deterministic phone-only identity workflow is now centralized in `packages/api/src/services/phone-normalization.ts` and `packages/api/src/services/guest-identity.ts` for reusable normalization + upsert/reactivation behavior.
- Authorization policy matrix now includes `guest.read`/`guest.edit` actions and app router composition now exports `guests` domain for typed client usage.
- Verification note (02-02): `bunx tsc --noEmit -p packages/api/tsconfig.json` passed; behavioral invariants (reactivation, one-active-membership, audit emission) are enforced through service/router logic and existing DB partial unique indexes.
- Phase 2 import adapters now normalize CSV, contacts, and manual rows into a single canonical payload contract before persistence.
- Shared import service `runGuestImport` now performs deterministic ingest/normalize/resolve/persist flow using phone normalization + `upsertGuestIdentity` and workspace-wide dedupe behavior.
- Import rows with malformed/no-phone inputs are now persisted with warning outcomes and `isInviteable=false`, preserving visibility without dropping data.
- Guest import run tracking now includes idempotency replay semantics and persisted counters for created/updated/reactivated/warning/skipped/failed outcomes.
- API router now exposes `guestImports` procedures for CSV, contacts, and manual import execution plus run list/detail and warning-row retrieval under guest role boundaries.
- Verification note (02-03): `bunx tsc --noEmit -p packages/api/tsconfig.json` passed; route wiring confirms all channels invoke shared `runGuestImport` path.
- Phase 2 audience services now include `buildAudience` (side/tags/search AND semantics + include/exclude overrides) and `resolveRecipients` (guest-unit-first fallback with normalized-phone dedupe).
- API router now exposes `audience.preview` and `audience.precheckSend`, both wired through the same audience + recipient resolver path to prevent count drift.
- Verification note (02-04): `bunx tsc --noEmit -p packages/api/tsconfig.json` passed with audience builder, recipient resolver, and audience router composition.
- Next execution point: Phase 2 plan 02-05 execution.
