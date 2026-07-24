import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useBusinessSettings } from '@/features/invoices/hooks'
import { saveBusinessSettings } from '@/features/settings/hooks'

export const Route = createFileRoute('/_authed/settings/payments')({
  component: PaymentsScreen,
})

type Provider = 'square' | 'paypal'

const PROVIDERS: { value: Provider; label: string; blurb: string }[] = [
  {
    value: 'square',
    label: 'Square',
    blurb: 'Tap to Pay on your phone, cards, Cash App Pay.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    blurb: 'PayPal, Venmo, and card checkout links.',
  },
]

function PaymentsScreen() {
  const { data: settings } = useBusinessSettings()
  const selected = (settings?.payment_provider ?? null) as Provider | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setProvider(provider: Provider | null) {
    setBusy(true)
    setError(null)
    try {
      // Direct upsert — the sanctioned business_settings exception.
      await saveBusinessSettings({ payment_provider: provider })
    } catch {
      setError("Couldn't save — check connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Payments</h1>
      <p className="mt-2 text-faded">
        Online card collection isn&apos;t built yet — today you record payments on each
        invoice (cash, check, Zelle, external card). Picking a provider here only saves
        your preference for when the connection ships.
      </p>

      <div className="mt-6 flex flex-col gap-3 pb-8">
        {PROVIDERS.map((provider) => {
          const isSelected = selected === provider.value
          return (
            <div
              key={provider.value}
              className={`rounded-lg border bg-panel px-4 py-4 ${
                isSelected ? 'border-blaze' : 'border-edge'
              }`}
            >
              <span className="block text-lg text-sand">{provider.label}</span>
              <span className="block text-sm text-faded">{provider.blurb}</span>
              {!isSelected && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setProvider(provider.value)}
                  className="heading-stencil tap-active mt-3 block w-full rounded-lg border border-edge px-4 py-3 text-sand disabled:opacity-50"
                >
                  Save as my provider
                </button>
              )}
              {isSelected && (
                <div className="mt-3 border-t border-edge pt-3">
                  <span className="block text-sm text-go">
                    Selected — connection coming in a future update
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setProvider(null)}
                    className="heading-stencil tap-active mt-3 block w-full rounded-lg border border-edge px-4 py-3 text-faded disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="pb-8 text-sm text-alert">{error}</p>}
    </div>
  )
}
