export const ORDER_MODALITIES = [
  { id: 'ct', name: 'CT', station: 'radiology', category: 'Radiologie', durationMin: 20, requiredEquipment: 'ct_scanner' },
  { id: 'mri', name: 'MRT', station: 'radiology', category: 'Radiologie', durationMin: 35, requiredEquipment: 'mri_scanner' },
  { id: 'echo', name: 'Echo', station: 'cardiology', category: 'Kardiologie', durationMin: 25, requiredEquipment: 'ultrasound' },
  { id: 'xray', name: 'Röntgen', station: 'radiology', category: 'Radiologie', durationMin: 12, requiredEquipment: ['xray_mobile', 'xray_portable'] },
  { id: 'ekg', name: 'EKG', station: 'cardiology', category: 'Kardiologie', durationMin: 10, requiredEquipment: 'ecg' },
  { id: 'hkl', name: 'HKL', station: 'cardiology', category: 'Kardiologie', durationMin: 45, requiredEquipment: 'hkl_suite' },
  { id: 'langzeit_ekg', name: 'Langzeit-EKG', station: 'cardiology', category: 'Kardiologie', durationMin: 30, requiredEquipment: 'holter_ecg' },
  { id: 'langzeit_rr', name: 'Langzeit-RR', station: 'cardiology', category: 'Kardiologie', durationMin: 25, requiredEquipment: 'holter_rr' },
  { id: 'spiro', name: 'Spirometrie', station: 'pneumology', category: 'Pneumologie', durationMin: 18, requiredEquipment: 'spirometry' },
  { id: 'eeg', name: 'EEG', station: 'neurology', category: 'Neurologie', durationMin: 28, requiredEquipment: 'eeg_system' },
]

export function getOrderModality(modalityId) {
  return ORDER_MODALITIES.find(m => m.id === modalityId) || null
}

export function buildOrderTitle(modalityId) {
  const modality = getOrderModality(modalityId)
  return modality ? `${modality.name}-Anordnung` : 'Anordnung'
}

export function getOrderStatusLabel(status) {
  const map = {
    open: 'Offen',
    accepted: 'Übernommen',
    in_progress: 'In Durchführung',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
  }
  return map[status] || status
}

const DEFAULT_WORKFLOW_STEPS = [
  'Patient korrekt vorbereiten/identifizieren',
  'Protokoll und Sicherheit prüfen',
  'Messung/Bildgebung durchführen',
  'Qualität bewerten und dokumentieren',
]

const MODALITY_WORKFLOW_STEPS = {
  ct: [
    'Patient lagern, Kontrast-/Nüchternstatus prüfen',
    'CT-Protokoll auswählen',
    'Scan durchführen',
    'Bildqualität prüfen',
  ],
  mri: [
    'Sicherheitscheck (Metall/Implantate) und Lagerung',
    'Sequenzen auswählen',
    'MRT-Sequenzen durchführen',
    'Artefakt- und Qualitätskontrolle',
  ],
  xray: [
    'Patient lagern und Strahlenschutz setzen',
    'Aufnahmeprojektion wählen',
    'Röntgenaufnahme durchführen',
    'Belichtung/Schärfe prüfen',
  ],
  hkl: [
    'Steriles Setup und Monitoring prüfen',
    'Zugangsweg/Protokoll festlegen',
    'Katheterdiagnostik durchführen',
    'Interventions-/Komplikationscheck dokumentieren',
  ],
  langzeit_ekg: [
    'Elektroden setzen und Haut vorbereiten',
    'Aufzeichnungsprofil konfigurieren',
    'Messung starten und Signal prüfen',
    'Artefakte markieren und Abschlussreport prüfen',
  ],
  langzeit_rr: [
    'Manschette anlegen und Kalibrierung prüfen',
    'Messintervall festlegen',
    'Messung starten und Testlauf validieren',
    'Mittelwert- und Extremwertcheck dokumentieren',
  ],
  spiro: [
    'Patient instruieren und Kontraindikationen prüfen',
    'Messmodus/Referenz auswählen',
    'Atemmanöver durchführen',
    'Kurvenqualität und Reproduzierbarkeit prüfen',
  ],
  eeg: [
    'Elektrodenkappe vorbereiten und Positionen prüfen',
    'Ableitungsschema konfigurieren',
    'EEG-Aufzeichnung durchführen',
    'Artefakt- und Musterübersicht dokumentieren',
  ],
}

