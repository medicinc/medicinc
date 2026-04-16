import { getSupabaseClient } from '../lib/supabaseClient'

function sanitize(value) {
  return String(value || '').trim()
}

function getFunctionUrl(name) {
  const base = sanitize(import.meta.env.VITE_SUPABASE_URL || '')
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/functions/v1/${name}`
}

export async function submitWaitlistEntry(payload) {
  const sb = getSupabaseClient()
  const body = {
    name: sanitize(payload?.name),
    email: sanitize(payload?.email).toLowerCase(),
    roleInterest: sanitize(payload?.roleInterest),
    platform: sanitize(payload?.platform),
    note: sanitize(payload?.note),
    consentTos: !!payload?.consentTos,
    consentPrivacy: !!payload?.consentPrivacy,
    consentAiChat: !!payload?.consentAiChat,
    consentUpdates: !!payload?.consentUpdates,
    source: sanitize(payload?.source || 'landing'),
  }
  if (!sb) return { ok: false, message: 'Die Warteliste ist derzeit nicht verfuegbar.' }
  const { data, error } = await sb.functions.invoke('waitlist-submit', { body })
  if (error) {
    const fallback = await fetch(getFunctionUrl('waitlist-submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!fallback) return { ok: false, message: sanitize(error?.message || 'Wartelisten-Anfrage fehlgeschlagen.') }
    const fallbackData = await fallback.json().catch(() => null)
    if (!fallback.ok) return { ok: false, status: fallback.status, message: sanitize(fallbackData?.message || 'Wartelisten-Anfrage fehlgeschlagen.') }
    return { ok: true, data: fallbackData }
  }
  return { ok: true, data }
}

export async function confirmWaitlistEntry({ email, token }) {
  const sb = getSupabaseClient()
  const body = { email: sanitize(email).toLowerCase(), token: sanitize(token) }
  if (!sb) return { ok: false, message: 'Die Bestaetigung ist derzeit nicht verfuegbar.' }
  const { data, error } = await sb.functions.invoke('waitlist-confirm', { body })
  if (error) {
    const fallback = await fetch(getFunctionUrl('waitlist-confirm'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!fallback) return { ok: false, message: sanitize(error?.message || 'Bestätigung fehlgeschlagen.') }
    const fallbackData = await fallback.json().catch(() => null)
    if (!fallback.ok) return { ok: false, status: fallback.status, message: sanitize(fallbackData?.message || 'Bestätigung fehlgeschlagen.') }
    return { ok: true, data: fallbackData }
  }
  return { ok: true, data }
}
