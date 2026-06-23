import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { getCurrentOrgId } from '@/features/auth/hooks'
import type { Tables } from '@/lib/database.types'

export type Photo = Tables<'photos'>

export type PhotoEntityType = 'job' | 'estimate' | 'expense'

export interface PhotoWithUrl extends Photo {
  /** Signed display URL (private bucket) — null when signing failed. */
  url: string | null
}

const BUCKET = 'photos'
const SIGNED_URL_SECONDS = 3600

async function signPath(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  return data?.signedUrl ?? null
}

export function usePhotos(entityType: PhotoEntityType, entityId: string) {
  return useQuery({
    queryKey: ['photos', { entityType, entityId }],
    // Signed URLs live 60 min — keep the query fresh for 30 so thumbnails
    // never render with an expired link.
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<PhotoWithUrl[]> => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at')
      if (error) throw error
      return Promise.all(
        data.map(async (row) => ({ ...row, url: await signPath(row.storage_path) })),
      )
    },
  })
}

/**
 * Upload the binary straight to storage (needs a connection — storage uploads
 * don't fit the outbox), then enqueue the photos row through the outbox.
 */
export async function uploadPhoto(
  entityType: PhotoEntityType,
  entityId: string,
  file: File,
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Photos need a connection — try again when you have signal.')
  }
  const orgId = await getCurrentOrgId()
  if (!orgId) throw new Error('No active organization — please sign in again.')
  // Org-prefixed path — Storage RLS only lets a member touch their org's folder.
  const path = `${orgId}/${entityType}/${entityId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)

  const row = {
    id: crypto.randomUUID(),
    entity_type: entityType,
    entity_id: entityId,
    storage_path: path,
  }

  // Optimistic: append with a fresh signed URL so the thumb shows instantly.
  const now = new Date().toISOString()
  const cached: PhotoWithUrl = {
    ...row,
    url: await signPath(path),
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: orgId,
  }
  queryClient.setQueryData<PhotoWithUrl[]>(['photos', { entityType, entityId }], (old) =>
    old ? [...old, cached] : [cached],
  )

  await enqueue({ table: 'photos', kind: 'upsert', payload: row })
}

/** Remove the binary from storage, then enqueue the row delete. */
export async function deletePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([photo.storage_path])
  if (error) throw new Error(`Delete failed: ${error.message}`)

  queryClient.setQueryData<PhotoWithUrl[]>(
    ['photos', { entityType: photo.entity_type, entityId: photo.entity_id }],
    (old) => old?.filter((p) => p.id !== photo.id),
  )
  await enqueue({ table: 'photos', kind: 'delete', payload: { id: photo.id } })
}
