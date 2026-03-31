import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import GlobalPager from '../GlobalPager'
import GlobalDevMenu from './GlobalDevMenu'
import DailyLoginOverlay from '../DailyLoginOverlay'
import { useAuth } from '../../context/AuthContext'
import { canClaimDailyLogin, localCalendarDateKey, DAILY_LOGIN_TOTAL_DAYS } from '../../data/dailyLoginRewards'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { Lock, ShieldAlert, BellRing } from 'lucide-react'

export default function Layout() {
  const {
    user,
    updateUser,
    payLegalBail,
    clearLegalState,
    acknowledgeLegalNotice,
    dailyLoginPanelOpen,
    closeDailyLoginPanel,
  } = useAuth()
  const [tick, setTick] = useState(0)
  const [dailyUiNonce, setDailyUiNonce] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])
  void dailyUiNonce
  const handleDailyLoginOverlayClose = useCallback((reason) => {
    closeDailyLoginPanel()
    if (reason === 'snooze') {
      try {
        sessionStorage.setItem('medisim_dailylogin_snooze', localCalendarDateKey())
      } catch (_e) { /* ignore */ }
      setDailyUiNonce((n) => n + 1)
    }
  }, [closeDailyLoginPanel])
  const todayKey = localCalendarDateKey()
  let dailySnoozedToday = false
  try {
    dailySnoozedToday = sessionStorage.getItem('medisim_dailylogin_snooze') === todayKey
  } catch (_e) {
    dailySnoozedToday = false
  }
  const dailyClaimed = Math.min(DAILY_LOGIN_TOTAL_DAYS, Number(user?.dailyLogin?.claimedCount || 0))
  const dailySeriesIncomplete = dailyClaimed < DAILY_LOGIN_TOTAL_DAYS
  const showDailyLogin =
    !!user?.onboardingComplete &&
    dailySeriesIncomplete &&
    (dailyLoginPanelOpen || (!dailySnoozedToday && !!(user?.showDailyLoginIntro || canClaimDailyLogin(user))))
    && tick >= 0
  const showPager = !!user?.medicalLicense
  const legalState = user?.legalState || null
  const now = Date.now()
  const jailLocked = useMemo(() => {
    if (!legalState?.active || legalState?.kind !== 'jail') return false
    return Number(legalState?.releaseAt || 0) > now
  }, [legalState, now])
  const fineNotice = !!(legalState?.active && legalState?.kind === 'fine')
  const remainingSec = Math.max(0, Math.ceil((Number(legalState?.releaseAt || 0) - now) / 1000))
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0')
  const ss = String(remainingSec % 60).padStart(2, '0')
  const createdAtMs = new Date(legalState?.createdAt || 0).getTime()
  const releaseAtMs = Number(legalState?.releaseAt || 0)
  const sentenceRawSec = Number.isFinite(createdAtMs) && Number.isFinite(releaseAtMs) && releaseAtMs > createdAtMs
    ? Math.ceil((releaseAtMs - createdAtMs) / 1000)
    : 1
  const sentenceTotalSec = Math.max(1, sentenceRawSec)
  const sentenceDonePct = Math.max(0, Math.min(100, Math.round(((sentenceTotalSec - remainingSec) / sentenceTotalSec) * 100)))

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {showPager && <GlobalPager />}
      <GlobalDevMenu />
      {showDailyLogin && (
        <DailyLoginOverlay
          user={user}
          updateUser={updateUser}
          manualOpen={dailyLoginPanelOpen}
          onClose={handleDailyLoginOverlayClose}
        />
      )}
      <Footer />
      {(jailLocked || fineNotice) && (
        <div className="fixed inset-0 z-[120]">
          {jailLocked && (
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" />
              <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-red-600/30 blur-3xl animate-pulse" />
              <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-0 overflow-hidden animate-[fadeIn_.22s_ease-out] ${jailLocked ? 'border-red-300 bg-slate-950 text-white' : 'border-amber-200 bg-white'}`}>
              <div className={`relative px-5 py-4 border-b ${jailLocked ? 'border-red-500/30 bg-gradient-to-r from-red-900/40 to-blue-900/30' : 'border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50'}`}>
                {jailLocked && (
                  <>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                  </>
                )}
                <div className="flex items-center gap-3">
                  {jailLocked ? <Lock className="w-6 h-6 text-red-300" /> : <ShieldAlert className="w-6 h-6 text-amber-600" />}
                  {jailLocked && <BellRing className="w-5 h-5 text-red-300 animate-pulse" />}
                  <p className={`font-semibold ${jailLocked ? 'text-white' : 'text-surface-900'}`}>
                    {jailLocked ? 'Polizei-Maßnahme aktiv (Haftmodus)' : 'Polizei: Strafzahlung registriert'}
                  </p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  {jailLocked ? <Lock className="w-6 h-6 text-red-300 mt-0.5" /> : <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5" />}
                <div>
                  <p className={`text-sm mt-1 ${jailLocked ? 'text-slate-200' : 'text-surface-600'}`}>
                    {legalState?.reason || 'Verstoß gegen medizinische Sorgfaltspflichten.'}
                  </p>
                </div>
              </div>
              <div className={`mt-4 rounded-2xl border p-4 text-sm space-y-2 ${jailLocked ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-surface-200 bg-surface-50 text-surface-700'}`}>
                <p>Bußgeld: <span className="font-semibold">{Number(legalState?.fineAmount || 0).toLocaleString('de-DE')}€</span></p>
                {jailLocked && (
                  <>
                    <p>Restzeit: <span className="font-semibold">{mm}:{ss}</span></p>
                    <p>Freikauf: <span className="font-semibold">{Number(legalState?.bailAmount || 0).toLocaleString('de-DE')}€</span></p>
                    <div className="pt-1">
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 transition-all duration-500" style={{ width: `${sentenceDonePct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">Strafzeit fortschritt: {sentenceDonePct}%</p>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                {jailLocked ? (
                  <>
                    <button
                      onClick={() => payLegalBail()}
                      className="btn-primary text-sm"
                      disabled={(user?.wallet || 0) < Number(legalState?.bailAmount || 0)}
                    >
                      Freikaufen
                    </button>
                    <button onClick={() => clearLegalState()} className="btn-secondary text-sm">
                      DEV: Sofort freikaufen
                    </button>
                  </>
                ) : (
                  <button onClick={() => acknowledgeLegalNotice()} className="btn-primary text-sm">
                    Verstanden
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
