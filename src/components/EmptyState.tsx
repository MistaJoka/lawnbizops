/**
 * Consistent "there's nothing here yet" treatment. Distinct from a Skeleton
 * (which means data is still loading): an EmptyState means the load finished and
 * the result is genuinely empty. Optional icon + title + supporting line + a
 * CTA slot for the obvious next action.
 *
 * `icon` takes a lucide element (e.g. <Sprout size={40} strokeWidth={1.5} />) —
 * emoji are banned from UI chrome (they render per-vendor; a grey phone emoji
 * on Samsung reads as a disabled control).
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-edge py-16 text-center">
      {icon && (
        <div aria-hidden className="text-faded opacity-60">
          {icon}
        </div>
      )}
      <p className="heading-stencil text-lg text-faded">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
