import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { fetchIntakeBusinessName, submitLead } from '@/features/leads/intake'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export const Route = createFileRoute('/quote/$token')({
  component: QuoteRequestPage,
})

function QuoteRequestPage() {
  const { token } = Route.useParams()
  const { data: business, isLoading } = useQuery({
    queryKey: ['intake', token],
    queryFn: () => fetchIntakeBusinessName(token),
    retry: false,
    staleTime: Infinity,
  })

  useDocumentTitle(business ? `Request a quote · ${business}` : null)

  return (
    <div className="mx-auto min-h-dvh max-w-md px-edge py-10">
      {isLoading ? (
        <div className="mt-10">
          <SkeletonDetail />
        </div>
      ) : business === null ? (
        <div className="mt-20 text-center">
          <h1 className="heading-stencil text-2xl text-sand">Form not found</h1>
          <p className="mt-3 text-faded">
            This request form is no longer available. Please reach out to the business
            directly.
          </p>
        </div>
      ) : (
        <QuoteForm token={token} business={business ?? ''} />
      )}
    </div>
  )
}

function QuoteForm({ token, business }: { token: string; business: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const canSubmit = name.trim() !== '' && (phone.trim() !== '' || email.trim() !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      await submitLead(token, { name, phone, email, address, notes })
      setDone(true)
    } catch {
      setError("Couldn't send your request — please try again.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-20 text-center">
        <h1 className="heading-stencil text-2xl text-go">Request sent</h1>
        <p className="mt-3 text-faded">
          Thanks{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}! {business} has your
          details and will be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Same letterhead treatment as the estimate page (e.$token) — the two
          public pages are the business's face and should read as one set. */}
      <header className="text-center">
        <p className="heading-stencil text-2xl text-sand">
          {business || 'Request a quote'}
        </p>
        <p className="label-caps mt-5 text-faded">Quote request</p>
        <p className="mt-1 text-sm text-faded">
          Tell us what you need and we’ll get back to you with a quote.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Your name">
          <TextInput
            autoComplete="name"
            placeholder="Jordan Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <TextInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(305) 555-0100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Service address">
          <TextInput
            autoComplete="street-address"
            placeholder="123 Main St, city"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
        <Field label="What do you need?">
          <TextArea
            placeholder="Weekly mowing, cleanup, a new install…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <p className="text-xs text-faded">Add a phone or email so we can reach you.</p>
        {error && <p className="text-sm text-alert">{error}</p>}

        <PrimaryButton type="submit" disabled={!canSubmit || busy}>
          {busy ? 'Sending…' : 'Request my quote'}
        </PrimaryButton>
      </form>
    </div>
  )
}
