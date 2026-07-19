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

  const age = v.showAge && lastSyncedAt != null ? shortAgo(lastSyncedAt, now) : null

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Sync status — details"
        // min-h-11 + py grow the hit box to ≥44px; the negative margin cancels
        // the layout growth so the bar stays visually thin.
        className={`tap-active -my-3 flex min-h-11 shrink-0 items-center gap-1.5 py-3 ${v.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
        {v.label}
        {v.count != null && <span className="text-faded">· {v.count}</span>}
        {age && (
          <>
            <span aria-hidden>·</span>
            <span className="text-faded">{age}</span>
          </>
        )}
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
          className="tap-active mt-2 flex min-h-11 w-full items-center justify-center rounded bg-blaze text-on-cta"
        >
          Reload to update
        </button>
      )}
      {view.kind === 'error' && (
        <Link
          to="/settings/sync"
          data-autofocus
          onClick={onAct}
          className="tap-active mt-2 flex min-h-11 items-center text-alert"
        >
          Review sync issue →
        </Link>
      )}
    </div>
  )
}
