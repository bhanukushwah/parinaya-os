# Phase 3: WhatsApp Invite Delivery and Compliance Safety - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Operationalize compliant outbound invite delivery through Meta WhatsApp Cloud API and provide reliable, monotonic delivery lifecycle visibility.

</domain>

<decisions>
## Implementation Decisions

### Delivery channel and send model

- Meta WhatsApp Cloud API template messaging is the only outbound invite channel in this phase.
- Send flow must start from already-supported event audience selection and recipient precheck paths from Phase 2.
- Operator send action is Parent Admin-only by default.
- System records one outbound message record per resolved recipient target and retains provider message identifiers for webhook correlation.

### Lifecycle and status model

- Lifecycle states exposed to operators are `sent`, `delivered`, `read`, and `failed`.
- Webhook updates must apply monotonic state progression per message to prevent regressions from out-of-order events.
- Duplicate webhook deliveries are treated idempotently and do not create duplicate lifecycle transitions.
- Lifecycle state should remain queryable by event and send run for operational visibility.

### Compliance and policy controls

- Do-Not-Message policy is a hard pre-send block and must prevent enqueue/send for blocked recipients.
- Send eligibility checks run before provider calls and must persist rejection reasons.
- Rejection outcomes remain visible to operators in send summaries.
- Policy enforcement is server-side and cannot be bypassed by UI behavior.

### Audit and governance expectations

- Invite send actions produce `invite.send` audit entries with actor context.
- Policy-based rejections and webhook ingestion are operationally traceable via persisted run/message metadata.
- Existing role/governance boundaries from Phase 1 remain authoritative.

### KiloCode's Discretion

- Choose provider-adapter and persistence details only where not specified above.
- Keep Phase 3 scoped to delivery/compliance/lifecycle visibility; defer RSVP response capture to Phase 4.

</decisions>

<specifics>
## Specific Ideas

- Reuse `audience.precheckSend` output as the canonical send candidate list input to avoid count drift.
- Persist raw webhook payload snapshots for debugability while deriving normalized lifecycle events for operators.
- Keep delivery state machine explicit in service code to make monotonic guarantees testable.

</specifics>

<deferred>
## Deferred Ideas

- Rich retry/backoff orchestration or external queue infrastructure beyond minimal reliable delivery behavior.
- Inbound RSVP parser and step-flow orchestration (Phase 4 scope).

</deferred>

---

_Phase: 03-whatsapp-invite-delivery-and-compliance-safety_
_Context gathered: 2026-02-13_
