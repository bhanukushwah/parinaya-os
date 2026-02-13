# Project Research Synthesis

## Executive Summary

ParinayaOS should stay on the current brownfield baseline (Bun + Turbo + React/Vite + Elysia/oRPC + Better Auth + Drizzle/Postgres) and invest roadmap effort in reliability-critical domain architecture: queue-first WhatsApp orchestration, deterministic guest identity, and projection-backed parent operations. Product success depends less on UI framework changes and more on message delivery correctness, RSVP state integrity, and trust-preserving privacy/compliance controls at 1000+ guest scale.

## Stack Recommendations

- Keep the existing runtime and typed contract path; avoid replatforming during v1/v2 execution.
- Add BullMQ + Redis + dedicated worker process for all bursty/long-running flows (messaging, imports, exports, reconciliation).
- Integrate WhatsApp Cloud API via an isolated adapter with version pinning by environment.
- Use Postgres as canonical store, with projection/read models for fast dashboard and export performance.
- Add structured logging, correlation IDs, and tracing across command -> outbox -> provider -> webhook lifecycle.

## Table Stakes

- Multi-event wedding management with event-level visibility controls.
- Family-centric guest model (GuestUnit + Person) with fast import and deterministic phone-based dedupe.
- Event-wise audience selection and bulk invite actions.
- Zero-login WhatsApp RSVP capture (interactive + resilient fallback).
- Parent-first dashboard with pending visibility and vendor-ready CSV exports.
- Lightweight synced website and baseline role/audit controls.

## Differentiators

- Household-first RSVP with uncertain count/confidence handling.
- WhatsApp-native policy-aware RSVP loop, not just link sharing.
- Import-now-clean-later workflow tuned for messy real-world contacts.
- Privacy-aware event visibility across website and messaging channels.
- Parent-operational UX optimized for quick decisions and exports.

## Architecture Shape

- Domain-driven bounded contexts: Wedding/Roles, Guest, Events, Invitation/RSVP, Messaging, Website/Gifts, Compliance/Audit.
- Canonical write model in Postgres; external provider events mutate state only via validated transitions.
- Transactional outbox + async workers for outbound messaging and high-volume operations.
- Idempotent webhook ingestion with append-only raw payload store and monotonic state transitions.
- Projection tables/materialized views for counters, pending lists, and status funnels.
- Public website/token surface isolated with strict scoped access and no admin privilege crossover.

## Key Pitfalls

- RSVP history corruption during Person -> GuestUnit retrofits.
- Non-idempotent webhook processing causing duplicate/out-of-order state corruption.
- Policy-unsafe sends (opt-out/window/template violations) damaging delivery and compliance posture.
- Phone normalization drift across import channels creating duplicate or wrong merges.
- Bulk operation collapse at real wedding scale due to row-by-row writes and weak indexing.
- Role-scope leakage and token privacy leaks in side-scoped collaboration/public surfaces.
- Cross-surface state drift (dashboard/export/website/message logs disagreeing).

## Decisions to Lock Now

- Lock canonical identity model and migration safety rules before UX expansion.
- Lock queue-first messaging architecture (outbox, retries, DLQ, replay) before broad invite UX.
- Lock send-time compliance gate as a hard server check, never a UI hint.
- Lock E.164 normalization + deterministic dedupe contract shared across all import sources.
- Lock projection-first dashboard strategy with explicit freshness/reconciliation model.
- Lock authorization matrix and token-scoping model before website and export hardening.

## Actionable Guidance

- Build phases in this order: domain kernel -> import/dedupe -> messaging spine -> RSVP intelligence -> parent ops -> public surface -> hardening.
- Define and test idempotency semantics early (webhooks, retries, replay) before live traffic.
- Add negative authorization tests for every role/scope path, especially exports.
- Enforce set-based writes and queue-backed bulk jobs; ban row-by-row bulk mutations in request handlers.
- Surface "last updated" timestamps on projections and run scheduled reconciliation jobs.
- Capture audit events (actor + before/after + reason) for every critical mutation from first implementation.
- Monitor SLO anchors: invite queue acknowledgment, webhook-to-dashboard latency, export p95, webhook success rate.
- Keep v1 boundaries strict: no in-app payments, no full theme builder, no mandatory pre-send perfect grouping.
