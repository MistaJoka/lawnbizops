import { test, expect, type Page } from '@playwright/test'

// Bottom sheets are the app's only overlay primitive (src/components/Sheet.tsx)
// and they carry money actions — nudging an overdue invoice, quick-adding a job.
//
// Two bugs shipped inside it and neither was visible to any existing guard:
//  1. The sheet sat at z-50, the SAME layer as the fixed TabBar, and lost the
//     tie on DOM order — so the TabBar painted OVER the modal. On /money the
//     nudge list's second row ("90+ overdue", the worst debt) rendered at
//     y 807–826 under a TabBar starting at 770: invisible and unclickable,
//     while the trigger still promised "Nudge overdue (2)".
//  2. The panel had no max height and no overflow — content taller than the
//     space below the backdrop simply ran off the bottom of the screen with
//     nothing to scroll.
//
// A render/a11y smoke can't see either: the nodes exist, are in the a11y tree,
// and have correct contrast. Occlusion is the thing to assert, so these tests
// assert what a thumb can actually reach — hit-testing, not presence.

/** Is this element the thing a tap at its own centre would actually hit? */
async function isReachable(page: Page, selector: string, nth: number) {
  return page.evaluate(
    ({ selector, nth }) => {
      const el = document.querySelectorAll(selector)[nth]
      if (!el) return { ok: false, why: 'no such element' }
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      if (y < 0 || y > window.innerHeight) {
        return { ok: false, why: `centre y=${Math.round(y)} outside viewport` }
      }
      const hit = document.elementFromPoint(x, y)
      if (!hit) return { ok: false, why: 'nothing at centre point' }
      if (el.contains(hit) || hit.contains(el)) return { ok: true, why: '' }
      return {
        ok: false,
        why: `occluded by <${hit.tagName.toLowerCase()} class="${hit.className}">`,
      }
    },
    { selector, nth },
  )
}

test.describe('bottom sheet', () => {
  // Same two neutralizers the a11y scan uses, and for the same reasons:
  // (1) the panel's 200ms slide-up means a naive measurement catches it
  // mid-flight, still translated off the bottom — a false positive that says
  // nothing about the settled layout; (2) the dev-only DevPanel floats over
  // the bottom-right and would itself win the hit test, which would be a
  // finding about a thing that never ships.
  // addInitScript (not addStyleTag) so it survives the navigation.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        style.textContent =
          '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}' +
          '[data-dev-panel]{display:none!important}'
        document.head.append(style)
      })
    })
  })

  test('every nudge row stays reachable above the tab bar', async ({ page }) => {
    await page.goto('/money')

    const trigger = page.getByRole('button', { name: /nudge overdue/i })
    await expect(trigger).toBeVisible()
    // The trigger's own count is the contract: if it says 2, 2 must be usable.
    const promised = Number((await trigger.innerText()).match(/\((\d+)\)/)?.[1])
    expect(promised).toBeGreaterThan(1)

    await trigger.click()
    const nudges = page.getByRole('dialog').getByRole('link', { name: /nudge/i })
    await expect(nudges).toHaveCount(promised)

    for (let i = 0; i < promised; i++) {
      const reach = await isReachable(page, '[role="dialog"] a', i)
      expect(reach.ok, `nudge row ${i + 1} of ${promised}: ${reach.why}`).toBe(true)
    }
  })

  test('panel scrolls instead of running off screen when content is tall', async ({
    page,
  }) => {
    await page.goto('/money')
    await page.getByRole('button', { name: /nudge overdue/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Force far more rows than fit, the way a real overdue book would.
    const box = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]')!
        .lastElementChild as HTMLElement
      const list = panel.querySelector('ul')!
      for (let i = 0; i < 40; i++) list.append(list.children[0]!.cloneNode(true))
      const r = panel.getBoundingClientRect()
      return {
        bottom: Math.round(r.bottom),
        scrollH: panel.scrollHeight,
        clientH: panel.clientHeight,
        winH: window.innerHeight,
      }
    })

    // Overflowing content must be scrollable...
    expect(
      box.scrollH,
      'panel content exceeds its box but the box does not scroll',
    ).toBeGreaterThan(box.clientH)
    // ...and the panel itself must never extend past the viewport.
    expect(box.bottom, 'panel bottom runs off screen').toBeLessThanOrEqual(box.winH + 1)
  })
})
