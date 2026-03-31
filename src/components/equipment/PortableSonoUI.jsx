import { useMemo, useState } from 'react'
import { Search, CheckCircle2, AlertTriangle } from 'lucide-react'
import examChestAsset from '../../assets/exam/front-male.png'
import sonoProbeAsset from '../../assets/exam/sono-probe.svg'

const PROBE_POINTS = [
  { id: 'thorax_left', label: 'Thorax links', x: 33, y: 34 },
  { id: 'thorax_right', label: 'Thorax rechts', x: 67, y: 34 },
  { id: 'heart', label: 'Herzfenster', x: 50, y: 43 },
  { id: 'ruq', label: 'RUQ', x: 60, y: 58 },
  { id: 'luq', label: 'LUQ', x: 40, y: 58 },
  { id: 'pelvis', label: 'Becken', x: 50, y: 75 },
]

function deriveSonoResult(patient, pointId, pointLabel) {
  const code = String(patient?.trueDiagnoses?.primary?.code || patient?.diagnoses?.primary?.code || '').toUpperCase()
  const diagnosisName = String(patient?.trueDiagnoses?.primary?.name || patient?.diagnoses?.primary?.name || '').toLowerCase()
  const complaint = String(patient?.chiefComplaint || '').toLowerCase()
  const symptoms = (patient?.symptoms || []).join(' ').toLowerCase()
  const text = `${complaint} ${symptoms} ${diagnosisName}`
  const hasDyspnea = /dyspnoe|atemnot|kurzatmig|zunehmende luftnot/.test(text)
  const hasAbdominalPain = /bauch|abdomen|epigastr|flanke|append|kolik|unterbauch/.test(text)
  const hasCardioIssue = /^I/.test(code) || /herz|kardio|infarkt|acs|tachy/.test(text)
  const hasThoraxIssue = /thorax|pneumo|lunge|pleura|pneumon|emboli/.test(text)
  const traumaBleedingRisk = /^S(0[6-9]|1[0-9]|2[6-9]|3[0-9]|7[2-9]|8[0-9])/.test(code) || /polytrauma|sturz|unfall|blutung/.test(text)
  const hasPneumothorax = /^J93/.test(code) || /pneumothorax|spannungspneumo/.test(text)
  const hasPleuralEffusion = /^J9[0-2]/.test(code) || /pleuraerguss|erguss/.test(text)
  const hasPneumonia = /^J1[2-8]/.test(code) || /pneumonie/.test(text)
  const hasPulmEdema = /^I50/.test(code) || /lungenoedem|lungenödem|dekompensation/.test(text)
  const hasPericardEffusion = /^I3[01]/.test(code) || /perikard|tamponade/.test(text)
  const hasAneurysm = /^I71/.test(code) || /aortenaneurysma|dissektion/.test(text)
  const hasAppendicitis = /^K35/.test(code) || /appendiz/.test(text)
  const hasChole = /^K8[01]/.test(code) || /cholezyst|galle/.test(text)
  const hasUro = /^N(13|20|23)/.test(code) || /nierenkolik|hydroneph|harnstau/.test(text)
  const hasGynBleed = /^O0[0-2]/.test(code) || /extrauterin|ektop/.test(text)

  if ((pointId === 'thorax_left' || pointId === 'thorax_right') && (hasDyspnea || hasThoraxIssue || hasPneumothorax || hasPleuralEffusion || hasPneumonia || hasPulmEdema)) {
    if (hasPneumothorax) {
      return 'Pleural Sliding aufgehoben, Barcode-Zeichen im M-Mode; sonographischer Verdacht auf Pneumothorax.'
    }
    if (hasPleuralEffusion) {
      return 'Anechogene pleurale Flüssigkeit mit basal komprimierter Lunge; Pleuraerguss wahrscheinlich.'
    }
    if (hasPulmEdema) {
      return 'Beidseits multiple konfluierende B-Linien, passend zu interstitiellem/alveolärem Lungenödem.'
    }
    if (hasPneumonia) {
      return 'Subpleurale Konsolidierung mit fokalen B-Linien, vereinbar mit pneumonischem Infiltrat.'
    }
    return 'Pleuralinie unruhig, fokale B-Linien und reduzierte Gleitbewegung. Befund passend zur pulmonalen Beteiligung.'
  }
  if (pointId === 'heart' && (hasCardioIssue || hasPericardEffusion || hasAneurysm)) {
    if (hasPericardEffusion) {
      return 'Perikarderguss nachweisbar, hämodynamische Relevanz klinisch sofort korrelieren (Tamponadezeichen beachten).'
    }
    if (hasAneurysm) {
      return 'Hyperdynamik bei hämodynamischer Instabilität; fokussiertes Echo stützt kritisches kardiovaskuläres Geschehen.'
    }
    return 'Fokussiertes Echo: linksventrikuläre Pumpfunktion eingeschränkt, keine eindeutige Perikardtamponade.'
  }
  if ((pointId === 'ruq' || pointId === 'luq' || pointId === 'pelvis') && (hasAbdominalPain || traumaBleedingRisk || hasGynBleed || hasAneurysm)) {
    if (traumaBleedingRisk || hasGynBleed || hasAneurysm) {
      return 'FAST positiv: freie Flüssigkeit im abhängigen Bereich, intraabdominelle Blutung/Leckage möglich.'
    }
    if (pointId === 'ruq' && hasChole) {
      return 'Gallenblase mit Wandverdickung und Sludge/Konkrementen; Befund spricht für biliäre Genese.'
    }
    if ((pointId === 'ruq' || pointId === 'luq') && hasUro) {
      return 'Nierenbeckenkelchsystem leicht erweitert, vereinbar mit Harnabflussstörung/Kolikgeschehen.'
    }
    if (pointId === 'pelvis' && hasAppendicitis) {
      return 'Im rechten Unterbauch freie Reizflüssigkeit/perityphlitische Reaktion, appendizitischer Befund möglich.'
    }
    return 'FAST: geringe freie Flüssigkeit im abhängigen Bereich nachweisbar, klinische Korrelation empfohlen.'
  }
  if (pointId === 'pelvis' && !hasAbdominalPain) {
    return 'Beckenfenster ohne freie Flüssigkeit, Harnblase regelrecht gefüllt.'
  }
  return 'Kein akuter sonographischer Notfallbefund in diesem Fenster. Verlauf und Klinik weiter beachten.'
}

