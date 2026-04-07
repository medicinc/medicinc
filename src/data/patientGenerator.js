import { generateTemplateCase, generateTemplateCaseByDiagnosis, getDiagnosisListsBySpecialty } from './patientTemplates'

const FIRST_NAMES_M = ['Thomas', 'Michael', 'Andreas', 'Stefan', 'Hans', 'Peter', 'Klaus', 'Werner', 'Uwe', 'Jürgen', 'Dieter', 'Markus', 'Ralf', 'Frank', 'Wolfgang', 'Bernd', 'Helmut', 'Karl', 'Manfred', 'Gerhard']
const FIRST_NAMES_F = ['Maria', 'Ursula', 'Monika', 'Karin', 'Petra', 'Brigitte', 'Sabine', 'Andrea', 'Claudia', 'Heike', 'Susanne', 'Ingrid', 'Renate', 'Helga', 'Erika', 'Christine', 'Birgit', 'Gabriele', 'Gisela', 'Elisabeth']
const LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Klein', 'Schröder', 'Neumann', 'Braun', 'Werner', 'Schwarz', 'Zimmermann']
const FOREIGN_NAME_POOLS = {
  en: {
    firstM: ['James', 'Michael', 'David', 'Daniel', 'Robert', 'Kevin'],
    firstF: ['Emily', 'Sarah', 'Jessica', 'Olivia', 'Megan', 'Rachel'],
    last: ['Smith', 'Johnson', 'Brown', 'Miller', 'Wilson', 'Anderson'],
  },
  es: {
    firstM: ['Carlos', 'Miguel', 'Javier', 'Luis', 'Diego', 'Alejandro'],
    firstF: ['Maria', 'Sofia', 'Lucia', 'Isabella', 'Carmen', 'Elena'],
    last: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Sanchez', 'Perez'],
  },
}

const TRIAGE_LEVELS = [
  { id: 'rot', name: 'Rot – Sofort', color: '#ef4444', bgColor: 'bg-red-100 text-red-800', maxWaitMin: 0, description: 'Lebensgefahr, sofortige Behandlung' },
  { id: 'orange', name: 'Orange – Sehr dringend', color: '#f97316', bgColor: 'bg-orange-100 text-orange-800', maxWaitMin: 10, description: 'Sehr dringend, max. 10 Minuten Wartezeit' },
  { id: 'gelb', name: 'Gelb – Dringend', color: '#eab308', bgColor: 'bg-yellow-100 text-yellow-800', maxWaitMin: 30, description: 'Dringend, max. 30 Minuten Wartezeit' },
  { id: 'gruen', name: 'Grün – Normal', color: '#22c55e', bgColor: 'bg-green-100 text-green-800', maxWaitMin: 90, description: 'Standard, max. 90 Minuten Wartezeit' },
  { id: 'blau', name: 'Blau – Nicht dringend', color: '#3b82f6', bgColor: 'bg-blue-100 text-blue-800', maxWaitMin: 120, description: 'Nicht dringend, Wartezeit tolerierbar' },
]

const ALLERGIES_POOL = [
  'Keine bekannt', 'Penicillin', 'Ibuprofen', 'Latex', 'Kontrastmittel',
  'Sulfonamide', 'Nuesse', 'Bienenstich', 'Codein', 'Aspirin',
]

const MEDICATIONS_POOL = [
  'Keine regelmaessigen', 'Ramipril 5mg morgens', 'Metformin 500mg 2x taeglich',
  'Aspirin 100mg', 'Ibuprofen bei Bedarf', 'L-Thyroxin 75ug',
  'Atorvastatin 20mg abends', 'Omeprazol 20mg', 'Bisoprolol 2,5mg',
  'Marcumar/Falithrom', 'Insulin (Humalog)', 'Amlodipin 5mg',
]

