const MAX_TREATMENT_ENTRIES = 120

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseBp(bp) {
  if (!bp || typeof bp !== 'string' || !bp.includes('/')) return { sys: 120, dia: 75 }
  const [sysRaw, diaRaw] = bp.split('/')
  const sys = Number.parseInt(sysRaw, 10)
  const dia = Number.parseInt(diaRaw, 10)
  return {
    sys: Number.isFinite(sys) ? sys : 120,
    dia: Number.isFinite(dia) ? dia : 75,
  }
}

function formatBp(sys, dia) {
  return `${Math.round(clamp(sys, 70, 240))}/${Math.round(clamp(dia, 40, 140))}`
}

function ensureVitals(vitals = {}) {
  const source = vitals && typeof vitals === 'object' ? vitals : {}
  const sideSource = source.bpSides && typeof source.bpSides === 'object' ? source.bpSides : null
  return {
    hr: Number.isFinite(source.hr) ? source.hr : 82,
    rr: Number.isFinite(source.rr) ? source.rr : 16,
    temp: Number.isFinite(source.temp) ? source.temp : 36.8,
    spo2: Number.isFinite(source.spo2) ? source.spo2 : 97,
    bp: typeof source.bp === 'string' && source.bp.includes('/') ? source.bp : '120/75',
    bpSides: sideSource ? {
      left: typeof sideSource.left === 'string' && sideSource.left.includes('/') ? sideSource.left : undefined,
      right: typeof sideSource.right === 'string' && sideSource.right.includes('/') ? sideSource.right : undefined,
    } : undefined,
  }
}

function ensureResuscitationState(existing = {}) {
  const source = existing && typeof existing === 'object' ? existing : {}
  return {
    active: !!source.active,
    rhythm: source.rhythm || null,
    startedAt: source.startedAt || null,
    lastCycleAt: source.lastCycleAt || null,
    cycles: Number.isFinite(source.cycles) ? source.cycles : 0,
    cprActive: !!source.cprActive,
    roscAt: source.roscAt || null,
    failureScore: Number.isFinite(source.failureScore) ? source.failureScore : 0,
    shockCount: Number.isFinite(source.shockCount) ? source.shockCount : 0,
    adrenalineDoses: Number.isFinite(source.adrenalineDoses) ? source.adrenalineDoses : 0,
    amiodaroneDoses: Number.isFinite(source.amiodaroneDoses) ? source.amiodaroneDoses : 0,
    cartFetched: !!source.cartFetched,
    lastInterventionAt: source.lastInterventionAt || null,
    lastShockAt: source.lastShockAt || null,
    lastAdrenalineAt: source.lastAdrenalineAt || null,
    lastAmiodaroneAt: source.lastAmiodaroneAt || null,
    lastAtropineAt: source.lastAtropineAt || null,
    lastNoradrenalineAt: source.lastNoradrenalineAt || null,
    atropineDoses: Number.isFinite(source.atropineDoses) ? source.atropineDoses : 0,
    noradrenalineDoses: Number.isFinite(source.noradrenalineDoses) ? source.noradrenalineDoses : 0,
    status: source.status || 'none',
  }
}

function ensureClinicalState(patient) {
  const existing = patient?.clinicalState || {}
  const woundExisting = existing.surgicalWound && typeof existing.surgicalWound === 'object' ? existing.surgicalWound : {}
  const fractureExisting = existing.fractureCare && typeof existing.fractureCare === 'object' ? existing.fractureCare : {}
  return {
    stability: existing.stability || 'stabil',
    consciousness: existing.consciousness || 'wach',
    pain: Number.isFinite(existing.pain) ? existing.pain : 2,
    dyspnea: Number.isFinite(existing.dyspnea) ? existing.dyspnea : 1,
    infectionLoad: Number.isFinite(existing.infectionLoad) ? existing.infectionLoad : 0.5,
    volumeStatus: Number.isFinite(existing.volumeStatus) ? existing.volumeStatus : 0,
    hemodynamics: Number.isFinite(existing.hemodynamics) ? existing.hemodynamics : 0,
    complaintLevel: Number.isFinite(existing.complaintLevel) ? existing.complaintLevel : 1.5,
    metabolicStress: Number.isFinite(existing.metabolicStress) ? existing.metabolicStress : 0.5,
    fluidCarrySys: Number.isFinite(existing.fluidCarrySys) ? existing.fluidCarrySys : 0,
    fluidCarryDia: Number.isFinite(existing.fluidCarryDia) ? existing.fluidCarryDia : 0,
    spo2Carry: Number.isFinite(existing.spo2Carry) ? existing.spo2Carry : 0,
    hrCarry: Number.isFinite(existing.hrCarry) ? existing.hrCarry : 0,
    lastOxygenSupportAt: existing.lastOxygenSupportAt || null,
    spo2Debug: existing.spo2Debug && typeof existing.spo2Debug === 'object' ? existing.spo2Debug : null,
    lastUpdatedAt: existing.lastUpdatedAt || patient?.arrivalTime || new Date().toISOString(),
    lastRingAt: existing.lastRingAt || null,
    outcome: existing.outcome || 'alive',
    vomit: existing.vomit && typeof existing.vomit === 'object'
      ? {
        active: !!existing.vomit.active,
        count: Number.isFinite(existing.vomit.count) ? existing.vomit.count : 0,
        lastAt: existing.vomit.lastAt || null,
        cleanedAt: existing.vomit.cleanedAt || null,
        nextEarliestAt: existing.vomit.nextEarliestAt || null,
        cause: existing.vomit.cause || null,
      }
      : {
        active: false,
        count: 0,
        lastAt: null,
        cleanedAt: null,
        nextEarliestAt: null,
        cause: null,
      },
    surgicalWound: {
      present: !!woundExisting.present,
      cleanliness: Number.isFinite(woundExisting.cleanliness) ? woundExisting.cleanliness : 0,
      closure: Number.isFinite(woundExisting.closure) ? woundExisting.closure : 0,
      dressing: Number.isFinite(woundExisting.dressing) ? woundExisting.dressing : 0,
      infectionStage: Number.isFinite(woundExisting.infectionStage) ? woundExisting.infectionStage : 0,
      lastCleanseAt: woundExisting.lastCleanseAt || null,
      lastSutureAt: woundExisting.lastSutureAt || null,
      lastDressingAt: woundExisting.lastDressingAt || null,
      lastInspectAt: woundExisting.lastInspectAt || null,
    },
    fractureCare: {
      present: !!fractureExisting.present,
      immobilizationQuality: Number.isFinite(fractureExisting.immobilizationQuality) ? fractureExisting.immobilizationQuality : 0,
      dmsChecked: !!fractureExisting.dmsChecked,
      instability: Number.isFinite(fractureExisting.instability) ? fractureExisting.instability : 0.3,
      lastCastAt: fractureExisting.lastCastAt || null,
      lastInspectAt: fractureExisting.lastInspectAt || null,
      lastRecastAt: fractureExisting.lastRecastAt || null,
    },
    resuscitation: ensureResuscitationState(existing.resuscitation),
  }
}

