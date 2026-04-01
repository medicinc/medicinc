import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getCurrentRank } from '../data/ranks'
import { computeNewAchievementUnlocks } from '../data/achievements'
import { createFreshUser } from '../services/profileService'
import { removeUserLocalData } from '../services/profileService'
import { removeHospitalsOwnedByUser } from '../services/hospitalService'
import { getSupabaseClient, isUuid } from '../lib/supabaseClient'
import { buildUserFromSession, userToGameData, upsertProfileGameData } from '../services/supabaseProfileRepository'
import { migrateLocalProfileToSupabaseIfNeeded } from '../services/localStorageMigration'
import { registerWithAlphaGate } from '../services/alphaRegistrationService'

const AuthContext = createContext(null)
const XP_PER_LEVEL = 500
const FIXED_ADMIN_ACCOUNTS = [
  {
    name: 'Medic Inc Leitstellen-Admin',
    username: 'leitstelle_admin',
    email: 'leitstelle.admin@medisim.app',
    password: 'M8d!Sim-ResQ-742',
  },
  {
    name: 'Medic Inc Klinik-Admin',
    username: 'klinik_admin',
    email: 'klinik.admin@medisim.app',
    password: 'N4chtVisite#905',
  },
]
const FIXED_GUEST_ACCOUNTS = [
  {
    name: 'Medic Inc Gast 1',
    username: 'gast_01',
    email: 'gast.01@medisim.app',
    password: 'GastDemo#101',
  },
  {
    name: 'Medic Inc Gast 2',
    username: 'gast_02',
    email: 'gast.02@medisim.app',
    password: 'GastDemo#202',
  },
  {
    name: 'Medic Inc Gast 3',
    username: 'gast_03',
    email: 'gast.03@medisim.app',
    password: 'GastDemo#303',
  },
  {
    name: 'Medic Inc Alpha Test 1',
    username: 'alpha_01',
    email: 'alpha.01@medisim.app',
    password: 'AlphaTest#401',
  },
  {
    name: 'Medic Inc Alpha Test 2',
    username: 'alpha_02',
    email: 'alpha.02@medisim.app',
    password: 'AlphaTest#402',
  },
  {
    name: 'Medic Inc Alpha Test 3',
    username: 'alpha_03',
    email: 'alpha.03@medisim.app',
    password: 'AlphaTest#403',
  },
  {
    name: 'Medic Inc Alpha Test 4',
    username: 'alpha_04',
    email: 'alpha.04@medisim.app',
    password: 'AlphaTest#404',
  },
  {
    name: 'Medic Inc Alpha Test 5',
    username: 'alpha_05',
    email: 'alpha.05@medisim.app',
    password: 'AlphaTest#405',
  },
]
const FIXED_ALLOWED_ACCOUNTS = [
  ...FIXED_ADMIN_ACCOUNTS,
  ...FIXED_GUEST_ACCOUNTS,
]
const FIXED_ALLOWED_EMAILS = new Set(FIXED_ALLOWED_ACCOUNTS.map((entry) => String(entry.email || '').toLowerCase()))
const LEGAL_SEVERITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

