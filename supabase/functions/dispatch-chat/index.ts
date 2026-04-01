const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function sanitize(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function outputGuardrail(text: string) {
  const cleaned = sanitize(text)
  if (!cleaned) return ''
  if (/wählen\s*112|echter\s*notfall|reale\s*rettung/i.test(cleaned)) return cleaned
  if (/dosierung|medikamentengabe|intubier|defibrill/i.test(cleaned)) {
    return 'Leitstelle: In dieser Simulation keine konkreten Therapieanweisungen. Wir melden nur Lage, Zulauf und ETAs.'
  }
  return cleaned
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const isLikelyJwt = token.split('.').length === 3
  if (!token || !isLikelyJwt) {
    return Response.json({ message: 'Nicht autorisiert.' }, { status: 401, headers: CORS_HEADERS })
  }
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return Response.json({ message: 'OPENAI_API_KEY fehlt.' }, { status: 500, headers: CORS_HEADERS })
  try {
    const body = await request.json()
    const history = Array.isArray(body?.history) ? body.history : []
    const compact = history.slice(-10).map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: sanitize(m?.content),
    })).filter((m: any) => m.content)
    const baseSystem = [
      'Du spielst einen Leitstellendisponenten in einer Krankenhaus-Simulation.',
      'Funkstil: kurz, präzise, lageorientiert, professionell (1-5 Sätze).',
      'Nur Leitstellenwissen: Zahlen, ETAs, Triage, Verletzungsmuster, Anfahrten.',
      'Keine ICD-Listen, keine chronischen Zufallsdiagnosen, keine Therapieanweisungen.',
      'Wenn unklar: "noch unklar / Lage läuft".',
      `Aktuelle Lage: ${sanitize(body?.eventTitle || 'Unbekannt')}.`,
      body?.eventContext ? `Lagedetails JSON: ${sanitize(JSON.stringify(body.eventContext))}` : '',
      sanitize(body?.system || ''),
    ].filter(Boolean).join('\n')
    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 180,
      messages: [
        { role: 'system', content: baseSystem },
        ...compact,
        { role: 'user', content: sanitize(body?.userMessage) },
      ],
    }
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return Response.json({ message: sanitize(data?.error?.message || 'AI Anfrage fehlgeschlagen') }, { status: res.status, headers: CORS_HEADERS })
    const text = outputGuardrail(sanitize(data?.choices?.[0]?.message?.content))
    if (!text) return Response.json({ message: 'Keine Antwort erhalten.' }, { status: 502, headers: CORS_HEADERS })
    return Response.json({ text }, { headers: CORS_HEADERS })
  } catch (error) {
    return Response.json({ message: String((error as Error)?.message || error || 'Unbekannter Fehler') }, { status: 500, headers: CORS_HEADERS })
  }
})
