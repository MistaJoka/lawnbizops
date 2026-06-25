# Pipeline stage specification & gap matrix — 2026-06-25

Goal: take a customer through the **entire** pipeline and find every gap in
(a) the **data** required to initialize a stage and advance to the next, and
(b) the **elements/components** required to satisfy each stage's **entry and exit
criteria**. Built from the actual schema (`database.types.ts`), migrations, and
the transition code — every claim below is verified against source.

---

## 0. The core structural finding

There are **two independent state machines** and **they are not connected, and
neither has any enforced entry/exit criteria.**

1. **Customer stage** (`clients.stage`): `lead → quoted → active → dormant`
2. **Work lifecycle**: estimate (`draft→sent→accepted`) → job
   (`scheduled→in_progress→done→invoiced`) → invoice
   (`draft→sent→partially_paid→paid`) → payment

**Every transition is a free-form field write with no precondition check:**

| Transition fn | Guard | File |
|---|---|---|
| `setClientStage(client, stage)` | none — patches `stage` | `clients/hooks.ts:133` |
| `setEstimateStatus(id, status)` | none — patches `status` | `estimates/hooks.ts:223` |
| `setJobStatus(job, status)` | none — patches `status` (+`completed_at` on done) | `jobs/hooks.ts` |
| `markSent(id)` | none — patches `status:'sent'` | `invoices/hooks.ts:468` |

Consequences (all currently possible):
- Mark a **lead → quoted with no estimate**; **→ active with no scheduled work
  and no paid invoice.** The client detail StageControl exposes all four stages
  as free jumps (confirmed live on James Okafor).
- Flip an estimate **draft → accepted**, skipping "sent" (no customer ever saw
  it); mark an estimate **sent with $0 / and never enforce a property**.
- Mark a job **scheduled → done** without ever starting it; no checklist/photo
  required to be "done."
- Mark an invoice **sent with no customer contact info** on file.
- The customer stage is **decoupled** from work: a `lead` can have a paid
  invoice; an `active` client can have zero jobs. Stage is a manual label, not a
  reflection of reality.

**There is no "stage gate" concept and no component that validates readiness.**
This is the root gap the rest of this document enumerates concretely.

---

## 1. Canonical journey — entry/exit criteria per stage

For each step: **Entry** (state/data to legitimately be here) · **Exit** (what
must be produced to advance) · **Data required** · **Producing component**
(what the user uses to satisfy exit) · **Gate** (what enforces it) · **Gaps**.

### Step A — Intake (new lead)
- **Entry:** a contact exists with `stage='lead'`.
- **Exit → Lead worked:** lead is reachable and has a service address.
- **Data required:** `name` ✅(required). At least one **contact channel**
  (phone *or* email). A **property** with an address.
- **Producing component:** `/clients/new` (ClientForm).
- **Gate:** ClientForm requires only `name`; phone/email/property all optional.
- **Gaps:**
  - **G-A1 [data]** No "≥1 contact channel" rule — a lead can be saved with no
    phone *and* no email, so it can never be quoted, invoiced, or reminded.
    (`ClientForm.tsx` — only `name` is `required`.)
  - **G-A2 [component]** **No inbound lead capture.** Leads exist only via manual
    create or CSV import — there is no public "request a quote" intake. The top
    of the funnel has no entry door. (See `e2e-audit` Appendix B.)
  - **G-A3 [flow]** New client defaults to `active`, not `lead`, unless a toggle
    is set — so real leads are mislabeled by default.

### Step B — Lead → Quoted
- **Entry:** `stage='lead'`, a property with an address exists.
- **Exit → Quoted:** an **estimate** has been created **and sent** to the customer.
- **Data required:** estimate with `client_id` ✅, **≥1 line item** ✅(enforced at
  create: `canCreate = clientId && linesValid && items.length>0`,
  `estimates/new.tsx:52`), a **property** (for later scheduling), a **price**.
- **Producing component:** `/estimates/new`.
- **Gate:** none ties `stage='quoted'` to estimate existence.
- **Gaps:**
  - **G-B1 [component]** **No "Create estimate" from a lead/client.** The single
    exit action for a lead has no button on the client/lead screen — the operator
    must leave to Money → Estimates → +Estimate and **re-pick the client**.
    (Confirmed live.)
  - **G-B2 [data carry]** `/estimates/new` ignores `?clientId`/`?propertyId`
    (`validateSearch` empty, `estimates/new.tsx:7`) — context is re-entered.
  - **G-B3 [data]** Estimate `property_id` is **optional**; a property-less
    estimate silently blocks "Create job" later (job needs a property).
  - **G-B4 [gate]** `stage='quoted'` can be set with no estimate; "sent" can be
    set on a draft never shown to a customer (no real send exists — see G-F2).

### Step C — Quoted → Won (accepted + scheduled)
- **Entry:** estimate `status='sent'`.
- **Exit → Active/Won:** estimate `accepted` **and** work scheduled (a one-off
  **job** or a **recurring schedule**).
