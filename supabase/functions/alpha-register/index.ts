import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })

  const jwtSecret = sanitize(Deno.env.get('ALPHA_REGISTRATION_JWT_SECRET'))
  const supabaseUrl = sanitize(Deno.env.get('SUPABASE_URL'))
  const serviceRole = sanitize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  if (!jwtSecret || jwtSecret.length < 32) {
    return Response.json({ message: 'Alpha-Registrierung nicht konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }
  if (!supabaseUrl || !serviceRole) {
    return Response.json({ message: 'Supabase nicht konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const password = String(body?.password ?? '')
  const name = sanitize(body?.name)
  const gateToken = sanitize(body?.gateToken)
  const consents = body?.consents && typeof body.consents === 'object' ? body.consents : {}

  if (!gateToken) {
    return Response.json({ message: 'Alpha-Zugang nicht bestätigt. Bitte zuerst den Einladungs-Code eingeben.' }, { status: 401, headers: CORS_HEADERS })
  }
  if (!name || name.length < 2) {
    return Response.json({ message: 'Bitte einen gültigen Namen eingeben.' }, { status: 400, headers: CORS_HEADERS })
  }
  if (!isValidEmail(email)) {
    return Response.json({ message: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { status: 400, headers: CORS_HEADERS })
  }
  if (password.length < 8) {
    return Response.json({ message: 'Passwort zu kurz (mindestens 8 Zeichen).' }, { status: 400, headers: CORS_HEADERS })
  }
  const tosAccepted = !!consents?.tosAccepted
  const privacyAccepted = !!consents?.privacyAccepted
  const aiChatAccepted = !!consents?.aiChatAccepted
  if (!tosAccepted || !privacyAccepted || !aiChatAccepted) {
    return Response.json({ message: 'Pflichtzustimmungen fehlen.' }, { status: 400, headers: CORS_HEADERS })
  }

  let payload: { purpose?: string; iss?: string; exp?: number }
  try {
    const key = await hmacKey(jwtSecret)
    payload = await verify(gateToken, key) as typeof payload
  } catch (_error) {
    return Response.json({ message: 'Einladungs-Token abgelaufen oder ungültig. Bitte Code erneut eingeben.' }, { status: 401, headers: CORS_HEADERS })
  }
  if (payload?.purpose !== 'alpha_registration' || payload?.iss !== 'alpha-registration-gate') {
    return Response.json({ message: 'Ungültiger Einladungs-Token.' }, { status: 401, headers: CORS_HEADERS })
  }

  const sb = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      display_name: name,
      tos_accepted: tosAccepted,
      privacy_accepted: privacyAccepted,
      ai_chat_accepted: aiChatAccepted,
      consent_version: '2026-04-01',
      alpha_registration: true,
    },
  })

  if (error) {
    const msg = String(error.message || 'Registrierung fehlgeschlagen.')
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      return Response.json({ message: 'Diese E-Mail ist bereits registriert.' }, { status: 409, headers: CORS_HEADERS })
    }
    return Response.json({ message: msg }, { status: 400, headers: CORS_HEADERS })
  }

  return Response.json({
    ok: true,
    userId: data?.user?.id || null,
    message: 'Registrierung angelegt. Bitte E-Mail-Bestätigung prüfen, falls aktiv.',
  }, { headers: CORS_HEADERS })
})