function effectTagsForMedication(medId) {
  const map = {
    atropin: ['chronotropic_support', 'hemodynamic_support'],
    adrenalin: ['chronotropic_support', 'hemodynamic_support'],
    noradrenalin: ['hemodynamic_support'],
    dobutamin: ['hemodynamic_support'],
    salbutamol: ['bronchodilation', 'oxygen_support'],
    ipratropium: ['bronchodilation', 'oxygen_support'],
    prednisolon: ['anti_inflammatory'],
    ringer: ['fluid_resuscitation'],
    nacl09: ['fluid_resuscitation'],
    glucose5: ['fluid_resuscitation'],
    insulin_rapid: ['glucose_control'],
    paracetamol: ['analgesia', 'antipyretic'],
    metamizol: ['analgesia', 'antipyretic'],
    ibuprofen: ['analgesia', 'anti_inflammatory'],
    morphin: ['analgesia'],
    piritramid: ['analgesia'],
    fentanyl: ['analgesia'],
    amoxicillin_clav: ['antibiotic'],
    ceftriaxon: ['antibiotic'],
    piperacillin_tazo: ['antibiotic'],
    ciprofloxacin: ['antibiotic'],
    meropenem: ['antibiotic'],
    vancomycin: ['antibiotic'],
    linezolid: ['antibiotic'],
    clindamycin: ['antibiotic'],
    doxycyclin: ['antibiotic'],
    aspirin: ['antithrombotic', 'analgesia'],
    heparin: ['antithrombotic'],
    enoxaparin: ['antithrombotic'],
    clopidogrel: ['antithrombotic'],
    apixaban: ['antithrombotic'],
    rivaroxaban: ['antithrombotic'],
    vitamin_k: ['coag_support'],
    tranexamsaeure: ['coag_support'],
    nitroglycerin: ['antiischemic', 'analgesia'],
    metoprolol: ['antiischemic', 'hemodynamic_support'],
    amiodaron: ['antiischemic', 'hemodynamic_support'],
    verapamil: ['antiischemic', 'hemodynamic_support'],
    diltiazem: ['antiischemic', 'hemodynamic_support'],
    amlodipin: ['hemodynamic_support'],
    ramipril: ['hemodynamic_support'],
    valsartan: ['hemodynamic_support'],
    furosemid: ['hemodynamic_support'],
    torasemid: ['hemodynamic_support'],
    ephedrin: ['hemodynamic_support'],
    levosimendan: ['hemodynamic_support'],
    digoxin: ['hemodynamic_support'],
    dimenhydrinat: ['anti_inflammatory'],
    ondansetron: ['anti_inflammatory'],
    mcp: ['anti_inflammatory'],
    droperidol: ['anti_inflammatory'],
    loperamid: ['anti_inflammatory'],
    lactulose: ['anti_inflammatory'],
    simeticon: ['anti_inflammatory'],
    tramadol: ['analgesia'],
    tilidin_naloxon: ['analgesia'],
    metamizol_spasm: ['analgesia', 'antipyretic'],
    coxib_etoricoxib: ['analgesia', 'anti_inflammatory'],
    budesonid: ['oxygen_support', 'anti_inflammatory'],
    adrenalin_inhal: ['oxygen_support', 'bronchodilation'],
    theophyllin: ['oxygen_support', 'bronchodilation'],
    acetylcystein: ['oxygen_support'],
    glucagon: ['glucose_control'],
    levothyroxin: ['metabolic_support'],
    thiamazol: ['metabolic_support'],
    thiamin: ['metabolic_support'],
    folsaeure: ['metabolic_support'],
    ferro: ['metabolic_support'],
    hydrocortison: ['anti_inflammatory'],
    insulin_glargin: ['glucose_control'],
    transfusion_ek: ['transfusion_ek'],
    transfusion_ffp: ['transfusion_ffp'],
  }
  return map[medId] || []
}

