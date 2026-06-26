# Competitive gap analysis — 2026-06-25

How LawnBizOps compares to the market leaders (Jobber, Housecall Pro, Yardbook,
Service Autopilot, LMN, SingleOps), where the gaps are, and the highest-ROI
systems to close them — filtered for what's buildable now on existing infra.

Companion to `e2e-audit-2026-06-24.md` (internal flow gaps) and
`pipeline-stage-spec.md` (stage entry/exit criteria). This doc adds the
**outside-in / competitive** lens.

---

## 1. "Step zero" — first-run, side by side

The single biggest differentiator is what happens the moment a user signs up.

| Product                | Step zero                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Jobber**             | Pick industry from 50+ → preloads services + quote/invoice templates. Then a **persistent, tailored onboarding checklist** with sequenced steps _and time estimates_: add client → set up services → invite crew → **schedule first job → send first quote**. Product coach offered. The checklist persists until first value is produced. |
| **Housecall Pro**      | Same guided-setup pattern + native marketing tools surfaced early (so step zero already hints at "get more customers").                                                                                                                                                                                                                    |
| **Yardbook**           | "Easiest to learn" — free, dead-simple, fast to first invoice. Android-only (2026).                                                                                                                                                                                                                                                        |
| **Service Autopilot**  | Onboarding built around **automations** — "configure once, it runs itself."                                                                                                                                                                                                                                                                |
| **LawnBizOps (today)** | `/login` → one-time form (business name, phone, two toggles: load starter services, add sample customer) → **lands on empty Today board with no next action**.                                                                                                                                                                             |

**Core difference:** leaders run a _persistent activation engine_ that doesn't
let go until you've sent a quote and scheduled a job. Ours is a one-shot form
that drops the user on an empty screen and goes quiet — at the exact moment
momentum matters. We already do the hard part (seed 8 services + a sample
client) but abandon the hand-off.

---

## 2. Where we stand

**Genuine strengths some leaders lack:**

- **True offline-first outbox** — field crews in dead zones. Jobber/HCP are
  online-first and stumble here. Real moat for trades.
- **Recurring mow → auto-materialized jobs → batch-invoice done jobs** — our
  back half (job → invoice → payment) is tighter than most.
- Tax/mileage, dispatch routing, inventory, reports already exist.

**Structural gaps every leader has and we don't:**

1. The **lead → quote → job middle** had a re-entry tax (largely closed
   2026-06-25: "Create estimate" CTA + context carry now exist).
2. **Customer-facing surfaces — none.** No online quote approval, no payment
   link, no booking/lead form, no review requests. This is the entire "Client
   Hub" category Jobber gates behind its $119/mo Connect plan.

---

## 3. Highest-ROI systems — filtered for "buildable now"

Scored on **impact × feasibility with existing infra** (outbox, Supabase edge
functions, PDF share, geocoder, Stripe seam already stubbed). "Fits now" = no
heavy new dependency.

### Tier 1 — do now (mostly frontend, compounds immediately)

1. **Persistent activation checklist** — replace the one-shot onboarding with a
   home-screen "getting started" card: _Send your first quote / Schedule your
   first job / Add your first client_, progress-tracked, dismissible. The literal
   step-zero gap. ~1 day, pure frontend.
2. **Context-carry funnel** — "Create estimate" CTA on client/lead detail +
   carry service/price/property into job/schedule + success→next-step sheet +
   global quick-create FAB. _(CTAs + carry largely landed 2026-06-25; remaining:
   success→next-step sheet, global FAB, default-lead-from-context.)_
3. **Automated Google review request** — one-tap `sms:`/`mailto` review link
   when a job is marked done. Free, trivial. ~half day.
4. **"On my way" + appointment reminder SMS** — native `sms:` deep link from
   job/schedule. Free now, upgradeable to real send. ~half day.

### Tier 2 — do next (light backend, grows revenue, still fits now)

5. **Online estimate approval link** — token-keyed public route, no login;
   customer taps Approve → status flips, activity logged. Heart of Jobber's
   Client Hub. Edge fn + public route. ~2–3 days.
6. **Public "Request a Quote" lead form** — public route → edge fn insert as a
   `lead`. The only feature that grows the funnel vs. streamlining. ~2–3 days.
7. **Stripe Payment Link on invoices** — "Pay now" button; Stripe seam already
   stubbed. Pay-per-use, no monthly cost. ~2 days.
8. **Real send for estimates/invoices** (Resend/Brevo free tier) — replaces the
   manual "mark sent" status flip with an actual delivered document. ~1–2 days.

### Tier 3 — strategic, heavier (not "right now")

9. **Recurring autopay / card-on-file** — the recurring-mow money engine
   (Service Autopilot's core). Do after #7.
10. **Instant property-measurement quoting** — Jobber lacks this natively (users
    bolt on Deep Lawn at $95–500/mo). Real differentiator, big build.
11. **Job costing / time-on-site** — `start_time` is free text today; real labor
    capture → profitability. LMN's strength.
12. **Online booking windows** — customer self-schedules. After #5/#6.
13. **Marketing/campaigns** (HCP-style) — lowest priority for solo/small ops.

---

## 4. Recommended sequence

Fix the inside, then open the outside:

1. **#2 context-carry funnel** — finish the remaining pieces (mostly done).
2. **#1 activation checklist** — guide new users through the now-flowing funnel.
3. **#3 + #4 review request + SMS** — free, half-day each, instant polish.
4. **#5 approval link → #6 lead form → #7 payment link** — the customer-facing
   half, in the order that compounds (approve → capture → collect).

~2–2.5 weeks of focused work to match the Client Hub feature set the
multimillion-dollar players charge $119/mo for — on infra we already have.

---

## Sources

- Jobber Client Hub — https://www.getjobber.com/features/client-hub/
- Jobber reviews / onboarding — https://www.getjobber.com/reviews/
- Best lawn care software (field-tested) — https://lawncrewpro.com/software/best-lawn-care-software/
- Landscape software deep comparison — https://gettinylawn.com/blog/landscape-business-software-comparison-jobber-aspire-lmn-singleops/
- Free Jobber alternatives — https://lawnbook.app/blog/jobber-alternatives-free-lawn-care
  </content>
  </invoke>
