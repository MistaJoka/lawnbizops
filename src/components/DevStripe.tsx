// Thin always-on top bar pinned above every screen. Two jobs in one line:
//  • left  — build provenance (version · sha · time) so you can confirm which
//    cached PWA build is actually live on the device after a deploy.
//  • right — live sync status, kept current from the outbox, so a flush /
//    queued writes / a parked poison op are always glanceable without the old
//    floating chip overlapping screen headers.
import { Link } from '@tanstack/react-router'
import buildInfo from 'virtual:build-info'
import { useOutboxPending, useSyncStatus, type SyncStatus } from '@/lib/outbox'

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

// Dot colour + label per state. `idle` reads as a calm "Synced" rather than
// hiding, so the bar always answers "is my work saved?" at a glance.
const STAT: Record<SyncStatus, { dot: string; text: string; label: string }> = {
  idle: { dot: 'bg-go', text: 'text-faded', label: 'Synced' },
  syncing: { dot: 'bg-khaki animate-pulse', text: 'text-khaki', label: 'Syncing' },
  offline: { dot: 'bg-faded', text: 'text-faded', label: 'Offline' },
  error: { dot: 'bg-alert', text: 'text-alert', label: 'Sync issue' },
}

function SyncStat() {
  const status = useSyncStatus()
  const pending = useOutboxPending()
  const s = STAT[status]
  // Surface the backlog only when it's waiting (queued/offline) — a count is
  // noise mid-flush and meaningless when settled.
  const count = status === 'offline' && pending > 0 ? ` (${pending})` : ''

  const body = (
    <span className={`flex shrink-0 items-center gap-1.5 ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
      {count}
    </span>
  )

  // A parked poison op is the one status worth tapping — route to its recovery.
  return status === 'error' ? (
    <Link to="/settings/sync" aria-label="Sync issue — review">
      {body}
    </Link>
  ) : (
    body
  )
}
