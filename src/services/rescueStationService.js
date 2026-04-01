import { RESCUE_STATIONS } from '../data/rescueStations'
import { getSupabaseClient, isUuid } from '../lib/supabaseClient'

const STORAGE_KEY = 'medisim_rescue_stations_custom'

function readCustomStations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (_err) {
    return []
  }
}

function writeCustomStations(stations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stations))
}

export async function listRescueStations() {
  const sb = getSupabaseClient()
  if (sb) {
    const { data, error } = await sb
      .from('rescue_stations')
      .select('id, name, city, district, vehicles, created_by, created_by_name, created_at')
      .order('created_at', { ascending: false })
    if (error) return { data: null, error }
    const remote = (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      district: s.district,
      vehicles: Array.isArray(s.vehicles) ? s.vehicles : ['RTW'],
      createdBy: s.created_by || null,
      createdByName: s.created_by_name || 'Unbekannt',
      createdAt: s.created_at,
    }))
    return { data: [...RESCUE_STATIONS, ...remote], error: null }
  }
  const custom = readCustomStations()
  return { data: [...RESCUE_STATIONS, ...custom], error: null }
}

export async function createRescueStation(payload = {}, user = null) {
  const now = new Date().toISOString()
  const station = {
    id: `rw_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name || 'Neue Rettungswache',
    city: payload.city || 'MediCity',
    district: payload.district || 'Bezirk',
    vehicles: Array.isArray(payload.vehicles) && payload.vehicles.length > 0 ? payload.vehicles : ['RTW'],
    createdBy: user?.id || null,
    createdByName: user?.name || 'Unbekannt',
    createdAt: now,
  }
  const sb = getSupabaseClient()
  if (sb) {
    const createdBy = isUuid(user?.id) ? user.id : null
    if (!createdBy) return { data: null, error: new Error('Nur angemeldete Nutzer können Wachen erstellen.') }
    const { error } = await sb.from('rescue_stations').insert({
      id: station.id,
      name: station.name,
      city: station.city,
      district: station.district,
      vehicles: station.vehicles,
      created_by: createdBy,
      created_by_name: station.createdByName,
      created_at: station.createdAt,
    })
    if (error) return { data: null, error }
    return { data: station, error: null }
  }
  const custom = readCustomStations()
  custom.push(station)
  writeCustomStations(custom)
  return { data: station, error: null }
}

export function subscribeRescueStations(onChange) {
  const sb = getSupabaseClient()
  if (!sb || typeof onChange !== 'function') return () => {}
  const channel = sb
    .channel('rescue_stations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_stations' }, () => {
      onChange()
    })
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
