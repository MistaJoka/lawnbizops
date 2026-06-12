import { Outlet, createFileRoute } from '@tanstack/react-router'
import { TabBar } from '@/components/TabBar'

// Auth is intentionally off for now (single-user tool; login screen comes
// later — see migration 0004). This layout route keeps the seam: when auth
// returns, restore a beforeLoad session check + redirect here.
export const Route = createFileRoute('/_authed')({
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
