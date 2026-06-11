export type JobPipelineStage = 'quote' | 'todo' | 'progress' | 'done'

export function jobPipelineStage(status: string): JobPipelineStage {
  if (status === 'in_progress') return 'progress'
  if (status === 'done' || status === 'invoiced' || status === 'skipped') return 'done'
  return 'todo'
}
