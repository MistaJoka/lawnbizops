import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClients } from '@/features/clients/hooks'
import {
  useProperties,
  useProperty,
  usePropertyServices,
  type Property,
} from '@/features/properties/hooks'
import { useServices } from '@/features/services/hooks'
import {
  createOneOffJob,
  useJobsForRange,
  type JobPropertyContext,
} from '@/features/jobs/hooks'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { localToday, parseDollarsToCents } from '@/lib/format'
import { addDaysISO, parseLocalDate } from '@/lib/dates'
import { haversineMiles, type LatLng } from '@/lib/route'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const Route = createFileRoute('/_authed/jobs/new')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { date?: string; propertyId?: string } => ({
    date:
      typeof search.date === 'string' && DATE_RE.test(search.date)
        ? search.date
        : undefined,
    propertyId: typeof search.propertyId === 'string' ? search.propertyId : undefined,
  }),
  component: NewJobScreen,
})

function NewJobScreen() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const today = localToday()

  // null = untouched → derive from the ?propertyId= deep link / auto-select.
  const [clientIdRaw, setClientIdRaw] = useState<string | null>(null)
  const [propertyIdRaw, setPropertyIdRaw] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [dollars, setDollars] = useState('')
  const [priceError, setPriceError] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(search.date ?? today)
  const [notes, setNotes] = useState('')

  const { data: clients } = useClients()
  const { data: paramProperty } = useProperty(search.propertyId ?? '')

  const clientId = clientIdRaw ?? paramProperty?.client_id ?? ''
  const { data: properties } = useProperties(clientId)

  // Deep-linked property if it belongs to this client, else auto-pick a
  // client's only property.
  const derivedPropertyId =
    properties === undefined
      ? (search.propertyId ?? '')
      : properties.length === 1
        ? properties[0].id
        : properties.some((p) => p.id === search.propertyId)
          ? (search.propertyId as string)
          : ''
  const propertyId = propertyIdRaw ?? derivedPropertyId

  const { data: services } = useServices()
  const { data: overrides } = usePropertyServices(propertyId)

  const property: Property | undefined =
    (properties ?? []).find((p) => p.id === propertyId) ??
    (paramProperty?.id === propertyId ? paramProperty : undefined)
  const client = (clients ?? []).find((c) => c.id === clientId)

  function pickService(id: string) {
    setServiceId(id)
    const service = (services ?? []).find((s) => s.id === id)
    if (!service) return
    const cents =
      (overrides ?? []).find((ps) => ps.service_id === id)?.price_cents ??
      service.default_price_cents
    setDollars((cents / 100).toFixed(2))
    setPriceError(false)
  }

  async function handleSave() {
    const cents = parseDollarsToCents(dollars)
    if (cents === null) {
      setPriceError(true)
      return
    }
    if (!propertyId || !date) return
    const context: JobPropertyContext | null = property
      ? {
          id: property.id,
          label: property.label,
          address_line1: property.address_line1,
          city: property.city,
          lat: property.lat,
          lng: property.lng,
          gate_code: property.gate_code,
          notes: property.notes,
          client: client
            ? { id: client.id, name: client.name, phone: client.phone }
            : null,
        }
      : null
    await createOneOffJob(
      {
        id: crypto.randomUUID(),
        property_id: propertyId,
        service_id: serviceId || null,
        scheduled_date: date,
        price_cents: cents,
        title,
        notes,
      },
      context,
    )
    void navigate({ to: '/schedule', search: { date } })
  }

  return (
    <div className="px-4 pt-6">
      <Link to="/" className="text-sm text-faded">
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New job</h1>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Client">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientIdRaw(e.target.value)
              setPropertyIdRaw(null)
            }}
          >
            <option value="">Pick a client…</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {clientId && (
          <Field label="Property">
            <Select value={propertyId} onChange={(e) => setPropertyIdRaw(e.target.value)}>
              <option value="">Pick a property…</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.address_line1 || 'Property'}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Service (optional)">
          <Select value={serviceId} onChange={(e) => pickService(e.target.value)}>
            <option value="">No service</option>
            {(services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Price ($)">
          <TextInput
            inputMode="decimal"
            placeholder="0.00"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value)
              setPriceError(false)
            }}
          />
        </Field>
        {priceError && <p className="-mt-2 text-sm text-alert">Enter a dollar amount.</p>}

        <Field label="Title">
          <TextInput
            placeholder="e.g. Hedge trim + cleanup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {property && property.lat !== null && property.lng !== null && (
          <BestDayHelper
            origin={{ lat: property.lat, lng: property.lng }}
            selectedDate={date}
            onPick={setDate}
          />
        )}

        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <PrimaryButton disabled={!propertyId || !date} onClick={() => void handleSave()}>
          Save job
        </PrimaryButton>
      </div>
    </div>
  )
}

/**
 * "Which day am I already close by?" — for each of the next 7 days, the
 * distance from this property to the nearest pinned job that day.
 */
function BestDayHelper({
  origin,
  selectedDate,
  onPick,
}: {
  origin: LatLng
  selectedDate: string
  onPick: (date: string) => void
}) {
  const today = localToday()
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))
  const { data: weekJobs } = useJobsForRange(today, days[6])

  return (
    <div>
      <p className="heading-stencil text-xs text-faded">Best day (nearest route)</p>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {days.map((d) => {
          let nearest: number | null = null
          for (const job of weekJobs ?? []) {
            if (job.scheduled_date !== d) continue
            const p = job.property
            if (!p || p.lat === null || p.lng === null) continue
            const miles = haversineMiles(origin, { lat: p.lat, lng: p.lng })
            if (nearest === null || miles < nearest) nearest = miles
          }
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={`flex min-w-14 flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-3 ${
                d === selectedDate
                  ? 'border-blaze bg-panel text-blaze'
                  : 'border-edge bg-panel text-sand'
              }`}
            >
              <span className="heading-stencil text-xs">
                {parseLocalDate(d).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-xs text-faded">
                {nearest === null ? 'free' : `${nearest.toFixed(1)} mi`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
