# Architecture

## System Style
- Monorepo with workspace-separated runtime apps (`apps/web`, `apps/server`) and shared libraries (`packages/*`).
- Layered and contract-first style: UI calls typed RPC procedures from shared router definitions.
- Backend-for-frontend pattern: the server combines auth endpoints, RPC execution, and OpenAPI reference exposure.
- Strong type-sharing strategy across layers via workspace imports (for example `@parinaya-os/api/routers/index`).
- Operational orchestration is centralized through Turborepo task graph (`turbo.json`) and root scripts (`package.json`).

## Major Runtime Subsystems
- **Web application (`apps/web`)**
- Entry bootstrap and router context in `apps/web/src/main.tsx`.
- Route shell and global providers in `apps/web/src/routes/__root.tsx`.
- Feature routes in `apps/web/src/routes/index.tsx`, `apps/web/src/routes/login.tsx`, `apps/web/src/routes/dashboard.tsx`.
- Auth session-aware UI components in `apps/web/src/components/user-menu.tsx` and form workflows in `apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`.

- **Server application (`apps/server`)**
- Unified HTTP entry point in `apps/server/src/index.ts`.
- CORS, Better Auth adapter endpoint (`/api/auth/*`), RPC endpoint (`/rpc*`), and OpenAPI endpoint (`/api*`) are all wired in one process.
- Server runtime uses Bun during development (`apps/server/package.json`: `dev`).

- **API contract and middleware (`packages/api`)**
- Procedure and middleware primitives in `packages/api/src/index.ts`.
- Request-scoped context hydration from auth session in `packages/api/src/context.ts`.
- Current router surface in `packages/api/src/routers/index.ts` (`healthCheck`, `privateData`).

- **Authentication subsystem (`packages/auth`)**
- Better Auth configuration lives in `packages/auth/src/index.ts`.
- Uses Drizzle adapter against shared schema (`@parinaya-os/db/schema/auth`).
- Trusted origins and cookie behavior are controlled with env inputs from `packages/env/src/server.ts`.

- **Data subsystem (`packages/db`)**
- DB client initialization in `packages/db/src/index.ts`.
- Auth-focused relational schema in `packages/db/src/schema/auth.ts`.
- Drizzle CLI config binds migration workflow to `apps/server/.env` via `packages/db/drizzle.config.ts`.

- **Environment and configuration (`packages/env`, `packages/config`)**
- Server env contract in `packages/env/src/server.ts`.
- Web env contract in `packages/env/src/web.ts`.
- Shared TS compiler baseline in `packages/config/tsconfig.base.json`.

## Data and Control Flow
- **Anonymous health check path**
- UI route `apps/web/src/routes/index.tsx` invokes `orpc.healthCheck.queryOptions()`.
- RPC transport is configured in `apps/web/src/utils/orpc.ts` to call `${VITE_SERVER_URL}/rpc` with credentials.
- Server dispatches `/rpc*` in `apps/server/src/index.ts` through `RPCHandler` with `appRouter`.
- Router procedure returns from `packages/api/src/routers/index.ts`.

- **Login/sign-up flow**
- Forms in `apps/web/src/components/sign-in-form.tsx` and `apps/web/src/components/sign-up-form.tsx` call `authClient.signIn.email` / `authClient.signUp.email`.
- Auth client target base URL is declared in `apps/web/src/lib/auth-client.ts` from `packages/env/src/web.ts`.
- Server path `/api/auth/*` in `apps/server/src/index.ts` forwards request to `auth.handler(request)` from `packages/auth/src/index.ts`.
- Better Auth persists state through Drizzle adapter into schema in `packages/db/src/schema/auth.ts`.

- **Protected data flow**
- Route guard in `apps/web/src/routes/dashboard.tsx` checks `authClient.getSession()` before render.
- Query for protected payload uses `orpc.privateData.queryOptions()` in the same route.
- Server builds request context via `createContext` in `packages/api/src/context.ts` (`auth.api.getSession`).
- `protectedProcedure` middleware in `packages/api/src/index.ts` enforces session presence and raises `UNAUTHORIZED` on missing auth.

## Entry Points, Boundaries, Dependencies
- **Primary entry points**
- Web entry: `apps/web/src/main.tsx`.
- Server entry: `apps/server/src/index.ts`.
- DB tooling entry: `packages/db/drizzle.config.ts` and root scripts (`package.json`: `db:*`).

- **Layer boundaries (intended)**
- `apps/web` should consume contracts from `packages/api` and auth client from `better-auth/react`.
- `apps/server` composes adapters and handlers; business procedures are expected in `packages/api`.
- `packages/auth` depends on `packages/db` and `packages/env`, but not on web app code.
- `packages/db` owns schema and database connection details; no app-specific UI concerns.

- **Notable dependency edges**
- `apps/server` -> `@parinaya-os/api`, `@parinaya-os/auth`, `@parinaya-os/env`.
- `apps/web` -> `@parinaya-os/api`, `@parinaya-os/env`, `better-auth` client runtime.
- `packages/api` -> `@parinaya-os/auth` (context), `@orpc/server`.
- `packages/auth` -> `@parinaya-os/db`, `better-auth`.

## Architectural Strengths
- End-to-end type consistency between client queries and server procedures through shared router types.
- Clear split between runtime apps and shared domain/infrastructure packages.
- Environment variables are validated at runtime by schema (`packages/env/src/server.ts`, `packages/env/src/web.ts`).
- Authentication, session lookup, and persistence are integrated with minimal glue code.
- Turborepo task model cleanly separates long-running tasks (`dev`, `db:studio`) from build tasks.

## Architectural Limits and Risks
- `packages/api/src/routers/index.ts` currently contains minimal domain surface; architecture is extensible but still thin in business logic.
- Server route `/api*` in `apps/server/src/index.ts` is broad and may overlap unintentionally with future non-reference API paths.
- Auth cookie settings force `secure: true` and `sameSite: none` in `packages/auth/src/index.ts`; local non-HTTPS development can be brittle depending on client/browser setup.
- Missing explicit migrations directory usage in runtime code; schema evolution relies on operator discipline through Drizzle commands.
- UI route tree import `./routeTree.gen` in `apps/web/src/main.tsx` depends on generated artifacts and plugin conventions, increasing build-tool coupling.
