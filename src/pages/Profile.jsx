import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getCurrentRank,
  getNextRank,
  getRankProgress,
  getRankCapabilities,
  RANK_CAPABILITY_LABELS,
  ACTIVE_RUNTIME_PERK_KEYS,
  RESCUE_RANKS,
  normalizeSpecialtyId,
} from '../data/ranks'
import { COURSES } from '../data/courseData'
import { SPECIALTIES, SPECIALIZATION_REQUIRED_CASES, getSpecialtyProgress } from '../data/specialties'
import { getAchievementDashboard } from '../data/achievements'
import {
  User, Camera, Save, Shield, Award, Star, TrendingUp, BookOpen,
  ChevronRight, Check, X, Edit3, Briefcase, Trophy, Gift, Crown,
} from 'lucide-react'
import { DAILY_LOGIN_TOTAL_DAYS } from '../data/dailyLoginRewards'
import { LEGENDARY_TOOLS, UTILITY_PASSES, getSpecialState, canSwitchLegendary, getLegendarySwitchRemainingMs, getActiveUtilityPass } from '../data/shopSpecials'

const PREFIXES = [
  '', 'Dr.', 'Dr. med.', 'Prof.', 'Prof. Dr.', 'Prof. Dr. med.', 'PD Dr.', 'Dipl.-Med.',
]

const AVATARS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-pink-400 to-pink-600',
]

