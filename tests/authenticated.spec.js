// @ts-check
import { test, expect } from '@playwright/test'
import { assertMainVisible, assertNoHorizontalOverflow } from './helpers/assertLayout.js'
import {
  buildE2eUser,
  buildHospitalState,
  buildOwnedHospitalMeta,
  E2E_HOSPITAL_ID,
  E2E_USER_ID,
} from './fixtures/e2eSession.js'

/** @type {{ name: string; width: number; height: number }[]} */
const VIEWPORTS = [
  { name: 'mobile-s', width: 375, height: 667 },
  { name: 'mobile-m', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
]

const AUTH_PATHS = [
  '/dashboard',
  '/hospital',
  '/rettungsdienst',
  '/courses',
  '/leaderboard',
  '/shop',
  '/profile',
  '/settings',
  '/knowledge',
]

const useLocalSupabase = process.env.PLAYWRIGHT_USE_LOCAL_SUPABASE === '1'

test.describe('Eingeloggte Flows (Demo-Session)', () => {
  test.skip(useLocalSupabase, 'Setze PLAYWRIGHT_USE_LOCAL_SUPABASE nicht, um Demo-Fixture zu nutzen.')

  const owned = buildOwnedHospitalMeta(E2E_USER_ID)
  const user = buildE2eUser(E2E_USER_ID)
  const hospital = buildHospitalState(E2E_USER_ID, owned)

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ u, h, hid }) => {
        try {
          if (sessionStorage.getItem('medisim_e2e_skip_seed') === '1') return
        } catch (_e) {
          /* ignore */
        }
        localStorage.setItem('medisim_user', JSON.stringify(u))
        localStorage.setItem(`medisim_user_${u.email}`, JSON.stringify(u))
        localStorage.setItem(`medisim_hospital_${hid}`, JSON.stringify(h))
      },
      { u: user, h: hospital, hid: E2E_HOSPITAL_ID },
    )
  })

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      for (const path of AUTH_PATHS) {
        test(`Layout & Overflow: ${path}`, async ({ page }) => {
          const pageErrors = []
          page.on('pageerror', (e) => pageErrors.push(e.message))

          await page.goto(path, { waitUntil: 'domcontentloaded' })
          await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})
          await assertMainVisible(page)
          // Etwas großzügiger als öffentliche Seiten: Navbar + Pager, ggf. Rundungen/Scrollbars.
          await assertNoHorizontalOverflow(page, 56)

          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          await page.evaluate(() => new Promise((r) => setTimeout(r, 400)))
          await assertNoHorizontalOverflow(page, 56)
          await page.evaluate(() => window.scrollTo(0, 0))

          expect(pageErrors, `Keine ungefangenen JS-Fehler auf ${path}`).toEqual([])
        })
      }
    })
  }

  test('Mobile: Nav-Menü öffnet Hauptlinks (unter lg)', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})

    const menuBtn = page.locator('nav button.lg\\:hidden')
    await expect(menuBtn).toBeVisible()
    await menuBtn.click()
    const mobileNav = page.locator('div.lg\\:hidden.border-t.border-surface-200')
    await expect(mobileNav.getByRole('link', { name: 'Übersicht' })).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: 'Krankenhaus', exact: true })).toBeVisible()
    await mobileNav.getByRole('link', { name: 'Krankenhaus', exact: true }).click()
    await page.waitForURL('**/hospital', { timeout: 30_000 })
    await assertMainVisible(page)
    await assertNoHorizontalOverflow(page, 56)
  })

  test('Logout: zurück zur Landing, kein Zugriff auf Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})
    await expect(page).toHaveURL(/\/dashboard/)

    await page.locator('nav .relative > button').first().click()
    await page.getByRole('button', { name: /Abmelden/i }).click()
    await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible({ timeout: 20_000 })

    await page.evaluate(() => sessionStorage.setItem('medisim_e2e_skip_seed', '1'))
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
  })
})
