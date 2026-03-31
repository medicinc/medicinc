import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospital } from '../context/HospitalContext'
import { SAMPLE_CASES, DEPARTMENTS, DIFFICULTY_LEVELS } from '../data/sampleCases'
import { TRIAGE_LEVELS } from '../data/patientGenerator'
import {
  Search, Filter, Stethoscope, Clock, Zap, ArrowRight,
  Heart, Brain, Wind, Pill, Bone, Siren, Activity, Building2,
  AlertCircle, HeartPulse, Users
} from 'lucide-react'

const deptIconMap = {
  cardiology: Heart,
  neurology: Brain,
  pulmonology: Wind,
  gastro: Pill,
  ortho: Bone,
  emergency: Siren,
}

export default function Cases() {
  const { user } = useAuth()
  const { hospital, canReceivePatients } = useHospital()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('hospital')
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedDiff, setSelectedDiff] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const hasHospital = !!hospital?.id
  const patients = hospital?.patients || []

  const patientsByStatus = {
    waiting_triage: patients.filter(p => p.status === 'waiting_triage'),
    triaged: patients.filter(p => p.status === 'triaged'),
    waiting: patients.filter(p => p.status === 'waiting'),
    in_treatment: patients.filter(p => p.status === 'in_treatment'),
  }

  const filtered = SAMPLE_CASES.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.summary.toLowerCase().includes(search.toLowerCase())
    const matchDept = selectedDept === 'all' || c.department === selectedDept
    const matchDiff = selectedDiff === 'all' || c.difficulty === selectedDiff
    return matchSearch && matchDept && matchDiff
  })

  const activeFilters = (selectedDept !== 'all' ? 1 : 0) + (selectedDiff !== 'all' ? 1 : 0)

  if (!hasHospital) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-16 h-16 text-surface-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-surface-900 mb-2">Kein Krankenhaus</h2>
        <p className="text-surface-500 mb-6">Du musst einem Krankenhaus beitreten, um Patienten zu sehen und Fälle zu bearbeiten.</p>
        <Link to="/hospital-choice" className="btn-primary">Krankenhaus finden</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-surface-900">Patientenfälle</h1>
        <p className="text-surface-500 mt-1">{hospital.name} &bull; {patients.length} aktive Patienten</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('hospital')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'hospital' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
          <Activity className="w-4 h-4" /> Krankenhaus-Patienten
          {patients.length > 0 && <span className={`ml-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${activeTab === 'hospital' ? 'bg-white/20' : 'bg-primary-100 text-primary-700'}`}>{patients.length}</span>}
        </button>
        <button onClick={() => setActiveTab('training')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'training' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
          <Stethoscope className="w-4 h-4" /> Übungsfälle
        </button>
      </div>

      {/* HOSPITAL PATIENTS TAB */}
      {activeTab === 'hospital' && (
        <div>
          {!canReceivePatients && (
            <div className="card p-6 text-center border-amber-200 bg-amber-50/50 mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-semibold text-surface-900 mb-1">Keine Patientenaufnahme möglich</h3>
              <p className="text-sm text-surface-500 mb-4">Dein Krankenhaus benötigt eine Notaufnahme oder Ambulante Aufnahme, um Patienten zu empfangen.</p>
              <button onClick={() => navigate('/hospital')} className="btn-primary text-sm">
                <Building2 className="w-4 h-4" /> Zum Krankenhaus
              </button>
            </div>
          )}

          {patients.length === 0 && canReceivePatients && (
            <div className="text-center py-16">
              <Activity className="w-16 h-16 text-surface-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-1">Keine Patienten</h3>
              <p className="text-surface-500">Patienten kommen automatisch, wenn die Aufnahme aktiv ist.</p>
            </div>
          )}

          {patients.length > 0 && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card p-4 border-red-200 bg-red-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-medium text-surface-500">Warten auf Triage</p>
                  </div>
                  <p className="text-2xl font-bold text-surface-900">{patientsByStatus.waiting_triage.length}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-medium text-surface-500">Triagiert</p>
                  </div>
                  <p className="text-2xl font-bold text-surface-900">{patientsByStatus.triaged.length}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-medium text-surface-500">Wartezimmer</p>
                  </div>
                  <p className="text-2xl font-bold text-surface-900">{patientsByStatus.waiting.length}</p>
                </div>
                <div className="card p-4 border-accent-200">
                  <div className="flex items-center gap-2 mb-1">
                    <HeartPulse className="w-4 h-4 text-accent-500" />
                    <p className="text-xs font-medium text-surface-500">In Behandlung</p>
                  </div>
                  <p className="text-2xl font-bold text-surface-900">{patientsByStatus.in_treatment.length}</p>
                </div>
              </div>

              {/* Patient list */}
              <div className="space-y-2">
                {patients.map(p => {
                  const tl = TRIAGE_LEVELS.find(t => t.id === p.triageLevel)
                  const statusLabel = {
                    waiting_triage: 'Triage ausstehend',
                    triaged: 'Triagiert',
                    waiting: 'Wartezimmer',
                    in_treatment: 'In Behandlung',
                  }[p.status] || p.status
                  const statusColor = {
                    waiting_triage: 'bg-red-100 text-red-700',
                    triaged: 'bg-amber-100 text-amber-700',
                    waiting: 'bg-blue-100 text-blue-700',
                    in_treatment: 'bg-green-100 text-green-700',
                  }[p.status] || 'bg-surface-100 text-surface-600'

                  return (
                    <div
                      key={p.id}
                      className="card p-4 flex items-center gap-4 hover:border-primary-200 transition-colors cursor-pointer"
                      onClick={() => navigate('/hospital', { state: { openPatientId: p.id, openTab: 'overview' } })}
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                        {p.arrivalType === 'ambulance' ? <Siren className="w-5 h-5 text-red-500" /> : <Users className="w-5 h-5 text-surface-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-surface-900">{p.name}</p>
                          <span className="text-xs text-surface-400">{p.age}J, {p.gender}</span>
                          {tl && <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${tl.bgColor}`}>{tl.id}</span>}
                        </div>
                        <p className="text-sm text-surface-600 truncate">{p.chiefComplaint}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                        <ArrowRight className="w-4 h-4 text-surface-300" />
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-surface-400 text-center">Klicke auf einen Patienten, um direkt die Akte zu öffnen</p>
            </div>
          )}
        </div>
      )}

      {/* TRAINING CASES TAB */}
      {activeTab === 'training' && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-11"
                placeholder="Übungsfälle durchsuchen..."
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary relative ${showFilters ? '!border-primary-300 !bg-primary-50' : ''}`}>
              <Filter className="w-4 h-4" /> Filter
              {activeFilters > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>

          {showFilters && (
            <div className="card p-5 mb-6 animate-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-surface-900">Filter</h3>
                {activeFilters > 0 && <button onClick={() => { setSelectedDept('all'); setSelectedDiff('all') }} className="text-sm text-primary-600 font-medium hover:text-primary-700">Zurücksetzen</button>}
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-surface-700 mb-2">Abteilung</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedDept('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDept === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>Alle</button>
                    {DEPARTMENTS.map(dept => (
                      <button key={dept.id} onClick={() => setSelectedDept(dept.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDept === dept.id ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{dept.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-700 mb-2">Schwierigkeitsgrad</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedDiff('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDiff === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>Alle</button>
                    {DIFFICULTY_LEVELS.map(diff => (
                      <button key={diff.id} onClick={() => setSelectedDiff(diff.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDiff === diff.id ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{diff.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-surface-500 mb-4">{filtered.length} Übungsfälle</p>

          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((c) => {
              const dept = DEPARTMENTS.find(d => d.id === c.department)
              const DeptIcon = deptIconMap[c.department] || Stethoscope
              return (
                <Link key={c.id} to={`/case/${c.id}`} className="card overflow-hidden group hover:border-primary-200 transition-all">
                  <div className={`px-5 py-3 flex items-center justify-between ${c.difficulty === 'anfaenger' ? 'bg-green-50' : c.difficulty === 'mittel' ? 'bg-amber-50' : c.difficulty === 'fortgeschritten' ? 'bg-orange-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-2">
                      <DeptIcon className={`w-4 h-4 ${c.difficulty === 'anfaenger' ? 'text-green-600' : c.difficulty === 'mittel' ? 'text-amber-600' : c.difficulty === 'fortgeschritten' ? 'text-orange-600' : 'text-red-600'}`} />
                      <span className="text-sm font-medium text-surface-700">{dept?.name}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.difficulty === 'anfaenger' ? 'bg-green-100 text-green-700' : c.difficulty === 'mittel' ? 'bg-amber-100 text-amber-700' : c.difficulty === 'fortgeschritten' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {c.difficulty}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-surface-900 mb-2 group-hover:text-primary-600 transition-colors">{c.title}</h3>
                    <p className="text-sm text-surface-500 line-clamp-2 mb-4">{c.summary}</p>
                    <div className="flex items-center gap-4 text-sm text-surface-500">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor(c.timeLimit / 60)} Min.</span>
                      <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> {c.xpReward} EP</span>
                      <span className="flex items-center gap-1"><Stethoscope className="w-4 h-4" /> {c.availableDiagnostics.length} Tests</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-surface-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-1">Keine Fälle gefunden</h3>
              <p className="text-surface-500">Versuche, deine Suche oder Filter anzupassen</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
