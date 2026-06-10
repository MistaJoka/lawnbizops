import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const upsertMock = vi.fn()
const deleteEqMock = vi.fn()
const rpcMock = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (payload: unknown) => upsertMock(table, payload),
      delete: () => ({ eq: (col: string, id: string) => deleteEqMock(table, col, id) }),
    }),
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
  },
}))

import { db } from './db'
import { enqueue, flush, retryFailed, stopRetries } from './outbox'

const ok = { error: null, status: 200 }
const badRequest = { error: { message: 'invalid input' }, status: 400 }
const serverError = { error: { message: 'oops' }, status: 503 }

// Tests follow the real-world pattern: enqueue while offline (enqueue's
// auto-flush no-ops), then go online and flush deterministically.
const network = { onLine: false }

function goOnline() {
  network.onLine = true
}

beforeEach(async () => {
  network.onLine = false
  vi.stubGlobal('navigator', network)
  await db.outbox.clear()
  upsertMock.mockReset().mockResolvedValue(ok)
  deleteEqMock.mockReset().mockResolvedValue(ok)
  rpcMock.mockReset().mockResolvedValue({ error: null })
})

afterEach(() => {
  stopRetries()
  vi.unstubAllGlobals()
})

describe('outbox', () => {
  it('flushes ops in FIFO order and empties the queue', async () => {
    await enqueue({
      table: 'clients',
      kind: 'upsert',
      payload: { id: 'a', name: 'First' },
    })
    await enqueue({
      table: 'clients',
      kind: 'upsert',
      payload: { id: 'b', name: 'Second' },
    })
    await enqueue({ table: 'clients', kind: 'delete', payload: { id: 'a' } })
    goOnline()
    await flush()

    expect(upsertMock.mock.calls.map(([, p]) => (p as { id: string }).id)).toEqual([
      'a',
      'b',
    ])
    expect(deleteEqMock).toHaveBeenCalledWith('clients', 'id', 'a')
    expect(await db.outbox.count()).toBe(0)
  })

  it('skips a poison 4xx op and keeps the queue moving', async () => {
    upsertMock.mockResolvedValueOnce(badRequest).mockResolvedValueOnce(ok)
    await enqueue({ table: 'clients', kind: 'upsert', payload: { id: 'bad' } })
    await enqueue({ table: 'clients', kind: 'upsert', payload: { id: 'good' } })
    goOnline()
    await flush()

    expect(upsertMock).toHaveBeenCalledTimes(2)
    const remaining = await db.outbox.toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('failed')
    expect(remaining[0].error).toBe('invalid input')
    expect((remaining[0].payload as { id: string }).id).toBe('bad')
  })

  it('halts on a 5xx failure to preserve FIFO, keeps op pending', async () => {
    upsertMock.mockResolvedValueOnce(serverError)
    await enqueue({ table: 'invoices', kind: 'upsert', payload: { id: 'inv1' } })
    await enqueue({ table: 'invoice_items', kind: 'upsert', payload: { id: 'item1' } })
    goOnline()
    await flush()

    // first op still pending (not failed), second never attempted
    const remaining = await db.outbox.toArray()
    expect(remaining).toHaveLength(2)
    expect(remaining.every((op) => op.status === 'pending')).toBe(true)
    expect(remaining[0].attempts).toBe(1)
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('retries successfully after a transient failure (idempotent upsert)', async () => {
    upsertMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await enqueue({
      table: 'jobs',
      kind: 'upsert',
      payload: { id: 'j1', status: 'done' },
    })
    goOnline()
    await flush()
    expect(await db.outbox.count()).toBe(1)

    await flush()
    expect(await db.outbox.count()).toBe(0)
    expect(upsertMock).toHaveBeenCalledTimes(2)
  })

  it('does nothing while offline', async () => {
    await enqueue({ table: 'clients', kind: 'upsert', payload: { id: 'x' } })
    await flush()
    expect(upsertMock).not.toHaveBeenCalled()
    expect(await db.outbox.count()).toBe(1)
  })

  it('retryFailed re-queues a parked op', async () => {
    upsertMock.mockResolvedValueOnce(badRequest).mockResolvedValueOnce(ok)
    await enqueue({ table: 'clients', kind: 'upsert', payload: { id: 'p' } })
    goOnline()
    await flush()
    const failed = (await db.outbox.toArray())[0]
    expect(failed.status).toBe('failed')

    await retryFailed(failed.seq)
    await flush()
    expect(await db.outbox.count()).toBe(0)
  })

  it('executes rpc ops', async () => {
    await enqueue({
      table: 'jobs',
      kind: 'rpc',
      payload: { fn: 'materialize_jobs', args: { through_date: '2026-08-01' } },
    })
    goOnline()
    await flush()
    expect(rpcMock).toHaveBeenCalledWith('materialize_jobs', {
      through_date: '2026-08-01',
    })
    expect(await db.outbox.count()).toBe(0)
  })
})