const PAST_HISTORY_POOL = [
  'Keine Vorerkrankungen', 'Bluthochdruck seit 10 Jahren',
  'Diabetes mellitus Typ 2', 'Knie-OP vor 2 Jahren', 'Blinddarm-OP als Kind',
  'Asthma bronchiale', 'Depression', 'Gallensteine', 'Vorhofflimmern',
  'Rueckenschmerzen chronisch', 'Arthrose', 'Schilddruesenunterfunktion',
]

const LAST_MEAL_POOL = [
  'Heute Morgen gefruehstueckt, vor etwa 3 Stunden.',
  'Habe nichts gegessen heute, nur Kaffee getrunken.',
  'Mittagessen vor einer Stunde - Nudeln mit Sosse.',
  'Gestern Abend zuletzt gegessen.',
  'Vor ungefaehr 5 Stunden ein Broetchen.',
  'Habe heute nur Wasser getrunken, mir war uebel.',
]

let patientCounter = 0
let nextForeignAt = 30 + Math.floor(Math.random() * 11)
let nextSensoryAt = 40 + Math.floor(Math.random() * 21)
let nextPsychAt = 20 + Math.floor(Math.random() * 11)
let nextSamplerMemeAt = 85 + Math.floor(Math.random() * 55)

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

function parseBp(bp) {
  const parts = String(bp || '').split('/')
  const sys = Number(parts[0] || 120)
  const dia = Number(parts[1] || 75)
  return {
    sys: Number.isFinite(sys) ? sys : 120,
    dia: Number.isFinite(dia) ? dia : 75,
  }
}

function buildRealisticVitals(base, arrivalType) {
  const complaint = String(base?.complaint || '').toLowerCase()
  const symptoms = Array.isArray(base?.symptoms) ? base.symptoms.join(' ').toLowerCase() : ''
  const text = `${complaint} ${symptoms}`
  const severity = String(base?.severity || '').toLowerCase()
  const baseline = base?.vitals || { hr: 86, bp: '128/78', rr: 16, temp: 36.9, spo2: 98 }
  const bp = parseBp(baseline.bp)
  let hr = Number(baseline.hr || 86)
  let rr = Number(baseline.rr || 16)
  let temp = Number(baseline.temp || 36.9)
  let spo2 = Number(baseline.spo2 || 98)
  let sys = bp.sys
  let dia = bp.dia

  const hasPain = /schmerz|kolik|druckschmerz|platzwunde|schnitt|fraktur/.test(text)
  const hasSyncopeShock = /synkope|kollaps|schock|bewusstlos|hypoton/.test(text) || severity === 'rot'
  const hasResp = /atem|dyspnoe|hypox|giemen|stridor|respir/.test(text)
  const hasInfection = /fieber|infekt|sepsis|pneumonie|tonsill|pharyng/.test(text)
  const isCritical = severity === 'rot' || /rea|reanimationspflicht|atemstillstand/.test(text)

  if (hasPain) {
    hr += 8
    sys += 6
    dia += 4
  }
  if (hasSyncopeShock) {
    hr += 12
    sys -= 16
    dia -= 10
  }
  if (hasResp) {
    rr += 4
    spo2 -= 4
    hr += 4
  }
  if (hasInfection) {
    temp += 0.8
    hr += 6
    rr += 2
  }
  if (arrivalType === 'ambulance') {
    hr += 2
    rr += 1
  }
  if (isCritical) {
    hr = Math.max(hr, 120)
    rr = Math.max(rr, 24)
    spo2 = Math.min(spo2, 86)
    sys = Math.min(sys, 95)
    dia = Math.min(dia, 60)
  }

  hr = Math.max(45, Math.min(165, Math.round(hr)))
  rr = Math.max(8, Math.min(38, Math.round(rr)))
  temp = Math.max(35.0, Math.min(41.0, Number(temp.toFixed(1))))
  spo2 = Math.max(45, Math.min(100, Math.round(spo2)))
  sys = Math.max(45, Math.min(210, Math.round(sys)))
  dia = Math.max(25, Math.min(130, Math.round(dia)))
  if (dia >= sys) dia = Math.max(25, sys - 20)

  return {
    hr,
    bp: `${sys}/${dia}`,
    rr,
    temp,
    spo2,
  }
}

