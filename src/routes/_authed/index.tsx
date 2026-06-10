import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/')({
  component: TodayScreen,
})

function TodayScreen() {
  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Today</h1>
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-lg text-faded">No jobs on the books yet.</p>
        <p className="text-sm text-faded">
          Jobs you schedule will show up here, in drive order.
        </p>
      </div>
    </div>
  )
}
