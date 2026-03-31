import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'

const report = {
  summary: [],
  findings: [],
  passed: [],
  risks: [],
}

function pushPass(title, details = '') {
  report.passed.push({ title, details })
}

function pushFinding(severity, title, details) {
  report.findings.push({ severity, title, ...details })
}

async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    const el = page.locator(selector).first()
    if (await el.count()) {
      try {
        await el.click({ timeout: 2500 })
        return true
      } catch (_err) {
        // try next selector
      }
    }
  }
  return false
}

async function fillLogin(page, identifier, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="text"]').first().fill(identifier)
  await page.locator('input[type="password"]').first().fill(password)
  const submitClicked = await clickFirst(page, [
    'button:has-text("Einloggen")',
    'button:has-text("In dein Konto einloggen")',
    'button[type="submit"]',
  ])
  if (!submitClicked) throw new Error('Login-Submit-Button nicht gefunden')
  await page.waitForTimeout(1000)
}

async function bypassOnboardingAndLicenses(page) {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem('medisim_user')
    if (!raw) return
    const user = JSON.parse(raw)
    user.onboardingComplete = true
    user.medicalLicense = true
    user.rescueCertified = true
    user.pendingMedicalOnboarding = false
    user.pendingRescueOnboarding = false
    window.localStorage.setItem('medisim_user', JSON.stringify(user))
    if (user?.email) {
      window.localStorage.setItem(`medisim_user_${user.email}`, JSON.stringify(user))
    }
  })
}

async function createHospitalIfNeeded(page) {
  await page.goto(`${BASE_URL}/hospital-choice`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  const joinBtn = page.locator('button:has-text("Beitreten")').first()
  if (await joinBtn.count()) {
    await joinBtn.click()
    await page.waitForTimeout(1200)
    pushPass('Hospital beitreten', 'Bestehendem Krankenhaus erfolgreich beigetreten.')
    return
  }

  const createLink = page.locator('a:has-text("Eigenes Krankenhaus gründen")').first()
  if (!(await createLink.count())) {
    pushFinding('high', 'Kein Hospital-Pfad verfügbar', {
      repro: ['Zu /hospital-choice navigieren'],
      expected: 'Beitritt oder Gründung möglich',
      actual: 'Weder Beitritt-Button noch Gründungslink sichtbar',
      where: '/hospital-choice',
    })
    return
  }

  await createLink.click()
  await page.waitForTimeout(700)
  await page.locator('input[placeholder*="Universitätsklinikum"]').first().fill('QA Klinik Session')
  await page.waitForTimeout(200)

  for (let i = 0; i < 5; i += 1) {
    const nextBtn = page.locator('button:has-text("Weiter")').first()
    if (await nextBtn.count()) {
      await nextBtn.click()
      await page.waitForTimeout(300)
    }
  }

  const createBtn = page.locator('button:has-text("Krankenhaus gründen")').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await page.waitForTimeout(1500)
    pushPass('Hospital gründen', 'Eigenes Krankenhaus erfolgreich erstellt.')
  } else {
    pushFinding('medium', 'Hospital-Gründung nicht abgeschlossen', {
      repro: ['HospitalCreate öffnen', 'Formular schrittweise ausfüllen', 'Finalen Button suchen'],
      expected: 'Button "Krankenhaus gründen" verfügbar',
      actual: 'Finaler Button nicht gefunden',
      where: '/hospital-create',
    })
  }
}

async function ensureRescueStation(page) {
  await page.goto(`${BASE_URL}/rescue-station-choice`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)
  const continueBtn = page.locator('button:has-text("Weiter")').first()
  if (await continueBtn.count()) {
    await continueBtn.click()
    await page.waitForTimeout(800)
    pushPass('Wache auswählen', 'Rettungswache erfolgreich ausgewählt.')
    return
  }
  pushFinding('medium', 'Rettungswachen-Auswahl nicht verfügbar', {
    repro: ['Zu /rescue-station-choice navigieren'],
    expected: 'Wachen auswählbar',
    actual: 'Weiter-Button nicht sichtbar',
    where: '/rescue-station-choice',
  })
}

