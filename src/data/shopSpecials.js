export const LEGENDARY_TOOLS = [
  { id: 'clipboard_durchblick', name: 'Ich-Hab-Den-Durchblick Clipboard', price: '14,99€', priceNum: 14.99, rarity: 'Legendary' },
  { id: 'labor_hustler', name: 'Labor Hustler', price: '12,99€', priceNum: 12.99, rarity: 'Legendary' },
  { id: 'goldenes_stethoskop', name: 'Goldenes Stethoskop', price: '19,99€', priceNum: 19.99, rarity: 'Legendary' },
  { id: 'platin_kittel', name: 'Platin Kittel', price: '16,99€', priceNum: 16.99, rarity: 'Legendary' },
  { id: 'ampullarium_traeger', name: 'Ampullarium Traeger', price: '12,99€', priceNum: 12.99, rarity: 'Legendary' },
]

export const UTILITY_PASSES = [
  { id: 'nur_tagschichten', name: 'Nur Tagschichten', price: '4,99€', priceNum: 4.99, durationHours: 72 },
  { id: 'apotheken_dienst', name: 'Apotheken Dienst', price: '3,99€', priceNum: 3.99, durationHours: 48 },
  { id: 'endlich_fachpersonal', name: 'Endlich Fachpersonal', price: '4,99€', priceNum: 4.99, durationHours: 48 },
  { id: 'manv_ausloeser', name: 'MANV Ausloeser', price: '5,99€', priceNum: 5.99, durationHours: 0, oneTime: true },
  { id: 'pocket_guide', name: 'Pocket Guide', price: '2,99€', priceNum: 2.99, durationHours: 48 },
  { id: 'feiertags_wochenend_nachtschicht', name: 'Feiertags Wochenend Nachtschicht', price: '2,49€', priceNum: 2.49, durationHours: 1 },
  { id: 'ansturm_privatpatienten', name: 'Ansturm der Privatpatienten', price: '6,99€', priceNum: 6.99, durationHours: 6 },
]

export const SPECIAL_HARDCAPS = {
  moneyBonusPctCap: 35,
  hintDiscountPctCap: 35,
  medicationDiscountPctCap: 60,
}

export function getSpecialHardcapNotes() {
  return [
    `Max. kombinierter Geldbonus: +${SPECIAL_HARDCAPS.moneyBonusPctCap}%`,
    `Max. kombinierter Hinweis-Rabatt: -${SPECIAL_HARDCAPS.hintDiscountPctCap}%`,
    `Max. kombinierter Medikamenten-Rabatt: -${SPECIAL_HARDCAPS.medicationDiscountPctCap}%`,
  ]
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v || 0)))
}

export function getSpecialState(user) {
  const raw = user?.specialState && typeof user.specialState === 'object' ? user.specialState : {}
  return {
    ownedLegendaryTools: Array.isArray(raw.ownedLegendaryTools) ? raw.ownedLegendaryTools : [],
    utilityPassInventory: raw.utilityPassInventory && typeof raw.utilityPassInventory === 'object' ? raw.utilityPassInventory : {},
    activeLegendaryToolId: raw.activeLegendaryToolId || null,
    legendaryLastSwitchAt: raw.legendaryLastSwitchAt || null,
    activeUtilityPass: raw.activeUtilityPass && typeof raw.activeUtilityPass === 'object' ? raw.activeUtilityPass : null,
    manvTriggerReady: !!raw.manvTriggerReady,
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    honorTitles: Array.isArray(raw.honorTitles) ? raw.honorTitles : [],
    selectedHonorTitle: raw.selectedHonorTitle || null,
  }
}

export function getLegendarySwitchRemainingMs(user, nowMs = Date.now()) {
  const s = getSpecialState(user)
  const last = Date.parse(s.legendaryLastSwitchAt || '')
  if (!Number.isFinite(last)) return 0
  return Math.max(0, (24 * 3600 * 1000) - (nowMs - last))
}

export function canSwitchLegendary(user, nowMs = Date.now()) {
  return getLegendarySwitchRemainingMs(user, nowMs) <= 0
}

export function isCardiologyCode(code) {
  const c = String(code || '').toUpperCase()
  return /^(I2[0-5]|I4[78]|I50|I51|R07)/.test(c)
}

export function getActiveUtilityPass(user, nowMs = Date.now()) {
  const s = getSpecialState(user)
  const p = s.activeUtilityPass
  if (!p?.id) return null
  const expires = Date.parse(p.expiresAt || '')
  if (Number.isFinite(expires) && nowMs > expires) return null
  return p
}

