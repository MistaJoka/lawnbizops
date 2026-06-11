import { useState } from 'react'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import type { Property } from './hooks'

import type { PropertyType } from './hooks'

export interface PropertyFormValues {
  label: string
  property_type: PropertyType
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  gate_code: string
  notes: string
}

export function PropertyForm({
  initial,
  onSubmit,
}: {
  initial?: Property
  onSubmit: (values: PropertyFormValues) => Promise<void>
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [propertyType, setPropertyType] = useState<PropertyType>(
    (initial?.property_type as PropertyType) ?? 'residential',
  )
  const [addressLine1, setAddressLine1] = useState(initial?.address_line1 ?? '')
  const [addressLine2, setAddressLine2] = useState(initial?.address_line2 ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [state, setState] = useState(initial?.state ?? 'FL')
  const [zip, setZip] = useState(initial?.zip ?? '')
  const [gateCode, setGateCode] = useState(initial?.gate_code ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        label: label.trim(),
        property_type: propertyType,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        gate_code: gateCode.trim(),
        notes,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Property type">
        <div className="grid grid-cols-2 gap-0 border-2 border-edge bg-surface-low p-1">
          {(['residential', 'commercial'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPropertyType(type)}
              className={`label-caps min-h-12 ${
                propertyType === type
                  ? 'bg-blaze text-on-cta'
                  : 'text-muted hover:bg-surface-highest'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Label">
        <TextInput
          autoFocus
          placeholder="Home, Rental, Office…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>
      <Field label="Address line 1">
        <TextInput
          autoComplete="address-line1"
          placeholder="123 Palmetto St"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
        />
      </Field>
      <Field label="Address line 2">
        <TextInput
          autoComplete="address-line2"
          placeholder="Unit, lot, etc. (optional)"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
        />
      </Field>
      <Field label="City">
        <TextInput
          autoComplete="address-level2"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State">
          <TextInput
            autoComplete="address-level1"
            placeholder="FL"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </Field>
        <Field label="ZIP">
          <TextInput
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="33101"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Gate code">
        <TextInput
          placeholder="#1234 (optional)"
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value)}
        />
      </Field>
      <Field label="Notes">
        <TextArea
          placeholder="Dogs, sprinklers, where to park…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save property'}
      </PrimaryButton>
    </form>
  )
}
