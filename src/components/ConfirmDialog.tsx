import { useEffect } from 'react'
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

  // The store value is referentially stable until a new confirm() supersedes it,
  // so this fires exactly once per opened dialog (and the guard skips the close).
  useEffect(() => {
    if (req) haptics.warning()
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
          autoFocus
          onClick={() => resolveConfirm(true)}
          className={`heading-stencil tap-active min-h-touch w-full rounded-lg px-4 py-4 text-lg ${confirmClass}`}
        >
          {req.confirmLabel ?? 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => resolveConfirm(false)}
          className="heading-stencil tap-active min-h-touch w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-base text-sand"
        >
          {req.cancelLabel ?? 'Cancel'}
        </button>
      </div>
    </Sheet>
  )
}
