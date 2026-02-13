# ParinayaOS

## What This Is

ParinayaOS is a WhatsApp-first wedding operating system for India that helps families coordinate multi-event weddings without spreadsheet drift or fragmented chat threads. It gives Parent Admins and Family Coordinators one live system for guest units, invitations, RSVPs, headcounts, change broadcasts, and exports, while guests interact through zero-login WhatsApp flows and a lightweight wedding website. In v1, WhatsApp delivery is powered by Meta WhatsApp Cloud API from day one, with policy-compliant messaging and webhook-driven status tracking.

## Core Value

Make Indian wedding coordination operationally reliable for families by turning guest + event management into a live, WhatsApp-native system of record that stays accurate under constant change.

## Current Milestone: v1.0 Core Wedding OS

Goal: Deliver the core v1 wedding operating system so families can reliably run multi-event coordination end-to-end without spreadsheet fallback.

- Multi-event operations: event templates, visibility controls, ordering, and edit auditability.
- Guest core: People + GuestUnit model with high-speed import and deterministic phone dedupe.
- WhatsApp core loop: Cloud API invites, RSVPs, webhook/status tracking, and compliance-safe messaging.
- Parent operations: dashboard and export workflows for headcount, pending RSVPs, and vendor-ready CSVs.
- Presence and controls: lightweight website sync, India-appropriate gifts modes, and roles/audit safeguards.

## Requirements

### Validated

- ✓ Brownfield monorepo foundation exists with separate web/server apps and shared workspace packages, orchestrated by Turbo and Bun — inferred from `.gsd/codebase/ARCHITECTURE.md` and `.gsd/codebase/STACK.md`.
- ✓ End-to-end typed contract path is operational (web client -> RPC transport -> server router) with authenticated and unauthenticated procedures already wired — inferred from `.gsd/codebase/ARCHITECTURE.md`.
- ✓ Authentication baseline is implemented with Better Auth (email sign-up/sign-in, session retrieval, protected route/procedure enforcement) — inferred from `.gsd/codebase/ARCHITECTURE.md`.
- ✓ PostgreSQL + Drizzle data layer and migration tooling are established for auth schema and server runtime use — inferred from `.gsd/codebase/ARCHITECTURE.md` and `.gsd/codebase/STACK.md`.
- ✓ Runtime environment validation, frontend build pipeline, and quality checks (type/lint/format) are in place for continued feature delivery — inferred from `.gsd/codebase/STACK.md`.

### Active

<!-- Active scope for milestone v1.0 (Core Wedding OS). -->

- [ ] Build multi-event management for 5-10+ events with templates, visibility controls (public vs invite-only), ordering, and edit auditability.
- [ ] Implement People + GuestUnit (family-first) guest model and high-speed onboarding via Google Contacts/CSV/phone picker, with invite-name cleanup and deterministic phone dedupe.
- [ ] Support event-wise audience selection and bulk invite actions by side/tags/search with clear selection counts for parent usability.
- [ ] Launch WhatsApp invites and RSVP capture via Meta WhatsApp Cloud API (templates, interactive/fallback flows, webhook ingestion, status tracking, opt-in + 24-hour-window compliance, and Do-Not-Message enforcement).
- [ ] Ship parent-first dashboard + exports that answer per-event headcount and pending RSVP questions quickly, with vendor-ready CSV output.
- [ ] Publish a lightweight wedding website with privacy modes and WhatsApp RSVP CTA, add India-appropriate gifts/registry modes, and introduce role-based collaboration + audit logs for critical edits.

### Out of Scope

- Payments collection, payment processing, or escrow inside ParinayaOS — PRD explicitly keeps gifting link/UPI-first and avoids becoming a payments company.
- Vendor marketplace and vendor booking workflows — excluded in PRD to keep v1 focused on coordination OS outcomes.
- Seating charts and table assignment planning — explicitly deferred to avoid complexity outside core guest/event coordination loop.
- Full wedding website theme builder — v1 website is intentionally lightweight and auto-generated, not a design-builder product.
- Guest accounts and login-heavy guest workflows — excluded because guest experience is WhatsApp-first and zero-login by default.
- Email-first invitation/RSVP workflows — rejected by PRD because Indian wedding coordination is WhatsApp-native.
- Advanced meal-choice complexity — explicitly marked as possible later, not part of current v1 scope.

## Context

- Product context: Indian weddings are coordinated across families, multiple events, and late changes; failure mode is operational chaos from drifting spreadsheets and fragmented WhatsApp threads rather than lack of planning intent.
- User context: primary operators are Parent Admins (45-65) and Family Coordinators (25-40) who need quick counts, pending actions, and exports on mobile with low cognitive load.
- Delivery channel context: WhatsApp is the primary guest interface, and v1 is locked to Cloud API delivery from day one for structured messaging, webhook-based state updates, and reliable operational visibility.
- Brownfield technical context: existing codebase already provides a typed React/Elysia/oRPC/Better Auth/Drizzle baseline with environment validation and monorepo workflows, reducing foundation risk and enabling focus on domain features.
- Current gap context: domain-specific wedding features (guest-family model, event coordination, RSVP workflows, website, gifts, exports, and role controls) are largely unimplemented in the current thin business surface.
- Done looks like (v1): families can import contacts, organize guest units, send event-wise WhatsApp invites, capture RSVP/headcount updates in near real time, publish one reliable wedding link, and export vendor-ready lists without spreadsheet fallback.

## Constraints

- **Tech Stack**: Build on existing Bun + Turbo monorepo with React web app, Elysia server, oRPC contracts, Better Auth, and Drizzle/Postgres — preserves validated architecture and delivery velocity.
- **Channel**: WhatsApp Cloud API is required from day one for outbound/inbound messaging, templates, webhooks, and delivery/read/reply observability — confirmed product decision for v1.
- **Usability**: Parent-friendly mobile UX with low-bandwidth tolerance is mandatory — target users depend on WhatsApp-like simplicity and fast operational actions.
- **Compliance**: Messaging consent rules (opt-in, template window constraints) and India DPDP-aligned personal data handling must be respected — phone-number-driven workflows create direct compliance exposure.
- **Scale**: Must remain operational for large weddings (1000+ guests, 8-10 events) with fast list operations and export turnaround — wedding coordination value collapses if performance degrades under real load.

## Key Decisions

| Decision | Rationale | Outcome |
| -------- | --------- | ------- |
| WhatsApp delivery model for v1 is Meta Cloud API from day one | User-confirmed direction; aligns with WhatsApp-first product promise and enables structured RSVP + webhook observability from initial release | — Pending |
| Treat families/households (GuestUnits) as primary invitation and RSVP unit, with People as import/edit layer | Matches Indian wedding invitation behavior and supports messy real-world data while retaining operational control | — Pending |
| Keep guest experience zero-login by default | Reduces friction, improves RSVP response rates, and aligns with parent/family usability goals | — Pending |
| Use lightweight auto-generated wedding website instead of a theme-builder approach | Prioritizes speed-to-publish and always-current schedule/updates over design customization complexity | — Pending |
| Execute as brownfield expansion on existing typed monorepo foundation | Existing auth/RPC/data/runtime baseline is already validated and lowers implementation risk for v1 scope | ✓ Good |

---

_Last updated: 2026-02-13 after milestone v1.0 initialization_
