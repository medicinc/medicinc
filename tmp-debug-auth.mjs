import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function logPage(page, tag) {
  console.log(`\n== ${tag} ==`);
  console.log('URL', page.url());
  console.log((await page.locator('body').innerText()).slice(0, 1200));
  const btns = await page.locator('button').allInnerTexts();
  console.log('buttons', btns.slice(0, 25));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto('http://localhost:3000/hospital', { waitUntil: 'networkidle' });
await sleep(500);
await logPage(page, 'after /hospital');

if (/\/login(?:\/|$)/i.test(page.url())) {
  await page.locator('input[placeholder*="beispiel"]').fill('qa_runner').catch(() => {});
  await page.locator('input[type="password"]').first().fill('Xx123456').catch(() => {});
  await page.getByRole('button', { name: /Anmelden/i }).click().catch(() => {});
  await sleep(1400);
  await logPage(page, 'after login attempt');
}

if (/\/onboarding(?:\/|$)/i.test(page.url())) {
  await page.getByRole('button', { name: /Assistenzarzt/i }).first().click().catch(() => {});
  await sleep(800);
  await logPage(page, 'after assistenzarzt click');
  const devInput = page.locator('input[placeholder*="Entwickler-Code"]').first();
  if (await devInput.count()) {
    await devInput.fill('skip');
    await page.getByRole('button', { name: /^Ausführen$/i }).click().catch(() => {});
    await sleep(1300);
    await logPage(page, 'after skip code');
  }
}

if (/\/hospital-choice(?:\/|$)/i.test(page.url())) {
  await page.getByRole('button', { name: /Beitreten/i }).first().click().catch(() => {});
  await sleep(1500);
  await logPage(page, 'after beitreten click');
}

if (/\/login(?:\/|$)/i.test(page.url())) {
  const email = `qa_${Date.now()}@example.com`;
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.locator('input[type="text"]').first().fill('QA Runner');
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill('Xx123456');
  await page.locator('input[type="checkbox"]').first().check().catch(() => {});
  await page.getByRole('button', { name: /Konto erstellen/i }).click().catch(() => {});
  await sleep(2200);
  await logPage(page, 'after register');
}

await page.goto('http://localhost:3000/hospital', { waitUntil: 'networkidle' });
await sleep(700);
await logPage(page, 'final /hospital');

await browser.close();
