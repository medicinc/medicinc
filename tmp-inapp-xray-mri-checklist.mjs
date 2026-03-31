import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3000/'

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
  try {
    await first.click({ timeout })
  } catch {
    await first.click({ timeout, force: true })
  }
}

function tabLocator(page, regex) {
  return page.locator('button, [role="tab"]').filter({ hasText: regex }).first()
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

async function ensureHospitalReady(page) {
  await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  for (let i = 0; i < 8; i += 1) {
    if (/\/login(?:\/|$)/i.test(page.url())) {
      const email = `qa_${Date.now()}@example.com`
      await page.goto(`${BASE_URL}register`, { waitUntil: 'domcontentloaded' })
      await page.locator('input[type="text"]').first().fill('QA Runner')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('Xx123456')
      const terms = page.locator('input[type="checkbox"]').first()
      if (await terms.count()) await terms.check().catch(() => {})
      await page.getByRole('button', { name: /konto erstellen/i }).first().click()
      await page.waitForTimeout(1700)
    }

    if (/\/onboarding(?:\/|$)/i.test(page.url())) {
      const backToChoice = page.getByRole('button', { name: /zurück zur einstiegsauswahl/i }).first()
      if (await isVisible(backToChoice, 700)) {
        await backToChoice.click().catch(() => {})
        await page.waitForTimeout(350)
      }

      const rescuePath = page.getByRole('button', { name: /rettungssanitäter/i }).first()
      const medicalPath = page.getByRole('button', { name: /assistenzarzt/i }).first()
      if (await isVisible(medicalPath, 900)) {
        await medicalPath.click().catch(() => {})
        await page.waitForTimeout(700)
      } else if (await isVisible(rescuePath, 900)) {
        await rescuePath.click().catch(() => {})
        await page.waitForTimeout(700)
      }

      const devInput = page.locator('input[placeholder*="Entwickler"], input[placeholder*="Code"], input[type="text"]').first()
      const execBtn = page.getByRole('button', { name: /^ausführen$/i }).first()
      if ((await isVisible(execBtn, 1000)) && (await devInput.count())) {
        await devInput.fill('skip').catch(() => {})
        await execBtn.click().catch(() => {})
        await page.waitForTimeout(1200)
      }
    }

    if (/\/hospital-choice(?:\/|$)/i.test(page.url())) {
      await page.getByRole('button', { name: /beitreten/i }).first().click().catch(() => {})
      await page.waitForTimeout(1500)
    }

    if (/\/hospital(?:\/|$)/i.test(page.url())) break
  }

  await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)
  const skipTutorial = page.getByRole('button', { name: /überspringen|ueberspringen/i }).first()
  if (await isVisible(skipTutorial, 1000)) {
    await skipTutorial.click()
    await page.waitForTimeout(250)
  }
}

