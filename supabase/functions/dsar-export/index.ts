Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = await request.json().catch(() => ({}))
  return Response.json({
    ok: true,
    message: 'DSAR export placeholder. Implement real Supabase export pipeline before production.',
    userId: body?.userId || null,
    email: body?.email || null,
    generatedAt: new Date().toISOString(),
  })
})
