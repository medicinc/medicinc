import { useState, useEffect } from 'react'
import { Zap, Power, AlertTriangle, Activity, ChevronUp, ChevronDown, Volume2 } from 'lucide-react'
import defibrillatorSound from '../../assets/sfx/defibrillator.mp3'
import { playOneShot } from '../../utils/soundManager'

export default function DefibrillatorUI({ equipment, patient, onAction, savedState, onSaveState }) {
  const [powered, setPowered] = useState(savedState?.powered ?? false)
  const [energy, setEnergy] = useState(200)
  const [mode, setMode] = useState('manual')
  const [charging, setCharging] = useState(false)
  const [charged, setCharged] = useState(false)
  const [shockDelivered, setShockDelivered] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [rhythmResult, setRhythmResult] = useState(null)

  const energyLevels = [50, 100, 150, 200, 250, 300, 360]

  const handleCharge = () => {
    if (charging || charged) return
    setCharging(true)
    onAction?.('defib_charge', 'Defibrillator laden', 3, 5)
    setTimeout(() => {
      setCharging(false)
      setCharged(true)
    }, 2000)
  }

  const handleShock = () => {
    if (!charged) return
    setCharged(false)
    setShockDelivered(true)
    playOneShot(defibrillatorSound, { volume: 0.22 })
    onAction?.('defib_shock', `Schock abgegeben (${energy}J)`, 1, 25)
    setTimeout(() => setShockDelivered(false), 2000)
  }

  const handleAnalyze = () => {
    if (analyzing) return
    setAnalyzing(true)
    onAction?.('rhythm_analysis', 'Rhythmusanalyse', 5, 10)
    setTimeout(() => {
      const rhythms = [
        { rhythm: 'Sinusrhythmus', shockable: false, desc: 'Normale Herzfrequenz und Rhythmus' },
        { rhythm: 'Kammerflimmern (VF)', shockable: true, desc: 'Schock empfohlen!' },
        { rhythm: 'Pulslose ventrikuläre Tachykardie', shockable: true, desc: 'Schock empfohlen!' },
        { rhythm: 'Asystolie', shockable: false, desc: 'Kein Schock empfohlen — CPR fortführen' },
        { rhythm: 'PEA', shockable: false, desc: 'Kein Schock empfohlen — reversible Ursachen suchen' },
      ]
      setRhythmResult(rhythms[Math.floor(Math.random() * rhythms.length)])
      setAnalyzing(false)
    }, 3000)
  }

  useEffect(() => { if (onSaveState) onSaveState({ powered }) }, [powered])

  return (
    <div className="p-4">
      {/* Defi screen */}
      <div className={`rounded-2xl overflow-hidden border-2 ${powered ? 'border-amber-500 bg-surface-900' : 'border-surface-300 bg-surface-200'} transition-colors`}>
        {powered ? (
          <div className="p-4 min-h-[220px]">
            {/* Mode indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                {['manual', 'aed'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`text-xs px-3 py-1 rounded-full font-mono transition-colors ${
                      mode === m ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {m === 'manual' ? 'MANUELL' : 'AED'}
                  </button>
                ))}
              </div>
              <div className={`w-2 h-2 rounded-full ${powered ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>

            {/* Energy display */}
            <div className="bg-black/40 rounded-xl p-4 text-center mb-3">
              <p className="text-[10px] text-amber-400/60 font-mono uppercase tracking-wider">Energie</p>
              <div className="flex items-center justify-center gap-3 my-2">
                <button
                  onClick={() => { const i = energyLevels.indexOf(energy); if (i > 0) setEnergy(energyLevels[i - 1]) }}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <p className="text-4xl font-bold font-mono text-amber-400">{energy}</p>
                <button
                  onClick={() => { const i = energyLevels.indexOf(energy); if (i < energyLevels.length - 1) setEnergy(energyLevels[i + 1]) }}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-white/40 font-mono">Joule</p>
            </div>

            {/* Status */}
            {shockDelivered && (
              <div className="bg-amber-500/20 rounded-xl p-3 text-center mb-3 animate-pulse">
                <Zap className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="text-xs text-amber-400 font-mono mt-1">SCHOCK ABGEGEBEN — {energy}J</p>
              </div>
            )}

            {rhythmResult && (
              <div className={`rounded-xl p-3 mb-3 ${rhythmResult.shockable ? 'bg-red-900/40' : 'bg-green-900/30'}`}>
                <p className={`text-sm font-bold font-mono ${rhythmResult.shockable ? 'text-red-400' : 'text-green-400'}`}>
                  {rhythmResult.rhythm}
                </p>
                <p className="text-xs text-white/60 mt-1">{rhythmResult.desc}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[220px] flex items-center justify-center">
            <p className="text-surface-400 text-sm">Defibrillator aus</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => { setPowered(!powered); setCharged(false); setRhythmResult(null) }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
            powered ? 'border-green-200 bg-green-50 text-green-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'
          }`}
        >
          <Power className="w-5 h-5" />
          <span className="flex-1 text-sm font-medium">{powered ? 'Eingeschaltet' : 'Einschalten'}</span>
        </button>

        {powered && (
          <>
            {mode === 'aed' && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 transition-colors text-left"
              >
                <Activity className="w-5 h-5" />
                <span className="flex-1 text-sm font-medium">{analyzing ? 'Analyse läuft...' : 'Rhythmus analysieren'}</span>
              </button>
            )}

            <button
              onClick={handleCharge}
              disabled={charging || charged}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                charged ? 'border-amber-400 bg-amber-50 text-amber-700 animate-pulse' : charging ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-surface-200 text-surface-600 hover:border-amber-300'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span className="flex-1 text-sm font-medium">
                {charged ? `GELADEN — ${energy}J` : charging ? 'Lädt...' : `Laden (${energy}J)`}
              </span>
            </button>

            <button
              onClick={handleShock}
              disabled={!charged}
              className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl text-lg font-bold transition-all ${
                charged
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 animate-pulse'
                  : 'bg-surface-100 text-surface-400'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
              SCHOCK
            </button>
          </>
        )}
      </div>
    </div>
  )
}
