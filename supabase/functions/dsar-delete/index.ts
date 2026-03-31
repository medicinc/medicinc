Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = await request.json().catch(() => ({}))
  return Response.json({
    ok: true,
    message: 'DSAR delete placeholder. Implement real Supabase deletion workflow before production.',
    userId: body?.userId || null,
    email: body?.email || null,
    queuedAt: new Date().toISOString(),
  })
})
