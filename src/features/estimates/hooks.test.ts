import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate cache + outbox behaviour: stub the supabase client and the outbox, and
// mock the jobs module so createJobFromEstimate's delegation is observable.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
const createOneOffJob = vi.fn()
vi.mock('@/features/jobs/hooks', () => ({
  createOneOffJob: (...args: unknown[]) => createOneOffJob(...args),
  markJobsInvoicedInCaches: vi.fn(),
  restoreInvoicedJobInCaches: vi.fn(),
}))

import { queryClient } from '@/lib/queryClient'
import {
  createEstimate,
  setEstimateStatus,
  convertToInvoice,
  createJobFromEstimate,
  type EstimateDetail,
  type EstimateListRow,
} from './hooks'
import type { InvoiceBalance, InvoiceDetail } from '@/features/invoices/hooks'

const tables = () => enqueue.mock.calls.map((c) => (c[0] as { table: string }).table)

beforeEach(() => {
  enqueue.mockClear()
  createOneOffJob.mockClear()
})
afterEach(() => queryClient.clear())

describe('createEstimate', () => {
  it('writes detail + list caches and enqueues estimate before items (FIFO)', async () => {
    const id = await createEstimate({
      clientId: 'c1',
      client: { name: 'Pat', phone: '555' },
      propertyId: 'p1',
      property: null,
      items: [
        { description: 'Mow', quantity: 1, unit_price_cents: 5000 },
        { description: 'Trim', quantity: 2, unit_price_cents: 1500 },
      ],
      notes: 'n',
      validUntil: null,
    })

    const detail = queryClient.getQueryData<EstimateDetail>(['estimates', id])!
    expect(detail.estimate.status).toBe('draft')
    expect(detail.items).toHaveLength(2)

    const list = queryClient.getQueryData<EstimateListRow[]>(['estimates'])!
    expect(list[0].id).toBe(id)
    expect(list[0].total_cents).toBe(8000) // 1×5000 + 2×1500

    // FIFO: the estimate row must land before its item rows.
    expect(tables()).toEqual(['estimates', 'estimate_items', 'estimate_items'])
  })
})

describe('setEstimateStatus', () => {
  function seedEstimate(status: string) {
    queryClient.setQueryData<EstimateListRow[]>(
      ['estimates'],
      [{ id: 'e1', status } as EstimateListRow],
    )
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], {
      estimate: { id: 'e1', status },
      items: [],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail)
  }

  it('forward: accepted — patches both caches and enqueues update', async () => {
    seedEstimate('draft')
    await setEstimateStatus('e1', 'accepted')

    expect(queryClient.getQueryData<EstimateListRow[]>(['estimates'])![0].status).toBe(
      'accepted',
    )
    expect(
      queryClient.getQueryData<EstimateDetail>(['estimates', 'e1'])!.estimate.status,
    ).toBe('accepted')
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'estimates', kind: 'update' }),
    )
  })

  it('backward: declined — patches both caches and enqueues update', async () => {
    seedEstimate('sent')
    await setEstimateStatus('e1', 'declined')

    expect(queryClient.getQueryData<EstimateListRow[]>(['estimates'])![0].status).toBe(
      'declined',
    )
    expect(
      queryClient.getQueryData<EstimateDetail>(['estimates', 'e1'])!.estimate.status,
    ).toBe('declined')
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'estimates', kind: 'update' }),
    )
  })
})

describe('convertToInvoice', () => {
  it('creates a draft invoice linked to the estimate, copies items, links back', async () => {
    const detail = {
      estimate: { id: 'e1', client_id: 'c1', number: 'EST-1' },
      items: [
        {
          id: 'i1',
          description: 'Mow',
          quantity: 1,
          unit_price_cents: 5000,
          sort_order: 0,
        },
        {
          id: 'i2',
          description: 'Trim',
          quantity: 2,
          unit_price_cents: 1500,
          sort_order: 1,
        },
      ],
      client: { id: 'c1', name: 'Pat', phone: '555' },
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)

    const invId = await convertToInvoice(detail, 15)

    const inv = queryClient.getQueryData<InvoiceDetail>(['invoices', invId])!
    expect(inv.invoice.status).toBe('draft')
    expect(inv.invoice.estimate_id).toBe('e1')
    expect(inv.items).toHaveLength(2)
    expect(inv.payments).toEqual([])

    const bal = queryClient.getQueryData<InvoiceBalance[]>(['invoices'])![0]
    expect(bal.total_cents).toBe(8000)
    expect(bal.balance_cents).toBe(8000)

    // The estimate now points at its invoice (so the UI can show "invoiced").
    expect(
      queryClient.getQueryData<EstimateDetail>(['estimates', 'e1'])!.linkedInvoiceId,
    ).toBe(invId)

    // FIFO: the invoice row must land before its item rows.
    expect(tables()).toEqual(['invoices', 'invoice_items', 'invoice_items'])
  })
})

describe('createJobFromEstimate', () => {
  it('refuses when the estimate has no property (jobs are property-bound)', async () => {
    const detail = {
      estimate: { id: 'e1' },
      items: [],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail

    await expect(createJobFromEstimate(detail, '2026-06-20')).rejects.toThrow(/property/i)
    expect(createOneOffJob).not.toHaveBeenCalled()
  })

  it('creates a one-off job priced from the estimate items', async () => {
    const detail = {
      estimate: { id: 'e1', number: 'EST-1', notes: 'scope' },
      items: [{ description: 'Mow', quantity: 1, unit_price_cents: 5000 }],
      client: { id: 'c1', name: 'Pat', phone: '555' },
      property: { id: 'p1' },
      linkedInvoiceId: null,
    } as unknown as EstimateDetail

    await createJobFromEstimate(detail, '2026-06-20')

    expect(createOneOffJob).toHaveBeenCalledTimes(1)
    const arg = createOneOffJob.mock.calls[0][0] as {
      price_cents: number
      title: string
      property_id: string
    }
    expect(arg.price_cents).toBe(5000)
    expect(arg.property_id).toBe('p1')
    expect(arg.title).toContain('EST-1')
  })
})
