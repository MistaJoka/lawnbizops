import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { TabBar } from '@/components/TabBar'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { appStateQuery } from '@/features/auth/hooks'

// App gate. getSession reads the persisted session from localStorage (instant,
// offline-friendly). The app_state check is cached (ensureQueryData honours
// staleTime), so navigation between screens doesn't block on a network RPC —
// only the first check, or one every few minutes, hits the server. Routing:
//   no session → /login · not onboarded → /onboarding · no access → /billing
// Fails open on a transient error so a network blip never locks a paying user
// out of their own data (billing is not a security boundary — RLS is).
export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession()
    if (!sess.session) throw redirect({ to: '/login' })

    const state = await queryClient.ensureQueryData(appStateQuery)
    if (!state) return
    if (!state.onboarded) throw redirect({ to: '/onboarding' })
    if (!state.access) throw redirect({ to: '/billing' })
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Phone-first: one centered column on tablet/desktop instead of an
          edge-to-edge stretch. 28rem matches the FAB offset in Fab.tsx. */}
      <main className="mx-auto w-full max-w-md flex-1 pb-24">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
