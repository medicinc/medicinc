import { RESCUE_STATIONS } from '../data/rescueStations'

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
  const custom = readCustomStations()
  custom.push(station)
  writeCustomStations(custom)
  return { data: station, error: null }
}
