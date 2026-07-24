import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { toCsv } from '@/lib/csv'
import { localToday } from '@/lib/format'

export const Route = createFileRoute('/_authed/settings/export')({
  component: ExportScreen,
})

type Rows = Record<string, unknown>[]

async function selectAll(
  table: 'clients' | 'properties' | 'services' | 'jobs' | 'payments' | 'estimates',
): Promise<Rows> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(error.message)
  return data as Rows
}

/** invoice_balances view rows, with the client's name stitched in. */
async function fetchInvoices(): Promise<Rows> {
  const { data: rows, error } = await supabase.from('invoice_balances').select('*')
  if (error) throw new Error(error.message)
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
  if (clientsError) throw new Error(clientsError.message)
  const nameById = new Map(clients.map((c) => [c.id, c.name]))
  return (rows as Rows).map((row) => ({
    ...row,
    client_name: nameById.get(row.client_id as string) ?? '',
  }))
}

const DATASETS: { slug: string; label: string; fetch: () => Promise<Rows> }[] = [
  { slug: 'clients', label: 'Clients', fetch: () => selectAll('clients') },
  { slug: 'properties', label: 'Properties', fetch: () => selectAll('properties') },
  { slug: 'services', label: 'Services', fetch: () => selectAll('services') },
  { slug: 'jobs', label: 'Jobs', fetch: () => selectAll('jobs') },
  { slug: 'invoices', label: 'Invoices', fetch: fetchInvoices },
  { slug: 'payments', label: 'Payments', fetch: () => selectAll('payments') },
  { slug: 'estimates', label: 'Estimates', fetch: () => selectAll('estimates') },
]

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

function ExportScreen() {
  const online = useOnline()
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleExport(dataset: (typeof DATASETS)[number]) {
    setBusySlug(dataset.slug)
    setStatus(null)
    try {
      const rows = await dataset.fetch()
      if (rows.length === 0) {
        setStatus({ text: `No ${dataset.label.toLowerCase()} to export yet.`, ok: true })
        return
      }
      downloadCsv(toCsv(rows), `${dataset.slug}-${localToday()}.csv`)
      setStatus({ text: `${dataset.label} exported (${rows.length} rows).`, ok: true })
    } catch {
      setStatus({ text: 'Export failed — check connection.', ok: false })
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Settings
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Export data</h1>
      <p className="mt-2 text-faded">
        Download your records as CSV files — open them in Sheets or Excel.
      </p>

      {!online && (
        <p className="mt-4 text-sm text-alert">
          Exports need a connection — try again when you have signal.
        </p>
      )}
      {status && (
        <p className={`mt-4 text-sm ${status.ok ? 'text-go' : 'text-alert'}`}>
          {status.text}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 pb-8">
        {DATASETS.map((dataset) => (
          <button
            key={dataset.slug}
            type="button"
            disabled={!online || busySlug !== null}
            onClick={() => void handleExport(dataset)}
            className="flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4 disabled:opacity-50"
          >
            <span className="text-lg text-sand">{dataset.label}</span>
            <span className="heading-stencil text-xs text-faded">
              {busySlug === dataset.slug ? 'Exporting…' : 'CSV ↓'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
