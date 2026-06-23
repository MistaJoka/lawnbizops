// The invoice share helper is format-agnostic (blob + filename → share sheet /
// download), so reports reuse it under a neutral name rather than duplicating it.
export { shareInvoicePdf as sharePdf } from '@/features/invoices/share'

/** "PnL-2026-01-01-2026-06-22.pdf" — safe filename from the report range. */
export function reportFilename(start: string, end: string): string {
  return `PnL-${start}-${end}.pdf`
}
