# Phase 02: Guest Model, Import Pipeline, and Audience Selection - Research

**Researched:** 2026-02-13
**Mode:** ecosystem (prescriptive)
**Scope confidence:** MEDIUM-HIGH

Phase 02 should be implemented as a **server-enforced identity + audience engine** with import channels feeding one deterministic identity pipeline. The phase constraints (phone-only dedupe, reactivation, AND filters, explicit include/exclude, recipient-count correctness) map best to a Postgres-first design with strict invariants in schema + transactional procedures.

## Standard Stack

Use the existing monorepo stack and add only targeted libraries.

### Core (use now)

| Component | Recommendation | Why this is the standard for this phase | Confidence |
| --- | --- | --- | --- |
| Runtime/test | Bun + `bun:test` | Already in repo; built-in test runner reduces setup cost and supports TS directly | HIGH |
| API layer | Elysia + oRPC procedures | Existing typed procedure boundary is ideal for authz, import commands, audience queries | HIGH |
| DB/ORM | Postgres + Drizzle transactions/upserts | Need atomic dedupe/reactivation and deterministic counting; Drizzle supports transaction + `onConflictDoUpdate` | HIGH |
| Phone normalization | `libphonenumber-js/max` | International parsing/formatting/validation with strict metadata (`isValid()`, `parsePhoneNumberWithError`) | HIGH |
| CSV parsing | `csv-parse` (stream API) | Mature parser with BOM, delimiter/quote handling, column-shape controls, skip hooks, max record size controls | HIGH |

### Supporting (use where needed)

| Component | Recommendation | Why | Confidence |
| --- | --- | --- | --- |
| Search acceleration | Postgres `pg_trgm` + GIN index for name/phone search | Supports `LIKE/ILIKE` acceleration and fuzzy matching when audience search scales | HIGH |
| CSV protocol baseline | RFC 4180 behavior in parser config | Avoid ad-hoc CSV assumptions around quoting, commas, CRLF, escaped quotes | HIGH |
| Contacts import UX | Web Contact Picker API behind capability detection | Native contacts are available only in limited browsers/secure top-level contexts/transient activation | MEDIUM-HIGH |

### Prescriptive implementation notes

- Use **E.164 normalized phone (`+` + digits)** as canonical identity key. Do not store dedupe key in local formats.
- Use Drizzle schema/migration files in `packages/db/src/schema/*` and migration scripts already wired in repo (`db:generate`, `db:migrate`).
- Keep CSV ingestion server-side via multipart upload (`FormData` + `File`) and parse with stream pipeline; do not parse large CSV synchronously in web route handlers.

## Architecture Patterns

### Pattern 1: Identity-first data model (phone as canonical identity)

Use a dedicated guest identity table (or People table with identity columns) with workspace-scoped normalized phone key and active/reactivation lifecycle.

**Prescriptive model**

- `guest_identities`: `id`, `wedding_id`, `normalized_phone`, `display_name`, `is_active`, `deactivated_at`, timestamps.
- Partial unique index: unique active identity on `(wedding_id, normalized_phone)`.
- `people`: person profile linked to identity (`identity_id`), side/tags/person metadata.
- `guest_units`: household invite unit; includes optional unit-level delivery phone and side/tags.
- `guest_unit_members`: relation `person_id -> guest_unit_id` with one-active-membership invariant per workspace.

**Constraint mapping**

- Deterministic dedupe key: `normalized_phone` only.
- Archived/deactivated match: reactivate existing identity instead of creating duplicate.
- One active GuestUnit membership per person/workspace.

### Pattern 2: Import as staged pipeline (ingest -> normalize -> resolve -> persist)

Implement one domain pipeline shared by all channels (CSV, contacts, manual row entry):

1. Ingest raw row into `guest_import_rows` with source/channel metadata.
2. Normalize phone (`parsePhoneNumberWithError` + E.164), side/tag normalization, optional name cleanup.
3. Resolve identity by `(wedding_id, normalized_phone)`.
4. Persist with transaction + upsert/reactivation.
5. Persist row outcome (`created`, `updated`, `reactivated`, `warning_malformed_phone`, `skipped_no_phone`).

**Important behavior**

- Malformed phone rows are persisted with warning + `inviteable=false`.
- Row without phone can exist for data continuity but never becomes active invite target.
- Side/tags mapping applies to both Person and GuestUnit in the same import commit.

### Pattern 3: Audience query engine as deterministic SQL pipeline

Audience filters must be server-side and deterministic.

**Recommended query stages**

