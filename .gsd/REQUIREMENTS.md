# Requirements: ParinayaOS (Milestone v1.0 Core Wedding OS)

**Defined:** 2026-02-13
**Core Value:** Make Indian wedding coordination operationally reliable for families by turning guest + event management into a live, WhatsApp-native system of record that stays accurate under constant change.

## 1) Milestone v1.0 Requirements

### Guest & Events

- [ ] **EVT-01**: Parent Admin can create, edit, archive, and order multiple wedding events under one wedding workspace.
- [ ] **EVT-02**: Parent Admin can set each event visibility to `public` or `invite-only`, and guests only see events they are eligible to view.
- [ ] **EVT-03**: Parent Admin can select event audience using side, tags, and search filters, with a visible recipient count before sending invites.
- [ ] **GST-01**: Family Coordinator can manage People records and group them into GuestUnits so invitations and RSVPs can be tracked at family/household level.
- [ ] **GST-02**: Parent Admin can import guest data from CSV and contacts sources, and imported fields map into People + GuestUnit records without manual re-entry.
- [ ] **GST-03**: System performs deterministic phone-based deduplication during import and prevents creation of duplicate active invite targets for the same normalized phone number.

### WhatsApp RSVP

- [ ] **WA-01**: Parent Admin can send WhatsApp invites via Meta WhatsApp Cloud API templates to a selected audience.
- [ ] **WA-02**: Parent Admin can see per-message delivery lifecycle (sent, delivered, read, failed) from webhook-tracked status updates.
- [ ] **WA-03**: Guest can complete RSVP in three or fewer WhatsApp interaction steps from invite to confirmed response.
- [ ] **WA-04**: System enforces Do-Not-Disturb/Do-Not-Message rules so blocked recipients are excluded from outbound invite sends.

### Ops & Website

- [ ] **OPS-01**: Parent Admin dashboard shows per-event invited, responded, accepted, declined, and pending counts.
- [ ] **OPS-02**: Parent Admin can export vendor-ready CSV files for selected events, with stable column headers and one row per intended guest unit/person record.
- [ ] **OPS-03**: Parent Admin can filter dashboard and exports by event, side, and RSVP status to answer operational questions quickly.
- [ ] **WEB-01**: Wedding website auto-syncs published event and RSVP state changes without requiring manual republish.
- [ ] **WEB-02**: Invite-only website mode restricts event details so non-invited visitors cannot access protected schedule/guest content.
- [ ] **WEB-03**: Wedding website surfaces WhatsApp RSVP call-to-action that routes invitees into the RSVP flow.

### Governance

- [ ] **GOV-01**: Parent Admin can assign role-based access (for example: owner/admin/coordinator) so collaborators only perform actions allowed by their role.
- [ ] **GOV-02**: System records audit logs for critical actions (role changes, event visibility changes, invite sends, and guest data edits) with actor and timestamp.

### Gifts

- [ ] **GFT-01**: Parent Admin can enable a basic gifts mode with shareable gift/UPI details for invited guests.
- [ ] **GFT-02**: Parent Admin can apply gift safety controls (hide/disable gifts and control who can edit gift details) to prevent accidental misuse.

## 2) Future Requirements (Deferred)

- **WA-05**: WhatsApp RSVP parser supports numeric fallback reply parsing (for example: `1/2/3`) when interactive response payloads are unavailable.

## 3) Out of Scope (v1.0 explicit exclusions)

| Feature | Reason |
| --- | --- |
| Payments collection, payment processing, or escrow | v1 gifting is link/UPI-first; ParinayaOS is not a payments processor in this milestone |
| Vendor marketplace and vendor booking workflows | v1 focuses on family coordination OS outcomes, not marketplace flows |
| Seating charts and table assignment planning | Deferred to avoid high planning complexity outside core invite/RSVP loop |
| Full wedding website theme builder | v1 website is intentionally lightweight and auto-generated |
| Guest accounts or login-heavy guest journeys | v1 guest experience remains WhatsApp-first and zero-login by default |
| Email-first invitation and RSVP workflow | v1 channel strategy is WhatsApp-native |
| Advanced meal-choice complexity | Deferred beyond core v1 operations |

## 4) Traceability

| Requirement | Roadmap Phase | Status |
| --- | --- | --- |
| EVT-01 | Phase 1 | Complete |
| EVT-02 | Phase 1 | Complete |
| EVT-03 | Phase 2 | Pending |
| GST-01 | Phase 2 | Pending |
| GST-02 | Phase 2 | Pending |
| GST-03 | Phase 2 | Pending |
| WA-01 | Phase 3 | Pending |
| WA-02 | Phase 3 | Pending |
| WA-03 | Phase 4 | Pending |
| WA-04 | Phase 3 | Pending |
| OPS-01 | Phase 5 | Pending |
| OPS-02 | Phase 5 | Pending |
| OPS-03 | Phase 5 | Pending |
| WEB-01 | Phase 4 | Pending |
| WEB-02 | Phase 4 | Pending |
| WEB-03 | Phase 4 | Pending |
| GOV-01 | Phase 1 | Complete |
| GOV-02 | Phase 1 | Complete |
| GFT-01 | Phase 6 | Pending |
| GFT-02 | Phase 6 | Pending |

**Coverage:**

- v1.0 requirements: 20
- Mapped to roadmap phases: 20
- Unmapped: 0

---

_Requirements defined: 2026-02-13_
_Last updated: 2026-02-13 after roadmap phase mapping_