export function getActiveEffects(user, nowMs = Date.now()) {
  const s = getSpecialState(user)
  const activePass = getActiveUtilityPass(user, nowMs)
  const tool = s.activeLegendaryToolId
  const out = {
    hintDiscountPct: 0,
    khCaseMoneyBonusPct: 0,
    rdMoneyBonusPct: 0,
    labCostDiscountPct: 0,
    labSpeedBonusPct: 0,
    cardioCaseMoneyBonusPct: 0,
    cardioMedicationDiscountPct: 0,
    nextRankCourseDiscountPct: 0,
    knowledgeDiscountPct: 0,
    rdCourseDiscountPct: 0,
    allMedicationDiscountPct: 0,
    roomDiscountPct: 0,
    privatePatientMode: false,
    privatePatientMoneyBonusPct: 0,
    nightShiftRushMode: false,
    manvTriggerReady: s.manvTriggerReady,
  }
  if (tool === 'clipboard_durchblick') {
    out.hintDiscountPct += 15
    out.khCaseMoneyBonusPct += 10
  }
  if (tool === 'labor_hustler') {
    out.labCostDiscountPct += 10
    out.labSpeedBonusPct += 20
  }
  if (tool === 'goldenes_stethoskop') {
    out.cardioCaseMoneyBonusPct += 30
    out.cardioMedicationDiscountPct += 50
  }
  if (tool === 'platin_kittel') {
    out.nextRankCourseDiscountPct += 20
    out.knowledgeDiscountPct += 10
  }
  if (tool === 'ampullarium_traeger') {
    out.rdMoneyBonusPct += 10
    out.rdCourseDiscountPct += 10
  }
  if (activePass?.id === 'nur_tagschichten') {
    out.khCaseMoneyBonusPct += 10
    out.rdMoneyBonusPct += 10
  }
  if (activePass?.id === 'apotheken_dienst') out.allMedicationDiscountPct += 20
  if (activePass?.id === 'endlich_fachpersonal') out.roomDiscountPct += 10
  if (activePass?.id === 'pocket_guide') out.hintDiscountPct += 20
  if (activePass?.id === 'ansturm_privatpatienten') {
    out.privatePatientMode = true
    out.privatePatientMoneyBonusPct = 20
  }
  if (activePass?.id === 'feiertags_wochenend_nachtschicht') out.nightShiftRushMode = true

  out.hintDiscountPct = clamp(out.hintDiscountPct, 0, SPECIAL_HARDCAPS.hintDiscountPctCap)
  out.allMedicationDiscountPct = clamp(out.allMedicationDiscountPct, 0, SPECIAL_HARDCAPS.medicationDiscountPctCap)
  out.cardioMedicationDiscountPct = clamp(out.cardioMedicationDiscountPct, 0, SPECIAL_HARDCAPS.medicationDiscountPctCap)
  return out
}

export function getHintCost(cost, user) {
  const fx = getActiveEffects(user)
  const d = clamp(fx.hintDiscountPct, 0, SPECIAL_HARDCAPS.hintDiscountPctCap)
  return Math.max(1, Math.round(Number(cost || 0) * (1 - d / 100)))
}

export function getKnowledgeCost(cost, user) {
  const fx = getActiveEffects(user)
  return Math.max(1, Math.round(Number(cost || 0) * (1 - clamp(fx.knowledgeDiscountPct, 0, 80) / 100)))
}

export function getRdCourseCost(cost, user) {
  const fx = getActiveEffects(user)
  return Math.max(1, Math.round(Number(cost || 0) * (1 - clamp(fx.rdCourseDiscountPct, 0, 80) / 100)))
}

export function getKhCaseMoneyBonusPct(user, diagnosisCode) {
  const fx = getActiveEffects(user)
  let bonus = fx.khCaseMoneyBonusPct
  if (fx.privatePatientMode) bonus += fx.privatePatientMoneyBonusPct
  if (isCardiologyCode(diagnosisCode)) bonus += fx.cardioCaseMoneyBonusPct
  return clamp(bonus, 0, SPECIAL_HARDCAPS.moneyBonusPctCap)
}

export function getRdMoneyBonusPct(user) {
  const fx = getActiveEffects(user)
  return clamp(fx.rdMoneyBonusPct, 0, SPECIAL_HARDCAPS.moneyBonusPctCap)
}

export function getMedicationDiscountPct(user, medCategory) {
  const fx = getActiveEffects(user)
  let discount = fx.allMedicationDiscountPct
  if (String(medCategory || '').toLowerCase() === 'cardiovascular') {
    discount += fx.cardioMedicationDiscountPct
  }
  return clamp(discount, 0, SPECIAL_HARDCAPS.medicationDiscountPctCap)
}

export function getRoomDiscountPct(user) {
  const fx = getActiveEffects(user)
  return clamp(fx.roomDiscountPct, 0, 50)
}

export function getLabOrderCost(cost, user) {
  const fx = getActiveEffects(user)
  return Math.max(0, Math.round(Number(cost || 0) * (1 - clamp(fx.labCostDiscountPct, 0, 80) / 100)))
}

export function getLabReadyAtAdjusted(readyAtIso, user) {
  const fx = getActiveEffects(user)
  const speed = clamp(fx.labSpeedBonusPct, 0, 90)
  if (speed <= 0) return readyAtIso
  const now = Date.now()
  const ready = Date.parse(readyAtIso || '')
  if (!Number.isFinite(ready) || ready <= now) return readyAtIso
  const remaining = ready - now
  const adjusted = now + Math.round(remaining * (1 - speed / 100))
  return new Date(adjusted).toISOString()
}

export function getCourseCostWithSpecials(course, baseCost, user, currentRankLevel) {
  const fx = getActiveEffects(user)
  let discount = 0
  if (String(course?.track || '') === 'rescue') discount += fx.rdCourseDiscountPct
  const step = String(course?.careerStep || '')
  if ((currentRankLevel === 2 && step === 'oberarzt') || (currentRankLevel === 3 && step === 'chefarzt')) {
    discount += fx.nextRankCourseDiscountPct
  }
  return Math.max(1, Math.round(Number(baseCost || 0) * (1 - clamp(discount, 0, 80) / 100)))
}

