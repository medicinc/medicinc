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
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Angaben gemäß DDG</p>
          <p>Betreiber: Jonas Klein (nicht-gewerbliches Freizeitprojekt)</p>
          <p>Vertretungsberechtigt: Jonas Klein</p>
          <p>Anschrift: Triftweg 35, 38350 Helmstedt, Deutschland</p>
          <p>Kontakt: medicincde [at] gmail [dot] com</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Register / Steuer</p>
          <p>Handelsregister: Nicht vorhanden (nicht-gewerbliches Projekt)</p>
          <p>USt-IdNr.: Nicht vorhanden</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Haftungsausschluss</p>
          <p>Diese Anwendung ist eine medizinische Simulation für Lern- und Testzwecke. Keine reale medizinische Beratung.</p>
        </section>
      </div>
    </div>
  )
}
