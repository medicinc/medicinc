export default function AiHinweise() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="card p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-surface-900">AI-Hinweise</h1>
        <p className="text-sm text-surface-700">
          AI-Dialoge in Medic Inc sind rein simulativ und können Fehler enthalten. Sie ersetzen keine professionelle medizinische oder rechtliche Beratung.
        </p>
        <p className="text-sm text-surface-700">
          Die Anwendung minimiert übermittelte Daten und nutzt serverseitige Proxy-Funktionen. Bitte keine echten Patientendaten eingeben.
        </p>
        <p className="text-sm text-surface-700">
          Marken und reale Organisationsnamen werden in dieser Simulation nicht als Zugehörigkeits- oder Partnerschaftsaussage verwendet.
        </p>
      </div>
    </div>
  )
}
