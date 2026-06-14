import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { saveBusinessSettings } from '@/features/settings/hooks'
import { refreshAppState } from '@/features/auth/hooks'
import { loadStarterCatalog } from '@/features/services/hooks'
import { saveClient } from '@/features/clients/hooks'
import { saveProperty } from '@/features/properties/hooks'

export const Route = createFileRoute('/onboarding')({
  // Needs a session; skip if this org already finished setup.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/login' })
    const { data: settings } = await supabase
      .from('business_settings')
      .select('onboarded_at')
      .maybeSingle()
    if (settings?.onboarded_at) throw redirect({ to: '/' })
  },
  component: OnboardingScreen,
})

async function addSampleClient(): Promise<void> {
  const clientId = crypto.randomUUID()
  await saveClient({
    id: clientId,
    name: 'Sample Customer (delete me)',
    phone: '',
    email: '',
    notes: 'Example client added during setup — archive or delete anytime.',
    stage: 'active',
  })
  await saveProperty({
    id: crypto.randomUUID(),
    client_id: clientId,
    label: 'Sample Property',
    property_type: 'residential',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'FL',
    zip: '',
    gate_code: '',
    notes: '',
    lat: null,
    lng: null,
  })
}

function OnboardingScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [seedServices, setSeedServices] = useState(true)
  const [addSample, setAddSample] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveBusinessSettings({ business_name: name.trim(), phone: phone.trim() })
      if (seedServices) await loadStarterCatalog()
      if (addSample) await addSampleClient()
      await saveBusinessSettings({ onboarded_at: new Date().toISOString() })
      // Bust the cached gate so the next nav sees onboarded=true (no loop back).
      await refreshAppState()
      void navigate({ to: '/' })
    } catch (err) {
      setBusy(false)
      setError(
        err instanceof Error ? err.message : 'Setup failed — check your connection.',
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-edge py-10">
      <h1 className="heading-stencil text-3xl text-khaki">Welcome aboard</h1>
      <p className="mt-1 text-sm text-muted">
        A minute of setup and you&apos;re running your business from your phone.
      </p>

      <form onSubmit={finish} className="mt-8 flex flex-col gap-5">
        <div>
          <label className="label-caps text-faded">Business name</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Crestline Lawn & Landscape"
            className="mt-2 w-full rounded-lg border-2 border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          />
          <p className="mt-1 text-xs text-faded">Shows on your invoices and estimates.</p>
        </div>

        <div>
          <label className="label-caps text-faded">Phone</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(561) 555-0100"
            className="mt-2 w-full rounded-lg border-2 border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          />
        </div>

        <SetupToggle
          checked={seedServices}
          onChange={setSeedServices}
          title="Load starter services"
          detail="8 common landscaping services with prices — edit any of them later."
        />
        <SetupToggle
          checked={addSample}
          onChange={setAddSample}
          title="Add a sample customer"
          detail="A throwaway client + property so you can explore. Delete anytime."
        />

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="heading-stencil tap-active mt-2 rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
        >
          {busy ? 'Setting up…' : 'Finish setup'}
        </button>
      </form>
    </div>
  )
}

function SetupToggle({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  title: string
  detail: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`tap-active flex items-start gap-3 rounded-lg border-2 px-4 py-4 text-left ${
        checked ? 'border-blaze bg-panel' : 'border-edge bg-panel'
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
          checked ? 'border-blaze bg-blaze text-on-cta' : 'border-edge text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block text-lg text-sand">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
      </span>
    </button>
  )
}
