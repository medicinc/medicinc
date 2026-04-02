import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!supabaseUrl || !anonKey || !token) {
    return Response.json({ ok: false, message: 'Nicht autorisiert.' }, { status: 401, headers: CORS_HEADERS })
  }
  const sb = createClient(supabaseUrl, anonKey)
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  if (authError || !authData?.user) {
    return Response.json({ ok: false, message: 'Nicht autorisiert.' }, { status: 401, headers: CORS_HEADERS })
  }
  const body = await request.json().catch(() => ({}))
  if (body?.userId && String(body.userId) !== String(authData.user.id)) {
    return Response.json({ ok: false, message: 'Ungültige Benutzer-ID.' }, { status: 403, headers: CORS_HEADERS })
  }
  const uid = authData.user.id
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('id, email, username, game_data, updated_at')
    .eq('id', uid)
    .maybeSingle()

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    auth: {
      id: uid,
      email: authData.user.email || null,
      created_at: authData.user.created_at || null,
    },
    profile: profileError ? { error: profileError.message } : profile,
    notes: [
      'Cloud-Daten: Profilzeile aus public.profiles (game_data kann groß sein).',
      'Vollständiger DSAR-Umfang (Krankenhaus, Chat, etc.) kann später ergänzt werden.',
    ],
  }, { headers: CORS_HEADERS })
})
