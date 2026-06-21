import { Link } from '@tanstack/react-router'
import { useSyncStatus } from '@/lib/outbox'

/**
 * App-wide sync status pill. Stays out of the way when everything's settled
 * (idle → renders nothing; "all synced" is conveyed by the toast + the chip
 * vanishing) and only surfaces when there's something to know: a flush in
 * progress, queued writes with no network, or a parked poison op.
 *
 * Pinned top-center below the safe-area inset so it reads on every screen
 * regardless of that screen's own header.
 */
export function SyncChip() {
  const status = useSyncStatus()
  if (status === 'idle') return null

  const base =
    'fixed left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border px-3 py-1 label-caps shadow-lg'
  const style = { top: 'calc(env(safe-area-inset-top) + 0.5rem)' }

  if (status === 'error') {
    return (
      <Link
        to="/settings/sync"
        className={`${base} border-alert bg-panel text-alert`}
        style={style}
      >
        <span className="h-2 w-2 rounded-full bg-alert" />
        Sync issue
      </Link>
    )
  }

  if (status === 'offline') {
    return (
      <div className={`${base} border-edge bg-panel text-faded`} style={style}>
        <span className="h-2 w-2 rounded-full bg-faded" />
        Offline — saved
      </div>
    )
  }

  // syncing
  return (
    <div className={`${base} border-khaki bg-panel text-khaki`} style={style}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-khaki" />
      Syncing…
    </div>
  )
}
