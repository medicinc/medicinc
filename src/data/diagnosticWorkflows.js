export const DIAGNOSTIC_WORKFLOWS = {
  ct: {
    protocols: [
      { id: 'ct_schaedel', label: 'CCT nativ' },
      { id: 'ct_thorax', label: 'CT Thorax' },
      { id: 'ct_abdomen', label: 'CT Abdomen' },
      { id: 'ct_angio', label: 'CT-Angiographie' },
    ],
    findings: [
      { id: 'ct_blutung', label: 'Blutung/aktive Extravasation' },
      { id: 'ct_infiltrat', label: 'Infiltrat/Konsolidierung' },
      { id: 'ct_lungenembolie', label: 'Hinweis auf Lungenembolie' },
      { id: 'ct_kein_akut', label: 'Kein akuter pathologischer Befund' },
    ],
    interventions: [],
  },
  mri: {
    protocols: [
      { id: 'mri_kopf', label: 'MRT Kopf' },
      { id: 'mri_lws', label: 'MRT LWS' },
      { id: 'mri_herz', label: 'Kardio-MRT' },
      { id: 'mri_weichteil', label: 'MRT Weichteil' },
    ],
    findings: [
      { id: 'mri_ischamie', label: 'Ischaemiezeichen' },
      { id: 'mri_oedem', label: 'Oedem/Entzuendung' },
      { id: 'mri_tumorhinweis', label: 'Raumforderung/Tumorhinweis' },
      { id: 'mri_unauffaellig', label: 'Unauffaelliger MRT-Befund' },
    ],
    interventions: [],
  },
  xray: {
    protocols: [
      { id: 'xray_thorax_pa', label: 'Thorax PA' },
      { id: 'xray_thorax_bett', label: 'Thorax Bettaufnahme' },
      { id: 'xray_extremitaet', label: 'Extremitaet' },
      { id: 'xray_becken', label: 'Becken' },
    ],
    findings: [
      { id: 'xray_pneu', label: 'Pneumothoraxzeichen' },
      { id: 'xray_fraktur', label: 'Frakturhinweis' },
      { id: 'xray_stauung', label: 'Pulmonale Stauung' },
      { id: 'xray_kein_akut', label: 'Kein akuter Rontgenbefund' },
    ],
    interventions: [],
  },
  echo: {
    protocols: [
      { id: 'echo_tte', label: 'TTE Standard' },
      { id: 'echo_notfall', label: 'Echo Notfallfokus' },
      { id: 'echo_valves', label: 'Klappenfokus' },
    ],
    findings: [
      { id: 'echo_lv_reduziert', label: 'LV-Funktion reduziert' },
      { id: 'echo_perikarderguss', label: 'Perikarderguss' },
      { id: 'echo_klappe', label: 'Klappenvitium relevant' },
      { id: 'echo_unauffaellig', label: 'Echo ohne akuten Befund' },
    ],
    interventions: [],
  },
  ekg: {
    protocols: [
      { id: 'ekg_12kanal', label: '12-Kanal Ruhe-EKG' },
      { id: 'ekg_rhythmus', label: 'Rhythmusdiagnostik fokussiert' },
    ],
    findings: [
      { id: 'ekg_st_hebung', label: 'ST-Hebung' },
      { id: 'ekg_arrhythmie', label: 'Rhythmusstoerung' },
      { id: 'ekg_ischamie', label: 'Ischaemieverdacht' },
      { id: 'ekg_unauffaellig', label: 'Kein akuter EKG-Befund' },
    ],
    interventions: [
      { id: 'ekg_antiarrhythmisch', label: 'Antiarrhythmische Therapie einleiten' },
    ],
  },
  hkl: {
    protocols: [
      { id: 'hkl_diagnostisch', label: 'Diagnostische Koronarangiographie' },
      { id: 'hkl_acs', label: 'ACS-Interventionsprotokoll' },
      { id: 'hkl_kardiogener_schock', label: 'Schock-Protokoll' },
    ],
    findings: [
      { id: 'hkl_1gef', label: 'Signifikante 1-Gefaess-Erkrankung' },
      { id: 'hkl_2gef', label: 'Signifikante 2-Gefaess-Erkrankung' },
      { id: 'hkl_3gef', label: 'Signifikante 3-Gefaess-Erkrankung' },
      { id: 'hkl_okklusion', label: 'Akute Koronarokklusion' },
    ],
    interventions: [
      { id: 'hkl_ballon', label: 'Ballondilatation (PTCA)' },
      { id: 'hkl_stent', label: 'Stentimplantation' },
      { id: 'hkl_thrombusaspiration', label: 'Thrombusaspiration' },
      { id: 'hkl_fibrinolyse', label: 'Fibrinolyse-Strategie dokumentieren' },
    ],
  },
  langzeit_ekg: {
    protocols: [
      { id: 'holter_24h', label: '24h Holter-EKG' },
      { id: 'holter_event', label: 'Event-getriggertes Langzeit-EKG' },
    ],
    findings: [
      { id: 'holter_vorhofflimmern', label: 'Paroxysmales Vorhofflimmern' },
      { id: 'holter_pause', label: 'Pausen/Bradykardieepisoden' },
      { id: 'holter_ves', label: 'Haeufige VES/SVT-Episoden' },
      { id: 'holter_unauffaellig', label: 'Kein relevantes Ereignis' },
    ],
    interventions: [
      { id: 'ekg_antiarrhythmisch', label: 'Rhythmustherapie anpassen' },
    ],
  },
  langzeit_rr: {
    protocols: [
      { id: 'rr_24h_standard', label: '24h RR Standardprofil' },
      { id: 'rr_tag_nacht', label: 'Tag-/Nachtprofil fokussiert' },
    ],
    findings: [
      { id: 'rr_hypertonie', label: 'Arterielle Hypertonie bestaetigt' },
      { id: 'rr_non_dipper', label: 'Non-Dipper-Profil' },
      { id: 'rr_hypotonie', label: 'Hypotonieepisoden' },
      { id: 'rr_unauffaellig', label: 'Unauffaelliges RR-Profil' },
    ],
    interventions: [
      { id: 'langzeit_rr_antihypertensiv', label: 'Antihypertensive Therapie starten/anpassen' },
    ],
  },
  spiro: {
    protocols: [
      { id: 'spiro_basis', label: 'Basis-Spirometrie' },
      { id: 'spiro_reversibilitaet', label: 'Bronchodilatator-Reversibilitaetstest' },
    ],
    findings: [
      { id: 'spiro_obstruktion', label: 'Obstruktives Muster' },
      { id: 'spiro_restriktion', label: 'Restriktives Muster' },
      { id: 'spiro_gemischt', label: 'Gemischtes Muster' },
      { id: 'spiro_unauffaellig', label: 'Unauffaellige Spirometrie' },
    ],
    interventions: [
      { id: 'spiro_bronchodilatator', label: 'Bronchodilatator-Therapie einleiten' },
    ],
  },
  eeg: {
    protocols: [
      { id: 'eeg_standard', label: 'Standard-EEG 20-30 Min.' },
      { id: 'eeg_aktivierung', label: 'EEG mit Aktivierungsproben' },
      { id: 'eeg_notfall', label: 'Notfall-EEG Monitoring' },
    ],
    findings: [
      { id: 'eeg_epileptiform', label: 'Epileptiforme Potenziale' },
      { id: 'eeg_generalisiert', label: 'Generalisierte Verlangsamung' },
      { id: 'eeg_fokal', label: 'Fokale Auffaelligkeit' },
      { id: 'eeg_unauffaellig', label: 'Kein pathologischer EEG-Befund' },
    ],
    interventions: [
      { id: 'eeg_antikonvulsiv', label: 'Antikonvulsive Therapie anpassen' },
    ],
  },
}

export function getDiagnosticWorkflowConfig(modalityId) {
  return DIAGNOSTIC_WORKFLOWS[modalityId] || { protocols: [], findings: [], interventions: [] }
}
