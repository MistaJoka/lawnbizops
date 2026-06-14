import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { getCurrentOrgId } from '@/features/auth/hooks'
import type { TablesInsert } from '@/lib/database.types'

export type BusinessSettingsPatch = Omit<
  TablesInsert<'business_settings'>,
  | 'user_id'
  | 'org_id'
  | 'created_at'
  | 'updated_at'
  | 'next_invoice_number'
  | 'next_estimate_number'
>

/**
 * SANCTIONED OUTBOX EXCEPTION — business_settings only.
 *
 * Every other write goes through the outbox, but business_settings is a
 * singleton keyed by org_id (no client-generated `id`), so neither outbox
 * 'upsert' nor 'update' can represent it. We upsert directly with
 * onConflict: 'org_id' — the row already exists (the signup trigger seeds one
 * per org), so this is always an update in practice. We send org_id explicitly
 * because the conflict target must carry a value to match on. Requires being
 * online; callers show "Saved" / "Couldn't save — check connection".
 */
export async function saveBusinessSettings(patch: BusinessSettingsPatch): Promise<void> {
  const orgId = await getCurrentOrgId()
  if (!orgId) throw new Error('No active organization — please sign in again.')
  const { error } = await supabase
    .from('business_settings')
    .upsert({ ...patch, org_id: orgId }, { onConflict: 'org_id' })
  if (error) throw new Error(error.message)
  await queryClient.invalidateQueries({ queryKey: ['business_settings'] })
}

// ---------------------------------------------------------------------------
// Logo (private 'logos' storage bucket)
// ---------------------------------------------------------------------------

const LOGO_BUCKET = 'logos'
const SIGNED_URL_SECONDS = 3600

/** Signed display URL for the current logo — null while there isn't one. */
export function useLogoUrl(logoPath: string | null | undefined) {
  return useQuery({
    queryKey: ['logo_url', logoPath ?? null],
    enabled: !!logoPath,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.storage
        .from(LOGO_BUCKET)
        .createSignedUrl(logoPath!, SIGNED_URL_SECONDS)
      return data?.signedUrl ?? null
    },
  })
}

/**
 * Upload the logo binary (storage uploads don't fit the outbox — needs a
 * connection), then persist logo_path on business_settings. Returns the path.
 */
export async function uploadLogo(
  file: File,
  currentPath: string | null,
): Promise<string> {
  if (!navigator.onLine) {
    throw new Error('Logo upload needs a connection — try again when you have signal.')
  }
  const orgId = await getCurrentOrgId()
  if (!orgId) throw new Error('No active organization — please sign in again.')
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  // Org-prefixed path — Storage RLS only lets a member touch their org's folder.
  const path = `${orgId}/logo.${ext}`
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  // Best-effort cleanup when the extension changed (logo.png → logo.jpg).
  if (currentPath && currentPath !== path) {
    await supabase.storage.from(LOGO_BUCKET).remove([currentPath])
  }
  await saveBusinessSettings({ logo_path: path })
  await queryClient.invalidateQueries({ queryKey: ['logo_url'] })
  return path
}

/** Delete the stored logo and null out the column. */
export async function removeLogo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
  await saveBusinessSettings({ logo_path: null })
  await queryClient.invalidateQueries({ queryKey: ['logo_url'] })
}

/**
 * Fetch the logo as a data URL for embedding in a PDF. Returns undefined on
 * any failure (offline, missing object, fetch error) — the PDFs simply render
 * without a logo in that case, never blocking the share flow.
 */
export async function fetchLogoDataUrl(
  logoPath: string | null | undefined,
): Promise<string | undefined> {
  if (!logoPath) return undefined
  try {
    const { data } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(logoPath, SIGNED_URL_SECONDS)
    if (!data?.signedUrl) return undefined
    const response = await fetch(data.signedUrl)
    if (!response.ok) return undefined
    const blob = await response.blob()
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader()
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : undefined)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}
