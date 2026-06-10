import { useState } from 'react'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import type { Client } from './hooks'

export interface ClientFormValues {
  name: string
  phone: string
  email: string
  notes: string
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
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes,
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
      <Field label="Notes">
        <TextArea
          placeholder="Anything worth remembering"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save client'}
      </PrimaryButton>
    </form>
  )
}
