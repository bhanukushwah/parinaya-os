# Concerns

## Technical Debt Hotspots

- API surface is still mostly scaffold-level; business routes are minimal in `packages/api/src/routers/index.ts` and currently only expose `healthCheck` + `privateData`.
- Server routing is concentrated in a single entrypoint (`apps/server/src/index.ts`), mixing CORS, auth handler mounting, RPC, OpenAPI wiring, and boot logic in one file.
- Authentication and session context are tightly coupled to transport details in `packages/api/src/context.ts` (direct dependency on Elysia request headers), which increases refactor friction.
- Database access setup is thin (`packages/db/src/index.ts`) with no visible cross-cutting concerns (pool tuning, retry/backoff policy, query instrumentation).
- Migration discipline appears incomplete: Drizzle config writes to `packages/db/src/migrations` in `packages/db/drizzle.config.ts`, but no migration files are present.
- Root app docs still look template-derived (`README.md`) and do not document operational constraints (auth cookie requirements, CORS deployment matrix, DB migration workflow).

## Security and Privacy Risks

- Plaintext secrets exist in working tree at `apps/server/.env` (includes auth secret and DB credentials); this is a leak risk if accidentally committed or copied into logs.
- Session cookie config enforces `sameSite: "none"` + `secure: true` in `packages/auth/src/index.ts`; this is correct for cross-site cookies but amplifies CSRF exposure if not paired with anti-CSRF controls.
- No explicit CSRF protection layer is visible in `apps/server/src/index.ts` around `/api/auth/*` and RPC endpoints.
- No request-rate limiting or abuse throttling is visible in `apps/server/src/index.ts`, leaving auth and API routes vulnerable to brute-force and flood traffic.
- Error handlers log raw errors via `console.error` in `apps/server/src/index.ts`; depending on upstream error objects, sensitive metadata may be logged.
- OpenAPI handler is publicly mounted through `/api*` in `apps/server/src/index.ts`; this may unintentionally expose endpoint contracts in production.

## Performance and Scalability Concerns

- No explicit DB pool sizing or connection lifecycle controls are configured in `packages/db/src/index.ts`; default behavior can become a bottleneck under concurrent load.
- Session hydration runs in request context creation (`packages/api/src/context.ts`) for RPC/OpenAPI calls; this can add per-request auth/database overhead at scale.
- Query error UX in `apps/web/src/utils/orpc.ts` emits toasts from global `QueryCache.onError`; repeated failures can create high UI noise and extra render churn.
- Developer tooling is always rendered in root UI (`apps/web/src/routes/__root.tsx`) via `TanStackRouterDevtools` and `ReactQueryDevtools`; this adds avoidable bundle/runtime overhead in production builds.
- PWA dev options are enabled in `apps/web/vite.config.ts` (`devOptions: { enabled: true }`), which can complicate cache behavior and debug loops if not environment-gated.

## Reliability and Operability Gaps

- Server listen port is hardcoded (`apps/server/src/index.ts` uses `.listen(3000)`), reducing deployment flexibility across environments.
- Startup observability is minimal: only a single startup `console.log` is emitted in `apps/server/src/index.ts`, with no structured logging, request IDs, or log levels.
- Health signaling is shallow: `/` returns static "OK" in `apps/server/src/index.ts` and `healthCheck` returns static data in `packages/api/src/routers/index.ts`; neither validates DB/auth dependencies.
- Test coverage infrastructure appears absent: no `test` scripts across package manifests (`package.json`, `apps/server/package.json`, `apps/web/package.json`) and no `*.test.*` files detected.
- CI/CD guardrails are not visible (no `.github/workflows`), increasing risk of regressions from unchecked changes.
- No explicit graceful shutdown behavior (draining connections/requests) is visible in `apps/server/src/index.ts`.

## Prioritized Risk List

- **P1 - Critical - Secret exposure in local env files**
  - Severity: Critical
  - Affected areas: Auth, database credentials, deployment hygiene
  - Evidence: `apps/server/.env`
  - Why it matters: Credential compromise can lead to account takeover and database breach.

- **P2 - High - Missing anti-abuse controls on public endpoints**
  - Severity: High
  - Affected areas: Auth endpoints, RPC API availability
  - Evidence: `apps/server/src/index.ts`, `packages/auth/src/index.ts`
  - Why it matters: Increases brute-force, credential-stuffing, and DoS susceptibility.

- **P3 - High - Production exposure of API reference/contracts**
  - Severity: High
  - Affected areas: External attack surface, recon risk
  - Evidence: `apps/server/src/index.ts`
  - Why it matters: Public contract visibility lowers attacker discovery cost.

- **P4 - Medium - No automated tests and no CI checks**
  - Severity: Medium
  - Affected areas: Change safety, release confidence
  - Evidence: `package.json`, `apps/server/package.json`, `apps/web/package.json`
  - Why it matters: Regressions are likely to be detected late.

- **P5 - Medium - Devtools shipped unguarded in root app tree**
  - Severity: Medium
  - Affected areas: Frontend performance, production UX
  - Evidence: `apps/web/src/routes/__root.tsx`
  - Why it matters: Adds unnecessary client overhead and possible information leakage.

- **P6 - Medium - Static health checks do not verify dependencies**
  - Severity: Medium
  - Affected areas: Monitoring fidelity, incident response
  - Evidence: `apps/server/src/index.ts`, `packages/api/src/routers/index.ts`
  - Why it matters: False-positive health can hide outages until user-facing failures.

- **P7 - Medium - Hardcoded infrastructure assumptions (port/env coupling)**
  - Severity: Medium
  - Affected areas: Deployment portability, operations
  - Evidence: `apps/server/src/index.ts`, `packages/db/drizzle.config.ts`
  - Why it matters: Increases friction across staging/production topologies.
