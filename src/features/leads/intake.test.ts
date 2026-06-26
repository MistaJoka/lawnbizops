import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchIntakeBusinessName, submitLead } from './intake'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))

afterEach(() => rpc.mockReset())

describe('fetchIntakeBusinessName', () => {
  it('returns the business name for a known token', async () => {
    rpc.mockResolvedValue({ data: 'Apex Lawn', error: null })
    expect(await fetchIntakeBusinessName('tok')).toBe('Apex Lawn')
    expect(rpc).toHaveBeenCalledWith('intake_business_name', { p_token: 'tok' })
  })

  it('returns null for an unknown token', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await fetchIntakeBusinessName('nope')).toBeNull()
  })

  it('throws on RPC error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    await expect(fetchIntakeBusinessName('t')).rejects.toBeTruthy()
  })
})

describe('submitLead', () => {
  it('passes every field through to the RPC', async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null })
    await submitLead('tok', {
      name: 'Jordan',
      phone: '305',
      email: '',
      address: '1 Main',
      notes: 'mowing',
    })
    expect(rpc).toHaveBeenCalledWith('submit_lead', {
      p_token: 'tok',
      p_name: 'Jordan',
      p_phone: '305',
      p_email: '',
      p_address: '1 Main',
      p_notes: 'mowing',
    })
  })

  it('rejects with the server error (e.g. validation)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'name is required' } })
    await expect(
      submitLead('tok', { name: '', phone: '', email: '', address: '', notes: '' }),
    ).rejects.toBeTruthy()
  })
})
