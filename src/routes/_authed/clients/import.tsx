import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { importClients, type ClientDraft } from '@/features/clients/hooks'
import { parseCsv } from '@/lib/csv'

export const Route = createFileRoute('/_authed/clients/import')({
  component: ImportScreen,
})

type Target = 'name' | 'phone' | 'email' | 'notes'
const TARGETS: { key: Target; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes' },
]

/** Guess which CSV column feeds each field from the header text. */
function autoMap(headers: string[]): Record<Target, number> {
  const find = (re: RegExp) => headers.findIndex((h) => re.test(h.toLowerCase()))
  return {
    name: find(/name|client|customer|company/),
    phone: find(/phone|tel|mobile|cell/),
    email: find(/e-?mail/),
    notes: find(/note|comment|detail/),
  }
}

function ImportScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'input' | 'map' | 'done'>('input')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [map, setMap] = useState<Record<Target, number>>({
    name: -1,
    phone: -1,
    email: -1,
    notes: -1,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const headers = rows[0] ?? []
  const dataRows = useMemo(() => rows.slice(1), [rows])

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsText(file)
  }

  function parse() {
    setError(null)
    const parsed = parseCsv(text.trim())
    if (parsed.length < 2) {
      setError('Need a header row plus at least one data row.')
      return
    }
    setRows(parsed)
    setMap(autoMap(parsed[0]))
    setStep('map')
  }

  const validRows = useMemo(() => {
    if (map.name < 0) return []
    return dataRows
      .map<ClientDraft | null>((r) => {
        const name = (r[map.name] ?? '').trim()
        if (!name) return null
        return {
          id: crypto.randomUUID(),
          name,
          phone: map.phone >= 0 ? (r[map.phone] ?? '').trim() : '',
          email: map.email >= 0 ? (r[map.email] ?? '').trim() : '',
          notes: map.notes >= 0 ? (r[map.notes] ?? '').trim() : '',
          stage: 'active',
        }
      })
      .filter((d): d is ClientDraft => d !== null)
  }, [dataRows, map])

  // Rows dropped because the mapped name column is blank — surfaced below the
  // preview so a bad column pick (or dirty data) is visible, not silent.
  const skippedCount = map.name >= 0 ? dataRows.length - validRows.length : 0

  async function runImport() {
    setBusy(true)
    const n = await importClients(validRows)
    setImportedCount(n)
    setBusy(false)
    setStep('done')
  }

  return (
    <div className="px-edge pt-6 pb-24">
      <Link to="/clients" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Clients
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Import clients</h1>

      {step === 'input' && (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted">
            Upload a CSV (or paste it below). The first row should be column headers like
            Name, Phone, Email.
          </p>
          <label className="heading-stencil tap-active cursor-pointer rounded-lg border-2 border-edge bg-panel px-4 py-4 text-center text-sand">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) readFile(f)
              }}
            />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'name,phone,email\nWalt Pierce,(561) 555-0100,walt@example.com'}
            className="rounded-lg border-2 border-edge bg-panel px-4 py-3 font-mono text-sm text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            onClick={parse}
            disabled={!text.trim()}
            className="heading-stencil tap-active rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 'map' && (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted">
            Match your columns. {dataRows.length} row
            {dataRows.length === 1 ? '' : 's'} found.
          </p>
          {TARGETS.map((t) => (
            <div key={t.key}>
              <label className="label-caps text-faded">
                {t.label}
                {t.required && ' *'}
              </label>
              <select
                value={map[t.key]}
                onChange={(e) =>
                  setMap((m) => ({ ...m, [t.key]: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sand focus:border-blaze focus:outline-none"
              >
                <option value={-1}>— none —</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {map.name >= 0 && validRows.length > 0 && (
            <div className="rounded-lg border-2 border-edge bg-panel p-4">
              <p className="label-caps text-faded">Preview</p>
              <ul className="mt-2 flex flex-col gap-1">
                {validRows.slice(0, 3).map((r) => (
                  <li key={r.id} className="truncate text-sm text-sand">
                    {r.name}
                    {r.phone && ` · ${r.phone}`}
                  </li>
                ))}
              </ul>
              {validRows.length > 3 && (
                <p className="mt-1 text-xs text-faded">+{validRows.length - 3} more</p>
              )}
            </div>
          )}

          {skippedCount > 0 && (
            <p className="text-sm text-khaki">
              {skippedCount} row{skippedCount === 1 ? '' : 's'} will be skipped — no value
              in the Name column.
            </p>
          )}

          {map.name < 0 && (
            <p className="text-sm text-alert">Pick the column that holds the name.</p>
          )}

          <button
            onClick={() => void runImport()}
            disabled={busy || validRows.length === 0}
            className="heading-stencil tap-active rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
          >
            {busy
              ? 'Importing…'
              : `Import ${validRows.length} client${validRows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="heading-stencil text-2xl text-go">
            Imported {importedCount} client{importedCount === 1 ? '' : 's'}
          </p>
          <p className="text-sm text-muted">
            They&apos;ll sync as soon as you have a connection.
          </p>
          <button
            onClick={() => void navigate({ to: '/clients' })}
            className="heading-stencil tap-active mt-2 rounded-lg bg-blaze px-6 py-4 text-lg text-on-cta"
          >
            View clients
          </button>
        </div>
      )}
    </div>
  )
}
