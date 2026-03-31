export const RANK_CAPABILITY_LABELS = {
  treat_basic_patients: 'Basisbehandlung durchführen',
  order_basic_diagnostics: 'Basisdiagnostik anfordern',
  view_patient_files: 'Patientenakten einsehen',
  treat_complex_patients: 'Komplexe Fälle behandeln',
  order_advanced_diagnostics: 'Erweiterte Diagnostik anfordern',
  perform_specialty_actions: 'Fachrichtungsgebundene Maßnahmen',
  assign_supervisor: 'Supervisor-Rolle übernehmen',
  manage_rooms_basic: 'Räume/Stationen bearbeiten',
  purchase_standard_medication: 'Standard-Medikamentenbestellung',
  close_hospital_intake: 'Patientenaufnahme pausieren/öffnen',
  manage_department: 'Abteilungs-/Managementfunktionen nutzen',
  manage_staffing: 'Personal verwalten',
  approve_critical_operations: 'Kritische Freigaben erteilen',
  manage_hospital_strategy: 'Strategische Krankenhaussteuerung',
  manage_permissions: 'Mitglieder-Berechtigungen verwalten',
  promote_members: 'Mitglieder befördern',
  full_admin_override: 'Volle administrative Freigaben',
}

export const ACTIVE_RUNTIME_PERK_KEYS = [
  {
    key: 'courseCostDiscountPercent',
    label: 'Kurskosten-Rabatt',
    source: 'courses:purchase',
  },
  {
    key: 'retryCostDiscountPercent',
    label: 'Wiederholungs-/Prüfungsgebühren-Rabatt',
    source: 'courses:retry',
  },
  {
    key: 'courseXpBonusPercent',
    label: 'Kurs-XP-Bonus',
    source: 'courses:xp',
  },
  {
    key: 'physicianShareBonusPercent',
    label: 'Arztanteil-Bonus bei Entlassung',
    source: 'hospital:discharge_revenue',
  },
]

export const RANKS = [
  {
    id: 'assistenzarzt',
    name: 'Assistenzarzt/-ärztin',
    shortName: 'Assistenzarzt',
    level: 1,
    color: 'from-blue-500 to-blue-600',
    badge: '🩺',
    requirements: { courses: 0, casesCompleted: 0, successRate: 0 },
    perks: {
      courseCostDiscountPercent: 0,
      retryCostDiscountPercent: 0,
      courseXpBonusPercent: 0,
      physicianShareBonusPercent: 0,
    },
    unlocks: [
      'Patienten betreuen',
      'Grundlegende Diagnostik anfordern',
      'Einfache Behandlungen durchführen',
      'Patientenakten einsehen',
    ],
    capabilities: [
      'treat_basic_patients',
      'order_basic_diagnostics',
      'view_patient_files',
    ],
  },
  {
    id: 'facharzt',
    name: 'Facharzt/-ärztin',
    shortName: 'Facharzt',
    level: 2,
    color: 'from-purple-500 to-purple-600',
    badge: '⚕️',
    requirements: { courses: 1, casesCompleted: 20, successRate: 70 },
    perks: {
      courseCostDiscountPercent: 5,
      retryCostDiscountPercent: 5,
      courseXpBonusPercent: 5,
      physicianShareBonusPercent: 5,
    },
    unlocks: [
      'Komplexe Fälle leiten',
      'Alle Diagnostik anfordern',
      'Assistenzärzte anleiten',
      'Fachspezifische Eingriffe',
    ],
    capabilities: [
      'treat_complex_patients',
      'order_advanced_diagnostics',
      'perform_specialty_actions',
      'manage_rooms_basic',
      'purchase_standard_medication',
      'close_hospital_intake',
    ],
  },
  {
    id: 'oberarzt',
    name: 'Oberarzt/-ärztin',
    shortName: 'Oberarzt',
    level: 3,
    color: 'from-amber-500 to-amber-600',
    badge: '🏅',
    requirements: { courses: 3, casesCompleted: 150, successRate: 80 },
    perks: {
      courseCostDiscountPercent: 10,
      retryCostDiscountPercent: 12,
      courseXpBonusPercent: 10,
      physicianShareBonusPercent: 12,
    },
    unlocks: [
      'Abteilung verwalten',
      'Operationen genehmigen',
      'Personal einstellen/entlassen',
      'Erweiterte Krankenhausfunktionen',
    ],
    capabilities: [
      'assign_supervisor',
      'manage_department',
      'manage_staffing',
      'approve_critical_operations',
    ],
  },
  {
    id: 'chefarzt',
    name: 'Chefarzt/-ärztin',
    shortName: 'Chefarzt',
    level: 4,
    color: 'from-rose-500 to-rose-600',
    badge: '👑',
    requirements: { courses: 6, casesCompleted: 300, successRate: 90 },
    perks: {
      courseCostDiscountPercent: 15,
      retryCostDiscountPercent: 20,
      courseXpBonusPercent: 15,
      physicianShareBonusPercent: 20,
    },
    unlocks: [
      'Volle Krankenhausleitung',
      'Strategische Entscheidungen',
      'Andere befördern',
      'Alle Funktionen freigeschaltet',
    ],
    capabilities: [
      'manage_hospital_strategy',
      'manage_permissions',
      'promote_members',
      'full_admin_override',
    ],
  },
]

