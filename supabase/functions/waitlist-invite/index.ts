import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function sanitize(value: unknown) {
  return String(value || '').trim()
}

async function sendEmail({
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
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) return { ok: false, error: sanitize(data?.message || data?.error?.message || 'Versand fehlgeschlagen') }
  return { ok: true, data }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })

  const authHeader = sanitize(request.headers.get('authorization'))
  const token = authHeader.toLowerCase().startsWith('bearer ') ? sanitize(authHeader.slice(7)) : ''
  const requiredToken = sanitize(Deno.env.get('WAITLIST_INVITE_TOKEN'))
  if (!requiredToken || token !== requiredToken) {
    return Response.json({ message: 'Nicht autorisiert.' }, { status: 401, headers: CORS_HEADERS })
  }

  const supabaseUrl = sanitize(Deno.env.get('SUPABASE_URL'))
  const serviceRole = sanitize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const resendApiKey = sanitize(Deno.env.get('RESEND_API_KEY'))
  const mailFrom = sanitize(Deno.env.get('MAIL_FROM') || 'Medic Inc <no-reply@medicinc.de>')
  if (!supabaseUrl || !serviceRole || !resendApiKey || !mailFrom) {
    return Response.json({ message: 'Invite-Backend nicht vollständig konfiguriert.' }, { status: 500, headers: CORS_HEADERS })
  }

  const body = await request.json().catch(() => ({}))
  const limit = Math.max(1, Math.min(500, Number(body?.limit || 150)))
  const dryRun = !!body?.dryRun
  const subject = sanitize(body?.subject || 'Medic Inc Alpha startet: Dein Zugang ist bereit')
  const htmlTemplate = sanitize(body?.html || '')
  const textTemplate = sanitize(body?.text || '')

  const sb = createClient(supabaseUrl, serviceRole)
  const { data: rows, error } = await sb
    .from('alpha_waitlist')
    .select('id,name,email,status,confirmed_at,invite_sent_at')
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: true })
    .limit(limit)
  if (error) return Response.json({ message: error.message || 'DB-Abfrage fehlgeschlagen.' }, { status: 500, headers: CORS_HEADERS })
  const targets = (rows || []).filter((row) => !row.invite_sent_at)

  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      count: targets.length,
      sample: targets.slice(0, 10).map((entry) => ({ id: entry.id, email: entry.email, name: entry.name })),
    }, { headers: CORS_HEADERS })
  }

  let sent = 0
  const failed: Array<{ id: string; email: string; error: string }> = []
  const nowIso = new Date().toISOString()
  for (const target of targets) {
    const name = sanitize(target.name || 'du')
    const email = sanitize(target.email)
    const html = htmlTemplate || `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2>Medic Inc Alpha ist offen</h2>
        <p>Hallo ${name},</p>
        <p>du stehst auf der bestätigten Warteliste. Die Alpha ist jetzt geöffnet.</p>
        <p>Alle Details und der Zugang sind unter <a href="https://www.medicinc.de/login">https://www.medicinc.de/login</a> verfügbar.</p>
      </div>
    `
    const text = textTemplate || [
      'Medic Inc Alpha ist offen',
      '',
      `Hallo ${name},`,
      'du stehst auf der bestätigten Warteliste. Die Alpha ist jetzt geöffnet.',
      'Details und Zugang: https://www.medicinc.de/login',
    ].join('\n')

    const delivery = await sendEmail({
      resendApiKey,
      from: mailFrom,
      to: email,
      subject,
      html,
      text,
    })
    if (!delivery.ok) {
      failed.push({ id: target.id, email, error: delivery.error })
      continue
    }

    sent += 1
    await sb
      .from('alpha_waitlist')
      .update({
        status: 'invited',
        invite_sent_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', target.id)
  }

  return Response.json({
    ok: true,
    totalTargets: targets.length,
    sent,
    failedCount: failed.length,
    failed,
  }, { headers: CORS_HEADERS })
})
