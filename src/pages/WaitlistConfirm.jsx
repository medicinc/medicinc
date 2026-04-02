import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { confirmWaitlistEntry } from '../services/waitlistService'

export default function WaitlistConfirm() {
  const [params] = useSearchParams()
  const email = useMemo(() => String(params.get('email') || '').trim(), [params])
  const token = useMemo(() => String(params.get('token') || '').trim(), [params])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Bestätigung wird geprüft…')

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!email || !token) {
        if (!active) return
        setStatus('error')
        setMessage('Der Bestätigungslink ist unvollständig.')
        return
      }
      const result = await confirmWaitlistEntry({ email, token })
      if (!active) return
      if (result?.ok) {
        setStatus('success')
        setMessage('Deine E-Mail wurde erfolgreich bestätigt. Du stehst jetzt auf der Alpha-Warteliste.')
      } else {
        setStatus('error')
        setMessage(result?.message || 'Bestätigung fehlgeschlagen. Bitte trage dich erneut ein.')
      }
    })()
    return () => { active = false }
  }, [email, token])

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Seo
        title="Alpha-Warteliste – E-Mail bestätigen | Medic Inc"
        description="Bestätigung der E-Mail für die Medic-Inc-Alpha-Warteliste."
        noindex
      />
      <div className="card p-7 text-center space-y-3">
        {status === 'loading' && <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-600" />}
        {status === 'success' && <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />}
        {status === 'error' && <XCircle className="w-8 h-8 mx-auto text-red-600" />}
        <h1 className="font-display text-2xl font-bold text-surface-900">Alpha-Warteliste</h1>
        <p className="text-sm text-surface-600">{message}</p>
        <div className="pt-2">
          <Link to="/" className="btn-primary inline-flex">Zur Startseite</Link>
        </div>
      </div>
    </div>
  )
}
