# State

## Current Position

- Phase: 1 (in execution)
- Plan: 01-04 complete
- Status: Phase 1 operator UI surfaces shipped for event lifecycle governance, invite-only denial UX, and central audit visibility
- Last activity: 2026-02-13 — Completed plan 01-04 with dashboard events/audit routes, invite-only access-denied flow, and API-backed event operator listing

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
- Next execution point: transition from Phase 1 to Phase 2 planning.
