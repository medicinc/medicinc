/**
 * Lokaler E2E-Nutzer (Demo-Account gast.01) mit vollem App-Zugang für Playwright.
 * Nur gültig wenn Supabase im Test-Dev-Server deaktiviert ist (siehe playwright.config.js).
 */

export const E2E_EMAIL = 'gast.01@medisim.app'
export const E2E_USER_ID = 'e2e_local_gast_01'

const OWNER_PERMS = {
  manage_hospital: true,
  manage_rooms: true,
  manage_staff: true,
  manage_members: true,
  manage_permissions: true,
  manage_finances: true,
  treat_patients: true,
}

export const E2E_HOSPITAL_ID = 'h_e2e_playwright'

/** @param {string} userId */
export function buildOwnedHospitalMeta(userId) {
  const now = new Date().toISOString()
  return {
    id: E2E_HOSPITAL_ID,
    name: 'E2E Test Klinik',
    city: 'Berlin',
    specialty: 'general',
    theme: 'modern',
    description: 'Playwright',
    isPublic: true,
    maxMembers: 20,
    autoAccept: true,
    minLevel: 0,
    allowVisitors: true,
    startingRooms: ['er', 'waiting_room'],
    motto: '',
    difficultyPreference: 'mixed',
    language: 'de',
    level: 1,
    reputation: 0,
    balance: 0,
    members: 1,
    createdAt: now,
  }
}

/**
 * @param {string} userId
 * @param {ReturnType<typeof buildOwnedHospitalMeta>} owned
 */
export function buildHospitalState(userId, owned) {
  return {
    id: E2E_HOSPITAL_ID,
    name: owned.name,
    ownerId: userId,
    balance: 0,
    rooms: [
      { id: 'er', level: 1, condition: 100, patients: [] },
      { id: 'waiting_room', level: 1, condition: 100, patients: [] },
    ],
    treatmentRooms: [],
    members: [
      {
        userId,
        name: 'Medic Inc Gast 1',
        role: 'owner',
        rank: 'Assistenzarzt/-ärztin',
        permissions: OWNER_PERMS,
        joinedAt: new Date().toISOString(),
      },
    ],
    workers: [],
    patients: [],
    waitingRoom: [],
    settings: owned,
    activityLog: [],
    dailyCosts: 0,
    dailyIncome: 0,
    isClosed: false,
    closedAt: null,
    closureFines: 0,
    activeEvent: null,
    alertQueue: [],
    pagerMessages: [],
    ivenaQueue: [],
    stationEquipment: {},
    mobileSonoDeployment: {},
    dutyRoster: {},
    customStationNames: {},
    revenueDistribution: { primary: 40, assistant: 20, hospital: 30, supervisor: 10 },
    debtFlags: {
      warningIssued: false,
      autoClosed: false,
      insolvencyThreatIssued: false,
      policeStrikeCount: 0,
      lastPoliceTriggerBalance: null,
    },
    debtPopupToken: 0,
    debtPopupMessage: '',
  }
}

/**
 * Vollständiger User (entspricht grob createFreshUser + Onboarding/KH/RD).
 * @param {string} userId
 */
export function buildE2eUser(userId) {
  const ownedHospital = buildOwnedHospitalMeta(userId)
  return {
    id: userId,
    name: 'Medic Inc Gast 1',
    username: 'gast_01',
    email: E2E_EMAIL,
    role: 'guest',
    avatar: null,
    bio: '',
    prefix: '',
    level: 2,
    xp: 500,
    xpToNext: 1000,
    rank: 'assistenzarzt',
    title: 'Assistenzarzt',
    profession: 'dual',
    careerTrack: 'medical',
    medicalLicense: true,
    rescueCertified: true,
    rescueLevel: null,
    pendingMedicalOnboarding: false,
    pendingRescueOnboarding: false,
    hospitalId: E2E_HOSPITAL_ID,
    hospitalName: ownedHospital.name,
    rescueStationId: 'wache_nord',
    rescueStationName: 'Rettungswache Nord',
    ownedHospital,
    wallet: 500000,
    onboardingComplete: true,
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
    dailyLogin: { claimedCount: 30, lastClaimDateKey: '2026-04-01' },
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
    legalState: {
      active: false,
      kind: null,
      reason: '',
      source: '',
      severity: 0,
      fineAmount: 0,
      bailAmount: 0,
      releaseAt: null,
      createdAt: null,
    },
    authPassword: 'GastDemo#101',
    authLocked: true,
  }
}
