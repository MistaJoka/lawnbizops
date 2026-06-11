import { QueryClient } from '@tanstack/react-query'
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client'
import { db } from './db'
import { loadPreferences } from './preferences'

const PERSIST_KEY = 'react-query-cache'
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Field tool on flaky LTE: show cached data immediately, refetch in background.
// offlineFirst = run the queryFn once even offline, then pause retries.
// "Prefer offline cache" preference = data saver: lean on cached data much
// longer and skip focus/reconnect refetches.
function queryDefaults(offlinePreferred: boolean) {
  return {
    queries: {
      networkMode: 'offlineFirst' as const,
      staleTime: offlinePreferred ? 30 * 60_000 : 60_000,
      gcTime: CACHE_MAX_AGE_MS,
      retry: 2,
      refetchOnWindowFocus: !offlinePreferred,
      refetchOnReconnect: !offlinePreferred,
    },
  }
}

export const queryClient = new QueryClient({
  defaultOptions: queryDefaults(loadPreferences().offlinePreferred),
})

/** Re-apply when the preference toggles (settings screen) — no reload needed. */
export function applyOfflinePreference(offlinePreferred: boolean): void {
  queryClient.setDefaultOptions(queryDefaults(offlinePreferred))
}

/** Query cache persisted to IndexedDB so a cold start offline still boots with data. */
export const dexiePersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await db.kv.put({ key: PERSIST_KEY, value: client })
  },
  restoreClient: async () => {
    const entry = await db.kv.get(PERSIST_KEY)
    return entry?.value as PersistedClient | undefined
  },
  removeClient: async () => {
    await db.kv.delete(PERSIST_KEY)
  },
}
