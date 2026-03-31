const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = await request.json().catch(() => ({}))
  return Response.json({
    ok: true,
    message: 'DSAR delete placeholder. Implement real Supabase deletion workflow before production.',
    userId: body?.userId || null,
    email: body?.email || null,
    queuedAt: new Date().toISOString(),
  }, { headers: CORS_HEADERS })
})
