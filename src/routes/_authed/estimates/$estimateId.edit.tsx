import { useState } from 'react'
import { X } from 'lucide-react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  updateEstimate,
  useEstimate,
  type EstimateDetail,
  type EstimateLineEdit,
} from '@/features/estimates/hooks'
import { useServices } from '@/features/services/hooks'
import { invoiceTotalCents } from '@/features/invoices/hooks'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { formatCents, parseDollarsToCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/estimates/$estimateId/edit')({
  component: EditEstimateScreen,
})

function EditEstimateScreen() {
  const { estimateId } = Route.useParams()
  const { data: detail, isLoading } = useEstimate(estimateId)

  if (!detail) {
    return (
      <div className="px-edge pt-6">
        <Link
          to="/estimates/$estimateId"
          params={{ estimateId }}
          className="inline-block py-2 pr-4 text-sm text-faded"
        >
          ← Estimate
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : (
          <p className="mt-16 text-center text-faded">Estimate not found.</p>
        )}
      </div>
    )
  }

  const status = detail.estimate.status
  if (status !== 'draft' && status !== 'sent') {
    return (
      <div className="px-edge pt-6">
        <Link
          to="/estimates/$estimateId"
          params={{ estimateId }}
          className="inline-block py-2 pr-4 text-sm text-faded"
        >
          ← Estimate
        </Link>
        <p className="mt-16 text-center text-faded">
          This estimate is {status} and locked — use Renew to send a fresh copy.
        </p>
      </div>
    )
  }

  return <EditEstimateForm key={detail.estimate.id} detail={detail} />
}

interface LineDraft {
  key: string
  /** Existing estimate_items row id; undefined for lines added in this edit. */
  id?: string
  description: string
  quantity: string
  dollars: string
}

function EditEstimateForm({ detail }: { detail: EstimateDetail }) {
  const navigate = useNavigate()
  const estimateId = detail.estimate.id
  const [lines, setLines] = useState<LineDraft[]>(() =>
    detail.items.map((item) => ({
      key: item.id,
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      dollars: (item.unit_price_cents / 100).toFixed(2),
    })),
  )
  const [validUntil, setValidUntil] = useState(detail.estimate.valid_until ?? '')
  const [notes, setNotes] = useState(detail.estimate.notes)
  const [saving, setSaving] = useState(false)

  const { data: services } = useServices()

  const items: EstimateLineEdit[] = lines
    .map((line) => ({
      id: line.id,
      description: line.description.trim(),
      quantity: parseFloat(line.quantity) || 1,
      unit_price_cents: parseDollarsToCents(line.dollars) ?? NaN,
    }))
    .filter((item) => item.description !== '' || !Number.isNaN(item.unit_price_cents))
  const linesValid = items.every(
    (item) => item.description !== '' && !Number.isNaN(item.unit_price_cents),
  )
  const total = linesValid ? invoiceTotalCents(items) : 0
  const canSave = linesValid && items.length > 0 && !saving

  function setLine(key: string, patch: Partial<LineDraft>) {
    setLines((old) => old.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function addLine(prefill?: { description: string; dollars: string }) {
    setLines((old) => [
      ...old,
      {
        key: crypto.randomUUID(),
        description: prefill?.description ?? '',
        quantity: '1',
        dollars: prefill?.dollars ?? '',
      },
    ])
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await updateEstimate(detail, {
        items,
        notes,
        validUntil: validUntil || null,
      })
      void navigate({ to: '/estimates/$estimateId', params: { estimateId } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link
        to="/estimates/$estimateId"
        params={{ estimateId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Estimate
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">
        Edit {detail.estimate.number ?? 'estimate'}
      </h1>
      {detail.estimate.status === 'sent' && (
        <p className="mt-1 text-sm text-faded">
          Already sent — the customer’s approval link shows the updated version.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4 pb-8">
        {lines.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="heading-stencil text-xs text-faded">Line items</p>
            {lines.map((line) => (
              <div
                key={line.key}
                className="rounded-lg border border-edge bg-panel px-3 py-3"
              >
                <TextInput
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => setLine(line.key, { description: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <TextInput
                    inputMode="decimal"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  />
                  <TextInput
                    inputMode="decimal"
                    placeholder="Price ($)"
                    value={line.dollars}
                    onChange={(e) => setLine(line.key, { dollars: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((old) => old.filter((l) => l.key !== line.key))
                    }
                    className="heading-stencil inline-flex shrink-0 items-center justify-center rounded-lg border border-edge px-4 text-alert"
                    aria-label="Remove line"
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => addLine()}
          className="heading-stencil rounded-lg border border-edge bg-panel px-4 py-4 text-sand"
        >
          + Add line
        </button>

        <Field label="Add from service catalog">
          <Select
            value=""
            onChange={(e) => {
              const service = (services ?? []).find((s) => s.id === e.target.value)
              if (service) {
                addLine({
                  description: service.name,
                  dollars: (service.default_price_cents / 100).toFixed(2),
                })
              }
            }}
          >
            <option value="">Pick a service…</option>
            {(services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatCents(s.default_price_cents)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valid until">
          <TextInput
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <TextArea
            placeholder="Scope, materials, terms…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4">
          <span className="heading-stencil text-xs text-faded">Total</span>
          <span className="heading-stencil text-2xl text-sand">{formatCents(total)}</span>
        </div>
      </div>

      <div className="sticky bottom-tabbar z-30 -mx-edge border-t-2 border-edge bg-canvas px-edge py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PrimaryButton disabled={!canSave} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </div>
    </div>
  )
}
