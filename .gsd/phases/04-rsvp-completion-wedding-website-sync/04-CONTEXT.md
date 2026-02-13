# Phase 4: RSVP Completion + Wedding Website Sync - Context

**Gathered:** 2026-02-13  
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a complete RSVP loop through WhatsApp and synchronize wedding website state with privacy enforcement and a WhatsApp RSVP CTA.

This phase includes: WhatsApp RSVP interaction design, website data sync behavior, invite-only access controls, and CTA routing into active RSVP flows.

This phase excludes new capabilities outside RSVP completion and website sync.

</domain>

<decisions>
## Implementation Decisions

### WhatsApp RSVP Flow

- Response model is `accept` or `decline` only (no `maybe`).
- RSVP capture is per named person in the guest unit, not only a single headcount toggle.
- Three-step flow structure is locked to:
  - Step 1: identity + response combined
  - Step 2: details (per-person attendance updates)
  - Step 3: final confirmation
- Confirmation message should be rich and include next-action prompts.

### Website Sync and Freshness

- Sync target is near real-time (seconds) after RSVP or event state changes.
- Source of truth is a shared canonical event store used by both WhatsApp and website experiences.
- If sync is degraded, website should show `last updated` timestamp plus a stale-data banner.
- Conflict handling uses last-write-wins with audit trail preserved.

### Invite-Only Access Policy

- Primary access gate is phone-number OTP verification.
- Trusted session persistence is long-lived per device (30 days).
- Unauthorized visitors can view only a public event summary.
- Protected content includes schedule, venue details, RSVP actions, and guest-related content.

### Website RSVP CTA Behavior

- CTA placement uses a single sticky CTA pattern across pages.
- CTA label is dynamic by state (e.g., `Complete RSVP`, `Update RSVP`).
- Routing is state-aware:
  - New invitees -> start flow
  - Already responded invitees -> update flow
- If WhatsApp flow is unavailable, queue intent and auto-send follow-up WhatsApp link.

### KiloCode's Discretion

- Microcopy tone and exact CTA text variants within the dynamic-label strategy.
- Exact UX composition for stale banner presentation as long as timestamp visibility is explicit.
- Technical implementation of queueing and retry orchestration for unavailable WhatsApp flows.

</decisions>

<specifics>
## Specific Ideas

- RSVP should remain concise and feel complete in three or fewer interaction steps.
- WhatsApp confirmations should do more than acknowledge storage; they should guide the next useful action.
- Website should remain useful for unauthenticated visitors with summary-level visibility while keeping operational and guest-sensitive data private.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

_Phase: 04-rsvp-completion-wedding-website-sync_  
_Context gathered: 2026-02-13_
