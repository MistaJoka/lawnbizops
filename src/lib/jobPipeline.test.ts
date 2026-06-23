import { describe, expect, it } from 'vitest'
import { jobPipelineStage } from './jobPipeline'

describe('jobPipelineStage', () => {
  it('maps in_progress to progress', () => {
    expect(jobPipelineStage('in_progress')).toBe('progress')
  })
  it('maps terminal statuses to done', () => {
    expect(jobPipelineStage('done')).toBe('done')
    expect(jobPipelineStage('invoiced')).toBe('done')
    expect(jobPipelineStage('skipped')).toBe('done')
  })
  it('treats everything else as todo', () => {
    expect(jobPipelineStage('scheduled')).toBe('todo')
    expect(jobPipelineStage('canceled')).toBe('todo')
  })
})
