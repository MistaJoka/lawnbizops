import { CloudOff } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

/**
 * Hard-failure state for a list/detail query: the fetch errored AND there's no
 * cached data to fall back on. Offers a retry. When a cache exists TanStack
 * serves it, so screens with prior data never reach here — this is the cold,
 * offline-first-miss case, not a transient refetch blip.
 *
 * Auto-width retry button (not the w-full SecondaryButton) so it sits centered
 * in the EmptyState rather than stretching edge to edge.
 */
export function QueryError({
  onRetry,
  title = 'Couldn’t load',
  body = 'Check your connection and try again.',
}: {
  onRetry: () => void
  title?: string
  body?: string
}) {
  return (
    <EmptyState
      icon={<CloudOff size={40} strokeWidth={1.5} />}
      title={title}
      body={body}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="heading-stencil tap-active min-h-touch rounded-lg border-2 border-edge bg-panel px-6 text-base text-sand"
        >
          Retry
        </button>
      }
    />
  )
}
