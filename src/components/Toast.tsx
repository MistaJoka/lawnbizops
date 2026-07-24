import { useEffect, useState } from 'react'
import { Check, Info, TriangleAlert, Upload, type LucideIcon } from 'lucide-react'
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

const KIND: Record<ToastKind, { accent: string; icon: LucideIcon }> = {
  success: { accent: 'border-go text-go', icon: Check },
  error: { accent: 'border-alert text-alert', icon: TriangleAlert },
  info: { accent: 'border-outline text-sand', icon: Info },
  offline: { accent: 'border-khaki text-khaki', icon: Upload },
}

const DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 3000,
  offline: 4000,
  error: 5000,
}

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false)
  const { accent, icon: Icon } = KIND[item.kind]

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
      className={`card-surface ${leaving ? 'anim-toast-out' : 'anim-toast-in'} pointer-events-auto flex w-full items-center gap-3 border-l-4 ${accent} px-4 py-3 text-left`}
    >
      <span className={`shrink-0 ${accent.split(' ')[1]}`}>
        <Icon size={18} aria-hidden />
      </span>
      <span className="flex-1 text-sm text-sand">{item.message}</span>
    </button>
  )
}

export function ToastHost() {
  const toasts = useToasts()

  return (
    // The live region must exist BEFORE a toast arrives or screen readers
    // won't announce it — so the (invisible, pointer-transparent) container
    // stays mounted even while empty, and aria-live sits here, not per-card.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-48 z-50 mx-auto flex max-w-[28rem] flex-col gap-2 px-edge"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  )
}
