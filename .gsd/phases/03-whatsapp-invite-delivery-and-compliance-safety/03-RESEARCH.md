# Phase 03: WhatsApp Invite Delivery and Compliance Safety - Research

**Researched:** 2026-02-13
**Mode:** ecosystem (prescriptive)
**Scope confidence:** MEDIUM-HIGH

Phase 03 should be delivered as a **server-owned outbound messaging pipeline** with strict policy gates, deterministic webhook correlation, and monotonic lifecycle projection. The safest architecture in this codebase is DB-first persistence + typed procedure boundaries in `packages/api`, with a thin provider adapter for Meta Cloud API calls and webhook normalization.

## Standard Stack

Use existing monorepo architecture and add only targeted pieces.

### Core (use now)

| Component | Recommendation | Why this is standard for this phase | Confidence |
| --- | --- | --- | --- |
| API boundary | Elysia + oRPC procedures | Existing typed contract path is already operational and role-aware | HIGH |
| Persistence | Postgres + Drizzle | Need durable send records, webhook idempotency, and lifecycle auditability | HIGH |
| Validation | Zod | Required for webhook payload normalization and send input contracts | HIGH |
| Runtime/test | Bun + `bun:test` | Existing test/runtime baseline in repository | HIGH |

### Supporting (use where needed)

| Component | Recommendation | Why | Confidence |
| --- | --- | --- | --- |
| Provider client | `fetch` wrapper service around WhatsApp Graph API | Keeps provider coupling isolated and testable | HIGH |
| Signature validation | HMAC verification utility for webhook endpoint | Prevents forged status updates | MEDIUM-HIGH |
| Idempotency | DB unique keys on provider message id + status event ids | Handles duplicate/replayed webhook deliveries safely | HIGH |

## Architecture Patterns

### Pattern 1: Outbound send as run + message entities

Persist send orchestration in two levels:

- `invite_send_runs`: operator-triggered send action scoped to event + filters + policy result counters.
- `invite_messages`: one row per recipient target with provider identifiers, template metadata, and current lifecycle state.

Benefits:

- Operationally visible outcomes (`sent`, blocked, failed) for each run.
- Requeryable source of truth for dashboard lifecycle display.

### Pattern 2: Policy gate before provider dispatch

Before any provider call:

1. Resolve recipients through Phase 2 shared audience/recipient logic.
2. Apply send-eligibility + Do-Not-Message policy checks server-side.
3. Persist blocked outcomes and rejection reasons.
4. Dispatch only eligible rows.

This guarantees WA-04 behavior without UI trust.

### Pattern 3: Provider adapter isolation

Implement a dedicated `whatsapp-provider` service with:

- template send request builder,
- response normalization,
- provider error mapping,
- retry classification (transient vs terminal).

Avoid spreading provider request/response parsing across routers.

### Pattern 4: Webhook ingestion with monotonic state transitions

Ingestion pipeline:

1. Verify webhook authenticity.
2. Normalize payload to internal event shape.
3. Lookup message by provider message id.
4. Apply transition only if next state rank >= current rank.
5. Persist webhook event receipt for observability/idempotency.

Recommended rank mapping:

- `sent` = 1
- `delivered` = 2
- `read` = 3
- `failed` = terminal (transition allowed from any non-terminal state)

### Pattern 5: One lifecycle projection path for operator views

Operator status UI should consume a single query path from stored message state. Do not mix cached pre-send estimates with live webhook state projections.

## Don't Hand-Roll

| Problem | Don’t build | Use instead | Why | Confidence |
| --- | --- | --- | --- | --- |
| Policy enforcement | UI-only checks | Server-side policy service + persisted rejection outcomes | Prevents bypass and preserves auditability | HIGH |
| Webhook processing | Direct mutation from raw payload | Normalize + validate + state machine transition gate | Avoids malformed event drift and non-monotonic regressions | HIGH |
| Provider coupling | API calls inline in routers | Dedicated provider adapter service | Keeps retries/errors/testability manageable | HIGH |
| Lifecycle display | Recompute from raw webhooks each request | Persisted current state + timestamped transition log | Better performance and deterministic UX | HIGH |

## Common Pitfalls

### 1) Preview/send logic drift

**What goes wrong:** Operators see one recipient count but send to another set.

**Avoid:** Use the same recipient resolver path for preview, precheck, and send dispatch input.

### 2) Non-monotonic status updates

**What goes wrong:** Out-of-order webhooks regress state (for example `read` -> `sent`).

**Avoid:** Explicit transition-rank gate with idempotent update guard.

### 3) Missing rejection visibility

**What goes wrong:** Blocked users silently disappear from send outcomes.

**Avoid:** Persist per-recipient rejection reason and include in send summaries.

### 4) Provider message id not persisted

**What goes wrong:** Webhook events cannot be correlated reliably.

**Avoid:** Persist provider message id at send time and unique-index it within workspace/send domain.

### 5) Weak webhook authenticity checks

**What goes wrong:** Untrusted payloads alter operational lifecycle.

**Avoid:** Verify signature/token before any state mutation path.

## Planning-Ready Decomposition

Recommended plan sequence for Phase 03:

1. Schema + env baseline for invite runs/messages, lifecycle events, DNM controls, and provider/webhook config.
2. Server send pipeline with eligibility policy and provider dispatch integration.
3. Webhook endpoint ingestion with signature checks and monotonic lifecycle transitions.
4. Operator visibility surfaces for send actions and per-message lifecycle status.
5. Verification pass: policy-negative cases, webhook idempotency/order tests, and end-to-end operator flow checks.

## Verification Checklist for Phase Completion

- Parent Admin can trigger template invite send for selected event audience.
- Do-Not-Message recipients are blocked pre-send with persisted reason.
- Eligible recipients are dispatched through provider adapter and stored with provider message ids.
- Webhook events move lifecycle states monotonically (`sent` -> `delivered` -> `read`; `failed` terminal).
- Duplicate/out-of-order webhook events do not corrupt final state.
- Operator UI can inspect run outcomes and current per-message lifecycle states.
