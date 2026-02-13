# Integrations

## Integration inventory
- PostgreSQL datastore via `pg` + Drizzle ORM in `packages/db/src/index.ts` and schema definitions in `packages/db/src/schema/auth.ts`.
- Better Auth provider for session/auth flows in `packages/auth/src/index.ts`, exposed over HTTP in `apps/server/src/index.ts` (`/api/auth/*`).
- Browser auth integration via Better Auth React client in `apps/web/src/lib/auth-client.ts`.
- RPC API integration between web and server via oRPC:
  - Server handlers in `apps/server/src/index.ts` (`RPCHandler`, `OpenAPIHandler`).
  - Shared router contracts in `packages/api/src/routers/index.ts`.
  - Web client transport in `apps/web/src/utils/orpc.ts`.
- CORS boundary integration between frontend and backend via `@elysiajs/cors` in `apps/server/src/index.ts`, configured by env origin.

## Datastore integration details
- DB connection is created from runtime env `DATABASE_URL` in `packages/db/src/index.ts`.
- Drizzle schema modules loaded from `packages/db/src/schema/index.ts` and `packages/db/src/schema/auth.ts`.
- Auth-related relational tables include `user`, `session`, `account`, and `verification` in `packages/db/src/schema/auth.ts`.
- Migration/generation/studio commands are provided in `packages/db/package.json` (`db:push`, `db:generate`, `db:migrate`, `db:studio`).
- Drizzle CLI configuration points to PostgreSQL and schema output in `packages/db/drizzle.config.ts`.

## Authentication integration details
- Better Auth core setup:
  - Adapter: `drizzleAdapter(db, { provider: "pg", schema })` in `packages/auth/src/index.ts`.
  - Auth mode: email/password enabled in `packages/auth/src/index.ts`.
  - Cookie policy hardening (`sameSite`, `secure`, `httpOnly`) in `packages/auth/src/index.ts`.
- API mount path:
  - Requests routed to `auth.handler(request)` at `/api/auth/*` in `apps/server/src/index.ts`.
- Session resolution for API context:
  - `auth.api.getSession(...)` in `packages/api/src/context.ts`.
- Frontend auth calls:
  - Session read: `authClient.useSession()` in `apps/web/src/components/user-menu.tsx`, `apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`.
  - Sign in/up/out calls in `apps/web/src/components/sign-in-form.tsx`, `apps/web/src/components/sign-up-form.tsx`, `apps/web/src/components/user-menu.tsx`.

## API integration points (web <-> server)
- Server RPC endpoint is mounted at `/rpc*` in `apps/server/src/index.ts`.
- Web RPC base URL is `${env.VITE_SERVER_URL}/rpc` in `apps/web/src/utils/orpc.ts`.
- Shared typed router contract exported as `AppRouter`/`AppRouterClient` in `packages/api/src/routers/index.ts`.
- Public route example `healthCheck` and protected route example `privateData` are in `packages/api/src/routers/index.ts`.
- Protected route auth middleware (`ORPCError("UNAUTHORIZED")`) is in `packages/api/src/index.ts`.
- OpenAPI reference generation pipeline uses `OpenAPIReferencePlugin` and `ZodToJsonSchemaConverter` in `apps/server/src/index.ts`.

## CORS and origin boundary
- CORS middleware uses `origin: env.CORS_ORIGIN` in `apps/server/src/index.ts`.
- Better Auth trusted origins are pinned to `[env.CORS_ORIGIN]` in `packages/auth/src/index.ts`.
- Frontend requests include credentials (`credentials: "include"`) in `apps/web/src/utils/orpc.ts`.

## Environment variables and secrets (names only)
- Server env contract (validated in `packages/env/src/server.ts`):
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `CORS_ORIGIN`
  - `NODE_ENV`
- Web env contract (validated in `packages/env/src/web.ts`):
  - `VITE_SERVER_URL`
- Local env files where these are expected:
  - `apps/server/.env`
  - `apps/web/.env`

## Webhook/background/queue touchpoints
- No webhook handlers are currently implemented in app code under `apps/server/src` or `packages/*/src`.
- No queue/worker frameworks are present in package manifests (`apps/server/package.json`, `packages/*/package.json`) and no queue processor modules are defined under `apps/server/src`.
- No scheduled/background job modules (cron/scheduler workers) are present in `apps/server/src` or `packages/api/src`.

## Notable integration boundaries by file
- `apps/server/src/index.ts`: HTTP integration boundary (auth routes, RPC routes, OpenAPI routes, CORS).
- `packages/api/src/context.ts`: request-to-session boundary using Better Auth session extraction.
- `packages/api/src/index.ts`: authorization middleware boundary for protected procedures.
- `packages/auth/src/index.ts`: auth-to-database adapter boundary.
- `packages/db/src/index.ts`: app-to-PostgreSQL connection boundary.
- `apps/web/src/lib/auth-client.ts`: browser-to-auth API boundary.
- `apps/web/src/utils/orpc.ts`: browser-to-RPC API boundary.
- `packages/env/src/server.ts` and `packages/env/src/web.ts`: runtime configuration and secret contract boundaries.
