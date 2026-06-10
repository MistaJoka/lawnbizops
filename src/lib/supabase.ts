import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — check .env.local',
  )
}

// Session persists in localStorage with auto refresh — the user logs in ~once ever.
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
