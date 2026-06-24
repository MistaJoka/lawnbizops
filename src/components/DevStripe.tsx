// Thin always-on top bar pinned above every screen. Two jobs in one line:
//  • left  — build provenance (version · sha · time) so you can confirm which
//    cached PWA build is actually live on the device after a deploy.
//  • right — live status, kept current from the outbox + the network: a
//    connection dot (online/offline), the save/sync state, and a persistent
//    count of writes still waiting to sync. Replaces the old floating chip.
import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import buildInfo from 'virtual:build-info'
import { useOutboxPending, useSyncStatus } from '@/lib/outbox'

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

// One compact cluster: a connection dot (online/offline) + the save/sync word
// + a live unsynced count that stays visible the whole time writes are queued,
// not just when offline.
function SyncStat() {
  const online = useOnline()
  const status = useSyncStatus()
  const pending = useOutboxPending()

  let dot = 'bg-go' // green = connected & clear
  let text = 'text-faded'
  let label = 'Synced'
  let showCount = false

  if (status === 'error') {
    dot = 'bg-alert'
    text = 'text-alert'
    label = 'Sync issue'
  } else if (!online) {
    dot = 'bg-faded' // offline is normal for a field tool — calm, not alarming
    label = pending > 0 ? 'Saved' : 'Offline'
    showCount = pending > 0
  } else if (status === 'syncing' || pending > 0) {
    dot = 'bg-go animate-pulse'
    text = 'text-khaki'
    label = 'Syncing'
    showCount = pending > 0
  }

  const body = (
    <span className={`flex shrink-0 items-center gap-1.5 ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      {showCount && <span className="text-faded">· {pending}</span>}
    </span>
  )

  // A parked poison op is the one state worth tapping — route to its recovery.
  return status === 'error' ? (
    <Link to="/settings/sync" aria-label="Sync issue — review">
      {body}
    </Link>
  ) : (
    body
  )
}
