import { Link, createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export const Route = createFileRoute('/_authed/settings/')({
  component: SettingsScreen,
})

const rowClass =
  'flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4'

function SettingsScreen() {
  const failedCount = useLiveQuery(
    () => db.outbox.where('status').equals('failed').count(),
    [],
    0,
  )
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Settings</h1>

      <div className="mt-6 flex flex-col gap-2">
        <Link to="/settings/profile" className={rowClass}>
          <span className="text-lg text-sand">Business profile</span>
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
          <p className="mt-1 text-sm text-sand">
            Open Chrome menu ⋮ → Add to Home screen. Works offline once installed.
          </p>
        </div>
      )}
    </div>
  )
}
