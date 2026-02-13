# ParinayaOS Project Research - Stack

**Researched:** 2026-02-13  
**Scope:** Brownfield stack decisions for WhatsApp-first wedding coordination (India)  
**Confidence:** HIGH for baseline + HIGH/MEDIUM for new additions (noted per item)

<research_summary>

## Summary

For a 2025-standard build of this product, the right approach is to **keep the existing Bun + Turbo + React + Elysia + oRPC + Better Auth + Drizzle/Postgres baseline** and add a **messaging-grade async layer** (queue, webhook ingestion, delivery reconciliation, export workers) around WhatsApp Cloud API from day one.

The critical stack choice is not frontend framework churn; it is operational reliability for messaging and headcount correctness. With 1000+ guests and 8-10 events, synchronous request handlers and direct provider calls will fail under burst load. Queue-first messaging, idempotent webhook processing, and projection-based dashboards are mandatory.

**Primary recommendation:** Keep current app stack, add BullMQ + Redis for messaging orchestration, and treat WhatsApp Cloud API integration as an adapter with strict compliance/state controls.

</research_summary>

<recommended_stack>

## Recommended Stack (Prescriptive)

### 1) Core Product Runtime (keep)

| Technology | Version | Purpose | Why this is the 2025-standard choice here | Confidence |
| --- | --- | --- | --- | --- |
| Bun | `1.2.15` (current repo pin) | Runtime + package manager + workspace tooling | Already integrated; fastest path in brownfield; avoids costly runtime migration | HIGH |
| Turbo | `2.6.3` (current repo pin) | Monorepo task graph + cache | Already wired across apps/packages; supports parallel delivery | HIGH |
| React | `19.2.3` (repo) | Admin UI + website UI | React 19 is stable and mainstream; strong ecosystem for mobile-first forms/lists | HIGH |
| Vite | `6.2.2` (repo) | Frontend build/dev | Fast HMR/build; already integrated with PWA plugin | HIGH |
| Elysia | `1.4.x` (repo uses `^1.4.21`) | API server | Matches Bun runtime and current codebase architecture | HIGH |
| oRPC | `1.12.2` (repo) | End-to-end typed API contracts | Existing typed transport path is already operational | HIGH |
| Better Auth | `1.4.x` (repo uses `^1.4.18`) | Admin authentication/session | Existing auth baseline; no need to swap in v1 | HIGH |
| Drizzle + PostgreSQL | Drizzle (current repo), Postgres 16+ managed | Canonical system of record | Best fit for relational wedding domain + exports + auditability | HIGH |

### 2) Messaging + Async Reliability (add now)

| Technology | Version | Purpose | Why required for v1 capabilities | Confidence |
| --- | --- | --- | --- | --- |
| WhatsApp Cloud API (Meta) | Graph API pinned per env (recommend `v23+` policy in 2025) | Outbound templates + interactive messages + inbound replies + statuses | Product promise is WhatsApp-first from day one; must be first-party integration | MEDIUM |
| BullMQ | `5.x` (latest stream active) | Queueing, retries, delayed sends, backoff, DLQ | Required for throughput control, idempotency, and webhook burst handling | HIGH |
| Redis (Upstash or managed Redis) | Redis 7+ | BullMQ backend, dedupe keys, rate-limit counters | Low-latency distributed coordination for send pipeline | HIGH |
| Worker process (`apps/worker`) | same Bun/TS toolchain | Isolate heavy jobs from API request path | Prevents dashboard/API latency collapse during sends/imports/exports | HIGH |

### 3) Data, Search, and Export (v1-focused)

| Technology | Version | Purpose | Why this is enough for 1000+ guests | Confidence |
| --- | --- | --- | --- | --- |
| PostgreSQL indexes + trigram (`pg_trgm`) | PG extension | Fast guest search by name/phone/tag | Avoids introducing Elastic/OpenSearch too early | HIGH |
| `fast-csv` (or `csv-stringify`) | current stable major | Vendor/export CSV generation | Stream-safe and memory-safe for large exports | MEDIUM |
| Object storage (S3-compatible: R2/S3/GCS) | managed service | Store QR images, generated exports, webhook raw payload archives | Durable storage for artifacts + forensic replay | HIGH |

### 4) Frontend and parent-friendly delivery

| Technology | Version | Purpose | Why this aligns with PRD constraints | Confidence |
| --- | --- | --- | --- | --- |
| `vite-plugin-pwa` | `1.0.1` (repo) | PWA installability + offline shell for admin app | Supports low-bandwidth usage patterns in mobile-heavy families | HIGH |
| TanStack Query + Router + Form | repo-pinned (`^5.x`, `^1.x`) | Data fetching, route UX, parent-friendly form state | Existing baseline; proven list-heavy admin UX patterns | HIGH |

