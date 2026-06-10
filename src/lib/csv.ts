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
