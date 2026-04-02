import Seo from '../../components/Seo'

export default function WiderrufDigital() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Seo
        title="Widerruf digitale Inhalte | Medic Inc"
        description="Hinweise zum Widerrufsrecht bei digitalen Inhalten bei Medic Inc."
      />
      <div className="card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-surface-900">Widerruf für digitale Inhalte</h1>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Platzhaltertext. Vor produktiver Zahlungsfreischaltung mit Rechtsberatung finalisieren.
        </p>
        <p className="text-sm text-surface-700">
          Bei digitalen Inhalten kann das Widerrufsrecht erlöschen, wenn die Ausführung sofort beginnt und du dem vorab ausdrücklich zustimmst.
        </p>
        <p className="text-sm text-surface-700">
          Vor jedem echten Kauf werden Endpreis, Leistungsumfang, Vertragsinformationen und Widerrufshinweise transparent angezeigt.
        </p>
      </div>
    </div>
  )
}
