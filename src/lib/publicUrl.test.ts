import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicUrl } from './publicUrl'

// CC-007: customer links dropped the deploy sub-path and served GitHub's
// "Site not found". These pin the contract in BOTH deploy shapes, because the
// bug was invisible in dev (BASE_URL '/') and only bit in production.
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('publicUrl', () => {
  it('includes the deploy sub-path when the app is served from one', () => {
    vi.stubEnv('BASE_URL', '/lawnbizops/')
    expect(publicUrl('e/tok123')).toBe(`${window.location.origin}/lawnbizops/e/tok123`)
  })

  it('is correct at the domain root too (dev, preview, custom domain)', () => {
    vi.stubEnv('BASE_URL', '/')
    expect(publicUrl('quote/tok123')).toBe(`${window.location.origin}/quote/tok123`)
  })

  it('never doubles the slash when the caller writes a leading one', () => {
    vi.stubEnv('BASE_URL', '/lawnbizops/')
    expect(publicUrl('/e/tok123')).toBe(`${window.location.origin}/lawnbizops/e/tok123`)
  })

  it('produces a URL the router can match (no bare-origin regression)', () => {
    vi.stubEnv('BASE_URL', '/lawnbizops/')
    const url = new URL(publicUrl('e/tok123'))
    expect(url.pathname.startsWith('/lawnbizops/')).toBe(true)
  })
})
