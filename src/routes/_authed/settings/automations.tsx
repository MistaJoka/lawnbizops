import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'
import { Toggle } from '@/components/Toggle'
import { SkeletonList } from '@/components/Skeleton'
import { useBusinessSettings, type BusinessSettings } from '@/features/invoices/hooks'
import { saveBusinessSettings } from '@/features/settings/hooks'

export const Route = createFileRoute('/_authed/settings/automations')({
  component: AutomationsScreen,
})

function AutomationsScreen() {
  const { data: settings } = useBusinessSettings()
  if (!settings) {
    return (
      <div className="px-edge py-12">
        <SkeletonList count={3} variant="card" />
      </div>
    )
  }
  // Remount when the server row changes so the form re-prefills without an
  // effect (the project lints against setState-in-effect).
  return <AutomationsForm key={settings.updated_at} settings={settings} />
}

function AutomationsForm({ settings }: { settings: BusinessSettings }) {
  const [followup, setFollowup] = useState(settings.auto_followup_after_job)
  const [followupDays, setFollowupDays] = useState(settings.auto_followup_days)
  const [overdue, setOverdue] = useState(settings.auto_overdue_reminder)
  const [overdueDays, setOverdueDays] = useState(settings.auto_overdue_days)
  const [emailOverdue, setEmailOverdue] = useState(settings.email_overdue_reminders)
  const [emailAppt, setEmailAppt] = useState(settings.email_appointment_reminders)
  const [status, setStatus] = useState<string | null>(null)

  async function save(patch: {
    auto_followup_after_job?: boolean
    auto_followup_days?: number
    auto_overdue_reminder?: boolean
    auto_overdue_days?: number
    email_overdue_reminders?: boolean
    email_appointment_reminders?: boolean
  }) {
    setStatus(null)
    try {
      await saveBusinessSettings(patch)
      setStatus('Saved')
    } catch {
      setStatus("Couldn't save — check your connection.")
    }
  }

  return (
    <div className="px-edge pt-6 pb-24">
      <BackLink fallback="/settings" label="Settings" />
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Automations</h1>
      <p className="mt-1 text-sm text-muted">
        Let the app handle the busywork. These add tasks to your Follow-ups.
      </p>

      <section className="mt-6 flex flex-col gap-4">
        <div className="card-surface p-4">
          <Toggle
            id="auto-followup"
            label="Follow up after a job"
            checked={followup}
            onChange={(v) => {
              setFollowup(v)
              void save({ auto_followup_after_job: v })
            }}
          />
          <p className="mt-1 text-sm text-muted">
            When you mark a job done, create a follow-up task.
          </p>
          {followup && (
            <label className="mt-3 flex items-center gap-2 text-sm text-sand">
              Remind me
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={90}
                value={followupDays}
                onChange={(e) => setFollowupDays(Number(e.target.value))}
                onBlur={() => void save({ auto_followup_days: followupDays })}
                className="w-16 rounded-lg border-2 border-edge bg-canvas px-2 py-1 text-center text-sand focus:border-blaze focus:outline-none"
              />
              days later
            </label>
          )}
        </div>

        <div className="card-surface p-4">
          <Toggle
            id="auto-overdue"
            label="Overdue invoice reminders"
            checked={overdue}
            onChange={(v) => {
              setOverdue(v)
              void save({ auto_overdue_reminder: v })
            }}
          />
          <p className="mt-1 text-sm text-muted">
            Each night, flag unpaid invoices past due with a follow-up task.
          </p>
          {overdue && (
            <label className="mt-3 flex items-center gap-2 text-sm text-sand">
              Once they&apos;re
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={overdueDays}
                onChange={(e) => setOverdueDays(Number(e.target.value))}
                onBlur={() => void save({ auto_overdue_days: overdueDays })}
                className="w-16 rounded-lg border-2 border-edge bg-canvas px-2 py-1 text-center text-sand focus:border-blaze focus:outline-none"
              />
              days overdue
            </label>
          )}
        </div>

        <div className="card-surface p-4">
          <Toggle
            id="email-overdue"
            label="Email overdue reminders"
            checked={emailOverdue}
            onChange={(v) => {
              setEmailOverdue(v)
              void save({ email_overdue_reminders: v })
            }}
          />
          <p className="mt-1 text-sm text-muted">
            Each night, email clients a friendly reminder for overdue invoices (re-nudges
            at most weekly, only clients with an email).
          </p>
        </div>

        <div className="card-surface p-4">
          <Toggle
            id="email-appointments"
            label="Email visit reminders"
            checked={emailAppt}
            onChange={(v) => {
              setEmailAppt(v)
              void save({ email_appointment_reminders: v })
            }}
          />
          <p className="mt-1 text-sm text-muted">
            Each morning, email clients a heads-up for that day&apos;s scheduled visits.
          </p>
        </div>
      </section>

      {status && (
        <p className={`mt-4 text-sm ${status === 'Saved' ? 'text-go' : 'text-alert'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
