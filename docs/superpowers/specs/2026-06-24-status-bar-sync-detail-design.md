# Status Bar: Sync Freshness & Tap-to-Expand Detail

**Date:** 2026-06-24
**Status:** Approved design, ready for implementation plan

## Goal

Enrich the top status strip ([`DevStripe.tsx`](../../../src/components/DevStripe.tsx))
while keeping it a **pure system-status strip** — no business/operational data.
Two additions:

1. **Last-sync time** — surface *how stale* the local data is, especially when
   offline. Today the bar shows sync *state* ("Synced") but never *when*.
2. **Tap-to-expand detail** — a popover with the underlying sync facts (last
   sync, pending, failed, oldest queued), so the strip stays thin but gains
   depth on demand.

Explicitly out of scope: connection quality (2g/3g/4g), trial/billing status,
job/task counts, or any other operational data.

## Current State

- [`src/components/DevStripe.tsx`](../../../src/components/DevStripe.tsx) — the
  strip. Left: build provenance (`v… · sha · stamp`). Right: a single-priority
  status pill rendered three ways — `button` (update), `Link` (error), or
  `span` (everything else).
- [`src/lib/statusBar.ts`](../../../src/lib/statusBar.ts) — pure `statusView()`
  mapping `{updateReady, online, status, pending}` → a `StatusView`
  (kind/label/dot/text/count/tappable). Unit-tested in `statusBar.test.ts`.
- [`src/lib/outbox.ts`](../../../src/lib/outbox.ts) — `useSyncStatus()`,
  `useOutboxPending()`; failed-op count is queried internally but not exposed.
  Has a sync-success path where the queue finishes draining.
- [`src/lib/pwaUpdate.ts`](../../../src/lib/pwaUpdate.ts) — reactive
  external-store pattern (`markUpdateReady()` + `useUpdateReady()`) we mirror
  for the sync clock.

## Design

### 1. Persisted sync clock — new `src/lib/syncClock.ts`

A tiny reactive external store mirroring `pwaUpdate.ts`:

- `markSynced()` — writes `Date.now()` to `localStorage` and notifies
  subscribers.
- `useLastSyncedAt(): number | null` — subscribes; hydrates from `localStorage`
  on load so the value survives reload and is available while offline.

Use `localStorage` (not Dexie) so the read is synchronous and the bar never
flickers an empty value on mount.

Hook `markSynced()` into the existing sync-success path in `outbox.ts` (where
the queue finishes draining with no remaining/failed work).

### 2. Relative-time formatting — `src/lib/format.ts`

Add `shortAgo(ts: number, now?: number): string`:

- `< 60s` → `"now"`
- minutes → `"2m"`, `"8m"`
- hours → `"1h"`, `"3h"`
- older → fall back to an absolute short date (reuse the existing `shortStamp`
  style)

Lives in `format.ts` per the "format only at the edge" rule. `now` param is
injectable for deterministic tests.

### 3. Pill age suffix

In the right-side pill:

- `Synced` → `Synced · 2m` when `lastSyncedAt` is known.
- `Offline` (no backlog) → `Offline · 8m` — the key offline-staleness signal.
- `Saved · N` and `Syncing · N` keep their **pending count** on the pill; age
  for these lives in the popover (avoids crowding the pill with two
  dot-separated numbers). `Saved` keeps the count because unsaved-work count is
  the actionable bit when offline.

The strip runs a **30s tick interval** so `2m` → `3m` updates without an event.

### 4. Tap-to-expand detail popover — `DevStripe.tsx`

The pill becomes a single consistent **toggle button** (`aria-expanded`) that
opens a popover dropping below it, right-aligned, layered above page content
(bar is `z-50`; popover sits above). This unifies today's three render paths
(button/Link/span) into one predictable interaction.

Behavior / a11y:

- Click-outside and `Escape` close it.
- Focus moves into the popover on open and returns to the pill on close.
- Preserve existing `aria-label`s / keep the axe + WCAG 2.2 target-size work
  intact (glove-friendly tap target).

Popover rows (each rendered only when it has a value):

| Row | Value | Shown when |
|-----|-------|-----------|
| State | full label (`Synced` / `Syncing` / `Offline` / `Sync issue`) | always |
| Last sync | `shortAgo(lastSyncedAt)`; `Never` if no record | always |
| Pending | `N` queued writes | `pending > 0` |
| Failed | `N` | `failed > 0` |
| Oldest queued | age of oldest pending write | `pending > 0` **and** timestamp available |
| Action | `Reload to update` / `Review sync issue →` (`/settings/sync`) | update-ready / error |

The update + error actions move **into** the popover, so those states reach
their action in two taps. Acceptable since neither reload nor sync-review is
time-critical.

### 5. Outbox stats — `outbox.ts`

Two Dexie live-query hooks alongside `useOutboxPending()`:

- `useOutboxFailed(): number` — count of `status='failed'` rows (already queried
  internally; expose it).
- `useOldestPending(): number | null` — min enqueue timestamp among pending
  rows. **Confirm during implementation** that an outbox row carries a usable
  created/queued timestamp. If it does not, **skip this single row** rather than
  add a column — do not migrate schema for a cosmetic detail.

### 6. Pure, testable logic — `statusBar.ts`

- `statusView()` gains the age suffix logic (or accepts a pre-formatted age
  string; decide in the plan — keep the pure function free of `Date.now()`).
- New pure `statusDetail({...})` builds the ordered popover rows from
  `{state, lastSyncedAt, pending, failed, oldest, updateReady, now}`.

Tests:

- Extend `statusBar.test.ts` for the age suffix + `statusDetail` rows
  (visibility rules, ordering, `Never` case).
- Add `format.test.ts` (or extend existing) for `shortAgo` boundaries
  (`now`/`m`/`h`/absolute), injecting `now`.

Follow the existing convention: test the pure functions, not the JSX.

## Components & Boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `syncClock.ts` | persist + broadcast `lastSyncedAt` | `localStorage`, outbox success path |
| `format.shortAgo` | format a timestamp as a short relative string | none (pure) |
| `statusBar.statusView` | compact pill view (now incl. age suffix) | pure inputs |
| `statusBar.statusDetail` | ordered popover rows | pure inputs |
| `outbox` hooks | expose failed count + oldest pending | Dexie live queries |
| `DevStripe` | render strip + popover, tick interval, focus mgmt | all of the above |

## Risks / Open Items

- **Oldest-queued timestamp** may not exist on outbox rows — gracefully skip
  that row if so (§5). The only item to verify against real schema.
- Popover focus management must not regress the existing accessibility tests —
  re-run the axe scan after.

## Verification

Per CLAUDE.md: `npx prettier --write . && npm run lint && npm test &&
npm run build`. Plus a manual preview check of the popover open/close + offline
staleness label.
