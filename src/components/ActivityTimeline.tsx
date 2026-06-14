import { useState } from 'react'
import {
  logActivity,
  useActivities,
  type ActivityKind,
} from '@/features/activities/hooks'
import { relativeTime } from '@/lib/dates'

const KIND_DOT: Record<string, { glyph: string; tint: string }> = {
  note: { glyph: '•', tint: 'text-faded' },
  call: { glyph: '📞', tint: 'text-go' },
  stage_change: { glyph: '⇨', tint: 'text-blaze' },
  status_change: { glyph: '↻', tint: 'text-khaki' },
  doc_sent: { glyph: '✉', tint: 'text-sand' },
}

export function ActivityTimeline({ clientId }: { clientId: string }) {
  const { data: activities } = useActivities(clientId)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function log(kind: ActivityKind) {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      await logActivity({ clientId, kind, body: text })
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  const rows = activities ?? []

  return (
    <div>
      <div className="flex flex-col gap-2">
        <textarea
          rows={2}
          placeholder="What happened?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border-2 border-edge bg-surface-highest px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none focus:ring-2 focus:ring-blaze/20"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || body.trim() === ''}
            onClick={() => void log('note')}
            className="heading-stencil tap-active min-h-touch rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand disabled:opacity-50"
          >
            Log note
          </button>
          <button
            type="button"
            disabled={busy || body.trim() === ''}
            onClick={() => void log('call')}
            className="heading-stencil tap-active min-h-touch rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand disabled:opacity-50"
          >
            Log call
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-faded">No activity yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {rows.map((a) => {
            const dot = KIND_DOT[a.kind] ?? KIND_DOT.note
            return (
              <li key={a.id} className="relative flex gap-3 pb-4">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface-low text-sm ${dot.tint}`}
                >
                  {dot.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-sand">{a.body}</p>
                  <p className="mt-0.5 text-xs text-faded">
                    {relativeTime(a.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
