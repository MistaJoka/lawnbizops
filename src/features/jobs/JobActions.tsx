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
 * One glove-sized primary action (the expected next step) + a ⋯ overflow for
 * the rarer moves. Shared by the Today route cards, the board's Scheduled /
 * In-progress cards, and the job detail screen. Only renders for live jobs.
 */
export function JobActions({ job }: { job: JobWithContext }) {
  const [open, setOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const [moveDate, setMoveDate] = useState(job.scheduled_date)

  if (job.status !== 'scheduled' && job.status !== 'in_progress') return null

  const scheduled = job.status === 'scheduled'
  const primaryLabel = scheduled ? '▶ Start' : '✓ Done'
  const primary = () => void setJobStatus(job, scheduled ? 'in_progress' : 'done')

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="mt-3 flex gap-2">
        <button
          onClick={primary}
          className={`heading-stencil tap-active min-h-12 flex-1 rounded-lg px-2 py-3 text-base ${
            scheduled ? 'bg-blaze text-on-cta' : 'border-2 border-go text-go'
          }`}
        >
          {primaryLabel}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="More actions"
          aria-expanded={open}
          className="heading-stencil tap-active min-h-12 w-12 shrink-0 rounded-lg border-2 border-edge text-xl text-sand"
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border-2 border-edge bg-surface-low p-2">
          {scheduled && (
            <OverflowButton onClick={() => void setJobStatus(job, 'done')}>
              ✓ Mark done
            </OverflowButton>
          )}
          <OverflowButton onClick={() => void setJobStatus(job, 'skipped')}>
            Skip (rain / no-show)
          </OverflowButton>
          <OverflowButton onClick={() => setMoving((m) => !m)}>
            Move to another day
          </OverflowButton>
          {moving && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
                aria-label="New date"
                className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:ring-2 focus:ring-blaze/20 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (!moveDate) return
                  void rescheduleJob(job, moveDate)
                  setMoving(false)
                  setOpen(false)
                }}
                className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
              >
                Go
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OverflowButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="heading-stencil tap-active min-h-12 w-full rounded-lg border-2 border-edge px-3 py-3 text-left text-sm text-sand"
    >
      {children}
    </button>
  )
}
