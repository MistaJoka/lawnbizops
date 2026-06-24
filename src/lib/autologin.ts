import { supabase } from './supabase'

// =============================================================================
// DEV/TEST-ONLY auto-login. Opt-in via build-time env vars (set as GitHub
// secrets on the deploy): VITE_AUTOLOGIN_EMAIL + VITE_AUTOLOGIN_PASSWORD.
//
// ⚠️  REMOVE BEFORE ONBOARDING REAL CUSTOMERS. When the secrets are set, the
// credentials are inlined into the PUBLIC JS bundle and the app signs itself in
// on load — anyone with the URL lands in that account. Only ever point this at
// a throwaway test org, never a real business. Unset the secrets (or delete
// this file + its call in main.tsx and the deploy.yml env) to disable.
// =============================================================================

type AutologinEnv = {
  VITE_AUTOLOGIN_EMAIL?: string
  VITE_AUTOLOGIN_PASSWORD?: string
  VITE_GUEST_MODE?: string
}

/**
 * Guest mode: sign in anonymously so the app opens with no login screen, while
 * RLS stays ON (each guest gets its own isolated org via handle_new_user). The
 * _authed guard also skips the onboarding/billing gates in this mode. To restore
 * real auth later: unset VITE_GUEST_MODE (and remove this file's call sites).
 */
export function guestModeEnabled(
  env: AutologinEnv = import.meta.env as unknown as AutologinEnv,
): boolean {
  return env.VITE_GUEST_MODE === '1'
}

/** Credentials only when BOTH vars are non-empty; otherwise null (no-op). */
export function autologinCredentials(
  env: AutologinEnv = import.meta.env as unknown as AutologinEnv,
): { email: string; password: string } | null {
  const email = env.VITE_AUTOLOGIN_EMAIL
  const password = env.VITE_AUTOLOGIN_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

/**
 * When configured and no session exists yet, sign in before the router loads so
 * the _authed guard sees a live session and skips the login screen. Best-effort:
 * any failure (bad creds, offline) just falls through to the normal login flow.
 */
/**
 * Runs before the first render in main.tsx. A dead-zone cold start makes the
 * auth calls fail in the two nastiest ways: a clean *rejection* (offline), or a
 * *hang* when a stored-but-expired token refreshes against an unreachable
 * backend. Either blocks the first paint and leaves the screen blank. So this
 * bounds the wait: resolve on success, on failure, OR after `timeoutMs` — the
 * app always boots and the router shows the login/offline path. Any sign-in
 * still in flight finishes in the background.
 */
export async function maybeAutologin(timeoutMs = 2500): Promise<void> {
  // Late failure must not become an unhandled rejection once the race resolves.
  const boot = authBootstrap().catch((e) => {
    console.warn('[autologin] auth unreachable at boot (offline?) — booting anyway:', e)
  })
  await Promise.race([boot, new Promise<void>((r) => setTimeout(r, timeoutMs))])
}

async function authBootstrap(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return

  if (guestModeEnabled()) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error)
      console.warn('[guest] anonymous sign-in failed, showing login:', error.message)
    return
  }

  const creds = autologinCredentials()
  if (!creds) return
  const { error } = await supabase.auth.signInWithPassword(creds)
  if (error) console.warn('[autologin] sign-in failed, showing login:', error.message)
}
