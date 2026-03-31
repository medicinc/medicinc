import { ensureClinicalState, ensureResuscitationState, ensureVitals, hasRecentEffectTag, minutesSinceFirstTag, getCurrentTreatmentInfluence } from './treatmentEffects'
import { resolveConditionKey as resolveMappedCondition } from './conditionMapping'

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
  return `${Math.round(clamp(sys, 0, 240))}/${Math.round(clamp(dia, 0, 140))}`
}

function resolveProgressionCondition(patient) {
  const mapped = resolveMappedCondition(patient)
  if (mapped === 'pneumonia' || mapped === 'sepsis_infection') return 'pneumonia'
  if (mapped === 'obstructive_airway' || mapped === 'pulmonary_embolism') return 'dyspnea'
  if (mapped === 'arrhythmia') return 'brady'
  if (mapped === 'hyperglycemia') return 'hyperglycemia'
  if (mapped === 'hemorrhage_hypovolemia') return 'dehydration'
  return 'generic'
}

function isLikelyEmetogenicMedication(entry) {
  const id = String(entry?.id || entry?.medId || '').toLowerCase()
  return [
    'morphin', 'fentanyl', 'piritramid', 'tramadol', 'tilidin', 'naloxon',
    'dimenhydrinat', 'amoxicillin', 'linezolid', 'doxycyclin', 'clindamycin',
  ].some(token => id.includes(token))
}

function computeVomitRiskScore(patient, condition, primaryCode, now) {
  let score = 0
  const code = String(primaryCode || '').toUpperCase()
  if (condition === 'hyperglycemia' || condition === 'dehydration' || condition === 'pneumonia') score += 0.8
  if (/^(F10|R11|K52|K56|K85|T39|T40|T51|A09)/.test(code)) score += 1.6
  const symptomText = [
    ...(Array.isArray(patient?.history?.symptoms) ? patient.history.symptoms : []),
    ...(Array.isArray(patient?.symptoms) ? patient.symptoms : []),
  ].join(' ').toLowerCase()
  if (symptomText.includes('übel') || symptomText.includes('erbrech') || symptomText.includes('nausea')) score += 1.0
  if (hasRecentEffectTag(patient, ['opioid', 'analgesia'], 90, now)) score += 0.6
  const recentMeds = (patient?.appliedTreatments || []).slice(-8)
  if (recentMeds.some(isLikelyEmetogenicMedication)) score += 0.8
  return score
}

function pushVitalsHistory(patient, nextVitals, nowIso) {
  const prev = patient?.vitalsHistory || []
  const merged = [...prev, { time: nowIso, ...nextVitals, source: 'clinical_tick' }]
  return merged.length > 240 ? merged.slice(merged.length - 240) : merged
}

function buildConditionMessage(condition, kind, patient, vitals) {
  const name = patient?.name || 'Patient'
  if (kind === 'critical') {
    if (condition === 'dyspnea' || vitals.spo2 < 86) return `${name} klingelt mit schwerer Atemnot (SpO₂ ${Math.round(vitals.spo2)}%). Bitte sofort respiratorisch sichern.`
    if (condition === 'brady') return `${name} ist kreislaufkritisch bei Bradykardie (HF ${Math.round(vitals.hr)}/min). Bitte sofort intervenieren.`
    if (condition === 'pneumonia') return `${name} zeigt kritische Verschlechterung bei Pneumonie (AF ${Math.round(vitals.rr)}/min, Temp ${vitals.temp.toFixed(1)}°C).`
    if (condition === 'dehydration') return `${name} wird hämodynamisch kritisch bei Exsikkose (RR ${vitals.bp}, HF ${Math.round(vitals.hr)}/min).`
    if (condition === 'hyperglycemia') return `${name} dekompensiert metabolisch. Bitte Hyperglykämie/DKA akut behandeln.`
    return `${name} klingelt kritisch: akute Verschlechterung (${Math.round(vitals.spo2)}% SpO₂, HF ${Math.round(vitals.hr)}/min).`
  }
  if (kind === 'warning') {
    if (condition === 'dyspnea') return `${name} berichtet über zunehmende Luftnot und Unruhe.`
    if (condition === 'pneumonia') return `${name} klagt über mehr Husten, Fiebergefühl und Erschöpfung.`
    if (condition === 'dehydration') return `${name} meldet Schwindel, Durst und trockene Schleimhäute.`
    if (condition === 'brady') return `${name} berichtet über Schwindel und Leistungsknick bei niedriger HF.`
    if (condition === 'hyperglycemia') return `${name} klagt über Übelkeit, Schwäche und starken Durst.`
    return `${name} meldet neue Beschwerden. Zustand wird instabil.`
  }
  if (condition === 'dyspnea') return `${name} klingelt: Atmung subjektiv schlechter, bitte zeitnah kontrollieren.`
  if (condition === 'pneumonia') return `${name} klingelt: fühlt sich fiebrig und abgeschlagen.`
  if (condition === 'dehydration') return `${name} klingelt: klagt über trockenen Mund und Schwindel.`
  if (condition === 'brady') return `${name} klingelt: fühlt sich benommen und schwach.`
  if (condition === 'hyperglycemia') return `${name} klingelt: Polyurie und Durst nehmen zu.`
  return `${name} klingelt: zunehmende Beschwerden, bitte Verlauf prüfen.`
}

