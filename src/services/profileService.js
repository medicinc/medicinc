import { getCurrentRank } from '../data/ranks'

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

function toArrayJson(value, fallback = []) {
  if (Array.isArray(value)) return value
  return fallback
}

function toObjectJson(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return fallback
}

export function createFreshUser(name, email, id = Date.now().toString()) {
  return {
    id,
    name,
    email,
    avatar: null,
    bio: '',
    prefix: '',
    level: 1,
    xp: 0,
    xpToNext: 500,
    rank: 'assistenzarzt',
    title: '',
    profession: null,
    careerTrack: null,
    medicalLicense: false,
    rescueCertified: false,
    rescueLevel: null,
    pendingMedicalOnboarding: false,
    pendingRescueOnboarding: false,
    hospitalId: null,
    hospitalName: null,
    rescueStationId: null,
    rescueStationName: null,
    wallet: 5000,
    onboardingComplete: false,
    completedExams: [],
    completedRescueExams: [],
    completedCourses: [],
    purchasedCourses: [],
    courseProgress: {},
    stats: {
      casesCompleted: 0,
      successfulCases: 0,
      successRate: 0,
      patientsHelped: 0,
      reputation: 0,
      specialtyActionStats: {
        auscultations: 0,
        ecgs: 0,
        labsOrdered: 0,
        discharges: 0,
        bloodDraws: 0,
      },
    },
    specialty: null,
    usedCoupons: [],
    unlockedKnowledge: [],
    documentTextBlocks: [],
    joinedAt: new Date().toISOString(),
    showDailyLoginIntro: false,
    dailyLogin: {
      claimedCount: 0,
      lastClaimDateKey: null,
    },
    specialState: {
      ownedLegendaryTools: [],
      utilityPassInventory: {},
      activeLegendaryToolId: null,
      legendaryLastSwitchAt: null,
      activeUtilityPass: null,
      manvTriggerReady: false,
      badges: [],
      honorTitles: [],
      selectedHonorTitle: null,
    },
    achievementUnlocks: {},
  }
}

export function profileRowToUser(row) {
  if (!row) return null
  const base = createFreshUser(row.name || 'User', row.email || '', row.id)
  const merged = {
    ...base,
    id: row.id,
    email: row.email,
    name: row.name || base.name,
    avatar: row.avatar,
    bio: row.bio || '',
    prefix: row.prefix || '',
    level: row.level ?? 0,
    xp: row.xp ?? 0,
    xpToNext: row.xp_to_next ?? 500,
    rank: row.rank || 'assistenzarzt',
    title: row.title || base.title,
    profession: row.profession || null,
    careerTrack: row.career_track || null,
    medicalLicense: !!row.medical_license,
    rescueCertified: !!row.rescue_certified,
    rescueLevel: row.rescue_level || null,
    pendingMedicalOnboarding: !!row.pending_medical_onboarding,
    pendingRescueOnboarding: !!row.pending_rescue_onboarding,
    hospitalId: row.hospital_id || null,
    hospitalName: row.hospital_name || null,
    rescueStationId: row.rescue_station_id || null,
    rescueStationName: row.rescue_station_name || null,
    wallet: row.wallet ?? 5000,
    onboardingComplete: !!row.onboarding_complete,
    completedExams: toArrayJson(row.completed_exams),
    completedRescueExams: toArrayJson(row.completed_rescue_exams),
    completedCourses: toArrayJson(row.completed_courses),
    purchasedCourses: toArrayJson(row.purchased_courses),
    courseProgress: toObjectJson(row.course_progress),
    stats: toObjectJson(row.stats, base.stats),
    specialty: row.specialty || null,
    usedCoupons: toArrayJson(row.used_coupons),
    unlockedKnowledge: toArrayJson(row.unlocked_knowledge),
    documentTextBlocks: toArrayJson(row.document_text_blocks),
    ownedHospital: row.owned_hospital || null,
    btmCertified: !!row.btm_certified,
    joinedAt: row.joined_at || base.joinedAt,
  }
  const rank = getCurrentRank(merged)
  merged.rank = rank.id
  merged.title = rank.name
  return merged
}

export function userToProfileRow(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    bio: user.bio || '',
    prefix: user.prefix || '',
    level: user.level ?? 0,
    xp: user.xp ?? 0,
    xp_to_next: user.xpToNext ?? 500,
    rank: user.rank || 'assistenzarzt',
    title: user.title || 'Medizinstudent*in',
    profession: user.profession || null,
    career_track: user.careerTrack || null,
    medical_license: !!user.medicalLicense,
    rescue_certified: !!user.rescueCertified,
    rescue_level: user.rescueLevel || null,
    pending_medical_onboarding: !!user.pendingMedicalOnboarding,
    pending_rescue_onboarding: !!user.pendingRescueOnboarding,
    hospital_id: user.hospitalId || null,
    hospital_name: user.hospitalName || null,
    rescue_station_id: user.rescueStationId || null,
    rescue_station_name: user.rescueStationName || null,
    wallet: user.wallet ?? 5000,
    onboarding_complete: !!user.onboardingComplete,
    completed_exams: user.completedExams || [],
    completed_rescue_exams: user.completedRescueExams || [],
    completed_courses: user.completedCourses || [],
    purchased_courses: user.purchasedCourses || [],
    course_progress: user.courseProgress || {},
    stats: user.stats || {},
    specialty: user.specialty || null,
    used_coupons: user.usedCoupons || [],
    unlocked_knowledge: user.unlockedKnowledge || [],
    document_text_blocks: user.documentTextBlocks || [],
    owned_hospital: user.ownedHospital || null,
    btm_certified: !!user.btmCertified,
    joined_at: user.joinedAt || new Date().toISOString(),
  }
}

export async function upsertProfile(user) {
  if (!user) return { data: null, error: null }
  localStorage.setItem('medisim_user', JSON.stringify(user))
  if (user?.email) {
    localStorage.setItem('medisim_user_' + user.email, JSON.stringify(user))
  }
  return { data: userToProfileRow(user), error: null }
}

export async function fetchProfileById(id) {
  if (!id) return { data: null, error: null }
  const current = safeParseJson(localStorage.getItem('medisim_user'), null)
  if (current?.id === id) {
    return { data: userToProfileRow(current), error: null }
  }
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('medisim_user_')) continue
    const parsed = safeParseJson(localStorage.getItem(key), null)
    if (parsed?.id === id) return { data: userToProfileRow(parsed), error: null }
  }
  return { data: null, error: null }
}

export async function exportUserDataBundle(user) {
  if (!user?.id) return { data: null, error: new Error('Kein aktiver Nutzer gefunden.') }
  const now = new Date().toISOString()
  const profile = safeParseJson(localStorage.getItem('medisim_user_' + user.email), user) || user
  return {
    data: {
      exportedAt: now,
      user: profile,
      notes: [
        'Lokaler Export (Entwicklungsbetrieb).',
        'Produktivbetrieb: Export erfolgt serverseitig über Supabase DSAR Endpoint.',
      ],
    },
    error: null,
  }
}

export async function removeUserLocalData(user) {
  if (!user?.email) return { error: new Error('Kein Nutzer zum Löschen gefunden.') }
  localStorage.removeItem('medisim_user')
  localStorage.removeItem('medisim_user_' + user.email)
  return { error: null }
}
