import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { promptInstall, useCanInstall } from '@/lib/installPrompt'
import { signOut } from '@/features/auth/hooks'

export const Route = createFileRoute('/_authed/settings/')({
  component: SettingsScreen,
})

const rowClass =
  'tap-active flex items-center justify-between rounded-lg border-2 border-edge bg-panel px-4 py-4'

function SettingsScreen() {
  const navigate = useNavigate()
  const failedCount = useLiveQuery(
    () => db.outbox.where('status').equals('failed').count(),
    [],
    0,
  )
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const canInstall = useCanInstall()

  async function handleSignOut() {
    await signOut()
    void navigate({ to: '/login' })
  }

  return (
    <div className="px-edge pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Settings</h1>

      <div className="mt-6 flex flex-col gap-2">
        <Link to="/dashboard" className={rowClass}>
          <span className="text-lg text-sand">Dashboard</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/board" className={rowClass}>
          <span className="text-lg text-sand">Jobs board</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/tools" className={rowClass}>
          <span className="text-lg text-sand">Field tools</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/inventory" className={rowClass}>
          <span className="text-lg text-sand">Inventory</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/profile" className={rowClass}>
          <span className="text-lg text-sand">Business profile</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/automations" className={rowClass}>
          <span className="text-lg text-sand">Automations</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/preferences" className={rowClass}>
          <span className="text-lg text-sand">App preferences</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/services" className={rowClass}>
          <span className="text-lg text-sand">Service catalog</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/payments" className={rowClass}>
          <span className="text-lg text-sand">Payments</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/tax" className={rowClass}>
          <span className="text-lg text-sand">Taxes</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/export" className={rowClass}>
          <span className="text-lg text-sand">Export data</span>
          <span className="text-faded">→</span>
        </Link>
        <Link to="/settings/sync" className={rowClass}>
          <span className="text-lg text-sand">Sync issues</span>
          <span className="flex items-center gap-2">
            {failedCount > 0 && (
              <span className="heading-stencil text-alert">{failedCount}</span>
            )}
            <span className="text-faded">→</span>
          </span>
        </Link>
      </div>

      {!standalone && (
        <div className="mt-6 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Install this app</p>
          {canInstall ? (
            <>
              <p className="mt-1 text-sm text-sand">
                One tap — full screen, home-screen icon, works offline.
              </p>
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="heading-stencil tap-active mt-3 w-full rounded-lg bg-blaze py-3 text-on-cta"
              >
                Install app
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-sand">
              Open Chrome menu ⋮ → Add to Home screen. Works offline once installed.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => void handleSignOut()}
        className="heading-stencil tap-active mt-6 w-full rounded-lg border-2 border-edge py-4 text-faded"
      >
        Sign out
      </button>
    </div>
  )
}
