import { useEffect } from 'react'

/**
 * Set `document.title` while a screen is mounted, restoring the previous title
 * on unmount. Used on the public, customer-facing token pages so a prospect's
 * browser tab / bookmark / shared link carries the *business's* name — not
 * "LawnBizOps", the operator's tool, which they should never see (same reason
 * the operator DevStripe is hidden there). A null/empty title is ignored so a
 * still-loading page keeps the default rather than flashing a blank tab.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
