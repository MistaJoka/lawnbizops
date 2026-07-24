import { useState } from 'react'
import { Check } from 'lucide-react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { createVendor1099 } from '@/features/tax/hooks'
import { Field, PrimaryButton, TextInput } from '@/components/Field'

export const Route = createFileRoute('/_authed/tax/payees/new')({
  component: NewPayeeScreen,
})

function NewPayeeScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [track, setTrack] = useState(true)
  const [saving, setSaving] = useState(false)

  const canSave = name.trim() !== '' && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await createVendor1099({
      name: name.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      email: email.trim(),
      track1099: track,
    })
    void navigate({ to: '/tax' })
  }

  return (
    <div className="px-edge pt-6 pb-12">
      <Link to="/tax" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Taxes
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Add 1099 payee</h1>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Name">
          <TextInput
            autoFocus
            placeholder="Contractor or vendor"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Tax ID (EIN or SSN)">
          <TextInput
            inputMode="numeric"
            placeholder="For their 1099-NEC"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <TextInput
            inputMode="email"
            placeholder="Optional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Address">
          <TextInput
            placeholder="Optional"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <button
          type="button"
          onClick={() => setTrack((v) => !v)}
          className={`heading-stencil tap-active min-h-touch inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm ${
            track ? 'border-blaze bg-blaze text-on-cta' : 'border-edge bg-panel text-sand'
          }`}
        >
          {track ? (
            <>
              <Check size={16} aria-hidden /> Tracking for 1099
            </>
          ) : (
            'Not tracking for 1099'
          )}
        </button>

        <PrimaryButton disabled={!canSave} onClick={() => void handleSave()}>
          Save payee
        </PrimaryButton>
      </div>
    </div>
  )
}
