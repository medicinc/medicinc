import { Link } from 'react-router-dom'
import { Activity, Home } from 'lucide-react'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Seo title="Seite nicht gefunden | Medic Inc" description="Die angeforderte Seite existiert nicht." noindex />
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 text-surface-500 text-2xl font-bold mb-6">
        404
      </div>
      <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Seite nicht gefunden</h1>
      <p className="text-surface-600 text-sm mb-8">
        Diese URL gibt es bei Medic Inc nicht. Prüfe die Adresse oder kehre zur Startseite zurück.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/" className="btn-primary inline-flex items-center justify-center gap-2">
          <Home className="w-4 h-4" />
          Zur Startseite
        </Link>
        <Link to="/login" className="btn-secondary inline-flex items-center justify-center gap-2">
          <Activity className="w-4 h-4" />
          Zum Login
        </Link>
      </div>
    </div>
  )
}
