import { getSupabaseClient } from '../lib/supabaseClient'

const REGISTRATION_JWT_KEY = 'medisim_alpha_registration_jwt'

function sanitize(value) {
  return String(value || '').trim()
}

function getFunctionUrl(name) {
  const base = sanitize(import.meta.env.VITE_SUPABASE_URL || '')
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/functions/v1/${name}`
}

function anonHeaders() {
  const anon = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  if (!anon) return { 'Content-Type': 'application/json' }
  return {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  }
}

export function getAlphaRegistrationToken() {
  try {
    return sessionStorage.getItem(REGISTRATION_JWT_KEY) || ''
  } catch (_error) {
    return ''
  }
}

export function setAlphaRegistrationToken(token) {
  try {
    sessionStorage.setItem(REGISTRATION_JWT_KEY, sanitize(token))
  } catch (_error) {
    // Ignore storage errors.
  }
}

export function clearAlphaRegistrationToken() {
  try {
    sessionStorage.removeItem(REGISTRATION_JWT_KEY)
  } catch (_error) {
    // Ignore storage errors.
  }
}

export async function requestAlphaRegistrationGate(code) {
  const sb = getSupabaseClient()
  const body = { code: sanitize(code) }
  if (!sb) return { ok: false, message: 'Die Alpha-Registrierung ist derzeit nicht verfuegbar.' }
  const { data, error } = await sb.functions.invoke('alpha-registration-gate', { body })
  if (error) {
    const fallback = await fetch(getFunctionUrl('alpha-registration-gate'), {
      method: 'POST',
      headers: anonHeaders(),
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!fallback) return { ok: false, message: sanitize(error?.message || 'Code-Prüfung fehlgeschlagen.') }
    const fallbackData = await fallback.json().catch(() => null)
    if (!fallback.ok) {
      return { ok: false, message: sanitize(fallbackData?.message || 'Code ungültig.') }
    }
    return { ok: true, data: fallbackData }
  }
  return { ok: true, data }
}

export async function registerWithAlphaGate({ name, email, password, consents, gateToken }) {
  const sb = getSupabaseClient()
  const body = {
    name: sanitize(name),
    email: sanitize(email).toLowerCase(),
    password: String(password ?? ''),
    consents: {
      tosAccepted: !!consents?.tosAccepted,
      privacyAccepted: !!consents?.privacyAccepted,
      aiChatAccepted: !!consents?.aiChatAccepted,
    },
    gateToken: sanitize(gateToken),
  }
  if (!sb) return { ok: false, message: 'Die Alpha-Registrierung ist derzeit nicht verfuegbar.' }
  const { data, error } = await sb.functions.invoke('alpha-register', { body })
  if (error) {
    const fallback = await fetch(getFunctionUrl('alpha-register'), {
      method: 'POST',
      headers: anonHeaders(),
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!fallback) return { ok: false, message: sanitize(error?.message || 'Registrierung fehlgeschlagen.') }
    const fallbackData = await fallback.json().catch(() => null)
    if (!fallback.ok) {
      return { ok: false, message: sanitize(fallbackData?.message || 'Registrierung fehlgeschlagen.') }
    }
    return { ok: true, data: fallbackData }
  }
  if (data && data.ok === false) {
    return { ok: false, message: sanitize(data?.message || 'Registrierung fehlgeschlagen.') }
  }
  return { ok: true, data }
}
