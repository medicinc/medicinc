import { useMemo, useState, useEffect } from 'react'
import { Gift, Sparkles, CalendarDays, X, ChevronRight } from 'lucide-react'
import {
  DAILY_LOGIN_REWARDS,
  DAILY_LOGIN_TOTAL_DAYS,
  canClaimDailyLogin,
  getDailyRewardForDay,
  getDailyRewardBonusNotes,
  buildDailyLoginClaimUpdates,
  localCalendarDateKey,
  nextClaimableDayNumber,
  msUntilNextDailyLoginWindow,
  formatDurationHms,
} from '../data/dailyLoginRewards'

const TOOLTIP_W = 220
const TOOLTIP_H = 132

function clampTooltipPos(clientX, clientY) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600
  let left = clientX + 14
  let top = clientY + 14
  left = Math.max(8, Math.min(left, vw - TOOLTIP_W - 8))
  top = Math.max(8, Math.min(top, vh - TOOLTIP_H - 8))
  return { left, top }
}

export default function DailyLoginOverlay({ user, updateUser, manualOpen = false, onClose }) {
  const [step, setStep] = useState('intro')
  const [hoverDay, setHoverDay] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  const [tick, setTick] = useState(0)

  const introMode = !!user?.showDailyLoginIntro && !manualOpen
  const dl = user?.dailyLogin || { claimedCount: 0, lastClaimDateKey: null }
  const claimed = Math.min(DAILY_LOGIN_TOTAL_DAYS, Number(dl.claimedCount || 0))
  const canClaim = canClaimDailyLogin(user)
  const nextDay = nextClaimableDayNumber(user)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  void tick

  const calendarCells = useMemo(() => {
    return DAILY_LOGIN_REWARDS.map((r, idx) => {
      const dayN = idx + 1
      const isDone = dayN <= claimed
      const isNext = dayN === claimed + 1 && canClaim
      const isFuture = dayN > claimed + 1
      return { ...r, dayN, isDone, isNext, isFuture }
    })
  }, [claimed, canClaim])

  const hoverPreview = useMemo(() => {
    if (!hoverDay) return null
    const r = getDailyRewardForDay(hoverDay)
    return { day: hoverDay, ...r }
  }, [hoverDay])

  const nextReward = useMemo(() => getDailyRewardForDay(nextDay), [nextDay])
  const nextRewardExtras = useMemo(
    () => getDailyRewardBonusNotes(nextReward, user),
    [nextReward, user]
  )

  const clearHoverPreview = () => {
    setHoverDay(null)
    setTooltipPos(null)
  }

  const updateHoverFromPointer = (dayN, clientX, clientY) => {
    setHoverDay(dayN)
    setTooltipPos(clampTooltipPos(clientX, clientY))
  }

  const handleClaim = async () => {
    const dayNum = nextDay
    const reward = getDailyRewardForDay(dayNum)
    const today = localCalendarDateKey()
    const claimPatch = buildDailyLoginClaimUpdates(user, reward)
    await updateUser({
      showDailyLoginIntro: false,
      ...claimPatch,
      dailyLogin: {
        claimedCount: Math.min(DAILY_LOGIN_TOTAL_DAYS, claimed + 1),
        lastClaimDateKey: today,
      },
    })
    onClose?.('claim')
  }

  const handleHeaderClose = () => {
    onClose?.(manualOpen ? 'dismiss-manual' : 'snooze')
  }

  if (claimed >= DAILY_LOGIN_TOTAL_DAYS) return null

  if (!manualOpen && !introMode && !canClaim) return null

  if (introMode && step === 'intro') {
    return (
      <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm" onClick={() => { /* block dismiss */ }} />
        <div className="relative w-full max-w-md rounded-3xl border border-violet-200 bg-gradient-to-b from-white via-violet-50/40 to-white shadow-2xl overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-300/30 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-400/20 blur-2xl" />
          <div className="relative p-6 pt-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700 shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Daily Rewards
                </span>
              </div>
            </div>
            <div className="relative rounded-2xl border border-violet-100 bg-white/90 p-4 mb-4 shadow-inner">
              <div className="absolute -top-3 left-6 w-4 h-4 bg-white border-l border-t border-violet-100 rotate-45" />
              <p className="text-sm font-semibold text-violet-900 mb-2">Psst – dein Dienst-Bonus wartet!</p>
              <p className="text-sm text-surface-600 leading-relaxed">
                Jeden Tag gibt’s passende Belohnungen zum Spiel-Ökosystem: <strong>Geld</strong> (sinnvoll zu Kurs- und Klinikkosten), <strong>EP</strong>,{' '}
                <strong>Ansehen</strong>, manchmal <strong>Lexikon-Freischaltungen</strong> und kleine Profile-Boni.
                Nach Mitternacht (deine lokale Zeit) schaltet sich der <strong>nächste</strong> Tag frei – in Summe warten{' '}
                <strong>{DAILY_LOGIN_TOTAL_DAYS} Tage</strong> mit echten Mehrwerten.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('calendar')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow-lg hover:from-violet-500 hover:to-fuchsia-500 flex items-center justify-center gap-2"
            >
              Zum Kalender & Tag 1 abholen <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showCalendar = (introMode && step === 'calendar') || (!introMode && (canClaim || manualOpen))

  if (!showCalendar) return null

  const waitMs = msUntilNextDailyLoginWindow()
  const showHeaderClose = manualOpen || !introMode

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      {hoverPreview && hoverPreview.day > claimed + 1 && tooltipPos && (
        <div
          className="pointer-events-none fixed z-[125] w-[220px] rounded-2xl border border-indigo-200/90 bg-white/95 px-3 py-2.5 text-xs text-indigo-950 shadow-xl backdrop-blur-sm"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
          role="tooltip"
        >
          <div
            className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-l border-t border-indigo-200/90 bg-white/95"
            aria-hidden
          />
          <p className="font-bold text-indigo-900 mb-0.5">Tag {hoverPreview.day}</p>
          <p className="font-semibold text-surface-900 leading-tight">{hoverPreview.title}</p>
          <p className="text-surface-600 mt-1 leading-snug line-clamp-3">{hoverPreview.blurb}</p>
          <p className="mt-2 font-mono text-[11px] border-t border-indigo-100 pt-1.5">
            <span className="text-emerald-700 font-bold">ca. +{hoverPreview.money}€</span>
            {hoverPreview.xp > 0 && <span className="text-violet-700 font-bold ml-2">+{hoverPreview.xp} EP</span>}
          </p>
          {getDailyRewardBonusNotes(hoverPreview, user).length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[10px] leading-snug border-t border-indigo-100 pt-1.5">
              {getDailyRewardBonusNotes(hoverPreview, user).map((n) => (
                <li key={n.key} className={n.className}>{n.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-300" />
            <div>
              <p className="font-bold text-sm tracking-wide">Daily Login</p>
              <p className="text-[11px] text-violet-200">Tag {Math.min(DAILY_LOGIN_TOTAL_DAYS, nextDay)} von {DAILY_LOGIN_TOTAL_DAYS}</p>
            </div>
          </div>
          {showHeaderClose && (
            <button type="button" onClick={handleHeaderClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 mb-4">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Heute für dich</p>
            <p className="text-lg font-bold text-surface-900">{nextReward.title}</p>
            <p className="text-sm text-surface-600 mt-1">{nextReward.blurb}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm font-mono font-bold text-emerald-700">+{nextReward.money}€</span>
              {nextReward.xp > 0 && <span className="text-sm font-mono font-bold text-violet-700">+{nextReward.xp} EP</span>}
            </div>
            {nextRewardExtras.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs border-t border-amber-200/80 pt-3">
                {nextRewardExtras.map((n) => (
                  <li key={n.key} className={n.className}>{n.text}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-surface-500 mb-2">Kalender – mit der Maus über einen <span className="font-medium text-surface-700">zukünftigen</span> Tag fahren: Vorschau erscheint als Sprechblase am Cursor.</p>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
            {calendarCells.map((c) => (
              <div
                key={c.dayN}
                role="button"
                tabIndex={0}
                onMouseEnter={(e) => { if (c.isFuture) updateHoverFromPointer(c.dayN, e.clientX, e.clientY) }}
                onMouseMove={(e) => { if (c.isFuture) updateHoverFromPointer(c.dayN, e.clientX, e.clientY) }}
                onMouseLeave={clearHoverPreview}
                onFocus={(e) => {
                  if (!c.isFuture) return
                  const r = e.currentTarget.getBoundingClientRect()
                  updateHoverFromPointer(c.dayN, r.left + r.width / 2, r.bottom)
                }}
                onBlur={clearHoverPreview}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold border transition-all ${
                  c.isDone
                    ? 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 text-amber-900'
                    : c.isNext
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 border-violet-400 text-white ring-2 ring-amber-300 scale-105 shadow-lg'
                      : `${c.isFuture ? 'cursor-help hover:border-indigo-300 hover:bg-indigo-50/50' : ''} bg-slate-50 border-slate-200 text-slate-400`
                }`}
              >
                <span className="opacity-80">{c.dayN}</span>
                {c.isDone && <span className="text-[9px]">✓</span>}
                {c.isNext && !c.isDone && <Sparkles className="w-3 h-3 mt-0.5" />}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          {canClaim ? (
            <button
              type="button"
              onClick={handleClaim}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md hover:from-emerald-500 hover:to-teal-500"
            >
              {introMode ? 'Tag 1 jetzt einsammeln' : `Tag ${nextDay} abholen`}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-2xl bg-slate-200 text-slate-600 font-bold text-sm cursor-not-allowed border border-slate-300"
            >
              Nächste Belohnung in {formatDurationHms(waitMs)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
