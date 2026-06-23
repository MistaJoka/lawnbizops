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
  type CreateInvoiceInput,
  type InvoiceBalance,
  type InvoiceDetail,
  type UninvoicedJob,
} from './hooks'
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
