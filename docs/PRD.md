# PRD v2: ParinayaOS - WhatsApp‑First Wedding OS for India

**Guest + Events + Contact Import + Wedding Website + Gifts/Registry**
(Working title: **Pari**)

A mobile‑first, low‑bandwidth, parent‑friendly platform that helps Indian families manage **multi‑event invites, family-based guest lists, RSVP headcounts, change broadcasts**, plus a **lightweight wedding website** and **gifting/registry**, all anchored around **WhatsApp behavior**.

---

## 0) Executive summary

Indian weddings don’t fail because people can’t “plan”—they fail because **coordination** is done across:

* spreadsheets that drift
* WhatsApp threads that fragment
* last‑minute changes that don’t propagate
* family-unit invites where headcounts are uncertain until late

**ParinayaOS** is an operating system that makes the guest list and event plan a **live system of record**, while keeping the guest experience **zero-login** and WhatsApp-native.

---

## 1) Market & product research

### 1.1 Why global wedding tools succeed

Global products win because they tightly connect:

* a structured guest list,
* RSVP capture,
* event schedule / website,
* and (often) registry.

Examples:

* Joy supports multi-event RSVPs with invite filtering, and emphasizes up-to-date headcounts. ([Joy][1])
* Zola positions guest list manager + RSVP tracking (including plus ones / children and reminders/updates). ([zola.com][2])
* Joy also encourages guest grouping/tags and “private events” shown only to selected groups—useful for multiple events. ([Joy][3])

### 1.2 Why they fall short in India (structural mismatches)

They’re optimized for a different operating model:

* **Families > individuals** (India invites households, not just named individuals).
* **Uncertain headcounts** (approximation is normal until very late).
* **WhatsApp is the default channel** (not email).
* **Parents/extended family are primary operators**, not just the couple.
* **Multi-event + private event visibility** is the norm (different audiences per event).

### 1.3 Gap / opportunity

An India-native product must treat:

* the guest list as **approximate and editable**, not perfect upfront
* the invitation unit as a **family/household**
* WhatsApp as the **guest UI**
* the “wedding website” as a **simple itinerary + updates hub**, not a theme builder
* gifting as **UPI + link-first**, not marketplace-first

---

## 2) Product vision & principles

### Vision

Create a **WhatsApp-first, family-centric coordination system** that helps Indian families run weddings **without spreadsheets or chaos**, even with **1000+ guests** and **8–10 events**.

### Core product principles (non-negotiable)

* **Families > Individuals** (but allow individuals temporarily for speed)
* **Approximate data > perfect data**
* **Defaults > manual entry**
* **Editable later > forced accuracy upfront**
* **Parents must be able to use it comfortably**
* **Mobile-first, low-bandwidth friendly**
* **WhatsApp-first** (no email dependency)

---

## 3) Product strategy

### Target users & personas

**Primary operator personas (must love it)**

1. **Parent Admin (45–65)**

   * Uses WhatsApp daily; dislikes complex apps
   * Needs: clear counts, pending list, exports, “what changed?”

2. **Family Coordinator (25–40)**

   * Runs logistics on phone
   * Needs: fast import, dedupe, quick edits, bulk actions, reminders

**Secondary**
3) **Couple**: visibility, less stress, fewer follow-ups
4) **Planner**: per-event headcount, change broadcast, operational exports

### Core value proposition

> Import your contacts, organize them into families (optional), invite event-wise, collect headcounts via WhatsApp in seconds, and export vendor-ready counts—while the wedding website always stays updated automatically.

### Explicit non-goals (still)

* Vendor marketplace / booking
* Payments processing / escrow (gifts can show UPI; we don’t collect money)
* Seating charts / table planning
* Meal choices complexity (possible later)
* Email-first workflows
* Heavy guest accounts / logins

---

## 4) Goals & success metrics

### Goals (V2 scope)

1. Replace spreadsheets for guest/event tracking
2. Make adding guests **dramatically faster** via contact import + easy name cleanup
3. Achieve high RSVP capture via WhatsApp (zero login)
4. Ensure website is a reliable “single link” for schedule + updates
5. Enable gifting without becoming a payments company

