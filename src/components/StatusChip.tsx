/**
 * One source of truth for status pill colors. Invoice, estimate, and job
 * statuses all map onto the same small set of semantic variants so "paid",
 * "accepted", and "done" read with the same green everywhere, "void" and
 * "expired" share the struck-through muted look, and so on.
 *
 * Callers map their domain status → a variant, then render <StatusChip>; they
 * never hand-pick token classes. Add a status by mapping it, not by inventing
 * a new colour.
 */

export type StatusVariant =
  | 'neutral' // draft / not-yet-acted
  | 'info' // sent / in flight
  | 'progress' // partial / underway
  | 'success' // paid / accepted / done
  | 'muted' // void / expired (struck through)
  | 'danger' // declined / rejected
  | 'attention' // time-sensitive (expiring soon)

const VARIANT_CLASS: Record<StatusVariant, string> = {
  neutral: 'bg-surface-highest text-faded',
  info: 'bg-olive text-sand',
  progress: 'bg-blaze text-on-cta',
  success: 'bg-go text-canvas',
  muted: 'bg-surface-highest text-faded line-through',
  danger: 'bg-alert/20 text-alert',
  attention: 'bg-blaze/20 text-blaze',
}

export function StatusChip({
  variant,
  children,
}: {
  variant: StatusVariant
  children: React.ReactNode
}) {
  return (
    <span
      className={`status-badge shrink-0 rounded px-2 py-0.5 ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  )
}
