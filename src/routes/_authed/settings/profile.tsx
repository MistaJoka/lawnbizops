import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  TextArea,
  TextInput,
} from '@/components/Field'
import { confirm } from '@/lib/confirm'
import { parseDollarsToCents } from '@/lib/format'
import { SkeletonDetail } from '@/components/Skeleton'
import { shareLink } from '@/features/estimates/share'
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
    <div className="px-edge pt-6">
      <BackLink fallback="/settings" label="Settings" />
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Business profile</h1>

      {isLoading ? (
        <div className="mt-6">
          <SkeletonDetail />
        </div>
      ) : (
        <>
          <ProfileForm key={settings?.updated_at ?? 'new'} initial={settings ?? null} />
          <IntakeLinkSection settings={settings ?? null} />
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
  const [laborRate, setLaborRate] = useState(
    initial?.labor_rate_cents_per_hour
      ? (initial.labor_rate_cents_per_hour / 100).toFixed(2)
      : '',
  )
  const [reviewUrl, setReviewUrl] = useState(initial?.review_url ?? '')
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
        labor_rate_cents_per_hour: laborRate.trim()
          ? (parseDollarsToCents(laborRate) ?? 0)
          : 0,
        review_url: reviewUrl.trim(),
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Default due days">
          <TextInput
            inputMode="numeric"
            placeholder="14"
            value={dueDays}
            onChange={(e) => setDueDays(e.target.value)}
          />
        </Field>
        <Field label="Labor rate ($/hr)">
          <TextInput
            inputMode="decimal"
            placeholder="45.00"
            value={laborRate}
            onChange={(e) => setLaborRate(e.target.value)}
          />
        </Field>
      </div>
      <span className="-mt-3 text-xs text-faded">
        Labor rate prices time on site into job costs. Leave blank to keep labor costing
        off.
      </span>
      <Field label="Google review link">
        <TextInput
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://g.page/r/…/review"
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
        />
        <span className="text-xs text-faded">
          Paste your Google review URL — powers the one-tap review request on a finished
          job.
        </span>
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

function IntakeLinkSection({ settings }: { settings: BusinessSettings | null }) {
  const [msg, setMsg] = useState<string | null>(null)
  if (!settings?.intake_token) return null
  const url = `${window.location.origin}/quote/${settings.intake_token}`

  async function share() {
    const outcome = await shareLink(
      url,
      `Request a quote from ${settings?.business_name || 'us'}:`,
    )
    if (outcome === 'copied') setMsg('Link copied')
    else if (outcome === 'failed') setMsg('Could not share the link')
    else setMsg(null)
  }

  return (
    <div className="mt-6 rounded-lg border border-edge bg-panel px-4 py-4">
      <p className="heading-stencil text-xs text-faded">Quote request link</p>
      <p className="mt-1 text-sm text-faded">
        Share this so customers can request a quote — each one lands as a new lead.
      </p>
      <p className="mt-3 truncate rounded border border-edge bg-canvas px-3 py-2 text-sm text-sand">
        {url}
      </p>
      <div className="mt-3">
        <SecondaryButton type="button" onClick={() => void share()}>
          Share link
        </SecondaryButton>
        {msg && <p className="mt-1 text-center text-xs text-faded">{msg}</p>}
      </div>
    </div>
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
    if (
      !(await confirm({
        title: 'Remove your logo?',
        body: 'Invoices and estimates go back to plain text.',
        confirmLabel: 'Remove',
        destructive: true,
      }))
    )
      return
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
