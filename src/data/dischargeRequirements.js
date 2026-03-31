import { evaluateTherapyProgress } from './therapeuticProgress'
import { resolveConditionKeyByCode } from './conditionMapping'

function assignedPrimaryCode(patient) {
  return String(patient?.diagnoses?.primary?.code || '').trim().toUpperCase()
}

function hasAdmissionForm(patient) {
  return (patient?.documents || []).some((d) => String(d?.templateId || '').toLowerCase() === 'aufnahmebogen')
}

function hasLog(patient, pattern) {
  const rx = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  return (patient?.patientLog || []).some(entry => rx.test(entry?.text || ''))
}

function hasExamSubtype(patient, subtype) {
  return (patient?.examResults || []).some(r => r?.subtype === subtype)
}

function hasOrderCompleted(patient, modality) {
  return (patient?.orders || []).some(o => o?.modality === modality && o?.status === 'completed')
}

function hasMedicationTag(patient, tag) {
  return (patient?.appliedTreatments || []).some(t => (t?.effectTags || []).includes(tag))
}

function hasAction(patient, ids = []) {
  return (patient?.appliedTreatments || []).some(t => t?.kind === 'action' && ids.includes(t?.id))
}

function elapsedSinceArrivalHours(patient) {
  const start = Date.parse(patient?.treatedAt || patient?.arrivalTime || '')
  if (!Number.isFinite(start)) return 0
  return Math.max(0, (Date.now() - start) / 3600000)
}

function buildUniversalRequirements(patient) {
  const therapy = evaluateTherapyProgress(patient)
  return [
    { id: 'primary_dx', title: 'Hauptdiagnose gesetzt', detail: 'ICD-10 Hauptdiagnose dokumentiert', critical: true, done: !!patient?.diagnoses?.primary?.code },
    {
      id: 'admission_doc',
      title: 'Aufnahmebogen erstellt',
      detail: 'Aufnahmedokumentation (Aufnahmebogen) in der Akte angelegt',
      critical: true,
      done: hasAdmissionForm(patient),
    },
    {
      id: 'vitals_measured',
      title: 'Vitalparameter erfasst',
      detail: 'Monitor eingeschaltet und mindestens ein Monitoring-Signal aktiv (EKG, SpO2 oder NIBP)',
      critical: true,
      done: hasAction(patient, ['monitor_power_on']) && hasAction(patient, ['ecg_connect', 'spo2_connect', 'nibp_measure']),
    },
    { id: 'lab_done', title: 'Labor erfolgt', detail: 'Mindestens ein Laborauftrag in der Akte', critical: true, done: (patient?.labHistory || []).length > 0 },
    { id: 'exam_done', title: 'Körperliche Untersuchung', detail: 'Mindestens ein dokumentierter Untersuchungsbefund', critical: false, done: (patient?.examResults || []).length > 0 },
    { id: 'observation_time', title: 'Verlaufszeit eingehalten', detail: `Mindestens ${therapy.minHours}h klinische Verlaufsbeobachtung`, critical: true, done: therapy.elapsedHours >= therapy.minHours },
    { id: 'therapy_progress', title: 'Therapiefortschritt ausreichend', detail: `Heilungs-/Therapiefortschritt >= 90% (aktuell ${therapy.percent}%)`, critical: true, done: therapy.percent >= 90 },
  ]
}

