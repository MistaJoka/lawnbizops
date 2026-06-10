import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  formatAddress,
  savePropertyServicePrice,
  useProperty,
  usePropertyServices,
} from '@/features/properties/hooks'
import { useServices, type Service } from '@/features/services/hooks'
import { formatCents, parseDollarsToCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/properties/$propertyId/')({
  component: PropertyDetailScreen,
})

function PropertyDetailScreen() {
  const { propertyId } = Route.useParams()
  const { data: property, isLoading } = useProperty(propertyId)
  const { data: services } = useServices()
  const { data: overrides } = usePropertyServices(propertyId)

  if (!property) {
    return (
      <div className="px-4 pt-6">
        <Link to="/clients" className="text-sm text-faded">
          ← Clients
        </Link>
        <p className="mt-16 text-center text-faded">
          {isLoading ? 'Loading…' : 'Property not found.'}
        </p>
      </div>
    )
  }

  const address = formatAddress(property)

  return (
    <div className="px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/clients/$clientId"
            params={{ clientId: property.client_id }}
            className="text-sm text-faded"
          >
            ← Client
          </Link>
          <h1 className="heading-stencil mt-2 text-2xl text-khaki">
            {property.label || 'Property'}
          </h1>
        </div>
        <Link
          to="/properties/$propertyId/edit"
          params={{ propertyId }}
          className="heading-stencil shrink-0 rounded-lg border border-edge px-4 py-3 text-sm text-sand"
        >
          Edit
        </Link>
      </div>

      {address && (
        <a
          href={`https://maps.apple.com/?q=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block rounded-lg border border-edge bg-panel px-4 py-4"
        >
          <span className="heading-stencil text-xs text-faded">Address</span>
          <span className="mt-1 block text-lg text-sand underline decoration-edge">
            {address}
          </span>
          {property.lat === null && (
            <span className="heading-stencil mt-2 inline-block rounded border border-edge px-2 py-1 text-[10px] text-alert">
              no pin
            </span>
          )}
        </a>
      )}

      {property.gate_code && (
        <div className="mt-4 rounded-lg border border-blaze bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Gate code</p>
          <p className="heading-stencil mt-1 text-3xl text-blaze">{property.gate_code}</p>
        </div>
      )}

      {property.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{property.notes}</p>
        </div>
      )}

      <h2 className="heading-stencil mt-8 text-lg text-khaki">Service prices</h2>
      <p className="mt-1 text-sm text-faded">
        Tap a service to set a price for this property.
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {(services ?? []).map((service) => (
          <ServicePriceRow
            key={service.id}
            propertyId={propertyId}
            service={service}
            overrideCents={
              (overrides ?? []).find((ps) => ps.service_id === service.id)?.price_cents
            }
          />
        ))}
      </ul>
      {(services ?? []).length === 0 && (
        <p className="mt-2 text-sm text-faded">
          No services in the catalog yet. Add them under Settings → Service catalog.
        </p>
      )}
    </div>
  )
}

function ServicePriceRow({
  propertyId,
  service,
  overrideCents,
}: {
  propertyId: string
  service: Service
  overrideCents: number | undefined
}) {
  const [editing, setEditing] = useState(false)
  const [dollars, setDollars] = useState('')
  const [error, setError] = useState(false)

  function open() {
    const cents = overrideCents ?? service.default_price_cents
    setDollars((cents / 100).toFixed(2))
    setError(false)
    setEditing(true)
  }

  async function save() {
    const cents = parseDollarsToCents(dollars)
    if (cents === null) {
      setError(true)
      return
    }
    await savePropertyServicePrice({
      property_id: propertyId,
      service_id: service.id,
      price_cents: cents,
    })
    setEditing(false)
  }

  return (
    <li className="rounded-lg border border-edge bg-panel px-4 py-4">
      <button
        onClick={() => (editing ? setEditing(false) : open())}
        className="block w-full"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-left text-lg text-sand">
            {service.name}
          </span>
          <span className="shrink-0 text-right">
            {overrideCents !== undefined ? (
              <span className="text-lg text-go">{formatCents(overrideCents)}</span>
            ) : (
              <span className="text-lg text-faded">
                {formatCents(service.default_price_cents)}
              </span>
            )}
            <span className="block text-xs text-faded">
              {overrideCents !== undefined
                ? 'this property'
                : `default / ${service.unit}`}
            </span>
          </span>
        </span>
      </button>
      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <input
            inputMode="decimal"
            autoFocus
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value)
              setError(false)
            }}
            aria-label={`Price for ${service.name}`}
            className={`w-full rounded-lg border bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:outline-none ${
              error ? 'border-alert' : 'border-edge'
            }`}
          />
          <button
            onClick={() => void save()}
            className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-canvas"
          >
            Set
          </button>
        </div>
      )}
      {editing && error && (
        <p className="mt-2 text-sm text-alert">Enter a dollar amount.</p>
      )}
    </li>
  )
}
