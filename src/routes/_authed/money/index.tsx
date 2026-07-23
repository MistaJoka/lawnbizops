import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Fab } from '@/components/Fab'
import { Sheet } from '@/components/Sheet'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import {
  AGING_BUCKETS,
  AGING_COLOR,
  agingBucket,
  batchInvoiceUnbilled,
  invoiceBalancesQueryOptions,
  isOpen,
  recordReminder,
  useBusinessSettings,
  useInvoiceBalances,
  type AgingBucket,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { InvoiceStatusChip } from '@/features/invoices/InvoiceStatusChip'
import { groupUnbilledByClient, useUnbilledDoneJobs } from '@/features/jobs/attention'
import {
  estimatesQueryOptions,
  useEstimates,
  type EstimateListRow,
} from '@/features/estimates/hooks'
import { EstimateStatusChip } from '@/features/estimates/EstimateStatusChip'
import {
  currentMonth,
  expensesQueryOptions,
  monthExpenseCents,
  useExpenses,
  type ExpenseRow,
} from '@/features/expenses/hooks'
import { categoryLabel } from '@/features/expenses/categories'
import { useDashboard } from '@/features/dashboard/hooks'
import { queryClient } from '@/lib/queryClient'
import { confirm } from '@/lib/confirm'
import { logActivity } from '@/features/activities/hooks'
import { quoteFollowUpMessage, smsHref } from '@/lib/outreach'
import { formatCents, localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/money/')({
  // Warm all three lists on tab-intent (preload) so Money paints instantly on
  // tap. Fire-and-forget: the loader must NOT await these, or one slow/failing
  // query gates the whole screen behind the router's pending fallback instead
  // of letting each tab show its own skeleton / error state. prefetchQuery
  // never throws — offline/no-cache stays graceful.
  loader: () => {
    void queryClient.prefetchQuery(invoiceBalancesQueryOptions)
    void queryClient.prefetchQuery(estimatesQueryOptions)
    void queryClient.prefetchQuery(expensesQueryOptions)
  },
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

const TAB_LABEL = {
  invoices: 'Invoices',
  estimates: 'Estimates',
  expenses: 'Expenses',
} as const

type MoneyTab = keyof typeof TAB_LABEL

/** Shared list search for the three Money tabs — a season of records needs it. */
function TabSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="mt-4 w-full rounded-lg border border-edge bg-panel px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
    />
  )
}

