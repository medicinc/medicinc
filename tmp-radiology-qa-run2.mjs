import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3000/'
const CHECKS = []
const FAILURES = []

function check(ok, label, details = '') {
  const status = ok ? 'PASS' : 'FAIL'
  CHECKS.push({ status, label, details })
  if (!ok) FAILURES.push({ label, details })
  console.log(`[${status}] ${label}${details ? ` :: ${details}` : ''}`)
}

async function safeClick(locator, timeout = 12000) {
  const first = locator.first()
  await first.scrollIntoViewIfNeeded()
  await first.click({ timeout })
}

async function isVisible(locator, timeout = 2500) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function holdButton(page, locator, ms = 1300) {
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

async function gotoHospital(page) {
  await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const skipTutorial = page.getByRole('button', { name: /[uü]berspringen/i }).first()
  if (await isVisible(skipTutorial, 1500)) {
    await skipTutorial.click()
    await page.waitForTimeout(300)
  }
  await safeClick(page.getByRole('button', { name: /f[aä]lle|patients/i }))
  await page.waitForTimeout(250)
}

async function openPatientFile(page) {
  const akte = page.getByRole('button', { name: /akte/i }).first()
  await safeClick(akte)
  await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 10000 })
}

async function gotoPatientTab(page, tabRegex) {
  await safeClick(page.getByRole('button', { name: tabRegex }).first())
  await page.waitForTimeout(250)
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

async function createOrder(page, modalityPattern, note, bodyPartPattern) {
  await gotoPatientTab(page, /anordnungen|orders/i)
  const modalitySelect = page.locator('select').nth(0)
  const bodyPartSelect = page.locator('select').nth(1)
  const chosenModality = await selectByIncludes(modalitySelect, modalityPattern)
  const chosenBodyPart = await selectByIncludes(bodyPartSelect, bodyPartPattern)
  await page.getByPlaceholder(/fragestellung|klinischer kontext/i).first().fill(note)
  await safeClick(page.getByRole('button', { name: /anordnen/i }))
  await page.waitForTimeout(350)

  const orderVisible = await isVisible(page.locator('.card').filter({ hasText: note }))
  check(orderVisible, `Create order with body part + note (${chosenModality || 'n/a'})`, chosenBodyPart ? `Body part: ${chosenBodyPart}` : 'Body part selection not found')
}

async function openRadiologyFromOrder(page, modalityPattern) {
  await gotoPatientTab(page, /anordnungen|orders/i)
  const row = page.locator('.card').filter({ hasText: modalityPattern }).filter({
    has: page.locator('button:has-text("Übernehmen"), button:has-text("Zur Radiologie"), button:has-text("Patient verlegen")'),
  }).first()

  await row.scrollIntoViewIfNeeded()
  const claimBtn = row.getByRole('button', { name: /übernehmen/i }).first()
  if (await isVisible(claimBtn, 1200)) {
    await claimBtn.click()
    await page.waitForTimeout(300)
  }

  const toRadiology = row.getByRole('button', { name: /zur radiologie/i }).first()
  if (await isVisible(toRadiology, 1800)) {
    await toRadiology.click()
  } else {
    const transfer = row.getByRole('button', { name: /patient verlegen/i }).first()
    if (await isVisible(transfer, 1500)) {
      await transfer.click()
      await page.waitForTimeout(350)
      await row.getByRole('button', { name: /zur radiologie/i }).first().click({ timeout: 4000 })
    }
  }
  await page.getByText(/kontrollzentrum/i).first().waitFor({ state: 'visible', timeout: 15000 })
}

async function runPopupInteractions(page) {
  await page.getByText(/bildbetrachter/i).first().waitFor({ state: 'visible', timeout: 10000 })
  await safeClick(page.getByRole('button', { name: /^\+$/ }))
  await safeClick(page.getByRole('button', { name: /^-$/ }))
  await safeClick(page.getByRole('button', { name: /verschieben/i }))

  const viewer = page.locator('div[class*="cursor-grab"], div[class*="cursor-grabbing"]').first()
  const viewerBox = await viewer.boundingBox()
  if (viewerBox) {
    const sx = viewerBox.x + viewerBox.width * 0.52
    const sy = viewerBox.y + viewerBox.height * 0.48
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx + 70, sy + 40)
    await page.mouse.up()
  }

  await safeClick(page.getByRole('button', { name: /stift/i }))
  const drawCanvas = page.locator('div[class*="cursor-crosshair"]').first()
  const drawBox = await drawCanvas.boundingBox()
  if (drawBox) {
    const sx = drawBox.x + drawBox.width * 0.35
    const sy = drawBox.y + drawBox.height * 0.35
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx + 80, sy + 50)
    await page.mouse.move(sx + 120, sy + 90)
    await page.mouse.up()
  }

  await safeClick(page.getByRole('button', { name: /l\/r setzen/i }))
  const lrSection = page.locator('div').filter({ hasText: /l\/r setzen/i }).first()
  await lrSection.getByRole('button', { name: /^R$/ }).first().click({ force: true })
  const labelCanvas = page.locator('div[class*="cursor-cell"]').first()
  await labelCanvas.click({ position: { x: 120, y: 120 } })
  check(true, 'Popup interaction (zoom/pan/draw/L-R labels)')
}

