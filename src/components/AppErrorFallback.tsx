import * as Sentry from '@sentry/react'
import { useEffect } from 'react'

// App-level recoverable fallback. Rendered by the root route's errorComponent
// when a route's beforeLoad/loader throws OR a screen crashes during render.
// The whole premise of this app is field work in dead zones, so this must
// degrade to a screen with a way out, never a blank canvas — and it must not
// lie: a code crash and a dead connection get different words, because the
// sync pill may truthfully say "Synced" right above this screen.

/** Best-effort split between "no connection" and "the app broke". */
function looksLikeNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = error instanceof Error ? error.message : String(error ?? '')
  // Chrome "Failed to fetch", Safari "Load failed", Firefox "NetworkError",
  // plus supabase-js timeout/connection phrasing.
  return /failed to fetch|load failed|networkerror|network request|timeout|connection/i.test(
    msg,
  )
}

export function AppErrorFallback({
  error,
  onReload,
}: {
  error?: unknown
  onReload?: () => void
}) {
  const offline = looksLikeNetworkError(error)

  useEffect(() => {
    if (error === undefined) return
    // Surface the real cause — the screen intentionally doesn't show a stack.
    console.error('AppErrorFallback:', error)
    if (!offline) Sentry.captureException(error)
  }, [error, offline])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-edge text-center">
      <p className="heading-stencil text-xl text-sand">
        {offline ? 'Can’t reach the server' : 'Something broke on this screen'}
      </p>
      <p className="max-w-xs text-sm text-muted">
        {offline
          ? 'You may be offline. Your saved work is safe on this device — reconnect and reload to pick up where you left off.'
          : 'This is a bug in the app, not your connection. Your saved work is safe on this device.'}
      </p>
      <button
        type="button"
        onClick={onReload ?? (() => window.location.reload())}
        className="heading-stencil tap-active min-h-touch rounded-lg bg-blaze px-6 text-lg text-on-cta"
      >
        Reload
      </button>
      {/* Plain anchor on purpose: a full navigation to home works even when the
          router or a screen component is the thing that crashed. */}
      <a
        href={import.meta.env.BASE_URL}
        className="tap-active flex min-h-touch items-center rounded-lg px-6 text-base text-faded underline underline-offset-4"
      >
        Go to Today
      </a>
    </div>
  )
}
