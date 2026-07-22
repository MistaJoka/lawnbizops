import { describe, expect, it } from 'vitest'
import { groupUnbilledByClient, type UnbilledJobRow } from './attention'

function row(overrides: Partial<UnbilledJobRow> = {}): UnbilledJobRow {
  return {
    id: crypto.randomUUID(),
    title: 'Weekly mow',
    scheduled_date: '2026-07-01',
    completed_at: '2026-07-01T14:00:00Z',
    price_cents: 6500,
    property: { client_id: 'client-a', client: { name: 'Bob Castellano' } },
    ...overrides,
  }
}

describe('groupUnbilledByClient', () => {
  it('groups jobs by client and sums their prices', () => {
    const groups = groupUnbilledByClient([
      row({ price_cents: 6500 }),
      row({ price_cents: 9500 }),
      row({
        price_cents: 12000,
        property: { client_id: 'client-b', client: { name: 'Sunrise Villas HOA' } },
      }),
    ])

    expect(groups).toHaveLength(2)
    const a = groups.find((g) => g.clientId === 'client-a')
    expect(a).toMatchObject({
      clientName: 'Bob Castellano',
      jobCount: 2,
      totalCents: 16000,
    })
    const b = groups.find((g) => g.clientId === 'client-b')
    expect(b).toMatchObject({
      clientName: 'Sunrise Villas HOA',
      jobCount: 1,
      totalCents: 12000,
    })
  })

  it('sorts groups by total descending so the biggest unbilled amount leads', () => {
    const groups = groupUnbilledByClient([
      row({ price_cents: 500 }),
      row({
        price_cents: 90000,
        property: { client_id: 'client-b', client: { name: 'Big Job' } },
      }),
    ])
    expect(groups.map((g) => g.clientId)).toEqual(['client-b', 'client-a'])
  })

  it('skips jobs with no property/client linkage (cannot be invoiced by client)', () => {
    const groups = groupUnbilledByClient([row({ property: null }), row()])
    expect(groups).toHaveLength(1)
    expect(groups[0].jobCount).toBe(1)
  })

  it('falls back to "Client" when the client name is missing', () => {
    const groups = groupUnbilledByClient([
      row({ property: { client_id: 'client-x', client: null } }),
    ])
    expect(groups[0].clientName).toBe('Client')
  })

  it('returns an empty array for no jobs', () => {
    expect(groupUnbilledByClient([])).toEqual([])
  })

  it('derives the client key from the embedded client id when client_id is absent (demo backend shape)', () => {
    const groups = groupUnbilledByClient([
      row({ property: { client: { id: 'client-demo', name: 'Demo Client' } } }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].clientId).toBe('client-demo')
  })

  it('skips rows where no client id is resolvable at all', () => {
    const groups = groupUnbilledByClient([
      row({ property: { client: { name: 'No Id Client' } } }),
    ])
    expect(groups).toEqual([])
  })
})
