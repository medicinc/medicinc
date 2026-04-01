import { getSupabaseClient } from '../lib/supabaseClient'
const STORAGE_CONSENT_KEY = 'medisim_ai_consent'

try {
  localStorage.removeItem('medisim_ai_api_key')
  localStorage.removeItem('VITE_OPENAI_API_KEY')
} catch {
  // ignore
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function hasAiConsent() {
  try {
    const raw = sanitizeText(localStorage.getItem(STORAGE_CONSENT_KEY) || '').toLowerCase()
    return raw === 'granted' || raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
  } catch {
    return false
  }
}

export function isAiChatConfigured() {
  return hasAiConsent()
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function extractApiError(data) {
  return sanitizeText(data?.error?.message || data?.message || '')
}

function getSupabaseFunctionUrl(functionName) {
  const base = sanitizeText(import.meta.env.VITE_SUPABASE_URL || '')
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/functions/v1/${functionName}`
}

async function getSupabaseAuthHeaders() {
  const sb = getSupabaseClient()
  const anonKey = sanitizeText(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  if (!sb || !anonKey) return {}
  const isLikelyJwt = (token) => String(token || '').split('.').length === 3
  let session = (await sb.auth.getSession()).data?.session || null
  let accessToken = sanitizeText(session?.access_token || '')
  if (!isLikelyJwt(accessToken)) {
    const refreshed = await sb.auth.refreshSession().catch(() => null)
    session = refreshed?.data?.session || session
    accessToken = sanitizeText(session?.access_token || '')
  }
  if (!isLikelyJwt(accessToken)) return {}
  const authCheck = await sb.auth.getUser(accessToken).catch(() => null)
  if (!authCheck?.data?.user) {
    const refreshed = await sb.auth.refreshSession().catch(() => null)
    accessToken = sanitizeText(refreshed?.data?.session?.access_token || '')
  }
  if (!isLikelyJwt(accessToken)) return {}
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  }
}

function redactedPatientPayload(patient) {
  const diagnosis = patient?.trueDiagnoses?.primary || patient?.diagnoses?.primary || null
  return {
    age: Number(patient?.age || 0),
    gender: String(patient?.gender || ''),
    chiefComplaint: String(patient?.chiefComplaint || ''),
    communicationNeeds: String(patient?.communicationNeeds || ''),
    symptoms: Array.isArray(patient?.symptoms) ? patient.symptoms.slice(0, 10).map((x) => String(x || '')) : [],
    vitals: patient?.vitals ? {
      hr: patient.vitals.hr ?? null,
      bp: patient.vitals.bp ?? null,
      rr: patient.vitals.rr ?? null,
      temp: patient.vitals.temp ?? null,
      spo2: patient.vitals.spo2 ?? null,
    } : null,
    context: {
      diagnosisCode: diagnosis?.code || null,
      diagnosisName: diagnosis?.name || null,
      allergies: String(patient?.chatData?.allergies || patient?.allergies || ''),
      medications: String(patient?.chatData?.medications || patient?.medications || ''),
      pastHistory: String(patient?.chatData?.pastHistory || patient?.pastHistory || ''),
      lastMeal: String(patient?.chatData?.lastMeal || patient?.lastMeal || ''),
      preInfo: String(patient?.preInfo || ''),
    },
  }
}

function buildSystemPrompt({ patient, mode, lang, translatorEnabled }) {
  const diagnosis = patient?.trueDiagnoses?.primary || patient?.diagnoses?.primary || null
  const knownAllergies = patient?.chatData?.allergies || patient?.allergies || ''
  const knownMeds = patient?.chatData?.medications || patient?.medications || ''
  const knownHistory = patient?.chatData?.pastHistory || patient?.pastHistory || ''
  const knownMeal = patient?.chatData?.lastMeal || patient?.lastMeal || ''
  const knownSymptoms = Array.isArray(patient?.symptoms) ? patient.symptoms.join(', ') : ''
  const knownVitals = patient?.vitals
    ? `HF ${patient.vitals.hr || '-'}, RR ${patient.vitals.bp || '-'}, AF ${patient.vitals.rr || '-'}, Temp ${patient.vitals.temp || '-'}, SpO2 ${patient.vitals.spo2 || '-'}`
    : ''
  return [
    'Du spielst eine einzelne Patientin/einen einzelnen Patienten in einer medizinischen Simulation.',
    'Bleibe konsistent mit den Falldaten, aber antworte natuerlich wie ein echter Patient.',
    'Du darfst Antworten ausschmuecken und alltagssprachlich formulieren, solange Kernfakten nicht widersprochen werden.',
    'Wenn nach unbekannten Details gefragt wird, antworte vorsichtig mit Unsicherheit statt neue harte Fakten zu erfinden.',
    'Wenn nach Allergien, Medikamenten, Vorerkrankungen oder letzter Mahlzeit gefragt wird, nutze die bekannten Angaben konsistent.',
    'WICHTIG: Verwende einfache Alltagssprache und möglichst keine medizinischen Fachwörter.',
    'Antworte nur als Patient (keine Arztperspektive, keine Meta-Erklärung).',
    'Realistisch und lebendig: meist 1-3 Saetze, bei Bedarf auch 4 kurze Saetze.',
    `Gesprächsmodus: ${mode || 'triage'}.`,
    `Sprache der Patientenantwort: ${lang || 'de'}.`,
    translatorEnabled
      ? 'Übersetzer ist aktiv: antworte normal und nicht mit Sprachbarriere-Hinweisen.'
      : 'Wenn Sprache nicht verstanden wird, darf leichte Sprachbarriere erwähnt werden.',
    `Patient: ${patient?.name || 'Unbekannt'}, ${patient?.age || '?'} Jahre, ${patient?.gender || 'unbekannt'}.`,
    `Leitbeschwerde: ${patient?.chiefComplaint || 'nicht angegeben'}.`,
    knownSymptoms ? `Bekannte Symptome: ${knownSymptoms}.` : '',
    knownVitals ? `Bekannte Vitalwerte: ${knownVitals}.` : '',
    diagnosis ? `Wahrscheinliche Hauptdiagnose (nur implizit berücksichtigen): ${diagnosis.code} ${diagnosis.name}.` : '',
    knownAllergies ? `Bekannte Allergien: ${knownAllergies}.` : '',
    knownMeds ? `Dauermedikation: ${knownMeds}.` : '',
    knownHistory ? `Bekannte Vorerkrankungen: ${knownHistory}.` : '',
    knownMeal ? `Letzte Mahlzeit: ${knownMeal}.` : '',
    patient?.preInfo ? `Praeklinische Info/Einweisungsinfo: ${patient.preInfo}.` : '',
    patient?.communicationNeeds ? `Kommunikationsbesonderheit: ${patient.communicationNeeds}.` : '',
    `KERNFAKTEN (konsistent halten): Diagnose=${diagnosis ? `${diagnosis.code} ${diagnosis.name}` : 'n/a'} | Allergien=${knownAllergies || 'n/a'} | Dauermedikation=${knownMeds || 'n/a'} | Vorerkrankungen=${knownHistory || 'n/a'} | Letzte Mahlzeit=${knownMeal || 'n/a'}.`,
  ].filter(Boolean).join('\n')
}

export async function requestAiPatientReply({
  patient,
  mode,
  lang = 'de',
  translatorEnabled = false,
  doctorMessage,
  history = [],
  signal,
}) {
  if (!isAiChatConfigured()) {
    return {
      ok: false,
      error: 'AI_NOT_CONFIGURED',
      message: 'AI-Dialog ist deaktiviert oder Einwilligung fehlt.',
    }
  }
  const endpoint = getSupabaseFunctionUrl('patient-chat')
  if (!endpoint) return { ok: false, error: 'AI_NOT_CONFIGURED', message: 'VITE_SUPABASE_URL fehlt.' }

  const compactHistory = history
    .slice(-10)
    .map(msg => ({
      role: msg.type === 'doctor' ? 'user' : 'assistant',
      content: sanitizeText(msg.text),
    }))
    .filter(msg => msg.content)

  const userText = sanitizeText(doctorMessage)

  try {
    const authHeaders = await getSupabaseAuthHeaders()
    if (!authHeaders.Authorization) {
      return {
        ok: false,
        error: 'AI_AUTH_REQUIRED',
        message: 'Supabase-Session ungültig. Bitte neu einloggen.',
      }
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      signal,
      body: JSON.stringify({
        mode,
        lang,
        translatorEnabled: !!translatorEnabled,
        doctorMessage: userText,
        history: compactHistory,
        patient: redactedPatientPayload(patient),
      }),
    })
    const data = await safeReadJson(response)
    if (!response.ok) {
      return {
        ok: false,
        error: 'AI_HTTP_ERROR',
        status: response.status,
        message: extractApiError(data) || 'AI Anfrage fehlgeschlagen.',
      }
    }
    const text = sanitizeText(data?.text || '')
    if (!text) return { ok: false, error: 'AI_HTTP_ERROR', message: 'Keine Antwort erhalten.' }
    return { ok: true, text, model: 'proxy', source: 'supabase-function' }
  } catch (error) {
    return { ok: false, error: 'AI_NETWORK', message: String(error?.message || error || 'network') }
  }
}

export async function requestAiPatientGreeting({
  patient,
  mode,
  lang = 'de',
  translatorEnabled = false,
  signal,
}) {
  const modeHint = mode === 'rd'
    ? 'Praeklinik/Rettungsdienst: Patient wurde vor Ort versorgt.'
    : (mode === 'ward'
      ? 'Krankenhaus/Station: Patient ist bereits in der Klinik.'
      : 'Erstkontakt/Triage: Patient stellt sich neu vor.')

  return requestAiPatientReply({
    patient,
    mode,
    lang,
    translatorEnabled,
    signal,
    history: [],
    doctorMessage: [
      'Bitte starte das Gespraech mit einer kurzen, natuerlichen ersten Patientennachricht.',
      'Es soll klingen wie echte Alltagssprache.',
      'Keine medizinischen Fachwoerter verwenden.',
      modeHint,
      'Nur die Nachricht selbst ausgeben, ohne Erklaerung.',
    ].join(' '),
  })
}
