import { describe, expect, it } from 'vitest'
import { autologinCredentials, guestModeEnabled } from './autologin'

// Guest mode (anonymous auth) — active when VITE_GUEST_MODE is exactly '1'.
describe('guestModeEnabled', () => {
  it('is true only when VITE_GUEST_MODE is "1"', () => {
    expect(guestModeEnabled({ VITE_GUEST_MODE: '1' })).toBe(true)
  })
  it('is false when unset, empty, or any other value', () => {
    expect(guestModeEnabled({})).toBe(false)
    expect(guestModeEnabled({ VITE_GUEST_MODE: '' })).toBe(false)
    expect(guestModeEnabled({ VITE_GUEST_MODE: '0' })).toBe(false)
    expect(guestModeEnabled({ VITE_GUEST_MODE: 'true' })).toBe(false)
  })
})

// Build-time opt-in: auto-login only when BOTH env vars are present (set as
// GitHub secrets on the deploy). Absent → null → normal login screen.
describe('autologinCredentials', () => {
  it('returns null when neither var is set', () => {
    expect(autologinCredentials({})).toBeNull()
  })

  it('returns null when only one var is set', () => {
    expect(autologinCredentials({ VITE_AUTOLOGIN_EMAIL: 'a@b.com' })).toBeNull()
    expect(autologinCredentials({ VITE_AUTOLOGIN_PASSWORD: 'pw' })).toBeNull()
  })

  it('returns null for empty strings (unset GitHub secret expands to "")', () => {
    expect(
      autologinCredentials({ VITE_AUTOLOGIN_EMAIL: '', VITE_AUTOLOGIN_PASSWORD: '' }),
    ).toBeNull()
  })

  it('returns the credentials when both are set', () => {
    expect(
      autologinCredentials({
        VITE_AUTOLOGIN_EMAIL: 'test@lawnbizops.test',
        VITE_AUTOLOGIN_PASSWORD: 'secret',
      }),
    ).toEqual({ email: 'test@lawnbizops.test', password: 'secret' })
  })
})