function resolveArrestRhythm({ condition, code, vitals, clinicalState }) {
  const hemoLow = Number(clinicalState?.hemodynamics || 0) < -6
  const severeHypox = Number(vitals?.spo2 || 100) < 78
  if (/I46|R57|A41|J96|E87|E86/.test(code) || hemoLow || severeHypox || condition === 'dehydration' || condition === 'pneumonia') {
    return Math.random() < 0.75 ? 'asystole' : 'pea'
  }
  if (condition === 'brady') return Math.random() < 0.6 ? 'pea' : 'asystole'
  if (condition === 'dyspnea') return Math.random() < 0.55 ? 'pea' : 'vf'
  return Math.random() < 0.55 ? 'vf' : 'asystole'
}

export function applyClinicalProgressionTick(patient, nowIso = new Date().toISOString()) {
  const now = Date.parse(nowIso)
  const clinicalState = ensureClinicalState(patient)
  const vitals = ensureVitals(patient?.vitals)
  const previousVitals = { ...vitals }
  const bp = parseBp(vitals.bp)
  const previousStability = clinicalState.stability
  const previousConsciousness = clinicalState.consciousness
  const previousOutcome = clinicalState.outcome
  const previousResuscitation = ensureResuscitationState(clinicalState.resuscitation)
  const previousVomitActive = !!clinicalState?.vomit?.active
  const previousWoundInfectionStage = Number(clinicalState?.surgicalWound?.infectionStage || 0)

  const lastUpdate = Date.parse(clinicalState.lastUpdatedAt || patient?.arrivalTime || nowIso)
  const elapsedMinutes = clamp(Number.isFinite(lastUpdate) ? (now - lastUpdate) / 60000 : 1, 0.5, 5)
  const condition = resolveProgressionCondition(patient)
  const primaryCode = String(patient?.trueDiagnoses?.primary?.code || patient?.diagnoses?.primary?.code || '').toUpperCase()
  const treatmentInfluence = getCurrentTreatmentInfluence(patient, now)
  const oxygenSupport = treatmentInfluence.oxygenation + treatmentInfluence.dyspneaRelief
  const hemoSupport = treatmentInfluence.hemodynamics + treatmentInfluence.volumeResuscitation + treatmentInfluence.transfusionSupport
  const antiInfection = treatmentInfluence.antibioticControl + treatmentInfluence.antiInflammatory
  const painControl = treatmentInfluence.analgesia
  const metabolicControl = treatmentInfluence.metabolicControl

  if (condition === 'dehydration') {
    const treated = hasRecentEffectTag(patient, 'fluid_resuscitation', 180, now) || treatmentInfluence.volumeResuscitation > 0.25
    if (treated) {
      const gain = clamp(0.04 + treatmentInfluence.volumeResuscitation * 0.03, 0.03, 0.18)
      clinicalState.volumeStatus = clamp(clinicalState.volumeStatus + gain * elapsedMinutes, -10, 10)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + (0.02 + hemoSupport * 0.02) * elapsedMinutes, -10, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - (0.015 + painControl * 0.01) * elapsedMinutes, 0, 10)
      vitals.hr = clamp(vitals.hr - (0.08 + hemoSupport * 0.05) * elapsedMinutes, 30, 200)
      vitals.temp = clamp(vitals.temp - 0.01 * elapsedMinutes, 33, 42)
      bp.sys += (0.1 + hemoSupport * 0.08) * elapsedMinutes
      bp.dia += (0.05 + hemoSupport * 0.04) * elapsedMinutes
    } else {
      clinicalState.volumeStatus = clamp(clinicalState.volumeStatus - 0.08 * elapsedMinutes, -10, 10)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - 0.05 * elapsedMinutes, -10, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.05 * elapsedMinutes, 0, 10)
      vitals.hr = clamp(vitals.hr + 0.22 * elapsedMinutes, 30, 200)
      vitals.spo2 = clamp(vitals.spo2 - 0.04 * elapsedMinutes, 45, 100)
      bp.sys -= 0.2 * elapsedMinutes
      bp.dia -= 0.1 * elapsedMinutes
    }
  } else if (condition === 'pneumonia') {
    const hasAbx = hasRecentEffectTag(patient, 'antibiotic', 24 * 60, now)
    const abxMinutes = minutesSinceFirstTag(patient, 'antibiotic', now)
    const treatmentActive = (hasAbx && Number.isFinite(abxMinutes) && abxMinutes >= 90) || antiInfection > 0.35
    if (treatmentActive) {
      clinicalState.infectionLoad = clamp(clinicalState.infectionLoad - (0.02 + antiInfection * 0.012) * elapsedMinutes, 0, 10)
      clinicalState.dyspnea = clamp(clinicalState.dyspnea - (0.015 + oxygenSupport * 0.015) * elapsedMinutes, 0, 10)
      vitals.temp = clamp(vitals.temp - (0.015 + antiInfection * 0.005) * elapsedMinutes, 33, 42)
      vitals.rr = clamp(vitals.rr - (0.05 + oxygenSupport * 0.04) * elapsedMinutes, 6, 55)
      vitals.spo2 = clamp(vitals.spo2 + (0.04 + oxygenSupport * 0.05) * elapsedMinutes, 35, 100)
    } else {
      clinicalState.infectionLoad = clamp(clinicalState.infectionLoad + 0.045 * elapsedMinutes, 0, 10)
      clinicalState.dyspnea = clamp(clinicalState.dyspnea + 0.04 * elapsedMinutes, 0, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.05 * elapsedMinutes, 0, 10)
      vitals.temp = clamp(vitals.temp + 0.02 * elapsedMinutes, 33, 42)
      vitals.rr = clamp(vitals.rr + 0.1 * elapsedMinutes, 6, 55)
      vitals.spo2 = clamp(vitals.spo2 - 0.08 * elapsedMinutes, 35, 100)
      vitals.hr = clamp(vitals.hr + 0.06 * elapsedMinutes, 30, 200)
    }
  } else if (condition === 'brady') {
    const treated = hasRecentEffectTag(patient, ['chronotropic_support', 'hemodynamic_support'], 45, now) || treatmentInfluence.chronotropic + hemoSupport > 0.4
    if (treated) {
      vitals.hr = clamp(vitals.hr + (0.16 + treatmentInfluence.chronotropic * 0.18) * elapsedMinutes, 30, 200)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + (0.03 + hemoSupport * 0.02) * elapsedMinutes, -10, 10)
    } else {
      vitals.hr = clamp(vitals.hr - 0.14 * elapsedMinutes, 30, 200)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - 0.08 * elapsedMinutes, -10, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.03 * elapsedMinutes, 0, 10)
      bp.sys -= 0.2 * elapsedMinutes
      bp.dia -= 0.1 * elapsedMinutes
    }
  } else if (condition === 'dyspnea') {
    const treated = hasRecentEffectTag(patient, ['oxygen_support', 'bronchodilation'], 60, now) || oxygenSupport > 0.2
    if (treated) {
      clinicalState.dyspnea = clamp(clinicalState.dyspnea - (0.05 + oxygenSupport * 0.03) * elapsedMinutes, 0, 10)
      vitals.spo2 = clamp(vitals.spo2 + (0.1 + oxygenSupport * 0.08) * elapsedMinutes, 35, 100)
      vitals.rr = clamp(vitals.rr - (0.06 + oxygenSupport * 0.04) * elapsedMinutes, 6, 55)
    } else {
      clinicalState.dyspnea = clamp(clinicalState.dyspnea + 0.12 * elapsedMinutes, 0, 10)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - 0.03 * elapsedMinutes, -10, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.08 * elapsedMinutes, 0, 10)
      vitals.spo2 = clamp(vitals.spo2 - 0.2 * elapsedMinutes, 30, 100)
      vitals.rr = clamp(vitals.rr + 0.18 * elapsedMinutes, 6, 55)
      vitals.hr = clamp(vitals.hr + 0.1 * elapsedMinutes, 30, 200)
    }
  } else if (condition === 'hyperglycemia') {
    const treated = hasRecentEffectTag(patient, 'glucose_control', 180, now) || metabolicControl > 0.3
    if (treated) {
      clinicalState.metabolicStress = clamp(clinicalState.metabolicStress - (0.04 + metabolicControl * 0.03) * elapsedMinutes, 0, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel - (0.02 + metabolicControl * 0.02) * elapsedMinutes, 0, 10)
      vitals.hr = clamp(vitals.hr - 0.04 * elapsedMinutes, 30, 200)
    } else {
      clinicalState.metabolicStress = clamp(clinicalState.metabolicStress + 0.05 * elapsedMinutes, 0, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.05 * elapsedMinutes, 0, 10)
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - 0.03 * elapsedMinutes, -10, 10)
      vitals.hr = clamp(vitals.hr + 0.06 * elapsedMinutes, 30, 200)
    }
  } else {
    clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.02 * elapsedMinutes, 0, 10)
  }

  // Surgical follow-up dynamics: untreated/insufficient wound care can drive local -> systemic infection.
  const woundState = clinicalState.surgicalWound && typeof clinicalState.surgicalWound === 'object'
    ? { ...clinicalState.surgicalWound }
    : {
      present: false,
      cleanliness: 0,
      closure: 0,
      dressing: 0,
      infectionStage: 0,
      lastCleanseAt: null,
      lastSutureAt: null,
      lastDressingAt: null,
      lastInspectAt: null,
    }
  const fractureState = clinicalState.fractureCare && typeof clinicalState.fractureCare === 'object'
    ? { ...clinicalState.fractureCare }
    : {
      present: false,
      immobilizationQuality: 0,
      dmsChecked: false,
      instability: 0.3,
      lastCastAt: null,
      lastInspectAt: null,
      lastRecastAt: null,
    }
  const symptomText = [
    patient?.chiefComplaint || '',
    ...(Array.isArray(patient?.symptoms) ? patient.symptoms : []),
    ...(Array.isArray(patient?.presentingSymptoms) ? patient.presentingSymptoms : []),
  ].join(' ').toLowerCase()
  const likelyOpenWound = /wunde|platzwunde|schnitt|lazer|offene verletzung|offene wunde|blutung/.test(symptomText)
    || /^(S0[019]|S[3456789]1|T14\.1)/.test(primaryCode)
  const likelyFracture = /fraktur|bruch|fehlstellung|radius|ulna|humerus|femur|tibia|fibula/.test(symptomText)
    || /^S(32|42|52|62|72|82|92)\./.test(primaryCode)
  if (likelyOpenWound) woundState.present = true
  if (likelyFracture) fractureState.present = true

  if (woundState.present) {
    const careScore = clamp(
      Number(woundState.cleanliness || 0) * 0.45
      + Number(woundState.closure || 0) * 0.25
      + Number(woundState.dressing || 0) * 0.3,
      0,
      1
    )
    const lastCareMs = Math.max(
      Date.parse(woundState.lastDressingAt || ''),
      Date.parse(woundState.lastSutureAt || ''),
      Date.parse(woundState.lastCleanseAt || '')
    )
    const hoursSinceCare = Number.isFinite(lastCareMs) ? (now - lastCareMs) / 3600000 : 999
    let stageDelta = careScore < 0.35 ? 0.52 : careScore < 0.65 ? 0.24 : -0.09
    if (hoursSinceCare > 10 && careScore < 0.75) stageDelta += 0.18
    if (hoursSinceCare > 20 && careScore < 0.6) stageDelta += 0.2
    const antiInfectionPower = antiInfection + (hasRecentEffectTag(patient, 'antibiotic', 24 * 60, now) ? 0.35 : 0)
    stageDelta -= antiInfectionPower * 0.11
    woundState.infectionStage = clamp(Number(woundState.infectionStage || 0) + stageDelta * elapsedMinutes, 0, 100)
    const woundInfectionDrive = clamp(woundState.infectionStage / 100, 0, 1)
    clinicalState.infectionLoad = clamp(
      Math.max(clinicalState.infectionLoad, 0.45 + woundInfectionDrive * 3.8),
      0,
      10
    )
    if (woundInfectionDrive > 0.35) {
      vitals.temp = clamp(vitals.temp + (0.015 + woundInfectionDrive * 0.03) * elapsedMinutes, 32, 42.5)
      vitals.hr = clamp(vitals.hr + (0.03 + woundInfectionDrive * 0.07) * elapsedMinutes, 30, 220)
      vitals.rr = clamp(vitals.rr + (0.015 + woundInfectionDrive * 0.05) * elapsedMinutes, 0, 60)
      bp.sys -= (0.02 + woundInfectionDrive * 0.08) * elapsedMinutes
      bp.dia -= (0.015 + woundInfectionDrive * 0.05) * elapsedMinutes
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - (0.02 + woundInfectionDrive * 0.05) * elapsedMinutes, -10, 10)
      clinicalState.metabolicStress = clamp(clinicalState.metabolicStress + (0.01 + woundInfectionDrive * 0.035) * elapsedMinutes, 0, 10)
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + (0.015 + woundInfectionDrive * 0.05) * elapsedMinutes, 0, 10)
    }
  }

  if (fractureState.present) {
    const lastCastMs = Date.parse(fractureState.lastCastAt || '')
    const lastInspectMs = Date.parse(fractureState.lastInspectAt || '')
    const hoursSinceCast = Number.isFinite(lastCastMs) ? (now - lastCastMs) / 3600000 : 999
    const hoursSinceInspect = Number.isFinite(lastInspectMs) ? (now - lastInspectMs) / 3600000 : 999
    const immobilizationGap = clamp(1 - Number(fractureState.immobilizationQuality || 0), 0, 1)
    fractureState.instability = clamp(
      Number(fractureState.instability || 0) + (immobilizationGap * 0.05) * elapsedMinutes + (hoursSinceCast > 18 ? 0.02 * elapsedMinutes : 0),
      0,
      1
    )
    if (hoursSinceInspect > 6) {
      clinicalState.complaintLevel = clamp(clinicalState.complaintLevel + 0.02 * elapsedMinutes, 0, 10)
    }
    if (fractureState.instability > 0.55) {
      clinicalState.pain = clamp(clinicalState.pain + 0.03 * elapsedMinutes, 0, 10)
      vitals.hr = clamp(vitals.hr + 0.04 * elapsedMinutes, 30, 220)
    }
  }

  clinicalState.surgicalWound = woundState
  clinicalState.fractureCare = fractureState

  if (!hasRecentEffectTag(patient, 'analgesia', 180, now) && painControl < 0.2) {
    clinicalState.pain = clamp(clinicalState.pain + 0.03 * elapsedMinutes, 0, 10)
  } else {
    clinicalState.pain = clamp(clinicalState.pain - (0.01 + painControl * 0.02) * elapsedMinutes, 0, 10)
  }

  const criticalByVitals = vitals.spo2 < 88 || vitals.hr < 38 || vitals.hr > 155
  const unstableByVitals = vitals.spo2 < 93 || vitals.hr < 50 || vitals.hr > 130 || vitals.temp >= 39.2
  const criticalByState = clinicalState.hemodynamics < -4.5 || clinicalState.dyspnea > 8.2
  const unstableByState = clinicalState.hemodynamics < -2 || clinicalState.dyspnea > 5.5 || clinicalState.infectionLoad > 6.5

  if (criticalByVitals || criticalByState) {
    clinicalState.stability = 'kritisch'
    clinicalState.consciousness = clinicalState.hemodynamics < -6 || vitals.spo2 < 82 ? 'bewusstlos' : 'somnolent'
  } else if (unstableByVitals || unstableByState) {
    clinicalState.stability = 'instabil'
    clinicalState.consciousness = 'wach'
  } else {
    clinicalState.stability = 'stabil'
    clinicalState.consciousness = 'wach'
  }

  const resuscitation = ensureResuscitationState(clinicalState.resuscitation)
  if (!resuscitation.active && clinicalState.outcome !== 'dead') {
    const oxygenDrive = clamp((treatmentInfluence.oxygenation || 0) + (treatmentInfluence.dyspneaRelief || 0) * 0.6, 0, 3)
    if (oxygenDrive > 0.06) {
      const currentSpo2 = Number(vitals.spo2 || 90)
      const oxygenTarget = currentSpo2 < 90 ? 95 : 97
      const deficit = Math.max(0, oxygenTarget - currentSpo2)
      const gain = Math.min(2.4, (0.08 + oxygenDrive * 0.18) * elapsedMinutes + deficit * 0.03 * oxygenDrive)
      vitals.spo2 = clamp(currentSpo2 + gain, 35, 100)
      vitals.rr = clamp(Number(vitals.rr || 16) - (0.03 + oxygenDrive * 0.06) * elapsedMinutes, 6, 55)
      clinicalState.dyspnea = clamp(Number(clinicalState.dyspnea || 0) - (0.02 + oxygenDrive * 0.05) * elapsedMinutes, 0, 10)
    }
  }
  if (!resuscitation.active && clinicalState.outcome !== 'dead') {
    const isCopdLike = primaryCode.startsWith('J44') || primaryCode.startsWith('J45')
    const lastO2Ms = Date.parse(clinicalState.lastOxygenSupportAt || '')
    const minutesSinceO2 = Number.isFinite(lastO2Ms) ? (now - lastO2Ms) / 60000 : 999
    const baselineByCondition = condition === 'dyspnea' ? 91
      : condition === 'pneumonia' ? 92
        : condition === 'dehydration' ? 94
          : condition === 'hyperglycemia' ? 95
            : 96
    const dynamicTarget = clamp(
      baselineByCondition
      - Number(clinicalState.dyspnea || 0) * 0.42
      - Number(clinicalState.infectionLoad || 0) * 0.24
      + Number(clinicalState.hemodynamics || 0) * 0.10,
      isCopdLike ? 86 : 88,
      isCopdLike ? 94 : 98
    )
    const currentSpo2 = Number(vitals.spo2 || 90)
    let trend = 'steady'
    let appliedDelta = 0
    if (minutesSinceO2 >= 0.35 && currentSpo2 > dynamicTarget + 0.4) {
      const excess = currentSpo2 - dynamicTarget
      const fall = clamp(
        (0.35 + excess * 0.12 + (condition === 'dyspnea' || condition === 'pneumonia' ? 0.18 : 0)) * elapsedMinutes,
        0.7,
        2.4
      )
      vitals.spo2 = clamp(currentSpo2 - fall, isCopdLike ? 84 : 86, 100)
      trend = 'falling'
      appliedDelta = -fall
    } else if (currentSpo2 < dynamicTarget - 1.0) {
      const rise = clamp((0.02 + (dynamicTarget - currentSpo2) * 0.01) * elapsedMinutes, 0.02, 0.25)
      vitals.spo2 = clamp(currentSpo2 + rise, isCopdLike ? 84 : 86, 100)
      trend = 'rising'
      appliedDelta = rise
    }
    clinicalState.spo2Debug = {
      condition,
      isCopdLike,
      dynamicTarget: +dynamicTarget.toFixed(1),
      minutesSinceO2: Number.isFinite(minutesSinceO2) ? +minutesSinceO2.toFixed(2) : null,
      currentSpo2Before: +currentSpo2.toFixed(1),
      trend,
      appliedDelta: +appliedDelta.toFixed(2),
    }
  }
  const arrivalMs = Date.parse(patient?.arrivalTime || '')
  const minutesSinceArrival = Number.isFinite(arrivalMs) ? (now - arrivalMs) / 60000 : 120
  const potentiallyLifeThreateningCode = /^(I2|I4|R57|A4|J96|S06|S1|S2|S3|T7)/.test(primaryCode)
  const lowArrestRiskCode = /^(F10|R11|Z|M|N39|J06|K52|A09)/.test(primaryCode)
  const noRecentSupport = !hasRecentEffectTag(patient, ['hemodynamic_support', 'oxygen_support', 'fluid_resuscitation'], 20, now)
  if (!resuscitation.active && clinicalState.outcome !== 'dead') {
    const severeDeterioration =
      criticalByVitals
      || criticalByState
      || Number(clinicalState.hemodynamics || 0) < -6.8
      || Number(vitals.spo2 || 100) < 80
    const triggerEligible = minutesSinceArrival >= 18 && severeDeterioration
    const baseChance = severeDeterioration ? (potentiallyLifeThreateningCode ? 0.012 : 0.003) : 0
    const riskBonus = (potentiallyLifeThreateningCode ? 0.006 : 0) + ((noRecentSupport && potentiallyLifeThreateningCode) ? 0.004 : 0)
    const complaintBonus = Number(clinicalState.complaintLevel || 0) > 8.2 ? 0.002 : 0
    const alcoholPenalty = lowArrestRiskCode ? 0.008 : 0
    const arrestChance = clamp(baseChance + riskBonus + complaintBonus - alcoholPenalty, 0, potentiallyLifeThreateningCode ? 0.045 : 0.012)
    if (triggerEligible && arrestChance > 0 && Math.random() < arrestChance) {
      const rhythm = resolveArrestRhythm({ condition, code: primaryCode, vitals, clinicalState })
      resuscitation.active = true
      resuscitation.status = 'arrest'
      resuscitation.rhythm = rhythm
      resuscitation.startedAt = nowIso
      resuscitation.lastCycleAt = nowIso
      resuscitation.cprActive = false
      resuscitation.cycles = 0
      resuscitation.failureScore = 0
      resuscitation.lastInterventionAt = nowIso
      clinicalState.consciousness = 'bewusstlos'
      clinicalState.stability = 'kritisch'
      if (rhythm === 'vf') vitals.hr = clamp(vitals.hr + 90, 160, 230)
      if (rhythm === 'asystole') vitals.hr = 0
      if (rhythm === 'pea') vitals.hr = 0
      vitals.spo2 = clamp(vitals.spo2 - 4, 35, 100)
      bp.sys = clamp(bp.sys - 25, 40, 240)
      bp.dia = clamp(bp.dia - 15, 20, 140)
    }
  }

  const events = []
  const vomitState = {
    active: !!clinicalState?.vomit?.active,
    count: Number(clinicalState?.vomit?.count || 0),
    lastAt: clinicalState?.vomit?.lastAt || null,
    cleanedAt: clinicalState?.vomit?.cleanedAt || null,
    nextEarliestAt: clinicalState?.vomit?.nextEarliestAt || null,
    cause: clinicalState?.vomit?.cause || null,
  }
  if (!resuscitation.active && clinicalState.outcome !== 'dead') {
    const vomitRisk = computeVomitRiskScore(patient, condition, primaryCode, now)
    const lastVomitMs = Date.parse(vomitState.lastAt || '')
    const nextEarliestMs = Date.parse(vomitState.nextEarliestAt || '')
    const canTriggerByTime = !Number.isFinite(nextEarliestMs) || now >= nextEarliestMs
    const minutesSinceVomit = Number.isFinite(lastVomitMs) ? (now - lastVomitMs) / 60000 : 999
    const triggerChance = clamp((vomitRisk - 1.1) * 0.045, 0, 0.22)
    if (!vomitState.active && canTriggerByTime && minutesSinceVomit >= 3 && triggerChance > 0 && Math.random() < triggerChance) {
      vomitState.active = true
      vomitState.count += 1
      vomitState.lastAt = nowIso
      vomitState.cause = /^(F10|T51)/.test(primaryCode) ? 'alkohol' : (vomitRisk >= 2.2 ? 'krankheitsbild' : 'medikament')
      vomitState.nextEarliestAt = new Date(now + (5 + Math.floor(Math.random() * 8)) * 60000).toISOString()
      clinicalState.complaintLevel = clamp(Number(clinicalState.complaintLevel || 0) + 0.55, 0, 10)
      events.push({
        type: 'warning',
        severity: 'high',
        priority: 2,
        code: 'vomiting_episode',
        message: `${patient.name} erbricht plötzlich. Bitte Seitenlage/Absaugung prüfen und Erbrochenes beseitigen.`,
      })
    }
    if (vomitState.active) {
      clinicalState.complaintLevel = clamp(Number(clinicalState.complaintLevel || 0) + 0.02 * elapsedMinutes, 0, 10)
      if (clinicalState.consciousness === 'bewusstlos') {
        vitals.spo2 = clamp(Number(vitals.spo2 || 0) - 0.08 * elapsedMinutes, 0, 100)
      }
    }
  }
  clinicalState.vomit = vomitState

  if (resuscitation.active && clinicalState.outcome !== 'dead') {
    const startedMs = Date.parse(resuscitation.startedAt || nowIso)
    const lastCycleMs = Date.parse(resuscitation.lastCycleAt || resuscitation.startedAt || nowIso)
    const lastInterventionMs = Date.parse(resuscitation.lastInterventionAt || resuscitation.startedAt || nowIso)
    const minutesDown = Number.isFinite(startedMs) ? (now - startedMs) / 60000 : 0
    const minutesSinceCycle = Number.isFinite(lastCycleMs) ? (now - lastCycleMs) / 60000 : 99
    const minutesSinceIntervention = Number.isFinite(lastInterventionMs) ? (now - lastInterventionMs) / 60000 : 99
    const shockable = resuscitation.rhythm === 'vf' || resuscitation.rhythm === 'pvt'
    if (resuscitation.cprActive) {
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 0.08 * elapsedMinutes, -10, 10)
      vitals.spo2 = clamp(vitals.spo2 + 0.08 * elapsedMinutes, 50, 100)
      resuscitation.failureScore = clamp(resuscitation.failureScore - 0.05, 0, 30)
    } else {
      clinicalState.hemodynamics = clamp(clinicalState.hemodynamics - 0.18 * elapsedMinutes, -10, 10)
      vitals.spo2 = clamp(vitals.spo2 - 0.28 * elapsedMinutes, 0, 100)
      resuscitation.failureScore += 0.22
    }
    if (minutesSinceIntervention > 1.2) {
      resuscitation.failureScore += 0.25
    }
    if (shockable) {
      const lastShockMs = Date.parse(resuscitation.lastShockAt || '')
      const minutesSinceShock = Number.isFinite(lastShockMs) ? (now - lastShockMs) / 60000 : 999
      if (minutesSinceShock > 2.8) resuscitation.failureScore += 0.25
    }
    if (minutesSinceCycle >= 2) {
      resuscitation.cycles = Number(resuscitation.cycles || 0) + 1
      resuscitation.lastCycleAt = nowIso
      const adrenalineBonus = Math.min(0.22, Number(resuscitation.adrenalineDoses || 0) * 0.05)
      const amiodaroneBonus = shockable ? Math.min(0.12, Number(resuscitation.amiodaroneDoses || 0) * 0.04) : 0
      const cprBonus = resuscitation.cprActive ? 0.18 : -0.12
      const shockBonus = (() => {
        if (!shockable) return 0
        const lastShockMs = Date.parse(resuscitation.lastShockAt || '')
        if (!Number.isFinite(lastShockMs)) return -0.08
        const since = (now - lastShockMs) / 60000
        return since <= 2.5 ? 0.18 : 0.02
      })()
      const timePenalty = clamp(minutesDown * 0.018, 0, 0.28)
      const failurePenalty = clamp((resuscitation.failureScore || 0) * 0.028, 0, 0.42)
      const roscChance = clamp(0.06 + cprBonus + adrenalineBonus + amiodaroneBonus + shockBonus - timePenalty - failurePenalty, 0, 0.72)
      if (Math.random() < roscChance) {
        resuscitation.active = false
        resuscitation.status = 'rosc'
        resuscitation.roscAt = nowIso
        resuscitation.cprActive = false
        resuscitation.rhythm = 'sinus'
        clinicalState.outcome = 'alive'
        clinicalState.stability = 'instabil'
        clinicalState.consciousness = 'somnolent'
        clinicalState.hemodynamics = clamp(clinicalState.hemodynamics + 1.8, -10, 10)
        vitals.hr = clamp(Math.max(58, Number(vitals.hr || 65)), 40, 140)
        vitals.spo2 = clamp(Math.max(86, Number(vitals.spo2 || 88)), 70, 100)
        vitals.rr = clamp(Math.max(10, Number(vitals.rr || 12)), 8, 30)
        bp.sys = clamp(Math.max(90, bp.sys), 70, 240)
        bp.dia = clamp(Math.max(55, bp.dia), 40, 140)
      } else {
        resuscitation.failureScore += 0.85 + (minutesSinceIntervention > 1 ? 0.4 : 0)
      }
    }
    if (resuscitation.active && ((resuscitation.failureScore || 0) >= 9.5 || (resuscitation.cycles || 0) >= 10)) {
      resuscitation.active = false
      resuscitation.status = 'dead'
      resuscitation.rhythm = 'asystole'
      resuscitation.cprActive = false
      clinicalState.outcome = 'dead'
      clinicalState.stability = 'kritisch'
      clinicalState.consciousness = 'bewusstlos'
      vitals.hr = 0
      vitals.rr = 0
      vitals.spo2 = 0
      bp.sys = 0
      bp.dia = 0
    }
    if (resuscitation.active) {
      if (resuscitation.rhythm === 'asystole' || resuscitation.rhythm === 'pea') {
        vitals.hr = 0
        vitals.rr = resuscitation.cprActive ? clamp(Number(vitals.rr || 0) + 0.1 * elapsedMinutes, 6, 16) : clamp(Number(vitals.rr || 0) - 0.35 * elapsedMinutes, 0, 8)
        vitals.spo2 = resuscitation.cprActive ? clamp(Number(vitals.spo2 || 0) + 0.02 * elapsedMinutes, 45, 92) : clamp(Number(vitals.spo2 || 0) - 0.18 * elapsedMinutes, 0, 85)
        bp.sys = resuscitation.cprActive ? clamp(bp.sys - 0.05 * elapsedMinutes, 35, 80) : clamp(bp.sys - 0.25 * elapsedMinutes, 0, 65)
        bp.dia = resuscitation.cprActive ? clamp(bp.dia - 0.04 * elapsedMinutes, 15, 45) : clamp(bp.dia - 0.12 * elapsedMinutes, 0, 35)
      } else if (resuscitation.rhythm === 'vf' || resuscitation.rhythm === 'pvt') {
        vitals.hr = clamp(Number(vitals.hr || 0), 150, 230)
        vitals.rr = resuscitation.cprActive ? clamp(Number(vitals.rr || 0) + 0.08 * elapsedMinutes, 6, 18) : clamp(Number(vitals.rr || 0) - 0.22 * elapsedMinutes, 0, 10)
        vitals.spo2 = resuscitation.cprActive ? clamp(Number(vitals.spo2 || 0) + 0.04 * elapsedMinutes, 45, 95) : clamp(Number(vitals.spo2 || 0) - 0.14 * elapsedMinutes, 0, 90)
        bp.sys = resuscitation.cprActive ? clamp(bp.sys - 0.04 * elapsedMinutes, 45, 95) : clamp(bp.sys - 0.14 * elapsedMinutes, 0, 85)
        bp.dia = resuscitation.cprActive ? clamp(bp.dia - 0.03 * elapsedMinutes, 20, 55) : clamp(bp.dia - 0.1 * elapsedMinutes, 0, 45)
      }
      // During active arrest/reanimation, peripheral pulse ox and spontaneous respiratory rate are effectively not measurable.
      vitals.spo2 = 0
      vitals.rr = 0
      clinicalState.consciousness = 'bewusstlos'
      clinicalState.stability = 'kritisch'
    }
  }
  if (clinicalState.outcome === 'dead' || resuscitation.status === 'dead') {
    vitals.hr = 0
    vitals.rr = 0
    vitals.spo2 = 0
    bp.sys = 0
    bp.dia = 0
  }
  clinicalState.resuscitation = resuscitation

  const lastRingTs = Date.parse(clinicalState.lastRingAt || '')
  const minutesSinceRing = Number.isFinite(lastRingTs) ? (now - lastRingTs) / 60000 : 999
  if (!previousResuscitation.active && resuscitation.active) {
    events.push({
      type: 'critical',
      severity: 'critical',
      priority: 3,
      code: `cardiac_arrest_${resuscitation.rhythm || 'unknown'}`,
      message: `${patient.name} ist reanimationspflichtig (${String(resuscitation.rhythm || 'Asystolie').toUpperCase()}). Sofort CPR/ACLS starten!`,
    })
  }
  if (previousResuscitation.active && !resuscitation.active && resuscitation.status === 'rosc') {
    events.push({
      type: 'warning',
      severity: 'high',
      priority: 2,
      code: 'rosc',
      message: `${patient.name}: ROSC erreicht, postreanimationspflichtige Überwachung erforderlich.`,
    })
  }
  if (previousOutcome !== 'dead' && clinicalState.outcome === 'dead') {
    events.push({
      type: 'critical',
      severity: 'critical',
      priority: 3,
      code: 'resuscitation_failed',
      message: `${patient.name} ist trotz Reanimationsmaßnahmen verstorben.`,
    })
  }
  if (previousConsciousness !== clinicalState.consciousness && clinicalState.consciousness === 'bewusstlos') {
    events.push({
      type: 'critical',
      severity: 'critical',
      priority: 3,
      code: 'loss_of_consciousness',
      message: `${patient.name} ist bewusstlos geworden. Notfallteam sofort erforderlich.`,
    })
  }
  if (!resuscitation.active && clinicalState.stability === 'kritisch' && (previousStability !== 'kritisch' || minutesSinceRing >= 5)) {
    clinicalState.lastRingAt = nowIso
    events.push({
      type: 'critical',
      severity: 'critical',
      priority: 3,
      code: `${condition}_critical`,
      message: buildConditionMessage(condition, 'critical', patient, vitals),
    })
  } else if (!resuscitation.active && clinicalState.stability === 'instabil' && previousStability === 'stabil' && minutesSinceRing >= 8) {
    clinicalState.lastRingAt = nowIso
    events.push({
      type: 'warning',
      severity: 'high',
      priority: 2,
      code: `${condition}_warning`,
      message: buildConditionMessage(condition, 'warning', patient, vitals),
    })
  } else if (!resuscitation.active && clinicalState.complaintLevel > 6.5 && minutesSinceRing >= 12) {
    clinicalState.lastRingAt = nowIso
    events.push({
      type: 'call',
      severity: 'medium',
      priority: 1,
      code: `${condition}_call`,
      message: buildConditionMessage(condition, 'call', patient, vitals),
    })
  }

  const woundInfectionNow = Number(clinicalState?.surgicalWound?.infectionStage || 0)
  if (!resuscitation.active && woundInfectionNow >= 65 && previousWoundInfectionStage < 65 && minutesSinceRing >= 3) {
    clinicalState.lastRingAt = nowIso
    events.push({
      type: 'warning',
      severity: 'high',
      priority: 2,
      code: 'wound_infection_progression',
      message: `${patient.name}: Wunde zeigt deutliche Infektionszeichen (Rötung/Schwellung/Fiebertrend). Kontrolle, Reinigung und antiinfektive Therapie prüfen.`,
    })
  } else if (!resuscitation.active && woundInfectionNow >= 85 && previousWoundInfectionStage < 85) {
    events.push({
      type: 'critical',
      severity: 'critical',
      priority: 3,
      code: 'wound_infection_critical',
      message: `${patient.name}: fortgeschrittene Wundinfektion mit drohender systemischer Entgleisung. Sofortige Eskalation erforderlich.`,
    })
  }

  clinicalState.lastUpdatedAt = nowIso

  const lowPerfusionRhythm = resuscitation.active && (resuscitation.rhythm === 'asystole' || resuscitation.rhythm === 'pea')
  const deadState = clinicalState.outcome === 'dead' || resuscitation.status === 'dead'
  const nextVitals = {
    ...vitals,
    hr: Math.round(clamp(vitals.hr, deadState || lowPerfusionRhythm ? 0 : 25, 220)),
    rr: Math.round(clamp(vitals.rr, deadState ? 0 : 0, 60)),
    temp: +clamp(vitals.temp, 32, 42.5).toFixed(1),
    spo2: Math.round(clamp(vitals.spo2, deadState ? 0 : 0, 100)),
    bp: formatBp(bp.sys, bp.dia),
  }

  const nextPatient = {
    ...patient,
    vitals: nextVitals,
    clinicalState,
    vitalsHistory: pushVitalsHistory(patient, nextVitals, nowIso),
  }

  const hasRelevantChange =
    previousVitals.hr !== nextVitals.hr ||
    previousVitals.rr !== nextVitals.rr ||
    previousVitals.temp !== nextVitals.temp ||
    previousVitals.spo2 !== nextVitals.spo2 ||
    String(previousVitals.bp || '') !== String(nextVitals.bp || '') ||
    previousStability !== clinicalState.stability ||
    previousConsciousness !== clinicalState.consciousness ||
    previousOutcome !== clinicalState.outcome ||
    previousResuscitation.active !== resuscitation.active ||
    previousResuscitation.status !== resuscitation.status ||
    previousResuscitation.rhythm !== resuscitation.rhythm ||
    previousVomitActive !== !!clinicalState?.vomit?.active ||
    events.length > 0

  return {
    patient: nextPatient,
    events,
    changed: hasRelevantChange,
  }
}
