import { describe, expect, it } from 'vitest'
import { isPublicPath } from './__root'

// The operator's DevStripe (version · sha · sync status) must never render on a
// customer-facing token page. isPublicPath gates that — if a new public route is
// added without extending this, a customer would see internal build provenance.
describe('isPublicPath', () => {
  it('treats token-keyed customer pages as public', () => {
    expect(isPublicPath('/quote/abc123')).toBe(true)
    expect(isPublicPath('/e/xyz789')).toBe(true)
  })

  it('treats operator screens as private', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/money')).toBe(false)
    expect(isPublicPath('/clients')).toBe(false)
    expect(isPublicPath('/settings/profile')).toBe(false)
    expect(isPublicPath('/login')).toBe(false)
  })

  it('does not match a private path that merely contains a public segment', () => {
    expect(isPublicPath('/clients/e/edit')).toBe(false)
    expect(isPublicPath('/quotes')).toBe(false)
  })
})
