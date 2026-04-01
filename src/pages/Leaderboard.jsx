import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCurrentRank } from '../data/ranks'
import { getSupabaseClient } from '../lib/supabaseClient'
import {
  Trophy, Medal, Users, Star, TrendingUp, Crown
} from 'lucide-react'

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const sb = getSupabaseClient()
      if (sb) {
        const { data, error } = await sb.rpc('list_leaderboard', { _limit: 50 })
        if (!cancelled && !error) {
          const mapped = (data || []).map((row, idx) => ({
            position: idx + 1,
            userId: row.user_id,
            name: row.name,
            rank: row.title || getCurrentRank({ xp: row.xp || 0 }).name,
            hospitalName: row.hospital_name || '—',
            casesCompleted: row.cases_completed || 0,
            successRate: row.success_rate || 0,
            reputation: row.reputation || 0,
            xp: row.xp || 0,
          }))
          setEntries(mapped)
          setLoading(false)
          return
        }
      }
      const users = []
      const seen = new Set()
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('medisim_user_')) continue
        const parsed = safeParseJson(localStorage.getItem(key), null)
        if (!parsed?.id || seen.has(parsed.id)) continue
        seen.add(parsed.id)
        users.push(parsed)
      }
      const currentUser = safeParseJson(localStorage.getItem('medisim_user'), null)
      if (currentUser?.id && !seen.has(currentUser.id)) users.push(currentUser)
      const mapped = users
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 50)
        .map((row, idx) => ({
          position: idx + 1,
          userId: row.id,
          name: row.prefix ? `${row.prefix} ${row.name}` : row.name,
          rank: row.title || getCurrentRank({ xp: row.xp || 0 }).name,
          hospitalName: row.hospitalName || '—',
          casesCompleted: row.stats?.casesCompleted || 0,
          successRate: row.stats?.successRate || 0,
          reputation: row.stats?.reputation || 0,
          xp: row.xp || 0,
        }))
      if (!cancelled) {
        setEntries(mapped)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const myEntry = useMemo(() => {
    if (!user) return null
    const rank = getCurrentRank(user)
    const fromEntries = entries.find(e => e.userId === user.id)
    if (fromEntries) return fromEntries
    return {
      position: '—',
      userId: user.id,
      name: user.prefix ? `${user.prefix} ${user.name}` : user.name,
      rank: rank.name,
      rankBadge: rank.badge,
      hospitalName: user.hospitalName || '—',
      casesCompleted: user.stats?.casesCompleted || 0,
      successRate: user.stats?.successRate || 0,
      reputation: user.stats?.reputation || 0,
      xp: user.xp || 0,
    }
  }, [entries, user])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold text-surface-900">Rangliste</h1>
        <p className="text-surface-500 mt-2">
          Hier werden alle Spieler nach ihren Leistungen gerankt. Behandle Patienten, schließe Kurse ab und steige auf!
        </p>
      </div>

      {/* Your position */}
      {myEntry && (
        <div className="card p-6 mb-8 border-primary-200 bg-primary-50/50">
          <h3 className="font-semibold text-surface-900 mb-4">Deine Position</h3>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
              {myEntry.position}
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${user?.avatar || 'from-blue-400 to-blue-600'} flex items-center justify-center text-white font-bold text-lg`}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-surface-900">{myEntry.name} {myEntry.rankBadge}</p>
              <p className="text-sm text-surface-500">{myEntry.rank} &bull; {myEntry.hospitalName}</p>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-bold text-surface-900">{myEntry.casesCompleted}</p>
                <p className="text-surface-500">Fälle</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-surface-900">{myEntry.successRate}%</p>
                <p className="text-surface-500">Erfolg</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-surface-900">{myEntry.xp}</p>
                <p className="text-surface-500">EP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-surface-500">Rangliste wird geladen...</div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-surface-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-900 mb-2">Noch keine anderen Spieler</h3>
          <p className="text-surface-500 max-w-md mx-auto mb-6">
            Die Rangliste füllt sich, sobald weitere Spieler dem Spiel beitreten.
            Im Moment bist du der einzige Spieler — nutze die Zeit, um Kurse abzuschließen und Patienten zu behandeln!
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-50 text-surface-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            Tipp: Schließe Facharzt-Kurse ab, um schneller aufzusteigen
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.userId} className={`p-3 rounded-xl flex items-center gap-3 ${entry.userId === user?.id ? 'bg-primary-50 border border-primary-200' : 'bg-surface-50'}`}>
                <div className="w-8 h-8 rounded-lg bg-surface-200 text-surface-700 flex items-center justify-center text-sm font-bold">{entry.position}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{entry.name}</p>
                  <p className="text-xs text-surface-500 truncate">{entry.rank} • {entry.hospitalName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-surface-900">{entry.xp} EP</p>
                  <p className="text-xs text-surface-500">{entry.casesCompleted} Fälle</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How ranking works */}
      <div className="card p-6 mt-6">
        <h3 className="font-semibold text-surface-900 mb-3">So funktioniert die Rangliste</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-surface-50 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
              <Star className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-surface-900 text-sm mb-1">Erfahrungspunkte (EP)</h4>
            <p className="text-xs text-surface-500">Sammle EP durch Kurse, Prüfungen und Patientenbehandlungen</p>
          </div>
          <div className="bg-surface-50 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
              <Medal className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-surface-900 text-sm mb-1">Rang aufsteigen</h4>
            <p className="text-xs text-surface-500">Assistenzarzt → Facharzt → Oberarzt → Chefarzt</p>
          </div>
          <div className="bg-surface-50 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Crown className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-surface-900 text-sm mb-1">Reputation</h4>
            <p className="text-xs text-surface-500">Höhere Erfolgsraten und mehr Fälle erhöhen deine Reputation</p>
          </div>
        </div>
      </div>
    </div>
  )
}
