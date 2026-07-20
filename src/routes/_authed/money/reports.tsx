import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { DateRangePicker } from '@/features/reports/DateRangePicker'
import { thisMonthRange, type DateRange } from '@/features/reports/range'
import {
  useExpensesByCategory,
  useIncomeByMethod,
  usePnl,
} from '@/features/reports/hooks'
import { useJobProfitability } from '@/features/profitability/hooks'
import { EmptyState } from '@/components/EmptyState'
import { reportFilename, sharePdf } from '@/features/reports/share'
import type { ReportRow } from '@/features/reports/ReportPdf'
import { categoryLabel } from '@/features/expenses/categories'
import {
  AGING_BUCKETS,
  AGING_COLOR,
  PAYMENT_METHODS,
  agingBucket,
  isOpen,
  useBusinessSettings,
  useInvoiceBalances,
  type AgingBucket,
} from '@/features/invoices/hooks'
import { PrimaryButton } from '@/components/Field'
import { Skeleton } from '@/components/Skeleton'
import { formatCents, localToday } from '@/lib/format'
import { parseLocalDate } from '@/lib/dates'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/_authed/money/reports')({
  component: ReportsScreen,
})

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
}

const METHOD_LABEL = new Map<string, string>(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
)

function fmtDay(date: string): string {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ReportsScreen() {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const [sharing, setSharing] = useState(false)

  const { data: pnl, isLoading: pnlLoading } = usePnl(range)
  const { data: categories } = useExpensesByCategory(range)
  const { data: methods } = useIncomeByMethod(range)
  const { data: invoices } = useInvoiceBalances()
  const { data: settings } = useBusinessSettings()
  const { data: jobProfits } = useJobProfitability(range)

  // A/R aging is computed client-side from invoice_balances (no RPC needed).
  const today = localToday()
  const open = (invoices ?? []).filter(isOpen)
  const agingByBucket = new Map<AgingBucket, number>()
  for (const inv of open) {
    const b = agingBucket(inv, today)
    agingByBucket.set(b, (agingByBucket.get(b) ?? 0) + inv.balance_cents)
  }
  const agingRows: { bucket: AgingBucket; total: number }[] = AGING_BUCKETS.filter((b) =>
    agingByBucket.has(b),
  ).map((b) => ({ bucket: b, total: agingByBucket.get(b) ?? 0 }))

  const categoryRows: ReportRow[] = (categories ?? []).map((c) => ({
    label: categoryLabel(c.category),
    total_cents: c.total_cents,
  }))
  const methodRows: ReportRow[] = (methods ?? []).map((m) => ({
    label: METHOD_LABEL.get(m.method) ?? m.method,
    total_cents: m.total_cents,
  }))

  async function handleSharePdf() {
    if (sharing) return
    setSharing(true)
    try {
      const [{ pdf }, { ReportPdf }, { fetchLogoDataUrl }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/features/reports/ReportPdf'),
        import('@/features/settings/hooks'),
      ])
      const logoDataUrl = await fetchLogoDataUrl(settings?.logo_path)
      const blob = await pdf(
        <ReportPdf
          data={{
            rangeLabel: `${fmtDay(range.start)} – ${fmtDay(range.end)}`,
            pnl: pnl ?? { income_cents: 0, expense_cents: 0, net_cents: 0 },
            categories: categoryRows,
            methods: methodRows,
            aging: agingRows.map((r) => ({
              label: BUCKET_LABEL[r.bucket],
              total_cents: r.total,
            })),
          }}
          settings={settings ?? null}
          logoDataUrl={logoDataUrl}
        />,
      ).toBlob()
      await sharePdf(blob, reportFilename(range.start, range.end))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not build the report')
    } finally {
      setSharing(false)
    }
  }

  const income = pnl?.income_cents ?? 0
  const expense = pnl?.expense_cents ?? 0
  const net = pnl?.net_cents ?? 0

  // Ranked by profit so the best and worst work surfaces first (billed basis —
  // payments aren't job-tagged, so jobs can't be measured on collected).
  const rankedJobs = [...(jobProfits ?? [])].sort(
    (a, b) => b.profit_cents - a.profit_cents,
  )

  const rangeIsEmpty =
    !pnlLoading &&
    income === 0 &&
    expense === 0 &&
    categoryRows.length === 0 &&
    methodRows.length === 0 &&
    rankedJobs.length === 0

  if (rangeIsEmpty) {
    return (
      <div className="px-edge pt-6 pb-28">
        <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Money
        </Link>
        <h1 className="heading-stencil mt-2 text-2xl text-khaki">Reports</h1>
        <div className="mt-4">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <EmptyState
          glyph="📊"
          title="Nothing in this period"
          body="No payments, expenses, or billed jobs landed in this range. Widen the range or pick another period."
        />
      </div>
    )
  }

  return (
    <div className="px-edge pt-6 pb-28">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Reports</h1>

      <div className="mt-4">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* P&L — three lines, numbers first. */}
      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Profit & loss · cash basis</p>
        {pnlLoading ? (
          <div className="mt-3">
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <Row label="Income (collected)" value={formatCents(income)} />
            <Row label="Expenses" value={`-${formatCents(expense)}`} />
            <div className="mt-1 flex items-center justify-between border-t-2 border-edge pt-3">
              <span className="heading-stencil text-sand">Net</span>
              <span
                className={`heading-stencil text-2xl tabular-nums ${net < 0 ? 'text-alert' : 'text-go'}`}
              >
                {formatCents(net)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Breakdown
        title="Expenses by category"
        rows={categoryRows}
        emptyText="No expenses in this period."
      />
      <Breakdown
        title="Income by method"
        rows={methodRows}
        emptyText="No payments in this period."
      />

      {/* Job profitability — billed basis (payments aren't job-tagged). */}
      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Job profitability · billed</p>
        {rankedJobs.length === 0 ? (
          <p className="mt-2 text-sm text-faded">No billed jobs in this period.</p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {rankedJobs.slice(0, 8).map((job) => (
              <li
                key={job.job_id}
                className="flex items-center justify-between gap-3 border-b border-edge py-2 last:border-b-0"
              >
                <span className="min-w-0 truncate text-sand">{job.title || 'Job'}</span>
                <span
                  className={`shrink-0 text-right tabular-nums ${
                    job.profit_cents < 0 ? 'text-alert' : 'text-go'
                  }`}
                >
                  {formatCents(job.profit_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rankedJobs.length > 8 && (
          <p className="mt-2 text-xs text-faded">
            Top 8 of {rankedJobs.length} by profit · costs come from expenses tagged to
            each job
          </p>
        )}
      </div>

      {/* A/R aging — reuses the same bucket logic as the Money tab. */}
      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Accounts receivable · open</p>
        {agingRows.length === 0 ? (
          <p className="mt-2 text-sm text-faded">Nothing outstanding. 🎉</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {agingRows.map((r) => (
              <span
                key={r.bucket}
                className={`heading-stencil rounded border border-edge px-2 py-1 text-[11px] tabular-nums ${AGING_COLOR[r.bucket]}`}
              >
                {BUCKET_LABEL[r.bucket]} · {formatCents(r.total)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <PrimaryButton disabled={sharing} onClick={() => void handleSharePdf()}>
          {sharing ? 'Building…' : 'Share PDF'}
        </PrimaryButton>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sand">{label}</span>
      <span className="text-right text-sand tabular-nums">{value}</span>
    </div>
  )
}

function Breakdown({
  title,
  rows,
  emptyText,
}: {
  title: string
  rows: ReportRow[]
  emptyText: string
}) {
  return (
    <div className="card-surface mt-4 p-4">
      <p className="label-caps text-faded">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-faded">{emptyText}</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between border-b border-edge py-2 last:border-b-0"
            >
              <span className="min-w-0 truncate text-sand">{r.label}</span>
              <span className="shrink-0 text-right text-sand tabular-nums">
                {formatCents(r.total_cents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
