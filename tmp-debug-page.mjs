import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
await context.addInitScript(() => {
  const nowIso = new Date().toISOString()
  const user = {
    id: 'qa_user_1',
    name: 'QA Radiology',
    email: 'qa@medisim.local',
    level: 12,
    rank: 'facharzt',
    profession: 'assistenzarzt',
    medicalLicense: true,
    hospitalId: 'h_qa_1',
    hospitalName: 'QA Klinik',
    wallet: 999999,
    onboardingComplete: true,
    joinedAt: nowIso,
    stats: { casesCompleted: 10 },
  }
  const hospital = {
    id: 'h_qa_1',
    name: 'QA Klinik',
    ownerId: 'qa_user_1',
    rooms: [{ id: 'er', level: 1, condition: 100, patients: [] }, { id: 'radiology', level: 1, condition: 100, patients: [] }],
    treatmentRooms: [{ id: 'tr_er_1', name: 'ER 1', station: 'er', patientId: 'p_qa_1', equipment: [], equipmentState: {} }],
    stationEquipment: { radiology: ['xray_mobile', 'mri_scanner'] },
    members: [{ userId: 'qa_user_1', name: 'QA Radiology', role: 'owner', rank: 'Facharzt/-ärztin', permissions: { treat_patients: true } }],
    workers: [],
    patients: [{ id: 'p_qa_1', name: 'Testpatient Radiologie', age: 44, gender: 'm', chiefComplaint: 'Thoraxschmerz', triageLevel: 'yellow', status: 'in_treatment', assignedRoom: 'tr_er_1', orders: [], documents: [], vitals: { hr: 96, bp: '146/88', spo2: 97, rr: 20 }, arrivalTime: nowIso }],
  }
  localStorage.setItem('medisim_user', JSON.stringify(user))
  localStorage.setItem('medisim_user_qa@medisim.local', JSON.stringify(user))
  localStorage.setItem('medisim_hospital_h_qa_1', JSON.stringify(hospital))
})

const page = await context.newPage()
await page.goto('http://localhost:3000/hospital', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const headings = await page.locator('h1,h2,h3').allTextContents()
const buttons = await page.locator('button').allTextContents()
console.log('URL', page.url())
console.log('HEADINGS', headings.slice(0, 20))
console.log('BUTTONS', buttons.slice(0, 80))
await browser.close()
