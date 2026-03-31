/** 30-Tage Daily-Login-Belohnungen – Beträge an Kurs-/Klinik-Ökosystem angelehnt (Kurse typ. ~900–18.000€). */
import { KNOWLEDGE_CATEGORIES } from './knowledgeData'

export const DAILY_LOGIN_TOTAL_DAYS = 30

/**
 * @typedef {Object} DailyLoginReward
 * @property {number} day
 * @property {number} money
 * @property {number} xp
 * @property {string} title
 * @property {string} blurb
 * @property {number} [reputation]
 * @property {number} [patientsHelpedBonus]
 * @property {string} [grantKnowledgeId] – kostenlose Freischaltung einer Lexikon-Kategorie (wenn noch gesperrt)
 */

export const DAILY_LOGIN_REWARDS = [
  { day: 1, money: 900, xp: 60, title: 'Willkommens-Bonus', blurb: 'Startkapital, das zu Kursen und Ausrüstung passt – dein erster Check-in zählt doppelt moralisch.', reputation: 3 },
  { day: 2, money: 550, xp: 42, title: 'Frühschicht-Extra', blurb: 'Kaffee für die Leitung und ein ordentliches Taschengeld für die erste Woche.' },
  { day: 3, money: 680, xp: 48, title: 'Dienstag-Power', blurb: 'Konstant bleiben lohnt sich – kleiner Rufbonus obendrauf.', reputation: 4 },
  { day: 4, money: 520, xp: 40, title: 'Routine rockt', blurb: 'Jeder ruhige Tag ist ein guter Tag auf Station.' },
  { day: 5, money: 1150, xp: 75, title: 'Wochen-Kick + Lexikon', blurb: 'Fünf Tage durchgehalten – als Extra gibt’s Notfallmedizin im Lexikon geschenkt (falls noch gesperrt).', grantKnowledgeId: 'emergency', patientsHelpedBonus: 1 },
  { day: 6, money: 620, xp: 46, title: 'Samstags-Split', blurb: 'Auch am Wochenende wartet ein stimmiger Bonus aufs Konto.' },
  { day: 7, money: 1650, xp: 115, title: '7-Tage-Streak!', blurb: 'Eine volle Woche – du bist im Flow! Extra Ansehen für die Leaderboard-Charts.', reputation: 8 },
  { day: 8, money: 680, xp: 52, title: 'Neue Woche', blurb: 'Zurück auf Station – der Kühlschrank-Magnet „Durchhalten“ ist verdient.' },
  { day: 9, money: 740, xp: 54, title: 'Teamplayer', blurb: 'Pünktlich einchecken zahlt sich aus – heute mit Schwerpunkt Erfahrung.' },
  { day: 10, money: 1350, xp: 88, title: 'Zehner-Marke + Chirurgie', blurb: 'Zweistellig! Bonus: Lexikon-Kapitel Chirurgie gratis, falls noch nicht freigeschaltet.', grantKnowledgeId: 'surgery_ref', patientsHelpedBonus: 2 },
  { day: 11, money: 700, xp: 56, title: 'Stations-Grinsen', blurb: 'Kleine Freude, spürbarer Effekt auf dem Konto.' },
  { day: 12, money: 780, xp: 60, title: 'Mitte der Serie', blurb: 'Du bist im Rennen – noch genug Luft für die großen Meilensteine.' },
  { day: 13, money: 820, xp: 62, title: 'Glückstag', blurb: 'Heute mit Extra-Glück gewürfelt – mehr EP als gewöhnlich.' },
  { day: 14, money: 1750, xp: 125, title: '2-Wochen-Champion', blurb: 'Halbzeit der ersten Staffel – Respekt und Rufpunkte fürs Dashboard.', reputation: 12 },
  { day: 15, money: 920, xp: 72, title: 'Halbzeit-Boost + Pädiatrie', blurb: '15 Tage durchgehalten – Pädiatrie-Grundlagen im Lexikon geschenkt, falls gesperrt.', grantKnowledgeId: 'pediatrics_ref' },
  { day: 16, money: 880, xp: 70, title: 'Nachtdienst-Taler', blurb: 'Für alle, die auch spät noch einchecken – Wertsachen trägt man im Wallet.' },
  { day: 17, money: 960, xp: 74, title: 'Überraschungsei', blurb: 'Mal was Nützliches fürs Sparziel nächster Fachkurs.' },
  { day: 18, money: 1020, xp: 78, title: 'Quiet Shift', blurb: 'Ruhiger Dienst, volle Belohnung – plus ein paar Karma-Punkte fürs Ansehen.', reputation: 10 },
  { day: 19, money: 1080, xp: 82, title: 'Fast am Ziel', blurb: 'Noch ein paar Tage bis zur großen Meilenstein-Welle.' },
  { day: 20, money: 2200, xp: 160, title: '20-Tage-Meister + Pharmakologie', blurb: 'Ausdauer-Level hoch – Lexikon Pharmakologie gratis, falls noch gesperrt.', grantKnowledgeId: 'pharmacology_ref', reputation: 15 },
  { day: 21, money: 1180, xp: 88, title: 'Drei Wochen voll', blurb: 'Streak der ruhenden Helden – und ein kleiner Push fürs Patienten-Konto.', patientsHelpedBonus: 3 },
  { day: 22, money: 1120, xp: 86, title: 'Dienst-Upgrade', blurb: 'Ein Schritt näher am nächsten Kurskauf.' },
  { day: 23, money: 1240, xp: 92, title: 'Klinik-Karma', blurb: 'Gute Tat du, Geld kommt zu – plus Reputation.' },
  { day: 24, money: 1300, xp: 95, title: 'Vorfreude', blurb: 'Die 30-Tage-Linie naht – heute etwas großzügiger.' },
  { day: 25, money: 2800, xp: 200, title: 'Silber-Rand + Neurologie', blurb: 'Top-Viertel der Serie! Neurologie-Lexikon geschenkt, falls gesperrt.', grantKnowledgeId: 'neurology_ref', reputation: 15 },
  { day: 26, money: 1400, xp: 105, title: 'Endspurt', blurb: 'Nur noch wenige Tage – der Bonus wirkt wie Überstunden-Zuschlag.' },
  { day: 27, money: 1460, xp: 108, title: 'Goldener Block', blurb: 'Bonus für Ausdauernde vor dem Finale.' },
  { day: 28, money: 1520, xp: 112, title: 'Vier Wochen Plus', blurb: 'Länger durch als mancher PJ – heute mit Extra-Ansehen.', reputation: 18 },
  { day: 29, money: 3200, xp: 240, title: 'Vorletzter Tag', blurb: 'Morgen kracht’s – heute schon fast Maximum.', reputation: 22 },
  { day: 30, money: 12500, xp: 520, title: '30-Tage-Legende', blurb: 'Finale: massives Budget + EP, Lexikon Kardiologie geschenkt (falls gesperrt), und Ruf-Boost fürs Leaderboard.', grantKnowledgeId: 'cardiology', reputation: 40, patientsHelpedBonus: 5 },
]

