import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Sentry from '@sentry/react'
import { routeTree } from './routeTree.gen'
import { CACHE_MAX_AGE_MS, dexiePersister, queryClient } from './lib/queryClient'
import { registerSW } from 'virtual:pwa-register'
import { initOutbox } from './lib/outbox'
import { initInstallPrompt } from './lib/installPrompt'
import { markUpdateReady } from './lib/pwaUpdate'
import { maybeAutologin } from './lib/autologin' // DEV/TEST-ONLY — see autologin.ts
import buildInfo from 'virtual:build-info'
import { DevPanel } from './dev/DevPanel' // DEV-ONLY — see below; delete with src/dev/
import { ToastHost } from './components/Toast'
import { ConfirmHost } from './components/ConfirmDialog'
import { RoutePending } from './components/RoutePending'
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
initInstallPrompt()

// Register the service worker and surface a staged new build to the top bar.
// onNeedRefresh fires when a deploy is precached and waiting; markUpdateReady
// flips the bar to "Update", and tapping it runs updateSW(true) → reload into
// the new version. Poll every 60s so a push-to-main shows up without a manual
// reload while the app is open. No-op in dev (SW disabled).
const updateSW = registerSW({
  onNeedRefresh() {
    markUpdateReady(() => void updateSW(true))
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => void registration.update(), 60_000)
    }
  },
})

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
  // A slow auth gate (e.g. a flaky cold start where `_authed` beforeLoad waits
  // on the network) shows this after ~1s instead of a blank screen. Fast loads
  // from cache never reach it. The root component still renders the top bar
  // around it, so build/version + sync status stay visible. A skeleton that
  // mirrors a real screen reads as "loading" rather than a stall.
  defaultPendingComponent: RoutePending,
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
          // Keyed to the build's commit: cache entries persisted by an older
          // build may predate fields the UI now dereferences (shape drift once
          // crashed the estimate screen from a 22h-old restored cache).
          buster: buildInfo.sha || 'dev',
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
      {/* App-wide feedback host — toasts render above the FAB/TabBar from any
          call site (toast.success(…)). Outside the providers so a router/query
          error can still surface a toast. */}
      <ToastHost />
      {/* Imperative confirm() dialogs — themed replacement for window.confirm,
          mounted app-wide so any call site can await a yes/no. */}
      <ConfirmHost />
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
