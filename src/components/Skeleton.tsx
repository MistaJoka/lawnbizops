/**
 * Loading placeholders. The `.shimmer` class (index.css) sweeps a gradient when
 * motion is welcome and falls back to a flat tone under prefers-reduced-motion.
 * Presets mirror the geometry of the real content so the swap on load causes no
 * layout shift — a list stays a list, a card stays a card.
 *
 * Keep these visually distinct from empty states: a skeleton means "data is
 * coming", an empty state means "there's genuinely nothing here yet".
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`shimmer rounded ${className}`} />
}

/** A list row placeholder — name + sub-line + trailing affordance. */
export function SkeletonRow() {
  return (
    <div className="card-surface flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  )
}

/** A board/summary card placeholder — header row, amount, action chips. */
export function SkeletonCard() {
  return (
    <div className="card-surface flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-5 w-14 rounded" />
      </div>
      <Skeleton className="h-4 w-1/4" />
      <div className="flex gap-2">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  )
}

/** Stack of placeholders for a loading list/board. */
export function SkeletonList({
  count = 4,
  variant = 'row',
}: {
  count?: number
  variant?: 'row' | 'card'
}) {
  const Item = variant === 'card' ? SkeletonCard : SkeletonRow
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}

/** A detail-screen placeholder — title block, meta lines, a content card. */
export function SkeletonDetail() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-7 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
      <div className="card-surface mt-2 flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
