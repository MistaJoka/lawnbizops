import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ScheduleForm } from '@/features/schedules/ScheduleForm'
import { saveSchedule } from '@/features/schedules/hooks'

export const Route = createFileRoute('/_authed/schedules/new')({
  validateSearch: (search: Record<string, unknown>): { propertyId: string } => ({
    propertyId: typeof search.propertyId === 'string' ? search.propertyId : '',
  }),
  component: NewScheduleScreen,
})

function NewScheduleScreen() {
  const { propertyId } = Route.useSearch()
  const navigate = useNavigate()

  if (!propertyId) {
    return (
      <div className="px-4 pt-6">
        <p className="mt-16 text-center text-faded">
          Pick a property first, then add a schedule from its page.
        </p>
        <Link
          to="/clients"
          className="heading-stencil mx-auto mt-6 block w-fit rounded-lg border border-edge px-6 py-3 text-sand"
        >
          Go to clients
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6">
      <Link
        to="/properties/$propertyId"
        params={{ propertyId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New schedule</h1>
      <div className="mt-4">
        <ScheduleForm
          propertyId={propertyId}
          submitLabel="Save schedule"
          onSubmit={async (values) => {
            await saveSchedule(
              {
                id: crypto.randomUUID(),
                property_id: propertyId,
                paused_at: null,
                ...values,
              },
              { isNew: true },
            )
            void navigate({ to: '/properties/$propertyId', params: { propertyId } })
          }}
        />
      </div>
    </div>
  )
}
