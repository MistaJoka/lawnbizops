import { Skeleton, SkeletonList } from './Skeleton'

/**
 * App-wide router pending fallback (`defaultPendingComponent` in main.tsx),
 * shown when a route's beforeLoad/loader stays pending past the threshold —
 * cold starts, a slow auth gate, or a flaky network. The root chrome (top bar /
 * tab bar) still renders around this, so it only fills the content region.
 *
 * It mirrors the shape shared by most screens (title → stat row → list) so the
 * wait reads as "this screen is loading" rather than a blank stall, and the swap
 * to real content lands without a jarring layout jump. The shimmer falls back to
 * a flat tone under prefers-reduced-motion (see .shimmer in index.css).
 */
export function RoutePending() {
  return (
    <div role="status" aria-label="Loading" className="px-edge pt-6">
      {/* title block */}
      <Skeleton className="h-7 w-2/5" />

      {/* stat row — echoes the Collected/Spent/Net & board summary cards */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>

      {/* list body */}
      <div className="mt-5">
        <SkeletonList count={4} />
      </div>
    </div>
  )
}
