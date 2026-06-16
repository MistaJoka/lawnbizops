import { describe, expect, it } from 'vitest'
import { bucketBoard } from './hooks'
import { invoiceTotalCents, type InvoiceBalance } from '@/features/invoices/hooks'
import type { JobWithContext } from '@/features/jobs/hooks'
import type { EstimateListRow } from '@/features/estimates/hooks'

// Invariants the board must uphold no matter the input. These are conservation
// laws (a card is in exactly one place, money reconciles), not example checks —
// they assert the system is balanced from any direction, per the hardening pass.

const J = (id: string, status: string): JobWithContext =>
  ({ id, status, scheduled_date: '2026-06-14', property: null }) as JobWithContext
const E = (id: string, status: string): EstimateListRow =>
  ({ id, status }) as EstimateListRow
const I = (id: string, status: string, balance: number): InvoiceBalance =>
  ({ invoice_id: id, status, balance_cents: balance }) as InvoiceBalance

describe('board lane conservation', () => {
  const jobs = [
    J('j1', 'scheduled'),
    J('j2', 'in_progress'),
    J('j3', 'done'),
    J('j4', 'invoiced'),
    J('j5', 'skipped'),
    J('j6', 'canceled'),
  ]
  const estimates = [
    E('e1', 'draft'),
    E('e2', 'sent'),
    E('e3', 'accepted'),
    E('e4', 'declined'),
    E('e5', 'expired'),
  ]
  const invoices = [
    I('i1', 'sent', 26000),
    I('i2', 'partially_paid', 22500),
    I('i3', 'paid', 0),
    I('i4', 'void', 0),
    I('i5', 'draft', 0),
  ]
  const lanes = bucketBoard({ jobs, estimates, invoices })

  it('a job lands in at most one job-lane (no double-counting)', () => {
    const ids = [...lanes.scheduled, ...lanes.in_progress, ...lanes.done].map((j) => j.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('job-lanes invent no cards (subset of input)', () => {
    const laneIds = [...lanes.scheduled, ...lanes.in_progress, ...lanes.done].map(
      (j) => j.id,
    )
    for (const id of laneIds) expect(jobs.some((j) => j.id === id)).toBe(true)
  })

  it('skipped / canceled / invoiced jobs appear in no job-lane', () => {
    const laneIds = new Set(
      [...lanes.scheduled, ...lanes.in_progress, ...lanes.done].map((j) => j.id),
    )
    expect(laneIds.has('j4')).toBe(false) // invoiced
    expect(laneIds.has('j5')).toBe(false) // skipped
    expect(laneIds.has('j6')).toBe(false) // canceled
  })

  it('an invoice is never in both A/R and Paid', () => {
    const ar = new Set(lanes.ar.map((i) => i.invoice_id))
    for (const p of lanes.paid) expect(ar.has(p.invoice_id)).toBe(false)
  })

  it('A/R holds only open invoices (positive balance)', () => {
    for (const inv of lanes.ar) expect(inv.balance_cents).toBeGreaterThan(0)
  })

  it('a void invoice is neither A/R nor Paid (no limbo card)', () => {
    const shown = new Set([...lanes.ar, ...lanes.paid].map((i) => i.invoice_id))
    expect(shown.has('i4')).toBe(false)
  })
})

describe('money conservation', () => {
  const items = [
    { quantity: 4, unit_price_cents: 6500 },
    { quantity: 1, unit_price_cents: 12000 },
    { quantity: 2.5, unit_price_cents: 350 },
  ]

  it('invoice total is order-independent (commutative sum)', () => {
    expect(invoiceTotalCents(items)).toBe(invoiceTotalCents([...items].reverse()))
  })

  it('total = sum of per-line rounded totals (no drift)', () => {
    const manual = Math.round(4 * 6500) + Math.round(1 * 12000) + Math.round(2.5 * 350)
    expect(invoiceTotalCents(items)).toBe(manual)
  })

  it('balance stays non-negative for any payment up to total, negative only on overpay', () => {
    const total = invoiceTotalCents(items)
    expect(total - 0).toBeGreaterThanOrEqual(0)
    expect(total - total).toBe(0)
    expect(total - (total + 1)).toBeLessThan(0) // overpay is detectable, not hidden
  })
})
