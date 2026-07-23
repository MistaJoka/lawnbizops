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
- [x] **Success → next-step sheet**: after creating an estimate/job/invoice, offer
      the next action ("Schedule work" / "Create invoice" / "Record payment")
      with context carried. _(done 2026-07-19: shared NextStepSheet on clients/new + properties/new; estimate/job/invoice creation already lands on detail
      screens whose primary CTAs ARE the next step (accepted estimate → create
      job/schedule/convert; done job → create invoice; invoice → record payment)
      — context carried via route params throughout.)_
- [x] **Global quick-create FAB**: client / estimate / job / invoice / expense
      from anywhere (today only "+ Job" exists on home). _(done 2026-07-19:
      TabBar's center "New" target opens QuickCreateSheet — all five creates +
      a Go-to grid for the deep-link-only screens; see shared.md.)_
- [x] **Default new client to `lead`** when arrived from a lead/pipeline context
      (`?lead=1`). _(done 2026-07-19: clients/new validateSearch + ClientForm
      defaultLead; pipeline empty-state link carries ?lead=1 — see clients.md.)_
- [x] **Google review request**: one-tap `sms:` link with the review URL on a
      done job (review URL set in Settings → Profile). _(done 2026-06-25:
      migration 0032 `business_settings.review_url`; profile field; "Request a
      Google review" CTA on done jobs; `src/lib/outreach.ts` + 6 tests; verified
      in demo.)_
- [x] **"On my way" SMS**: native `sms:` deep link from job detail, prefilled
      with client name + business + destination. _(done 2026-06-25: "Text on my
      way" on scheduled/in-progress jobs; verified in demo.)_
- [x] **Appointment reminder**: one-tap `sms:` reminder for tomorrow's jobs from
      the schedule view. _(done 2026-07-19: 🔔 button beside future scheduled jobs
      with a phone on file in the schedule day list — prefilled
      appointmentReminderMessage ("tomorrow" / "on <date>"); unit-tested in
      outreach.test.ts. Complements the automated same-day reminder emails from
      automation_sweep.)_

## Tier 2 — customer-facing (light backend)

- [x] **Online estimate approval link**: token-keyed public route (no login);
      customer taps Approve/Decline → status flips, activity logged. _(done
      2026-06-25: migration 0033 — `estimates.approval_token` + anon-callable
      `estimate_by_token`/`respond_to_estimate` SECURITY DEFINER RPCs scoped to
      the token, no table exposed to anon; public route `/e/$token`
      (`src/routes/e.$token.tsx`); "Send approval link" CTA on sent estimates;
      `src/features/estimates/approval.ts` + 6 tests; RPCs round-trip tested on
      prod; verified end-to-end in demo.)_
- [x] **Public "Request a Quote" lead form**: public route → anon RPC inserts a
      `client` with `stage='lead'` + a `property`. Opens top-of-funnel. _(done
      2026-06-26: migration 0034 — `business_settings.intake_token` + anon
      `intake_business_name`/`submit_lead` SECURITY DEFINER RPCs, token-scoped,
      no table exposed; public route `/quote/$token`; "Quote request link" share
      in Settings → Profile; `src/features/leads/intake.ts` + 5 tests; submit_lead
      round-trip + validation tested on prod; verified end-to-end in demo. NOTE:
      public writer — bounded by token + required fields + length caps; CAPTCHA/
      rate-limit can layer on later.)_
- [ ] **Stripe Payment Link on invoices**: "Pay now" button generating a Stripe
      payment link (Stripe seam already stubbed in Settings → Payments).
- [x] **Real send** for estimates/invoices via Resend/Brevo free tier — replaces
      the manual "mark sent" status flip with an actual delivered document.
      _(done 2026-07-19: migration 0036 email_outbox + queue_email/claim RPCs +
      pg_cron kick via pg_net/Vault; send-email edge fn deployed (Resend, dormant
      until RESEND_API_KEY/EMAIL_FROM/APP_URL/EMAIL_DRAIN_KEY secrets set + domain
      verified). Email buttons on estimate + invoice detail; sent_at shown in UI.)_

## Tier 3 — strategic (heavier; not "right now")

- [ ] Recurring autopay / card-on-file (after Stripe payment link).
- [ ] Instant property-measurement quoting (mapping/measurement build).
- [x] Job costing / time-on-site (real clock). _(v1 done 2026-07-23, migration
      0047: `jobs.started_at` stamped on first Start (setJobStatus), duration =
      started→completed; org `labor_rate_cents_per_hour` in Settings → Profile
      (0 = off, so profit numbers never move silently); labor priced into
      `job_profitability` (SQL) and the job-detail economics card (JS mirror
      `timeOnSite.ts`, differential-tested against the RPC). `start_time`
      free-text stays as the *planned* time; the clock is the *actual*.
      Deferred: crew/multi-rate, materials from inventory, live running timer.)_
- [ ] Online booking windows (customer self-schedules).
      </content>
