import { Link, createFileRoute } from '@tanstack/react-router'

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

const comingSoon = [
  { title: 'Irrigation tester', badge: 'Diagnostic' },
  { title: 'Plant health lab', badge: 'Bio-analysis' },
  { title: 'Custom scripts', badge: 'Utilities' },
] as const

function ToolsScreen() {
  return (
    <div>
      <header className="sticky top-0 z-40 border-b-2 border-edge bg-canvas px-edge py-4">
        <Link to="/settings" className="text-sm text-faded">
          ← Settings
        </Link>
        <div className="mt-3 border-l-4 border-blaze pl-4">
          <span className="label-caps text-blaze">Utility suite</span>
          <h1 className="heading-stencil text-2xl text-sand">Field tools</h1>
        </div>
      </header>

      <main className="grid gap-3 px-edge py-4">
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

        {comingSoon.map((tool) => (
          <div
            key={tool.title}
            className="card-surface flex min-h-32 flex-col justify-between p-4 opacity-60"
          >
            <span className="status-badge self-end rounded bg-surface-highest px-2 py-1 text-faded">
              {tool.badge}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-sand">
                {tool.title}
              </h2>
              <p className="label-caps mt-1 text-faded">Coming soon</p>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
