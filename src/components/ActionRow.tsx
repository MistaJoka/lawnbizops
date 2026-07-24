import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

/**
 * Quiet action list row — the secondary-action pattern for detail screens.
 * A screen keeps ONE stencil-caps primary CTA; everything else stacks as
 * these rows inside a single `card-surface divide-y` shell, so five actions
 * read as a list to scan, not five slabs to re-read.
 */
export function ActionRow({
  icon: Icon,
  label,
  sub,
  disabled,
  onClick,
  to,
  search,
}: {
  icon: LucideIcon
  label: string
  /** One-line helper under the label (recipient, last-sent time, blocker). */
  sub?: string
  disabled?: boolean
  onClick?: () => void
  /** Navigation variant — renders a router Link instead of a button. */
  to?: string
  search?: Record<string, unknown>
}) {
  const rowClass =
    'tap-active flex min-h-touch w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50'
  const inner = (
    <>
      <Icon size={18} aria-hidden className="shrink-0 text-faded" />
      <span className="min-w-0">
        <span className="block text-base font-medium text-sand">{label}</span>
        {sub && <span className="block truncate text-xs text-faded">{sub}</span>}
      </span>
    </>
  )
  if (to) {
    return (
      <Link to={to} search={search} className={rowClass}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={rowClass}>
      {inner}
    </button>
  )
}
