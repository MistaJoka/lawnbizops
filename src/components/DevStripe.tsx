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
import { applyUpdate, useUpdateReady } from '@/lib/pwaUpdate'
import { statusView } from '@/lib/statusBar'

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

// One compact cluster, in priority order:
//   • Update  — a newer deployed build is staged (tap to load the latest)
//   • Sync issue / Offline / Syncing / Synced — connection + save state, with a
//     live unsynced count while writes are queued.
function SyncStat() {
  const online = useOnline()
  const status = useSyncStatus()
  const pending = useOutboxPending()
  const updateReady = useUpdateReady()

  const v = statusView({ updateReady, online, status, pending })

  const body = (
    <span className={`flex shrink-0 items-center gap-1.5 ${v.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
      {v.label}
      {v.count != null && <span className="text-faded">· {v.count}</span>}
    </span>
  )

  // Update → activate the staged build + reload. Sync error → route to recovery.
  if (v.kind === 'update') {
    return (
      <button type="button" onClick={applyUpdate} aria-label="Update available — reload">
        {body}
      </button>
    )
  }
  if (v.kind === 'error') {
    return (
      <Link to="/settings/sync" aria-label="Sync issue — review">
        {body}
      </Link>
    )
  }
  return body
}
