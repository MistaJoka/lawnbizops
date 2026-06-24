import { useState } from 'react'
import {
  saveTask,
  toggleTaskDone,
  useOpenTasks,
  useTasksForClient,
  type Task,
} from './hooks'
import { useClients, type Client } from '@/features/clients/hooks'
import { localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

function TaskRow({ task, clientName }: { task: Task; clientName?: string }) {
  const overdue = task.due_date !== null && task.due_date < localToday()
  return (
    <li className="flex items-center gap-3 rounded-lg border-2 border-edge bg-panel px-3 py-3">
      <button
        type="button"
        aria-label="Mark done"
        onClick={() => void toggleTaskDone(task)}
        className="tap-active flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-edge"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sand">{task.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs">
          {clientName && <span className="text-faded">{clientName}</span>}
          {task.due_date && (
            <span className={overdue ? 'text-alert' : 'text-faded'}>
              {overdue ? 'Overdue · ' : ''}
              {formatShortDate(task.due_date)}
            </span>
          )}
        </p>
      </div>
    </li>
  )
}

function QuickAdd({ clientId, label }: { clientId?: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const t = title.trim()
    if (!t || busy) return
    setBusy(true)
    try {
      await saveTask({
        title: t,
        due_date: due || null,
        client_id: clientId ?? null,
      })
      setTitle('')
      setDue('')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="heading-stencil tap-active w-full rounded-lg border-2 border-dashed border-edge py-3 text-sm text-faded"
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-edge bg-surface-highest p-3">
      <input
        autoFocus
        placeholder="Follow-up"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border-2 border-edge bg-panel px-3 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border-2 border-edge bg-panel px-3 py-3 text-sand focus:border-blaze focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || title.trim() === ''}
          onClick={() => void add()}
          className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-5 text-sm text-on-cta disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}

/** Today screen: overdue + due-today follow-ups with a quick-add. */
export function TasksSection() {
  const { data: tasks } = useOpenTasks()
  const { data: clients } = useClients()
  const today = localToday()

  const byId = new Map<string, Client>((clients ?? []).map((c) => [c.id, c]))
  const due = (tasks ?? []).filter((t) => t.due_date !== null && t.due_date <= today)
  const overdue = due.filter((t) => t.due_date! < today)
  const dueToday = due.filter((t) => t.due_date === today)
  const sorted = [...overdue, ...dueToday]

  return (
    <section className="px-edge pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label-caps text-faded">Follow-ups</h2>
        {overdue.length > 0 && (
          <span className="label-caps text-alert">{overdue.length} overdue</span>
        )}
      </div>
      {sorted.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {sorted.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              clientName={t.client_id ? byId.get(t.client_id)?.name : undefined}
            />
          ))}
        </ul>
      )}
      <QuickAdd label="+ Add follow-up" />
    </section>
  )
}

/** Client detail: that client's open follow-ups + a prefilled quick-add. */
export function ClientFollowUps({ clientId }: { clientId: string }) {
  const { data: tasks } = useTasksForClient(clientId)
  const rows = tasks ?? []
  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
      {rows.length === 0 && <p className="text-sm text-faded">No open follow-ups.</p>}
      <QuickAdd clientId={clientId} label="+ Follow up" />
    </div>
  )
}
