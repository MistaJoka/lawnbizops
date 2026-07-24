import { useState } from 'react'
import { X } from 'lucide-react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClients } from '@/features/clients/hooks'
import { useProperties } from '@/features/properties/hooks'
import { useServices } from '@/features/services/hooks'
import { createEstimate } from '@/features/estimates/hooks'
import { invoiceTotalCents } from '@/features/invoices/hooks'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { formatCents, localToday, parseDollarsToCents } from '@/lib/format'
import { addDaysISO } from '@/lib/dates'

export const Route = createFileRoute('/_authed/estimates/new')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { clientId?: string; propertyId?: string } => ({
    clientId: typeof search.clientId === 'string' ? search.clientId : undefined,
    propertyId: typeof search.propertyId === 'string' ? search.propertyId : undefined,
  }),
  component: NewEstimateScreen,
})

interface LineDraft {
  key: string
  description: string
  quantity: string
  dollars: string
}

function NewEstimateScreen() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  // null = untouched → derive from the ?clientId=/?propertyId= deep link so a
  // "Create estimate" from a client/lead lands here pre-scoped. Picking a value
  // sets the raw state and takes over.
  const [clientIdRaw, setClientIdRaw] = useState<string | null>(null)
  const [propertyIdRaw, setPropertyIdRaw] = useState<string | null>(null)
  const clientId = clientIdRaw ?? search.clientId ?? ''
  const propertyId = propertyIdRaw ?? search.propertyId ?? ''
  const [lines, setLines] = useState<LineDraft[]>([])
  const [validUntil, setValidUntil] = useState(addDaysISO(localToday(), 30))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: clients } = useClients()
  const { data: properties } = useProperties(clientId)
  const { data: services } = useServices()

  const client = (clients ?? []).find((c) => c.id === clientId)
  const property = (properties ?? []).find((p) => p.id === propertyId)

  const items = lines
    .map((line) => ({
      description: line.description.trim(),
      quantity: parseFloat(line.quantity) || 1,
      unit_price_cents: parseDollarsToCents(line.dollars) ?? NaN,
    }))
    .filter((item) => item.description !== '' || !Number.isNaN(item.unit_price_cents))
  const linesValid = items.every(
    (item) => item.description !== '' && !Number.isNaN(item.unit_price_cents),
  )

  const total = linesValid ? invoiceTotalCents(items) : 0

  const canCreate = clientId !== '' && linesValid && items.length > 0 && !saving

  function setLine(key: string, patch: Partial<LineDraft>) {
    setLines((old) => old.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function addLine(prefill?: { description: string; dollars: string }) {
    setLines((old) => [
      ...old,
      {
        key: crypto.randomUUID(),
        description: prefill?.description ?? '',
        quantity: '1',
        dollars: prefill?.dollars ?? '',
      },
    ])
  }

  async function handleCreate() {
    if (!canCreate) return
    setSaving(true)
    const id = await createEstimate({
      clientId,
      client: client ? { name: client.name, phone: client.phone } : null,
      propertyId: propertyId || null,
      property: property
        ? {
            id: property.id,
            label: property.label,
            address_line1: property.address_line1,
            city: property.city,
            lat: property.lat,
            lng: property.lng,
            gate_code: property.gate_code,
            notes: property.notes,
          }
        : null,
      items,
      notes,
      validUntil: validUntil || null,
    })
    void navigate({ to: '/estimates/$estimateId', params: { estimateId: id } })
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">New estimate</h1>

      <div className="mt-4 flex flex-col gap-4 pb-8">
        <Field label="Client">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientIdRaw(e.target.value)
              setPropertyIdRaw('')
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
          <Field label="Property (optional)">
            <Select value={propertyId} onChange={(e) => setPropertyIdRaw(e.target.value)}>
              <option value="">No property</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.address_line1 || 'Property'}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {lines.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="heading-stencil text-xs text-faded">Line items</p>
            {lines.map((line) => (
              <div
                key={line.key}
                className="rounded-lg border border-edge bg-panel px-3 py-3"
              >
                <TextInput
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => setLine(line.key, { description: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <TextInput
                    inputMode="decimal"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  />
                  <TextInput
                    inputMode="decimal"
                    placeholder="Price ($)"
                    value={line.dollars}
                    onChange={(e) => setLine(line.key, { dollars: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((old) => old.filter((l) => l.key !== line.key))
                    }
                    className="heading-stencil inline-flex shrink-0 items-center justify-center rounded-lg border border-edge px-4 text-alert"
                    aria-label="Remove line"
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => addLine()}
          className="heading-stencil rounded-lg border border-edge bg-panel px-4 py-4 text-sand"
        >
          + Add line
        </button>

        <Field label="Add from service catalog">
          <Select
            value=""
            onChange={(e) => {
              const service = (services ?? []).find((s) => s.id === e.target.value)
              if (service) {
                addLine({
                  description: service.name,
                  dollars: (service.default_price_cents / 100).toFixed(2),
                })
              }
            }}
          >
            <option value="">Pick a service…</option>
            {(services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatCents(s.default_price_cents)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valid until">
          <TextInput
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <TextArea
            placeholder="Scope, materials, terms…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4">
          <span className="heading-stencil text-xs text-faded">Total</span>
          <span className="heading-stencil text-2xl text-sand">{formatCents(total)}</span>
        </div>
      </div>

      <div className="sticky bottom-tabbar z-30 -mx-edge border-t-2 border-edge bg-canvas px-edge py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PrimaryButton disabled={!canCreate} onClick={() => void handleCreate()}>
          Create estimate
        </PrimaryButton>
      </div>
    </div>
  )
}
