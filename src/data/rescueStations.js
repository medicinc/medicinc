export const RESCUE_STATIONS = [
  { id: 'wache_nord', name: 'Rettungswache Nord', city: 'MediCity', district: 'Nord', vehicles: ['RTW', 'KTW'] },
  { id: 'wache_sued', name: 'Rettungswache Süd', city: 'MediCity', district: 'Süd', vehicles: ['RTW', 'NEF'] },
  { id: 'wache_west', name: 'Rettungswache West', city: 'MediCity', district: 'West', vehicles: ['RTW', 'KTW', 'RTH'] },
]

function getCustomStations() {
  try {
    const raw = localStorage.getItem('medisim_rescue_stations_custom')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (_err) {
    return []
  }
}

export function getRescueStationById(id) {
  return [...RESCUE_STATIONS, ...getCustomStations()].find((s) => s.id === id) || null
}
