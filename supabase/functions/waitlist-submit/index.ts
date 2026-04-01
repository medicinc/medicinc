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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function firstForwardedIp(request: Request) {
  const fwd = request.headers.get('x-forwarded-for') || ''
  const first = fwd.split(',')[0] || ''
  return sanitize(first)
}

async function sendDoiEmail({
  resendApiKey,
  from,
  to,
  confirmUrl,
  name,
}: {
  resendApiKey: string
  from: string
  to: string
  confirmUrl: string
  name: string
}) {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2>Medic Inc Alpha-Warteliste</h2>
      <p>Hallo ${name || 'du'},</p>
      <p>bitte bestätige deine E-Mail-Adresse, damit wir dich für die Alpha-Warteliste freischalten können.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">E-Mail bestätigen</a></p>
      <p>Falls der Button nicht funktioniert, kopiere diesen Link in den Browser:</p>
      <p style="word-break:break-all">${confirmUrl}</p>
      <p>Wenn du dich nicht eingetragen hast, ignoriere diese E-Mail.</p>
    </div>
  `
  const text = [
    'Medic Inc Alpha-Warteliste',
    '',
    `Hallo ${name || 'du'},`,
    'bitte bestätige deine E-Mail-Adresse über diesen Link:',
    confirmUrl,
    '',
    'Wenn du dich nicht eingetragen hast, ignoriere diese E-Mail.',
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Bitte bestätige deine Anmeldung zur Medic Inc Alpha-Warteliste',
      html,
      text,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, error: sanitize(data?.message || data?.error?.message || 'Resend Versand fehlgeschlagen') }
  }
  return { ok: true, data }
}

async function sendAdminWaitlistNotify({
  resendApiKey,
  from,
  to,
  name,
  email,
  roleInterest,
  platform,
  note,
  source,
}: {
  resendApiKey: string
  from: string
  to: string
  name: string
  email: string
  roleInterest: string
  platform: string
  note: string
  source: string
}) {
  const safe = (v: string) => v.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
      <h2 style="margin:0 0 12px">Neue Alpha-Warteliste</h2>
      <p style="margin:0 0 8px"><strong>Name:</strong> ${safe(name)}</p>
      <p style="margin:0 0 8px"><strong>E-Mail:</strong> ${safe(email)}</p>
      <p style="margin:0 0 8px"><strong>Quelle:</strong> ${safe(source || '—')}</p>
      <p style="margin:0 0 8px"><strong>Rolle / Interesse:</strong> ${safe(roleInterest || '—')}</p>
      <p style="margin:0 0 8px"><strong>Plattform:</strong> ${safe(platform || '—')}</p>
      <p style="margin:12px 0 0"><strong>Notiz:</strong><br/>${safe(note || '—')}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b">Automatische Benachrichtigung von Medic Inc (waitlist-submit).</p>
    </div>
  `
  const text = [
    'Neue Alpha-Warteliste',
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Quelle: ${source || '—'}`,
    `Rolle/Interesse: ${roleInterest || '—'}`,
    `Plattform: ${platform || '—'}`,
    `Notiz: ${note || '—'}`,
  ].join('\n')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Alpha-Warteliste: ${email}`,
      html,
      text,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('Admin waitlist notify failed:', sanitize(data?.message || data?.error?.message || 'unknown'))
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })

  const supabaseUrl = sanitize(Deno.env.get('SUPABASE_URL'))
  const serviceRole = sanitize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const resendApiKey = sanitize(Deno.env.get('RESEND_API_KEY'))
  const mailFrom = sanitize(Deno.env.get('MAIL_FROM') || 'Medic Inc <no-reply@medicinc.de>')
  const publicAppUrl = sanitize(Deno.env.get('PUBLIC_APP_URL') || 'https://www.medicinc.de').replace(/\/+$/, '')
  const ipSalt = sanitize(Deno.env.get('WAITLIST_IP_SALT'))
  const adminNotifyEmail = sanitize(Deno.env.get('WAITLIST_ADMIN_NOTIFY_EMAIL') || '')
  if (!supabaseUrl || !serviceRole || !resendApiKey || !mailFrom || !publicAppUrl) {
    return Response.json({ message: 'Waitlist-Backend nicht vollständig konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }

  const sb = createClient(supabaseUrl, serviceRole)
  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const name = sanitize(body?.name)
  if (!name || name.length < 2) return Response.json({ message: 'Bitte einen gültigen Namen eingeben.' }, { status: 400, headers: CORS_HEADERS })
  if (!isValidEmail(email)) return Response.json({ message: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { status: 400, headers: CORS_HEADERS })

  const consentTos = !!body?.consentTos
  const consentPrivacy = !!body?.consentPrivacy
  const consentAiChat = !!body?.consentAiChat
  const consentUpdates = !!body?.consentUpdates
  if (!consentTos || !consentPrivacy || !consentAiChat) {
    return Response.json({ message: 'Pflichtzustimmungen fehlen.' }, { status: 400, headers: CORS_HEADERS })
  }

  const roleInterest = sanitize(body?.roleInterest || '').slice(0, 120)
  const platform = sanitize(body?.platform || '').slice(0, 120)
  const note = sanitize(body?.note || '').slice(0, 1200)
  const source = sanitize(body?.source || 'landing').slice(0, 60) || 'landing'
  const userAgent = sanitize(request.headers.get('user-agent') || '').slice(0, 512)
  const ip = firstForwardedIp(request)
  const ipHash = ip && ipSalt ? await sha256Hex(`${ipSalt}:${ip}`) : null
  const nowIso = new Date().toISOString()

  const { data: existing, error: fetchError } = await sb
    .from('alpha_waitlist')
    .select('id,status,doi_sent_at')
    .eq('email_normalized', email)
    .maybeSingle()
  if (fetchError) return Response.json({ message: fetchError.message || 'DB-Abfrage fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })

  const sentAtMs = Date.parse(String(existing?.doi_sent_at || ''))
  if (Number.isFinite(sentAtMs) && (Date.now() - sentAtMs) < 45_000) {
    return Response.json({ message: 'Bitte kurz warten, bevor du erneut anfragst.' }, { status: 429, headers: CORS_HEADERS })
  }

  if (existing?.status === 'confirmed') {
    const { error: updateConfirmedError } = await sb
      .from('alpha_waitlist')
      .update({
        name,
        role_interest: roleInterest || null,
        platform: platform || null,
        note: note || null,
        consent_tos: consentTos,
        consent_privacy: consentPrivacy,
        consent_ai_chat: consentAiChat,
        consent_updates_optional: consentUpdates,
        source,
        ip_hash: ipHash,
        user_agent: userAgent || null,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
    if (updateConfirmedError) {
      return Response.json({ message: updateConfirmedError.message || 'Aktualisierung fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
    }
    return Response.json({ ok: true, alreadyConfirmed: true, message: 'Adresse ist bereits bestätigt.' }, { headers: CORS_HEADERS })
  }

  const token = `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
  const tokenHash = await sha256Hex(token)
  const confirmUrl = `${publicAppUrl}/waitlist/confirm?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`

  if (existing?.id) {
    const { error: updateError } = await sb
      .from('alpha_waitlist')
      .update({
        name,
        role_interest: roleInterest || null,
        platform: platform || null,
        note: note || null,
        consent_tos: consentTos,
        consent_privacy: consentPrivacy,
        consent_ai_chat: consentAiChat,
        consent_updates_optional: consentUpdates,
        status: 'pending',
        source,
        doi_token_hash: tokenHash,
        doi_sent_at: nowIso,
        confirmed_at: null,
        ip_hash: ipHash,
        user_agent: userAgent || null,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
    if (updateError) return Response.json({ message: updateError.message || 'Speichern fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
  } else {
    const { error: insertError } = await sb.from('alpha_waitlist').insert({
      email,
      email_normalized: email,
      name,
      role_interest: roleInterest || null,
      platform: platform || null,
      note: note || null,
      consent_tos: consentTos,
      consent_privacy: consentPrivacy,
      consent_ai_chat: consentAiChat,
      consent_updates_optional: consentUpdates,
      status: 'pending',
      source,
      doi_token_hash: tokenHash,
      doi_sent_at: nowIso,
      ip_hash: ipHash,
      user_agent: userAgent || null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    if (insertError) return Response.json({ message: insertError.message || 'Speichern fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
  }

  const sent = await sendDoiEmail({
    resendApiKey,
    from: mailFrom,
    to: email,
    confirmUrl,
    name,
  })
  if (!sent.ok) return Response.json({ message: sent.error }, { status: 502, headers: CORS_HEADERS })

  if (adminNotifyEmail && isValidEmail(adminNotifyEmail) && !existing) {
    try {
      await sendAdminWaitlistNotify({
        resendApiKey,
        from: mailFrom,
        to: adminNotifyEmail,
        name,
        email,
        roleInterest,
        platform,
        note,
        source,
      })
    } catch (_err) {
      console.error('Admin waitlist notify exception')
    }
  }

  return Response.json({ ok: true, pendingConfirmation: true, message: 'Bitte bestätige deine E-Mail-Adresse.' }, { headers: CORS_HEADERS })
})
