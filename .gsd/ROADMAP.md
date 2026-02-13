# Roadmap: ParinayaOS v1.0 Core Wedding OS

**Milestone:** `v1.0`  
**Defined:** 2026-02-13  
**Source Inputs:** `.gsd/PROJECT.md`, `.gsd/REQUIREMENTS.md`, `.gsd/research/SUMMARY.md`

## Phase Plan

### Phase 1: Multi-Event Foundation + Governance Controls

**Goal:** Establish event lifecycle and visibility controls with enforceable role/audit governance for all critical changes.

**Status:** Complete (verification passed 2026-02-13)

**Requirements:** EVT-01, EVT-02, GOV-01, GOV-02

**Success Criteria:**

- Parent Admin can create, edit, archive, and reorder multiple events in one wedding workspace and changes persist after refresh.
- Event visibility set to `public` or `invite-only` is enforced on reads so ineligible guests cannot access invite-only event details.
- Role matrix is enforced for owner/admin/coordinator boundaries, with blocked actions returning explicit authorization errors.
- Audit log entries are recorded for role changes, event visibility updates, invite sends, and guest data edits with actor and timestamp.

### Phase 2: Guest Model, Import Pipeline, and Audience Selection

**Goal:** Build family-first guest data operations with deterministic identity handling and event audience targeting.

**Status:** Complete (02-01 through 02-06 complete; verification passed 2026-02-13)

**Requirements:** GST-01, GST-02, GST-03, EVT-03

**Success Criteria:**

- Family Coordinator can create and manage People records and assign them to GuestUnits used as invite/RSVP units.
- CSV/contacts imports map into People + GuestUnit entities without manual re-entry for supported fields.
- Phone normalization + deterministic dedupe prevents duplicate active invite targets for the same normalized number during import.
- Parent Admin can build event audiences using side/tags/search with an accurate recipient count shown before send action.

### Phase 3: WhatsApp Invite Delivery and Compliance Safety

**Goal:** Operationalize compliant outbound invite delivery with reliable delivery lifecycle visibility.

**Status:** Complete (03-01 through 03-05 complete; verification passed 2026-02-13)

**Requirements:** WA-01, WA-02, WA-04

**Success Criteria:**

- Parent Admin can send invites to selected audiences through Meta WhatsApp Cloud API template flows.
- Webhook-ingested status updates drive monotonic per-message lifecycle states (`sent`, `delivered`, `read`, `failed`) visible to operators.
- Do-Not-Message and send-eligibility policy checks block non-compliant recipients before enqueue and emit rejection reasons.

**Planned Execution:**

- [x] 03-01: Add whatsapp-domain schema + env configuration baseline.
- [x] 03-02: Implement compliant invite dispatch pipeline and invite router.
- [x] 03-03: Implement webhook verification/ingestion with monotonic lifecycle transitions.
- [x] 03-04: Build invite send and lifecycle monitoring dashboard routes.
- [x] 03-05: Add lifecycle/policy tests and produce phase verification report.

### Phase 4: RSVP Completion + Wedding Website Sync

**Goal:** Close the guest response loop through WhatsApp RSVP and synchronized website experiences with privacy controls.

**Status:** Complete (04-01 through 04-05 complete; verification passed 2026-02-13)

**Requirements:** WA-03, WEB-01, WEB-02, WEB-03

**Success Criteria:**

- Invitee can complete RSVP confirmation in three or fewer WhatsApp interaction steps from invite to final response.
- Published website data auto-syncs event/RSVP state updates without manual republish actions.
- Invite-only website mode prevents unauthorized visitors from viewing protected event schedule/guest content.
- Website surfaces WhatsApp RSVP CTA that routes invitees into the active RSVP flow.

**Planned Execution:**

- [x] 04-01: Add RSVP + website-sync schema foundations and migrations.
- [x] 04-02: Implement tested WhatsApp RSVP three-step flow engine and webhook handler wiring.
- [x] 04-03: Implement website snapshot sync services and invite-only OTP access router.
- [x] 04-04: Build website routes with stale banner + state-aware sticky WhatsApp RSVP CTA.
- [x] 04-05: Add RSVP/website tests and produce phase verification report.

### Phase 5: Parent Operations Dashboard and Exports

**Goal:** Provide operational decision surfaces and vendor-ready outputs for real-time wedding coordination.

**Status:** Complete (05-01 through 05-04 complete; verification passed 2026-02-13)

**Requirements:** OPS-01, OPS-02, OPS-03

**Success Criteria:**

- Dashboard shows per-event invited/responded/accepted/declined/pending counts sourced from current RSVP state.
- Operators can filter dashboard and export views by event, side, and RSVP status with consistent count alignment.
- Export produces vendor-ready CSVs with stable headers and one row per intended guest unit/person record.

**Planned Execution:**

- [x] 05-01: Implement shared operations metrics dataset service and router contract.
- [x] 05-02: Implement deterministic CSV export serializer and export endpoint.
- [x] 05-03: Build `/dashboard/operations` UI with URL-persisted filters and export UX checkpoint.
- [x] 05-04: Add operations tests and produce phase verification report.

### Phase 6: Gifts Basics and Safety Controls

**Goal:** Deliver lightweight gifting capability with explicit operator safeguards.

**Status:** Complete (06-01 through 06-05 complete; verification passed 2026-02-14)

**Requirements:** GFT-01, GFT-02

**Success Criteria:**

- Parent Admin can enable a basic gifts mode and publish shareable gift/UPI details for invited guests.
- Gift safety controls allow hide/disable behavior and role-restricted editing to prevent accidental misuse.

**Planned Execution:**

- [x] 06-01: Add gifts schema/migration foundation with env and audit action contracts.
- [x] 06-02: Implement gifts API lifecycle/contribution/projection services and router wiring.
- [x] 06-03: Complete dashboard gifts human checkpoint approval.
- [x] 06-04: Complete website gifts human checkpoint approval.
- [x] 06-05: Add gifts tests and publish phase verification report (status: `passed`).

## Requirement Coverage Matrix (v1.0)

| Requirement ID | Phase |
| --- | --- |
| EVT-01 | 1 |
| EVT-02 | 1 |
| EVT-03 | 2 |
| GST-01 | 2 |
| GST-02 | 2 |
| GST-03 | 2 |
| WA-01 | 3 |
| WA-02 | 3 |
| WA-03 | 4 |
| WA-04 | 3 |
| OPS-01 | 5 |
| OPS-02 | 5 |
| OPS-03 | 5 |
| WEB-01 | 4 |
| WEB-02 | 4 |
| WEB-03 | 4 |
| GOV-01 | 1 |
| GOV-02 | 1 |
| GFT-01 | 6 |
| GFT-02 | 6 |

Coverage check: 20/20 v1.0 requirements mapped exactly once.

---

_Last updated: 2026-02-14 during Phase 6 execution_
