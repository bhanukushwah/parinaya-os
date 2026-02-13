# Phase 01: Multi-Event Foundation + Governance Controls - Research

**Researched:** 2026-02-13  
**Domain:** Event lifecycle + visibility enforcement + role/audit governance on existing Elysia/oRPC/Drizzle stack  
**Confidence:** MEDIUM-HIGH

## Summary

Phase 01 should be planned as a strict domain foundation phase, not a UI-heavy phase. The fastest safe path is to extend the existing monorepo baseline (`apps/server` + `packages/api` + `packages/db` + `apps/web`) with canonical event/governance tables, role-aware policy checks in server procedures, and append-only audit writes for critical actions.

Locked discuss-phase decisions already define key behavior: default event state (`draft`, `invite-only`), global custom ordering, last-write-wins concurrency, immediate access revocation when visibility flips to invite-only, login-first invite-only flow, and generic authorization errors for blocked actions. Planning should focus on implementing these decisions with strong server-side enforcement and clear verification gates.

**Primary recommendation:** Build Phase 01 around server-enforced policy + transactional writes + append-only audits first, then add minimal operator UI surfaces that consume those guarantees.

## Locked Decisions to Preserve

Do not re-decide these in planning; encode them directly into tasks and tests:

- Archived events are soft-deletable and restorable.
- Event ordering is a single global custom order per wedding workspace.
- Concurrent edits use last-write-wins.
- New events default to `draft` and `invite-only`.
- Invite-only access flow: authenticate first, then eligibility check.
- Public -> invite-only flip revokes access immediately.
- Invite-only events are excluded from public listings.
- Access denied UX copy is friendly/guided.
- Blocked actions return generic auth errors (no required-role disclosure).
- Role changes allowed for owner/admin boundaries as defined in context.
- Role-change reason note is optional.
- Coordinators can do routine operations, not governance controls.
- Audit retention target: 12 months.
- Audit access: central audit page.
- Audit row includes before/after summary with actor/time/action context.
- Coordinators can view routine operational logs (invite-send + guest-edit).

## Standard Stack

Use current repository stack; no platform changes in this phase.

### Core

| Library/Runtime | Version (repo) | Purpose in Phase 01 | Why standard here |
| --- | --- | --- | --- |
| Bun | `1.2.15` | Runtime + workspace scripts | Existing project runtime and scripts already standardized |
| Elysia | `^1.4.21` | HTTP host for auth/oRPC routes | Existing server entrypoint already on Elysia |
| oRPC (`@orpc/server`, `@orpc/zod`) | `^1.12.2` | Typed procedures for commands/queries | Existing app router and auth middleware pattern in place |
| Drizzle ORM + Postgres | `drizzle-orm ^0.45.1`, `pg ^8.17.1` | Canonical event/role/audit schema + transactional writes | Existing DB package and migration workflow already wired |
| Better Auth | `^1.4.18` | Session identity in request context | `createContext` already derives session from Better Auth |

### Supporting

| Library | Version | Phase 01 use |
| --- | --- | --- |
| Zod | `^4.1.13` | Input contracts for event/visibility/role actions |
| Biome | `^2.2.0` | Consistent lint/format in new modules |
| Turbo | `^2.6.3` | Workspace task orchestration for check/build/db scripts |

## Architecture Patterns

### Recommended project structure for this phase

```text
packages/db/src/schema/
  auth.ts
  governance.ts      # roles, memberships, audit tables
  events.ts          # events, ordering, visibility fields
packages/api/src/
  routers/events.ts
  routers/governance.ts
  policies/
    authorize.ts     # role + action policy checks
  services/
    audit-log.ts     # append-only audit writer
apps/web/src/routes/
  dashboard/events.tsx
  dashboard/audit.tsx
```

### Pattern 1: Policy enforcement at server procedure boundary

All sensitive actions (role change, visibility change, event archive/restore, order updates) must pass through centralized policy checks in API procedures. UI checks are convenience only.

### Pattern 2: Transactional command + audit write

For critical mutations, write business change and audit entry in one transaction. This avoids state change without audit coverage.

### Pattern 3: Global order persistence with deterministic rank field

Use a persisted sortable field (for example `sortOrder`) scoped to wedding workspace. Reorder operation should be a single command that updates affected records atomically.

### Pattern 4: Visibility as read-time filter + access guard

- Public listing query excludes `invite-only` records.
- Direct invite-only access path runs: auth -> eligibility check -> allow/deny.
- When visibility flips to invite-only, subsequent reads immediately enforce eligibility (no grace behavior).

### Pattern 5: Last-write-wins with `updatedAt` and overwrite semantics

Do not introduce optimistic-lock conflict prompts in this phase. Preserve simple overwrite behavior and ensure `updatedAt` changes on every write.

## Data Modeling Guidance for Planning

Minimum entities required to satisfy EVT-01/EVT-02/GOV-01/GOV-02 in this phase:

- `wedding_events`
  - `id`, `weddingId`, `title`, `status` (`draft|published|archived`), `visibility` (`public|invite-only`), `sortOrder`, timestamps, `archivedAt` nullable.
- `wedding_memberships` (or equivalent workspace-role table)
  - `userId`, `weddingId`, `role` (`owner|admin|coordinator`), timestamps.
- `audit_logs`
  - `id`, `weddingId`, `actorUserId`, `actionType`, `targetType`, `targetId`, `beforeSummary`, `afterSummary`, `reason` nullable, `createdAt`.

Planning note: keep audit payload summary lightweight and queryable; avoid opaque blob-only rows if central audit page needs filtering.

## Don't Hand-Roll