export const RESCUE_RANKS = [
  {
    id: 'rettungssanitaeter',
    name: 'Rettungssanitäter/in',
    shortName: 'RettSan',
    level: 1,
    color: 'from-orange-500 to-red-600',
    badge: '🚑',
    requirements: { courses: 0, casesCompleted: 0, successRate: 0 },
    unlocks: ['RTW-Basisdienst', 'Standard-Notfallversorgung', 'Transportentscheidungen'],
  },
  {
    id: 'notfallsanitaeter',
    name: 'Notfallsanitäter/in',
    shortName: 'NotSan',
    level: 2,
    color: 'from-red-500 to-rose-600',
    badge: '🚨',
    requirements: { courses: 1, casesCompleted: 0, successRate: 0 },
    unlocks: ['Erweiterte Maßnahmen', 'Komplexe Einsätze', 'Erhöhte Verdienststufe'],
  },
]

export function normalizeSpecialtyId(rawId) {
  const id = String(rawId || '').toLowerCase()
  const alias = {
    notfall: 'notfallmedizin',
    anaesthesiologie: 'anaesthesie',
    neurologie_kurs: 'neurologie',
  }
  return alias[id] || id
}

export const SPECIALTY_PROMOTION_COURSES = {
  innere: { facharzt: 'innere', oberarzt: 'oa_innere', chefarzt: 'ca_innere' },
  chirurgie: { facharzt: 'chirurgie', oberarzt: 'oa_chirurgie', chefarzt: 'ca_chirurgie' },
  notfallmedizin: { facharzt: 'notfall', oberarzt: 'oa_notfallmedizin', chefarzt: 'ca_notfallmedizin' },
  anaesthesie: { facharzt: 'anaesthesie', oberarzt: 'oa_anaesthesie', chefarzt: 'ca_anaesthesie' },
  neurologie: { facharzt: 'neurologie_kurs', oberarzt: 'oa_neurologie', chefarzt: 'ca_neurologie' },
}

const CORE_FACHARZT_COURSE_IDS = new Set(
  Object.values(SPECIALTY_PROMOTION_COURSES).map((row) => row.facharzt),
)

export function getCurrentRank(user) {
  if (!user) return RANKS[0]
  if (user?.careerTrack === 'rescue' && !user?.medicalLicense) {
    return String(user?.rescueLevel || '') === 'notfallsanitaeter' ? RESCUE_RANKS[1] : RESCUE_RANKS[0]
  }

  const completedCourses = new Set(user?.completedCourses || [])
  const specialtyId = normalizeSpecialtyId(user?.specialty)
  const hasAnyCoreFacharztCourse = [...CORE_FACHARZT_COURSE_IDS].some((id) => completedCourses.has(id))
  const track = SPECIALTY_PROMOTION_COURSES[specialtyId] || null

  // Facharzt: allgemeiner Rangfortschritt + irgendein Facharztkurs
  const facharztByStats = meetsMedicalRankRequirements(user, 'facharzt')
  if (!facharztByStats || !hasAnyCoreFacharztCourse) return RANKS[0]

  // Oberarzt: gewaehlte Fachrichtung + Facharztkurs und OA-Kurs dieser Fachrichtung + Rangfortschritt
  const oberarztByStats = meetsMedicalRankRequirements(user, 'oberarzt')
  const hasOberarztTrackCourse = !!(
    specialtyId
    && track?.facharzt
    && track?.oberarzt
    && completedCourses.has(track.facharzt)
    && completedCourses.has(track.oberarzt)
  )
  if (!oberarztByStats || !hasOberarztTrackCourse) return RANKS[1]

  // Chefarzt: CA-Kurs der gewaehlten Fachrichtung + Rangfortschritt
  const chefarztByStats = meetsMedicalRankRequirements(user, 'chefarzt')
  const hasChefarztTrackCourse = !!(specialtyId && track?.chefarzt && completedCourses.has(track.chefarzt))
  if (!chefarztByStats || !hasChefarztTrackCourse) return RANKS[2]

  return RANKS[3]
}

