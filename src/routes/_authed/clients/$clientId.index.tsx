import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Mail, MessageCircle, Phone, Square, X } from 'lucide-react'
import {
  CLIENT_STAGES,
  archiveClient,
  mergeClients,
  setClientStage,
  useClient,
  useClients,
  type Client,
  type ClientStage,
} from '@/features/clients/hooks'
import { stageAdvanceWarning } from '@/features/clients/stageGate'
import { formatAddress, useProperties } from '@/features/properties/hooks'
import { useEstimates } from '@/features/estimates/hooks'
import { isOpen, useInvoiceBalances } from '@/features/invoices/hooks'
import { useClientProfitability } from '@/features/profitability/hooks'
import { presetRange } from '@/features/reports/range'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { Sheet } from '@/components/Sheet'
import { SkeletonDetail } from '@/components/Skeleton'
import { confirm } from '@/lib/confirm'
import { ClientFollowUps } from '@/features/tasks/TaskUI'
import { formatCents } from '@/lib/format'

export const Route = createFileRoute('/_authed/clients/$clientId/')({
  component: ClientDetailScreen,
})

function ClientDetailScreen() {
  const { clientId } = Route.useParams()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(clientId)
  const { data: properties } = useProperties(clientId)
  const [merging, setMerging] = useState(false)
  const { data: invoices } = useInvoiceBalances()
  const openBalance = (invoices ?? [])
    .filter((inv) => inv.client_id === clientId && isOpen(inv))
    .reduce((sum, inv) => sum + inv.balance_cents, 0)

  if (!client) {
    return (
      <div className="px-edge pt-6">
        <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Clients
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : (
          <p className="mt-16 text-center text-faded">Client not found.</p>
        )}
      </div>
    )
  }

  async function handleArchive() {
    if (!client) return
    if (
      !(await confirm({
        title: `Archive ${client.name}?`,
        body: "They'll disappear from your client list. You can still find them in exports.",
        confirmLabel: 'Archive',
      }))
    ) {
      return
    }
    await archiveClient(client)
    void navigate({ to: '/clients' })
  }

  return (
    <div className="px-edge pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
            ← Clients
          </Link>
          <h1 className="heading-stencil mt-2 text-2xl text-khaki">{client.name}</h1>
          <StageControl client={client} />
        </div>
        <Link
          to="/clients/$clientId/edit"
          params={{ clientId }}
          className="heading-stencil shrink-0 rounded-lg border border-edge px-4 py-3 text-sm text-sand"
        >
          Edit
        </Link>
      </div>

      {(client.stage === 'lead' || client.stage === 'quoted') && (
        <ReadinessChips client={client} properties={properties} />
      )}

      {client.phone && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`tel:${client.phone}`}
            className="heading-stencil tap-active inline-flex items-center justify-center gap-2 rounded-lg bg-blaze px-4 py-4 text-center text-lg text-on-cta"
          >
            <Phone size={18} aria-hidden /> Call
          </a>
          <a
            href={`sms:${client.phone}`}
            className="heading-stencil tap-active inline-flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-4 py-4 text-center text-lg text-sand"
          >
            <MessageCircle size={18} aria-hidden /> Text
          </a>
        </div>
      )}

      {client.email && (
        <a
          href={`mailto:${client.email}`}
          className="mt-4 inline-flex items-center gap-2 text-faded underline decoration-edge"
        >
          <Mail size={18} aria-hidden /> {client.email}
        </a>
      )}

      {client.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{client.notes}</p>
        </div>
      )}

      {openBalance > 0 && (
        <Link
          to="/money"
          className="mt-4 flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4"
        >
          <span className="heading-stencil text-xs text-faded">Open balance</span>
          <span className="heading-stencil text-xl text-blaze tabular-nums">
            {formatCents(openBalance)} →
          </span>
        </Link>
      )}

      <ClientEconomics clientId={clientId} />

      <h2 className="heading-stencil mt-8 text-lg text-khaki">Follow-ups</h2>
      <div className="mt-2">
        <ClientFollowUps clientId={clientId} />
      </div>

      <h2 className="heading-stencil mt-8 text-lg text-khaki">Activity</h2>
      <div className="mt-2">
        <ActivityTimeline clientId={clientId} />
      </div>

      <h2 className="heading-stencil mt-8 text-lg text-khaki">Properties</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {(properties ?? []).map((property) => (
          <li key={property.id}>
            <Link
              to="/properties/$propertyId"
              params={{ propertyId: property.id }}
              className="block rounded-lg border border-edge bg-panel px-4 py-4"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg text-sand">{property.label || 'Property'}</span>
                {property.lat === null && (
                  <span className="heading-stencil shrink-0 rounded border border-edge px-2 py-1 text-[10px] text-alert">
                    no pin
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm text-faded">
                {formatAddress(property)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {(properties ?? []).length === 0 && (
        <p className="mt-2 text-sm text-faded">No properties yet.</p>
      )}

      <Link
        to="/properties/new"
        search={{ clientId }}
        className="heading-stencil mt-4 block w-full rounded-lg border border-edge bg-panel px-4 py-4 text-center text-lg text-sand"
      >
        + Add property
      </Link>

      {/* The lead/client's primary "do business" action: quote them. Carries
          clientId (and the property when there's exactly one) so New Estimate
          lands pre-scoped — closes the Lead→Quoted exit gap (G-B1). */}
      <Link
        to="/estimates/new"
        search={{
          clientId,
          ...((properties ?? []).length === 1 ? { propertyId: properties![0].id } : {}),
        }}
        className="heading-stencil mt-3 block w-full rounded-lg bg-blaze px-4 py-4 text-center text-lg text-on-cta"
      >
        + Create estimate
      </Link>

      {/* Schedule work directly for this client — closes the client→scheduling
          reachability gap (G-C4). Carries clientId (+ property when single) so
          New Job lands pre-scoped. */}
      <Link
        to="/jobs/new"
        search={{
          clientId,
          ...((properties ?? []).length === 1 ? { propertyId: properties![0].id } : {}),
        }}
        className="heading-stencil mt-3 block w-full rounded-lg border border-edge bg-panel px-4 py-4 text-center text-lg text-sand"
      >
        + Schedule work
      </Link>

      <div className="mt-12 flex items-center justify-center gap-3">
        <button
          onClick={() => setMerging(true)}
          className="heading-stencil rounded-lg border border-edge px-6 py-3 text-faded"
        >
          Merge duplicate…
        </button>
        <button
          onClick={() => void handleArchive()}
          className="heading-stencil rounded-lg border border-edge px-6 py-3 text-alert"
        >
          Archive client
        </button>
      </div>

      {merging && <MergeSheet duplicate={client} onClose={() => setMerging(false)} />}
    </div>
  )
}

/**
 * Fold THIS client (the duplicate) into another one: pick the keeper, confirm,
 * and every property, quote, invoice, and note moves there — this record is
 * archived. The strong confirm carries the full consequence; the RPC is atomic.
 */
function MergeSheet({ duplicate, onClose }: { duplicate: Client; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: clients } = useClients()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const q = query.trim().toLowerCase()
  const candidates = (clients ?? [])
    .filter((c) => c.id !== duplicate.id)
    .filter((c) => !q || c.name.toLowerCase().includes(q))

  async function pick(keep: Client) {
    if (busy) return
    if (
      !(await confirm({
        title: `Merge into ${keep.name}?`,
        body:
          `Everything on ${duplicate.name} — properties, quotes, invoices, ` +
          `activity — moves to ${keep.name}, and ${duplicate.name} is archived. `,
        confirmLabel: 'Merge',
        destructive: true,
      }))
    )
      return
    setBusy(true)
    try {
      await mergeClients(keep, duplicate)
      void navigate({ to: '/clients/$clientId', params: { clientId: keep.id } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="heading-stencil text-lg text-khaki">
          Merge {duplicate.name} into…
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="label-caps text-faded"
          aria-label="Close"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search clients…"
        aria-label="Search clients"
        className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
      />
      <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void pick(c)}
              className="tap-active w-full rounded-lg border border-edge px-4 py-3 text-left disabled:opacity-50"
            >
              <span className="block truncate text-lg text-sand">{c.name}</span>
              {(c.phone || c.email) && (
                <span className="block truncate text-sm text-faded">
                  {[c.phone, c.email].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {candidates.length === 0 && (
        <p className="mt-4 text-center text-sm text-faded">No matching clients.</p>
      )}
    </Sheet>
  )
}

/**
 * Stage-readiness chips (G-B1) for lead/quoted clients: what this client still
 * needs before it can move down the funnel, each chip deep-linking to the
 * prefilled producing screen. Unknown data (properties/estimates not loaded,
 * e.g. offline) suppresses that chip rather than nagging about rows we can't
 * see; when nothing is missing the row renders nothing.
 */
function ReadinessChips({
  client,
  properties,
}: {
  client: Client
  properties: { id: string }[] | undefined
}) {
  const { data: estimates } = useEstimates()
  const needsContact = !client.phone && !client.email
  const needsProperty = properties !== undefined && properties.length === 0
  const needsEstimate =
    estimates !== undefined && !estimates.some((e) => e.client_id === client.id)
  if (!needsContact && !needsProperty && !needsEstimate) return null

  const chip =
    'label-caps tap-active flex min-h-11 items-center gap-2 rounded-full border border-edge px-4 text-khaki'
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="label-caps text-faded">Needs</span>
      {needsContact && (
        <Link
          to="/clients/$clientId/edit"
          params={{ clientId: client.id }}
          className={chip}
        >
          <Square size={16} aria-hidden /> Contact
        </Link>
      )}
      {needsProperty && (
        <Link to="/properties/new" search={{ clientId: client.id }} className={chip}>
          <Square size={16} aria-hidden /> Property
        </Link>
      )}
      {needsEstimate && (
        <Link
          to="/estimates/new"
          search={{
            clientId: client.id,
            ...(properties?.length === 1 ? { propertyId: properties[0].id } : {}),
          }}
          className={chip}
        >
          <Square size={16} aria-hidden /> Estimate
        </Link>
      )}
    </div>
  )
}

/**
 * Client economics, year to date. Revenue is COLLECTED (payments) — true
 * cash-basis at the client level; costs are expenses tagged to the client.
 * Reuses the shared client_profitability RPC (cached across client screens).
 */
function ClientEconomics({ clientId }: { clientId: string }) {
  const range = presetRange('year')
  const { data: rows } = useClientProfitability(range)
  const row = (rows ?? []).find((r) => r.client_id === clientId)
  const revenue = row?.revenue_cents ?? 0
  const cost = row?.cost_cents ?? 0
  const profit = revenue - cost

  return (
    <div className="card-surface mt-8 p-4">
      <div className="flex items-center justify-between">
        <p className="label-caps text-faded">Profit · year to date</p>
        <Link to="/expenses/new" search={{ clientId }} className="label-caps text-blaze">
          + Log expense
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <p className="heading-stencil text-[10px] text-faded">Collected</p>
          <p className="heading-stencil mt-1 truncate text-lg text-sand tabular-nums">
            {formatCents(revenue)}
          </p>
        </div>
        <div>
          <p className="heading-stencil text-[10px] text-faded">Costs</p>
          <p className="heading-stencil mt-1 truncate text-lg text-sand tabular-nums">
            {formatCents(cost)}
          </p>
        </div>
        <div>
          <p className="heading-stencil text-[10px] text-faded">Profit</p>
          <p
            className={`heading-stencil mt-1 truncate text-lg tabular-nums ${
              profit < 0 ? 'text-alert' : 'text-go'
            }`}
          >
            {formatCents(profit)}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Segmented control over the 4 pipeline stages. Same soft gate as the
 *  Pipeline board (G-0/G-H3): a move that skips the target stage's exit
 *  criteria names what's missing and asks — but never hard-blocks. Un-gated
 *  moves stay one-tap (this control is the easy-undo path). */
async function pickStage(client: Client, stage: ClientStage) {
  if (stage === client.stage) return
  const warning = await stageAdvanceWarning(client.id, stage)
  if (warning) {
    const ok = await confirm({
      title: warning.title,
      body: warning.body,
      confirmLabel: 'Move anyway',
    })
    if (!ok) return
  }
  await setClientStage(client, stage)
}

function StageControl({ client }: { client: Client }) {
  return (
    <div className="mt-2 flex gap-1 rounded-lg border-2 border-edge bg-surface-low p-1">
      {CLIENT_STAGES.map((stage) => {
        const active = client.stage === stage.value
        return (
          <button
            key={stage.value}
            type="button"
            aria-pressed={active}
            onClick={() => void pickStage(client, stage.value)}
            className={`label-caps tap-active min-h-touch flex-1 rounded-lg px-2 py-2 text-xs ${
              active ? 'bg-blaze text-on-cta' : 'text-faded'
            }`}
          >
            {stage.label}
          </button>
        )
      })}
    </div>
  )
}
