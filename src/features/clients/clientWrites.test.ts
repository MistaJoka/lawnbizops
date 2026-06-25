import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate the cache + outbox logic: stub the env-dependent supabase client,
// capture enqueue ops, and silence the toast + activity-log side effects.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))
const logActivity = vi.fn()
vi.mock('@/features/activities/hooks', () => ({
  logActivity: (a: unknown) => logActivity(a),
}))

import { queryClient } from '@/lib/queryClient'
import {
  saveClient,
  setClientStage,
  maybeAdvanceStage,
  archiveClient,
  type Client,
  type ClientDraft,
} from './hooks'

const draft = (over: Partial<ClientDraft> = {}): ClientDraft => ({
  id: 'cl1',
  name: 'Carol',
  phone: '555',
  email: 'c@x.com',
  notes: '',
  ...over,
})

const client = (over: Partial<Client> = {}): Client =>
  ({
    id: 'cl1',
    name: 'Carol',
    phone: '555',
    email: 'c@x.com',
    notes: '',
    stage: 'active',
    archived_at: null,
    ...over,
  }) as Client

const list = () => queryClient.getQueryData<Client[]>(['clients'])
const detail = (id: string) => queryClient.getQueryData<Client>(['clients', id])

type EnqueueOp = { table: string; kind: string; payload: Record<string, unknown> }
const ops = () => enqueue.mock.calls.map((c) => c[0] as EnqueueOp)

beforeEach(() => {
  enqueue.mockClear()
  logActivity.mockClear()
})
afterEach(() => queryClient.clear())

describe('saveClient', () => {
  it('create: inserts into the list (name-sorted) and the detail cache', async () => {
    queryClient.setQueryData<Client[]>(
      ['clients'],
      [client({ id: 'b', name: 'Bob' }), client({ id: 'd', name: 'Dave' })],
    )

    await saveClient(draft({ id: 'c', name: 'Carol' }))

    expect(list()!.map((c) => c.name)).toEqual(['Bob', 'Carol', 'Dave'])
    expect(detail('c')!.name).toBe('Carol')
  })

  it('enqueues an upsert carrying only the draft — no user_id/timestamps/org_id', async () => {
    await saveClient(draft())

    expect(ops()).toHaveLength(1)
    expect(ops()[0]).toMatchObject({ table: 'clients', kind: 'upsert' })
    for (const key of ['user_id', 'created_at', 'updated_at', 'org_id']) {
      expect(ops()[0].payload).not.toHaveProperty(key)
    }
  })

  it('new clients default to the active stage in cache', async () => {
    await saveClient(draft({ id: 'cNew' }))
    expect(detail('cNew')!.stage).toBe('active')
  })
})

describe('archiveClient', () => {
  it('drops the client from the list cache and enqueues an upsert stamping archived_at', async () => {
    queryClient.setQueryData<Client[]>(['clients'], [client({ id: 'cl1' })])

    await archiveClient(client({ id: 'cl1' }))

    expect(list()).toEqual([])
    expect(ops()).toHaveLength(1)
    expect(ops()[0]).toMatchObject({ table: 'clients', kind: 'upsert' })
    expect(ops()[0].payload.archived_at).toEqual(expect.any(String))
  })
})

describe('maybeAdvanceStage', () => {
  const seed = (stage: Client['stage'], over: Partial<Client> = {}) => {
    const c = client({ stage, ...over })
    queryClient.setQueryData<Client[]>(['clients'], [c])
    queryClient.setQueryData<Client>(['clients', 'cl1'], c)
  }

  it('advances forward (lead → quoted)', async () => {
    seed('lead')
    await maybeAdvanceStage('cl1', 'quoted')
    expect(detail('cl1')!.stage).toBe('quoted')
    expect(ops()).toHaveLength(1)
  })

  it('does not move backward (active stays active when target is quoted)', async () => {
    seed('active')
    await maybeAdvanceStage('cl1', 'quoted')
    expect(detail('cl1')!.stage).toBe('active')
    expect(ops()).toHaveLength(0)
  })

  it('never pulls a dormant client back into the funnel', async () => {
    seed('dormant')
    await maybeAdvanceStage('cl1', 'active')
    expect(detail('cl1')!.stage).toBe('dormant')
    expect(ops()).toHaveLength(0)
  })

  it('never auto-sets dormant', async () => {
    seed('active')
    await maybeAdvanceStage('cl1', 'dormant')
    expect(detail('cl1')!.stage).toBe('active')
    expect(ops()).toHaveLength(0)
  })

  it('no-ops when the client is not in cache', async () => {
    await maybeAdvanceStage('ghost', 'active')
    expect(ops()).toHaveLength(0)
  })

  it('ignores archived clients', async () => {
    seed('lead', { archived_at: new Date().toISOString() })
    await maybeAdvanceStage('cl1', 'quoted')
    expect(ops()).toHaveLength(0)
  })
})

describe('setClientStage', () => {
  it('patches both caches, enqueues the stage update, and logs the change', async () => {
    queryClient.setQueryData<Client[]>(['clients'], [client({ stage: 'lead' })])
    queryClient.setQueryData<Client>(['clients', 'cl1'], client({ stage: 'lead' }))

    await setClientStage(client({ stage: 'lead' }), 'quoted')

    expect(list()![0].stage).toBe('quoted')
    expect(detail('cl1')!.stage).toBe('quoted')
    expect(ops()).toHaveLength(1)
    expect(ops()[0]).toMatchObject({
      table: 'clients',
      kind: 'update',
      payload: { id: 'cl1', patch: { stage: 'quoted' } },
    })
    expect(logActivity).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when the stage is unchanged (no enqueue, no activity)', async () => {
    await setClientStage(client({ stage: 'active' }), 'active')

    expect(enqueue).not.toHaveBeenCalled()
    expect(logActivity).not.toHaveBeenCalled()
  })
})
