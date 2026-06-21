import { useSyncExternalStore } from 'react'

/**
 * Tiny imperative toast store — no provider, no context. Call `toast.success(…)`
 * from anywhere (hooks, event handlers, the outbox) and the single <ToastHost>
 * mounted in main.tsx renders it. Same module-level subscribable pattern the
 * outbox sync status uses, so there's one mental model for app-wide signals.
 *
 * Kinds map to design tokens at the edge (Toast.tsx): success→go, error→alert,
 * info→sand, offline→khaki. Keep messages short — these are glanceable
 * confirmations for someone working one-handed, not paragraphs.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'offline'

export type ToastItem = {
  id: string
  kind: ToastKind
  message: string
}

const MAX_VISIBLE = 3

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function push(kind: ToastKind, message: string) {
  const item: ToastItem = { id: crypto.randomUUID(), kind, message }
  // Newest first; cap the stack so a burst of writes can't bury the screen.
  toasts = [item, ...toasts].slice(0, MAX_VISIBLE)
  emit()
  return item.id
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
  offline: (message: string) => push('offline', message),
}

/**
 * Confirm a write that went through the outbox. Online → a normal success
 * toast; offline → an "… — will sync" offline toast so a queued write is never
 * silent. Call this from action hooks right after enqueue().
 */
export function confirmToast(message: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast.offline(`${message} — will sync`)
  } else {
    toast.success(message)
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return toasts
}

/** Reactive view of the live toast stack — consumed only by <ToastHost>. */
export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
