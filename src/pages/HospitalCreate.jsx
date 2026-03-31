import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createHospitalMembership, upsertHospitalState } from '../services/hospitalService'
import {
  Building2, ArrowLeft, ArrowRight, Check, MapPin, Users, Shield,
  Heart, Brain, Wind, Siren, Pill, Bone, Scissors, Star, Settings,
  Palette, Globe, Lock, Unlock, DollarSign, Bed, HeartPulse,
  FlaskConical, Scan, Dumbbell, ChevronDown, ChevronUp, Eye,
  Crown, Zap, AlertCircle
} from 'lucide-react'

const SPECIALTIES = [
  { id: 'general', name: 'Allgemeinmedizin', icon: Heart, desc: 'Breites Spektrum an Fachbereichen' },
  { id: 'cardiology', name: 'Kardiologie', icon: Heart, desc: 'Schwerpunkt Herz-Kreislauf' },
  { id: 'neurology', name: 'Neurologie', icon: Brain, desc: 'Schwerpunkt Nervensystem' },
  { id: 'emergency', name: 'Notfallmedizin', icon: Siren, desc: 'Schwerpunkt Akut- und Notfälle' },
  { id: 'surgery', name: 'Chirurgie', icon: Scissors, desc: 'Schwerpunkt operative Eingriffe' },
  { id: 'pulmonology', name: 'Pneumologie', icon: Wind, desc: 'Schwerpunkt Atemwege' },
  { id: 'gastro', name: 'Gastroenterologie', icon: Pill, desc: 'Schwerpunkt Verdauungssystem' },
  { id: 'ortho', name: 'Orthopädie', icon: Bone, desc: 'Schwerpunkt Bewegungsapparat' },
]

const CITIES = [
  'Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg',
  'Freiburg', 'Heidelberg', 'Münster', 'Aachen', 'Würzburg', 'Rostock',
]

const THEMES = [
  { id: 'modern', name: 'Modern', desc: 'Zeitgemäßes Design mit klaren Linien', color: 'from-blue-500 to-blue-600' },
  { id: 'classic', name: 'Klassisch', desc: 'Traditionelle Klinik-Atmosphäre', color: 'from-amber-500 to-amber-600' },
  { id: 'futuristic', name: 'Futuristisch', desc: 'High-Tech und innovativ', color: 'from-purple-500 to-purple-600' },
  { id: 'nature', name: 'Naturklinik', desc: 'Grün und nachhaltig', color: 'from-emerald-500 to-emerald-600' },
]

const STARTING_ROOMS = [
  { id: 'er', name: 'Notaufnahme', icon: Siren, cost: 5000 },
  { id: 'ward', name: 'Allgemeinstation', icon: Bed, cost: 3000 },
  { id: 'icu', name: 'Intensivstation', icon: HeartPulse, cost: 8000 },
  { id: 'or', name: 'Operationssaal', icon: Scissors, cost: 12000 },
  { id: 'lab', name: 'Labor', icon: FlaskConical, cost: 6000 },
  { id: 'radiology', name: 'Radiologie', icon: Scan, cost: 10000 },
  { id: 'pharmacy', name: 'Apotheke', icon: Pill, cost: 4000 },
  { id: 'rehab', name: 'Rehabilitationszentrum', icon: Dumbbell, cost: 4500 },
]

