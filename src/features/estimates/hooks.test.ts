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
const maybeAdvanceStage = vi.fn()
vi.mock('@/features/clients/hooks', () => ({
  maybeAdvanceStage: (...args: unknown[]) => maybeAdvanceStage(...args),
}))

import { queryClient } from '@/lib/queryClient'
import { localToday } from '@/lib/format'
import {
  createDepositInvoice,
  createEstimate,
  declineEstimate,
  setEstimateStatus,
  renewEstimate,
  convertToInvoice,
  createJobFromEstimate,
  updateEstimate,
  deleteEstimate,
  type EstimateDetail,
  type EstimateListRow,
} from './hooks'
import type { InvoiceBalance, InvoiceDetail } from '@/features/invoices/hooks'

const tables = () => enqueue.mock.calls.map((c) => (c[0] as { table: string }).table)

beforeEach(() => {
  enqueue.mockClear()
  createOneOffJob.mockClear()
  maybeAdvanceStage.mockClear()
})
afterEach(() => queryClient.clear())

describe('setEstimateStatus → stage reconciliation', () => {
  const seedDetail = (clientId: string) =>
    queryClient.setQueryData(['estimates', 'e1'], {
      estimate: { id: 'e1', client_id: clientId },
      items: [],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail)

  it('sent advances the client toward quoted', async () => {
    seedDetail('c1')
    await setEstimateStatus('e1', 'sent')
    expect(maybeAdvanceStage).toHaveBeenCalledWith('c1', 'quoted')
  })

  it('accepted does NOT auto-advance the stage', async () => {
    seedDetail('c1')
    await setEstimateStatus('e1', 'accepted')
    expect(maybeAdvanceStage).not.toHaveBeenCalled()
  })
})

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

describe('renewEstimate', () => {
  it('clones items into a fresh draft with a future valid-until', async () => {
    const detail = {
      estimate: { id: 'old', client_id: 'c1', property_id: 'p1', notes: 'redo' },
      items: [
        { description: 'Mow', quantity: 2, unit_price_cents: 5000 },
        { description: 'Trim', quantity: 1, unit_price_cents: 1500 },
      ],
      client: { id: 'c1', name: 'Pat', phone: '555' },
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail

    const newId = await renewEstimate(detail)
    expect(newId).not.toBe('old')

    const fresh = queryClient.getQueryData<EstimateDetail>(['estimates', newId])!
    expect(fresh.estimate.status).toBe('draft')
    expect(fresh.estimate.valid_until! > localToday()).toBe(true)
    expect(fresh.items.map((i) => i.description)).toEqual(['Mow', 'Trim'])
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

describe('declineEstimate', () => {
  it('flips status and stores the trimmed loss reason', async () => {
    queryClient.setQueryData<EstimateListRow[]>(
      ['estimates'],
      [{ id: 'e1', status: 'sent' } as EstimateListRow],
    )
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], {
      estimate: { id: 'e1', status: 'sent' },
      items: [],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail)

    await declineEstimate('e1', '  Price too high  ')

    const row = queryClient.getQueryData<EstimateListRow[]>(['estimates'])![0]
    expect(row.status).toBe('declined')
    expect(row.decline_reason).toBe('Price too high')
    expect(enqueue).toHaveBeenCalledWith({
      table: 'estimates',
      kind: 'update',
      payload: {
        id: 'e1',
        patch: { status: 'declined', decline_reason: 'Price too high' },
      },
    })
  })
})

describe('updateEstimate', () => {
  const seededDetail = () => {
    const detail = {
      estimate: { id: 'e1', client_id: 'c1', status: 'draft', notes: 'old' },
      items: [
        {
          id: 'i1',
          estimate_id: 'e1',
          description: 'Mow',
          quantity: 1,
          unit_price_cents: 5000,
          sort_order: 0,
        },
        {
          id: 'i2',
          estimate_id: 'e1',
          description: 'Trim',
          quantity: 2,
          unit_price_cents: 1500,
          sort_order: 1,
        },
      ],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)
    queryClient.setQueryData<EstimateListRow[]>(
      ['estimates'],
      [{ id: 'e1', status: 'draft', total_cents: 8000 } as EstimateListRow],
    )
    return detail
  }

  it('keeps existing item ids, inserts new lines, deletes removed ones (FIFO)', async () => {
    const detail = seededDetail()

    // Keep i1 (price bumped), drop i2, add a new line.
    await updateEstimate(detail, {
      items: [
        { id: 'i1', description: 'Mow', quantity: 1, unit_price_cents: 6500 },
        { description: 'Edge', quantity: 1, unit_price_cents: 2000 },
      ],
      notes: 'new notes',
      validUntil: '2026-08-21',
    })

    const fresh = queryClient.getQueryData<EstimateDetail>(['estimates', 'e1'])!
    expect(fresh.estimate.notes).toBe('new notes')
    expect(fresh.estimate.valid_until).toBe('2026-08-21')
    expect(fresh.items.map((i) => i.description)).toEqual(['Mow', 'Edge'])
    expect(fresh.items[0].id).toBe('i1') // existing row kept its id
    expect(fresh.items[0].unit_price_cents).toBe(6500)

    const list = queryClient.getQueryData<EstimateListRow[]>(['estimates'])!
    expect(list[0].total_cents).toBe(8500) // 1×6500 + 1×2000, i2 gone

    // FIFO: estimate patch → item upserts → item delete.
    expect(tables()).toEqual([
      'estimates',
      'estimate_items',
      'estimate_items',
      'estimate_items',
    ])
    const kinds = enqueue.mock.calls.map((c) => (c[0] as { kind: string }).kind)
    expect(kinds).toEqual(['update', 'upsert', 'upsert', 'delete'])
    const deleted = enqueue.mock.calls.at(-1)![0] as { payload: { id: string } }
    expect(deleted.payload.id).toBe('i2')
  })
})

describe('deleteEstimate', () => {
  it('drops caches and deletes items before the estimate row (FK order)', async () => {
    const detail = {
      estimate: { id: 'e1', status: 'draft' },
      items: [{ id: 'i1' }, { id: 'i2' }],
      client: null,
      property: null,
      linkedInvoiceId: null,
    } as unknown as EstimateDetail
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)
    queryClient.setQueryData<EstimateListRow[]>(
      ['estimates'],
      [{ id: 'e1' } as EstimateListRow, { id: 'e2' } as EstimateListRow],
    )

    await deleteEstimate(detail)

    const list = queryClient.getQueryData<EstimateListRow[]>(['estimates'])!
    expect(list.map((r) => r.id)).toEqual(['e2'])
    expect(queryClient.getQueryData(['estimates', 'e1'])).toBeUndefined()

    expect(tables()).toEqual(['estimate_items', 'estimate_items', 'estimates'])
    const kinds = enqueue.mock.calls.map((c) => (c[0] as { kind: string }).kind)
    expect(kinds).toEqual(['delete', 'delete', 'delete'])
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
      linkedInvoices: [],
    } as unknown as EstimateDetail
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)

    const invId = await convertToInvoice(detail, 15, 0)

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

describe('deposits', () => {
  const acceptedDetail = () =>
    ({
      estimate: { id: 'e1', client_id: 'c1', number: 'EST-1', status: 'accepted' },
      items: [
        {
          id: 'i1',
          description: 'Pavers',
          quantity: 1,
          unit_price_cents: 10000,
          sort_order: 0,
        },
      ],
      client: { id: 'c1', name: 'Pat', phone: '555' },
      property: null,
      linkedInvoiceId: null,
      linkedInvoices: [],
    }) as unknown as EstimateDetail

  it('createDepositInvoice makes a flagged single-line invoice with taxed balance', async () => {
    const detail = acceptedDetail()
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)

    const invId = await createDepositInvoice(detail, 5000, 14, 700)

    const invoiceOp = enqueue.mock.calls
      .map((c) => c[0] as { table: string; payload: Record<string, unknown> })
      .find((o) => o.table === 'invoices')!
    expect(invoiceOp.payload.is_deposit).toBe(true)
    expect(invoiceOp.payload.estimate_id).toBe('e1')
    expect(invoiceOp.payload.tax_bps).toBe(700)

    const inv = queryClient.getQueryData<InvoiceDetail>(['invoices', invId])!
    expect(inv.items).toHaveLength(1)
    expect(inv.items[0].description).toBe('Deposit — EST-1')
    expect(inv.items[0].unit_price_cents).toBe(5000)

    const bal = queryClient.getQueryData<InvoiceBalance[]>(['invoices'])![0]
    expect(bal.total_cents).toBe(5350) // 5000 + 7% tax

    // The estimate now knows about its deposit (drives the deduct note).
    const est = queryClient.getQueryData<EstimateDetail>(['estimates', 'e1'])!
    expect(est.linkedInvoices).toEqual([
      expect.objectContaining({ is_deposit: true, subtotal_cents: 5000 }),
    ])
    expect(est.linkedInvoiceId).toBeNull() // a deposit is not the final invoice
  })

  it('convertToInvoice deducts non-void deposits with a negative line', async () => {
    const detail = acceptedDetail()
    detail.linkedInvoices = [
      {
        invoice_id: 'dep1',
        number: 'INV-9',
        status: 'sent',
        is_deposit: true,
        subtotal_cents: 4000,
      },
      {
        invoice_id: 'dep2',
        number: 'INV-10',
        status: 'void',
        is_deposit: true,
        subtotal_cents: 9999,
      },
    ]
    queryClient.setQueryData<EstimateDetail>(['estimates', 'e1'], detail)

    const invId = await convertToInvoice(detail, 14, 0)

    const inv = queryClient.getQueryData<InvoiceDetail>(['invoices', invId])!
    expect(inv.items.map((i) => i.description)).toEqual([
      'Pavers',
      'Less deposit received (INV-9)', // void deposit excluded
    ])
    expect(inv.items[1].unit_price_cents).toBe(-4000)

    const bal = queryClient
      .getQueryData<InvoiceBalance[]>(['invoices'])!
      .find((b) => b.invoice_id === invId)!
    expect(bal.total_cents).toBe(6000) // 10000 − 4000
  })

  it('handles a client-less estimate (lead without a contact card) without crashing', async () => {
    const detail = acceptedDetail()
    detail.client = null

    const invId = await createDepositInvoice(detail, 5000, 14, 0)

    expect(
      queryClient.getQueryData<InvoiceDetail>(['invoices', invId])!.client,
    ).toBeNull()
    expect(queryClient.getQueryData<InvoiceBalance[]>(['invoices'])![0].client).toBeNull()
  })

  it('prepends to a warm invoice list instead of clobbering it', async () => {
    const existing = { invoice_id: 'other' } as InvoiceBalance
    queryClient.setQueryData<InvoiceBalance[]>(['invoices'], [existing])

    const invId = await createDepositInvoice(acceptedDetail(), 5000, 14, 0)

    const list = queryClient.getQueryData<InvoiceBalance[]>(['invoices'])!
    expect(list.map((b) => b.invoice_id)).toEqual([invId, 'other'])
  })

  it('falls back to generic labels when numbers are not assigned yet', async () => {
    // Offline-created rows have no server-assigned numbers — labels degrade.
    const detail = acceptedDetail()
    detail.estimate = { ...detail.estimate, number: null }
    detail.linkedInvoices = [
      {
        invoice_id: 'dep1',
        number: null,
        status: 'sent',
        is_deposit: true,
        subtotal_cents: 1000,
      },
    ]

    await createDepositInvoice(detail, 5000, 14, 0)
    const depositLine = enqueue.mock.calls
      .map((c) => c[0] as { table: string; payload: { description?: string } })
      .find((o) => o.table === 'invoice_items')!
    expect(depositLine.payload.description).toBe('Deposit — estimate')

    const invId = await convertToInvoice(detail, 14, 0)
    const inv = queryClient.getQueryData<InvoiceDetail>(['invoices', invId])!
    expect(inv.items.map((i) => i.description)).toContain(
      'Less deposit received (deposit)',
    )
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
