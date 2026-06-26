# Growth & customer-facing — worklist

Competitive-gap track from `docs/competitive-gap-analysis-2026-06-25.md`. These
close the gap to the market leaders' "Client Hub" feature set. Apply all four
rubric lenses (README) to each item.

Source screens: [home](../../src/routes/_authed/index.tsx) ·
[onboarding](../../src/routes/onboarding.tsx) ·
estimates · invoices · jobs.

## Tier 1 — activation & free wins (mostly frontend)

- [x] **Activation checklist** on the home/Today screen: a "getting started" card
      that tracks _add first client → send first quote → schedule first job_,
      reads real counts (clients/estimates/jobs), is dismissible, and hides once
      complete. Replaces the silent hand-off after onboarding. _(done 2026-06-25:
      `src/features/activation/ActivationCard.tsx` on Today; 6 tests; verified in
      demo — visible at 0/3, hidden when populated.)_
- [ ] **Success → next-step sheet**: after creating an estimate/job/invoice, offer
      the next action ("Schedule work" / "Create invoice" / "Record payment")
      with context carried.
- [ ] **Global quick-create FAB**: client / estimate / job / invoice / expense
      from anywhere (today only "+ Job" exists on home).
- [ ] **Default new client to `lead`** when arrived from a lead/pipeline context
      (`?lead=1`). _(also tracked in clients.md)_
- [x] **Google review request**: one-tap `sms:` link with the review URL on a
      done job (review URL set in Settings → Profile). _(done 2026-06-25:
      migration 0032 `business_settings.review_url`; profile field; "Request a
      Google review" CTA on done jobs; `src/lib/outreach.ts` + 6 tests; verified
      in demo.)_
- [x] **"On my way" SMS**: native `sms:` deep link from job detail, prefilled
      with client name + business + destination. _(done 2026-06-25: "Text on my
      way" on scheduled/in-progress jobs; verified in demo.)_
- [ ] **Appointment reminder**: one-tap `sms:` reminder for tomorrow's jobs from
      the schedule view.

## Tier 2 — customer-facing (light backend)

- [ ] **Online estimate approval link**: token-keyed public route (no login);
      customer taps Approve/Decline → status flips, activity logged. Edge fn +
      public route + `estimate_tokens` table.
- [ ] **Public "Request a Quote" lead form**: public route → edge fn inserts a
      `client` with `stage='lead'` + a `property`. Opens top-of-funnel.
- [ ] **Stripe Payment Link on invoices**: "Pay now" button generating a Stripe
      payment link (Stripe seam already stubbed in Settings → Payments).
- [ ] **Real send** for estimates/invoices via Resend/Brevo free tier — replaces
      the manual "mark sent" status flip with an actual delivered document.

## Tier 3 — strategic (heavier; not "right now")

- [ ] Recurring autopay / card-on-file (after Stripe payment link).
- [ ] Instant property-measurement quoting (mapping/measurement build).
- [ ] Job costing / time-on-site (real clock, replaces free-text `start_time`).
- [ ] Online booking windows (customer self-schedules).
      </content>
