# Status Bar: Sync Freshness & Tap-to-Expand Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the top status strip ([`DevStripe.tsx`](../../../src/components/DevStripe.tsx)) more informative and interactive — show how stale the local data is (last-sync age) and let the user tap the pill to expand a small popover of sync facts.

**Architecture:** A new persisted reactive clock (`syncClock.ts`) records the moment the outbox drains, mirroring the existing `pwaUpdate.ts` external-store pattern. A pure `shortAgo` formatter (`format.ts`) and a pure `statusDetail` row-builder (`statusBar.ts`) keep all logic unit-testable. The component wires these plus two new outbox live-query hooks into an always-interactive toggle pill that opens an accessible detail popover.

**Tech Stack:** React 19 (`useSyncExternalStore`), TanStack Router, Dexie + `dexie-react-hooks` (`useLiveQuery`), Tailwind v4 (dark tactical theme), Vitest, Playwright + axe.

## Global Constraints

- **Format only at the edge** — relative-time formatting lives in `src/lib/format.ts`; pure mapping functions stay free of `Date.now()` (inject `now`).
- **Theme tokens only** — `bg-panel`, `bg-canvas`, `border-edge`, `text-sand`, `text-faded`, `text-khaki`, `bg-blaze` + `text-on-cta` (primary CTA), `text-alert`, `bg-go`/`bg-faded` (dots). No invented classes. Press feedback: `tap-active`.
- **WCAG 2.2 target-size is a blocking gate.** `e2e/demo/a11y.spec.ts` enables the `target-size` rule at critical/serious across every authed route. The pill becomes always-interactive, so its toggle button MUST be ≥24×24 CSS px (`min-h-[1.5rem]`). The demo a11y spec must stay green.
- **No new writes** — this feature only reads outbox/network state; nothing goes through `enqueue()`.
- **Verify before done:** `npx prettier --write . && npm run lint && npm test && npm run build`, plus the demo a11y spec for the component task.

---

## File Structure

- **Create** `src/lib/syncClock.ts` — persisted reactive "last synced at" store (`markSynced`, `lastSyncedAt`, `useLastSyncedAt`).
- **Create** `src/lib/syncClock.test.ts` — store unit tests.
- **Modify** `src/lib/format.ts` — add `shortAgo`.
- **Modify** `src/lib/format.test.ts` — add `shortAgo` tests.
- **Modify** `src/lib/statusBar.ts` — add `showAge` to `StatusView`; add `DetailRow` + `statusDetail`.
- **Modify** `src/lib/statusBar.test.ts` — cover `showAge` + `statusDetail`.
- **Modify** `src/lib/outbox.ts` — call `markSynced()` on the `syncing→idle` edge; add `useOutboxFailed` + `useOldestPending`.
- **Modify** `src/lib/outbox.test.ts` — cover the `markSynced` wiring.
- **Modify** `src/components/DevStripe.tsx` — age suffix on the pill + tap-to-expand popover + 30s tick.

---

## Task 1: `shortAgo` relative-time formatter

**Files:**

- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**

- Produces: `shortAgo(ts: number, now?: number): string` — `"now"` | `"5m"` | `"3h"` | absolute short date (`"Jun 21"`). `now` defaults to `Date.now()`, injectable for tests.

- [ ] **Step 1: Write the failing tests** — append to `src/lib/format.test.ts`:

```ts
import { formatCents, parseDollarsToCents, shortAgo } from './format'

describe('shortAgo', () => {
  const now = Date.UTC(2026, 5, 24, 12, 0, 0) // fixed reference

  it('reads "now" under a minute', () => {
    expect(shortAgo(now - 30_000, now)).toBe('now')
  })
  it('clamps future/skewed timestamps to "now"', () => {
    expect(shortAgo(now + 5_000, now)).toBe('now')
  })
  it('shows whole minutes under an hour', () => {
    expect(shortAgo(now - 2 * 60_000, now)).toBe('2m')
    expect(shortAgo(now - 59 * 60_000, now)).toBe('59m')
  })
  it('shows whole hours under a day', () => {
    expect(shortAgo(now - 3 * 3_600_000, now)).toBe('3h')
  })
  it('falls back to an absolute short date past a day', () => {
    // 2 days earlier → "Jun 22" in the local timezone of the test runner.
    const out = shortAgo(now - 2 * 86_400_000, now)
    expect(out).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })
})
```

