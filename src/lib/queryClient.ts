import { QueryClient } from '@tanstack/react-query'
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client'
import { db } from './db'

const PERSIST_KEY = 'react-query-cache'
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field tool on flaky LTE: show cached data immediately, refetch in background.
      // offlineFirst = run the queryFn once even offline, then pause retries.
      networkMode: 'offlineFirst',
      staleTime: 60_000,
      gcTime: CACHE_MAX_AGE_MS,
      retry: 2,
    },
  },
})

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
