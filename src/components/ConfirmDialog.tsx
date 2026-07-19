import { useEffect, useRef } from 'react'
import { Sheet } from './Sheet'
import { resolveConfirm, useConfirmRequest } from '@/lib/confirm'
import { haptics } from '@/lib/haptics'

/**
 * Renders the current confirm() request as a themed bottom sheet. Mounted once
 * in main.tsx. Backdrop tap / Escape / Cancel all resolve false; the primary
 * button resolves true. Destructive requests get alert-red styling and a
 * warning haptic so an irreversible action reads as one before it's tapped.
 */
export function ConfirmHost() {
  const req = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // The store value is referentially stable until a new confirm() supersedes it,
  // so this fires exactly once per opened dialog (and the guard skips the close).
  // Only destructive dialogs buzz the caution pattern — a routine confirm (skip
  // a job, advance a stage) shouldn't feel like a warning.
  useEffect(() => {
    if (req?.destructive) haptics.warning()
  }, [req])

  // Cancel is the safe default focus — a reflexive Enter/double-tap must never
  // confirm. Runs after Sheet's own mount effect (child effects fire first), so
  // this wins over the panel focus Sheet sets for generic sheets.
  useEffect(() => {
    if (req) cancelRef.current?.focus()
  }, [req])

  if (!req) return null

  const confirmClass = req.destructive ? 'bg-alert text-canvas' : 'bg-blaze text-on-cta'

  return (
    <Sheet open onClose={() => resolveConfirm(false)} labelledBy="confirm-title">
      <h2 id="confirm-title" className="heading-stencil text-xl text-sand">
        {req.title}
      </h2>
      {req.body && <p className="mt-2 text-sm text-faded">{req.body}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => resolveConfirm(true)}
          className={`heading-stencil tap-active min-h-touch w-full rounded-lg px-4 py-4 text-lg ${confirmClass}`}
        >
          {req.confirmLabel ?? 'Confirm'}
        </button>
        <button
          type="button"
          ref={cancelRef}
          onClick={() => resolveConfirm(false)}
          className="heading-stencil tap-active min-h-touch w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-base text-sand"
        >
          {req.cancelLabel ?? 'Cancel'}
        </button>
      </div>
    </Sheet>
  )
}
