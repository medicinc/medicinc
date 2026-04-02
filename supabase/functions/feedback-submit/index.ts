import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function sanitize(value: unknown) {
  return String(value || '').trim()
}

const CATEGORIES = new Set(['bug', 'feedback', 'idea', 'other'])

async function sendNotifyEmail({
  resendApiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  resendApiKey: string
  from: string
  to: string
  subject: string
  html: string
  text: string
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('Feedback notify:', sanitize(data?.message || 'resend failed'))
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })

  const supabaseUrl = sanitize(Deno.env.get('SUPABASE_URL'))
  const anonKey = sanitize(Deno.env.get('SUPABASE_ANON_KEY'))
  const serviceRole = sanitize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const resendApiKey = sanitize(Deno.env.get('RESEND_API_KEY'))
  const mailFrom = sanitize(Deno.env.get('MAIL_FROM') || 'Medic Inc <no-reply@medicinc.de>')
  const notifyTo = sanitize(Deno.env.get('FEEDBACK_NOTIFY_EMAIL') || Deno.env.get('WAITLIST_ADMIN_NOTIFY_EMAIL') || '')

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return Response.json({ message: 'Feedback-Backend nicht konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return Response.json({ message: 'Nicht angemeldet.' }, { status: 401, headers: CORS_HEADERS })
  }

  const sbUser = createClient(supabaseUrl, anonKey)
  const { data: authData, error: authError } = await sbUser.auth.getUser(token)
  if (authError || !authData?.user) {
    return Response.json({ message: 'Nicht autorisiert.' }, { status: 401, headers: CORS_HEADERS })
  }
  const uid = authData.user.id
  const email = sanitize(authData.user.email || '')

  const body = await request.json().catch(() => ({}))
  const category = sanitize(body?.category)
  const title = sanitize(body?.title).slice(0, 200)
  const textBody = sanitize(body?.body).slice(0, 12000)
  const pathsRaw = Array.isArray(body?.attachmentPaths) ? body.attachmentPaths : []

  if (!CATEGORIES.has(category)) {
    return Response.json({ message: 'Ungültige Kategorie.' }, { status: 400, headers: CORS_HEADERS })
  }
  if (title.length < 2) {
    return Response.json({ message: 'Bitte einen aussagekräftigen Titel eingeben.' }, { status: 400, headers: CORS_HEADERS })
  }
  if (textBody.length < 10) {
    return Response.json({ message: 'Bitte eine ausführlichere Beschreibung (mindestens 10 Zeichen).' }, { status: 400, headers: CORS_HEADERS })
  }

  const attachmentPaths: string[] = []
  for (const p of pathsRaw.slice(0, 6)) {
    const s = sanitize(p)
    if (!s || !s.startsWith(`${uid}/`)) {
      return Response.json({ message: 'Ungültige Anhang-Pfade.' }, { status: 400, headers: CORS_HEADERS })
    }
    if (s.includes('..')) {
      return Response.json({ message: 'Ungültiger Anhang-Pfad.' }, { status: 400, headers: CORS_HEADERS })
    }
    attachmentPaths.push(s)
  }

  const sbAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: insertError } = await sbAdmin.from('user_feedback').insert({
    user_id: uid,
    user_email: email || null,
    category,
    title,
    body: textBody,
    attachment_paths: attachmentPaths,
  })

  if (insertError) {
    return Response.json({ message: insertError.message || 'Speichern fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
  }

  if (resendApiKey && notifyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyTo)) {
    const safe = (v: string) => v.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const pathList = attachmentPaths.length ? attachmentPaths.map((p) => `• ${p}`).join('<br/>') : '—'
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2>Neues Feedback (${safe(category)})</h2>
        <p><strong>Von:</strong> ${safe(email || uid)}</p>
        <p><strong>Titel:</strong> ${safe(title)}</p>
        <p><strong>Text:</strong></p>
        <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px">${safe(textBody)}</pre>
        <p><strong>Anhänge (Storage-Pfade):</strong><br/>${pathList}</p>
      </div>
    `
    const text = [`Feedback [${category}]`, `Von: ${email || uid}`, `Titel: ${title}`, '', textBody, '', 'Anhänge:', ...attachmentPaths].join('\n')
    await sendNotifyEmail({
      resendApiKey,
      from: mailFrom,
      to: notifyTo,
      subject: `[Medic Inc Feedback] ${category}: ${title.slice(0, 60)}`,
      html,
      text,
    })
  }

  return Response.json({ ok: true, message: 'Vielen Dank! Dein Feedback wurde übermittelt.' }, { headers: CORS_HEADERS })
})
