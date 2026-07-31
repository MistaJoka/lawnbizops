# SOP-06 — Rain-day recovery

| Trigger                                     | Frequency | Screens  | Time    |
| ------------------------------------------- | --------- | -------- | ------- |
| Weather (or anything) kills the working day | As needed | Schedule | ~10 min |

## TL;DR

Move the whole day to a new date in two taps with **Move all N to another day**, then text each affected client yourself — no automation announces the change. The one rule: **move the work before noon**, so the makeup day is planned while there's still daylight to plan with.

## ELI5

Rain check, literally. Sweep every sticky note from today onto a drier day in one motion, then tell each customer "see you Thursday instead" — because the app moves the notes but doesn't make the phone calls.

## Before you start

- [ ] Anything you already finished this morning is marked Done (done and in-progress jobs stay put — only untouched Scheduled jobs move).

## Steps

1. Open **Schedule** on today.
   > **You should see:** below the day's list, a **Move all N to another day** button (it appears when 2+ jobs are still movable).
2. Tap it, pick the makeup date — glance at that day's job-count dots first so you don't drown Thursday to save Tuesday — then tap **Move N**.
   > **Gap [G-16]:** dots are the only capacity signal; there's no overload warning. → [findings](../../ops-manual-findings-2026-07-31.md#g-16)
   > **You should see:** Schedule lands on the new date with the moved jobs listed.
3. Only one or two jobs affected? Skip the bulk button: open the job → **⋯ → Move to another day** (or **Skip (rain / no-show)** if it simply won't happen).
4. **Tell the clients.** For each moved job: open it → **Call** or text from the client card. Write the message once ("Rain today — moved you to Thu ~10am, reply if that's a problem") and paste it per client.
   > **Gap [G-02]/[G-23]:** no automated "your visit moved" message exists, and no template for it — this step is manual, and it's the difference between professional and flaky. → [findings](../../ops-manual-findings-2026-07-31.md#g-02)
5. Already-missed days (it rained yesterday and you never moved anything): Schedule shows a **Missed — needs a new day** section for still-Scheduled jobs whose date passed. Move or skip each — never leave that section populated.
6. Recurring visits you move this way are marked customized — the schedule's resync won't snap them back to the old cadence slot.

## Done when

- Today shows no remaining Scheduled jobs.
- Every moved client got a message.
- The makeup day isn't overloaded, and the Missed section is empty.

## What can go wrong

| Symptom                                    | Cause                       | Fix                                                                               |
| ------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------- |
| Bulk button absent                         | Fewer than 2 movable jobs   | Move the single job via its ⋯ menu                                                |
| A job didn't move with the rest            | It was In-progress or Done  | Correct its status first if that's wrong, then move it individually               |
| Client shows up angry on the original day… | …because step 4 got skipped | The app will never send this for you — make notification part of the move, always |

## Related

[SOP-04](sop-04-scheduling.md) · [SOP-05](sop-05-day-of-operations.md) · [reference/schedule.md](../reference/schedule.md)
