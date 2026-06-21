import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Importing jobs/hooks pulls in the supabase client (env-dependent); stub it —
// these tests exercise only the in-memory cache helpers.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))

import { queryClient } from '@/lib/queryClient'
import {
  markJobsInvoicedInCaches,
  restoreInvoicedJobInCaches,
  setJobStatus,
  type Job,
  type JobWithContext,
} from './hooks'

const job = (id: string, status: string): JobWithContext =>
  ({ id, status, scheduled_date: '2026-06-14', property: null }) as JobWithContext

afterEach(() => {
  queryClient.clear()
  enqueue.mockClear()
})

describe('setJobStatus', () => {
  it('forward: done — patches cache with completed_at and enqueues update', async () => {
    const j = job('j1', 'in_progress')
    queryClient.setQueryData(['jobs', 'j1'], j)
    queryClient.setQueryData(['jobs', 'kanban'], [j])

    await setJobStatus(j as unknown as Job, 'done')

    const updated = queryClient.getQueryData(['jobs', 'j1']) as JobWithContext
    expect(updated.status).toBe('done')
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'jobs',
        kind: 'update',
        payload: expect.objectContaining({
          patch: expect.objectContaining({
            status: 'done',
            completed_at: expect.any(String),
          }),
        }),
      }),
    )
  })

  it('backward: canceled — patches cache without completed_at and enqueues update', async () => {
    const j = job('j1', 'scheduled')
    queryClient.setQueryData(['jobs', 'j1'], j)
    queryClient.setQueryData(['jobs', 'kanban'], [j])

    await setJobStatus(j as unknown as Job, 'canceled')

    const updated = queryClient.getQueryData(['jobs', 'j1']) as JobWithContext
    expect(updated.status).toBe('canceled')
    // canceled must NOT stamp a completed_at — that would corrupt the job record
    const patch = (
      enqueue.mock.calls[0][0] as { payload: { patch: Record<string, unknown> } }
    ).payload.patch
    expect(patch.completed_at).toBeUndefined()
    expect(patch.status).toBe('canceled')
  })
})

// Reversibility made executable: invoicing flips a job done→invoiced across
// every cached view; voiding flips it back. forward ∘ inverse must = identity.
describe('invoice ⇄ void job-status cache round-trip', () => {
  it('mark-invoiced then restore returns the job to its original done state', () => {
    const j = job('j1', 'done')
    queryClient.setQueryData(['jobs', 'kanban'], [j])
    queryClient.setQueryData(['jobs', 'j1'], j)
    queryClient.setQueryData(['jobs', { date: '2026-06-14' }], [j])

    markJobsInvoicedInCaches([{ id: 'j1', scheduled_date: '2026-06-14' }])
    const board = () => queryClient.getQueryData(['jobs', 'kanban']) as JobWithContext[]
    const detail = () => queryClient.getQueryData(['jobs', 'j1']) as JobWithContext
    const day = () =>
      queryClient.getQueryData(['jobs', { date: '2026-06-14' }]) as JobWithContext[]
    // Invoiced jobs leave the board; detail + day list keep the 'invoiced' status.
    expect(board()).toHaveLength(0)
    expect(detail().status).toBe('invoiced')
    expect(day()[0].status).toBe('invoiced')

    restoreInvoicedJobInCaches('j1')
    expect(detail().status).toBe('done')
    expect(board()).toHaveLength(1)
    expect(board()[0].status).toBe('done')
  })

  it('restore never resurrects a job that is not invoiced', () => {
    const j = job('j2', 'canceled')
    queryClient.setQueryData(['jobs', 'kanban'], [j])
    queryClient.setQueryData(['jobs', 'j2'], j)
    restoreInvoicedJobInCaches('j2')
    expect((queryClient.getQueryData(['jobs', 'j2']) as JobWithContext).status).toBe(
      'canceled',
    )
    expect(
      (queryClient.getQueryData(['jobs', 'kanban']) as JobWithContext[])[0].status,
    ).toBe('canceled')
  })
})
