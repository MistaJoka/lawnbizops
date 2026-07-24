import { useEffect, useRef } from 'react'

/**
 * Bottom sheet shell — the one overlay primitive. Extracted from the original
 * QuickAddSheet so every sheet/dialog shares: dim backdrop (tap to close),
 * Escape to close, body-scroll lock, slide-up motion, safe-area bottom padding,
 * and focus moved into the panel on open (returned to the trigger on close).
 *
 * Props are intentionally minimal — pass the body as children, an optional
 * title for the standard header, and `dismissible={false}` to force a choice
 * (used by ConfirmDialog so a stray backdrop tap can't cancel a destructive
 * action ambiguously — callers pass explicit buttons instead).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  labelledBy?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape closes; lock background scroll while open; restore focus on unmount.
  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into the panel so keyboard/AT users land inside the dialog.
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      trigger?.focus?.()
    }
  }, [open, dismissible, onClose])

  if (!open) return null

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex flex-col justify-end bg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        className="flex-1"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="anim-slide-up overscroll-contain rounded-t-2xl border-t-2 border-edge bg-canvas px-edge pt-4 pb-safe outline-none"
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading-stencil text-lg text-sand">{title}</h2>
            {dismissible && (
              <button onClick={onClose} className="label-caps text-faded">
                Close
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
