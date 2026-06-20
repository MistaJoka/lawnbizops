import { describe, expect, it } from 'vitest'
import { autologinCredentials } from './autologin'

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
