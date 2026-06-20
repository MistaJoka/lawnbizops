import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Sentry from '@sentry/react'
import { routeTree } from './routeTree.gen'
import { CACHE_MAX_AGE_MS, dexiePersister, queryClient } from './lib/queryClient'
import { initOutbox } from './lib/outbox'
import { maybeAutologin } from './lib/autologin' // DEV/TEST-ONLY — see autologin.ts
import { DevPanel } from './dev/DevPanel' // DEV-ONLY — see below; delete with src/dev/
import '@fontsource/archivo-narrow/latin-400.css'
import '@fontsource/archivo-narrow/latin-600.css'
import '@fontsource/archivo-narrow/latin-700.css'
import '@fontsource/atkinson-hyperlegible-next/latin-400.css'
import '@fontsource/atkinson-hyperlegible-next/latin-700.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn })
}

initOutbox()

const router = createRouter({
  routeTree,
  // Deployed under a sub-path on GitHub Pages (VITE_BASE=/lawnbizops/); the
  // router must know that prefix or it can't match any route at the deployed
  // URL and renders "Not Found". BASE_URL is '/' in dev so this is a no-op there.
  basepath: import.meta.env.BASE_URL,
  // Preload a route (its code chunk + loader) on tap/hover intent, so the
  // screen and its data are warm before the user actually navigates. Query
  // owns data freshness, so the router itself shouldn't re-cache loader data.
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// DEV/TEST-only: if build-env credentials are set, establish a session before
// the first render so the router's auth guard sees it and skips /login. A no-op
// in normal builds (env unset). See lib/autologin.ts — remove before launch.
async function bootstrap() {
  await maybeAutologin()
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
      {/* DEV-ONLY dev tools (skip login, etc.). `import.meta.env.DEV` is false in
          production builds, so Vite strips this and src/dev/ from the bundle.
          To remove after launch: delete this block and the src/dev/ folder. */}
      {import.meta.env.DEV && <DevPanel />}
    </StrictMode>,
  )
}
void bootstrap()

// Ask the browser to protect IndexedDB (outbox + cache) from storage-pressure
// eviction. Fire-and-forget — denial just means default eviction rules apply.
void navigator.storage?.persist?.()
