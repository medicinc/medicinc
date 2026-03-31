import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3000/'

async function isVisible(locator, timeout = 2500) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function safeClick(locator, timeout = 12000) {
  const first = locator.first()
  await first.scrollIntoViewIfNeeded()
  await first.click({ timeout })
}

async function selectByIncludes(selectLocator, includesRegex) {
  const optionLocator = selectLocator.locator('option')
  const count = await optionLocator.count()
  for (let i = 0; i < count; i += 1) {
    const text = (await optionLocator.nth(i).innerText()).trim()
    if (includesRegex.test(text)) {
      const value = await optionLocator.nth(i).getAttribute('value')
      if (value !== null) {
        await selectLocator.selectOption(value)
        return text
      }
    }
  }
  return null
}

async function holdButton(page, locator, ms = 1400) {
  const target = locator.first()
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
  return true
}

function seedState() {
  const nowIso = new Date().toISOString()
  const user = {
    id: 'qa_user_1',
    name: 'QA Radiology',
    email: 'qa@medisim.local',
    level: 12,
    xp: 6000,
    xpToNext: 6500,
    rank: 'facharzt',
    title: 'Facharzt/-aerztin',
    profession: 'assistenzarzt',
    careerTrack: 'medical',
    medicalLicense: true,
    rescueCertified: false,
    hospitalId: 'h_qa_1',
    hospitalName: 'QA Klinik',
    wallet: 999999,
    onboardingComplete: true,
    joinedAt: nowIso,
    stats: { casesCompleted: 10, successfulCases: 9, successRate: 90, patientsHelped: 12, reputation: 0, specialtyActionStats: {} },
  }

  const hospital = {
    id: 'h_qa_1',
    name: 'QA Klinik',
    ownerId: 'qa_user_1',
    balance: 999999,
    rooms: [
      { id: 'er', level: 1, condition: 100, patients: [] },
      { id: 'waiting_room', level: 1, condition: 100, patients: [] },
      { id: 'radiology', level: 1, condition: 100, patients: [] },
    ],
    treatmentRooms: [
      { id: 'tr_er_1', name: 'ER 1', station: 'er', patientId: 'p_qa_1', equipment: [], equipmentState: {} },
    ],
    stationEquipment: { radiology: ['xray_mobile', 'mri_scanner'] },
    members: [
      {
        userId: 'qa_user_1',
        name: 'QA Radiology',
        role: 'owner',
        rank: 'Facharzt/-aerztin',
        permissions: {
          manage_hospital: true,
          manage_rooms: true,
          manage_staff: true,
          manage_members: true,
          manage_permissions: true,
          manage_finances: true,
          treat_patients: true,
        },
        joinedAt: nowIso,
      },
    ],
    workers: [],
    patients: [
      {
        id: 'p_qa_1',
        name: 'Testpatient Radiologie',
        age: 44,
        gender: 'm',
        chiefComplaint: 'Thoraxschmerz',
        triageLevel: 'yellow',
        status: 'in_treatment',
        assignedRoom: 'tr_er_1',
        diagnosticStation: null,
        diagnosticEquipment: null,
        previousTreatmentRoomId: null,
        careTeam: { primary: 'qa_user_1', assistant: [], supervisor: null },
        orders: [],
        documents: [],
        notes: [],
        logs: [],
        examResults: [],
        medications: [],
        vitals: { hr: 96, bp: '146/88', spo2: 97, rr: 20 },
        arrivalTime: nowIso,
        createdAt: nowIso,
      },
    ],
    waitingRoom: [],
    settings: { id: 'h_qa_1', name: 'QA Klinik' },
    activityLog: [],
    dailyCosts: 0,
    dailyIncome: 0,
    isClosed: false,
  }

  return { user, hospital }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1560, height: 980 } })

const pageErrors = []
const consoleErrors = []
const requestFailures = []