### Success metrics

**Activation**

* Time-to-first-100 guests imported (median)
* % weddings that publish website within 24 hours
* % weddings that send first invite within 24 hours

**RSVP capture**

* WA response rate within 48 hours of invite
* % GuestUnits with RSVP ≠ “Unknown” per event

**Operational utility**

* Vendor export usage per event
* Headcount confidence: % Confirmed vs Estimated at T‑7, T‑2

**Parent usability**

* Parent Admin task success rate (3 tasks): “Reception count”, “Pending list”, “Export” (measured via tests)

---

## 5) Scope definition

### MVP (what we ship first in v2)

**Guest & Event OS**

* multi-event management
* GuestUnits (family-centric) + People layer (for import)
* event-wise invitations
* WhatsApp-based RSVP (no login)
* parent-friendly dashboard + exports
* change broadcasts

**Contact import & streamline**

* Google Contacts import
* CSV import
* Phone contact picker (best-effort, device-dependent)

**Wedding website**

* auto-generated itinerary + venue info
* privacy controls
* WhatsApp RSVP CTA

**Gifts/registry**

* blessings-only mode
* UPI details / QR
* external registry links
* optional “reserve gift” (lightweight)

---

## 6) Key user journeys

### Journey A — Setup in <10 minutes (parent-friendly)

1. Create wedding (name, city/timezone)
2. Choose template (default Indian event set)
3. Add Admins via phone numbers
4. Land on dashboard with event tiles + “Add Guests” CTA

### Journey B — Add guests fast via contacts, clean later

1. Tap **Add Guests**
2. Choose import: Google / Phone Picker / CSV / Manual
3. Guests appear as **People** with “Saved as” name
4. Inline edit “Invite name” quickly (no form)
5. Group into **Families (GuestUnits)** later (optional)

### Journey C — Invite event-wise (without perfect data)

1. Open an event → “Invite”
2. Select audience (side/tags/search/select-all)
3. Preview message
4. Send via WhatsApp (platform or share-to-WhatsApp fallback)
5. Track delivery/read/reply

### Journey D — Guest RSVPs on WhatsApp (no login)

1. Guest taps buttons (Yes/No/Maybe)
2. If Yes → picks count (1/2/3/4/5+)
3. Optional: confirm “same count for all events?” then adjust per event if needed

### Journey E — Publish website link once, keep it updated

1. Tap Website → Publish
2. Share link on WhatsApp
3. Any event edits auto-reflect on website

### Journey F — Gifts/registry in 5 minutes

1. Select mode: Blessings / UPI / Links / Items
2. Add UPI QR or links
3. Enable on website

---

## 7) Product requirements (feature-by-feature)

## Feature 1: Multi-event wedding management

### Description

Support 5–10+ events with different audiences and last-minute edits.

### Functional requirements

* Event templates (Mehndi, Haldi, Sangeet, Wedding, Reception + custom)
* Event fields: name, date/time, venue (free text), map link (optional), notes
* Event visibility flag:

  * Public on website
  * Invite-only (only shown via personalized guest link)
* Reorder events
* Audit log for changes (“changed time from 7pm to 8pm”)

### Acceptance criteria

* Create ≥10 events with no performance degradation
* Editing event updates:

  * dashboard
  * website
  * (optional) triggers a “notify invited” workflow

---

## Feature 2: Guest model — People + GuestUnits (Families as first-class)

### Description

Enable fast import and flexible grouping while keeping RSVP tracking family-centric.

### Key design decision

* **People** = imported contacts / individuals
* **GuestUnit** = invitation & RSVP unit (usually “family”), can start as “family-of-one”

### Functional requirements

* Create Person with:

  * phone (required to message)
  * `saved_as_name` (from contacts)
  * `invite_name` (editable display name)
* Create GuestUnit with minimum:

  * `unit_label` (e.g., “Sharma Family”) OR auto from person
* GuestUnit fields:

  * side (Bride/Groom/Both)
  * tags (Outstation/VIP/Friends/Office)
  * estimate size bucket (Unknown / 1–2 / 3–4 / 5–8 / 9+)
  * notes
