import { resolveConditionKey } from './conditionMapping'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function hasOrderCompleted(patient, modality) {
  return (patient?.orders || []).some(o => o?.modality === modality && o?.status === 'completed')
}

function hasTreatment(patient, ids = []) {
  const treatments = patient?.appliedTreatments || []
  return treatments.some(t => ids.includes(t?.id) || ids.some(id => (t?.effectTags || []).includes(id)))
}

function hasIntervention(patient, ids = []) {
  return (patient?.orders || []).some(order => {
    if (order?.status !== 'completed') return false
    const interventions = order?.result?.interventions || []
    return interventions.some(i => ids.includes(i))
  })
}

function hasAction(patient, ids = []) {
  return (patient?.appliedTreatments || []).some(t => t?.kind === 'action' && ids.includes(t?.id))
}

function elapsedHours(patient) {
  const start = Date.parse(patient?.treatedAt || patient?.arrivalTime || '')
  if (!Number.isFinite(start)) return 0
  return Math.max(0, (Date.now() - start) / 3600000)
}

const CONDITION_PLANS = {
  myocardial_infarction: {
    minHours: 60,
    fullHours: 120,
    milestones: [
      { id: 'diagnosis_confirmed', label: 'Akutdiagnostik gesichert', weight: 12, done: (p) => hasOrderCompleted(p, 'ekg') || hasOrderCompleted(p, 'hkl') },
      { id: 'stenoses_treated', label: 'Koronarintervention erfolgt', weight: 30, done: (p) => hasIntervention(p, ['hkl_ballon', 'hkl_stent', 'hkl_thrombusaspiration']) },
      { id: 'dual_antithrombotic', label: 'Antithrombotische Akuttherapie etabliert', weight: 16, done: (p) => hasTreatment(p, ['antithrombotic', 'heparin', 'aspirin']) },
      { id: 'antiischemic', label: 'Antiischämische Therapie aktiv', weight: 10, done: (p) => hasTreatment(p, ['antiischemic', 'nitroglycerin', 'metoprolol']) },
      { id: 'echo_or_imaging', label: 'Funktionelle Verlaufskontrolle (Echo/HKL)', weight: 8, done: (p) => hasOrderCompleted(p, 'echo') || hasOrderCompleted(p, 'hkl') },
      { id: 'stability', label: 'Kreislauf klinisch stabilisiert', weight: 14, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.2 && Number(p?.clinicalState?.complaintLevel || 10) <= 3.8 },
      { id: 'secondary_prevention', label: 'Sekundärprävention angesetzt', weight: 10, done: (p) => hasTreatment(p, ['metoprolol']) },
    ],
  },
  stroke: {
    minHours: 48,
    fullHours: 120,
    milestones: [
      { id: 'neuro_imaging', label: 'Neuro-Bildgebung erfolgt', weight: 25, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'mri') },
      { id: 'cause_eval', label: 'Ursachenabklärung gestartet', weight: 15, done: (p) => hasOrderCompleted(p, 'ekg') || hasOrderCompleted(p, 'langzeit_ekg') || hasOrderCompleted(p, 'echo') },
      { id: 'reperfusion_or_prevention', label: 'Reperfusions-/Sekundärstrategie definiert', weight: 20, done: (p) => hasIntervention(p, ['hkl_fibrinolyse']) || hasTreatment(p, ['antithrombotic', 'aspirin']) },
      { id: 'hemodynamic_stability', label: 'Hämodynamisch stabil', weight: 20, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.4 },
      { id: 'symptom_relief', label: 'Neurologische Symptomlast rückläufig', weight: 20, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.4 },
    ],
  },
  pulmonary_embolism: {
    minHours: 36,
    fullHours: 96,
    milestones: [
      { id: 'confirmed', label: 'Diagnostik gesichert (CT/HKL)', weight: 26, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'hkl') },
      { id: 'anticoag', label: 'Antikoagulation etabliert', weight: 24, done: (p) => hasTreatment(p, ['antithrombotic', 'heparin']) },
      { id: 'oxygen', label: 'Oxygenierung stabilisiert', weight: 16, done: (p) => Number(p?.vitals?.spo2 || 0) >= 93 || hasTreatment(p, ['oxygen_support']) },
      { id: 'hemodynamics', label: 'Kreislauf stabil', weight: 18, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.5 },
      { id: 'symptoms', label: 'Dyspnoe/Thoraxbeschwerden rückläufig', weight: 16, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.3 },
    ],
  },
  pneumonia: {
    minHours: 36,
    fullHours: 84,
    milestones: [
      { id: 'abx', label: 'Antibiose wirksam etabliert', weight: 30, done: (p) => hasTreatment(p, ['antibiotic']) },
      { id: 'oxygen', label: 'Respiratorische Stabilisierung', weight: 20, done: (p) => hasTreatment(p, ['oxygen_support']) || Number(p?.vitals?.spo2 || 0) >= 94 },
      { id: 'imaging', label: 'Bildgebung abgeschlossen', weight: 15, done: (p) => hasOrderCompleted(p, 'xray') || hasOrderCompleted(p, 'ct') },
      { id: 'inflammation', label: 'Infektparameter klinisch rückläufig', weight: 20, done: (p) => Number(p?.clinicalState?.infectionLoad || 10) <= 4.5 },
      { id: 'clinical_recovery', label: 'Klinische Besserung gesichert', weight: 15, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.5 },
    ],
  },
  obstructive_airway: {
    minHours: 18,
    fullHours: 48,
    milestones: [
      { id: 'bronchodilation', label: 'Bronchodilatation effektiv', weight: 35, done: (p) => hasTreatment(p, ['bronchodilation']) },
      { id: 'steroids', label: 'Entzündungshemmung angesetzt', weight: 20, done: (p) => hasTreatment(p, ['prednisolon']) },
      { id: 'resp_function', label: 'Lungenfunktion evaluiert', weight: 15, done: (p) => hasOrderCompleted(p, 'spiro') },
      { id: 'oxygenation', label: 'Sauerstoffsättigung stabil', weight: 15, done: (p) => Number(p?.vitals?.spo2 || 0) >= 93 },
      { id: 'symptom_relief', label: 'Dyspnoe rückläufig', weight: 15, done: (p) => Number(p?.clinicalState?.dyspnea || 10) <= 4.5 },
    ],
  },
  hyperglycemia: {
    minHours: 16,
    fullHours: 48,
    milestones: [
      { id: 'insulin', label: 'Glukosekontrolle aktiv', weight: 35, done: (p) => hasTreatment(p, ['insulin_rapid', 'glucose_control']) },
      { id: 'labs', label: 'Metabolisches Monitoring', weight: 20, done: (p) => (p?.labHistory || []).length > 0 },
      { id: 'volume', label: 'Volumenstatus korrigiert', weight: 20, done: (p) => hasTreatment(p, ['fluid_resuscitation']) },
      { id: 'metabolic_recovery', label: 'Metabolischer Stress reduziert', weight: 25, done: (p) => Number(p?.clinicalState?.metabolicStress || 10) <= 4.2 },
    ],
  },
  heart_failure: {
    minHours: 28,
    fullHours: 72,
    milestones: [
      { id: 'oxygen_strategy', label: 'Atemstrategie etabliert', weight: 25, done: (p) => hasTreatment(p, ['oxygen_support']) },
      { id: 'decongestion_strategy', label: 'Entstauungs-/Kreislaufstrategie etabliert', weight: 25, done: (p) => hasTreatment(p, ['furosemid', 'torasemid', 'hemodynamic_support', 'antiischemic']) },
      { id: 'echo', label: 'Kardiale Bildgebung abgeschlossen', weight: 15, done: (p) => hasOrderCompleted(p, 'echo') },
      { id: 'hemodynamics', label: 'Hämodynamische Stabilisierung', weight: 20, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.5 },
      { id: 'symptom_control', label: 'Symptomlast reduziert', weight: 15, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.2 },
    ],
  },
  arrhythmia: {
    minHours: 12,
    fullHours: 36,
    milestones: [
      { id: 'ecg_diagnosis', label: 'Rhythmusdiagnostik durchgeführt', weight: 25, done: (p) => hasOrderCompleted(p, 'ekg') || hasOrderCompleted(p, 'langzeit_ekg') },
      { id: 'rate_or_rhythm_control', label: 'Frequenz-/Rhythmuskontrolle eingeleitet', weight: 30, done: (p) => hasTreatment(p, ['antiischemic', 'hemodynamic_support', 'chronotropic_support', 'amiodaron', 'metoprolol', 'verapamil', 'diltiazem']) },
      { id: 'thrombo_strategy', label: 'Thromboembolieprophylaxe bedacht', weight: 15, done: (p) => hasTreatment(p, ['antithrombotic', 'heparin', 'apixaban', 'rivaroxaban']) },
      { id: 'hemodynamics', label: 'Kreislauf stabilisiert', weight: 15, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.6 },
      { id: 'symptom_relief', label: 'Symptomlast rückläufig', weight: 15, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.2 },
    ],
  },
  sepsis_infection: {
    minHours: 30,
    fullHours: 96,
    milestones: [
      { id: 'infection_focus', label: 'Infektionsfokus diagnostisch adressiert', weight: 18, done: (p) => hasOrderCompleted(p, 'xray') || hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'sono') || hasOrderCompleted(p, 'ultrasound') },
      { id: 'abx', label: 'Antibiose etabliert', weight: 32, done: (p) => hasTreatment(p, ['antibiotic']) },
      { id: 'hemo_support', label: 'Kreislauf-/Volumenmanagement aktiv', weight: 20, done: (p) => hasTreatment(p, ['fluid_resuscitation', 'hemodynamic_support']) },
      { id: 'inflammation_recovery', label: 'Infektlast sinkt', weight: 15, done: (p) => Number(p?.clinicalState?.infectionLoad || 10) <= 4.5 },
      { id: 'clinical_recovery', label: 'Klinische Besserung sichtbar', weight: 15, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.8 },
    ],
  },
  hemorrhage_hypovolemia: {
    minHours: 16,
    fullHours: 48,
    milestones: [
      { id: 'bleeding_workup', label: 'Blutungsquelle diagnostisch evaluiert', weight: 20, done: (p) => hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'hkl') || hasOrderCompleted(p, 'endoscopy') || hasOrderCompleted(p, 'xray') },
      { id: 'volume_replacement', label: 'Volumen-/Transfusionsstrategie eingeleitet', weight: 30, done: (p) => hasTreatment(p, ['fluid_resuscitation', 'transfusion_ek', 'transfusion_ffp']) },
      { id: 'coag_support', label: 'Gerinnungs-/Hämostasestrategie umgesetzt', weight: 15, done: (p) => hasTreatment(p, ['coag_support', 'tranexamsaeure', 'vitamin_k']) },
      { id: 'hemodynamic_recovery', label: 'Hämodynamik verbessert', weight: 20, done: (p) => Number(p?.clinicalState?.hemodynamics || -10) > -1.7 },
      { id: 'symptom_recovery', label: 'Beschwerden rückläufig', weight: 15, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.8 },
    ],
  },
  surgical_trauma_minor: {
    minHours: 2,
    fullHours: 10,
    milestones: [
      { id: 'wound_management', label: 'Lokale Wundversorgung durchgeführt', weight: 35, done: (p) => hasAction(p, ['wound_suture']) && hasAction(p, ['wound_dressing']) },
      { id: 'pain_control', label: 'Schmerztherapie etabliert', weight: 20, done: (p) => hasTreatment(p, ['analgesia']) || Number(p?.clinicalState?.complaintLevel || 10) <= 4.8 },
      { id: 'function_check', label: 'Neurovaskuläre Kontrolle dokumentiert', weight: 20, done: (p) => hasAction(p, ['wound_dressing']) || Number(p?.clinicalState?.hemodynamics || -10) > -2.5 },
      { id: 'stability', label: 'Ambulante Stabilität erreicht', weight: 25, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 3.8 && Number(p?.vitals?.spo2 || 0) >= 94 },
    ],
  },
  surgical_trauma_major: {
    minHours: 20,
    fullHours: 72,
    milestones: [
      { id: 'imaging', label: 'Bildgebung/Traumadiagnostik erfolgt', weight: 20, done: (p) => hasOrderCompleted(p, 'xray') || hasOrderCompleted(p, 'ct') || hasOrderCompleted(p, 'mri') },
      { id: 'wound_management', label: 'Wundmanagement durchgeführt', weight: 25, done: (p) => hasAction(p, ['wound_suture']) && hasAction(p, ['wound_dressing']) },
      { id: 'immobilization', label: 'Immobilisation/Schienung erfolgt', weight: 18, done: (p) => hasAction(p, ['cast_apply']) },
      { id: 'analgesia', label: 'Analgesie etabliert', weight: 17, done: (p) => hasTreatment(p, ['analgesia']) },
      { id: 'stability', label: 'Klinische Stabilisierung', weight: 20, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.5 && Number(p?.clinicalState?.hemodynamics || -10) > -2.0 },
    ],
  },
  generic: {
    minHours: 8,
    fullHours: 24,
    milestones: [
      { id: 'diagnostic_path', label: 'Diagnostik abgeschlossen', weight: 30, done: (p) => (p?.orders || []).some(o => o.status === 'completed') || (p?.examResults || []).length > 0 },
      { id: 'therapy_path', label: 'Therapie eingeleitet', weight: 35, done: (p) => (p?.appliedTreatments || []).length > 0 },
      { id: 'stability', label: 'Klinisch stabil', weight: 35, done: (p) => Number(p?.clinicalState?.complaintLevel || 10) <= 4.5 },
    ],
  },
}

export function evaluateTherapyProgress(patient) {
  const conditionKey = resolveConditionKey(patient)
  const plan = CONDITION_PLANS[conditionKey] || CONDITION_PLANS.generic
  const baseScore = plan.milestones.reduce((sum, m) => sum + (m.done(patient) ? m.weight : 0), 0)
  const hours = elapsedHours(patient)
  const timeRatio = clamp(hours / Math.max(plan.fullHours, plan.minHours), 0, 1)
  const timeWeight = 20
  const milestoneWeight = 80
  const milestonePercent = clamp((baseScore / 100) * 100, 0, 100)
  const percent = Math.round(clamp((milestonePercent * (milestoneWeight / 100)) + (timeRatio * timeWeight), 0, 100))
  const ready = hours >= plan.minHours && percent >= 90
  return {
    conditionKey,
    percent,
    elapsedHours: hours,
    minHours: plan.minHours,
    fullHours: plan.fullHours,
    readyForDischarge: ready,
    milestones: plan.milestones.map(m => ({ id: m.id, label: m.label, done: m.done(patient), weight: m.weight })),
  }
}
