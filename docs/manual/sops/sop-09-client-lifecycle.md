# SOP-09 — Client lifecycle

| Trigger                                  | Frequency | Screens                 | Time          |
| ---------------------------------------- | --------- | ----------------------- | ------------- |
| Monthly hygiene pass + as clients evolve | Monthly   | Pipeline, Client detail | ~30 min/month |

## TL;DR

Clients move Lead → Quoted → Active → Dormant, and the app only automates two of those hops (sending a quote → Quoted; first payment → Active). Once a month, walk the Pipeline board column by column and make the stages true: chase stale leads, demote lapsed actives to Dormant with a win-back task, merge duplicates, archive the dead. The one rule: **the Pipeline board is your sales report — a stage that's wrong is a report that lies.**

## ELI5

Four buckets: "might hire me", "saw my price", "pays me", "used to pay me". Fish drift between buckets on their own, but the labels don't update themselves — so once a month you re-label every fish. The reward: one glance at the board tells you if next month's dinner is caught.

## Before you start

- [ ] Understand the only two auto-moves: estimate sent → **Quoted**; payment recorded → **Active**. Everything else — including winning the work — is your finger ([G-07](../../ops-manual-findings-2026-07-31.md#g-07), [G-11](../../ops-manual-findings-2026-07-31.md#g-11)).

## Steps

1. Open **More → Pipeline** — four columns, one per stage, each card with balance, Call/Text, a stage-aware CTA (**Quote** / **Schedule**), and **Advance →**.
   > **Gap [G-17]:** looking for one specific person instead? Start at **Clients** — its search matches name, email, or phone digits; there's no global search. → [findings](../../ops-manual-findings-2026-07-31.md#g-17)
2. **Lead column:** anyone sitting 2+ weeks — call or text now, or admit it and archive. Their page's readiness chips ("Needs: Contact / Property / Estimate") say exactly what's blocking a quote; each chip deep-links to the fix.
3. **Quoted column:** cross-check with Money → Estimates' **Awaiting response** card. Follow up the quiet ones; **Renew** the expired ones worth another shot; mark the dead ones **Declined** with an honest reason.
4. **Active column:** anyone with **no future work booked and no recent activity** gets moved to **Dormant** — tap the stage on their page or **Advance →** (a soft "Move anyway" confirm may appear; that's fine, you know why). As you demote, add a **follow-up task** on their page ("Win-back text — spring cleanup offer") with a due date.
   > **Gap [G-11]:** nothing detects lapse for you; this walk IS the detection. → [findings](../../ops-manual-findings-2026-07-31.md#g-11)
   > **Gap [G-08]:** the task's due date only surfaces in Today's Follow-ups list — set due dates for weekdays you'll actually see them. → [findings](../../ops-manual-findings-2026-07-31.md#g-08)
5. **Dormant column:** work the win-back tasks — a personal text beats a blast ([G-02](../../ops-manual-findings-2026-07-31.md#g-02): there is no blast). When one bites, schedule the work (SOP-04) and move them back to **Active** yourself ([G-07](../../ops-manual-findings-2026-07-31.md#g-07)).
6. **Merge duplicates** as you spot them: on the duplicate's page → **Merge duplicate…** → pick the keeper → confirm. Properties, quotes, invoices, and history all move; the duplicate is archived. This is destructive-confirm territory — read the sheet before tapping.
7. **Archive the truly dead:** client page → **Archive client**. **First pause or delete their recurring schedules** — don't leave a stamp printing sticky notes for someone you archived (SOP-04 steps 9–10).
8. **Notes discipline:** every meaningful call or agreement becomes a note on the client's timeline — it's the only place history lives.
   > **Gap [G-24]:** you can't write a note from a job or invoice screen; navigate to the client. → [findings](../../ops-manual-findings-2026-07-31.md#g-24)

## Done when

- Every card's column matches reality; no Lead older than 2 weeks untouched; every Dormant has a win-back task; zero known duplicates; archived clients have no live schedules.

## What can go wrong

| Symptom                                 | Cause                                                                               | Fix                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| "Move anyway" confirm on advance        | Stage's usual evidence missing (no estimate / no job)                               | It's a soft gate — proceed only if you know better than the data                     |
| Merged the wrong direction              | Merge keeps the _other_ client                                                      | Everything moved, nothing deleted — merge again in the right direction and fix names |
| Win-back tasks never resurface          | Due dates only show on Today ([G-08](../../ops-manual-findings-2026-07-31.md#g-08)) | Due-date them for workdays; clear Follow-ups every morning (SOP-05)                  |
| Archived client's visits keep appearing | Schedules outlive the archive                                                       | Pause/delete their schedules (step 7)                                                |

## Related

[SOP-01](sop-01-lead-intake.md) · [SOP-03](sop-03-winning-the-work.md) · [SOP-11](sop-11-weekly-review.md) · [reference/clients.md](../reference/clients.md)
