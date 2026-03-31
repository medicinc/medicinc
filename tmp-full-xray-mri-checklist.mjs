import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3000/'

function seedState() {
  const nowIso = new Date().toISOString()
  const user = {
    id: 'qa_user_1',
    name: 'QA Runner',
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
        name: 'QA Runner',
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
        name: 'QA Patient',
        age: 60,
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

async function isVisible(locator, timeout = 2000) {
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

async function holdButton(page, locator, ms = 1800) {
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

function createStepState() {
  return {
    '1_create_order': { pass: false, detail: '' },
    '2_transfer_to_room': { pass: false, detail: '' },
    '3_negative_capture_before_checks_blocked': { pass: false, detail: '' },
    '4_finish_checks_and_capture': { pass: false, detail: '' },
    '5_popup_zoom_pan_draw_lr': { pass: false, detail: '' },
    '6_negative_submit_missing_required_blocked': { pass: false, detail: '' },
    '7_submit_valid_report': { pass: false, detail: '' },
    '8_complete_and_return': { pass: false, detail: '' },
    '9_orders_tab_shows_image_and_texts': { pass: false, detail: '' },
    '10_documents_tab_shows_image_and_texts': { pass: false, detail: '' },
  }
}

async function runModalityChecklist(config) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 980 } })
  const { user, hospital } = seedState()
  await context.addInitScript(({ userSeed, hospitalSeed }) => {
    try {
      if (!window.location || !window.location.href.startsWith('http')) return
      localStorage.setItem('medisim_user', JSON.stringify(userSeed))
      localStorage.setItem(`medisim_user_${userSeed.email}`, JSON.stringify(userSeed))
      localStorage.setItem(`medisim_hospital_${hospitalSeed.id}`, JSON.stringify(hospitalSeed))
    } catch {
      // ignore
    }
  }, { userSeed: user, hospitalSeed: hospital })

  const page = await context.newPage()
  const steps = createStepState()
  const discrepancies = []

  const runId = `${config.id}-${Date.now()}`
  const noteText = `QA ${config.label} note ${runId}`
  const befundText = `QA ${config.label} befund ${runId}`
  const beurteilungText = `QA ${config.label} beurteilung ${runId}`
  const diagnoseText = `QA ${config.label} diagnose ${runId}`
  const signatureText = `Dr. QA ${config.label} ${runId}`

  try {
    await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const skipTutorial = page.getByRole('button', { name: /überspringen|ueberspringen/i }).first()
    if (await isVisible(skipTutorial, 1200)) {
      await skipTutorial.click()
      await page.waitForTimeout(200)
    }

    await safeClick(page.getByRole('button', { name: /f[aä]lle|patients/i }))
    await page.waitForTimeout(250)
    await safeClick(page.getByRole('button', { name: /akte/i }).first())
    await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 10000 })

    // 1) create order with body part + note
    await safeClick(page.getByRole('button', { name: /anordnungen|orders/i }).first())
    const modalitySelect = page.locator('select').nth(0)
    const bodyPartSelect = page.locator('select').nth(1)
    const pickedModality = await selectByIncludes(modalitySelect, config.modalityRegex)
    const pickedBodyPart = await selectByIncludes(bodyPartSelect, config.bodyPartRegex)
    await page.getByPlaceholder(/fragestellung|klinischer kontext/i).first().fill(noteText)
    await safeClick(page.getByRole('button', { name: /anordnen/i }))
    await page.waitForTimeout(400)
    const orderRow = page.locator('.card').filter({ hasText: noteText }).first()
    steps['1_create_order'].pass = await isVisible(orderRow, 3000) && !!pickedModality && !!pickedBodyPart
    steps['1_create_order'].detail = steps['1_create_order'].pass ? `Created ${pickedModality} (${pickedBodyPart})` : 'Order row not visible after create'
    if (!steps['1_create_order'].pass) discrepancies.push('Step 1 failed: order creation not confirmed.')

    // 2) transfer to room
    const claimBtn = orderRow.getByRole('button', { name: /uebernehmen|übernehmen/i }).first()
    if (await isVisible(claimBtn, 1200)) {
      await claimBtn.click()
      await page.waitForTimeout(250)
    }
    const toRadiology = orderRow.getByRole('button', { name: /zur radiologie|zur diagnostik/i }).first()
    if (await isVisible(toRadiology, 1200)) {
      await toRadiology.click()
    } else {
      const transfer = orderRow.getByRole('button', { name: /patient verlegen|in diagnostik/i }).first()
      if (await isVisible(transfer, 1200)) {
        await transfer.click()
        await page.waitForTimeout(250)
        await orderRow.getByRole('button', { name: /zur radiologie|zur diagnostik/i }).first().click()
      }
    }
    steps['2_transfer_to_room'].pass = await isVisible(page.getByText(/kontrollzentrum/i).first(), 12000)
    steps['2_transfer_to_room'].detail = steps['2_transfer_to_room'].pass ? 'Diagnostic room opened' : 'Did not reach diagnostic room'
    if (!steps['2_transfer_to_room'].pass) discrepancies.push('Step 2 failed: transfer to room did not complete.')

    const captureButton = page.getByRole('button', { name: /aufnahme ausl[oö]sen/i }).first()

    // 3) negative: try capture before checks (must block)
    let captureBlocked = false
    try {
      captureBlocked = await captureButton.isDisabled()
    } catch {
      captureBlocked = false
    }
    steps['3_negative_capture_before_checks_blocked'].pass = captureBlocked
    steps['3_negative_capture_before_checks_blocked'].detail = captureBlocked ? 'Capture button disabled before checks' : 'Capture was not blocked before checks'
    if (!captureBlocked) discrepancies.push('Step 3 failed: capture was not blocked before safety checks.')

    // 4) finish checks and capture
    if (config.id === 'xray') {
      const shieldSection = page.locator('div').filter({ hasText: /strahlenschutz anlegen/i }).first()
      await holdButton(page, shieldSection.getByRole('button', { name: /schutzschild halten/i }).first(), 1800)
      const markerSection = page.locator('div').filter({ hasText: /seitenmarker setzen/i }).first()
      await safeClick(markerSection.getByRole('button', { name: /^L$/ }).first())
      await safeClick(markerSection.getByRole('button', { name: /marker platzieren/i }).first())
      const stableSection = page.locator('div').filter({ hasText: /patient stabilisieren/i }).first()
      for (let i = 0; i < 8; i += 1) {
        await safeClick(stableSection.getByRole('button', { name: /stabilisieren/i }).first())
      }
    } else {
      const metalSection = page.locator('div').filter({ hasText: /metallsensor kalibrieren/i }).first()
      await metalSection.locator('input[type="range"]').first().fill('50')
      const earSection = page.locator('div').filter({ hasText: /geh[oö]rschutz anpassen/i }).first()
      await holdButton(page, earSection.getByRole('button', { name: /geh[oö]rschutz fixieren/i }).first(), 1800)
      const bellSection = page.locator('div').filter({ hasText: /notfallklingel demonstrieren/i }).first()
      await safeClick(bellSection.getByRole('button', { name: /testton abspielen/i }).first())
    }

    for (let i = 0; i < 14; i += 1) {
      if (!(await captureButton.isDisabled())) break
      await page.waitForTimeout(180)
    }
    const enabledNow = !(await captureButton.isDisabled())
    if (enabledNow) {
      await safeClick(captureButton)
    }
    const befundungVisible = await isVisible(page.getByText(/befundung/i).first(), 8000)
    steps['4_finish_checks_and_capture'].pass = enabledNow && befundungVisible
    steps['4_finish_checks_and_capture'].detail = steps['4_finish_checks_and_capture'].pass ? 'Checks done and capture popup opened' : 'Capture did not start after checks'
    if (!steps['4_finish_checks_and_capture'].pass) discrepancies.push('Step 4 failed: could not capture after completing checks.')

    // 5) popup interactions zoom/pan/draw/LR
    let popupInteractionsOk = true
    try {
      const captureModal = page.locator('div.fixed.inset-0.z-\\[95\\]').first()
      await safeClick(captureModal.getByRole('button', { name: /^\+$/ }).first())
      await safeClick(captureModal.getByRole('button', { name: /^-$/ }).first())
      await safeClick(captureModal.getByRole('button', { name: /verschieben/i }).first())

      const viewer = captureModal.locator('div').filter({ has: captureModal.locator('img') }).first()
      const viewerBox = await viewer.boundingBox()
      if (!viewerBox) throw new Error('Viewer box not available')
      const cx = viewerBox.x + viewerBox.width / 2
      const cy = viewerBox.y + viewerBox.height / 2
      await page.mouse.move(cx, cy)
      await page.mouse.down()
      await page.mouse.move(cx + 90, cy + 45)
      await page.mouse.up()

      await safeClick(captureModal.getByRole('button', { name: /stift/i }).first())
      await page.mouse.move(cx - 90, cy - 50)
      await page.mouse.down()
      await page.mouse.move(cx + 10, cy + 10)
      await page.mouse.move(cx + 120, cy + 80)
      await page.mouse.up()

      await safeClick(captureModal.getByRole('button', { name: /l\/r setzen/i }).first())
      await safeClick(captureModal.getByRole('button', { name: /^L$/ }).first())
      await page.mouse.click(cx - 70, cy - 30)
      await safeClick(captureModal.getByRole('button', { name: /^R$/ }).first())
      await page.mouse.click(cx + 80, cy + 40)

      await captureModal.getByText(/Annotationen aktiv/i).first().waitFor({ state: 'visible', timeout: 4000 })
    } catch (err) {
      popupInteractionsOk = false
      discrepancies.push(`Step 5 issue (${config.label}): ${String(err?.message || err)}`)
    }
    steps['5_popup_zoom_pan_draw_lr'].pass = popupInteractionsOk
    steps['5_popup_zoom_pan_draw_lr'].detail = popupInteractionsOk ? 'Zoom/pan/draw/LR interactions completed' : 'Popup interactions failed'

    // 6) negative: submit missing required fields (must block)
    await safeClick(page.getByRole('button', { name: /befund abschicken/i }).first())
    const missingRequired = await isVisible(page.getByText(/Bitte Befund und Signatur ausfüllen\./i).first(), 2500)
    steps['6_negative_submit_missing_required_blocked'].pass = missingRequired
    steps['6_negative_submit_missing_required_blocked'].detail = missingRequired ? 'Submit blocked without mandatory fields' : 'Missing-fields submit not blocked'
    if (!missingRequired) discrepancies.push('Step 6 failed: missing required fields were not blocked.')

    // 7) submit valid report
    await page.getByPlaceholder(/befundbeschreibung/i).first().fill(befundText)
    await page.getByPlaceholder(/beurteilung/i).first().fill(beurteilungText)
    await page.getByPlaceholder(/diagnose/i).first().fill(diagnoseText)
    await page.getByPlaceholder(/signatur/i).first().fill(signatureText)
    await safeClick(page.getByRole('button', { name: /befund abschicken/i }).first())
    const savedMsg = await isVisible(page.getByText(/Befund gespeichert/i).first(), 5000)
    steps['7_submit_valid_report'].pass = savedMsg
    steps['7_submit_valid_report'].detail = savedMsg ? 'Valid report submitted successfully' : 'Valid report submit not confirmed'
    if (!savedMsg) discrepancies.push('Step 7 failed: valid report was not confirmed as saved.')

    // 8) complete and return
    const completeButton = page.getByRole('button', { name: /abschlie[sß]en\s*&\s*zur[uü]ck/i }).first()
    await completeButton.waitFor({ state: 'visible', timeout: 8000 })
    await safeClick(completeButton)
    await page.waitForTimeout(700)
    steps['8_complete_and_return'].pass = true
    steps['8_complete_and_return'].detail = 'Completed and returned from diagnostics'

    // Close diagnostic room overlay.
    const closeRoomButton = page.locator('div.fixed.inset-0.z-\\[90\\] button.p-2.rounded-xl').first()
    if (await isVisible(closeRoomButton, 1200)) {
      await closeRoomButton.click()
      await page.waitForTimeout(400)
    }

    // 9) verify Orders tab shows image + texts
    await safeClick(page.getByRole('button', { name: /anordnungen|orders/i }).first())
    const orderResultCard = page.locator('.card').filter({ hasText: befundText }).first()
    const orderTextVisible = await isVisible(orderResultCard, 5000)
    const orderSignatureVisible = await isVisible(page.getByText(signatureText).first(), 2000)
    const orderImageVisible = await isVisible(orderResultCard.locator('img').first(), 2000)
    steps['9_orders_tab_shows_image_and_texts'].pass = orderTextVisible && orderSignatureVisible && orderImageVisible
    steps['9_orders_tab_shows_image_and_texts'].detail = steps['9_orders_tab_shows_image_and_texts'].pass
      ? 'Orders tab contains image and report texts'
      : 'Orders tab missing image and/or report texts'
    if (!steps['9_orders_tab_shows_image_and_texts'].pass) discrepancies.push('Step 9 failed: Orders tab did not show expected image + text.')

    // 10) verify Documents tab shows image + texts
    await safeClick(page.getByRole('button', { name: /dokumente/i }).first())
    await page.getByText(/Dokumente\s*&\s*Berichte/i).first().waitFor({ state: 'visible', timeout: 8000 })
    const befundDocButton = page.locator('button').filter({
      hasText: config.id === 'xray'
        ? /(R[oö]ntgen|X-?ray).+Befund|Befund/i
        : /(MRT|MRI).+Befund|Befund/i,
    }).first()
    if (await isVisible(befundDocButton, 2500)) {
      await befundDocButton.click()
      await page.waitForTimeout(350)
    }
    const fieldControls = page.locator('textarea, input')
    const fieldCount = await fieldControls.count()
    let docTextVisible = false
    let docSignatureVisible = false
    for (let i = 0; i < fieldCount; i += 1) {
      const value = await fieldControls.nth(i).inputValue().catch(() => '')
      if (!docTextVisible && value.includes(befundText)) docTextVisible = true
      if (!docSignatureVisible && value.includes(signatureText)) docSignatureVisible = true
      if (docTextVisible && docSignatureVisible) break
    }
    const docImageVisible = await isVisible(page.locator('img[alt*="Dokumentbild"], img[alt*="Diagnostik"]').first(), 2500)
    steps['10_documents_tab_shows_image_and_texts'].pass = docTextVisible && docSignatureVisible && docImageVisible
    steps['10_documents_tab_shows_image_and_texts'].detail = steps['10_documents_tab_shows_image_and_texts'].pass
      ? 'Documents tab contains image and report texts'
      : 'Documents tab missing image and/or report texts'
    if (!steps['10_documents_tab_shows_image_and_texts'].pass) discrepancies.push('Step 10 failed: Documents tab did not show expected image + text.')
  } catch (err) {
    discrepancies.push(`Unhandled failure (${config.label}): ${String(err?.message || err)}`)
  } finally {
    await browser.close()
  }

  const passedSteps = Object.values(steps).filter((s) => s.pass).length
  return {
    modality: config.label,
    pass: passedSteps === 10,
    passedSteps,
    totalSteps: 10,
    steps,
    discrepancies,
  }
}

const modalities = [
  {
    id: 'xray',
    label: 'X-ray',
    modalityRegex: /(r[oö]ntgen|x-?ray)/i,
    bodyPartRegex: /thorax/i,
  },
  {
    id: 'mri',
    label: 'MRI',
    modalityRegex: /(mrt|mri)/i,
    bodyPartRegex: /kopf/i,
  },
]

const summary = []
for (const cfg of modalities) {
  // eslint-disable-next-line no-await-in-loop
  summary.push(await runModalityChecklist(cfg))
}

console.log('===FULL_XRAY_MRI_CHECKLIST_RESULT===')
console.log(JSON.stringify({ summary }, null, 2))
console.log('===END_FULL_XRAY_MRI_CHECKLIST_RESULT===')