const EFFECT_PROFILE_BY_ID = {
  atropin: { onsetMin: 0, peakMin: 3, durationMin: 25, influence: { chronotropic: 1.2, hemodynamics: 0.8 } },
  adrenalin: { onsetMin: 0, peakMin: 2, durationMin: 15, influence: { chronotropic: 1.4, hemodynamics: 1.2 } },
  noradrenalin: { onsetMin: 1, peakMin: 6, durationMin: 30, influence: { hemodynamics: 1.3 } },
  dobutamin: { onsetMin: 2, peakMin: 8, durationMin: 35, influence: { hemodynamics: 1.1, chronotropic: 0.35 } },
  salbutamol: { onsetMin: 2, peakMin: 10, durationMin: 50, influence: { oxygenation: 0.8, dyspneaRelief: 1.0 } },
  ipratropium: { onsetMin: 5, peakMin: 18, durationMin: 90, influence: { oxygenation: 0.6, dyspneaRelief: 0.7 } },
  prednisolon: { onsetMin: 35, peakMin: 120, durationMin: 480, influence: { inflammationControl: 0.7 } },
  ringer: { onsetMin: 5, peakMin: 25, durationMin: 120, influence: { volumeResuscitation: 1.0 } },
  nacl09: { onsetMin: 5, peakMin: 25, durationMin: 120, influence: { volumeResuscitation: 0.9 } },
  glucose5: { onsetMin: 8, peakMin: 35, durationMin: 110, influence: { volumeResuscitation: 0.45, metabolicControl: 0.2 } },
  insulin_rapid: { onsetMin: 8, peakMin: 45, durationMin: 180, influence: { metabolicControl: 1.2 } },
  paracetamol: { onsetMin: 12, peakMin: 40, durationMin: 240, influence: { analgesia: 0.45, antipyresis: 0.7 } },
  metamizol: { onsetMin: 8, peakMin: 35, durationMin: 220, influence: { analgesia: 0.8, antipyresis: 0.8 } },
  ibuprofen: { onsetMin: 20, peakMin: 90, durationMin: 360, influence: { analgesia: 0.55, antiInflammatory: 0.5, antipyresis: 0.5 } },
  morphin: { onsetMin: 2, peakMin: 12, durationMin: 180, influence: { analgesia: 1.25, dyspneaRelief: 0.4 } },
  piritramid: { onsetMin: 3, peakMin: 15, durationMin: 200, influence: { analgesia: 1.0 } },
  fentanyl: { onsetMin: 1, peakMin: 8, durationMin: 70, influence: { analgesia: 1.3 } },
  amoxicillin_clav: { onsetMin: 90, peakMin: 300, durationMin: 720, influence: { antibioticControl: 0.6 } },
  ceftriaxon: { onsetMin: 80, peakMin: 280, durationMin: 840, influence: { antibioticControl: 0.8 } },
  piperacillin_tazo: { onsetMin: 70, peakMin: 240, durationMin: 720, influence: { antibioticControl: 1.0 } },
  ciprofloxacin: { onsetMin: 100, peakMin: 320, durationMin: 720, influence: { antibioticControl: 0.65 } },
  meropenem: { onsetMin: 60, peakMin: 220, durationMin: 780, influence: { antibioticControl: 1.2 } },
  vancomycin: { onsetMin: 90, peakMin: 340, durationMin: 840, influence: { antibioticControl: 0.95 } },
  linezolid: { onsetMin: 80, peakMin: 280, durationMin: 720, influence: { antibioticControl: 1.05 } },
  clindamycin: { onsetMin: 70, peakMin: 240, durationMin: 600, influence: { antibioticControl: 0.7 } },
  doxycyclin: { onsetMin: 100, peakMin: 320, durationMin: 720, influence: { antibioticControl: 0.7 } },
  enoxaparin: { onsetMin: 30, peakMin: 120, durationMin: 720, influence: { coagSupport: 0.45 } },
  clopidogrel: { onsetMin: 60, peakMin: 240, durationMin: 1440, influence: { coagSupport: 0.35 } },
  apixaban: { onsetMin: 40, peakMin: 180, durationMin: 720, influence: { coagSupport: 0.55 } },
  rivaroxaban: { onsetMin: 40, peakMin: 180, durationMin: 720, influence: { coagSupport: 0.55 } },
  vitamin_k: { onsetMin: 90, peakMin: 360, durationMin: 1440, influence: { coagSupport: 0.75 } },
  tranexamsaeure: { onsetMin: 8, peakMin: 30, durationMin: 240, influence: { coagSupport: 0.9 } },
  amiodaron: { onsetMin: 3, peakMin: 15, durationMin: 240, influence: { hemodynamics: 0.45, chronotropic: 0.5 } },
  verapamil: { onsetMin: 2, peakMin: 10, durationMin: 180, influence: { hemodynamics: 0.3, chronotropic: 0.45 } },
  diltiazem: { onsetMin: 2, peakMin: 10, durationMin: 180, influence: { hemodynamics: 0.3, chronotropic: 0.4 } },
  amlodipin: { onsetMin: 40, peakMin: 180, durationMin: 1440, influence: { hemodynamics: 0.25 } },
  ramipril: { onsetMin: 30, peakMin: 120, durationMin: 1440, influence: { hemodynamics: 0.22 } },
  valsartan: { onsetMin: 30, peakMin: 120, durationMin: 1440, influence: { hemodynamics: 0.22 } },
  furosemid: { onsetMin: 5, peakMin: 25, durationMin: 180, influence: { hemodynamics: 0.35 } },
  torasemid: { onsetMin: 8, peakMin: 30, durationMin: 220, influence: { hemodynamics: 0.35 } },
  ephedrin: { onsetMin: 1, peakMin: 6, durationMin: 40, influence: { hemodynamics: 0.7, chronotropic: 0.25 } },
  levosimendan: { onsetMin: 20, peakMin: 120, durationMin: 480, influence: { hemodynamics: 1.0 } },
  digoxin: { onsetMin: 20, peakMin: 90, durationMin: 720, influence: { chronotropic: 0.3, hemodynamics: 0.2 } },
  dimenhydrinat: { onsetMin: 6, peakMin: 20, durationMin: 180, influence: { antiInflammatory: 0.2 } },
  ondansetron: { onsetMin: 5, peakMin: 18, durationMin: 180, influence: { antiInflammatory: 0.25 } },
  mcp: { onsetMin: 6, peakMin: 25, durationMin: 150, influence: { antiInflammatory: 0.2 } },
  droperidol: { onsetMin: 4, peakMin: 18, durationMin: 160, influence: { antiInflammatory: 0.22 } },
  loperamid: { onsetMin: 20, peakMin: 80, durationMin: 360, influence: { antiInflammatory: 0.12 } },
  lactulose: { onsetMin: 60, peakMin: 240, durationMin: 600, influence: { antiInflammatory: 0.1 } },
  simeticon: { onsetMin: 15, peakMin: 60, durationMin: 180, influence: { antiInflammatory: 0.1 } },
  tramadol: { onsetMin: 5, peakMin: 20, durationMin: 240, influence: { analgesia: 0.8 } },
  tilidin_naloxon: { onsetMin: 20, peakMin: 60, durationMin: 300, influence: { analgesia: 0.7 } },
  metamizol_spasm: { onsetMin: 15, peakMin: 50, durationMin: 260, influence: { analgesia: 0.65, antipyresis: 0.5 } },
  coxib_etoricoxib: { onsetMin: 25, peakMin: 90, durationMin: 720, influence: { analgesia: 0.5, antiInflammatory: 0.45 } },
  budesonid: { onsetMin: 20, peakMin: 90, durationMin: 360, influence: { oxygenation: 0.35, antiInflammatory: 0.5 } },
  adrenalin_inhal: { onsetMin: 1, peakMin: 8, durationMin: 70, influence: { oxygenation: 0.55, dyspneaRelief: 0.45 } },
  theophyllin: { onsetMin: 10, peakMin: 35, durationMin: 280, influence: { oxygenation: 0.4, dyspneaRelief: 0.35 } },
  acetylcystein: { onsetMin: 20, peakMin: 70, durationMin: 300, influence: { oxygenation: 0.2 } },
  glucagon: { onsetMin: 3, peakMin: 15, durationMin: 60, influence: { metabolicControl: 0.7 } },
  levothyroxin: { onsetMin: 180, peakMin: 720, durationMin: 2880, influence: { metabolicControl: 0.1 } },
  thiamazol: { onsetMin: 180, peakMin: 720, durationMin: 2880, influence: { metabolicControl: 0.1 } },
  thiamin: { onsetMin: 20, peakMin: 80, durationMin: 720, influence: { metabolicControl: 0.15 } },
  folsaeure: { onsetMin: 120, peakMin: 480, durationMin: 2880, influence: { metabolicControl: 0.08 } },
  ferro: { onsetMin: 120, peakMin: 480, durationMin: 2880, influence: { metabolicControl: 0.08 } },
  hydrocortison: { onsetMin: 25, peakMin: 90, durationMin: 360, influence: { antiInflammatory: 0.6 } },
  insulin_glargin: { onsetMin: 60, peakMin: 240, durationMin: 1440, influence: { metabolicControl: 0.65 } },
  transfusion_ek: { onsetMin: 8, peakMin: 35, durationMin: 280, influence: { transfusionSupport: 1.2, hemodynamics: 0.7 } },
  transfusion_ffp: { onsetMin: 10, peakMin: 40, durationMin: 260, influence: { transfusionSupport: 0.8, coagSupport: 0.9 } },
  ventilator_start: { onsetMin: 0, peakMin: 4, durationMin: 180, influence: { oxygenation: 1.3, dyspneaRelief: 1.0 } },
  intubate: { onsetMin: 0, peakMin: 6, durationMin: 240, influence: { oxygenation: 1.2, dyspneaRelief: 0.9 } },
  oxygen_apply: { onsetMin: 0, peakMin: 4, durationMin: 120, influence: { oxygenation: 0.8, dyspneaRelief: 0.5 } },
  defibrillate: { onsetMin: 0, peakMin: 1, durationMin: 6, influence: { hemodynamics: 1.0, chronotropic: 0.7 } },
  cardioversion: { onsetMin: 0, peakMin: 2, durationMin: 12, influence: { hemodynamics: 0.9, chronotropic: 0.6 } },
  infusion_nacl: { onsetMin: 4, peakMin: 18, durationMin: 140, influence: { volumeResuscitation: 0.8 } },
  infusion_ringer: { onsetMin: 4, peakMin: 18, durationMin: 140, influence: { volumeResuscitation: 0.9 } },
  infusion_glucose5: { onsetMin: 6, peakMin: 25, durationMin: 120, influence: { volumeResuscitation: 0.4, metabolicControl: 0.2 } },
  wound_cleanse: { onsetMin: 3, peakMin: 20, durationMin: 180, influence: { antiInflammatory: 0.4, analgesia: 0.25 } },
  wound_suture: { onsetMin: 2, peakMin: 25, durationMin: 360, influence: { analgesia: 0.35, hemodynamics: 0.15 } },
  wound_dressing: { onsetMin: 2, peakMin: 20, durationMin: 220, influence: { antiInflammatory: 0.25, analgesia: 0.2 } },
  cast_apply: { onsetMin: 4, peakMin: 30, durationMin: 480, influence: { analgesia: 0.4, hemodynamics: 0.1 } },
  oral_suction: { onsetMin: 0, peakMin: 4, durationMin: 35, influence: { oxygenation: 0.45, dyspneaRelief: 0.4 } },
  endo_suction: { onsetMin: 0, peakMin: 4, durationMin: 45, influence: { oxygenation: 0.65, dyspneaRelief: 0.55 } },
}

