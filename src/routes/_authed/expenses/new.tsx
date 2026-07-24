import { useRef, useState } from 'react'
import { Camera, Paperclip } from 'lucide-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'
import { useClients } from '@/features/clients/hooks'
import { useVendors1099 } from '@/features/tax/hooks'
import {
  createExpense,
  EXPENSE_METHODS,
  type ExpenseMethod,
} from '@/features/expenses/hooks'
import { EXPENSE_CATEGORIES } from '@/features/expenses/categories'
import { uploadPhoto } from '@/features/estimates/photos'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { localToday, parseDollarsToCents } from '@/lib/format'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/_authed/expenses/new')({
  // Optional pre-tagging from a job/client detail screen's "Log expense" link.
  validateSearch: (
    search: Record<string, unknown>,
  ): { clientId?: string; jobId?: string } => ({
    clientId: typeof search.clientId === 'string' ? search.clientId : undefined,
    jobId: typeof search.jobId === 'string' ? search.jobId : undefined,
  }),
  component: NewExpenseScreen,
})

function NewExpenseScreen() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { data: clients } = useClients()
  const { data: payees } = useVendors1099()
  const jobId = search.jobId ?? null

  // The 10-second flow lives up top: amount → category → photo → Save.
  const [dollars, setDollars] = useState('')
  const [category, setCategory] = useState('supplies')
  const [receipt, setReceipt] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Everything below is optional and tucked behind a disclosure.
  const [showMore, setShowMore] = useState(false)
  const [spentOn, setSpentOn] = useState(localToday())
  const [method, setMethod] = useState<ExpenseMethod>('card')
  const [vendor, setVendor] = useState('')
  const [note, setNote] = useState('')
  const [clientId, setClientId] = useState(search.clientId ?? '')
  const [payeeId, setPayeeId] = useState('')

  const [saving, setSaving] = useState(false)

  const amountCents = parseDollarsToCents(dollars)
  const canSave = amountCents !== null && amountCents > 0 && !saving

  async function handleSave() {
    if (amountCents === null || amountCents <= 0 || saving) return
    setSaving(true)
    const client = (clients ?? []).find((c) => c.id === clientId)
    const id = await createExpense({
      category,
      amountCents,
      spentOn: spentOn || localToday(),
      vendor: vendor.trim(),
      note: note.trim(),
      paymentMethod: method,
      jobId,
      clientId: clientId || null,
      payeeId: payeeId || null,
      clientName: client?.name ?? null,
    })
    // Receipt is best-effort: the expense is already saved offline; the photo
    // upload needs a connection, so a failure here must not lose the expense.
    if (receipt) {
      try {
        await uploadPhoto('expense', id, receipt)
      } catch {
        toast.error('Expense saved — add the receipt later when you have signal')
      }
    }
    void navigate({ to: '/expenses/$expenseId', params: { expenseId: id } })
  }

  return (
    <div className="px-edge pt-6">
      <BackLink fallback="/money" label="Money" />
      <h1 className="heading-stencil mt-2 text-2xl text-sand">New expense</h1>
      {jobId && <p className="mt-1 text-sm text-faded">Tagging this cost to the job</p>}

      <div className="mt-4 flex flex-col gap-4 pb-8">
        <Field label="Amount">
          <TextInput
            autoFocus
            inputMode="decimal"
            className="tabular-nums"
            placeholder="$0.00"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
          />
        </Field>

        <div>
          <p className="label-caps mb-2 text-khaki">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`heading-stencil tap-active min-h-touch rounded-lg border-2 px-3 py-2 text-sm ${
                  category === c.value
                    ? 'border-blaze bg-blaze text-on-cta'
                    : 'border-edge bg-panel text-sand'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="heading-stencil tap-active min-h-touch inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sand"
        >
          {receipt ? (
            <>
              <Paperclip size={18} aria-hidden />
              <span className="truncate">{receipt.name}</span>
            </>
          ) : (
            <>
              <Camera size={18} aria-hidden />
              Add receipt (optional)
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="label-caps self-start py-2 text-faded"
        >
          {showMore ? '− Fewer details' : '+ More details'}
        </button>

        {showMore && (
          <div className="flex flex-col gap-4">
            <Field label="Date">
              <TextInput
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
              />
            </Field>

            <Field label="Paid with">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as ExpenseMethod)}
              >
                {EXPENSE_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Vendor">
              <TextInput
                placeholder="Where you bought it"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </Field>

            <Field label="Client (optional)">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">No client</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            {(payees ?? []).length > 0 && (
              <Field label="1099 payee (optional)">
                <Select value={payeeId} onChange={(e) => setPayeeId(e.target.value)}>
                  <option value="">No payee</option>
                  {(payees ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Note">
              <TextArea
                placeholder="What was it for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="sticky bottom-tabbar z-30 -mx-edge border-t-2 border-edge bg-canvas px-edge py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PrimaryButton disabled={!canSave} onClick={() => void handleSave()}>
          Save expense
        </PrimaryButton>
      </div>
    </div>
  )
}
