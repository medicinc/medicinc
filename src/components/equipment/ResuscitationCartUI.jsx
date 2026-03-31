import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Zap, HeartPulse, Syringe, AlertTriangle, Wind, Timer, Droplets, TestTube2 } from 'lucide-react'
import defibrillatorSound from '../../assets/sfx/defibrillator.mp3'
import tachykardieSound from '../../assets/sfx/tachykardie.mp3'
import flatlineSound from '../../assets/sfx/flatline.mp3'
import { playOneShot, startLoop, stopLoop, getActiveLoopsSnapshot } from '../../utils/soundManager'
import VentilatorUI from './VentilatorUI'
import MedicationPanel from './MedicationPanel'
import armAsset from '../../assets/phlebotomy/arm.png'
import armFemaleAsset from '../../assets/phlebotomy/arm-female.png'
import armWithTourniquetAsset from '../../assets/phlebotomy/arm-with-tourniquet.png'
import disinfectantAsset from '../../assets/phlebotomy/disinfectant.png'
import tourniquetAsset from '../../assets/phlebotomy/tourniquet.png'
import swabAsset from '../../assets/phlebotomy/swab.png'
import viggo14gAsset from '../../assets/access/viggo-14g.png'
import viggo16gAsset from '../../assets/access/viggo-16g.png'
import viggo18gAsset from '../../assets/access/viggo-18g.png'
import viggo20gAsset from '../../assets/access/viggo-20g.png'
import viggo22gAsset from '../../assets/access/viggo-22g.png'
import accessPlasterAsset from '../../assets/access/access-plaster.png'
import spraySound from '../../assets/sfx/spray.mp3'

const DEFIB_ENERGIES = [120, 150, 200, 300, 360]
const RESUS_MEDS = [
  { id: 'adrenalin', label: 'Adrenalin', doses: ['1 mg', '2 mg'] },
  { id: 'amiodaron', label: 'Amiodaron', doses: ['150 mg', '300 mg'] },
  { id: 'atropin', label: 'Atropin', doses: ['0.5 mg', '1 mg'] },
  { id: 'noradrenalin', label: 'Noradrenalin', doses: ['0.05 mg', '0.1 mg'] },
]
const RESUS_FLUIDS = [
  { id: 'infusion_nacl', label: 'NaCl 0.9% 500 ml', kind: 'infusion' },
  { id: 'infusion_ringer', label: 'Ringer 500 ml', kind: 'infusion' },
  { id: 'infusion_glucose5', label: 'Glucose 5% 500 ml', kind: 'infusion' },
  { id: 'transfusion_ek', label: 'EK 1 Konserve', kind: 'transfusion' },
  { id: 'transfusion_ffp', label: 'FFP 1 Konserve', kind: 'transfusion' },
]
const RESUS_MEDICATION_IDS = new Set(['adrenalin', 'amiodaron', 'atropin', 'noradrenalin'])
const ACCESS_TYPES = [
  { id: 'pvk_14g', label: 'PVK 14G', gauge: '14G', hint: 'großlumig' },
  { id: 'pvk_16g', label: 'PVK 16G', gauge: '16G', hint: 'großlumig' },
  { id: 'pvk_18g', label: 'PVK 18G', gauge: '18G', hint: 'standard' },
  { id: 'pvk_20g', label: 'PVK 20G', gauge: '20G', hint: 'feiner' },
  { id: 'pvk_22g', label: 'PVK 22G', gauge: '22G', hint: 'sehr fein' },
]
const ACCESS_SITE_OPTIONS = [
  { id: 'ellenbeuge_links', label: 'Ellenbeuge links', x: 50, y: 47, r: 11 },
  { id: 'ellenbeuge_rechts', label: 'Ellenbeuge rechts', x: 50, y: 47, r: 11 },
  { id: 'unterarm_links', label: 'Unterarm links', x: 50, y: 60, r: 11 },
  { id: 'unterarm_rechts', label: 'Unterarm rechts', x: 50, y: 60, r: 11 },
  { id: 'handruecken_links', label: 'Handrücken links', x: 49, y: 82, r: 10 },
  { id: 'handruecken_rechts', label: 'Handrücken rechts', x: 49, y: 82, r: 10 },
]
const ACCESS_GAME_TARGETS = {
  punctureBySiteId: Object.fromEntries(ACCESS_SITE_OPTIONS.map((site) => [site.id, { x: site.x, y: site.y, r: site.r }])),
  upperArmBySide: {
    left: { x: 50, y: 34, r: 16 },
    right: { x: 50, y: 34, r: 16 },
  },
}
const ACCESS_GAME_CHECKLIST = [
  { id: 'dis1', label: '1) Desinfizieren' },
  { id: 'swab', label: '2) Wischen' },
  { id: 'dis2', label: '3) Erneut desinfizieren' },
  { id: 'tourniquetOn', label: '4) Stauen' },
  { id: 'viggo', label: '5) Viggo legen' },
  { id: 'tourniquetOff', label: '6) Entstauen' },
  { id: 'plaster', label: '7) Pflaster' },
]
const ACCESS_OVERLAY_TUNING = {
  viggoScale: 0.9,
  viggoBaseWidth: 128,
  viggoBaseHeight: 92,
  viggoTranslateXPercentLeft: -45,
  viggoTranslateYPercentLeft: -25,
  viggoTranslateXPercentRight: -55,
  viggoTranslateYPercentRight: -25,
  viggoRotationRightDeg: -110,
  viggoRotationLeftDeg: 110,
  plasterWidth: 76,
  plasterHeight: 76,
  plasterTranslateXPercent: -50,
  plasterTranslateYPercent: -50,
  plasterRotationRightDeg: 25,
  plasterRotationLeftDeg: -25,
}

function generateFlatline(width, height) {
  const y = height / 2
  return `M0,${y} L${width},${y}`
}

