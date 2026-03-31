import { DAILY_LOGIN_TOTAL_DAYS } from './dailyLoginRewards'
import { getCurrentRank } from './ranks'

export const ACHIEVEMENTS = {
  first_steps: {
    id: 'first_steps',
    title: 'Erste Schritte',
    description: 'Onboarding abgeschlossen – du bist startklar.',
    howTo: 'Schließe das Onboarding (medizinischer oder Rettungsdienst-Pfad) vollständig ab.',
    icon: '🩺',
  },
  assistant_all_round: {
    id: 'assistant_all_round',
    title: 'Assistenz-Allrounder',
    description: 'Blutabnahme-, EKG- und RR-Minigame je mindestens einmal gemeistert.',
    howTo: 'Im Krankenhaus unter „Assistenz-Aufgaben“ je einmal Blutabnahme-, EKG- und NIBP-Minispiel erfolgreich abschließen.',
    icon: '🧪',
  },
  daily_week: {
    id: 'daily_week',
    title: 'Login-Serie (7)',
    description: '7 Daily-Login-Belohnungen eingesammelt.',
    howTo: '7× die Daily-Login-Belohnung an verschiedenen Tagen einsammeln (Fortschritt siehe unten).',
    icon: '📅',
  },
  daily_complete: {
    id: 'daily_complete',
    title: '30-Tage-Legende',
    description: 'Alle Daily-Login-Tage durchgespielt.',
    howTo: `An ${DAILY_LOGIN_TOTAL_DAYS} Tagen jeweils die Tagesbelohnung des Daily-Logins einsammeln.`,
    icon: '🏆',
  },
  cases_25: {
    id: 'cases_25',
    title: 'Fall-Akrobat',
    description: '25 simulierte Fälle absolviert.',
    howTo: 'Erreiche 25 abgeschlossene simulierte Fälle (Profil-Statistik „Fälle“).',
    icon: '📋',
  },
  cases_100: {
    id: 'cases_100',
    title: 'Fall-Veteran',
    description: '100 simulierte Fälle absolviert.',
    howTo: 'Erreiche 100 abgeschlossene simulierte Fälle.',
    icon: '🎯',
  },
  balance_25k: {
    id: 'balance_25k',
    title: 'Geld wie Heu',
    description: '25.000€ persönliches Guthaben erreicht.',
    howTo: 'Bringe dein persönliches Guthaben (Wallet) auf mindestens 25.000€.',
    icon: '💰',
  },
  facharzt: {
    id: 'facharzt',
    title: 'Aufstieg',
    description: 'Rang Facharzt oder höher erreicht.',
    howTo: 'Steige durch EP und Karrierefortschritt mindestens bis zum Rang „Facharzt“ (Rangstufe ≥2) auf.',
    icon: '⭐',
  },
  specialty_chosen: {
    id: 'specialty_chosen',
    title: 'Spezialist',
    description: 'Eine Fachrichtung gewählt.',
    howTo: 'Wähle im Profil nach den Voraussetzungen eine medizinische Fachrichtung.',
    icon: '🔬',
  },
}

