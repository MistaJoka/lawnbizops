import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted so the mock factory (also hoisted) can reference these fns.
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPassword: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { autologinCredentials, guestModeEnabled, maybeAutologin } from './autologin'

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

// The session bootstrap (runs before the router's auth guard in main.tsx).
describe('maybeAutologin', () => {
  beforeEach(() => {
    auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
    auth.signInAnonymously.mockReset().mockResolvedValue({ error: null })
    auth.signInWithPassword.mockReset().mockResolvedValue({ error: null })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('signs in anonymously in guest mode when there is no session', async () => {
    vi.stubEnv('VITE_GUEST_MODE', '1')
    await maybeAutologin()
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1)
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('does nothing when a session already exists', async () => {
    vi.stubEnv('VITE_GUEST_MODE', '1')
    auth.getSession.mockResolvedValue({ data: { session: { user: {} } } })
    await maybeAutologin()
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('uses password auto-login when creds are set and guest mode is off', async () => {
    vi.stubEnv('VITE_AUTOLOGIN_EMAIL', 'a@b.com')
    vi.stubEnv('VITE_AUTOLOGIN_PASSWORD', 'pw')
    await maybeAutologin()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
    })
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('is a no-op when neither guest mode nor creds are configured', async () => {
    await maybeAutologin()
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  // Dead-zone cold start: the network is unreachable, so getSession's token
  // refresh rejects. maybeAutologin runs *before* the first render in main.tsx —
  // if it throws, render never happens and the screen is blank. It must always
  // resolve so the app still boots (and falls through to the login/offline path).
  it('does not throw when getSession rejects (offline cold start)', async () => {
    vi.stubEnv('VITE_GUEST_MODE', '1')
    auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(maybeAutologin()).resolves.toBeUndefined()
  })

  it('does not throw when anonymous sign-in rejects (offline guest)', async () => {
    vi.stubEnv('VITE_GUEST_MODE', '1')
    auth.signInAnonymously.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(maybeAutologin()).resolves.toBeUndefined()
  })

  // Worse than a clean rejection: a stored-but-expired token makes getSession
  // *hang* on a token refresh that retries against an unreachable backend. Since
  // this blocks the first render, maybeAutologin must give up after a bound and
  // resolve, so the app paints (router → login/offline) instead of staying blank.
  it(
    'resolves within the timeout even if auth hangs (dead-zone cold start)',
    { timeout: 1000 },
    async () => {
      vi.stubEnv('VITE_GUEST_MODE', '1')
      auth.getSession.mockReturnValue(new Promise(() => {})) // never settles
      await expect(maybeAutologin(20)).resolves.toBeUndefined()
    },
  )
})
