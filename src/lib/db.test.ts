import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, type OutboxOp } from './db'

const op = (over: Partial<OutboxOp> = {}): Omit<OutboxOp, 'seq'> => ({
  id: 'op',
  table: 'jobs',
  kind: 'upsert',
  payload: {},
  attempts: 0,
  status: 'pending',
  createdAt: '2026-06-20T00:00:00Z',
  ...over,
})

beforeEach(async () => {
  await db.open()
  await db.outbox.clear()
  await db.kv.clear()
})
afterEach(() => db.outbox.clear())

describe('Dexie schema', () => {
  it('is the lawnbizops database with outbox + kv tables', () => {
    expect(db.name).toBe('lawnbizops')
    expect(db.tables.map((t) => t.name).sort()).toEqual(['kv', 'outbox'])
  })

  it('keys the outbox on an auto-increment seq and kv on key', () => {
    expect(db.outbox.schema.primKey.keyPath).toBe('seq')
    expect(db.outbox.schema.primKey.auto).toBe(true)
    expect(db.kv.schema.primKey.keyPath).toBe('key')
  })

  it('indexes the outbox by status for the pending/failed sweep', () => {
    expect(db.outbox.schema.indexes.map((i) => i.keyPath)).toContain('status')
  })
})

describe('outbox FIFO behavior', () => {
  it('assigns monotonically increasing seq in insertion order', async () => {
    const s1 = await db.outbox.add(op({ id: 'a' }))
    const s2 = await db.outbox.add(op({ id: 'b' }))
    const s3 = await db.outbox.add(op({ id: 'c' }))

    expect(s2).toBeGreaterThan(s1)
    expect(s3).toBeGreaterThan(s2)

    const order = await db.outbox.orderBy('seq').toArray()
    expect(order.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })

  it('can select pending ops via the status index', async () => {
    await db.outbox.add(op({ id: 'p', status: 'pending' }))
    await db.outbox.add(op({ id: 'f', status: 'failed' }))

    const pending = await db.outbox.where('status').equals('pending').toArray()
    expect(pending.map((o) => o.id)).toEqual(['p'])
  })
})
