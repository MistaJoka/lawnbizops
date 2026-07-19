import { Link } from '@tanstack/react-router'
import { Sheet } from './Sheet'

/**
 * Post-save forward momentum: after a record saves, offer the obvious next
 * steps instead of dead-ending on a detail screen (client → property,
 * property → schedule/estimate, …). Every exit — backdrop, Escape, the done
 * button — routes through `onDone`, so the caller always lands the user
 * somewhere sensible (usually the record just saved).
 *
 * Compose with <NextStepAction> children; mark the best next move `primary`.
 */
export function NextStepSheet({
  open,
  title,
  subtitle,
  doneLabel,
  onDone,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  /** The "no thanks, just show me the record" exit. */
  doneLabel: string
  onDone: () => void
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onClose={onDone} title={title}>
      {subtitle && <p className="-mt-1 mb-3 text-sm text-faded">{subtitle}</p>}
      <div className="flex flex-col gap-2">{children}</div>
      <button
        type="button"
        onClick={onDone}
        className="label-caps tap-active mt-2 block min-h-touch w-full py-3 text-center text-faded"
      >
        {doneLabel}
      </button>
    </Sheet>
  )
}

export function NextStepAction({
  to,
  search,
  params,
  label,
  hint,
  primary,
}: {
  to: string
  search?: Record<string, unknown>
  params?: Record<string, string>
  label: string
  hint?: string
  /** The single recommended step — rendered as the blaze CTA. */
  primary?: boolean
}) {
  return (
    <Link
      to={to}
      search={search}
      params={params}
      className={`tap-active flex min-h-touch items-center justify-between gap-3 rounded-lg px-4 py-3 ${
        primary ? 'bg-blaze' : 'border-2 border-edge bg-panel'
      }`}
    >
      <span className="min-w-0">
        <span
          className={`block font-display text-lg font-semibold ${
            primary ? 'text-on-cta' : 'text-sand'
          }`}
        >
          {label}
        </span>
        {hint && (
          <span className={`block text-sm ${primary ? 'text-on-cta/80' : 'text-faded'}`}>
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`heading-stencil shrink-0 text-lg ${
          primary ? 'text-on-cta' : 'text-blaze'
        }`}
      >
        →
      </span>
    </Link>
  )
}
