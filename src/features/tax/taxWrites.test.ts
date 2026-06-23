import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const enqueue = vi.fn()
vi.mock('@/lib/outbox', () => ({ enqueue: (op: unknown) => enqueue(op) }))
vi.mock('@/lib/toast', () => ({ confirmToast: vi.fn() }))

import { queryClient } from '@/lib/queryClient'
import {
  mileageDeductionCents,
  quarterlySetAsideCents,
  createMileageLog,
  deleteMileageLog,
  createVendor1099,
  type MileageLog,
  type Vendor1099,
} from './hooks'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OWNED = ['user_id', 'created_at', 'updated_at', 'org_id']

type EnqueueOp = { table: string; kind: string; payload: Record<string, unknown> }
const lastOp = () => enqueue.mock.calls.at(-1)![0] as EnqueueOp
const mileage = () => queryClient.getQueryData<MileageLog[]>(['mileage_logs']) ?? []
const vendors = () => queryClient.getQueryData<Vendor1099[]>(['vendors_1099']) ?? []

beforeEach(() => enqueue.mockClear())
afterEach(() => queryClient.clear())

describe('tax rounding (integer cents)', () => {
  it('mileage deduction rounds miles × rate to whole cents', () => {
    expect(mileageDeductionCents(100, 67)).toBe(6700)
    expect(mileageDeductionCents(10.5, 67)).toBe(704) // 703.5 → 704
    expect(mileageDeductionCents(0, 67)).toBe(0)
  })

  it('quarterly set-aside rounds and floors negatives at zero', () => {
    expect(quarterlySetAsideCents(100000, 30)).toBe(30000)
    expect(quarterlySetAsideCents(33333, 30)).toBe(10000) // 9999.9 → 10000
    expect(quarterlySetAsideCents(-50000, 30)).toBe(0) // a net loss owes nothing
  })
})

describe('createMileageLog', () => {
  it('prepends to the cache, preserves the date-only drove_on, returns a uuid', async () => {
    const id = await createMileageLog({
      droveOn: '2026-06-20',
      miles: 12,
      purpose: 'Site visit',
      jobId: null,
      clientId: null,
    })

    expect(id).toMatch(UUID_RE)
    expect(mileage()[0].id).toBe(id)
    expect(mileage()[0].drove_on).toBe('2026-06-20')
  })

  it('enqueues an upsert whose payload omits owned columns', async () => {
    await createMileageLog({
      droveOn: '2026-06-20',
      miles: 12,
      purpose: '',
      jobId: null,
      clientId: null,
    })

    expect(lastOp()).toMatchObject({ table: 'mileage_logs', kind: 'upsert' })
    for (const key of OWNED) expect(lastOp().payload).not.toHaveProperty(key)
  })
})

describe('deleteMileageLog', () => {
  it('removes the row from the cache and enqueues a delete', async () => {
    queryClient.setQueryData<MileageLog[]>(
      ['mileage_logs'],
      [{ id: 'm1' } as MileageLog, { id: 'm2' } as MileageLog],
    )

    await deleteMileageLog('m1')

    expect(mileage().map((m) => m.id)).toEqual(['m2'])
    expect(lastOp()).toMatchObject({
      table: 'mileage_logs',
      kind: 'delete',
      payload: { id: 'm1' },
    })
  })
})

describe('createVendor1099', () => {
  it('inserts name-sorted and enqueues a clean upsert', async () => {
    queryClient.setQueryData<Vendor1099[]>(
      ['vendors_1099'],
      [
        { id: 'a', name: 'Acme' } as Vendor1099,
        { id: 'z', name: 'Zenith' } as Vendor1099,
      ],
    )

    await createVendor1099({
      name: 'Maple Co',
      taxId: '12-3456789',
      address: '',
      email: '',
      track1099: true,
    })

    expect(vendors().map((v) => v.name)).toEqual(['Acme', 'Maple Co', 'Zenith'])
    expect(lastOp()).toMatchObject({ table: 'vendors_1099', kind: 'upsert' })
    for (const key of OWNED) expect(lastOp().payload).not.toHaveProperty(key)
  })
})
