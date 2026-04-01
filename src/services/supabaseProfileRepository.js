import { getSupabaseClient } from '../lib/supabaseClient'
import { getCurrentRank } from '../data/ranks'
import { createFreshUser } from './profileService'

export function userToGameData(user) {
  if (!user || typeof user !== 'object') return {}
  const { authPassword, authLocked, ...rest } = user
  return rest
}

export function mergeGameDataIntoUser(sessionUser, gameData) {
  const id = sessionUser?.id
  const email = sessionUser?.email || ''
  const base = createFreshUser(
    gameData?.name || sessionUser?.user_metadata?.display_name || 'Spieler',
    email,
    id
  )
  const merged = {
    ...base,
    ...gameData,
    id,
    email,
  }
  const rank = getCurrentRank(merged)
  merged.rank = rank.id
  merged.title = rank.name
  return merged
}

export async function fetchProfileRow(userId) {
  const sb = getSupabaseClient()
  if (!sb || !userId) return { data: null, error: null }
  return sb.from('profiles').select('*').eq('id', userId).maybeSingle()
}

export async function upsertProfileGameData(userId, email, gameData) {
  const sb = getSupabaseClient()
  if (!sb || !userId) return { error: new Error('Supabase nicht konfiguriert.') }
  const { data: row } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle()
  const payload = {
    email: email || null,
    game_data: gameData,
    updated_at: new Date().toISOString(),
  }
  if (row) {
    const { error } = await sb.from('profiles').update(payload).eq('id', userId)
    return { error }
  }
  const username = `u_${String(userId).replace(/-/g, '').slice(0, 12)}`
  const { error } = await sb.from('profiles').insert({
    id: userId,
    email: email || null,
    username,
    game_data: gameData,
    updated_at: new Date().toISOString(),
  })
  return { error }
}

export async function buildUserFromSession(session) {
  const sb = getSupabaseClient()
  if (!sb || !session?.user) return null
  const { data: row } = await sb.from('profiles').select('game_data').eq('id', session.user.id).maybeSingle()
  const gameData = row?.game_data
  return mergeGameDataIntoUser(session.user, gameData && typeof gameData === 'object' ? gameData : {})
}
