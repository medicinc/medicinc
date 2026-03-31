import { useEffect, useMemo, useState } from 'react'
import { Wind, Power, Gauge, Play, Pause, AlertTriangle, Settings2 } from 'lucide-react'

const OXYGEN_MODES = [
  { id: 'nasal_cannula', name: 'Nasenbrille', desc: 'Leichte O2-Therapie', flowRange: [1, 6], fio2Range: [24, 44], allowPressure: false },
  { id: 'simple_mask', name: 'Einfache Maske', desc: 'Mittelgradige O2-Gabe', flowRange: [5, 12], fio2Range: [35, 60], allowPressure: false },
  { id: 'reservoir_mask', name: 'Reservoirmaske', desc: 'Hochdosierte O2-Gabe', flowRange: [10, 15], fio2Range: [60, 95], allowPressure: false },
  { id: 'bvm', name: 'Beutel-Maske', desc: 'Manuelle Beatmung', flowRange: [10, 15], fio2Range: [80, 100], allowPressure: true },
  { id: 'high_flow', name: 'High-Flow', desc: 'HFNC mit aktivem Flow', flowRange: [20, 60], fio2Range: [21, 100], allowPressure: true },
  { id: 'intubation', name: 'Intubation', desc: 'Invasive Atemwegssicherung', flowRange: [20, 80], fio2Range: [21, 100], allowPressure: true },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default function OxygenTherapyUI({ patient, onAction, savedState, onSaveState }) {
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [running, setRunning] = useState(savedState?.running ?? false)
  const [modeId, setModeId] = useState(savedState?.modeId ?? 'nasal_cannula')
  const [settings, setSettings] = useState(savedState?.settings ?? {
    flow: 2,
    fio2: 28,
    peep: 5,
    pressureSupport: 8,
    peakPressure: 18,
  })

  const mode = useMemo(
    () => OXYGEN_MODES.find(m => m.id === modeId) || OXYGEN_MODES[0],
    [modeId]
  )

  const setField = (field, next, min, max) => {
    setSettings(prev => ({ ...prev, [field]: clamp(next, min, max) }))
  }

  const startTherapy = () => {
    setRunning(true)
    onAction?.(
      'oxygen_start',
      `Sauerstofftherapie gestartet (${mode.name}, ${settings.flow} L/min, FiO2 ${settings.fio2}%)`,
      3,
      8,
      {
        modeId: mode.id,
        flow: Number(settings.flow || 0),
        fio2: Number(settings.fio2 || 21),
        peep: Number(settings.peep || 0),
        pressureSupport: Number(settings.pressureSupport || 0),
        peakPressure: Number(settings.peakPressure || 0),
      }
    )
  }

  useEffect(() => {
    const [flowMin, flowMax] = mode.flowRange
    const [fio2Min, fio2Max] = mode.fio2Range
    setSettings(prev => ({
      ...prev,
      flow: clamp(prev.flow, flowMin, flowMax),
      fio2: clamp(prev.fio2, fio2Min, fio2Max),
    }))
  }, [mode.id])

  useEffect(() => {
    onSaveState?.({ powered, running, modeId, settings })
  }, [powered, running, modeId, settings, onSaveState])

  const highOxygen = settings.fio2 > 60
  const highPressure = mode.allowPressure && (settings.peep > 12 || settings.peakPressure > 30)
  const spo2Debug = patient?.clinicalState?.spo2Debug || null
  const lastO2Ts = Date.parse(patient?.clinicalState?.lastOxygenSupportAt || '')
  const minsSinceO2 = Number.isFinite(lastO2Ts) ? Math.max(0, (Date.now() - lastO2Ts) / 60000) : null

  return (
    <div className="p-4 space-y-3">
      <div className={`rounded-2xl border-2 overflow-hidden transition-colors ${powered ? 'border-cyan-500 bg-surface-900' : 'border-surface-300 bg-surface-100'}`}>
        {powered ? (
          <div className="p-4 space-y-3 min-h-[340px]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-cyan-400 font-mono">OXYGEN / AIRWAY CONTROL</p>
              {running && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">AKTIV</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {OXYGEN_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => !running && setModeId(m.id)}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    modeId === m.id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-semibold">{m.name}</p>
                  <p className="text-[10px] opacity-70">{m.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] text-white/50 font-mono mb-1">FLOW</p>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setField('flow', settings.flow - 1, mode.flowRange[0], mode.flowRange[1])} className="px-2 py-1 rounded bg-white/10 text-white text-sm">-</button>
                  <p className="text-lg font-mono font-bold text-cyan-300">{settings.flow} L/min</p>
                  <button onClick={() => setField('flow', settings.flow + 1, mode.flowRange[0], mode.flowRange[1])} className="px-2 py-1 rounded bg-white/10 text-white text-sm">+</button>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] text-white/50 font-mono mb-1">FiO2</p>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setField('fio2', settings.fio2 - 1, mode.fio2Range[0], mode.fio2Range[1])} className="px-2 py-1 rounded bg-white/10 text-white text-sm">-</button>
                  <p className="text-lg font-mono font-bold text-cyan-300">{settings.fio2}%</p>
                  <button onClick={() => setField('fio2', settings.fio2 + 1, mode.fio2Range[0], mode.fio2Range[1])} className="px-2 py-1 rounded bg-white/10 text-white text-sm">+</button>
                </div>
              </div>
            </div>

            {mode.allowPressure && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/5 p-2.5">
                  <p className="text-[9px] text-white/50 font-mono mb-1">PEEP</p>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setField('peep', settings.peep - 1, 0, 20)} className="w-6 h-6 rounded bg-white/10 text-white">-</button>
                    <p className="text-sm font-bold font-mono text-white">{settings.peep}</p>
                    <button onClick={() => setField('peep', settings.peep + 1, 0, 20)} className="w-6 h-6 rounded bg-white/10 text-white">+</button>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5">
                  <p className="text-[9px] text-white/50 font-mono mb-1">PS</p>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setField('pressureSupport', settings.pressureSupport - 1, 0, 25)} className="w-6 h-6 rounded bg-white/10 text-white">-</button>
                    <p className="text-sm font-bold font-mono text-white">{settings.pressureSupport}</p>
                    <button onClick={() => setField('pressureSupport', settings.pressureSupport + 1, 0, 25)} className="w-6 h-6 rounded bg-white/10 text-white">+</button>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5">
                  <p className="text-[9px] text-white/50 font-mono mb-1">Ppeak</p>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setField('peakPressure', settings.peakPressure - 1, 10, 40)} className="w-6 h-6 rounded bg-white/10 text-white">-</button>
                    <p className="text-sm font-bold font-mono text-white">{settings.peakPressure}</p>
                    <button onClick={() => setField('peakPressure', settings.peakPressure + 1, 10, 40)} className="w-6 h-6 rounded bg-white/10 text-white">+</button>
                  </div>
                </div>
              </div>
            )}

            {(highOxygen || highPressure) && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 space-y-1">
                {highOxygen && <p className="text-xs text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> FiO2 &gt; 60%: engmaschig reevaluieren</p>}
                {highPressure && <p className="text-xs text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Erhöhte Druckwerte: Barotrauma-Risiko</p>}
              </div>
            )}

            <div className="rounded-xl bg-white/5 p-2.5 text-xs text-white/70 flex items-center justify-between">
              <span className="flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" /> Modus: {mode.name}</span>
              <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> Ziel-SpO2: 92-96%</span>
            </div>
          </div>
        ) : (
          <div className="min-h-[340px] flex items-center justify-center">
            <p className="text-surface-400 text-sm">Sauerstoffsystem aus</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={() => {
            const next = !powered
            setPowered(next)
            if (!next) setRunning(false)
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
            powered ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-surface-200 text-surface-600'
          }`}
        >
          <Power className="w-5 h-5" />
          <span className="flex-1 text-sm font-medium">{powered ? 'System eingeschaltet' : 'System einschalten'}</span>
        </button>

        {powered && !running && (
          <button onClick={startTherapy} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 font-medium text-sm">
            <Play className="w-4 h-4" /> O2-Therapie starten
          </button>
        )}
        {powered && running && (
          <button
            onClick={() => {
              setRunning(false)
              onAction?.('oxygen_stop', 'Sauerstofftherapie pausiert', 1, 3)
            }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-medium text-sm"
          >
            <Pause className="w-4 h-4" /> O2-Therapie pausieren
          </button>
        )}
      </div>

      {patient && (
        <>
          <div className="rounded-xl bg-surface-50 border border-surface-200 p-3 text-xs text-surface-600">
            <p className="font-medium text-surface-800 mb-1 flex items-center gap-1"><Wind className="w-3.5 h-3.5" /> Klinischer Hinweis</p>
            <p>Aktuelle SpO2 in Akte: <span className="font-semibold">{patient.vitals?.spo2 ?? '--'}%</span>. Passe Flow/FiO2 und Atemwegsstrategie entsprechend dem Verlauf an.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            <p className="font-semibold mb-1">Debug SpO2-Regelung</p>
            <p>O2-System: <span className="font-mono">{powered ? (running ? 'ON/RUNNING' : 'ON/PAUSED') : 'OFF'}</span></p>
            <p>Letzte O2-Unterstützung: <span className="font-mono">{minsSinceO2 == null ? 'n/a' : `${minsSinceO2.toFixed(2)} min`}</span></p>
            <p>Ziel/Trend: <span className="font-mono">{spo2Debug ? `${spo2Debug.dynamicTarget}% / ${spo2Debug.trend} (${spo2Debug.appliedDelta})` : 'n/a'}</span></p>
            <p>Kontext: <span className="font-mono">{spo2Debug ? `${spo2Debug.condition}${spo2Debug.isCopdLike ? ' (COPD-like)' : ''}` : 'n/a'}</span></p>
          </div>
        </>
      )}
    </div>
  )
}
