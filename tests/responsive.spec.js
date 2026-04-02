// @ts-check
import { test, expect } from '@playwright/test'
import { assertMainVisible, assertNoHorizontalOverflow } from './helpers/assertLayout.js'

/** @type {{ name: string; width: number; height: number }[]} */
const VIEWPORTS = [
  { name: 'mobile-s', width: 375, height: 667 },
  { name: 'mobile-m', width: 390, height: 844 },
  { name: 'mobile-l', width: 428, height: 926 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'desktop-wide', width: 2560, height: 1440 },
]

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register-gate',
  '/impressum',
  '/datenschutz',
  '/nutzungsbedingungen',
  '/ai-hinweise',
  '/jugendschutz',
  '/community-regeln',
  '/widerruf-digital',
]

const FOOTER_PATH = '/datenschutz'

test.describe('Responsive Layout (öffentliche Seiten)', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      for (const path of PUBLIC_PATHS) {
        test(`kein horizontaler Overflow: ${path}`, async ({ page }) => {
          const pageErrors = []
          page.on('pageerror', (e) => pageErrors.push(e.message))

          await page.goto(path, { waitUntil: 'domcontentloaded' })
          await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
          await assertMainVisible(page)
          await assertNoHorizontalOverflow(page)

          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          await page.evaluate(() => new Promise((r) => setTimeout(r, 200)))
          await assertNoHorizontalOverflow(page)

          await page.evaluate(() => window.scrollTo(0, 0))

          expect(pageErrors, `Keine ungefangenen JS-Fehler auf ${path}`).toEqual([])
        })
      }

      test(`Footer-Links erreichbar: ${FOOTER_PATH}`, async ({ page }) => {
        await page.goto(FOOTER_PATH, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
        const footer = page.locator('footer')
        await expect(footer).toBeVisible()
        await footer.scrollIntoViewIfNeeded()
        await assertNoHorizontalOverflow(page)
        await expect(footer.getByRole('link', { name: 'Impressum' })).toBeVisible()
      })

      test(`404-Seite: /dieser-pfad-existiert-nicht-${vp.name}`, async ({ page }) => {
        await page.goto(`/dieser-pfad-existiert-nicht-${vp.name}`, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
        await expect(page.getByRole('heading', { name: /Seite nicht gefunden/i })).toBeVisible()
        await assertNoHorizontalOverflow(page)
      })
    })
  }
})

test.describe('Viewport-Wechsel (Hydration / Layout)', () => {
  test('Landing: schmal → breit ohne persistenten Overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
    await assertNoHorizontalOverflow(page)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)))
    await assertNoHorizontalOverflow(page)
    await assertMainVisible(page)
  })
})
