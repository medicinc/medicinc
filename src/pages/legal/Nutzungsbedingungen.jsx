import Seo from '../../components/Seo'

export default function Nutzungsbedingungen() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Seo
        title="Nutzungsbedingungen | Medic Inc"
        description="Nutzungsbedingungen der Medic-Inc-Simulationsplattform (Alpha, Lern- und Trainingsbetrieb)."
      />
      <div className="card p-6 sm:p-8 space-y-4 text-sm text-surface-700">
        <h1 className="font-display text-3xl font-bold text-surface-900">Nutzungsbedingungen</h1>
        <p>Stand: 07.04.2026</p>
        <p>
          Medic Inc ist eine Lern- und Simulationsplattform. Inhalte dienen ausschließlich der Simulation und ersetzen keine
          medizinische, rechtliche oder sonstige professionelle Beratung.
        </p>
        <h2 className="font-semibold text-surface-900">1. Nutzung und Zugang</h2>
        <p>
          Die Alpha kann zugangsbeschränkt betrieben werden. Ein Wartelisten-Eintrag begründet keinen Anspruch auf Freischaltung.
          Zugangsdaten sind vertraulich zu behandeln.
        </p>
        <h2 className="font-semibold text-surface-900">2. Simulationscharakter</h2>
        <p>
          Alle Fälle, Daten und Dialoge sind simulativ. Kein Echtbetrieb, kein Medizinprodukt, keine Handlungsanweisung für reale
          Patientensituationen.
        </p>
        <h2 className="font-semibold text-surface-900">3. AI-Simulationsdialoge</h2>
        <p>
          Für Chat-/Dialogfunktionen können AI-Dienste eingesetzt werden. Es werden minimierte Simulationsdaten verarbeitet.
          AI-Ausgaben können fehlerhaft sein.
        </p>
        <h2 className="font-semibold text-surface-900">4. Nutzerverhalten</h2>
        <p>
          Unzulässig sind insbesondere Missbrauch, Angriffe auf die Plattform, Umgehung von Zugriffsbeschränkungen und die Eingabe
          echter personenbezogener Patientendaten.
        </p>
        <h2 className="font-semibold text-surface-900">5. Virtuelle Inhalte</h2>
        <p>
          Virtuelle Güter, Spielwährung und Fortschritt sind kontogebundene Nutzungsrechte ohne Anspruch auf Barauszahlung.
        </p>
        <h2 className="font-semibold text-surface-900">6. Änderungen und Verfügbarkeit</h2>
        <p>
          Funktionen, Balancing, Inhalte und Verfügbarkeit können jederzeit angepasst oder vorübergehend eingeschränkt werden.
        </p>
        <h2 className="font-semibold text-surface-900">7. Kontakt</h2>
        <p>
          Betreiber- und Kontaktangaben siehe Impressum. Kontakt: medicincde [at] gmail [dot] com.
        </p>
      </div>
    </div>
  )
}
