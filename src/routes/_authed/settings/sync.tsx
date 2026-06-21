import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { discardFailed, flush, retryFailed } from '@/lib/outbox'
import { confirm } from '@/lib/confirm'

export const Route = createFileRoute('/_authed/settings/sync')({
  component: SyncScreen,
})

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SyncScreen() {
  const failed = useLiveQuery(
    () => db.outbox.where('status').equals('failed').sortBy('seq'),
    [],
  )
  const pendingCount = useLiveQuery(
    () => db.outbox.where('status').equals('pending').count(),
    [],
    0,
  )
  const [syncing, setSyncing] = useState(false)

  async function handleSyncNow() {
    setSyncing(true)
    try {
      await flush()
    } finally {
      setSyncing(false)
    }
  }

  async function handleDiscard(seq: number) {
    if (
      !(await confirm({
        title: 'Discard this change?',
        body: 'It never reaches the server — this is permanent.',
        confirmLabel: 'Discard',
        destructive: true,
      }))
    )
      return
    await discardFailed(seq)
  }

  const list = failed ?? []

  return (
    <div className="px-4 pt-6">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Sync issues</h1>

      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
        <span className="block text-sand">
          {pendingCount === 0
            ? 'Nothing waiting to sync'
            : `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} waiting to sync`}
        </span>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void handleSyncNow()}
          className="heading-stencil tap-active mt-3 block w-full rounded-lg bg-blaze px-4 py-3 text-canvas disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {failed !== undefined && list.length === 0 ? (
        <p className="mt-12 text-center text-lg text-go">All changes synced ✓</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2 pb-8">
          {list.map((op) => (
            <li key={op.seq} className="rounded-lg border border-edge bg-panel px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="heading-stencil text-sand">
                  {op.table} · {op.kind}
                </span>
                <span className="text-xs text-faded">
                  {op.attempts} {op.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </div>
              <p className="mt-1 text-xs text-faded">{formatWhen(op.createdAt)}</p>
              {op.error && (
                <p className="mt-2 text-sm break-words text-alert">{op.error}</p>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => void retryFailed(op.seq)}
                  className="heading-stencil flex-1 rounded-lg bg-blaze px-4 py-3 text-canvas"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => void handleDiscard(op.seq)}
                  className="heading-stencil flex-1 rounded-lg border border-edge px-4 py-3 text-alert"
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
