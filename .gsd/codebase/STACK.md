# Stack

## Monorepo and package management
- Monorepo uses Bun workspaces via root `package.json` (`workspaces.packages: ["apps/*", "packages/*"]`) with Turbo orchestration (`scripts.dev/build/check-types`) in `package.json`.
- Package manager/runtime target is Bun (`"packageManager": "bun@1.2.15"`) in `package.json`.
- Lockfile indicates Bun dependency resolution in `bun.lock`.
- Turbo task graph and caching behavior is defined in `turbo.json` (build outputs, persistent dev/db tasks, non-cached DB ops).

## Languages and runtimes
- Primary language is TypeScript across apps/packages (`apps/**/*.ts(x)`, `packages/**/*.ts`).
- Frontend runtime is browser + React 19 (`react`, `react-dom`) declared in `apps/web/package.json` and bootstrapped in `apps/web/src/main.tsx`.
- Backend runtime is Bun with ESM TypeScript entrypoint in `apps/server/package.json` (`bun run --hot src/index.ts`) and `apps/server/src/index.ts`.
- Shared server-side library runtime uses Bun/Node-compatible ESM TypeScript in `packages/*` (`type: module` in package manifests).

## Frameworks and major libraries (with usage evidence)
- Elysia web server in `apps/server/src/index.ts` (`import { Elysia } from "elysia"`) with CORS plugin from `@elysiajs/cors`.
- oRPC server stack in `apps/server/src/index.ts` via `RPCHandler`, `OpenAPIHandler`, and `@orpc/zod`; procedures/middleware in `packages/api/src/index.ts`.
- oRPC client stack in web app via `apps/web/src/utils/orpc.ts` (`createORPCClient`, `RPCLink`, `createTanstackQueryUtils`).
- Better Auth server integration in `packages/auth/src/index.ts` (`betterAuth`, `drizzleAdapter`) and mounted routes in `apps/server/src/index.ts` (`/api/auth/*`).
- Better Auth React client in `apps/web/src/lib/auth-client.ts` (`createAuthClient`) and session usage in `apps/web/src/components/user-menu.tsx`.
- Drizzle ORM with PostgreSQL driver in `packages/db/src/index.ts` (`drizzle-orm/node-postgres`) and schema in `packages/db/src/schema/auth.ts`.
- Drizzle migration tooling in `packages/db/package.json` (`drizzle-kit` scripts) and config in `packages/db/drizzle.config.ts`.
- React Router and data loading via TanStack Router in `apps/web/src/main.tsx`, `apps/web/src/routes/__root.tsx`, and route modules under `apps/web/src/routes`.
- Data fetching/caching via TanStack Query in `apps/web/src/utils/orpc.ts`, `apps/web/src/routes/index.tsx`, and `apps/web/src/routes/dashboard.tsx`.
- Form state/validation via TanStack Form + Zod in `apps/web/src/components/sign-in-form.tsx` and `apps/web/src/components/sign-up-form.tsx`.
- UI primitives and styling via Base UI (`apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/dropdown-menu.tsx`) and shadcn config `apps/web/components.json`.
- Styling stack uses Tailwind CSS v4 and utility composition via `apps/web/src/index.css` and `apps/web/src/lib/utils.ts` (`tailwind-merge`, `clsx`).
- Theme management via `next-themes` in `apps/web/src/components/theme-provider.tsx` and toaster theming in `apps/web/src/components/ui/sonner.tsx`.
- Notifications via `sonner` in `apps/web/src/utils/orpc.ts` and `apps/web/src/components/ui/sonner.tsx`.
- Environment schema validation via `@t3-oss/env-core` + Zod in `packages/env/src/server.ts` and `packages/env/src/web.ts`.

## Build, dev, and quality tooling
- Monorepo task runner is Turbo (`turbo`) configured in `turbo.json` and invoked from root scripts in `package.json`.
- Frontend dev/build uses Vite (`apps/web/package.json`) and config in `apps/web/vite.config.ts`.
- Backend build uses `tsdown` (`apps/server/package.json`) with bundling config in `apps/server/tsdown.config.ts`.
- Backend local development runs hot Bun execution (`bun run --hot`) in `apps/server/package.json`.
- Optional native binary build path exists via `bun build --compile` in `apps/server/package.json` (`compile` script).
- Type-checking is enabled monorepo-wide via `turbo check-types` and workspace-local via `tsc`/`tsc -b` in package scripts.
- Lint/format tool is Biome configured in `biome.json`, executed from root `package.json` (`check` script).
- PWA support uses `vite-plugin-pwa` in `apps/web/vite.config.ts` and asset generation in `apps/web/pwa-assets.config.ts`.

## Testing status
- No dedicated automated test runner scripts (`test`, `vitest`, `jest`, `playwright`, `cypress`) are present in root/app/package manifests (`package.json`, `apps/web/package.json`, `apps/server/package.json`, `packages/*/package.json`).
- Current quality gate is static analysis/type/lint formatting (`check-types`, `biome check`) rather than test suites.

## Key configuration files and controls
- `package.json` (root): workspace topology, shared dependency catalog, monorepo scripts, package manager.
- `turbo.json`: task dependency graph, cache policy, persistent tasks, output tracking.
- `biome.json`: formatter/linter rules, include/exclude patterns, import organization.
- `tsconfig.json` (root): extends shared TypeScript baseline from config package.
- `packages/config/tsconfig.base.json`: strict TS compiler baseline for all extending packages.
- `apps/web/tsconfig.json`: web compiler options, JSX mode, path alias `@/*`.
- `apps/server/tsconfig.json`: server composite build output and path aliases.
- `apps/web/vite.config.ts`: plugin pipeline (Tailwind, TanStack Router, React, PWA), aliasing, dev port.
- `apps/server/tsdown.config.ts`: backend bundling entry/output and internal workspace package bundling policy.
- `packages/db/drizzle.config.ts`: schema path, migration output folder, PostgreSQL connection source.
- `apps/web/components.json`: shadcn component generation/style aliases and CSS integration.
- `packages/env/src/server.ts` and `packages/env/src/web.ts`: authoritative runtime env schema contracts.
