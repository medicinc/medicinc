import { useState, useEffect } from 'react'
import { Wind, Power, Settings, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'

const MODES = [
  { id: 'vc_ac', name: 'VC-AC', desc: 'Volumengesteuert assistiert/kontrolliert' },
  { id: 'pc_ac', name: 'PC-AC', desc: 'Druckgesteuert assistiert/kontrolliert' },
  { id: 'cpap_ps', name: 'CPAP/PS', desc: 'Druckunterstützung mit CPAP' },
  { id: 'simv', name: 'SIMV', desc: 'Synchronisierte intermittierende Beatmung' },
  { id: 'niv', name: 'NIV', desc: 'Nicht-invasive Beatmung über Maske' },
]

export default function VentilatorUI({ equipment, patient, onAction, savedState, onSaveState }) {
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [ventMode, setVentMode] = useState(savedState?.ventMode ?? 'vc_ac')
  const [params, setParams] = useState(savedState?.params ?? {
    fio2: 40,
    peep: 5,
    tv: 500,
    rr: 14,
    pinsp: 15,
    ps: 10,
  })
  const [running, setRunning] = useState(savedState?.running ?? false)

  const updateParam = (key, delta, min, max) => {
    setParams(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, prev[key] + delta)) }))
  }

  const handleStart = () => {
    setRunning(true)
    const modeName = MODES.find(m => m.id === ventMode)?.name || ventMode
    const actionId = ventMode === 'niv' ? 'oxygen_apply' : 'ventilator_start'
    onAction?.(actionId, `Beatmung gestartet (${modeName})`, 5, 15)
  }

  const ParamControl = ({ label, unit, value, onUp, onDown, warning }) => (
    <div className={`rounded-xl p-3 ${warning ? 'bg-red-900/30' : 'bg-white/5'}`}>
      <p className="text-[10px] text-white/50 font-mono mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <button onClick={onDown} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
          <ChevronDown className="w-3 h-3" />
        </button>
        <div className="text-center">
          <p className={`text-xl font-bold font-mono ${warning ? 'text-red-400' : 'text-white'}`}>{value}</p>
          <p className="text-[9px] text-white/30 font-mono">{unit}</p>
        </div>
        <button onClick={onUp} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>
    </div>
  )

  useEffect(() => {
    if (onSaveState) onSaveState({ powered, ventMode, params, running })
  }, [powered, ventMode, params, running, onSaveState])

  return (
    <div className="p-4">
      {/* Ventilator screen */}
      <div className={`rounded-2xl overflow-hidden border-2 ${powered ? 'border-sky-500 bg-surface-900' : 'border-surface-300 bg-surface-200'} transition-colors`}>
        {powered ? (
          <div className="p-4 min-h-[320px]">
            {/* Mode selector */}
            <div className="flex gap-1 mb-3 overflow-x-hidden">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => !running && setVentMode(m.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-mono transition-colors whitespace-nowrap ${
                    ventMode === m.id ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/50 hover:text-white/80'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-sky-400/60 font-mono mb-3">
              {MODES.find(m => m.id === ventMode)?.desc}
            </p>

            {/* Status */}
            {running && (
              <div className="bg-sky-500/20 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-400 animate-pulse" />
                <span className="text-xs text-sky-400 font-mono">BEATMUNG AKTIV</span>
              </div>
            )}

            {/* Parameter controls */}
            <div className="grid grid-cols-2 gap-2">
              <ParamControl
                label="FiO₂" unit="%" value={params.fio2}
                onUp={() => updateParam('fio2', 5, 21, 100)}
                onDown={() => updateParam('fio2', -5, 21, 100)}
                warning={params.fio2 > 60}
              />
              <ParamControl
                label="PEEP" unit="cmH₂O" value={params.peep}
                onUp={() => updateParam('peep', 1, 0, 20)}
                onDown={() => updateParam('peep', -1, 0, 20)}
                warning={params.peep > 12}
              />
              {(ventMode === 'vc_ac' || ventMode === 'simv') && (
                <ParamControl
                  label="Tidalvol." unit="ml" value={params.tv}
                  onUp={() => updateParam('tv', 25, 200, 800)}
                  onDown={() => updateParam('tv', -25, 200, 800)}
                />
              )}
              <ParamControl
                label="Frequenz" unit="/min" value={params.rr}
                onUp={() => updateParam('rr', 1, 6, 35)}
                onDown={() => updateParam('rr', -1, 6, 35)}
              />
              {(ventMode === 'pc_ac') && (
                <ParamControl
                  label="P.insp" unit="cmH₂O" value={params.pinsp}
                  onUp={() => updateParam('pinsp', 1, 5, 40)}
                  onDown={() => updateParam('pinsp', -1, 5, 40)}
                />
              )}
              {(ventMode === 'cpap_ps' || ventMode === 'niv') && (
                <ParamControl
                  label="PS" unit="cmH₂O" value={params.ps}
                  onUp={() => updateParam('ps', 1, 0, 25)}
                  onDown={() => updateParam('ps', -1, 0, 25)}
                />
              )}
            </div>

            {/* Warnings */}
            {params.fio2 > 60 && (
              <div className="flex items-center gap-2 mt-3 text-amber-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-mono">FiO₂ &gt; 60% — O₂-Toxizitätsrisiko</span>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[320px] flex items-center justify-center">
            <p className="text-surface-400 text-sm">Beatmungsgerät aus</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => { setPowered(!powered); if (powered) setRunning(false) }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
            powered ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600'
          }`}
        >
          <Power className="w-5 h-5" />
          <span className="flex-1 text-sm font-medium">{powered ? 'Eingeschaltet' : 'Einschalten'}</span>
        </button>

        {powered && !running && (
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-medium text-sm transition-colors"
          >
            <Wind className="w-5 h-5" />
            Beatmung starten
          </button>
        )}

        {powered && running && (
          <button
            onClick={() => { setRunning(false); onAction?.('vent_stop', 'Beatmung gestoppt', 2, 5) }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium text-sm transition-colors"
          >
            Beatmung stoppen
          </button>
        )}
      </div>
    </div>
  )
}