export default function Profile() {
  const { user, updateUser, addMoney, openDailyLoginPanel } = useAuth()
  const [progressMode, setProgressMode] = useState('medical')
  const [editing, setEditing] = useState(false)
  const [pendingSpecialty, setPendingSpecialty] = useState(null)
  const [specialtyError, setSpecialtyError] = useState('')
  const [form, setForm] = useState({
    name: user?.name || '',
    prefix: user?.prefix || '',
    bio: user?.bio || '',
    avatar: user?.avatar || AVATARS[0],
  })
  const [saved, setSaved] = useState(false)
  const [pendingLegendaryActivation, setPendingLegendaryActivation] = useState(null)
  const [profileNotice, setProfileNotice] = useState(null)

  const rank = getCurrentRank(user)
  const nextRank = getNextRank(user)
  const progress = getRankProgress(user)
  const isRescueOnly = user?.careerTrack === 'rescue' && !user?.medicalLicense
  const hasDualRole = !!(user?.medicalLicense && user?.rescueCertified)
  const rescueRank = String(user?.rescueLevel || '') === 'notfallsanitaeter' ? RESCUE_RANKS[1] : RESCUE_RANKS[0]
  const rescueCompletedCourses = (user?.completedCourses || []).filter((id) => {
    const c = COURSES.find((row) => row.id === id)
    return c?.track === 'rescue'
  }).length
  const rescueNextRank = rescueRank.id === RESCUE_RANKS[0].id ? RESCUE_RANKS[1] : null
  const rescueProgress = rescueNextRank
    ? {
        courses: rescueNextRank.requirements.courses > 0 ? Math.min(100, Math.round((rescueCompletedCourses / rescueNextRank.requirements.courses) * 100)) : 100,
        cases: 100,
        successRate: 100,
        overall: rescueNextRank.requirements.courses > 0 ? Math.min(100, Math.round((rescueCompletedCourses / rescueNextRank.requirements.courses) * 100)) : 100,
      }
    : { courses: 100, cases: 100, successRate: 100, overall: 100 }
  const activeMode = hasDualRole ? progressMode : (isRescueOnly ? 'rescue' : 'medical')
  const activeRank = activeMode === 'rescue' ? rescueRank : rank
  const activeNextRank = activeMode === 'rescue' ? rescueNextRank : nextRank
  const activeProgress = activeMode === 'rescue' ? rescueProgress : progress
  const specialtyProgress = getSpecialtyProgress(user?.stats, user?.specialty)
  const isFacharztOrAbove = Number(rank?.level || 1) >= 2
  const reachedSpecialtyCaseGate = (user?.stats?.casesCompleted || 0) >= SPECIALIZATION_REQUIRED_CASES
  const canAccessSpecialtySelection = isFacharztOrAbove && reachedSpecialtyCaseGate
  const mustChooseSpecialty = canAccessSpecialtySelection && !user?.specialty
  const specialtySwitchCost = 5000

  const handleSave = () => {
    updateUser({
      name: form.name,
      prefix: form.prefix,
      bio: form.bio,
      avatar: form.avatar,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const displayName = user?.prefix ? `${user.prefix} ${user.name}` : user?.name
  const profileStats = user?.stats || {}
  const profileCasesCompleted = Math.max(0, Number(profileStats.casesCompleted || 0))
  const profileSuccessfulCases = Math.max(0, Math.min(profileCasesCompleted, Number(profileStats.successfulCases || 0)))
  const profileSuccessRate = profileCasesCompleted > 0 ? Math.round((profileSuccessfulCases / profileCasesCompleted) * 100) : 0
  const activeCapabilities = getRankCapabilities(user)
  const activePerks = ACTIVE_RUNTIME_PERK_KEYS.filter((entry) => Number(rank?.perks?.[entry.key] || 0) > 0)

  const achievementRows = useMemo(() => getAchievementDashboard(user), [user])
  const dailyClaimed = Math.min(DAILY_LOGIN_TOTAL_DAYS, Number(user?.dailyLogin?.claimedCount || 0))
  const showDailyLoginButton = !!user?.onboardingComplete && dailyClaimed < DAILY_LOGIN_TOTAL_DAYS
  const specialState = useMemo(() => getSpecialState(user), [user])
  const honorTitle = specialState.selectedHonorTitle || null
  const canSwitchTool = canSwitchLegendary(user)
  const switchRemainingMs = getLegendarySwitchRemainingMs(user)
  const activePass = getActiveUtilityPass(user)
  const switchRemainingLabel = useMemo(() => {
    const s = Math.ceil(switchRemainingMs / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }, [switchRemainingMs])
  const legendaryMap = useMemo(() => LEGENDARY_TOOLS.reduce((acc, row) => { acc[row.id] = row; return acc }, {}), [])
  const passMap = useMemo(() => UTILITY_PASSES.reduce((acc, row) => { acc[row.id] = row; return acc }, {}), [])

  const confirmSpecialtySelection = async () => {
    if (!pendingSpecialty) return
    if (Number(user?.wallet || 0) < specialtySwitchCost) {
      setSpecialtyError(`Nicht genug Guthaben. Benötigt: ${specialtySwitchCost.toLocaleString('de-DE')}€`)
      return
    }
    await addMoney(-specialtySwitchCost)
    await updateUser({ specialty: pendingSpecialty })
    setPendingSpecialty(null)
    setSpecialtyError('')
  }

  const activateLegendaryTool = async () => {
    if (!pendingLegendaryActivation) return
    if (!canSwitchTool && specialState.activeLegendaryToolId && specialState.activeLegendaryToolId !== pendingLegendaryActivation) {
      setProfileNotice({ type: 'error', text: `Legendary-Wechsel erst nach 24h möglich (${switchRemainingLabel}).` })
      setPendingLegendaryActivation(null)
      return
    }
    await updateUser({
      specialState: {
        ...specialState,
        activeLegendaryToolId: pendingLegendaryActivation,
        legendaryLastSwitchAt: new Date().toISOString(),
      },
    })
    setPendingLegendaryActivation(null)
    setProfileNotice({ type: 'success', text: 'Legendary Tool aktiviert.' })
    setTimeout(() => setProfileNotice(null), 2500)
  }

  const activateUtilityPass = async (passId) => {
    const count = Number(specialState.utilityPassInventory?.[passId] || 0)
    if (count <= 0) return
    if (activePass) {
      setProfileNotice({ type: 'error', text: 'Es kann nur ein Utility Pass gleichzeitig aktiv sein.' })
      setTimeout(() => setProfileNotice(null), 2500)
      return
    }
    const passDef = passMap[passId]
    const now = Date.now()
    const expiresAt = passDef?.durationHours > 0 ? new Date(now + passDef.durationHours * 3600 * 1000).toISOString() : null
    await updateUser({
      specialState: {
        ...specialState,
        utilityPassInventory: { ...specialState.utilityPassInventory, [passId]: Math.max(0, count - 1) },
        activeUtilityPass: { id: passId, activatedAt: new Date(now).toISOString(), expiresAt },
        manvTriggerReady: passId === 'manv_ausloeser' ? true : specialState.manvTriggerReady,
      },
    })
    setProfileNotice({ type: 'success', text: `${passDef?.name || 'Utility Pass'} aktiviert.` })
    setTimeout(() => setProfileNotice(null), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold text-surface-900">Profil</h1>
        {!editing && (
          <div className="flex items-center gap-2">
            {showDailyLoginButton && (
              <button
                type="button"
                onClick={() => openDailyLoginPanel?.()}
                className="btn-secondary inline-flex items-center justify-center p-2.5 rounded-xl shrink-0"
                title="Daily Login"
                aria-label="Daily Login Belohnungen anzeigen"
              >
                <Gift className="w-5 h-5 text-violet-600" strokeWidth={2} />
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="btn-secondary">
              <Edit3 className="w-4 h-4" /> Bearbeiten
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="mb-6 p-4 rounded-xl bg-accent-50 border border-accent-200 flex items-center gap-3">
          <Check className="w-5 h-5 text-accent-600" />
          <p className="text-sm font-medium text-accent-700">Profil erfolgreich gespeichert!</p>
        </div>
      )}
      {profileNotice && (
        <div className={`mb-6 p-3 rounded-xl border text-sm ${profileNotice.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {profileNotice.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="card overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-primary-500 to-accent-500" />
        <div className="px-6 pb-6 pt-1">
          <div className="flex items-end gap-4 -mt-8 mb-5">
            {editing ? (
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${form.avatar} flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg`}>
                  {form.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${user?.avatar || AVATARS[0]} flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg`}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="pb-0.5 mt-2">
              <h2 className="text-xl font-bold text-surface-900 leading-tight">{displayName}</h2>
              <p className="text-sm text-surface-500">{user?.email}</p>
              {honorTitle && (
                <span className="inline-flex mt-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-semibold">
                  {honorTitle}
                </span>
              )}
              {(specialState.badges || []).includes('alpha_badge') && (
                <span className="inline-flex ml-2 mt-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  Alpha Badge
                </span>
              )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Profilfarbe</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map(av => (
                    <button
                      key={av}
                      onClick={() => setForm(p => ({ ...p, avatar: av }))}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${av} ${form.avatar === av ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Titel / Präfix</label>
                <div className="flex flex-wrap gap-2">
                  {PREFIXES.map(p => (
                    <button
                      key={p || 'none'}
                      onClick={() => setForm(prev => ({ ...prev, prefix: p }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.prefix === p ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}
                    >
                      {p || 'Kein Präfix'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field"
                  placeholder="Dein Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Über mich</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Erzähle etwas über dich, deine Interessen und Fachgebiete..."
                  maxLength={500}
                />
                <p className="text-xs text-surface-400 mt-1">{form.bio.length}/500</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
                  <X className="w-4 h-4" /> Abbrechen
                </button>
                <button onClick={handleSave} className="btn-primary flex-1" disabled={!form.name.trim()}>
                  <Save className="w-4 h-4" /> Speichern
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {user?.bio && (
                <div>
                  <p className="text-sm text-surface-500 mb-1">Über mich</p>
                  <p className="text-surface-700">{user.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-500">Titel</p>
                  <p className="font-medium text-surface-900">{user?.prefix || '—'}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-500">Krankenhaus</p>
                  <p className="font-medium text-surface-900">{user?.hospitalName || '—'}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-500">Rettungswache</p>
                  <p className="font-medium text-surface-900">{user?.rescueStationName || '—'}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-500">Beigetreten</p>
                  <p className="font-medium text-surface-900">
                    {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('de-DE') : '—'}
                  </p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-500">Guthaben</p>
                  <p className="font-medium text-surface-900">{(user?.wallet || 0).toLocaleString('de-DE')}€</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rank Card */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-600" /> Rang & Fortschritt
        </h3>
        {hasDualRole && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setProgressMode('medical')} className={`text-xs px-2 py-1 rounded-full border ${progressMode === 'medical' ? 'bg-primary-600 text-white border-primary-700' : 'bg-white text-surface-700 border-surface-200'}`}>Medizin-Fortschritt</button>
            <button onClick={() => setProgressMode('rescue')} className={`text-xs px-2 py-1 rounded-full border ${progressMode === 'rescue' ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-surface-700 border-surface-200'}`}>RettSan-Fortschritt</button>
          </div>
        )}
        {hasDualRole && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200">Medizin: {rank.name}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Rettungsdienst: {rescueRank.name}</span>
          </div>
        )}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeRank.color} flex items-center justify-center text-2xl`}>
            {activeRank.badge}
          </div>
          <div>
            <p className="text-xl font-bold text-surface-900">{activeRank.name}</p>
            <p className="text-sm text-surface-500">Aktueller Rang</p>
          </div>
        </div>

        {activeNextRank && (
          <div className="bg-surface-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-surface-900">Nächster Rang: {activeNextRank.name}</p>
              <span className="text-sm font-medium text-primary-600">{activeProgress.overall}%</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-surface-500 mb-1">
                  <span>
                    {activeMode === 'rescue'
                      ? `RD-Kurse (${rescueCompletedCourses}/${activeNextRank.requirements.courses})`
                      : `${activeProgress.courseLabel || 'Kurs'} (${activeProgress.courseCurrent || 0}/${activeProgress.courseRequired || 1})`}
                  </span>
                  <span>{activeProgress.courses}%</span>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${activeProgress.courses}%` }} />
                </div>
                {activeMode !== 'rescue' && activeProgress.courseHint && (
                  <p className="text-[11px] text-amber-600 mt-1">{activeProgress.courseHint}</p>
                )}
              </div>
              {activeMode !== 'rescue' && (
                <div>
                <div className="flex justify-between text-xs text-surface-500 mb-1">
                  <span>Behandelte Fälle ({user?.stats?.casesCompleted || 0}/{activeNextRank.requirements.casesCompleted})</span>
                  <span>{activeProgress.cases}%</span>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${activeProgress.cases}%` }} />
                </div>
              </div>
              )}
              {activeMode !== 'rescue' && (
                <div>
                <div className="flex justify-between text-xs text-surface-500 mb-1">
                  <span>Erfolgsrate ({profileSuccessRate}%/{activeNextRank.requirements.successRate}%)</span>
                  <span>{activeProgress.successRate}%</span>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${activeProgress.successRate}%` }} />
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-700">Freigeschaltete Fähigkeiten (aktiv):</p>
          {activeCapabilities.map((capabilityId) => (
            <div key={capabilityId} className="flex items-center gap-2 text-sm text-surface-600">
              <Check className="w-4 h-4 text-accent-600 shrink-0" /> {RANK_CAPABILITY_LABELS[capabilityId] || capabilityId}
            </div>
          ))}
          {!activeCapabilities.length && (
            <div className="text-sm text-surface-500">Keine aktiven Fähigkeits-Gates in diesem Modus.</div>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium text-surface-700">Aktive Perks (wirksam):</p>
          {activePerks.length > 0 ? activePerks.map((perk) => (
            <div key={perk.key} className="flex items-center gap-2 text-sm text-surface-600">
              <Check className="w-4 h-4 text-primary-600 shrink-0" />
              {perk.label}: +{Number(rank?.perks?.[perk.key] || 0)}%
            </div>
          )) : (
            <div className="text-sm text-surface-500">Aktuell keine numerischen Perk-Boni.</div>
          )}
        </div>
      </div>

      {!isRescueOnly && (
        <div className="card p-6 mb-6">
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" /> Fachrichtung
        </h3>
        {mustChooseSpecialty && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Fachrichtung jetzt erforderlich: Als Facharzt/Fachärztin mit mindestens {SPECIALIZATION_REQUIRED_CASES} abgeschlossenen Fällen sind erweiterte Aktionen sonst eingeschränkt.
          </div>
        )}
        {!canAccessSpecialtySelection && (
          <div className="mb-3 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600">
            Fachrichtung freischalten: Benötigt Rang Facharzt/Fachärztin und mindestens {SPECIALIZATION_REQUIRED_CASES} abgeschlossene Fälle.
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {SPECIALTIES.map(spec => {
            const selected = normalizeSpecialtyId(user?.specialty) === spec.id
            const p = getSpecialtyProgress(user?.stats, spec.id)
            const unlocked = !!canAccessSpecialtySelection
            return (
              <button
                key={spec.id}
                onClick={() => {
                  if (!unlocked || selected) return
                  setSpecialtyError('')
                  setPendingSpecialty(spec.id)
                }}
                className={`text-left rounded-xl border p-3 transition-colors ${selected ? 'border-primary-300 bg-primary-50' : 'border-surface-200 hover:border-surface-300 bg-white'} ${!unlocked && !selected ? 'opacity-75' : ''}`}
              >
                <p className={`font-semibold ${selected ? 'text-primary-800' : 'text-surface-900'}`}>{spec.name}</p>
                <p className="text-xs text-surface-500 mt-1">{spec.unlocks[0]}</p>
                <p className="text-[11px] text-surface-500 mt-2">Case-Progress intern: {p?.overall || 0}%</p>
                <p className={`text-[11px] mt-1 ${unlocked ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selected ? 'Aktive Fachrichtung' : unlocked ? `Wählen (${specialtySwitchCost.toLocaleString('de-DE')}€)` : 'Noch gesperrt'}
                </p>
              </button>
            )
          })}
        </div>
        {specialtyProgress && (
          <div className="mt-4 rounded-xl border border-surface-200 p-3">
            <p className="text-sm font-medium text-surface-900 mb-2">
              Fortschritt {specialtyProgress.specialty.name}: {specialtyProgress.overall}%
            </p>
            <div className="grid md:grid-cols-2 gap-2 text-xs text-surface-600">
              {specialtyProgress.progress.map(row => (
                <div key={row.key} className="flex items-center justify-between rounded-lg bg-surface-50 px-2 py-1.5">
                  <span>{row.key}</span>
                  <span className="font-semibold">{row.done}/{row.req}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Stats */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" /> Specials & Aktivierung
        </h3>
        <div className="mb-3 rounded-xl border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600">
          Legendary Tools: nur 1 aktiv, Wechsel alle 24h.
          {!canSwitchTool && <span className="font-semibold text-surface-800"> Nächster Wechsel in {switchRemainingLabel}</span>}
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {(specialState.ownedLegendaryTools || []).length === 0 && (
            <div className="text-sm text-surface-500">Noch keine Legendary Tools gekauft.</div>
          )}
          {(specialState.ownedLegendaryTools || []).map((id) => {
            const row = legendaryMap[id]
            const isActive = specialState.activeLegendaryToolId === id
            return (
              <div key={id} className={`rounded-xl border px-3 py-3 ${isActive ? 'border-amber-300 bg-amber-50/60' : 'border-surface-200 bg-white'}`}>
                <p className="font-semibold text-surface-900">{row?.name || id}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${isActive ? 'bg-amber-200 text-amber-900' : 'bg-surface-100 text-surface-600'}`}>{isActive ? 'Aktiv' : 'Inaktiv'}</span>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={isActive || (!canSwitchTool && specialState.activeLegendaryToolId && specialState.activeLegendaryToolId !== id)}
                    onClick={() => setPendingLegendaryActivation(id)}
                  >
                    Aktivieren
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <h4 className="text-sm font-semibold text-surface-800 mb-2">Utility Pass Inventar</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {UTILITY_PASSES.map((row) => {
            const count = Number(specialState.utilityPassInventory?.[row.id] || 0)
            const isActive = activePass?.id === row.id
            return (
              <div key={row.id} className="rounded-xl border border-surface-200 bg-white px-3 py-3">
                <p className="font-medium text-surface-900">{row.name}</p>
                <p className="text-xs text-surface-500 mt-1">Inventar: {count}</p>
                {isActive && <p className="text-xs text-emerald-700 mt-1">Aktiv bis {activePass?.expiresAt ? new Date(activePass.expiresAt).toLocaleString('de-DE') : 'einmalige Nutzung'}</p>}
                <button type="button" className="btn-secondary text-xs mt-2" disabled={count <= 0 || !!activePass} onClick={() => activateUtilityPass(row.id)}>
                  Aktivieren
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" /> Statistiken
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-900">{profileCasesCompleted}</p>
            <p className="text-sm text-surface-500">Fälle</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-900">{profileSuccessRate}%</p>
            <p className="text-sm text-surface-500">Erfolgsrate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-900">{user?.stats?.patientsHelped || 0}</p>
            <p className="text-sm text-surface-500">Patienten</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-900">{user?.completedCourses?.length || 0}</p>
            <p className="text-sm text-surface-500">Kurse</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-surface-900 mb-1 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Erfolge
        </h3>
        <p className="text-sm text-surface-500 mb-4">
          Alle Meilensteine mit Kurzbeschreibung, Ziel und Fortschritt. Freigeschaltete Erfolge erscheinen oben in der Liste.
        </p>
        <ul className="space-y-4">
          {achievementRows.map(({ meta, unlockedAt, progressPct, progressLabel }) => (
            <li
              key={meta.id}
              className={`rounded-xl border px-4 py-3 ${unlockedAt ? 'border-amber-200 bg-amber-50/40' : 'border-surface-200 bg-surface-50/60'}`}
            >
              <div className="flex gap-3">
                <span className="text-2xl shrink-0" aria-hidden>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-surface-900">{meta.title}</p>
                    {unlockedAt && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Freigeschaltet</span>
                    )}
                  </div>
                  <p className="text-sm text-surface-600 mt-0.5">{meta.description}</p>
                  <p className="text-xs text-surface-500 mt-2"><span className="font-medium text-surface-700">So erhältst du ihn:</span> {meta.howTo}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] text-surface-500 mb-1">
                      <span>Fortschritt</span>
                      <span className="font-mono font-medium text-surface-700">{progressLabel}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${unlockedAt ? 'bg-gradient-to-r from-amber-500 to-emerald-500' : 'bg-primary-400'}`}
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                  </div>
                  {unlockedAt && (
                    <p className="text-[11px] text-surface-400 mt-2">
                      Freigeschaltet {new Date(unlockedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pendingSpecialty && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Fachrichtung bestätigen</h3>
            <p className="text-sm text-surface-600 mb-4">
              Möchtest du die Fachrichtung auf <span className="font-semibold">{SPECIALTIES.find((s) => s.id === pendingSpecialty)?.name || pendingSpecialty}</span> setzen?
              Diese Umschulung kostet einmalig <span className="font-semibold">{specialtySwitchCost.toLocaleString('de-DE')}€</span>.
            </p>
            <div className="text-sm rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 mb-3">
              Guthaben: <span className="font-semibold">{(user?.wallet || 0).toLocaleString('de-DE')}€</span>
            </div>
            {specialtyError && (
              <p className="text-xs text-red-600 mb-3">{specialtyError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingSpecialty(null); setSpecialtyError('') }}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmSpecialtySelection}
                className="btn-primary flex-1"
                disabled={Number(user?.wallet || 0) < specialtySwitchCost}
              >
                Für {specialtySwitchCost.toLocaleString('de-DE')}€ bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingLegendaryActivation && (
        <div className="fixed inset-0 z-[95] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Legendary Tool aktivieren?</h3>
            <p className="text-sm text-surface-600 mb-4">
              Du bist dabei, <span className="font-semibold">{legendaryMap[pendingLegendaryActivation]?.name || pendingLegendaryActivation}</span> zu aktivieren.
              Ein Wechsel ist danach erst nach 24 Stunden wieder möglich.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setPendingLegendaryActivation(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary flex-1" onClick={activateLegendaryTool}>
                Aktivieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
