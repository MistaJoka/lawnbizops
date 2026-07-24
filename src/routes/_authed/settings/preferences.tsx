import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Toggle } from '@/components/Toggle'
import { loadPreferences, savePreferences } from '@/lib/preferences'
import { applyOfflinePreference } from '@/lib/queryClient'

export const Route = createFileRoute('/_authed/settings/preferences')({
  component: PreferencesScreen,
})

function PreferencesScreen() {
  const [prefs, setPrefs] = useState(loadPreferences)

  function update<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    const next = savePreferences({ [key]: value })
    setPrefs(next)
    if (key === 'offlinePreferred') {
      applyOfflinePreference(next.offlinePreferred)
    }
  }

  return (
    <div className="px-edge pt-6 pb-24">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">App preferences</h1>

      <section className="mt-6">
        <p className="label-caps mb-3 text-faded">Field tools</p>
        <div className="card-surface divide-y-2 divide-edge">
          <div className="p-4">
            <Toggle
              id="gps"
              label="GPS tracking"
              checked={prefs.gpsTracking}
              onChange={(v) => update('gpsTracking', v)}
            />
            <p className="mt-1 text-sm text-muted">
              Drive order starts from your location. Off = route starts at the first job.
            </p>
          </div>
          <div className="p-4">
            <Toggle
              id="inv-alerts"
              label="Inventory alerts"
              checked={prefs.inventoryAlerts}
              onChange={(v) => update('inventoryAlerts', v)}
            />
            <p className="mt-1 text-sm text-muted">
              Low-stock banner on Today when items hit reorder level
            </p>
          </div>
          <div className="p-4">
            <Toggle
              id="offline"
              label="Prefer offline cache"
              checked={prefs.offlinePreferred}
              onChange={(v) => update('offlinePreferred', v)}
            />
            <p className="mt-1 text-sm text-muted">
              Data saver — fewer background refreshes, cached data lasts 30 min
            </p>
          </div>
        </div>
      </section>

      {/* Push notifications: no backend yet — no toggle until there is one.
          Email reminders (the real notification channel) live under
          Settings → Automations. */}

      <section className="mt-6">
        <p className="label-caps mb-3 text-faded">Support</p>
        <div className="card-surface">
          <a
            href="https://github.com/MistaJoka/lawnbizops#readme"
            target="_blank"
            rel="noreferrer"
            className="tap-active block p-4 text-lg text-sand"
          >
            Help &amp; docs →
          </a>
        </div>
        <p className="label-caps mt-4 text-center text-faded">LawnBizOps v1.0</p>
      </section>
    </div>
  )
}
