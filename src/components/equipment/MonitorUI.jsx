import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, Activity, Droplets, Zap, Power, Timer, X, FileText } from 'lucide-react'
import bloodPressureSound from '../../assets/sfx/bloodpressure.mp3'
import monitorNormalSound from '../../assets/sfx/monitornormal.mp3'
import tachykardieSound from '../../assets/sfx/tachykardie.mp3'
import flatlineSound from '../../assets/sfx/flatline.mp3'
import { playOneShot, startLoop, stopLoop, getActiveLoopsSnapshot } from '../../utils/soundManager'
import { useAuth } from '../../context/AuthContext'
import { ECG_SEGMENT, generateEcgPath, generateFlatline, generateVfPath } from '../../utils/monitorWaveforms'

export default function MonitorUI({ equipment, patient, onAction, savedState, onSaveState, externalAudioManaged = false }) {
  const { user } = useAuth()
  const canUseDebugTools = !!user
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [spo2Connected, setSpo2Connected] = useState(savedState?.spo2Connected ?? false)
  const [ecgConnected, setEcgConnected] = useState(savedState?.ecgConnected ?? false)
  const [muted, setMuted] = useState(savedState?.muted ?? false)
  const [nibpActive, setNibpActive] = useState(savedState?.nibpActive ?? false)
  const [nibpMeasuring, setNibpMeasuring] = useState(false)
  const [nibpAutoInterval, setNibpAutoInterval] = useState(savedState?.nibpAutoInterval ?? null)
  const [nibpProtocol, setNibpProtocol] = useState(savedState?.nibpProtocol ?? [])
  const [nibpLastReading, setNibpLastReading] = useState(savedState?.nibpLastReading ?? null)
  const [nibpSide, setNibpSide] = useState(savedState?.nibpSide === 'right' ? 'right' : 'left')
  const [showProtocol, setShowProtocol] = useState(false)
  const [audioDebugOpen, setAudioDebugOpen] = useState(false)
  const [audioSnapshot, setAudioSnapshot] = useState([])
  const [ecgPhase, setEcgPhase] = useState(0)
  const [ecgPath, setEcgPath] = useState('')
  const [plethPath, setPlethPath] = useState('')
  const [displayValues, setDisplayValues] = useState(null)
  const [hrBlink, setHrBlink] = useState(false)
  const animRef = useRef(null)
  const nibpTimerRef = useRef(null)
  const lastFrameRef = useRef(0)
  const monitorLoopKey = useRef(`monitor_${equipment?.id || 'default'}`)
  const monitorFlatlineLoopKey = useRef(`monitor_flatline_${equipment?.id || 'default'}`)
  const monitorTachyLoopKey = useRef(`monitor_tachy_${equipment?.id || 'default'}`)
  const resus = patient?.clinicalState?.resuscitation || {}
  const arrestActive = !!resus?.active
  const arrestRhythm = String(resus?.rhythm || '').toLowerCase()
  const resusStatus = String(resus?.status || '').toLowerCase()
  const isDead = resusStatus === 'dead' || String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead'
  const lowPerfusionRhythm = arrestRhythm === 'asystole' || arrestRhythm === 'pea'
  const noRespOxPerfusion = arrestActive || isDead

  useEffect(() => {
    if (onSaveState) {
      onSaveState({ powered, spo2Connected, ecgConnected, nibpActive, nibpAutoInterval, nibpProtocol, nibpLastReading, nibpSide, muted })
    }
  }, [powered, spo2Connected, ecgConnected, nibpActive, nibpAutoInterval, nibpProtocol, nibpLastReading, nibpSide, muted])

  const hasPatient = !!patient?.vitals

  useEffect(() => {
    if (!powered || !patient?.vitals) { setDisplayValues(null); return }
    const v = patient.vitals
    const rrValue = Number(v?.rr)
    setDisplayValues({
      hr: (isDead || (arrestActive && lowPerfusionRhythm)) ? 0 : (ecgConnected ? v.hr : '--'),
      spo2: noRespOxPerfusion ? 0 : (spo2Connected ? Math.round(Number(v.spo2 ?? 0)) : '--'),
      bp: noRespOxPerfusion ? '0/0' : (nibpActive ? (nibpLastReading?.bp || '--/--') : '--/--'),
      rr: noRespOxPerfusion ? 0 : (Number.isFinite(rrValue) ? Math.max(0, Math.round(rrValue)) : 16),
    })
  }, [powered, patient, ecgConnected, spo2Connected, nibpActive, nibpLastReading, arrestActive, lowPerfusionRhythm, isDead, noRespOxPerfusion])

  useEffect(() => {
    if (!powered) { if (animRef.current) cancelAnimationFrame(animRef.current); return }

    const tick = (timestamp) => {
      const dt = timestamp - (lastFrameRef.current || timestamp)
      lastFrameRef.current = timestamp

      if (ecgConnected && hasPatient) {
        const hr = patient?.vitals?.hr || 72
        const beatsPerMs = Math.max(0, Number(hr || 72)) / 60000
        const phasePerMs = beatsPerMs * ECG_SEGMENT.length
        setEcgPhase(prev => {
          const next = (prev + (arrestActive ? phasePerMs * 1.15 : phasePerMs) * dt) % ECG_SEGMENT.length
          if (isDead || (arrestActive && (arrestRhythm === 'asystole' || arrestRhythm === 'pea'))) {
            setEcgPath(generateFlatline(400, 80))
          } else if (arrestActive && (arrestRhythm === 'vf' || arrestRhythm === 'pvt')) {
            setEcgPath(generateVfPath(400, 80, next))
          } else {
            setEcgPath(generateEcgPath(400, 80, next, arrestRhythm === 'pea' ? 0.3 : 1))
          }
          setPlethPath((noRespOxPerfusion || !spo2Connected) ? generateFlatline(400, 40) : generateEcgPath(400, 40, next, 0.5))
          return next
        })
      } else {
        setEcgPath(generateFlatline(400, 80))
        setPlethPath(generateFlatline(400, 40))
      }

      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [powered, ecgConnected, hasPatient, patient?.vitals?.hr, arrestActive, arrestRhythm, isDead, noRespOxPerfusion, spo2Connected])

  useEffect(() => {
    if (!ecgConnected || !powered || !hasPatient || isDead || (arrestActive && lowPerfusionRhythm)) return
    const interval = setInterval(() => setHrBlink(true), 60000 / (patient?.vitals?.hr || 72))
    return () => clearInterval(interval)
  }, [ecgConnected, powered, hasPatient, patient?.vitals?.hr, arrestActive, lowPerfusionRhythm, isDead])

  useEffect(() => {
    if (hrBlink) { const t = setTimeout(() => setHrBlink(false), 200); return () => clearTimeout(t) }
  }, [hrBlink])

  useEffect(() => {
    if (nibpAutoInterval && powered && hasPatient) {
      const doMeasure = () => {
        setNibpMeasuring(true)
        playOneShot(bloodPressureSound, { volume: 0.28 })
        setTimeout(() => {
          setNibpActive(true)
          setNibpMeasuring(false)
          if (patient?.vitals) {
            const sideBp = String(patient?.vitals?.bpSides?.[nibpSide] || patient.vitals.bp || '120/75')
            const [sysRaw, diaRaw] = sideBp.split('/')
            const sys = Number.parseInt(sysRaw, 10)
            const dia = Number.parseInt(diaRaw, 10)
            const hr = Number(patient.vitals.hr || 0)
            const reading = {
              time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              bp: `${Number.isFinite(sys) ? sys : 120}/${Number.isFinite(dia) ? dia : 75}`,
              hr: Number.isFinite(hr) ? Math.max(0, Math.round(hr)) : 0,
              side: nibpSide,
            }
            setNibpLastReading(reading)
            setNibpProtocol(prev => [...prev, reading])
          }
        }, 3000)
      }
      nibpTimerRef.current = setInterval(doMeasure, nibpAutoInterval * 60 * 1000)
      return () => clearInterval(nibpTimerRef.current)
    }
    return () => { if (nibpTimerRef.current) clearInterval(nibpTimerRef.current) }
  }, [nibpAutoInterval, powered, hasPatient, nibpSide, patient?.vitals])

  const handleNibp = useCallback(() => {
    if (nibpMeasuring) return
    setNibpMeasuring(true)
    playOneShot(bloodPressureSound, { volume: 0.28 })
    onAction?.('nibp_measure', 'NIBP-Messung', 5, 5)
    setTimeout(() => {
      setNibpActive(true)
      setNibpMeasuring(false)
      if (patient?.vitals) {
        const sideBp = String(patient?.vitals?.bpSides?.[nibpSide] || patient.vitals.bp || '120/75')
        const [sysRaw, diaRaw] = sideBp.split('/')
        const sys = Number.parseInt(sysRaw, 10)
        const dia = Number.parseInt(diaRaw, 10)
        const hr = Number(patient.vitals.hr || 0)
        const reading = {
          time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bp: `${Number.isFinite(sys) ? sys : 120}/${Number.isFinite(dia) ? dia : 75}`,
          hr: Number.isFinite(hr) ? Math.max(0, Math.round(hr)) : 0,
          side: nibpSide,
        }
        setNibpLastReading(reading)
        setNibpProtocol(prev => [...prev, reading])
      }
    }, 3000)
  }, [nibpMeasuring, onAction, patient?.vitals, nibpSide])

  const hrWarning = displayValues?.hr !== '--' && (displayValues?.hr > 100 || displayValues?.hr < 60)
  const spo2Warning = displayValues?.spo2 !== '--' && displayValues?.spo2 < 94

  useEffect(() => {
    const hr = Number(patient?.vitals?.hr || 0)
    const shouldPlayNormalLoop = powered && ecgConnected && hasPatient && !arrestActive && !isDead && !muted && hr >= 60 && hr <= 100
    const shouldPlayFlatlineLoop = powered && ecgConnected && hasPatient && !muted && (isDead || (arrestActive && (arrestRhythm === 'asystole' || arrestRhythm === 'pea')))
    const shouldPlayTachyLoop = powered && ecgConnected && hasPatient && !isDead && !muted && arrestActive && (arrestRhythm === 'vf' || arrestRhythm === 'pvt')
    if (externalAudioManaged) {
      stopLoop(monitorLoopKey.current)
      stopLoop(monitorFlatlineLoopKey.current)
      stopLoop(monitorTachyLoopKey.current)
      return undefined
    }
    if (shouldPlayNormalLoop && !shouldPlayFlatlineLoop && !shouldPlayTachyLoop) {
      startLoop(monitorLoopKey.current, monitorNormalSound, { volume: 0.12 })
    } else {
      stopLoop(monitorLoopKey.current)
    }
    if (shouldPlayFlatlineLoop) startLoop(monitorFlatlineLoopKey.current, flatlineSound, {
      volume: 0.11,
      trimEndSec: 0.42,
      loopStartSec: 0.22,
      seamSearchRadiusSec: 0.4,
      seamWindowSec: 0.008,
      seamCrossfadeSec: 0,
      detectSilenceBounds: true,
      silenceThreshold: 0.008,
    })
    else stopLoop(monitorFlatlineLoopKey.current)
    if (shouldPlayTachyLoop) startLoop(monitorTachyLoopKey.current, tachykardieSound, { volume: 0.12 })
    else stopLoop(monitorTachyLoopKey.current)
    return () => {
      if (!shouldPlayNormalLoop) stopLoop(monitorLoopKey.current)
      if (!shouldPlayFlatlineLoop) stopLoop(monitorFlatlineLoopKey.current)
      if (!shouldPlayTachyLoop) stopLoop(monitorTachyLoopKey.current)
    }
  }, [powered, ecgConnected, hasPatient, patient?.vitals?.hr, arrestActive, arrestRhythm, isDead, muted, externalAudioManaged])

  useEffect(() => () => {
    stopLoop(monitorLoopKey.current)
    stopLoop(monitorFlatlineLoopKey.current)
    stopLoop(monitorTachyLoopKey.current)
  }, [])

  useEffect(() => {
    if (!audioDebugOpen) return undefined
    const refresh = () => {
      setAudioSnapshot(getActiveLoopsSnapshot())
    }
    refresh()
    const timer = setInterval(refresh, 300)
    return () => clearInterval(timer)
  }, [audioDebugOpen])

  return (
    <div className="p-4">
      <div className={`rounded-2xl overflow-hidden border-2 ${powered ? 'border-surface-700 bg-[#0a0e14]' : 'border-surface-300 bg-surface-200'} transition-colors shadow-2xl`}>
        {powered ? (
          <div className="p-3 space-y-1.5">
            {/* ECG waveform */}
            <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 90 }}>
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 80">
                {[...Array(17)].map((_, i) => <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="80" stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
                {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 10} x2="400" y2={i * 10} stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />)}
              </svg>
              <svg className="relative w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
                <defs><filter id="ecgGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                {ecgPath && <path d={ecgPath} fill="none" stroke={ecgConnected && hasPatient ? '#22c55e' : '#374151'} strokeWidth="2" filter={ecgConnected && hasPatient ? 'url(#ecgGlow)' : undefined} />}
              </svg>
              <span className="absolute top-1 left-2 text-[9px] text-green-500/80 font-mono font-bold">II</span>
              {arrestActive && (
                <span className="absolute top-1 right-2 text-[9px] text-red-400 font-mono font-bold">
                  {String(arrestRhythm || 'arrest').toUpperCase()}
                </span>
              )}
              {!ecgConnected && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-surface-600 font-mono">EKG nicht verbunden</span>}
              {ecgConnected && !hasPatient && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-surface-600 font-mono">Kein Patient</span>}
            </div>

            {/* SpO2 pleth */}
            <div className="bg-black/60 rounded-xl p-2 relative overflow-hidden" style={{ height: 44 }}>
              <svg className="w-full h-full" viewBox="0 0 400 40" preserveAspectRatio="none">
                <defs><filter id="plethGlow"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                {plethPath && <path d={plethPath} fill="none" stroke={spo2Connected && hasPatient ? '#06b6d4' : '#374151'} strokeWidth="1.5" filter={spo2Connected && hasPatient ? 'url(#plethGlow)' : undefined} />}
              </svg>
              <span className="absolute top-0.5 left-2 text-[9px] text-cyan-500/80 font-mono font-bold">Pleth</span>
              {!spo2Connected && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-surface-600 font-mono">SpO₂ ---</span>}
            </div>

            {/* Vitals grid */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className={`rounded-lg p-2.5 ${hrWarning ? 'bg-red-900/50 border border-red-500/30' : 'bg-green-900/30 border border-green-500/20'}`}>
                <div className="flex items-center gap-1 mb-0.5"><Heart className={`w-3 h-3 ${hrWarning ? 'text-red-400' : 'text-green-400'} ${hrBlink ? 'scale-125' : ''} transition-transform`} /><span className="text-[9px] text-green-400/80 font-mono">HF</span></div>
                <p className={`text-3xl font-bold font-mono tracking-tight leading-none ${hrWarning ? 'text-red-400' : 'text-green-400'}`}>{displayValues?.hr ?? '--'}</p>
                <p className="text-[9px] text-green-400/40 font-mono">/min</p>
              </div>
              <div className={`rounded-lg p-2.5 ${spo2Warning ? 'bg-red-900/50 border border-red-500/30' : 'bg-cyan-900/30 border border-cyan-500/20'}`}>
                <div className="flex items-center gap-1 mb-0.5"><Droplets className={`w-3 h-3 ${spo2Warning ? 'text-red-400' : 'text-cyan-400'}`} /><span className="text-[9px] text-cyan-400/80 font-mono">SpO₂</span></div>
                <p className={`text-3xl font-bold font-mono tracking-tight leading-none ${spo2Warning ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>{displayValues?.spo2 ?? '--'}</p>
                <p className="text-[9px] text-cyan-400/40 font-mono">%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="flex items-center gap-1 mb-0.5"><Activity className="w-3 h-3 text-white/70" /><span className="text-[9px] text-white/50 font-mono">NIBP</span>{nibpAutoInterval && <span className="text-[7px] text-amber-400 font-mono ml-auto">{nibpAutoInterval}m</span>}</div>
                <p className="text-2xl font-bold font-mono text-white tracking-tight leading-none">{nibpMeasuring ? <span className="animate-pulse">···</span> : (displayValues?.bp ?? '--/--')}</p>
                <p className="text-[9px] text-white/30 font-mono">mmHg</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <div className="bg-yellow-900/20 rounded-lg p-2 flex items-center gap-2 border border-yellow-500/10">
                <span className="text-[9px] text-yellow-400/80 font-mono">AF</span>
                <span className="text-xl font-bold font-mono text-yellow-400">{displayValues?.rr ?? '--'}</span>
                <span className="text-[9px] text-yellow-400/40 font-mono">/min</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] flex items-center justify-center"><p className="text-surface-400 text-sm">Monitor ausgeschaltet</p></div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Steuerung</p>
        <button
          onClick={() => {
            const next = !powered
            setPowered(next)
            if (next) onAction?.('monitor_power_on', 'Monitor eingeschaltet', 1, 2)
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${powered ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600'}`}
        >
          <Power className="w-5 h-5" /><span className="flex-1 text-sm font-medium">{powered ? 'Eingeschaltet' : 'Ausgeschaltet'}</span><div className={`w-3 h-3 rounded-full ${powered ? 'bg-green-500' : 'bg-surface-300'}`} />
        </button>

        {powered && (<>
          <div className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${ecgConnected ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600'}`}>
            <Activity className="w-5 h-5 shrink-0" />
            <div className="flex-1"><span className="text-sm font-medium block">{ecgConnected ? 'EKG verbunden' : 'EKG-Elektroden'}</span><span className="text-xs text-surface-400">3-Kanal</span></div>
            {ecgConnected ? <button onClick={() => setEcgConnected(false)} className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full hover:bg-red-200 flex items-center gap-1 shrink-0"><X className="w-3 h-3" />Entfernen</button>
              : <button onClick={() => { setEcgConnected(true); onAction?.('ecg_connect', 'EKG angeschlossen', 2, 3) }} className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full hover:bg-primary-200 shrink-0">Anlegen</button>}
          </div>

          <div className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${spo2Connected ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-surface-200 text-surface-600'}`}>
            <Droplets className="w-5 h-5 shrink-0" />
            <div className="flex-1"><span className="text-sm font-medium block">{spo2Connected ? 'SpO₂-Clip verbunden' : 'SpO₂-Clip'}</span><span className="text-xs text-surface-400">Pulsoximetrie</span></div>
            {spo2Connected ? <button onClick={() => setSpo2Connected(false)} className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full hover:bg-red-200 flex items-center gap-1 shrink-0"><X className="w-3 h-3" />Entfernen</button>
              : <button onClick={() => { setSpo2Connected(true); onAction?.('spo2_connect', 'SpO₂-Clip angeschlossen', 1, 2) }} className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full hover:bg-primary-200 shrink-0">Anlegen</button>}
          </div>

          <button onClick={handleNibp} disabled={nibpMeasuring} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-surface-200 text-surface-600 hover:border-primary-300 transition-colors text-left">
            <Zap className="w-5 h-5" /><div className="flex-1"><span className="text-sm font-medium block">{nibpMeasuring ? 'Messung läuft...' : 'NIBP manuell'}</span></div>
            {nibpActive && <span className="text-xs bg-white border border-surface-200 px-2 py-0.5 rounded-full font-mono">{displayValues?.bp}</span>}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-surface-500">Messseite:</span>
            <button onClick={() => setNibpSide('left')} className={`text-xs px-2 py-1 rounded ${nibpSide === 'left' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-700'}`}>L</button>
            <button onClick={() => setNibpSide('right')} className={`text-xs px-2 py-1 rounded ${nibpSide === 'right' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-700'}`}>R</button>
          </div>

          <button
            onClick={() => setMuted((v) => !v)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${muted ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-surface-200 text-surface-600 hover:border-primary-300'}`}
          >
            <span className="text-sm">{muted ? '🔇' : '🔊'}</span>
            <span className="flex-1 text-sm font-medium">{muted ? 'Monitor-Sound stumm' : 'Monitor-Sound aktiv'}</span>
          </button>

          <div className="p-3 rounded-xl border-2 border-surface-200">
            <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-surface-500" /><span className="text-sm font-medium text-surface-600">NIBP Auto-Intervall</span></div>
            <div className="flex gap-1.5 flex-wrap">
              {[null, 1, 3, 5, 10, 15, 30].map(val => (
                <button key={val ?? 'off'} onClick={() => setNibpAutoInterval(val)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${nibpAutoInterval === val ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                  {val === null ? 'Aus' : `${val}m`}
                </button>
              ))}
            </div>
          </div>

          {nibpProtocol.length > 0 && (
            <button onClick={() => setShowProtocol(!showProtocol)} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-surface-200 text-surface-600 hover:border-primary-300 transition-colors text-left">
              <FileText className="w-5 h-5" /><span className="text-sm font-medium">Protokoll ({nibpProtocol.length})</span>
            </button>
          )}
          {showProtocol && nibpProtocol.length > 0 && (
            <div className="rounded-xl border border-surface-200 overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-surface-50"><th className="text-left p-2 font-medium text-surface-500">Zeit</th><th className="text-left p-2 font-medium text-surface-500">RR</th><th className="text-left p-2 font-medium text-surface-500">HF</th></tr></thead>
                <tbody>
                  {nibpProtocol.slice().reverse().map((e, i) => (
                    <tr key={i} className="border-t border-surface-100"><td className="p-2 font-mono text-surface-600">{e.time}</td><td className="p-2 font-mono font-bold">{e.bp} <span className="text-[10px] text-surface-400">({String(e.side || 'left') === 'right' ? 'R' : 'L'})</span></td><td className="p-2 font-mono text-surface-600">{e.hr}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canUseDebugTools && (
            <div className="rounded-xl border border-surface-200 p-2.5">
              <button
                onClick={() => setAudioDebugOpen((v) => !v)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200"
              >
                Audio-Debug {audioDebugOpen ? 'ausblenden' : 'anzeigen'}
              </button>
              {audioDebugOpen && (
                <div className="mt-2 text-[11px] text-surface-700 space-y-1">
                  <p>Flatline-Key: <span className="font-mono">{monitorFlatlineLoopKey.current}</span></p>
                  <p>Rhythmus: <span className="font-mono">{String(arrestRhythm || 'none')}</span></p>
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-2 max-h-24 overflow-y-auto font-mono text-[10px]">
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
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
