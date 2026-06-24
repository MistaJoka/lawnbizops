import { useSyncExternalStore } from 'react'

// A new app version has been deployed and the service worker has it staged.
// main.tsx wires registerSW({ onNeedRefresh }) → markUpdateReady; the top bar
// surfaces it so you know the latest push to main is here, and tapping it
// activates the new SW and reloads into the new build.

let ready = false
let reload: (() => void) | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Called when the SW reports a waiting update. `reloadFn` activates + reloads. */
export function markUpdateReady(reloadFn: () => void) {
  ready = true
  reload = reloadFn
  emit()
}

/** Activate the staged build and reload into it. */
export function applyUpdate() {
  reload?.()
}

export function isUpdateReady(): boolean {
  return ready
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    isUpdateReady,
    isUpdateReady,
  )
}
