# Milestone Research Synthesis - v1.0 Core Wedding OS

## Executive Summary

ParinayaOS v1.0 should ship as a reliability-first domain expansion on the existing stack, not a platform rewrite. The milestone succeeds when it reliably runs multi-event wedding operations through a WhatsApp-first loop (invite -> status -> RSVP -> dashboard/export), with deterministic guest identity handling, strict privacy/compliance controls, and clear role/audit accountability at wedding-scale load.

## Stack additions

- Keep baseline unchanged: Bun + Turbo + React/Vite + Elysia/oRPC + Better Auth + Drizzle/Postgres.
- Add async spine: `bullmq` + `ioredis` with a dedicated `apps/worker` for sends, webhook processing, imports, exports, and reconciliation.
- Add WhatsApp adapter boundary for Meta Cloud API with env-pinned Graph version and template/window enforcement before enqueue.
- Add ingest/export utilities: `libphonenumber-js`, `fast-csv` (or `csv-stringify`), optional S3-compatible storage for generated artifacts.
- Add performance and observability primitives: `pg_trgm` indexes, projection tables/materialized views, correlation IDs, structured logs.

## Table-stakes for this milestone

- Multi-event operations with ordering and public vs invite-only visibility.
- Family-first guest model (`Person` + `GuestUnit`) with deterministic phone normalization and dedupe.
- Fast onboarding from Google Contacts/CSV/manual input with explicit conflict handling.
- Event-wise audience selection with safe bulk invite actions.
- WhatsApp core loop: compliant send, webhook-tracked status, and <=3-step RSVP (with numeric fallback).
- Parent operations core: pending RSVPs, headcount visibility, and vendor-ready CSV exports.
- Lightweight synced website, gifts basics, and role-scoped critical edits with audit logs.

## Key architecture shape/integration points

- Canonical writes live in domain services on server; web remains a typed consumer.
- `apps/server`: command/query procedures for events, guests, invites, RSVP, dashboard, exports, website settings.
- `apps/worker`: queue consumers (`invites.send`, `webhooks.process`, `imports.contacts`, `exports.generate`, `reconciliation.run`).
- `packages/contracts` + `packages/db`: typed contracts plus canonical tables for events/guests/invites/rsvp/webhooks/consent/audit/exports.
- Reliability boundaries: webhook endpoint only verifies+persistent-ack, state transitions are idempotent/monotonic, projections are rebuildable with freshness markers.

## Watch-outs/pitfalls

- Identity drift across imports creates duplicate sends and broken household counts.
- Guest model migration can corrupt historical RSVP/export truth if relinking is not versioned and reversible.
- WhatsApp compliance misses (opt-in, 24h window, DNM) can degrade deliverability and trust.
- Non-idempotent or order-sensitive webhook handling can move statuses backward and duplicate updates.
- Projection drift can desync dashboard, website, and exports unless reconciliation is routine.
- Bulk performance collapse (200+ invite actions, 1000+ guest exports) occurs without set-based writes, indexing, and queueing.
- Role/token leakage can expose cross-side or invite-only data.

## Decisions to lock now

- Lock canonical identity contract now: phone normalization standard, deterministic dedupe keys, explicit merge/relink rules.
- Lock queue-first messaging architecture now: outbox, retries with backoff, DLQ, replay-safe processors.
- Lock compliance as a server hard gate now: no UI-only safeguards for send eligibility.
- Lock projection model now: parent-facing reads from projections with `as_of` freshness and scheduled reconciliation.
- Lock authorization now: centralized role matrix (`Owner/Admin/Side Admin/Viewer`) with row-scoped reads/writes/exports.
- Lock v1 scope boundaries now: no payment rails, no theme builder, no seating/planning module, no custom chat.

## Actionable guidance for requirements and roadmap

- Encode quality gates in requirements: deterministic dedupe, webhook replay safety, <=3-step RSVP, no invite-only website leakage.
- Sequence roadmap as dependencies: domain+policy -> import/dedupe -> messaging/outbox -> webhook+RSVP transitions -> projections/dashboard/exports -> website/privacy/gifts -> hardening.
- Add explicit non-functional criteria: queue ack p95, webhook-to-dashboard latency p95, bulk enqueue throughput, export p95.
- Require negative authorization tests and compliance rejection reason codes before phase completion.
