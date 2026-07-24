import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { MessageCircle, Phone, Sprout } from 'lucide-react'
import {
  CLIENT_STAGES,
  nextStage,
  setClientStage,
  useClients,
  type Client,
  type ClientStage,
} from '@/features/clients/hooks'
import { stageAdvanceWarning } from '@/features/clients/stageGate'
import { isOpen, useInvoiceBalances } from '@/features/invoices/hooks'
import { EmptyState } from '@/components/EmptyState'
import { confirm } from '@/lib/confirm'
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

/** Confirm before the one-tap forward move — an accidental advance is awkward
 *  to walk back from the board (the segmented control on the detail screen is
 *  the easy-undo path). When the target stage's exit criteria aren't met the
 *  confirm becomes a soft gate (G-0/G-H3): name what's missing, offer the
 *  producing action, but never hard-block the move. */
async function advance(client: Client, to: ClientStage) {
  const label = CLIENT_STAGES.find((s) => s.value === to)?.label ?? to
  const warning = await stageAdvanceWarning(client.id, to)
  const ok = warning
    ? await confirm({
        title: warning.title,
        body: warning.body,
        confirmLabel: 'Move anyway',
      })
    : await confirm({ title: `Move to ${label}?`, confirmLabel: 'Move' })
  if (ok) {
    await setClientStage(client, to)
  }
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

      {clients?.length === 0 && (
        <EmptyState
          icon={<Sprout size={40} strokeWidth={1.5} />}
          title="No clients yet"
          body="Add your first lead and start moving them through the pipeline."
          action={
            <Link
              to="/clients/new"
              search={{ lead: 1 }}
              className="heading-stencil rounded-lg bg-blaze px-5 py-3 text-on-cta"
            >
              + Add client
            </Link>
          }
        />
      )}

      <div className="scroll-hide flex snap-x gap-3 overflow-x-auto px-edge py-4">
        {CLIENT_STAGES.map((stage) => {
          const cards = (clients ?? []).filter((c) => c.stage === stage.value)
          return (
            <section
              key={stage.value}
              className={`flex w-[82vw] max-w-sm shrink-0 snap-center flex-col rounded-lg border-2 bg-surface-low p-3 ${TINT[stage.value]}`}
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
            className="tap-active grid h-10 flex-1 place-items-center rounded-lg border-2 border-edge text-base text-sand"
          >
            <Phone size={20} aria-hidden />
          </a>
          <a
            href={`sms:${client.phone}`}
            aria-label={`Text ${client.name}`}
            className="tap-active grid h-10 flex-1 place-items-center rounded-lg border-2 border-edge text-base text-sand"
          >
            <MessageCircle size={20} aria-hidden />
          </a>
        </div>
      )}

      {/* Make the stage actionable, not just a label: the obvious next move for
          a lead/quoted client is to quote them; for an active client, to
          schedule work. Carries clientId so the form lands pre-scoped. */}
      {(client.stage === 'lead' || client.stage === 'quoted') && (
        <Link
          to="/estimates/new"
          search={{ clientId: client.id }}
          className="heading-stencil tap-active mt-2 block w-full rounded-lg bg-blaze py-2 text-center text-xs text-on-cta"
        >
          Quote
        </Link>
      )}
      {client.stage === 'active' && (
        <Link
          to="/jobs/new"
          search={{ clientId: client.id }}
          className="heading-stencil tap-active mt-2 block w-full rounded-lg border-2 border-edge py-2 text-center text-xs text-sand"
        >
          Schedule
        </Link>
      )}

      {advanceTo && (
        <button
          type="button"
          onClick={() => void advance(client, advanceTo)}
          className="heading-stencil tap-active mt-2 w-full rounded-lg border-2 border-edge py-2 text-xs text-sand"
        >
          Advance →
        </button>
      )}
    </div>
  )
}
