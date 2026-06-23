import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// deleteSchedule reads future jobs from supabase — mock the query chain to
// return one future scheduled job. saveSchedule/setSchedulePaused don't touch
// supabase, so this mock is inert for them.
const futureJobs = [{ id: 'jFuture', scheduled_date: '2026-07-01' }]
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: futureJobs, error: null }),
          }),
        }),
      }),
    }),
  },
}))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))

import { queryClient } from '@/lib/queryClient'
import {
  saveSchedule,
  setSchedulePaused,
  deleteSchedule,
  type RecurringSchedule,
  type ScheduleDraft,
} from './hooks'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const draft = (over: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  id: 's1',
  property_id: 'p1',
  service_id: 'svc1',
  cadence: 'weekly',
  anchor_date: '2026-06-15',
  day_of_month: null,
  price_cents: 5000,
  notes: '',
  ends_on: null,
  paused_at: null,
  ...over,
})

const schedule = (over: Partial<RecurringSchedule> = {}): RecurringSchedule =>
  ({
    ...draft(),
    last_materialized_through: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    user_id: '',
    org_id: '',
    ...over,
  }) as RecurringSchedule

type EnqueueOp = {
  table: string
  kind: string
  payload: Record<string, unknown> & { fn?: string; args?: Record<string, unknown> }
}
const ops = () => enqueue.mock.calls.map((c) => c[0] as EnqueueOp)
const detail = (id: string) =>
  queryClient.getQueryData<RecurringSchedule>(['recurring_schedules', id])
const propList = (pid: string) =>
  queryClient.getQueryData<RecurringSchedule[]>([
    'recurring_schedules',
    { propertyId: pid },
  ]) ?? []

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('saveSchedule', () => {
  it('new: caches the row then materializes jobs (upsert before RPC)', async () => {
    await saveSchedule(draft(), { isNew: true })

    expect(detail('s1')!.cadence).toBe('weekly')
    expect(propList('p1').map((s) => s.id)).toContain('s1')

    expect(ops()).toHaveLength(2)
    expect(ops()[0]).toMatchObject({ table: 'recurring_schedules', kind: 'upsert' })
    expect(ops()[1]).toMatchObject({ table: 'jobs', kind: 'rpc' })
    expect(ops()[1].payload.fn).toBe('materialize_jobs')
    expect(ops()[1].payload.args!.through_date).toMatch(DATE_ONLY)
  })

  it('new: the upsert payload omits owned columns (user_id/timestamps/materialized)', async () => {
    await saveSchedule(draft(), { isNew: true })

    const payload = ops()[0].payload
    for (const key of [
      'user_id',
      'created_at',
      'updated_at',
      'last_materialized_through',
      'org_id',
    ]) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('edit: resyncs just this schedule (not a full materialize)', async () => {
    await saveSchedule(draft(), { isNew: false })

    expect(ops()[1].payload.fn).toBe('resync_schedule')
    expect(ops()[1].payload.args!.p_schedule_id).toBe('s1')
  })
})

describe('setSchedulePaused', () => {
  it('pause stamps paused_at, enqueues the patch, then resyncs', async () => {
    await setSchedulePaused(schedule(), true)

    expect(detail('s1')!.paused_at).toEqual(expect.any(String))
    expect(ops()[0]).toMatchObject({ table: 'recurring_schedules', kind: 'update' })
    expect((ops()[0].payload.patch as { paused_at: string }).paused_at).toEqual(
      expect.any(String),
    )
    expect(ops()[1].payload.fn).toBe('resync_schedule')
  })

  it('resume clears paused_at to null', async () => {
    await setSchedulePaused(schedule({ paused_at: '2026-06-10T00:00:00Z' }), false)

    expect(detail('s1')!.paused_at).toBeNull()
    expect((ops()[0].payload.patch as { paused_at: string | null }).paused_at).toBeNull()
  })
})

describe('deleteSchedule', () => {
  it('deletes future jobs before the schedule (FK sets schedule_id null on delete)', async () => {
    queryClient.setQueryData<RecurringSchedule[]>(
      ['recurring_schedules', { propertyId: 'p1' }],
      [schedule()],
    )

    await deleteSchedule(schedule())

    const tables = ops().map((o) => `${o.table}:${o.kind}`)
    const jobDelete = tables.indexOf('jobs:delete')
    const schedDelete = tables.indexOf('recurring_schedules:delete')
    expect(jobDelete).toBeGreaterThanOrEqual(0)
    expect(schedDelete).toBeGreaterThan(jobDelete) // schedule removed only after its jobs
    expect(propList('p1')).toEqual([])
  })
})
