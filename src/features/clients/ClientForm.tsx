import { useState } from 'react'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import type { Client, ClientStage } from './hooks'

export interface ClientFormValues {
  name: string
  phone: string
  email: string
  notes: string
  stage: ClientStage
}

export function ClientForm({
  initial,
  onSubmit,
}: {
  initial?: Client
  onSubmit: (values: ClientFormValues) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [isLead, setIsLead] = useState((initial?.stage ?? 'active') === 'lead')
  const [busy, setBusy] = useState(false)

  // Entry criterion (G-A1): a client with no phone and no email can never be
  // quoted, invoiced, or reminded. Warn — don't block — so quick capture still
  // works and the detail can be filled in later.
  const noContact = phone.trim() === '' && email.trim() === ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes,
        stage: isLead ? 'lead' : ((initial?.stage as ClientStage) ?? 'active'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <TextInput
          required
          autoFocus
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Phone">
        <TextInput
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(555) 555-5555"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {noContact && (
        <p className="-mt-2 text-sm text-khaki">
          Add a phone or email so you can quote, invoice, and remind them.
        </p>
      )}
      <Field label="Notes">
        <TextArea
          placeholder="Anything worth remembering"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <button
        type="button"
        role="switch"
        aria-checked={isLead}
        onClick={() => setIsLead((v) => !v)}
        className="tap-active flex min-h-touch items-center justify-between rounded-lg border-2 border-edge bg-surface-highest px-4 py-3"
      >
        <span className="flex flex-col items-start">
          <span className="text-lg text-sand">This is a lead / prospect</span>
          <span className="text-sm text-faded">
            {isLead ? 'Starts in the pipeline' : 'Active client'}
          </span>
        </span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors ${
            isLead ? 'border-blaze bg-blaze' : 'border-edge bg-panel'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
              isLead ? 'left-[22px] bg-on-cta' : 'left-0.5 bg-faded'
            }`}
          />
        </span>
      </button>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save client'}
      </PrimaryButton>
    </form>
  )
}
