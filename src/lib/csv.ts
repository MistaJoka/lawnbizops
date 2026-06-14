/**
 * Tiny CSV builder for the Export data screen. RFC 4180 quoting: any field
 * containing a comma, double quote, or line break is wrapped in quotes, and
 * embedded quotes are doubled. Rows join with CRLF so Excel/Sheets open the
 * file cleanly.
 */

/** Render one value as a CSV field, quoting/escaping when needed. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Build a CSV document from uniform objects. The header row comes from the
 * keys of the first row; later rows are read by those same keys.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

/**
 * Parse a CSV document into rows of string cells (RFC 4180): handles quoted
 * fields, commas and newlines inside quotes, and doubled quotes. Accepts LF or
 * CRLF line endings. Trailing blank lines are dropped. Returns [] for empty
 * input.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += c
        i++
      }
    } else if (c === '"') {
      inQuotes = true
      i++
    } else if (c === ',') {
      pushField()
      i++
    } else if (c === '\n') {
      pushRow()
      i++
    } else if (c === '\r') {
      // swallow CR (handle CRLF and bare CR)
      pushRow()
      i += text[i + 1] === '\n' ? 2 : 1
    } else {
      field += c
      i++
    }
  }
  // last field/row if the file didn't end with a newline
  if (field !== '' || row.length > 0) pushRow()

  // drop fully-empty trailing rows
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}
