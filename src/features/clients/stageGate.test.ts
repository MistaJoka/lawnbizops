import { afterEach, describe, expect, it, vi } from 'vitest'

// The stubbed supabase has no .from — any query attempt throws, which is
// exactly the "can't check" path the gate must swallow (offline tolerance).
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { queryClient } from '@/lib/queryClient'
import { stageAdvanceWarning } from './stageGate'

afterEach(() => queryClient.clear())

describe('stageAdvanceWarning', () => {
  it('warns on → quoted when the cached estimates list has none for the client', async () => {
    queryClient.setQueryData(['estimates'], [{ client_id: 'other' }])
    const warning = await stageAdvanceWarning('cl1', 'quoted')
    expect(warning?.title).toBe('Move to Quoted with no estimate?')
  })

  it('passes → quoted when a cached estimate exists for the client', async () => {
    queryClient.setQueryData(['estimates'], [{ client_id: 'cl1' }])
    expect(await stageAdvanceWarning('cl1', 'quoted')).toBeNull()
  })

  it('allows (no warning) when the check cannot run — no cache, query throws', async () => {
    expect(await stageAdvanceWarning('cl1', 'quoted')).toBeNull()
    expect(await stageAdvanceWarning('cl1', 'active')).toBeNull()
  })

  it('warns on → active when the client has zero cached properties', async () => {
    // Empty property list is a definite answer (no work can exist), not unknown.
    queryClient.setQueryData(['properties', { clientId: 'cl1' }], [])
    const warning = await stageAdvanceWarning('cl1', 'active')
    expect(warning?.title).toBe('Move to Active with no scheduled work?')
  })

  it('never gates lead or dormant targets', async () => {
    expect(await stageAdvanceWarning('cl1', 'lead')).toBeNull()
    expect(await stageAdvanceWarning('cl1', 'dormant')).toBeNull()
  })
})
