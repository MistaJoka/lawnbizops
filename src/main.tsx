import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Sentry from '@sentry/react'
import { routeTree } from './routeTree.gen'
import { CACHE_MAX_AGE_MS, dexiePersister, queryClient } from './lib/queryClient'
import { initOutbox } from './lib/outbox'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn })
}

initOutbox()

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: dexiePersister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: import.meta.env.VITE_APP_VERSION ?? 'dev',
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
)
