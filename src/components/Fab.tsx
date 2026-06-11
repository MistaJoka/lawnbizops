import { Link } from '@tanstack/react-router'

export function Fab({ to, search }: { to: string; search?: Record<string, string> }) {
  return (
    <Link
      to={to}
      search={search}
      className="tap-active fixed right-6 bottom-28 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-blaze text-on-cta shadow-2xl ring-4 ring-canvas active:scale-90"
      aria-label="Add job"
    >
      <span className="text-3xl font-bold leading-none">+</span>
    </Link>
  )
}
