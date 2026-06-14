import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { db } from '@/lib/db'

/**
 * The caller's organization id, resolved once and cached for the session.
 *
 * Single-login v1: a user belongs to exactly one org, so this never changes
 * mid-session. Most writes don't need it (the DB defaults org_id to
 * current_org()); it's only required where the app must name the org
 * explicitly — business_settings upserts and org-prefixed storage paths.
 */
let cachedOrgId: string | null = null
let inflight: Promise<string | null> | null = null

export async function getCurrentOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase.rpc('current_org')
        if (!error && data) cachedOrgId = data as string
        return cachedOrgId
      } catch {
        return null
      } finally {
        inflight = null
      }
    })()
  }
  return inflight
}

/** Forget cached identity + all local caches on sign-out (prevents tenant bleed). */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  cachedOrgId = null
  inflight = null
  queryClient.clear()
  // The outbox + persisted query cache are per-device; wipe them so the next
  // user on this device never sees the previous tenant's queued writes or data.
  await db.outbox.clear()
  await db.kv.clear()
}