* Membership:

  * GuestUnit can contain 1+ People
  * One primary WhatsApp recipient (Person)
* Allow “Ungrouped People” safely:

  * can still be invited as a unit-of-one

### Acceptance criteria

* Admin can add a guest with **one input** (name or phone) and proceed
* No step forces grouping into families before inviting

---

## Feature 3: Contact import (phone + Google + CSV) and name cleanup

### Description

Streamline adding guests at scale; assume names are messy and editable.

### Import sources

#### 3.1 Google Contacts import (recommended)

* OAuth sign-in and consent for contacts access ([Google for Developers][4])
* Use People API to list contacts (paginated) ([Google for Developers][5])
* User selects contacts to import (no “import all” default)

#### 3.2 Phone Contacts import (best-effort)

* Use Contact Picker API when supported
* Requires secure context + user gesture; user selects contacts each time ([Chrome for Developers][6])
* API is limited; treat as optional capability ([MDN Web Docs][7])

#### 3.3 CSV upload

* Accept Name, Phone, Side, City, Tags, Notes
* Default +91 if no country code, but allow edit

### Name cleanup UX (must feel magical)

* Two name fields per Person:

  * **Saved as** (source)
  * **Invite name** (used in messages/exports)
* Inline editing in list view:

  * tap name → edit → done
* Bulk actions:

  * select many → “Set invite names” (quick edit)
  * select many → “Remove emojis/special chars” (optional)
* Duplicate handling:

  * detect by phone number
  * one-tap merge duplicates

### Acceptance criteria

* Import 300+ contacts and be ready to invite in <10 minutes
* Editing 20 invite names takes <2 minutes on mobile
* Duplicate detection works deterministically on phone number

---

## Feature 4: Event-wise invitations & audience selection

### Description

Not everyone is invited to every event; bulk selection must be easy.

### Functional requirements

* Invitation mapping between Event ↔ GuestUnit
* Default invite rules (configurable):

  * new guest unit invited to Wedding + Reception by default
* Bulk actions:

  * invite by side
  * invite by tag
  * invite by search + multi-select
* Invitation states per event:

  * Not invited / Invited / Messaged

### Acceptance criteria

* Select 200 GuestUnits and invite them to an event in <10 seconds
* UI always shows “how many selected” clearly (parent-friendly)

---

## Feature 5: WhatsApp messaging + RSVP capture (no login)

### Description

Guests RSVP inside WhatsApp with minimal steps.

### WhatsApp platform constraints (must respect)

* Businesses must obtain opt-in before sending proactive notifications. ([Facebook for Developers][8])
* You can reply within a 24-hour customer service window; outside it, approved templates are required. ([WhatsApp Business][9])
* Interactive messages (lists/buttons) are supported for structured replies. ([Facebook for Developers][10])
* Messaging limits/tier scaling exist; sending must be queued and monitored. ([Facebook for Developers][11])
* Webhooks are used to receive inbound messages and delivery/read status. ([Facebook for Developers][12])

### Product approach (two-mode, pragmatic)

**Mode A — Share-to-WhatsApp (fallback / lowest friction)**

* Admin sends invite from personal WhatsApp using “Share” (we pre-fill text + include links)
* RSVP happens via:

  * WhatsApp message to a wedding number **OR**
  * website link with token (optional fallback)

**Mode B — Platform-sent (Cloud API)**

* Send template invite to opted-in guests
* Handle replies + buttons via Cloud API + webhooks

### RSVP flow (optimized for India)

* Message includes:

  * event list
  * CTA: “Reply with choices”
* Use list message:

  * “Which events will you attend?” (max ~10)
* Then ask:

  * “How many people will attend?” (bucket: 1/2/3/4/5+)
* Default:

  * apply same count to all selected events
* Allow adjustment:

  * “Change count for Reception only” (optional)

### Opt-out

* “STOP” → mark Do Not Message

### Acceptance criteria

* Guest completes RSVP in ≤3 interactions (tap/tap/tap)
* RSVP updates dashboard within 5 seconds of webhook receipt
* Fallback works if buttons fail:

  * numeric responses (1/2/3)
* System enforces Do Not Message and logs it

---

