import { describe, expect, it } from 'vitest'
import { bucketBoard, resolveQuickAddDefaults, wipLevel } from './hooks'
import type { JobWithContext } from '@/features/jobs/hooks'
import type { EstimateListRow } from '@/features/estimates/hooks'
import type { InvoiceBalance } from '@/features/invoices/hooks'

function job(id: string, status: string): JobWithContext {
  return { id, status, scheduled_date: '2026-06-14', property: null } as JobWithContext
}
function estimate(id: string, status: string): EstimateListRow {
  return { id, status } as EstimateListRow
}
function invoice(id: string, status: string, balance: number): InvoiceBalance {
  return {
    invoice_id: id,
    status,
    balance_cents: balance,
  } as InvoiceBalance
}

describe('bucketBoard', () => {
  it('fans entities into the right lanes', () => {
    const lanes = bucketBoard({
      jobs: [
        job('j1', 'scheduled'),
        job('j2', 'in_progress'),
        job('j3', 'done'),
        job('j4', 'invoiced'), // not a job lane — belongs to no column
      ],
      estimates: [
        estimate('e1', 'draft'),
        estimate('e2', 'sent'),
        estimate('e3', 'accepted'), // left the quote lane
        estimate('e4', 'declined'),
      ],
      invoices: [
        invoice('i1', 'sent', 26000), // open → A/R
        invoice('i2', 'partially_paid', 22500), // open → A/R
        invoice('i3', 'paid', 0), // settled → Paid
        invoice('i4', 'void', 0), // neither
      ],
    })

    expect(lanes.quote.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(lanes.scheduled.map((j) => j.id)).toEqual(['j1'])
    expect(lanes.in_progress.map((j) => j.id)).toEqual(['j2'])
    expect(lanes.done.map((j) => j.id)).toEqual(['j3'])
    expect(lanes.ar.map((i) => i.invoice_id)).toEqual(['i1', 'i2'])
    expect(lanes.paid.map((i) => i.invoice_id)).toEqual(['i3'])
  })

  it('treats a fully-paid invoice as Paid, not A/R', () => {
    const lanes = bucketBoard({
      jobs: [],
      estimates: [],
      invoices: [invoice('i1', 'paid', 0)],
    })
    expect(lanes.ar).toHaveLength(0)
    expect(lanes.paid).toHaveLength(1)
  })
})

describe('wipLevel', () => {
  it('flags over-cap lanes and leaves uncapped lanes ok', () => {
    expect(wipLevel('in_progress', 1)).toBe('ok')
    expect(wipLevel('in_progress', 2)).toBe('ok')
    expect(wipLevel('in_progress', 3)).toBe('over')
    expect(wipLevel('done', 5)).toBe('ok')
    expect(wipLevel('done', 6)).toBe('over')
    expect(wipLevel('quote', 11)).toBe('over')
    expect(wipLevel('scheduled', 999)).toBe('ok') // uncapped backlog
    expect(wipLevel('ar', 999)).toBe('ok')
  })
})

describe('resolveQuickAddDefaults', () => {
  it('repeats the last job when there is one', () => {
    expect(
      resolveQuickAddDefaults({
        service_id: 's1',
        price_cents: 6500,
        title: 'Weekly mow',
      }),
    ).toEqual({ service_id: 's1', price_cents: 6500, title: 'Weekly mow' })
  })
  it('falls back to a blank job for a never-serviced property', () => {
    expect(resolveQuickAddDefaults(undefined)).toEqual({
      service_id: null,
      price_cents: 0,
      title: '',
    })
  })
})

describe('bucketBoard scheduled windowing', () => {
  const dated = (id: string, date: string): JobWithContext =>
    ({ id, status: 'scheduled', scheduled_date: date, property: null }) as JobWithContext

  it('hides scheduled jobs past the horizon', () => {
    const lanes = bucketBoard({
      jobs: [dated('near', '2026-06-20'), dated('far', '2026-07-30')],
      estimates: [],
      invoices: [],
      scheduledThrough: '2026-07-01',
    })
    expect(lanes.scheduled.map((j) => j.id)).toEqual(['near'])
  })

  it('shows the full backlog when no horizon is given', () => {
    const lanes = bucketBoard({
      jobs: [dated('a', '2026-06-20'), dated('b', '2026-12-30')],
      estimates: [],
      invoices: [],
    })
    expect(lanes.scheduled).toHaveLength(2)
  })

  it('includes a job scheduled exactly on the horizon (inclusive boundary)', () => {
    const lanes = bucketBoard({
      jobs: [dated('edge', '2026-07-01'), dated('past', '2026-07-02')],
      estimates: [],
      invoices: [],
      scheduledThrough: '2026-07-01',
    })
    expect(lanes.scheduled.map((j) => j.id)).toEqual(['edge'])
  })
})
