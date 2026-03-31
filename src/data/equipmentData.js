export const EQUIPMENT = [
  { id: 'monitor', name: 'Patientenmonitor', description: 'Kontinuierliche Überwachung von HF, RR, SpO₂, EKG', cost: 2000, icon: 'Monitor', rooms: ['er', 'icu', 'ward', 'or'], position: { x: 75, y: 10 } },
  { id: 'infusion_pump', name: 'Perfusor', description: 'Präzise Medikamenten- und Katecholamingabe', cost: 900, icon: 'Droplets', rooms: ['icu', 'ward', 'or'], position: { x: 78, y: 45 } },
  { id: 'defibrillator', name: 'Defibrillator', description: 'Im Standardbetrieb Teil des Notfallwagens', cost: 3000, icon: 'Zap', rooms: [], position: { x: 10, y: 65 } },
  { id: 'ventilator', name: 'Beatmungsgerät', description: 'Invasive und nicht-invasive Beatmung', cost: 5000, icon: 'Wind', rooms: ['icu', 'or', 'er'], position: { x: 70, y: 30 } },
  { id: 'ecg', name: 'EKG-Gerät', description: '12-Kanal-EKG Diagnostik', cost: 1500, icon: 'Activity', rooms: ['er', 'icu', 'ward', 'or'], position: { x: 60, y: 5 } },
  { id: 'ultrasound', name: 'Ultraschallgerät', description: 'Stationäres Ultraschallsystem', cost: 4000, icon: 'Scan', rooms: ['radiology'], position: { x: 15, y: 30 } },
  { id: 'ultrasound_portable', name: 'Mobiles Sono', description: 'Mobiles Ultraschallsystem, stationsgebunden und im Zimmer einsetzbar', cost: 6500, icon: 'Scan', rooms: ['er', 'icu', 'ward', 'or'], position: { x: 17, y: 30 } },
  { id: 'suction', name: 'Absauggerät', description: 'Im Standardbetrieb Teil des Notfallwagens', cost: 600, icon: 'Wind', rooms: [], position: { x: 85, y: 60 } },
  { id: 'oxygen', name: 'Sauerstoffanschluss', description: 'Wandanschluss mit Flowmeter und Masken', cost: 500, icon: 'Cloud', rooms: ['er', 'icu', 'ward', 'or'], position: { x: 90, y: 20 } },
  { id: 'crash_cart', name: 'Notfallwagen', description: 'Vollausgestatteter Reanimationswagen inkl. Defibrillator und Absaugung', cost: 4000, icon: 'ShoppingCart', rooms: ['er', 'icu', 'or', 'ward'], position: { x: 8, y: 70 } },
  { id: 'xray_mobile', name: 'Röntgengerät', description: 'Stationäres Röntgengerät für die Radiologie', cost: 6000, icon: 'Scan', rooms: ['radiology'], position: { x: 20, y: 60 } },
  { id: 'xray_portable', name: 'Mobiles Röntgengerät', description: 'Mobiles Röntgensystem, in Radiologie stationiert und stationsübergreifend nutzbar', cost: 8500, icon: 'Scan', rooms: ['radiology'], position: { x: 24, y: 64 } },
  { id: 'lab_analyzer', name: 'Laboranalysegerät', description: 'Automatisierte Blut- und Urinanalyse', cost: 8000, icon: 'FlaskConical', rooms: ['lab'], position: { x: 30, y: 20 } },
  { id: 'centrifuge', name: 'Zentrifuge', description: 'Probentrennung und Aufbereitung', cost: 2000, icon: 'Settings', rooms: ['lab'], position: { x: 60, y: 20 } },
  { id: 'microscope', name: 'Mikroskop', description: 'Mikroskopische Probenuntersuchung', cost: 3000, icon: 'Search', rooms: ['lab'], position: { x: 50, y: 50 } },
  { id: 'ct_scanner', name: 'CT-Scanner', description: 'Computertomographie-Gerät', cost: 25000, icon: 'Scan', rooms: ['radiology'], position: { x: 40, y: 40 } },
  { id: 'mri_scanner', name: 'MRT-Scanner', description: 'Magnetresonanztomograph', cost: 50000, icon: 'Scan', rooms: ['radiology'], position: { x: 40, y: 40 } },
  { id: 'echo_system', name: 'EKG-System', description: 'Kardiologisches EKG-System für 12-Kanal-Diagnostik', cost: 18000, icon: 'Activity', rooms: ['cardiology'], position: { x: 42, y: 38 } },
  { id: 'hkl_suite', name: 'HKL-Anlage', description: 'Interventionelle Herzkatheteranlage mit Angiografie', cost: 70000, icon: 'HeartPulse', rooms: ['cardiology'], position: { x: 50, y: 35 } },
  { id: 'holter_ecg', name: 'Langzeit-EKG-System', description: 'Holter-EKG Recorder und Auswertestation', cost: 14000, icon: 'Activity', rooms: ['cardiology'], position: { x: 55, y: 44 } },
  { id: 'holter_rr', name: 'Langzeit-RR-System', description: '24h Blutdruckmonitoring mit Tagesprofilanalyse', cost: 11000, icon: 'Heart', rooms: ['cardiology'], position: { x: 38, y: 44 } },
  { id: 'spirometry', name: 'Spirometrie-System', description: 'Lungenfunktionsdiagnostik mit Fluss-/Volumenmessung', cost: 9000, icon: 'Wind', rooms: ['pneumology'], position: { x: 46, y: 46 } },
  { id: 'eeg_system', name: 'EEG-System', description: 'Neurologisches Monitoring und EEG-Ableitung', cost: 12000, icon: 'Activity', rooms: ['neurology'], position: { x: 50, y: 40 } },
  { id: 'material_cart', name: 'Materialwagen', description: 'Mobiler Wagen mit Verbänden, Spritzen, Kanülen und Basisbedarf', cost: 1200, icon: 'ShoppingCart', rooms: ['er', 'ward', 'icu', 'or'], position: { x: 35, y: 62 } },
  { id: 'exercise_bike', name: 'Ergometer', description: 'Belastungstraining und Diagnostik', cost: 1200, icon: 'Dumbbell', rooms: ['rehab'], position: { x: 30, y: 50 } },
  { id: 'treatment_table', name: 'Therapieliege', description: 'Physiotherapeutische Behandlungsliege', cost: 800, icon: 'Bed', rooms: ['rehab'], position: { x: 60, y: 50 } },
]

