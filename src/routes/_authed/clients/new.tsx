import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClientForm } from '@/features/clients/ClientForm'
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

  return (
    <div className="px-edge pt-6">
      <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Clients
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New client</h1>
      <div className="mt-4">
        <ClientForm
          defaultLead={lead === 1}
          onSubmit={async (values) => {
            const id = crypto.randomUUID()
            await saveClient({ id, ...values })
            void navigate({ to: '/clients/$clientId', params: { clientId: id } })
          }}
        />
      </div>
    </div>
  )
}
