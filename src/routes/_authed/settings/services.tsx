import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { confirm } from '@/lib/confirm'
import {
  SERVICE_UNITS,
  archiveService,
  loadStarterCatalog,
  saveService,
  unitLabel,
  useServices,
  type Service,
} from '@/features/services/hooks'
import { formatCents, parseDollarsToCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/settings/services')({
  component: ServicesScreen,
})

function ServicesScreen() {
  const { data: services, isLoading } = useServices()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const list = services ?? []

  async function handleSeed() {
    setSeeding(true)
    try {
      await loadStarterCatalog()
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Service catalog</h1>

      {!isLoading && list.length === 0 && !adding && (
        <div className="mt-6">
          <p className="text-center text-faded">No services yet.</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => void handleSeed()} disabled={seeding}>
              {seeding ? 'Loading…' : 'Load starter catalog'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {adding ? (
        <div className="mt-6 rounded-lg border border-edge bg-panel px-4 py-4">
          <h2 className="heading-stencil text-lg text-khaki">New service</h2>
          <ServiceForm onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingId(null)
            setAdding(true)
          }}
          className="heading-stencil mt-6 block w-full rounded-lg bg-blaze px-4 py-4 text-center text-lg text-on-cta"
        >
          + Add service
        </button>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {list.map((service) =>
          editingId === service.id ? (
            <li
              key={service.id}
              className="rounded-lg border border-edge bg-panel px-4 py-4"
            >
              <h2 className="heading-stencil text-lg text-khaki">Edit service</h2>
              <ServiceForm initial={service} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={service.id}>
              <button
                onClick={() => {
                  setAdding(false)
                  setEditingId(service.id)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-edge bg-panel px-4 py-4"
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate text-lg text-sand">{service.name}</span>
                  {service.description && (
                    <span className="block truncate text-sm text-faded">
                      {service.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg text-go tabular-nums">
                    {formatCents(service.default_price_cents)}
                  </span>
                  <span className="block text-xs text-faded">
                    {unitLabel(service.unit)}
                  </span>
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function ServiceForm({ initial, onDone }: { initial?: Service; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dollars, setDollars] = useState(
    initial ? (initial.default_price_cents / 100).toFixed(2) : '',
  )
  const [unit, setUnit] = useState(initial?.unit ?? 'flat')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseDollarsToCents(dollars)
    if (cents === null) {
      setError('Enter a dollar amount, like 45 or 45.50.')
      return
    }
    setBusy(true)
    try {
      await saveService({
        id: initial?.id ?? crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        default_price_cents: cents,
        unit,
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive() {
    if (!initial) return
    if (
      !(await confirm({
        title: `Archive ${initial.name}?`,
        body: "It won't show up when you add new work.",
        confirmLabel: 'Archive',
      }))
    )
      return
    await archiveService(initial)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4">
      <Field label="Name">
        <TextInput
          required
          autoFocus
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Description">
        <TextArea
          rows={2}
          placeholder="What's included (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price ($)">
          <TextInput
            required
            inputMode="decimal"
            placeholder="45.00"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value)
              setError(null)
            }}
          />
        </Field>
        <Field label="Unit">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {SERVICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {unitLabel(u)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save service'}
      </PrimaryButton>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onDone} className="px-2 py-3 text-faded">
          Cancel
        </button>
        {initial && (
          <button
            type="button"
            onClick={() => void handleArchive()}
            className="heading-stencil px-2 py-3 text-alert"
          >
            Archive
          </button>
        )}
      </div>
    </form>
  )
}
