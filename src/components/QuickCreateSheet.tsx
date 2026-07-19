import { Link } from '@tanstack/react-router'
import { Sheet } from './Sheet'

/**
 * Global create menu, opened from the TabBar's "New" target. One place that
 * reaches every "new record" form from anywhere in the app — before this, only
 * "+ Job" was reachable globally and the other create forms were single-deep-
 * link-only. The "Go to" grid surfaces the screens that have no tab of their
 * own (dispatch, tools, inventory, tax, reports).
 */

const CREATES = [
  { to: '/jobs/new', label: 'Job', hint: 'Schedule a visit' },
  { to: '/clients/new', label: 'Client', hint: 'Add a customer or lead' },
  { to: '/estimates/new', label: 'Estimate', hint: 'Quote new work' },
  { to: '/invoices/new', label: 'Invoice', hint: 'Bill finished work' },
  { to: '/expenses/new', label: 'Expense', hint: 'Log a cost or receipt' },
] as const

const PLACES = [
  { to: '/dispatch', label: 'Dispatch map' },
  { to: '/tools', label: 'Tools' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/tax', label: 'Tax' },
  { to: '/money/reports', label: 'Reports' },
] as const

export function QuickCreateSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Create new">
      <nav aria-label="Create" className="flex flex-col gap-2">
        {CREATES.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            onClick={onClose}
            className="tap-active flex min-h-touch items-center justify-between gap-3 rounded-lg border-2 border-edge bg-panel px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold text-sand">
                {c.label}
              </span>
              <span className="block text-sm text-faded">{c.hint}</span>
            </span>
            <span aria-hidden className="heading-stencil shrink-0 text-xl text-blaze">
              +
            </span>
          </Link>
        ))}
      </nav>

      <p className="label-caps mt-5 text-faded">Go to</p>
      <nav aria-label="Go to" className="mt-2 grid grid-cols-2 gap-2 pb-2">
        {PLACES.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            onClick={onClose}
            className="heading-stencil tap-active flex min-h-touch items-center justify-center rounded-lg border-2 border-edge bg-panel px-3 py-3 text-center text-sm text-sand"
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </Sheet>
  )
}
