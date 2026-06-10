import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { TablesInsert } from '@/lib/database.types'

export type BusinessSettingsPatch = Omit<
  TablesInsert<'business_settings'>,
  'user_id' | 'created_at' | 'updated_at' | 'next_invoice_number' | 'next_estimate_number'
>

/**
 * SANCTIONED OUTBOX EXCEPTION — business_settings only.
 *
 * Every other write goes through the outbox, but business_settings is a
 * singleton keyed by user_id (no client-generated `id`), so neither outbox
 * 'upsert' (can't conflict-match without sending user_id, which we never
 * include) nor 'update' (targets an `id` column this table doesn't have) can
 * represent it. Instead we upsert directly with onConflict: 'user_id' — the
 * DB default fills user_id on insert, and the conflict target matches the
 * existing row on subsequent saves. This requires being online; callers show
 * "Saved" / "Couldn't save — check connection" accordingly.
 */
export async function saveBusinessSettings(patch: BusinessSettingsPatch): Promise<void> {
  const { error } = await supabase
    .from('business_settings')
    .upsert(patch, { onConflict: 'user_id' })
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
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `logo.${ext}`
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
