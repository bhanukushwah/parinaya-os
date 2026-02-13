# Coding Conventions

**Analysis Date:** 2026-02-13

## Style and Naming

- **Monorepo layout:** app code in `apps/web` and `apps/server`, shared logic in `packages/*` (`README.md`, `package.json`).
- **File naming:** mostly kebab-case for modules and route files, including `apps/web/src/routes/dashboard.tsx`, `apps/web/src/components/sign-in-form.tsx`, and `packages/api/src/routers/index.ts`.
- **Component naming:** React component functions use PascalCase (`apps/web/src/components/header.tsx`, `apps/web/src/components/user-menu.tsx`).
- **Function/variable naming:** camelCase for runtime values and helpers (`apps/web/src/utils/orpc.ts`, `packages/api/src/context.ts`).
- **Type naming:** PascalCase for exported types/interfaces (`packages/api/src/context.ts`, `apps/web/src/routes/__root.tsx`).
- **Constants:** UPPER_SNAKE_CASE appears for static text blocks (`apps/web/src/routes/index.tsx`), otherwise local constants are camelCase.

## Formatting and Imports

- **Formatter/linter:** Biome is the source of truth via `biome.json` and root command `bun run check` (`package.json`).
- **Indentation and quotes:** tabs + double quotes are enforced (`biome.json`).
- **Imports:** type-only imports are preferred where relevant (`import type`) and usually grouped before value imports (`apps/web/src/routes/__root.tsx`, `packages/api/src/index.ts`).
- **Alias usage:** web and server code use `@/*` aliasing for local imports (`apps/web/tsconfig.json`, `apps/server/tsconfig.json`).
- **Workspace package imports:** shared modules are consumed via `@parinaya-os/*` package names (`apps/server/src/index.ts`, `apps/web/src/utils/orpc.ts`).

## Error Handling and Logging

- **Auth guard pattern:** authorization failures throw typed ORPC errors in middleware (`packages/api/src/index.ts`).
- **Boundary error interception:** server handlers attach `onError` interceptors and log with `console.error` (`apps/server/src/index.ts`).
- **Client request errors:** UI surfaces errors through toast notifications from callback handlers (`apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`).
- **Query-layer errors:** global React Query cache `onError` displays retriable toasts (`apps/web/src/utils/orpc.ts`).
- **Current logging posture:** logging is minimal and console-based; no structured logger abstraction exists yet (`apps/server/src/index.ts`).

## Type Safety and Validation

- **Strict TS baseline:** shared config enables `strict`, `noUncheckedIndexedAccess`, and unused-code checks (`packages/config/tsconfig.base.json`).
- **Runtime env validation:** server and web envs are validated with `createEnv` + Zod (`packages/env/src/server.ts`, `packages/env/src/web.ts`).
- **Form validation:** TanStack Form uses Zod schema validators on submit (`apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`).
- **API typing:** ORPC context, router, and client types are derived from source router definitions (`packages/api/src/routers/index.ts`, `apps/web/src/utils/orpc.ts`).
- **DB typing:** Drizzle schema-driven typing is used with relation declarations (`packages/db/src/schema/auth.ts`, `packages/db/src/index.ts`).

## Implementation Patterns

- **Procedure split:** explicit `publicProcedure` vs `protectedProcedure` model for route-level access control (`packages/api/src/index.ts`, `packages/api/src/routers/index.ts`).
- **Context assembly:** request context composes authenticated session once at boundary and passes downward (`packages/api/src/context.ts`, `apps/server/src/index.ts`).
- **Route guards in UI:** TanStack Router `beforeLoad` redirects unauthenticated users (`apps/web/src/routes/dashboard.tsx`).
- **Reusable UI primitives:** component primitives are wrapped and re-exported from `apps/web/src/components/ui/*` with variant helpers (`apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/dropdown-menu.tsx`).
- **Client transport centralization:** ORPC link and QueryClient live in one module for consistent fetch credentials and error handling (`apps/web/src/utils/orpc.ts`).

## Anti-Patterns and Risks to Avoid

- **Avoid duplicating auth form logic:** `sign-in-form` and `sign-up-form` share similar submit/error/render flow and can drift (`apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`).
- **Avoid scattered console logging:** keep error behavior centralized; current interceptor logging is a single point but not structured (`apps/server/src/index.ts`).
- **Avoid bypassing env contracts:** do not read raw `process.env` in app code outside env modules (`packages/env/src/server.ts`, `packages/env/src/web.ts`).
- **Avoid weakening strictness:** do not introduce relaxed TS options that conflict with base config (`packages/config/tsconfig.base.json`).
- **Avoid route-level auth checks in many components:** continue preferring `beforeLoad` and protected procedures over ad-hoc UI checks (`apps/web/src/routes/dashboard.tsx`, `packages/api/src/index.ts`).

---

_Source set: core runtime code, config files, and package manifests in this repository._
