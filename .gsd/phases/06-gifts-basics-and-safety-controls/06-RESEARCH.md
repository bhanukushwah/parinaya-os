# Phase 06: Gifts Basics and Safety Controls - Research

**Researched:** 2026-02-13
**Mode:** ecosystem (prescriptive)
**Scope confidence:** MEDIUM-HIGH

Phase 06 should be implemented as a **state-driven gifts domain** with strict server-side authorization, transaction-safe contribution writes, and append-only audit events for critical actions (`publish`, `hide`, `disable`, sensitive edits).

## Standard Stack

Use the existing monorepo stack; do not introduce new infrastructure.

| Layer | Use | Why | Confidence |
| --- | --- | --- | --- |
| API contract and handlers | `packages/api` oRPC procedures + Zod input schemas | Existing typed boundary and error model already used for governance-sensitive actions | HIGH |
| AuthZ | Existing membership-role policy (`getRoleByMembership`, `assertCan`) plus per-wedding/per-resource checks | Matches current governance model; enforce explicit forbidden responses server-side | HIGH |
| Persistence | PostgreSQL + Drizzle schema/migrations | Best fit for lifecycle state, constraints, partial unique indexes, and transactional writes | HIGH |
| Money representation | Integer minor units (`amountPaise`) in DB and TS | Avoid floating-point precision issues for contributions/progress | HIGH |
| UI data sync | TanStack Query mutation callbacks with targeted invalidation | Keeps guest/admin views consistent after publish/hide/disable/contribution changes | HIGH |

Use this phase-local schema shape:

- `gifts_modes`: one row per wedding, state machine + draft/published payload pointers.
- `gift_items`: wishlist line items with target/raised amounts in paise and visibility flags.
- `gift_contributions`: append-only contribution records (guest-visible identity redacted).
- `gift_audit_events`: append-only events for critical actions and sensitive edits.

## Architecture Patterns

### 1) Explicit lifecycle state machine (draft -> published -> hidden/disabled)

Use one authoritative `modeStatus` enum for guest availability:

- `draft`: not visible to guests.
- `published`: visible to invited guests and accepting contributions.
- `hidden`: temporarily invisible to guests.
- `disabled`: visible as unavailable; no new contributions accepted.

Transition rules to enforce in service layer:

- `publish` allowed from `draft` or `hidden` when pre-publish note exists.
- `hide` allowed from `published` only.
- `disable` allowed from `published` or `hidden`; blocks contribution writes.
- `re-enable` after `disable` must move back to `draft` and require explicit `publish` again.

### 2) Draft/published split for safe edits

Do not mutate live guest data directly:

- Write edits to draft fields.
- On `publish`, copy/derive guest-facing projection and stamp `publishedAt`.
- Keep `lastPublishedRevision` and `draftRevision` for deterministic republish behavior.

This directly matches the requirement that disable recovery needs explicit re-publish.

### 3) Server-side authorization + object-level checks on every mutation

Every mutating endpoint must:

1. Resolve active membership role by `weddingId + userId`.
2. Enforce role action (`admin`/`coordinator` for gifts operations per phase context).
3. Enforce object ownership/scope (gift belongs to wedding).
4. Return explicit authorization error body/code.

Do not trust UI role gating.

### 4) Transactional contribution writes with row locking

For partial contributions, use one transaction:

1. Lock item row (`FOR UPDATE`) by `giftItemId`.
2. Re-check item state (`published`, not disabled/hidden as applicable).
3. Validate amount against remaining target.
4. Insert contribution and update `amountRaisedPaise` atomically.

This prevents over-contribution races under concurrent guest writes.

### 5) Privacy-preserving contributor projection

Store contributor identity for admin reporting, but project guest payload without contributor identifiers.

- Guest response: aggregate totals/count only.
- Admin response: include contributor identity fields.

Keep this separation in service projection functions, not UI-only conditionals.

### 6) SOTA vs practical choice for this phase

- Current SOTA trend: ABAC/ReBAC policy engines for fine-grained auth.
- Phase-appropriate choice here: keep existing RBAC matrix + explicit resource checks; do not migrate auth architecture in Phase 06.

Reason: scope is gifts basics + safeguards, and current codebase already has a stable governance path.

## Don't Hand-Roll

| Problem | Do not build | Use instead | Why | Confidence |
| --- | --- | --- | --- | --- |
| Money math | JS float-based currency arithmetic | Integer paise (or PG `numeric`) with DB constraints | Prevent precision drift in raised/remaining totals | HIGH |
| Auth enforcement | Client-only hide/show role logic | Server-side policy checks in each mutation | Prevent privilege bypass/IDOR paths | HIGH |
| Concurrency control | Multi-query read/compute/write without lock | Transaction + row lock + atomic update | Prevent race-condition overfunding | HIGH |
| State control | Free-form booleans (`isHidden`, `isDisabled`) with ad hoc conditions | Single lifecycle enum + guarded transitions | Avoid invalid combinations and restore bugs | HIGH |
| Auditability | Best-effort logs in app console | Persisted append-only audit table with actor/time/before-after | Needed for governance and incident traceability | HIGH |
| Invite gating | Separate gifts auth model | Reuse existing invite-only website verification/session model | Keeps access semantics consistent across website surfaces | MEDIUM-HIGH |

