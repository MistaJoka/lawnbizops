import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Calculator,
  ChartColumn,
  CloudAlert,
  Download,
  FileSpreadsheet,
  Kanban,
  Landmark,
  ListChecks,
  Map,
  Package,
  Ruler,
  Settings2,
  Store,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { promptInstall, useCanInstall } from '@/lib/installPrompt'
import { signOut } from '@/features/auth/hooks'

export const Route = createFileRoute('/_authed/settings/')({
  component: MoreScreen,
})

// The "More" hub: every surface without a tab lives here in one predictable
// place — features first, then business settings, then system. Replaces the
// old Settings screen that opened with four rows that weren't settings, and
// the create sheet's hidden "Go to" grid.
function HubRow({
  to,
  icon: Icon,
  label,
  trailing,
}: {
  to: string
  icon: LucideIcon
  label: string
  trailing?: React.ReactNode
}) {
  return (
    <Link to={to} className="tap-active flex min-h-touch items-center gap-3 px-4 py-2">
      <Icon size={18} aria-hidden className="shrink-0 text-faded" />
      <span className="min-w-0 flex-1 truncate text-base text-sand">{label}</span>
      {trailing}
      <span aria-hidden className="text-faded">
        →
      </span>
    </Link>
  )
}

function HubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="label-caps px-1 text-khaki">{title}</h2>
      <div className="card-surface mt-2 divide-y divide-edge/60">{children}</div>
    </section>
  )
}

function MoreScreen() {
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
      <h1 className="heading-stencil text-2xl text-sand">More</h1>

      <HubSection title="Work">
        <HubRow to="/dashboard" icon={ChartColumn} label="Dashboard" />
        <HubRow to="/pipeline" icon={Kanban} label="Pipeline" />
        <HubRow to="/dispatch" icon={Map} label="Dispatch map" />
        <HubRow to="/inventory" icon={Package} label="Inventory" />
        <HubRow to="/tools" icon={Ruler} label="Field tools" />
        <HubRow to="/money/reports" icon={BarChart3} label="Reports" />
        <HubRow to="/tax" icon={Landmark} label="Tax center" />
      </HubSection>

      <HubSection title="Settings">
        <HubRow to="/settings/profile" icon={Store} label="Business profile" />
        <HubRow to="/settings/services" icon={ListChecks} label="Service catalog" />
        <HubRow to="/settings/automations" icon={Zap} label="Automations" />
        <HubRow to="/settings/payments" icon={Calculator} label="Payments" />
        <HubRow to="/settings/tax" icon={FileSpreadsheet} label="Tax settings" />
        <HubRow to="/settings/preferences" icon={Settings2} label="App preferences" />
      </HubSection>

      <HubSection title="System">
        <HubRow to="/settings/export" icon={Download} label="Export data" />
        <HubRow
          to="/settings/sync"
          icon={CloudAlert}
          label="Sync issues"
          trailing={
            failedCount > 0 ? (
              <span className="heading-stencil text-alert">{failedCount}</span>
            ) : undefined
          }
        />
      </HubSection>

      {!standalone && (
        <div className="card-surface mt-5 px-4 py-4">
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
        className="tap-active mt-6 mb-4 w-full rounded-lg border border-edge py-3 text-base font-medium text-faded"
      >
        Sign out
      </button>
    </div>
  )
}
