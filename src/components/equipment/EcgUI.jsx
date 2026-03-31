import { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, Power, X, PenLine, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getHintCost } from '../../data/shopSpecials'

const LEADS = [
  { id: 'I', color: '#22c55e', group: 'Extremitäten' },
  { id: 'II', color: '#22c55e', group: 'Extremitäten' },
  { id: 'III', color: '#22c55e', group: 'Extremitäten' },
  { id: 'aVR', color: '#eab308', group: 'Goldberger' },
  { id: 'aVL', color: '#eab308', group: 'Goldberger' },
  { id: 'aVF', color: '#eab308', group: 'Goldberger' },
  { id: 'V1', color: '#ef4444', group: 'Brustwand' },
  { id: 'V2', color: '#ef4444', group: 'Brustwand' },
  { id: 'V3', color: '#ef4444', group: 'Brustwand' },
  { id: 'V4', color: '#f97316', group: 'Brustwand' },
  { id: 'V5', color: '#f97316', group: 'Brustwand' },
  { id: 'V6', color: '#f97316', group: 'Brustwand' },
]

const BASE_WAVE = {
  I:   [0,0,0,0,0,0,.3,.6,.3,0,0,0,0,-.3,0,8,-2.5,0,.3,0,0,0,0,0,.3,.8,1.5,1.8,1.5,.8,.3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  II:  [0,0,0,0,0,0,.5,1,.5,0,0,0,0,-.5,0,12,-4,0,.5,0,0,0,0,0,.5,1.5,2.5,2.5,2,1.5,.5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  III: [0,0,0,0,0,0,.2,.4,.2,0,0,0,0,-.2,0,4,-1.5,0,.2,0,0,0,0,0,.2,.7,1,1,.7,.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  aVR: [0,0,0,0,0,0,-.3,-.6,-.3,0,0,0,0,.3,0,-10,3,0,-.3,0,0,0,0,0,-.3,-.8,-1.2,-1.2,-.8,-.3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  aVL: [0,0,0,0,0,0,.2,.3,.2,0,0,0,0,-.2,0,4,-1.3,0,.2,0,0,0,0,0,.2,.5,.8,.8,.5,.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  aVF: [0,0,0,0,0,0,.4,.7,.4,0,0,0,0,-.4,0,8,-3,0,.4,0,0,0,0,0,.4,1.2,1.8,1.8,1.2,.4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V1:  [0,0,0,0,0,0,.1,.2,.1,0,0,0,0,-.1,0,-3,8,0,.1,0,0,0,0,0,.1,.3,.5,.5,.3,.1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V2:  [0,0,0,0,0,0,.1,.3,.1,0,0,0,0,-.1,0,-2,10,0,.2,0,0,0,0,0,.2,.5,.8,.8,.5,.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V3:  [0,0,0,0,0,0,.3,.5,.3,0,0,0,0,-.2,0,2,7,0,.3,0,0,0,0,0,.3,.8,1.3,1.3,.8,.3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V4:  [0,0,0,0,0,0,.4,.7,.4,0,0,0,0,-.3,0,8,2,0,.3,0,0,0,0,0,.3,1,1.8,1.8,1,.3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V5:  [0,0,0,0,0,0,.4,.8,.4,0,0,0,0,-.3,0,9,-1,0,.3,0,0,0,0,0,.3,1,2,2,1,.3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  V6:  [0,0,0,0,0,0,.3,.6,.3,0,0,0,0,-.2,0,6,-0.5,0,.2,0,0,0,0,0,.2,.7,1.5,1.5,.7,.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
}

function generatePath(wave, width, height, phase, speedMul = 1) {
  const segLen = wave.length
  const totalPts = Math.floor(width / 2)
  const mid = height / 2
  const ampScale = height * 0.035 * speedMul
  let d = ''
  for (let i = 0; i < totalPts; i++) {
    const idx = Math.floor((i / speedMul + phase) % segLen)
    const val = wave[idx] * ampScale
    const x = (i / totalPts) * width
    const y = mid - val
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}

function flatline(width, height) {
  const mid = height / 2
  return `M0,${mid} L${width},${mid}`
}

function generateVfPath(width, height, phase = 0) {
  const mid = height / 2
  const totalPoints = Math.floor(width / 2)
  let d = ''
  for (let i = 0; i < totalPoints; i++) {
    const x = (i / totalPoints) * width
    const noise = Math.sin((i + phase) * 0.35) * 0.7 + Math.cos((i + phase) * 0.21) * 0.4
    const y = mid - (noise * height * 0.16)
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}

const ECG_REFERENCE_IMAGES = {
  normal: '/ekg/normal.png',
  rbbb: '/ekg/rbbb.png',
  posterior_mi: '/ekg/posterior_mi.png',
  anterior_mi: '/ekg/anterior_mi.png',
  lbbb: '/ekg/lbbb.png',
}

function resolveEcgPattern(patient) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  if (code.startsWith('I21.0') || code.startsWith('I21.1')) return 'anterior_mi'
  if (code.startsWith('I21.2') || code.startsWith('I21.3')) return 'posterior_mi'
  if (code.startsWith('I44.7')) return 'lbbb'
  if (code.startsWith('I45.1')) return 'rbbb'
  if (code.startsWith('I21')) return Math.random() > 0.5 ? 'anterior_mi' : 'posterior_mi'
  if ((patient?.vitals?.hr || 0) > 115) return 'rbbb'
  return 'normal'
}

function patternMeta(pattern) {
  const map = {
    normal: {
      title: '12-Kanal-EKG',
      quality: 'Gute Signalqualitaet in allen Ableitungen',
    },
    rbbb: {
      title: '12-Kanal-EKG',
      quality: 'Signalqualitaet ausreichend fuer klinische Befundung',
    },
    posterior_mi: {
      title: '12-Kanal-EKG',
      quality: 'Auffaellige Signalverlaeufe, klinische Korrelation erforderlich',
    },
    anterior_mi: {
      title: '12-Kanal-EKG',
      quality: 'Auffaellige Signalverlaeufe, klinische Korrelation erforderlich',
    },
    lbbb: {
      title: '12-Kanal-EKG',
      quality: 'Leitungsbezogene Auffaelligkeiten nicht ausgeschlossen',
    },
  }
  return map[pattern] || map.normal
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function randomInt(min, max) {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

function deriveEcgIntervals(patient, pattern) {
  const hr = Number(patient?.vitals?.hr || 72)
  const rrSec = 60 / Math.max(35, hr)
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const isBundleBranchBlock = pattern === 'rbbb' || pattern === 'lbbb'
  const isMiPattern = pattern === 'anterior_mi' || pattern === 'posterior_mi'
  const isAcuteCoronary = /^I21|^I22/.test(code)
  const isAtrialArrhythmia = /^I48|^I49/.test(code)
  const isTachycard = hr >= 110
  const isBradycard = hr <= 55

  let pqRange = { min: 120, max: 195 }
  if (isAtrialArrhythmia) pqRange = { min: 130, max: 210 }
  if (isTachycard) pqRange = { min: Math.max(110, pqRange.min - 10), max: Math.max(150, pqRange.max - 10) }
  if (isBradycard) pqRange = { min: pqRange.min + 8, max: pqRange.max + 12 }

  let qrsRange = { min: 82, max: 108 }
  if (isBundleBranchBlock) qrsRange = { min: 130, max: 168 }
  if (isAcuteCoronary || isMiPattern) {
    qrsRange = {
      min: qrsRange.min + (isBundleBranchBlock ? 0 : 4),
      max: qrsRange.max + (isBundleBranchBlock ? 0 : 10),
    }
  }

  let targetQtc = 415
  if (isAcuteCoronary || isMiPattern) targetQtc += 20
  if (isBundleBranchBlock) targetQtc += 10
  if (isTachycard) targetQtc += 6
  if (isBradycard) targetQtc += 12
  if (isAtrialArrhythmia) targetQtc += 8
  targetQtc = clampRange(targetQtc + randomInt(-18, 18), 360, 530)

  const pqMs = clampRange(randomInt(pqRange.min, pqRange.max), 105, 240)
  const qrsMs = clampRange(randomInt(qrsRange.min, qrsRange.max), 70, 190)
  const qtMs = clampRange(
    Math.round(targetQtc * Math.sqrt(rrSec)) + randomInt(-12, 12),
    isTachycard ? 280 : 300,
    isBradycard ? 540 : 510,
  )
  const qtcMs = clampRange(Math.round(qtMs / Math.sqrt(rrSec)), 340, 560)

  return { pqMs, qrsMs, qtMs, qtcMs }
}

export default function EcgUI({ equipment, patient, onAction, savedState, onSaveState, onSaveExamResult, onUpsertPatientDocument, currentUser }) {
  const { user, addMoney } = useAuth()
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [electrodesPlaced, setElectrodesPlaced] = useState(savedState?.electrodesPlaced ?? false)
  const [recording, setRecording] = useState(false)
  const [interpretation, setInterpretation] = useState(savedState?.interpretation ?? null)
  const [speed, setSpeed] = useState(savedState?.speed ?? 25)
  const [phase, setPhase] = useState(0)
  const [viewMode, setViewMode] = useState('all')
  const [selectedLead, setSelectedLead] = useState('II')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportDraft, setReportDraft] = useState({ interpretation: '', suspectedDiagnosis: '', signedBy: '' })
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [capturedEcg, setCapturedEcg] = useState(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 })
  const [zoomDragging, setZoomDragging] = useState(false)
  const [zoomDragStart, setZoomDragStart] = useState({ x: 0, y: 0 })
  const [hintUnlocked, setHintUnlocked] = useState(false)
  const [hintMessage, setHintMessage] = useState(null)
  const animRef = useRef(null)
  const lastRef = useRef(0)
  const signatureRef = useRef(null)
  const drawingRef = useRef(false)

  const hasPatient = !!patient?.vitals
  const speedMul = speed / 25
  const defaultSigner = useMemo(() => currentUser?.name || 'Arzt', [currentUser?.name])
  const resus = patient?.clinicalState?.resuscitation || {}
  const arrestActive = !!resus?.active
  const arrestRhythm = String(resus?.rhythm || '').toLowerCase()
  const resusStatus = String(resus?.status || '').toLowerCase()
  const isDead = resusStatus === 'dead' || String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead'
  const lowPerfusionRhythm = arrestRhythm === 'asystole' || arrestRhythm === 'pea'

  useEffect(() => {
    if (onSaveState) onSaveState({ powered, electrodesPlaced, interpretation, speed })
  }, [powered, electrodesPlaced, interpretation, speed])

  useEffect(() => {
    if (!powered || !electrodesPlaced) { if (animRef.current) cancelAnimationFrame(animRef.current); return }
    const tick = (ts) => {
      const dt = ts - (lastRef.current || ts)
      lastRef.current = ts
      setPhase(prev => prev + dt * 0.04)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [powered, electrodesPlaced])

  useEffect(() => {
    if (!showReportModal) return
    const canvas = signatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = Math.max(1, Math.floor(rect.width))
    const cssH = Math.max(1, Math.floor(rect.height))
    if (canvas.width !== cssW || canvas.height !== cssH) {
      canvas.width = cssW
      canvas.height = cssH
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
    setHintUnlocked(false)
    setHintMessage(null)
  }, [showReportModal, capturedEcg?.pattern])

  const buyEkgHint = () => {
    if (hintUnlocked) return
    const hintCost = getHintCost(320, user)
    const wallet = Number(user?.wallet || 0)
    if (wallet < hintCost) {
      setHintMessage({ type: 'error', text: `Nicht genug Guthaben für EKG-Tipp (${hintCost}€).` })
      setTimeout(() => setHintMessage(null), 2200)
      return
    }
    addMoney(-hintCost)
    const autoDiagnosis = patient?.trueDiagnoses?.primary?.name || patient?.diagnoses?.primary?.name || ''
    const autoInterpretation = [
      interpretation?.notes || '',
      interpretation?.rhythm ? `Rhythmus: ${interpretation.rhythm}` : '',
      interpretation?.rate ? `Frequenz: ${interpretation.rate}` : '',
      interpretation?.pr ? `PQ: ${interpretation.pr}` : '',
      interpretation?.qrs ? `QRS: ${interpretation.qrs}` : '',
      interpretation?.qt ? `QTc: ${interpretation.qt}` : '',
    ].filter(Boolean).join(' | ')
    setReportDraft(prev => ({
      ...prev,
      interpretation: prev.interpretation?.trim() ? prev.interpretation : autoInterpretation,
      suspectedDiagnosis: prev.suspectedDiagnosis?.trim() ? prev.suspectedDiagnosis : autoDiagnosis,
    }))
    setHintUnlocked(true)
    setHintMessage({ type: 'success', text: `EKG-Tipp freigeschaltet (-${hintCost}€).` })
    setTimeout(() => setHintMessage(null), 2200)
  }

  const handlePlaceElectrodes = () => { setElectrodesPlaced(true); onAction?.('ecg_electrodes', '12-Kanal-Elektroden platziert', 3, 5) }
  const handleRemoveElectrodes = () => { setElectrodesPlaced(false); setInterpretation(null); onAction?.('ecg_remove', 'EKG-Elektroden entfernt', 1, 0) }
  const handleRecord = () => {
    setRecording(true)
    onAction?.('ecg_record', '12-Kanal-EKG aufgezeichnet', 5, 10)
    setTimeout(() => {
      const pattern = resolveEcgPattern(patient)
      const meta = patternMeta(pattern)
      const intervals = deriveEcgIntervals(patient, pattern)
      setCapturedEcg({
        pattern,
        image: {
          src: ECG_REFERENCE_IMAGES[pattern] || ECG_REFERENCE_IMAGES.normal,
          alt: 'EKG-Aufzeichnung',
          caption: '12-Kanal-EKG-Aufzeichnung',
        },
        meta,
      })
      setInterpretation({
        rhythm: 'Dokumentiert',
        rate: `${patient?.vitals?.hr || 72}/min`,
        axis: 'Siehe Kurve',
        pr: `${intervals.pqMs} ms`,
        qrs: `${intervals.qrsMs} ms`,
        qt: `${intervals.qtcMs} ms`,
        qtRaw: `${intervals.qtMs} ms`,
        notes: meta.quality,
      })
      setReportDraft({
        interpretation: '',
        suspectedDiagnosis: '',
        signedBy: defaultSigner,
      })
      setSignatureEmpty(true)
      setShowReportModal(true)
      setRecording(false)
    }, 1800)
  }

  const beginSignature = (e) => {
    const canvas = signatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratioX = canvas.width / Math.max(1, rect.width)
    const ratioY = canvas.height / Math.max(1, rect.height)
    const x = ((e.clientX || (e.touches?.[0]?.clientX || 0)) - rect.left) * ratioX
    const y = ((e.clientY || (e.touches?.[0]?.clientY || 0)) - rect.top) * ratioY
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawingRef.current = true
  }

  const drawSignature = (e) => {
    if (!drawingRef.current) return
    const canvas = signatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratioX = canvas.width / Math.max(1, rect.width)
    const ratioY = canvas.height / Math.max(1, rect.height)
    const x = ((e.clientX || (e.touches?.[0]?.clientX || 0)) - rect.left) * ratioX
    const y = ((e.clientY || (e.touches?.[0]?.clientY || 0)) - rect.top) * ratioY
    const ctx = canvas.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setSignatureEmpty(false)
  }

  const endSignature = () => {
    drawingRef.current = false
  }

  const clearSignature = () => {
    const canvas = signatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
  }

  const saveEcgReport = () => {
    if (!capturedEcg?.image?.src) return
    const interpretationText = String(reportDraft.interpretation || '').trim()
    const diagnosisText = String(reportDraft.suspectedDiagnosis || '').trim()
    const signer = String(reportDraft.signedBy || '').trim()
    if (!interpretationText || !diagnosisText || !signer || signatureEmpty) return
    const signaturePng = signatureRef.current?.toDataURL('image/png') || ''
    const nowIso = new Date().toISOString()
    const reportTitle = capturedEcg.meta?.title || 'EKG-Befund'
    onSaveExamResult?.(patient?.id, {
      type: 'diagnostic_exam',
      subtype: 'ekg_12',
      title: reportTitle,
      summary: `${diagnosisText} — ${interpretationText}`,
      findings: [
        interpretationText,
        `Verdachtsdiagnose: ${diagnosisText}`,
        `Intervalle: PQ ${interpretation?.pr || '-'}, QRS ${interpretation?.qrs || '-'}, QT ${interpretation?.qtRaw || '-'}, QTc ${interpretation?.qt || '-'}`,
      ],
      note: `Signiert von ${signer}`,
      image: capturedEcg.image,
      time: nowIso,
    })
    onUpsertPatientDocument?.(patient?.id, {
      title: `${reportTitle} ${new Date(nowIso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      type: 'ekg_befund',
      templateId: 'ekg_befund',
      color: 'emerald',
      fields: {
        beurteilung: interpretationText,
        verdachtsdiagnose: diagnosisText,
        rhythmus: interpretation?.rhythm || '',
        frequenz: interpretation?.rate || '',
        pq_zeit: interpretation?.pr || '',
        qrs_zeit: interpretation?.qrs || '',
        qt_zeit: interpretation?.qtRaw || '',
        qtc_zeit: interpretation?.qt || '',
        signedBy: signer,
        signedAt: nowIso,
        signaturePng,
      },
      image: capturedEcg.image,
      status: 'final',
      signedBy: signer,
      signedAt: nowIso,
    })
    onAction?.('ecg_finalize', 'EKG-Befund erstellt', 8, 25)
    setShowReportModal(false)
  }

  const renderGrid = (w, h) => (
    <g>
      {[...Array(Math.floor(w / 20) + 1)].map((_, i) => <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={h} stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
      {[...Array(Math.floor(h / 10) + 1)].map((_, i) => <line key={`h${i}`} x1={0} y1={i * 10} x2={w} y2={i * 10} stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
    </g>
  )

  return (
    <div className="p-4">
      <div className={`rounded-2xl overflow-hidden border-2 ${powered ? 'border-green-600 bg-[#0a0e14]' : 'border-surface-300 bg-surface-200'} transition-colors shadow-2xl`}>
        {powered ? (
          <div className="p-3 min-h-[300px]">
            {!electrodesPlaced ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] text-center">
                <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4"><Activity className="w-8 h-8 text-surface-500" /></div>
                <p className="text-sm text-white/60 mb-4">Elektroden nicht platziert</p>
                <button onClick={handlePlaceElectrodes} className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700">12 Elektroden platzieren</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1">
                    <button onClick={() => setViewMode('all')} className={`text-[10px] px-2.5 py-1 rounded-full font-mono ${viewMode === 'all' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/50'}`}>Alle 12</button>
                    <button onClick={() => setViewMode('single')} className={`text-[10px] px-2.5 py-1 rounded-full font-mono ${viewMode === 'single' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/50'}`}>Einzeln</button>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {recording && <span className="text-[10px] text-red-400 font-mono animate-pulse">● REC</span>}
                    {[25, 50].map(s => <button key={s} onClick={() => setSpeed(s)} className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${speed === s ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'}`}>{s}mm/s</button>)}
                  </div>
                </div>

                {viewMode === 'all' ? (
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0">
                    {LEADS.map(lead => {
                      const wave = BASE_WAVE[lead.id] || BASE_WAVE.II
                      const path = !hasPatient
                        ? flatline(200, 36)
                        : (isDead || (arrestActive && lowPerfusionRhythm))
                          ? flatline(200, 36)
                          : (arrestActive && (arrestRhythm === 'vf' || arrestRhythm === 'pvt'))
                            ? generateVfPath(200, 36, phase)
                            : generatePath(wave, 200, 36, phase, speedMul)
                      return (
                        <div key={lead.id} className="relative bg-black/40 rounded overflow-hidden cursor-pointer hover:bg-black/60 transition-colors" style={{ height: 36 }}
                          onClick={() => { setSelectedLead(lead.id); setViewMode('single') }}>
                          <svg className="w-full h-full" viewBox="0 0 200 36" preserveAspectRatio="none">
                            {renderGrid(200, 36)}
                            <path d={path} fill="none" stroke={hasPatient ? lead.color : '#374151'} strokeWidth="1.2" />
                          </svg>
                          <span className="absolute top-0.5 left-1 text-[8px] font-mono font-bold" style={{ color: lead.color }}>{lead.id}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {LEADS.map(lead => (
                        <button key={lead.id} onClick={() => setSelectedLead(lead.id)}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${selectedLead === lead.id ? 'font-bold text-white' : 'text-white/40 hover:text-white/70'}`}
                          style={selectedLead === lead.id ? { backgroundColor: lead.color + '30', color: lead.color } : {}}
                        >{lead.id}</button>
                      ))}
                    </div>
                    <div className="bg-black/40 rounded-xl overflow-hidden relative" style={{ height: 120 }}>
                      <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                        {renderGrid(400, 120)}
                        <defs><filter id="ecgGlow2"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                        <path d={!hasPatient
                          ? flatline(400, 120)
                          : (isDead || (arrestActive && lowPerfusionRhythm))
                            ? flatline(400, 120)
                            : (arrestActive && (arrestRhythm === 'vf' || arrestRhythm === 'pvt'))
                              ? generateVfPath(400, 120, phase)
                              : generatePath(BASE_WAVE[selectedLead] || BASE_WAVE.II, 400, 120, phase, speedMul)}
                          fill="none" stroke={hasPatient ? (LEADS.find(l => l.id === selectedLead)?.color || '#22c55e') : '#374151'} strokeWidth="2" filter={hasPatient ? 'url(#ecgGlow2)' : undefined} />
                      </svg>
                      <span className="absolute top-2 left-3 text-[10px] font-mono font-bold" style={{ color: LEADS.find(l => l.id === selectedLead)?.color }}>{selectedLead}</span>
                      <span className="absolute top-2 right-3 text-[10px] text-white/30 font-mono">{speed}mm/s</span>
                      {!hasPatient && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-surface-600 font-mono">Kein Patient</span>}
                    </div>
                  </>
                )}

                {interpretation && (
                  <div className={`rounded-xl p-3 mt-2 ${interpretation.notes?.includes('STEMI') ? 'bg-red-900/40 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
                    <p className="text-[9px] text-white/40 font-mono mb-1 uppercase tracking-widest">Auswertung</p>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      {[{ l: 'Rhythmus', v: interpretation.rhythm }, { l: 'Frequenz', v: interpretation.rate }, { l: 'Achse', v: interpretation.axis }, { l: 'PQ', v: interpretation.pr }, { l: 'QRS', v: interpretation.qrs }, { l: 'QTc', v: interpretation.qt }, { l: 'QT', v: interpretation.qtRaw }].map(item => (
                        <div key={item.l}><p className="text-[8px] text-white/30 font-mono">{item.l}</p><p className="text-white font-mono font-bold text-[11px]">{item.v}</p></div>
                      ))}
                    </div>
                    <p className={`text-xs font-mono ${interpretation.notes?.includes('STEMI') ? 'text-red-400 font-bold' : 'text-white/70'}`}>{interpretation.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="min-h-[300px] flex items-center justify-center"><p className="text-surface-400 text-sm">EKG-Gerät aus</p></div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button onClick={() => { setPowered(!powered); if (powered) { setElectrodesPlaced(false); setInterpretation(null) } }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${powered ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600'}`}>
          <Power className="w-5 h-5" /><span className="flex-1 text-sm font-medium">{powered ? 'Eingeschaltet' : 'Einschalten'}</span>
        </button>
        {powered && electrodesPlaced && (<>
          <button onClick={handleRemoveElectrodes} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-left"><X className="w-5 h-5" /><span className="flex-1 text-sm font-medium">Elektroden entfernen</span></button>
          <button onClick={handleRecord} disabled={recording} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-surface-200 text-surface-600 hover:border-green-300 transition-colors text-left"><Activity className="w-5 h-5" /><span className="flex-1 text-sm font-medium">{recording ? 'Wird aufgezeichnet...' : '12-Kanal aufzeichnen'}</span></button>
        </>)}
      </div>

      {showReportModal && capturedEcg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl">
            <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
              <p className="font-semibold text-surface-900">{capturedEcg.meta?.title || 'EKG-Befund'}</p>
              <button onClick={() => setShowReportModal(false)} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="p-5 grid lg:grid-cols-[1.2fr_1fr] gap-4 overflow-y-auto max-h-[82vh]">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-2">
                <img src={capturedEcg.image.src} alt={capturedEcg.image.alt} className="w-full rounded-lg border border-surface-200 bg-white cursor-zoom-in" onClick={() => { setZoomOpen(true); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }) }} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-surface-600">{capturedEcg.image.caption}</p>
                  <button onClick={() => { setZoomOpen(true); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }) }} className="text-[11px] px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200">Vergrößern</button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">Gemessene EKG-Zeiten</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white border border-emerald-100 px-2 py-1.5">
                      <p className="text-emerald-700">PQ-Zeit</p>
                      <p className="font-semibold text-emerald-900">{interpretation?.pr || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-emerald-100 px-2 py-1.5">
                      <p className="text-emerald-700">QRS-Zeit</p>
                      <p className="font-semibold text-emerald-900">{interpretation?.qrs || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-emerald-100 px-2 py-1.5">
                      <p className="text-emerald-700">QT-Zeit</p>
                      <p className="font-semibold text-emerald-900">{interpretation?.qtRaw || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-emerald-100 px-2 py-1.5">
                      <p className="text-emerald-700">QTc-Zeit</p>
                      <p className="font-semibold text-emerald-900">{interpretation?.qt || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  {hintMessage && (
                    <div className={`mb-2 rounded-lg border px-2.5 py-1.5 text-xs ${hintMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      {hintMessage.text}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-amber-800">Diagnose-/Interpretations-Tipp</p>
                    {!hintUnlocked && (
                      <button onClick={buyEkgHint} className="text-[11px] px-2.5 py-1 rounded bg-amber-500 text-white hover:bg-amber-600">
                        Tipp kaufen (320€)
                      </button>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${hintUnlocked ? 'text-emerald-700' : 'text-surface-600'}`}>
                    {hintUnlocked
                      ? 'Tipp aktiv: Verdachtsdiagnose und Befundtext wurden automatisch vorausgefüllt.'
                      : `Wallet: ${(user?.wallet || 0).toLocaleString('de-DE')}€`}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-xs text-surface-500 mb-1">Beurteilung</p>
                  <textarea
                    value={reportDraft.interpretation}
                    onChange={(e) => setReportDraft(prev => ({ ...prev, interpretation: e.target.value }))}
                    className="input-field !h-28 resize-none"
                    placeholder="EKG-Befund beschreiben (Rhythmus, ST/T, Leitungsstoerung...)"
                  />
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-xs text-surface-500 mb-1">Verdachtsdiagnose</p>
                  <input
                    value={reportDraft.suspectedDiagnosis}
                    onChange={(e) => setReportDraft(prev => ({ ...prev, suspectedDiagnosis: e.target.value }))}
                    className="input-field"
                    placeholder="z. B. Vorderwandinfarkt"
                  />
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-surface-500">Signatur</p>
                    <button onClick={clearSignature} className="text-[11px] px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200">Leeren</button>
                  </div>
                  <canvas
                    ref={signatureRef}
                    width={560}
                    height={160}
                    onMouseDown={beginSignature}
                    onMouseMove={drawSignature}
                    onMouseUp={endSignature}
                    onMouseLeave={endSignature}
                    onTouchStart={beginSignature}
                    onTouchMove={drawSignature}
                    onTouchEnd={endSignature}
                    className="w-full h-24 rounded-lg border border-dashed border-surface-300 bg-white touch-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-surface-500" />
                    <input
                      value={reportDraft.signedBy}
                      onChange={(e) => setReportDraft(prev => ({ ...prev, signedBy: e.target.value }))}
                      className="input-field"
                      placeholder="Name fuer digitale Signatur"
                    />
                  </div>
                </div>
                <button
                  onClick={saveEcgReport}
                  disabled={!reportDraft.interpretation.trim() || !reportDraft.suspectedDiagnosis.trim() || !reportDraft.signedBy.trim() || signatureEmpty}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Befund speichern und unterschreiben
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoomOpen && capturedEcg?.image?.src && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setZoomOpen(false)} />
          <div className="relative w-full max-w-6xl rounded-2xl border border-surface-200 bg-slate-950 shadow-2xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-white">
              <p className="text-sm font-semibold">{capturedEcg.image.caption || capturedEcg.image.alt}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoomScale(prev => Math.max(1, +(prev - 0.25).toFixed(2)))} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">-</button>
                <button onClick={() => setZoomScale(prev => Math.min(4, +(prev + 0.25).toFixed(2)))} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">+</button>
                <button onClick={() => { setZoomScale(1); setZoomOffset({ x: 0, y: 0 }) }} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Reset</button>
                <button onClick={() => setZoomOpen(false)} className="p-1.5 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div
              className="h-[78vh] overflow-auto flex items-center justify-center p-6 cursor-grab active:cursor-grabbing"
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY < 0 ? 0.12 : -0.12
                setZoomScale(prev => Math.max(1, Math.min(4, +(prev + delta).toFixed(2))))
              }}
              onMouseDown={(e) => {
                setZoomDragging(true)
                setZoomDragStart({ x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => {
                if (!zoomDragging) return
                const dx = e.clientX - zoomDragStart.x
                const dy = e.clientY - zoomDragStart.y
                setZoomOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
                setZoomDragStart({ x: e.clientX, y: e.clientY })
              }}
              onMouseUp={() => setZoomDragging(false)}
              onMouseLeave={() => setZoomDragging(false)}
            >
              <img src={capturedEcg.image.src} alt={capturedEcg.image.alt} className="max-w-none rounded border border-white/10 select-none" draggable={false} style={{ transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`, transformOrigin: 'center center' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
