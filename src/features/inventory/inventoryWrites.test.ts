import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))

import { queryClient } from '@/lib/queryClient'
import {
  stockLevel,
  saveInventoryItem,
  adjustInventoryQuantity,
  archiveInventoryItem,
  loadStarterInventory,
  type InventoryItem,
  type InventoryDraft,
} from './hooks'

const item = (over: Partial<InventoryItem> = {}): InventoryItem =>
  ({
    id: 'i1',
    name: 'String trimmer line',
    category: 'parts',
    unit: 'spool',
    quantity: 20,
    reorder_level: 10,
    location: '',
    notes: '',
    archived_at: null,
    ...over,
  }) as InventoryItem

const draft = (over: Partial<InventoryDraft> = {}): InventoryDraft => ({
  id: 'i1',
  name: 'String trimmer line',
  category: 'parts',
  unit: 'spool',
  quantity: 20,
  reorder_level: 10,
  location: '',
  notes: '',
  ...over,
})

type EnqueueOp = { table: string; kind: string; payload: Record<string, unknown> }
const lastOp = () => enqueue.mock.calls.at(-1)![0] as EnqueueOp
const list = () => queryClient.getQueryData<InventoryItem[]>(['inventory_items']) ?? []

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('loadStarterInventory', () => {
  // The harness's node localStorage stub is non-functional (see
  // preferences.test.ts) — give the seed-once stamp a working in-memory one.
  beforeEach(() => {
    let store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v)
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        store = {}
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('seeds a starter list on true first run', async () => {
    queryClient.setQueryData<InventoryItem[]>(['inventory_items'], [])
    await loadStarterInventory()
    expect(enqueue.mock.calls.length).toBeGreaterThan(0)
  })

  it('never re-seeds after the operator empties inventory (seed-once stamp)', async () => {
    queryClient.setQueryData<InventoryItem[]>(['inventory_items'], [])
    await loadStarterInventory()
    enqueue.mockClear()

    // Operator deletes everything — the list loads empty again.
    queryClient.setQueryData<InventoryItem[]>(['inventory_items'], [])
    await loadStarterInventory()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('does not seed over existing items', async () => {
    queryClient.setQueryData<InventoryItem[]>(
      ['inventory_items'],
      [item({ id: 'real', name: 'Real item' })],
    )
    await loadStarterInventory()
    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('stockLevel thresholds', () => {
  it('is critical at or below half the reorder level', () => {
    expect(stockLevel(item({ quantity: 5, reorder_level: 10 }))).toBe('critical') // exactly half
    expect(stockLevel(item({ quantity: 4, reorder_level: 10 }))).toBe('critical')
  })

  it('is low between half and the reorder level (inclusive)', () => {
    expect(stockLevel(item({ quantity: 6, reorder_level: 10 }))).toBe('low')
    expect(stockLevel(item({ quantity: 10, reorder_level: 10 }))).toBe('low') // exactly at level
  })

  it('is in_stock above the reorder level', () => {
    expect(stockLevel(item({ quantity: 11, reorder_level: 10 }))).toBe('in_stock')
  })
})

describe('saveInventoryItem', () => {
  it('inserts name-sorted and enqueues a clean upsert', async () => {
    queryClient.setQueryData<InventoryItem[]>(
      ['inventory_items'],
      [item({ id: 'a', name: 'Air filter' }), item({ id: 'z', name: 'Zip ties' })],
    )

    await saveInventoryItem(draft({ id: 'm', name: 'Mower blade' }))

    expect(list().map((i) => i.name)).toEqual(['Air filter', 'Mower blade', 'Zip ties'])
    expect(lastOp()).toMatchObject({ table: 'inventory_items', kind: 'upsert' })
    for (const key of ['user_id', 'created_at', 'updated_at', 'org_id', 'archived_at']) {
      expect(lastOp().payload).not.toHaveProperty(key)
    }
  })
})

describe('adjustInventoryQuantity', () => {
  it('applies a positive delta', async () => {
    queryClient.setQueryData<InventoryItem[]>(
      ['inventory_items'],
      [item({ quantity: 20 })],
    )

    await adjustInventoryQuantity(item({ quantity: 20 }), 5)

    expect(list()[0].quantity).toBe(25)
    expect(lastOp().payload.quantity).toBe(25)
  })

  it('floors at zero — a delta below the stock count never goes negative', async () => {
    queryClient.setQueryData<InventoryItem[]>(
      ['inventory_items'],
      [item({ quantity: 3 })],
    )

    await adjustInventoryQuantity(item({ quantity: 3 }), -10)

    expect(list()[0].quantity).toBe(0)
    expect(lastOp().payload.quantity).toBe(0)
  })
})

describe('archiveInventoryItem', () => {
  it('removes the item from the list cache and enqueues an archived_at patch', async () => {
    queryClient.setQueryData<InventoryItem[]>(
      ['inventory_items'],
      [item({ id: 'a', name: 'Air filter' }), item({ id: 'z', name: 'Zip ties' })],
    )

    await archiveInventoryItem(item({ id: 'a', name: 'Air filter' }))

    expect(list().map((i) => i.id)).toEqual(['z'])
    const op = lastOp()
    expect(op).toMatchObject({ table: 'inventory_items', kind: 'update' })
    expect((op.payload as { id: string }).id).toBe('a')
    expect((op.payload as { patch: { archived_at: unknown } }).patch.archived_at).toEqual(
      expect.any(String),
    )
  })
})
