import { Outlet, createRootRoute } from '@tanstack/react-router'
import { DevStripe } from '@/components/DevStripe'
import { AppErrorFallback } from '@/components/AppErrorFallback'

export const Route = createRootRoute({
  component: () => (
    <>
      <DevStripe />
      <Outlet />
    </>
  ),
  // A thrown beforeLoad/loader — most importantly a dead-zone cold start where
  // the backend is unreachable — renders this recoverable screen instead of a
  // blank canvas. Keep the top bar so build/version + sync status still read.
  errorComponent: () => (
    <>
      <DevStripe />
      <AppErrorFallback />
    </>
  ),
})