export function getOrderWorkflowSteps(modalityId) {
  return MODALITY_WORKFLOW_STEPS[modalityId] || DEFAULT_WORKFLOW_STEPS
}

function renderPlaceholderSvg(modalityId, title) {
  if (modalityId === 'ekg') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#071216'/>
      <text x='40' y='56' fill='#99f6e4' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <text x='40' y='92' fill='#5eead4' font-size='18' font-family='Arial'>25 mm/s | 10 mm/mV | Ableitung II</text>
      <polyline fill='none' stroke='#2dd4bf' stroke-width='4'
        points='0,320 80,320 96,278 112,362 128,320 208,320 224,286 242,360 258,320 338,320 352,276 372,364 388,320 468,320 486,284 504,358 520,320 600,320 614,278 634,366 650,320 730,320 746,286 764,360 780,320 860,320 876,282 896,362 912,320 960,320' />
      <line x1='0' y1='320' x2='960' y2='320' stroke='#134e4a' stroke-width='1' />
    </svg>`
  }
  if (modalityId === 'echo') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#0f172a'/>
      <text x='36' y='52' fill='#bfdbfe' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <rect x='220' y='92' width='520' height='360' rx='22' fill='#020617' stroke='#1d4ed8' stroke-width='3'/>
      <ellipse cx='480' cy='272' rx='180' ry='118' fill='#1e293b' stroke='#60a5fa' stroke-width='2'/>
      <ellipse cx='420' cy='260' rx='52' ry='70' fill='#334155'/>
      <ellipse cx='540' cy='280' rx='58' ry='82' fill='#334155'/>
      <text x='36' y='500' fill='#93c5fd' font-size='18' font-family='Arial'>PLAX | Tiefe 16 cm | Gain mittel</text>
    </svg>`
  }
  if (modalityId === 'ct') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#111827'/>
      <text x='40' y='56' fill='#cbd5e1' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <circle cx='480' cy='282' r='170' fill='#0b1020' stroke='#475569' stroke-width='3'/>
      <circle cx='480' cy='282' r='130' fill='#1f2937'/>
      <circle cx='430' cy='260' r='36' fill='#374151'/>
      <circle cx='530' cy='290' r='46' fill='#4b5563'/>
      <circle cx='485' cy='320' r='24' fill='#6b7280'/>
      <text x='40' y='500' fill='#94a3b8' font-size='18' font-family='Arial'>axial | Fenster: Weichteil | Schichtdicke: 5 mm</text>
    </svg>`
  }
  if (modalityId === 'mri') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#0b1324'/>
      <text x='40' y='56' fill='#c7d2fe' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <circle cx='480' cy='282' r='180' fill='#111827' stroke='#6366f1' stroke-width='3'/>
      <circle cx='480' cy='282' r='146' fill='#1f2937'/>
      <ellipse cx='480' cy='282' rx='112' ry='84' fill='#374151'/>
      <ellipse cx='480' cy='282' rx='66' ry='48' fill='#6b7280'/>
      <text x='40' y='500' fill='#a5b4fc' font-size='18' font-family='Arial'>T1/T2 Sequenz-Set | Artefakte gering</text>
    </svg>`
  }
  if (modalityId === 'hkl') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#071a1a'/>
      <text x='40' y='56' fill='#99f6e4' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <rect x='140' y='110' width='680' height='320' rx='16' fill='#042f2e' stroke='#14b8a6' stroke-width='3'/>
      <path d='M180 330 C280 180, 420 380, 540 240 C620 150, 700 330, 790 230' fill='none' stroke='#2dd4bf' stroke-width='5'/>
      <text x='40' y='500' fill='#5eead4' font-size='18' font-family='Arial'>Koronarangiographie | Flussdarstellung Platzhalter</text>
    </svg>`
  }
  if (modalityId === 'langzeit_ekg' || modalityId === 'langzeit_rr') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#0f172a'/>
      <text x='40' y='56' fill='#93c5fd' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <rect x='90' y='96' width='780' height='360' rx='16' fill='#111827' stroke='#1d4ed8' stroke-width='2'/>
      <polyline fill='none' stroke='#60a5fa' stroke-width='3' points='110,260 190,260 208,224 226,300 246,260 320,260 340,232 358,292 380,260 460,260 478,220 498,302 516,260 594,260 614,230 634,292 654,260 736,260 754,226 774,296 794,260 870,260'/>
      <text x='40' y='500' fill='#bfdbfe' font-size='18' font-family='Arial'>24h Trendkurve | Ereignismarker Platzhalter</text>
    </svg>`
  }
  if (modalityId === 'spiro') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#082f49'/>
      <text x='40' y='56' fill='#bae6fd' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <rect x='120' y='104' width='720' height='340' rx='14' fill='#0c4a6e' stroke='#38bdf8' stroke-width='2'/>
      <path d='M170 380 C250 170, 380 180, 460 300 C520 380, 620 360, 760 210' fill='none' stroke='#7dd3fc' stroke-width='5'/>
      <text x='40' y='500' fill='#7dd3fc' font-size='18' font-family='Arial'>Flow-Volume-Kurve | Qualität ausreichend</text>
    </svg>`
  }
  if (modalityId === 'eeg') {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
      <rect width='960' height='540' fill='#1e1b4b'/>
      <text x='40' y='56' fill='#ddd6fe' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
      <rect x='100' y='96' width='760' height='360' rx='16' fill='#312e81' stroke='#8b5cf6' stroke-width='2'/>
      <path d='M120 170 L860 170 M120 230 L860 230 M120 290 L860 290 M120 350 L860 350' stroke='#4338ca' stroke-width='1'/>
      <path d='M130 170 C180 130, 220 210, 280 170 C340 130, 390 220, 450 170 C510 130, 560 210, 620 170 C680 130, 730 220, 790 170' fill='none' stroke='#c4b5fd' stroke-width='3'/>
      <path d='M130 290 C180 250, 230 330, 280 290 C330 250, 380 330, 430 290 C480 250, 530 330, 580 290 C630 250, 680 330, 730 290' fill='none' stroke='#a78bfa' stroke-width='3'/>
      <text x='40' y='500' fill='#c4b5fd' font-size='18' font-family='Arial'>Ableitungsmuster | Artefaktkommentar Platzhalter</text>
    </svg>`
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'>
    <rect width='960' height='540' fill='#111827'/>
    <text x='40' y='56' fill='#e2e8f0' font-size='28' font-family='Arial'>${title} - Simulationsbefund</text>
    <rect x='150' y='100' width='660' height='360' rx='20' fill='#0f172a' stroke='#475569' stroke-width='3'/>
    <line x1='170' y1='180' x2='790' y2='180' stroke='#334155' stroke-width='2'/>
    <line x1='170' y1='280' x2='790' y2='280' stroke='#334155' stroke-width='2'/>
    <line x1='170' y1='380' x2='790' y2='380' stroke='#334155' stroke-width='2'/>
  </svg>`
}

export function buildDiagnosticPlaceholderImage(modalityId, modalityName) {
  const title = modalityName || getOrderModality(modalityId)?.name || 'Diagnostik'
  const svg = renderPlaceholderSvg(modalityId, title)
  return {
    src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    alt: `${title} Simulationsbild`,
    caption: `${title}-Bildbefund (Platzhalter)`,
  }
}

