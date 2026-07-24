import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'
import { ClientForm } from '@/features/clients/ClientForm'
import { NextStepAction, NextStepSheet } from '@/components/NextStepSheet'
import { saveClient } from '@/features/clients/hooks'

export const Route = createFileRoute('/_authed/clients/new')({
  // ?lead=1 — arriving from a lead/pipeline context defaults the stage to lead.
  validateSearch: (search: Record<string, unknown>): { lead?: 1 } => ({
    lead:
      search.lead === 1 || search.lead === '1' || search.lead === true ? 1 : undefined,
  }),
  component: NewClientScreen,
})

function NewClientScreen() {
  const { lead } = Route.useSearch()
  const navigate = useNavigate()
  // Set once the save is enqueued — swaps the form for the next-step sheet
  // (add a property / start an estimate) instead of dead-ending on the detail.
  const [savedId, setSavedId] = useState<string | null>(null)

  return (
    <div className="px-edge pt-6">
      <BackLink fallback="/clients" label="Clients" />
      <h1 className="heading-stencil mt-2 text-2xl text-sand">New client</h1>
      <div className="mt-4">
        <ClientForm
          defaultLead={lead === 1}
          onSubmit={async (values) => {
            const id = crypto.randomUUID()
            await saveClient({ id, ...values })
            setSavedId(id)
          }}
        />
      </div>

      <NextStepSheet
        open={savedId !== null}
        title="Client saved"
        subtitle="A property is where jobs, schedules, and quotes attach."
        doneLabel="Open client →"
        onDone={() => {
          if (savedId)
            void navigate({ to: '/clients/$clientId', params: { clientId: savedId } })
        }}
      >
        <NextStepAction
          primary
          to="/properties/new"
          search={{ clientId: savedId ?? '' }}
          label="Add a property"
          hint="Address, gate code, lawn notes"
        />
        <NextStepAction
          to="/estimates/new"
          search={{ clientId: savedId ?? '' }}
          label="Create an estimate"
          hint="Quote the work first"
        />
      </NextStepSheet>
    </div>
  )
}
