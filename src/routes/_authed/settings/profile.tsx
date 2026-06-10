import { useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Field, PrimaryButton, TextArea, TextInput } from '@/components/Field'
import { useBusinessSettings, type BusinessSettings } from '@/features/invoices/hooks'
import {
  removeLogo,
  saveBusinessSettings,
  uploadLogo,
  useLogoUrl,
} from '@/features/settings/hooks'

export const Route = createFileRoute('/_authed/settings/profile')({
  component: ProfileScreen,
})

function ProfileScreen() {
  const { data: settings, isLoading } = useBusinessSettings()

  return (
    <div className="px-4 pt-6">
      <Link to="/settings" className="text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Business profile</h1>

      {isLoading ? (
        <p className="mt-16 text-center text-faded">Loading…</p>
      ) : (
        <>
          <ProfileForm key={settings?.updated_at ?? 'new'} initial={settings ?? null} />
          <LogoSection settings={settings ?? null} />
        </>
      )}
    </div>
  )
}

function ProfileForm({ initial }: { initial: BusinessSettings | null }) {
  const [businessName, setBusinessName] = useState(initial?.business_name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [invoicePrefix, setInvoicePrefix] = useState(initial?.invoice_prefix ?? 'INV-')
  const [estimatePrefix, setEstimatePrefix] = useState(initial?.estimate_prefix ?? 'EST-')
  const [dueDays, setDueDays] = useState(String(initial?.default_due_days ?? 14))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const days = parseInt(dueDays, 10)
    if (Number.isNaN(days) || days < 0) {
      setMessage({ text: 'Default due days must be a whole number.', ok: false })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      // Direct upsert — the sanctioned business_settings exception (see
      // saveBusinessSettings). Needs a connection.
      await saveBusinessSettings({
        business_name: businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        invoice_prefix: invoicePrefix.trim(),
        estimate_prefix: estimatePrefix.trim(),
        default_due_days: days,
      })
      setMessage({ text: 'Saved', ok: true })
    } catch {
      setMessage({ text: "Couldn't save — check connection.", ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <Field label="Business name">
        <TextInput
          placeholder="Pierce Lawn Care"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </Field>
      <Field label="Phone">
        <TextInput
          type="tel"
          placeholder="(305) 555-0100"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <TextInput
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Address">
        <TextArea
          rows={2}
          placeholder="Street, city, state"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Invoice prefix">
          <TextInput
            placeholder="INV-"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
          />
        </Field>
        <Field label="Estimate prefix">
          <TextInput
            placeholder="EST-"
            value={estimatePrefix}
            onChange={(e) => setEstimatePrefix(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Default due days">
        <TextInput
          inputMode="numeric"
          placeholder="14"
          value={dueDays}
          onChange={(e) => setDueDays(e.target.value)}
        />
      </Field>
      {message && (
        <p className={`text-sm ${message.ok ? 'text-go' : 'text-alert'}`}>
          {message.text}
        </p>
      )}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </PrimaryButton>
    </form>
  )
}

function LogoSection({ settings }: { settings: BusinessSettings | null }) {
  const logoPath = settings?.logo_path ?? null
  const { data: logoUrl } = useLogoUrl(logoPath)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await uploadLogo(file, logoPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload — check connection.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!logoPath) return
    if (!window.confirm('Remove your logo? PDFs go back to plain text.')) return
    setBusy(true)
    setError(null)
    try {
      await removeLogo(logoPath)
    } catch {
      setError("Couldn't remove — check connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-edge bg-panel px-4 py-4 pb-8">
      <p className="heading-stencil text-xs text-faded">Logo</p>
      <p className="mt-1 text-sm text-faded">Shows on your invoice and estimate PDFs.</p>
      {logoPath && logoUrl && (
        <img
          src={logoUrl}
          alt="Business logo"
          className="mt-3 h-20 w-20 rounded bg-white object-contain p-1"
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFile(e)}
        className="hidden"
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="heading-stencil flex-1 rounded-lg border border-edge px-4 py-4 text-sand disabled:opacity-50"
        >
          {busy ? 'Working…' : logoPath ? 'Replace logo' : 'Upload logo'}
        </button>
        {logoPath && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRemove()}
            className="heading-stencil rounded-lg border border-edge px-4 py-4 text-alert disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  )
}