function profileForId(id) {
  return EFFECT_PROFILE_BY_ID[id] || null
}

function effectIntensity(entry, nowMs = Date.now()) {
  const ts = Date.parse(entry?.time || '')
  if (!Number.isFinite(ts)) return 0
  const profile = entry?.effectProfile || profileForId(entry?.id)
  if (!profile) return 0
  const elapsedMin = (nowMs - ts) / 60000
  if (elapsedMin < 0) return 0
  const onset = Number(profile.onsetMin || 0)
  const peak = Math.max(onset, Number(profile.peakMin || onset + 1))
  const end = Math.max(peak + 0.1, Number(profile.durationMin || peak + 1))
  if (elapsedMin < onset || elapsedMin > end) return 0
  if (elapsedMin <= peak) {
    const rise = (elapsedMin - onset) / Math.max(0.1, peak - onset)
    return clamp(rise, 0, 1)
  }
  const fall = (end - elapsedMin) / Math.max(0.1, end - peak)
  return clamp(fall, 0, 1)
}

export function getCurrentTreatmentInfluence(patient, nowMs = Date.now()) {
  const total = {
    analgesia: 0,
    oxygenation: 0,
    dyspneaRelief: 0,
    hemodynamics: 0,
    chronotropic: 0,
    antibioticControl: 0,
    volumeResuscitation: 0,
    antipyresis: 0,
    metabolicControl: 0,
    antiInflammatory: 0,
    transfusionSupport: 0,
    coagSupport: 0,
  }
  for (const entry of patient?.appliedTreatments || []) {
    if (entry?.id === 'oxygen_start') continue
    const profile = entry?.effectProfile || profileForId(entry?.id)
    if (!profile?.influence) continue
    const intensity = effectIntensity(entry, nowMs)
    if (intensity <= 0) continue
    Object.entries(profile.influence).forEach(([k, v]) => {
      if (total[k] == null) total[k] = 0
      total[k] += Number(v || 0) * intensity
    })
  }
  return total
}

