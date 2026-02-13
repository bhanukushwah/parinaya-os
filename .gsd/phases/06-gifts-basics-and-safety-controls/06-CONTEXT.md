# Phase 6: Gifts Basics and Safety Controls - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers a lightweight gifts mode for invited guests with two gift types (UPI and wishlist items), plus explicit operator safety controls (hide/disable/publish) and role-restricted editing/action governance. Scope is limited to baseline gifting behavior and safeguards, not advanced gifting workflows.

</domain>

<decisions>
## Implementation Decisions

### Gift Mode Scope and Contribution Rules

- Gifts mode includes both UPI details and wishlist items; it is not UPI-only.
- Wishlist items allow multiple contributions from multiple guests toward the same item.
- Contribution model is open amount-per-contribution until target amount is reached.
- Item progress shown to guests includes both percent progress and amount raised.
- Items stay visible after completion and must show a clear completed state/badge.
- Publishing follows draft -> explicit publish.
- Locked pre-publish requirement: Message/note is mandatory before publish is allowed.

### Guest-Facing Surfaces and Visibility

- Primary gift experience surface is the wedding website.
- Entry points are a website navigation tab and a sticky CTA.
- Gifts mode visibility is invite-only; non-invited users must not access guest gift views.
- Contributor identities are hidden from guest-facing views and visible to admin only.

### Safety Controls Semantics

- Hide means temporary guest invisibility while preserving current configuration for quick restore.
- Disable means contributions are turned off and no new contributions are accepted.
- Guests currently on the page during hide/disable should receive a graceful unavailable message.
- Re-enable after disable restores the last draft state and requires explicit publish again.

### Role Restrictions and Governance

- Admin and Coordinator roles can edit gift details.
- Admin and Coordinator roles can execute Hide, Disable, and Publish actions.
- Audit logging is required for critical actions at minimum: publish, hide, disable, and sensitive gift-detail edits.
- Unauthorized action attempts must return explicit authorization errors.

### KiloCode's Discretion

- Exact wording and visual treatment of progress/completed/unavailable messages.
- Information architecture details for where nav tab and sticky CTA appear across website views.
- Which gift-detail fields are classified as sensitive beyond the required minimum audit set.

</decisions>

<specifics>
## Specific Ideas

- Example item behavior: "Mixer Grinder - target 5000" accepts many partial contributions (e.g., 500, 1200, 700) and remains visible with a completed badge after reaching target.
- Example access behavior: invited guest sees Gifts tab + sticky CTA; non-invited visitor does not see gift surfaces.
- Example safety behavior: if operator disables gifts while a guest is viewing, page updates to "Gifts are currently unavailable" and blocks further contributions.

</specifics>

<deferred>
## Deferred Ideas

None currently deferred.

</deferred>

---

_Phase: 06-gifts-basics-and-safety-controls_
_Context gathered: 2026-02-13_
