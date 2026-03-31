import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createRescueStation } from '../services/rescueStationService'
import { Ambulance, ArrowLeft, ArrowRight, Check } from 'lucide-react'

export default function RescueStationCreate() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [name, setName] = useState('')
  const [city, setCity] = useState('MediCity')
  const [district, setDistrict] = useState('Nord')
  const [vehicles, setVehicles] = useState(['RTW'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleVehicle = (v) => {
    setVehicles((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const create = async () => {
    if (!name.trim() || vehicles.length === 0) return
    setSaving(true)
    setError('')
    const { data, error: createError } = await createRescueStation({ name, city, district, vehicles }, user)
    if (createError || !data) {
      setSaving(false)
      setError(createError?.message || 'Wache konnte nicht erstellt werden.')
      return
    }
    await updateUser({
      rescueStationId: data.id,
      rescueStationName: data.name,
    })
    navigate('/dashboard')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/rescue-station-choice')} className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Wachen-Auswahl
      </button>
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Ambulance className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-surface-900">Eigene Rettungswache erstellen</h1>
            <p className="text-sm text-surface-500">Lege Name, Standort und verfügbare Fahrzeuge fest.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Wachenname</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="z. B. Rettungswache Innenstadt" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Stadt</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Bezirk</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Fahrzeugpool</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['RTW', 'NEF', 'KTW', 'RTH'].map((v) => (
                <button
                  key={v}
                  onClick={() => toggleVehicle(v)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${vehicles.includes(v) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-700'}`}
                >
                  {vehicles.includes(v) ? <Check className="inline w-3.5 h-3.5 mr-1" /> : null}
                  {v}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <button onClick={create} disabled={saving || !name.trim() || vehicles.length === 0} className="btn-primary w-full disabled:opacity-60">
            Wache erstellen und auswählen <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
