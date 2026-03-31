export function MonitorGraphic({ active, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Stand */}
      <rect x="26" y="50" width="12" height="4" rx="1" fill="#6b7280" />
      <rect x="29" y="44" width="6" height="8" rx="1" fill="#9ca3af" />
      {/* Screen body */}
      <rect x="6" y="6" width="52" height="38" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
      {/* Screen */}
      <rect x="9" y="9" width="46" height="30" rx="2" fill={active ? '#0a1628' : '#111827'} />
      {active && <>
        {/* ECG line */}
        <polyline points="10,28 16,28 18,28 20,26 21,28 24,28 26,18 28,35 30,28 34,28 38,28 40,26 41,28 44,28 46,18 48,35 50,28 54,28" fill="none" stroke="#22c55e" strokeWidth="1.2" />
        {/* HR */}
        <text x="12" y="17" fontSize="5" fill="#22c55e" fontFamily="monospace" fontWeight="bold">72</text>
        <text x="12" y="22" fontSize="3" fill="#22c55e" opacity="0.6" fontFamily="monospace">HF</text>
        {/* SpO2 */}
        <text x="38" y="17" fontSize="5" fill="#06b6d4" fontFamily="monospace" fontWeight="bold">98</text>
        <text x="38" y="22" fontSize="3" fill="#06b6d4" opacity="0.6" fontFamily="monospace">SpO₂</text>
      </>}
      {/* Power LED */}
      <circle cx="52" cy="47" r="1.5" fill={active ? '#22c55e' : '#4b5563'} />
    </svg>
  )
}

export function DefibrillatorGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="8" y="12" width="48" height="40" rx="6" fill="#dc2626" />
      <rect x="8" y="12" width="48" height="40" rx="6" fill="url(#defiGrad)" />
      <defs><linearGradient id="defiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#b91c1c" /></linearGradient></defs>
      {/* Screen */}
      <rect x="14" y="16" width="24" height="14" rx="2" fill="#1f2937" />
      <polyline points="16,26 20,26 22,20 24,30 26,26 30,26 34,26" fill="none" stroke="#22c55e" strokeWidth="0.8" />
      {/* Buttons */}
      <circle cx="46" cy="22" r="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />
      <text x="44.5" y="24" fontSize="5" fill="#78350f" fontWeight="bold">⚡</text>
      {/* Paddles */}
      <rect x="14" y="34" width="14" height="6" rx="3" fill="#374151" />
      <rect x="36" y="34" width="14" height="6" rx="3" fill="#374151" />
      {/* Cable hint */}
      <path d="M21,40 Q21,46 16,48" fill="none" stroke="#6b7280" strokeWidth="1" />
      <path d="M43,40 Q43,46 48,48" fill="none" stroke="#6b7280" strokeWidth="1" />
      {/* Label */}
      <text x="16" y="48" fontSize="3.5" fill="white" opacity="0.7" fontFamily="sans-serif">DEFIBRILLATOR</text>
    </svg>
  )
}

export function VentilatorGraphic({ active, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Stand pole */}
      <rect x="29" y="48" width="6" height="12" rx="1" fill="#9ca3af" />
      {/* Base */}
      <rect x="20" y="58" width="24" height="4" rx="2" fill="#6b7280" />
      {/* Body */}
      <rect x="10" y="6" width="44" height="42" rx="5" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1" />
      <rect x="10" y="6" width="44" height="42" rx="5" fill="url(#ventGrad)" />
      <defs><linearGradient id="ventGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3f4f6" /><stop offset="100%" stopColor="#d1d5db" /></linearGradient></defs>
      {/* Screen */}
      <rect x="14" y="10" width="36" height="18" rx="2" fill={active ? '#0a1628' : '#1f2937'} />
      {active && <>
        <polyline points="16,22 22,22 24,15 26,26 28,22 34,22 36,16 38,25 40,22 48,22" fill="none" stroke="#22c55e" strokeWidth="0.8" />
        <text x="16" y="18" fontSize="3.5" fill="#06b6d4" fontFamily="monospace">CPAP 5</text>
      </>}
      {/* Dials */}
      <circle cx="22" cy="36" r="4" fill="white" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="22" y1="36" x2="22" y2="33" stroke="#374151" strokeWidth="0.8" />
      <circle cx="36" cy="36" r="4" fill="white" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="36" y1="36" x2="38" y2="34" stroke="#374151" strokeWidth="0.8" />
      {/* Tube connection */}
      <rect x="50" y="20" width="8" height="6" rx="2" fill="#9ca3af" />
      <path d="M58,23 Q62,23 62,28 Q62,34 58,38" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2,1" />
    </svg>
  )
}

