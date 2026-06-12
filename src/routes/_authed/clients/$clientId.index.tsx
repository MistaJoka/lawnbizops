import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { archiveClient, useClient } from '@/features/clients/hooks'
import { formatAddress, useProperties } from '@/features/properties/hooks'
import { isOpen, useInvoiceBalances } from '@/features/invoices/hooks'
import { formatCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/clients/$clientId/')({
  component: ClientDetailScreen,
})

function ClientDetailScreen() {
  const { clientId } = Route.useParams()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(clientId)
  const { data: properties } = useProperties(clientId)
  const { data: invoices } = useInvoiceBalances()
  const openBalance = (invoices ?? [])
    .filter((inv) => inv.client_id === clientId && isOpen(inv))
    .reduce((sum, inv) => sum + inv.balance_cents, 0)

  if (!client) {
    return (
      <div className="px-4 pt-6">
        <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Clients
        </Link>
        <p className="mt-16 text-center text-faded">
          {isLoading ? 'Loading…' : 'Client not found.'}
        </p>
      </div>
    )
  }

  async function handleArchive() {
    if (!client) return
    if (
      !window.confirm(`Archive ${client.name}? They'll disappear from your client list.`)
    ) {
      return
    }
    await archiveClient(client)
    void navigate({ to: '/clients' })
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
            ← Clients
          </Link>
          <h1 className="heading-stencil mt-2 text-2xl text-khaki">{client.name}</h1>
        </div>
        <Link
          to="/clients/$clientId/edit"
          params={{ clientId }}
          className="heading-stencil shrink-0 rounded-lg border border-edge px-4 py-3 text-sm text-sand"
        >
          Edit
        </Link>
      </div>

      {client.phone && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`tel:${client.phone}`}
            className="heading-stencil rounded-lg bg-blaze px-4 py-4 text-center text-lg text-canvas"
          >
            📞 Call
          </a>
          <a
            href={`sms:${client.phone}`}
            className="heading-stencil rounded-lg border border-edge bg-panel px-4 py-4 text-center text-lg text-sand"
          >
            💬 Text
          </a>
        </div>
      )}

      {client.email && <p className="mt-4 text-faded">{client.email}</p>}

      {client.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{client.notes}</p>
        </div>
      )}

      {openBalance > 0 && (
        <Link
          to="/money"
          className="mt-4 flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4"
        >
          <span className="heading-stencil text-xs text-faded">Open balance</span>
          <span className="heading-stencil text-xl text-blaze">
            {formatCents(openBalance)} →
          </span>
        </Link>
      )}

      <h2 className="heading-stencil mt-8 text-lg text-khaki">Properties</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {(properties ?? []).map((property) => (
          <li key={property.id}>
            <Link
              to="/properties/$propertyId"
              params={{ propertyId: property.id }}
              className="block rounded-lg border border-edge bg-panel px-4 py-4"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg text-sand">{property.label || 'Property'}</span>
                {property.lat === null && (
                  <span className="heading-stencil shrink-0 rounded border border-edge px-2 py-1 text-[10px] text-alert">
                    no pin
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm text-faded">
                {formatAddress(property)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {(properties ?? []).length === 0 && (
        <p className="mt-2 text-sm text-faded">No properties yet.</p>
      )}

      <Link
        to="/properties/new"
        search={{ clientId }}
        className="heading-stencil mt-4 block w-full rounded-lg bg-blaze px-4 py-4 text-center text-lg text-canvas"
      >
        + Add property
      </Link>

      <button
        onClick={() => void handleArchive()}
        className="heading-stencil mx-auto mt-12 block rounded-lg border border-edge px-6 py-3 text-alert"
      >
        Archive client
      </button>
    </div>
  )
}
