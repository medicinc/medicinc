import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const RUN_ID = Date.now();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

async function clickIfVisible(page, locator, timeout = 1200) {
  try {
    const el = page.locator(locator).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

async function ensureHospitalReady(page) {
  await page.goto(`${BASE_URL}/hospital`, { waitUntil: 'networkidle' });
  await sleep(400);

  for (let i = 0; i < 7; i += 1) {
    if (/\/login(?:\/|$)/i.test(page.url())) {
      const userInput = page.locator('input[placeholder*="beispiel"], input[placeholder*="anna"]').first();
      const passInput = page.locator('input[type="password"]').first();
      if (await userInput.count()) await userInput.fill('qa_runner');
      if (await passInput.count()) await passInput.fill('Xx123456');
      await page.getByRole('button', { name: /Anmelden/i }).click().catch(() => {});
      await page.waitForTimeout(1200);
      if (/\/login(?:\/|$)/i.test(page.url())) {
        const email = `qa_${Date.now()}@example.com`;
        await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
        await page.locator('input[type="text"]').first().fill('QA Runner');
        await page.locator('input[type="email"]').first().fill(email);
        await page.locator('input[type="password"]').first().fill('Xx123456');
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.count()) await checkbox.check().catch(() => {});
        await page.getByRole('button', { name: /Konto erstellen/i }).click();
        await page.waitForTimeout(1600);
      }
    }

    if (/\/onboarding(?:\/|$)/i.test(page.url())) {
      await page.getByRole('button', { name: /Assistenzarzt/i }).first().click().catch(() => {});
      await sleep(700);
      if (/\/onboarding(?:\/|$)/i.test(page.url())) {
        const devInput = page.locator('input[placeholder*="Entwickler-Code"]').first();
        if (await devInput.count()) {
          await devInput.fill('skip');
          await page.getByRole('button', { name: /^Ausführen$/i }).click().catch(() => {});
        }
        await sleep(1300);
      }
    }

    if (/\/hospital-choice(?:\/|$)/i.test(page.url())) {
      await page.getByRole('button', { name: /Beitreten/i }).first().click().catch(() => {});
      await page.waitForLoadState('networkidle');
      await sleep(900);
    }

    if (/\/hospital-create(?:\/|$)/i.test(page.url())) {
      const firstInput = page.locator('input').first();
      if (await firstInput.count()) await firstInput.fill('QA Klinik');
      await page.getByRole('button', { name: /Gründen|Erstellen|Weiter|Speichern/i }).first().click().catch(() => {});
      await page.waitForLoadState('networkidle');
      await sleep(700);
    }

    if (/\/hospital(?:\/|$)/i.test(page.url())) {
      const noHospital = await page.locator('text=Kein Krankenhaus').count();
      if (noHospital) {
        await page.goto(`${BASE_URL}/hospital-choice`, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Beitreten/i }).first().click().catch(() => {});
        await sleep(900);
      } else {
        break;
      }
    }
  }

  await page.goto(`${BASE_URL}/hospital`, { waitUntil: 'networkidle' });
  await sleep(700);
  await clickIfVisible(page, 'button:has-text("Überspringen")', 1000);
  await page.getByRole('button', { name: /Fälle/i }).click().catch(() => {});
  await sleep(450);
}

async function spawnPatientIfNeeded(page) {
  const noPatients = page.locator('text=Noch keine Patienten');
  if (await noPatients.count()) {
    await page.locator('button[title="Entwicklermenü"]').click();
    await sleep(250);
    await page.getByRole('button', { name: /Template-Patient spawnen/i }).click();
    await sleep(1200);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(350);
    await page.getByRole('button', { name: /Fälle/i }).click().catch(() => {});
    await sleep(1200);
  }
}

