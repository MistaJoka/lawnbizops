import { Link } from '@tanstack/react-router'
import { CalendarPlus, FileText, Receipt, ReceiptText, UserRoundPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet } from './Sheet'

/**
 * Global create menu, opened from the TabBar's "New" target. One place that
 * reaches every "new record" form from anywhere in the app. Create ONLY —
 * feature navigation lives in the More tab, not inside a create action.
 */

const CREATES: ReadonlyArray<{
  to: string
  label: string
  hint: string
  icon: LucideIcon
}> = [
  { to: '/jobs/new', label: 'Job', hint: 'Schedule a visit', icon: CalendarPlus },
  {
    to: '/clients/new',
    label: 'Client',
    hint: 'Add a customer or lead',
    icon: UserRoundPlus,
  },
  { to: '/estimates/new', label: 'Estimate', hint: 'Quote new work', icon: FileText },
  {
    to: '/invoices/new',
    label: 'Invoice',
    hint: 'Bill finished work',
    icon: ReceiptText,
  },
  {
    to: '/expenses/new',
    label: 'Expense',
    hint: 'Log a cost or receipt',
    icon: Receipt,
  },
]

export function QuickCreateSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Create new">
      <nav
        aria-label="Create"
        className="card-surface flex flex-col divide-y divide-edge/60 pb-0"
      >
        {CREATES.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            onClick={onClose}
            className="tap-active flex min-h-touch items-center gap-3 px-4 py-2.5"
          >
            <c.icon size={20} aria-hidden className="shrink-0 text-blaze" />
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-sand">
                {c.label}
              </span>
              <span className="block text-sm text-faded">{c.hint}</span>
            </span>
          </Link>
        ))}
      </nav>
      <div className="pb-2" />
    </Sheet>
  )
}
