import type { JobPipelineStage } from '@/lib/jobPipeline'

const STEPS: { key: JobPipelineStage; label: string }[] = [
  { key: 'quote', label: 'Quote' },
  { key: 'todo', label: 'To do' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Invoiced' },
]

export function JobStepper({ stage }: { stage: JobPipelineStage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === stage)

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        return (
          <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={`h-2 w-full rounded-sm ${
                done ? 'bg-go' : active ? 'bg-blaze' : 'bg-edge'
              }`}
            />
            <span
              className={`label-caps truncate text-[10px] ${
                active ? 'text-blaze' : done ? 'text-go' : 'text-faded'
              }`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