export function getTreatmentLabModifiers(patient, nowMs = Date.now()) {
  const inf = getCurrentTreatmentInfluence(patient, nowMs)
  const clinicalState = ensureClinicalState(patient)
  const woundInfection = clamp(Number(clinicalState?.surgicalWound?.infectionStage || 0) / 100, 0, 1.3)
  const systemicInfection = clamp(Number(clinicalState?.infectionLoad || 0) / 10, 0, 1.3)
  const infectiousBurden = clamp((systemicInfection * 0.6) + (woundInfection * 0.4), 0, 1.4)
  return {
    inflammationFactor: clamp(
      1 - inf.antibioticControl * 0.09 - inf.antiInflammatory * 0.04 + infectiousBurden * 0.32,
      0.65,
      1.45
    ),
    coagFactor: clamp(1 - inf.coagSupport * 0.08, 0.7, 1.2),
    lactateFactor: clamp(1 - inf.hemodynamics * 0.03 - inf.volumeResuscitation * 0.02 + infectiousBurden * 0.16, 0.7, 1.35),
    hbFactor: clamp(1 + inf.transfusionSupport * 0.05, 0.85, 1.25),
    glucoseFactor: clamp(1 - inf.metabolicControl * 0.08, 0.65, 1.3),
  }
}

function effectTagsForAction(actionId) {
  const map = {
    ventilator_start: ['oxygen_support'],
    intubate: ['oxygen_support'],
    defibrillate: ['hemodynamic_support'],
    cardioversion: ['hemodynamic_support'],
    oxygen_apply: ['oxygen_support'],
    infusion_nacl: ['fluid_resuscitation'],
    infusion_ringer: ['fluid_resuscitation'],
    infusion_glucose5: ['fluid_resuscitation'],
    transfusion_ek: ['transfusion_ek'],
    transfusion_ffp: ['transfusion_ffp'],
    auscultation: ['diagnostic_action'],
    advanced_assessment: ['diagnostic_action'],
    wound_cleanse: ['surgical_care', 'anti_inflammatory'],
    wound_suture: ['surgical_care', 'analgesia'],
    wound_dressing: ['surgical_care'],
    wound_inspect: ['diagnostic_action', 'surgical_care'],
    fracture_inspect: ['diagnostic_action', 'surgical_care'],
    cast_apply: ['surgical_care', 'analgesia'],
    fracture_stabilize: ['surgical_care', 'analgesia'],
    oral_suction: ['oxygen_support'],
    endo_suction: ['oxygen_support'],
  }
  return map[actionId] || []
}