1. `base_units`: active `guest_units` in workspace.
2. Apply `side` filter if present.
3. Apply `tags` filter with AND semantics (`HAVING COUNT(DISTINCT matched_tag)=N`).
4. Apply `search` over normalized fields (`ILIKE`, later `pg_trgm` as needed).
5. Apply manual include/exclude overrides on GuestUnit IDs.
6. Resolve delivery target: unit-level phone first; fallback to person phones if unit-level missing.
7. Compute recipient count as unique active eligible invite targets after dedupe.

### Pattern 4: Recipient count and send-precheck as same logic path

The **exact same function** should power:

- audience preview count,
- send precheck,
- final recipient list generation.

This prevents count drift between preview and send.

### Pattern 5: Operational safety + observability baked into import runs

Create `import_runs` with:

- status (`pending`, `running`, `completed`, `failed`, `partial`),
- per-run counters (`rows_total`, `rows_created`, `rows_updated`, `rows_reactivated`, `rows_warning`, `rows_failed`),
- actor membership and source metadata,
- idempotency key (hash of file + workspace + initiated_by).

Also write audit events (`guest.import.started/completed`, `guest.identity.reactivated`, `guest.audience.previewed`) with actor and target context.

### Domain coverage checklist (quality gate)

- Data modeling: covered by Pattern 1.
- Import pipeline: covered by Pattern 2.
- Normalization/dedupe: Pattern 1 + 2.
- Audience query model: Pattern 3 + 4.
- Operational safeguards: Pattern 5.
- Testing strategy: specified in Common Pitfalls + Code Examples.
- Migration strategy: partial indexes + extensions + phased rollout in Common Pitfalls.
- Observability: Pattern 5 + code examples.

## Don't Hand-Roll

| Problem | Don’t build | Use instead | Why | Confidence |
| --- | --- | --- | --- | --- |
| Phone parsing/validation | Regex-only phone parser | `libphonenumber-js/max` + E.164 normalization | Regex cannot reliably validate real-world numbers; metadata changes frequently | HIGH |
| CSV parser | custom `.split(',')` parser | `csv-parse` stream parser | CSV quoting/CRLF/escaped quote edge cases are non-trivial (RFC 4180) | HIGH |
| Dedupe race handling | app-level check-then-insert | Postgres unique index + `ON CONFLICT DO UPDATE` | Atomic upsert guarantees deterministic insert/update under concurrency | HIGH |
| Audience filtering logic in UI | client-only filtering/counting | server-side SQL pipeline | Count must reflect eligibility + dedupe + fallback delivery rules | HIGH |
| Contacts import as primary path | browser-only contact picker dependency | capability-detected enhancement + CSV/manual as baseline | Contact Picker is limited/experimental and requires secure top-level + user activation | HIGH |

### Verified negative claims (official docs)

- “Regex is enough for phone validity” is false (Twilio explicitly calls out regex limits for validity).
- “Contact Picker works broadly” is false (MDN marks limited availability; W3C draft requires strict context/activation constraints).
- “`ON CONFLICT` is best-effort only” is false (Postgres documents atomic insert-or-update outcome guarantees).

## Common Pitfalls

### 1) Active-identity uniqueness not enforced in DB

**What goes wrong:** Duplicate active invite targets appear during concurrent imports.

**Avoid:** Partial unique index on active identities + conflict target including predicate where needed.

**Migration note:** Add index before enabling import paths in production traffic.

**Confidence:** HIGH

### 2) Filter semantics drift (tags OR instead of AND)

**What goes wrong:** Audience includes over-broad recipients, pre-send count inflated.

**Avoid:** Tag AND semantics via grouped SQL (`HAVING COUNT(DISTINCT tag_id)=selectedCount`).

**Confidence:** HIGH

### 3) Preview count and send list use different logic

**What goes wrong:** Operators see one count and send to another set.

**Avoid:** Single shared resolver function for preview and send.

**Confidence:** HIGH

### 4) Malformed phones are silently dropped

**What goes wrong:** Import appears "successful" but operators lose rows and trust.

**Avoid:** Persist row with warning + `inviteable=false`, expose warning counters and downloadable error report.

**Confidence:** HIGH

### 5) Contacts import over-relied on web API support

**What goes wrong:** Feature works in limited environments only; import path unavailable for many users.

**Avoid:** Treat contacts import as optional enhancement; baseline remains CSV + manual rows.

**Confidence:** HIGH

### 6) Search performance collapses with `%term%` growth

**What goes wrong:** Audience builder query latency spikes as guest volume grows.

**Avoid:** Start with indexed normalized columns, then add `pg_trgm` index for `ILIKE`/fuzzy workloads.

**Confidence:** MEDIUM-HIGH

### 7) Test strategy misses race conditions and idempotency

