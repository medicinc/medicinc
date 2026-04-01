import { getSupabaseClient } from '../lib/supabaseClient'
const STORAGE_CONSENT_KEY = 'medisim_ai_consent'

try {
  localStorage.removeItem('medisim_ai_api_key')
} catch {
  // ignore
}

function sanitize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function hasAiConsent() {
  try {
    const raw = sanitize(localStorage.getItem(STORAGE_CONSENT_KEY) || '').toLowerCase()
    return raw === 'granted' || raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
  } catch {
    return false
  }
}

async function getSupabaseAuthHeaders() {
  const sb = getSupabaseClient()
  const anonKey = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  const session = sb ? (await sb.auth.getSession()).data?.session : null
  const accessToken = sanitize(session?.access_token || '')
  if (!anonKey || !accessToken) return {}
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function requestDispatchReply({ eventTitle, eventContext = null, userMessage, history = [], signal }) {
  const aiConsentGranted = hasAiConsent()
  if (!aiConsentGranted) return { ok: false, message: 'AI-Dialog ist deaktiviert oder Einwilligung fehlt.' }
  const supabaseUrl = sanitize(import.meta.env.VITE_SUPABASE_URL || '')
  if (!supabaseUrl) return { ok: false, message: 'VITE_SUPABASE_URL fehlt.' }
  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/dispatch-chat`
  const system = [
    'Du spielst einen Leitstellendisponenten in einer realistischen Krankenhaus-Simulation.',
    'Antwortsprache: Deutsch.',
    'Schreibstil: Funk-/Leitstellen-Ton, knapp, direkt, realistisch, ohne Rollenspiel-Kitsch.',
    'Bleibe klar, professionell und praxisnah (1-5 kurze Sätze).',
    'Wenn Infos unklar sind, sage explizit "noch unklar / läuft".',
    'Gib nur Leitstellenwissen, keine Diagnosen versprechen.',
    'Nutze typische Leitstellenformulierung: kurz, präzise, lageorientiert.',
    'Keine ICD-Codes nennen, es sei denn der User fragt explizit danach.',
    'Keine offensichtlich fachfremden oder chronischen Diagnosen in MANV-Antworten mischen.',
    `Aktuelle MANV-Lage: ${sanitize(eventTitle) || 'Unbekannt'}.`,
    'Nutze die gelieferten Lagedetails konkret: Zahlen, ETAs, RTW-Anzahl, Triageverteilung, typische Verletzungsmuster.',
    'Bei Fragen zu "wie viele / wann / welche Verletzungen" antworte mit den konkreten Werten aus den Daten und in klaren Einsatzbegriffen.',
    eventContext ? `Lagedetails JSON: ${sanitize(JSON.stringify(eventContext))}` : '',
  ].join('\n')
  const compact = history.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitize(m.content),
  })).filter((m) => m.content)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getSupabaseAuthHeaders()) },
      body: JSON.stringify({
        system,
        eventTitle: sanitize(eventTitle),
        eventContext,
        history: compact,
        userMessage: sanitize(userMessage),
      }),
      signal,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, message: sanitize(data?.error?.message || data?.message || 'AI Anfrage fehlgeschlagen') }
    const text = sanitize(data?.text || '')
    if (!text) return { ok: false, message: 'Keine Antwort erhalten.' }
    return { ok: true, text }
  } catch (error) {
    return { ok: false, message: String(error?.message || error || 'Netzwerkfehler') }
  }
}

