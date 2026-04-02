import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'
import { Activity, KeyRound, ArrowRight } from 'lucide-react'
import { requestAlphaRegistrationGate, setAlphaRegistrationToken } from '../services/alphaRegistrationService'

export default function RegisterGate() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const value = String(code || '').trim()
    if (!value) {
      setError('Bitte den Einladungs-Code eingeben.')
      return
    }
    setLoading(true)
    const res = await requestAlphaRegistrationGate(value)
    setLoading(false)
    if (!res?.ok || !res?.data?.accessToken) {
      setError(res?.message || 'Code ungültig. Bitte prüfe den Alpha-Zugangscode aus deiner Einladung.')
      return
    }
    setAlphaRegistrationToken(res.data.accessToken)
    navigate('/register')
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <Seo
        title="Alpha-Registrierung | Medic Inc"
        description="Einladungscode eingeben und Konto für die Medic-Inc-Alpha-Phase erstellen."
      />
      <div className="w-full max-w-md card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Medic Inc</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Alpha-Registrierung</h1>
        <p className="text-surface-500 text-sm mb-6">
          Gib den Einladungs-Code aus deiner Wartelisten-E-Mail ein. Der Code wird serverseitig geprüft; anschließend erhältst du ein kurz gültiges Token für die Registrierung.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Einladungs-Code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                className="input-field !pl-10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="alpha_waitlist_..."
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Prüfe Code…' : 'Weiter zur Registrierung'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-500">
          Schon registriert?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Zum Login</Link>
        </p>
      </div>
    </div>
  )
}
