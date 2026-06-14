import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { TabBar } from '@/components/TabBar'
import { supabase } from '@/lib/supabase'

// Auth gate. getSession reads the persisted session from localStorage, so this
// is fast and works offline (a cached session lets the field tech keep working
// in a dead zone). No session → bounce to /login.
export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/login' })
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
