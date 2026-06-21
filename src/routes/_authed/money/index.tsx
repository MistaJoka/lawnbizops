import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Fab } from '@/components/Fab'
import { Sheet } from '@/components/Sheet'
import {
  AGING_BUCKETS,
  AGING_COLOR,
  agingBucket,
  invoiceBalancesQueryOptions,
  isOpen,
  recordReminder,
  useInvoiceBalances,
  type AgingBucket,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { InvoiceStatusChip } from '@/features/invoices/InvoiceStatusChip'
import {
  estimatesQueryOptions,
  useEstimates,
  type EstimateListRow,
} from '@/features/estimates/hooks'
import { EstimateStatusChip } from '@/features/estimates/EstimateStatusChip'
import { queryClient } from '@/lib/queryClient'
import { formatCents, localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/money/')({
  // Warm both lists on tab-intent (preload) so Money paints instantly on tap.
  // prefetchQuery never throws — offline/no-cache stays graceful.
  loader: () =>
    Promise.all([
      queryClient.prefetchQuery(invoiceBalancesQueryOptions),
      queryClient.prefetchQuery(estimatesQueryOptions),
    ]),
  component: MoneyScreen,
})

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30',
  '31-60': '31–60',
  '61-90': '61–90',
  '90+': '90+',
}

function daysAgo(timestamp: string): string {
  const days = Math.floor((Date.now() - new Date(timestamp).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function MoneyScreen() {
  const [tab, setTab] = useState<'invoices' | 'estimates'>('invoices')

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Money</h1>
        <Link to="/dashboard" className="label-caps text-blaze">
          Dashboard
        </Link>
      </div>

      <div className="mt-4 flex rounded-lg border border-edge bg-panel p-1">
        {(['invoices', 'estimates'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`heading-stencil flex-1 rounded-md px-4 py-3 text-sm ${
              tab === t ? 'bg-blaze text-canvas' : 'text-faded'
            }`}
          >
            {t === 'invoices' ? 'Invoices' : 'Estimates'}
          </button>
        ))}
      </div>

      {tab === 'estimates' ? <EstimatesTab /> : <InvoicesTab />}

      {tab === 'estimates' ? (
        <Fab to="/estimates/new" label="Estimate" />
      ) : (
        <Fab to="/invoices/new" label="Invoice" />
      )}
    </div>
  )
}

function InvoicesTab() {
  const { data: invoices, isLoading } = useInvoiceBalances()
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const today = localToday()

  const open = (invoices ?? []).filter(isOpen)
  const outstanding = open.reduce((sum, inv) => sum + inv.balance_cents, 0)
  const buckets = new Map<AgingBucket, number>()
  for (const inv of open) {
    const bucket = agingBucket(inv, today)
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + inv.balance_cents)
  }
  const overdue = open.filter(
    (inv) => agingBucket(inv, today) !== 'current' && inv.client?.phone,
  )

  return (
    <>
      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
        <p className="heading-stencil text-xs text-faded">Outstanding</p>
        <p className="heading-stencil mt-1 text-3xl text-sand">
          {formatCents(outstanding)}
        </p>
        {buckets.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {AGING_BUCKETS.filter((b) => buckets.has(b)).map((b) => (
              <span
                key={b}
                className={`heading-stencil rounded border border-edge px-2 py-1 text-[10px] ${AGING_COLOR[b]}`}
              >
                {BUCKET_LABEL[b]} · {formatCents(buckets.get(b) ?? 0)}
              </span>
            ))}
          </div>
        )}
        {overdue.length > 0 && (
          <button
            type="button"
            onClick={() => setNudgeOpen(true)}
            className="heading-stencil tap-active mt-3 w-full rounded-lg border-2 border-blaze py-2 text-xs text-blaze"
          >
            🔔 Nudge overdue ({overdue.length})
          </button>
        )}
      </div>

      {nudgeOpen && (
        <NudgeSheet
          invoices={overdue}
          today={today}
          onClose={() => setNudgeOpen(false)}
        />
      )}

      <ul className="mt-4 flex flex-col gap-2 pb-28">
        {(invoices ?? []).map((inv) => (
          <li key={inv.invoice_id}>
            <InvoiceRow invoice={inv} />
          </li>
        ))}
      </ul>
      {(invoices ?? []).length === 0 && (
        <p className="mt-8 text-center text-faded">
          {isLoading ? 'Loading…' : 'No invoices yet.'}
        </p>
      )}
    </>
  )
}

