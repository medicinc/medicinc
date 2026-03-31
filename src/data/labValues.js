export const LAB_CATEGORIES = [
  { id: 'blood_count', name: 'Blutbild', color: 'bg-red-100 text-red-600' },
  { id: 'electrolytes', name: 'Elektrolyte', color: 'bg-blue-100 text-blue-600' },
  { id: 'liver', name: 'Leber', color: 'bg-amber-100 text-amber-600' },
  { id: 'kidney', name: 'Niere', color: 'bg-purple-100 text-purple-600' },
  { id: 'cardiac', name: 'Kardial', color: 'bg-pink-100 text-pink-600' },
  { id: 'coagulation', name: 'Gerinnung', color: 'bg-orange-100 text-orange-600' },
  { id: 'inflammation', name: 'Entzündung', color: 'bg-green-100 text-green-600' },
  { id: 'metabolic', name: 'Metabolisch', color: 'bg-cyan-100 text-cyan-600' },
  { id: 'urine', name: 'Urinstatus', color: 'bg-lime-100 text-lime-700' },
  { id: 'microbiology', name: 'Mikrobiologie', color: 'bg-fuchsia-100 text-fuchsia-700' },
]

export const LAB_PARAMETERS = [
  { id: 'hb', name: 'Hämoglobin', unit: 'g/dl', category: 'blood_count', refMin: 12, refMax: 16, cost: 3, genFn: () => +(10 + Math.random() * 8).toFixed(1) },
  { id: 'hk', name: 'Hämatokrit', unit: '%', category: 'blood_count', refMin: 36, refMax: 48, cost: 2, genFn: () => +(30 + Math.random() * 22).toFixed(1) },
  { id: 'erythro', name: 'Erythrozyten', unit: 'Mio/µl', category: 'blood_count', refMin: 4.0, refMax: 5.5, cost: 3, genFn: () => +(3.5 + Math.random() * 3).toFixed(2) },
  { id: 'leuko', name: 'Leukozyten', unit: '/µl', category: 'blood_count', refMin: 4000, refMax: 10000, cost: 3, genFn: () => Math.floor(3000 + Math.random() * 15000) },
  { id: 'thrombo', name: 'Thrombozyten', unit: '/µl', category: 'blood_count', refMin: 150000, refMax: 400000, cost: 3, genFn: () => Math.floor(100000 + Math.random() * 400000) },
  { id: 'mcv', name: 'MCV', unit: 'fl', category: 'blood_count', refMin: 80, refMax: 96, cost: 2, genFn: () => +(76 + Math.random() * 24).toFixed(1) },
  { id: 'mch', name: 'MCH', unit: 'pg', category: 'blood_count', refMin: 27, refMax: 33, cost: 2, genFn: () => +(24 + Math.random() * 12).toFixed(1) },

  { id: 'natrium', name: 'Natrium', unit: 'mmol/l', category: 'electrolytes', refMin: 135, refMax: 145, cost: 3, genFn: () => Math.floor(130 + Math.random() * 20) },
  { id: 'kalium', name: 'Kalium', unit: 'mmol/l', category: 'electrolytes', refMin: 3.5, refMax: 5.0, cost: 3, genFn: () => +(3.0 + Math.random() * 3).toFixed(1) },
  { id: 'calcium', name: 'Calcium', unit: 'mmol/l', category: 'electrolytes', refMin: 2.1, refMax: 2.6, cost: 3, genFn: () => +(1.8 + Math.random() * 1.2).toFixed(2) },
  { id: 'chlorid', name: 'Chlorid', unit: 'mmol/l', category: 'electrolytes', refMin: 96, refMax: 110, cost: 2, genFn: () => Math.floor(92 + Math.random() * 22) },
  { id: 'phosphat', name: 'Phosphat', unit: 'mmol/l', category: 'electrolytes', refMin: 0.8, refMax: 1.5, cost: 3, genFn: () => +(0.6 + Math.random() * 1.2).toFixed(2) },
  { id: 'magnesium', name: 'Magnesium', unit: 'mmol/l', category: 'electrolytes', refMin: 0.7, refMax: 1.1, cost: 3, genFn: () => +(0.5 + Math.random() * 0.8).toFixed(2) },

  { id: 'got', name: 'GOT (AST)', unit: 'U/l', category: 'liver', refMin: 0, refMax: 35, cost: 4, genFn: () => Math.floor(10 + Math.random() * 80) },
  { id: 'gpt', name: 'GPT (ALT)', unit: 'U/l', category: 'liver', refMin: 0, refMax: 35, cost: 4, genFn: () => Math.floor(8 + Math.random() * 90) },
  { id: 'ggt', name: 'GGT', unit: 'U/l', category: 'liver', refMin: 0, refMax: 40, cost: 4, genFn: () => Math.floor(5 + Math.random() * 100) },
  { id: 'ap', name: 'Alk. Phosphatase', unit: 'U/l', category: 'liver', refMin: 40, refMax: 130, cost: 4, genFn: () => Math.floor(30 + Math.random() * 150) },
  { id: 'bilirubin', name: 'Bilirubin (gesamt)', unit: 'mg/dl', category: 'liver', refMin: 0.1, refMax: 1.2, cost: 4, genFn: () => +(0.1 + Math.random() * 2.5).toFixed(1) },
  { id: 'albumin', name: 'Albumin', unit: 'g/dl', category: 'liver', refMin: 3.5, refMax: 5.0, cost: 3, genFn: () => +(2.8 + Math.random() * 2.8).toFixed(1) },

  { id: 'kreatinin', name: 'Kreatinin', unit: 'mg/dl', category: 'kidney', refMin: 0.7, refMax: 1.3, cost: 3, genFn: () => +(0.5 + Math.random() * 2).toFixed(2) },
  { id: 'harnstoff', name: 'Harnstoff', unit: 'mg/dl', category: 'kidney', refMin: 10, refMax: 50, cost: 3, genFn: () => Math.floor(8 + Math.random() * 80) },
  { id: 'gfr', name: 'eGFR', unit: 'ml/min', category: 'kidney', refMin: 90, refMax: 999, cost: 2, genFn: () => Math.floor(30 + Math.random() * 100) },
  { id: 'harnsaeure', name: 'Harnsäure', unit: 'mg/dl', category: 'kidney', refMin: 3.5, refMax: 7.0, cost: 3, genFn: () => +(2.5 + Math.random() * 7).toFixed(1) },

  { id: 'troponin', name: 'Troponin I', unit: 'ng/ml', category: 'cardiac', refMin: 0, refMax: 0.04, cost: 12, genFn: () => +(Math.random() * 0.5).toFixed(3) },
  { id: 'ckMB', name: 'CK-MB', unit: 'U/l', category: 'cardiac', refMin: 0, refMax: 25, cost: 8, genFn: () => Math.floor(Math.random() * 60) },
  { id: 'bnp', name: 'NT-proBNP', unit: 'pg/ml', category: 'cardiac', refMin: 0, refMax: 125, cost: 10, genFn: () => Math.floor(Math.random() * 500) },
  { id: 'ldh', name: 'LDH', unit: 'U/l', category: 'cardiac', refMin: 120, refMax: 250, cost: 4, genFn: () => Math.floor(100 + Math.random() * 250) },

  { id: 'quick', name: 'Quick (INR)', unit: '', category: 'coagulation', refMin: 0.9, refMax: 1.15, cost: 4, genFn: () => +(0.8 + Math.random() * 0.8).toFixed(2) },
  { id: 'ptt', name: 'aPTT', unit: 'sec', category: 'coagulation', refMin: 25, refMax: 36, cost: 4, genFn: () => Math.floor(22 + Math.random() * 30) },
  { id: 'fibrinogen', name: 'Fibrinogen', unit: 'mg/dl', category: 'coagulation', refMin: 200, refMax: 400, cost: 5, genFn: () => Math.floor(150 + Math.random() * 400) },
  { id: 'ddimer', name: 'D-Dimer', unit: 'mg/l', category: 'coagulation', refMin: 0, refMax: 0.5, cost: 8, genFn: () => +(Math.random() * 3).toFixed(2) },

  { id: 'crp', name: 'CRP', unit: 'mg/l', category: 'inflammation', refMin: 0, refMax: 5, cost: 5, genFn: () => +(Math.random() * 150).toFixed(1) },
  { id: 'pct', name: 'Procalcitonin', unit: 'ng/ml', category: 'inflammation', refMin: 0, refMax: 0.5, cost: 15, genFn: () => +(Math.random() * 5).toFixed(2) },
  { id: 'bsg', name: 'BSG', unit: 'mm/h', category: 'inflammation', refMin: 0, refMax: 20, cost: 3, genFn: () => Math.floor(Math.random() * 60) },

  { id: 'glucose_lab', name: 'Glukose', unit: 'mg/dl', category: 'metabolic', refMin: 70, refMax: 100, cost: 3, genFn: () => Math.floor(60 + Math.random() * 200) },
  { id: 'hba1c', name: 'HbA1c', unit: '%', category: 'metabolic', refMin: 4.0, refMax: 6.0, cost: 9, genFn: () => +(4.0 + Math.random() * 5).toFixed(1) },
  { id: 'lactat', name: 'Laktat', unit: 'mmol/l', category: 'metabolic', refMin: 0.5, refMax: 2.2, cost: 6, genFn: () => +(0.3 + Math.random() * 4).toFixed(1) },
  { id: 'tsh', name: 'TSH', unit: 'mU/l', category: 'metabolic', refMin: 0.4, refMax: 4.0, cost: 8, genFn: () => +(0.1 + Math.random() * 8).toFixed(2) },

  { id: 'urin_ph', name: 'Urin pH', unit: '', category: 'urine', refMin: 5.0, refMax: 8.0, cost: 2, genFn: () => +(4.8 + Math.random() * 3.6).toFixed(1) },
  { id: 'urin_dichte', name: 'Spezifisches Gewicht', unit: '', category: 'urine', refMin: 1.005, refMax: 1.03, cost: 2, genFn: () => +(1.003 + Math.random() * 0.03).toFixed(3) },
  { id: 'urin_leuko', name: 'Leukozyten (Urin-Stix)', unit: '', category: 'urine', refMin: 0, refMax: 10, cost: 2, genFn: () => Math.floor(Math.random() * 120) },
  { id: 'urin_nitrit', name: 'Nitrit', unit: '', category: 'urine', refMin: 0, refMax: 0, cost: 2, genFn: () => (Math.random() > 0.82 ? 'positiv' : 'negativ') },
  { id: 'urin_ery', name: 'Erythrozyten (Urin)', unit: '/µl', category: 'urine', refMin: 0, refMax: 20, cost: 2, genFn: () => Math.floor(Math.random() * 180) },
  { id: 'urin_protein', name: 'Protein', unit: 'mg/dl', category: 'urine', refMin: 0, refMax: 30, cost: 3, genFn: () => Math.floor(Math.random() * 200) },
  { id: 'urin_glukose', name: 'Glukose (Urin)', unit: 'mg/dl', category: 'urine', refMin: 0, refMax: 15, cost: 2, genFn: () => Math.floor(Math.random() * 250) },
  { id: 'urin_ketone', name: 'Ketone', unit: '', category: 'urine', refMin: 0, refMax: 0, cost: 2, genFn: () => (Math.random() > 0.86 ? 'positiv' : 'negativ') },
  { id: 'urin_bilirubin', name: 'Bilirubin (Urin)', unit: '', category: 'urine', refMin: 0, refMax: 0, cost: 2, genFn: () => (Math.random() > 0.9 ? 'positiv' : 'negativ') },
  { id: 'urin_urobilinogen', name: 'Urobilinogen', unit: 'mg/dl', category: 'urine', refMin: 0.2, refMax: 1.0, cost: 2, genFn: () => +(Math.random() * 2.5).toFixed(1) },

  { id: 'mikro_blutkultur_aerob', name: 'Blutkultur aerob', unit: '', category: 'microbiology', cost: 28, genFn: () => (Math.random() > 0.7 ? 'Wachstum nach 14h' : 'Kein Wachstum nach 48h') },
  { id: 'mikro_blutkultur_anaerob', name: 'Blutkultur anaerob', unit: '', category: 'microbiology', cost: 28, genFn: () => (Math.random() > 0.78 ? 'Wachstum nach 18h' : 'Kein Wachstum nach 48h') },
  { id: 'mikro_urin_kultur', name: 'Urinkultur', unit: '', category: 'microbiology', cost: 18, genFn: () => (Math.random() > 0.72 ? '>10^5 KBE/ml' : 'Kein relevantes Wachstum') },
  { id: 'mikro_sputum', name: 'Sputumkultur', unit: '', category: 'microbiology', cost: 22, genFn: () => (Math.random() > 0.66 ? 'Pathogen nachweisbar' : 'Mischflora / unauffällig') },
  { id: 'mikro_abstrich_nase', name: 'Nasenabstrich', unit: '', category: 'microbiology', cost: 16, genFn: () => (Math.random() > 0.82 ? 'MRSA positiv' : 'MRSA negativ') },
  { id: 'mikro_abstrich_wunde', name: 'Wundabstrich', unit: '', category: 'microbiology', cost: 18, genFn: () => (Math.random() > 0.65 ? 'Keimnachweis' : 'Kein Keimnachweis') },
  { id: 'mikro_liquor_kultur', name: 'Liquorkultur (LP)', unit: '', category: 'microbiology', cost: 35, genFn: () => (Math.random() > 0.84 ? 'Bakteriennachweis' : 'Kein Wachstum') },
  { id: 'mikro_liquor_pcr', name: 'Liquor-PCR Erregerpanel', unit: '', category: 'microbiology', cost: 38, genFn: () => (Math.random() > 0.88 ? 'PCR positiv' : 'PCR negativ') },
  { id: 'mikro_stuhl', name: 'Stuhlkultur', unit: '', category: 'microbiology', cost: 20, genFn: () => (Math.random() > 0.8 ? 'Enteropathogen nachweisbar' : 'Negativ') },
  { id: 'mikro_virus_panel', name: 'PCR Atemwegs-Erregerpanel', unit: '', category: 'microbiology', cost: 32, genFn: () => (Math.random() > 0.76 ? 'Virusnachweis positiv' : 'Kein Virusnachweis') },
  { id: 'mikro_mykologie', name: 'Pilzkultur', unit: '', category: 'microbiology', cost: 24, genFn: () => (Math.random() > 0.9 ? 'Pilznachweis' : 'Kein Pilzwachstum') },
  { id: 'mikro_antibiogramm', name: 'Antibiogramm', unit: '', category: 'microbiology', cost: 26, genFn: () => (Math.random() > 0.58 ? 'Resistenzen vorhanden' : 'Breit empfindlich') },
  { id: 'mikro_pcr_sarscov2', name: 'PCR SARS-CoV-2', unit: '', category: 'microbiology', cost: 18, genFn: () => (Math.random() > 0.82 ? 'positiv' : 'negativ') },
  { id: 'mikro_pcr_influenza', name: 'PCR Influenza A/B', unit: '', category: 'microbiology', cost: 18, genFn: () => (Math.random() > 0.84 ? 'positiv' : 'negativ') },
  { id: 'mikro_legionella_antigen', name: 'Legionella-Antigen (Urin)', unit: '', category: 'microbiology', cost: 22, genFn: () => (Math.random() > 0.9 ? 'positiv' : 'negativ') },
  { id: 'mikro_pneumokokken_antigen', name: 'Pneumokokken-Antigen (Urin)', unit: '', category: 'microbiology', cost: 20, genFn: () => (Math.random() > 0.88 ? 'positiv' : 'negativ') },
  { id: 'mikro_erreger_ecoli', name: 'Erregerziel: E. coli', unit: '', category: 'microbiology', cost: 12, genFn: () => (Math.random() > 0.78 ? 'nachgewiesen' : 'nicht nachgewiesen') },
  { id: 'mikro_erreger_saureus', name: 'Erregerziel: Staphylococcus aureus', unit: '', category: 'microbiology', cost: 12, genFn: () => (Math.random() > 0.8 ? 'nachgewiesen' : 'nicht nachgewiesen') },
  { id: 'mikro_erreger_pseudomonas', name: 'Erregerziel: Pseudomonas aeruginosa', unit: '', category: 'microbiology', cost: 14, genFn: () => (Math.random() > 0.86 ? 'nachgewiesen' : 'nicht nachgewiesen') },
  { id: 'mikro_erreger_meningokokken', name: 'Erregerziel: Neisseria meningitidis', unit: '', category: 'microbiology', cost: 18, genFn: () => (Math.random() > 0.93 ? 'nachgewiesen' : 'nicht nachgewiesen') },
]