context.on('page', (p) => {
  p.on('pageerror', (err) => pageErrors.push(String(err)))
  p.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  p.on('requestfailed', (req) => {
    requestFailures.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`)
  })
})

const { user, hospital } = seedState()
await context.addInitScript(({ userSeed, hospitalSeed }) => {
  try {
    if (!window.location || !window.location.href.startsWith('http')) return
    localStorage.setItem('medisim_user', JSON.stringify(userSeed))
    localStorage.setItem(`medisim_user_${userSeed.email}`, JSON.stringify(userSeed))
    localStorage.setItem(`medisim_hospital_${hospitalSeed.id}`, JSON.stringify(hospitalSeed))
  } catch {
    // Ignore non-http documents like about:blank.
  }
}, { userSeed: user, hospitalSeed: hospital })

const page = await context.newPage()

let uiMessage = null
let overlayVisible = false
let overlayText = ''

try {
  await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  const skipTutorial = page.getByRole('button', { name: /überspringen|ueberspringen/i }).first()
  if (await isVisible(skipTutorial, 1500)) {
    await skipTutorial.click()
    await page.waitForTimeout(250)
  }

  await safeClick(page.getByRole('button', { name: /f[aä]lle|patients/i }))
  await page.waitForTimeout(250)
  await safeClick(page.getByRole('button', { name: /akte/i }).first())
  await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 10000 })

  await safeClick(page.getByRole('button', { name: /anordnungen|orders/i }).first())
  const modalitySelect = page.locator('select').nth(0)
  const bodyPartSelect = page.locator('select').nth(1)
  await selectByIncludes(modalitySelect, /(r[oö]ntgen|x-?ray)/i)
  await selectByIncludes(bodyPartSelect, /thorax/i)
  await page.getByPlaceholder(/fragestellung|klinischer kontext/i).first().fill('Single-run QA X-ray submit check')
  await safeClick(page.getByRole('button', { name: /anordnen/i }))
  await page.waitForTimeout(400)

  const row = page.locator('.card').filter({
    has: page.locator('button:has-text("Übernehmen"), button:has-text("Zur Radiologie"), button:has-text("Patient verlegen"), button:has-text("Zur Diagnostik")'),
  }).first()
  const claimBtn = row.getByRole('button', { name: /uebernehmen|übernehmen/i }).first()
  if (await isVisible(claimBtn, 1000)) {
    await claimBtn.click()
    await page.waitForTimeout(250)
  }
  const toRadiology = row.getByRole('button', { name: /zur radiologie|zur diagnostik/i }).first()
  if (await isVisible(toRadiology, 1200)) {
    await toRadiology.click()
  } else {
    const transfer = row.getByRole('button', { name: /patient verlegen|in diagnostik/i }).first()
    if (await isVisible(transfer, 1200)) {
      await transfer.click()
      await page.waitForTimeout(250)
      await row.getByRole('button', { name: /zur radiologie|zur diagnostik/i }).first().click()
    } else {
      const candidateButtons = await page.locator('button').allTextContents()
      throw new Error(`Could not find transfer button. Visible buttons: ${candidateButtons.join(' | ')}`)
    }
  }

  await page.getByText(/kontrollzentrum/i).first().waitFor({ state: 'visible', timeout: 15000 })
  const capture = page.getByRole('button', { name: /aufnahme ausl[oö]sen/i }).first()

  const shieldSection = page.locator('div').filter({ hasText: /strahlenschutz anlegen/i }).first()
  await holdButton(page, shieldSection.getByRole('button', { name: /schutzschild halten/i }).first(), 1800)
  const markerSection = page.locator('div').filter({ hasText: /seitenmarker setzen/i }).first()
  await safeClick(markerSection.getByRole('button', { name: /^L$/ }).first())
  await safeClick(markerSection.getByRole('button', { name: /marker platzieren/i }).first())
  const stableSection = page.locator('div').filter({ hasText: /patient stabilisieren/i }).first()
  for (let i = 0; i < 7; i += 1) {
    await safeClick(stableSection.getByRole('button', { name: /stabilisieren/i }).first())
  }

  for (let i = 0; i < 10; i += 1) {
    if (!(await capture.isDisabled())) break
    await page.waitForTimeout(200)
  }
  await safeClick(capture)
  await page.getByText(/befundung/i).first().waitFor({ state: 'visible', timeout: 8000 })

  await page.getByPlaceholder(/befundbeschreibung/i).fill('QA mandatory field befund')
  await page.getByPlaceholder(/signatur/i).fill('Dr. QA')
  await safeClick(page.getByRole('button', { name: /befund abschicken/i }))

  const uiMessageBox = page.locator('div.mb-3.rounded-lg.px-3.py-2.text-xs.border').first()
  await uiMessageBox.waitFor({ state: 'visible', timeout: 7000 })
  uiMessage = (await uiMessageBox.innerText()).trim()

  const viteOverlay = page.locator('vite-error-overlay').first()
  overlayVisible = await isVisible(viteOverlay, 500)
  if (overlayVisible) {
    overlayText = (await viteOverlay.innerText()).trim()
  } else {
    const fallbackOverlay = page.locator('div').filter({ hasText: /Internal Server Error|Failed to fetch dynamically imported module/i }).first()
    overlayVisible = await isVisible(fallbackOverlay, 500)
    if (overlayVisible) {
      overlayText = (await fallbackOverlay.innerText()).trim()
    }
  }
} finally {
  await browser.close()
}

const result = {
  ui_message_exact: uiMessage,
  overlay_visible: overlayVisible,
  overlay_text_exact: overlayText,
  console_error_messages: consoleErrors,
  page_errors: pageErrors,
  network_request_failures: requestFailures,
}

console.log('===ONE_XRAY_SUBMIT_RESULT===')
console.log(JSON.stringify(result, null, 2))
console.log('===END_ONE_XRAY_SUBMIT_RESULT===')
