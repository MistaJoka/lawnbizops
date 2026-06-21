/**
 * Consistent "there's nothing here yet" treatment. Distinct from a Skeleton
 * (which means data is still loading): an EmptyState means the load finished and
 * the result is genuinely empty. Optional glyph + title + supporting line + a
 * CTA slot for the obvious next action.
 */
export function EmptyState({
  glyph,
  title,
  body,
  action,
}: {
  glyph?: string
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-edge py-16 text-center">
      {glyph && <div className="text-4xl opacity-60">{glyph}</div>}
      <p className="heading-stencil text-lg text-faded">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
