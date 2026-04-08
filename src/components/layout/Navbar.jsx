import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCurrentRank } from '../../data/ranks'
import {
  Menu, X, Home, Stethoscope, Building2, BookOpen,
  LogOut, User, ChevronDown, Trophy, BarChart3, ShoppingCart, Wallet,
  Library, Settings, Ambulance
} from 'lucide-react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [showRescueModal, setShowRescueModal] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const { user, isAuthenticated, logout, needsOnboarding, needsHospital, needsRescueStation, updateUser, addMoney } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isLanding = location.pathname === '/'
  const isSetup = needsOnboarding || needsHospital || needsRescueStation
  const currentRank = getCurrentRank(user)

  const navLinks = (isAuthenticated && !isSetup)
    ? [
        { to: '/dashboard', label: 'Übersicht', icon: Home },
        { to: '/rettungsdienst', label: 'Rettungsdienst', icon: Ambulance },
        { to: '/hospital', label: 'Krankenhaus', icon: Building2 },
        { to: '/courses', label: 'Kurse', icon: BookOpen },
        { to: '/knowledge', label: 'Wissen', icon: Library },
        { to: '/leaderboard', label: 'Rangliste', icon: Trophy },
        { to: '/shop', label: 'Shop', icon: ShoppingCart },
      ]
    : []

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // local cleanup in context should still run; continue with redirect
    } finally {
      navigate('/')
      setProfileOpen(false)
      setMobileOpen(false)
      setLoggingOut(false)
    }
  }

  const handleHospitalNavigation = (e) => {
    if (user?.medicalLicense) return
    e.preventDefault()
    setUnlockError('')
    setShowMedicalModal(true)
  }

  const handleRescueNavigation = (e) => {
    if (user?.rescueCertified) return
    e.preventDefault()
    setUnlockError('')
    setShowRescueModal(true)
  }

  const profileSubtitle = user?.medicalLicense && user?.rescueCertified
    ? `Dual-Track: ${currentRank?.shortName || currentRank?.name || 'Assistenzarzt'} + Rettungsdienst`
    : (user?.profession ? (currentRank?.name || user?.title || '') : '')

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isLanding
        ? 'bg-white/80 backdrop-blur-xl border-b border-surface-100'
        : 'bg-white border-b border-surface-200 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={isAuthenticated && !isSetup ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <img
              src="/brand/medic-inc-mark.svg"
              alt=""
              width={36}
              height={36}
              className="w-9 h-9 shrink-0 rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow"
            />
            <span className="font-display font-bold text-xl text-surface-900">Medic Inc</span>
          </Link>

          {navLinks.length > 0 && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={to === '/hospital' ? handleHospitalNavigation : (to === '/rettungsdienst' ? handleRescueNavigation : undefined)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(to)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {isAuthenticated && !isSetup && (
              <Link to="/shop" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
                <Wallet className="w-4 h-4" />
                {(user?.wallet || 0).toLocaleString('de-DE')}€
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-surface-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-surface-900">{user?.name}</p>
                    <p className="text-[11px] leading-4 text-surface-500 whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis">
                      {profileSubtitle}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-surface-200 py-2 z-20">
                      <div className="px-4 py-3 border-b border-surface-100">
                        <p className="font-medium text-surface-900">{user?.name}</p>
                        <p className="text-sm text-surface-500">{user?.email}</p>
                        {!isSetup && (
                          <>
                            <p className="text-xs text-surface-400 mt-1">Stufe {user?.level} &bull; {currentRank?.name || user?.title}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (user?.xp / (user?.xpToNext || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-surface-500">{user?.xp || 0}/{user?.xpToNext || 500} EP</span>
                            </div>
                          </>
                        )}
                      </div>
                      {!isSetup && (
                        <>
                          <Link
                            to="/shop"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Wallet className="w-4 h-4" /> Guthaben: {(user?.wallet || 0).toLocaleString('de-DE')}€
                          </Link>
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <User className="w-4 h-4" /> Profil
                          </Link>
                          <Link
                            to="/stats"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <BarChart3 className="w-4 h-4" /> Statistiken
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Settings className="w-4 h-4" /> Einstellungen
                          </Link>
                        </>
                      )}
                      <div className="border-t border-surface-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors disabled:opacity-60"
                        >
                          <LogOut className="w-4 h-4" /> {loggingOut ? 'Abmelden...' : 'Abmelden'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors">
                  Anmelden
                </Link>
                <Link to="/register-gate" className="btn-primary text-sm !py-2 !px-4">
                  Registrierung
                </Link>
              </div>
            )}

            {navLinks.length > 0 && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-surface-50 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && navLinks.length > 0 && (
        <div className="lg:hidden border-t border-surface-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={(e) => {
                  if (to === '/hospital') handleHospitalNavigation(e)
                  if (to === '/rettungsdienst') handleRescueNavigation(e)
                  if (!e.defaultPrevented) setMobileOpen(false)
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {showMedicalModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Krankenhaus freischalten</h3>
            <p className="text-sm text-surface-600 mb-4">
              Für die Arbeit im Krankenhaus musst du das Medizinstudium absolvieren.
              Möchtest du es jetzt für 15.000€ starten?
            </p>
            <div className="text-sm rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 mb-4">
              Guthaben: <span className="font-semibold">{(user?.wallet || 0).toLocaleString('de-DE')}€</span>
            </div>
            {unlockError && (
              <p className="text-xs text-red-600 mb-3">{unlockError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setUnlockError(''); setShowMedicalModal(false) }} className="btn-secondary flex-1">Abbrechen</button>
              <button
                onClick={() => {
                  if (Number(user?.wallet || 0) < 15000) {
                    setUnlockError('Nicht genug persönliches Guthaben für diese Freischaltung.')
                    return
                  }
                  addMoney(-15000)
                  updateUser({
                    onboardingComplete: false,
                    pendingMedicalOnboarding: true,
                    careerTrack: user?.careerTrack || 'rescue',
                  })
                  setShowMedicalModal(false)
                  navigate('/onboarding')
                }}
                disabled={Number(user?.wallet || 0) < 15000}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Für 15.000€ starten
              </button>
            </div>
          </div>
        </div>
      )}

      {showRescueModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Rettungsdienst freischalten</h3>
            <p className="text-sm text-surface-600 mb-4">
              Für die Arbeit im Rettungsdienst musst du die RD-Ausbildung absolvieren.
              Möchtest du sie jetzt für 20.000€ starten?
            </p>
            <div className="text-sm rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 mb-4">
              Guthaben: <span className="font-semibold">{(user?.wallet || 0).toLocaleString('de-DE')}€</span>
            </div>
            {unlockError && (
              <p className="text-xs text-red-600 mb-3">{unlockError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setUnlockError(''); setShowRescueModal(false) }} className="btn-secondary flex-1">Abbrechen</button>
              <button
                onClick={() => {
                  if (Number(user?.wallet || 0) < 20000) {
                    setUnlockError('Nicht genug persönliches Guthaben für diese Freischaltung.')
                    return
                  }
                  addMoney(-20000)
                  updateUser({
                    onboardingComplete: false,
                    pendingRescueOnboarding: true,
                    careerTrack: user?.careerTrack || 'medical',
                  })
                  setShowRescueModal(false)
                  navigate('/onboarding')
                }}
                disabled={Number(user?.wallet || 0) < 20000}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Für 20.000€ starten
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
