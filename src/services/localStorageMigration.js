import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient'
import { userToGameData, upsertProfileGameData } from './supabaseProfileRepository'

const MIGRATION_FLAG = 'medisim_supabase_migrated_v1'

export function hasCompletedLocalMigration() {
  return localStorage.getItem(MIGRATION_FLAG) === '1'
}

function safeParseJson(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_e) {
    return null
  }
}

/**
 * One-time: push existing local profile into profiles.game_data after first Supabase login.
 */
export async function migrateLocalProfileToSupabaseIfNeeded(sessionUser) {
  if (!isSupabaseConfigured() || !sessionUser?.id) return { done: false, reason: 'skip' }
  if (hasCompletedLocalMigration()) return { done: false, reason: 'already' }

  const sb = getSupabaseClient()
  if (!sb) return { done: false, reason: 'no_client' }

  const email = String(sessionUser.email || '').toLowerCase()
  const byEmail = safeParseJson(localStorage.getItem(`medisim_user_${sessionUser.email}`))
  const current = safeParseJson(localStorage.getItem('medisim_user')) || byEmail
  if (!current || typeof current !== 'object') {
    localStorage.setItem(MIGRATION_FLAG, '1')
    return { done: false, reason: 'no_local_profile' }
  }

  const { data: row } = await sb.from('profiles').select('game_data').eq('id', sessionUser.id).maybeSingle()
  const remoteEmpty = !row?.game_data || (typeof row.game_data === 'object' && Object.keys(row.game_data).length === 0)
  if (!remoteEmpty) {
    localStorage.setItem(MIGRATION_FLAG, '1')
    return { done: false, reason: 'remote_nonempty' }
  }

  const merged = {
    ...current,
    id: sessionUser.id,
    email: sessionUser.email || current.email,
  }
  const gameData = userToGameData(merged)
  const { error } = await upsertProfileGameData(sessionUser.id, sessionUser.email, gameData)
  if (error) return { done: false, reason: 'error', error }

  localStorage.setItem(MIGRATION_FLAG, '1')
  return { done: true }
}