const CONDITION_REQUIREMENTS = {
  myocardial_infarction: [
    { id: 'ecg12', title: 'EKG durchgeführt', detail: '12-Kanal-EKG dokumentiert', critical: true, done: (p) => hasLog(p, /EKG|ecg/i) || hasOrderCompleted(p, 'ekg') },
    { id: 'stenosis_therapy', title: 'Stenosen behandelt', detail: 'Revaskularisation (Ballondilatation/Stent) dokumentiert', critical: true, done: (p) => (p?.therapyProgress?.milestones || []).some(m => m.id === 'stenoses_treated' && m.done) },
    { id: 'analgesia', title: 'Analgesie etabliert', detail: 'Schmerztherapie angeordnet/verabreicht', critical: false, done: (p) => hasMedicationTag(p, 'analgesia') },
    { id: 'antithrombotic', title: 'ACS-Basistherapie', detail: 'ASS/Heparin/Nitro dokumentiert', critical: true, done: (p) => hasLog(p, /ASS|Heparin|Nitro/i) },
    { id: 'echo', title: 'Echo veranlasst/abgeschlossen', detail: 'Echo-Anordnung oder Befund vorhanden', critical: false, done: (p) => hasOrderCompleted(p, 'echo') || hasLog(p, /Echo|Echokardiographie/i) },
  ],
  stroke: [
    { id: 'neuro_imaging', title: 'Neuro-Bildgebung abgeschlossen', detail: 'CT oder MRT dokumentiert', critical: true, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'mri') },
    { id: 'rhythm_eval', title: 'Rhythmusdiagnostik initiiert', detail: 'EKG/Langzeit-EKG zur Emboliequellensuche', critical: false, done: (p) => hasOrderCompleted(p, 'ekg') || hasOrderCompleted(p, 'langzeit_ekg') },
    { id: 'secondary_prevention', title: 'Sekundärprävention etabliert', detail: 'Antithrombotische Therapie oder dokumentierte Strategie', critical: true, done: (p) => hasMedicationTag(p, 'antithrombotic') || hasLog(p, /ASS|Heparin|Antikoagulation/i) },
  ],
  pulmonary_embolism: [
    { id: 'pe_imaging', title: 'Bildgebung bei V. a. LAE', detail: 'CT-Angiographie oder gleichwertige Diagnostik erfolgt', critical: true, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'hkl') },
    { id: 'anticoag', title: 'Antikoagulation gestartet', detail: 'Heparin/antithrombotische Therapie dokumentiert', critical: true, done: (p) => hasMedicationTag(p, 'antithrombotic') || hasLog(p, /Heparin|Antikoagulation/i) },
    { id: 'resp_stability', title: 'Respiratorisch stabil', detail: 'SpO2 im Verlauf stabilisiert', critical: false, done: (p) => Number(p?.vitals?.spo2 || 0) >= 93 },
  ],
  heart_failure: [
    { id: 'oxygen_strategy', title: 'Atemstrategie gesetzt', detail: 'O2/NIV/Beatmung dokumentiert', critical: true, done: (p) => hasMedicationTag(p, 'oxygen_support') || hasLog(p, /Sauerstoff|NIV|Beatmung/i) },
    { id: 'decongestion_strategy', title: 'Entstauungs-/Diurese-Management', detail: 'Entstauung bzw. Kreislaufstrategie therapeutisch adressiert', critical: true, done: (p) => hasMedicationTag(p, 'hemodynamic_support') || hasLog(p, /Diurese|Entstauung|Furosemid|Torasemid/i) },
    { id: 'echo', title: 'Echokardiographie', detail: 'Echo zur Funktionsbeurteilung', critical: false, done: (p) => hasOrderCompleted(p, 'echo') },
  ],
  arrhythmia: [
    { id: 'ecg', title: 'Rhythmusdiagnostik', detail: 'EKG/Langzeit-EKG dokumentiert', critical: true, done: (p) => hasOrderCompleted(p, 'ekg') || hasOrderCompleted(p, 'langzeit_ekg') || hasLog(p, /EKG|Rhythmus/i) },
    { id: 'rate_control', title: 'Frequenz-/Rhythmuskontrolle', detail: 'Antiarrythmische oder frequenzkontrollierende Therapie angeordnet', critical: true, done: (p) => hasMedicationTag(p, 'antiischemic') || hasMedicationTag(p, 'chronotropic_support') || hasLog(p, /Amiodaron|Metoprolol|Verapamil|Diltiazem|Kardioversion/i) },
    { id: 'thromboembolic_strategy', title: 'Thromboembolie-Strategie', detail: 'Antikoagulation/Thromboembolieprophylaxe geprüft', critical: false, done: (p) => hasMedicationTag(p, 'antithrombotic') || hasLog(p, /Heparin|Apixaban|Rivaroxaban|CHA2DS2/i) },
  ],
  sepsis_infection: [
    { id: 'cultures_labs', title: 'Infekt-Diagnostik', detail: 'Labor und Fokusdiagnostik erfolgt', critical: true, done: (p) => (p?.labHistory || []).length > 0 && ((p?.orders || []).some(o => o?.status === 'completed') || hasLog(p, /Blutkultur|Sepsis|Fokus/i)) },
    { id: 'abx', title: 'Antibiose gestartet', detail: 'Mindestens ein Antibiotikum verabreicht', critical: true, done: (p) => hasMedicationTag(p, 'antibiotic') },
    { id: 'hemo_support', title: 'Kreislauf-/Volumenstabilisierung', detail: 'Volumen und/oder Kreislaufunterstützung dokumentiert', critical: true, done: (p) => hasMedicationTag(p, 'fluid_resuscitation') || hasMedicationTag(p, 'hemodynamic_support') || hasLog(p, /Noradrenalin|Volumen/i) },
  ],
  hemorrhage_hypovolemia: [
    { id: 'bleed_source_eval', title: 'Blutungsquelle abgeklärt', detail: 'Bildgebung/Endoskopie oder klinische Blutungsquelle dokumentiert', critical: true, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'hkl') || hasOrderCompleted(p, 'endoscopy') || hasLog(p, /Blutung|Hämatemesis|Meläna/i) },
    { id: 'volume_strategy', title: 'Volumen-/Transfusionsstrategie', detail: 'Volumen und ggf. Blutprodukte verabreicht', critical: true, done: (p) => hasMedicationTag(p, 'fluid_resuscitation') || hasMedicationTag(p, 'transfusion_ek') || hasMedicationTag(p, 'transfusion_ffp') },
    { id: 'stability', title: 'Kreislauf ausreichend stabil', detail: 'Keine anhaltende hämodynamische Instabilität', critical: true, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.8 },
  ],
  pneumonia: [
    { id: 'abx', title: 'Antibiose begonnen', detail: 'Mindestens ein Antibiotikum verabreicht', critical: true, done: (p) => hasMedicationTag(p, 'antibiotic') },
    { id: 'oxygen_eval', title: 'Respiratorische Sicherung', detail: 'SpO₂-Verlauf und O2-Strategie dokumentiert', critical: true, done: (p) => hasMedicationTag(p, 'oxygen_support') || hasLog(p, /SpO2|Sauerstoff/i) },
    { id: 'imaging', title: 'Thoraxbildgebung', detail: 'Röntgen oder CT befundet', critical: false, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'xray') },
  ],
  obstructive_airway: [
    { id: 'bronchodilation', title: 'Bronchodilatation', detail: 'Salbutamol/Ipratropium durchgeführt', critical: true, done: (p) => hasMedicationTag(p, 'bronchodilation') },
    { id: 'steroid', title: 'Entzündungshemmung', detail: 'Steroidgabe dokumentiert', critical: false, done: (p) => hasLog(p, /Prednisolon|Hydrocortison/i) },
    { id: 'resp_assessment', title: 'Atembefund', detail: 'Auskultation oder Atembefund dokumentiert', critical: false, done: (p) => hasExamSubtype(p, 'auscultation') || hasLog(p, /Auskultation/i) },
  ],
  hyperglycemia: [
    { id: 'glucose_control', title: 'Glukosekontrolle', detail: 'Insulintherapie oder metabolische Korrektur', critical: true, done: (p) => hasMedicationTag(p, 'glucose_control') || hasLog(p, /Insulin/i) },
    { id: 'electrolytes', title: 'Elektrolyte kontrolliert', detail: 'Labor mit metabolischen Parametern vorhanden', critical: true, done: (p) => (p?.labHistory || []).length > 0 },
    { id: 'volume', title: 'Volumentherapie', detail: 'Volumenersatz eingeleitet', critical: false, done: (p) => hasMedicationTag(p, 'fluid_resuscitation') },
  ],
  surgical_trauma_minor: [
    { id: 'wound_cleaning', title: 'Wundreinigung', detail: 'Wunde gespült und antiseptisch versorgt', critical: true, done: (p) => hasAction(p, ['wound_cleanse']) || hasAction(p, ['wound_clean']) },
    { id: 'wound_closure', title: 'Wundverschluss abgeschlossen', detail: 'Naht abgeschlossen und steriler Verband dokumentiert', critical: true, done: (p) => hasAction(p, ['wound_suture', 'suture']) && hasAction(p, ['wound_dressing']) },
    { id: 'pain_control', title: 'Symptomkontrolle', detail: 'Schmerz deutlich reduziert', critical: true, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.2 || hasMedicationTag(p, 'analgesia') },
  ],
  surgical_trauma_major: [
    { id: 'imaging', title: 'Trauma-Bildgebung', detail: 'Röntgen/CT/MRT zur OP-/Therapieplanung erfolgt', critical: true, done: (p) => hasOrderCompleted(p, 'xray') || hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'mri') },
    { id: 'wound_cleaning', title: 'Wundreinigung', detail: 'Wunde gespült und antiseptisch versorgt', critical: true, done: (p) => hasAction(p, ['wound_cleanse']) || hasAction(p, ['wound_clean']) },
    { id: 'wound_closure', title: 'Wundverschluss abgeschlossen', detail: 'Naht abgeschlossen und steriler Verband dokumentiert', critical: true, done: (p) => hasAction(p, ['wound_suture', 'suture']) && hasAction(p, ['wound_dressing']) },
    { id: 'immobilization', title: 'Immobilisation', detail: 'Gips/Schiene bei Bedarf angelegt', critical: false, done: (p) => hasAction(p, ['cast_apply']) || hasLog(p, /Gips|Schiene|Immobil/i) },
    { id: 'pain_control', title: 'Schmerztherapie', detail: 'Analgesie mit Verlaufskontrolle', critical: true, done: (p) => hasMedicationTag(p, 'analgesia') || hasLog(p, /Schmerz|Analgesie/i) },
  ],
  generic: [
    {
      id: 'symptom_control',
      title: 'Symptomkontrolle',
      detail: 'Beschwerden unter Therapie stabilisiert',
      critical: false,
      done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.5
        && ((p?.appliedTreatments || []).length > 0 || (p?.orders || []).some(o => o?.status === 'completed'))
        && elapsedSinceArrivalHours(p) >= 6,
    },
    { id: 'handover_doc', title: 'Verlauf dokumentiert', detail: 'Verlaufseintrag/Übergabe vorhanden', critical: false, done: (p) => hasLog(p, /Visite|Übergabe|Verlauf/i) },
  ],
}

