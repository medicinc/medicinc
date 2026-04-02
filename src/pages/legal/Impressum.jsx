import Seo from '../../components/Seo'

export default function Impressum() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Seo
        title="Impressum | Medic Inc"
        description="Impressum und Anbieterkennzeichnung für Medic Inc (medizinische Lernsimulation)."
      />
      <div className="card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-surface-900">Impressum</h1>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Platzhalterversion für Entwicklungs-/Testbetrieb. Vor Livegang mit echten Betreiberdaten ersetzen.
        </p>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Angaben gemäß DDG</p>
          <p>Betreiber: [Platzhalter Firma/Name]</p>
          <p>Vertretungsberechtigt: [Platzhalter]</p>
          <p>Anschrift: [Platzhalter Straße, PLZ Ort, Land]</p>
          <p>Kontakt: [Platzhalter E-Mail], [Platzhalter Telefon]</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Register / Steuer</p>
          <p>Handelsregister: [Platzhalter]</p>
          <p>USt-IdNr.: [Platzhalter]</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Haftungsausschluss</p>
          <p>Diese Anwendung ist eine medizinische Simulation für Lern- und Testzwecke. Keine reale medizinische Beratung.</p>
        </section>
      </div>
    </div>
  )
}
