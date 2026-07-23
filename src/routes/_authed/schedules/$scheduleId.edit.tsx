import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ScheduleForm } from '@/features/schedules/ScheduleForm'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import { formatShortDate } from '@/lib/dates'
import {
  deleteSchedule,
  saveSchedule,
  setSchedulePaused,
  useSchedule,
} from '@/features/schedules/hooks'

export const Route = createFileRoute('/_authed/schedules/$scheduleId/edit')({
  component: EditScheduleScreen,
})

function EditScheduleScreen() {
  const { scheduleId } = Route.useParams()
  const navigate = useNavigate()
  const { data: schedule, isLoading } = useSchedule(scheduleId)

  if (!schedule) {
    return (
      <div className="px-edge pt-6">
        <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Back
        </Link>
        <p className="mt-16 text-center text-faded">
          {isLoading ? 'Loading…' : 'Schedule not found.'}
        </p>
      </div>
    )
  }

  const propertyId = schedule.property_id
  const paused = schedule.paused_at !== null

  async function handleDelete() {
    if (!schedule) return
    if (
      !(await confirm({
        title: 'Delete this schedule?',
        body: 'Its upcoming visits come off the calendar too.',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    ) {
      return
    }
    try {
      await deleteSchedule(schedule)
      void navigate({ to: '/properties/$propertyId', params: { propertyId } })
    } catch {
      toast.error('Could not reach the server — go online to delete a schedule.')
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link
        to="/properties/$propertyId"
        params={{ propertyId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Property
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Edit schedule</h1>
        {paused && (
          <span className="heading-stencil shrink-0 rounded border border-edge px-2 py-1 text-[10px] text-alert">
            Paused
          </span>
        )}
      </div>

      <PauseControls schedule={schedule} paused={paused} />

      <div className="mt-4">
        <ScheduleForm
          key={schedule.id}
          propertyId={propertyId}
          initial={schedule}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await saveSchedule(
              {
                id: schedule.id,
                property_id: propertyId,
                paused_at: schedule.paused_at,
                ...values,
              },
              { isNew: false },
            )
            void navigate({ to: '/properties/$propertyId', params: { propertyId } })
          }}
        />
      </div>

      <button
        onClick={() => void handleDelete()}
        className="heading-stencil mx-auto mt-12 block rounded-lg border border-edge px-6 py-3 text-alert"
      >
        Delete schedule
      </button>
    </div>
  )
}

/** Pause with an optional auto-resume date (a seasonal hold that can't be
 *  forgotten — the nightly sweep clears it when the day arrives). */
function PauseControls({
  schedule,
  paused,
}: {
  schedule: NonNullable<ReturnType<typeof useSchedule>['data']>
  paused: boolean
}) {
  const [resumeOn, setResumeOn] = useState('')

  if (paused) {
    return (
      <div className="mt-4">
        <button
          onClick={() => void setSchedulePaused(schedule, false)}
          className="heading-stencil w-full rounded-lg border border-go px-4 py-4 text-lg text-go"
        >
          ▶ Resume schedule
        </button>
        <p className="mt-1 text-center text-xs text-faded">
          {schedule.resume_on
            ? `Auto-resumes ${formatShortDate(schedule.resume_on)} — or resume now.`
            : 'Paused until you resume it — no visits are being scheduled.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={resumeOn}
          onChange={(e) => setResumeOn(e.target.value)}
          aria-label="Auto-resume date (optional)"
          className="min-w-0 flex-1 rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:outline-none"
        />
        <button
          onClick={() => void setSchedulePaused(schedule, true, resumeOn || null)}
          className="heading-stencil tap-active shrink-0 rounded-lg border-2 border-edge px-4 py-3 text-sand"
        >
          ⏸ Pause
        </button>
      </div>
      <p className="mt-1 text-xs text-faded">
        Pick a date for a seasonal hold that resumes itself — or leave it blank to pause
        until you come back.
      </p>
    </div>
  )
}