function pushTreatmentEntry(patient, entry) {
  const applied = [...(patient.appliedTreatments || []), entry]
  const trimmed = applied.length > MAX_TREATMENT_ENTRIES ? applied.slice(applied.length - MAX_TREATMENT_ENTRIES) : applied
  return trimmed
}

export function hasRecentEffectTag(patient, tags, withinMinutes, now = Date.now()) {
  const search = Array.isArray(tags) ? tags : [tags]
  const threshold = now - withinMinutes * 60000
  return (patient?.appliedTreatments || []).some(entry => {
    const ts = Date.parse(entry.time || '')
    if (!Number.isFinite(ts) || ts < threshold) return false
    return (entry.effectTags || []).some(tag => search.includes(tag))
  })
}

export function minutesSinceFirstTag(patient, tags, now = Date.now()) {
  const search = Array.isArray(tags) ? tags : [tags]
  const times = (patient?.appliedTreatments || [])
    .filter(entry => (entry.effectTags || []).some(tag => search.includes(tag)))
    .map(entry => Date.parse(entry.time || ''))
    .filter(Number.isFinite)
  if (times.length === 0) return null
  return (now - Math.min(...times)) / 60000
}

export function applyMedicationToPatient(patient, medId, medName, author = 'Arzt', nowIso = new Date().toISOString()) {
  const vitals = ensureVitals(patient?.vitals)
  const bp = parseBp(vitals.bp)
  const clinicalState = ensureClinicalState(patient)
  const effectTags = effectTagsForMedication(medId)
  let effectSummary = ''

  if (effectTags.includes('fluid_resuscitation')) {
    clinicalState.volumeStatus = clamp(clinicalState.volumeStatus + 0.35, -10, 10)
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.22, -10, 10)
    vitals.hr = Math.round(clamp(vitals.hr - 1, 30, 200))
    effectSummary = 'Volumenersatz eingeleitet'
  }
  if (effectTags.includes('oxygen_support') || effectTags.includes('bronchodilation')) {
    clinicalState.dyspnea = clamp(clinicalState.dyspnea - 0.5, 0, 10)
    vitals.spo2 = Math.round(clamp(vitals.spo2 + 1, 0, 100))
    effectSummary = effectSummary || 'Atmung symptomatisch verbessert'
  }
  if (effectTags.includes('chronotropic_support')) {
    vitals.hr = Math.round(clamp(vitals.hr + 3, 30, 200))
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.45, -10, 10)
    effectSummary = effectSummary || 'Herzfrequenz kreislaufwirksam angehoben'
  }
  if (effectTags.includes('analgesia')) {
    clinicalState.pain = clamp(clinicalState.pain - 0.9, 0, 10)
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - 0.35, 0, 10)
    effectSummary = effectSummary || 'Schmerzen reduziert'
  }
  if (effectTags.includes('antipyretic')) {
    vitals.temp = +clamp(vitals.temp - 0.05, 33, 42).toFixed(1)
    effectSummary = effectSummary || 'Temperatur gesenkt'
  }
  if (effectTags.includes('antibiotic')) {
    clinicalState.infectionLoad = clamp(clinicalState.infectionLoad - 0.05, 0, 10)
    effectSummary = effectSummary || 'Antibiose angesetzt (verzögerte Wirkung)'
  }
  if (effectTags.includes('glucose_control')) {
    clinicalState.metabolicStress = clamp(clinicalState.metabolicStress - 0.4, 0, 10)
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - 0.2, 0, 10)
    effectSummary = effectSummary || 'Metabolische Entgleisung gebessert'
  }
  if (effectTags.includes('transfusion_ek')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.4, -10, 10)
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - 0.15, 0, 10)
    effectSummary = effectSummary || 'Erythrozytenkonzentrat transfundiert'
  }
  if (effectTags.includes('transfusion_ffp')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.25, -10, 10)
    effectSummary = effectSummary || 'Plasmatransfusion (FFP) durchgeführt'
  }
  if (effectTags.includes('hemodynamic_support')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.22, -10, 10)
    const nextSys = clamp(bp.sys + 2, 0, 240)
    const nextDia = clamp(bp.dia + 1, 0, 140)
    vitals.bp = formatBp(nextSys, nextDia)
    effectSummary = effectSummary || 'Kreislauf stabilisiert'
  }
  if (effectTags.includes('antiischemic')) {
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - 0.3, 0, 10)
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.12, -10, 10)
    vitals.hr = Math.round(clamp(vitals.hr - 1, 30, 200))
    effectSummary = effectSummary || 'Kardiale Ischaemiesymptomatik gebessert'
  }
  if (effectTags.includes('antithrombotic')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.08, -10, 10)
    effectSummary = effectSummary || 'Antithrombotische Therapie eingeleitet'
  }
  if (effectTags.includes('coag_support')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.1, -10, 10)
    effectSummary = effectSummary || 'Gerinnungsrelevante Therapie durchgeführt'
  }
  if (effectTags.includes('anti_inflammatory')) {
    clinicalState.infectionLoad = clamp(clinicalState.infectionLoad - 0.03, 0, 10)
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - 0.08, 0, 10)
    effectSummary = effectSummary || 'Entzündungssymptome symptomatisch gebessert'
  }

  const updated = {
    ...patient,
    vitals: {
      ...vitals,
      bp: typeof vitals.bp === 'string' && vitals.bp.includes('/') ? vitals.bp : formatBp(bp.sys, bp.dia),
    },
    clinicalState: {
      ...clinicalState,
      lastUpdatedAt: nowIso,
    },
    appliedTreatments: pushTreatmentEntry(patient, {
      kind: 'medication',
      id: medId,
      name: medName,
      author,
      effectTags,
      effectProfile: profileForId(medId),
      time: nowIso,
    }),
  }

  return { patient: updated, effectSummary }
}

