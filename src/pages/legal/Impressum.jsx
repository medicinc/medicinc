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
        <p className="text-xs text-surface-500">Stand: 08.04.2026</p>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Angaben gemäß § 5 TMG</p>
          <p>Betreiber: Jonas Klein (nicht gewerbliches Freizeitprojekt)</p>
          <p>Vertretungsberechtigt: Jonas Klein</p>
          <p>Anschrift: Triftweg 35, 38350 Helmstedt, Deutschland</p>
          <p>Kontakt: medicincde [at] gmail [dot] com</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Register / Steuer</p>
          <p>Handelsregister: nicht eingetragen (nicht gewerbliches Projekt)</p>
          <p>USt-IdNr.: nicht vorhanden</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Haftungsausschluss</p>
          <p>
            Diese Anwendung ist eine medizinische Simulation für Lern- und Testzwecke. Keine reale medizinische
            Beratung, kein Ersatz für professionelle Behandlung oder Diagnostik.
          </p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Online-Streitbeilegung / Verbraucherschlichtung</p>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p>
            Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen, soweit eine solche Teilnahmepflicht für uns nicht gesetzlich
            besteht.
          </p>
        </section>
      </div>
    </div>
  )
}