function normalizePastHistory(value) {
  const parts = String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  if (parts.length === 0) return 'Keine Vorerkrankungen'
  const hasNone = parts.some(v => /keine vorerkrankungen/i.test(v))
  if (hasNone) {
    const concrete = parts.filter(v => !/keine vorerkrankungen/i.test(v))
    return concrete.length > 0 ? concrete.join(', ') : 'Keine Vorerkrankungen'
  }
  return parts.join(', ')
}

function buildAnamnesisProfile(isMeme = false) {
  if (isMeme) {
    return {
      allergies: 'Keine bekannt',
      medications: 'Ramipril 5mg morgens',
      pastHistory: 'Keine Vorerkrankungen',
      lastMeal: pick(LAST_MEAL_POOL),
    }
  }
  const medications = pickN(MEDICATIONS_POOL, 1 + Math.floor(Math.random() * 2)).join(', ')
  let pastHistory = ''
  if (medications.includes('Keine regelmaessigen') && Math.random() < 0.35) {
    pastHistory = 'Keine Vorerkrankungen'
  } else {
    const pastHistoryCandidates = PAST_HISTORY_POOL.filter(v => !v.includes('Keine Vorerkrankungen'))
    pastHistory = pickN(pastHistoryCandidates, 1 + Math.floor(Math.random() * 2)).join(', ')
  }
  return {
    allergies: pick(ALLERGIES_POOL),
    medications,
    pastHistory: normalizePastHistory(pastHistory),
    lastMeal: pick(LAST_MEAL_POOL),
  }
}

export function generatePatient(arrivalType, options = {}) {
  patientCounter++
  const special = resolveSpecialPatientType(options?.forceSpecialType)
  const isMale = Math.random() > 0.5
  const naming = pickNameSet(isMale, special?.languageCode)
  const firstName = naming.firstName
  const lastName = naming.lastName
  const age = arrivalType === 'ambulance'
    ? Math.floor(Math.random() * 60) + 20
    : Math.floor(Math.random() * 70) + 15

  const base = generateTemplateCase(arrivalType)
  return buildPatientFromBase(base, arrivalType, firstName, lastName, age, isMale, special)
}

export function generatePatientByDiagnosis(specialty, code, preferredArrivalType = 'walk_in', options = {}) {
  patientCounter++
  const special = resolveSpecialPatientType(options?.forceSpecialType)
  const isMale = Math.random() > 0.5
  const naming = pickNameSet(isMale, special?.languageCode)
  const firstName = naming.firstName
  const lastName = naming.lastName
  const arrivalType = preferredArrivalType === 'ambulance' ? 'ambulance' : 'walk_in'
  const age = arrivalType === 'ambulance'
    ? Math.floor(Math.random() * 60) + 20
    : Math.floor(Math.random() * 70) + 15
  const base = generateTemplateCaseByDiagnosis(specialty, code, arrivalType)
  const finalArrival = base?.preInfo ? 'ambulance' : arrivalType
  return buildPatientFromBase(base, finalArrival, firstName, lastName, age, isMale, special)
}

