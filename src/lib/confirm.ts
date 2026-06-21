import { useSyncExternalStore } from 'react'

/**
 * Imperative confirm — a themed, glove-friendly replacement for window.confirm.
 * `await confirm({ title, body, destructive })` resolves true/false, so call
 * sites read almost exactly like before: `if (!(await confirm(...))) return`.
 *
 * One dialog at a time (the host renders the single current request); a second
 * call while one is open cancels the first. Same module-level store pattern as
 * toasts and the outbox sync status.
 */

export type ConfirmOptions = {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red, high-caution styling for irreversible actions (delete, void, cancel). */
  destructive?: boolean
}

type ConfirmRequest = ConfirmOptions & {
  id: string
  resolve: (ok: boolean) => void
}

let current: ConfirmRequest | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Supersede any open request — never leave a dangling promise unresolved.
    if (current) current.resolve(false)
    current = { ...opts, id: crypto.randomUUID(), resolve }
    emit()
  })
}

export function resolveConfirm(ok: boolean) {
  if (!current) return
  current.resolve(ok)
  current = null
  emit()
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => current,
  )
}
