import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/money')({
  component: MoneyScreen,
})

function MoneyScreen() {
  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Money</h1>
      <p className="mt-16 text-center text-faded">
        Invoices and estimates coming in Phase 3.
      </p>
    </div>
  )
}
