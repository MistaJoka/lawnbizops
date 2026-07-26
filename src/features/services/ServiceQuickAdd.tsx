import { useServices } from './hooks'
import { serviceLinePrefill } from './lineDraft'
import { formatCentsShort } from '@/lib/format'

/**
 * One-tap line presets from the org's service catalog (Settings → Services).
 * Tapping a chip hands the caller a filled line draft — name + default price —
 * so building an invoice or estimate is picking, not typing. Renders nothing
 * while the catalog is empty; the manual "+ Add line" always remains.
 */
export function ServiceQuickAdd({
  onPick,
}: {
  onPick: (prefill: { description: string; dollars: string }) => void
}) {
  const { data: services } = useServices()
  if (!services || services.length === 0) return null

  return (
    <div>
      <p className="label-caps text-faded">Quick add from your services</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(serviceLinePrefill(s))}
            className="tap-active flex min-h-touch items-center gap-2 rounded-lg border border-edge bg-panel px-3 text-sm text-sand"
          >
            <span className="max-w-40 truncate">{s.name}</span>
            {s.default_price_cents > 0 && (
              <span className="text-faded tabular-nums">
                {formatCentsShort(s.default_price_cents)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
