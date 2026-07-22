import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import { useClients, type Client, type ClientStage } from './hooks'

export interface ClientFormValues {
  name: string
  phone: string
  email: string
  notes: string
  stage: ClientStage
}

export function ClientForm({
  initial,
  defaultLead,
  onSubmit,
}: {
  initial?: Client
  /** New-client only: start the lead toggle ON (arrived from a pipeline/lead context). */
  defaultLead?: boolean
  onSubmit: (values: ClientFormValues) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [isLead, setIsLead] = useState(
    (initial?.stage ?? (defaultLead ? 'lead' : 'active')) === 'lead',
  )
  const [busy, setBusy] = useState(false)

  // Entry criterion (G-A1): a client with no phone and no email can never be
  // quoted, invoiced, or reminded. Warn — don't block — so quick capture still
  // works and the detail can be filled in later.
  const noContact = phone.trim() === '' && email.trim() === ''

  // Duplicate soft-warn (new clients only): same phone digits or email as an
  // existing client is almost certainly the same person. Warn with a link —
  // never block (shared office numbers exist).
  const { data: existingClients } = useClients()
  const phoneDigits = phone.replace(/\D/g, '')
  const emailNorm = email.trim().toLowerCase()
  const duplicate = initial
    ? undefined
    : (existingClients ?? []).find(
        (c) =>
          (phoneDigits.length >= 7 && c.phone.replace(/\D/g, '') === phoneDigits) ||
          (emailNorm !== '' && c.email.trim().toLowerCase() === emailNorm),
      )

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
      {duplicate && (
        <p className="-mt-2 text-sm text-alert">
          <Link
            to="/clients/$clientId"
            params={{ clientId: duplicate.id }}
            className="underline"
          >
            {duplicate.name}
          </Link>{' '}
          already has this contact info — open them instead of adding a twin?
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
