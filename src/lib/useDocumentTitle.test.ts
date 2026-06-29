import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

const DEFAULT = 'LawnBizOps'

afterEach(() => {
  document.title = DEFAULT
})

describe('useDocumentTitle', () => {
  it('sets the document title while mounted', () => {
    document.title = DEFAULT
    renderHook(() => useDocumentTitle('Estimate EST-1 · Apex Lawn'))
    expect(document.title).toBe('Estimate EST-1 · Apex Lawn')
  })

  it('restores the previous title on unmount', () => {
    document.title = DEFAULT
    const { unmount } = renderHook(() => useDocumentTitle('Request a quote · Apex Lawn'))
    expect(document.title).toBe('Request a quote · Apex Lawn')
    unmount()
    expect(document.title).toBe(DEFAULT)
  })

  it('leaves the title untouched while still loading (null/empty)', () => {
    document.title = DEFAULT
    renderHook(() => useDocumentTitle(null))
    expect(document.title).toBe(DEFAULT)
  })

  it('updates the title when the title prop changes', () => {
    // A token page mounts with a loading default, then re-renders once the
    // business name resolves — the tab must track the latest title, not stay
    // pinned to the first one. (Kills the [title] -> [] dependency-array mutant.)
    document.title = DEFAULT
    const { rerender } = renderHook(({ t }: { t: string }) => useDocumentTitle(t), {
      initialProps: { t: 'Estimate EST-1 · Apex Lawn' },
    })
    expect(document.title).toBe('Estimate EST-1 · Apex Lawn')
    rerender({ t: 'Estimate EST-2 · Apex Lawn' })
    expect(document.title).toBe('Estimate EST-2 · Apex Lawn')
  })
})
