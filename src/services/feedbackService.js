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

function decodeJwtPayload(token) {
  try {
    const p = String(token || '').split('.')[1]
    if (!p) return null
    const b = p.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b.length % 4 === 0 ? '' : '='.repeat(4 - (b.length % 4))
    return JSON.parse(atob(b + pad))
  } catch (_e) {
    return null
  }
}

/** JWT payload `exp` (seconds) → ISO string, nur für Diagnose */
function accessTokenExpiryIso(token) {
  const json = decodeJwtPayload(token)
  return json?.exp ? new Date(json.exp * 1000).toISOString() : null
}

function accessTokenIss(token) {
  const json = decodeJwtPayload(token)
  return typeof json?.iss === 'string' ? json.iss : null
}

/**
 * Frischer Access-Token für Edge Functions (Gateway prüft JWT; abgelaufene Tokens → "Invalid JWT").
 */
async function getRefreshedAccessToken(sb) {
  const { data: refreshData, error: refreshErr } = await sb.auth.refreshSession()
  const session = refreshData?.session || (await sb.auth.getSession()).data?.session
  const token = String(session?.access_token || '')
  if (!token || token.split('.').length !== 3) {
    return { token: null, error: refreshErr?.message || 'Kein Access-Token.', refreshed: false }
  }
  return { token, error: null, refreshed: Boolean(refreshData?.session) }
}

function expectedJwtIssuer() {
  const base = String(import.meta.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
  if (!base.startsWith('http')) return null
  return `${base}/auth/v1`
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
  const iss = sessionToken ? accessTokenIss(sessionToken) : null
  const expIso = sessionToken ? accessTokenExpiryIso(sessionToken) : null
  const expectedIss = expectedJwtIssuer()
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
    accessTokenExpiresAt: expIso,
    accessTokenIssuer: iss,
    expectedJwtIssuer: expectedIss,
    issuerMatchesEnv:
      iss && expectedIss ? iss === expectedIss : iss || expectedIss ? false : null,
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
  const url = getFunctionUrl('feedback-submit')
  if (!url) {
    return { ok: false, message: 'Supabase-URL fehlt.', details: { reason: 'no_function_url' } }
  }
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!anon) {
    return { ok: false, message: 'VITE_SUPABASE_ANON_KEY fehlt.', details: { reason: 'no_anon' } }
  }

  const { error: userErr } = await sb.auth.getUser()
  if (userErr) {
    await sb.auth.refreshSession().catch(() => {})
  }

  const { token, error: tokenErr, refreshed } = await getRefreshedAccessToken(sb)
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

  /** Direkter fetch (ohne functions.invoke): vermeidet Header-Kollisionen mit dem Functions-Client. */
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).catch((e) => null)

  if (!res) {
    return {
      ok: false,
      message: 'Netzwerkfehler beim Senden.',
      details: { phase: 'fetch_network', sessionRefreshed: refreshed },
    }
  }

  const j = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = typeof j?.message === 'string' ? j.message : `HTTP ${res.status}`
    return {
      ok: false,
      message: msg,
      details: {
        phase: 'fetch',
        status: res.status,
        body: j,
        sessionRefreshed: refreshed,
        tokenIssuer: accessTokenIss(token),
        expectedIssuer: expectedJwtIssuer(),
      },
    }
  }
  if (j?.message && !j?.ok) {
    return { ok: false, message: j.message, details: { phase: 'fetch_body_error', data: j } }
  }
  return {
    ok: true,
    message: j?.message || 'Gesendet.',
    details: { phase: 'fetch_ok', data: j, sessionRefreshed: refreshed },
  }
}
