import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache + outbox logic: stub the env-dependent supabase client and
// capture enqueue ops, mock the toast so nothing renders.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))
vi.mock('@/features/clients/hooks', () => ({ maybeAdvanceStage: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import { emailInvoice, type InvoiceDetail } from './hooks'
import { emailEstimate, type EstimateDetail } from '@/features/estimates/hooks'

// The email-send seam (0036): sending is a queue_email RPC through the client
// outbox — offline-safe, delivered server-side. The only optimistic mutation
// allowed here is the draft → sent status flip; sent_at belongs to the server.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Op = { table: string; kind: string; payload: Record<string, unknown> }
const ops = () => enqueue.mock.calls.map(([op]) => op as Op)
const emailOps = () => ops().filter((op) => op.table === 'email_outbox')

const invoiceDetail = (status: string, email?: string): InvoiceDetail =>
  ({
    invoice: { id: 'inv-1', status },
    items: [],
    payments: [],
    client: { id: 'c1', name: 'Acme', phone: '555', email },
  }) as unknown as InvoiceDetail

const estimateDetail = (status: string, email?: string): EstimateDetail =>
  ({
    estimate: { id: 'est-1', status, client_id: 'c1' },
    items: [],
    client: { id: 'c1', name: 'Acme', phone: '555', email },
    property: null,
    linkedInvoiceId: null,
    linkedInvoices: [],
  }) as unknown as EstimateDetail

beforeEach(() => {
  enqueue.mockClear()
  queryClient.clear()
})

describe('emailInvoice', () => {
  it('refuses when the client has no email address', async () => {
    await expect(emailInvoice(invoiceDetail('sent'))).rejects.toThrow(
      'Client has no email',
    )
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('queues an invoice_send email keyed to the invoice, with a client-side id', async () => {
    await emailInvoice(invoiceDetail('sent', 'a@b.co'))

    expect(emailOps()).toHaveLength(1)
    const { fn, args } = emailOps()[0].payload as {
      fn: string
      args: Record<string, string>
    }
    expect(emailOps()[0].kind).toBe('rpc')
    expect(fn).toBe('queue_email')
    expect(args.p_template).toBe('invoice_send')
    expect(args.p_entity_id).toBe('inv-1')
    expect(args.p_id).toMatch(UUID_RE) // idempotent retry key
  })

  it('flips a draft to sent before queueing, in FIFO order', async () => {
    await emailInvoice(invoiceDetail('draft', 'a@b.co'))

    const tables = ops().map((op) => op.table)
    expect(tables).toEqual(['invoices', 'email_outbox'])
    expect(ops()[0].payload.patch).toEqual({ status: 'sent' })
  })

  it('does not touch the status of an already-sent invoice', async () => {
    await emailInvoice(invoiceDetail('sent', 'a@b.co'))
    expect(ops().map((op) => op.table)).toEqual(['email_outbox'])
  })
})

describe('emailEstimate', () => {
  it('refuses when the client has no email address', async () => {
    await expect(emailEstimate(estimateDetail('sent'))).rejects.toThrow(
      'Client has no email',
    )
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('queues an estimate_send email keyed to the estimate', async () => {
    await emailEstimate(estimateDetail('sent', 'a@b.co'))

    expect(emailOps()).toHaveLength(1)
    const { fn, args } = emailOps()[0].payload as {
      fn: string
      args: Record<string, string>
    }
    expect(fn).toBe('queue_email')
    expect(args.p_template).toBe('estimate_send')
    expect(args.p_entity_id).toBe('est-1')
  })

  it('flips a draft to sent first (the quote officially goes out)', async () => {
    await emailEstimate(estimateDetail('draft', 'a@b.co'))
    expect(ops().map((op) => op.table)).toEqual(['estimates', 'email_outbox'])
    expect(ops()[0].payload.patch).toEqual({ status: 'sent' })
  })
})
