import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache + outbox logic: stub the env-dependent supabase client and
// capture enqueue ops, mock the toast so nothing renders.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import { batchInvoiceUnbilled } from './hooks'
import type { UnbilledJobRow } from '@/features/jobs/attention'

// The one-tap monthly billing motion (C3): one draft invoice per client with
// unbilled done work. Intent from the docstring: group by client, sequential
// FIFO per invoice, return the number of invoices created.

const row = (
  id: string,
  clientId: string | undefined,
  price: number,
  clientName = 'Client',
): UnbilledJobRow => ({
  id,
  title: `Job ${id}`,
  scheduled_date: '2026-07-01',
  completed_at: '2026-07-01T15:00:00Z',
  price_cents: price,
  property: clientId ? { client_id: clientId, client: { name: clientName } } : null,
})

type Op = { table: string; kind: string; payload: Record<string, unknown> }
const ops = () => enqueue.mock.calls.map(([op]) => op as Op)
const invoiceOps = () => ops().filter((op) => op.table === 'invoices')
const itemOps = () => ops().filter((op) => op.table === 'invoice_items')

describe('batchInvoiceUnbilled', () => {
  beforeEach(() => {
    enqueue.mockClear()
    queryClient.clear()
  })
  afterEach(() => queryClient.clear())

  it('creates one draft invoice per client and reports the count', async () => {
    const created = await batchInvoiceUnbilled(
      [row('j1', 'ca', 5000), row('j2', 'cb', 7500), row('j3', 'ca', 2500)],
      14,
      700,
    )
    expect(created).toBe(2)
    expect(invoiceOps()).toHaveLength(2)

    // Every job lands as a line on its own client's invoice — none dropped,
    // none cross-billed.
    const invoiceByClient = new Map(
      invoiceOps().map((op) => [op.payload.client_id, op.payload.id]),
    )
    const linesOn = (invoiceId: unknown) =>
      itemOps().filter((op) => op.payload.invoice_id === invoiceId)
    expect(linesOn(invoiceByClient.get('ca'))).toHaveLength(2)
    expect(linesOn(invoiceByClient.get('cb'))).toHaveLength(1)
  })

  it('snapshots the tax rate onto every created invoice', async () => {
    await batchInvoiceUnbilled([row('j1', 'ca', 5000)], 14, 650)
    expect(invoiceOps()[0].payload.tax_bps).toBe(650)
  })

  it('skips rows with no client linkage instead of mis-billing them', async () => {
    const created = await batchInvoiceUnbilled(
      [row('j1', 'ca', 5000), row('orphan', undefined, 9999)],
      14,
      0,
    )
    expect(created).toBe(1)
    const billedJobIds = itemOps().map((op) => op.payload.job_id)
    expect(billedJobIds).toContain('j1')
    expect(billedJobIds).not.toContain('orphan')
  })

  it('accepts the demo-backend row shape (client.id, no client_id)', async () => {
    const demoRow: UnbilledJobRow = {
      ...row('j1', undefined, 4000),
      property: { client: { id: 'cd', name: 'Demo Client' } },
    }
    const created = await batchInvoiceUnbilled([demoRow], 14, 0)
    expect(created).toBe(1)
    expect(invoiceOps()[0].payload.client_id).toBe('cd')
  })

  it('keeps FIFO per invoice: the invoice upsert lands before its items', async () => {
    await batchInvoiceUnbilled([row('j1', 'ca', 5000), row('j2', 'cb', 7500)], 14, 0)
    const seen = new Set<unknown>()
    for (const op of ops()) {
      if (op.table === 'invoices') seen.add(op.payload.id)
      if (op.table === 'invoice_items') expect(seen).toContain(op.payload.invoice_id)
    }
  })

  it('creates nothing and reports zero for an empty batch', async () => {
    expect(await batchInvoiceUnbilled([], 14, 700)).toBe(0)
    expect(enqueue).not.toHaveBeenCalled()
  })
})
