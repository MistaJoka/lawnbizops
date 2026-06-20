import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache math: stub the supabase client (env-dependent) and the
// outbox so these tests exercise only the optimistic setQueryData logic.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))

import { queryClient } from '@/lib/queryClient'
import {
  reversePayment,
  type InvoiceBalance,
  type InvoiceDetail,
  type InvoiceItem,
  type Payment,
} from './hooks'

const ID = 'inv1'

const payment = (id: string, amount: number): Payment =>
  ({
    id,
    invoice_id: ID,
    amount_cents: amount,
    method: 'cash',
    paid_at: '2026-06-20',
    note: '',
  }) as Payment

const item = (cents: number): InvoiceItem =>
  ({ id: 'it1', invoice_id: ID, quantity: 1, unit_price_cents: cents }) as InvoiceItem

function seed(opts: {
  payments: Payment[]
  total: number
  status: InvoiceBalance['status']
}) {
  const paid = opts.payments.reduce((s, p) => s + p.amount_cents, 0)
  queryClient.setQueryData<InvoiceDetail>(['invoices', ID], {
    invoice: { id: ID, status: opts.status } as InvoiceDetail['invoice'],
    items: [item(opts.total)],
    payments: opts.payments,
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
        status: opts.status,
      } as InvoiceBalance,
    ],
  )
}

const detail = () => queryClient.getQueryData<InvoiceDetail>(['invoices', ID])!
const balance = () =>
  queryClient
    .getQueryData<InvoiceBalance[]>(['invoices'])!
    .find((r) => r.invoice_id === ID)!

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('reversePayment optimistic caches', () => {
  it('full reversal drops paid to 0, restores balance, flips status back to sent', async () => {
    const pay = payment('p1', 10000)
    seed({ payments: [pay], total: 10000, status: 'paid' })

    await reversePayment(pay)

    expect(balance().paid_cents).toBe(0)
    expect(balance().balance_cents).toBe(10000)
    expect(balance().status).toBe('sent')
    expect(detail().invoice.status).toBe('sent')
  })

  it('partial reversal (one of two payments) leaves status partially_paid', async () => {
    const pay2 = payment('p2', 4000)
    seed({ payments: [payment('p1', 6000), pay2], total: 10000, status: 'paid' })

    await reversePayment(pay2)

    expect(balance().paid_cents).toBe(6000)
    expect(balance().balance_cents).toBe(4000)
    expect(balance().status).toBe('partially_paid')
    expect(detail().invoice.status).toBe('partially_paid')
  })

  it('appends a negative offsetting line to the detail cache, tagged as a reversal', () => {
    const pay = payment('p1', 10000)
    seed({ payments: [pay], total: 10000, status: 'paid' })

    void reversePayment(pay)

    const lines = detail().payments
    expect(lines).toHaveLength(2)
    const reversal = lines.find((l) => l.amount_cents < 0)!
    expect(reversal.amount_cents).toBe(-10000)
    expect(reversal.note).toContain('Reversal')
  })

  it('enqueues apply_payment with a negative amount', async () => {
    const pay = payment('p1', 10000)
    seed({ payments: [pay], total: 10000, status: 'paid' })

    await reversePayment(pay)

    expect(enqueue).toHaveBeenCalledTimes(1)
    const op = enqueue.mock.calls[0][0] as {
      table: string
      kind: string
      payload: { fn: string; args: { p_amount_cents: number; p_invoice_id: string } }
    }
    expect(op).toMatchObject({ table: 'payments', kind: 'rpc' })
    expect(op.payload.fn).toBe('apply_payment')
    expect(op.payload.args.p_amount_cents).toBe(-10000)
    expect(op.payload.args.p_invoice_id).toBe(ID)
  })
})