export function InfusionPumpGraphic({ active, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* IV pole */}
      <rect x="30" y="2" width="4" height="56" rx="1" fill="#d1d5db" />
      {/* Top hooks */}
      <path d="M24,4 Q24,2 26,2 L30,2" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <path d="M40,4 Q40,2 38,2 L34,2" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      {/* IV bag */}
      <rect x="36" y="2" width="12" height="16" rx="3" fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.5" />
      <rect x="40" y="18" width="4" height="3" rx="1" fill="#93c5fd" />
      {/* Drip line */}
      <line x1="42" y1="21" x2="42" y2="38" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
      {active && <circle cx="42" cy="28" r="1" fill="#3b82f6"><animate attributeName="cy" values="22;36;22" dur="2s" repeatCount="indefinite" /></circle>}
      {/* Pump body */}
      <rect x="16" y="28" width="20" height="22" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      {/* Screen */}
      <rect x="19" y="31" width="14" height="8" rx="1" fill={active ? '#0a1628' : '#1f2937'} />
      {active && <text x="21" y="37" fontSize="4" fill="#22c55e" fontFamily="monospace">120ml/h</text>}
      {/* Buttons */}
      <circle cx="22" cy="44" r="2" fill="#22c55e" />
      <circle cx="30" cy="44" r="2" fill="#ef4444" />
      {/* Base wheels */}
      <circle cx="24" cy="60" r="3" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5" />
      <circle cx="40" cy="60" r="3" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5" />
    </svg>
  )
}

export function EcgMachineGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Cart body */}
      <rect x="8" y="16" width="48" height="34" rx="4" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" />
      {/* Screen */}
      <rect x="12" y="20" width="40" height="16" rx="2" fill="#0f172a" />
      {/* ECG traces */}
      <polyline points="14,30 18,30 20,24 22,34 24,30 30,30 32,26 34,32 36,30 42,30 44,25 46,33 48,30" fill="none" stroke="#22c55e" strokeWidth="0.8" />
      <polyline points="14,34 18,34 20,31 22,36 24,34 30,34" fill="none" stroke="#eab308" strokeWidth="0.6" opacity="0.7" />
      {/* Paper output */}
      <rect x="14" y="40" width="36" height="6" rx="1" fill="#fef3c7" stroke="#fcd34d" strokeWidth="0.3" />
      <line x1="16" y1="43" x2="48" y2="43" stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" />
      {/* Wheels */}
      <circle cx="16" cy="54" r="3" fill="#6b7280" />
      <circle cx="48" cy="54" r="3" fill="#6b7280" />
      {/* Cable bundle */}
      <path d="M32,50 L32,56 Q32,60 28,60" fill="none" stroke="#6b7280" strokeWidth="1.5" />
      {/* Top handle */}
      <rect x="22" y="12" width="20" height="4" rx="2" fill="#d1d5db" />
    </svg>
  )
}

