# SOP-13 — Offline field protocol

| Trigger                                                  | Frequency | Screens                        | Time   |
| -------------------------------------------------------- | --------- | ------------------------------ | ------ |
| Signal drops, or the sync pill shows anything but Synced | As needed | Everywhere; More → Sync issues | ~2 min |

## TL;DR

Keep working. Every operator action queues in an on-device outbox and sends itself when signal returns — **"saved" means queued, not synced.** Know the short list of things that genuinely need connectivity, and end every day with the top sync pill reading **Synced**. The one rule: **never Discard a failed change unless you're prepared to redo it by hand — Discard deletes the work.**

## ELI5

The app has a mailbox at the end of your driveway. Everything you do goes in as a letter; when the mail truck (signal) comes by, the letters get delivered. So dead zones don't stop you — but a letter in the box isn't delivered yet, and a couple of errands (like getting an official invoice number) need the truck to actually arrive.

## Steps

### Reading the pill (top of every screen)

1. The thin top bar shows one status pill, in priority order: **Update → Sync issue → Offline → Syncing → Synced**, with a freshness age. Tap it for details and the one action that matters (reload for updates, review for sync issues).

### Working offline

2. Carry on: Start/Done on jobs, new clients, expenses, payments — all queue. The Today tab shows a dot badge while writes are pending.
3. Know the four real limits:
   - **Share PDF** on a brand-new invoice/estimate is disabled ("Syncs first — number pending") — numbers are server-assigned.
     > **Gap [G-09]:** use **Email invoice / Email estimate** instead — email queues in the outbox and sends itself after sync. → [findings](../../ops-manual-findings-2026-07-31.md#g-09)
   - **Deleting a recurring schedule** and **saving any Settings screen** fail offline with a toast.
     > **Gap [G-19]:** Pause the schedule instead (pause queues); save settings on wifi. → [findings](../../ops-manual-findings-2026-07-31.md#g-19)
   - **CSV export** (More → Export data) is disabled offline.
   - The **public customer pages** (quote form, approval page) are the customer's problem, not yours — they need their own connection.

### Coming back online

4. Sync happens by itself when the app opens, regains focus, or the connection returns. To force it: **More → Sync issues → Sync now**.
5. End of day: the pill reads **Synced** and the Today tab badge is gone. That's the whole checklist.

### When the pill says "Sync issue"

6. Tap it → **Review sync issue** (More → Sync issues).
   > **You should see:** the failed operation with its error text and attempt count, and two buttons: **Retry** and **Discard**.
7. **Retry** first — most failures are transient. If it fails repeatedly, read the error: it usually names the conflict.
8. **Discard** only as a last resort — it throws the change away permanently. Immediately redo the intent by hand (e.g. re-mark the job Done) so reality and app agree again.

## Done when

- Pill: **Synced**. Outbox badge: gone. Sync issues screen: empty.

## What can go wrong

| Symptom                                      | Cause                                                | Fix                                                                           |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| "Saved" but the other device doesn't show it | Saved = queued on THIS device                        | Get this device online; data syncs through the server, not phone-to-phone     |
| PDF needed at the curb, no signal            | [G-09](../../ops-manual-findings-2026-07-31.md#g-09) | Email it (queues), or ten seconds of signal fetches the number                |
| Same op fails 5+ times                       | A real conflict, not weather                         | Read the error; fix the underlying record; worst case Discard + redo manually |
| Pill shows **Update**                        | New app version deployed                             | Tap → reload when convenient; don't ignore it for days                        |

## Related

[SOP-05](sop-05-day-of-operations.md) · [reference/offline-and-sync.md](../reference/offline-and-sync.md) · [reference/settings.md](../reference/settings.md)
