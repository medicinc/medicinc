import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listRescueStations, subscribeRescueStations } from '../services/rescueStationService'
import { Ambulance, MapPin, ArrowRight, CheckCircle2, Plus } from 'lucide-react'

export default function RescueStationChoice() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [stationId, setStationId] = useState(user?.rescueStationId || null)

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      const { data } = await listRescueStations()
      if (!mounted) return
      const rows = data || []
      setStations(rows)
      if (!stationId && rows[0]?.id) setStationId(rows[0].id)
    }
    refresh()
    const unsub = subscribeRescueStations(refresh)
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  const selected = useMemo(
    () => stations.find((s) => s.id === stationId) || null,
    [stations, stationId],
  )

  const confirm = () => {
    if (!selected) return
    updateUser({
      rescueStationId: selected.id,
      rescueStationName: selected.name,
    })
    navigate('/dashboard')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">Wache wählen</h1>
        <p className="text-surface-500">
          Wähle deine Rettungswache. Du kannst später wechseln.
        </p>
      </div>

      <Link to="/rescue-station-create" className="card p-4 mb-5 flex items-center gap-3 border-dashed border-primary-300 bg-primary-50/50 hover:bg-primary-50">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-surface-900">Eigene Rettungswache erstellen</p>
          <p className="text-sm text-surface-500">Analog zur Krankenhaus-Gründung eine eigene Wache anlegen.</p>
        </div>
      </Link>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {stations.map((station) => {
          const active = station.id === stationId
          return (
            <button
              key={station.id}
              onClick={() => setStationId(station.id)}
              className={`card p-5 text-left transition-all ${
                active ? 'border-primary-400 ring-2 ring-primary-100' : 'hover:border-surface-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Ambulance className="w-5 h-5" />
                </div>
                {active && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
              </div>
              <h2 className="font-semibold text-surface-900 mb-1">{station.name}</h2>
              <p className="text-sm text-surface-500 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {station.city}, {station.district}
              </p>
              <p className="text-xs text-surface-500">{station.vehicles.join(' • ')}</p>
            </button>
          )
        })}
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-surface-500">Ausgewählte Wache</p>
          <p className="font-semibold text-surface-900">{selected?.name || '—'}</p>
        </div>
        <button onClick={confirm} className="btn-primary" disabled={!selected}>
          Weiter <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
