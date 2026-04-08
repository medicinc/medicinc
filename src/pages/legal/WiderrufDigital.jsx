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
        <p className="text-sm text-surface-500">Stand: 08.04.2026</p>
        <p className="text-sm text-surface-700">
          <strong>Aktueller Stand (Alpha):</strong> Es werden hier keine kostenpflichtigen digitalen Inhalte oder
          entgeltlichen Zusatzleistungen über diese Seite abgeschlossen; der virtuelle Shop ist in der Alpha-Phase
          deaktiviert. Ein gesetzliches Widerrufsrecht gegenüber kostenpflichtigen digitalen Verträgen wird daher
          derzeit typischerweise nicht ausgelöst.
        </p>
        <p className="text-sm text-surface-700">
          <strong>Spätere kostenpflichtige Angebote:</strong> Sollten entgeltliche digitale Inhalte eingeführt werden,
          erhältst du vor Abschluss die gesetzlich vorgeschriebenen Vertrags- und Widerrufsbelehrungen (u.&nbsp;a. nach
          den Vorgaben für Fernabsatzverträge). Bei digitalen Inhalten kann das Widerrufsrecht unter bestimmten
          Voraussetzungen erlöschen, wenn die Ausführung vor Ende der Widerrufsfrist beginnt und du dem ausdrücklich
          zugestimmt hast – die genaue Fassung wird dann im Bestellprozess angezeigt.
        </p>
        <p className="text-sm text-surface-700">
          Kontakt für Verbraucheranfragen: medicincde [at] gmail [dot] com
        </p>
        <p className="text-xs text-surface-500">
          Hinweis: Verbindliche Rechtstexte für Zahlungs- und Vertragsstart sollten vor Produktivstart mit
          Rechtsberatung final geprüft werden.
        </p>
      </div>
    </div>
  )
}
