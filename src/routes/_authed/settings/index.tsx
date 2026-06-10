import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/settings/')({
  component: SettingsScreen,
})

function SettingsScreen() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    void navigate({ to: '/login' })
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Settings</h1>

      <Link
        to="/settings/services"
        className="mt-6 flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4"
      >
        <span className="text-lg text-sand">Service catalog</span>
        <span className="text-faded">→</span>
      </Link>

      <p className="mt-12 text-center text-faded">
        Business profile and integrations coming in later phases.
      </p>
      <button
        onClick={handleSignOut}
        className="heading-stencil mx-auto mt-12 block rounded-lg border border-edge px-6 py-3 text-faded"
      >
        Sign out
      </button>
    </div>
  )
}
