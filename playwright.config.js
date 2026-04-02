// @ts-check
import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-Tests – Dev-Server wird automatisch gestartet.
 * Standard: Supabase wird für den Test-Server ausgeschaltet → Demo-Login / localStorage-Session.
 * Mit echter Supabase testen: PLAYWRIGHT_USE_LOCAL_SUPABASE=1 setzen (dann keine Fixture-Session).
 * Ausführen: npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ...(process.env.PLAYWRIGHT_USE_LOCAL_SUPABASE === '1'
        ? {}
        : {
            VITE_SUPABASE_URL: '',
            VITE_SUPABASE_ANON_KEY: '',
          }),
    },
  },
})
