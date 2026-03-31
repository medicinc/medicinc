function sanitize(value) {
  return String(value || '').trim()
}

function getSupabaseFunctionUrl(fnName) {
  const base = sanitize(import.meta.env.VITE_SUPABASE_URL || '')
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/functions/v1/${fnName}`
}

function getSupabaseAuthHeaders() {
  const anonKey = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  if (!anonKey) return {}
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  }
}

export async function requestSupabaseDsarExport(user) {
  const url = getSupabaseFunctionUrl('dsar-export')
  if (!url) return { ok: false, message: 'Supabase DSAR Export Endpoint nicht konfiguriert.' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getSupabaseAuthHeaders() },
      body: JSON.stringify({ userId: user?.id, email: user?.email }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, message: sanitize(data?.message || 'Export fehlgeschlagen.') }
    return { ok: true, data }
  } catch (error) {
    return { ok: false, message: String(error?.message || error || 'Netzwerkfehler') }
  }
}

export async function requestSupabaseDsarDelete(user) {
  const url = getSupabaseFunctionUrl('dsar-delete')
  if (!url) return { ok: false, message: 'Supabase DSAR Delete Endpoint nicht konfiguriert.' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getSupabaseAuthHeaders() },
      body: JSON.stringify({ userId: user?.id, email: user?.email }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, message: sanitize(data?.message || 'Löschen fehlgeschlagen.') }
    return { ok: true, data }
  } catch (error) {
    return { ok: false, message: String(error?.message || error || 'Netzwerkfehler') }
  }
}