## Common Pitfalls

1. **Floating-point contribution totals**
   - Symptom: progress percent mismatch across guest/admin views.
   - Prevention: store/compute in paise integers; format only at response layer.

2. **Disabled mode still accepts writes**
   - Symptom: contributions continue via stale tabs/API retries.
   - Prevention: enforce status check in mutation transaction, not only in UI.

3. **Over-contribution under concurrency**
   - Symptom: `amountRaised > targetAmount` after simultaneous writes.
   - Prevention: `SELECT ... FOR UPDATE` lock + in-transaction remaining check.

4. **Role checks without resource checks**
   - Symptom: coordinator in Wedding A can mutate Wedding B gift by guessed ID.
   - Prevention: always scope queries by both `weddingId` and `giftId`.

5. **Hide/disable semantics drift**
   - Symptom: `hide` behaves like `disable`, or re-enable auto-publishes unexpectedly.
   - Prevention: codify transition table and unit-test each allowed/blocked transition.

6. **Guest identity leakage**
   - Symptom: contributor names leak in guest wishlist/progress responses.
   - Prevention: maintain separate admin and guest projection DTOs.

7. **Long-running transactions around user flows**
   - Symptom: lock contention/deadlocks and degraded throughput.
   - Prevention: keep transactions short; never hold locks across external/network calls.

## Code Examples

```ts
// packages/api/src/routers/gifts.ts
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getRoleByMembership, assertMembershipRole } from "../policies/authorize";

const publishInput = z.object({
  weddingId: z.string().min(1),
  prePublishNote: z.string().min(1),
});

export const giftsRouter = {
  publish: protectedProcedure.input(publishInput).handler(async ({ input, context }) => {
    const role = await getRoleByMembership({
      weddingId: input.weddingId,
      userId: context.session.user.id,
    });
    assertMembershipRole(role);

    if (role !== "admin" && role !== "coordinator") {
      throw new ORPCError("FORBIDDEN", {
        message: "You do not have access to publish gifts.",
      });
    }

    // service.publishGiftsMode handles transition guards + audit write
    return { ok: true };
  }),
};
```

```ts
// packages/api/src/services/gift-contribution.ts
import { and, eq, sql } from "drizzle-orm";

export async function createContribution(tx: any, input: {
  weddingId: string;
  giftItemId: string;
  amountPaise: number;
}) {
  const [item] = await tx
    .select()
    .from(giftItems)
    .where(and(eq(giftItems.id, input.giftItemId), eq(giftItems.weddingId, input.weddingId)))
    .for("update");

  if (!item || item.modeStatus !== "published") {
    throw new Error("Gifts are currently unavailable.");
  }

  const remaining = item.targetAmountPaise - item.amountRaisedPaise;
  if (input.amountPaise <= 0 || input.amountPaise > remaining) {
    throw new Error("Contribution amount is invalid for remaining target.");
  }

  await tx.insert(giftContributions).values({
    id: crypto.randomUUID(),
    weddingId: input.weddingId,
    giftItemId: input.giftItemId,
    amountPaise: input.amountPaise,
  });

  await tx
    .update(giftItems)
    .set({ amountRaisedPaise: sql`${giftItems.amountRaisedPaise} + ${input.amountPaise}` })
    .where(eq(giftItems.id, input.giftItemId));
}
```

```ts
// apps/web/src/hooks/use-gifts-mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useHideGiftsMutation(hideGifts: () => Promise<void>, weddingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hideGifts,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gifts", weddingId, "guest"] }),
        queryClient.invalidateQueries({ queryKey: ["gifts", weddingId, "admin"] }),
      ]);
    },
  });
}
```

## Sources

- PostgreSQL partial indexes and partial unique constraints: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL transaction isolation (`READ COMMITTED` caveats): https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL explicit/row locking (`FOR UPDATE` semantics): https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS
- PostgreSQL numeric vs floating-point recommendations: https://www.postgresql.org/docs/current/datatype-numeric.html
- Drizzle transactions and transaction configuration: https://orm.drizzle.team/docs/transactions
- Drizzle constraints/indexes/checks: https://orm.drizzle.team/docs/indexes-constraints
- OWASP authorization guidance (deny-by-default, check every request, server-side checks): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- MDN HTTP 403 semantics (authenticated but insufficient permissions): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403
- MDN JS Number precision limits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
- TanStack Query invalidation after mutations: https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- Zod parse-based validation model: https://zod.dev/

## Confidence Notes

- **High confidence:** lifecycle state machine, transactional contribution writes, auth/audit enforcement, and money representation guidance.
- **Medium-high confidence:** reusing website invite-only trust session model for gifts surfaces (fits existing architecture, but exact UX integration remains plan-level).
- **Low-confidence areas:** none blocking for Phase 06 implementation; no unresolved library-selection unknowns identified.
