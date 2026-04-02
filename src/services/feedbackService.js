import { getSupabaseClient, isUuid } from '../lib/supabaseClient'

export const FEEDBACK_BUCKET = 'feedback-attachments'
const MAX_FILES = 6
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file'
}

function getFunctionUrl(name) {
  const base = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/functions/v1/${name}`
}

function anonHeaders() {
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!anon) return { 'Content-Type': 'application/json' }
  return {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  }
}

async function readFunctionsHttpErrorBody(error) {
  try {
    const ctx = error?.context
    if (ctx && typeof ctx.json === 'function') {
      return await ctx.json()
    }
  } catch (_e) {
    /* ignore */
  }
  return null
}

/** JWT payload `exp` (seconds) → ISO string, nur für Diagnose */
function accessTokenExpiryIso(token) {
  try {
    const p = String(token || '').split('.')[1]
    if (!p) return null
    const b = p.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b.length % 4 === 0 ? '' : '='.repeat(4 - (b.length % 4))
    const json = JSON.parse(atob(b + pad))
    return json?.exp ? new Date(json.exp * 1000).toISOString() : null
  } catch (_e) {
    return null
  }
}

/**
 * Frischer Access-Token für Edge Functions (Gateway prüft JWT; abgelaufene Tokens → "Invalid JWT").
 */
async function getRefreshedAccessToken(sb) {
  const { data: refreshData, error: refreshErr } = await sb.auth.refreshSession()
  const session = refreshData?.session || (await sb.auth.getSession()).data?.session
  const token = String(session?.access_token || '')
  if (!token || token.split('.').length !== 3) {
    return { token: null, error: refreshErr?.message || 'Kein Access-Token.' }
  }
  return { token, error: null }
}

/** Laufzeit-Snapshot für das Feedback-Formular (Debug / Support). */
export async function collectFeedbackDiagnostics(appUser) {
  const urlSet = Boolean(String(import.meta.env.VITE_SUPABASE_URL || '').trim())
  const anonSet = Boolean(String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim())
  const sb = getSupabaseClient()
  let sessionUserId = null
  let hasJwt = false
  let sessionError = null
  let sessionToken = ''
  if (sb) {
    const { data, error } = await sb.auth.getSession()
    sessionError = error?.message || null
    sessionUserId = data?.session?.user?.id ?? null
    sessionToken = String(data?.session?.access_token || '')
    const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
    hasJwt = Boolean(sessionToken && sessionToken.split('.').length === 3 && sessionToken !== anon)
  }
  const aid = appUser?.id != null ? String(appUser.id) : ''
  return {
    envSupabaseUrlSet: urlSet,
    envAnonKeySet: anonSet,
    supabaseClientReady: Boolean(sb),
    appUserId: aid || null,
    appUserIdLooksLikeUuid: aid ? isUuid(aid) : false,
    authSessionUserId: sessionUserId,
    sessionMatchesAppUser:
      aid && sessionUserId ? aid === String(sessionUserId) : aid || sessionUserId ? false : null,
    hasUserAccessToken: hasJwt,
    sessionError,
    feedbackSubmitUrl: getFunctionUrl('feedback-submit') || null,
    accessTokenExpiresAt: sessionToken ? accessTokenExpiryIso(sessionToken) : null,
  }
}

export async function uploadFeedbackFiles(userId, fileList) {
  const sb = getSupabaseClient()
  if (!sb || !userId) return { ok: false, message: 'Nicht angemeldet.', paths: [] }
  const files = Array.from(fileList || []).slice(0, MAX_FILES)
  const paths = []
  for (const file of files) {
    if (!file || !file.size) continue
    if (file.size > MAX_BYTES) {
      return { ok: false, message: `Datei zu groß (max. ${MAX_BYTES / 1024 / 1024} MB pro Bild).`, paths: [] }
    }
    const type = String(file.type || '').toLowerCase()
    if (!ALLOWED_TYPES.has(type)) {
      return { ok: false, message: 'Nur Bilder (PNG, JPEG, WebP, GIF) erlaubt.', paths: [] }
    }
    const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`
    const { error } = await sb.storage.from(FEEDBACK_BUCKET).upload(path, file, {
      contentType: type,
      upsert: false,
    })
    if (error) {
      return { ok: false, message: error.message || 'Upload fehlgeschlagen.', paths: [] }
    }
    paths.push(path)
  }
  return { ok: true, paths }
}

export async function submitFeedback({ title, body, category, attachmentPaths = [] }) {
  const sb = getSupabaseClient()
  if (!sb) {
    return { ok: false, message: 'Supabase nicht konfiguriert.', details: { reason: 'no_client' } }
  }
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const { token, error: tokenErr } = await getRefreshedAccessToken(sb)
  if (!token) {
    return {
      ok: false,
      message: 'Sitzung ungültig oder abgelaufen. Bitte neu anmelden.',
      details: { reason: 'no_access_token', tokenErr },
    }
  }
  const payload = {
    title: String(title || '').trim(),
    body: String(body || '').trim(),
    category: String(category || 'feedback').trim(),
    attachmentPaths,
  }
  const { data, error } = await sb.functions.invoke('feedback-submit', {
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(anon ? { apikey: anon } : {}),
    },
  })
  if (error) {
    const errJson = await readFunctionsHttpErrorBody(error)
    const status = error?.context?.status
    const fromBody = typeof errJson?.message === 'string' ? errJson.message : null
    if (fromBody) {
      return {
        ok: false,
        message: fromBody,
        details: { phase: 'invoke_http_error', status, body: errJson, invokeMessage: error.message },
      }
    }
    const fallback = await fetch(getFunctionUrl('feedback-submit'), {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(payload),
    }).catch(() => null)
    if (!fallback) {
      return {
        ok: false,
        message: error.message || 'Senden fehlgeschlagen.',
        details: { phase: 'invoke_error_no_fallback', status, invokeMessage: error.message },
      }
    }
    const j = await fallback.json().catch(() => null)
    if (!fallback.ok) {
      return {
        ok: false,
        message: j?.message || `Senden fehlgeschlagen (HTTP ${fallback.status}).`,
        details: { phase: 'fetch_fallback', status: fallback.status, body: j },
      }
    }
    return { ok: true, message: j?.message || 'Gesendet.', details: { phase: 'fetch_fallback_ok', body: j } }
  }
  if (data?.message && !data?.ok) {
    return { ok: false, message: data.message, details: { phase: 'invoke_2xx_error_shape', data } }
  }
  return { ok: true, message: data?.message || 'Gesendet.', details: { phase: 'invoke_ok', data } }
}

async function buildAuthHeaders() {
  const sb = getSupabaseClient()
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!sb || !anon) return { 'Content-Type': 'application/json', ...anonHeaders() }
  const { token } = await getRefreshedAccessToken(sb)
  if (!token) {
    return { 'Content-Type': 'application/json', ...anonHeaders() }
  }
  return {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${token}`,
  }
}
