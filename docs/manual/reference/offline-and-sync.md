# Reference — Offline & sync

The sync pill (every screen) · the outbox · `/settings/sync` · PWA install & updates.

## TL;DR

The app is offline-first: reads come from an on-device cache, and **every operator write goes into a queue (the outbox) that delivers itself** when connectivity allows. The thin top bar's pill tells you the system's whole state in one word. Document numbers are the notable exception — the server assigns them, so brand-new PDFs wait for sync.

## ELI5

The app keeps a copy of your filing cabinet in the truck and a mailbox for changes. You work off the truck copy all day; the mailbox delivers whenever it sees a signal tower. One little colored pill at the top tells you if any mail is still waiting.

## The sync pill

One pill, five states, priority-ordered (higher wins):

| Pill           | Meaning                               | Tap action                           |
| -------------- | ------------------------------------- | ------------------------------------ |
| **Update**     | New app version deployed              | Reload to update                     |
| **Sync issue** | An outbox operation failed terminally | Review sync issue → `/settings/sync` |
| **Offline**    | No connection; writes queueing        | — (facts popover)                    |
| **Syncing**    | Outbox flushing                       | —                                    |
| **Synced**     | All delivered, with freshness age     | —                                    |

The popover also shows build provenance (version, SHA, deploy time). The Today tab shows a dot badge while writes are pending. The pill is hidden on the two public customer pages.

## What queues vs what doesn't

**Queues (works offline):** job status changes, clients, properties, estimates, invoices, payments, expenses, tasks, schedule creates/edits/pauses, photos, **emails** (they sit in an email outbox and send server-side after sync).

**Needs connectivity:** Share PDF on unsynced documents ([G-09](../../ops-manual-findings-2026-07-31.md#g-09) — "Syncs first — number pending") · schedule **deletes** and all **business-settings saves** ([G-19](../../ops-manual-findings-2026-07-31.md#g-19)) · CSV export · the customer's own use of the public pages.

## How delivery works

- Flushes on app open, on regaining connection, and on returning to the app; **Sync now** on the Sync issues screen forces it.
- Operations deliver in order (FIFO) and are idempotent — a retry can't double-apply a payment or double-create a client.
- A poison operation (fails repeatedly) is quarantined to **Sync issues** with its error and attempt count: **Retry** or **Discard** (Discard permanently drops that change — redo the intent by hand after).
- Recurring-visit generation (materialization) runs once per session on app open, online — a device that never opens the app grows no future visits.

## PWA: install & updates

- **Install this app** card on More (browser only): install button or per-browser instructions; the installed app hides the card.
- Updates: the service worker checks every minute; new builds surface as the **Update** pill — reload when convenient.
- The app shell works offline; live data comes from the cache + outbox described above, never from stale service-worker copies.

## Used in SOPs

[SOP-13](../sops/sop-13-offline-field-protocol.md) (the operating procedure for everything here) · every other SOP inherits "saved = queued".

## Known gaps

[G-09](../../ops-manual-findings-2026-07-31.md#g-09) · [G-19](../../ops-manual-findings-2026-07-31.md#g-19)