function MoneyScreen() {
  const [tab, setTab] = useState<MoneyTab>('invoices')

  return (
    <div className="px-edge pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Money</h1>
        <div className="flex items-center gap-4">
          <Link to="/money/reports" className="label-caps text-blaze">
            Reports
          </Link>
          <Link to="/dashboard" className="label-caps text-blaze">
            Dashboard
          </Link>
        </div>
      </div>

      <MonthHeader />

      <div className="mt-4 flex rounded-lg border border-edge bg-panel p-1">
        {(['invoices', 'estimates', 'expenses'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`heading-stencil flex-1 rounded-lg px-2 py-3 text-sm ${
              tab === t ? 'bg-blaze text-on-cta' : 'text-faded'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'estimates' && <EstimatesTab />}
      {tab === 'expenses' && <ExpensesTab />}

      {tab === 'invoices' && <Fab to="/invoices/new" label="Invoice" />}
      {tab === 'estimates' && <Fab to="/estimates/new" label="Estimate" />}
      {tab === 'expenses' && <Fab to="/expenses/new" label="Expense" />}
    </div>
  )
}

/** One-glance month-to-date money: Collected · Spent · Net. */
function MonthHeader() {
  const { data: metrics } = useDashboard()
  const { data: expenses } = useExpenses()
  const collected = metrics?.collected_cents ?? 0
  const spent = monthExpenseCents(expenses, currentMonth())
  const net = collected - spent

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[
        { label: 'Collected', value: collected, tone: 'text-sand' },
        { label: 'Spent', value: spent, tone: 'text-sand' },
        { label: 'Net', value: net, tone: net < 0 ? 'text-alert' : 'text-go' },
      ].map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-edge bg-panel px-3 py-3"
        >
          <p className="heading-stencil text-[10px] text-faded">{cell.label}</p>
          <p
            className={`heading-stencil mt-1 truncate text-lg tabular-nums ${cell.tone}`}
          >
            {formatCents(cell.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

function ExpensesTab() {
  const { data: expenses, isLoading, isError, refetch } = useExpenses()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const visible = (expenses ?? []).filter(
    (e) =>
      !q ||
      categoryLabel(e.category).toLowerCase().includes(q) ||
      (e.vendor ?? '').toLowerCase().includes(q) ||
      (e.client?.name ?? '').toLowerCase().includes(q),
  )

  return (
    <>
      <TabSearch value={search} onChange={setSearch} placeholder="Search expenses" />
      <ul className="mt-4 flex flex-col gap-2 pb-28">
        {visible.map((expense) => (
          <li key={expense.id}>
            <ExpenseRow expense={expense} />
          </li>
        ))}
      </ul>
      {q && visible.length === 0 && (expenses ?? []).length > 0 && (
        <p className="py-8 text-center text-faded">No matching expenses.</p>
      )}
      {(expenses ?? []).length === 0 &&
        (isError ? (
          <QueryError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="mt-4">
            <SkeletonList count={5} />
          </div>
        ) : (
          <EmptyState
            glyph="🧾"
            title="No expenses yet"
            body="Log fuel, supplies, and equipment as you spend — they total up here and feed your P&L."
          />
        ))}
    </>
  )
}

function ExpenseRow({ expense }: { expense: ExpenseRow }) {
  return (
    <Link
      to="/expenses/$expenseId"
      params={{ expenseId: expense.id }}
      className="block rounded-lg border border-edge bg-panel px-4 py-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="heading-stencil min-w-0 truncate text-sand">
          {categoryLabel(expense.category)}
        </span>
        <span className="shrink-0 text-lg text-sand tabular-nums">
          {formatCents(expense.amount_cents)}
        </span>
      </span>
      <span className="mt-1 block truncate text-sm text-faded">
        {formatShortDate(expense.spent_on)}
        {expense.vendor && ` · ${expense.vendor}`}
        {expense.client && ` · ${expense.client.name}`}
      </span>
    </Link>
  )
}

/** Done-but-uninvoiced work across every client — the revenue-leak view.
 *  Each row deep-links into New Invoice prefilled for that client, where the
 *  jobs arrive pre-checked. Hidden entirely when nothing is unbilled. */
function UnbilledWorkCard() {
  const { data: jobs } = useUnbilledDoneJobs()
  const { data: settings } = useBusinessSettings()
  const [batching, setBatching] = useState(false)
  const groups = groupUnbilledByClient(jobs ?? [])
  if (groups.length === 0) return null
  const total = groups.reduce((sum, g) => sum + g.totalCents, 0)
  const jobCount = groups.reduce((sum, g) => sum + g.jobCount, 0)

  async function handleBatch() {
    if (!jobs || batching) return
    if (
      !(await confirm({
        title: `Invoice all ${groups.length} clients?`,
        body:
          `Creates ${groups.length} draft invoices — one per client — from ` +
          `${jobCount} finished ${jobCount === 1 ? 'job' : 'jobs'}. ` +
          'Review and send them from the invoice list.',
        confirmLabel: 'Create drafts',
      }))
    )
      return
    setBatching(true)
    try {
      await batchInvoiceUnbilled(
        jobs,
        settings?.default_due_days ?? 14,
        settings?.sales_tax_bps ?? 0,
      )
    } finally {
      setBatching(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border-2 border-blaze/60 bg-panel px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="heading-stencil text-xs text-blaze">Unbilled work</p>
        <p className="heading-stencil text-lg text-sand tabular-nums">
          {formatCents(total)}
        </p>
      </div>
      {groups.length > 1 && (
        <button
          type="button"
          disabled={batching}
          onClick={() => void handleBatch()}
          className="heading-stencil tap-active mt-3 w-full rounded-lg border-2 border-blaze py-2 text-xs text-blaze disabled:opacity-50"
        >
          {batching ? 'Creating drafts…' : `🧾 Invoice all (${groups.length} clients)`}
        </button>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.clientId}>
            <Link
              to="/invoices/new"
              search={{ clientId: g.clientId }}
              className="tap-active flex items-center justify-between gap-2 rounded-lg border border-edge px-3 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-display font-semibold text-sand">
                  {g.clientName}
                </span>
                <span className="block text-sm text-faded">
                  {g.jobCount === 1 ? '1 finished job' : `${g.jobCount} finished jobs`} to
                  invoice
                </span>
              </span>
              <span className="heading-stencil shrink-0 text-sand tabular-nums">
                {formatCents(g.totalCents)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InvoicesTab() {
  const { data: invoices, isLoading, isError, refetch } = useInvoiceBalances()
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const today = localToday()
  const q = search.trim().toLowerCase()
  const visible = (invoices ?? []).filter(
    (inv) =>
      !q ||
      (inv.number ?? '').toLowerCase().includes(q) ||
      (inv.client?.name ?? '').toLowerCase().includes(q),
  )

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
        <p className="heading-stencil mt-1 text-3xl text-sand tabular-nums">
          {formatCents(outstanding)}
        </p>
        {buckets.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {AGING_BUCKETS.filter((b) => buckets.has(b)).map((b) => (
              <span
                key={b}
                className={`heading-stencil rounded border border-edge px-2 py-1 text-[10px] tabular-nums ${AGING_COLOR[b]}`}
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

      <UnbilledWorkCard />

      <TabSearch value={search} onChange={setSearch} placeholder="Search invoices" />

      <ul className="mt-4 flex flex-col gap-2 pb-28">
        {visible.map((inv) => (
          <li key={inv.invoice_id}>
            <InvoiceRow invoice={inv} />
          </li>
        ))}
      </ul>
      {q && visible.length === 0 && (invoices ?? []).length > 0 && (
        <p className="py-8 text-center text-faded">No matching invoices.</p>
      )}
      {(invoices ?? []).length === 0 &&
        (isError ? (
          <QueryError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="mt-4">
            <SkeletonList count={5} />
          </div>
        ) : (
          <EmptyState
            glyph="🧾"
            title="No invoices yet"
            body="Finish a job, then bill it — invoices show up here with their aging."
          />
        ))}
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
                onClick={() => {
                  void recordReminder(inv.invoice_id)
                  void logActivity({
                    clientId: inv.client_id,
                    kind: 'note',
                    body: `Texted a payment reminder for ${inv.number ?? 'invoice'}.`,
                  })
                }}
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

/** Sent-and-unanswered quotes — the sales twin of the overdue-invoice nudge.
 *  Each row deep-links to its estimate; the Follow up button opens a prefilled
 *  text. Hidden entirely when nothing is waiting. */
function AwaitingResponseCard({ estimates }: { estimates: EstimateListRow[] }) {
  const today = localToday()
  const awaiting = estimates.filter(
    (e) => e.status === 'sent' && (!e.valid_until || e.valid_until >= today),
  )
  if (awaiting.length === 0) return null
  const total = awaiting.reduce((sum, e) => sum + e.total_cents, 0)

  return (
    <div className="mt-3 rounded-lg border-2 border-khaki/60 bg-panel px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="heading-stencil text-xs text-khaki">Awaiting response</p>
        <p className="heading-stencil text-lg text-sand tabular-nums">
          {formatCents(total)}
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {awaiting.map((est) => {
          const name = est.client?.name ?? 'Client'
          const phone = est.client?.phone ?? ''
          return (
            <li key={est.id} className="flex items-center gap-2">
              <Link
                to="/estimates/$estimateId"
                params={{ estimateId: est.id }}
                className="tap-active min-w-0 flex-1 rounded-lg border border-edge px-3 py-3"
              >
                <span className="block truncate font-display font-semibold text-sand">
                  {name}
                </span>
                <span className="block text-sm text-faded">
                  {est.number ?? 'pending #'} · {formatCents(est.total_cents)} · sent{' '}
                  {daysAgo(est.sent_at ?? `${est.issued_at}T12:00:00`)}
                </span>
              </Link>
              {phone && (
                <a
                  href={smsHref(
                    phone,
                    quoteFollowUpMessage(
                      name,
                      est.number ?? '',
                      formatCents(est.total_cents),
                    ),
                  )}
                  onClick={() =>
                    void logActivity({
                      clientId: est.client_id,
                      kind: 'note',
                      body: `Texted a follow-up on ${est.number ?? 'the quote'}.`,
                    })
                  }
                  className="heading-stencil tap-active shrink-0 rounded-lg border-2 border-khaki px-3 py-2 text-sm text-khaki"
                >
                  Follow up
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EstimatesTab() {
  const { data: estimates, isLoading, isError, refetch } = useEstimates()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const visible = (estimates ?? []).filter(
    (est) =>
      !q ||
      (est.number ?? '').toLowerCase().includes(q) ||
      (est.client?.name ?? '').toLowerCase().includes(q),
  )

  return (
    <>
      <AwaitingResponseCard estimates={estimates ?? []} />
      <TabSearch value={search} onChange={setSearch} placeholder="Search estimates" />
      <ul className="mt-4 flex flex-col gap-2 pb-28">
        {visible.map((est) => (
          <li key={est.id}>
            <EstimateRow estimate={est} />
          </li>
        ))}
      </ul>
      {q && visible.length === 0 && (estimates ?? []).length > 0 && (
        <p className="py-8 text-center text-faded">No matching estimates.</p>
      )}
      {(estimates ?? []).length === 0 &&
        (isError ? (
          <QueryError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="mt-4">
            <SkeletonList count={5} />
          </div>
        ) : (
          <EmptyState
            glyph="📋"
            title="No estimates yet"
            body="Quote a job to win the work — your estimates collect here."
          />
        ))}
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
        <span className="shrink-0 text-lg text-sand tabular-nums">
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
        <span className="shrink-0 text-lg text-sand tabular-nums">
          {formatCents(invoice.total_cents)}
        </span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-2 text-sm text-faded">
        <span>{formatShortDate(invoice.issued_at)}</span>
        {invoice.balance_cents !== invoice.total_cents && invoice.balance_cents > 0 && (
          <span className="text-blaze tabular-nums">
            {formatCents(invoice.balance_cents)} due
          </span>
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