async function ensurePrerequisitesInApp(page) {
  const mismatches = []

  // Ensure we are on hospital screen and open cases tab.
  await page.goto(`${BASE_URL}hospital`, { waitUntil: 'domcontentloaded' })
  if (/\/rettungsdienst(?:\/|$)/i.test(page.url())) {
    const hospitalTopNav = tabLocator(page, /krankenhaus/i)
    if (await isVisible(hospitalTopNav, 1500)) {
      await hospitalTopNav.click().catch(() => {})
      await page.waitForTimeout(700)
    }
  }
  const skipTutorial = page.getByRole('button', { name: /überspringen|ueberspringen/i }).first()
  if (await isVisible(skipTutorial, 1000)) await skipTutorial.click().catch(() => {})
  const dutyBtn = page.getByRole('button', { name: /in dienst melden/i }).first()
  if (await isVisible(dutyBtn, 1500)) {
    await dutyBtn.click().catch(() => {})
    await page.waitForTimeout(700)
  }
  let casesTab = tabLocator(page, /fälle|faelle|patients/i)
  if (!(await isVisible(casesTab, 1500))) {
    const hospitalNav = tabLocator(page, /krankenhaus/i)
    if (await isVisible(hospitalNav, 1000)) {
      await hospitalNav.click().catch(() => {})
      await page.waitForTimeout(500)
    }
  }
  casesTab = tabLocator(page, /fälle|faelle|patients/i)
  if (!(await isVisible(casesTab, 2500))) {
    const sampleButtons = await page.locator('button').allInnerTexts().catch(() => [])
    mismatches.push(`Prerequisite failed: Fälle tab not reachable in hospital UI (url=${page.url()} buttons=${JSON.stringify(sampleButtons.slice(0, 8))}).`)
    return { ok: false, mismatches }
  }
  await page.keyboard.press('Escape').catch(() => {})
  const closeBlocker = page.getByRole('button', { name: /überspringen|schließen|schliessen|ok|weiter/i }).first()
  if (await isVisible(closeBlocker, 700)) await closeBlocker.click().catch(() => {})
  await safeClick(casesTab)
  await page.waitForTimeout(450)

  // Try to open an existing patient file.
  let opened = false
  const openAkte = async () => {
    const akte = page.getByRole('button', { name: /^akte$/i }).first()
    if (await isVisible(akte, 1200)) {
      await akte.click()
      await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 8000 })
      return true
    }
    const inDiag = page.locator('text=In Geräteraum verlegt').first()
    if (await isVisible(inDiag, 800)) {
      await inDiag.click().catch(() => {})
      await page.waitForTimeout(300)
      const akteFallback = page.getByRole('button', { name: /^akte$/i }).first()
      if (await isVisible(akteFallback, 1200)) {
        await akteFallback.click()
        await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 8000 })
        return true
      }
    }
    const anyCaseCard = page.locator('.card').filter({ hasText: /zimmer zuweisen|akte|klicken um zimmer zu öffnen/i }).first()
    if (await isVisible(anyCaseCard, 900)) {
      await anyCaseCard.click().catch(() => {})
      await page.waitForTimeout(300)
      const akteFallback = page.getByRole('button', { name: /^akte$/i }).first()
      if (await isVisible(akteFallback, 1200)) {
        await akteFallback.click()
        await page.getByText(/patientenakte/i).first().waitFor({ state: 'visible', timeout: 8000 })
        return true
      }
    }
    return false
  }

  opened = await openAkte()

  // If no patient file, generate via developer menu.
  if (!opened) {
    const devMenu = page.locator('button[title="Entwicklermenü"]').first()
    if (await isVisible(devMenu, 1200)) {
      await devMenu.click()
      await page.waitForTimeout(250)
      const spawnBtn = page.getByRole('button', { name: /template-patient spawnen/i }).first()
      if (await isVisible(spawnBtn, 1500)) {
        await spawnBtn.click()
        await page.waitForTimeout(1200)
      }
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(200)
      await safeClick(tabLocator(page, /fälle|faelle|patients/i))
      await page.waitForTimeout(500)
      opened = await openAkte()
    }
  }

  // Last chance: wait for automatic arrival.
  if (!opened) {
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(2000)
      await safeClick(tabLocator(page, /fälle|faelle|patients/i))
      opened = await openAkte()
      if (opened) break
    }
  }

  if (!opened) {
    const noPatientsText = await isVisible(page.getByText(/noch keine patienten|keine patienten/i).first(), 600)
    const onDutyText = await isVisible(page.getByText(/im dienst/i).first(), 600)
    const dutyStartVisible = await isVisible(page.getByRole('button', { name: /in dienst melden/i }).first(), 600)
    const devMenuVisible = await isVisible(page.locator('button[title="Entwicklermenü"]').first(), 600)
    const cardCount = await page.locator('.card').count().catch(() => 0)
    mismatches.push(`Prerequisite failed: no patient file (Akte) available (url=${page.url()} noPatients=${noPatientsText} onDutyText=${onDutyText} dutyStartVisible=${dutyStartVisible} devMenuVisible=${devMenuVisible} cardCount=${cardCount}).`)
  }

  return { ok: opened, mismatches }
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