const DIAGNOSTIC_INTERVENTION_EFFECTS = {
  hkl_kontrast: { label: 'Kontrastmittel (Koronarangiographie)', hemodynamics: -0.12, metabolicStress: 0.22, complaint: -0.15 },
  hkl_ballon: { label: 'Ballondilatation', hemodynamics: 0.9, pain: -1.1, complaint: -0.8 },
  hkl_stent: { label: 'Stentimplantation', hemodynamics: 1.1, pain: -1.2, complaint: -1.0 },
  hkl_thrombusaspiration: { label: 'Thrombusaspiration', hemodynamics: 0.6, complaint: -0.5 },
  hkl_fibrinolyse: { label: 'Fibrinolyse', hemodynamics: 0.4, complaint: -0.4, metabolicStress: -0.2 },
  ekg_antiarrhythmisch: { label: 'Antiarrhythmische Therapie', hemodynamics: 0.35, complaint: -0.25 },
  langzeit_rr_antihypertensiv: { label: 'Antihypertensive Therapie', hemodynamics: 0.3, complaint: -0.2 },
  spiro_bronchodilatator: { label: 'Bronchodilatator-Test/Therapie', dyspnea: -0.7, complaint: -0.35 },
  eeg_antikonvulsiv: { label: 'Antikonvulsive Therapie', metabolicStress: -0.4, complaint: -0.3 },
}

function applyDiagnosticInterventionDelta(clinicalState, vitals, effect) {
  if (!effect) return
  if (Number.isFinite(effect.hemodynamics)) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + effect.hemodynamics, -10, 10)
  }
  if (Number.isFinite(effect.pain)) {
    clinicalState.pain = clamp(clinicalState.pain + effect.pain, 0, 10)
  }
  if (Number.isFinite(effect.dyspnea)) {
    clinicalState.dyspnea = clamp(clinicalState.dyspnea + effect.dyspnea, 0, 10)
    vitals.spo2 = Math.round(clamp(vitals.spo2 + Math.abs(effect.dyspnea) * 0.8, 0, 100))
  }
  if (Number.isFinite(effect.complaint)) {
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + effect.complaint, 0, 10)
  }
  if (Number.isFinite(effect.metabolicStress)) {
    clinicalState.metabolicStress = clamp(clinicalState.metabolicStress + effect.metabolicStress, 0, 10)
  }
}

