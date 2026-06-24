import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/features/auth/hooks'

/**
 * DEV-ONLY control panel. Rendered from main.tsx ONLY behind
 * `import.meta.env.DEV`, which Vite statically replaces with `false` in a
 * production build — so this whole module is tree-shaken out and can never reach
 * a shipped bundle. The internal guard below is belt-and-suspenders.
 *
 * To remove after launch: delete `src/dev/` and the gated <DevPanel /> line in
 * main.tsx. Nothing else references it.
 *
 * It's meant to grow — add entries to ACTIONS as development needs them.
 */

// Magenta accent (inline so it never depends on the Tailwind palette) — makes
// the control unmistakably a dev tool, not a product feature.
const ACCENT = '#e879f9'

// Matches the local seed user (supabase/seed.sql). Only resolves against the
// local stack; the demo account doesn't exist in prod even if this rendered.
const DEMO = { email: 'demo@lawnbizops.test', password: 'demo1234' }

async function skipLogin(): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(DEMO)
  if (error) {
    window.alert(`Dev login failed: ${error.message}`)
    return
  }
  window.location.assign('/') // full reload → gate picks up the new session
}

async function signOutAndReload(): Promise<void> {
  await signOut()
  window.location.assign('/login')
}

const ACTIONS: { label: string; run: () => void | Promise<void> }[] = [
  { label: '⏭  Skip login (demo)', run: skipLogin },
  { label: '⎋  Sign out', run: signOutAndReload },
  { label: '↻  Reload', run: () => window.location.reload() },
]

export function DevPanel() {
  const [open, setOpen] = useState(false)
  if (!import.meta.env.DEV) return null

  return (
    <div data-dev-panel className="fixed bottom-4 left-4 z-[60]">
      {open && (
        <div
          style={{ borderColor: ACCENT }}
          className="mb-2 flex w-60 flex-col gap-1 rounded-lg border-2 border-dashed bg-canvas/95 p-2 shadow-2xl"
        >
          <p className="label-caps px-1 pb-1" style={{ color: ACCENT }}>
            Dev tools
          </p>
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => void a.run()}
              className="tap-active rounded px-3 py-2 text-left text-sm text-sand hover:bg-panel"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Dev tools"
        style={{ borderColor: ACCENT, color: ACCENT }}
        className="heading-stencil rounded-full border-2 border-dashed bg-canvas px-3 py-2 text-xs shadow-lg"
      >
        DEV
      </button>
    </div>
  )
}
