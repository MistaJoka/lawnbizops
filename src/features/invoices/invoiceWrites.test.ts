import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache + outbox logic: stub the env-dependent supabase client and
// capture enqueue ops, mock the toast so nothing renders.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import {
  createInvoiceFromJobs,
  markSent,
  voidInvoice,
  getLastPaymentMethod,
  rememberPaymentMethod,
  type CreateInvoiceInput,
  type InvoiceBalance,
  type InvoiceDetail,
  type Payment,
  type UninvoicedJob,
} from './hooks'

describe('last payment method memory', () => {
  let store: Map<string, string>
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('defaults to cash when nothing is stored', () => {
    expect(getLastPaymentMethod()).toBe('cash')
  })

  it('round-trips a remembered method', () => {
    rememberPaymentMethod('zelle')
    expect(getLastPaymentMethod()).toBe('zelle')
  })

  it('ignores a stored value that is not a known method', () => {
    store.set('lbo:lastPaymentMethod', 'bitcoin')
    expect(getLastPaymentMethod()).toBe('cash')
  })
})
import type { JobWithContext } from '@/features/jobs/hooks'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const job = (id: string, price: number): UninvoicedJob => ({
  id,
  title: `Job ${id}`,
  scheduled_date: '2026-06-20',
  completed_at: null,
  price_cents: price,
  property: { client_id: 'c1', label: 'Front', address_line1: '1 Elm' },
  service: { name: 'Mow' },
})

const baseInput = (jobs: UninvoicedJob[]): CreateInvoiceInput => ({
  clientId: 'c1',
  client: { name: 'Acme', phone: '555' },
  jobs,
  extraItems: [{ description: 'Dump fee', quantity: 2, unit_price_cents: 1500 }],
  defaultDueDays: 7,
  taxBps: 0,
})

const balance = (id: string) =>
  queryClient
    .getQueryData<InvoiceBalance[]>(['invoices'])!
    .find((r) => r.invoice_id === id)!
const detail = (id: string) => queryClient.getQueryData<InvoiceDetail>(['invoices', id])!

type EnqueueOp = {
  table: string
  kind: string
  payload: Record<string, unknown>
}
const ops = () => enqueue.mock.calls.map((c) => c[0] as EnqueueOp)

beforeEach(() => {
  enqueue.mockClear()
  // Seed the uninvoiced list so the optimistic removal has something to drop.
  queryClient.setQueryData(['jobs', { uninvoicedFor: 'c1' }], [job('j1', 5000)])
})
afterEach(() => queryClient.clear())

describe('createInvoiceFromJobs', () => {
  it('builds a draft invoice with server-assigned numbering (number stays null)', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    expect(id).toMatch(UUID_RE)
    expect(detail(id).invoice.status).toBe('draft')
    // INV-n numbering is owned by a DB trigger — the client never sets it.
    expect(detail(id).invoice.number).toBeNull()
    expect(balance(id).number).toBeNull()
  })

  it('a 7% tax rate is snapshotted and added on top of the subtotal', async () => {
    const id = await createInvoiceFromJobs({ ...baseInput([job('j1', 5000)]), taxBps: 700 })

    const op = ops().find((o) => o.table === 'invoices' && o.kind === 'upsert')!
    expect(op.payload.tax_bps).toBe(700) // snapshot rides the row
    expect(balance(id).subtotal_cents).toBe(8000)
    expect(balance(id).tax_cents).toBe(560) // round(8000 * 700 / 10000)
    expect(balance(id).total_cents).toBe(8560)
    expect(balance(id).balance_cents).toBe(8560)
  })

  it('totals job prices + extra lines into cents (5000 + 2*1500)', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    expect(balance(id).total_cents).toBe(8000)
    expect(balance(id).paid_cents).toBe(0)
    expect(balance(id).balance_cents).toBe(8000)
  })

  it('uses date-only strings for issued_at and due_at', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    expect(balance(id).issued_at).toMatch(DATE_ONLY)
    expect(balance(id).due_at).toMatch(DATE_ONLY)
  })

  it('removes the invoiced jobs from the uninvoiced list optimistically', async () => {
    await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    const left = queryClient.getQueryData<UninvoicedJob[]>([
      'jobs',
      { uninvoicedFor: 'c1' },
    ])
    expect(left).toEqual([])
  })

  it('enqueues in FIFO order: invoice → items → job status flips', async () => {
    await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    const tables = ops().map((o) => o.table)
    const firstItem = tables.indexOf('invoice_items')
    const firstJob = tables.indexOf('jobs')
    expect(tables[0]).toBe('invoices')
    expect(firstItem).toBeGreaterThan(0)
    expect(firstJob).toBeGreaterThan(firstItem) // jobs flip only after items land
  })

  it('never puts number/user_id/timestamps in the invoice or item payloads', async () => {
    await createInvoiceFromJobs(baseInput([job('j1', 5000)]))

    const forbidden = ['number', 'user_id', 'created_at', 'updated_at']
    for (const op of ops().filter(
      (o) => o.table === 'invoices' || o.table === 'invoice_items',
    )) {
      for (const key of forbidden) expect(op.payload).not.toHaveProperty(key)
    }
  })
})

