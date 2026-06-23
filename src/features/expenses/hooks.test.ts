import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Importing expenses/hooks pulls in the supabase client (env-dependent); stub it —
// these tests exercise only the in-memory cache helpers + outbox payloads.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))

import { queryClient } from '@/lib/queryClient'
import {
  createExpense,
  deleteExpense,
  monthExpenseCents,
  updateExpense,
  type ExpenseRow,
} from './hooks'
import { categoryLabel } from './categories'

afterEach(() => {
  queryClient.clear()
  enqueue.mockClear()
})

describe('monthExpenseCents', () => {
  const rows = [
    { spent_on: '2026-06-02', amount_cents: 1500 },
    { spent_on: '2026-06-30', amount_cents: 500 },
    { spent_on: '2026-05-31', amount_cents: 9999 },
  ] as ExpenseRow[]

  it('sums only the rows in the given month', () => {
    expect(monthExpenseCents(rows, '2026-06')).toBe(2000)
    expect(monthExpenseCents(rows, '2026-05')).toBe(9999)
    expect(monthExpenseCents(rows, '2026-07')).toBe(0)
  })

  it('treats undefined as zero', () => {
    expect(monthExpenseCents(undefined, '2026-06')).toBe(0)
  })
})

describe('categoryLabel', () => {
  it('maps known values and falls back to the raw value', () => {
    expect(categoryLabel('fuel')).toBe('Fuel')
    expect(categoryLabel('mystery')).toBe('mystery')
  })
})

describe('createExpense', () => {
  it('prepends an optimistic row and enqueues a clean upsert', async () => {
    queryClient.setQueryData<ExpenseRow[]>(['expenses'], [])
    const id = await createExpense({
      category: 'supplies',
      amountCents: 4200,
      spentOn: '2026-06-22',
      vendor: 'Depot',
      note: '',
      paymentMethod: 'card',
      jobId: null,
      clientId: null,
    })

    const list = queryClient.getQueryData<ExpenseRow[]>(['expenses'])
    expect(list).toHaveLength(1)
    expect(list?.[0].id).toBe(id)
    expect(list?.[0].amount_cents).toBe(4200)
    expect(queryClient.getQueryData<ExpenseRow>(['expenses', id])?.vendor).toBe('Depot')

    expect(enqueue).toHaveBeenCalledTimes(1)
    const op = enqueue.mock.calls[0][0]
    expect(op).toMatchObject({ table: 'expenses', kind: 'upsert' })
    // DB owns these — never sent in the payload.
    expect(op.payload).not.toHaveProperty('user_id')
    expect(op.payload).not.toHaveProperty('org_id')
    expect(op.payload).not.toHaveProperty('created_at')
    expect(op.payload).not.toHaveProperty('updated_at')
  })
})

describe('updateExpense / deleteExpense', () => {
  const seed: ExpenseRow = {
    id: 'e1',
    category: 'fuel',
    amount_cents: 1000,
    spent_on: '2026-06-10',
    vendor: '',
    note: '',
    payment_method: 'cash',
    job_id: null,
    client_id: null,
    payee_id: null,
    created_at: '',
    updated_at: '',
    user_id: '',
    org_id: '',
    client: null,
    job: null,
  }

  it('patches both caches and enqueues an update', async () => {
    queryClient.setQueryData<ExpenseRow[]>(['expenses'], [seed])
    queryClient.setQueryData<ExpenseRow>(['expenses', 'e1'], seed)

    await updateExpense('e1', { amount_cents: 2500 })

    expect(queryClient.getQueryData<ExpenseRow[]>(['expenses'])?.[0].amount_cents).toBe(
      2500,
    )
    expect(queryClient.getQueryData<ExpenseRow>(['expenses', 'e1'])?.amount_cents).toBe(
      2500,
    )
    expect(enqueue).toHaveBeenCalledWith({
      table: 'expenses',
      kind: 'update',
      payload: { id: 'e1', patch: { amount_cents: 2500 } },
    })
  })

  it('removes from the list cache and enqueues a delete', async () => {
    queryClient.setQueryData<ExpenseRow[]>(['expenses'], [seed])

    await deleteExpense('e1')

    expect(queryClient.getQueryData<ExpenseRow[]>(['expenses'])).toHaveLength(0)
    expect(enqueue).toHaveBeenCalledWith({
      table: 'expenses',
      kind: 'delete',
      payload: { id: 'e1' },
    })
  })
})
