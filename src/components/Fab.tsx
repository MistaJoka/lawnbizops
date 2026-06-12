import { Link } from '@tanstack/react-router'

const baseClass =
  'tap-active fixed right-6 bottom-28 z-40 flex items-center justify-center rounded-full bg-blaze text-on-cta shadow-2xl ring-4 ring-canvas active:scale-90'

export function Fab({
  to,
  search,
  label,
}: {
  to: string
  search?: Record<string, unknown>
  label?: string
}) {
  return (
    <Link
      to={to}
      search={search}
      className={label ? `${baseClass} h-14 gap-2 px-6` : `${baseClass} h-16 w-16`}
      aria-label={label ? `Add ${label.toLowerCase()}` : 'Add'}
    >
      <span className="text-3xl leading-none font-bold">+</span>
      {label && <span className="label-caps text-sm">{label}</span>}
    </Link>
  )
}