export function evaluateDischargeRequirements(patient) {
  const assigned = assignedPrimaryCode(patient)
  const conditionKey = assigned ? resolveConditionKeyByCode(assigned) : 'generic'
  const therapyProgress = evaluateTherapyProgress(patient)
  const nextPatient = {
    ...patient,
    therapyProgress,
  }
  const universal = buildUniversalRequirements(nextPatient)
  const specific = (CONDITION_REQUIREMENTS[conditionKey] || CONDITION_REQUIREMENTS.generic).map(item => ({
    ...item,
    done: typeof item.done === 'function' ? !!item.done(nextPatient) : !!item.done,
  }))
  const items = [...universal, ...specific]
  const criticalTotal = items.filter(i => i.critical).length
  const criticalDone = items.filter(i => i.critical && i.done).length
  const total = items.length
  const done = items.filter(i => i.done).length
  const score = total > 0 ? Math.round((done / total) * 100) : 0
  return {
    conditionKey,
    therapyProgress,
    items,
    summary: {
      total,
      done,
      score,
      criticalTotal,
      criticalDone,
      criticalMissing: Math.max(0, criticalTotal - criticalDone),
      complete: done === total,
      therapyPercent: therapyProgress.percent,
      minHours: therapyProgress.minHours,
      elapsedHours: therapyProgress.elapsedHours,
      readyForDischarge: therapyProgress.readyForDischarge,
    },
  }
}

