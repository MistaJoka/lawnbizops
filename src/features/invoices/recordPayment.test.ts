import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache math: stub the supabase client (env-dependent) and the
// outbox so these tests exercise only the optimistic setQueryData logic.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import {
  recordPayment,
  type InvoiceBalance,
  type InvoiceDetail,
  type InvoiceItem,
  type Payment,
} from './hooks'

const ID = 'inv1'

const item = (cents: number): InvoiceItem =>
  ({ id: 'it1', invoice_id: ID, quantity: 1, unit_price_cents: cents }) as InvoiceItem

/** Seed a sent, unpaid invoice into both the list and detail caches. */
function seed(opts: {
  total: number
  payments?: Payment[]
  status?: InvoiceBalance['status']
}) {
  const payments = opts.payments ?? []
  const paid = payments.reduce((s, p) => s + p.amount_cents, 0)
  const status = opts.status ?? 'sent'
  queryClient.setQueryData<InvoiceDetail>(['invoices', ID], {
    invoice: { id: ID, status } as InvoiceDetail['invoice'],
    items: [item(opts.total)],
    payments,
    client: null,
  })
  queryClient.setQueryData<InvoiceBalance[]>(
    ['invoices'],
    [
      {
        invoice_id: ID,
        total_cents: opts.total,
        paid_cents: paid,
        balance_cents: opts.total - paid,
        status,
      } as InvoiceBalance,
    ],
  )
}

const detail = () => queryClient.getQueryData<InvoiceDetail>(['invoices', ID])!
const balance = () =>
  queryClient
    .getQueryData<InvoiceBalance[]>(['invoices'])!
    .find((r) => r.invoice_id === ID)!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('recordPayment optimistic caches', () => {
  it('full payment flips status to paid and zeroes the balance', async () => {
    seed({ total: 10000 })

    await recordPayment({
      invoiceId: ID,
      amountCents: 10000,
      method: 'cash',
      paidAt: '2026-06-23',
      note: '',
    })

    expect(balance().paid_cents).toBe(10000)
    expect(balance().balance_cents).toBe(0)
    expect(balance().status).toBe('paid')
    expect(detail().invoice.status).toBe('paid')
  })

  it('partial payment leaves status partially_paid with a remaining balance', async () => {
    seed({ total: 10000 })

    await recordPayment({
      invoiceId: ID,
      amountCents: 4000,
      method: 'check',
      paidAt: '2026-06-23',
      note: '',
    })

    expect(balance().paid_cents).toBe(4000)
    expect(balance().balance_cents).toBe(6000)
    expect(balance().status).toBe('partially_paid')
    expect(detail().invoice.status).toBe('partially_paid')
  })

  it('a payment that completes a partially-paid invoice flips it to paid', async () => {
    seed({
      total: 10000,
      payments: [{ id: 'p1', invoice_id: ID, amount_cents: 6000 } as Payment],
      status: 'partially_paid',
    })

    await recordPayment({
      invoiceId: ID,
      amountCents: 4000,
      method: 'cash',
      paidAt: '2026-06-23',
      note: '',
    })

    expect(balance().paid_cents).toBe(10000)
    expect(balance().balance_cents).toBe(0)
    expect(balance().status).toBe('paid')
    expect(detail().invoice.status).toBe('paid')
  })

  it('overpayment never drives status past paid or balance below zero in the list', async () => {
    seed({ total: 10000 })

    await recordPayment({
      invoiceId: ID,
      amountCents: 12000,
      method: 'cash',
      paidAt: '2026-06-23',
      note: '',
    })

    expect(balance().status).toBe('paid')
    expect(balance().balance_cents).toBeLessThanOrEqual(0)
    expect(detail().invoice.status).toBe('paid')
  })

  it('appends the payment line to the detail cache with the recorded amount and date', async () => {
    seed({ total: 10000 })

    await recordPayment({
      invoiceId: ID,
      amountCents: 4000,
      method: 'zelle',
      paidAt: '2026-06-23',
      note: 'partial',
    })

    const lines = detail().payments
    expect(lines).toHaveLength(1)
    expect(lines[0].amount_cents).toBe(4000)
    expect(lines[0].method).toBe('zelle')
    expect(lines[0].paid_at).toBe('2026-06-23')
  })

  it('enqueues apply_payment with a client uuid and the exact p_* args — no user_id/timestamps', async () => {
    seed({ total: 10000 })

    await recordPayment({
      invoiceId: ID,
      amountCents: 4000,
      method: 'cash',
      paidAt: '2026-06-23',
      note: 'n',
    })

    expect(enqueue).toHaveBeenCalledTimes(1)
    const op = enqueue.mock.calls[0][0] as {
      table: string
      kind: string
      payload: { fn: string; args: Record<string, unknown> }
    }
    expect(op).toMatchObject({ table: 'payments', kind: 'rpc' })
    expect(op.payload.fn).toBe('apply_payment')

    const args = op.payload.args
    // The enqueued id must be a client-generated UUID and match the detail line
    // (so the idempotent RPC and the optimistic row are the same payment).
    expect(args.p_id).toMatch(UUID_RE)
    expect(args.p_id).toBe(detail().payments[0].id)
    expect(args.p_invoice_id).toBe(ID)
    expect(args.p_amount_cents).toBe(4000)
    expect(args.p_paid_at).toBe('2026-06-23')
    // Iron rule: the DB owns user_id/created_at/updated_at — never in a payload.
    expect(Object.keys(args).sort()).toEqual(
      [
        'p_amount_cents',
        'p_id',
        'p_invoice_id',
        'p_method',
        'p_note',
        'p_paid_at',
      ].sort(),
    )
  })
})
