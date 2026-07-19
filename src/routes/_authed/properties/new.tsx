import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PropertyForm } from '@/features/properties/PropertyForm'
import { NextStepAction, NextStepSheet } from '@/components/NextStepSheet'
import { savePropertyWithGeocode } from '@/features/properties/hooks'

export const Route = createFileRoute('/_authed/properties/new')({
  validateSearch: (search: Record<string, unknown>): { clientId: string } => ({
    clientId: typeof search.clientId === 'string' ? search.clientId : '',
  }),
  component: NewPropertyScreen,
})

function NewPropertyScreen() {
  const { clientId } = Route.useSearch()
  const navigate = useNavigate()
  // Set once the save is enqueued — offers the forward path (schedule /
  // estimate / one-off job) instead of dropping back to the client page.
  const [savedId, setSavedId] = useState<string | null>(null)

  if (!clientId) {
    return (
      <div className="px-edge pt-6">
        <p className="mt-16 text-center text-faded">
          Pick a client first, then add a property from their page.
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
    <div className="px-edge pt-6">
      <Link
        to="/clients/$clientId"
        params={{ clientId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New property</h1>
      <div className="mt-4">
        <PropertyForm
          onSubmit={async (values) => {
            const id = crypto.randomUUID()
            await savePropertyWithGeocode({ id, client_id: clientId, ...values })
            setSavedId(id)
          }}
        />
      </div>

      <NextStepSheet
        open={savedId !== null}
        title="Property saved"
        subtitle="Line up the work while you're here."
        doneLabel="Back to client →"
        onDone={() => void navigate({ to: '/clients/$clientId', params: { clientId } })}
      >
        <NextStepAction
          primary
          to="/schedules/new"
          search={{ propertyId: savedId ?? '' }}
          label="Set up recurring visits"
          hint="Weekly, biweekly, or monthly"
        />
        <NextStepAction
          to="/estimates/new"
          search={{ clientId, propertyId: savedId ?? '' }}
          label="Create an estimate"
          hint="Quote the work first"
        />
        <NextStepAction
          to="/jobs/new"
          search={{ propertyId: savedId ?? '' }}
          label="Book a one-off job"
          hint="Single visit, pick a date"
        />
      </NextStepSheet>
    </div>
  )
}
