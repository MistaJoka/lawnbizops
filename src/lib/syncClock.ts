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
