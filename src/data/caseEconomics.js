const DEFAULT_ECONOMICS = {
  baseRevenue: 1600,
  minHours: 2,
  optimalMinHours: 6,
  optimalMaxHours: 30,
  maxHours: 54,
}

const ECONOMICS_BY_CODE_PREFIX = {
  I21: { baseRevenue: 3500, minHours: 8, optimalMinHours: 20, optimalMaxHours: 72, maxHours: 120 },
  I26: { baseRevenue: 3200, minHours: 8, optimalMinHours: 18, optimalMaxHours: 60, maxHours: 96 },
  I63: { baseRevenue: 3700, minHours: 10, optimalMinHours: 24, optimalMaxHours: 84, maxHours: 140 },
  T07: { baseRevenue: 4500, minHours: 16, optimalMinHours: 36, optimalMaxHours: 120, maxHours: 180 },
  S32: { baseRevenue: 2900, minHours: 10, optimalMinHours: 24, optimalMaxHours: 84, maxHours: 140 },
  T78: { baseRevenue: 2700, minHours: 4, optimalMinHours: 10, optimalMaxHours: 36, maxHours: 60 },
  J18: { baseRevenue: 1950, minHours: 6, optimalMinHours: 18, optimalMaxHours: 72, maxHours: 120 },
  J45: { baseRevenue: 1850, minHours: 4, optimalMinHours: 10, optimalMaxHours: 36, maxHours: 72 },
  K35: { baseRevenue: 2350, minHours: 8, optimalMinHours: 20, optimalMaxHours: 60, maxHours: 96 },
  R10: { baseRevenue: 1500, minHours: 4, optimalMinHours: 10, optimalMaxHours: 30, maxHours: 60 },
  F41: { baseRevenue: 1250, minHours: 2, optimalMinHours: 6, optimalMaxHours: 18, maxHours: 36 },
  H81: { baseRevenue: 1100, minHours: 2, optimalMinHours: 4, optimalMaxHours: 16, maxHours: 30 },
  S51: { baseRevenue: 1050, minHours: 1, optimalMinHours: 3, optimalMaxHours: 12, maxHours: 24 },
  L50: { baseRevenue: 1050, minHours: 1, optimalMinHours: 3, optimalMaxHours: 12, maxHours: 24 },
}

export function getEconomicsForDiagnosis(code) {
  if (!code) return DEFAULT_ECONOMICS
  const normalized = String(code).trim().toUpperCase()
  const matchedPrefix = Object.keys(ECONOMICS_BY_CODE_PREFIX)
    .sort((a, b) => b.length - a.length)
    .find(prefix => normalized.startsWith(prefix))
  return matchedPrefix ? ECONOMICS_BY_CODE_PREFIX[matchedPrefix] : DEFAULT_ECONOMICS
}

export function getElapsedHours(patient) {
  if (!patient) return 0
  const startIso = patient.treatedAt || patient.arrivalTime
  if (!startIso) return 0
  const elapsedMs = Date.now() - new Date(startIso).getTime()
  return Math.max(0, elapsedMs / (1000 * 60 * 60))
}

export function evaluateCaseTiming(patient) {
  const code = patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || ''
  const cfg = getEconomicsForDiagnosis(code)
  const elapsedHours = getElapsedHours(patient)
  const billable = elapsedHours >= cfg.minHours
  const inOptimalRange = elapsedHours >= cfg.optimalMinHours && elapsedHours <= cfg.optimalMaxHours
  const overtime = elapsedHours > cfg.maxHours
  return {
    ...cfg,
    elapsedHours,
    billable,
    inOptimalRange,
    overtime,
  }
}

export function estimateCaseRevenue(patient, diagnosisCorrect, checklistSummary = null) {
  const timing = evaluateCaseTiming(patient)
  let multiplier = 1
  if (!diagnosisCorrect) multiplier *= 0.62
  if (!timing.billable) multiplier *= 0.28
  if (timing.inOptimalRange) multiplier *= 1.15
  if (timing.overtime) {
    const overtimeFactor = Math.min(0.6, (timing.elapsedHours - timing.maxHours) / timing.maxHours)
    multiplier *= Math.max(0.35, 1 - overtimeFactor)
  }
  if (checklistSummary) {
    const scoreFactor = clamp(0.55, 1.08, 0.55 + (checklistSummary.score || 0) / 115)
    multiplier *= scoreFactor
    const therapyPercent = Number(checklistSummary.therapyPercent || 0)
    const therapyFactor = clamp(0.35, 1.08, 0.35 + therapyPercent / 100)
    multiplier *= therapyFactor
    if (checklistSummary.readyForDischarge === false) {
      multiplier *= 0.55
    }
    if ((checklistSummary.criticalMissing || 0) > 0) {
      multiplier *= Math.max(0.35, 1 - checklistSummary.criticalMissing * 0.28)
    }
  }
  const gross = Math.max(220, Math.round(timing.baseRevenue * multiplier))
  const hospitalShare = Math.round(gross * 0.75)
  const physicianShare = gross - hospitalShare
  return {
    gross,
    hospitalShare,
    physicianShare,
    timing,
    multiplier,
  }
}

function clamp(min, max, value) {
  return Math.min(max, Math.max(min, value))
}
