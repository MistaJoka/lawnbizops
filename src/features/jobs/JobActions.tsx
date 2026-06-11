import { useState } from 'react'
import { rescheduleJob, setJobStatus, type JobWithContext } from '@/features/jobs/hooks'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
  canceled: 'Canceled',
  invoiced: 'Invoiced',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-olive text-sand',
  in_progress: 'bg-blaze text-on-cta',
  done: 'bg-go text-canvas',
  skipped: 'bg-surface-highest text-faded',
  canceled: 'bg-surface-highest text-faded',
  invoiced: 'bg-go text-canvas',
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`status-badge shrink-0 rounded px-2 py-0.5 ${
        STATUS_COLOR[status] ?? 'bg-surface-highest text-faded'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

/**
 * Start / Done / Skip / Move action row, shared by the Today cards and the
 * job detail screen. Move reveals an inline date input.
 */
export function JobActions({ job }: { job: JobWithContext }) {
  const [moving, setMoving] = useState(false)
  const [moveDate, setMoveDate] = useState(job.scheduled_date)

  if (job.status !== 'scheduled' && job.status !== 'in_progress') return null

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="mt-3 flex gap-2">
        {job.status === 'scheduled' && (
          <button
            onClick={() => void setJobStatus(job, 'in_progress')}
            className="heading-stencil tap-active min-h-12 flex-1 rounded-lg bg-blaze px-2 py-3 text-sm text-on-cta"
          >
            ▶ Start
          </button>
        )}
        <button
          onClick={() => void setJobStatus(job, 'done')}
          className="heading-stencil tap-active min-h-12 flex-1 rounded-lg border-2 border-go px-2 py-3 text-sm text-go"
        >
          ✓ Done
        </button>
        <button
          onClick={() => void setJobStatus(job, 'skipped')}
          className="heading-stencil tap-active min-h-12 flex-1 rounded-lg border-2 border-edge px-2 py-3 text-sm text-faded"
        >
          Skip
        </button>
        <button
          onClick={() => setMoving((m) => !m)}
          className="heading-stencil tap-active min-h-12 flex-1 rounded-lg border-2 border-edge px-2 py-3 text-sm text-sand"
        >
          Move
        </button>
      </div>
      {moving && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={moveDate}
            onChange={(e) => setMoveDate(e.target.value)}
            aria-label="New date"
            className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:outline-none focus:ring-2 focus:ring-blaze/20"
          />
          <button
            onClick={() => {
              if (!moveDate) return
              void rescheduleJob(job, moveDate)
              setMoving(false)
            }}
            className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )
}
