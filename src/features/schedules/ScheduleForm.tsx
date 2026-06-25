import { useState } from 'react'
import { usePropertyServices } from '@/features/properties/hooks'
import { useServices } from '@/features/services/hooks'
import { CADENCES, type RecurringSchedule } from '@/features/schedules/hooks'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { localToday, parseDollarsToCents } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'
import { nextOccurrences, type Cadence } from '@/lib/recurrence'

const CADENCE_OPTIONS: Record<Cadence, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  every_4_weeks: 'Every 4 weeks',
  monthly_day: 'Monthly on a set day',
}

export interface ScheduleFormValues {
  cadence: Cadence
  anchor_date: string
  day_of_month: number | null
  service_id: string | null
  price_cents: number
  notes: string
  ends_on: string | null
}

export function ScheduleForm({
  propertyId,
  initial,
  initialPriceCents,
  submitLabel,
  onSubmit,
}: {
  propertyId: string
  initial?: RecurringSchedule
  // Seed the price when creating from a deep link (e.g. an accepted estimate)
  // without a full schedule record. Ignored when `initial` is provided.
  initialPriceCents?: number
  submitLabel: string
  onSubmit: (values: ScheduleFormValues) => Promise<void>
}) {
  const today = localToday()
  const [cadence, setCadence] = useState<Cadence>(
    (initial?.cadence as Cadence) ?? 'weekly',
  )
  const [anchorDate, setAnchorDate] = useState(initial?.anchor_date ?? today)
  const [dayOfMonth, setDayOfMonth] = useState(initial?.day_of_month?.toString() ?? '15')
  const [serviceId, setServiceId] = useState(initial?.service_id ?? '')
  const [dollars, setDollars] = useState(
    initial
      ? (initial.price_cents / 100).toFixed(2)
      : initialPriceCents != null
        ? (initialPriceCents / 100).toFixed(2)
        : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [endsOn, setEndsOn] = useState(initial?.ends_on ?? '')
  const [error, setError] = useState('')

  const { data: services } = useServices()
  const { data: overrides } = usePropertyServices(propertyId)

  function pickService(id: string) {
    setServiceId(id)
    const service = (services ?? []).find((s) => s.id === id)
    if (!service) return
    const cents =
      (overrides ?? []).find((ps) => ps.service_id === id)?.price_cents ??
      service.default_price_cents
    setDollars((cents / 100).toFixed(2))
    setError('')
  }

  const dom = parseInt(dayOfMonth, 10)
  const domValid = !Number.isNaN(dom) && dom >= 1 && dom <= 31
  const previewDates =
    anchorDate && (cadence !== 'monthly_day' || domValid)
      ? nextOccurrences(
          {
            cadence,
            anchor_date: anchorDate,
            day_of_month: cadence === 'monthly_day' ? dom : null,
            ends_on: endsOn || null,
          },
          today,
          4,
        )
      : []

  async function handleSubmit() {
    const cents = parseDollarsToCents(dollars)
    if (cents === null) {
      setError('Enter a dollar amount.')
      return
    }
    if (!anchorDate) {
      setError('Pick a first visit date.')
      return
    }
    if (cadence === 'monthly_day' && !domValid) {
      setError('Day of month must be 1–31.')
      return
    }
    await onSubmit({
      cadence,
      anchor_date: anchorDate,
      day_of_month: cadence === 'monthly_day' ? dom : null,
      service_id: serviceId || null,
      price_cents: cents,
      notes,
      ends_on: endsOn || null,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="How often">
        <Select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {CADENCE_OPTIONS[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="First visit">
        <TextInput
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
        />
      </Field>

      {cadence === 'monthly_day' && (
        <Field label="Day of month">
          <TextInput
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            value={dayOfMonth}
            onChange={(e) => {
              setDayOfMonth(e.target.value)
              setError('')
            }}
          />
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
            setError('')
          }}
        />
      </Field>

      <Field label="Ends on (optional)">
        <TextInput
          type="date"
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </Field>

      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {previewDates.length > 0 && (
        <div className="rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Next visits:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {previewDates.map((d) => (
              <li key={d} className="text-lg text-sand">
                {formatShortDate(d)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}

      <PrimaryButton onClick={() => void handleSubmit()}>{submitLabel}</PrimaryButton>
    </div>
  )
}
