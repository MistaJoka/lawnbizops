import { Link } from '@tanstack/react-router'

// right-6 on phones; on wider screens hug the centered 28rem content column
// (50% - half column + gutter) so the button stays near the content.
const baseClass =
  'tap-active fixed right-6 bottom-28 z-40 flex items-center justify-center rounded-full bg-blaze text-on-cta shadow-2xl ring-4 ring-canvas active:scale-90 sm:right-[calc(50%-14rem+1.5rem)]'

export function Fab({
  to,
  search,
  label,
  onClick,
}: {
  to?: string
  search?: Record<string, unknown>
  label?: string
  /** Render a button (e.g. to open a sheet) instead of a navigation Link. */
  onClick?: () => void
}) {
  const className = label ? `${baseClass} h-14 gap-2 px-6` : `${baseClass} h-16 w-16`
  const ariaLabel = label ? `Add ${label.toLowerCase()}` : 'Add'
  const inner = (
    <>
      <span className="text-3xl leading-none font-bold">+</span>
      {label && <span className="label-caps text-sm">{label}</span>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    )
  }
  return (
    <Link to={to!} search={search} className={className} aria-label={ariaLabel}>
      {inner}
    </Link>
  )
}
