import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClientForm } from '@/features/clients/ClientForm'
import { saveClient, useClient } from '@/features/clients/hooks'

export const Route = createFileRoute('/_authed/clients/$clientId/edit')({
  component: EditClientScreen,
})

function EditClientScreen() {
  const { clientId } = Route.useParams()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(clientId)

  return (
    <div className="px-edge pt-6">
      <Link
        to="/clients/$clientId"
        params={{ clientId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Edit client</h1>
      <div className="mt-4">
        {client ? (
          <ClientForm
            initial={client}
            onSubmit={async (values) => {
              await saveClient({ id: clientId, ...values })
              void navigate({ to: '/clients/$clientId', params: { clientId } })
            }}
          />
        ) : (
          <p className="mt-12 text-center text-faded">
            {isLoading ? 'Loading…' : 'Client not found.'}
          </p>
        )}
      </div>
    </div>
  )
}