async function openAnyPatientFile(page) {
  await spawnPatientIfNeeded(page);
  const akteBtn = page.getByRole('button', { name: /^Akte$/i }).first();
  if (await akteBtn.count()) {
    await akteBtn.click();
    await page.waitForSelector('text=Patientenakte:', { timeout: 6000 });
    return true;
  }
  const diagCard = page.locator('text=In Geräteraum verlegt').first();
  if (await diagCard.count()) {
    await diagCard.click();
    await page.waitForSelector('text=Patientenakte:', { timeout: 6000 });
    return true;
  }
  const anyCaseCard = page.locator('.card').filter({ hasText: /Zimmer zuweisen|Akte|Klicken um Zimmer zu öffnen/i }).first();
  if (await anyCaseCard.count()) {
    await anyCaseCard.click().catch(() => {});
    const fallbackAkte = page.getByRole('button', { name: /^Akte$/i }).first();
    if (await fallbackAkte.count()) {
      await fallbackAkte.click();
      await page.waitForSelector('text=Patientenakte:', { timeout: 6000 });
      return true;
    }
  }
  return false;
}

async function ensureOrdersTab(page) {
  await page.getByRole('button', { name: /Anordnungen/i }).click().catch(() => {});
  await page.waitForSelector('text=Anordnung erstellen', { timeout: 5000 });
}

async function ensureDocumentsTab(page) {
  await page.getByRole('button', { name: /Dokumente/i }).click().catch(() => {});
  await page.waitForSelector('text=Dokumente & Berichte', { timeout: 5000 });
}

async function fillOrderForm(page, modality, bodyPartToken, noteText) {
  await page.locator('select').first().selectOption(modality);
  await sleep(150);
  const bodySelect = page.locator('label:has-text("Körperteil / Zielregion") + select');
  if (await bodySelect.count()) {
    const opts = await bodySelect.locator('option').allTextContents();
    if (opts.length > 1) {
      await bodySelect.selectOption({ index: 1 });
    }
  }
  await page.locator('label:has-text("Hinweis") + input').fill(`${bodyPartToken} ${noteText}`);
  await page.getByRole('button', { name: /Anordnen/i }).click();
  await sleep(350);
}

async function getOrderCardByNote(page, noteText) {
  return page.locator('.card', { hasText: noteText }).first();
}

