import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Fab } from '@/components/Fab'
import { useClients } from '@/features/clients/hooks'

export const Route = createFileRoute('/_authed/clients/')({
  component: ClientsScreen,
})

function ClientsScreen() {
  const navigate = useNavigate()
  const { data: clients, isLoading } = useClients()
  const [search, setSearch] = useState('')

  const filtered = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="heading-stencil text-2xl text-khaki">Clients</h1>
        <Link to="/pipeline" className="label-caps text-blaze">
          Pipeline
        </Link>
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
          <li key={client.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                void navigate({
                  to: '/clients/$clientId',
                  params: { clientId: client.id },
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void navigate({
                    to: '/clients/$clientId',
                    params: { clientId: client.id },
                  })
                }
              }}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4"
            >
              <span className="min-w-0 truncate text-lg text-sand">{client.name}</span>
              {client.phone && (
                <span className="flex shrink-0 items-center gap-2 pl-3">
                  <a
                    href={`tel:${client.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Call ${client.name}`}
                    className="rounded-lg border border-edge px-3 py-2 text-lg"
                  >
                    📞
                  </a>
                  <a
                    href={`sms:${client.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Text ${client.name}`}
                    className="rounded-lg border border-edge px-3 py-2 text-lg"
                  >
                    💬
                  </a>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!isLoading && filtered.length === 0 && (
        <p className="mt-16 text-center text-faded">
          {search
            ? 'No clients match that search.'
            : 'No clients yet. Add your first one.'}
        </p>
      )}

      <Fab to="/clients/new" label="Client" />
    </div>
  )
}