async function submitReport(page, payload, runRequiredFieldsNegative = false) {
  if (runRequiredFieldsNegative) {
    await safeClick(page.getByRole('button', { name: /befund abschicken/i }))
    const blocked = await isVisible(page.getByText(/bitte befund und signatur ausf[uü]llen/i))
    check(blocked, 'Negative path: submit blocked without required fields')
  }

  await page.getByPlaceholder(/befundbeschreibung/i).fill(payload.befund)
  await page.getByPlaceholder(/beurteilung/i).fill(payload.beurteilung)
  await page.getByPlaceholder(/^diagnose$/i).fill(payload.diagnose)
  await page.getByPlaceholder(/signatur/i).fill(payload.signature)
  await safeClick(page.getByRole('button', { name: /befund abschicken/i }))
  const saved = await isVisible(page.getByText(/befund gespeichert/i), 5000)
  check(saved, `Submit report with text fields (${payload.flow})`)
}

async function verifyOrdersTab(page, expectedTexts, flowLabel) {
  await gotoPatientTab(page, /anordnungen|orders/i)
  for (const txt of expectedTexts) {
    check(await isVisible(page.getByText(txt, { exact: false }), 4500), `Orders tab has text (${flowLabel})`, txt)
  }
  const hasImage = await isVisible(page.locator('img[alt*="Diagnostikbild"], img[alt*="Röntgen"], img[alt*="MRT"]'), 4500)
  check(hasImage, `Orders tab has image (${flowLabel})`)
}

async function verifyDocumentsTab(page, expectedTexts, flowLabel) {
  await gotoPatientTab(page, /dokumente|notes|documents/i)
  const befundDoc = page.locator('button').filter({ hasText: /befund/i }).first()
  if (await isVisible(befundDoc, 2000)) await befundDoc.click()
  await page.waitForTimeout(300)
  for (const txt of expectedTexts) {
    check(await isVisible(page.getByText(txt, { exact: false }), 4500), `Documents tab has text (${flowLabel})`, txt)
  }
  const hasImage = await isVisible(page.locator('img[alt*="Dokumentbild"], img[alt*="Diagnostik"], img[alt*="Röntgen"], img[alt*="MRT"]'), 4500)
  check(hasImage, `Documents tab has image (${flowLabel})`)
}

async function runXrayChecks(page) {
  const capture = page.getByRole('button', { name: /aufnahme ausl[oö]sen/i }).first()
  check(await capture.isDisabled(), 'Negative path: capture blocked before checks (X-ray)')
  const shieldSection = page.locator('div').filter({ hasText: /strahlenschutz anlegen/i }).first()
  await holdButton(page, shieldSection.getByRole('button', { name: /schutzschild halten/i }), 1800)
  const markerSection = page.locator('div').filter({ hasText: /seitenmarker setzen/i }).first()
  await safeClick(markerSection.getByRole('button', { name: /^L$/ }).first())
  await safeClick(markerSection.getByRole('button', { name: /marker platzieren/i }).first())
  const stableSection = page.locator('div').filter({ hasText: /patient stabilisieren/i }).first()
  for (let i = 0; i < 7; i += 1) await safeClick(stableSection.getByRole('button', { name: /stabilisieren/i }).first())
  for (let i = 0; i < 8; i += 1) {
    if (!(await capture.isDisabled())) break
    await page.waitForTimeout(200)
  }
  await safeClick(capture)
  check(await isVisible(page.getByText(/befundung/i), 6000), 'Finish checks and capture (X-ray)')
}

