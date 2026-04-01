import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function sanitize(value: unknown) {
  return String(value || '').trim()
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
  const expectedCode = sanitize(Deno.env.get('ALPHA_REGISTRATION_CODE'))
  if (!jwtSecret || jwtSecret.length < 32) {
    return Response.json({ message: 'Alpha-Gate nicht konfiguriert (JWT Secret).' }, { status: 500, headers: CORS_HEADERS })
  }
  if (!expectedCode) {
    return Response.json({ message: 'Alpha-Gate nicht konfiguriert (Code).' }, { status: 500, headers: CORS_HEADERS })
  }

  const body = await request.json().catch(() => ({}))
  const code = sanitize(body?.code)
  if (!code) {
    return Response.json({ message: 'Bitte den Einladungs-Code eingeben.' }, { status: 400, headers: CORS_HEADERS })
  }

  if (code !== expectedCode) {
    return Response.json({ message: 'Code ungültig.' }, { status: 401, headers: CORS_HEADERS })
  }

  const key = await hmacKey(jwtSecret)
  const expSeconds = 60 * 60
  const accessToken = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      exp: getNumericDate(expSeconds),
      purpose: 'alpha_registration',
      iss: 'alpha-registration-gate',
    },
    key,
  )

  return Response.json({ ok: true, accessToken, expiresInSeconds: expSeconds }, { headers: CORS_HEADERS })
})
