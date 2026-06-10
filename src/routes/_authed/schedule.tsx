import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/schedule')({
  component: ScheduleScreen,
})

function ScheduleScreen() {
  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Schedule</h1>
      <p className="mt-16 text-center text-faded">Week view coming in Phase 2.</p>
    </div>
  )
}
