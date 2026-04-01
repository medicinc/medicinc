import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospital } from '../context/HospitalContext'
import HospitalTeamChat from '../components/HospitalTeamChat'
import { TRIAGE_LEVELS } from '../data/patientGenerator'
import {
  Activity, Stethoscope, Building2, Trophy, TrendingUp, Clock,
  Heart, Brain, Wind, Siren, ArrowRight, Star, Users, Zap,
  ChevronRight, BookOpen, Target, BarChart3, ShoppingCart, Wallet,
  AlertCircle, HeartPulse, Library
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { hospital, canReceivePatients } = useHospital()
  const isRescueOnly = user?.careerTrack === 'rescue' && !user?.medicalLicense
  const hasDualRole = !!(user?.medicalLicense && user?.rescueCertified)
  const roleLabel = hasDualRole
    ? 'Assistenzarzt/-ärztin & Rettungsdienst'
    : (user?.title || 'Arzt/Ärztin im Praktikum')

  const xpPercent = ((user?.xp || 0) / (user?.xpToNext || 1)) * 100
  const userStats = user?.stats || {}
  const casesCompleted = Math.max(0, Number(userStats.casesCompleted || 0))
  const successfulCases = Math.max(0, Math.min(casesCompleted, Number(userStats.successfulCases || 0)))
  const patientsHelped = Math.max(0, Number(userStats.patientsHelped || 0))
  const successRate = casesCompleted > 0 ? Math.round((successfulCases / casesCompleted) * 100) : 0
  const completionRate = patientsHelped > 0 ? Math.round((casesCompleted / patientsHelped) * 100) : 0
  const patients = hospital?.patients || []
  const inTreatment = patients.filter(p => p.status === 'in_treatment')
  const awaitingTriage = patients.filter(p => p.status === 'waiting_triage')
  const triaged = patients.filter(p => p.status === 'triaged' || p.status === 'waiting')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-surface-900">
          Willkommen zurück, {user?.name || 'Teammitglied'}
        </h1>
        <p className="text-surface-500 mt-1">
          {user?.careerTrack === 'rescue' && !user?.medicalLicense
            ? 'Hier ist deine Übersicht für den Rettungsdienst'
            : 'Hier ist eine Übersicht deiner medizinischen Praxis'}
        </p>
      </div>

      {/* Stufe & EP Karte */}
      <div className="card p-6 mb-8 bg-gradient-to-r from-primary-600 to-primary-700 border-0 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="font-display text-2xl font-bold">{user?.level || 1}</span>
            </div>
            <div>
              <p className="text-primary-200 text-sm font-medium">Aktuelle Stufe</p>
              <p className="text-xl font-bold">{roleLabel}</p>
              {user?.hospitalName && <p className="text-primary-200 text-sm">{user.hospitalName}</p>}
              {user?.rescueStationName && <p className="text-primary-200 text-sm">{user.rescueStationName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/shop" className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl hover:bg-white/25 transition-colors">
              <Wallet className="w-4 h-4" />
              <span className="font-semibold">{(user?.wallet || 0).toLocaleString('de-DE')}€</span>
            </Link>
            <div className="w-48 hidden sm:block">
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-primary-200">Stufe {(user?.level || 1) + 1}</span>
                <span className="font-medium">{user?.xp || 0} / {user?.xpToNext || 500} EP</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Abgeschlossene Fälle', value: casesCompleted, icon: Stethoscope, color: 'text-primary-600 bg-primary-50', trend: `${completionRate}% Abschlussquote` },
          { label: 'Erfolgsrate', value: `${successRate}%`, icon: Target, color: 'text-accent-600 bg-accent-50', trend: `${successfulCases}/${casesCompleted || 0} erfolgreich` },
          { label: 'Behandelte Patient*innen', value: patientsHelped, icon: Users, color: 'text-purple-600 bg-purple-50', trend: `${Math.max(0, patientsHelped - casesCompleted)} offen/teilweise` },
          { label: 'Reputation', value: Math.max(0, Number(userStats.reputation || 0)), icon: Star, color: 'text-amber-600 bg-amber-50', trend: successRate >= 80 ? 'Sehr gut' : successRate >= 60 ? 'Stabil' : 'Ausbaufähig' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-accent-600 font-medium bg-accent-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
            </div>
            <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
            <p className="text-sm text-surface-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className={`grid ${isRescueOnly ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-8`}>
        {/* Aktive Patienten */}
        {!isRescueOnly && (
          <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-surface-900">Aktive Patienten</h2>
            <Link to="/hospital" className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
              Zum Krankenhaus <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {!hospital?.id ? (
            <div className="card p-8 text-center">
              <Building2 className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500 mb-3">Du bist noch keinem Krankenhaus beigetreten.</p>
              <Link to="/hospital-choice" className="text-sm text-primary-600 font-medium">Krankenhaus finden</Link>
            </div>
          ) : patients.length === 0 ? (
            <div className="card p-8 text-center">
              <Activity className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500">
                {canReceivePatients ? 'Noch keine Patienten. Patienten kommen automatisch.' : 'Baue eine Notaufnahme, um Patienten zu empfangen.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="card p-3 text-center border-red-200 bg-red-50/30">
                  <p className="text-lg font-bold text-surface-900">{awaitingTriage.length}</p>
                  <p className="text-xs text-surface-500">Warten auf Triage</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-lg font-bold text-surface-900">{triaged.length}</p>
                  <p className="text-xs text-surface-500">Triagiert / Wartend</p>
                </div>
                <div className="card p-3 text-center border-accent-200">
                  <p className="text-lg font-bold text-surface-900">{inTreatment.length}</p>
                  <p className="text-xs text-surface-500">In Behandlung</p>
                </div>
              </div>

              {/* Patient list (most urgent first) */}
              {[...awaitingTriage, ...triaged, ...inTreatment].slice(0, 6).map(p => {
                const tl = TRIAGE_LEVELS.find(t => t.id === p.triageLevel)
                const statusColor = {
                  waiting_triage: 'bg-red-100 text-red-700',
                  triaged: 'bg-amber-100 text-amber-700',
                  waiting: 'bg-blue-100 text-blue-700',
                  in_treatment: 'bg-green-100 text-green-700',
                }[p.status] || 'bg-surface-100 text-surface-600'
                const statusLabel = {
                  waiting_triage: 'Triage',
                  triaged: 'Triagiert',
                  waiting: 'Wartet',
                  in_treatment: 'Behandlung',
                }[p.status]

                return (
                  <Link key={p.id} to="/hospital" className="card p-4 flex items-center gap-4 group hover:border-primary-200 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                      {p.arrivalType === 'ambulance' ? <Siren className="w-5 h-5 text-red-500" /> : <Users className="w-5 h-5 text-surface-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-surface-900 truncate">{p.name}</h3>
                        <span className="text-xs text-surface-400">{p.age}J</span>
                        {tl && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tl.bgColor}`}>{tl.id}</span>}
                      </div>
                      <p className="text-sm text-surface-500 truncate">{p.chiefComplaint}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusColor}`}>{statusLabel}</span>
                    <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-all shrink-0" />
                  </Link>
                )
              })}

              {patients.length > 6 && (
                <Link to="/hospital" className="block text-center text-sm text-primary-600 font-medium py-2 hover:text-primary-700">
                  +{patients.length - 6} weitere Patienten anzeigen
                </Link>
              )}
            </div>
          )}
          </div>
        )}

        {/* Schnellaktionen */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Schnellaktionen</h2>
            <div className="space-y-2">
              {!isRescueOnly && (
                <Link to="/hospital" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-surface-900">Patienten im Krankenhaus</span>
                  <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
                </Link>
              )}
              <Link to="/rettungsdienst" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Siren className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-900">Rettungsdienst</span>
                <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
              </Link>
              {!isRescueOnly && (
                <Link to="/hospital" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-surface-900">Krankenhaus verwalten</span>
                  <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
                </Link>
              )}
              <Link to="/courses" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-900">Kurs fortsetzen</span>
                <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
              </Link>
              <Link to="/knowledge" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Library className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-900">Wissen nachschlagen</span>
                <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
              </Link>
              <Link to="/shop" className="card p-4 flex items-center gap-3 group hover:border-primary-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-900">Shop besuchen</span>
                <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
              </Link>
            </div>
          </div>

          {!isRescueOnly && hospital?.id && (
            <HospitalTeamChat hospitalId={hospital.id} />
          )}
        </div>
      </div>
    </div>
  )
}