export function getAchievementDashboard(user) {
  if (!user) return []
  const stats = user.stats || {}
  const cases = Math.max(0, Number(stats.casesCompleted || 0))
  const wallet = Math.max(0, Number(user.wallet || 0))
  const rank = getCurrentRank(user)
  const rankLevel = Number(rank?.level || 1)
  const dlCount = Math.min(DAILY_LOGIN_TOTAL_DAYS, Math.max(0, Number(user.dailyLogin?.claimedCount || 0)))
  const mini = stats.assistantMiniStats || {}
  const blood = Math.max(0, Number(mini.bloodAssist || 0))
  const ekg = Math.max(0, Number(mini.ekgMini || 0))
  const nibp = Math.max(0, Number(mini.nibpMini || 0))
  const assistantMinDone = Math.min(blood, 1) + Math.min(ekg, 1) + Math.min(nibp, 1)

  const rows = Object.values(ACHIEVEMENTS).map((meta) => {
    const unlockedAt = user.achievementUnlocks?.[meta.id] || null
    let progressPct = 0
    let progressLabel = '0%'
    switch (meta.id) {
      case 'first_steps':
        progressPct = user.onboardingComplete ? 100 : 0
        progressLabel = user.onboardingComplete ? 'Abgeschlossen' : 'Noch offen'
        break
      case 'assistant_all_round':
        progressPct = Math.round((assistantMinDone / 3) * 100)
        progressLabel = `${assistantMinDone}/3 Minispiele`
        break
      case 'daily_week': {
        const n = Math.min(7, dlCount)
        progressPct = Math.round((n / 7) * 100)
        progressLabel = `${n}/7 eingesammelte Tage`
        break
      }
      case 'daily_complete':
        progressPct = Math.round((dlCount / DAILY_LOGIN_TOTAL_DAYS) * 100)
        progressLabel = `${dlCount}/${DAILY_LOGIN_TOTAL_DAYS} Tage`
        break
      case 'cases_25': {
        const n = Math.min(25, cases)
        progressPct = Math.round((n / 25) * 100)
        progressLabel = `${n}/25 Fälle`
        break
      }
      case 'cases_100': {
        const n = Math.min(100, cases)
        progressPct = Math.round((n / 100) * 100)
        progressLabel = `${n}/100 Fälle`
        break
      }
      case 'balance_25k': {
        const n = Math.min(25000, wallet)
        progressPct = Math.round((n / 25000) * 100)
        progressLabel = `${wallet.toLocaleString('de-DE')}€ / 25.000€`
        break
      }
      case 'facharzt':
        progressPct = rankLevel >= 2 ? 100 : Math.max(0, Math.min(99, Math.round((rankLevel / 2) * 100)))
        progressLabel = rankLevel >= 2 ? 'Facharzt erreicht' : `Rangstufe ${rankLevel} (Ziel ≥2)`
        break
      case 'specialty_chosen':
        progressPct = user.specialty ? 100 : 0
        progressLabel = user.specialty ? 'Fachrichtung gesetzt' : 'Noch keine Fachrichtung'
        break
      default:
        progressPct = unlockedAt ? 100 : 0
        progressLabel = unlockedAt ? '100%' : '—'
    }
    if (unlockedAt) progressPct = 100
    return { meta, unlockedAt, progressPct, progressLabel }
  })
  return rows.sort((a, b) => {
    const au = a.unlockedAt ? 1 : 0
    const bu = b.unlockedAt ? 1 : 0
    if (au !== bu) return bu - au
    return String(a.meta.title).localeCompare(String(b.meta.title), 'de')
  })
}

export function computeNewAchievementUnlocks(user, prevUnlocked = {}) {
  if (!user) return {}
  const stats = user.stats || {}
  const cases = Math.max(0, Number(stats.casesCompleted || 0))
  const wallet = Math.max(0, Number(user.wallet || 0))
  const rank = getCurrentRank(user)
  const rankLevel = Number(rank?.level || 1)
  const dlCount = Number(user.dailyLogin?.claimedCount || 0)
  const mini = stats.assistantMiniStats || {}
  const triplet = (mini.bloodAssist || 0) >= 1 && (mini.ekgMini || 0) >= 1 && (mini.nibpMini || 0) >= 1

  const next = { ...prevUnlocked }
  const add = (id) => {
    if (!next[id]) next[id] = new Date().toISOString()
  }

  if (user.onboardingComplete) add('first_steps')
  if (triplet) add('assistant_all_round')
  if (dlCount >= 7) add('daily_week')
  if (dlCount >= DAILY_LOGIN_TOTAL_DAYS) add('daily_complete')
  if (cases >= 25) add('cases_25')
  if (cases >= 100) add('cases_100')
  if (wallet >= 25000) add('balance_25k')
  if (rankLevel >= 2) add('facharzt')
  if (user.specialty) add('specialty_chosen')

  return next
}
