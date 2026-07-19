import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Fab } from '@/components/Fab'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { clientsQueryOptions, useClients } from '@/features/clients/hooks'
import { queryClient } from '@/lib/queryClient'

export const Route = createFileRoute('/_authed/clients/')({
  // Warm the list on tab-intent (preload) so it paints instantly on tap.
  // prefetchQuery never throws — offline/no-cache stays graceful (the
  // component's useQuery owns loading/error states).
  loader: () => queryClient.prefetchQuery(clientsQueryOptions),
  component: ClientsScreen,
})

function ClientsScreen() {
  const { data: clients, isLoading, isError, refetch } = useClients()
  const [search, setSearch] = useState('')

  const filtered = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="px-edge pt-6 pb-28">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-stencil text-2xl text-khaki">Clients</h1>
        <span className="flex items-center gap-4">
          <Link to="/clients/import" className="label-caps text-faded">
            Import
          </Link>
          <Link to="/pipeline" className="label-caps text-blaze">
            Pipeline
          </Link>
        </span>
      </div>

      <input
        type="search"
        placeholder="Search clients"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
      />

      <ul className="mt-4 flex flex-col gap-2">
        {filtered.map((client) => (
          // Stretched-link pattern: the card Link covers the whole row via an
          // ::after overlay, while the tel/sms actions sit above it as siblings.
          // This keeps the full card tappable without nesting interactive
          // controls inside another (a11y: nested-interactive).
          <li
            key={client.id}
            className="relative flex items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-4 py-3"
          >
            <Link
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="min-w-0 after:absolute after:inset-0"
            >
              <span className="block truncate text-base font-medium text-sand">
                {client.name}
              </span>
              {client.phone && (
                <span className="block truncate text-sm text-faded tabular-nums">
                  {client.phone}
                </span>
              )}
            </Link>
            {client.phone && (
              <span className="relative flex shrink-0 items-center gap-2">
                <a
                  href={`tel:${client.phone}`}
                  aria-label={`Call ${client.name}`}
                  className="tap-active grid h-touch w-touch place-items-center rounded-lg border border-edge text-base"
                >
                  📞
                </a>
                <a
                  href={`sms:${client.phone}`}
                  aria-label={`Text ${client.name}`}
                  className="tap-active grid h-touch w-touch place-items-center rounded-lg border border-edge text-base"
                >
                  💬
                </a>
              </span>
            )}
          </li>
        ))}
      </ul>

      {isError && (clients?.length ?? 0) === 0 && (
        <QueryError onRetry={() => void refetch()} />
      )}

      {isLoading && filtered.length === 0 && (
        <div className="mt-2">
          <SkeletonList count={6} />
        </div>
      )}

      {!isLoading &&
        !isError &&
        filtered.length === 0 &&
        (search ? (
          <EmptyState
            glyph="🔍"
            title="No matches"
            body={`Nothing matches "${search}".`}
          />
        ) : (
          <EmptyState
            glyph="👤"
            title="No clients yet"
            body="Add your first client to start booking work and sending invoices."
            action={
              <Link
                to="/clients/new"
                className="heading-stencil tap-active inline-block rounded-lg bg-blaze px-5 py-3 text-on-cta"
              >
                + Add client
              </Link>
            }
          />
        ))}

      <Fab to="/clients/new" label="Client" />
    </div>
  )
}
