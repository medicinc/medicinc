import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Stethoscope, Brain, Heart, Building2, Users,
  Zap, Shield, BookOpen, ArrowRight, Star, ChevronRight, Trophy,
  Microscope, Syringe, Monitor, TrendingUp, X, Mail, UserRound, CheckCircle2, CalendarDays, Wrench, Rocket, Flag
} from 'lucide-react'

const features = [
  {
    icon: Stethoscope,
    title: 'Realistische Patientenfälle',
    description: 'Behandle virtuelle Patient*innen mit authentischen Symptomen, Laborergebnissen und Bildgebung aus verschiedenen Fachbereichen.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Microscope,
    title: 'Umfangreiche Diagnostik',
    description: 'Ordne Laboruntersuchungen, Bildgebung und Spezialtests an. Interpretiere die Ergebnisse und stelle die klinische Diagnose.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: TrendingUp,
    title: 'Dynamische Verläufe',
    description: 'Patientenzustände entwickeln sich in Echtzeit. Bewältige Komplikationen, überwache Vitalzeichen und passe deinen Behandlungsplan an.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Zap,
    title: 'Anpassbarer Schwierigkeitsgrad',
    description: 'Vom geführten Anfängermodus bis zur vollen Experten-Autonomie. Die Simulation passt sich deinem Wissensstand an.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Building2,
    title: 'Krankenhausverwaltung',
    description: 'Baue und verwalte dein eigenes Krankenhaus. Füge Abteilungen hinzu, manage Finanzen und erweitere dein Klinikimperium.',
    color: 'from-rose-500 to-rose-600',
  },
  {
    icon: Users,
    title: 'Zusammenarbeit',
    description: 'Arbeite mit anderen Ärzt*innen in gemeinsamen Krankenhäusern. Konsultiere Fachärzt*innen und bilde ein medizinisches Team.',
    color: 'from-cyan-500 to-cyan-600',
  },
]

const stats = [
  { value: 'ALPHA', label: 'Release-Status' },
  { value: 'SIM', label: 'Hybrid Fokus' },
  { value: '16+', label: 'Zielgruppe' },
  { value: 'WIP', label: 'Aktive Entwicklung', icon: Star },
]

const specialties = [
  { name: 'Kardiologie', icon: Heart, cases: 85, color: 'bg-red-50 text-red-600' },
  { name: 'Neurologie', icon: Brain, cases: 72, color: 'bg-purple-50 text-purple-600' },
  { name: 'Notfallmedizin', icon: Syringe, cases: 120, color: 'bg-orange-50 text-orange-600' },
  { name: 'Chirurgie', icon: Monitor, cases: 64, color: 'bg-blue-50 text-blue-600' },
]

