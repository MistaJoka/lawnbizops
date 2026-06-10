import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ScheduleForm } from '@/features/schedules/ScheduleForm'
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
      <div className="px-4 pt-6">
        <Link to="/clients" className="text-sm text-faded">
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
      !window.confirm(
        'Delete this schedule? Its upcoming visits come off the calendar too.',
      )
    ) {
      return
    }
    try {
      await deleteSchedule(schedule)
      void navigate({ to: '/properties/$propertyId', params: { propertyId } })
    } catch {
      window.alert('Could not reach the server — go online to delete a schedule.')
    }
  }

  return (
    <div className="px-4 pt-6">
      <Link
        to="/properties/$propertyId"
        params={{ propertyId }}
        className="text-sm text-faded"
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

      <button
        onClick={() => void setSchedulePaused(schedule, !paused)}
        className={`heading-stencil mt-4 w-full rounded-lg border px-4 py-4 text-lg ${
          paused ? 'border-go text-go' : 'border-edge text-sand'
        }`}
      >
        {paused ? '▶ Resume schedule' : '⏸ Pause schedule'}
      </button>

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
