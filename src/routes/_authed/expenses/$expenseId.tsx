import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  deleteExpense,
  EXPENSE_METHODS,
  updateExpense,
  useExpense,
  type ExpenseMethod,
  type ExpenseRow,
} from '@/features/expenses/hooks'
import { EXPENSE_CATEGORIES } from '@/features/expenses/categories'
import {
  deletePhoto,
  uploadPhoto,
  usePhotos,
  type PhotoWithUrl,
} from '@/features/estimates/photos'
import {
  DangerButton,
  Field,
  PrimaryButton,
  Select,
  TextArea,
  TextInput,
} from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { formatCents, localToday, parseDollarsToCents } from '@/lib/format'
import { confirm } from '@/lib/confirm'

export const Route = createFileRoute('/_authed/expenses/$expenseId')({
  component: ExpenseDetailScreen,
})

function ExpenseDetailScreen() {
  const { expenseId } = Route.useParams()
  const { data: expense, isLoading } = useExpense(expenseId)

  if (isLoading || !expense) {
    return (
      <div className="px-edge pt-6">
        <SkeletonDetail />
      </div>
    )
  }

  // Keyed on id so the editor seeds its form from the loaded row exactly once
  // (cache patches after save re-render in place without resetting fields).
  return <ExpenseEditor key={expense.id} expense={expense} />
}

function ExpenseEditor({ expense }: { expense: ExpenseRow }) {
  const navigate = useNavigate()
  const expenseId = expense.id

  const [dollars, setDollars] = useState(() => (expense.amount_cents / 100).toFixed(2))
  const [category, setCategory] = useState(expense.category)
  const [spentOn, setSpentOn] = useState(expense.spent_on)
  const [method, setMethod] = useState<ExpenseMethod>(
    expense.payment_method as ExpenseMethod,
  )
  const [vendor, setVendor] = useState(expense.vendor)
  const [note, setNote] = useState(expense.note)
  const [saving, setSaving] = useState(false)

  const amountCents = parseDollarsToCents(dollars)
  const canSave = amountCents !== null && amountCents > 0 && !saving

  async function handleSave() {
    if (amountCents === null || amountCents <= 0 || saving) return
    setSaving(true)
    await updateExpense(expenseId, {
      category,
      amount_cents: amountCents,
      spent_on: spentOn || localToday(),
      vendor: vendor.trim(),
      note: note.trim(),
      payment_method: method,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (
      !(await confirm({
        title: 'Delete this expense?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return
    await deleteExpense(expenseId)
    void navigate({ to: '/money' })
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Expense</h1>
        <span className="heading-stencil text-3xl text-sand">
          {formatCents(amountCents ?? expense.amount_cents)}
        </span>
      </div>
      {expense.client && (
        <p className="mt-1 text-sm text-faded">for {expense.client.name}</p>
      )}

      <div className="mt-4 flex flex-col gap-4 pb-8">
        <Field label="Amount">
          <TextInput
            inputMode="decimal"
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
          <TextInput value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>

        <Field label="Note">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <ReceiptsSection expenseId={expenseId} />

        <PrimaryButton disabled={!canSave} onClick={() => void handleSave()}>
          Save changes
        </PrimaryButton>
        <DangerButton onClick={() => void handleDelete()}>Delete expense</DangerButton>
      </div>
    </div>
  )
}

function ReceiptsSection({ expenseId }: { expenseId: string }) {
  const { data: photos } = usePhotos('expense', expenseId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const online = navigator.onLine

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    try {
      await uploadPhoto('expense', expenseId, file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(photo: PhotoWithUrl) {
    if (
      !(await confirm({
        title: 'Delete this receipt?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return
    setError('')
    try {
      await deletePhoto(photo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.')
    }
  }

  return (
    <div className="rounded-lg border border-edge bg-panel px-4 py-4">
      <p className="heading-stencil text-xs text-faded">Receipts</p>

      {(photos ?? []).length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(photos ?? []).map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              {photo.url ? (
                <img
                  loading="lazy"
                  src={photo.url}
                  alt="Receipt"
                  className="h-full w-full rounded-lg border border-edge object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg border border-edge text-xs text-faded">
                  No link
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(photo)}
                aria-label="Delete receipt"
                className="heading-stencil absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-alert"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={!online || uploading}
        onClick={() => fileRef.current?.click()}
        className="heading-stencil mt-3 w-full rounded-lg border border-edge px-4 py-4 text-sand disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Add receipt'}
      </button>
      {!online && (
        <p className="mt-1 text-center text-xs text-faded">Receipts need a connection</p>
      )}
      {error && <p className="mt-1 text-center text-xs text-alert">{error}</p>}
    </div>
  )
}
