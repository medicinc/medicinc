import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'
import { Activity, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getSupabaseClient } from '../lib/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const sb = getSupabaseClient()
  const [phase, setPhase] = useState('loading')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sb) return
    let cancelled = false
    let settled = false

    const markForm = () => {
      if (cancelled || settled) return
      settled = true
      setPhase('form')
    }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markForm()
    })

    const hash = typeof window !== 'undefined' ? (window.location.hash || '') : ''
    if (hash.includes('type=recovery')) markForm()

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) markForm()
    }).catch(() => {})

    const t = window.setTimeout(() => {
      if (!cancelled && !settled) setPhase('invalid')
    }, 8000)

    return () => {
      cancelled = true
      window.clearTimeout(t)
      subscription.unsubscribe()
    }
  }, [sb])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Passwort mindestens 8 Zeichen.')
      return
    }
    if (password !== password2) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (!sb) return
    setLoading(true)
    try {
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      setPhase('done')
      await sb.auth.signOut()
      setTimeout(() => navigate('/login', { replace: true, state: { passwordReset: true } }), 2200)
    } catch (err) {
      setError(err?.message || 'Passwort konnte nicht gesetzt werden.')
    } finally {
      setLoading(false)
    }
  }

  if (!sb) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <Seo title="Passwort zurücksetzen | Medic Inc" description="Neues Passwort für Medic Inc setzen." noindex />
        <div className="w-full max-w-md card p-8 text-center">
          <p className="text-surface-600 text-sm mb-4">Passwort-Reset steht derzeit nicht zur Verfuegung.</p>
          <Link to="/login" className="btn-primary inline-flex">Zum Login</Link>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <Seo title="Passwort-Link wird geprüft | Medic Inc" noindex />
        <div className="w-full max-w-md card p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <h1 className="font-display text-xl font-bold text-surface-900">Link wird geprüft…</h1>
          <p className="text-sm text-surface-600">Einen Moment bitte.</p>
        </div>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <Seo title="Passwort-Link ungültig | Medic Inc" noindex />
        <div className="w-full max-w-md card p-8 text-center space-y-3">
          <Activity className="w-10 h-10 mx-auto text-amber-600" />
          <h1 className="font-display text-xl font-bold text-surface-900">Link ungültig oder abgelaufen</h1>
          <p className="text-sm text-surface-600">
            Bitte fordere auf der Login-Seite unter „Passwort vergessen?“ einen neuen Link an.
          </p>
          <Link to="/login" className="btn-primary inline-flex mt-2">Zum Login</Link>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <Seo title="Passwort geändert | Medic Inc" noindex />
        <div className="w-full max-w-md card p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
          <h1 className="font-display text-xl font-bold text-surface-900">Passwort aktualisiert</h1>
          <p className="text-sm text-surface-600">Du wirst gleich zum Login weitergeleitet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <Seo title="Neues Passwort setzen | Medic Inc" description="Neues Passwort für dein Medic-Inc-Konto wählen." noindex />
      <div className="w-full max-w-md card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Medic Inc</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Neues Passwort setzen</h1>
        <p className="text-surface-500 text-sm mb-6">Wähle ein neues Passwort für dein Konto.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Neues Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field !pl-10 !pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Passwort wiederholen</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field !pl-10"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Wird gespeichert…' : <>Passwort speichern <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-500">
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Zum Login</Link>
        </p>
      </div>
    </div>
  )
}
