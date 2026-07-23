import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useBusinessSettings, type BusinessSettings } from '@/features/invoices/hooks'
import { saveBusinessSettings } from '@/features/settings/hooks'
import { BUSINESS_ENTITIES } from '@/features/tax/hooks'
import { Field, PrimaryButton, Select, TextInput } from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { formatCents, parseDollarsToCents } from '@/lib/format'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/_authed/settings/tax')({
  component: TaxSettingsScreen,
})

function TaxSettingsScreen() {
  const { data: settings, isLoading } = useBusinessSettings()
  if (isLoading) {
    return (
      <div className="px-edge pt-6">
        <SkeletonDetail />
      </div>
    )
  }
  return <TaxSettingsForm settings={settings ?? null} />
}

function TaxSettingsForm({ settings }: { settings: BusinessSettings | null }) {
  const [taxId, setTaxId] = useState(settings?.tax_id ?? '')
  const [entity, setEntity] = useState(settings?.business_entity ?? 'sole_prop')
  const [rateDollars, setRateDollars] = useState(
    settings?.mileage_rate_cents ? (settings.mileage_rate_cents / 100).toFixed(2) : '',
  )
  const [pct, setPct] = useState(
    settings?.quarterly_set_aside_pct ? String(settings.quarterly_set_aside_pct) : '',
  )
  const [salesTaxPct, setSalesTaxPct] = useState(
    settings?.sales_tax_bps ? String(settings.sales_tax_bps / 100) : '',
  )
  const [saving, setSaving] = useState(false)

  // Percent with up to 2 decimals → basis points; clamp to the DB check (0–50%).
  const salesTaxBps = Math.min(
    5000,
    Math.max(0, Math.round((parseFloat(salesTaxPct) || 0) * 100)),
  )

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await saveBusinessSettings({
        tax_id: taxId.trim(),
        business_entity: entity,
        mileage_rate_cents: parseDollarsToCents(rateDollars) ?? 0,
        quarterly_set_aside_pct: Number(pct) || 0,
        sales_tax_bps: salesTaxBps,
      })
      toast.success('Tax setup saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save — check connection")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-edge pt-6 pb-12">
      <Link to="/tax" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Taxes
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Tax setup</h1>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Business type">
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            {BUSINESS_ENTITIES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tax ID (EIN or SSN)">
          <TextInput
            inputMode="numeric"
            placeholder="Kept private to your account"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </Field>

        <div>
          <Field label="Standard mileage rate (per mile)">
            <TextInput
              inputMode="decimal"
              placeholder="e.g. 0.67"
              value={rateDollars}
              onChange={(e) => setRateDollars(e.target.value)}
            />
          </Field>
          <p className="mt-1 text-xs text-faded">
            Enter the current IRS rate — it changes yearly, so confirm it before filing.
            {parseDollarsToCents(rateDollars)
              ? ` (${formatCents(parseDollarsToCents(rateDollars) ?? 0)}/mi)`
              : ''}
          </p>
        </div>

        <div>
          <Field label="Sales tax rate (%)">
            <TextInput
              inputMode="decimal"
              placeholder="e.g. 7 — leave 0 if you don't charge sales tax"
              value={salesTaxPct}
              onChange={(e) => setSalesTaxPct(e.target.value)}
            />
          </Field>
          <p className="mt-1 text-xs text-faded">
            Added to new invoices from now on (shown as a separate line). Existing
            invoices keep their original totals. Check your state’s rules on taxing lawn
            services.
          </p>
        </div>

        <div>
          <Field label="Set aside for taxes (%)">
            <TextInput
              inputMode="decimal"
              placeholder="e.g. 25"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
          </Field>
          <p className="mt-1 text-xs text-faded">
            A rough cushion for quarterly estimates — not tax advice. Confirm with a pro.
          </p>
        </div>

        <PrimaryButton disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save tax setup'}
        </PrimaryButton>
      </div>
    </div>
  )
}
