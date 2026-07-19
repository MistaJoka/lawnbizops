import { useSyncExternalStore } from 'react'

/**
 * Captures Chrome's `beforeinstallprompt` so Settings can offer a one-tap
 * "Install app" button instead of pointing at the browser menu. The event only
 * fires when Chrome considers the PWA installable and not yet installed, so
 * `canInstall` doubles as the visibility flag for the affordance.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

/** Wire the listeners. Call once at app start (idempotent enough for HMR). */
export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Reactive "Chrome is offering install right now". */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => deferred !== null,
    () => false,
  )
}

/** Show the native install sheet. No-op if the offer expired. */
export async function promptInstall(): Promise<void> {
  const evt = deferred
  if (!evt) return
  // The event is single-use — clear it either way; Chrome re-fires later if
  // the user dismissed and the app stays uninstalled.
  deferred = null
  notify()
  await evt.prompt()
  await evt.userChoice.catch(() => undefined)
}
