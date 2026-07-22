import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache + outbox logic: stub the env-dependent supabase client,
// capture enqueue ops, and silence the toast.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import {
  setJobStatus,
  rescheduleJob,
  updateJob,
  type Job,
  type JobStatus,
  type JobWithContext,
} from './hooks'

const DAY = '2026-06-20'

const job = (over: Partial<Job> = {}): JobWithContext =>
  ({
    id: 'j1',
    status: 'scheduled' as JobStatus,
    scheduled_date: DAY,
    completed_at: null,
    ...over,
  }) as JobWithContext

/** Seed a job into its detail, kanban, and day-list caches. */
function seed(j: JobWithContext) {
  queryClient.setQueryData<JobWithContext>(['jobs', j.id], j)
  queryClient.setQueryData<JobWithContext[]>(['jobs', 'kanban'], [j])
  queryClient.setQueryData<JobWithContext[]>(['jobs', { date: j.scheduled_date }], [j])
}

const detail = () => queryClient.getQueryData<JobWithContext>(['jobs', 'j1'])!
const kanban = () => queryClient.getQueryData<JobWithContext[]>(['jobs', 'kanban'])!
const dayList = (d: string) =>
  queryClient.getQueryData<JobWithContext[]>(['jobs', { date: d }]) ?? []

type EnqueueOp = {
  table: string
  kind: string
  payload: { id: string; patch: Record<string, unknown> }
}
const lastOp = () => enqueue.mock.calls.at(-1)![0] as EnqueueOp

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('setJobStatus', () => {
  it('marking done stamps completed_at and keeps the card on the board', async () => {
    seed(job({ status: 'in_progress' }))

    await setJobStatus(job({ status: 'in_progress' }), 'done')

    expect(detail().status).toBe('done')
    expect(detail().completed_at).toEqual(expect.any(String))
    // 'done' is still a kanban status — the card stays.
    expect(kanban().map((j) => j.id)).toContain('j1')
  })

  it('canceling drops the job off the kanban board', async () => {
    seed(job({ status: 'scheduled' }))

    await setJobStatus(job({ status: 'scheduled' }), 'canceled')

    expect(detail().status).toBe('canceled')
    expect(kanban().map((j) => j.id)).not.toContain('j1')
  })

  it('enqueues an update whose patch carries status (+completed_at on done) and no owned columns', async () => {
    seed(job())

    await setJobStatus(job(), 'done')

    const op = lastOp()
    expect(op).toMatchObject({ table: 'jobs', kind: 'update' })
    expect(op.payload.id).toBe('j1')
    expect(op.payload.patch.status).toBe('done')
    expect(op.payload.patch.completed_at).toEqual(expect.any(String))
    for (const key of ['user_id', 'created_at', 'updated_at', 'org_id']) {
      expect(op.payload.patch).not.toHaveProperty(key)
    }
  })

  it('a non-done transition patches status only (no completed_at)', async () => {
    seed(job())

    await setJobStatus(job(), 'in_progress')

    expect(lastOp().payload.patch).toEqual({ status: 'in_progress' })
  })
})

describe('rescheduleJob', () => {
  it('moves the job between day caches and enqueues the date patch', async () => {
    const NEXT = '2026-06-27'
    seed(job())
    // patchJobCaches only inserts into a destination day cache that already
    // exists (an unloaded day is fetched fresh later) — so seed NEXT as loaded.
    queryClient.setQueryData<JobWithContext[]>(['jobs', { date: NEXT }], [])

    await rescheduleJob(job(), NEXT)

    expect(dayList(DAY).map((j) => j.id)).not.toContain('j1') // left the old day
    expect(dayList(NEXT).map((j) => j.id)).toContain('j1') // landed on the new day
    expect(dayList(NEXT)[0].scheduled_date).toBe(NEXT)
    expect(detail().scheduled_date).toBe(NEXT)
    expect(lastOp()).toMatchObject({
      table: 'jobs',
      kind: 'update',
      payload: { id: 'j1', patch: { scheduled_date: NEXT } },
    })
  })

  it('a one-off move never stamps customized_at (nothing resyncs it)', async () => {
    seed(job({ schedule_id: null }))

    await rescheduleJob(job({ schedule_id: null }), '2026-06-27')

    expect(lastOp().payload.patch).toEqual({ scheduled_date: '2026-06-27' })
  })

  it('moving a recurring job stamps customized_at so resync leaves it alone', async () => {
    seed(job({ schedule_id: 's1' }))

    await rescheduleJob(job({ schedule_id: 's1' }), '2026-06-27')

    const patch = lastOp().payload.patch
    expect(patch.scheduled_date).toBe('2026-06-27')
    expect(patch.customized_at).toEqual(expect.any(String))
  })
})

describe('updateJob', () => {
  const values = {
    service_id: 'svc1',
    price_cents: 7500,
    title: 'Mow + edge',
    scheduled_date: DAY,
    start_time: '09:30',
    notes: 'gate in back',
  }

  it('patches caches and enqueues the edited fields (no owned columns)', async () => {
    seed(job({ schedule_id: null }))

    await updateJob(job({ schedule_id: null }), values)

    expect(detail().price_cents).toBe(7500)
    expect(detail().title).toBe('Mow + edge')
    const op = lastOp()
    expect(op).toMatchObject({ table: 'jobs', kind: 'update' })
    expect(op.payload.patch).toEqual(values) // one-off: no customized_at
    for (const key of ['user_id', 'created_at', 'updated_at', 'org_id']) {
      expect(op.payload.patch).not.toHaveProperty(key)
    }
  })

  it('editing a recurring job stamps customized_at so resync keeps the edit', async () => {
    seed(job({ schedule_id: 's1' }))

    await updateJob(job({ schedule_id: 's1' }), values)

    expect(lastOp().payload.patch.customized_at).toEqual(expect.any(String))
  })

  it('a date change moves the job between day caches', async () => {
    const NEXT = '2026-06-27'
    seed(job())
    queryClient.setQueryData<JobWithContext[]>(['jobs', { date: NEXT }], [])

    await updateJob(job(), { ...values, scheduled_date: NEXT })

    expect(dayList(DAY).map((j) => j.id)).not.toContain('j1')
    expect(dayList(NEXT).map((j) => j.id)).toContain('j1')
  })
})