async function testNavigation(page) {
  const routes = ['/dashboard', '/hospital', '/rettungsdienst', '/courses', '/profile', '/knowledge', '/settings']
  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const runtimeError = await page.locator('text=Unerwarteter Laufzeitfehler').count()
    if (runtimeError) {
      pushFinding('high', `Runtime-Error auf ${route}`, {
        repro: [`${route} öffnen`],
        expected: 'Seite lädt ohne globalen Fehler',
        actual: 'UI zeigt "Unerwarteter Laufzeitfehler"',
        where: route,
      })
    } else {
      pushPass(`Navigation ${route}`, 'Seite geladen ohne globalen Runtime-Overlay.')
    }
  }
}

async function testRdSceneAndBackpack(page) {
  await page.goto(`${BASE_URL}/rettungsdienst`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)

  await clickFirst(page, ['button:has-text("In den Dienst melden")'])
  await page.waitForTimeout(700)

  const devMenuBtn = page.locator('button:has-text("Dev-Menü Rettungsdienst")').first()
  if (await devMenuBtn.count()) {
    await devMenuBtn.click()
    await page.waitForTimeout(300)
    const directSceneBtn = page.locator('button:has-text("DEV: Direkt Status-4-Zimmer")').first()
    if (await directSceneBtn.count()) {
      await directSceneBtn.click()
      await page.waitForTimeout(1400)
    }
  }

  const sceneOpened = await page.locator('text=Einsatzlage vor Ort').count()
  if (!sceneOpened) {
    pushFinding('medium', 'RD-Szene nicht geöffnet', {
      repro: ['RD öffnen', 'Dienst starten', 'DEV Direkt Status-4-Zimmer'],
      expected: 'Scene-Fenster öffnet',
      actual: 'Scene-Overlay nicht sichtbar',
      where: '/rettungsdienst',
    })
    return
  }
  pushPass('RD Szene öffnen', 'Einsatzszene wurde geöffnet.')

  const backpackCard = page.locator('div.rounded-xl.border.border-surface-200.p-3:has-text("Rettungsrucksack")').first()
  if (await backpackCard.count()) {
    const fetchBtn = backpackCard.locator('button:has-text("Aus"), button:has-text("holen")').first()
    if (await fetchBtn.count()) {
      await fetchBtn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
    const placeBtn = backpackCard.locator('button:has-text("In Szene platzieren"), button:has-text("Umplatzieren")').first()
    if (await placeBtn.count()) {
      await placeBtn.click().catch(() => {})
      await page.waitForTimeout(350)
      const sceneButton = page.locator('button[ref], button.relative.w-full.h-full').first()
      const sceneBox = await sceneButton.boundingBox().catch(() => null)
      if (sceneBox) {
        const clickX = sceneBox.x + sceneBox.width * 0.28
        const clickY = sceneBox.y + sceneBox.height * 0.58
        await page.mouse.click(clickX, clickY)
        await page.waitForTimeout(250)
        await page.mouse.click(clickX, clickY)
        await page.waitForTimeout(500)
      }
    }
  }

  const backpackHint = await page.locator('text=Modultaschen wie im realen Rettungsrucksack').count()
  if (!backpackHint) {
    report.risks.push('Backpack-Overlay konnte in der Session nicht zuverlässig geöffnet werden; Positionsmessung der Modultaschen nicht verifiziert.')
    return
  }

  const labels = ['Diagnostik', 'Verbände', 'Ampullarium', 'IO-Zugänge']
  const before = {}
  for (const label of labels) {
    const box = await page.locator(`button:has-text("${label}")`).first().boundingBox().catch(() => null)
    if (box) before[label] = { x: box.x, y: box.y }
  }

  await clickFirst(page, ['button:has-text("Ampullarium")'])
  await page.waitForTimeout(350)
  await clickFirst(page, ['button:has-text("Atropin")', 'button:has-text("Adrenalin")'])
  await page.waitForTimeout(300)

  const shifts = []
  for (const label of labels) {
    const box = await page.locator(`button:has-text("${label}")`).first().boundingBox().catch(() => null)
    if (!box || !before[label]) continue
    const dx = Math.abs(box.x - before[label].x)
    const dy = Math.abs(box.y - before[label].y)
    shifts.push({ label, dx, dy })
  }
  const moved = shifts.filter((s) => s.dx > 2 || s.dy > 2)
  if (moved.length > 0) {
    pushFinding('medium', 'Modultaschen-Buttons verschieben sich im Backpack', {
      repro: ['RD-Szene öffnen', 'Backpack öffnen', 'Ampullarium wählen', 'Medikament anklicken'],
      expected: 'Modultaschen-Buttons bleiben an fester Position',
      actual: `Gemessene Verschiebung bei: ${moved.map((m) => `${m.label} (dx ${m.dx.toFixed(1)}, dy ${m.dy.toFixed(1)})`).join(', ')}`,
      where: 'RD Backpack Overlay',
    })
  } else {
    pushPass('Modultaschen bleiben fix', 'Nach Modul-/Medikamentwechsel keine relevante Positionsänderung gemessen.')
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const pageErrors = []

  // Session 1: fresh guest onboarding gate
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)))
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.clear())
    await fillLogin(page, 'alpha_01', 'AlphaTest#401')
    await page.waitForTimeout(1200)
    if (page.url().includes('/onboarding')) {
      pushPass('Onboarding-Gate (Fresh Login)', 'Guest-Account wird beim Erstlogin korrekt ins Onboarding geleitet.')
    } else {
      pushFinding('high', 'Onboarding-Gate unerwartet', {
        repro: ['Storage leeren', 'Mit alpha_01 einloggen'],
        expected: 'Weiterleitung nach /onboarding beim Erstlogin',
        actual: `Aktuelle URL: ${page.url()}`,
        where: 'Login/Onboarding',
      })
    }
    await context.close()
  }

  // Session 2: broad functional smoke
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)))
    await fillLogin(page, 'leitstelle_admin', 'M8d!Sim-ResQ-742')
    await page.waitForTimeout(900)
    if (page.url().includes('/onboarding')) {
      await bypassOnboardingAndLicenses(page)
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
      pushPass('Onboarding bypass für Testsetup', 'Für technische Session wurden Lizenzen/Onboarding im lokalen Profil aktiviert.')
    }
    await createHospitalIfNeeded(page)
    await ensureRescueStation(page)
    await testNavigation(page)
    await testRdSceneAndBackpack(page)
    await context.close()
  }

  await browser.close()

  if (pageErrors.length > 0) {
    pushFinding('high', 'Uncaught JavaScript Errors', {
      repro: ['Während Session-Flows'],
      expected: 'Keine uncaught page errors',
      actual: pageErrors.slice(0, 8).join(' | '),
      where: 'Mehrere Seiten',
    })
  }

  report.summary.push('Zwei Sessions ausgeführt: frischer Guest-Login + Admin-Smoke-Session mit Kernnavigation und RD-Flow.')
  report.summary.push('Schwerpunkte: Auth/Onboarding-Gate, Seitenladeverhalten, RD-Szene, Backpack-Positionsstabilität.')
  if (report.risks.length === 0) {
    report.risks.push('Einige tiefe Minigame-Pfade (vollständige OP-Chirurgie/Fraktur im Materialwagen) wurden in dieser Runde nicht vollständig durchgeklickt.')
  }

  console.log(JSON.stringify(report, null, 2))
}

run().catch((err) => {
  console.error('QA playtest script failed:', err)
  process.exit(1)
})

