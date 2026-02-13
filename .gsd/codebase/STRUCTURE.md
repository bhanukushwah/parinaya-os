# Structure

## Top-Level Directory Map
- `apps/` - deployable runtime applications.
- `apps/web/` - React + TanStack Router frontend, PWA-capable Vite app.
- `apps/server/` - Elysia HTTP server hosting auth, RPC, and OpenAPI handlers.
- `packages/` - reusable workspace libraries shared by apps.
- `packages/api/` - procedure definitions, auth middleware, router contracts.
- `packages/auth/` - Better Auth server configuration and DB adapter setup.
- `packages/db/` - Drizzle schema, DB client, and migration tooling config.
- `packages/env/` - environment variable schemas for server and browser contexts.
- `packages/config/` - shared TypeScript base config package.
- `.gsd/` - planning/templates and generated codebase mapping artifacts.
- `.kilocode/` - workflow and rule assets for orchestration-driven development.
- `.agents/` - locally installed skill/rule assets for specialized guidance.
- Root orchestration/config files: `package.json`, `turbo.json`, `tsconfig.json`, `biome.json`.

## App Responsibilities
- **Web app (`apps/web`)**
- Owns route composition and rendering via `apps/web/src/main.tsx` and `apps/web/src/routes/*.tsx`.
- Owns user-facing auth interactions in `apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`, and `apps/web/src/components/user-menu.tsx`.
- Owns RPC client transport and query cache policy in `apps/web/src/utils/orpc.ts`.
- Owns theme and shell composition in `apps/web/src/routes/__root.tsx` and `apps/web/src/components/theme-provider.tsx`.

- **Server app (`apps/server`)**
- Owns HTTP process startup and network binding in `apps/server/src/index.ts`.
- Owns transport bindings for:
- Better Auth endpoint (`/api/auth/*`)
- oRPC endpoint (`/rpc*`)
- OpenAPI reference endpoint (`/api*`)
- Owns deploy/build runtime packaging setup in `apps/server/tsdown.config.ts` and `apps/server/package.json`.

## Package Responsibilities
- **`packages/api`**
- Defines reusable procedure primitives (`publicProcedure`, `protectedProcedure`) in `packages/api/src/index.ts`.
- Defines request context assembly in `packages/api/src/context.ts`.
- Exposes router contract and client type in `packages/api/src/routers/index.ts`.

- **`packages/auth`**
- Central Better Auth config in `packages/auth/src/index.ts`.
- Connects auth runtime to Drizzle and schema from `packages/db/src/schema/auth.ts`.

- **`packages/db`**
- Exposes typed DB client in `packages/db/src/index.ts`.
- Keeps schema grouped under `packages/db/src/schema/` with aggregator file `packages/db/src/schema/index.ts`.
- Keeps migration CLI configuration in `packages/db/drizzle.config.ts`.

- **`packages/env`**
- Server-side env contract in `packages/env/src/server.ts`.
- Browser-side env contract in `packages/env/src/web.ts`.

- **`packages/config`**
- Shared TS defaults in `packages/config/tsconfig.base.json`.

## Naming and Placement Patterns
- `apps/*/src/index.ts` is used as application runtime entry (`apps/server/src/index.ts`; web bootstraps from `apps/web/src/main.tsx`).
- Route files follow TanStack file routing conventions under `apps/web/src/routes/` (`index.tsx`, `login.tsx`, `dashboard.tsx`, `__root.tsx`).
- UI primitives are colocated in `apps/web/src/components/ui/` and consumed by feature components in `apps/web/src/components/`.
- Shared package public entrypoints expose `src/index.ts` through package `exports` in each package `package.json`.
- Environment schemas are split by runtime boundary (`server.ts` vs `web.ts`) under one package.
- Database schema modules live in `packages/db/src/schema/` and are re-exported for adapter consumption.
- Workspace alias `@/*` is scoped per app (`apps/web/tsconfig.json`, `apps/server/tsconfig.json`) and not cross-app.

## Domain Logic Placement
- Auth and session lifecycle logic lives primarily in:
- `packages/auth/src/index.ts`
- `packages/api/src/context.ts`
- `packages/api/src/index.ts`
- Domain-facing API behavior currently lives in `packages/api/src/routers/index.ts`.
- Persistence/domain model for identity lives in `packages/db/src/schema/auth.ts`.
- UI-level auth orchestration and route protection lives in:
- `apps/web/src/routes/dashboard.tsx`
- `apps/web/src/lib/auth-client.ts`
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/components/sign-up-form.tsx`

## Dependency and Ownership Boundaries
- `apps/web` consumes shared contracts; it does not directly access DB schema or DB client.
- `apps/server` orchestrates inbound HTTP and delegates auth/procedure logic to packages.
- `packages/api` depends on auth context but remains transport-agnostic in procedure definitions.
- `packages/auth` owns cookie/auth policy; callers use exported `auth` instance rather than custom auth logic.
- `packages/db` is the only layer that should define table schemas and DB wiring.

## Practical Navigation Guide
- To change public/protected API behavior, start at `packages/api/src/routers/index.ts`.
- To modify auth policy or providers, edit `packages/auth/src/index.ts`.
- To add DB fields for auth/session entities, edit `packages/db/src/schema/auth.ts` and run DB scripts from root `package.json`.
- To adjust client RPC transport, edit `apps/web/src/utils/orpc.ts`.
- To change route access control, edit `apps/web/src/routes/dashboard.tsx` and related route files.
- To update runtime env requirements, edit `packages/env/src/server.ts` or `packages/env/src/web.ts`.
