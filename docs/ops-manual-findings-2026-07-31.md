# Ops manual findings — 2026-07-31

**Provenance:** gaps surfaced while writing [`docs/manual/`](manual/README.md) against current source (`main` @ `22901d2`). Every gap here was verified in code on this date — the older audits (`e2e-audit-2026-06-24.md`, `crm-gap-audit-2026-07-21.md`) list many items that are now fixed; this report contains only what is still true.

Each gap has a stable ID (`G-nn`) referenced inline from SOP steps as `> **Gap [G-nn]:**` boxes. IDs are never reused. Sizing: **S** = under a day, **M** = days, **L** = a real project.

## Summary

| ID            | Severity | Area        | One-liner                                                                                                                | SOPs affected      |
| ------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| [G-01](#g-01) | Critical | Money       | Customers cannot pay online — every payment is collected out-of-band and keyed by hand                                   | 07, 08             |
| [G-02](#g-02) | Critical | Comms       | Strictly one-way communications: no inbound, hardcoded templates, no reply-to                                            | 01, 02, 06, 08, 09 |
| [G-03](#g-03) | Critical | Comms       | Owner notifications are one in-app card on one screen (partial fix 2026-07-31: payments now land on the client timeline) | 01, 05, 08, 11     |
| [G-04](#g-04) | High     | Money       | Job costing omits materials — inventory is not linked to jobs                                                            | 05, 07, 10, 11     |
| [G-05](#g-05) | ✅ Fixed | Pipeline    | FIXED 2026-07-31 — estimate→job recovers the service by catalog-name match                                               | 03                 |
| [G-06](#g-06) | ✅ Fixed | Pipeline    | FIXED 2026-07-31 — property-less estimates show the schedule CTA disabled with "+ Add property"                          | 03                 |
| [G-07](#g-07) | ✅ Fixed | Pipeline    | FIXED 2026-07-31 — booking work (job or new schedule) advances the client to Active                                      | 03, 09             |
| [G-08](#g-08) | High     | Tasks       | Follow-up due dates fire nothing — no reminder, no sweep rule                                                            | 05, 09             |
| [G-09](#g-09) | High     | Offline     | PDF sharing is blocked until the server assigns a document number                                                        | 02, 07, 13         |
| [G-10](#g-10) | ✅ Fixed | Tools       | FIXED 2026-07-31 — "Enable tilt sensor" button requests iOS motion permission                                            | 10                 |
| [G-11](#g-11) | Medium   | Pipeline    | Dormant is a fully manual label; nothing detects lapsed clients                                                          | 09, 11             |
| [G-12](#g-12) | Medium   | Money       | No discounts, late fees, statements, or credit notes                                                                     | 07, 08             |
| [G-13](#g-13) | Medium   | Clients     | Property detail is a dead end: no job list, no CTAs, no delete, override not clearable                                   | 04, 09             |
| [G-14](#g-14) | ✅ Fixed | Inventory   | FIXED 2026-07-31 — starter list seeds once per device; an emptied inventory stays empty                                  | 10                 |
| [G-15](#g-15) | Medium   | Dispatch    | Route order is automatic-only — no manual reorder or pinned stop                                                         | 05                 |
| [G-16](#g-16) | Medium   | Schedule    | No month view, no drag-to-reschedule, no conflict/capacity detection                                                     | 04, 06             |
| [G-17](#g-17) | Medium   | Findability | No global search — only per-screen search boxes                                                                          | 09                 |
| [G-18](#g-18) | ✅ Fixed | Comms       | FIXED 2026-07-31 — board texts/nudges log the touch and use RFC-clean sms: links                                         | 05, 08             |
| [G-19](#g-19) | Medium   | Offline     | Schedule deletes and all settings saves require connectivity                                                             | 04, 13             |
| [G-20](#g-20) | Low      | Estimates   | Approval is token-possession only — no typed name or signature                                                           | 02                 |
| [G-21](#g-21) | Low      | Reports     | No revenue-by-month trend or revenue-by-service; client profitability not in Reports                                     | 11                 |
| [G-22](#g-22) | Low      | Scaling     | No crew/assignment seam anywhere in schema or UI                                                                         | 05                 |
| [G-23](#g-23) | ✅ Fixed | Comms       | FIXED 2026-07-31 — "running late" template + button beside "on my way"                                                   | 05, 06             |
| [G-24](#g-24) | Medium   | Clients     | Notes can only be logged against clients — nothing from job/estimate/invoice screens                                     | 05, 09             |
| [G-25](#g-25) | Medium   | Schedule    | No "skip next visit" on a recurring schedule — pause is all-or-nothing                                                   | 04                 |

---

<a id="g-01"></a>

## G-01 — Customers cannot pay online

- **Severity:** Critical
- **Symptom:** There is no "Pay now" anywhere a customer can reach. Invoices go out as PDFs or emails; the customer then pays by Zelle, check, cash, or a card terminal outside the app, and the operator keys the payment in by hand. Every day between "sent" and "keyed" is float, and every manual entry is an error opportunity.
- **Evidence:** `src/routes/_authed/settings/payments.tsx` states on-screen: "Online card collection isn't built yet… Picking a provider here only saves your preference." Payment methods are `cash | check | zelle | card_external | other`. `docs/worklists/growth.md:66` (Stripe Payment Link) is unchecked.
- **Affected SOPs:** SOP-07 (send), SOP-08 (record/chase)
- **Current workaround:** Put payment instructions in the invoice notes; record every receipt the same day via **Record payment** (SOP-08).
- **Proposed improvement (M):** Stripe Payment Link per invoice — a `pay_url` on the invoice, a "Pay now" button in the email template and PDF, and a webhook that calls `apply_payment`. Stripe plumbing (checkout/portal/webhook edge functions) already exists for subscriptions.

<a id="g-02"></a>

## G-02 — One-way communications

- **Severity:** Critical
- **Symptom:** The app can send (SMS deep-links, four email templates) but can never receive. Replies to email go to a single global from-address with no reply-to; there is no inbound webhook; message wording is not editable.
- **Evidence:** `src/lib/outreach.ts` (four hardcoded templates: on-my-way, appointment reminder, quote follow-up, review request — note: no "running late"), `supabase/functions/send-email/index.ts` (single `EMAIL_FROM`, no reply-to header), no inbound route or webhook in the tree.
- **Affected SOPs:** SOP-01, SOP-02, SOP-06, SOP-08, SOP-09
- **Current workaround:** All SMS deep-links open your own Messages app, so replies land on your phone — prefer SMS over email when you expect an answer. The public approval page already tells customers "Reply to the message that sent you this link."
- **Proposed improvement:** (S) set reply-to to the business email; (S) editable message templates with merge fields in Settings; (L) true inbound (email webhook or SMS provider) feeding the activity timeline.

<a id="g-03"></a>

## G-03 — Owner notifications are one card on one screen

- **Severity:** Critical
- **Symptom:** The only way the operator learns anything happened (new lead, quote approved/declined) is the **Needs attention** card on Today — in-app, 14-day window, 5 rows, dismissed by a device-local timestamp. No push, no email-to-owner, no badge. Payments generate no notification at all.
- **Evidence:** `src/features/activities/AttentionCard.tsx` is the sole surface; `apply_payment` writes no activity row; `src/routes/_authed/settings/preferences.tsx` contains an explicit comment that push has no backend.
- **Affected SOPs:** SOP-01, SOP-05, SOP-08, SOP-11
- **Current workaround:** The morning ritual in SOP-05 step 1 is mandatory — open Today and clear **Needs attention** before anything else. A lead you don't see is a lead you lose.
- **Proposed improvement:** (S) log an activity on `apply_payment` so payments at least reach the card; (M) daily owner email digest via the existing Resend outbox; (M) Web Push for lead/approval events.
- **Partial fix (2026-07-31):** `recordPayment` now logs "Payment received — $X on INV-n" to the client timeline. The card/push/digest half stays open.

<a id="g-04"></a>

## G-04 — Job costing omits materials

- **Severity:** High
- **Symptom:** Job profit = billed − (tagged expenses + labor from time-on-site). Materials pulled from inventory never touch the job, so mulch-heavy jobs look more profitable than they are.
- **Evidence:** `supabase/migrations/0047_time_on_site.sql` adds labor only; inventory tables (0028) have no job link; `docs/worklists/growth.md:79` defers materials-from-inventory.
- **Affected SOPs:** SOP-05, SOP-07, SOP-10, SOP-11
- **Current workaround:** Log a material expense against the job (**+ Log expense** on the job screen pre-links it) at the moment you load the truck. Inventory counts and job costs are two separate manual acts.
- **Proposed improvement (M):** "Use materials" on the job screen that decrements inventory and writes a cost expense in one step.

<a id="g-05"></a>

## G-05 — Estimate→job drops the service

- **Severity:** High
- **Symptom:** A job created from an accepted estimate has no service set. Marking it done trips the "no service set" warning, and its revenue is invisible to any by-service breakdown.
- **Evidence:** `src/features/estimates/hooks.ts:659` — `service_id: null` hardcoded in `createJobFromEstimate`.
- **Affected SOPs:** SOP-03
- **Current workaround:** Immediately after creating the job from an estimate, open it → **Edit** → set the Service (SOP-03 step 4 makes this mandatory).
- **Proposed improvement (S):** When the estimate's first line came from a catalog service (ServiceQuickAdd already knows), carry that `service_id` onto the job.
- **✅ Fixed (2026-07-31):** `createJobFromEstimate` matches the first line's description against the service catalog (exact name, case-insensitive) and carries the `service_id`; custom lines still land null. Pinned by `hooks.test.ts`.

<a id="g-06"></a>

## G-06 — Property-less accepted estimate hides the recurring path

- **Severity:** High
- **Symptom:** Property is optional on an estimate. If a property-less estimate is accepted, the job path helpfully shows "+ Add property", but **Create recurring schedule** simply doesn't render — the operator gets no hint that recurring work is even possible.
- **Evidence:** `src/routes/_authed/estimates/$estimateId.index.tsx:374` — the schedule CTA is wrapped in `{property && …}` with no fallback.
- **Affected SOPs:** SOP-03
- **Current workaround:** Add the property first (client → **Add property**), then reopen the estimate — the schedule button appears.
- **Proposed improvement (S):** Render the schedule CTA disabled with the same inline "+ Add property" affordance the job path has.
- **✅ Fixed (2026-07-31):** exactly that — the accepted-estimate screen now shows a disabled "Create recurring schedule" with "Needs a property — estimate has none." and "+ Add property".

<a id="g-07"></a>

## G-07 — Winning work doesn't advance the client stage

- **Severity:** High
- **Symptom:** Stage auto-advance fires in exactly two places: sending an estimate sets _Quoted_, and recording a payment sets _Active_. Accepting a quote and scheduling work advance nothing — a won, working client reads "Quoted" until their first payment lands, which skews the pipeline board and every stage count.
- **Evidence:** `src/features/invoices/hooks.ts:511` is the only `maybeAdvanceStage('active')` call; nothing fires on estimate acceptance or job/schedule creation.
- **Affected SOPs:** SOP-03, SOP-09
- **Current workaround:** SOP-03 ends with a mandatory manual step: advance the client to **Active** the moment you schedule their first work.
- **Proposed improvement (S):** Call `maybeAdvanceStage(clientId, 'active')` from `createJobFromEstimate`, `saveSchedule`, and estimate acceptance.
- **✅ Fixed (2026-07-31):** `createOneOffJob` (every job-creation path, including from estimates) and new-`saveSchedule` now advance the client to Active. Acceptance deliberately does not — per the stage spec, Active means _work booked_, which is also what the soft gate checks. Pinned by `jobWrites.test.ts` + `scheduleWrites.test.ts`.

<a id="g-08"></a>

## G-08 — Task due dates fire nothing

- **Severity:** High
- **Symptom:** "Call John Tuesday" appears only in a passively sorted list on Today and on the client's page. Nothing notifies, nothing escalates — an unseen due date is identical to no due date.
- **Evidence:** `supabase/migrations/0041_*` — the nightly `automation_sweep` has 7 rules; none touch `tasks`. `src/features/tasks/TaskUI.tsx` renders overdue in red but that is the entire enforcement.
- **Affected SOPs:** SOP-05, SOP-09
- **Current workaround:** The Today screen's Follow-ups section is checked every morning (SOP-05); the monthly hygiene pass (SOP-09) clears strays.
- **Proposed improvement (S):** Sweep rule 8 — tasks due today surface as attention activities (and in the owner digest once G-03 ships).

<a id="g-09"></a>

## G-09 — PDF sharing blocked until the number syncs

- **Severity:** High
- **Symptom:** Invoice and estimate numbers are assigned by the server. Offline, a brand-new document shows **Share PDF** disabled with "Syncs first — number pending" — you cannot hand a customer a PDF at the curb in a dead zone.
- **Evidence:** Share buttons on `src/routes/_authed/invoices/$invoiceId.tsx` and `estimates/$estimateId.index.tsx` are disabled while `number` is null; numbering is a server trigger.
- **Affected SOPs:** SOP-02, SOP-07, SOP-13
- **Current workaround:** Use **Email estimate / Email invoice** instead — it queues in the outbox and sends itself after sync. Or step into signal for ten seconds; numbers arrive with the first flush.
- **Proposed improvement (M):** Client-side provisional numbering (org-scoped counter reserved in the outbox) or a "DRAFT — number pending" PDF watermark path.

<a id="g-10"></a>

## G-10 — Grade estimator is dead on iOS

- **Severity:** High (for iPhone users; the primary device is a phone)
- **Symptom:** The grade tool reads device tilt, but iOS 13+ requires an explicit `DeviceOrientationEvent.requestPermission()` call behind a user gesture. The app never calls it, so iOS Safari shows the sensor-unavailable fallback forever.
- **Evidence:** No `requestPermission` call anywhere under `src/routes/_authed/tools/`.
- **Affected SOPs:** SOP-10
- **Current workaround:** None on iOS. On Android it works as documented.
- **Proposed improvement (S):** An "Enable tilt" button that requests permission on tap, with a denial fallback message.
- **✅ Fixed (2026-07-31):** "Enable tilt sensor" button calls `DeviceOrientationEvent.requestPermission()` behind the required user gesture; denial shows a settings hint. Non-iOS behavior unchanged.

<a id="g-11"></a>

## G-11 — Dormancy is fully manual

- **Severity:** Medium
- **Symptom:** No automation ever sets a client to _Dormant_, and nothing surfaces "you haven't worked for this client in 60 days." Lapsed clients sit in _Active_ forever, and no win-back motion exists.
- **Evidence:** `maybeAdvanceStage` early-returns on `dormant` (`src/features/clients/hooks.ts:169`); no sweep rule targets inactivity.
- **Affected SOPs:** SOP-09, SOP-11
- **Current workaround:** The monthly dormant pass in SOP-09: walk _Active_ on the Pipeline board, demote anyone with no future work and no recent activity, and create a win-back follow-up task as you do.
- **Proposed improvement (S/M):** Sweep rule: active client with no job in N days and no future schedule → attention activity suggesting dormant + a win-back task.

<a id="g-12"></a>

## G-12 — No discounts, late fees, statements, or credit notes

- **Severity:** Medium
- **Symptom:** Receivables tooling is thin: no discount concept (negative line items are the workaround), no late-fee policy, no per-client statement across invoices, no credit note, and overpayment is hard-blocked (no credit balance / prepayment).
- **Evidence:** No discount/credit fields in invoice schema or UI; `PaymentSheet` rejects amounts over the balance.
- **Affected SOPs:** SOP-07, SOP-08
- **Current workaround:** Discounts = a negative line item ("Loyalty discount — −$20"). Corrections = reverse the payment and re-record. Statements = the client's Open balance card + invoice list, read aloud.
- **Proposed improvement:** (S) first-class discount line type; (M) late-fee policy in settings applied by the sweep; (M) printable per-client statement.

<a id="g-13"></a>

## G-13 — Property detail is a dead end

- **Severity:** Medium
- **Symptom:** A property page shows schedules and price overrides but has no "jobs at this property" history, no new-job/new-estimate CTA, no delete/archive, never displays its residential/commercial type, and a price override cannot be cleared back to the catalog default.
- **Evidence:** `src/routes/_authed/properties/$propertyId.index.tsx`.
- **Affected SOPs:** SOP-04, SOP-09
- **Current workaround:** Do job/estimate creation from the _client_ page (its CTAs carry the property when there's only one). To "remove" an override, set it equal to the catalog price. A truly dead property: archive the whole client, or delete its schedules and let it sit.
- **Proposed improvement (M):** Job-history list, the two CTAs, archive, and a "clear override" affordance.

<a id="g-14"></a>

## G-14 — Inventory: no delete, silent re-seed

- **Severity:** Medium
- **Symptom:** Items can be edited but never deleted, and an emptied inventory silently repopulates with the starter list on next load.
- **Evidence:** No delete in `src/features/inventory/hooks.ts`; `loadStarterInventory()` fires from an effect whenever the list loads empty. (Item removal exists in the edit sheet as **Remove item** — but removing _all_ items triggers the re-seed.)
- **Affected SOPs:** SOP-10
- **Current workaround:** Keep at least one real item so the seeder never fires; ignore unused starter rows or zero their low-stock threshold so they never alert.
- **Proposed improvement (S):** Seed only on true first-run (flag in business settings), not on every empty load.
- **✅ Fixed (2026-07-31):** `loadStarterInventory` stamps a device-local `inventorySeededAt` preference and never seeds again — an emptied inventory stays empty. (Device-local: a brand-new device with a genuinely empty org seeds once, same as before.) Pinned by `inventoryWrites.test.ts`.

<a id="g-15"></a>

## G-15 — Route order is automatic-only

- **Severity:** Medium
- **Symptom:** Stop order is nearest-neighbor from your GPS position. You cannot drag a stop, pin a "must be first" (gated community opens at 9) or "must be last" stop.
- **Evidence:** `src/lib/route.ts` (`orderByNearestNeighbor`) is the only ordering; no reorder UI in `DispatchScreen.tsx`.
- **Affected SOPs:** SOP-05
- **Current workaround:** Time-window and gate-code chips show on each stop — deviate from the suggested order on your own judgment; the list is advice, not law. For hard constraints, set the job's start time and treat it as the anchor.
- **Proposed improvement (M):** Drag-to-reorder with pinned first/last, feeding the same Maps deep link.

<a id="g-16"></a>

## G-16 — No month view or conflict detection

- **Severity:** Medium
- **Symptom:** Schedule is a 7-day strip. No month overview, no drag-to-reschedule, and nothing warns when you stack more work on a day than you can do.
- **Evidence:** `src/routes/_authed/schedule.tsx` — week strip only.
- **Affected SOPs:** SOP-04, SOP-06
- **Current workaround:** The **Best day** helper on new-job shows drive proximity for the next 7 days; day chips show job-count dots. For capacity, count the dots before you book.
- **Proposed improvement (M/L):** Month grid with per-day counts and a soft over-capacity warning.

<a id="g-17"></a>

## G-17 — No global search

- **Severity:** Medium
- **Symptom:** Search exists per-screen (Clients; Money's three tabs; Inventory) but there is no one box that finds "the Hendersons' April invoice" from anywhere.
- **Evidence:** No global search component; three scoped inputs.
- **Affected SOPs:** SOP-09 (find-the-client is the entry to most flows)
- **Current workaround:** Start from **Clients** — its search matches name, email, or phone digits, and the client page links to everything they own.
- **Proposed improvement (M):** One search over clients/jobs/estimates/invoices, opened from the header.

<a id="g-18"></a>

## G-18 — Board quick-action SMS skips the activity log

- **Severity:** Medium
- **Symptom:** **Friendly reminder** and quote-card texts fired from board cards open the SMS composer but never write an activity, so the client's timeline lies about your last touch. (The same actions from the client page or NudgeSheet do log.)
- **Evidence:** `src/features/board/cardActions.ts:39,105` — no `logActivity` call.
- **Affected SOPs:** SOP-05, SOP-08
- **Current workaround:** For touches that must be on the record (collections), nudge from **Money → Nudge overdue** or the client page, not from a board card.
- **Proposed improvement (S):** Route board card actions through the same logging path.
- **✅ Fixed (2026-07-31):** quote-card texts and A/R "Friendly reminder" now `logActivity` on the client timeline, and all board `tel:`/`sms:` links are built through `telHref`/`smsHref` (fixing the latent RFC 3966 blank-composer bug the raw links carried).

<a id="g-19"></a>

## G-19 — Some writes require connectivity

- **Severity:** Medium
- **Symptom:** Two sanctioned exceptions to the offline-outbox rule: deleting a recurring schedule, and all business-settings saves (Profile, Tax, Automations, Payments). Offline, these fail with a toast instead of queueing.
- **Evidence:** `deleteSchedule` toasts "Could not reach the server…"; `saveBusinessSettings` is a documented direct-upsert exception.
- **Affected SOPs:** SOP-04, SOP-13
- **Current workaround:** Offline, **Pause** a schedule instead of deleting it (pause queues fine); save settings changes when you're back on wifi.
- **Proposed improvement (M):** Outbox-ify both, or label the buttons "(online only)" so the failure isn't a surprise.

<a id="g-20"></a>

## G-20 — Approval is token-possession only

- **Severity:** Low
- **Symptom:** Anyone holding the `/e/…` link can approve or decline the estimate. No typed name, no signature, no IP/timestamp shown to the operator beyond the activity line.
- **Evidence:** `src/routes/e.$token.tsx` — approve/decline with no identity capture.
- **Affected SOPs:** SOP-02
- **Current workaround:** Send the link directly to the customer's own phone/email and keep the thread. For big-ticket work, follow the approval with a confirming text — the thread is your signature.
- **Proposed improvement (S):** "Type your name to approve" field stored on the estimate.

<a id="g-21"></a>

## G-21 — Reports lack trend and by-service views

- **Severity:** Low
- **Symptom:** Reports show P&L, categories, methods, job profitability, and A/R for one date range — but no month-over-month revenue trend, no revenue-by-service, and client profitability (which exists on the client page) isn't in Reports.
- **Evidence:** `src/routes/_authed/money/reports.tsx`; `client_profitability` RPC exists but is only surfaced on client detail.
- **Affected SOPs:** SOP-11
- **Current workaround:** Run the same report for consecutive months and compare by hand; CSV export feeds a spreadsheet.
- **Proposed improvement (M):** Trend section + by-service rollup (by-service is only honest after G-05 is fixed).

<a id="g-22"></a>

## G-22 — No crew seam

- **Severity:** Low (by design — solo operator)
- **Symptom:** Jobs belong to the org, not to a person. No `assigned_to`, no crew concept, in schema or UI. Fine solo; expensive to retrofit at the first hire.
- **Evidence:** Zero hits for `assigned_to|crew|assignee` across `src/` and all migrations.
- **Affected SOPs:** SOP-05 (scaling note)
- **Current workaround:** None needed while solo.
- **Proposed improvement (L):** Before the first hire: `assigned_to` on jobs, a member picker, and per-member day routes. Membership roles (`owner|admin|tech`) already exist in schema.

---

## New findings discovered while writing this manual

Documented as they surfaced during SOP walkthroughs; numbered after the pre-verified set.

<a id="g-23"></a>

## G-23 — No "running late" outreach template

- **Severity:** Low
- **Symptom:** Outreach templates cover on-my-way, appointment reminder, quote follow-up, and review request — but the most common day-of message ("running 30 late") must be typed by hand every time.
- **Evidence:** `src/lib/outreach.ts` — four templates, none for delays.
- **Affected SOPs:** SOP-05, SOP-06
- **Current workaround:** Use **Call** or type the text manually from the job's client card.
- **Proposed improvement (S):** Fifth template with a minutes placeholder.
- **✅ Fixed (2026-07-31):** `runningLateMessage` template + a "Text 'running late'" button beside "on my way" on the job screen, activity-logged like its sibling. (No minutes placeholder — the message promises a text when close instead, which is always true.)

<a id="g-24"></a>

## G-24 — Notes can only be logged against clients

- **Severity:** Medium
- **Symptom:** The activity timeline renders only on the client page, and no UI writes a free-form note from a job, estimate, or invoice — field observations ("sprinkler head broken, NE corner") have no home at the place they happen.
- **Evidence:** `ActivityTimeline` mounted only in `clients/$clientId.index.tsx`; no note composer on job/estimate/invoice screens.
- **Affected SOPs:** SOP-05, SOP-09
- **Current workaround:** Job-specific facts go in the job's scope/notes field or checklist; client-level facts require navigating to the client page and adding a note there.
- **Proposed improvement (S):** "+ Note" on the job screen writing an activity with the `job_id` already supported by `logActivity`.

<a id="g-25"></a>

## G-25 — No "skip next visit" on a recurring schedule

- **Severity:** Medium
- **Symptom:** A customer saying "skip next week, we're on vacation" has no direct control. **Pause** stops the whole schedule (with an optional auto-resume date), but there is no one-tap skip of a single upcoming occurrence.
- **Evidence:** `src/routes/_authed/schedules/$scheduleId.edit.tsx` — PauseControls only; no per-occurrence action.
- **Affected SOPs:** SOP-04
- **Current workaround:** Let the visit materialize as a job, then **Skip (rain / no-show)** or **Move** that one job — its customization survives schedule resyncs. For longer holds, Pause with an auto-resume date.
- **Proposed improvement (S/M):** "Skip next visit" on the schedule that pre-skips the next materialized occurrence.