export function UltrasoundGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="12" y="14" width="40" height="36" rx="4" fill="#374151" />
      {/* Screen */}
      <rect x="16" y="18" width="32" height="20" rx="2" fill="#0f172a" />
      {/* Ultrasound image hint */}
      <ellipse cx="32" cy="28" rx="10" ry="8" fill="none" stroke="#6b7280" strokeWidth="0.5" />
      <ellipse cx="32" cy="28" rx="6" ry="5" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
      <circle cx="32" cy="28" r="2" fill="#334155" />
      {/* Controls */}
      <circle cx="24" cy="44" r="3" fill="#4b5563" />
      <circle cx="40" cy="44" r="3" fill="#4b5563" />
      {/* Probe */}
      <rect x="48" y="30" width="8" height="4" rx="2" fill="#9ca3af" />
      <path d="M56,32 Q60,32 60,36 L60,44 Q60,46 58,46 L56,46 Q54,46 54,44 L54,36 Q54,32 56,32" fill="#6b7280" />
      {/* Stand */}
      <rect x="28" y="50" width="8" height="4" rx="1" fill="#6b7280" />
      <circle cx="24" cy="58" r="3" fill="#4b5563" />
      <circle cx="40" cy="58" r="3" fill="#4b5563" />
    </svg>
  )
}

export function CrashCartGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Cart body */}
      <rect x="10" y="10" width="44" height="40" rx="3" fill="#ef4444" />
      <defs><linearGradient id="cartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient></defs>
      <rect x="10" y="10" width="44" height="40" rx="3" fill="url(#cartGrad)" />
      {/* Drawers */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x="13" y={14 + i * 9} width="38" height="7" rx="1" fill="#fca5a5" stroke="#ef4444" strokeWidth="0.3" />
          <rect x="28" y={16 + i * 9} width="8" height="2" rx="1" fill="#dc2626" />
        </g>
      ))}
      {/* Cross symbol */}
      <rect x="28" y="4" width="8" height="6" rx="1" fill="white" />
      <rect x="30" y="5" width="4" height="4" fill="#ef4444" />
      <rect x="29" y="6" width="6" height="2" fill="#ef4444" />
      {/* Wheels */}
      <circle cx="16" cy="54" r="3" fill="#4b5563" />
      <circle cx="48" cy="54" r="3" fill="#4b5563" />
      {/* Handle */}
      <rect x="50" y="14" width="4" height="30" rx="2" fill="#991b1b" />
    </svg>
  )
}

export function OxygenGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Wall plate */}
      <rect x="18" y="8" width="28" height="48" rx="4" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1" />
      {/* Connector green */}
      <circle cx="32" cy="24" r="8" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
      <circle cx="32" cy="24" r="4" fill="#166534" />
      <text x="26" y="26" fontSize="5" fill="white" fontWeight="bold" fontFamily="sans-serif">O₂</text>
      {/* Flow meter */}
      <rect x="26" y="36" width="12" height="16" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
      <rect x="28" y="38" width="8" height="12" rx="1" fill="#f0fdf4" />
      {/* Flow indicator */}
      <circle cx="32" cy="44" r="2" fill="#22c55e" />
      {/* Markings */}
      {[0,1,2,3,4].map(i => <line key={i} x1="29" y1={39 + i * 2.5} x2="31" y2={39 + i * 2.5} stroke="#9ca3af" strokeWidth="0.3" />)}
      {/* Tube */}
      <path d="M32,52 Q32,56 28,58 Q24,60 20,60" fill="none" stroke="#86efac" strokeWidth="2" />
    </svg>
  )
}

