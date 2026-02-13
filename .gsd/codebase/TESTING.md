# Testing Patterns

**Analysis Date:** 2026-02-13

## Current Framework Posture

- **No dedicated test runner is configured** in workspace manifests (`package.json`, `apps/web/package.json`, `apps/server/package.json`).
- **No `test` script exists** at root or app/package level; quality gates currently rely on type checking and lint/format checks (`package.json`, `turbo.json`).
- **No test config files were found** for Vitest/Jest/Playwright/Cypress in the active app/package paths.
- **Practical implication:** validation is currently compile-time and runtime-manual, not automated test-suite driven.

## Existing Verification Commands

- **Type checks:** `bun run check-types` (workspace), `bun run dev:web`/`bun run dev:server` for runtime smoke checks (`package.json`).
- **Lint + format checks:** `bun run check` applies Biome checks/fixes (`package.json`, `biome.json`).
- **Build checks:** `bun run build` for monorepo build integrity via Turbo (`package.json`, `turbo.json`).
- **DB workflow checks:** `bun run db:generate`, `bun run db:migrate`, `bun run db:push` for schema evolution sanity (`package.json`, `packages/db/package.json`).

## Test Locations and Naming (Observed)

- **No `*.test.*` or `*.spec.*` files** are present in app/package source trees.
- **No `__tests__` or `tests` directories** are currently in use under `apps/` or `packages/`.
- **Naming convention is therefore undefined for tests**; source files follow kebab-case and route conventions (`apps/web/src/routes/login.tsx`, `packages/api/src/routers/index.ts`).
- **Recommended fit with current style:** colocated `*.test.ts`/`*.test.tsx` next to source modules to match repository navigation patterns.

## Coverage Posture (Qualitative)

- **Automated coverage is effectively 0%** because no runner/coverage pipeline is configured.
- **High-risk paths currently unguarded by tests:**
- Auth middleware and protected procedure behavior (`packages/api/src/index.ts`, `packages/api/src/routers/index.ts`).
- Session context creation and request-bound auth lookup (`packages/api/src/context.ts`, `packages/auth/src/index.ts`).
- Client/server RPC integration and error surface behavior (`apps/web/src/utils/orpc.ts`, `apps/server/src/index.ts`).
- Form validation/submit flows (`apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`).
- **Lower-risk but still useful to test:** utility-level className composition (`apps/web/src/lib/utils.ts`) and route guard redirects (`apps/web/src/routes/dashboard.tsx`).

## Mocking and Integration Strategy (Current and Needed)

- **Current state:** no explicit mocking utilities or patterns are present because tests are absent.
- **Natural unit-test mock boundaries in this codebase:**
- Auth client methods and session hooks (`apps/web/src/lib/auth-client.ts`, `apps/web/src/components/user-menu.tsx`).
- ORPC transport/link and query cache side effects (`apps/web/src/utils/orpc.ts`).
- ORPC context/session provider boundaries (`packages/api/src/context.ts`).
- **Natural integration-test boundaries:**
- RPC endpoint behavior against `appRouter` with protected/public access (`packages/api/src/routers/index.ts`, `apps/server/src/index.ts`).
- Better Auth + Drizzle session lifecycle with real schema (`packages/auth/src/index.ts`, `packages/db/src/schema/auth.ts`).
- **Gap:** no reusable factories/fixtures for session/user payloads are defined yet in repository test utilities.

## Practical Gaps to Address

- **Missing base test infrastructure:** runner, scripts, and CI invocation are not established.
- **Missing confidence for auth regressions:** protected routes and sign-in/sign-up UX rely on manual testing.
- **Missing contract tests for ORPC:** client and server are type-safe but runtime response/error expectations are not asserted.
- **Missing DB-integrated verification:** migrations and auth tables have no automated assertions despite centrality (`packages/db/drizzle.config.ts`, `packages/db/src/schema/auth.ts`).

## Suggested Initial Test Map (Aligned to Current Code)

- **Unit tests first:** `packages/api/src/index.test.ts`, `apps/web/src/utils/orpc.test.ts`, `apps/web/src/lib/utils.test.ts`.
- **Integration tests next:** server RPC route + auth boundary tests around `apps/server/src/index.ts` and `packages/api/src/routers/index.ts`.
- **UI behavior tests:** auth form submit/validation and dashboard guard behavior in `apps/web/src/components/sign-in-form.tsx` and `apps/web/src/routes/dashboard.tsx`.
- **Data/auth integration tests:** Better Auth + Drizzle schema flows in `packages/auth/src/index.ts` and `packages/db/src/schema/auth.ts`.

---

_Assessment is based on repository manifests, configs, and source under `apps/*` and `packages/*`._
