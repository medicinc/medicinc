// @ts-check
import { expect } from '@playwright/test'

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} [tolerance]
 */
export async function assertNoHorizontalOverflow(page, tolerance = 8) {
  const { scrollWidth, clientWidth, bodyScrollWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body?.scrollWidth ?? 0,
  }))
  const maxScroll = Math.max(scrollWidth, bodyScrollWidth)
  expect(
    maxScroll,
    `Horizontaler Overflow: scrollWidth ${maxScroll} > clientWidth ${clientWidth} (+${tolerance})`,
  ).toBeLessThanOrEqual(clientWidth + tolerance)
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function assertMainVisible(page) {
  const main = page.locator('main')
  await expect(main).toBeVisible({ timeout: 20_000 })
  const box = await main.boundingBox()
  expect(box, 'main sollte ein Layout-Box haben').toBeTruthy()
  expect(box.width, 'main Breite sollte > 0 sein').toBeGreaterThan(50)
}