async function runModalityChecklist(page, config) {
  const steps = createStepState()
  const discrepancies = []

  const runId = `${config.id}-${Date.now()}`
  const noteText = `QA ${config.label} note ${runId}`
  const befundText = `QA ${config.label} befund ${runId}`
  const beurteilungText = `QA ${config.label} beurteilung ${runId}`
  const diagnoseText = `QA ${config.label} diagnose ${runId}`
  const signatureText = `Dr. QA ${config.label} ${runId}`

  try {
    await safeClick(tabLocator(page, /anordnungen|orders/i))
    const modalitySelect = page.locator('select').nth(0)
    const bodyPartSelect = page.locator('select').nth(1)
    const pickedModality = await selectByIncludes(modalitySelect, config.modalityRegex)
    const pickedBodyPart = await selectByIncludes(bodyPartSelect, config.bodyPartRegex)
    await page.getByPlaceholder(/fragestellung|klinischer kontext/i).first().fill(noteText)
    await safeClick(page.getByRole('button', { name: /anordnen/i }))
    await page.waitForTimeout(400)
    const orderRow = page.locator('.card').filter({ hasText: noteText }).first()
    steps['1_create_order'].pass = await isVisible(orderRow, 3000) && !!pickedModality && !!pickedBodyPart
    if (!steps['1_create_order'].pass) discrepancies.push('Step 1 failed: order creation not confirmed.')

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
    if (!steps['2_transfer_to_room'].pass) discrepancies.push('Step 2 failed: transfer to room did not complete.')

    const captureButton = page.getByRole('button', { name: /aufnahme ausl[oö]sen/i }).first()
    const captureBlocked = await captureButton.isDisabled().catch(() => false)
    steps['3_negative_capture_before_checks_blocked'].pass = captureBlocked
    if (!captureBlocked) discrepancies.push('Step 3 failed: capture was not blocked before safety checks.')

    if (config.id === 'xray') {
      const shieldSection = page.locator('div').filter({ hasText: /strahlenschutz anlegen/i }).first()
      await holdButton(page, shieldSection.getByRole('button', { name: /schutzschild halten/i }).first(), 1800)
      const markerSection = page.locator('div').filter({ hasText: /seitenmarker setzen/i }).first()
      await safeClick(markerSection.getByRole('button', { name: /^L$/ }).first())
      await safeClick(markerSection.getByRole('button', { name: /marker platzieren/i }).first())
      const stableSection = page.locator('div').filter({ hasText: /patient stabilisieren/i }).first()
      for (let i = 0; i < 8; i += 1) await safeClick(stableSection.getByRole('button', { name: /stabilisieren/i }).first())
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
    if (enabledNow) await safeClick(captureButton)
    const befundungVisible = await isVisible(page.getByText(/befundung/i).first(), 8000)
    steps['4_finish_checks_and_capture'].pass = enabledNow && befundungVisible
    if (!steps['4_finish_checks_and_capture'].pass) discrepancies.push('Step 4 failed: could not capture after completing checks.')

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
      await captureModal.getByText(/annotationen aktiv/i).first().waitFor({ state: 'visible', timeout: 4000 })
    } catch {
      popupInteractionsOk = false
    }
    steps['5_popup_zoom_pan_draw_lr'].pass = popupInteractionsOk
    if (!popupInteractionsOk) discrepancies.push('Step 5 failed: popup interactions (zoom/pan/draw/LR) failed.')

    await safeClick(page.getByRole('button', { name: /befund abschicken/i }).first())
    const missingRequired = await isVisible(page.getByText(/Bitte Befund und Signatur ausfüllen\./i).first(), 2500)
    steps['6_negative_submit_missing_required_blocked'].pass = missingRequired
    if (!missingRequired) discrepancies.push('Step 6 failed: missing required fields were not blocked.')

    await page.getByPlaceholder(/befundbeschreibung/i).first().fill(befundText)
    await page.getByPlaceholder(/beurteilung/i).first().fill(beurteilungText)
    await page.getByPlaceholder(/diagnose/i).first().fill(diagnoseText)
    await page.getByPlaceholder(/signatur/i).first().fill(signatureText)
    await safeClick(page.getByRole('button', { name: /befund abschicken/i }).first())
    const savedMsg = await isVisible(page.getByText(/Befund gespeichert/i).first(), 5000)
    steps['7_submit_valid_report'].pass = savedMsg
    if (!savedMsg) discrepancies.push('Step 7 failed: valid report was not confirmed as saved.')

    const completeButton = page.getByRole('button', { name: /abschlie[sß]en\s*&\s*zur[uü]ck/i }).first()
    await completeButton.waitFor({ state: 'visible', timeout: 8000 })
    await safeClick(completeButton)
    await page.waitForTimeout(700)
    steps['8_complete_and_return'].pass = true

    const closeRoomButton = page.locator('div.fixed.inset-0.z-\\[90\\] button.p-2.rounded-xl').first()
    if (await isVisible(closeRoomButton, 1200)) {
      await closeRoomButton.click()
      await page.waitForTimeout(350)
    }

    await safeClick(tabLocator(page, /anordnungen|orders/i))
    const orderResultCard = page.locator('.card').filter({ hasText: befundText }).first()
    const orderTextVisible = await isVisible(orderResultCard, 5000)
    const orderSignatureVisible = await isVisible(page.getByText(signatureText).first(), 2000)
    const orderImageVisible = await isVisible(orderResultCard.locator('img').first(), 2000)
    steps['9_orders_tab_shows_image_and_texts'].pass = orderTextVisible && orderSignatureVisible && orderImageVisible
    if (!steps['9_orders_tab_shows_image_and_texts'].pass) discrepancies.push('Step 9 failed: Orders tab did not show expected image + text.')

    await safeClick(tabLocator(page, /dokumente/i))
    await page.getByText(/Dokumente\s*&\s*Berichte/i).first().waitFor({ state: 'visible', timeout: 8000 })
    const befundDocButton = page.locator('button').filter({
      hasText: config.id === 'xray' ? /(R[oö]ntgen|X-?ray).+Befund|Befund/i : /(MRT|MRI).+Befund|Befund/i,
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
    if (!steps['10_documents_tab_shows_image_and_texts'].pass) discrepancies.push('Step 10 failed: Documents tab did not show expected image + text.')
  } catch (err) {
    discrepancies.push(`Unhandled failure (${config.label}): ${String(err?.message || err)}`)
  }

  const passedSteps = Object.values(steps).filter((s) => s.pass).length
  return { modality: config.label, pass: passedSteps === 10, passedSteps, totalSteps: 10, discrepancies }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 980 } })
  const page = await context.newPage()

  const result = { prerequisites: { pass: false, mismatches: [] }, summary: [] }
  try {
    await ensureHospitalReady(page)
    const pre = await ensurePrerequisitesInApp(page)
    result.prerequisites.pass = pre.ok
    result.prerequisites.mismatches = pre.mismatches
    if (!pre.ok) {
      console.log('===INAPP_XRAY_MRI_CHECKLIST_RESULT===')
      console.log(JSON.stringify(result, null, 2))
      console.log('===END_INAPP_XRAY_MRI_CHECKLIST_RESULT===')
      return
    }

    const modalities = [
      { id: 'xray', label: 'X-ray', modalityRegex: /(r[oö]ntgen|x-?ray)/i, bodyPartRegex: /thorax/i },
      { id: 'mri', label: 'MRI', modalityRegex: /(mrt|mri)/i, bodyPartRegex: /kopf/i },
    ]
    for (const cfg of modalities) {
      // eslint-disable-next-line no-await-in-loop
      result.summary.push(await runModalityChecklist(page, cfg))
    }
  } finally {
    await browser.close()
  }

  console.log('===INAPP_XRAY_MRI_CHECKLIST_RESULT===')
  console.log(JSON.stringify(result, null, 2))
  console.log('===END_INAPP_XRAY_MRI_CHECKLIST_RESULT===')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
