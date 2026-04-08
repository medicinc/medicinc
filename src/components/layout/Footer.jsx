import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/brand/medic-inc-mark.svg"
              alt=""
              width={36}
              height={36}
              className="w-9 h-9 shrink-0 rounded-xl"
            />
            <span className="font-display font-bold text-xl text-white">Medic Inc</span>
          </Link>
          <p className="text-xs text-surface-400 max-w-2xl text-center sm:text-right">
            Work in Progress / Demo. Alle Inhalte dienen ausschließlich Demonstrations-, Test- und Lernzwecken.
            Kein Medizinprodukt, keine medizinische Beratung und nicht für den klinischen Echtbetrieb bestimmt.
          </p>
        </div>

        <div className="border-t border-surface-800 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} Medic Inc. Alle Rechte vorbehalten.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-surface-400">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link to="/nutzungsbedingungen" className="hover:text-white transition-colors">Nutzungsbedingungen</Link>
            <Link to="/widerruf-digital" className="hover:text-white transition-colors">Widerruf</Link>
            <Link to="/ai-hinweise" className="hover:text-white transition-colors">AI-Hinweise</Link>
            <Link to="/jugendschutz" className="hover:text-white transition-colors">Jugendschutz (16+)</Link>
            <Link to="/community-regeln" className="hover:text-white transition-colors">Community-Regeln</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
