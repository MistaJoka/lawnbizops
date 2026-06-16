import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Importing jobs/hooks pulls in the supabase client (env-dependent); stub it —
// these tests exercise only the in-memory cache helpers.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { queryClient } from '@/lib/queryClient'
import {
  markJobsInvoicedInCaches,
  restoreInvoicedJobInCaches,
  type JobWithContext,
} from './hooks'

const job = (id: string, status: string): JobWithContext =>
  ({ id, status, scheduled_date: '2026-06-14', property: null }) as JobWithContext

afterEach(() => queryClient.clear())

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
    expect(board()[0].status).toBe('invoiced')
    expect(detail().status).toBe('invoiced')
    expect(day()[0].status).toBe('invoiced')

    restoreInvoicedJobInCaches('j1')
    expect(board()[0].status).toBe('done')
    expect(detail().status).toBe('done')
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