| Problem | Don’t build | Use instead | Why |
| --- | --- | --- | --- |
| Auth/session parsing | Custom token/session parser | Existing Better Auth + `createContext` flow | Already integrated and trusted in server stack |
| Permission checks scattered in handlers | Per-route ad hoc if/else logic | Central policy utility in `packages/api` | Prevents drift and inconsistent authorization outcomes |
| Audit emission from UI | Client-triggered audit events | Server-side append-only audit service | Prevents tampering and missing events |
| Event ordering in client memory only | Frontend-only drag order state | Persisted DB `sortOrder` + reorder command | Required persistence after refresh and cross-client consistency |

## Common Pitfalls

### Pitfall 1: Authorization checks only in UI

**What goes wrong:** Coordinator can still trigger restricted actions via direct RPC calls.  
**Avoid:** Enforce role matrix in server policy layer for every governance action.

### Pitfall 2: Event updates without audit transaction coupling

**What goes wrong:** Visibility/role changes happen but audit row is missing during partial failures.  
**Avoid:** Mutation + audit insert in one DB transaction.

### Pitfall 3: Public listing query forgets visibility filter

**What goes wrong:** Invite-only events leak into website/public list endpoints.  
**Avoid:** Centralize listing query helper that always applies visibility predicate.

### Pitfall 4: Non-atomic reordering

**What goes wrong:** Duplicate rank values or unstable order after concurrent reorder requests.  
**Avoid:** Single reorder command with deterministic full-order update in transaction.

### Pitfall 5: Error messages leak role boundaries

**What goes wrong:** Blocked response exposes required role/escalation details, conflicting with locked decision.  
**Avoid:** Return consistent generic authorization error code/message for blocked actions.

## Code Examples (Planning Reference)

### Authorization guard with generic blocked response

```ts
import { ORPCError } from "@orpc/server";

export function assertCan(action: string, role: "owner" | "admin" | "coordinator") {
  const allowed = policyMatrix[role]?.has(action) ?? false;
  if (!allowed) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to perform this action.",
    });
  }
}
```

### Event mutation + audit in one transaction

```ts
await db.transaction(async (tx) => {
  const before = await tx.query.weddingEvents.findFirst({ where: eq(weddingEvents.id, input.eventId) });

  await tx
    .update(weddingEvents)
    .set({ visibility: input.visibility, updatedAt: new Date() })
    .where(eq(weddingEvents.id, input.eventId));

  await tx.insert(auditLogs).values({
    weddingId: input.weddingId,
    actorUserId: actorId,
    actionType: "event.visibility.changed",
    targetType: "event",
    targetId: input.eventId,
    beforeSummary: JSON.stringify({ visibility: before?.visibility ?? null }),
    afterSummary: JSON.stringify({ visibility: input.visibility }),
    reason: input.reason ?? null,
    createdAt: new Date(),
  });
});
```

### New event defaults

```ts
await db.insert(weddingEvents).values({
  weddingId: input.weddingId,
  title: input.title,
  status: "draft",
  visibility: "invite-only",
  sortOrder: input.sortOrder,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

## Planning-Ready Task Decomposition

Recommended plan sequence for Phase 01:

1. Schema foundation: events + memberships/roles + audit tables + indexes + migration.
2. Server policy layer: role matrix + reusable authorization guards + generic blocked errors.
3. Event lifecycle APIs: create/edit/archive/restore/reorder + default field behavior.
4. Visibility enforcement APIs: public listing filter + invite-only access guard flow.
5. Role management APIs: owner/admin role-change boundaries + optional reason support.
6. Audit logging integration: role/visibility/invite/guest-edit action writers + central audit query endpoint.
7. Minimal web surfaces: event management + audit page + friendly access-denied states.
8. Verification pass: role-negative tests, visibility leak tests, reorder persistence checks, audit completeness checks.

## Verification Checklist for Phase Completion

- Multi-event create/edit/archive/restore works and persists after refresh.
- Reorder persists globally across sessions.
- New events are always created as `draft` + `invite-only`.
- Invite-only items never appear in public listing responses.
- Direct invite-only access enforces login first, then eligibility.
- Public -> invite-only switch revokes access on next read.
- Blocked actions return generic auth errors only.
- Role-change boundaries match locked owner/admin/coordinator rules.
- Audit rows exist for role change, visibility change, invite-send, guest-edit actions.
- Audit list supports central view and routine log visibility for coordinators.

## Open Questions to Resolve During Planning

1. **Requirement wording alignment:** roadmap says "explicit authorization errors" while locked decision requires generic blocked errors. Plan should treat "explicit" as explicit auth failure category (not role-detail disclosure).
2. **Invite/guest audit in Phase 01:** Phase success criteria expects invite-send + guest-edit audit logging, but full invite/guest domains are phased later; plan should add audit event hooks/interfaces now and wire full producers in later phases.
3. **Eligibility source for invite-only reads:** Phase 01 needs enforcement path; plan should define temporary source-of-truth contract that can be fulfilled by later guest/audience models without endpoint churn.

## Sources

Primary repository sources used:

- `.gsd/phases/01-multi-event-foundation-governance-controls/01-CONTEXT.md`
- `.gsd/ROADMAP.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/STATE.md`
- `.gsd/research/SUMMARY.md`
- `.gsd/research/STACK.md`
- `package.json`
- `apps/server/src/index.ts`
- `packages/api/src/index.ts`
- `packages/api/src/context.ts`
- `packages/db/src/index.ts`
- `packages/db/src/schema/auth.ts`

## Metadata

- **Confidence breakdown**
  - Locked decisions interpretation: HIGH (direct from context file)
  - Stack fit and integration path: HIGH (direct from repository code and package versions)
  - Detailed implementation pattern recommendations: MEDIUM (architecture guidance extrapolated to Phase 01 scope)
- **Research validity window:** until major dependency/version or scope change
