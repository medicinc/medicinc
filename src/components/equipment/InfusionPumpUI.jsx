import { useState, useEffect } from 'react'
import { Droplets, Power, Play, Pause, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'

const SOLUTIONS = [
  { id: 'nacl', name: 'NaCl 0,9%', desc: 'Isotone Kochsalzlösung', color: 'text-blue-400' },
  { id: 'ringer', name: 'Ringer-Lösung', desc: 'Balancierte Vollelektrolytlösung', color: 'text-cyan-400' },
  { id: 'glucose', name: 'Glucose 5%', desc: 'Glukoselösung', color: 'text-amber-400' },
  { id: 'noradrenalin', name: 'Noradrenalin', desc: 'Vasopressor 0,1 mg/ml', color: 'text-red-400' },
  { id: 'propofol', name: 'Propofol', desc: 'Sedativum 10 mg/ml', color: 'text-purple-400' },
  { id: 'morphin', name: 'Morphin', desc: 'Analgetikum 1 mg/ml', color: 'text-pink-400' },
]

export default function InfusionPumpUI({ equipment, patient, onAction, savedState, onSaveState }) {
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [solution, setSolution] = useState(savedState?.solution ?? null)
  const [rate, setRate] = useState(savedState?.rate ?? 100)
  const [volume, setVolume] = useState(savedState?.volume ?? 500)
  const [running, setRunning] = useState(savedState?.running ?? false)
  const [infused, setInfused] = useState(savedState?.infused ?? 0)
  const [finishedAt, setFinishedAt] = useState(savedState?.finishedAt ?? null)

  const handleStart = () => {
    if (!solution) return
    if (infused >= volume) {
      setInfused(0)
      setFinishedAt(null)
    }
    setRunning(true)
    onAction?.('infusion_start', `Infusion gestartet: ${solution.name} @ ${rate} ml/h`, 3, 8)
  }

  const handleBolus = () => {
    if (!solution) return
    onAction?.('bolus', `Bolus: 50ml ${solution.name}`, 2, 5)
    setInfused(prev => Math.min(volume, prev + 50))
  }

  useEffect(() => {
    if (!powered || !running || !solution) return
    const tick = setInterval(() => {
      setInfused(prev => {
        const next = prev + (rate / 3600)
        if (next >= volume) {
          setRunning(false)
          setFinishedAt(new Date().toISOString())
          onAction?.('infusion_finished', `Infusion beendet: ${solution.name} (${volume} ml)`, 1, 2)
          return volume
        }
        return next
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [powered, running, solution, rate, volume, onAction])

  useEffect(() => { if (onSaveState) onSaveState({ powered, solution, rate, volume, running, infused, finishedAt }) }, [powered, solution, rate, volume, running, infused, finishedAt, onSaveState])

  const discardBag = () => {
    setRunning(false)
    setSolution(null)
    setInfused(0)
    setFinishedAt(null)
    setVolume(500)
  }

  return (
    <div className="p-4">
      {/* Pump display */}
      <div className={`rounded-2xl overflow-hidden border-2 ${powered ? 'border-emerald-500 bg-surface-900' : 'border-surface-300 bg-surface-200'} transition-colors`}>
        {powered ? (
          <div className="p-4 min-h-[260px]">
            {/* Solution selector */}
            {!solution ? (
              <div>
                <p className="text-xs text-white/50 font-mono mb-3">LÖSUNG WÄHLEN</p>
                <div className="space-y-1.5">
                  {SOLUTIONS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSolution(s)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className={`w-3 h-3 rounded-full bg-current ${s.color}`} />
                      <div>
                        <p className={`text-sm font-mono font-bold ${s.color}`}>{s.name}</p>
                        <p className="text-[10px] text-white/40">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Active solution */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-current ${solution.color}`} />
                    <span className={`text-sm font-mono font-bold ${solution.color}`}>{solution.name}</span>
                  </div>
                  <button onClick={() => { setSolution(null); setRunning(false) }} className="text-[10px] text-white/40 hover:text-white/70">Wechseln</button>
                </div>

                {/* Status */}
                {running && (
                  <div className="bg-emerald-500/20 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-mono">INFUSION LÄUFT</span>
                  </div>
                )}
                {!running && solution && infused >= volume && (
                  <div className="bg-amber-500/20 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-400 font-mono">BEUTEL LEER {finishedAt ? `(${new Date(finishedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                  </div>
                )}

                {/* Rate + Volume */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-white/50 font-mono mb-1">RATE</p>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setRate(prev => Math.max(5, prev - 10))} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="text-center">
                        <p className="text-xl font-bold font-mono text-emerald-400">{rate}</p>
                        <p className="text-[9px] text-white/30 font-mono">ml/h</p>
                      </div>
                      <button onClick={() => setRate(prev => Math.min(1000, prev + 10))} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-white/50 font-mono mb-1">VOLUMEN</p>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setVolume(prev => Math.max(50, prev - 50))} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="text-center">
                        <p className="text-xl font-bold font-mono text-white">{volume}</p>
                        <p className="text-[9px] text-white/30 font-mono">ml</p>
                      </div>
                      <button onClick={() => setVolume(prev => Math.min(2000, prev + 50))} className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1">
                    <span>Infundiert</span>
                    <span>{Math.round(infused)} / {volume} ml</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (infused / volume) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[260px] flex items-center justify-center">
            <p className="text-surface-400 text-sm">Perfusor aus</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => { setPowered(!powered); if (powered) { setRunning(false) } }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
            powered ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600'
          }`}
        >
          <Power className="w-5 h-5" />
          <span className="flex-1 text-sm font-medium">{powered ? 'Eingeschaltet' : 'Einschalten'}</span>
        </button>

        {powered && solution && !running && (
          <button onClick={handleStart} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-sm">
            <Play className="w-5 h-5" /> Infusion starten
          </button>
        )}

        {powered && running && (
          <>
            <button
              onClick={() => { setRunning(false); onAction?.('infusion_pause', 'Infusion pausiert', 1, 2) }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-medium text-sm"
            >
              <Pause className="w-5 h-5" /> Pausieren
            </button>
            <button
              onClick={handleBolus}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-surface-200 text-surface-700 hover:border-primary-300 font-medium text-sm"
            >
              <AlertCircle className="w-5 h-5" /> Bolus (50ml)
            </button>
          </>
        )}

        {powered && solution && !running && (
          <button
            onClick={discardBag}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-red-200 text-red-700 hover:bg-red-50 font-medium text-sm"
          >
            Beutel verwerfen
          </button>
        )}
      </div>
    </div>
  )
}