function buildPatientFromBase(base, arrivalType, firstName, lastName, age, isMale, special = {}) {
  const seededVitals = buildRealisticVitals(base, arrivalType)
  const primaryCode = String(base?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const complaintSeedText = `${base?.complaint || ''} ${(base?.symptoms || []).join(' ')}`.toLowerCase()
  const hasLikelyAsymmetricBpPattern = primaryCode.startsWith('I71')
    || /aortendissektion|dissektion|subclavia|gefäßverschluss|armischämie/.test(complaintSeedText)
  if (hasLikelyAsymmetricBpPattern) {
    const [sysBaseRaw, diaBaseRaw] = String(seededVitals.bp || '120/75').split('/')
    const sysBase = Number.parseInt(sysBaseRaw, 10) || 120
    const diaBase = Number.parseInt(diaBaseRaw, 10) || 75
    const sysDelta = 12 + Math.floor(Math.random() * 23)
    const diaDelta = 6 + Math.floor(Math.random() * 13)
    const leftHigher = Math.random() < 0.5
    const leftSys = leftHigher ? sysBase + sysDelta : Math.max(70, sysBase - sysDelta)
    const rightSys = leftHigher ? Math.max(70, sysBase - sysDelta) : sysBase + sysDelta
    const leftDia = leftHigher ? diaBase + diaDelta : Math.max(40, diaBase - diaDelta)
    const rightDia = leftHigher ? Math.max(40, diaBase - diaDelta) : diaBase + diaDelta
    seededVitals.bpSides = {
      left: `${Math.max(70, Math.min(230, leftSys))}/${Math.max(40, Math.min(140, leftDia))}`,
      right: `${Math.max(70, Math.min(230, rightSys))}/${Math.max(40, Math.min(140, rightDia))}`,
    }
    seededVitals.bp = seededVitals.bpSides[leftHigher ? 'left' : 'right']
  }
  const complaintText = `${base?.complaint || ''} ${(base?.symptoms || []).join(' ')}`.toLowerCase()
  const painSeed = /schmerz|kolik|fraktur|platzwunde|schnitt/.test(complaintText)
    ? 5 + Math.floor(Math.random() * 3)
    : 2 + Math.floor(Math.random() * 2)
  const dyspneaSeed = /atem|dyspnoe|stridor|hypox|lungen/.test(complaintText) ? 4 : 1
  const anamnesisProfile = buildAnamnesisProfile(!!special.anamnesisMeme)
  const hasInfectiousCode = /^(A4|J1[258]|J18|N10|T81\.4|K3[5-7]|K81|L0[23]|R50)/.test(primaryCode)
  const hasInfectiousSymptoms = /fieber|schuettelfrost|schüttelfrost|infekt|pneumonie|husten|eitrig|dysurie|flankenschmerz|wundinfektion|sepsis/.test(complaintSeedText)
  const likelyOpenWound = /wunde|platzwunde|schnitt|offene verletzung|blutung/.test(complaintSeedText) || /^S(0[019]|[3-9]1)\./.test(primaryCode)
  const infectionSeed = hasInfectiousCode || hasInfectiousSymptoms
    ? 2.2 + Math.random() * 1.2
    : (likelyOpenWound ? 0.6 + Math.random() * 0.5 : 0.15 + Math.random() * 0.2)
  return {
    id: `p_${Date.now()}_${patientCounter}`,
    name: `${firstName} ${lastName}`,
    age,
    gender: isMale ? 'männlich' : 'weiblich',
    arrivalType,
    arrivalTime: new Date().toISOString(),
    chiefComplaint: base.complaint,
    symptoms: base.symptoms,
    suggestedTriage: base.severity,
    triageLevel: arrivalType === 'ambulance' ? base.severity : null,
    triaged: arrivalType === 'ambulance',
    vitals: arrivalType === 'ambulance' ? seededVitals : null,
    triageSeedVitals: seededVitals,
    preInfo: base.preInfo || null,
    languageCode: special.languageCode || 'de',
    communicationNeeds: special.communicationNeeds || null,
    psychProfile: special.psychProfile || null,
    anamnesisMeme: !!special.anamnesisMeme,
    allergies: anamnesisProfile.allergies,
    medications: anamnesisProfile.medications,
    pastHistory: anamnesisProfile.pastHistory,
    lastMeal: anamnesisProfile.lastMeal,
    anamnesisProfile,
    wardClothing: 'casual',
    status: arrivalType === 'ambulance' ? 'triaged' : 'waiting_triage',
    assignedRoom: null,
    assignedDoctor: null,
    treatedAt: null,
    notes: [],
    examResults: [],
    diagnoses: { primary: null, secondary: [], chronic: [] },
    careTeam: { primary: null, assistant: [], supervisor: null },
    trueDiagnoses: base.trueDiagnoses || {
      primary: { code: 'R69', name: 'Unbekannte und nicht näher bezeichnete Krankheitsursachen' },
      secondary: [],
      chronic: [],
    },
    patientLog: [
      {
        time: new Date().toISOString(),
        type: 'admission',
        author: 'System',
        text: `Patient aufgenommen. Beratungsanlass: ${base.complaint}.`,
      },
    ],
    clinicalState: {
      stability: arrivalType === 'ambulance' && base.severity === 'rot' ? 'instabil' : 'stabil',
      consciousness: 'wach',
      pain: painSeed,
      dyspnea: dyspneaSeed,
      infectionLoad: Number(infectionSeed.toFixed(2)),
      volumeStatus: 0,
      hemodynamics: 0,
      complaintLevel: 2,
      metabolicStress: 0.5,
      lastUpdatedAt: new Date().toISOString(),
      lastRingAt: null,
      outcome: 'alive',
      resuscitation: {
        active: false,
        rhythm: null,
        startedAt: null,
        lastCycleAt: null,
        cycles: 0,
        cprActive: false,
        roscAt: null,
        failureScore: 0,
        shockCount: 0,
        adrenalineDoses: 0,
        amiodaroneDoses: 0,
        cartFetched: false,
        lastInterventionAt: null,
        lastShockAt: null,
        lastAdrenalineAt: null,
        lastAmiodaroneAt: null,
        lastAtropineAt: null,
        lastNoradrenalineAt: null,
        atropineDoses: 0,
        noradrenalineDoses: 0,
        status: 'none',
      },
    },
    appliedTreatments: [],
    venousAccesses: [],
    vitalsHistory: arrivalType === 'ambulance' && seededVitals ? [{
      time: new Date().toISOString(),
      source: 'admission',
      ...seededVitals,
    }] : [],
    medicationPlan: [],
  }
}

function pickNameSet(isMale, languageCode) {
  if (languageCode === 'en' || languageCode === 'es') {
    const pool = FOREIGN_NAME_POOLS[languageCode]
    return {
      firstName: pick(isMale ? pool.firstM : pool.firstF),
      lastName: pick(pool.last),
    }
  }
  return {
    firstName: pick(isMale ? FIRST_NAMES_M : FIRST_NAMES_F),
    lastName: pick(LAST_NAMES),
  }
}

function resolveSpecialPatientType(forcedType = null) {
  if (forcedType === 'foreign') {
    return { languageCode: Math.random() < 0.5 ? 'en' : 'es' }
  }
  if (forcedType === 'sensory') {
    return { communicationNeeds: Math.random() < 0.5 ? 'deaf' : 'mute' }
  }
  if (forcedType === 'psych') {
    const types = ['aggressive', 'confused', 'psychotic']
    return { psychProfile: { type: pick(types), riskLevel: Math.random() < 0.5 ? 'medium' : 'high' } }
  }
  if (forcedType === 'meme') {
    return { anamnesisMeme: true }
  }

  const result = {}
  if (patientCounter >= nextForeignAt) {
    result.languageCode = Math.random() < 0.5 ? 'en' : 'es'
    nextForeignAt = patientCounter + 30 + Math.floor(Math.random() * 11)
  }
  if (patientCounter >= nextSensoryAt) {
    result.communicationNeeds = Math.random() < 0.5 ? 'deaf' : 'mute'
    nextSensoryAt = patientCounter + 40 + Math.floor(Math.random() * 21)
  }
  if (patientCounter >= nextPsychAt) {
    const types = ['aggressive', 'confused', 'psychotic']
    result.psychProfile = { type: pick(types), riskLevel: Math.random() < 0.5 ? 'medium' : 'high' }
    nextPsychAt = patientCounter + 20 + Math.floor(Math.random() * 11)
  }
  if (patientCounter >= nextSamplerMemeAt) {
    result.anamnesisMeme = true
    nextSamplerMemeAt = patientCounter + 85 + Math.floor(Math.random() * 55)
  }
  return result
}

export { TRIAGE_LEVELS }
export { getDiagnosisListsBySpecialty }
