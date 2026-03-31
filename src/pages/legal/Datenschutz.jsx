export default function Datenschutz() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="card p-6 sm:p-8 space-y-5">
        <h1 className="font-display text-3xl font-bold text-surface-900">Datenschutzerklärung</h1>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Platzhalter für den Livebetrieb. Rechtstext vor Launch durch Rechtsberatung und reale Kontaktdaten finalisieren.
        </p>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Verantwortliche Stelle</p>
          <p>[Platzhalter Firma/Name, Anschrift, Kontakt, Datenschutzkontakt]</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Verarbeitete Daten</p>
          <p>- Account-/Profildaten (Name, E-Mail, Spielstand)</p>
          <p>- Spielinteraktionen und optionale Moderationsmeldungen</p>
          <p>- Technische Daten (z. B. IP/Logdaten bei Hosting)</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">AI-Verarbeitung (Simulation)</p>
          <p>Für optionale AI-Dialoge werden simulative, minimierte Falldaten an einen AI-Dienst übermittelt (OpenAI via Supabase Edge Functions).</p>
          <p>Keine Nutzung für reale medizinische Entscheidungen. AI-Dialoge können inhaltliche Fehler enthalten.</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Empfänger / Auftragsverarbeitung</p>
          <p>- Hosting/Frontend: Vercel</p>
          <p>- Backend/DB/Funktionen: Supabase</p>
          <p>- AI-Verarbeitung: OpenAI (Drittlandbezug möglich)</p>
        </section>
        <section className="space-y-1 text-sm text-surface-700">
          <p className="font-semibold text-surface-900">Speicherdauer und Rechte</p>
          <p>Speicherung nur solange erforderlich. Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.</p>
          <p>DSAR-Funktionen (Export/Löschung) sind im Bereich Einstellungen verlinkt.</p>
        </section>
      </div>
    </div>
  )
}
