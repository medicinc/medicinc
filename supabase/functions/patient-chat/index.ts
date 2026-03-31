const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function sanitize(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function buildSystemPrompt(body: any) {
  const patient = body?.patient || {}
  const context = patient?.context || {}
  return [
    'Du spielst eine einzelne Patientin/einen einzelnen Patienten in einer medizinischen Simulation.',
    'Antwortsprache: Deutsch, ausser wenn lang explizit en/es verlangt.',
    'Keine medizinische Beratung, keine Realwelt-Handlungsanweisung, nur Simulationsdialog.',
    'Alltagssprache, 1-3 kurze Saetze, konsistent mit den gelieferten Falldaten.',
    `Gesprächsmodus: ${sanitize(body?.mode || 'triage')}.`,
    `Sprachziel: ${sanitize(body?.lang || 'de')}.`,
    body?.translatorEnabled ? 'Übersetzer aktiv: keine Sprachbarrieren simulieren.' : 'Sprachbarrieren dürfen vorsichtig angedeutet werden.',
    `Patient: ${Number(patient?.age || 0)} Jahre, ${sanitize(patient?.gender || 'unbekannt')}.`,
    `Leitbeschwerde: ${sanitize(patient?.chiefComplaint || 'nicht angegeben')}.`,
    Array.isArray(patient?.symptoms) && patient.symptoms.length ? `Bekannte Symptome: ${patient.symptoms.map((x: unknown) => sanitize(x)).join(', ')}.` : '',
    patient?.vitals ? `Bekannte Vitalwerte: HF ${sanitize(patient.vitals.hr)}, RR ${sanitize(patient.vitals.bp)}, AF ${sanitize(patient.vitals.rr)}, Temp ${sanitize(patient.vitals.temp)}, SpO2 ${sanitize(patient.vitals.spo2)}.` : '',
    context?.diagnosisName ? `Falldaten intern: ${sanitize(context.diagnosisCode)} ${sanitize(context.diagnosisName)}.` : '',
    context?.allergies ? `Allergien: ${sanitize(context.allergies)}.` : '',
    context?.medications ? `Dauermedikation: ${sanitize(context.medications)}.` : '',
    context?.pastHistory ? `Vorerkrankungen: ${sanitize(context.pastHistory)}.` : '',
    context?.lastMeal ? `Letzte Mahlzeit: ${sanitize(context.lastMeal)}.` : '',
  ].filter(Boolean).join('\n')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return Response.json({ message: 'OPENAI_API_KEY fehlt.' }, { status: 500 })
  try {
    const body = await request.json()
    const history = Array.isArray(body?.history) ? body.history : []
    const compact = history.slice(-10).map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: sanitize(m?.content),
    })).filter((m: any) => m.content)
    const userMessage = sanitize(body?.doctorMessage)
    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.55,
      max_tokens: 180,
      messages: [
        { role: 'system', content: buildSystemPrompt(body) },
        ...compact,
        { role: 'user', content: userMessage },
      ],
    }
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return Response.json({ message: sanitize(data?.error?.message || 'AI Anfrage fehlgeschlagen') }, { status: res.status })
    const text = sanitize(data?.choices?.[0]?.message?.content)
    if (!text) return Response.json({ message: 'Keine Antwort erhalten.' }, { status: 502 })
    return Response.json({ text })
  } catch (error) {
    return Response.json({ message: String((error as Error)?.message || error || 'Unbekannter Fehler') }, { status: 500 })
  }
})
