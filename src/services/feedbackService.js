import { getSupabaseClient } from '../lib/supabaseClient'

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
  if (!sb) return { ok: false, message: 'Supabase nicht konfiguriert.' }
  const payload = {
    title: String(title || '').trim(),
    body: String(body || '').trim(),
    category: String(category || 'feedback').trim(),
    attachmentPaths,
  }
  const { data, error } = await sb.functions.invoke('feedback-submit', { body: payload })
  if (error) {
    const fallback = await fetch(getFunctionUrl('feedback-submit'), {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(payload),
    }).catch(() => null)
    if (!fallback) return { ok: false, message: error.message || 'Senden fehlgeschlagen.' }
    const j = await fallback.json().catch(() => null)
    if (!fallback.ok) return { ok: false, message: j?.message || 'Senden fehlgeschlagen.' }
    return { ok: true, message: j?.message || 'Gesendet.' }
  }
  if (data?.message && !data?.ok) return { ok: false, message: data.message }
  return { ok: true, message: data?.message || 'Gesendet.' }
}

async function buildAuthHeaders() {
  const sb = getSupabaseClient()
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!sb || !anon) return { 'Content-Type': 'application/json', ...anonHeaders() }
  const { data: { session } } = await sb.auth.getSession()
  const token = String(session?.access_token || '')
  if (!token || token.split('.').length !== 3) {
    return { 'Content-Type': 'application/json', ...anonHeaders() }
  }
  return {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${token}`,
  }
}