- **Data required:** `accepted` status; a `job` (`property_id`+`scheduled_date`
  required) **or** a `recurring_schedule` (`property_id`+`cadence`+`anchor_date`
  required); the property's **lat/lng** for dispatch.
- **Producing component:** estimate accept (manual flip); `/jobs/new` (carries
  `?propertyId`/`?date`); `/schedules/new`.
- **Gate:** none.
- **Gaps:**
  - **G-C1 [component]** **No customer-facing approval.** "Accepted" is an
    operator button, not a customer action — no approval link, no timestamp of
    *their* assent.
  - **G-C2 [component]** Accepted estimate offers **"Create job" / "Convert to
    invoice" but no "Create recurring schedule"** — the most common lawn outcome
    (weekly mow) can't be produced from the estimate. (`$estimateId.tsx:291`)
  - **G-C3 [data carry]** Job/schedule created from an estimate do **not** inherit
    the estimate's service/price/title — re-typed by hand.
  - **G-C4 [component]** `/schedules/new` is reachable **only** from a property
    detail — no path from the estimate, client, or pipeline.
  - **G-C5 [data]** If the estimate has no property, "Create job" is disabled with
    **no inline "add property"** affordance — a dead-end (G-B3 compounding).

### Step D — Scheduled → In progress → Done
- **Entry:** job `status='scheduled'`, `scheduled_date` set.
- **Exit → Done:** work completed; `status='done'`, `completed_at` stamped.
- **Data required:** job `property_id`✅ + `scheduled_date`✅; a **dispatchable
  location** (`property.lat/lng`); ideally `service_id` + `price_cents>0`.