> Note: replace the existing `import { formatCents, parseDollarsToCents } from './format'` line at the top of the file with the combined import above (do not add a duplicate import).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `shortAgo is not a function` / not exported.

- [ ] **Step 3: Implement `shortAgo`** — append to `src/lib/format.ts`:

```ts
/**
 * Short relative age for the status bar: "now" | "5m" | "3h", falling back to an
 * absolute short date ("Jun 21") past a day. `now` is injectable so callers can
 * drive it off a ticking clock and tests stay deterministic. Future/skewed
 * timestamps clamp to "now".
 */
export function shortAgo(ts: number, now: number = Date.now()): string {
  const diff = now - ts
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (all `shortAgo` + existing cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat(format): add shortAgo relative-time formatter"
```

---

## Task 2: Persisted sync clock store

**Files:**

- Create: `src/lib/syncClock.ts`
- Test: `src/lib/syncClock.test.ts`

**Interfaces:**

- Produces:
  - `markSynced(now?: number): void` — record a successful sync (epoch ms; defaults to `Date.now()`); persists to `localStorage` and notifies subscribers.
  - `lastSyncedAt(): number | null` — current value (in-memory source of truth, hydrated from `localStorage` at module load).
  - `useLastSyncedAt(): number | null` — React subscription.

- [ ] **Step 1: Write the failing tests** — create `src/lib/syncClock.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { lastSyncedAt, markSynced } from './syncClock'

describe('syncClock store', () => {
  it('starts null until a sync is recorded', () => {
    expect(lastSyncedAt()).toBeNull()
  })

  it('markSynced stores the supplied timestamp', () => {
    markSynced(1_700_000_000_000)
    expect(lastSyncedAt()).toBe(1_700_000_000_000)
  })

  it('markSynced without an arg records a current-ish epoch ms', () => {
    const before = Date.now()
    markSynced()
    expect(lastSyncedAt()).toBeGreaterThanOrEqual(before)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/syncClock.test.ts`
Expected: FAIL — cannot resolve `./syncClock`.

- [ ] **Step 3: Implement the store** — create `src/lib/syncClock.ts`:

```ts
import { useSyncExternalStore } from 'react'

// Persisted "last time the outbox finished pushing to the server". Mirrors the
// pwaUpdate store: an in-memory value (what getSnapshot reads) hydrated from and
// written through to localStorage, so it survives reloads and is readable while
// offline. Updated from outbox.setSyncStatus on the syncing→idle edge — the
// moment a real flush empties the queue. In-memory is the source of truth so the
// store works even where localStorage is unavailable (private mode / node tests).

const KEY = 'lawnbizops:lastSyncedAt'

function hydrate(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

let current: number | null = hydrate()
const listeners = new Set<() => void>()

/** Record a successful sync at `now` (epoch ms). */
export function markSynced(now: number = Date.now()): void {
  current = now
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    // private browsing / storage disabled — degrade to in-memory only
  }
  for (const l of listeners) l()
}

/** Epoch ms of the last successful sync, or null if never. */
export function lastSyncedAt(): number | null {
  return current
}

export function useLastSyncedAt(): number | null {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    lastSyncedAt,
    () => null,
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/syncClock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/syncClock.ts src/lib/syncClock.test.ts
git commit -m "feat(sync): persisted reactive last-synced-at clock"
```

---

## Task 3: `showAge` + `statusDetail` in the pure status mapper

**Files:**

- Modify: `src/lib/statusBar.ts`
- Test: `src/lib/statusBar.test.ts`

**Interfaces:**

- Consumes: `shortAgo` (Task 1), `StatusView` (existing).
- Produces:
  - `StatusView.showAge: boolean` — whether the pill appends a `"· <age>"` staleness suffix (true only for `synced` and backlog-free `offline`).
  - `DetailRow { label: string; value: string }`
  - `statusDetail(s: StatusDetailInput): DetailRow[]` where `StatusDetailInput = { view: StatusView; lastSyncedAt: number | null; pending: number; failed: number; oldest: number | null; now: number }` — ordered text rows for the popover (no action row; the component renders that).

- [ ] **Step 1: Write the failing tests** — append to `src/lib/statusBar.test.ts`:

