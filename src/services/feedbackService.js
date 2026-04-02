import { getSupabaseClient, isUuid } from '../lib/supabaseClient'

export const FEEDBACK_BUCKET = 'feedback-attachments'
const MAX_FILES = 6
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const REFRESH_SESSION_TIMEOUT_MS = 12_000
const FEEDBACK_FETCH_TIMEOUT_MS = 28_000
/** Access-Token mindestens so viele Sekunden gültig → kein refreshSession (vermeidet Hänger). */
const TOKEN_SKIP_REFRESH_SEC = 120

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

function raceTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms)
    }),
  ])
}

/**
 * Access-Token für Edge Functions. Verwendet bei noch gültigem Token kein refreshSession
 * (refresh kann im Browser hängen bleiben). Sonst refresh mit Timeout, Fallback getSession.
 */
async function getRefreshedAccessToken(sb) {
  const { data: cur } = await sb.auth.getSession()
  const tokenNow = String(cur?.session?.access_token || '')
  const exp = decodeJwtPayload(tokenNow)?.exp
  const now = Math.floor(Date.now() / 1000)
  if (
    tokenNow
    && tokenNow.split('.').length === 3
    && exp
    && exp > now + TOKEN_SKIP_REFRESH_SEC
  ) {
    return { token: tokenNow, error: null, refreshed: false, usedCachedToken: true }
  }

  let refreshResult = null
  try {
    refreshResult = await raceTimeout(sb.auth.refreshSession(), REFRESH_SESSION_TIMEOUT_MS, 'refreshSession')
  } catch (_e) {
    refreshResult = null
  }

  const session = refreshResult?.data?.session || (await sb.auth.getSession()).data?.session
  const token = String(session?.access_token || '')
  const refreshErr = refreshResult?.error
  if (!token || token.split('.').length !== 3) {
    return {
      token: null,
      error: refreshErr?.message || 'Kein Access-Token.',
      refreshed: false,
      usedCachedToken: false,
    }
  }
  return {
    token,
    error: null,
    refreshed: Boolean(refreshResult?.data?.session),
    usedCachedToken: false,
  }
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

  const { token, error: tokenErr, refreshed, usedCachedToken } = await getRefreshedAccessToken(sb)
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

  /** Direkter fetch mit Timeout (ohne functions.invoke). */
  const controller = new AbortController()
  const fetchTimeoutId = setTimeout(() => controller.abort(), FEEDBACK_FETCH_TIMEOUT_MS)
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(fetchTimeoutId)
    const name = e?.name || ''
    const msg = String(e?.message || e || '')
    const aborted = name === 'AbortError' || msg.includes('aborted')
    return {
      ok: false,
      message: aborted
        ? `Zeitüberschreitung: Server hat nach ${Math.round(FEEDBACK_FETCH_TIMEOUT_MS / 1000)}s nicht geantwortet.`
        : `Netzwerkfehler: ${msg || 'Unbekannt'}`,
      details: {
        phase: aborted ? 'fetch_timeout' : 'fetch_network',
        sessionRefreshed: refreshed,
        usedCachedToken,
      },
    }
  }
  clearTimeout(fetchTimeoutId)

  if (!res) {
    return {
      ok: false,
      message: 'Netzwerkfehler beim Senden.',
      details: { phase: 'fetch_no_response', sessionRefreshed: refreshed, usedCachedToken },
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
        usedCachedToken,
        tokenIssuer: accessTokenIss(token),
        expectedIssuer: expectedJwtIssuer(),
      },
    }
  }
  if (j?.message && !j?.ok) {
    return { ok: false, message: j.message, details: { phase: 'fetch_body_error', data: j, usedCachedToken } }
  }
  return {
    ok: true,
    message: j?.message || 'Gesendet.',
    details: { phase: 'fetch_ok', data: j, sessionRefreshed: refreshed, usedCachedToken },
  }
}
