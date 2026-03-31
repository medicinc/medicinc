/** Ermittelt, ob im aktuellen Gefäß eine sichtbare Stenose simuliert wird — abhängig von Diagnose & Gefäßwahl. */

function hashSeed(str) {
  const s = String(str || '')
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function normalizeClinicalText(patient) {
  const parts = [
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.diagnoses?.primary?.code,
    patient?.trueDiagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.code,
  ]
  return parts.map((p) => String(p || '').toLowerCase()).join(' ')
}

function hasCoronaryArteryDiseaseEvidence(patient) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const text = normalizeClinicalText(patient)
  if (/^I2[0-5]/.test(code)) return true
  if (/koronar|koronarang|heart attack|myokard|infarkt|stem|nstemi|acs\b|angina|atheroskler.*herz|khk\b|pci\b|stent/i.test(text)) return true
  return false
}

const VESSEL_KEYS = ['LCA_RCX', 'LCA_RIVA', 'RCA_RPL', 'RCA_RIP']

/**
 * @param {object} patient
 * @param {string} vesselKey e.g. LCA_RIVA
 * @returns {{ active: boolean, t: number, w: number }}
 */
export function getCoronaryLesionForVessel(patient, vesselKey) {
  const defaultT = 0.55
  const defaultW = 0.11

  if (!patient || !VESSEL_KEYS.includes(vesselKey)) {
    return { active: false, t: defaultT, w: defaultW }
  }

  if (!hasCoronaryArteryDiseaseEvidence(patient)) {
    return { active: false, t: defaultT, w: defaultW }
  }

  const text = normalizeClinicalText(patient)
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()

  /** Hohe Spezifität: Vorderwand / LAD / anteriore Ableitungen → RIVA */
  const anteriorTerritory = /vorderwand|anterior|vorder|lad\b|riva\b|interventricularis anterior|v2|v3|v4|v5|i21\.0|i21\.4/i.test(text)
    || /^I21\.0/.test(code)
  /** Inferior / RCA / Hinterwand */
  const inferiorTerritory = /inferior|inferiorer|ii\b|iii|avf|rca\b|hinterwand|posterior|rip\b|i21\.1|i21\.3/i.test(text)
    || /^I21\.1|^I21\.3/.test(code)
  /** Seitenwand / Circumflex */
  const lateralTerritory = /circumflex|rcx|ramus circumflex|seitenwand|lateral|avl|i21\.2/i.test(text)
    || /^I21\.2/.test(code)

  const flagged = new Set()
  if (anteriorTerritory) flagged.add('LCA_RIVA')
  if (inferiorTerritory) flagged.add('RCA_RIP')
  if (lateralTerritory) flagged.add('LCA_RCX')

  /** Rechtssystem ohne KLARUM: oft RCA-Stamm / PL; ein Engpass reicht */
  if (flagged.size === 0 && /rechts|right|'rca|rechte koronar/i.test(text)) {
    const pick = (hashSeed(`${patient?.id}|rca`) % 2) === 0 ? 'RCA_RPL' : 'RCA_RIP'
    flagged.add(pick)
  }

  /** Generisches ACS / KHK ohne Lokalisation: höchstens ein bis zwei Gefäße, deterministisch */
  if (flagged.size === 0) {
    const seed = hashSeed(patient?.id || 'anon')
    const nLesions = (seed % 10) < 3 ? 1 : (seed % 10) < 6 ? 2 : 1
    const order = [...VESSEL_KEYS].sort((a, b) => (hashSeed(`${seed}|${a}`) % 1000) - (hashSeed(`${seed}|${b}`) % 1000))
    for (let i = 0; i < nLesions && i < order.length; i += 1) {
      flagged.add(order[i])
    }
  }

  /** Meist nur ein bis zwei betroffene Äste */
  if (flagged.size > 2) {
    const arr = [...flagged].sort((a, b) => hashSeed(`${patient?.id}|${a}`) - hashSeed(`${patient?.id}|${b}`))
    flagged.clear()
    flagged.add(arr[0])
    flagged.add(arr[1])
  }

  if (!flagged.has(vesselKey)) {
    return { active: false, t: defaultT, w: defaultW }
  }

  const tJitter = ((hashSeed(`${patient?.id}|${vesselKey}|t`) % 200) / 2000) - 0.05
  const wJitter = ((hashSeed(`${patient?.id}|${vesselKey}|w`) % 100) / 2500)
  return {
    active: true,
    t: Math.max(0.35, Math.min(0.72, defaultT + tJitter)),
    w: Math.max(0.07, Math.min(0.16, defaultW + wJitter)),
  }
}
