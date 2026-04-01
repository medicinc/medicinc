import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createHospitalMembership, listPublicHospitals } from '../services/hospitalService'
import { upsertProfileGameData, userToGameData } from '../services/supabaseProfileRepository'
import {
  Building2, Plus, Users, Search, Star, MapPin, ChevronRight,
  Crown, Shield, Heart, Bed, ArrowRight, Flag
} from 'lucide-react'
import { submitModerationReport } from '../services/moderationService'

export default function HospitalChoice() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportInfo, setReportInfo] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadHospitals() {
      setLoading(true)
      const { data, error: loadError } = await listPublicHospitals()
      if (!mounted) return
      if (loadError) {
        setError(loadError.message || 'Krankenhäuser konnten nicht geladen werden.')
        setLoading(false)
        return
      }
      const mapped = (data || []).map(h => ({
        id: h.id,
        name: h.name,
        owner: h.state?.members?.find(m => m.userId === h.owner_id)?.name
          || (h.owner_id ? 'Leitung' : 'Staat'),
        members: h.state?.members?.length || 0,
        maxMembers: h.max_members || h.state?.settings?.maxMembers || 20,
        level: h.state?.settings?.level || 1,
        reputation: h.state?.settings?.reputation || 0,
        city: h.city || h.state?.settings?.city || '—',
        specialty: h.specialty || h.state?.settings?.specialty || 'Allgemeinmedizin',
        open: h.is_public !== false,
      }))
      setHospitals(mapped)
      setLoading(false)
    }
    loadHospitals()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => hospitals.filter(h =>
    h.open && (h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase()))
  ), [hospitals, search])

  const joinHospital = async (hospital) => {
    if (!user) return
    setError('')
    const { error: joinError } = await createHospitalMembership(hospital.id, user)
    if (joinError) {
      setError(joinError.message || 'Beitritt zum Krankenhaus fehlgeschlagen.')
      return
    }
    const nextUser = await updateUser({
      hospitalId: hospital.id,
      hospitalName: hospital.name,
    })
    if (nextUser?.id) {
      const { error: profileError } = await upsertProfileGameData(
        nextUser.id,
        nextUser.email,
        userToGameData(nextUser)
      )
      if (profileError) {
        setError(profileError.message || 'Krankenhaus-Beitritt konnte nicht im Profil gespeichert werden.')
        return
      }
    }
    navigate('/hospital')
  }

  const reportHospital = (hospital, reason = 'Unangemessener Name/Inhalt') => {
    void submitModerationReport({
      targetType: 'hospital',
      targetId: hospital.id,
      targetLabel: hospital.name,
      reason,
      reporterId: user?.id || null,
    })
    setReportInfo(`Meldung zu "${hospital.name}" gespeichert.`)
    setTimeout(() => setReportInfo(''), 2600)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">Krankenhaus wählen</h1>
        <p className="text-surface-500 text-lg max-w-xl mx-auto">
          Tritt einem bestehenden Krankenhaus bei oder gründe dein eigenes. 
          Du kannst später jederzeit wechseln oder weitere Krankenhäuser beitreten.
        </p>
      </div>

      {/* Eigenes gründen */}
      <Link
        to="/hospital-create"
        className="card p-6 mb-8 flex items-center gap-5 group border-2 border-dashed border-primary-300 bg-primary-50/50 hover:bg-primary-50 hover:border-primary-400 transition-all"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
          <Plus className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-surface-900 mb-1">Eigenes Krankenhaus gründen</h2>
          <p className="text-surface-500">
            Baue dein Krankenhaus von Grund auf. Wähle Name, Standort, Fachrichtung, Ausstattung und vieles mehr. 
            Du bist der/die Chefarzt/-ärztin!
          </p>
        </div>
        <ArrowRight className="w-6 h-6 text-primary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* Oder beitreten */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-surface-200" />
        <span className="text-sm font-medium text-surface-400 uppercase tracking-wider">oder einem beitreten</span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field !pl-11"
          placeholder="Krankenhaus nach Name oder Stadt suchen..."
        />
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}
      {reportInfo && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">{reportInfo}</div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12 text-surface-500">Lade Krankenhäuser...</div>
        )}
        {filtered.map(hospital => (
          <div key={hospital.id} className="card p-5 flex items-center gap-4 hover:border-primary-200 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-surface-900 truncate">{hospital.name}</h3>
                {hospital.level >= 7 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
                <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> {hospital.owner}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hospital.city}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {hospital.members}/{hospital.maxMembers}</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {hospital.reputation}</span>
              </div>
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">{hospital.specialty}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => reportHospital(hospital)}
                className="btn-secondary text-sm"
                title="Inhalt melden"
              >
                <Flag className="w-4 h-4" />
              </button>
              <button
                onClick={() => joinHospital(hospital)}
                className="btn-primary text-sm"
              >
                Beitreten
              </button>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500">Keine offenen Krankenhäuser gefunden</p>
          </div>
        )}
      </div>
    </div>
  )
}
