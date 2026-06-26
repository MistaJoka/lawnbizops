import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { DevStripe } from '@/components/DevStripe'
import { AppErrorFallback } from '@/components/AppErrorFallback'

// Token-keyed, no-login pages shown to the business's *customers* (a prospect
// filling a quote request, a client approving an estimate). They must NOT carry
// the operator's DevStripe — version, build sha, and sync status are internal
// provenance a customer should never see. Match by path prefix; TanStack gives
// us the basepath-stripped pathname.
export function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/quote/') || pathname.startsWith('/e/')
}

function RootLayout() {
  const isPublic = useRouterState({
    select: (s) => isPublicPath(s.location.pathname),
  })
  return (
    <>
      {!isPublic && <DevStripe />}
      <Outlet />
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  // A thrown beforeLoad/loader — most importantly a dead-zone cold start where
  // the backend is unreachable — renders this recoverable screen instead of a
  // blank canvas. Keep the top bar so build/version + sync status still read.
  // (Public pages own their own error UI, so this path is operator-facing.)
  errorComponent: () => (
    <>
      <DevStripe />
      <AppErrorFallback />
    </>
  ),
})
