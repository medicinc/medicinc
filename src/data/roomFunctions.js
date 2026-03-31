export const ROOM_FUNCTIONS = {
  er: {
    name: 'Notaufnahme',
    description: 'Erstversorgung und Stabilisierung von Notfallpatienten',
    actions: [
      { id: 'triage', name: 'Triage durchführen', description: 'Ersteinschätzung und Dringlichkeitseinstufung', icon: 'ClipboardList', requiresPatient: true, duration: 5, xpReward: 15 },
      { id: 'stabilize', name: 'Patient stabilisieren', description: 'ABC-Sicherung und Erstmaßnahmen', icon: 'HeartPulse', requiresPatient: true, duration: 10, xpReward: 25 },
      { id: 'iv_access', name: 'Venösen Zugang legen', description: 'Peripheren oder zentralen Zugang legen', icon: 'Syringe', requiresPatient: true, duration: 3, xpReward: 10 },
      { id: 'wound_care', name: 'Wundversorgung', description: 'Reinigung, Desinfektion und Naht/Verband', icon: 'Bandage', requiresPatient: true, duration: 15, xpReward: 20 },
      { id: 'reanimation', name: 'Reanimation', description: 'CPR und erweiterte Reanimationsmaßnahmen', icon: 'Zap', requiresPatient: true, duration: 30, xpReward: 50, requiresEquipment: ['defibrillator', 'crash_cart'] },
    ],
  },
  ward: {
    name: 'Allgemeinstation',
    description: 'Stationäre Versorgung und Überwachung',
    actions: [
      { id: 'round', name: 'Visite durchführen', description: 'Tägliche Visite und Behandlungsplan aktualisieren', icon: 'Stethoscope', requiresPatient: true, duration: 10, xpReward: 15 },
      { id: 'medication', name: 'Medikation anpassen', description: 'Medikamente verordnen oder ändern', icon: 'Pill', requiresPatient: true, duration: 5, xpReward: 10 },
      { id: 'consult', name: 'Konsil anfordern', description: 'Facharztmeinung einholen', icon: 'Users', requiresPatient: true, duration: 2, xpReward: 5 },
      { id: 'discharge_plan', name: 'Entlassmanagement', description: 'Entlassung vorbereiten, Brief erstellen', icon: 'FileText', requiresPatient: true, duration: 15, xpReward: 20 },
    ],
  },
  icu: {
    name: 'Intensivstation',
    description: 'Intensivmedizinische Überwachung und Therapie',
    actions: [
      { id: 'ventilation', name: 'Beatmung einstellen', description: 'Beatmungsparameter optimieren', icon: 'Wind', requiresPatient: true, duration: 10, xpReward: 30, requiresEquipment: ['ventilator'] },
      { id: 'hemodynamics', name: 'Kreislauf-Management', description: 'Katecholamine und Volumentherapie steuern', icon: 'Activity', requiresPatient: true, duration: 8, xpReward: 25, requiresEquipment: ['monitor', 'infusion_pump'] },
      { id: 'sedation', name: 'Sedierung/Analgesie', description: 'Analgosedierung anpassen', icon: 'Moon', requiresPatient: true, duration: 5, xpReward: 15 },
      { id: 'arterial_line', name: 'Arteriellen Zugang legen', description: 'Invasive Blutdruckmessung', icon: 'Syringe', requiresPatient: true, duration: 15, xpReward: 35 },
      { id: 'icu_round', name: 'Intensivvisite', description: 'Umfassende Evaluierung aller Organsysteme', icon: 'Stethoscope', requiresPatient: true, duration: 20, xpReward: 30 },
    ],
  },
  or: {
    name: 'OP-Saal',
    description: 'Operative Eingriffe und chirurgische Versorgung',
    actions: [
      { id: 'surgery_prep', name: 'OP vorbereiten', description: 'Patientenaufklärung, Narkosevorbereitung', icon: 'ClipboardCheck', requiresPatient: true, duration: 15, xpReward: 20 },
      { id: 'surgery', name: 'Operation durchführen', description: 'Chirurgischer Eingriff', icon: 'Scissors', requiresPatient: true, duration: 60, xpReward: 100 },
      { id: 'anesthesia', name: 'Narkose einleiten', description: 'Anästhesie einleiten und überwachen', icon: 'Syringe', requiresPatient: true, duration: 10, xpReward: 30, requiresEquipment: ['ventilator', 'monitor'] },
    ],
  },
  lab: {
    name: 'Labor',
    description: 'Labordiagnostik und Probenanalyse',
    actions: [
      { id: 'blood_analysis', name: 'Blutbild erstellen', description: 'Großes Blutbild mit Differenzierung', icon: 'TestTube', requiresPatient: false, duration: 15, xpReward: 10 },
      { id: 'electrolytes', name: 'Elektrolyte bestimmen', description: 'Na, K, Ca, Mg, Phosphat', icon: 'Beaker', requiresPatient: false, duration: 10, xpReward: 8 },
      { id: 'coagulation', name: 'Gerinnung prüfen', description: 'Quick, INR, PTT, Fibrinogen', icon: 'Droplets', requiresPatient: false, duration: 10, xpReward: 8 },
      { id: 'blood_gas', name: 'Blutgasanalyse', description: 'Arterielle BGA: pH, pO₂, pCO₂, Laktat', icon: 'Activity', requiresPatient: false, duration: 5, xpReward: 10 },
      { id: 'urine_analysis', name: 'Urinanalyse', description: 'Urinstatus und Sediment', icon: 'TestTube', requiresPatient: false, duration: 8, xpReward: 5 },
    ],
  },
  radiology: {
    name: 'Radiologie',
    description: 'Bildgebende Diagnostik',
    actions: [
      { id: 'xray', name: 'Röntgenaufnahme', description: 'Konventionelle Röntgenbildgebung', icon: 'Scan', requiresPatient: true, duration: 10, xpReward: 10 },
      { id: 'ct_scan', name: 'CT-Untersuchung', description: 'Computertomographie mit oder ohne KM', icon: 'Scan', requiresPatient: true, duration: 20, xpReward: 20 },
      { id: 'mri_scan', name: 'MRT-Untersuchung', description: 'Magnetresonanztomographie', icon: 'Scan', requiresPatient: true, duration: 45, xpReward: 25 },
      { id: 'ultrasound_diag', name: 'Sonographie', description: 'Ultraschalluntersuchung', icon: 'Scan', requiresPatient: true, duration: 15, xpReward: 15, requiresEquipment: ['ultrasound'] },
    ],
  },
  cardiology: {
    name: 'Kardiologie',
    description: 'Kardiologische Diagnostik und interventionelle Basisversorgung',
    actions: [
      { id: 'ekg', name: 'Ruhe-EKG', description: '12-Kanal-EKG ableiten und dokumentieren', icon: 'Activity', requiresPatient: true, duration: 10, xpReward: 10 },
      { id: 'echo_order', name: 'Echo durchführen', description: 'Echokardiographie inkl. Funktionsbeurteilung', icon: 'Scan', requiresPatient: true, duration: 20, xpReward: 20 },
      { id: 'hkl_prep', name: 'HKL vorbereiten', description: 'Herzkatheter-Labor organisatorisch vorbereiten', icon: 'Zap', requiresPatient: true, duration: 20, xpReward: 25 },
      { id: 'long_ecg', name: 'Langzeit-EKG planen', description: 'Holter-Monitoring anlegen', icon: 'Clock', requiresPatient: true, duration: 12, xpReward: 12 },
    ],
  },
  pneumology: {
    name: 'Pneumologie',
    description: 'Atemwegserkrankungen und Funktionsdiagnostik',
    actions: [
      { id: 'spiro', name: 'Spirometrie', description: 'Lungenfunktionstest mit Flow-Volumen-Kurve', icon: 'Wind', requiresPatient: true, duration: 12, xpReward: 12 },
      { id: 'bodypleth', name: 'Bodyplethysmographie', description: 'Erweiterte Lungenfunktionsmessung', icon: 'Wind', requiresPatient: true, duration: 18, xpReward: 18 },
    ],
  },
  neurology: {
    name: 'Neurologie',
    description: 'Neurologische Diagnostik und Monitoring',
    actions: [
      { id: 'eeg', name: 'EEG', description: 'Elektroenzephalographie durchführen', icon: 'Activity', requiresPatient: true, duration: 20, xpReward: 18 },
      { id: 'neuro_exam', name: 'Neurologischer Status', description: 'Strukturierter neurologischer Untersuchungsgang', icon: 'ClipboardList', requiresPatient: true, duration: 15, xpReward: 14 },
    ],
  },
  pharmacy: {
    name: 'Apotheke',
    description: 'Medikamentenversorgung und pharmazeutische Beratung',
    actions: [
      { id: 'dispense_meds', name: 'Medikamente ausgeben', description: 'Verordnete Medikamente bereitstellen', icon: 'Pill', requiresPatient: false, duration: 5, xpReward: 5 },
      { id: 'check_interactions', name: 'Wechselwirkungen prüfen', description: 'Arzneimittelinteraktionen analysieren', icon: 'AlertTriangle', requiresPatient: false, duration: 10, xpReward: 15 },
      { id: 'compound', name: 'Rezeptur herstellen', description: 'Individuelle Medikamente anfertigen', icon: 'FlaskConical', requiresPatient: false, duration: 20, xpReward: 20 },
    ],
  },
  rehab: {
    name: 'Rehabilitationszentrum',
    description: 'Physiotherapie und Rehabilitationsmaßnahmen',
    actions: [
      { id: 'physio', name: 'Physiotherapie', description: 'Mobilisation und Bewegungstherapie', icon: 'Dumbbell', requiresPatient: true, duration: 30, xpReward: 15 },
      { id: 'ergotherapy', name: 'Ergotherapie', description: 'Alltagstraining und Feinmotorik', icon: 'Hand', requiresPatient: true, duration: 30, xpReward: 15 },
      { id: 'speech', name: 'Logopädie', description: 'Sprach- und Schlucktherapie', icon: 'MessageCircle', requiresPatient: true, duration: 30, xpReward: 15 },
    ],
  },
  ambulance_intake: {
    name: 'Ambulante Aufnahme',
    description: 'Aufnahme und Registrierung ambulanter Patienten',
    actions: [
      { id: 'register', name: 'Patient aufnehmen', description: 'Personalien und Versicherungsdaten erfassen', icon: 'FileText', requiresPatient: true, duration: 5, xpReward: 5 },
      { id: 'quick_check', name: 'Kurzanamnese', description: 'Schnelle Befragung zum Vorstellungsgrund', icon: 'ClipboardList', requiresPatient: true, duration: 5, xpReward: 5 },
    ],
  },
  waiting_room: {
    name: 'Wartezimmer',
    description: 'Wartebereich für Patienten',
    actions: [
      { id: 'call_patient', name: 'Patient aufrufen', description: 'Nächsten Patienten zur Behandlung aufrufen', icon: 'Megaphone', requiresPatient: true, duration: 1, xpReward: 2 },
    ],
  },
}

