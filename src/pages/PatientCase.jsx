import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SAMPLE_CASES } from '../data/sampleCases'
import {
  Heart, Thermometer, Wind, Droplets, Activity, Clock, AlertTriangle,
  Stethoscope, FlaskConical, Scan, ChevronDown, ChevronUp, Check,
  X, ArrowLeft, Zap, Brain, Eye, Pill, Syringe, FileText,
  ClipboardList, ShieldCheck, ArrowRight, Timer, CircleDot
} from 'lucide-react'

function VitalCard({ icon: Icon, label, value, unit, status }) {
  const statusColor = status === 'critical' ? 'text-red-600 bg-red-50 border-red-200' :
    status === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-surface-900 bg-white border-surface-200'

  return (
    <div className={`rounded-xl border p-3 text-center ${statusColor}`}>
      <Icon className="w-4 h-4 mx-auto mb-1 opacity-60" />
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-bold">{value} <span className="text-xs font-normal">{unit}</span></p>
    </div>
  )
}

export default function PatientCase() {
  const { id } = useParams()
  const navigate = useNavigate()
  const caseData = SAMPLE_CASES.find(c => c.id === id)

  const [timeLeft, setTimeLeft] = useState(caseData?.timeLimit || 1800)
  const [activeTab, setActiveTab] = useState('overview')
  const [orderedTests, setOrderedTests] = useState([])
  const [completedTests, setCompletedTests] = useState({})
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('')
  const [selectedTreatments, setSelectedTreatments] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [expandedExam, setExpandedExam] = useState(null)

  useEffect(() => {
    if (showResults || !caseData) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showResults, caseData])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const orderTest = (test) => {
    if (orderedTests.includes(test.id)) return
    setOrderedTests(prev => [...prev, test.id])
    setTimeout(() => {
      setCompletedTests(prev => ({ ...prev, [test.id]: true }))
    }, test.time * 100)
  }

  const toggleTreatment = (treatmentId) => {
    setSelectedTreatments(prev =>
      prev.includes(treatmentId)
        ? prev.filter(t => t !== treatmentId)
        : [...prev, treatmentId]
    )
  }

  const submitCase = () => {
    setShowResults(true)
  }

  const score = useMemo(() => {
    if (!caseData || !showResults) return null
    const correctDiag = selectedDiagnosis === caseData.correctDiagnosis
    const correctTreats = caseData.treatments.filter(t => t.correct)
    const wrongTreats = caseData.treatments.filter(t => !t.correct)
    const selectedCorrect = selectedTreatments.filter(id => correctTreats.some(t => t.id === id)).length
    const selectedWrong = selectedTreatments.filter(id => wrongTreats.some(t => t.id === id)).length
    const treatmentScore = Math.max(0, (selectedCorrect / correctTreats.length) * 100 - (selectedWrong * 15))
    const diagScore = correctDiag ? 100 : 0
    const timeBonus = timeLeft > 0 ? Math.floor((timeLeft / caseData.timeLimit) * 20) : 0
    const total = Math.round((diagScore * 0.4 + treatmentScore * 0.5 + timeBonus * 0.1))
    const xp = Math.round((total / 100) * caseData.xpReward)
    return { diagScore, treatmentScore: Math.round(treatmentScore), timeBonus, total, xp, correctDiag }
  }, [showResults, selectedDiagnosis, selectedTreatments, caseData, timeLeft])

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-surface-900">Fall nicht gefunden</h2>
        <button onClick={() => navigate('/cases')} className="btn-primary mt-4">Zurück zu den Fällen</button>
      </div>
    )
  }

  const { patient, vitals, physicalExam } = caseData
  const timePercent = (timeLeft / caseData.timeLimit) * 100

  const examLabels = {
    general: 'Allgemeinzustand',
    cardiovascular: 'Kardiovaskulär',
    respiratory: 'Respiratorisch',
    abdomen: 'Abdomen',
    extremities: 'Extremitäten',
    neurological: 'Neurologisch',
  }

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: FileText },
    { id: 'examine', label: 'Untersuchung', icon: Stethoscope },
    { id: 'diagnostics', label: 'Diagnostik', icon: FlaskConical },
    { id: 'diagnose', label: 'Diagnose', icon: Brain },
    { id: 'treat', label: 'Therapie', icon: Syringe },
  ]

  if (showResults && score) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="card overflow-hidden">
          <div className={`p-8 text-center ${score.total >= 70 ? 'bg-gradient-to-br from-accent-500 to-accent-600' : score.total >= 40 ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              {score.total >= 70 ? <ShieldCheck className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            <h2 className="font-display text-3xl font-bold mb-1">
              {score.total >= 70 ? 'Hervorragende Arbeit!' : score.total >= 40 ? 'Guter Versuch' : 'Verbesserung nötig'}
            </h2>
            <p className="text-white/80">Fall: {caseData.title}</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-surface-900">{score.total}%</p>
                <p className="text-sm text-surface-500">Gesamtpunktzahl</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">+{score.xp}</p>
                <p className="text-sm text-surface-500">EP verdient</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-surface-900">{formatTime(caseData.timeLimit - timeLeft)}</p>
                <p className="text-sm text-surface-500">Benötigte Zeit</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-surface-700">Diagnose</span>
                  <span className={`text-sm font-medium ${score.correctDiag ? 'text-accent-600' : 'text-red-600'}`}>
                    {score.correctDiag ? 'Richtig' : 'Falsch'}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${score.correctDiag ? 'bg-accent-500' : 'bg-red-500'}`} style={{ width: `${score.diagScore}%` }} />
                </div>
                {!score.correctDiag && (
                  <p className="text-sm text-surface-500 mt-1">Richtig wäre: {caseData.correctDiagnosis}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-surface-700">Behandlungsplan</span>
                  <span className="text-sm font-medium text-surface-600">{score.treatmentScore}%</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${score.treatmentScore}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-surface-700">Zeitbonus</span>
                  <span className="text-sm font-medium text-surface-600">+{score.timeBonus}%</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${score.timeBonus * 5}%` }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/cases')} className="btn-secondary flex-1">Zurück zu den Fällen</button>
              <button onClick={() => window.location.reload()} className="btn-primary flex-1">
                Fall wiederholen <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/cases')} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-surface-500" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-surface-900">{caseData.title}</h1>
            <p className="text-sm text-surface-500">{patient.name}, {patient.age}{patient.gender[0]} &bull; {caseData.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${
            timePercent > 50 ? 'bg-surface-100 text-surface-700' :
            timePercent > 20 ? 'bg-amber-50 text-amber-700' :
            'bg-red-50 text-red-700 animate-pulse'
          }`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <button onClick={submitCase} className="btn-accent text-sm">
            Fall abgeben <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vitalzeichen */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        <VitalCard icon={Heart} label="Herzfrequenz" value={vitals.heartRate} unit="bpm" status={vitals.heartRate > 100 ? 'warning' : 'normal'} />
        <VitalCard icon={Activity} label="Blutdruck" value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`} unit="mmHg" status={vitals.bloodPressure.systolic > 140 ? 'warning' : 'normal'} />
        <VitalCard icon={Wind} label="Atemfrequenz" value={vitals.respiratoryRate} unit="/min" status={vitals.respiratoryRate > 20 ? 'warning' : 'normal'} />
        <VitalCard icon={Thermometer} label="Temperatur" value={vitals.temperature} unit="°C" status={vitals.temperature > 38 ? 'warning' : 'normal'} />
        <VitalCard icon={Droplets} label="SpO2" value={vitals.oxygenSaturation} unit="%" status={vitals.oxygenSaturation < 95 ? 'critical' : 'normal'} />
        <VitalCard icon={AlertTriangle} label="Schmerz" value={vitals.painLevel} unit="/10" status={vitals.painLevel >= 7 ? 'critical' : vitals.painLevel >= 4 ? 'warning' : 'normal'} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-200 mb-6 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-600" /> Patienteninformationen
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">Name:</span> <span className="font-medium">{patient.name}</span></div>
              <div><span className="text-surface-500">Alter:</span> <span className="font-medium">{patient.age} Jahre</span></div>
              <div><span className="text-surface-500">Geschlecht:</span> <span className="font-medium">{patient.gender}</span></div>
              <div><span className="text-surface-500">Blutgruppe:</span> <span className="font-medium">{patient.bloodType}</span></div>
              <div><span className="text-surface-500">Gewicht:</span> <span className="font-medium">{patient.weight} kg</span></div>
              <div><span className="text-surface-500">Größe:</span> <span className="font-medium">{patient.height} cm</span></div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Hauptbeschwerde
            </h3>
            <p className="text-surface-700 mb-4">{patient.chiefComplaint}</p>
            <h4 className="text-sm font-medium text-surface-500 uppercase tracking-wider mb-2">Aktuelle Symptome</h4>
            <div className="flex flex-wrap gap-2">
              {patient.presentingSymptoms.map(s => (
                <span key={s} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4">Vorerkrankungen</h3>
            {patient.medicalHistory.length > 0 ? (
              <ul className="space-y-2">
                {patient.medicalHistory.map(h => (
                  <li key={h} className="flex items-center gap-2 text-sm text-surface-700">
                    <CircleDot className="w-3 h-3 text-surface-400 shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-surface-500">Keine relevanten Vorerkrankungen</p>}
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-4">Medikamente & Allergien</h3>
            <h4 className="text-sm font-medium text-surface-500 mb-2">Aktuelle Medikation</h4>
            {patient.medications.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {patient.medications.map(m => (
                  <span key={m} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">{m}</span>
                ))}
              </div>
            ) : <p className="text-sm text-surface-500 mb-4">Keine</p>}
            <h4 className="text-sm font-medium text-surface-500 mb-2">Allergien</h4>
            {patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map(a => (
                  <span key={a} className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">{a}</span>
                ))}
              </div>
            ) : <p className="text-sm text-surface-500">Keine bekannten Allergien</p>}
          </div>
        </div>
      )}

      {activeTab === 'examine' && (
        <div className="card divide-y divide-surface-100">
          {Object.entries(physicalExam).map(([key, value]) => (
            <div key={key}>
              <button
                onClick={() => setExpandedExam(expandedExam === key ? null : key)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-surface-900">{examLabels[key] || key}</span>
                </div>
                {expandedExam === key ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
              </button>
              {expandedExam === key && (
                <div className="px-6 py-4 bg-surface-50">
                  <p className="text-surface-700">{value}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-surface-900 mb-4">Verfügbare Untersuchungen</h3>
            <div className="space-y-2">
              {caseData.availableDiagnostics.map(test => {
                const ordered = orderedTests.includes(test.id)
                const completed = completedTests[test.id]
                return (
                  <div key={test.id} className={`card p-4 flex items-center gap-4 ${ordered ? 'border-primary-200 bg-primary-50/50' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      test.category === 'Labor' ? 'bg-purple-50 text-purple-600' :
                      test.category === 'Bildgebung' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {test.category === 'Labor' ? <FlaskConical className="w-5 h-5" /> :
                       test.category === 'Bildgebung' ? <Scan className="w-5 h-5" /> :
                       <Activity className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 text-sm">{test.name}</p>
                      <p className="text-xs text-surface-500">{test.category} &bull; ~{test.time} Min. &bull; {test.cost}€</p>
                    </div>
                    <button
                      onClick={() => orderTest(test)}
                      disabled={ordered}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        completed ? 'bg-accent-100 text-accent-700' :
                        ordered ? 'bg-primary-100 text-primary-700' :
                        'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {completed ? 'Ansehen' : ordered ? 'Ausstehend...' : 'Anordnen'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 mb-4">Ergebnisse</h3>
            {Object.keys(completedTests).length === 0 ? (
              <div className="card p-8 text-center">
                <FlaskConical className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                <p className="text-surface-500">Ordne Untersuchungen an, um Ergebnisse hier zu sehen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(completedTests).map(testId => {
                  const test = caseData.availableDiagnostics.find(t => t.id === testId)
                  const result = caseData.diagnosticResults[testId]
                  return (
                    <div key={testId} className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-accent-600" />
                        <h4 className="font-medium text-surface-900 text-sm">{test?.name}</h4>
                      </div>
                      <p className="text-sm text-surface-700 bg-surface-50 p-3 rounded-lg">{result}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diagnose' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-2">Diagnose auswählen</h3>
            <p className="text-sm text-surface-500 mb-6">Wähle basierend auf der Anamnese, Untersuchung und den Diagnoseergebnissen die wahrscheinlichste Diagnose aus.</p>
            <div className="space-y-2">
              {caseData.possibleDiagnoses.map(diag => (
                <button
                  key={diag}
                  onClick={() => setSelectedDiagnosis(diag)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedDiagnosis === diag
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedDiagnosis === diag ? 'border-primary-500' : 'border-surface-300'
                    }`}>
                      {selectedDiagnosis === diag && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                    </div>
                    <span className={`font-medium ${selectedDiagnosis === diag ? 'text-primary-700' : 'text-surface-700'}`}>
                      {diag}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'treat' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 mb-2">Behandlungsplan</h3>
            <p className="text-sm text-surface-500 mb-6">Wähle alle geeigneten Behandlungen für diesen Patienten aus. Wähle sorgfältig — falsche Behandlungen verringern deine Punktzahl.</p>
            <div className="space-y-2">
              {caseData.treatments.map(treat => (
                <button
                  key={treat.id}
                  onClick={() => toggleTreatment(treat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedTreatments.includes(treat.id)
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedTreatments.includes(treat.id) ? 'bg-accent-500' : 'border-2 border-surface-300'
                    }`}>
                      {selectedTreatments.includes(treat.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <span className={`font-medium ${selectedTreatments.includes(treat.id) ? 'text-accent-700' : 'text-surface-700'}`}>
                        {treat.name}
                      </span>
                      <span className="ml-2 text-xs text-surface-400 px-2 py-0.5 bg-surface-100 rounded">{treat.category}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