export default function PortableSonoUI({ patient, onAction }) {
  const [probePicked, setProbePicked] = useState(false)
  const [scanned, setScanned] = useState([])
  const [lastResult, setLastResult] = useState('')
  const [done, setDone] = useState(false)

  const progress = useMemo(() => Math.round((scanned.length / PROBE_POINTS.length) * 100), [scanned.length])

  const handlePointScan = (point) => {
    if (!probePicked || done) return
    const already = scanned.includes(point.id)
    if (!already) setScanned(prev => [...prev, point.id])
    const result = deriveSonoResult(patient, point.id, point.label)
    setLastResult(`${point.label}: ${result}`)
    onAction?.('portable_sono_scan', `Mobiles Sono: ${point.label} untersucht`, 2, 8, { zone: point.id, summary: result })
  }

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Mobiles Sono - Fokus-Check
        </p>
        <p className="text-[11px] text-indigo-800 mt-1">
          Sondenkopf aufnehmen, Fenster anklicken und Befund orientierend dokumentieren.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_170px] gap-3">
        <div className="rounded-2xl border border-surface-200 bg-white p-3">
          <div className="relative mx-auto w-full max-w-[440px] aspect-[3/4] rounded-xl border border-surface-200 overflow-hidden bg-surface-50">
            <img src={examChestAsset} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            {PROBE_POINTS.map((point) => {
              const isDone = scanned.includes(point.id)
              return (
                <button
                  key={point.id}
                  onClick={() => handlePointScan(point)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 w-7 h-7 text-[10px] font-bold transition ${
                    isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white/85 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={point.label}
                >
                  {isDone ? 'OK' : 'US'}
                </button>
              )
            })}
          </div>
          {lastResult && (
            <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-2.5">
              <p className="text-xs text-surface-700">{lastResult}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-3 space-y-2">
          <button
            onClick={() => setProbePicked(v => !v)}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold ${
              probePicked ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
            }`}
          >
            {probePicked ? 'Sonde ablegen' : 'Sonde aufnehmen'}
          </button>
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-2 flex items-center justify-center">
            <img src={sonoProbeAsset} alt="" className={`h-20 w-auto transition-transform ${probePicked ? 'scale-110' : 'scale-100'}`} />
          </div>
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-2">
            <p className="text-[11px] text-surface-600 mb-1">Fortschritt</p>
            <div className="h-2 rounded bg-surface-200 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-surface-700 mt-1">{progress}%</p>
          </div>
          <button
            onClick={() => setDone(true)}
            disabled={progress < 100}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-surface-200 disabled:text-surface-500"
          >
            Untersuchung abschließen
          </button>
          {done && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sono-Dokumentation vollständig.
            </p>
          )}
          {!done && progress < 100 && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Alle Sono-Fenster untersuchen, dann abschließen.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
