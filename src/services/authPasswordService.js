import { getSupabaseClient } from '../lib/supabaseClient'

function sanitize(value) {
  return String(value || '').trim()
}

/**
 * Sendet Supabase „Passwort zurücksetzen“-E-Mail (Template „Reset password“ im Dashboard).
 * redirectTo muss unter Authentication → URL Configuration eingetragen sein.
 */
export async function requestPasswordReset(email) {
  const sb = getSupabaseClient()
  if (!sb) {
    return { ok: false, message: 'Passwort-Zuruecksetzen ist derzeit nicht verfuegbar.' }
  }
  const normalized = sanitize(email).toLowerCase()
  if (!normalized.includes('@')) {
    return { ok: false, message: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await sb.auth.resetPasswordForEmail(normalized, { redirectTo })
  if (error) {
    return { ok: false, message: error.message || 'E-Mail konnte nicht gesendet werden.' }
  }
  return { ok: true }
}
