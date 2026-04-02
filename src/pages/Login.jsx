import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { getSupabaseClient } from '../lib/supabaseClient'
import { requestPasswordReset } from '../services/authPasswordService'
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight, X } from 'lucide-react'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotInfo, setForgotInfo] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const passwordResetDone = location.state?.passwordReset === true

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await new Promise(r => setTimeout(r, 300))
      const u = await login(identifier, password)
      if (!u.onboardingComplete) navigate('/onboarding')
      else if (!u.hospitalId) navigate('/hospital-choice')
      else navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Ungültige Anmeldedaten. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotInfo('')
    setForgotLoading(true)
    const res = await requestPasswordReset(forgotEmail)
    setForgotLoading(false)
    if (!res?.ok) {
      setForgotError(res?.message || 'Anfrage fehlgeschlagen.')
      return
    }
    setForgotInfo('Wenn diese E-Mail bei uns existiert, erhältst du gleich einen Link zum Zurücksetzen.')
    setForgotEmail('')
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <Seo
        title="Login | Medic Inc"
        description="Melde dich bei Medic Inc an – medizinische Simulation mit KI-Patientenchat, Krankenhaus und Rettungsdienst."
      />
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-4">Willkommen zurück</h2>
          <p className="text-primary-100 text-lg max-w-md">
            Deine Patient*innen warten. Setze deine medizinische Reise fort und verbessere deine klinischen Fähigkeiten.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">Medic Inc</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">In dein Konto einloggen</h1>
          <p className="text-surface-500 mb-8">
            {getSupabaseClient()
              ? 'Mit Supabase-Account (E-Mail/Passwort) oder Demo-Login.'
              : 'Zugriff nur mit freigegebenem Demo-Login (ohne Supabase).'}
          </p>

          {passwordResetDone && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
              Passwort wurde geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">E-Mail oder Benutzername</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input-field !pl-11"
                  placeholder="du@beispiel.de oder anna.mueller"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field !pl-11 !pr-11"
                  placeholder="Dein Passwort eingeben"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-surface-600">Angemeldet bleiben</span>
              </label>
              {getSupabaseClient() ? (
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true)
                    setForgotError('')
                    setForgotInfo('')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Passwort vergessen?
                </button>
              ) : (
                <span className="text-sm text-surface-400 cursor-default" title="Nur bei Supabase-Login verfügbar">
                  Passwort vergessen?
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Anmelden <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          {getSupabaseClient() && (
            <p className="mt-6 text-center text-sm text-surface-500">
              Noch kein Konto?{' '}
              <Link to="/register-gate" className="text-primary-600 font-medium hover:text-primary-700">Registrieren</Link>
            </p>
          )}
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setForgotOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-surface-900">Passwort zurücksetzen</h2>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-500"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-surface-600 mb-4">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Setzen eines neuen Passworts (nur Supabase-Konten).
            </p>
            {forgotError && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{forgotError}</div>
            )}
            {forgotInfo && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{forgotInfo}</div>
            )}
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  <input
                    type="email"
                    className="input-field !pl-10"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="du@beispiel.de"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForgotOpen(false)} className="btn-secondary flex-1">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={forgotLoading}>
                  {forgotLoading ? 'Senden…' : 'Link senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
