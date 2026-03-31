import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  HelpCircle,
  Layers,
  Radio,
  RefreshCw,
  Stethoscope,
  Syringe,
  Timer,
  ZoomIn,
} from 'lucide-react'
import { getCoronaryLesionForVessel } from '../data/coronaryAngioProfile'
import { ECG_SEGMENT, generateEcgPath, generateCapnographyPath } from '../utils/monitorWaveforms'

/** Unterschiedliche, anatomisch plausiblere Verläufe: RCX kranial-lateral, RIVA apikal, RCA dominant / PDA */
const VESSEL_SPECS = {
  LCA_RCX: {
    main: 'M 7 56 C 16 54 22 52 28 50 C 34 48 38 44 42 40 C 48 34 56 28 66 24 C 76 20 86 17 93 14',
    side: 'M 28 50 C 32 46 36 38 40 32 C 44 27 50 24 56 22',
    lesionT: 0.55,
    lesionW: 0.11,
    bg: { cx: 36, cy: 44, rx: 18, ry: 22, rot: -8 },
    name: 'LCA → RCX',
  },
  LCA_RIVA: {
    main: 'M 7 54 C 18 52 26 54 32 58 C 38 62 42 70 48 78 C 54 86 64 90 76 92 C 84 93 92 94 96 95',
    side: 'M 28 50 C 32 46 36 38 40 32 C 44 27 50 24 56 22',
    lesionT: 0.52,
    lesionW: 0.13,
    bg: { cx: 52, cy: 58, rx: 22, ry: 18, rot: 12 },
    name: 'LCA → RIVA',
  },
  RCA_RPL: {
    main: 'M 5 48 C 18 46 22 50 30 48 C 38 45 44 38 52 34 C 62 30 74 28 88 26 C 92 25 95 22 96 18',
    side: 'M 44 38 C 52 32 62 34 72 38',
    lesionT: 0.58,
    lesionW: 0.1,
    bg: { cx: 48, cy: 42, rx: 20, ry: 24, rot: -5 },
    name: 'RCA → RPL',
  },
  RCA_RIP: {
    main: 'M 5 50 C 20 48 30 52 38 56 C 46 60 52 68 60 74 C 70 72 80 82 90 88 C 93 90 96 92 98 94',
    side: 'M 38 56 C 46 60 52 68 58 76',
    lesionT: 0.54,
    lesionW: 0.12,
    bg: { cx: 58, cy: 64, rx: 16, ry: 20, rot: 6 },
    name: 'RCA → RIP',
  },
}

const WIRE_STEP = 0.07

function parseBp(bp) {
  if (!bp || typeof bp !== 'string' || !bp.includes('/')) return { sys: 128, dia: 78 }
  const [a, b] = bp.split('/').map((x) => Number.parseInt(x, 10))
  return { sys: Number.isFinite(a) ? a : 128, dia: Number.isFinite(b) ? b : 78 }
}

function snapSvgToJpeg(svgEl, jpegQuality = 0.82) {
  if (!svgEl) return Promise.resolve(null)
  const clone = svgEl.cloneNode(true)
  const rect = svgEl.getBoundingClientRect()
  const w = Math.max(320, Math.round(rect.width || 400))
  const h = Math.max(320, Math.round(rect.height || 400))
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const xml = new XMLSerializer().serializeToString(clone)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0)
        resolve(c.toDataURL('image/jpeg', jpegQuality))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0))
}

