import { useState } from 'react'
import {
  StatusChip as SharedStatusChip,
  type StatusVariant,
} from '@/components/StatusChip'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import { rescheduleJob, setJobStatus, type JobWithContext } from '@/features/jobs/hooks'

const VARIANT: Record<string, StatusVariant> = {
  scheduled: 'info',
  in_progress: 'progress',
  done: 'success',
  skipped: 'neutral',
  canceled: 'neutral',
  invoiced: 'success',
}

const LABEL: Record<string, string> = {
  scheduled: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
  canceled: 'Canceled',
  invoiced: 'Invoiced',
}

function jobStatusVariant(status: string): StatusVariant {
  return VARIANT[status] ?? 'neutral'
}

export function StatusChip({ status }: { status: string }) {
  return (
    <SharedStatusChip variant={jobStatusVariant(status)}>
      {LABEL[status] ?? status}
    </SharedStatusChip>
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
  const [moveBusy, setMoveBusy] = useState(false)
  const [moveDate, setMoveDate] = useState(job.scheduled_date)

  if (job.status !== 'scheduled' && job.status !== 'in_progress') return null

  const scheduled = job.status === 'scheduled'
  const primaryLabel = scheduled ? '▶ Start' : '✓ Done'
  const primary = () => void (scheduled ? setJobStatus(job, 'in_progress') : markDone())

  // Finishing a job with no price invoices at $0; no service means revenue
  // can't be tracked by service; jumping scheduled → done skips in_progress, so
  // no real work time is captured. One combined confirm (never stacked) instead
  // of silently under-recording.
  async function markDone() {
    const skippedStart = job.status === 'scheduled'
    const notes: string[] = []
    if (skippedStart)
      notes.push('This job was never started, so no work time was captured.')
    if (job.price_cents === 0)
      notes.push(
        'It has no price — it will invoice at $0. You can still fix the invoice line later.',
      )
    else if (job.service_id === null)
      notes.push('It has no service set, so its revenue won’t be tracked by service.')
    if (notes.length > 0) {
      if (
        !(await confirm({
          title: skippedStart ? 'Mark done without starting?' : 'Mark done as-is?',
          body: notes.join(' '),
          confirmLabel: 'Mark done',
        }))
      )
        return
    }
    await setJobStatus(job, 'done')
  }

  async function skip() {
    if (
      !(await confirm({
        title: 'Skip this job?',
        body: 'Marks it skipped (rain / no-show). You can reopen it later.',
        confirmLabel: 'Skip',
      }))
    )
      return
    await setJobStatus(job, 'skipped')
  }

  async function move() {
    if (!moveDate || moveBusy) return
    setMoveBusy(true)
    try {
      await rescheduleJob(job, moveDate)
      setMoving(false)
      setOpen(false)
    } catch {
      toast.error('Could not move job — try again')
    } finally {
      setMoveBusy(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="mt-3 flex gap-2">
        <button
          onClick={primary}
          className="heading-stencil tap-active min-h-12 flex-1 rounded-lg bg-blaze px-2 py-3 text-base text-on-cta"
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
            <OverflowButton onClick={() => void markDone()}>✓ Mark done</OverflowButton>
          )}
          <OverflowButton onClick={() => void skip()}>
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
                disabled={moveBusy}
                aria-label="New date"
                className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:ring-2 focus:ring-blaze/20 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => void move()}
                disabled={moveBusy}
                className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta disabled:opacity-50"
              >
                {moveBusy ? '…' : 'Go'}
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
