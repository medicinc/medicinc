function normalizeCode(value) {
  return String(value || '').trim().toUpperCase()
}

function codeStartsWithAny(code, prefixes) {
  return prefixes.some((prefix) => code.startsWith(prefix))
}

function getCodeGroup(code) {
  return normalizeCode(code).split('.')[0]
}

export function getPrimaryDiagnosisCode(patient) {
  const hidden = normalizeCode(patient?.trueDiagnoses?.primary?.code)
  if (hidden) return hidden
  return normalizeCode(patient?.diagnoses?.primary?.code)
}

export function resolveConditionKeyByCode(code) {
  const normalized = normalizeCode(code)
  if (!normalized) return 'generic'

  if (codeStartsWithAny(normalized, ['I21', 'I22', 'I20', 'I24'])) return 'myocardial_infarction'
  if (codeStartsWithAny(normalized, ['I63', 'I61', 'G45'])) return 'stroke'
  if (codeStartsWithAny(normalized, ['I26'])) return 'pulmonary_embolism'
  if (codeStartsWithAny(normalized, ['J18', 'J15', 'J12'])) return 'pneumonia'
  if (codeStartsWithAny(normalized, ['J44', 'J45', 'J96', 'R06'])) return 'obstructive_airway'
  if (codeStartsWithAny(normalized, ['E10', 'E11', 'E14', 'R73'])) return 'hyperglycemia'
  if (codeStartsWithAny(normalized, ['I50'])) return 'heart_failure'
  if (codeStartsWithAny(normalized, ['I48', 'I47', 'I49', 'R00'])) return 'arrhythmia'
  if (codeStartsWithAny(normalized, ['A41', 'N10', 'T81.4'])) return 'sepsis_infection'
  if (codeStartsWithAny(normalized, ['K92.2', 'K25.1', 'R58'])) return 'hemorrhage_hypovolemia'

  if (codeStartsWithAny(normalized, ['S00', 'S01', 'S51', 'S61', 'T14.0', 'T14.1'])) return 'surgical_trauma_minor'
  if (codeStartsWithAny(normalized, ['S', 'T14', 'T81', 'M79.81', 'K40', 'K35', 'K56', 'K25', 'S72', 'S82', 'S32', 'S43', 'N20'])) {
    return 'surgical_trauma_major'
  }
  return 'generic'
}

export function resolveConditionKey(patient) {
  return resolveConditionKeyByCode(getPrimaryDiagnosisCode(patient))
}

export function isPrimaryDiagnosisMatch(assignedCode, trueCode) {
  const assigned = normalizeCode(assignedCode)
  const hidden = normalizeCode(trueCode)
  if (!assigned || !hidden) return false
  return assigned === hidden || getCodeGroup(assigned) === getCodeGroup(hidden)
}
