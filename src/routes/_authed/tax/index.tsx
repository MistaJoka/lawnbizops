import { Link, createFileRoute } from '@tanstack/react-router'
import { presetRange } from '@/features/reports/range'
import { usePnl, useExpensesByCategory } from '@/features/reports/hooks'
import { useExpenses } from '@/features/expenses/hooks'
import { categoryLabel, scheduleCLine } from '@/features/expenses/categories'
import { useBusinessSettings } from '@/features/invoices/hooks'
import {
  mileageDeductionCents,
  quarterlySetAsideCents,
  useMileageLogs,
  useVendors1099,
} from '@/features/tax/hooks'
import { formatCents, localToday } from '@/lib/format'

export const Route = createFileRoute('/_authed/tax/')({
  component: TaxScreen,
})

function TaxScreen() {
  const year = presetRange('year')
  const yearPrefix = localToday().slice(0, 4)

  const { data: settings } = useBusinessSettings()
  const { data: pnl } = usePnl(year)
  const { data: categories } = useExpensesByCategory(year)
  const { data: mileage } = useMileageLogs()
  const { data: payees } = useVendors1099()
  const { data: expenses } = useExpenses()

  const rateCents = settings?.mileage_rate_cents ?? 0
  const pct = settings?.quarterly_set_aside_pct ?? 0

  const ytdMiles = (mileage ?? [])
    .filter((m) => m.drove_on.startsWith(yearPrefix))
    .reduce((sum, m) => sum + m.miles, 0)
  const mileageDeduction = mileageDeductionCents(ytdMiles, rateCents)

  const net = pnl?.net_cents ?? 0
  const setAside = quarterlySetAsideCents(net, pct)

  // Per-payee YTD totals from tagged expenses (cash-basis).
  const payeeTotals = new Map<string, number>()
  for (const e of expenses ?? []) {
    if (e.payee_id && e.spent_on.startsWith(yearPrefix)) {
      payeeTotals.set(e.payee_id, (payeeTotals.get(e.payee_id) ?? 0) + e.amount_cents)
    }
  }

  return (
    <div className="px-edge pt-6 pb-12">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Taxes · {yearPrefix}</h1>
        <Link to="/settings/tax" className="label-caps text-blaze">
          Tax setup
        </Link>
      </div>
      <p className="mt-1 text-xs text-faded">
        Cash-basis helpers to make filing easier — not tax advice.
      </p>

      {/* Quarterly set-aside */}
      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Set aside for taxes</p>
        {pct > 0 ? (
          <>
            <p className="heading-stencil mt-1 text-3xl text-sand">
              {formatCents(setAside)}
            </p>
            <p className="mt-1 text-sm text-faded">
              {pct}% of {formatCents(net)} net income, year to date.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-faded">
            Set a % in{' '}
            <Link to="/settings/tax" className="text-blaze underline">
              Tax setup
            </Link>{' '}
            to estimate quarterly taxes.
          </p>
        )}
      </div>

      {/* Mileage */}
      <div className="card-surface mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="label-caps text-faded">Mileage</p>
          <Link to="/tax/mileage/new" className="label-caps text-blaze">
            + Log trip
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="heading-stencil text-[10px] text-faded">Miles (YTD)</p>
            <p className="heading-stencil mt-1 text-lg text-sand">
              {ytdMiles.toLocaleString('en-US')}
            </p>
          </div>
          <div>
            <p className="heading-stencil text-[10px] text-faded">Deduction</p>
            <p className="heading-stencil mt-1 text-lg text-sand">
              {rateCents > 0 ? formatCents(mileageDeduction) : '—'}
            </p>
          </div>
        </div>
        {rateCents === 0 && (
          <p className="mt-2 text-xs text-faded">
            Set the IRS mileage rate in Tax setup to see the deduction.
          </p>
        )}
      </div>

      {/* Schedule C category summary */}
      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Schedule C · expenses by line</p>
        {(categories ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-faded">No expenses logged this year yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {(categories ?? []).map((c) => (
              <li
                key={c.category}
                className="flex items-center justify-between gap-2 border-b border-edge py-2 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sand">
                    {categoryLabel(c.category)}
                  </span>
                  <span className="block truncate text-xs text-faded">
                    {scheduleCLine(c.category)}
                  </span>
                </span>
                <span className="shrink-0 text-sand">{formatCents(c.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 1099 payees */}
      <div className="card-surface mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="label-caps text-faded">1099 payees</p>
          <Link to="/tax/payees/new" className="label-caps text-blaze">
            + Add payee
          </Link>
        </div>
        {(payees ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-faded">
            Track contractors you pay so you know who needs a 1099-NEC. Confirm the
            current-year threshold with the IRS.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {(payees ?? []).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 border-b border-edge py-2 last:border-b-0"
              >
                <span className="min-w-0 truncate text-sand">{v.name}</span>
                <span className="shrink-0 text-sand">
                  {formatCents(payeeTotals.get(v.id) ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
