import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'
import { Activity, ArrowRight, Mail, Lock, User } from 'lucide-react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { hasAllRequiredRegistrationConsents } from '../services/consentService'
import { clearAlphaRegistrationToken, getAlphaRegistrationToken } from '../services/alphaRegistrationService'

export default function Register() {
  const sb = getSupabaseClient()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consents, setConsents] = useState({
    tosAccepted: false,
    privacyAccepted: false,
    aiChatAccepted: false,
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getAlphaRegistrationToken()) navigate('/register-gate', { replace: true })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!sb) {
      setError('Registrierung ist derzeit nicht verfuegbar.')
      return
    }
    if (!hasAllRequiredRegistrationConsents(consents)) {
      setError('Bitte allen Pflichtzustimmungen zustimmen (Nutzungsbedingungen, Datenschutz, AI-Hinweise).')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password, consents, getAlphaRegistrationToken())
      clearAlphaRegistrationToken()
      setInfo('Wenn E-Mail-Bestätigung aktiv ist: bitte Postfach prüfen. Danach kannst du dich einloggen.')
      setTimeout(() => navigate('/login'), 2400)
    } catch (err) {
      setError(err?.message || 'Registrierung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  if (!sb) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <Seo title="Registrierung | Medic Inc" description="Konto fuer Medic Inc erstellen." />
        <div className="w-full max-w-xl card p-8 border-amber-200 bg-amber-50/70">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">Medic Inc</span>
          </div>
          <p className="text-sm text-amber-800 mb-4">Die Registrierung ist derzeit nicht verfuegbar.</p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Zum Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <Seo title="Registrierung | Medic Inc" description="Konto fuer Medic Inc erstellen." />
      <div className="w-full max-w-md card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Medic Inc</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Konto erstellen</h1>
        <p className="text-surface-500 text-sm mb-6">Erstelle dein Konto fuer den Zugang zur Alpha.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{info}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                className="input-field !pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Dein Name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="email"
                className="input-field !pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="password"
                className="input-field !pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Wird registriert…' : 'Registrieren'}
          </button>
          <label className="flex items-start gap-2 text-xs text-surface-600">
            <input
              type="checkbox"
              checked={consents.tosAccepted}
              onChange={(e) => setConsents((prev) => ({ ...prev, tosAccepted: e.target.checked }))}
              className="mt-0.5"
            />
            <span>Ich akzeptiere die <Link to="/nutzungsbedingungen" target="_blank" rel="noreferrer" className="underline">Nutzungsbedingungen</Link>. (Pflicht)</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-surface-600">
            <input
              type="checkbox"
              checked={consents.privacyAccepted}
              onChange={(e) => setConsents((prev) => ({ ...prev, privacyAccepted: e.target.checked }))}
              className="mt-0.5"
            />
            <span>Ich habe die <Link to="/datenschutz" target="_blank" rel="noreferrer" className="underline">Datenschutzhinweise</Link> gelesen. (Pflicht)</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-surface-600">
            <input
              type="checkbox"
              checked={consents.aiChatAccepted}
              onChange={(e) => setConsents((prev) => ({ ...prev, aiChatAccepted: e.target.checked }))}
              className="mt-0.5"
            />
            <span>Ich stimme der Nutzung von AI-Simulationsdialogen gemäß <Link to="/ai-hinweise" target="_blank" rel="noreferrer" className="underline">AI-Hinweisen</Link> zu. (Pflicht)</span>
          </label>
        </form>

        <p className="mt-6 text-center text-sm text-surface-500">
          Schon ein Konto?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Zum Login</Link>
        </p>
      </div>
    </div>
  )
}
