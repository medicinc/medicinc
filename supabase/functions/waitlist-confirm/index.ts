import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function sanitize(value: unknown) {
  return String(value || '').trim()
}

function normalizeEmail(value: unknown) {
  return sanitize(value).toLowerCase()
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })

  const supabaseUrl = sanitize(Deno.env.get('SUPABASE_URL'))
  const serviceRole = sanitize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  if (!supabaseUrl || !serviceRole) {
    return Response.json({ message: 'Waitlist-Backend nicht vollständig konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const token = sanitize(body?.token)
  if (!email || !token) {
    return Response.json({ message: 'Ungültiger Bestätigungslink.' }, { status: 400, headers: CORS_HEADERS })
  }

  const sb = createClient(supabaseUrl, serviceRole)
  const { data: row, error } = await sb
    .from('alpha_waitlist')
    .select('id,status,doi_token_hash,confirmed_at')
    .eq('email_normalized', email)
    .maybeSingle()
  if (error) return Response.json({ message: error.message || 'DB-Abfrage fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
  if (!row) return Response.json({ message: 'Eintrag nicht gefunden.' }, { status: 404, headers: CORS_HEADERS })

  if (row.status === 'confirmed' || row.confirmed_at) {
    return Response.json({ ok: true, alreadyConfirmed: true, message: 'E-Mail bereits bestätigt.' }, { headers: CORS_HEADERS })
  }

  const expected = sanitize(row.doi_token_hash)
  if (!expected) return Response.json({ message: 'Token ist abgelaufen. Bitte neu eintragen.' }, { status: 400, headers: CORS_HEADERS })
  const provided = await sha256Hex(token)
  if (provided !== expected) {
    return Response.json({ message: 'Ungültiger oder abgelaufener Token.' }, { status: 400, headers: CORS_HEADERS })
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await sb
    .from('alpha_waitlist')
    .update({
      status: 'confirmed',
      confirmed_at: nowIso,
      doi_token_hash: null,
      updated_at: nowIso,
    })
    .eq('id', row.id)
  if (updateError) return Response.json({ message: updateError.message || 'Bestätigung fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })

  return Response.json({ ok: true, confirmed: true, message: 'E-Mail erfolgreich bestätigt.' }, { headers: CORS_HEADERS })
})