export function generateLabResults() {
  const results = {}
  LAB_PARAMETERS.forEach(p => {
    results[p.id] = { value: p.genFn(), time: new Date().toISOString() }
  })
  return results
}

export function isAbnormal(paramId, value) {
  const p = LAB_PARAMETERS.find(lp => lp.id === paramId)
  if (!p) return false
  if (typeof value !== 'number') return false
  if (typeof p.refMin !== 'number' || typeof p.refMax !== 'number') return false
  return value < p.refMin || value > p.refMax
}

const LAB_DELAY_MINUTES_BY_CATEGORY = {
  blood_count: [3, 8],
  electrolytes: [4, 10],
  liver: [6, 18],
  kidney: [6, 18],
  cardiac: [10, 28],
  coagulation: [8, 20],
  inflammation: [12, 35],
  metabolic: [8, 24],
  urine: [8, 30],
  microbiology: [90, 360],
}

const LAB_DELAY_MINUTES_BY_PARAM = {
  troponin: [15, 35],
  pct: [20, 45],
  hba1c: [45, 120],
  mikro_blutkultur_aerob: [240, 960],
  mikro_blutkultur_anaerob: [240, 960],
  mikro_liquor_kultur: [300, 1080],
  mikro_antibiogramm: [360, 1440],
}

function randomBetween(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 10
  if (max <= min) return min
  return min + Math.random() * (max - min)
}

export function getLabReadyAtIso(paramId, orderedAtIso = new Date().toISOString()) {
  const param = LAB_PARAMETERS.find(p => p.id === paramId)
  const custom = LAB_DELAY_MINUTES_BY_PARAM[paramId]
  const byCategory = LAB_DELAY_MINUTES_BY_CATEGORY[param?.category] || [5, 15]
  const [minDelay, maxDelay] = custom || byCategory
  const delayMinutes = randomBetween(minDelay, maxDelay)
  const orderedMs = Date.parse(orderedAtIso)
  const baseMs = Number.isFinite(orderedMs) ? orderedMs : Date.now()
  return new Date(baseMs + delayMinutes * 60000).toISOString()
}
