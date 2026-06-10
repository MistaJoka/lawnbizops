import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AGING_BUCKETS,
  agingBucket,
  isOpen,
  useInvoiceBalances,
  type AgingBucket,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { InvoiceStatusChip } from '@/features/invoices/InvoiceStatusChip'
import { useEstimates, type EstimateListRow } from '@/features/estimates/hooks'
import { EstimateStatusChip } from '@/features/estimates/EstimateStatusChip'
import { formatCents, localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/money/')({
  component: MoneyScreen,
})

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30',
  '31-60': '31–60',
  '61-90': '61–90',
  '90+': '90+',
}

const BUCKET_COLOR: Record<AgingBucket, string> = {
  current: 'text-sand',
  '1-30': 'text-sand',
  '31-60': 'text-khaki',
  '61-90': 'text-khaki',
  '90+': 'text-alert',
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
      <h1 className="heading-stencil text-2xl text-khaki">Money</h1>

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
    </div>
  )
}

function InvoicesTab() {
  const { data: invoices, isLoading } = useInvoiceBalances()
  const today = localToday()

  const open = (invoices ?? []).filter(isOpen)
  const outstanding = open.reduce((sum, inv) => sum + inv.balance_cents, 0)
  const buckets = new Map<AgingBucket, number>()
  for (const inv of open) {
    const bucket = agingBucket(inv, today)
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + inv.balance_cents)
  }

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
                className={`heading-stencil rounded border border-edge px-2 py-1 text-[10px] ${BUCKET_COLOR[b]}`}
              >
                {BUCKET_LABEL[b]} · {formatCents(buckets.get(b) ?? 0)}
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/invoices/new"
        className="heading-stencil mt-4 block w-full rounded-lg bg-blaze px-4 py-4 text-center text-lg text-canvas"
      >
        + New invoice
      </Link>

      <ul className="mt-4 flex flex-col gap-2 pb-8">
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

function EstimatesTab() {
  const { data: estimates, isLoading } = useEstimates()

  return (
    <>
      <Link
        to="/estimates/new"
        className="heading-stencil mt-4 block w-full rounded-lg bg-blaze px-4 py-4 text-center text-lg text-canvas"
      >
        + New estimate
      </Link>

      <ul className="mt-4 flex flex-col gap-2 pb-8">
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
        <EstimateStatusChip status={estimate.status} />
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
