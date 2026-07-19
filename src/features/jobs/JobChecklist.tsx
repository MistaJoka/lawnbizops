import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { updateJobChecklist, type ChecklistItem, type Job } from '@/features/jobs/hooks'

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is ChecklistItem =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as ChecklistItem).id === 'string' &&
      typeof (row as ChecklistItem).text === 'string' &&
      typeof (row as ChecklistItem).done === 'boolean',
  )
}

export function JobChecklist({ job }: { job: Job & { checklist?: unknown } }) {
  const items = parseChecklist(job.checklist)
  const [draft, setDraft] = useState('')

  async function persist(next: ChecklistItem[]) {
    await updateJobChecklist(job, next)
  }

  async function toggle(id: string) {
    const next = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    await persist(next)
  }

  async function addItem() {
    const text = draft.trim()
    if (!text) return
    const next = [...items, { id: crypto.randomUUID(), text, done: false }]
    setDraft('')
    await persist(next)
  }

  return (
    <div className="mt-4 rounded-lg border-2 border-edge bg-panel p-4">
      <p className="label-caps text-khaki">On-site checklist</p>
      {items.length === 0 && (
        <EmptyState
          title="No tasks yet"
          body="List the on-site work below so nothing gets missed."
        />
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void toggle(item.id)}
              className="tap-active flex w-full items-start gap-3 rounded-lg border-2 border-edge bg-surface-highest px-3 py-3 text-left"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
                  item.done ? 'border-go bg-go text-canvas' : 'border-outline'
                }`}
              >
                {item.done ? '✓' : ''}
              </span>
              <span
                className={`text-lg ${item.done ? 'text-faded line-through' : 'text-sand'}`}
              >
                {item.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add task…"
          className="min-h-12 flex-1 rounded-lg border-2 border-edge bg-canvas px-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addItem()
          }}
        />
        <button
          type="button"
          onClick={() => void addItem()}
          className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
        >
          Add
        </button>
      </div>
    </div>
  )
}