export function getDailyRewardForDay(dayIndex1Based) {
  const idx = Math.max(1, Math.min(DAILY_LOGIN_TOTAL_DAYS, dayIndex1Based)) - 1
  return DAILY_LOGIN_REWARDS[idx] || DAILY_LOGIN_REWARDS[0]
}

/** Zeilen für UI (Tooltips, „Heute für dich“). */
export function getDailyRewardBonusNotes(reward, user) {
  if (!reward) return []
  const unlocked = new Set(user?.unlockedKnowledge || [])
  const notes = []
  const rep = Math.max(0, Number(reward.reputation || 0))
  if (rep) {
    notes.push({ key: 'rep', text: `+${rep} Ansehen`, className: 'text-amber-700 font-medium' })
  }
  const ph = Math.max(0, Number(reward.patientsHelpedBonus || 0))
  if (ph) {
    notes.push({ key: 'ph', text: `+${ph} Patientenbilanz (Bonus)`, className: 'text-sky-700 font-medium' })
  }
  const gid = reward.grantKnowledgeId
  if (gid) {
    const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === gid)
    if (cat) {
      const already = unlocked.has(gid) || Number(cat.cost || 0) <= 0
      notes.push({
        key: `kn-${gid}`,
        text: already
          ? `Lexikon „${cat.name}“ (bereits frei)`
          : `Lexikon „${cat.name}“ gratis freischalten`,
        className: already ? 'text-surface-500' : 'text-indigo-700 font-semibold',
      })
    }
  }
  return notes
}

/**
 * Patch für updateUser nach Daily-Login (Wallet, XP, Stats, Lexikon).
 * @param {object|null} user
 * @param {DailyLoginReward} reward
 */
export function buildDailyLoginClaimUpdates(user, reward) {
  const walletDelta = Math.max(0, Number(reward?.money || 0))
  const xpDelta = Math.max(0, Number(reward?.xp || 0))
  const prevStats = { ...(user?.stats || {}) }
  const repAdd = Math.max(0, Number(reward?.reputation || 0))
  if (repAdd) {
    prevStats.reputation = Math.max(0, Number(prevStats.reputation || 0)) + repAdd
  }
  const phAdd = Math.max(0, Number(reward?.patientsHelpedBonus || 0))
  if (phAdd) {
    prevStats.patientsHelped = Math.max(0, Number(prevStats.patientsHelped || 0)) + phAdd
  }
  let unlocked = [...(user?.unlockedKnowledge || [])]
  const gid = reward?.grantKnowledgeId
  if (gid && typeof gid === 'string') {
    const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === gid)
    const already = unlocked.includes(gid)
    if (!already && cat && Number(cat.cost || 0) > 0) {
      unlocked = [...unlocked, gid]
    }
  }
  return {
    wallet: Math.max(0, Number(user?.wallet || 0)) + walletDelta,
    xp: Math.max(0, Number(user?.xp || 0)) + xpDelta,
    stats: prevStats,
    unlockedKnowledge: unlocked,
  }
}

export function localCalendarDateKey(d = new Date()) {
  return d.toLocaleDateString('en-CA')
}

export function canClaimDailyLogin(user) {
  const dl = user?.dailyLogin
  if (!dl || (dl.claimedCount || 0) >= DAILY_LOGIN_TOTAL_DAYS) return false
  const today = localCalendarDateKey()
  if (!dl.lastClaimDateKey) return true
  return dl.lastClaimDateKey !== today
}

export function nextClaimableDayNumber(user) {
  const n = Number(user?.dailyLogin?.claimedCount || 0)
  return Math.min(DAILY_LOGIN_TOTAL_DAYS, n + 1)
}

/** Millisekunden bis zur nächsten lokalen Kalendermitternacht (nächster Daily-Login-Zeitraum). */
export function msUntilNextDailyLoginWindow() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}

export function formatDurationHms(totalMs) {
  const s = Math.ceil(totalMs / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
