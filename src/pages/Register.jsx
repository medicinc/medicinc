import { Link } from 'react-router-dom'
import { Activity, ArrowRight, ShieldAlert } from 'lucide-react'

export default function Register() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <div className="w-full max-w-xl card p-8 border-amber-200 bg-amber-50/70">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">Medic Inc</span>
        </div>
        <div className="rounded-xl border border-amber-300 bg-white p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Registrierung deaktiviert
          </p>
          <p className="text-sm text-amber-700 mt-2">
            Neue Accounts sind aktuell gesperrt. Zugriff ist nur mit freigegebenen Admin-Logins möglich.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="btn-primary">
            Zum Login <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/" className="btn-secondary">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