```ts
import { statusDetail, statusView } from './statusBar'

describe('statusView — showAge suffix flag', () => {
  it('shows age only for a settled synced state', () => {
    expect(at().showAge).toBe(true)
  })
  it('shows age for offline with no backlog', () => {
    expect(at({ online: false, status: 'idle', pending: 0 }).showAge).toBe(true)
  })
  it('hides age when a count is already shown (offline backlog / syncing)', () => {
    expect(at({ online: false, status: 'offline', pending: 3 }).showAge).toBe(false)
    expect(at({ status: 'syncing', pending: 2 }).showAge).toBe(false)
  })
  it('hides age for update and error states', () => {
    expect(at({ updateReady: true }).showAge).toBe(false)
    expect(at({ status: 'error' }).showAge).toBe(false)
  })
})

describe('statusDetail — popover rows', () => {
  const base = {
    view: statusView({ updateReady: false, online: true, status: 'idle', pending: 0 }),
    lastSyncedAt: null as number | null,
    pending: 0,
    failed: 0,
    oldest: null as number | null,
    now: Date.UTC(2026, 5, 24, 12, 0, 0),
  }

  it('always shows State and Last sync (Never when no record)', () => {
    const rows = statusDetail(base)
    expect(rows.map((r) => r.label)).toEqual(['State', 'Last sync'])
    expect(rows[0].value).toBe('Synced')
    expect(rows[1].value).toBe('Never')
  })

  it('formats Last sync as a relative age when known', () => {
    const rows = statusDetail({ ...base, lastSyncedAt: base.now - 2 * 60_000 })
    expect(rows.find((r) => r.label === 'Last sync')!.value).toBe('2m')
  })

  it('adds Pending and Oldest queued only when there is a backlog', () => {
    const rows = statusDetail({
      ...base,
      pending: 3,
      oldest: base.now - 5 * 60_000,
    })
    const labels = rows.map((r) => r.label)
    expect(labels).toContain('Pending')
    expect(labels).toContain('Oldest queued')
    expect(rows.find((r) => r.label === 'Pending')!.value).toBe('3')
    expect(rows.find((r) => r.label === 'Oldest queued')!.value).toBe('5m')
  })

  it('adds Failed only when there are failed ops', () => {
    expect(statusDetail(base).some((r) => r.label === 'Failed')).toBe(false)
    expect(statusDetail({ ...base, failed: 2 }).some((r) => r.label === 'Failed')).toBe(
      true,
    )
  })

  it('omits Oldest queued when the backlog has no timestamp', () => {
    const rows = statusDetail({ ...base, pending: 1, oldest: null })
    expect(rows.some((r) => r.label === 'Oldest queued')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/statusBar.test.ts`
Expected: FAIL — `showAge` undefined on `StatusView`; `statusDetail` not exported.

- [ ] **Step 3: Add `showAge` to the type and every branch** — in `src/lib/statusBar.ts`, add the field to the interface:

```ts
export interface StatusView {
  kind: StatusKind
  label: string
  /** Tailwind bg class(es) for the dot. */
  dot: string
  /** Tailwind text colour for the label. */
  text: string
  /** Unsynced count to show, or null. */
  count: number | null
  /** Whether tapping it does something (apply update / go to sync recovery). */
  tappable: boolean
  /** Whether the pill appends a "· <age>" staleness suffix after the label. */
  showAge: boolean
}
```

Then set `showAge` on each returned object in `statusView`:

- `update` branch → `showAge: false`
- `error` branch → `showAge: false`
- `offline` branch → `showAge: s.pending === 0` (only the bare "Offline", not "Saved · N")
- `syncing` branch → `showAge: false`
- final `synced` return → `showAge: true`

- [ ] **Step 4: Add `statusDetail`** — append to `src/lib/statusBar.ts`, and add the format import at the top (`import { shortAgo } from './format'`):

