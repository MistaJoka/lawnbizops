import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Sheet } from '@/components/Sheet'
import { createOneOffJob } from '@/features/jobs/hooks'
import { useQuickAddTargets, type QuickAddTarget } from './hooks'
import { formatCents, localToday } from '@/lib/format'

/**
 * Pick a property → create a job scheduled today, prefilled from that property's
 * last job (same-as-last-time). One tap from list to a card on the board. The
 * "Full form" link drops to /jobs/new for a different date, service, or notes.
 */
function QuickAddPicker({ onDone }: { onDone: () => void }) {
  const { data: targets, isLoading } = useQuickAddTargets()
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const q = search.trim().toLowerCase()
  const filtered = (targets ?? []).filter(
    (t) =>
      !q ||
      t.client_name.toLowerCase().includes(q) ||
      t.property.label.toLowerCase().includes(q),
  )

  async function pick(target: QuickAddTarget) {
    setSaving(target.property.id)
    try {
      await createOneOffJob(
        {
          id: crypto.randomUUID(),
          property_id: target.property.id,
          service_id: target.defaults.service_id,
          scheduled_date: localToday(),
          price_cents: target.defaults.price_cents,
          title: target.defaults.title,
          notes: '',
        },
        target.property,
      )
      onDone()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        autoFocus
        aria-label="Search client or property"
        placeholder="Search client or property"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
      />

      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {filtered.map((t) => (
          <button
            key={t.property.id}
            onClick={() => void pick(t)}
            disabled={saving !== null}
            className={`tap-active min-h-touch flex items-center justify-between gap-3 rounded-lg border-2 bg-panel px-4 py-3 text-left transition-opacity ${
              saving === t.property.id
                ? 'border-blaze'
                : 'border-edge disabled:opacity-50'
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-semibold text-sand">
                {t.client_name}
              </span>
              <span className="block truncate text-sm text-faded">
                {t.property.label || t.property.address_line1}
                {t.defaults.title ? ` · ${t.defaults.title}` : ''}
              </span>
            </span>
            <span className="shrink-0 text-right">
              {t.defaults.price_cents > 0 && (
                <span className="heading-stencil block text-sand tabular-nums">
                  {formatCents(t.defaults.price_cents)}
                </span>
              )}
              <span className="label-caps text-blaze">
                {saving === t.property.id ? 'Adding…' : 'Add today'}
              </span>
            </span>
          </button>
        ))}

        {!isLoading && filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-faded">
            {q ? 'No match.' : 'No properties yet — add a client first.'}
          </p>
        )}
      </div>

      <Link
        to="/jobs/new"
        search={{}}
        onClick={onDone}
        className="label-caps block py-2 text-center text-faded"
      >
        Need a date or service? Full form →
      </Link>
    </div>
  )
}

/** Inline collapsible "+ Job" row, pinned at the top of the Scheduled lane. */
export function QuickAddRow() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="heading-stencil tap-active min-h-12 w-full rounded-lg border-2 border-dashed border-edge py-3 text-sm text-blaze"
      >
        + Job
      </button>
    )
  }

  return (
    <div className="rounded-lg border-2 border-blaze bg-surface-low p-2">
      <QuickAddPicker onDone={() => setOpen(false)} />
      <button
        onClick={() => setOpen(false)}
        className="label-caps mt-2 w-full py-2 text-center text-faded"
      >
        Cancel
      </button>
    </div>
  )
}

/** Bottom sheet for the Route view's FAB (no columns to inline into). */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add job — today">
      <QuickAddPicker onDone={onClose} />
    </Sheet>
  )
}