export function applyActionToPatient(patient, actionId, actionName, author = 'Arzt', nowIso = new Date().toISOString()) {
  const vitals = ensureVitals(patient?.vitals)
  const clinicalState = ensureClinicalState(patient)
  const effectTags = effectTagsForAction(actionId)
  let effectSummary = ''

  const nextWound = { ...clinicalState.surgicalWound }
  const nextFracture = { ...clinicalState.fractureCare }
  const actionLower = String(actionId || '').toLowerCase()
  const actionNameLower = String(actionName || '').toLowerCase()
  const parseImmobilizationQuality = () => {
    if (actionNameLower.includes('stabil')) return 0.92
    if (actionNameLower.includes('ausreichend')) return 0.74
    if (actionNameLower.includes('kritisch')) return 0.46
    return 0.68
  }

  if (actionLower.startsWith('wound_')) {
    nextWound.present = true
    if (actionId === 'wound_cleanse') {
      nextWound.cleanliness = clamp(nextWound.cleanliness + 0.38, 0, 1)
      nextWound.infectionStage = clamp(nextWound.infectionStage - 8, 0, 100)
      nextWound.lastCleanseAt = nowIso
    } else if (actionId === 'wound_suture') {
      nextWound.closure = clamp(nextWound.closure + 0.34, 0, 1)
      nextWound.infectionStage = clamp(nextWound.infectionStage - 4, 0, 100)
      nextWound.lastSutureAt = nowIso
    } else if (actionId === 'wound_dressing') {
      nextWound.dressing = clamp(nextWound.dressing + 0.42, 0, 1)
      nextWound.infectionStage = clamp(nextWound.infectionStage - 5, 0, 100)
      nextWound.lastDressingAt = nowIso
    } else if (actionId === 'wound_inspect') {
      nextWound.lastInspectAt = nowIso
      effectSummary = effectSummary || 'Wundkontrolle dokumentiert'
    }
  }

  if (actionId === 'fracture_stabilize' || actionId === 'cast_apply' || actionId === 'fracture_inspect') {
    nextFracture.present = true
    if (actionId === 'fracture_stabilize') {
      nextFracture.instability = clamp(nextFracture.instability - 0.18, 0, 1)
      nextFracture.immobilizationQuality = clamp(Math.max(nextFracture.immobilizationQuality, 0.55), 0, 1)
    }
    if (actionId === 'cast_apply') {
      const quality = parseImmobilizationQuality()
      nextFracture.immobilizationQuality = clamp((nextFracture.immobilizationQuality * 0.35) + (quality * 0.65), 0, 1)
      nextFracture.instability = clamp(nextFracture.instability - 0.28, 0, 1)
      nextFracture.dmsChecked = true
      nextFracture.lastCastAt = nowIso
      nextFracture.lastRecastAt = nowIso
    }
    if (actionId === 'fracture_inspect') {
      nextFracture.lastInspectAt = nowIso
      effectSummary = effectSummary || 'Fraktur-/Gipskontrolle dokumentiert'
    }
  }

  if (effectTags.includes('oxygen_support')) {
    clinicalState.dyspnea = clamp(clinicalState.dyspnea - 0.35, 0, 10)
    vitals.spo2 = Math.round(clamp(vitals.spo2 + 1, 0, 100))
    effectSummary = 'Sauerstoff-/Atemunterstützung wirkt symptomatisch'
  }
  if (effectTags.includes('hemodynamic_support')) {
    clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.35, -10, 10)
    effectSummary = effectSummary || 'Kreislaufmaßnahme durchgeführt'
  }

  const diagIx = DIAGNOSTIC_INTERVENTION_EFFECTS[actionId]
  if (diagIx) {
    applyDiagnosticInterventionDelta(clinicalState, vitals, diagIx)
    effectSummary = effectSummary || diagIx.label
  }

  const updated = {
    ...patient,
    vitals: {
      ...vitals,
      bp: vitals.bp || '120/75',
    },
    clinicalState: {
      ...clinicalState,
      surgicalWound: nextWound,
      fractureCare: nextFracture,
      lastUpdatedAt: nowIso,
    },
    appliedTreatments: pushTreatmentEntry(patient, {
      kind: 'action',
      id: actionId,
      name: actionName,
      author,
      effectTags,
      effectProfile: profileForId(actionId),
      time: nowIso,
    }),
  }

  return { patient: updated, effectSummary }
}

export function applyDiagnosticInterventions(patient, interventions = [], author = 'Arzt', nowIso = new Date().toISOString()) {
  if (!Array.isArray(interventions) || interventions.length === 0) {
    return { patient, summary: '' }
  }
  const vitals = ensureVitals(patient?.vitals)
  const clinicalState = ensureClinicalState(patient)
  const selected = interventions
    .map(id => DIAGNOSTIC_INTERVENTION_EFFECTS[id])
    .filter(Boolean)
  if (selected.length === 0) return { patient, summary: '' }

  selected.forEach(effect => applyDiagnosticInterventionDelta(clinicalState, vitals, effect))

  const summary = selected.map(s => s.label).join(', ')
  const updated = {
    ...patient,
    vitals: {
      ...vitals,
      bp: vitals.bp || '120/75',
    },
    clinicalState: {
      ...clinicalState,
      stability: clinicalState.hemodynamics > -1 ? 'stabil' : clinicalState.stability,
      lastUpdatedAt: nowIso,
    },
    appliedTreatments: pushTreatmentEntry(patient, {
      kind: 'diagnostic_intervention',
      id: 'diagnostic_bundle',
      name: summary,
      author,
      effectTags: ['diagnostic_intervention'],
      time: nowIso,
    }),
  }
  return { patient: updated, summary }
}

export { ensureClinicalState, ensureVitals, ensureResuscitationState }
