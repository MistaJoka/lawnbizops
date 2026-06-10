import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { TabBar } from '@/components/TabBar'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed')({
  // getSession reads the persisted session from localStorage — fast and offline-safe.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
