import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClients } from '@/features/clients/hooks'
import {
  createInvoiceFromJobs,
  invoiceTotalCents,
  taxCents,
  useBusinessSettings,
  useUninvoicedDoneJobs,
  type UninvoicedJob,
} from '@/features/invoices/hooks'
import { Field, PrimaryButton, Select, TextInput } from '@/components/Field'
import { formatCents, parseDollarsToCents } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/invoices/new')({
  validateSearch: (search: Record<string, unknown>): { clientId?: string } => ({
    clientId: typeof search.clientId === 'string' ? search.clientId : undefined,
  }),
  component: NewInvoiceScreen,
})

interface LineDraft {
  key: string
  description: string
  quantity: string
  dollars: string
}

function NewInvoiceScreen() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [clientId, setClientId] = useState(search.clientId ?? '')
  // null = untouched → everything checked by default once jobs load.
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [lines, setLines] = useState<LineDraft[]>([])
  const [saving, setSaving] = useState(false)

  const { data: clients } = useClients()
  const { data: jobs } = useUninvoicedDoneJobs(clientId)
  const { data: settings } = useBusinessSettings()

  const client = (clients ?? []).find((c) => c.id === clientId)
  const includedJobs = (jobs ?? []).filter((j) => !excluded.has(j.id))

  const extraItems = lines
    .map((line) => ({
      description: line.description.trim(),
      quantity: parseFloat(line.quantity) || 1,
      unit_price_cents: parseDollarsToCents(line.dollars) ?? NaN,
    }))
    .filter((item) => item.description !== '' || !Number.isNaN(item.unit_price_cents))
  const linesValid = extraItems.every(
    (item) => item.description !== '' && !Number.isNaN(item.unit_price_cents),
  )

  const subtotal =
    invoiceTotalCents(
      includedJobs.map((j) => ({ quantity: 1, unit_price_cents: j.price_cents })),
    ) +
    (linesValid
      ? invoiceTotalCents(
          extraItems.map((i) => ({
            quantity: i.quantity,
            unit_price_cents: i.unit_price_cents,
          })),
        )
      : 0)
  const taxBps = settings?.sales_tax_bps ?? 0
  const total = subtotal + taxCents(subtotal, taxBps)

  const canCreate =
    clientId !== '' &&
    linesValid &&
    (includedJobs.length > 0 || extraItems.length > 0) &&
    !saving

  function toggleJob(id: string) {
    setExcluded((old) => {
      const next = new Set(old)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setLine(key: string, patch: Partial<LineDraft>) {
    setLines((old) => old.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function handleCreate() {
    if (!canCreate) return
    setSaving(true)
    const id = await createInvoiceFromJobs({
      clientId,
      client: client ? { name: client.name, phone: client.phone } : null,
      jobs: includedJobs,
      extraItems,
      defaultDueDays: settings?.default_due_days ?? 14,
      taxBps: settings?.sales_tax_bps ?? 0,
    })
    void navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } })
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New invoice</h1>

      <div className="mt-4 flex flex-col gap-4 pb-8">
        <Field label="Client">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setExcluded(new Set())
            }}
          >
            <option value="">Pick a client…</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {clientId && (
          <div>
            <p className="heading-stencil text-xs text-faded">Done jobs to invoice</p>
            <ul className="mt-2 flex flex-col gap-2">
              {(jobs ?? []).map((job) => (
                <li key={job.id}>
                  <JobCheckRow
                    job={job}
                    checked={!excluded.has(job.id)}
                    onToggle={() => toggleJob(job.id)}
                  />
                </li>
              ))}
            </ul>
            {(jobs ?? []).length === 0 && (
              <p className="mt-2 text-sm text-faded">
                No uninvoiced done jobs for this client.
              </p>
            )}
          </div>
        )}

        {lines.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="heading-stencil text-xs text-faded">Extra lines</p>
            {lines.map((line) => (
              <div
                key={line.key}
                className="rounded-lg border border-edge bg-panel px-3 py-3"
              >
                <TextInput
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => setLine(line.key, { description: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <TextInput
                    inputMode="decimal"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  />
                  <TextInput
                    inputMode="decimal"
                    placeholder="Price ($)"
                    value={line.dollars}
                    onChange={(e) => setLine(line.key, { dollars: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((old) => old.filter((l) => l.key !== line.key))
                    }
                    className="heading-stencil shrink-0 rounded-lg border border-edge px-4 text-alert"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setLines((old) => [
              ...old,
              { key: crypto.randomUUID(), description: '', quantity: '1', dollars: '' },
            ])
          }
          className="heading-stencil rounded-lg border border-edge bg-panel px-4 py-4 text-sand"
        >
          + Add line
        </button>

        <div className="rounded-lg border border-edge bg-panel px-4 py-4">
          {taxBps > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-faded">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCents(subtotal)}</span>
              </div>
              <div className="mt-1 mb-2 flex items-center justify-between text-sm text-faded">
                <span>Sales tax ({(taxBps / 100).toFixed(2).replace(/\.?0+$/, '')}%)</span>
                <span className="tabular-nums">{formatCents(total - subtotal)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="heading-stencil text-xs text-faded">Total</span>
            <span className="heading-stencil text-2xl text-sand">
              {formatCents(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-tabbar z-30 -mx-edge border-t-2 border-edge bg-canvas px-edge py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PrimaryButton disabled={!canCreate} onClick={() => void handleCreate()}>
          Create invoice
        </PrimaryButton>
      </div>
    </div>
  )
}

function JobCheckRow({
  job,
  checked,
  onToggle,
}: {
  job: UninvoicedJob
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-lg border bg-panel px-4 py-4 text-left ${
        checked ? 'border-blaze' : 'border-edge opacity-60'
      }`}
    >
      <span
        aria-hidden
        className={`heading-stencil flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-blaze bg-blaze text-on-cta' : 'border-edge text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sand">
          {job.title || job.service?.name || 'Job'}
        </span>
        <span className="block text-sm text-faded">
          {formatShortDate(job.scheduled_date)}
          {job.property?.label ? ` · ${job.property.label}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-sand">{formatCents(job.price_cents)}</span>
    </button>
  )
}
