import { getSupabaseClient } from '../lib/supabaseClient'

export async function fetchHospitalChatMessages(hospitalId, limit = 80) {
  const sb = getSupabaseClient()
  if (!sb || !hospitalId) return { data: [], error: null }
  return sb
    .from('hospital_chat_messages')
    .select('id, hospital_id, user_id, body, metadata, created_at')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: true })
    .limit(limit)
}

export async function sendHospitalChatMessage(hospitalId, userId, body, metadata = {}) {
  const sb = getSupabaseClient()
  if (!sb || !hospitalId || !userId) {
    return { data: null, error: new Error('Chat nicht verfügbar.') }
  }
  return sb.from('hospital_chat_messages').insert({
    hospital_id: hospitalId,
    user_id: userId,
    body: String(body || '').slice(0, 4000),
    metadata,
  }).select().maybeSingle()
}

export function subscribeHospitalChatMessages(hospitalId, onInsert) {
  const sb = getSupabaseClient()
  if (!sb || !hospitalId || typeof onInsert !== 'function') return () => {}

  const channel = sb
    .channel(`hospital_chat:${hospitalId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hospital_chat_messages',
        filter: `hospital_id=eq.${hospitalId}`,
      },
      (payload) => {
        onInsert(payload.new)
      }
    )
    .subscribe()

  return () => {
    sb.removeChannel(channel)
  }
}