export const EQUIPMENT_ACTIONS = {
  monitor: {
    name: 'Patientenmonitor',
    actions: [
      { id: 'continuous_monitoring', name: 'Dauerüberwachung starten', description: 'HF, RR, SpO₂ und EKG kontinuierlich überwachen', duration: 1, xpReward: 5 },
      { id: 'alarm_setup', name: 'Alarme konfigurieren', description: 'Alarmgrenzen für Vitalparameter einstellen', duration: 2, xpReward: 3 },
    ],
  },
  infusion_pump: {
    name: 'Perfusor',
    actions: [
      { id: 'start_infusion', name: 'Infusion starten', description: 'Flüssigkeit oder Medikament anhängen und Rate einstellen', duration: 3, xpReward: 8 },
      { id: 'adjust_rate', name: 'Infusionsrate anpassen', description: 'Laufrate erhöhen oder verringern', duration: 1, xpReward: 3 },
      { id: 'bolus', name: 'Bolus verabreichen', description: 'Schnelle Bolusgabe über die Pumpe', duration: 2, xpReward: 5 },
    ],
  },
  defibrillator: {
    name: 'Defibrillator',
    actions: [
      { id: 'defib_check', name: 'Gerät prüfen', description: 'Funktions- und Ladeprüfung', duration: 2, xpReward: 3 },
      { id: 'rhythm_analysis', name: 'Rhythmus analysieren', description: 'Herzrhythmus über Pads analysieren', duration: 3, xpReward: 10 },
      { id: 'defibrillate', name: 'Defibrillieren', description: 'Schock mit eingestellter Energie abgeben', duration: 1, xpReward: 25 },
      { id: 'cardioversion', name: 'Kardioversion', description: 'Synchronisierte Kardioversion durchführen', duration: 5, xpReward: 30 },
    ],
  },
  ventilator: {
    name: 'Beatmungsgerät',
    actions: [
      { id: 'vent_setup', name: 'Beatmung einstellen', description: 'Modus, FiO₂, PEEP und Tidalvolumen konfigurieren', duration: 5, xpReward: 15 },
      { id: 'niv', name: 'NIV starten', description: 'Nicht-invasive Beatmung über Maske', duration: 3, xpReward: 10 },
      { id: 'weaning', name: 'Weaning beginnen', description: 'Schrittweise Reduktion der Beatmungsunterstützung', duration: 10, xpReward: 20 },
    ],
  },
  ecg: {
    name: 'EKG-Gerät',
    actions: [
      { id: 'ecg_12lead', name: '12-Kanal-EKG', description: 'Komplettes 12-Kanal-EKG ableiten', duration: 5, xpReward: 10 },
      { id: 'ecg_interpret', name: 'EKG auswerten', description: 'Rhythmus, ST-Strecke und Intervalle beurteilen', duration: 8, xpReward: 20 },
    ],
  },
  ultrasound: {
    name: 'Ultraschallgerät',
    actions: [
      { id: 'fast_exam', name: 'FAST-Sonographie', description: 'Focused Assessment with Sonography for Trauma', duration: 10, xpReward: 15 },
      { id: 'echo', name: 'Echokardiographie', description: 'Herzultraschall zur Funktionsbeurteilung', duration: 20, xpReward: 25 },
      { id: 'vascular_access', name: 'Sono-gestützter Zugang', description: 'Ultraschallgestützte Gefäßpunktion', duration: 10, xpReward: 20 },
    ],
  },
  ultrasound_portable: {
    name: 'Mobiles Sono',
    actions: [
      { id: 'portable_fast_exam', name: 'Mobiles FAST', description: 'Fokussierte Sonographie direkt am Patientenbett', duration: 8, xpReward: 14 },
      { id: 'portable_lung_exam', name: 'Lungensonographie', description: 'Pleura-/B-Linien-Check bei Dyspnoe', duration: 8, xpReward: 12 },
      { id: 'portable_echo_quick', name: 'Fokussiertes Echo', description: 'Schnelle kardiale Orientierungsdiagnostik', duration: 10, xpReward: 16 },
    ],
  },
  suction: {
    name: 'Absauggerät',
    actions: [
      { id: 'oral_suction', name: 'Oral absaugen', description: 'Sekret aus Mund und Rachen absaugen', duration: 2, xpReward: 5 },
      { id: 'endo_suction', name: 'Endotracheal absaugen', description: 'Absaugung über Tubus oder Trachealkanüle', duration: 5, xpReward: 10 },
    ],
  },
  wound_care: {
    name: 'Wundversorgungsset',
    actions: [
      { id: 'wound_clean', name: 'Wundreinigung', description: 'Wunde spülen und desinfizieren', duration: 5, xpReward: 5 },
      { id: 'suture', name: 'Wunde nähen', description: 'Chirurgische Naht anlegen', duration: 15, xpReward: 20 },
      { id: 'bandage', name: 'Verband anlegen', description: 'Steriler Wundverband', duration: 5, xpReward: 5 },
    ],
  },
  oxygen: {
    name: 'Sauerstoffanschluss',
    actions: [
      { id: 'o2_nasal', name: 'O₂ über Nasenbrille', description: '1-6 L/min über Nasenkanüle', duration: 2, xpReward: 3 },
      { id: 'o2_mask', name: 'O₂ über Maske', description: 'Sauerstoffmaske mit Reservoir', duration: 2, xpReward: 5 },
      { id: 'high_flow', name: 'High-Flow-Therapie', description: 'High-Flow-Nasenkanüle mit hohem Fluss', duration: 5, xpReward: 10 },
    ],
  },
  crash_cart: {
    name: 'Notfallwagen',
    actions: [
      { id: 'cart_check', name: 'Notfallwagen prüfen', description: 'Vollständigkeit und Verfallsdaten kontrollieren', duration: 10, xpReward: 5 },
      { id: 'emergency_meds', name: 'Notfallmedikament geben', description: 'Adrenalin, Amiodaron, Atropin etc.', duration: 2, xpReward: 15 },
      { id: 'intubation', name: 'Intubation', description: 'Endotracheale Intubation durchführen', duration: 5, xpReward: 35 },
      { id: 'oral_suction', name: 'Oral absaugen', description: 'Sekret aus Mund/Rachen entfernen', duration: 2, xpReward: 6 },
      { id: 'endo_suction', name: 'Endotracheal absaugen', description: 'Sekret über Tubus absaugen', duration: 3, xpReward: 8 },
    ],
  },
  material_cart: {
    name: 'Materialwagen',
    actions: [
      { id: 'material_iv_set', name: 'i.v.-Set vorbereiten', description: 'Kanüle, Schlauchsystem und Desinfektion vorbereiten', duration: 3, xpReward: 4 },
      { id: 'material_wound_pack', name: 'Wundset bereitstellen', description: 'Steriles Material für Wundversorgung zusammenstellen', duration: 2, xpReward: 3 },
      { id: 'material_lab_set', name: 'Laborset bereitstellen', description: 'Monovetten, Tupfer und Röhrchen vorbereiten', duration: 2, xpReward: 3 },
      { id: 'material_restock', name: 'Wagen nachfüllen', description: 'Verbrauchsmaterial kontrollieren und auffüllen', duration: 4, xpReward: 5 },
    ],
  },
}

