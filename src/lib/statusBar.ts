import type { SyncStatus } from './outbox'
import { shortAgo } from './format'

// Pure mapping for the top bar's right-hand status cluster. Kept out of the
// component (which imports the virtual build-info module) so it's unit-testable.

export type StatusKind = 'update' | 'error' | 'offline' | 'syncing' | 'synced'

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

export interface StatusInput {
  updateReady: boolean
  online: boolean
  status: SyncStatus
  pending: number
}

export function statusView(s: StatusInput): StatusView {
  // A newer deployed build waiting to load is the most actionable thing — it's
  // how you know the latest push to main is here and ready to test.
  if (s.updateReady) {
    return {
      kind: 'update',
      label: 'Update',
      dot: 'bg-blaze animate-pulse',
      text: 'text-blaze',
      count: null,
      tappable: true,
      showAge: false,
    }
  }
  if (s.status === 'error') {
    return {
      kind: 'error',
      label: 'Sync issue',
      dot: 'bg-alert',
      text: 'text-alert',
      count: null,
      tappable: true,
      showAge: false,
    }
  }
  if (!s.online) {
    // Offline is normal for a field tool — calm, not alarming.
    return {
      kind: 'offline',
      label: s.pending > 0 ? 'Saved' : 'Offline',
      dot: 'bg-faded',
      text: 'text-faded',
      count: s.pending > 0 ? s.pending : null,
      tappable: false,
      showAge: s.pending === 0,
    }
  }
  if (s.status === 'syncing' || s.pending > 0) {
    return {
      kind: 'syncing',
      label: 'Syncing',
      dot: 'bg-go animate-pulse',
      text: 'text-khaki',
      count: s.pending > 0 ? s.pending : null,
      tappable: false,
      showAge: false,
    }
  }
  return {
    kind: 'synced',
    label: 'Synced',
    dot: 'bg-go',
    text: 'text-faded',
    count: null,
    tappable: false,
    showAge: true,
  }
}

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
