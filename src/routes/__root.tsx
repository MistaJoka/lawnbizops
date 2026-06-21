import { Outlet, createRootRoute } from '@tanstack/react-router'
import { DevStripe } from '@/components/DevStripe'

export const Route = createRootRoute({
  component: () => (
    <>
      <DevStripe />
      <Outlet />
    </>
  ),
})
