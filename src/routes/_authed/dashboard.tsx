import { Link, createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '@/features/dashboard/hooks'
import { SkeletonList } from '@/components/Skeleton'
import { formatCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardScreen,
})

function DashboardScreen() {
  const { data: m, isLoading } = useDashboard()

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center border-b-2 border-edge bg-canvas px-edge">
        <h1 className="heading-stencil text-2xl text-sand">Dashboard</h1>
      </header>

      {isLoading && !m ? (
        <div className="px-edge py-6">
          <SkeletonList count={3} variant="card" />
        </div>
      ) : (
        <div className="px-edge py-6">
          {/* Money */}
          <h2 className="label-caps text-faded">Money</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric
              label="Collected this month"
              value={formatCents(m?.collected_cents ?? 0)}
              tone="go"
              wide
            />
            <Metric
              label="Outstanding"
              value={formatCents(m?.outstanding_cents ?? 0)}
              tone={(m?.outstanding_cents ?? 0) > 0 ? 'blaze' : 'sand'}
              to="/money"
            />
            <Metric
              label="Open pipeline"
              value={formatCents(m?.pipeline_cents ?? 0)}
              tone="khaki"
              to="/pipeline"
            />
          </div>

          {/* This week */}
          <h2 className="label-caps mt-8 text-faded">This week</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric
              label="Jobs scheduled"
              value={String(m?.jobs_week ?? 0)}
              to="/schedule"
            />
            <Metric label="Jobs done" value={String(m?.jobs_done_week ?? 0)} tone="go" />
            <Metric
              label="Open follow-ups"
              value={String(m?.open_tasks ?? 0)}
              sub={
                (m?.overdue_tasks ?? 0) > 0 ? `${m?.overdue_tasks} overdue` : undefined
              }
              subTone="alert"
            />
          </div>

          {/* Pipeline breakdown */}
          <h2 className="label-caps mt-8 text-faded">Clients by stage</h2>
          <Link
            to="/pipeline"
            className="tap-active mt-3 grid grid-cols-4 gap-2 rounded-lg border-2 border-edge bg-panel p-4"
          >
            <Stage label="Lead" n={m?.leads ?? 0} />
            <Stage label="Quoted" n={m?.quoted ?? 0} />
            <Stage label="Active" n={m?.active ?? 0} />
            <Stage label="Dormant" n={m?.dormant ?? 0} />
          </Link>
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'sand',
  sub,
  subTone = 'faded',
  to,
  wide,
}: {
  label: string
  value: string
  tone?: 'sand' | 'go' | 'blaze' | 'khaki'
  sub?: string
  subTone?: 'faded' | 'alert'
  to?: string
  wide?: boolean
}) {
  const toneClass = {
    sand: 'text-sand',
    go: 'text-go',
    blaze: 'text-blaze',
    khaki: 'text-khaki',
  }[tone]
  const body = (
    <>
      <p className="label-caps text-faded">{label}</p>
      <p className={`heading-stencil mt-1 text-2xl tabular-nums ${toneClass}`}>{value}</p>
      {sub && (
        <p
          className={`mt-0.5 text-xs ${subTone === 'alert' ? 'text-alert' : 'text-faded'}`}
        >
          {sub}
        </p>
      )}
    </>
  )
  const cls = `rounded-lg border-2 border-edge bg-panel p-4 ${wide ? 'col-span-2' : ''}`
  return to ? (
    <Link to={to} className={`tap-active ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Stage({ label, n }: { label: string; n: number }) {
  return (
    <div className="text-center">
      <p className="heading-stencil text-2xl text-sand tabular-nums">{n}</p>
      <p className="label-caps mt-1 text-faded">{label}</p>
    </div>
  )
}
