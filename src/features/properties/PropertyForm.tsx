import { useEffect, useRef, useState } from 'react'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import { searchAddresses } from '@/lib/geocode'
import type { AddressSuggestion } from '@/lib/geocode'
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
  lat: number | null
  lng: number | null
}

const SEARCH_MIN_CHARS = 4
const SEARCH_DEBOUNCE_MS = 400

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
  // Pin coordinates ride along with the form: seeded from the existing
  // property, set by an autofill pick, and cleared whenever a geocodable field
  // is hand-edited so savePropertyWithGeocode re-geocodes on save.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial && initial.lat !== null && initial.lng !== null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  )

  // Address autofill — free Nominatim search, debounced in the change handler
  // (not an effect), one request in flight. An accelerator only: the manual
  // fields below stay editable, and any fetch failure (offline) just shows
  // nothing.
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const pendingSearchRef = useRef<{
    timer: ReturnType<typeof setTimeout>
    ctrl: AbortController
  } | null>(null)

  function cancelPendingSearch() {
    const pending = pendingSearchRef.current
    if (pending) {
      clearTimeout(pending.timer)
      pending.ctrl.abort()
      pendingSearchRef.current = null
    }
  }

  // Abort any in-flight Nominatim request when the form unmounts.
  useEffect(() => {
    return () => {
      const pending = pendingSearchRef.current
      if (pending) {
        clearTimeout(pending.timer)
        pending.ctrl.abort()
      }
    }
  }, [])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearch(value)
    cancelPendingSearch()
    const q = value.trim()
    if (q.length < SEARCH_MIN_CHARS) {
      setSuggestions([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      void searchAddresses(q, ctrl.signal).then((results) => {
        if (!ctrl.signal.aborted) setSuggestions(results)
      })
    }, SEARCH_DEBOUNCE_MS)
    pendingSearchRef.current = { timer, ctrl }
  }

  function pickSuggestion(s: AddressSuggestion) {
    cancelPendingSearch()
    setAddressLine1(s.address_line1)
    setCity(s.city)
    setState(s.state)
    setZip(s.zip)
    setCoords({ lat: s.lat, lng: s.lng })
    setSearch(s.display)
    setSuggestions([])
  }

  /** Hand-editing any geocodable field invalidates a previously picked pin. */
  function editAddressField(set: (value: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value)
      setCoords(null)
    }
  }

  // Entry criterion for a dispatchable job (G-D1): without a street address the
  // property can't be geocoded, so it gets no map pin and drops out of routing.
  // Require it — geocoding (savePropertyWithGeocode) keys off this on save.
  const canSave = addressLine1.trim() !== '' && !busy

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
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
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
      <Field label="Search address">
        <TextInput
          autoComplete="off"
          placeholder="Start typing to autofill…"
          value={search}
          onChange={handleSearchChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              cancelPendingSearch()
              setSuggestions([])
            }
          }}
        />
      </Field>
      {suggestions.length > 0 && (
        <ul className="-mt-2 overflow-hidden rounded-lg border-2 border-edge bg-panel">
          {suggestions.map((s) => (
            <li
              key={`${s.lat},${s.lng}`}
              className="border-b border-edge last:border-b-0"
            >
              <button
                type="button"
                onClick={() => pickSuggestion(s)}
                className="tap-active min-h-touch w-full px-4 py-3 text-left text-sand hover:bg-surface-highest"
              >
                {s.display}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Field label="Address line 1">
        <TextInput
          required
          autoComplete="address-line1"
          placeholder="123 Palmetto St"
          value={addressLine1}
          onChange={editAddressField(setAddressLine1)}
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
          onChange={editAddressField(setCity)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State">
          <TextInput
            autoComplete="address-level1"
            placeholder="FL"
            value={state}
            onChange={editAddressField(setState)}
          />
        </Field>
        <Field label="ZIP">
          <TextInput
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="33101"
            value={zip}
            onChange={editAddressField(setZip)}
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
      <PrimaryButton type="submit" disabled={!canSave}>
        {busy ? 'Saving…' : 'Save property'}
      </PrimaryButton>
    </form>
  )
}
