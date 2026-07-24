import { describe, expect, it } from 'vitest'
import {
  bucketBoard,
  buildQuickAddTargets,
  LANES,
  laneSummaries,
  resolveQuickAddDefaults,
  WIP_CAPS,
  wipLevel,
  type PropertyRow,
  type RecentJobRow,
} from './hooks'
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

describe('laneSummaries', () => {
  it('counts and sums each lane by its natural money field', () => {
    const s = laneSummaries({
      quote: [
        { id: 'e1', total_cents: 500000 } as EstimateListRow,
        { id: 'e2', total_cents: 340000 } as EstimateListRow,
      ],
      scheduled: [
        { id: 'j1', price_cents: 6500 } as JobWithContext,
        { id: 'j2', price_cents: 6000 } as JobWithContext,
      ],
      in_progress: [{ id: 'j3', price_cents: 12000 } as JobWithContext],
      done: [{ id: 'j4', price_cents: 8000 } as JobWithContext],
      ar: [
        { invoice_id: 'i1', balance_cents: 26000 } as InvoiceBalance,
        { invoice_id: 'i2', balance_cents: 22500 } as InvoiceBalance,
      ],
      paid: [{ invoice_id: 'i3', total_cents: 45000 } as InvoiceBalance],
    })
    expect(s.quote).toEqual({ count: 2, valueCents: 840000 })
    expect(s.scheduled).toEqual({ count: 2, valueCents: 12500 })
    expect(s.in_progress).toEqual({ count: 1, valueCents: 12000 })
    expect(s.done).toEqual({ count: 1, valueCents: 8000 })
    expect(s.ar).toEqual({ count: 2, valueCents: 48500 }) // outstanding balance
    expect(s.paid).toEqual({ count: 1, valueCents: 45000 }) // collected total
  })

  it('is zero for empty lanes', () => {
    const s = laneSummaries({
      quote: [],
      scheduled: [],
      in_progress: [],
      done: [],
      ar: [],
      paid: [],
    })
    expect(s.quote).toEqual({ count: 0, valueCents: 0 })
    expect(s.ar).toEqual({ count: 0, valueCents: 0 })
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

describe('LANES config', () => {
  it('keeps the canonical pipeline order — screens key off these ids', () => {
    expect(LANES.map((l) => l.id)).toEqual([
      'quote',
      'scheduled',
      'in_progress',
      'done',
      'ar',
      'paid',
    ])
  })

  it('every lane has a visible title, tint, and non-empty chip label', () => {
    for (const lane of LANES) {
      expect(lane.title).not.toBe('')
      expect(lane.tint).toMatch(/^border-/)
      expect(lane.short ?? lane.title).not.toBe('')
    }
    // The abbreviated chips that exist must actually abbreviate.
    expect(LANES.find((l) => l.id === 'scheduled')!.short).toBe('Sched')
    expect(LANES.find((l) => l.id === 'ar')!.short).toBe('Unpaid')
  })

  it('WIP caps only reference real lanes', () => {
    const ids = new Set(LANES.map((l) => l.id))
    for (const capped of Object.keys(WIP_CAPS))
      expect(ids.has(capped as never)).toBe(true)
  })
})

describe('buildQuickAddTargets', () => {
  const prop = (id: string, label: string, clientName?: string): PropertyRow => ({
    id,
    label,
    address_line1: `${label} St`,
    city: 'Miami',
    lat: null,
    lng: null,
    gate_code: '',
    notes: '',
    client_id: 'c1',
    client: clientName ? { id: 'c1', name: clientName, phone: '555' } : null,
  })
  const recent = (propertyId: string, date: string, title = 'Mow'): RecentJobRow => ({
    property_id: propertyId,
    price_cents: 5000,
    service_id: 's1',
    title,
    scheduled_date: date,
  })

  it('takes the FIRST job per property as most recent (input is date-desc)', () => {
    const targets = buildQuickAddTargets(
      [prop('p1', 'Alpha', 'Pat')],
      [recent('p1', '2026-07-20', 'Latest mow'), recent('p1', '2026-06-01', 'Old mow')],
    )
    expect(targets[0].defaults.title).toBe('Latest mow')
    expect(targets[0].last_date).toBe('2026-07-20')
  })

  it('orders recently-serviced first, never-serviced after in label order', () => {
    const targets = buildQuickAddTargets(
      [prop('a', 'Aardvark'), prop('b', 'Bramble'), prop('c', 'Cedar')],
      [recent('c', '2026-07-01'), recent('a', '2026-07-15')],
    )
    // a serviced most recently, then c, then never-serviced b keeps label order.
    expect(targets.map((t) => t.property.id)).toEqual(['a', 'c', 'b'])
  })

  it('gives never-serviced properties blank defaults and no last date', () => {
    const [t] = buildQuickAddTargets([prop('p1', 'Alpha')], [])
    expect(t.defaults).toEqual({ service_id: null, price_cents: 0, title: '' })
    expect(t.last_date).toBeNull()
  })

  it('falls back to a generic client name when the property has no contact', () => {
    const targets = buildQuickAddTargets(
      [prop('p1', 'Alpha'), prop('p2', 'Beta', 'Pat')],
      [],
    )
    expect(targets.map((t) => t.client_name)).toEqual(['Client', 'Pat'])
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