function withLevelProgress(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') return rawUser
  const prevStats = rawUser.stats && typeof rawUser.stats === 'object' ? rawUser.stats : {}
  const casesCompleted = Math.max(0, Number(prevStats.casesCompleted || 0))
  const successfulCases = Math.max(0, Math.min(casesCompleted, Number(prevStats.successfulCases || 0)))
  const patientsHelped = Math.max(0, Number(prevStats.patientsHelped || 0))
  const computedSuccessRate = casesCompleted > 0
    ? Math.round((successfulCases / casesCompleted) * 100)
    : 0
  const xp = Math.max(0, Number(rawUser.xp || 0))
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpToNext = level * XP_PER_LEVEL
  return {
    ...rawUser,
    stats: {
      ...prevStats,
      casesCompleted,
      successfulCases,
      patientsHelped,
      successRate: computedSuccessRate,
    },
    xp,
    level,
    xpToNext,
  }
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeLegalState(state) {
  const now = Date.now()
  const releaseAt = Number(state?.releaseAt || 0)
  const kind = state?.kind === 'jail' ? 'jail' : (state?.kind === 'fine' ? 'fine' : null)
  const activeByTime = kind === 'jail' ? releaseAt > now : !!state?.active
  return {
    active: activeByTime,
    kind,
    reason: String(state?.reason || ''),
    source: String(state?.source || ''),
    severity: Number(state?.severity || 0),
    fineAmount: Math.max(0, Number(state?.fineAmount || 0)),
    bailAmount: Math.max(0, Number(state?.bailAmount || 0)),
    releaseAt: releaseAt || null,
    createdAt: state?.createdAt || null,
  }
}

function normalizeSpecialState(state) {
  if (!state || typeof state !== 'object') {
    return {
      ownedLegendaryTools: [],
      utilityPassInventory: {},
      activeLegendaryToolId: null,
      legendaryLastSwitchAt: null,
      activeUtilityPass: null,
      manvTriggerReady: false,
      badges: [],
      honorTitles: [],
      selectedHonorTitle: null,
    }
  }
  return {
    ownedLegendaryTools: Array.isArray(state.ownedLegendaryTools) ? state.ownedLegendaryTools : [],
    utilityPassInventory: state.utilityPassInventory && typeof state.utilityPassInventory === 'object' ? state.utilityPassInventory : {},
    activeLegendaryToolId: state.activeLegendaryToolId || null,
    legendaryLastSwitchAt: state.legendaryLastSwitchAt || null,
    activeUtilityPass: state.activeUtilityPass && typeof state.activeUtilityPass === 'object' ? state.activeUtilityPass : null,
    manvTriggerReady: !!state.manvTriggerReady,
    badges: Array.isArray(state.badges) ? state.badges : [],
    honorTitles: Array.isArray(state.honorTitles) ? state.honorTitles : [],
    selectedHonorTitle: state.selectedHonorTitle || null,
  }
}

function withUserRuntimeDefaults(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') return rawUser
  const dl = rawUser.dailyLogin && typeof rawUser.dailyLogin === 'object'
    ? rawUser.dailyLogin
    : { claimedCount: 0, lastClaimDateKey: null }
  return {
    ...rawUser,
    dailyLogin: dl,
    achievementUnlocks: rawUser.achievementUnlocks && typeof rawUser.achievementUnlocks === 'object'
      ? rawUser.achievementUnlocks
      : {},
    legalState: normalizeLegalState(rawUser.legalState),
    specialState: normalizeSpecialState(rawUser.specialState),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const parsed = safeParseJson(localStorage.getItem('medisim_user'), null)
    return parsed ? withUserRuntimeDefaults(withLevelProgress(parsed)) : null
  })
  const [authLoading, setAuthLoading] = useState(false)
  const [dailyLoginPanelOpen, setDailyLoginPanelOpen] = useState(false)

  const openDailyLoginPanel = useCallback(() => setDailyLoginPanelOpen(true), [])
  const closeDailyLoginPanel = useCallback(() => setDailyLoginPanelOpen(false), [])

  const syncProfileToCloud = useCallback((merged) => {
    const sb = getSupabaseClient()
    if (sb && merged && isUuid(merged.id)) {
      upsertProfileGameData(merged.id, merged.email, userToGameData(merged)).catch(() => {})
    }
  }, [])

  const persist = useCallback((u) => {
    const normalized = withUserRuntimeDefaults(withLevelProgress(u))
    setUser(normalized)
    localStorage.setItem('medisim_user', JSON.stringify(normalized))
    if (normalized?.email) {
      localStorage.setItem('medisim_user_' + normalized.email, JSON.stringify(normalized))
    }
    syncProfileToCloud(normalized)
  }, [syncProfileToCloud])

  const bootstrapFixedAccounts = useCallback(() => {
    FIXED_ALLOWED_ACCOUNTS.forEach((account) => {
      const isAdminAccount = FIXED_ADMIN_ACCOUNTS.some((entry) => entry.email === account.email)
      const key = 'medisim_user_' + account.email
      const existing = safeParseJson(localStorage.getItem(key), null)
      const base = withLevelProgress({
        ...createFreshUser(account.name, account.email),
        name: account.name,
        username: account.username,
        email: account.email,
        role: isAdminAccount ? 'admin' : 'guest',
        onboardingComplete: false,
        medicalLicense: false,
        rescueCertified: false,
      })
      const merged = withLevelProgress({
        ...base,
        ...(existing || {}),
        name: account.name,
        username: account.username,
        email: account.email,
        role: isAdminAccount ? 'admin' : 'guest',
        // Keep onboarding/progress state for existing accounts.
        // Only brand-new accounts start without completed onboarding.
        onboardingComplete: typeof existing?.onboardingComplete === 'boolean' ? existing.onboardingComplete : false,
        medicalLicense: typeof existing?.medicalLicense === 'boolean' ? existing.medicalLicense : false,
        rescueCertified: typeof existing?.rescueCertified === 'boolean' ? existing.rescueCertified : false,
        profession: existing?.profession ?? null,
        careerTrack: existing?.careerTrack ?? null,
        pendingMedicalOnboarding: !!existing?.pendingMedicalOnboarding,
        pendingRescueOnboarding: !!existing?.pendingRescueOnboarding,
        hospitalId: existing?.hospitalId || null,
        hospitalName: existing?.hospitalName || null,
        rescueStationId: existing?.rescueStationId || null,
        rescueStationName: existing?.rescueStationName || null,
        authPassword: account.password,
        authLocked: true,
        legalState: normalizeLegalState(existing?.legalState),
      })
      localStorage.setItem(key, JSON.stringify(merged))
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const sb = getSupabaseClient()
    if (sb) {
      ;(async () => {
        try {
          const { data: { session }, error: sessionError } = await sb.auth.getSession()
          if (sessionError) throw sessionError
          if (cancelled) return
          if (session?.user) {
            await migrateLocalProfileToSupabaseIfNeeded(session.user)
            const mapped = await buildUserFromSession(session)
            if (mapped) {
              persist({ ...mapped, id: session.user.id, email: session.user.email || mapped.email })
            }
          } else {
            setUser(null)
            localStorage.removeItem('medisim_user')
          }
        } catch (_error) {
          // Keep current user state on transient auth/session errors.
        } finally {
          if (!cancelled) setAuthLoading(false)
        }
      })()
      const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
        if (cancelled) return
        try {
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null)
            localStorage.removeItem('medisim_user')
            return
          }
          if (session.user) {
            await migrateLocalProfileToSupabaseIfNeeded(session.user)
            const mapped = await buildUserFromSession(session)
            if (mapped) {
              persist({ ...mapped, id: session.user.id, email: session.user.email || mapped.email })
            }
          }
        } catch (_error) {
          // Keep existing user and avoid forced logout on transient issues.
        } finally {
          if (!cancelled) setAuthLoading(false)
        }
      })
      return () => {
        cancelled = true
        sub.subscription.unsubscribe()
      }
    }
    bootstrapFixedAccounts()
    const saved = localStorage.getItem('medisim_user')
    const parsed = safeParseJson(saved)
    if (parsed && FIXED_ALLOWED_EMAILS.has(normalizeIdentifier(parsed?.email))) {
      const canonical = safeParseJson(localStorage.getItem('medisim_user_' + parsed.email), parsed)
      persist(canonical || parsed)
    } else {
      localStorage.removeItem('medisim_user')
    }
    setAuthLoading(false)
    return () => { cancelled = true }
  }, [bootstrapFixedAccounts, persist])

  const resolveUserByIdentifier = (identifier) => {
    const key = String(identifier || '').trim()
    if (!key) return null
    const byEmail = localStorage.getItem('medisim_user_' + key)
    const parsedByEmail = safeParseJson(byEmail)
    if (parsedByEmail && FIXED_ALLOWED_EMAILS.has(normalizeIdentifier(parsedByEmail?.email))) return parsedByEmail
    const lowered = key.toLowerCase()
    const fixedCandidates = FIXED_ALLOWED_ACCOUNTS
      .map((account) => safeParseJson(localStorage.getItem('medisim_user_' + account.email)))
      .filter(Boolean)
    for (const candidate of fixedCandidates) {
      const emailMatch = normalizeIdentifier(candidate.email) === lowered
      const nameMatch = normalizeIdentifier(candidate.name) === lowered
      const usernameMatch = normalizeIdentifier(candidate.username) === lowered
      if (emailMatch || nameMatch || usernameMatch) return candidate
    }
    return null
  }

  const login = useCallback(async (identifier, password) => {
    bootstrapFixedAccounts()
    const sb = getSupabaseClient()
    const normalizedIdentifier = normalizeIdentifier(identifier)
    const resolvedCandidate = resolveUserByIdentifier(identifier)
    const email = String(identifier).includes('@')
      ? String(identifier).trim().toLowerCase()
      : (resolvedCandidate?.email ? String(resolvedCandidate.email).trim().toLowerCase() : null)
    if (sb) {
      if (!email) {
        throw new Error('Bitte mit E-Mail einloggen (oder einen Supabase-Account mit diesem Benutzernamen anlegen).')
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (!error && data.session?.user) {
        await migrateLocalProfileToSupabaseIfNeeded(data.session.user)
        const mapped = await buildUserFromSession(data.session)
        if (mapped) {
          const next = { ...mapped, id: data.session.user.id, email: data.session.user.email || mapped.email }
          persist(next)
          return next
        }
      }
      if (error) {
        throw new Error(error.message || 'Supabase-Login fehlgeschlagen.')
      } else if (!data.session) {
        throw new Error('Keine Session (z. B. E-Mail noch nicht bestätigt).')
      }
    }
    const parsed = resolveUserByIdentifier(identifier)
    if (!parsed || !FIXED_ALLOWED_EMAILS.has(normalizeIdentifier(parsed?.email))) {
      if (!sb && normalizedIdentifier.includes('@')) {
        throw new Error('Supabase-Login ist nicht aktiv (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen in dieser Umgebung).')
      }
      throw new Error('Zugang nicht erlaubt. Bitte nutze einen freigegebenen Account.')
    }
    const expectedPassword = String(parsed.authPassword || '')
    if (!expectedPassword || String(password || '') !== expectedPassword) {
      throw new Error('Login fehlgeschlagen. Benutzername/E-Mail oder Passwort ist falsch.')
    }
    persist(parsed)
    return parsed
  }, [bootstrapFixedAccounts, persist])

  const register = useCallback(async (name, email, password, consents = {}, gateToken) => {
    const sb = getSupabaseClient()
    if (!sb) {
      void name
      void email
      void password
      throw new Error('Neue Registrierungen sind deaktiviert. Bitte nutze einen freigegebenen Account.')
    }
    const token = String(gateToken || '').trim()
    if (!token) {
      throw new Error('Alpha-Zugang nicht bestätigt. Bitte zuerst den Einladungs-Code auf der Registrierungsseite eingeben.')
    }
    const result = await registerWithAlphaGate({
      name,
      email,
      password,
      consents,
      gateToken: token,
    })
    if (!result?.ok) {
      throw new Error(result?.message || 'Registrierung fehlgeschlagen.')
    }
  }, [])

  const updateUser = useCallback(async (updates) => {
    let nextUser = null
    setUser(prev => {
      if (!prev) return prev
      const mergedBase = { ...prev, ...updates }
      const achievementUnlocks = computeNewAchievementUnlocks(mergedBase, prev.achievementUnlocks || {})
      const merged = withUserRuntimeDefaults(withLevelProgress({ ...mergedBase, achievementUnlocks }))
      const rank = getCurrentRank(merged)
      merged.rank = rank.id
      merged.title = rank.name
      localStorage.setItem('medisim_user', JSON.stringify(merged))
      if (prev?.email) {
        localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(merged))
      }
      nextUser = merged
      return merged
    })
    if (nextUser) syncProfileToCloud(nextUser)
    return nextUser
  }, [syncProfileToCloud])

  const addMoney = useCallback(async (amount) => {
    let nextUser = null
    setUser(prev => {
      if (!prev) return prev
      const stepped = withLevelProgress({ ...prev, wallet: (prev?.wallet || 0) + amount })
      const achievementUnlocks = computeNewAchievementUnlocks(stepped, prev.achievementUnlocks || {})
      const updated = withUserRuntimeDefaults({ ...stepped, achievementUnlocks })
      localStorage.setItem('medisim_user', JSON.stringify(updated))
      if (prev?.email) {
        localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(updated))
      }
      nextUser = updated
      return updated
    })
    if (nextUser) syncProfileToCloud(nextUser)
    return nextUser
  }, [syncProfileToCloud])

  const clearLegalState = useCallback(async () => {
    return updateUser({ legalState: normalizeLegalState(null) })
  }, [updateUser])

  const acknowledgeLegalNotice = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev
      const legal = normalizeLegalState(prev.legalState)
      if (legal.kind !== 'fine' || !legal.active) return prev
      const updated = withUserRuntimeDefaults({ ...prev, legalState: { ...legal, active: false } })
      localStorage.setItem('medisim_user', JSON.stringify(updated))
      if (prev?.email) localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(updated))
      syncProfileToCloud(updated)
      return updated
    })
  }, [syncProfileToCloud])

  const payLegalBail = useCallback(async () => {
    let success = false
    setUser((prev) => {
      if (!prev) return prev
      const legal = normalizeLegalState(prev.legalState)
      if (!legal.active || legal.kind !== 'jail') return prev
      const bail = Math.max(0, Number(legal.bailAmount || 0))
      if ((prev.wallet || 0) < bail) return prev
      success = true
      const updated = withUserRuntimeDefaults({
        ...prev,
        wallet: (prev.wallet || 0) - bail,
        legalState: normalizeLegalState(null),
      })
      localStorage.setItem('medisim_user', JSON.stringify(updated))
      if (prev?.email) localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(updated))
      syncProfileToCloud(updated)
      return updated
    })
    return success
  }, [syncProfileToCloud])

  const triggerPolicePenalty = useCallback(async ({
    reason = 'Regelverstoß',
    source = 'system',
    severity = 'medium',
    forceJail = false,
    jailMinutesOverride = null,
    fineAmountOverride = null,
  } = {}) => {
    const severityValue = LEGAL_SEVERITY[String(severity)] || LEGAL_SEVERITY.medium
    let nextUser = null
    setUser((prev) => {
      if (!prev) return prev
      const now = Date.now()
      const hasJailOverride = jailMinutesOverride != null && Number(jailMinutesOverride) > 0
      const jailCase = hasJailOverride || forceJail || severityValue >= LEGAL_SEVERITY.high
      const fineAmount = fineAmountOverride != null
        ? Math.max(0, Math.round(Number(fineAmountOverride)))
        : (jailCase
          ? Math.round(1000 + severityValue * 1250)
          : Math.round(250 + severityValue * 450))
      const jailMinutes = hasJailOverride
        ? Math.max(1, Math.round(Number(jailMinutesOverride)))
        : (jailCase ? (severityValue >= LEGAL_SEVERITY.critical ? 25 : 12) : 0)
      const bailAmount = jailCase ? Math.round(fineAmount * 1.6) : 0
      const updated = withUserRuntimeDefaults({
        ...prev,
        wallet: Math.max(0, (prev.wallet || 0) - fineAmount),
        legalState: {
          active: true,
          kind: jailCase ? 'jail' : 'fine',
          reason: String(reason || 'Regelverstoß'),
          source: String(source || 'system'),
          severity: severityValue,
          fineAmount,
          bailAmount,
          releaseAt: jailCase ? now + jailMinutes * 60 * 1000 : null,
          createdAt: new Date(now).toISOString(),
        },
      })
      localStorage.setItem('medisim_user', JSON.stringify(updated))
      if (prev?.email) localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(updated))
      nextUser = updated
      return updated
    })
    if (nextUser) syncProfileToCloud(nextUser)
    return nextUser
  }, [syncProfileToCloud])

  const resetUserProfile = useCallback(async () => {
    let nextUser = null
    setUser((prev) => {
      if (!prev) return prev
      const fresh = createFreshUser(prev.name || 'User', prev.email || '')
      const reset = withUserRuntimeDefaults(withLevelProgress({
        ...fresh,
        id: prev.id,
        name: prev.name,
        username: prev.username,
        email: prev.email,
        role: prev.role,
        authPassword: prev.authPassword,
        authLocked: prev.authLocked,
        legalState: normalizeLegalState(null),
      }))
      const rank = getCurrentRank(reset)
      reset.rank = rank.id
      reset.title = rank.name
      localStorage.setItem('medisim_user', JSON.stringify(reset))
      if (prev?.email) localStorage.setItem('medisim_user_' + prev.email, JSON.stringify(reset))
      nextUser = reset
      return reset
    })
    if (nextUser) syncProfileToCloud(nextUser)
    return nextUser
  }, [syncProfileToCloud])

  const logout = useCallback(async () => {
    const sb = getSupabaseClient()
    try {
      if (sb) {
        const { error } = await sb.auth.signOut()
        if (error) {
          // Keep going with local cleanup even if remote sign-out fails.
        }
      }
    } catch (_error) {
      // Keep going with local cleanup.
    } finally {
      setUser(null)
      localStorage.removeItem('medisim_user')
      // Remove persisted Supabase auth tokens to enforce logout on this device.
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
          .forEach((key) => localStorage.removeItem(key))
      } catch (_storageError) {
        // Ignore storage access issues.
      }
    }
  }, [])

  const deleteUserAccountData = useCallback(async () => {
    if (!user) return false
    await removeHospitalsOwnedByUser(user.id)
    await removeUserLocalData(user)
    setUser(null)
    return true
  }, [user])

  const needsOnboarding = user && !user.onboardingComplete
  const rescueTrackActive = !!user && (
    user.careerTrack === 'rescue'
    || user.profession === 'rettungssanitaeter'
    || user.profession === 'dual'
    || user.pendingRescueOnboarding
  )
  const needsRescueStation = user && user.onboardingComplete && rescueTrackActive && !!user.rescueCertified && !user.rescueStationId
  const needsHospital = user && user.onboardingComplete && !!user.medicalLicense && !user.hospitalId

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, updateUser, addMoney,
      triggerPolicePenalty, clearLegalState, payLegalBail, acknowledgeLegalNotice, resetUserProfile,
      deleteUserAccountData,
      isAuthenticated: !!user,
      authLoading,
      needsOnboarding,
      needsRescueStation,
      needsHospital,
      dailyLoginPanelOpen,
      openDailyLoginPanel,
      closeDailyLoginPanel,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}