/** Gleiche EKG-/Pleth-Geometrie wie MonitorUI (KH/RD); Pfade per ref (setAttribute), damit rAF unabhängig von React-Updates zeichnet. */
function HemodynamicsPanel({ monitor, hrBlink, ecgPathRef, plethPathRef, capnoPathRef, alarmActive }) {
  return (
    <div className={`rounded-xl overflow-hidden border shadow-lg transition-all ${alarmActive ? 'border-amber-500/80 ring-1 ring-amber-400/50' : 'border-slate-700/80'}`}>
      <div className="bg-gradient-to-b from-slate-900 via-[#0a1628] to-slate-950 text-cyan-50 px-2 py-1.5 flex items-center justify-between border-b border-cyan-900/40">
        <span className="text-[10px] font-bold tracking-widest text-cyan-400/90 flex items-center gap-1">
          <Radio className="w-3 h-3 animate-pulse text-cyan-300" /> Hämodynamik
        </span>
        <span className="text-[9px] text-cyan-600/90 font-mono">LIVE</span>
      </div>
      <div className="bg-[#0a0e14] p-2 space-y-1.5">
        <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 72 }}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 80" aria-hidden>
            {[...Array(17)].map((_, i) => <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="80" stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 10} x2="400" y2={i * 10} stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
          </svg>
          <svg className="relative w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
            <defs>
              <filter id="hklEcgGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path
              ref={ecgPathRef}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#hklEcgGlow)"
              d="M0,40 L400,40"
            />
          </svg>
          <span className="absolute top-1 left-2 text-[9px] text-green-500/80 font-mono font-bold">II</span>
        </div>

        <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 40 }}>
          <svg className="w-full h-full" viewBox="0 0 400 40" preserveAspectRatio="none">
            <defs>
              <filter id="hklPlethGlow"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path
              ref={plethPathRef}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#hklPlethGlow)"
              d="M0,20 L400,20"
            />
          </svg>
          <span className="absolute top-0.5 left-2 text-[9px] text-cyan-500/80 font-mono font-bold">Pleth</span>
        </div>

        <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 34 }}>
          <svg className="w-full h-full" viewBox="0 0 400 36" preserveAspectRatio="none">
            <path
              ref={capnoPathRef}
              fill="none"
              stroke="#eab308"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M0,30 L400,30"
            />
          </svg>
          <span className="absolute top-0.5 left-2 text-[9px] text-yellow-500/80 font-mono font-bold">CO₂</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px] pt-0.5">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-teal-500/80 text-[9px] uppercase">HF</span>
            <span
              className={`text-lg font-bold tabular-nums text-green-400 transition-transform ${hrBlink ? 'scale-105' : 'scale-100'}`}
              style={{ textShadow: '0 0 12px rgba(34, 197, 94, 0.35)' }}
            >
              {monitor.hr}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-cyan-400/80 text-[9px] uppercase">SpO₂</span>
            <span className="text-lg font-bold tabular-nums text-cyan-400">{monitor.spo2}</span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-yellow-400/80 text-[9px] uppercase">AF</span>
            <span className="tabular-nums text-yellow-300">{monitor.rr}</span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-rose-400/80 text-[9px] uppercase">NIBP</span>
            <span className="tabular-nums text-rose-100 text-[10px]">{monitor.sys}/{monitor.dia}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HklPtcaMinigame({
  contrastMl = 80,
  patient = null,
  patientVitals,
  onClinicalEffect,
  onCapturesChange,
  onSessionLogChange,
  projectionLabel = 'LAO',
}) {
  const [phase, setPhase] = useState('coronary')
  const [coronary, setCoronary] = useState(null)
  const [branch, setBranch] = useState(null)
  const [wireT, setWireT] = useState(0)
  const [contrastBoost, setContrastBoost] = useState(0)
  const [balloonInflated, setBalloonInflated] = useState(false)
  const [balloonDone, setBalloonDone] = useState(false)
  const [stentDone, setStentDone] = useState(false)
  const [captures, setCaptures] = useState([])
  const [fio2, setFio2] = useState(40)
  const [anesthesiaMac, setAnesthesiaMac] = useState(0.9)
  const [fluoroZoom, setFluoroZoom] = useState(100)
  const [nitroActive, setNitroActive] = useState(false)
  const [procSeconds, setProcSeconds] = useState(0)
  const [eventLog, setEventLog] = useState([])
  const [hrBlink, setHrBlink] = useState(false)
  const ecgPathRef = useRef(null)
  const plethPathRef = useRef(null)
  const capnoPathRef = useRef(null)

  const [monitor, setMonitor] = useState(() => {
    const v = patientVitals || {}
    const bp = parseBp(v.bp)
    return {
      hr: Number.isFinite(v.hr) ? v.hr : 76,
      spo2: Number.isFinite(v.spo2) ? v.spo2 : 97,
      rr: Number.isFinite(v.rr) ? v.rr : 12,
      sys: bp.sys,
      dia: bp.dia,
    }
  })

  const pathRef = useRef(null)
  const contrastAnimRef = useRef(null)
  const lastContrastAtRef = useRef(0)
  const fluoroWrapRef = useRef(null)
  const sessionLogRef = useRef([])
  const rafRef = useRef(null)
  const lastFrameRef = useRef(0)
  const ecgPhaseRef = useRef(0)
  const co2PhaseRef = useRef(0)
  const monitorRef = useRef(monitor)
  monitorRef.current = monitor
  const contrastBoostRef = useRef(contrastBoost)
  contrastBoostRef.current = contrastBoost
  const nitroActiveRef = useRef(nitroActive)
  nitroActiveRef.current = nitroActive

  const vesselKey = useMemo(() => {
    if (!coronary || !branch) return 'LCA_RCX'
    return `${coronary}_${branch}`
  }, [coronary, branch])

  const spec = VESSEL_SPECS[vesselKey] || VESSEL_SPECS.LCA_RCX
  const lesion = useMemo(() => getCoronaryLesionForVessel(patient, vesselKey), [patient, vesselKey])
  const LESION_T = lesion.active ? lesion.t : spec.lesionT
  const LESION_WINDOW = lesion.active ? lesion.w : 0.12

  const [wireGeom, setWireGeom] = useState({ x: 50, y: 50, angle: 0 })

  useEffect(() => {
    if (!patientVitals) return
    const bp = parseBp(patientVitals.bp)
    setMonitor((m) => ({
      ...m,
      hr: Number.isFinite(patientVitals.hr) ? patientVitals.hr : m.hr,
      spo2: Number.isFinite(patientVitals.spo2) ? patientVitals.spo2 : m.spo2,
      rr: Number.isFinite(patientVitals.rr) ? patientVitals.rr : m.rr,
      sys: bp.sys,
      dia: bp.dia,
    }))
  }, [patientVitals])

  const pushLog = useCallback((entry) => {
    const row = { t: new Date().toISOString(), ...entry }
    sessionLogRef.current = [...sessionLogRef.current, row]
    onSessionLogChange?.(sessionLogRef.current)
    setEventLog((prev) => [row, ...prev].slice(0, 12))
  }, [onSessionLogChange])

  const vesselBaseOpacity = 0.06 + Math.min(0.09, (contrastMl - 40) / 1600)
  const vesselOpacity = Math.min(1, vesselBaseOpacity + contrastBoost * 0.94)

  const pciEnabled = phase === 'pci' && coronary && branch

  useEffect(() => {
    if (phase !== 'pci') return
    const t = window.setInterval(() => setProcSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [phase])

  /* rAF + direkte path[cath]-Updates wie MonitorUI; ohne React setState pro Frame (vermeidet stehende Kurven bei schwerem Parent-Render). */
  useEffect(() => {
    const tick = (timestamp) => {
      const dtMs = Math.min(48, timestamp - (lastFrameRef.current || timestamp))
      lastFrameRef.current = timestamp
      const m = monitorRef.current
      const hrRaw = Number(m.hr)
      const rrRaw = Number(m.rr)
      const hr = Number.isFinite(hrRaw) ? Math.max(48, Math.min(155, hrRaw)) : 72
      const rr = Number.isFinite(rrRaw) ? Math.max(8, Math.min(28, rrRaw)) : 12
      const beatsPerMs = hr / 60000
      const phasePerMs = beatsPerMs * ECG_SEGMENT.length
      ecgPhaseRef.current = (ecgPhaseRef.current + phasePerMs * dtMs) % ECG_SEGMENT.length
      const nitroScale = nitroActiveRef.current ? 0.88 : 1
      const ischemicScale = contrastBoostRef.current > 0.18 ? 0.94 : 1
      const ecgAmp = nitroScale * ischemicScale
      const ecgD = generateEcgPath(400, 80, ecgPhaseRef.current, ecgAmp)
      const plethD = generateEcgPath(400, 40, ecgPhaseRef.current, 0.5)
      ecgPathRef.current?.setAttribute('d', ecgD)
      plethPathRef.current?.setAttribute('d', plethD)
      co2PhaseRef.current = (co2PhaseRef.current + (dtMs / 1000) * (rr / 60)) % 1
      const capD = generateCapnographyPath(400, 36, co2PhaseRef.current)
      capnoPathRef.current?.setAttribute('d', capD)
      rafRef.current = window.requestAnimationFrame(tick)
    }
    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pciEnabled) return undefined
    const hr = Math.max(1, monitor.hr || 72)
    const interval = window.setInterval(() => setHrBlink(true), 60000 / hr)
    return () => window.clearInterval(interval)
  }, [pciEnabled, monitor.hr])

  useEffect(() => {
    if (!hrBlink) return undefined
    const t = window.setTimeout(() => setHrBlink(false), 200)
    return () => window.clearTimeout(t)
  }, [hrBlink])

  useEffect(() => {
    if (!pciEnabled) return
    const iv = window.setInterval(() => {
      const inWindow = anesthesiaMac >= 0.75 && anesthesiaMac <= 1.15
      const driftHr = (Math.random() - 0.5) * 4 + (inWindow ? 0 : 5)
      const driftSys = (Math.random() - 0.5) * 3 + (inWindow ? 0 : 4)
      const kmPhase = contrastBoost > 0.2 ? 6 : 0
      const nit = nitroActive ? -4 : 0
      setMonitor((m) => ({
        hr: Math.round(Math.max(44, Math.min(130, m.hr + driftHr + kmPhase))),
        spo2: Math.round(Math.max(86, Math.min(100, m.spo2 + (fio2 - 40) * 0.025 + (Math.random() - 0.5) * 0.6))),
        rr: Math.round(Math.max(8, Math.min(28, m.rr + (Math.random() - 0.5) * 1.2))),
        sys: Math.round(Math.max(78, Math.min(195, m.sys + driftSys + nit - (anesthesiaMac > 1.2 ? 3 : 0)))),
        dia: Math.round(Math.max(42, Math.min(108, m.dia + (Math.random() - 0.5) * 1.6 - (anesthesiaMac > 1.2 ? 2 : 0) + nit * 0.4))),
      }))
    }, 420)
    return () => window.clearInterval(iv)
  }, [pciEnabled, anesthesiaMac, fio2, contrastBoost, nitroActive])

  const alarmActive = !pciEnabled ? false : (monitor.spo2 < 92 || monitor.sys < 90 || monitor.hr > 118)

  const runContrastAnimation = useCallback(() => {
    const now = Date.now()
    if (now - lastContrastAtRef.current < 5500) return
    lastContrastAtRef.current = now
    if (contrastAnimRef.current) window.cancelAnimationFrame(contrastAnimRef.current)

    const mlFactor = clamp01((contrastMl - 40) / 140)
    onClinicalEffect?.({
      id: 'hkl_kontrast',
      name: `Kontrastmittel (~${contrastMl} ml, Koronarangiographie)`,
      duration: 2,
      xpReward: 2,
      extra: { contrastMl, modality: 'hkl_ptca' },
    })
    pushLog({ type: 'contrast', ml: contrastMl })

    const tick = (start, frame) => {
      const e = frame - start
      let v = 0
      if (e < 380) v = e / 380
      else if (e < 2400) v = 1
      else if (e < 4200) v = 1 - (e - 2400) / 1800
      else {
        setContrastBoost(0)
        return
      }
      setContrastBoost(v * (0.88 + mlFactor * 0.12))
      contrastAnimRef.current = window.requestAnimationFrame((t2) => tick(start, t2))
    }
    contrastAnimRef.current = window.requestAnimationFrame((t0) => tick(t0, t0))
  }, [contrastMl, onClinicalEffect, pushLog])

  const atLesion = lesion.active && Math.abs(wireT - LESION_T) < LESION_WINDOW
  const canBalloon = pciEnabled && lesion.active && atLesion && wireT > 0.35 && !balloonDone
  const canStent = pciEnabled && lesion.active && balloonDone && atLesion && !stentDone

  const advanceWire = () => {
    if (!pciEnabled) return
    setWireT((t) => {
      const nt = Math.min(1, t + WIRE_STEP)
      pushLog({ type: 'wire_advance', t: nt })
      return nt
    })
  }

  const retractWire = () => {
    if (!pciEnabled) return
    setWireT((t) => {
      const nt = Math.max(0, t - WIRE_STEP)
      pushLog({ type: 'wire_retract', t: nt })
      return nt
    })
  }

  const triggerBalloon = () => {
    if (!canBalloon) return
    setBalloonInflated(true)
    onClinicalEffect?.({ id: 'hkl_ballon', name: 'Ballondilatation (PTCA)', duration: 4, xpReward: 8 })
    pushLog({ type: 'balloon' })
    window.setTimeout(() => {
      setBalloonInflated(false)
      setBalloonDone(true)
    }, 2200)
  }

  const triggerStent = () => {
    if (!canStent) return
    onClinicalEffect?.({ id: 'hkl_stent', name: 'Stentimplantation', duration: 5, xpReward: 10 })
    pushLog({ type: 'stent' })
    setStentDone(true)
  }

  const takeRecording = async () => {
    const svg = fluoroWrapRef.current?.querySelector?.('svg')
    const dataUrl = await snapSvgToJpeg(svg)
    if (!dataUrl) return
    const cap = {
      id: `ptca_cap_${Date.now()}`,
      dataUrl,
      label: `${coronary || 'HKL'} ${branch || ''} · ${projectionLabel} · ${new Date().toLocaleTimeString('de-DE')}`,
      createdAt: new Date().toISOString(),
    }
    setCaptures((c) => {
      const next = [...c, cap]
      onCapturesChange?.(next)
      return next
    })
    pushLog({ type: 'capture', id: cap.id })
  }

  const resetAll = () => {
    if (contrastAnimRef.current) window.cancelAnimationFrame(contrastAnimRef.current)
    setPhase('coronary')
    setCoronary(null)
    setBranch(null)
    setWireT(0)
    setContrastBoost(0)
    setBalloonInflated(false)
    setBalloonDone(false)
    setStentDone(false)
    setCaptures([])
    setProcSeconds(0)
    setEventLog([])
    setNitroActive(false)
    onCapturesChange?.([])
    sessionLogRef.current = []
    onSessionLogChange?.([])
  }

  const goBackStep = () => {
    if (phase === 'pci') {
      if (contrastAnimRef.current) window.cancelAnimationFrame(contrastAnimRef.current)
      setContrastBoost(0)
      setPhase('branch')
      setWireT(0)
      setBalloonInflated(false)
      setBalloonDone(false)
      setStentDone(false)
      setProcSeconds(0)
      pushLog({ type: 'nav_back', to: 'branch' })
    } else if (phase === 'branch') {
      setPhase('coronary')
      setBranch(null)
      setCoronary(null)
      pushLog({ type: 'nav_back', to: 'coronary' })
    }
  }

  useLayoutEffect(() => {
    const el = pathRef.current
    if (!el || !pciEnabled) return
    try {
      const len = el.getTotalLength()
      const pt = el.getPointAtLength(len * wireT)
      const pt2 = el.getPointAtLength(Math.min(len, len * wireT + 1.5))
      const angle = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI
      setWireGeom({ x: pt.x, y: pt.y, angle })
    } catch {
      setWireGeom({ x: 50, y: 50, angle: 0 })
    }
  }, [pciEnabled, spec.main, wireT, phase, coronary, branch, lesion.active, lesion.t])

  const helpText = 'Wähle Koronargefäß und Zielast. Kontrast blendet die Bahn kurz ein. Draht bis zum Engpass; Ballon/Stent dort. Vitalmonitor und Narkose parallel beobachten.'

  const fmtTime = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-3 min-h-0 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-md">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">PCI-Labor · Koronarangiographie</h2>
              <span title={helpText} className="inline-flex text-violet-600 cursor-help"><HelpCircle className="w-4 h-4" /></span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Interventionssimulation — nicht identisch mit klinischen Geräte-Oberflächen.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pciEnabled && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 font-mono text-xs shadow-inner">
              <Timer className="w-3.5 h-3.5" />
              {fmtTime(procSeconds)}
            </div>
          )}
          {(phase === 'branch' || phase === 'pci') && (
            <button type="button" onClick={goBackStep} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-violet-200 transition-colors" title="Vorheriger Schritt">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
          )}
          <button type="button" onClick={resetAll} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-violet-50 hover:border-violet-200 transition-colors" title="Simulation komplett neu starten">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4 min-h-0 flex-1">
        <div className="flex flex-col gap-3 min-w-0 order-2 lg:order-1">
          {phase === 'coronary' && (
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-900 bg-indigo-50/90 border border-indigo-100 flex items-start gap-2">
                <Layers className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <span>Schritt 1: Welche Koronaranatomie soll dargestellt werden?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="group flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-violet-400 hover:shadow-md transition-all text-left"
                  onClick={() => { setCoronary('LCA'); setPhase('branch'); pushLog({ type: 'select_coronary', coronary: 'LCA' }) }}
                >
                  <HeartPulseMini className="text-rose-500" />
                  <span className="font-semibold text-slate-800">Linke Koronararterie</span>
                  <span className="text-[11px] text-slate-500">LCA · Hauptstamm / LM</span>
                </button>
                <button
                  type="button"
                  className="group flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-violet-400 hover:shadow-md transition-all text-left"
                  onClick={() => { setCoronary('RCA'); setPhase('branch'); pushLog({ type: 'select_coronary', coronary: 'RCA' }) }}
                >
                  <Activity className="w-7 h-7 text-sky-500" />
                  <span className="font-semibold text-slate-800">Rechte Koronararterie</span>
                  <span className="text-[11px] text-slate-500">RCA · typ. posterior</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'branch' && coronary === 'LCA' && (
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-2 text-sm text-indigo-900 bg-indigo-50/90 border border-indigo-100">Schritt 2: Zielast der LCA wählen</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-medium hover:from-slate-700 hover:to-slate-800 shadow" onClick={() => { setBranch('RCX'); setPhase('pci'); setWireT(0); pushLog({ type: 'branch', branch: 'RCX' }) }}>RCX — Ramus circumflexus</button>
                <button type="button" className="flex-1 py-3 px-4 rounded-2xl border-2 border-violet-300 bg-violet-50 text-violet-950 text-sm font-medium hover:bg-violet-100" onClick={() => { setBranch('RIVA'); setPhase('pci'); setWireT(0); pushLog({ type: 'branch', branch: 'RIVA' }) }}>RIVA — RIVA / LAD</button>
              </div>
            </div>
          )}

          {phase === 'branch' && coronary === 'RCA' && (
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-2 text-sm text-indigo-900 bg-indigo-50/90 border border-indigo-100">Schritt 2: Zielast der RCA wählen</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" className="flex-1 py-3 px-4 rounded-2xl border-2 border-sky-200 bg-sky-50 text-sky-950 text-sm font-medium hover:bg-sky-100" onClick={() => { setBranch('RPL'); setPhase('pci'); setWireT(0); pushLog({ type: 'branch', branch: 'RPL' }) }}>RPL — posterolateral</button>
                <button type="button" className="flex-1 py-3 px-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-950 text-sm font-medium hover:bg-emerald-100" onClick={() => { setBranch('RIP'); setPhase('pci'); setWireT(0); pushLog({ type: 'branch', branch: 'RIP' }) }}>RIP — interventrikulär posterior</button>
              </div>
            </div>
          )}

          {phase === 'pci' && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 font-mono">{spec.name}</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Zoom {fluoroZoom}%</span>
                  <input type="range" min={85} max={130} value={fluoroZoom} onChange={(e) => setFluoroZoom(Number(e.target.value))} className="w-24 align-middle" />
                </label>
                <button
                  type="button"
                  onClick={() => { setNitroActive((n) => !n); pushLog({ type: 'nitro', active: !nitroActive }) }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border ${nitroActive ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  <Flame className="w-3 h-3" /> NTG sublingual
                </button>
              </div>

              <div ref={fluoroWrapRef} className="relative w-full max-w-lg mx-auto aspect-square bg-black rounded-2xl overflow-hidden ring-2 ring-slate-800/80 shadow-2xl">
                <div
                  className="w-full h-full origin-center transition-transform duration-150"
                  style={{ transform: `scale(${fluoroZoom / 100})` }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full block" aria-label="Fluoroskopie Simulation">
                    <defs>
                      <radialGradient id="fluNoisePtca" cx="50%" cy="50%" r="68%">
                        <stop offset="0%" stopColor="#7a7a7a" />
                        <stop offset="40%" stopColor="#8e8e8e" />
                        <stop offset="100%" stopColor="#3d3d3d" />
                      </radialGradient>
                      <linearGradient id="lumenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f0f0f" />
                        <stop offset="50%" stopColor="#252525" />
                        <stop offset="100%" stopColor="#0a0a0a" />
                      </linearGradient>
                      <filter id="vesselGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="0.25" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <clipPath id="fluoroCirclePtca">
                        <circle cx="50" cy="50" r="46" />
                      </clipPath>
                    </defs>
                    <rect width="100" height="100" fill="#070707" />
                    <g clipPath="url(#fluoroCirclePtca)">
                      <rect x="0" y="0" width="100" height="100" fill="url(#fluNoisePtca)" opacity={0.88} />
                      <g opacity={0.5} transform={`rotate(${spec.bg.rot} ${spec.bg.cx} ${spec.bg.cy})`}>
                        <ellipse cx={String(spec.bg.cx)} cy={String(spec.bg.cy)} rx={String(spec.bg.rx)} ry={String(spec.bg.ry)} fill="#6f6f6f" opacity="0.22" />
                        <ellipse cx={String(100 - spec.bg.cx * 0.4)} cy={String(100 - spec.bg.cy * 0.5)} rx="14" ry="18" fill="#5c5c5c" opacity="0.18" />
                      </g>
                      <path
                        d={spec.side}
                        fill="none"
                        stroke="#303030"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        opacity={vesselOpacity * 0.45}
                      />
                      <path
                        d={spec.main}
                        fill="none"
                        stroke="url(#lumenGrad)"
                        strokeWidth={3.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={vesselOpacity}
                        filter="url(#vesselGlow)"
                      />
                      <path
                        d={spec.main}
                        fill="none"
                        stroke="#4a4a4a"
                        strokeWidth={1}
                        strokeLinecap="round"
                        opacity={vesselOpacity * 0.5}
                        strokeDasharray="1.8 1.2"
                      />
                      {lesion.active && (
                        <path
                          d={spec.main}
                          fill="none"
                          stroke="#050505"
                          strokeWidth={4.8}
                          strokeLinecap="round"
                          opacity={vesselOpacity * 0.92}
                          pathLength="1"
                          strokeDasharray={`${LESION_WINDOW} ${1 - LESION_WINDOW}`}
                          strokeDashoffset={-(LESION_T - LESION_WINDOW / 2)}
                        />
                      )}
                      <path ref={pathRef} d={spec.main} fill="none" stroke="none" />
                      {pciEnabled && (
                        <g transform={`translate(${wireGeom.x},${wireGeom.y}) rotate(${wireGeom.angle})`}>
                          <line x1="-9" y1="0" x2="7" y2="0" stroke="#a5b4fc" strokeWidth="0.75" opacity="0.95" />
                          <circle cx="0" cy="0" r="1.15" fill="#e0e7ff" />
                          {balloonInflated && (
                            <rect x="-2.8" y="-3" width="5.6" height="6" rx="1.4" fill="#fb7185" opacity="0.78" stroke="#fff" strokeWidth="0.15" />
                          )}
                        </g>
                      )}
                      {lesion.active && stentDone && (
                        <path
                          d={spec.main}
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          opacity={0.88}
                          pathLength="1"
                          strokeDasharray="0.07 0.03"
                          strokeDashoffset={-(LESION_T - 0.04)}
                        />
                      )}
                    </g>
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#2a2a2a" strokeWidth="0.75" />
                  </svg>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-between gap-1 text-[9px] text-slate-500 font-mono bg-black/55 px-2 py-1 rounded-lg">
                  <span>Proj. {projectionLabel}</span>
                  <span>KM-Plan {contrastMl} ml</span>
                  <span className={contrastBoost > 0.15 ? 'text-cyan-300' : ''}>{contrastBoost > 0.15 ? 'KM sichtbar' : 'nativ'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" onClick={retractWire} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-300 bg-white text-sm font-medium shadow-sm hover:bg-slate-50">
                  <ChevronLeft className="w-4 h-4" /> Draht zurück
                </button>
                <button type="button" onClick={advanceWire} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium shadow-md hover:from-violet-500 hover:to-indigo-500">
                  Draht vor <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button type="button" onClick={runContrastAnimation} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-950 text-cyan-100 text-[11px] font-semibold hover:bg-cyan-900 shadow-inner border border-cyan-800">
                  <Syringe className="w-4 h-4" /> Kontrast
                </button>
                <button type="button" onClick={takeRecording} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-700 border border-slate-600">
                  <Camera className="w-4 h-4" /> Serie
                </button>
                <button type="button" disabled={!canBalloon} onClick={triggerBalloon} className={`inline-flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border ${canBalloon ? 'bg-white border-rose-300 text-rose-900 hover:bg-rose-50' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  <Droplets className="w-4 h-4" /> Ballon
                </button>
                <button type="button" disabled={!canStent} onClick={triggerStent} className={`inline-flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border ${canStent ? 'bg-white border-emerald-400 text-emerald-900 hover:bg-emerald-50' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  Stent
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/80 p-2 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Draht: <strong className="text-slate-900">{(wireT * 100).toFixed(0)}%</strong></span>
                <span>
                  {!lesion.active
                    ? <span className="text-slate-500">Kein relevanter Engpass in diesem Ast (am Patientenbefund orientiert).</span>
                    : atLesion
                      ? <span className="text-emerald-700 font-medium">Engpass unter Draht — PCI möglich</span>
                      : 'Draht zum Engpass vorfahren'}
                </span>
                <span>Aufnahmen: <strong>{captures.length}</strong></span>
              </div>

              {eventLog.length > 0 && (
                <details className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-2 py-1.5 text-[10px] text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-700">Ereignisprotokoll</summary>
                  <ul className="mt-1 space-y-0.5 max-h-24 overflow-y-auto font-mono">
                    {eventLog.map((e, i) => (
                      <li key={i}>{new Date(e.t).toLocaleTimeString('de-DE')} — {e.type}{e.ml != null ? ` (${e.ml} ml)` : ''}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 order-1 lg:order-2">
          <HemodynamicsPanel
            monitor={monitor}
            hrBlink={hrBlink}
            ecgPathRef={ecgPathRef}
            plethPathRef={plethPathRef}
            capnoPathRef={capnoPathRef}
            alarmActive={alarmActive}
          />

          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-xs shadow-sm">
            <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Anästhesie / Oxygenierung
            </div>
            <label className="block text-[11px] text-slate-600 mb-1">FiO₂ {fio2}%</label>
            <input type="range" min={28} max={60} value={fio2} onChange={(e) => setFio2(Number(e.target.value))} className="w-full mb-3 accent-violet-600" />
            <label className="block text-[11px] text-slate-600 mb-1">MAC-Äquivalent {anesthesiaMac.toFixed(2)}</label>
            <input type="range" min={50} max={150} value={Math.round(anesthesiaMac * 100)} onChange={(e) => setAnesthesiaMac(Number(e.target.value) / 100)} className="w-full accent-indigo-600" />
            <p className={`mt-2 text-[10px] ${anesthesiaMac >= 0.75 && anesthesiaMac <= 1.15 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {anesthesiaMac >= 0.75 && anesthesiaMac <= 1.15 ? 'Narkosetiefe im empfohlenen Korridor.' : 'Abweichung — erhöhte Vitalvariabilität.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeartPulseMini({ className }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}
