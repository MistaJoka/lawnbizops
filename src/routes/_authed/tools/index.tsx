import { Link, createFileRoute } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'

export const Route = createFileRoute('/_authed/tools/')({
  component: ToolsScreen,
})

const tools = [
  {
    to: '/tools/mulch',
    title: 'Mulch & stone',
    badge: 'Volume',
    desc: 'Yard coverage and fill material volume from area and depth.',
  },
  {
    to: '/tools/grade',
    title: 'Grade estimator',
    badge: 'Precision',
    desc: 'Slope and drainage readout from your device tilt sensors.',
  },
] as const

function ToolsScreen() {
  return (
    <div>
      <header className="sticky top-0 z-40 border-b-2 border-edge bg-canvas px-edge py-4">
        <BackLink fallback="/settings" label="Settings" />
        <div className="mt-3 border-l-4 border-blaze pl-4">
          <span className="label-caps text-blaze">Utility suite</span>
          <h1 className="heading-stencil text-2xl text-sand">Field tools</h1>
        </div>
      </header>

      {/* div, not <main>: the _authed layout already provides the single <main>
          landmark — a nested one here is invalid HTML + a duplicate a11y landmark. */}
      <div className="grid gap-3 px-edge py-4">
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="card-surface tap-active flex min-h-40 flex-col justify-between p-4"
          >
            <span className="status-badge self-end rounded bg-edge px-2 py-1 text-sand">
              {tool.badge}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-sand">
                {tool.title}
              </h2>
              <p className="mt-1 text-muted">{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
