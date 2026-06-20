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
export async function maybeAutologin(): Promise<void> {
  const creds = autologinCredentials()
  if (!creds) return
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInWithPassword(creds)
  if (error) console.warn('[autologin] sign-in failed, showing login:', error.message)
}
