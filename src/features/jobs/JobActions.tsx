import { useState } from 'react'
import { rescheduleJob, setJobStatus, type JobWithContext } from '@/features/jobs/hooks'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
  canceled: 'Canceled',
  invoiced: 'Invoiced',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'text-khaki border-khaki',
  in_progress: 'text-blaze border-blaze',
  done: 'text-go border-go',
  skipped: 'text-faded border-edge',
  canceled: 'text-faded border-edge',
  invoiced: 'text-go border-go',
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`heading-stencil shrink-0 rounded border px-2 py-1 text-[10px] ${
        STATUS_COLOR[status] ?? 'text-faded border-edge'
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
            className="heading-stencil flex-1 rounded-lg bg-blaze px-2 py-3 text-sm text-canvas"
          >
            ▶ Start
          </button>
        )}
        <button
          onClick={() => void setJobStatus(job, 'done')}
          className="heading-stencil flex-1 rounded-lg border border-go px-2 py-3 text-sm text-go"
        >
          ✓ Done
        </button>
        <button
          onClick={() => void setJobStatus(job, 'skipped')}
          className="heading-stencil flex-1 rounded-lg border border-edge px-2 py-3 text-sm text-faded"
        >
          Skip
        </button>
        <button
          onClick={() => setMoving((m) => !m)}
          className="heading-stencil flex-1 rounded-lg border border-edge px-2 py-3 text-sm text-sand"
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
            className="w-full rounded-lg border border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:outline-none"
          />
          <button
            onClick={() => {
              if (!moveDate) return
              void rescheduleJob(job, moveDate)
              setMoving(false)
            }}
            className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-canvas"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )
}
