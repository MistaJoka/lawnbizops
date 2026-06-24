import { useEffect, useState } from 'react'
import { dismissToast, useToasts, type ToastItem, type ToastKind } from '@/lib/toast'
import { haptics } from '@/lib/haptics'

/**
 * Renders the live toast stack. Mounted once in main.tsx. Toasts float just
 * above the FAB/TabBar zone (FAB is at bottom-28) so a confirmation never hides
 * the controls the user just tapped, and clear of the safe-area inset.
 *
 * Each card owns its own dismiss timer and exit animation; tapping it dismisses
 * early. Haptics fire on appear so the confirmation is felt, not just seen.
 */

const KIND: Record<ToastKind, { accent: string; glyph: string }> = {
  success: { accent: 'border-go text-go', glyph: '✓' },
  error: { accent: 'border-alert text-alert', glyph: '!' },
  info: { accent: 'border-outline text-sand', glyph: 'i' },
  offline: { accent: 'border-khaki text-khaki', glyph: '⇡' },
}

const DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 3000,
  offline: 4000,
  error: 5000,
}

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false)
  const { accent, glyph } = KIND[item.kind]

  useEffect(() => {
    // Felt confirmation: success/error get their own pattern, the rest a tap.
    if (item.kind === 'success') haptics.success()
    else if (item.kind === 'error') haptics.error()
    else haptics.tap()

    const hide = setTimeout(() => setLeaving(true), DURATION[item.kind])
    return () => clearTimeout(hide)
  }, [item.kind])

  // Once the exit animation has played, actually remove it from the store.
  useEffect(() => {
    if (!leaving) return
    const remove = setTimeout(() => dismissToast(item.id), 160)
    return () => clearTimeout(remove)
  }, [leaving, item.id])

  return (
    <button
      type="button"
      onClick={() => setLeaving(true)}
      aria-live="polite"
      className={`card-surface ${leaving ? 'anim-toast-out' : 'anim-toast-in'} pointer-events-auto flex w-full items-center gap-3 border-l-4 ${accent} px-4 py-3 text-left`}
    >
      <span className={`heading-stencil shrink-0 text-lg ${accent.split(' ')[1]}`}>
        {glyph}
      </span>
      <span className="flex-1 text-sm text-sand">{item.message}</span>
    </button>
  )
}

export function ToastHost() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-48 z-50 mx-auto flex max-w-[28rem] flex-col gap-2 px-edge">
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  )
}
