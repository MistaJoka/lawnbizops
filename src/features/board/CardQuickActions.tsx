import { type QuickAction } from './cardActions'

// A thin row of contextual quick-action icons per card — the card body still
// taps through to detail; these are siblings, so no nested-anchor invalidity.

const TONE: Record<string, string> = {
  go: 'text-go',
  blaze: 'text-blaze',
}

export function CardQuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null
  return (
    // stopPropagation is defensive — actions are siblings of the body link.
    <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      {actions.map((a) => {
        const cls = `tap-active flex h-touch min-w-touch items-center justify-center rounded-lg border-2 border-edge px-2 text-base ${
          a.tone ? TONE[a.tone] : 'text-sand'
        }`
        return a.href ? (
          <a
            key={a.key}
            href={a.href}
            target={a.external ? '_blank' : undefined}
            rel="noreferrer"
            aria-label={a.label}
            className={cls}
          >
            {a.glyph}
          </a>
        ) : (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            aria-label={a.label}
            className={cls}
          >
            {a.glyph}
          </button>
        )
      })}
    </div>
  )
}
