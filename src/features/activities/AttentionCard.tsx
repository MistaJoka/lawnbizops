import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useNotableActivities,
  type NotableActivity,
} from '@/features/activities/hooks'
import { loadPreferences, savePreferences } from '@/lib/preferences'

/**
 * Home-screen inbox for the events that happen WITHOUT the operator present —
 * a new lead from the public quote form, a customer approving or declining a
 * quote online. Until there's a push backend, this card is how those moments
 * get seen instead of rotting in a client timeline nobody opens. Shows only
 * items newer than the last "Got it" tap; hides entirely when there's nothing
 * new.
 */
export function AttentionCard() {
  const { data: activities } = useNotableActivities()
  const [seenAt, setSeenAt] = useState(() => loadPreferences().attentionSeenAt)

  const unseen = (activities ?? []).filter((a) => a.created_at > seenAt)
  if (unseen.length === 0) return null

  function markSeen() {
    const now = new Date().toISOString()
    savePreferences({ attentionSeenAt: now })
    setSeenAt(now)
  }

  return (
    <div className="mx-edge mt-4 rounded-lg border-2 border-blaze bg-panel px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="heading-stencil text-xs text-blaze">
          Needs attention ({unseen.length})
        </p>
        <button
          type="button"
          onClick={markSeen}
          className="label-caps tap-active shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs text-faded"
        >
          Got it
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {unseen.slice(0, 5).map((activity) => (
          <li key={activity.id}>
            <AttentionRow activity={activity} />
          </li>
        ))}
      </ul>
      {unseen.length > 5 && (
        <p className="mt-2 text-center text-xs text-faded">
          + {unseen.length - 5} more on client timelines
        </p>
      )}
    </div>
  )
}

function glyphFor(activity: NotableActivity): string {
  if (activity.body.startsWith('New lead')) return '🌱'
  if (activity.body.startsWith('Repeat inquiry')) return '🔁'
  if (activity.body.startsWith('Customer approved')) return '✅'
  return '❌'
}

function timeAgo(timestamp: string): string {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function AttentionRow({ activity }: { activity: NotableActivity }) {
  return (
    <Link
      to="/clients/$clientId"
      params={{ clientId: activity.client_id }}
      className="tap-active flex items-center gap-3 rounded-lg border border-edge px-3 py-3"
    >
      <span aria-hidden className="shrink-0 text-lg">
        {glyphFor(activity)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display font-semibold text-sand">
          {activity.client?.name ?? 'Client'}
        </span>
        <span className="block truncate text-sm text-faded">
          {activity.body} · {timeAgo(activity.created_at)}
        </span>
      </span>
    </Link>
  )
}
