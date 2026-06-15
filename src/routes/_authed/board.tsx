import { createFileRoute, redirect } from '@tanstack/react-router'

// The standalone jobs board was folded into Today (Board view). Keep the path
// as a redirect so old links / bookmarks / the Settings row still land there.
export const Route = createFileRoute('/_authed/board')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
