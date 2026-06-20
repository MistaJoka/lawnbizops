import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CLIENT_STAGES,
  nextStage,
  setClientStage,
  useClients,
  type Client,
  type ClientStage,
} from '@/features/clients/hooks'
import { isOpen, useInvoiceBalances } from '@/features/invoices/hooks'
import { formatCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/pipeline')({
  component: PipelineScreen,
})

const TINT: Record<ClientStage, string> = {
  lead: 'border-outline',
  quoted: 'border-khaki',
  active: 'border-go',
  dormant: 'border-edge',
}

function PipelineScreen() {
  const { data: clients } = useClients()
  const { data: invoices } = useInvoiceBalances()

  const balanceByClient = new Map<string, number>()
  for (const inv of invoices ?? []) {
    if (!isOpen(inv)) continue
    balanceByClient.set(
      inv.client_id,
      (balanceByClient.get(inv.client_id) ?? 0) + inv.balance_cents,
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center justify-between border-b-2 border-edge bg-canvas px-edge">
        <h1 className="heading-stencil text-2xl text-khaki">Pipeline</h1>
        <Link to="/clients" className="label-caps text-blaze">
          Clients
        </Link>
      </header>

      <div className="scroll-hide flex snap-x gap-3 overflow-x-auto px-edge py-4">
        {CLIENT_STAGES.map((stage) => {
          const cards = (clients ?? []).filter((c) => c.stage === stage.value)
          return (
            <section
              key={stage.value}
              className={`flex w-[82vw] max-w-sm shrink-0 snap-center flex-col rounded-xl border-2 bg-surface-low p-3 ${TINT[stage.value]}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="heading-stencil text-sm text-sand">{stage.label}</h2>
                <span className="label-caps text-faded">{cards.length}</span>
              </div>
              <div className="flex min-h-32 flex-col gap-2">
                {cards.map((client) => (
                  <PipelineCard
                    key={client.id}
                    client={client}
                    balance={balanceByClient.get(client.id) ?? 0}
                  />
                ))}
              </div>
              {cards.length === 0 && (
                <p className="py-8 text-center text-sm text-faded">No clients</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function PipelineCard({ client, balance }: { client: Client; balance: number }) {
  const navigate = useNavigate()
  const advanceTo = nextStage(client.stage)

  function openDetail() {
    void navigate({ to: '/clients/$clientId', params: { clientId: client.id } })
  }

  return (
    <div className="card-surface p-3">
      <div
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openDetail()
        }}
        className="tap-active cursor-pointer"
      >
        <span className="font-display text-base font-semibold text-sand">
          {client.name}
        </span>
        {balance > 0 && (
          <p className="mt-1 text-sm text-blaze">{formatCents(balance)} open</p>
        )}
      </div>

      {client.phone && (
        <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={`tel:${client.phone}`}
            aria-label={`Call ${client.name}`}
            className="tap-active grid h-10 flex-1 place-items-center rounded-md border-2 border-edge text-base text-sand"
          >
            📞
          </a>
          <a
            href={`sms:${client.phone}`}
            aria-label={`Text ${client.name}`}
            className="tap-active grid h-10 flex-1 place-items-center rounded-md border-2 border-edge text-base text-sand"
          >
            💬
          </a>
        </div>
      )}

      {advanceTo && (
        <button
          type="button"
          onClick={() => void setClientStage(client, advanceTo)}
          className="heading-stencil tap-active mt-2 w-full rounded-lg border-2 border-edge py-2 text-xs text-sand"
        >
          Advance →
        </button>
      )}
    </div>
  )
}