### 5) Observability + compliance guardrails

| Technology | Version | Purpose | Why needed day one for Cloud API ops | Confidence |
| --- | --- | --- | --- | --- |
| OpenTelemetry + tracing sink (Sentry/Datadog/etc.) | current stable major | Trace command -> queue -> provider -> webhook lifecycle | Required for delivery/debug transparency under real wedding load | MEDIUM |
| Structured logs (JSON + correlation IDs) | N/A | Audit and incident debugging | Essential for message failures and RSVP dispute resolution | HIGH |
| Consent/DNM ledger in Postgres | domain table, not vendor tool | Enforce opt-out and policy controls | Compliance must be in-core, not a spreadsheet/manual process | HIGH |

</recommended_stack>

<why_not_other_stacks>

## What NOT to Use (for v1)

| Avoid | Why it hurts this project | Use instead |
| --- | --- | --- |
| Twilio/aggregator as primary WhatsApp provider | Adds cost + abstraction + migration risk while requirement is Cloud API from day one | Direct Meta WhatsApp Cloud API adapter |
| Kafka/RabbitMQ in v1 | Operational overhead is unjustified at this scale and team size | BullMQ + Redis |
| Elasticsearch/OpenSearch for guest search in v1 | Premature complexity for 1k-2k guest scale | Postgres + proper indexes + trigram |
| Replatforming web to Next.js mid-milestone | High migration cost with minimal user-facing benefit now | Keep Vite+React and ship domain features |
| Guest login/account system | Violates zero-login WhatsApp-first experience | Tokenized guest links + WhatsApp reply flows |

</why_not_other_stacks>

<tradeoffs_and_risks>

## Risks and Tradeoffs

1. **Cloud API policy/quality constraints**  
   Tradeoff: direct API gives control, but template quality and window rules are strict.  
   Mitigation: compliance gate before enqueue, template health monitoring, conservative retries.

2. **Queue introduces operational surface area**  
   Tradeoff: another moving part (Redis + workers), but required for reliability.  
   Mitigation: keep single queue technology, explicit DLQ + replay tooling, per-wedding throttles.

3. **Projection lag vs exact real-time counts**  
   Tradeoff: projection architecture improves speed but introduces eventual consistency.  
   Mitigation: show "last updated" timestamp and run periodic reconciliation jobs.

4. **Brownfield version drift**  
   Tradeoff: staying on current pins is safer short-term but can accumulate upgrades later.  
   Mitigation: adopt quarterly dependency window for framework/security upgrades.

</tradeoffs_and_risks>

<version_policy>

## Versioning Policy (Roadmap input)

- Keep currently pinned baseline versions for phase execution unless blocked by a required feature/security fix.
- For WhatsApp integration, keep Graph API version configurable via env (example: `WHATSAPP_GRAPH_VERSION`) and review each Meta deprecation cycle.
- Pin new infrastructure libs by major line initially (`bullmq@5`, `ioredis@5`) and lock exact versions during implementation PR.

</version_policy>

<sources>

## Sources

### Primary (HIGH confidence)

- `.gsd/PROJECT.md` - product constraints, brownfield baseline, scale/compliance requirements.
- `docs/PRD.md` - v1 capabilities, WhatsApp-first behavior, RSVP and dashboard acceptance criteria.
- `package.json` - workspace/runtime pins (`bun@1.2.15`, Turbo, core catalogs).
- `apps/web/package.json` - React/Vite/TanStack/PWA versions.
- `apps/server/package.json` - Elysia/oRPC server baseline.

### Official docs/release evidence (HIGH/MEDIUM)

- React 19 stable announcement: `https://react.dev/blog/2024/12/05/react-19`.
- Google People API contacts endpoint behavior: `https://developers.google.com/people/api/rest/v1/people.connections/list`.
- Contact Picker constraints/support model: `https://developer.chrome.com/docs/capabilities/web-apis/contact-picker`.
- Elysia release stream (version line validation): `https://github.com/elysiajs/elysia/releases`.
- BullMQ release stream (active 5.x validation): `https://github.com/taskforcesh/bullmq/releases`.

### Meta WhatsApp docs note (MEDIUM)

- URLs in PRD references point to official Meta/WhatsApp Cloud API docs, but automated fetch returned HTTP 400 in this environment. Recommendations are aligned to PRD-cited constraints (templates, webhooks, interactive replies, 24h policy windows) and should be re-validated during implementation against current Graph API docs.

</sources>

<metadata>

## Metadata

- **Research type:** Project Research (Stack dimension)
- **Milestone context:** Subsequent/brownfield
- **Roadmap readiness:** Ready
- **Revalidation trigger:** Before implementing WhatsApp adapter and before production launch

</metadata>