function generateEcgPath(width, height, phase = 0) {
  const seg = [
    0, 0, 0, 0, 0.4, 1.2, 0.3, 0, -0.4, 0, 6, -2, 0, 0.5, 1.3, 2, 2, 1.5, 0.8, 0.3, 0, 0, 0, 0,
  ]
  const mid = height / 2
  const points = Math.floor(width / 2)
  let d = ''
  for (let i = 0; i < points; i++) {
    const idx = (i + Math.floor(phase)) % seg.length
    const x = (i / points) * width
    const y = mid - seg[idx] * (height * 0.06)
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}

function generateVfPath(width, height, phase = 0) {
  const mid = height / 2
  const points = Math.floor(width / 2)
  let d = ''
  for (let i = 0; i < points; i++) {
    const x = (i / points) * width
    const n = Math.sin((i + phase) * 0.33) * 0.7 + Math.cos((i + phase) * 0.19) * 0.5
    const y = mid - n * (height * 0.18)
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}
const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const ResusMonitor = memo(function ResusMonitor({
  active,
  isDead,
  rhythm,
  resusStatus,
  displayedHr,
  displayedSpo2,
  displayedAf,
  displayedBp,
}) {
  const [phase, setPhase] = useState(0)
  const rafRef = useRef(null)
  const rhythmKey = String(rhythm || '').toLowerCase()

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = () => {
      setPhase((prev) => (prev + 1.15) % 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const ecgPath = useMemo(() => {
    if (isDead || rhythmKey === 'asystole' || rhythmKey === 'pea') return generateFlatline(400, 80)
    if (rhythmKey === 'vf' || rhythmKey === 'pvt') return generateVfPath(400, 80, phase)
    return generateEcgPath(400, 80, phase)
  }, [isDead, rhythmKey, phase])

  const plethPath = useMemo(() => (
    (active || isDead) ? generateFlatline(400, 36) : generateEcgPath(400, 36, phase)
  ), [active, isDead, phase])

  return (
    <div className="rounded-2xl border border-surface-700 bg-[#0a0e14] p-3">
      <p className="text-xs font-semibold text-surface-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-green-500" /> Notfallmonitor
      </p>
      <p className="text-[9px] text-surface-500/80 mb-1">RDBG build: 2026-03-02b</p>
      <div className="space-y-1.5">
        <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 84 }}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 80">
            {[...Array(17)].map((_, i) => <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="80" stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 10} x2="400" y2={i * 10} stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
          </svg>
          <svg className="relative w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path d={ecgPath} fill="none" stroke="#22c55e" strokeWidth="2" />
          </svg>
          <span className="absolute top-1 left-2 text-[9px] text-green-500/80 font-mono font-bold">II</span>
          {(active || resusStatus === 'arrest') && (
            <span className="absolute top-1 right-2 text-[9px] text-red-400 font-mono font-bold">{String(rhythm || '').toUpperCase()}</span>
          )}
        </div>
        <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 40 }}>
          <svg className="relative w-full h-full" viewBox="0 0 400 36" preserveAspectRatio="none">
            <path d={plethPath} fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          </svg>
          <span className="absolute top-0.5 left-2 text-[9px] text-cyan-500/80 font-mono font-bold">Pleth</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-green-900/30 border border-green-500/20 p-2">
            <p className="text-[10px] text-green-400/80">HF</p>
            <p className="text-sm font-bold text-green-400">{displayedHr}</p>
          </div>
          <div className="rounded-lg bg-cyan-900/30 border border-cyan-500/20 p-2">
            <p className="text-[10px] text-cyan-400/80">SpO2</p>
            <p className="text-sm font-bold text-cyan-400">{displayedSpo2}</p>
          </div>
          <div className="rounded-lg bg-yellow-900/25 border border-yellow-500/20 p-2">
            <p className="text-[10px] text-yellow-400/80">AF</p>
            <p className="text-sm font-bold text-yellow-400">{displayedAf}</p>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-2">
            <p className="text-[10px] text-white/70">RR</p>
            <p className="text-sm font-bold text-white">{displayedBp}</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function ResuscitationCartUI({
  patient,
  room,
  onAction,
  savedState,
  onSaveState,
  medicationInventory,
  userRank,
  onResusAnalyze,
  onResusCharge,
  onResusShock,
  onResusToggleCpr,
  onResusGiveMedication,
  onAbortResuscitation,
}) {
  const rootRef = useRef(null)
  const scrollParentRef = useRef(null)
  const [energy, setEnergy] = useState(savedState?.energy ?? 200)
  const [charged, setCharged] = useState(false)
  const [charging, setCharging] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [statusHint, setStatusHint] = useState('')
  const [stepLog, setStepLog] = useState([])
  const [stopwatchMs, setStopwatchMs] = useState(0)
  const [showAirwayModal, setShowAirwayModal] = useState(false)
  const [airwayState, setAirwayState] = useState(savedState?.airwayState ?? null)
  const [bedsideTestOk, setBedsideTestOk] = useState(savedState?.bedsideTestOk ?? false)
  const [fluidRate, setFluidRate] = useState(savedState?.fluidRate ?? 1200)
  const [resusAbortConfirm, setResusAbortConfirm] = useState(false)
  const [shockPending, setShockPending] = useState(false)
  const [audioDebugOpen, setAudioDebugOpen] = useState(false)
  const [scrollDebugOpen, setScrollDebugOpen] = useState(false)
  const [audioSnapshot, setAudioSnapshot] = useState([])
  const [showResusMedModal, setShowResusMedModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const accessCanvasRef = useRef(null)
  const [accessDraft, setAccessDraft] = useState({
    typeId: ACCESS_TYPES[2].id,
    gauge: ACCESS_TYPES[2].gauge,
    siteId: ACCESS_SITE_OPTIONS[0].id,
    stage: 'setup',
  })
  const [accessProcedure, setAccessProcedure] = useState({
    disinfectionCount: 0,
    swabDone: false,
    tourniquetOn: false,
    viggoPlaced: false,
    plasterDone: false,
  })
  const [accessAttachedToolId, setAccessAttachedToolId] = useState(null)
  const [accessCursorPos, setAccessCursorPos] = useState({ x: 0, y: 0 })
  const [accessHint, setAccessHint] = useState('')
  const shockTimeoutRef = useRef(null)
  const [scrollDebug, setScrollDebug] = useState({
    parentTag: '-',
    parentClass: '-',
    parentTop: 0,
    parentClient: 0,
    parentHeight: 0,
    wheelDeltaY: 0,
    wheelTarget: '-',
    wheelNested: '-',
    wheelTime: '-',
    nestedScrollableCount: 0,
  })
  const rhythmLoopKey = useRef(`resus_rhythm_${Math.random().toString(36).slice(2, 8)}`)
  const onSaveStateRef = useRef(onSaveState)

  const resus = patient?.clinicalState?.resuscitation || {}
  const rhythm = String(resus?.rhythm || 'unknown').toUpperCase()
  const active = !!resus?.active
  const rhythmKey = String(resus?.rhythm || '').toLowerCase()
  const isDead = String(resus?.status || '').toLowerCase() === 'dead' || String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead'
  const lowPerfusionRhythm = rhythmKey === 'asystole' || rhythmKey === 'pea'
  const patientId = patient?.id || room?.patientId || savedState?.boundPatientId || null
  const hasActiveAccess = Array.isArray(patient?.venousAccesses) && patient.venousAccesses.some(entry => entry?.status === 'active')

  const canDefibControls = !!patientId && (active || resus?.status === 'arrest')
  const canShock = canDefibControls && charged && !charging && !shockPending
  const vitals = patient?.vitals || {}

  const accessLabel = useMemo(() => {
    if (!hasActiveAccess) return 'Kein aktiver Zugang'
    const activeItems = (patient?.venousAccesses || []).filter(entry => entry?.status === 'active')
    return activeItems.map(entry => `${entry.gauge || 'PVK'} ${entry.site || ''}`.trim()).join(' | ')
  }, [hasActiveAccess, patient?.venousAccesses])

  useEffect(() => {
    onSaveStateRef.current = onSaveState
  }, [onSaveState])

  useEffect(() => {
    onSaveStateRef.current?.({ energy, airwayState, bedsideTestOk, fluidRate, boundPatientId: patientId || null })
  }, [energy, airwayState, bedsideTestOk, fluidRate, patientId])

  useEffect(() => {
    setAnalysis(null)
    setCharged(false)
    setCharging(false)
    setShockPending(false)
    setShowResusMedModal(false)
    setShowAccessModal(false)
    setAccessProcedure({
      disinfectionCount: 0,
      swabDone: false,
      tourniquetOn: false,
      viggoPlaced: false,
      plasterDone: false,
    })
    setAccessAttachedToolId(null)
    setAccessHint('')
  }, [patientId])

  useEffect(() => {
    const started = Date.parse(resus?.startedAt || '')
    if (!active || !Number.isFinite(started)) {
      setStopwatchMs(0)
      return
    }
    const tick = () => setStopwatchMs(Math.max(0, Date.now() - started))
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [active, resus?.startedAt])

  useEffect(() => {
    const rhythmKey = String(resus?.rhythm || '').toLowerCase()
    const shouldFlatline = active && (rhythmKey === 'asystole' || rhythmKey === 'pea')
    const shouldTachy = active && (rhythmKey === 'vf' || rhythmKey === 'pvt')
    if (shouldFlatline) startLoop(rhythmLoopKey.current, flatlineSound, {
      volume: 0.11,
      trimEndSec: 0.42,
      loopStartSec: 0.22,
      seamSearchRadiusSec: 0.4,
      seamWindowSec: 0.008,
      seamCrossfadeSec: 0,
      detectSilenceBounds: true,
      silenceThreshold: 0.008,
    })
    else if (shouldTachy) startLoop(rhythmLoopKey.current, tachykardieSound, { volume: 0.11 })
    else stopLoop(rhythmLoopKey.current)
    return () => {
      if (!shouldFlatline && !shouldTachy) stopLoop(rhythmLoopKey.current)
    }
  }, [active, resus?.rhythm])

  useEffect(() => () => stopLoop(rhythmLoopKey.current), [])
  useEffect(() => () => {
    if (shockTimeoutRef.current) clearTimeout(shockTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (!audioDebugOpen) return undefined
    const refresh = () => setAudioSnapshot(getActiveLoopsSnapshot())
    refresh()
    const timer = setInterval(refresh, 300)
    return () => clearInterval(timer)
  }, [audioDebugOpen])

  const displayedHr = isDead || (active && lowPerfusionRhythm) ? 0 : (vitals.hr ?? '--')
  const displayedSpo2 = active || isDead ? 0 : (Number.isFinite(Number(vitals.spo2)) ? Math.round(Number(vitals.spo2)) : '--')
  const displayedAf = active || isDead ? 0 : (vitals.rr ?? '--')
  const displayedBp = active || isDead ? '0/0' : (vitals.bp ?? '--')
  const formatResusError = useCallback((res, source) => {
    const message = String(res?.message || 'Aktion fehlgeschlagen.')
    const debug = res?.debug
    if (!debug) return message
    const requested = debug?.requestedPatientId ?? null
    const count = Number(debug?.patientCount ?? 0)
    const ids = Array.isArray(debug?.patientIds) ? debug.patientIds.join(', ') : ''
    const activeIds = Array.isArray(debug?.activeResusIds) ? debug.activeResusIds.join(', ') : ''
    const local = `local(pid=${patientId || 'null'}, roomPid=${room?.patientId || 'null'}, bound=${savedState?.boundPatientId || 'null'})`
    const store = `store(req=${requested ?? 'null'}, count=${count}, active=[${activeIds}], ids=[${ids}])`
    return `${message} [${source}] ${local} ${store}`.trim()
  }, [patientId, room?.patientId, savedState?.boundPatientId])
  const airwaySummary = airwayState?.powered
    ? `${String(airwayState?.ventMode || 'vc_ac').toUpperCase()} • FiO2 ${Number(airwayState?.params?.fio2 || 40)}% • PEEP ${Number(airwayState?.params?.peep || 5)}`
    : 'Noch keine aktive Beatmung'
  const stopwatchLabel = useMemo(() => {
    const sec = Math.floor(stopwatchMs / 1000)
    const mm = String(Math.floor(sec / 60)).padStart(2, '0')
    const ss = String(sec % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [stopwatchMs])
  const emergencyMedicationInventory = useMemo(
    () => Object.fromEntries(RESUS_MEDS.map((med) => [med.id, Math.max(0, Number(medicationInventory?.[med.id] || 0))])),
    [medicationInventory],
  )
  const selectedAccessType = useMemo(
    () => ACCESS_TYPES.find((type) => type.id === accessDraft.typeId) || ACCESS_TYPES[2],
    [accessDraft.typeId],
  )
  const selectedAccessSite = useMemo(
    () => ACCESS_SITE_OPTIONS.find((siteOpt) => siteOpt.id === accessDraft.siteId) || ACCESS_SITE_OPTIONS[0],
    [accessDraft.siteId],
  )
  const selectedPunctureTarget = useMemo(
    () => ACCESS_GAME_TARGETS.punctureBySiteId[accessDraft.siteId] || ACCESS_GAME_TARGETS.punctureBySiteId[ACCESS_SITE_OPTIONS[0].id],
    [accessDraft.siteId],
  )
  const selectedSide = String(accessDraft.siteId || '').includes('_links') ? 'left' : 'right'
  const shouldMirrorArm = selectedSide === 'left'
  const mirrorTargetX = useCallback((target) => (target ? { ...target, x: 100 - target.x } : target), [])
  const displayPunctureTarget = useMemo(
    () => (shouldMirrorArm ? mirrorTargetX(selectedPunctureTarget) : selectedPunctureTarget),
    [shouldMirrorArm, selectedPunctureTarget, mirrorTargetX],
  )
  const selectedUpperArmTarget = ACCESS_GAME_TARGETS.upperArmBySide[selectedSide]
  const displayUpperArmTarget = useMemo(
    () => (shouldMirrorArm ? mirrorTargetX(selectedUpperArmTarget) : selectedUpperArmTarget),
    [shouldMirrorArm, selectedUpperArmTarget, mirrorTargetX],
  )
  const accessArmImage = accessProcedure.tourniquetOn
    ? armWithTourniquetAsset
    : (String(patient?.gender || '').toLowerCase().startsWith('w') ? armFemaleAsset : armAsset)
  const viggoByGauge = useMemo(() => ({
    '14G': viggo14gAsset,
    '16G': viggo16gAsset,
    '18G': viggo18gAsset,
    '20G': viggo20gAsset,
    '22G': viggo22gAsset,
  }), [])
  const selectedViggoAsset = viggoByGauge[String(selectedAccessType.gauge || '18G').toUpperCase()] || viggo18gAsset
  const accessTools = useMemo(() => ({
    disinfect: { id: 'disinfect', label: 'Desinfektion', image: disinfectantAsset },
    swab: { id: 'swab', label: 'Tupfer', image: swabAsset },
    tourniquet: { id: 'tourniquet', label: 'Stauschlauch', image: tourniquetAsset },
    viggo: { id: 'viggo', label: `Viggo ${selectedAccessType.gauge}`, image: selectedViggoAsset },
    plaster: { id: 'plaster', label: 'Pflaster', image: accessPlasterAsset },
  }), [selectedAccessType.gauge, selectedViggoAsset])
  const accessToolOrder = ['disinfect', 'swab', 'tourniquet', 'viggo', 'plaster']
  const accessChecklistState = useMemo(() => ({
    dis1: accessProcedure.disinfectionCount >= 1,
    swab: accessProcedure.swabDone,
    dis2: accessProcedure.disinfectionCount >= 2,
    tourniquetOn: accessProcedure.tourniquetOn || accessProcedure.viggoPlaced,
    viggo: accessProcedure.viggoPlaced,
    tourniquetOff: accessProcedure.viggoPlaced && !accessProcedure.tourniquetOn,
    plaster: accessProcedure.plasterDone,
  }), [accessProcedure])
  const accessActiveInstruction = useMemo(() => {
    if (accessProcedure.disinfectionCount === 0) return 'Punktionsstelle desinfizieren.'
    if (!accessProcedure.swabDone) return 'Mit Tupfer über die Punktionsstelle wischen.'
    if (accessProcedure.disinfectionCount < 2) return 'Erneut desinfizieren.'
    if (!accessProcedure.tourniquetOn) return 'Stauschlauch anlegen (auch früher erlaubt).'
    if (!accessProcedure.viggoPlaced) return `Viggo ${selectedAccessType.gauge} legen.`
    if (accessProcedure.tourniquetOn) return 'Stauschlauch wieder lösen.'
    if (!accessProcedure.plasterDone) return 'Pflaster aufkleben.'
    return 'Zugang vollständig gelegt.'
  }, [accessProcedure, selectedAccessType.gauge])
  const effectiveViggoScale = clamp(Number(ACCESS_OVERLAY_TUNING.viggoScale || 1), 0.45, 1.85)
  const effectiveViggoWidth = clamp(Math.round((ACCESS_OVERLAY_TUNING.viggoBaseWidth || 128) * effectiveViggoScale), 52, 240)
  const effectiveViggoHeight = clamp(Math.round((ACCESS_OVERLAY_TUNING.viggoBaseHeight || 92) * effectiveViggoScale), 40, 190)
  const placedViggoRotationDeg = shouldMirrorArm ? ACCESS_OVERLAY_TUNING.viggoRotationLeftDeg : ACCESS_OVERLAY_TUNING.viggoRotationRightDeg
  const shouldMirrorPlacedViggo = selectedSide === 'right'
  const placedViggoTranslateX = selectedSide === 'right' ? ACCESS_OVERLAY_TUNING.viggoTranslateXPercentRight : ACCESS_OVERLAY_TUNING.viggoTranslateXPercentLeft
  const placedViggoTranslateY = selectedSide === 'right' ? ACCESS_OVERLAY_TUNING.viggoTranslateYPercentRight : ACCESS_OVERLAY_TUNING.viggoTranslateYPercentLeft
  const placedPlasterRotationDeg = selectedSide === 'right' ? ACCESS_OVERLAY_TUNING.plasterRotationRightDeg : ACCESS_OVERLAY_TUNING.plasterRotationLeftDeg
  const pushStep = useCallback((label) => {
    if (!label) return
    const ts = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setStepLog(prev => [{ id: Date.now() + Math.random(), text: label, ts }, ...prev].slice(0, 12))
  }, [])

  const findScrollParent = useCallback((el) => {
    let node = el?.parentElement || null
    while (node) {
      const style = window.getComputedStyle(node)
      const canScroll = /(auto|scroll)/.test(String(style?.overflowY || ''))
      if (canScroll && node.scrollHeight > node.clientHeight) return node
      node = node.parentElement
    }
    return null
  }, [])
  const resetAccessProcedure = useCallback(() => {
    setAccessProcedure({
      disinfectionCount: 0,
      swabDone: false,
      tourniquetOn: false,
      viggoPlaced: false,
      plasterDone: false,
    })
    setAccessAttachedToolId(null)
    setAccessHint('')
  }, [])
  const openAccessModal = useCallback(() => {
    setAccessDraft((prev) => ({ ...prev, stage: 'setup' }))
    resetAccessProcedure()
    setShowAccessModal(true)
  }, [resetAccessProcedure])
  const startAccessProcedure = useCallback(() => {
    setAccessDraft((prev) => ({ ...prev, stage: 'procedure' }))
    resetAccessProcedure()
    setAccessHint(`Vorbereitung abgeschlossen: ${selectedAccessType.gauge} an ${selectedAccessSite.label}.`)
  }, [resetAccessProcedure, selectedAccessType.gauge, selectedAccessSite.label])
  const closeAccessModal = useCallback(() => {
    setShowAccessModal(false)
    setAccessDraft((prev) => ({ ...prev, stage: 'setup' }))
    resetAccessProcedure()
  }, [resetAccessProcedure])
  const attachAccessTool = useCallback((toolId) => {
    if (accessDraft.stage !== 'procedure') return
    setAccessAttachedToolId(toolId)
    setAccessHint(`"${accessTools[toolId]?.label || toolId}" ausgewählt. Auf den Arm klicken.`)
  }, [accessDraft.stage, accessTools])
  const validateAccessHit = useCallback((targetName, pos) => {
    const target = targetName === 'punctureSite' ? displayPunctureTarget : displayUpperArmTarget
    if (!target) return false
    return distance(pos, target) <= target.r
  }, [displayPunctureTarget, displayUpperArmTarget])
  const placeAccessToolOnArm = useCallback((event) => {
    if (accessDraft.stage !== 'procedure' || !accessAttachedToolId || !accessCanvasRef.current) {
      setAccessHint('Bitte zuerst ein Instrument auf dem Tablett auswählen.')
      return
    }
    const rect = accessCanvasRef.current.getBoundingClientRect()
    const pos = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
    const fail = (message) => { setAccessHint(message); return false }
    if (accessAttachedToolId === 'tourniquet') {
      if (!validateAccessHit('upperArm', pos)) return fail('Stauschlauch bitte am Oberarm anlegen/abnehmen.')
      if (!accessProcedure.tourniquetOn) {
        setAccessProcedure((prev) => ({ ...prev, tourniquetOn: true }))
        setAccessHint('Stauschlauch angelegt.')
      } else {
        if (!accessProcedure.viggoPlaced) return fail('Stauschlauch erst nach gelegter Viggo entfernen.')
        setAccessProcedure((prev) => ({ ...prev, tourniquetOn: false }))
        setAccessHint('Stauschlauch entfernt.')
      }
      setAccessAttachedToolId(null)
      return
    }
    if (accessAttachedToolId === 'disinfect') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Bitte direkt an der Punktionsstelle desinfizieren.')
      playOneShot(spraySound, { volume: 0.42, maxDurationMs: 1700 })
      if (accessProcedure.disinfectionCount === 0) {
        setAccessProcedure((prev) => ({ ...prev, disinfectionCount: 1 }))
        setAccessHint('Erste Desinfektion abgeschlossen.')
      } else if (accessProcedure.disinfectionCount === 1 && accessProcedure.swabDone) {
        setAccessProcedure((prev) => ({ ...prev, disinfectionCount: 2 }))
        setAccessHint('Zweite Desinfektion abgeschlossen.')
      } else return fail('Reihenfolge: Desinfizieren -> Wischen -> erneut desinfizieren.')
      setAccessAttachedToolId(null)
      return
    }
    if (accessAttachedToolId === 'swab') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Tupfer bitte über die Punktionsstelle führen.')
      if (accessProcedure.disinfectionCount < 1) return fail('Vorher einmal desinfizieren.')
      if (accessProcedure.swabDone) return fail('Wisch-Schritt ist bereits erledigt.')
      setAccessProcedure((prev) => ({ ...prev, swabDone: true }))
      setAccessHint('Punktionsstelle gewischt.')
      setAccessAttachedToolId(null)
      return
    }
    if (accessAttachedToolId === 'viggo') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Viggo bitte exakt an der Punktionsstelle legen.')
      if (accessProcedure.disinfectionCount < 2 || !accessProcedure.swabDone) return fail('Vorher: Desinfizieren -> Wischen -> Desinfizieren.')
      if (!accessProcedure.tourniquetOn) return fail('Vor dem Legen zuerst stauen.')
      if (accessProcedure.viggoPlaced) return fail('Viggo ist bereits gelegt.')
      setAccessProcedure((prev) => ({ ...prev, viggoPlaced: true }))
      setAccessHint(`Viggo ${selectedAccessType.gauge} erfolgreich gelegt.`)
      setAccessAttachedToolId(null)
      return
    }
    if (accessAttachedToolId === 'plaster') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Pflaster bitte auf die Punktionsstelle setzen.')
      if (!accessProcedure.viggoPlaced) return fail('Erst Viggo legen.')
      if (accessProcedure.tourniquetOn) return fail('Vor dem Pflaster bitte erst entstauen.')
      if (accessProcedure.plasterDone) return fail('Pflaster wurde bereits gesetzt.')
      setAccessProcedure((prev) => ({ ...prev, plasterDone: true }))
      setAccessHint('Pflaster angelegt. Zugang erfolgreich gesichert.')
      setAccessAttachedToolId(null)
    }
  }, [
    accessDraft.stage,
    accessAttachedToolId,
    validateAccessHit,
    accessProcedure.disinfectionCount,
    accessProcedure.swabDone,
    accessProcedure.tourniquetOn,
    accessProcedure.viggoPlaced,
    accessProcedure.plasterDone,
    selectedAccessType.gauge,
  ])
  const finalizeAccessPlacement = useCallback(() => {
    if (!accessProcedure.plasterDone || accessProcedure.tourniquetOn) return
    if (!accessDraft.typeId || !accessDraft.siteId || !selectedAccessType?.gauge) return
    const actionName = `Venöser Zugang gelegt (${selectedAccessType.gauge}, ${selectedAccessSite.label})`
    onAction?.('iv_access_place', actionName, 3, 9, {
      accessTypeId: accessDraft.typeId,
      gauge: selectedAccessType.gauge,
      site: selectedAccessSite.label,
    })
    setStatusHint(`Zugang gelegt (${selectedAccessType.gauge}, ${selectedAccessSite.label}).`)
    pushStep(`Zugang gelegt (${selectedAccessType.gauge}, ${selectedAccessSite.label})`)
    closeAccessModal()
  }, [accessProcedure.plasterDone, accessProcedure.tourniquetOn, accessDraft.typeId, accessDraft.siteId, selectedAccessType?.gauge, selectedAccessSite.label, onAction, closeAccessModal, pushStep])
  const handleResusMedicationUse = useCallback((medId, medName, requestedPatientId, administration = {}) => {
    const targetId = requestedPatientId || patientId
    const res = onResusGiveMedication?.(targetId, medId, String(administration?.doseLabel || '').trim() || null, administration)
    if (res?.success) {
      const medLabel = medName || medId
      const doseLabel = String(administration?.doseLabel || '').trim()
      setStatusHint(`${medLabel}${doseLabel ? ` (${doseLabel})` : ''} gegeben.`)
      pushStep(`${medLabel}${doseLabel ? ` (${doseLabel})` : ''} gegeben`)
    } else if (res?.message) {
      setStatusHint(formatResusError(res, 'medication'))
    }
    return res
  }, [onResusGiveMedication, patientId, formatResusError, pushStep])

  const closestScrollable = useCallback((el) => {
    let node = el
    while (node) {
      if (!(node instanceof HTMLElement)) {
        node = node?.parentElement || null
        continue
      }
      const style = window.getComputedStyle(node)
      const canScroll = /(auto|scroll)/.test(String(style?.overflowY || ''))
      if (canScroll && node.scrollHeight > node.clientHeight) return node
      node = node.parentElement
    }
    return null
  }, [])

  useEffect(() => {
    if (!scrollDebugOpen) return undefined
    const root = rootRef.current
    if (!root) return undefined
    const parent = findScrollParent(root)
    scrollParentRef.current = parent
    if (!parent) return undefined

    const updateBase = () => {
      const nestedScrollableCount = Array.from(root.querySelectorAll('*')).filter((node) => {
        if (!(node instanceof HTMLElement)) return false
        const style = window.getComputedStyle(node)
        const canScroll = /(auto|scroll)/.test(String(style?.overflowY || ''))
        return canScroll && node.scrollHeight > node.clientHeight
      }).length
      setScrollDebug((prev) => ({
        ...prev,
        parentTag: parent.tagName || '-',
        parentClass: parent.className || '-',
        parentTop: Math.round(parent.scrollTop || 0),
        parentClient: Math.round(parent.clientHeight || 0),
        parentHeight: Math.round(parent.scrollHeight || 0),
        nestedScrollableCount,
      }))
    }

    const onParentScroll = () => updateBase()
    const onWheel = (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      const nested = closestScrollable(target)
      setScrollDebug((prev) => ({
        ...prev,
        wheelDeltaY: Math.round(Number(event.deltaY || 0)),
        wheelTarget: target ? `${target.tagName.toLowerCase()}.${String(target.className || '').split(' ').slice(0, 2).join('.')}` : '-',
        wheelNested: nested ? `${nested.tagName.toLowerCase()}.${String(nested.className || '').split(' ').slice(0, 2).join('.')}` : '-',
        wheelTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }))
      updateBase()
    }

    updateBase()
    parent.addEventListener('scroll', onParentScroll, { passive: true })
    root.addEventListener('wheel', onWheel, { passive: true, capture: true })
    return () => {
      parent.removeEventListener('scroll', onParentScroll)
      root.removeEventListener('wheel', onWheel, true)
    }
  }, [scrollDebugOpen, findScrollParent, closestScrollable])

  return (
    <div ref={rootRef} className="p-4 space-y-3">
      <ResusMonitor
        active={active}
        isDead={isDead}
        rhythm={rhythm}
        resusStatus={resus?.status}
        displayedHr={displayedHr}
        displayedSpo2={displayedSpo2}
        displayedAf={displayedAf}
        displayedBp={displayedBp}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Defibrillator
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const idx = DEFIB_ENERGIES.indexOf(energy)
              setEnergy(DEFIB_ENERGIES[Math.max(0, idx - 1)])
            }}
            className="btn-secondary text-xs"
          >
            -J
          </button>
          <p className="text-sm font-bold text-amber-800 min-w-16 text-center">{energy}J</p>
          <button
            onClick={() => {
              const idx = DEFIB_ENERGIES.indexOf(energy)
              setEnergy(DEFIB_ENERGIES[Math.min(DEFIB_ENERGIES.length - 1, idx + 1)])
            }}
            className="btn-secondary text-xs"
          >
            +J
          </button>
          <button
            onClick={() => {
              const res = onResusAnalyze?.(patientId)
              if (res?.success) {
                setAnalysis(res)
                setStatusHint(res.recommendation || '')
                pushStep(`Rhythmusanalyse: ${String(res.rhythm || '').toUpperCase()}`)
              } else if (res?.message) {
                setStatusHint(formatResusError(res, 'analyze'))
              }
            }}
            className="btn-secondary text-xs ml-auto"
            disabled={!canDefibControls}
          >
            Analysieren
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const res = onResusCharge?.(patientId, energy)
              if (!res?.success) {
                setStatusHint(formatResusError(res, 'charge'))
                return
              }
              setCharging(true)
              setStatusHint(`Defi laedt (${energy}J)...`)
              setTimeout(() => {
                setCharging(false)
                setCharged(true)
                setStatusHint(`Defi geladen (${energy}J).`)
                pushStep(`Defibrillator geladen (${energy}J)`)
              }, 1400)
            }}
            className="btn-secondary text-xs"
            disabled={!canDefibControls || charged || charging}
          >
            {charging ? 'Laedt...' : 'Laden'}
          </button>
          <button
            onClick={() => {
              if (shockPending) return
              setShockPending(true)
              setStatusHint(`Schock wird vorbereitet (${energy}J)...`)
              playOneShot(defibrillatorSound, { volume: 0.25 })
              if (shockTimeoutRef.current) clearTimeout(shockTimeoutRef.current)
              shockTimeoutRef.current = setTimeout(() => {
                const res = onResusShock?.(patientId, energy)
                setShockPending(false)
                setCharged(false)
                if (res?.success) {
                  setStatusHint(res.shockable ? 'Schock abgegeben.' : 'Schock bei nicht-schockbarem Rhythmus.')
                  pushStep(`Schock abgegeben (${energy}J)`)
                } else if (res?.message) {
                  setStatusHint(formatResusError(res, 'shock'))
                }
              }, 2000)
            }}
            className={`text-xs px-3 py-2 rounded-lg font-semibold ${canShock ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-surface-200 text-surface-500'}`}
            disabled={!canShock}
          >
            {shockPending ? 'Schock läuft...' : 'SCHOCK'}
          </button>
        </div>
        {analysis?.success && (
          <p className={`text-xs ${analysis.shockable ? 'text-red-700' : 'text-surface-700'}`}>
            Analyse: {String(analysis.rhythm || '').toUpperCase()} - {analysis.recommendation}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
        <button
          onClick={() => {
            const next = !resus?.cprActive
            const res = onResusToggleCpr?.(patientId, next)
            if (res?.success) {
              setStatusHint(next ? 'Herzdruckmassage gestartet.' : 'Herzdruckmassage pausiert.')
              pushStep(next ? 'CPR gestartet' : 'CPR pausiert')
            }
            else if (res?.message) setStatusHint(formatResusError(res, 'cpr'))
          }}
          disabled={!active}
          className={`w-full text-sm px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            resus?.cprActive ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white border border-rose-200 text-rose-700'
          } disabled:opacity-50`}
        >
          <HeartPulse className="w-3 h-3" />
          {resus?.cprActive ? 'Herzdruckmassage stoppen' : 'Herzdruckmassage starten'}
        </button>
        <button
          onClick={() => {
            if (!resusAbortConfirm) {
              setResusAbortConfirm(true)
              return
            }
            const res = onAbortResuscitation?.(patientId)
            if (res?.success) {
              setResusAbortConfirm(false)
              setStatusHint('Reanimation beendet, Tod festgestellt.')
              pushStep('Reanimation beendet / Tod festgestellt')
            } else if (res?.message) {
              setStatusHint(formatResusError(res, 'abort'))
            }
          }}
          disabled={!active}
          className={`mt-2 w-full text-sm px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            resusAbortConfirm ? 'bg-slate-700 text-white hover:bg-slate-800' : 'bg-white border border-slate-300 text-slate-700'
          } disabled:opacity-50`}
        >
          <AlertTriangle className="w-3 h-3" />
          {resusAbortConfirm ? 'Bestätigen: Reanimation beenden' : 'Reanimation beenden (Tod feststellen)'}
        </button>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5" /> Atemweg / Beatmung
        </p>
        <div className="rounded-xl border border-teal-200 bg-white p-2.5 text-[11px] text-teal-800">{airwaySummary}</div>
        <button onClick={() => setShowAirwayModal(true)} className="btn-secondary text-xs w-full">Atemwegsmenü öffnen</button>
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5" /> Absaugung
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onAction?.('oral_suction', 'Oral absaugen', 2, 6)
              setStatusHint('Mund-/Rachensekret abgesaugt.')
              pushStep('Oral abgesaugt')
            }}
            className="btn-secondary text-xs"
            disabled={!patientId}
          >
            Oral
          </button>
          <button
            onClick={() => {
              onAction?.('endo_suction', 'Endotracheal absaugen', 3, 8)
              setStatusHint('Endotracheal abgesaugt.')
              pushStep('Endotracheal abgesaugt')
            }}
            className="btn-secondary text-xs"
            disabled={!patientId}
          >
            Endotracheal
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide flex items-center gap-1.5">
          <Syringe className="w-3.5 h-3.5" /> Reanimationsmedikation
        </p>
        <p className="text-[11px] text-surface-700">
          Neues Medikationssystem mit Vorbereitung, variabler Dosis und Teilgaben für Notfallmedikamente.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResusMedModal(true)}
            className="btn-secondary text-xs"
            disabled={!patientId}
          >
            Notfallmedikation öffnen
          </button>
          <span className="text-[11px] text-surface-600">
            Bestand: {RESUS_MEDS.map((med) => `${med.label} ${Math.max(0, Number(emergencyMedicationInventory?.[med.id] || 0))}`).join(' • ')}
          </span>
        </div>
        {!hasActiveAccess && <p className="text-[11px] text-amber-700">Kein i.v.-Zugang aktiv: Reanimationsmedikation gesperrt.</p>}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5" /> Infusion / Transfusion
        </p>
        <div className="rounded-xl border border-blue-200 bg-white p-2.5">
          <p className="text-[11px] text-surface-600 mb-1">Rate</p>
          <div className="flex items-center gap-2">
            <input type="range" min={100} max={5000} step={50} value={fluidRate} onChange={(e) => setFluidRate(Number(e.target.value || 1200))} className="flex-1" />
            <span className="text-[11px] font-semibold text-blue-800 w-20 text-right">{fluidRate} ml/h</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {RESUS_FLUIDS.map((item) => {
            const blockedByAccess = !hasActiveAccess
            const blockedByBedside = item.kind === 'transfusion' && !bedsideTestOk
            const disabled = !active || blockedByAccess || blockedByBedside
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.kind === 'transfusion' && !bedsideTestOk) return
                  const usedRate = item.kind === 'transfusion'
                    ? Math.min(1200, Math.max(100, Number(fluidRate || 1200)))
                    : Math.min(5000, Math.max(100, Number(fluidRate || 1200)))
                  onAction?.(item.id, `${item.label} (${usedRate} ml/h)`, 1, item.kind === 'transfusion' ? 7 : 4)
                  if (item.kind === 'transfusion') setBedsideTestOk(false)
                  pushStep(`${item.label} gestartet (${usedRate} ml/h)`)
                  setStatusHint(`${item.label} gestartet (${usedRate} ml/h).`)
                }}
                disabled={disabled}
                className="w-full text-xs px-2.5 py-2 rounded-lg border bg-white border-blue-200 text-blue-800 disabled:opacity-45 text-left"
              >
                {item.kind === 'transfusion' ? <TestTube2 className="w-3.5 h-3.5 inline mr-1.5" /> : <Droplets className="w-3.5 h-3.5 inline mr-1.5" />}
                {item.label}
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-surface-700">
          <input type="checkbox" checked={bedsideTestOk} onChange={(e) => setBedsideTestOk(e.target.checked)} />
          Bedside-Test für Transfusion durchgeführt
        </label>
        {!hasActiveAccess && <p className="text-[11px] text-amber-700">Kein i.v.-Zugang aktiv: Infusionen/Transfusionen gesperrt.</p>}
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Zugang</p>
        <div className="rounded-xl border border-violet-200 bg-white p-2">
          <p className="text-[11px] text-surface-500 mb-1">Aktive Zugaenge</p>
          <p className="text-[11px] text-surface-700">{accessLabel}</p>
        </div>
        <button
          onClick={openAccessModal}
          className="btn-secondary text-xs"
        >
          Zugangs-Minigame starten
        </button>
      </div>
      {showResusMedModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowResusMedModal(false)} />
          <div className="relative w-full max-w-5xl h-[86vh] rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-surface-900">Notfallmedikation (Reanimation)</p>
              <button onClick={() => setShowResusMedModal(false)} className="btn-secondary text-xs">Schließen</button>
            </div>
            <div className="h-[calc(86vh-52px)]">
              <MedicationPanel
                patient={patient}
                inventory={emergencyMedicationInventory}
                userRank={userRank || 'assistenzarzt'}
                onUseMedication={handleResusMedicationUse}
              />
            </div>
          </div>
        </div>
      )}
      {showAccessModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeAccessModal} />
          <div className="relative w-full max-w-6xl h-[88vh] rounded-2xl border border-violet-200 bg-white shadow-2xl overflow-hidden flex flex-col" onMouseMove={(e) => setAccessCursorPos({ x: e.clientX, y: e.clientY })}>
            <div className="px-4 py-2.5 border-b border-violet-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-surface-900">Venösen Zugang legen (Notfallwagen)</p>
                <p className="text-xs text-surface-500">Gleiches Minigame-Prinzip wie im KH</p>
              </div>
              <button onClick={closeAccessModal} className="btn-secondary text-xs">Schließen</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {accessDraft.stage === 'setup' ? (
                <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-5">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                      <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide mb-2">Zugangstyp / Viggo</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ACCESS_TYPES.map((type) => {
                          const activeType = accessDraft.typeId === type.id
                          const previewByGauge = { '14G': viggo14gAsset, '16G': viggo16gAsset, '18G': viggo18gAsset, '20G': viggo20gAsset, '22G': viggo22gAsset }
                          return (
                            <button
                              key={type.id}
                              onClick={() => setAccessDraft((prev) => ({ ...prev, typeId: type.id, gauge: type.gauge }))}
                              className={`rounded-xl border p-2 text-left transition ${activeType ? 'border-violet-500 ring-2 ring-violet-200 bg-white' : 'border-violet-200 bg-white hover:border-violet-400'}`}
                            >
                              <img src={previewByGauge[type.gauge]} alt={type.label} className="w-full h-16 object-contain mb-1" />
                              <p className="text-xs font-semibold text-surface-800">{type.label}</p>
                              <p className="text-[10px] text-surface-500">{type.hint}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-violet-200 bg-white p-3">
                      <p className="text-xs text-surface-600 mb-1">Auswahl</p>
                      <p className="text-sm font-semibold text-surface-900">{selectedAccessType.label} · {selectedAccessSite.label}</p>
                      <p className="text-[11px] text-surface-500 mt-1">Ablauf: Desinfizieren, Wischen, Desinfizieren, Stauen, Viggo legen, Entstauen, Pflaster.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide mb-2">Punktionsstelle</p>
                    <div className="relative h-80 rounded-xl border border-violet-200 bg-white overflow-hidden">
                      <img src={armAsset} alt="Arm Vorschau" className="absolute inset-0 m-auto h-[92%] object-contain select-none pointer-events-none" style={{ transform: shouldMirrorArm ? 'scaleX(-1)' : 'none' }} draggable={false} />
                      {ACCESS_SITE_OPTIONS.map((siteOpt) => {
                        const selected = accessDraft.siteId === siteOpt.id
                        const markerX = shouldMirrorArm ? (100 - siteOpt.x) : siteOpt.x
                        return (
                          <div
                            key={siteOpt.id}
                            style={{ left: `${markerX}%`, top: `${siteOpt.y}%` }}
                            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 pointer-events-none ${selected ? 'bg-emerald-500 border-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.22)]' : 'bg-white border-violet-300'}`}
                          />
                        )
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ACCESS_SITE_OPTIONS.map((siteOpt) => {
                        const selected = accessDraft.siteId === siteOpt.id
                        return (
                          <button
                            key={`selector-${siteOpt.id}`}
                            onClick={() => setAccessDraft((prev) => ({ ...prev, siteId: siteOpt.id }))}
                            className={`h-9 rounded-lg border text-[11px] font-medium px-2.5 text-left transition ${selected ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-violet-300 text-violet-700 hover:bg-violet-100'}`}
                          >
                            {siteOpt.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button onClick={startAccessProcedure} className="btn-primary text-sm">Minigame starten</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid xl:grid-cols-[1fr_360px] gap-5">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-surface-900">{selectedAccessType.label} · {selectedAccessSite.label}</p>
                      <button onClick={() => setAccessDraft((prev) => ({ ...prev, stage: 'setup' }))} className="text-xs px-2 py-1 rounded bg-white border border-surface-200 hover:bg-surface-50">Auswahl ändern</button>
                    </div>
                    <div ref={accessCanvasRef} className="relative rounded-2xl border border-violet-200 bg-white overflow-hidden min-h-[470px] cursor-crosshair" onClick={placeAccessToolOnArm}>
                      <img src={accessArmImage} alt="Arm" className="absolute inset-0 w-full h-full object-contain p-2" style={{ transform: shouldMirrorArm ? 'scaleX(-1)' : 'none' }} draggable={false} />
                      {accessProcedure.viggoPlaced && (
                        <img
                          src={selectedViggoAsset}
                          alt="Viggo gelegt"
                          className="absolute object-contain pointer-events-none drop-shadow-md"
                          style={{
                            left: `${displayPunctureTarget.x}%`,
                            top: `${displayPunctureTarget.y}%`,
                            width: `${effectiveViggoWidth}px`,
                            height: `${effectiveViggoHeight}px`,
                            transform: `translate(${placedViggoTranslateX}%, ${placedViggoTranslateY}%) rotate(${placedViggoRotationDeg}deg) scaleX(${shouldMirrorPlacedViggo ? -1 : 1})`,
                          }}
                        />
                      )}
                      {accessProcedure.plasterDone && (
                        <img
                          src={accessPlasterAsset}
                          alt="Pflaster"
                          className="absolute object-contain pointer-events-none drop-shadow-sm"
                          style={{
                            left: `${displayPunctureTarget.x}%`,
                            top: `${displayPunctureTarget.y}%`,
                            width: `${ACCESS_OVERLAY_TUNING.plasterWidth}px`,
                            height: `${ACCESS_OVERLAY_TUNING.plasterHeight}px`,
                            transform: `translate(${ACCESS_OVERLAY_TUNING.plasterTranslateXPercent}%, ${ACCESS_OVERLAY_TUNING.plasterTranslateYPercent}%) rotate(${placedPlasterRotationDeg}deg)`,
                          }}
                        />
                      )}
                      <div className="absolute w-6 h-6 rounded-full border-2 border-rose-500 bg-rose-100/60 pointer-events-none" style={{ left: `${displayPunctureTarget.x}%`, top: `${displayPunctureTarget.y}%`, transform: 'translate(-50%, -50%)' }} />
                      <div className="absolute w-10 h-10 rounded-full border border-indigo-400 bg-indigo-100/45 pointer-events-none" style={{ left: `${displayUpperArmTarget.x}%`, top: `${displayUpperArmTarget.y}%`, transform: 'translate(-50%, -50%)' }} />
                    </div>
                    <p className="mt-2 text-xs text-surface-600">{accessHint || accessActiveInstruction}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-surface-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-surface-700 mb-2">Tablett</p>
                      <div className="space-y-2">
                        {accessToolOrder.map((toolId) => {
                          const tool = accessTools[toolId]
                          const activeTool = accessAttachedToolId === toolId
                          return (
                            <button
                              key={toolId}
                              onClick={() => attachAccessTool(toolId)}
                              className={`w-full rounded-xl border px-2.5 py-2 text-left flex items-center gap-2 transition ${activeTool ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-surface-200 bg-surface-50 hover:bg-white'}`}
                            >
                              <img src={tool.image} alt={tool.label} className="w-20 h-14 object-contain" />
                              <div>
                                <p className="text-xs font-semibold text-surface-800">{tool.label}</p>
                                <p className="text-[10px] text-surface-500">Zum Arm bewegen und klicken</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={finalizeAccessPlacement}
                        disabled={!accessProcedure.plasterDone || accessProcedure.tourniquetOn}
                        className="mt-3 w-full text-sm px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Zugang final bestätigen
                      </button>
                    </div>
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">Checkliste</p>
                      <div className="space-y-1.5">
                        {ACCESS_GAME_CHECKLIST.map((step) => (
                          <div key={step.id} className={`flex items-center gap-2 text-xs ${accessChecklistState[step.id] ? 'text-emerald-700' : 'text-surface-600'}`}>
                            <div className={`w-4 h-4 rounded-full border ${accessChecklistState[step.id] ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-surface-300'}`} />
                            <span>{step.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {accessAttachedToolId && accessDraft.stage === 'procedure' && (
              <div className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: accessCursorPos.x, top: accessCursorPos.y }}>
                <img src={accessTools[accessAttachedToolId]?.image} alt={accessTools[accessAttachedToolId]?.label || accessAttachedToolId} className={`object-contain drop-shadow-lg ${accessAttachedToolId === 'viggo' ? 'w-44 h-32' : 'w-24 h-20'}`} />
              </div>
            )}
          </div>
        </div>
      )}

      {statusHint && (
        <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-2.5 py-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {statusHint}
        </p>
      )}
      {active && (
        <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5 space-y-1.5">
          <p className="text-[11px] text-surface-600 flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" /> Rea läuft seit: <span className="font-semibold">{stopwatchLabel}</span>
          </p>
          <p className="text-[11px] text-surface-600">Zyklen: {Number(resus?.cycles || 0)}</p>
          <div className="rounded-lg border border-surface-200 bg-white p-2 space-y-1">
            {stepLog.length === 0 ? (
              <p className="text-[11px] text-surface-400">Noch keine dokumentierten Schritte.</p>
            ) : stepLog.map(item => (
              <p key={item.id} className="text-[11px] text-surface-700">
                <span className="text-surface-400">{item.ts}</span> - {item.text}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-xl border border-surface-200 bg-white p-2.5">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAudioDebugOpen((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200"
          >
            Audio-Debug {audioDebugOpen ? 'ausblenden' : 'anzeigen'}
          </button>
          <button
            onClick={() => setScrollDebugOpen((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          >
            Scroll-Debug {scrollDebugOpen ? 'ausblenden' : 'anzeigen'}
          </button>
        </div>
        {audioDebugOpen && (
          <div className="mt-2 text-[11px] text-surface-700 space-y-1">
            <p>Resus-Key: <span className="font-mono">{rhythmLoopKey.current}</span></p>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-2 font-mono text-[10px]">
              {audioSnapshot.length === 0 ? (
                <p>keine aktiven loops</p>
              ) : (
                audioSnapshot.map((entry) => (
                  <p key={entry.key}>
                    {entry.key} | {entry.type} | cf={entry.seamCrossfadeSec ?? '-'} | s={entry.startAt ?? '-'} e={entry.endAt ?? '-'}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
        {scrollDebugOpen && (
          <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-[11px] text-indigo-900 space-y-1 font-mono">
            <p>parent: {scrollDebug.parentTag} | top={scrollDebug.parentTop} / max={Math.max(0, scrollDebug.parentHeight - scrollDebug.parentClient)}</p>
            <p>parentClass: {scrollDebug.parentClass || '-'}</p>
            <p>nestedScrollables: {scrollDebug.nestedScrollableCount}</p>
            <p>wheel: dY={scrollDebug.wheelDeltaY} | t={scrollDebug.wheelTime}</p>
            <p>target: {scrollDebug.wheelTarget}</p>
            <p>nestedHit: {scrollDebug.wheelNested}</p>
          </div>
        )}
      </div>
      {showAirwayModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowAirwayModal(false)} />
          <div className="relative w-full max-w-3xl h-[82vh] rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-surface-900">Atemwegs- und Beatmungsmenü</p>
              <button onClick={() => setShowAirwayModal(false)} className="btn-secondary text-xs">Schließen</button>
            </div>
            <div className="h-[calc(82vh-52px)] overflow-y-auto">
              <VentilatorUI
                equipment={{ id: 'ventilator', name: 'Notfallbeatmung' }}
                patient={patient}
                onAction={(actionId, actionName, duration, xpReward, extra = null) => {
                  onAction?.(actionId, actionName, duration, xpReward, extra)
                  pushStep(actionName || actionId)
                }}
                savedState={airwayState}
                onSaveState={setAirwayState}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

