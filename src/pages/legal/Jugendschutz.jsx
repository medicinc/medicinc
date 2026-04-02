import Seo from '../../components/Seo'

export default function Jugendschutz() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Seo
        title="Jugendschutz & Altersfreigabe | Medic Inc"
        description="Altershinweise und Jugendschutz für die medizinische Simulation Medic Inc (16+)."
      />
      <div className="card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-surface-900">Jugendschutz & Altersfreigabe</h1>
        <p className="text-sm text-surface-700">
          Zielausrichtung: ab 16 Jahren (vorläufige Selbsteinstufung für Simulationsbetrieb).
        </p>
        <p className="text-sm text-surface-700">
          Das Spiel enthält medizinische Notfallszenarien und belastende Themen. Es handelt sich nicht um reale Einsätze.
        </p>
        <p className="text-sm text-surface-700">
          Optional kann eine reduzierte Intensität für textliche Beschreibungen aktiviert werden.
        </p>
      </div>
    </div>
  )
}