export const WORKER_FUNCTIONS = {
  pflegefachkraft: {
    passiveEffects: [
      { id: 'auto_vitals', description: 'Erfasst automatisch Vitalzeichen bei neuen Patienten', interval: 300 },
      { id: 'patient_comfort', description: 'Verbessert Patientenzufriedenheit um 10%', bonus: 0.1 },
    ],
    manualActions: [
      { id: 'wash_patient', name: 'Patienten waschen', description: 'Grundpflege und Körperhygiene', duration: 15, xpReward: 5 },
      { id: 'wound_change', name: 'Verbandwechsel', description: 'Steriler Verbandwechsel', duration: 10, xpReward: 8 },
      { id: 'positioning', name: 'Lagerung', description: 'Patienten umlagern (Dekubitus-Prophylaxe)', duration: 5, xpReward: 3 },
    ],
  },
  techniker: {
    passiveEffects: [
      { id: 'auto_maintenance', description: 'Geräte werden automatisch gewartet', interval: 1800 },
      { id: 'reduce_breakdown', description: 'Reduziert Geräteausfälle um 50%', bonus: 0.5 },
    ],
    manualActions: [
      { id: 'repair_equipment', name: 'Gerät reparieren', description: 'Defektes Gerät wieder instand setzen', duration: 30, xpReward: 15 },
      { id: 'calibrate', name: 'Gerät kalibrieren', description: 'Messgenauigkeit sicherstellen', duration: 15, xpReward: 8 },
    ],
  },
  mta: {
    passiveEffects: [
      { id: 'faster_labs', description: 'Laborergebnisse 30% schneller verfügbar', bonus: 0.3 },
    ],
    manualActions: [
      { id: 'process_sample', name: 'Probe bearbeiten', description: 'Blut-/Urinprobe analysieren', duration: 15, xpReward: 10 },
      { id: 'special_analysis', name: 'Spezialanalyse', description: 'Erweiterte Diagnostik (Kultur, Serologie)', duration: 30, xpReward: 20 },
    ],
  },
  radiologietechnolog: {
    passiveEffects: [
      { id: 'faster_imaging', description: 'Bildgebung 25% schneller', bonus: 0.25 },
    ],
    manualActions: [
      { id: 'perform_scan', name: 'Scan durchführen', description: 'Röntgen/CT/MRT bedienen', duration: 15, xpReward: 12 },
      { id: 'contrast_admin', name: 'Kontrastmittel geben', description: 'KM-Gabe vorbereiten und überwachen', duration: 10, xpReward: 10 },
    ],
  },
  reinigungskraft: {
    passiveEffects: [
      { id: 'auto_clean', description: 'Räume werden regelmäßig desinfiziert', interval: 1200 },
      { id: 'infection_control', description: 'Infektionsrisiko um 20% reduziert', bonus: 0.2 },
    ],
    manualActions: [
      { id: 'deep_clean', name: 'Grundreinigung', description: 'Intensive Raum-Desinfektion', duration: 30, xpReward: 5 },
      { id: 'terminal_clean', name: 'Schlussdesinfektion', description: 'Raum nach Entlassung komplett reinigen', duration: 20, xpReward: 8 },
    ],
  },
  triagekraft: {
    passiveEffects: [
      { id: 'auto_triage', description: 'Triagiert neue Walk-in-Patienten automatisch', interval: 120 },
    ],
    manualActions: [
      { id: 'reassess', name: 'Re-Triage', description: 'Erneute Einschätzung bei Zustandsänderung', duration: 5, xpReward: 10 },
    ],
  },
  rettungssanitaeter: {
    passiveEffects: [
      { id: 'faster_handover', description: 'Übergabe von RTW-Patienten 40% schneller', bonus: 0.4 },
    ],
    manualActions: [
      { id: 'handover', name: 'Übergabe durchführen', description: 'Strukturierte Übergabe vom Rettungsdienst', duration: 5, xpReward: 8 },
    ],
  },
  pharmazeut: {
    passiveEffects: [
      { id: 'med_safety', description: 'Reduziert Medikamentenfehler um 40%', bonus: 0.4 },
      { id: 'auto_dispense', description: 'Medikamente automatisch vorbereitet', interval: 480 },
    ],
    manualActions: [
      { id: 'drug_info', name: 'Arzneimittelberatung', description: 'Beratung zu Dosierung und Wechselwirkungen', duration: 10, xpReward: 12 },
      { id: 'tpn', name: 'Parenterale Ernährung', description: 'Individuelle TPN-Lösung herstellen', duration: 20, xpReward: 15 },
    ],
  },
  physiotherapeut: {
    passiveEffects: [
      { id: 'faster_recovery', description: 'Patienten erholen sich 15% schneller', bonus: 0.15 },
    ],
    manualActions: [
      { id: 'mobility_test', name: 'Mobilitätstest', description: 'Funktionelle Bewertung der Mobilität', duration: 15, xpReward: 10 },
      { id: 'respiratory_physio', name: 'Atemphysiotherapie', description: 'Atemübungen und Sekretolyse', duration: 20, xpReward: 12 },
    ],
  },
  sozialarbeiter: {
    passiveEffects: [
      { id: 'better_discharge', description: 'Entlassungen 20% besser organisiert', bonus: 0.2 },
    ],
    manualActions: [
      { id: 'family_talk', name: 'Angehörigengespräch', description: 'Beratung und Unterstützung der Angehörigen', duration: 20, xpReward: 10 },
      { id: 'aftercare', name: 'Nachsorge planen', description: 'Ambulante Nachsorge und Reha organisieren', duration: 15, xpReward: 12 },
    ],
  },
  sicherheitsdienst: {
    passiveEffects: [
      { id: 'psych_event_reduction', description: 'Reduziert psychisch bedingte Zwischenfälle deutlich', bonus: 0.5 },
    ],
    manualActions: [
      { id: 'security_post', name: 'Sicherheitsdienst postieren', description: 'Fixe Präsenz bei auffälligem Patienten', duration: 5, xpReward: 6 },
      { id: 'deescalate', name: 'Deeskalieren', description: 'Akute Eskalation beruhigen', duration: 8, xpReward: 10 },
    ],
  },
}

export function getRoomActions(roomId) {
  return ROOM_FUNCTIONS[roomId] || null
}

export function getEquipmentActions(equipmentId) {
  return EQUIPMENT_ACTIONS[equipmentId] || null
}

export function getWorkerFunctions(workerTypeId) {
  return WORKER_FUNCTIONS[workerTypeId] || null
}
