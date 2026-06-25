import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClients } from '@/features/clients/hooks'
import { createMileageLog } from '@/features/tax/hooks'
import { Field, PrimaryButton, Select, TextInput } from '@/components/Field'
import { localToday } from '@/lib/format'

export const Route = createFileRoute('/_authed/tax/mileage/new')({
  component: NewMileageScreen,
})

function NewMileageScreen() {
  const navigate = useNavigate()
  const { data: clients } = useClients()
  const [droveOn, setDroveOn] = useState(localToday())
  const [milesStr, setMilesStr] = useState('')
  const [purpose, setPurpose] = useState('')
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)

  const miles = parseFloat(milesStr)
  const canSave = !Number.isNaN(miles) && miles > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await createMileageLog({
      droveOn: droveOn || localToday(),
      miles,
      purpose: purpose.trim(),
      jobId: null,
      clientId: clientId || null,
    })
    void navigate({ to: '/tax' })
  }

  return (
    <div className="px-edge pt-6 pb-12">
      <Link to="/tax" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Taxes
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Log a trip</h1>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Miles">
          <TextInput
            autoFocus
            inputMode="decimal"
            placeholder="0"
            value={milesStr}
            onChange={(e) => setMilesStr(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <TextInput
            type="date"
            value={droveOn}
            onChange={(e) => setDroveOn(e.target.value)}
          />
        </Field>
        <Field label="Purpose">
          <TextInput
            placeholder="e.g. drove to the Pierce job"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </Field>
        <Field label="Client (optional)">
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <PrimaryButton disabled={!canSave} onClick={() => void handleSave()}>
          Save trip
        </PrimaryButton>
      </div>
    </div>
  )
}
