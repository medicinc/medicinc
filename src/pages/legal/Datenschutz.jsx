import Seo from '../../components/Seo'

export default function Datenschutz() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Seo
        title="Datenschutz | Medic Inc"
        description="Datenschutzerklärung für Medic Inc – Verarbeitung von Account-, Spiel- und Wartelisten-Daten."
      />
      <div className="card p-6 sm:p-8 space-y-6 text-sm text-surface-700">
        <h1 className="font-display text-3xl font-bold text-surface-900">Datenschutzerklärung</h1>
        <p>Stand: 08.04.2026</p>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Verantwortlicher</p>
          <p>Jonas Klein (Medic Inc, nicht gewerbliches Freizeitprojekt)</p>
          <p>Anschrift: Triftweg 35, 38350 Helmstedt, Deutschland</p>
          <p>
            Kontakt: medicincde [at] gmail [dot] com
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Allgemeines</p>
          <p>
            Wir verarbeiten personenbezogene Daten nur im Rahmen der Datenschutz-Grundverordnung (DSGVO), des
            Bundesdatenschutzgesetzes (BDSG) und – soweit für Endgerätespeicherung und ähnliche Technologien
            einschlägig – des Telekommunikation-Telemedien-Datenschutz-Gesetzes (TTDSG).
          </p>
        </section>

        <section id="speicherung-endgeraet" className="space-y-2 scroll-mt-24">
          <p className="font-semibold text-surface-900">Speicherung auf deinem Endgerät (Browser)</p>
          <p>
            Zur Verwaltung von Einwilligungen (Cookies und ähnliche Technologien) setzen wir die Lösung{' '}
            <strong>consentmanager.net</strong> ein (Skript wird beim Seitenaufruf geladen; Details siehe Anbieter
            consentmanager). Einstellungen kannst du dort bzw. über das Consent-Banner ändern.
          </p>
          <p>
            Für Login, Spielstand, Einstellungen und reine App-Funktionen können außerdem Informationen im Browser
            gespeichert werden (z.&nbsp;B. <strong>localStorage</strong> und <strong>sessionStorage</strong>). Das dient
            der Bereitstellung der von dir ausdrücklich gewünschten Funktionen (technisch notwendig im Sinne von
            §&nbsp;25 Abs.&nbsp;2 TTDSG, soweit nicht durch Einwilligung geregelt).
          </p>
          <p>
            Schriftarten werden <strong>selbst gehostet</strong> (bundled über npm-Pakete); es findet beim Seitenaufruf
            <strong> kein Abruf von Google Fonts-Servern</strong> statt.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Verarbeitete Daten (Auszug)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account-/Profildaten (z.&nbsp;B. Name, E-Mail, Spielstand), soweit du ein Konto nutzt</li>
            <li>Spielinteraktionen und optionale Moderationsmeldungen</li>
            <li>
              Wartelisten-Daten (Name, E-Mail, Einwilligungen, Double-Opt-In-Status, technische Metadaten wie
              Zeitstempel)
            </li>
            <li>Technische Daten bei Hosting und Backend (z.&nbsp;B. IP-Adressen und Logdaten in begrenztem Umfang)</li>
            <li>
              Inhalte, die du in KI-gestützte Simulationsdialoge eingibst, sowie zur Antwortgenerierung übermittelte
              minimierte Simulationsdaten
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Zwecke und Rechtsgrundlagen (Art.&nbsp;6 DSGVO)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Vertrag / vorvertraglich (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b):</strong> Nutzerkonto, Spielbetrieb,
              Warteliste nach Anmeldung
            </li>
            <li>
              <strong>Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a):</strong> soweit wir dich ausdrücklich
              einholen (z.&nbsp;B. Warteliste DOI, optionale Newsletter-Zustimmung, ggf. KI-Nutzung dort wo
              einwilligungsbasiert vorgesehen)
            </li>
            <li>
              <strong>Berechtigte Interessen (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f):</strong> IT-Sicherheit, Missbrauchs-
              und Fehleranalyse, Belegung von Rechtsansprüchen, begrenzte Protokollierung
            </li>
            <li>
              <strong>Rechtspflichten (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;c):</strong> soweit gesetzlich erforderlich
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Double-Opt-In (Warteliste)</p>
          <p>
            Für Wartelisten-Einträge kann eine Bestätigungs-E-Mail versendet werden. Erst nach Bestätigung (Linkklick)
            wird die Anmeldung wirksam verarbeitet, soweit DOI technisch umgesetzt ist.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">KI-Verarbeitung (Simulation)</p>
          <p>
            Für simulative Dialoge können Inhalte an einen KI-Dienst übermittelt werden (z.&nbsp;B. OpenAI über
            Supabase Edge Functions). Es kann ein <strong>Drittlandbezug</strong> (z.&nbsp;B. USA) bestehen; soweit
            erforderlich werden geeignete Garantien (z.&nbsp;B. EU-Standardvertragsklauseln) eingesetzt.
          </p>
          <p>
            Keine Nutzung für reale medizinische Entscheidungen. KI-Ausgaben können fehlerhaft sein – siehe auch die
            Seite „AI-Hinweise“.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Empfänger und Auftragsverarbeitung</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Cookie-Consent-Management (CMP): consentmanager (consentmanager AB / Einbindung über consentmanager.net;
              Anbieter- und Datenschutzhinweise unter{' '}
              <a
                href="https://www.consentmanager.net/de/datenschutz/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
              >
                consentmanager.net
              </a>
              ); Verarbeitung gemäß deren Angaben und deiner gewählten Einwilligungen
            </li>
            <li>Hosting/Frontend: Vercel (o.&nbsp;ä., je nach Deployment)</li>
            <li>Backend, Datenbank, Auth, Edge Functions: Supabase</li>
            <li>KI-Verarbeitung: OpenAI (Drittland möglich)</li>
            <li>E-Mail-Versand (Warteliste/Einladungen): Resend</li>
          </ul>
          <p>
            Mit Auftragsverarbeitern werden – soweit gesetzlich vorgeschrieben – Verträge nach Art.&nbsp;28 DSGVO
            geschlossen bzw. die angebotenen Standardverträge genutzt.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Speicherdauer</p>
          <p>
            Daten werden nur so lange gespeichert, wie es für die jeweiligen Zwecke erforderlich ist oder gesetzliche
            Aufbewahrungsfristen bestehen; danach Löschung oder Anonymisierung.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Deine Rechte</p>
          <p>
            Du hast nach Maßgabe der gesetzlichen Voraussetzungen Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen bestimmte Verarbeitungen.
            Sofern die Verarbeitung auf Einwilligung beruht, kannst du diese mit Wirkung für die Zukunft widerrufen.
          </p>
          <p>
            Export- und Löschfunktionen sind – soweit umgesetzt – im Bereich Einstellungen erreichbar. Unbeschadet
            dessen kannst du dich auch an die oben genannte Kontaktadresse wenden.
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-semibold text-surface-900">Beschwerderecht</p>
          <p>
            Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist insbesondere die
            Landesbeauftragte für den Datenschutz Niedersachsen (
            <a
              href="https://www.lfd.niedersachsen.de/startseite/"
              className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              lfd.niedersachsen.de
            </a>
            ), wenn du dich in Deutschland aufhältst oder der Vorfall Deutschland betrifft.
          </p>
        </section>
      </div>
    </div>
  )
}
