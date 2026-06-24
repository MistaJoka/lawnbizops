// App-level recoverable fallback. Rendered by the root route's errorComponent
// when a route's beforeLoad/loader throws — most importantly a dead-zone cold
// start where auth/bootstrap can't reach the server. The whole premise of this
// app is field work in dead zones, so that path must degrade to a screen with a
// way out, never a blank canvas.
export function AppErrorFallback({ onReload }: { onReload?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-edge text-center">
      <p className="heading-stencil text-xl text-khaki">Can’t reach the server</p>
      <p className="max-w-xs text-sm text-muted">
        You may be offline. Your saved work is safe on this device — reconnect and reload
        to pick up where you left off.
      </p>
      <button
        type="button"
        onClick={onReload ?? (() => window.location.reload())}
        className="heading-stencil tap-active min-h-touch rounded-lg bg-blaze px-6 text-lg text-on-cta"
      >
        Reload
      </button>
    </div>
  )
}