```ts
export interface DetailRow {
  label: string
  value: string
}

export interface StatusDetailInput {
  view: StatusView
  lastSyncedAt: number | null
  pending: number
  failed: number
  /** Epoch ms of the oldest pending op, or null. */
  oldest: number | null
  /** Injected clock so this stays pure and testable. */
  now: number
}

/**
 * Ordered text rows for the tap-to-expand sync popover. State + Last sync are
 * always present; backlog/failure rows appear only when they carry a value. The
 * action control (Reload / Review) is rendered by the component, not here.
 */
export function statusDetail(s: StatusDetailInput): DetailRow[] {
  const rows: DetailRow[] = [
    { label: 'State', value: s.view.label },
    {
      label: 'Last sync',
      value: s.lastSyncedAt == null ? 'Never' : shortAgo(s.lastSyncedAt, s.now),
    },
  ]
  if (s.pending > 0) rows.push({ label: 'Pending', value: String(s.pending) })
  if (s.failed > 0) rows.push({ label: 'Failed', value: String(s.failed) })
  if (s.pending > 0 && s.oldest != null) {
    rows.push({ label: 'Oldest queued', value: shortAgo(s.oldest, s.now) })
  }
  return rows
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/statusBar.test.ts`
Expected: PASS (new + existing precedence tests green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/statusBar.ts src/lib/statusBar.test.ts
git commit -m "feat(status-bar): showAge flag + statusDetail popover rows"
```

---

## Task 4: Wire `markSynced` into the outbox + expose stats hooks

**Files:**

- Modify: `src/lib/outbox.ts`
- Test: `src/lib/outbox.test.ts`

**Interfaces:**

- Consumes: `markSynced` (Task 2).
- Produces:
  - `useOutboxFailed(): number` — live count of `status='failed'` ops.
  - `useOldestPending(): number | null` — epoch ms of the oldest pending op (FIFO = lowest seq), or null.
- Behaviour: a flush that drains the queue (`syncing → idle`) records a sync time.

- [ ] **Step 1: Write the failing test** — append a `describe` block to `src/lib/outbox.test.ts`. Add `import { lastSyncedAt } from './syncClock'` near the other imports:

```ts
describe('outbox → sync clock', () => {
  it('records a sync time when a flush drains the queue', async () => {
    const before = Date.now()
    await enqueue({ table: 'clients', kind: 'upsert', payload: { id: 'c1' } })
    goOnline()
    await flush()
    expect(await db.outbox.count()).toBe(0)
    expect(lastSyncedAt()).toBeGreaterThanOrEqual(before)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/outbox.test.ts -t "records a sync time"`
Expected: FAIL — `lastSyncedAt()` is null (wiring not in place).

- [ ] **Step 3: Call `markSynced` on the drained edge** — in `src/lib/outbox.ts`, add the import at the top (`import { markSynced } from './syncClock'`) and update `setSyncStatus`:

```ts
function setSyncStatus(next: SyncStatus) {
  if (next === syncStatus) return
  const prev = syncStatus
  syncStatus = next
  // Edge "we just emptied the queue" → stamp the sync clock + one reassuring
  // toast (not one per op).
  if (next === 'idle' && prev === 'syncing') {
    markSynced()
    toast.success('All changes synced')
  }
  for (const l of syncListeners) l()
}
```

- [ ] **Step 4: Add the stats hooks** — append next to `useOutboxPending` in `src/lib/outbox.ts`:

```ts
/** Live count of failed (poison) ops parked for the Sync issues screen. */
export function useOutboxFailed(): number {
  return useLiveQuery(() => db.outbox.where('status').equals('failed').count(), [], 0)
}

/**
 * Epoch ms of the oldest pending op, or null. Pending ops share the `status`
 * index value, so Dexie orders them by primary key — `.first()` is the lowest
 * seq, i.e. the oldest enqueued (FIFO).
 */
export function useOldestPending(): number | null {
  return useLiveQuery(
    () =>
      db.outbox
        .where('status')
        .equals('pending')
        .first()
        .then((op) => (op ? Date.parse(op.createdAt) : null)),
    [],
    null,
  )
}
```

- [ ] **Step 5: Run the outbox tests to verify they pass**

Run: `npx vitest run src/lib/outbox.test.ts`
Expected: PASS — the new sync-clock test plus all existing outbox tests stay green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/outbox.ts src/lib/outbox.test.ts
git commit -m "feat(outbox): stamp sync clock on drain + expose failed/oldest hooks"
```

---

## Task 5: Age suffix + tap-to-expand popover in `DevStripe`

**Files:**

- Modify: `src/components/DevStripe.tsx`
- Verify (must stay green): `e2e/demo/a11y.spec.ts`

**Interfaces:**

- Consumes: `useLastSyncedAt` (Task 2), `shortAgo` (Task 1), `statusView`/`statusDetail`/`StatusView` (Task 3), `useOutboxFailed`/`useOldestPending`/`useOutboxPending`/`useSyncStatus` (Task 4 + existing), `useUpdateReady`/`applyUpdate` (existing).

- [ ] **Step 1: Replace the file** — overwrite `src/components/DevStripe.tsx` with:

```tsx
// Thin always-on top bar pinned above every screen. Two jobs in one line:
//  • left  — build provenance (version · sha · time) so you can confirm which
//    cached PWA build is actually live on the device after a deploy.
//  • right — live status, kept current from the outbox + the network: a
//    connection dot, the save/sync state, a freshness age, and a tap-to-expand
//    detail popover (pending / failed / oldest queued + the contextual action).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import buildInfo from 'virtual:build-info'
import {
  useOldestPending,
  useOutboxFailed,
  useOutboxPending,
  useSyncStatus,
} from '@/lib/outbox'
import { applyUpdate, useUpdateReady } from '@/lib/pwaUpdate'
import { useLastSyncedAt } from '@/lib/syncClock'
import { shortAgo } from '@/lib/format'
import { statusDetail, statusView, type StatusView } from '@/lib/statusBar'

const { version, sha, dirty, committedAt } = buildInfo

// "Jun 21 14:32" in the device's locale/timezone — committedAt is an ISO string.
function shortStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Reactive navigator.onLine — flips the instant the radio drops or returns.
function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

// A coarse ticking clock so relative ages ("2m" → "3m") advance without an
// event. 30s is fine for minute-granularity text.
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function DevStripe() {
  return (
    <div className="sticky top-0 z-50 border-b border-edge bg-panel">
      <div className="font-mono mx-auto flex max-w-md items-center justify-between gap-2 px-3 py-1 text-[10px] leading-none">
        <p className="flex min-w-0 gap-1.5 overflow-hidden whitespace-nowrap text-faded">
          <span className="text-sand">
            v{version}
            {dirty && <span className="text-alert">✱</span>}
          </span>
          <span aria-hidden>·</span>
          <span>{sha}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{shortStamp(committedAt)}</span>
        </p>
        <SyncStat />
      </div>
    </div>
  )
}

// One compact, tappable cluster. The label/dot reflect connection + save state
// in priority order (Update → Sync issue → Offline → Syncing → Synced); settled
// states also show a freshness age. Tapping opens a detail popover.
function SyncStat() {
  const online = useOnline()
  const status = useSyncStatus()
  const pending = useOutboxPending()
  const failed = useOutboxFailed()
  const oldest = useOldestPending()
  const updateReady = useUpdateReady()
  const lastSyncedAt = useLastSyncedAt()
  const now = useNow(30_000)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const v = statusView({ updateReady, online, status, pending })
  const rows = statusDetail({ view: v, lastSyncedAt, pending, failed, oldest, now })

  // While open: focus into the popover, close on Escape (returning focus to the
  // pill) or on a press outside the wrapper (pill + popover share the wrapper, so
  // pressing the pill toggles rather than double-firing close→reopen).
  useEffect(() => {
    if (!open) return
    const panel = wrapRef.current?.querySelector<HTMLElement>('[role="dialog"]')
    ;(panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    function onPointer(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  const age =
    v.showAge && lastSyncedAt != null ? ` · ${shortAgo(lastSyncedAt, now)}` : null

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Sync status — details"
        className={`tap-active flex min-h-[1.5rem] shrink-0 items-center gap-1.5 ${v.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
        {v.label}
        {v.count != null && <span className="text-faded">· {v.count}</span>}
        {age && <span className="text-faded">{age}</span>}
      </button>
      {open && <DetailPanel rows={rows} view={v} onAct={() => setOpen(false)} />}
    </div>
  )
}

// Small dropdown of sync facts + the one contextual action for the current
// state. Closed by default; only mounts while open, so it never affects the
// settled-state a11y scan.
function DetailPanel({
  rows,
  view,
  onAct,
}: {
  rows: { label: string; value: string }[]
  view: StatusView
  onAct: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="Sync details"
      tabIndex={-1}
      className="absolute right-0 top-full z-[60] mt-1 w-44 rounded border border-edge bg-panel p-2 text-[10px] shadow-lg"
    >
      <dl className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <dt className="text-faded">{r.label}</dt>
            <dd className="text-sand">{r.value}</dd>
          </div>
        ))}
      </dl>
      {view.kind === 'update' && (
        <button
          type="button"
          data-autofocus
          onClick={() => {
            onAct()
            applyUpdate()
          }}
          className="tap-active mt-2 flex min-h-[1.5rem] w-full items-center justify-center rounded bg-blaze text-on-cta"
        >
          Reload to update
        </button>
      )}
      {view.kind === 'error' && (
        <Link
          to="/settings/sync"
          data-autofocus
          onClick={onAct}
          className="tap-active mt-2 flex min-h-[1.5rem] items-center text-alert"
        >
          Review sync issue →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Lint + build**

Run: `npx prettier --write src/components/DevStripe.tsx && npm run lint && npm run build`
Expected: clean (no type/lint errors).

- [ ] **Step 3: Verify the age suffix live** — ensure the demo server is running (`preview_start "demo"` if needed), then drive a drain so the clock stamps, and read the pill:

```js
// preview_eval — make a write drain so markSynced fires, then read the pill.
;(() =>
  new Promise((res) =>
    setTimeout(() => {
      const right = document.querySelector('.sticky .font-mono')?.lastElementChild
      res({ pill: right?.innerText.replace(/\n/g, ' ') })
    }, 500),
  ))()
```

Expected: after a sync drains, the pill reads `Synced · now` (or `· Nm`). Going offline (dispatch `offline` event) with an empty queue shows `Offline · Nm`.

- [ ] **Step 4: Verify the popover open/close + Escape live** — `preview_click` the pill (or `preview_eval` `document.querySelector('.sticky button[aria-haspopup]').click()`), then `preview_snapshot`. Expected: a `dialog` "Sync details" with State + Last sync rows. Press Escape (`preview_eval` dispatch `keydown` Escape) → popover gone, focus back on the pill (`document.activeElement` is the toggle button).

- [ ] **Step 5: Run the gated a11y spec** — the pill is now always-interactive, so confirm `target-size` still passes:

Run: `npx playwright test e2e/demo/a11y.spec.ts`
Expected: PASS on every route (no `target-size` critical/serious violation from the bar). If it fails on the pill, the `min-h-[1.5rem]` (24px) is the lever — confirm it's present and not overridden.

- [ ] **Step 6: Full verification + commit**

Run: `npx prettier --write . && npm run lint && npm test && npm run build`
Expected: all green.

```bash
git add src/components/DevStripe.tsx
git commit -m "feat(status-bar): freshness age + tap-to-expand sync detail popover"
```

---

## Self-Review

**Spec coverage:**

- §1 persisted sync clock → Task 2 + wiring in Task 4. ✅
- §2 `shortAgo` in `format.ts` → Task 1. ✅
- §3 pill age suffix (`Synced · 2m`, `Offline · 8m`; `Saved·N`/`Syncing·N` keep count) → `showAge` (Task 3) + render (Task 5). ✅
- §4 tap-to-expand popover, toggle button, Escape/outside-close, focus mgmt, contextual action → Task 5. ✅
- §5 `useOutboxFailed` + `useOldestPending` (createdAt confirmed present; no migration) → Task 4. ✅
- §6 pure `statusView` (age via `showAge`, no `Date.now()`) + `statusDetail`, unit-tested → Task 3; `shortAgo` tested → Task 1. ✅
- Risk: oldest-queued timestamp → resolved (`OutboxOp.createdAt` exists; `.first()` by FIFO). ✅
- Risk: a11y regression → Task 5 Step 5 runs the gated demo spec; pill sized `min-h-[1.5rem]`. ✅

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `shortAgo(ts, now?)`, `markSynced(now?)`/`lastSyncedAt()`/`useLastSyncedAt()`, `StatusView.showAge`, `DetailRow{label,value}`, `statusDetail(StatusDetailInput)`, `useOutboxFailed()`/`useOldestPending()` are used with matching signatures across Tasks 1→5. `statusDetail` input `view`/`now`/`oldest` names match the component call site in Task 5. ✅