function NudgeSheet({
  invoices,
  today,
  onClose,
}: {
  invoices: InvoiceBalance[]
  today: string
  onClose: () => void
}) {
  return (
    <Sheet open onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="heading-stencil text-lg text-khaki">Nudge overdue</h2>
        <button
          type="button"
          onClick={onClose}
          className="label-caps text-faded"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {invoices.map((inv) => {
          const name = inv.client?.name ?? 'Client'
          const phone = inv.client!.phone
          const nudgeBody =
            `Hi ${name}, friendly reminder about invoice ${inv.number ?? ''} — ` +
            `${formatCents(inv.balance_cents)} whenever it's convenient. Thank you!`
          return (
            <li key={inv.invoice_id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-base text-sand">{name}</span>
                <span className={`text-sm ${AGING_COLOR[agingBucket(inv, today)]}`}>
                  {formatCents(inv.balance_cents)} ·{' '}
                  {BUCKET_LABEL[agingBucket(inv, today)]} overdue
                </span>
              </span>
              <a
                href={`sms:${phone}?&body=${encodeURIComponent(nudgeBody)}`}
                onClick={() => void recordReminder(inv.invoice_id)}
                className="heading-stencil tap-active shrink-0 rounded-lg border-2 border-blaze px-4 py-2 text-sm text-blaze"
              >
                🔔 Nudge
              </a>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

function EstimatesTab() {
  const { data: estimates, isLoading } = useEstimates()

  return (
    <>
      <ul className="mt-4 flex flex-col gap-2 pb-28">
        {(estimates ?? []).map((est) => (
          <li key={est.id}>
            <EstimateRow estimate={est} />
          </li>
        ))}
      </ul>
      {(estimates ?? []).length === 0 && (
        <p className="mt-8 text-center text-faded">
          {isLoading ? 'Loading…' : 'No estimates yet.'}
        </p>
      )}
    </>
  )
}

function EstimateRow({ estimate }: { estimate: EstimateListRow }) {
  return (
    <Link
      to="/estimates/$estimateId"
      params={{ estimateId: estimate.id }}
      className="block rounded-lg border border-edge bg-panel px-4 py-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="heading-stencil min-w-0 truncate text-sand">
          {estimate.number ?? 'pending #'}
        </span>
        <EstimateStatusChip status={estimate.status} validUntil={estimate.valid_until} />
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-lg text-sand">
          {estimate.client?.name ?? 'Client'}
        </span>
        <span className="shrink-0 text-lg text-sand">
          {formatCents(estimate.total_cents)}
        </span>
      </span>
      <span className="mt-1 block text-sm text-faded">
        {formatShortDate(estimate.issued_at)}
        {estimate.valid_until && ` · valid thru ${formatShortDate(estimate.valid_until)}`}
      </span>
    </Link>
  )
}

function InvoiceRow({ invoice }: { invoice: InvoiceBalance }) {
  return (
    <Link
      to="/invoices/$invoiceId"
      params={{ invoiceId: invoice.invoice_id }}
      className="block rounded-lg border border-edge bg-panel px-4 py-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="heading-stencil min-w-0 truncate text-sand">
          {invoice.number ?? 'pending #'}
        </span>
        <InvoiceStatusChip status={invoice.status} />
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-lg text-sand">
          {invoice.client?.name ?? 'Client'}
        </span>
        <span className="shrink-0 text-lg text-sand">
          {formatCents(invoice.total_cents)}
        </span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-2 text-sm text-faded">
        <span>{formatShortDate(invoice.issued_at)}</span>
        {invoice.balance_cents !== invoice.total_cents && invoice.balance_cents > 0 && (
          <span className="text-blaze">{formatCents(invoice.balance_cents)} due</span>
        )}
      </span>
      {invoice.last_reminded_at && isOpen(invoice) && (
        <span className="mt-1 block text-xs text-faded">
          nudged {daysAgo(invoice.last_reminded_at)}
        </span>
      )}
    </Link>
  )
}