export default function HospitalCreate() {
  const { user, updateUser, addMoney } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    city: 'Berlin',
    specialty: 'general',
    theme: 'modern',
    description: '',
    isPublic: true,
    maxMembers: 20,
    autoAccept: true,
    minLevel: 0,
    allowVisitors: true,
    startingRooms: [],
    motto: '',
    difficultyPreference: 'mixed',
    language: 'de',
  })

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const toggleRoom = (id) => {
    setForm(p => ({
      ...p,
      startingRooms: p.startingRooms.includes(id)
        ? p.startingRooms.filter(r => r !== id)
        : [...p.startingRooms, id]
    }))
  }

  const totalCost = form.startingRooms.reduce((sum, id) => {
    const room = STARTING_ROOMS.find(r => r.id === id)
    return sum + (room?.cost || 0)
  }, 0)

  const canAfford = (user?.wallet || 0) >= totalCost
  const isValid = form.name.trim().length >= 3

  const [submitError, setSubmitError] = useState('')

  const createHospital = async () => {
    if (!isValid || !canAfford) return
    setSubmitError('')
    const hospitalId = 'h_' + Date.now()
    const normalizedStartingRooms = form.startingRooms.includes('er') && !form.startingRooms.includes('waiting_room')
      ? [...form.startingRooms, 'waiting_room']
      : form.startingRooms
    const ownedHospital = {
      id: hospitalId,
      ...form,
      startingRooms: normalizedStartingRooms,
      level: 1,
      reputation: 0,
      balance: 0,
      members: 1,
      createdAt: new Date().toISOString(),
    }
    const userName = user?.name || 'Unbekannt'
    const initialHospitalState = {
      id: hospitalId,
      name: form.name,
      ownerId: user?.id || null,
      balance: 0,
      rooms: normalizedStartingRooms.map(rId => ({ id: rId, level: 1, condition: 100, patients: [] })),
      treatmentRooms: [],
      members: [
        {
          userId: user?.id || null,
          name: userName,
          role: 'owner',
          rank: user?.title || 'Assistenzarzt/-ärztin',
          permissions: {
            manage_hospital: true,
            manage_rooms: true,
            manage_staff: true,
            manage_members: true,
            manage_permissions: true,
            manage_finances: true,
            treat_patients: true,
          },
          joinedAt: new Date().toISOString(),
        },
      ],
      workers: [],
      patients: [],
      waitingRoom: [],
      settings: ownedHospital,
      activityLog: [],
      dailyCosts: 0,
      dailyIncome: 0,
      isClosed: false,
      closedAt: null,
      closureFines: 0,
      activeEvent: null,
    }
    const { error: hospitalError } = await upsertHospitalState(initialHospitalState)
    if (hospitalError) {
      setSubmitError(hospitalError.message || 'Krankenhaus konnte nicht erstellt werden.')
      return
    }
    await createHospitalMembership(hospitalId, user, 'owner', initialHospitalState.members[0].permissions)
    await addMoney(-totalCost)
    await updateUser({
      hospitalId,
      hospitalName: form.name,
      ownedHospital,
    })
    navigate('/hospital')
  }

  const steps = [
    { label: 'Grundlagen', icon: Building2 },
    { label: 'Standort & Stil', icon: MapPin },
    { label: 'Einstellungen', icon: Settings },
    { label: 'Ausstattung', icon: Bed },
    { label: 'Bestätigung', icon: Check },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/hospital-choice')} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Auswahl
      </button>

      <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">Krankenhaus gründen</h1>
      <p className="text-surface-500 mb-8">Gestalte dein eigenes Krankenhaus genau nach deinen Vorstellungen</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => i <= step && setStep(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              i === step ? 'bg-primary-600 text-white' :
              i < step ? 'bg-accent-50 text-accent-700' :
              'bg-surface-100 text-surface-400'
            }`}
          >
            {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Name des Krankenhauses *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="input-field"
              placeholder="z.B. Universitätsklinikum Sonnenberg"
              maxLength={50}
            />
            <p className="text-xs text-surface-400 mt-1">{form.name.length}/50 Zeichen (mind. 3)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Motto / Slogan</label>
            <input
              type="text"
              value={form.motto}
              onChange={(e) => update('motto', e.target.value)}
              className="input-field"
              placeholder="z.B. Exzellenz in der Patientenversorgung"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="input-field min-h-[100px] resize-y"
              placeholder="Beschreibe dein Krankenhaus, seine Philosophie und was es besonders macht..."
              maxLength={500}
            />
            <p className="text-xs text-surface-400 mt-1">{form.description.length}/500 Zeichen</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-3">Schwerpunkt / Fachrichtung</label>
            <div className="grid grid-cols-2 gap-3">
              {SPECIALTIES.map(spec => (
                <button
                  key={spec.id}
                  onClick={() => update('specialty', spec.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.specialty === spec.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <spec.icon className={`w-4 h-4 ${form.specialty === spec.id ? 'text-primary-600' : 'text-surface-400'}`} />
                    <span className={`text-sm font-medium ${form.specialty === spec.id ? 'text-primary-700' : 'text-surface-700'}`}>{spec.name}</span>
                  </div>
                  <p className="text-xs text-surface-500">{spec.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!isValid}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Location & Theme */}
      {step === 1 && (
        <div className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Standort</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => update('city', city)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.city === city ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-3">Klinik-Stil</label>
            <div className="grid grid-cols-2 gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => update('theme', theme.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.theme === theme.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.color} flex items-center justify-center mb-3`}>
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-medium text-surface-900">{theme.name}</h4>
                  <p className="text-xs text-surface-500">{theme.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Bevorzugter Schwierigkeitsgrad</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Einfach', desc: 'Viele Hilfen' },
                { id: 'mixed', label: 'Gemischt', desc: 'Für alle Stufen' },
                { id: 'hard', label: 'Anspruchsvoll', desc: 'Wenig Hilfe' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => update('difficultyPreference', d.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.difficultyPreference === d.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <p className="font-medium text-sm text-surface-900">{d.label}</p>
                  <p className="text-xs text-surface-500">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Zurück</button>
            <button onClick={() => setStep(2)} className="btn-primary flex-1">Weiter <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Step 2: Settings */}
      {step === 2 && (
        <div className="card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-900">Öffentliches Krankenhaus</p>
              <p className="text-sm text-surface-500">Spieler können dein Krankenhaus finden und beitreten</p>
            </div>
            <button
              onClick={() => update('isPublic', !form.isPublic)}
              className={`w-12 h-7 rounded-full transition-colors relative ${form.isPublic ? 'bg-primary-600' : 'bg-surface-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isPublic ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-900">Automatische Aufnahme</p>
              <p className="text-sm text-surface-500">Neue Mitglieder werden ohne Bewerbung aufgenommen</p>
            </div>
            <button
              onClick={() => update('autoAccept', !form.autoAccept)}
              className={`w-12 h-7 rounded-full transition-colors relative ${form.autoAccept ? 'bg-primary-600' : 'bg-surface-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${form.autoAccept ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-900">Besucher erlauben</p>
              <p className="text-sm text-surface-500">Nicht-Mitglieder können dein Krankenhaus besuchen</p>
            </div>
            <button
              onClick={() => update('allowVisitors', !form.allowVisitors)}
              className={`w-12 h-7 rounded-full transition-colors relative ${form.allowVisitors ? 'bg-primary-600' : 'bg-surface-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${form.allowVisitors ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Maximale Mitglieder: {form.maxMembers}</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={form.maxMembers}
              onChange={(e) => update('maxMembers', parseInt(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-surface-400"><span>5</span><span>100</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Mindest-Stufe zum Beitreten: {form.minLevel}</label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={form.minLevel}
              onChange={(e) => update('minLevel', parseInt(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-surface-400"><span>0 (Alle)</span><span>20</span></div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Zurück</button>
            <button onClick={() => setStep(3)} className="btn-primary flex-1">Weiter <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Step 3: Rooms */}
      {step === 3 && (
        <div className="card p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-surface-900">Starträume auswählen</h3>
              <span className={`text-sm font-medium ${canAfford ? 'text-accent-600' : 'text-red-600'}`}>
                Kosten: {totalCost.toLocaleString('de-DE')}€
              </span>
            </div>
            <p className="text-sm text-surface-500 mb-1">Wähle optional Starträume für dein Krankenhaus (auch ohne Startstationen möglich).</p>
            <p className="text-sm text-surface-500">Dein Guthaben: <span className="font-semibold">{(user?.wallet || 0).toLocaleString('de-DE')}€</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {STARTING_ROOMS.map(room => {
              const selected = form.startingRooms.includes(room.id)
              const RoomIcon = room.icon
              return (
                <button
                  key={room.id}
                  onClick={() => toggleRoom(room.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selected ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500'
                    }`}>
                      <RoomIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 text-sm">{room.name}</p>
                      <p className="text-xs text-surface-500">{room.cost.toLocaleString('de-DE')}€</p>
                    </div>
                    {selected && <Check className="w-5 h-5 text-primary-600" />}
                  </div>
                </button>
              )
            })}
          </div>

          {!canAfford && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">Nicht genügend Guthaben. Besuche den Shop, um Geld aufzuladen, oder wähle weniger Räume.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Zurück</button>
            <button onClick={() => setStep(4)} className="btn-primary flex-1">
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="card p-8 space-y-6">
          <h3 className="font-semibold text-surface-900 text-lg">Zusammenfassung</h3>
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{submitError}</div>
          )}

          <div className="bg-surface-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Name</span>
              <span className="font-medium text-surface-900">{form.name || '—'}</span>
            </div>
            {form.motto && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Motto</span>
                <span className="font-medium text-surface-900">{form.motto}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Standort</span>
              <span className="font-medium text-surface-900">{form.city}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Fachrichtung</span>
              <span className="font-medium text-surface-900">{SPECIALTIES.find(s => s.id === form.specialty)?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Stil</span>
              <span className="font-medium text-surface-900">{THEMES.find(t => t.id === form.theme)?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Sichtbarkeit</span>
              <span className="font-medium text-surface-900">{form.isPublic ? 'Öffentlich' : 'Privat'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Max. Mitglieder</span>
              <span className="font-medium text-surface-900">{form.maxMembers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Starträume</span>
              <span className="font-medium text-surface-900">{form.startingRooms.length} Räume</span>
            </div>
            <div className="border-t border-surface-200 pt-3 flex justify-between text-sm">
              <span className="font-semibold text-surface-700">Gesamtkosten</span>
              <span className="font-bold text-primary-600">{totalCost.toLocaleString('de-DE')}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Dein Guthaben danach</span>
              <span className={`font-medium ${canAfford ? 'text-accent-600' : 'text-red-600'}`}>
                {((user?.wallet || 0) - totalCost).toLocaleString('de-DE')}€
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Zurück</button>
            <button
              onClick={createHospital}
              disabled={!isValid || !canAfford}
              className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-4 h-4" /> Krankenhaus gründen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
