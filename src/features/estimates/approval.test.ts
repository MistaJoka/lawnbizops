import { afterEach, describe, expect, it, vi } from 'vitest'
import { approvalTotalCents, fetchEstimateByToken, respondToEstimate } from './approval'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))

afterEach(() => rpc.mockReset())

describe('approvalTotalCents', () => {
  it('sums quantity × unit price across line items', () => {
    expect(
      approvalTotalCents([
        { description: 'a', quantity: 2, unit_price_cents: 1500 },
        { description: 'b', quantity: 1, unit_price_cents: 18000 },
      ]),
    ).toBe(21000)
  })
})

describe('fetchEstimateByToken', () => {
  it('calls the RPC with the token and returns the bundle', async () => {
    const bundle = { id: 'e1', status: 'sent', items: [] }
    rpc.mockResolvedValue({ data: bundle, error: null })
    const out = await fetchEstimateByToken('tok-123')
    expect(rpc).toHaveBeenCalledWith('estimate_by_token', { p_token: 'tok-123' })
    expect(out).toEqual(bundle)
  })

  it('returns null for an unknown token', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await fetchEstimateByToken('nope')).toBeNull()
  })

  it('throws on RPC error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(fetchEstimateByToken('x')).rejects.toBeTruthy()
  })
})

describe('respondToEstimate', () => {
  it('passes the action and returns the new status', async () => {
    rpc.mockResolvedValue({ data: 'accepted', error: null })
    const out = await respondToEstimate('tok', 'accept')
    expect(rpc).toHaveBeenCalledWith('respond_to_estimate', {
      p_token: 'tok',
      p_action: 'accept',
    })
    expect(out).toBe('accepted')
  })

  it('throws on RPC error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'bad' } })
    await expect(respondToEstimate('tok', 'decline')).rejects.toBeTruthy()
  })
})
