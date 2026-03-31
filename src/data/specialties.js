export const SPECIALIZATION_REQUIRED_CASES = 20

export const SPECIALTY_ACTION_KEYS = [
  'auscultations',
  'ecgs',
  'labsOrdered',
  'discharges',
  'bloodDraws',
]

export const SPECIALTIES = [
  {
    id: 'innere',
    name: 'Innere Medizin',
    short: 'Innere',
    unlocks: ['Erweiterte Labordiagnostik', 'Kardiopulmonale Diagnostik', 'Differenzialdiagnostik in der Notaufnahme'],
    requirements: {
      auscultations: 25,
      ecgs: 20,
      labsOrdered: 20,
      discharges: 10,
      bloodDraws: 10,
    },
  },
  {
    id: 'chirurgie',
    name: 'Chirurgie',
    short: 'Chirurgie',
    unlocks: ['Trauma- und Wundversorgung', 'Chirurgische Akutmaßnahmen', 'Perioperative Fallsteuerung'],
    requirements: {
      auscultations: 10,
      ecgs: 10,
      labsOrdered: 18,
      discharges: 15,
      bloodDraws: 20,
    },
  },
  {
    id: 'notfallmedizin',
    name: 'Notfallmedizin',
    short: 'Notfall',
    unlocks: ['Akut- und Schockraumversorgung', 'Monitoring-Management', 'Schnelle Triage-Entscheidungen'],
    requirements: {
      auscultations: 15,
      ecgs: 25,
      labsOrdered: 15,
      discharges: 8,
      bloodDraws: 15,
    },
  },
  {
    id: 'anaesthesie',
    name: 'Anästhesiologie',
    short: 'Anästhesie',
    unlocks: ['Atemwegs- und Monitoringfokus', 'Sedierungsnahe Akutmaßnahmen', 'Interdisziplinäre Intensivunterstützung'],
    requirements: {
      auscultations: 12,
      ecgs: 18,
      labsOrdered: 12,
      discharges: 8,
      bloodDraws: 12,
    },
  },
]

export function getSpecialtyById(id) {
  return SPECIALTIES.find(s => s.id === id) || null
}

export function getSpecialtyProgress(userStats = {}, specialtyId) {
  const spec = getSpecialtyById(specialtyId)
  if (!spec) return null
  const actionStats = userStats?.specialtyActionStats || {}
  const progress = Object.entries(spec.requirements).map(([key, req]) => {
    const done = actionStats[key] || 0
    return {
      key,
      done,
      req,
      percent: req > 0 ? Math.min(100, Math.round((done / req) * 100)) : 100,
    }
  })
  const overall = progress.length > 0 ? Math.round(progress.reduce((sum, p) => sum + p.percent, 0) / progress.length) : 0
  const ready = progress.every(p => p.done >= p.req)
  return { specialty: spec, progress, overall, ready }
}
