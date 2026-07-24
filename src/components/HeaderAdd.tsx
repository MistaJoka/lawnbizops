import { Link } from '@tanstack/react-router'

// Compact contextual create button — the replacement for the floating FABs.
// Global create lives in the TabBar's New sheet; this is the in-flow shortcut
// that carries screen context (selected date, active money tab) and can never
// float over list content the way the old FABs did.
// min-h-11 (44px floor): fits inside the 48px sticky headers; in search rows
// the flex container's items-stretch grows it to match the input.
const buttonClass =
  'heading-stencil tap-active flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg border-2 border-edge bg-panel px-4 text-sm text-blaze'

export function HeaderAdd({
  to,
  search,
  label,
  onClick,
  className,
}: {
  to?: string
  search?: Record<string, unknown>
  label: string
  /** Render a button (e.g. to open a sheet) instead of a navigation Link. */
  onClick?: () => void
  className?: string
}) {
  const cls = className ? `${buttonClass} ${className}` : buttonClass
  const ariaLabel = `Add ${label.toLowerCase()}`
  const inner = (
    <>
      <span aria-hidden className="text-xl leading-none">
        +
      </span>
      <span>{label}</span>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={to!} search={search} className={cls} aria-label={ariaLabel}>
      {inner}
    </Link>
  )
}
