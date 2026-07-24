import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'

/**
 * History-aware back affordance. The old hardcoded "← Money"/"← Today" links
 * teleported users to a screen they never came from (open an estimate from a
 * client → back landed on Money). When there is in-app history, go back to
 * where the user actually was; the fallback route + label only applies on a
 * cold deep-link (PWA restore, shared URL) where there is nowhere to go back.
 */
export function BackLink({
  fallback,
  label,
  className,
}: {
  fallback: string
  /** Name of the fallback destination, e.g. "Money" — shown only cold. */
  label: string
  className?: string
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const cls = className ?? 'inline-block py-2 pr-4 text-sm text-faded'
  if (canGoBack) {
    return (
      <button type="button" onClick={() => router.history.back()} className={cls}>
        ← Back
      </button>
    )
  }
  return (
    <Link to={fallback} className={cls}>
      ← {label}
    </Link>
  )
}