export function getNextRank(user) {
  const current = getCurrentRank(user)
  if (user?.careerTrack === 'rescue' && !user?.medicalLicense) {
    const idx = RESCUE_RANKS.findIndex(r => r.id === current.id)
    return idx < RESCUE_RANKS.length - 1 ? RESCUE_RANKS[idx + 1] : null
  }
  const idx = RANKS.findIndex(r => r.id === current.id)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}

export function getRankCapabilities(user) {
  if (!user) return []
  if (user?.careerTrack === 'rescue' && !user?.medicalLicense) return []
  const current = getCurrentRank(user)
  const currentLevel = Number(current?.level || 1)
  return RANKS
    .filter((rank) => Number(rank?.level || 0) <= currentLevel)
    .flatMap((rank) => (Array.isArray(rank?.capabilities) ? rank.capabilities : []))
    .filter((capability, index, arr) => capability && arr.indexOf(capability) === index)
}

export function hasRankCapability(user, capabilityId) {
  if (!capabilityId) return false
  return getRankCapabilities(user).includes(capabilityId)
}

export function getRankProgress(user) {
  const next = getNextRank(user)
  if (!next) {
    return {
      courses: 100,
      cases: 100,
      successRate: 100,
      overall: 100,
      courseLabel: 'Kursanforderung',
      courseCurrent: 1,
      courseRequired: 1,
    }
  }

  const completedCourseSet = new Set(user?.completedCourses || [])
  const cases = user?.stats?.casesCompleted || 0
  const rate = user?.stats?.successRate || 0

  let courseCurrent = 0
  let courseRequired = 1
  let courseLabel = 'Kursanforderung'
  let courseHint = ''
  if (next.id === 'facharzt') {
    courseLabel = 'Facharztkurs'
    courseCurrent = [...CORE_FACHARZT_COURSE_IDS].some((id) => completedCourseSet.has(id)) ? 1 : 0
  } else {
    const specialtyId = normalizeSpecialtyId(user?.specialty)
    const track = SPECIALTY_PROMOTION_COURSES[specialtyId] || null
    if (!specialtyId || !track) {
      courseLabel = next.id === 'oberarzt' ? 'Oberarztkurs' : 'Chefarztkurs'
      courseCurrent = 0
      courseHint = 'Fachrichtung wählen'
    } else if (next.id === 'oberarzt') {
      courseLabel = 'Oberarztkurs'
      courseCurrent = track.oberarzt && completedCourseSet.has(track.oberarzt) ? 1 : 0
    } else if (next.id === 'chefarzt') {
      courseLabel = 'Chefarztkurs'
      courseCurrent = track.chefarzt && completedCourseSet.has(track.chefarzt) ? 1 : 0
    }
  }

  const cp = courseRequired > 0 ? Math.min(100, (courseCurrent / courseRequired) * 100) : 100
  const cap = next.requirements.casesCompleted > 0 ? Math.min(100, (cases / next.requirements.casesCompleted) * 100) : 100
  const rp = next.requirements.successRate > 0 ? Math.min(100, (rate / next.requirements.successRate) * 100) : 100
  return {
    courses: Math.round(cp),
    cases: Math.round(cap),
    successRate: Math.round(rp),
    overall: Math.round((cp + cap + rp) / 3),
    courseLabel,
    courseCurrent,
    courseRequired,
    courseHint,
  }
}

export function meetsMedicalRankRequirements(user, rankId) {
  const rank = RANKS.find((r) => r.id === rankId)
  if (!rank) return false
  const cases = user?.stats?.casesCompleted || 0
  const rate = user?.stats?.successRate || 0
  return cases >= rank.requirements.casesCompleted
    && rate >= rank.requirements.successRate
}