export function MedCabinetGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Cabinet body */}
      <rect x="8" y="4" width="48" height="56" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      {/* Door left */}
      <rect x="10" y="6" width="22" height="52" rx="2" fill="white" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Door right */}
      <rect x="34" y="6" width="20" height="52" rx="2" fill="white" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Handle */}
      <rect x="30" y="26" width="2" height="8" rx="1" fill="#9ca3af" />
      <rect x="34" y="26" width="2" height="8" rx="1" fill="#9ca3af" />
      {/* Cross */}
      <rect x="18" y="22" width="8" height="2" rx="0.5" fill="#ef4444" />
      <rect x="21" y="19" width="2" height="8" rx="0.5" fill="#ef4444" />
      {/* Shelves visible through glass */}
      <line x1="12" y1="20" x2="30" y2="20" stroke="#e5e7eb" strokeWidth="0.5" />
      <line x1="12" y1="34" x2="30" y2="34" stroke="#e5e7eb" strokeWidth="0.5" />
      <line x1="12" y1="46" x2="30" y2="46" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Pills on shelves */}
      <rect x="14" y="15" width="6" height="4" rx="1" fill="#fbbf24" />
      <rect x="22" y="16" width="5" height="3" rx="1" fill="#60a5fa" />
      <rect x="14" y="28" width="4" height="5" rx="1" fill="#f87171" />
      <rect x="20" y="29" width="6" height="4" rx="1" fill="#a78bfa" />
    </svg>
  )
}

export function SuctionGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Main unit */}
      <rect x="14" y="12" width="36" height="36" rx="4" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      {/* Canister */}
      <rect x="20" y="18" width="16" height="24" rx="3" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
      <rect x="20" y="18" width="16" height="8" rx="3" fill="#fecaca" opacity="0.5" />
      {/* Gauge */}
      <circle cx="44" cy="24" r="5" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
      <line x1="44" y1="24" x2="44" y2="20" stroke="#374151" strokeWidth="0.8" />
      {/* Tube */}
      <path d="M28,12 Q28,6 34,6 Q40,6 44,10" fill="none" stroke="#9ca3af" strokeWidth="2" />
      {/* Power switch */}
      <circle cx="44" cy="38" r="3" fill="#22c55e" />
      {/* Wheels */}
      <circle cx="20" cy="52" r="3" fill="#6b7280" />
      <circle cx="44" cy="52" r="3" fill="#6b7280" />
    </svg>
  )
}

export function WoundCareGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Kit box */}
      <rect x="8" y="16" width="48" height="32" rx="4" fill="white" stroke="#d1d5db" strokeWidth="1" />
      {/* Cross */}
      <rect x="26" y="24" width="12" height="4" rx="1" fill="#ef4444" />
      <rect x="30" y="20" width="4" height="12" rx="1" fill="#ef4444" />
      {/* Clasp */}
      <rect x="28" y="14" width="8" height="4" rx="2" fill="#9ca3af" />
      {/* Handle */}
      <path d="M24,14 Q24,8 32,8 Q40,8 40,14" fill="none" stroke="#6b7280" strokeWidth="2" />
      {/* Some items peeking out */}
      <rect x="12" y="36" width="10" height="3" rx="1" fill="#fbbf24" opacity="0.8" />
      <rect x="42" y="36" width="8" height="4" rx="1" fill="#93c5fd" opacity="0.8" />
    </svg>
  )
}

export function GenericEquipmentGraphic({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="40" height="40" rx="6" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="32" cy="28" r="8" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="32" y1="22" x2="32" y2="28" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="32" cy="28" r="2" fill="#9ca3af" />
      <rect x="24" y="40" width="16" height="3" rx="1.5" fill="#d1d5db" />
    </svg>
  )
}

const GRAPHIC_MAP = {
  monitor: MonitorGraphic,
  defibrillator: DefibrillatorGraphic,
  ventilator: VentilatorGraphic,
  infusion_pump: InfusionPumpGraphic,
  ecg: EcgMachineGraphic,
  ultrasound: UltrasoundGraphic,
  ultrasound_portable: UltrasoundGraphic,
  crash_cart: CrashCartGraphic,
  oxygen: OxygenGraphic,
  med_cabinet: MedCabinetGraphic,
  suction: SuctionGraphic,
  wound_care: WoundCareGraphic,
}

export function getEquipmentGraphic(equipmentId) {
  return GRAPHIC_MAP[equipmentId] || GenericEquipmentGraphic
}
