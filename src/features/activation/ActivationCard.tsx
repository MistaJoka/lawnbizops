import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useClients } from '@/features/clients/hooks'
import { useEstimates } from '@/features/estimates/hooks'
import { useKanbanJobs } from '@/features/jobs/hooks'
import { loadPreferences, savePreferences } from '@/lib/preferences'

/**
 * Home-screen "getting started" checklist. Replaces the silent hand-off after
 * onboarding with a persistent, progress-tracked guide to first value:
 * add a client → create a quote → schedule a job. Reads real counts, so steps
 * tick off as the user works. Hides once dismissed or all three are done — an
 * established business with existing data never sees it.
 */
export function ActivationCard() {
  const { data: clients } = useClients()
  const { data: estimates } = useEstimates()
  const { data: jobs } = useKanbanJobs()
  const [dismissed, setDismissed] = useState(() => loadPreferences().activationDismissed)

  if (dismissed) return null
  // Wait for all three before deciding — avoids flashing the card for an
  // established business whose counts are still loading.
  if (!clients || !estimates || !jobs) return null

  const steps = [
    {
      to: '/clients/new',
      label: 'Add your first client',
      hint: 'Name plus a phone or email',
      done: clients.length > 0,
    },
    {
      to: '/estimates/new',
      label: 'Create your first quote',
      hint: 'Line items, ready to send',
      done: estimates.length > 0,
    },
    {
      to: '/jobs/new',
      label: 'Schedule your first job',
      hint: 'Put the work on the calendar',
      done: jobs.length > 0,
    },
  ] as const

  const completed = steps.filter((s) => s.done).length
  if (completed === steps.length) return null

  function dismiss() {
    setDismissed(true)
    savePreferences({ activationDismissed: true })
  }

  return (
    <section className="mx-edge mt-4 rounded-lg border-2 border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="heading-stencil text-lg text-khaki">Get set up</h2>
          <p className="mt-0.5 text-sm text-faded">
            <span className="tabular-nums">
              {completed} of {steps.length}
            </span>{' '}
            done — finish to start running jobs.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Hide setup checklist"
          className="tap-active label-caps -m-2 shrink-0 p-2 text-faded"
        >
          Hide
        </button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-blaze transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((step) =>
          step.done ? (
            <li
              key={step.to}
              className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-2 opacity-60"
            >
              <CheckDot done />
              <span className="text-sand line-through decoration-edge">{step.label}</span>
            </li>
          ) : (
            <li key={step.to}>
              <Link
                to={step.to}
                className="tap-active flex min-h-touch items-center gap-3 rounded-lg border-2 border-edge bg-canvas px-3 py-2"
              >
                <CheckDot />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display font-semibold text-sand">
                    {step.label}
                  </span>
                  <span className="truncate text-xs text-faded">{step.hint}</span>
                </span>
                <span className="label-caps ml-auto shrink-0 text-blaze">Start →</span>
              </Link>
            </li>
          ),
        )}
      </ol>
    </section>
  )
}

function CheckDot({ done }: { done?: boolean }) {
  return done ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-go text-go">
      ✓
    </span>
  ) : (
    <span className="h-6 w-6 shrink-0 rounded-full border-2 border-edge" />
  )
}