describe('markSent', () => {
  it('flips both caches to sent and enqueues the status update', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))
    enqueue.mockClear()

    await markSent(id)

    expect(balance(id).status).toBe('sent')
    expect(detail(id).invoice.status).toBe('sent')
    expect(ops()).toHaveLength(1)
    expect(ops()[0]).toMatchObject({
      table: 'invoices',
      kind: 'update',
      payload: { id, patch: { status: 'sent' } },
    })
  })
})

describe('voidInvoice with payments', () => {
  const pay = (pid: string, invoiceId: string, cents: number, note = ''): Payment => ({
    id: pid,
    invoice_id: invoiceId,
    amount_cents: cents,
    method: 'cash',
    paid_at: '2026-06-21',
    note,
    created_at: '',
    updated_at: '',
    user_id: '',
    org_id: '',
  })

  it('reverses each unreversed payment before the void flip lands', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))
    queryClient.setQueryData<InvoiceDetail>(['invoices', id], (old) => ({
      ...old!,
      payments: [
        pay('p1', id, 3000),
        pay('p2', id, 2000),
        pay('p3', id, -2000, 'Reversal of p2'), // p2 already reversed by hand
      ],
    }))
    enqueue.mockClear()

    await voidInvoice(id)

    const all = ops()
    const reversals = all.filter((o) => o.kind === 'rpc')
    // Only p1 needs reversing — p2's reversal exists, p3 is itself a reversal.
    expect(reversals).toHaveLength(1)
    expect(reversals[0].payload).toMatchObject({
      fn: 'apply_payment',
      args: { p_invoice_id: id, p_amount_cents: -3000 },
    })
    // FIFO: the reversal reaches the server while the invoice is still live.
    const voidIdx = all.findIndex((o) => o.table === 'invoices')
    expect(all.indexOf(reversals[0])).toBeLessThan(voidIdx)
    expect(balance(id).status).toBe('void')
  })
})

describe('voidInvoice', () => {
  it('voids the invoice, returns its job to done, and logs an activity', async () => {
    const id = await createInvoiceFromJobs(baseInput([job('j1', 5000)]))
    // The job is now 'invoiced' in its detail cache — seed that so void can restore it.
    queryClient.setQueryData<JobWithContext>(['jobs', 'j1'], {
      id: 'j1',
      status: 'invoiced',
    } as JobWithContext)
    enqueue.mockClear()

    await voidInvoice(id)

    expect(balance(id).status).toBe('void')
    expect(detail(id).invoice.status).toBe('void')
    expect(queryClient.getQueryData<JobWithContext>(['jobs', 'j1'])!.status).toBe('done')

    const tables = ops().map((o) => o.table)
    expect(tables[0]).toBe('invoices') // void flip first
    expect(tables).toContain('jobs') // job returned to done
    expect(tables).toContain('activities') // audit trail appended
    const jobOp = ops().find((o) => o.table === 'jobs')!
    expect(jobOp.payload).toMatchObject({ id: 'j1', patch: { status: 'done' } })
  })
})