## Feature 6: Dashboard, counts, and exports (parent-first)

### Description

Parents need answers fast: counts, pending list, exports.

### Functional requirements

* Home dashboard: event tiles showing:

  * invited GuestUnits
  * RSVP breakdown (Yes/No/Maybe/Unknown)
  * Confirmed headcount
  * Expected range (Confirmed + Estimated)
* Filters:

  * side, tags, city, RSVP status, “needs phone number”
* Call list:

  * pending RSVPs sorted by VIP/Outstation tags
* Exports (CSV):

  * per event
  * pending list
  * outstation list
  * VIP list
* Export columns (minimum):

  * Unit Label, Primary Contact, RSVP, Count Bucket/Exact, Notes, Side, Tags

### Acceptance criteria

* Parent can answer “How many for Reception?” in <10 seconds
* Export for 1000-guest wedding downloads in <10 seconds on average mobile network

---

## Feature 7: Wedding website (auto-generated, not a builder)

### Description

A single shareable link for schedule/venues/updates/gifts.

### Functional requirements

* Auto-generated site URL per wedding
* Sections:

  1. Schedule (events)
  2. Venues (maps links)
  3. Contact/help (family coordinator phone)
  4. Gifts (if enabled)
* Minimal customization:

  * cover photo
  * couple names
  * welcome note
* Privacy modes:

  * **Invite-only link** (default)
  * Public link (optional)
  * Optional PIN (nice-to-have)
* Event visibility:

  * public events visible to everyone with link
  * invite-only events visible only via personalized guest token link
* RSVP CTA:

  * primary: “RSVP on WhatsApp”
  * optional: web RSVP fallback (token-based, no login)

### Acceptance criteria

* Website loads fast on low bandwidth (light assets)
* Parent can publish in <2 minutes
* Event edits are reflected immediately with “last updated” indicator

---

## Feature 8: Gifts / registry (India-appropriate)

### Description

Enable gifting without marketplace complexity.

### Functional requirements

**Modes**

1. Blessings-only message
2. UPI details:

   * UPI ID text + QR image
   * optional bank details
3. Registry links:

   * add external links with labels
4. Optional item list + reservation:

   * guests can “reserve” to avoid duplicates
   * no payments processed in platform

**Fraud / safety controls**

* Gifts section editable only by Owner (default)
* Audit log on edits
* Optional “lock gifts” near wedding date

### Acceptance criteria

* Setup gifts in <5 minutes
* Guests can view gifts without login
* Reservation (if enabled) works with name-only input

---

## Feature 9: Collaboration, roles, and audit log

### Roles

* **Owner**: everything incl. billing/critical settings
* **Admin**: manage guests/events/messages/exports
* **Side Admin (Bride/Groom)**: limited to side
* **Viewer**: read-only dashboard

### Permissions (key rules)

* Side Admin can’t see other side unless GuestUnit is “Both”
* Gifts editing restricted (default Owner-only)
* Full audit log:

  * who changed what, when

### Acceptance criteria

* Audit log exists for every critical edit:

  * event time/venue
  * RSVP override
  * gifts details

---

## 8) UX philosophy (how we keep it parent-usable)

**Rules**

* One primary action per screen
* Chips and pickers instead of forms
* Always show “next best action”
* Never block progress for missing fields
* Large tap targets + simple language (Hinglish-ready)

**Examples**

* Add Guest: “Paste number / Import / Add manually”
* RSVP counts default to buckets
* “Edit later” is a feature, not a compromise

---

## 9) High-level data model (v2)

**Wedding**

* id, name, timezone, settings

**Event**

* id, wedding_id, name, start_time, venue_text, visibility, sort_order

**Person**

* id, wedding_id, phone_e164
* saved_as_name, invite_name
* source (google/phone/csv/manual)
* do_not_message

**GuestUnit** (family/household invitation unit)

* id, wedding_id
* unit_label
* primary_person_id
* side, tags, notes
* estimate_bucket

**UnitMember**

* unit_id, person_id

**Invitation**

* event_id, unit_id
* status (invited/messaged), messaged_at

**RSVP**