async function runModality(page, modalityId, modalityName) {
  const step = [];
  const mark = (idx, ok, mismatch = '', repro = '') => {
    step.push({ step: idx, ok, mismatch, repro });
  };
  const note = `QA_${modalityId.toUpperCase()}_${RUN_ID}`;
  const report = {
    befund: `Befund ${modalityName} ${RUN_ID}`,
    beurteilung: `Beurteilung ${modalityName} ${RUN_ID}`,
    diagnose: `Diagnose ${modalityName} ${RUN_ID}`,
    signature: `Signatur ${modalityName} ${RUN_ID}`,
  };

  try {
    await ensureOrdersTab(page);
  } catch {
    mark(1, false, 'Orders tab not reachable', 'Open patient file -> click "Anordnungen".');
    for (let i = 2; i <= 10; i += 1) mark(i, false, 'Blocked by previous failure', 'Fix step 1 first.');
    return { modality: modalityName, step };
  }

  // 1) Create order with body part + note
  try {
    await fillOrderForm(page, modalityId, 'BODY', note);
    const card = await getOrderCardByNote(page, note);
    const visible = await card.isVisible({ timeout: 4000 });
    if (!visible) throw new Error('New order card not found');
    const txt = normalize(await card.innerText());
    const hasBody = txt.includes('Zielregion:');
    const hasNote = txt.includes(note);
    mark(1, hasBody && hasNote, hasBody && hasNote ? '' : 'Order missing body part or note', `Create ${modalityName} order and inspect card.`);
  } catch (e) {
    mark(1, false, String(e.message || e), `Create ${modalityName} order in "Anordnungen".`);
  }

  // 2) Transfer/open diagnostic room
  try {
    const card = await getOrderCardByNote(page, note);
    const claimBtn = card.getByRole('button', { name: /Übernehmen/i }).first();
    if (await claimBtn.count()) await claimBtn.click();
    await sleep(250);
    const toRadio = card.getByRole('button', { name: /Zur Radiologie/i }).first();
    await toRadio.click({ timeout: 5000 });
    await page.waitForSelector('text=Kontrollzentrum', { timeout: 7000 });
    mark(2, true);
  } catch (e) {
    mark(2, false, `Diagnostic room did not open for ${modalityName}: ${String(e.message || e)}`, `Open order card (${note}) -> click "Übernehmen" then "Zur Radiologie".`);
    for (let i = 3; i <= 10; i += 1) mark(i, false, 'Blocked by diagnostic room open failure', 'Fix step 2 first.');
    return { modality: modalityName, step, report };
  }

  // 3) Verify capture blocked before checks complete
  try {
    const triggerBtn = page.getByRole('button', { name: /Aufnahme auslösen/i });
    const disabled = await triggerBtn.isDisabled();
    const popupVisible = await page.locator('text=Befundung').count();
    mark(3, disabled && popupVisible === 0, disabled ? '' : 'Capture button is not blocked before checks', 'Open room fresh and inspect "Aufnahme auslösen" disabled state.');
  } catch (e) {
    mark(3, false, String(e.message || e), 'Open diagnostic room before any safety checks.');
  }

  // 4) Complete checks and trigger capture
  try {
    if (modalityId === 'xray') {
      const holdBtn = page.getByRole('button', { name: /Schutzschild halten/i }).first();
      await holdBtn.hover();
      await page.mouse.down();
      await sleep(1250);
      await page.mouse.up();
      await page.getByRole('button', { name: /^L$/ }).first().click();
      await page.getByRole('button', { name: /Marker platzieren/i }).click();
      for (let i = 0; i < 6; i += 1) {
        await page.getByRole('button', { name: /Stabilisieren/i }).click();
        await sleep(70);
      }
    } else {
      const metalRange = page.locator('text=Metallsensor kalibrieren').locator('..').locator('input[type="range"]').first();
      if (await metalRange.count()) {
        await metalRange.fill('50').catch(async () => {
          await metalRange.evaluate((el) => {
            el.value = '50';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }
      const earBtn = page.getByRole('button', { name: /Gehörschutz fixieren/i }).first();
      await earBtn.hover();
      await page.mouse.down();
      await sleep(1250);
      await page.mouse.up();
      await page.getByRole('button', { name: /Testton abspielen/i }).click();
    }
    const triggerBtn = page.getByRole('button', { name: /Aufnahme auslösen/i });
    await triggerBtn.click({ timeout: 6000 });
    await page.waitForSelector('text=Befundung', { timeout: 7000 });
    mark(4, true);
  } catch (e) {
    mark(4, false, String(e.message || e), `In ${modalityName} room complete all 3 checks, then click "Aufnahme auslösen".`);
  }

  // 5) In popup test zoom + pan + draw + L/R marker placement
  try {
    await page.getByRole('button', { name: '+' }).click();
    await page.getByRole('button', { name: '-' }).click();
    const viewer = page.locator('div:has(img[alt*="Simulationsbild"])').first();
    await viewer.hover();
    await page.mouse.down();
    await page.mouse.move(520, 360);
    await page.mouse.up();
    await page.getByRole('button', { name: /Stift/i }).click();
    await viewer.hover();
    await page.mouse.down();
    await page.mouse.move(580, 380, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('button', { name: /L\/R setzen/i }).click();
    await page.getByRole('button', { name: /^L$/ }).nth(1).click().catch(async () => {
      await page.locator('button:has-text("L")').nth(1).click();
    });
    await viewer.click({ position: { x: 120, y: 130 } });
    await page.getByRole('button', { name: /^R$/ }).nth(1).click().catch(async () => {
      await page.locator('button:has-text("R")').nth(1).click();
    });
    await viewer.click({ position: { x: 170, y: 170 } });
    const annotationInfo = page.locator('text=Annotationen aktiv').first();
    const hasAnnotationInfo = await annotationInfo.isVisible({ timeout: 3000 });
    mark(5, hasAnnotationInfo, hasAnnotationInfo ? '' : 'Annotation status not shown after draw/markers', 'Inside capture popup run zoom, pan, draw and place L/R.');
  } catch (e) {
    mark(5, false, String(e.message || e), 'Use popup controls (+/-), drag image, use Stift and L/R setzen.');
  }

  // 6) Verify submit blocked when required fields missing
  try {
    await page.getByRole('button', { name: /Befund abschicken/i }).click();
    const err = page.locator('text=Bitte Befund und Signatur ausfüllen.');
    const visible = await err.isVisible({ timeout: 3000 });
    mark(6, visible, visible ? '' : 'Missing-field validation message did not appear', 'Click "Befund abschicken" with empty form in popup.');
  } catch (e) {
    mark(6, false, String(e.message || e), 'Attempt submit with empty Befund/Signatur.');
  }

  // 7) Submit valid report
  try {
    const areas = page.locator('textarea');
    await areas.nth(0).fill(report.befund);
    await areas.nth(1).fill(report.beurteilung);
    await page.locator('input[placeholder="Diagnose"]').fill(report.diagnose);
    await page.locator('input[placeholder="Signatur"]').fill(report.signature);
    await page.getByRole('button', { name: /Befund abschicken/i }).click();
    await page.waitForSelector('text=Befundung', { state: 'hidden', timeout: 7000 });
    const saved = page.locator('text=Befund gespeichert');
    const hasSaved = await saved.first().isVisible({ timeout: 4000 });
    mark(7, hasSaved, hasSaved ? '' : 'No success confirmation after valid submit', 'Fill Befund + Signatur (+ optional fields) and submit.');
  } catch (e) {
    mark(7, false, String(e.message || e), 'Submit valid report in capture popup.');
  }

  // 8) Complete and return
  try {
    await page.getByRole('button', { name: /Abschließen & zurück/i }).click();
    await sleep(700);
    const inRoom = await page.locator('text=Kontrollzentrum').count();
    if (inRoom) {
      await page.locator('button').filter({ has: page.locator('svg') }).first().click().catch(() => {});
    }
    await sleep(500);
    await page.waitForSelector('text=Patientenakte:', { timeout: 6000 });
    mark(8, true);
  } catch (e) {
    mark(8, false, String(e.message || e), 'After submit click "Abschließen & zurück".');
  }

  // 9) In Orders tab verify image + all report texts visible
  try {
    await ensureOrdersTab(page);
    const card = await getOrderCardByNote(page, note);
    const txt = normalize(await card.innerText());
    const hasAllText = [report.befund, report.beurteilung, report.diagnose, report.signature].every((t) => txt.includes(t));
    const hasImg = (await card.locator('img').count()) > 0;
    mark(9, hasAllText && hasImg, hasAllText && hasImg ? '' : 'Orders tab missing image or one/more report texts', `Open order card (${note}) and check image + Befund/Beurteilung/Diagnose/Signatur.`);
  } catch (e) {
    mark(9, false, String(e.message || e), 'Verify completed order result block in "Anordnungen".');
  }

  // 10) In Documents tab verify image + all report texts visible
  try {
    await ensureDocumentsTab(page);
    const docTitleRx = new RegExp(`${modalityName}.*Befund`, 'i');
    await page.getByRole('button', { name: docTitleRx }).first().click({ timeout: 5000 });
    await sleep(350);
    const bodyText = normalize(await page.locator('body').innerText());
    const hasAllText = [report.befund, report.beurteilung, report.diagnose, report.signature].every((t) => bodyText.includes(t));
    const hasImg = (await page.locator('img[alt*="Dokumentbild"], img[alt*="Diagnostik"], img[alt*="Simulationsbild"]').count()) > 0;
    mark(10, hasAllText && hasImg, hasAllText && hasImg ? '' : 'Documents tab missing image or one/more report texts', `Open "${modalityName}-Anordnung Befund" under Dokumente and inspect fields + attached image.`);
  } catch (e) {
    mark(10, false, String(e.message || e), `Open ${modalityName} report document and verify content.`);
  }

  return { modality: modalityName, step, report, note };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const output = { baseUrl: BASE_URL, runId: RUN_ID, modalities: [], fatal: null };

  try {
    await ensureHospitalReady(page);
    const opened = await openAnyPatientFile(page);
    if (!opened) throw new Error('No patient file could be opened from Fälle tab.');

    output.modalities.push(await runModality(page, 'xray', 'Röntgen'));
    output.modalities.push(await runModality(page, 'mri', 'MRT'));
  } catch (e) {
    output.fatal = String(e.message || e);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