export const TREATMENT_ROOM_COST = 3000
export const SHOCK_ROOM_COST = 6500
export const DEFAULT_ER_FULL_EQUIPMENT = [
  'monitor',
  'ecg',
  'ventilator',
  'oxygen',
  'material_cart',
]
export const SHOCK_ROOM_DEFAULT_EQUIPMENT = [
  'monitor',
  'ecg',
  'ventilator',
  'oxygen',
  'material_cart',
  'crash_cart',
  'infusion_pump',
]
export const SHOCK_ROOM_AUTO_MEDICATIONS = {
  adrenalin: 3,
  amiodaron: 2,
  atropin: 2,
  noradrenalin: 3,
  nacl09: 6,
  ringer: 4,
}

export const MASS_CASUALTY_EVENTS = [
  { id: 'bus_accident', title: 'EILMELDUNG: Schwerer Busunfall auf der Autobahn', description: 'Ein Reisebus mit 40 Passagieren ist auf der A1 verunglückt. Rettungskräfte sind im Großeinsatz. Mehrere Schwer- und Leichtverletzte werden in umliegende Krankenhäuser transportiert.', patientMin: 6, patientMax: 12 },
  { id: 'building_fire', title: 'EILMELDUNG: Großbrand in Wohnkomplex', description: 'In einem mehrstöckigen Wohnhaus ist ein Feuer ausgebrochen. Bewohner werden evakuiert. Rauchvergiftungen und Brandverletzungen werden gemeldet.', patientMin: 5, patientMax: 10 },
  { id: 'train_collision', title: 'EILMELDUNG: Zugunglück am Hauptbahnhof', description: 'Zwei Regionalbahnen sind in der Einfahrt zum Hauptbahnhof kollidiert. Zahlreiche Verletzte. Großalarm für alle Rettungskräfte.', patientMin: 8, patientMax: 15 },
  { id: 'chemical_spill', title: 'EILMELDUNG: Chemieunfall in Industriegebiet', description: 'Bei einem Chemieunfall in einer Fabrik sind giftige Dämpfe freigesetzt worden. Zahlreiche Arbeiter und Anwohner mit Atemwegsbeschwerden.', patientMin: 5, patientMax: 8 },
  { id: 'concert_stampede', title: 'EILMELDUNG: Massenpanik bei Großveranstaltung', description: 'Bei einem Open-Air-Konzert ist es zu einer Massenpanik gekommen. Zahlreiche Personen wurden niedergetrampelt. Rettungsdienste sind im Großeinsatz.', patientMin: 7, patientMax: 14 },
  { id: 'school_incident', title: 'EILMELDUNG: Unfall an einer Schule', description: 'Bei einem Sportunfall an einer Schule sind mehrere Schüler und Betreuer verletzt worden. Rettungswagen sind unterwegs.', patientMin: 4, patientMax: 8 },
]

export function getEquipment(id) {
  return EQUIPMENT.find(e => e.id === id) || null
}

export function getEquipmentForRoom(stationId) {
  return EQUIPMENT.filter(e => e.rooms?.includes(stationId))
}