* event_id, unit_id
* status (Unknown/Yes/No/Maybe)
* count_bucket, count_exact (optional)
* confidence (Estimated/Confirmed)
* updated_by (Guest/Admin), updated_at

**MessageLog**

* channel, template_id, status (sent/delivered/read/replied/failed), raw_payload_ref

**WebsiteConfig**

* published, privacy_mode, cover_photo, welcome_note

**GiftConfig**

* mode, upi_id, upi_qr_image, bank_details, registry_links, reservation_enabled, locked

**GiftItem / Reservation** (optional)

* items + reservation records

---

## 10) Technical constraints & implementation notes

### Client

* Mobile web (PWA)
* Works on low bandwidth
* Fast list rendering for 500–2000 guests
* Offline-tolerant for viewing lists (optional cache)

### Backend

* REST/GraphQL core APIs
* Import pipeline with dedupe + normalization
* Messaging service with queue + retries + idempotency

### WhatsApp integration

* Use Meta WhatsApp Cloud API for sending/receiving messages and status tracking. ([Facebook for Developers][13])
* Use interactive messages (buttons/lists) for RSVP flows. ([Facebook for Developers][10])
* Respect policy: 24-hour window + templates + opt-in requirements. ([WhatsApp Business][9])
* Build tier-aware throttling and monitoring due to messaging limits. ([Facebook for Developers][11])

### Contact import constraints

* Contact Picker API requires user gesture + secure context and is not universally supported. ([Chrome for Developers][6])
* Google People API supports paginated contact retrieval; sync tokens expire (engineering implications). ([Google for Developers][5])

---

## 11) Privacy, consent, and compliance (India)

You will process phone numbers and names (personal data). Under India’s DPDP framework, the Act sets the legal basis and commencement is via notification. ([MeitY][14])
India also notified DPDP Rules, 2025 (operationalizing the regime). ([Press Information Bureau][15])

**Product implications**

* Data minimization: store only what’s needed for invites/RSVPs
* Clear purpose notice during import (“used for wedding invites/updates”)
* Easy opt-out/Do Not Message
* Retention: auto-delete or archive after wedding window (configurable)
* Audit log for gifts edits to reduce scam risk

---

## 12) Risks & mitigations

### Risk 1: WhatsApp opt-in complexity for platform-sent invites

**Mitigation**

* Support Share-to-WhatsApp fallback as default for early weddings
* Use click-to-chat links so guests can initiate conversation (user-initiated entry point) ([WhatsApp Help Center][16])
* Keep reminders conservative; use templates only where compliant ([WhatsApp Business][9])

### Risk 2: Contact import results in ugly/inappropriate invite names

**Mitigation**

* Separate “Saved as” vs “Invite name”
* Inline edit + bulk cleanup
* Preview message before sending

### Risk 3: Merge/group changes break RSVP history

**Mitigation**

* RSVP ties to GuestUnit; define deterministic migration rules
* Add “Resolve conflicts” UI when merging units with conflicting event RSVPs

### Risk 4: Parent usability

**Mitigation**

* “Simple mode” navigation (Events / Guests / Messages / Exports)
* Avoid settings-heavy screens
* Field-level help text in plain language

---

## 13) Out-of-scope (v2 still)

* Payments collection inside platform
* Vendor marketplace / booking
* Seating charts and table assignments
* Full website theme builder
* Guest accounts and logins

---

## 14) Future roadmap (after v2)

**Next**

* Smart “pending follow-up” prioritization
* Outstation module (arrival/hotel) kept lightweight
* Day-of check-in (QR per GuestUnit)
* Multi-language UI (Hindi + regional)

**Later**

* Predictive headcount ranges based on RSVP patterns
* Vendor-facing read-only “ops views” (not marketplace)

---

## Final validation (your checklist)

### Can a 55-year-old parent use this without help?

Yes—because:

* they can import contacts and **invite immediately**, without perfect grouping
* dashboard answers “how many / who pending / export” in one tap
* website publishing is one screen with minimal choices

### Can a wedding with 1000 guests be managed?

Yes—because:

* you manage **GuestUnits** (families), not necessarily 1000 individually named entries
* imports + bulk actions remove manual entry
* WhatsApp structured replies scale better than calls