**What goes wrong:** Import passes happy paths but fails in duplicate/retry/replay scenarios.

**Avoid:** Add focused suites:

- unit: normalization and eligibility,
- integration: upsert/reactivation and audience SQL,
- concurrency: parallel import same phone,
- replay: same import run idempotency key.

**Confidence:** MEDIUM-HIGH

## Code Examples

### 1) Drizzle upsert for deterministic identity + reactivation

```ts
// Sources:
// - https://orm.drizzle.team/docs/insert
// - https://www.postgresql.org/docs/current/sql-insert.html
await tx
  .insert(guestIdentities)
  .values({
    id: crypto.randomUUID(),
    weddingId,
    normalizedPhone, // E.164
    displayName,
    isActive: true,
    deactivatedAt: null,
  })
  .onConflictDoUpdate({
    target: [guestIdentities.weddingId, guestIdentities.normalizedPhone],
    set: {
      displayName,
      isActive: true,
      deactivatedAt: null,
      updatedAt: new Date(),
    },
  })
  .returning();
```

### 2) Phone normalization gate (strict parse, warning on failure)

```ts
// Sources:
// - https://raw.githubusercontent.com/catamphetamine/libphonenumber-js/master/README.md
// - https://www.twilio.com/docs/glossary/what-e164
import { parsePhoneNumberWithError } from "libphonenumber-js/max";

export function normalizePhone(input: string, defaultCountry?: string) {
  const parsed = parsePhoneNumberWithError(input, {
    defaultCountry,
    extract: false,
  });
  return parsed.number; // E.164, e.g. +14155552671
}
```

### 3) CSV parsing with operational safeguards

```ts
// Sources:
// - https://csv.js.org/parse/
// - https://csv.js.org/parse/options/
import { parse } from "csv-parse";

const parser = parse({
  bom: true,
  columns: true,
  trim: true,
  skip_empty_lines: true,
  relax_column_count: true,
  max_record_size: 64 * 1024,
  on_skip: (_record, info) => {
    // track skipped malformed lines for import report
    importWarnings.push({ line: info.lines, reason: "parse_skip" });
  },
});
```

### 4) Audience tags AND semantics + include/exclude override

```sql
-- Source concepts:
-- - Postgres aggregate filtering and deterministic SQL composition
WITH filtered AS (
  SELECT gu.id
  FROM guest_units gu
  JOIN guest_unit_tags gut ON gut.guest_unit_id = gu.id
  WHERE gu.wedding_id = $1
    AND gu.is_active = true
    AND ($2::text IS NULL OR gu.side = $2)
    AND ($3::text IS NULL OR gu.search_blob ILIKE '%' || $3 || '%')
    AND gut.tag_id = ANY($4::text[])
  GROUP BY gu.id
  HAVING COUNT(DISTINCT gut.tag_id) = cardinality($4::text[])
), overridden AS (
  SELECT id FROM filtered
  UNION
  SELECT unnest($5::text[]) -- explicit include guest_unit_ids
  EXCEPT
  SELECT unnest($6::text[]) -- explicit exclude guest_unit_ids
)
SELECT id FROM overridden;
```

### 5) Recipient count as unique active eligible invite targets

```sql
WITH targets AS (
  -- Delivery fallback: unit phone first, then person phones.
  SELECT DISTINCT COALESCE(gu.delivery_phone_e164, p.normalized_phone) AS target_phone
  FROM resolved_guest_units r
  JOIN guest_units gu ON gu.id = r.id
  LEFT JOIN guest_unit_members gum ON gum.guest_unit_id = gu.id AND gum.is_active = true
  LEFT JOIN people p ON p.id = gum.person_id AND p.is_active = true
  WHERE COALESCE(gu.delivery_phone_e164, p.normalized_phone) IS NOT NULL
    AND COALESCE(gu.delivery_phone_inviteable, p.inviteable) = true
)
SELECT COUNT(DISTINCT target_phone) AS recipient_count
FROM targets;
```

### 6) Contact picker capability gate (optional import source)

```ts
// Sources:
// - https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API
// - https://www.w3.org/TR/contact-picker/
export async function canUseContactsImport() {
  if (!("contacts" in navigator)) return false;
  const props = await navigator.contacts.getProperties();
  return props.includes("name") && props.includes("tel");
}
```

### Source-backed confidence notes

- HIGH: Postgres `ON CONFLICT`, partial unique indexes, `pg_trgm`, RFC 4180 CSV behavior, E.164 constraints.
- MEDIUM-HIGH: Contact Picker production constraints (spec + MDN support caveat).
- MEDIUM: exact long-term migration workflow guidance for Drizzle teams (official page currently indicates pending updates).
