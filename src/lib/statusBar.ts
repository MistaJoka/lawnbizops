import type { SyncStatus } from './outbox'

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
    }
  }
  return {
    kind: 'synced',
    label: 'Synced',
    dot: 'bg-go',
    text: 'text-faded',
    count: null,
    tappable: false,
  }
}
