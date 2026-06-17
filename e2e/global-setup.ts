import { execSync } from 'node:child_process'

// Reset the local DB to a known state (migrations + Apex seed) before the suite,
// so every run starts from the same fixture. Set E2E_SKIP_RESET=1 to skip during
// fast local iteration when you know the DB is already seeded.
export default function globalSetup() {
  if (process.env.E2E_SKIP_RESET) return
  console.log('[e2e] resetting local Supabase (migrations + seed)…')
  execSync('npx supabase db reset', { stdio: 'inherit', timeout: 240_000 })
}
