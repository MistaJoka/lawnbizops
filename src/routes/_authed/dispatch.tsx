import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'
import { jobsForDateQueryOptions } from '@/features/jobs/hooks'
import { localToday } from '@/lib/format'
import { DispatchScreen } from '@/features/dispatch/DispatchScreen'

export const Route = createFileRoute('/_authed/dispatch')({
  loader: () => queryClient.prefetchQuery(jobsForDateQueryOptions(localToday())),
  component: DispatchScreen,
})
