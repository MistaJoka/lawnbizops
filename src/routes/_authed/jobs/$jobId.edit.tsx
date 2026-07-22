import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { updateJob, useJob, type JobWithContext } from '@/features/jobs/hooks'
import { usePropertyServices } from '@/features/properties/hooks'
import { useServices } from '@/features/services/hooks'
import { Field, PrimaryButton, Select, TextArea, TextInput } from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { parseDollarsToCents } from '@/lib/format'

// Editable while the work is still live or awaiting billing; an invoiced job's
// price belongs to its invoice, and canceled/skipped jobs are out of play.
const EDITABLE_STATUSES = ['scheduled', 'in_progress', 'done']

export const Route = createFileRoute('/_authed/jobs/$jobId/edit')({
  component: EditJobScreen,
})

function EditJobScreen() {
  const { jobId } = Route.useParams()
  const { data: job, isLoading } = useJob(jobId)

  if (!job) {
    return (
      <div className="px-edge pt-6">
        <Link
          to="/jobs/$jobId"
          params={{ jobId }}
          className="inline-block py-2 pr-4 text-sm text-faded"
        >
          ← Job
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : (
          <p className="mt-16 text-center text-faded">Job not found.</p>
        )}
      </div>
    )
  }

  if (!EDITABLE_STATUSES.includes(job.status)) {
    return (
      <div className="px-edge pt-6">
        <Link
          to="/jobs/$jobId"
          params={{ jobId }}
          className="inline-block py-2 pr-4 text-sm text-faded"
        >
          ← Job
        </Link>
        <p className="mt-16 text-center text-faded">
          {job.status === 'invoiced'
            ? 'This job is invoiced — adjust the invoice instead.'
            : 'This job is closed and can no longer be edited.'}
        </p>
      </div>
    )
  }

  return <EditJobForm key={job.id} job={job} />
}

function EditJobForm({ job }: { job: JobWithContext }) {
  const navigate = useNavigate()
  const [serviceId, setServiceId] = useState(job.service_id ?? '')
  const [dollars, setDollars] = useState((job.price_cents / 100).toFixed(2))
  const [priceError, setPriceError] = useState(false)
  const [title, setTitle] = useState(job.title)
  const [date, setDate] = useState(job.scheduled_date)
  const [startTime, setStartTime] = useState(job.start_time)
  const [notes, setNotes] = useState(job.notes)
  const [saving, setSaving] = useState(false)

  const { data: services } = useServices()
  const { data: overrides } = usePropertyServices(job.property_id)

  function pickService(id: string) {
    setServiceId(id)
    const service = (services ?? []).find((s) => s.id === id)
    if (!service) return
    const cents =
      (overrides ?? []).find((ps) => ps.service_id === id)?.price_cents ??
      service.default_price_cents
    setDollars((cents / 100).toFixed(2))
    setPriceError(false)
  }

  async function handleSave() {
    const cents = parseDollarsToCents(dollars)
    if (cents === null) {
      setPriceError(true)
      return
    }
    if (!date) return
    setSaving(true)
    try {
      await updateJob(job, {
        service_id: serviceId || null,
        price_cents: cents,
        title,
        scheduled_date: date,
        start_time: startTime,
        notes,
      })
      void navigate({ to: '/jobs/$jobId', params: { jobId: job.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link
        to="/jobs/$jobId"
        params={{ jobId: job.id }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Job
      </Link>
      <div className="mt-2 border-b-4 border-blaze bg-surface-low py-4">
        <h1 className="heading-stencil text-2xl text-sand">Edit job</h1>
        {job.schedule_id && (
          <p className="label-caps mt-1 text-muted">
            Recurring visit — your changes stick through resyncs
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Service (optional)">
          <Select value={serviceId} onChange={(e) => pickService(e.target.value)}>
            <option value="">No service</option>
            {(services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Price ($)">
          <TextInput
            inputMode="decimal"
            placeholder="0.00"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value)
              setPriceError(false)
            }}
          />
        </Field>
        {priceError && <p className="-mt-2 text-sm text-alert">Enter a dollar amount.</p>}

        <Field label="Title">
          <TextInput
            placeholder="e.g. Hedge trim + cleanup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <TextInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Start time">
            <TextInput
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Job scope & materials">
          <TextArea
            placeholder="• Edge beds&#10;• 3 cu yd hardwood mulch&#10;• Haul debris"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>

      <div className="sticky bottom-tabbar z-30 -mx-edge mt-4 border-t-2 border-edge bg-canvas px-edge py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PrimaryButton disabled={!date || saving} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </div>
    </div>
  )
}
