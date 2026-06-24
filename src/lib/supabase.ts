import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { createDemoClient } from './demo'

function createRealClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

  if (!url || !publishableKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — check .env.local',
    )
  }

  // Session persists in localStorage with auto refresh — the user logs in ~once ever.
  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// DEMO mode (dev + VITE_DEMO=1): an in-memory fake backed by the local seed, so
// authed screens render with no backend. The `import.meta.env.DEV` literal is
// inlined by Vite, so a production build evaluates this to `false` and
// dead-code-eliminates createDemoClient — the demo dataset never ships.
export const supabase =
  import.meta.env.DEV && import.meta.env.VITE_DEMO === '1'
    ? createDemoClient()
    : createRealClient()