- **Producing component:** Today board / `/jobs/$id` status control; dispatch map.
- **Gate:** none — any status can jump to any status.
- **Gaps:**
  - **G-D1 [data]** **`property.lat/lng`, address, city, state, zip are all
    optional** (`properties` requires only `client_id`; PropertyForm has no
    `required` on address and **no geocoding**). A job can be scheduled with **no
    location**, so it silently drops off the dispatch map (listed as "not on map,"
    and that row isn't even tappable). This is the biggest *data*-initialization
    gap in the work machine.
  - **G-D2 [data]** `job.price_cents` defaults to 0 and `service_id` is nullable
    — a "done" job can carry $0 and no service, then invoice to $0 / be invisible
    to revenue-by-service.
  - **G-D3 [gate]** Job can be marked `done` straight from `scheduled` (no
    in-progress), and "done" requires no checklist completion or photo.
  - **G-D4 [data]** `start_time` is a free-text field, not a real clock — no
    actual time-on-site is captured, so job costing has no labor input.

### Step E — Done → Invoiced
- **Entry:** ≥1 job `status='done'` and not yet invoiced.
- **Exit → Invoiced:** an invoice draft created; its jobs flip to `invoiced`.
- **Data required:** invoice `client_id`✅; ≥1 line (job or manual); a `due_at`.
- **Producing component:** `/invoices/new` (auto-loads done jobs, pre-checked,
  reads `?clientId`) — **this step is well built.**
- **Gate:** none on amount.
- **Gaps:**
  - **G-E1 [data]** A `$0` done job (G-D2) is includable and produces a $0 line.
  - **G-E2 [data]** `invoice.due_at` is nullable; a sent invoice with no due date
    has undefined aging.
  - **G-E3 [precondition]** Numbering (`assign_invoice_number`,
    `0006:79`) reads `business_settings.next_invoice_number` — requires the
    business to be **onboarded**; offline-created invoices get a number at sync.
    OK, but onboarding is an unstated hard precondition for this stage.

### Step F — Invoiced → Sent
- **Entry:** invoice `status='draft'`.
- **Exit → Sent:** invoice delivered to the customer; `status='sent'`.
- **Data required:** customer **contact channel** (email/phone), invoice number,
  `due_at`.
- **Producing component:** `markSent()` + "Share PDF" (Android share sheet).
- **Gate:** none.
- **Gaps:**
  - **G-F1 [data]** Can mark `sent` with **no customer email/phone** on file
    (G-A1) — nothing was actually deliverable.
  - **G-F2 [component]** **No real send.** "Sent" is a status flip; transmission
    is a manual share-sheet PDF. No email/SMS, no delivery timestamp, no
    customer-viewable link. (Same for estimates.)

### Step G — Sent (A/R) → Paid
- **Entry:** invoice `status='sent'`.
- **Exit → Paid:** payments cover the balance; status → `partially_paid`/`paid`
  via `apply_payment` (`0006:133`).
- **Data required:** payment `amount_cents`✅ + `method`✅ + `invoice_id`✅.
- **Producing component:** record-payment form (amount prefilled to balance, date
  today — **well built**, except method always defaults `cash`).
- **Gate:** `apply_payment` recomputes status correctly. **This step is sound.**
- **Gaps:**
  - **G-G1 [defaults]** Payment `method` doesn't remember last-used (−1 tap each).
  - **G-G2 [correctness]** Voiding an invoice with recorded payments doesn't
    reverse/flag them — collected revenue can count a voided invoice
    (`voidInvoice` `:485`).

### Step H — Paid → Retained / next cycle
- **Entry:** invoice `paid`.
- **Exit:** customer retained — recurring schedule continues, follow-up logged,
  review requested; `stage` reflects `active`.
- **Data required:** a recurring schedule (for recurring revenue), the operator's
  Google `placeid` (for a review link).
- **Producing component:** auto-followup setting; recurring materialization.
- **Gate:** none.
- **Gaps:**
  - **G-H1 [component]** **No review/referral request** (free `placeid` link).
  - **G-H2 [data]** Materialization horizon is 56 days, run on app-open only — a
    recurring customer's future visits silently stop past the horizon.
  - **G-H3 [gate]** Marking `paid` doesn't advance/confirm the client to `active`
    (machines decoupled).

### Step I — Dormant → Reactivated
- **Entry:** `stage='dormant'`.
- **Exit:** new estimate/job; back to `active`.
- **Producing component:** —
- **Gaps:**
  - **G-I1 [component]** **No "reactivate"** action and **no automated dormancy
    detection** (despite the auto-followup/overdue settings existing); dormant is
    a manual dead-end.

---

## 2. Data-initialization gap table (field-level)

Fields that are **nullable/defaulted in the schema but are effectively required**
to complete a stage — the "data needed to initialize / advance" gaps.

| Entity.field | Schema | Needed for | Gap |
|---|---|---|---|
| `clients.phone` / `.email` | both optional | send estimate/invoice/reminder | **No ≥1-contact rule** (G-A1) |
| `properties.address_line1` | optional | service address, geocode | savable blank (G-D1) |
| `properties.lat/lng` | optional, **no geocoder** | dispatch routing | jobs with no map pin (G-D1) |
| `estimates.property_id` | nullable | create job from estimate | blocks scheduling (G-B3) |
| `jobs.service_id` | nullable | revenue-by-service | untracked (G-D2) |
| `jobs.price_cents` | default 0 | billing | $0 invoice lines (G-D2/E1) |
| `invoices.due_at` | nullable | aging / reminders | undefined aging (G-E2) |
| `business_settings` | onboarding-seeded | invoice/estimate numbering | unstated hard precondition (G-E3) |

---

## 3. Missing components inventory (elements that don't exist)

The "elements/components needed to complete entry/exit criteria" that are **not
present** anywhere in the app:

1. **Stage-gate / readiness model** — nothing validates that a customer has the
   data/state required to be in (or advance from) a stage. *(root gap)*
2. **"Create estimate" from a lead/client** (G-B1).
3. **"Create recurring schedule" from an accepted estimate** + data carry (G-C2/3).
4. **Inline "add property"** when an estimate/job needs one (G-C5/B3).
5. **Address geocoder** on the property form (G-D1).
6. **Real send** (email/SMS) for estimate & invoice, with delivery timestamp (G-F2).
7. **Customer approval link** for estimates (G-C1).
8. **Time-on-site capture** (real clock vs text `start_time`) (G-D4).
9. **Public lead-intake form** (G-A2).
10. **Review/referral request** (G-H1) and **reactivate / dormancy automation** (G-I1).
11. **Stage↔work reconciliation** so `stage` reflects reality (G-H3, §0 decoupling).

---

## 4. Recommendation — introduce a "stage readiness" model

Rather than hard-blocking (which fights offline-first and a busy operator), add a
**readiness layer** that makes the criteria explicit and one-tap-satisfiable:

- **Readiness chips** on each client/entity: "Lead — needs: ☐ contact ☐ property
  ☐ estimate" → tapping a missing item opens the prefilled producing component.
  This turns the implicit entry/exit criteria into a visible checklist and folds
  in every missing-component gap above as the chip's action.
- **Soft gate on advance:** the Pipeline "Advance" / StageControl warns (not
  blocks) when exit criteria aren't met ("Move to Active? No scheduled work
  exists.") and offers the producing action inline.
- **Required-data validation** at the points that matter: ≥1 contact to leave
  Lead; a geocoded address to schedule a dispatchable job; price>0 + service to
  mark a job done/billable.
- **Auto-advance stage as a side effect** of the work (estimate sent → quoted;
  first scheduled job/paid invoice → active), so the two machines reconcile.

### Build order (by leverage)
1. **Readiness chips + "Create estimate from lead"** (G-B1, the model + the top
   missing exit action). 2. **Deep-link estimate + carry to job/schedule**
   (G-B2/C3). 3. **Estimate→schedule + inline add-property** (G-C2/C5). 4. **≥1
   contact + geocoded-address validation** (G-A1/D1). 5. **Soft advance gate +
   auto-advance** (§0/G-H3). 6. **Real send + review link** (G-F2/H1). 7.
   Correctness: void-payments, materialization horizon (G-G2/H2).

Items here are seeded into the `/loop` worklists; the larger components map to
Tracks B/C in `docs/e2e-audit-2026-06-24.md` and `docs/crm-roadmap.md`.
