/**
 * Share a generated PDF via the Web Share API (Android share sheet), falling
 * back to a plain download link on browsers without file sharing. Generic
 * twin of features/invoices/share.ts (left untouched on purpose).
 *
 * Returns true when the PDF was handed off (shared or downloaded), false when
 * the user dismissed the share sheet — callers use this to decide whether to
 * flip a draft estimate to 'sent'.
 */
export async function sharePdf(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      throw e
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}

/** "Estimate-EST-3-Walt-Pierce.pdf" — collapse whitespace/oddballs to dashes. */
export function estimateFilename(number: string, clientName: string): string {
  const base = `Estimate-${number}-${clientName}`
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base}.pdf`
}