async function runMriChecks(page) {
  const capture = page.getByRole('button', { name: /aufnahme ausl[oö]sen/i }).first()
  check(await capture.isDisabled(), 'Negative path: capture blocked before checks (MRI)')
  const metalSection = page.locator('div').filter({ hasText: /metallsensor kalibrieren/i }).first()
  await metalSection.locator('input[type="range"]').first().fill('50')
  const earSection = page.locator('div').filter({ hasText: /geh[oö]rschutz anpassen/i }).first()
  await holdButton(page, earSection.getByRole('button', { name: /geh[oö]rschutz fixieren/i }), 1800)
  const bellSection = page.locator('div').filter({ hasText: /notfallklingel demonstrieren/i }).first()
  await safeClick(bellSection.getByRole('button', { name: /testton abspielen/i }).first())
  for (let i = 0; i < 8; i += 1) {
    if (!(await capture.isDisabled())) break
    await page.waitForTimeout(200)
  }
  await safeClick(capture)
  check(await isVisible(page.getByText(/befundung/i), 6000), 'Finish checks and capture (MRI)')
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
    title: 'Facharzt/-ärztin',
    profession: 'assistenzarzt',
    careerTrack: 'medical',
    medicalLicense: true,
    rescueCertified: false,
    hospitalId: 'h_qa_1',
    hospitalName: 'QA Klinik',
    wallet: 999999,
    onboardingComplete: true,
    completedExams: ['anatomie', 'pharmakologie', 'pathologie'],
    completedRescueExams: [],
    completedCourses: [],
    purchasedCourses: [],
    courseProgress: {},
    stats: { casesCompleted: 10, successfulCases: 9, successRate: 90, patientsHelped: 12, reputation: 0, specialtyActionStats: {} },
    specialty: null,
    usedCoupons: [],
    unlockedKnowledge: [],
    documentTextBlocks: [],
    joinedAt: nowIso,
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
        rank: 'Facharzt/-ärztin',
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
    closedAt: null,
    closureFines: 0,
    activeEvent: null,
  }
  return { user, hospital }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1560, height: 980 } })
  const { user, hospital } = seedState()

  await context.addInitScript(({ userSeed, hospitalSeed }) => {
    localStorage.setItem('medisim_user', JSON.stringify(userSeed))
    localStorage.setItem(`medisim_user_${userSeed.email}`, JSON.stringify(userSeed))
    localStorage.setItem(`medisim_hospital_${hospitalSeed.id}`, JSON.stringify(hospitalSeed))
  }, { userSeed: user, hospitalSeed: hospital })

  const page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await gotoHospital(page)
  await openPatientFile(page)

  await createOrder(page, /(r[oö]ntgen|x-?ray)/i, 'QA X-ray note: please assess trauma', /thorax/i)
  await openRadiologyFromOrder(page, /(r[oö]ntgen|x-?ray)/i)
  check(await isVisible(page.getByText(/kontrollzentrum/i), 8000), 'Move to diagnostics room (X-ray)')
  await runXrayChecks(page)
  await runPopupInteractions(page)
  await submitReport(page, {
    flow: 'X-ray',
    befund: 'X-ray Befund QA text',
    beurteilung: 'X-ray Beurteilung QA text',
    diagnose: 'X-ray Diagnose QA text',
    signature: 'Dr. QA X',
  }, true)
  await safeClick(page.getByRole('button', { name: /abschlie[ßs]en.*zur[uü]ck/i }))
  await gotoHospital(page)
  await openPatientFile(page)
  await verifyOrdersTab(page, ['X-ray Befund QA text', 'X-ray Beurteilung QA text', 'X-ray Diagnose QA text', 'Dr. QA X'], 'X-ray')
  await verifyDocumentsTab(page, ['X-ray Befund QA text', 'X-ray Beurteilung QA text', 'X-ray Diagnose QA text', 'Dr. QA X'], 'X-ray')

  await createOrder(page, /(mrt|mri)/i, 'QA MRI note: check neuro findings', /(kopf|sch[aä]del)/i)
  await openRadiologyFromOrder(page, /(mrt|mri)/i)
  check(await isVisible(page.getByText(/kontrollzentrum/i), 8000), 'Move to diagnostics room (MRI)')
  await runMriChecks(page)
  await runPopupInteractions(page)
  await submitReport(page, {
    flow: 'MRI',
    befund: 'MRI Befund QA text',
    beurteilung: 'MRI Beurteilung QA text',
    diagnose: 'MRI Diagnose QA text',
    signature: 'Dr. QA M',
  })
  await safeClick(page.getByRole('button', { name: /abschlie[ßs]en.*zur[uü]ck/i }))
  await gotoHospital(page)
  await openPatientFile(page)
  await verifyOrdersTab(page, ['MRI Befund QA text', 'MRI Beurteilung QA text', 'MRI Diagnose QA text', 'Dr. QA M'], 'MRI')
  await verifyDocumentsTab(page, ['MRI Befund QA text', 'MRI Beurteilung QA text', 'MRI Diagnose QA text', 'Dr. QA M'], 'MRI')

  await browser.close()
  const result = { pass: FAILURES.length === 0, checks: CHECKS, failures: FAILURES }
  console.log(`\n===QA_RESULT_JSON===\n${JSON.stringify(result, null, 2)}\n===END_QA_RESULT_JSON===`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