export default function Landing() {
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [waitlistForm, setWaitlistForm] = useState({
    name: '',
    email: '',
    role: '',
    platform: '',
    note: '',
    alphaConsent: false,
    updateConsent: false,
  })

  const submitWaitlist = (event) => {
    event.preventDefault()
    if (!waitlistForm.name.trim() || !waitlistForm.email.trim() || !waitlistForm.alphaConsent) return
    setWaitlistDone(true)
    setTimeout(() => {
      setWaitlistOpen(false)
      setWaitlistDone(false)
      setWaitlistForm({
        name: '',
        email: '',
        role: '',
        platform: '',
        note: '',
        alphaConsent: false,
        updateConsent: false,
      })
    }, 1300)
  }

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[78vh] sm:min-h-[92vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full text-sm font-medium text-primary-700 mb-4">
                <Activity className="w-4 h-4" />
                Medizinische Simulation – Alpha Release in Vorbereitung
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-surface-900 leading-[1.1]">
                Klinik. Rettungsdienst. Management.
                <span className="gradient-text block mt-1">Drei Rollen, eine Simulation.</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed max-w-lg">
                Von realistischen Patientenfällen über Rettungsdiensteinsätze bis zur
                strategischen Krankenhausführung: Du entscheidest, welchen Karrierepfad
                du spielst und wie schnell du aufsteigst.
              </p>

              <div className="mt-6 max-w-2xl rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Hinweis (Alpha/WIP)</p>
                <p className="mt-1">
                  Dieses Projekt ist im Alpha-Status. Inhalte können sich ändern.
                  Keine reale medizinische Beratung, kein Medizinprodukt, kein klinischer Echtbetrieb.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button onClick={() => setWaitlistOpen(true)} className="btn-primary text-lg !px-8 !py-4">
                  Für Alpha vormerken
                  <ArrowRight className="w-5 h-5" />
                </button>
                <Link to="/login" className="btn-secondary text-lg !px-8 !py-4">
                  Login / Zugang
                </Link>
                <Link to="/cases" className="text-primary-700 font-medium inline-flex items-center gap-1 hover:text-primary-800">
                  Mehr sehen <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="flex items-center gap-1">
                      <span className="font-display text-2xl font-bold text-surface-900">{stat.value}</span>
                      {stat.icon && <stat.icon className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-sm text-surface-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative">
                <div className="card p-6 animate-float">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                      <Heart className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">Thomas M., 58</h3>
                      <p className="text-sm text-surface-500">Akuter Brustschmerz</p>
                    </div>
                    <span className="ml-auto px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full">DRINGEND</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-surface-500">HF</p>
                      <p className="font-bold text-surface-900">102 <span className="text-xs font-normal text-red-500">bpm</span></p>
                    </div>
                    <div className="bg-surface-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-surface-500">RR</p>
                      <p className="font-bold text-surface-900">158/94</p>
                    </div>
                    <div className="bg-surface-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-surface-500">SpO2</p>
                      <p className="font-bold text-surface-900">94<span className="text-xs font-normal text-amber-500">%</span></p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg">EKG anfordern</button>
                    <button className="flex-1 py-2 bg-surface-100 text-surface-700 text-sm font-medium rounded-lg">Laborwerte</button>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 card px-4 py-3 flex items-center gap-3 animate-pulse-slow">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Erfolg</p>
                    <p className="text-sm font-semibold text-surface-900">Erste Diagnose!</p>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 card px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Erfolgsrate</p>
                    <p className="text-sm font-semibold text-accent-600">89% Genauigkeit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">Roadmap</p>
              <h3 className="font-display text-2xl font-bold text-surface-900 mb-4">Geplanter Alpha-Zeitplan</h3>
              <div className="relative mt-2">
                <div className="absolute left-[18px] top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-primary-300 via-violet-300 to-emerald-300" />
                <div className="space-y-4">
                  {[
                    {
                      title: 'Phase 1 • Alpha Launch',
                      date: '18.04.',
                      icon: CalendarDays,
                      color: 'bg-primary-600',
                      text: 'Start der Alpha mit Kernsystemen für Klinik, Rettungsdienst, Progression und Wirtschaft.',
                    },
                    {
                      title: 'Phase 2 • Stabilisierung',
                      date: 'ca. 1 Monat',
                      icon: Wrench,
                      color: 'bg-violet-600',
                      text: 'Bugfixes, Polishing, UX-Feinschliff und kleine Ergänzungen auf Basis von Feedback.',
                    },
                    {
                      title: 'Phase 3 • Beta Release',
                      date: 'danach',
                      icon: Rocket,
                      color: 'bg-amber-600',
                      text: 'Großes Feature-Update: vollständiges OP-System, Psych-System, mehr RD-Grafiken/Möglichkeiten, deutlich mehr Fälle und Patienten.',
                    },
                    {
                      title: 'Phase 4 • Full Release',
                      date: 'Ziel: Mitte 2026',
                      icon: Flag,
                      color: 'bg-emerald-600',
                      text: 'Vollständiger Release mit finalem Content-Umfang, Grafik-Overhauls und ausgereiftem Gesamtspiel.',
                    },
                  ].map((phase) => (
                    <div key={phase.title} className="relative pl-12">
                      <div className={`absolute left-0 top-1 w-9 h-9 rounded-full ${phase.color} text-white flex items-center justify-center shadow-md`}>
                        <phase.icon className="w-4 h-4" />
                      </div>
                      <div className="rounded-xl border border-surface-200 bg-white/90 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-surface-900">{phase.title}</p>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-surface-100 text-surface-600 font-medium">{phase.date}</span>
                        </div>
                        <p className="text-xs text-surface-600 mt-1.5">{phase.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card p-6">
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-2">Changelog</p>
              <h3 className="font-display text-2xl font-bold text-surface-900 mb-4">Wird zum Alpha-Start gefüllt</h3>
              <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 px-4 py-5 text-sm text-surface-600">
                Die ersten Changelog-Einträge folgen direkt nach dem Alpha-Release.
                Danach erhältst du hier versionierte Updates mit Datum und Highlights.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Top Features</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-surface-900">
              Was dich im Alpha erwartet
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Feature-first und praxisnah: klinische Entscheidungen, Teamarbeit und strategischer Ausbau.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group card p-8 hover:border-primary-200 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-surface-900 mb-3">{feature.title}</h3>
                <p className="text-surface-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Fachbereiche</p>
              <h2 className="font-display text-4xl font-bold text-surface-900 mb-6">
                Fachbereiche auf einen Blick
              </h2>
              <p className="text-lg text-surface-500 mb-8">
                Von Kardiologie bis Notfallmedizin: jeder Bereich bringt eigene Dynamik, Entscheidungen und Lernkurven.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {specialties.map((spec) => (
                  <div key={spec.name} className="card p-4 flex items-center gap-3 hover:border-primary-200 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${spec.color} flex items-center justify-center`}>
                      <spec.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{spec.name}</p>
                      <p className="text-xs text-surface-500">{spec.cases} Fälle</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/cases" className="inline-flex items-center gap-2 mt-8 text-primary-600 font-medium hover:text-primary-700 transition-colors">
                Alle Fachbereiche ansehen <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <h3 className="text-white font-semibold">Fallvorschau: Akuter Schlaganfall</h3>
                  <p className="text-primary-200 text-sm">Neurologie &bull; Fortgeschritten</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1">Patient*in</p>
                    <p className="text-surface-900">Maria S., 72W — Plötzliche rechtsseitige Schwäche</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1">Kernbefunde</p>
                    <div className="flex flex-wrap gap-2">
                      {['Hemiparese rechts', 'Dysarthrie', 'Faziale Parese', 'NIHSS 14'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1">Zeitdruck</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-amber-400 to-red-500 rounded-full" />
                      </div>
                      <span className="text-xs font-medium text-red-600">Zeitfenster schließt</span>
                    </div>
                  </div>
                  <button className="w-full btn-primary !py-2.5">
                    <Stethoscope className="w-4 h-4" /> Fall starten
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
            Bereit für den Alpha-Start?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Zugriff aktuell nur zu internen Demonstrations- und Entwicklungszwecken.
            Inhalte und Funktionsumfang sind vorläufig und können sich jederzeit ändern.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => setWaitlistOpen(true)} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors shadow-xl text-lg">
              Auf Warteliste eintragen <ArrowRight className="w-5 h-5" />
            </button>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500/30 text-white border border-white/20 font-semibold rounded-xl hover:bg-primary-500/50 transition-colors text-lg">
              <BookOpen className="w-5 h-5" /> Zum Login
            </Link>
          </div>
        </div>
      </section>

      {waitlistOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm" onClick={() => setWaitlistOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-bold text-surface-900">Alpha-Warteliste</h3>
              <button onClick={() => setWaitlistOpen(false)} className="p-2 rounded-lg hover:bg-surface-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!waitlistDone ? (
              <form onSubmit={submitWaitlist} className="space-y-3">
                <p className="text-sm text-surface-600">
                  Trag dich ein und erhalte zum Alpha-Release Zugriffsinfos und Updates.
                </p>
                <div>
                  <label className="text-xs font-medium text-surface-600">Name</label>
                  <div className="relative mt-1">
                    <UserRound className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="input-field !pl-9"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Dein Vor- und Nachname"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-600">E-Mail</label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      className="input-field !pl-9"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@beispiel.de"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-600">Rolle / Interesse (optional)</label>
                  <input
                    className="input-field mt-1"
                    value={waitlistForm.role}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, role: e.target.value }))}
                    placeholder="z. B. Medizinstudium / Rettungsdienst"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-600">Gerät / Plattform (optional)</label>
                  <input
                    className="input-field mt-1"
                    value={waitlistForm.platform}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, platform: e.target.value }))}
                    placeholder="z. B. Windows Desktop"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-600">Kurze Notiz (optional)</label>
                  <textarea
                    className="input-field mt-1 min-h-[90px]"
                    value={waitlistForm.note}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Was interessiert dich am meisten?"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-surface-600">
                  <input
                    type="checkbox"
                    checked={waitlistForm.alphaConsent}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, alphaConsent: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>Ich möchte per E-Mail über den Alpha-Start informiert werden.</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-surface-600">
                  <input
                    type="checkbox"
                    checked={waitlistForm.updateConsent}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, updateConsent: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>Ich möchte gelegentlich Produkt-Updates und Dev-Logs erhalten.</span>
                </label>
                <p className="text-xs text-surface-500">
                  Hinweis: Die Warteliste ist unverbindlich. Kein Kauf, keine Zahlung. Details in Datenschutz und Nutzungsbedingungen.
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setWaitlistOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
                  <button type="submit" className="btn-primary flex-1">Unverbindlich vormerken</button>
                </div>
              </form>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-3" />
                <p className="font-semibold text-surface-900">Du bist auf der Warteliste</p>
                <p className="text-sm text-surface-500 mt-1">Danke! Wir melden uns zum Alpha-Release mit den nächsten Schritten.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
