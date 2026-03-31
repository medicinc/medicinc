const ALLERGIES_POOL = [
  'Keine bekannt', 'Penicillin', 'Ibuprofen', 'Latex', 'Kontrastmittel',
  'Sulfonamide', 'Nüsse', 'Bienenstich', 'Codein', 'Aspirin',
]

const MEDICATIONS_POOL = [
  'Keine regelmäßigen', 'Ramipril 5mg morgens', 'Metformin 500mg 2x täglich',
  'Aspirin 100mg', 'Ibuprofen bei Bedarf', 'L-Thyroxin 75µg',
  'Atorvastatin 20mg abends', 'Omeprazol 20mg', 'Bisoprolol 2,5mg',
  'Marcumar/Falithrom', 'Insulin (Humalog)', 'Amlodipin 5mg',
]

const PAST_HISTORY_POOL = [
  'Keine Vorerkrankungen', 'Bluthochdruck seit 10 Jahren',
  'Diabetes mellitus Typ 2', 'Knie-OP vor 2 Jahren', 'Blinddarm-OP als Kind',
  'Asthma bronchiale', 'Depression', 'Gallensteine', 'Vorhofflimmern',
  'Rückenschmerzen chronisch', 'Arthrose', 'Schilddrüsenunterfunktion',
]

const LAST_MEAL_POOL = [
  'Heute Morgen gefrühstückt, vor etwa 3 Stunden.',
  'Habe nichts gegessen heute, nur Kaffee getrunken.',
  'Mittagessen vor einer Stunde — Nudeln mit Soße.',
  'Gestern Abend zuletzt gegessen.',
  'Vor ungefähr 5 Stunden ein Brötchen.',
  'Habe heute nur Wasser getrunken, mir war übel.',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

const PAIN_DESCRIPTIONS = {
  0: 'Nein, ich habe eigentlich keine Schmerzen.',
  1: 'Kaum... fast gar nicht, nur ein leichtes Ziehen.',
  2: 'Ganz leicht, ich merke es, aber es stört mich kaum.',
  3: 'Ein bisschen... so 3 von 10 würde ich sagen.',
  4: 'Schon unangenehm, so eine 4 vielleicht.',
  5: 'Mittelmäßig... so 5 von 10. Es nervt schon ziemlich.',
  6: 'Ziemlich stark... ich würde sagen eine 6. Es ist schwer sich zu konzentrieren.',
  7: 'Stark! So 7 von 10. Es tut wirklich weh.',
  8: 'Sehr stark... eine 8. Ich kann kaum still sitzen.',
  9: 'Extrem stark! Fast unerträglich... 9 von 10.',
  10: 'Unerträglich! So schlimm war es noch nie... bitte helfen Sie mir!',
}

const PAIN_LEVEL_VARIANTS = {
  0: ['Aktuell habe ich keine Schmerzen.', 'Im Moment schmerzfrei, eher nur Unwohlsein.'],
  1: ['Kaum spürbar, höchstens 1 von 10.', 'Nur ein leichtes Ziehen, etwa 1 von 10.'],
  2: ['Leicht, ungefähr 2 von 10.', 'Nur mild unangenehm, vielleicht 2 von 10.'],
  3: ['So 3 von 10, gut auszuhalten.', 'Eher leicht, ich würde 3 von 10 sagen.'],
  4: ['Etwa 4 von 10, schon merklich.', 'Unangenehm, aber noch kontrollierbar, 4 von 10.'],
  5: ['Mittelstark, ungefähr 5 von 10.', 'Ich würde die Schmerzen mit 5 von 10 einschätzen.'],
  6: ['Schon deutlich, etwa 6 von 10.', 'Relativ stark, 6 von 10.'],
  7: ['Stark, klar 7 von 10.', 'Im Moment 7 von 10, das belastet mich deutlich.'],
  8: ['Sehr stark, ungefähr 8 von 10.', '8 von 10, ich kann kaum ruhig bleiben.'],
  9: ['Fast unerträglich, 9 von 10.', 'Extrem stark, 9 von 10.'],
  10: ['Unerträglich, 10 von 10.', 'Maximaler Schmerz, 10 von 10.'],
}

function clampPain(level) {
  return Math.max(0, Math.min(10, Number(level || 0)))
}

function buildPainAnswer(patient, painLevel, ctx) {
  const p = clampPain(painLevel)
  const traumaCode = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase().startsWith('S')
  if (ctx.trauma || traumaCode) {
    return pick([
      `Etwa ${p} von 10, vor allem bei Bewegung oder Berührung der verletzten Stelle.`,
      `${p} von 10. In Ruhe geht es etwas, aber beim Bewegen schießt es direkt ein.`,
      `Ich würde ${p} von 10 sagen, belastet wird es deutlich schlimmer.`,
    ])
  }
  if (ctx.cardiac) {
    return pick([
      `Ungefähr ${p} von 10, eher ein starker Druck als ein stechender Schmerz.`,
      `${p} von 10. Es fühlt sich eng in der Brust an.`,
      `So ${p} von 10, mit Druckgefühl hinter dem Brustbein.`,
    ])
  }
  if (ctx.abdominal) {
    return pick([
      `Der Bauchschmerz liegt bei etwa ${p} von 10 und kommt in Wellen.`,
      `Etwa ${p} von 10, bei Druck auf den Bauch deutlich schlimmer.`,
      `${p} von 10, besonders beim Gehen und bei Bewegung unangenehm.`,
    ])
  }
  if (ctx.respiratory) {
    return pick([
      `Schmerzmäßig ungefähr ${p} von 10, die Luftnot stört mich zusätzlich.`,
      `${p} von 10. Beim tiefen Einatmen nimmt es zu.`,
      `Etwa ${p} von 10, vor allem beim Husten und tiefen Atmen.`,
    ])
  }
  if (ctx.neuro) {
    return pick([
      `Ich würde ${p} von 10 angeben, vor allem im Kopfbereich.`,
      `Etwa ${p} von 10, eher pochend als stechend.`,
      `${p} von 10, und bei Licht wirkt es stärker.`,
    ])
  }
  const variants = PAIN_LEVEL_VARIANTS[p]
  if (variants?.length) return pick(variants)
  return PAIN_DESCRIPTIONS[p] || 'Die Schmerzen sind schwer einzuschätzen.'
}

const COMPLAINT_DIALOGUES = {
  'Starke Kopfschmerzen seit 3 Tagen': {
    painLevel: 6,
    eventDescription: 'Das fing vor 3 Tagen an, ganz plötzlich beim Aufstehen. Seitdem wird es immer schlimmer, besonders bei hellem Licht.',
    symptomDetails: 'Es ist ein pochender Schmerz, hauptsächlich vorne und an den Schläfen. Mir wird auch oft übel und Licht tut richtig weh in den Augen.',
    riskFactors: 'Ich arbeite viel am Computer. Migräne hatte meine Mutter auch immer. Ich trinke wahrscheinlich zu wenig Wasser.',
    additionalInfo: 'Ich habe schon Ibuprofen genommen, aber es hilft kaum. Fieber habe ich glaube ich nicht. Nackensteifheit? Nein, ich glaube nicht... bewegen kann ich den Kopf schon.',
  },
  'Brustschmerzen bei Belastung': {
    painLevel: 7,
    eventDescription: 'Heute beim Treppensteigen. Plötzlich ein Druck auf der Brust, als ob jemand drauf sitzt. Ging in den linken Arm.',
    symptomDetails: 'Es ist ein drückender, enger Schmerz mitten in der Brust. Strahlt manchmal in den linken Arm und den Kiefer aus. Beim Ruhen wird es etwas besser.',
    riskFactors: 'Ich rauche seit 20 Jahren, mein Vater hatte mit 55 einen Herzinfarkt. Cholesterin war beim letzten Check auch zu hoch.',
    additionalInfo: 'Ich schwitze auch ganz kalt. Ein bisschen Übelkeit. Das hatte ich so noch nie. Meine Frau hat gesagt ich soll sofort herkommen.',
  },
  'Fieber und Husten seit einer Woche': {
    painLevel: 4,
    eventDescription: 'Vor einer Woche fing es mit Halsschmerzen an, dann kam der Husten dazu und seit 3 Tagen habe ich Fieber.',
    symptomDetails: 'Der Husten ist mit gelblich-grünem Schleim. Ich fühle mich total schlapp und müde. Das Fieber geht abends immer hoch, bis fast 39.',
    riskFactors: 'Ich rauche gelegentlich. In meinem Büro waren letzte Woche auch mehrere Kollegen krank.',
    additionalInfo: 'Atmen tut auf der rechten Seite etwas weh beim tiefen Einatmen. Nachtschweiß habe ich auch. Gewicht verloren habe ich glaube nicht.',
  },
  'Bauchschmerzen rechter Unterbauch': {
    painLevel: 7,
    eventDescription: 'Gestern Abend fing es um den Nabel herum an, jetzt ist es nach rechts unten gewandert und wird immer schlimmer.',
    symptomDetails: 'Es tut rechts unten im Bauch richtig weh, besonders wenn ich draufdrücke oder wenn ich loslasse. Mir ist übel und ich hab keinen Appetit mehr.',
    riskFactors: 'Keine besonderen. Ich bin eigentlich gesund. Kein Durchfall, kein Blut im Stuhl.',
    additionalInfo: 'Beim Gehen tut es mehr weh, ich humpele fast. Die Schmerzen kommen in Wellen aber werden insgesamt schlimmer. Leichtes Fieber habe ich auch.',
  },
  'Schwindel und Gleichgewichtsstörungen': {
    painLevel: 2,
    eventDescription: 'Seit heute Morgen beim Aufstehen. Der ganze Raum hat sich gedreht. Jetzt geht es etwas besser, aber mir ist noch schwindelig.',
    symptomDetails: 'Es ist ein Drehschwindel, als ob alles Karussell fährt. Mir ist auch übel davon. Beim Hinlegen wird es etwas besser.',
    riskFactors: 'Ich hatte letzte Woche eine Erkältung. Manchmal habe ich Ohrgeräusche, so ein Pfeifen.',
    additionalInfo: 'Hören tu ich auf beiden Seiten gleich, glaube ich. Sehen kann ich normal. Kopfschmerzen habe ich nicht wirklich.',
  },
  'Schnittwunde am Unterarm': {
    painLevel: 4,
    eventDescription: 'Vor einer Stunde beim Kochen mit dem Küchenmesser abgerutscht. Es hat ziemlich geblutet, ich hab ein Handtuch drumgewickelt.',
    symptomDetails: 'Der Schnitt ist am linken Unterarm, so 4-5 cm lang. Geht ziemlich tief glaube ich. Finger kann ich alle noch bewegen.',
    riskFactors: 'Keine. Die Tetanus-Impfung müsste eigentlich noch aktuell sein... ich glaube vor 3 Jahren.',
    additionalInfo: 'Die Blutung ist jetzt weniger geworden mit dem Druck. Gefühl in den Fingern habe ich normal.',
  },
  'Atemnot und pfeifende Atemgeräusche': {
    painLevel: 5,
    eventDescription: 'Vor etwa 2 Stunden angefangen. Ich war draußen spazieren und plötzlich bekam ich keine Luft mehr.',
    symptomDetails: 'Beim Einatmen pfeift es und ich bekomme schlecht Luft. Ich muss auch immer husten. Engegefühl in der Brust.',
    riskFactors: 'Ich bin Asthmatiker, habe mein Spray aber schon seit Wochen nicht mehr benutzt. Heute ist es draußen kalt und feucht.',
    additionalInfo: 'Mein Notfallspray habe ich vergessen. Normalerweise nehme ich Salbutamol bei Bedarf. Das letzte Mal so schlimm war es vor einem Jahr.',
  },
  'Rückenschmerzen nach Sturz': {
    painLevel: 6,
    eventDescription: 'Vor 4 Stunden von einer Trittleiter gefallen, ungefähr 1 Meter hoch. Bin auf den Rücken gefallen.',
    symptomDetails: 'Der untere Rücken tut sehr weh, besonders beim Bewegen. Ein scharfer Schmerz wenn ich mich drehe.',
    riskFactors: 'Ich bin 65 und habe Osteoporose. Nehme Vitamin D und Calcium.',
    additionalInfo: 'Die Beine kann ich normal bewegen und fühlen. Kribbeln oder Taubheit habe ich nicht. Wasser lassen konnte ich auch normal.',
  },
  'Hautausschlag und Juckreiz': {
    painLevel: 1,
    eventDescription: 'Seit gestern Abend. Habe ein neues Waschmittel benutzt und heute Morgen war der Ausschlag überall.',
    symptomDetails: 'Rote, leicht erhabene Flecken am Oberkörper und Armen. Juckt höllisch. Kein Fieber, mir geht es sonst gut.',
    riskFactors: 'Ich habe empfindliche Haut. Als Kind hatte ich Neurodermitis. Gestern das neue Waschmittel zum ersten Mal benutzt.',
    additionalInfo: 'Atmen kann ich normal. Die Lippen und Zunge sind nicht geschwollen. Nur der Juckreiz ist furchtbar.',
  },
  'Halsschmerzen und Schluckbeschwerden': {
    painLevel: 3,
    eventDescription: 'Seit 2 Tagen. Fing mit Kratzen im Hals an und jetzt tut es beim Schlucken richtig weh.',
    symptomDetails: 'Der Hals ist geschwollen und rot. Beim Schlucken fühlt es sich an wie Glasscherben. Leichtes Fieber seit heute.',
    riskFactors: 'Mein Kind ist gerade krank, Kindergarten-Erkältung. Ich bin wahrscheinlich angesteckt.',
    additionalInfo: 'Atmen geht normal. Speichelfluss ist nicht vermehrt. Essen kann ich kaum, nur Suppe geht.',
  },
  'Plötzliche Sehstörung rechtes Auge': {
    painLevel: 1,
    eventDescription: 'Vor einer Stunde. Plötzlich wurde es rechts dunkel am Rand, wie ein Vorhang der sich schließt.',
    symptomDetails: 'Rechts im Auge sehe ich nur noch halb so viel. Außerdem sehe ich Lichtblitze und fliegende Punkte.',
    riskFactors: 'Ich habe Bluthochdruck und bin Diabetiker. Die Augen wurden letztes Jahr vom Augenarzt kontrolliert.',
    additionalInfo: 'Schmerzen im Auge habe ich nicht direkt. Kopfschmerzen auch nicht. Links sehe ich normal.',
  },
  'Gelenkschmerzen und Schwellung Knie': {
    painLevel: 5,
    eventDescription: 'Seit gestern nach dem Fußballspielen. Bin umgeknickt und es hat geknackt.',
    symptomDetails: 'Das rechte Knie ist geschwollen und warm. Ich kann es nicht ganz durchstrecken. Beim Belasten tut es weh.',
    riskFactors: 'Hatte vor 5 Jahren schon mal einen Kreuzbandriss am gleichen Knie.',
    additionalInfo: 'Gehen kann ich nur humpelnd. Es fühlt sich instabil an, als ob es wegrutschen könnte.',
  },
  'Herzrasen und Angstgefühl': {
    painLevel: 3,
    eventDescription: 'Vor 2 Stunden, saß auf der Couch und plötzlich fing das Herz an zu rasen. Dann kam die Panik.',
    symptomDetails: 'Das Herz klopft total schnell und unregelmäßig. Mir ist schwindelig und ich zittere. Habe ein Engegefühl in der Brust.',
    riskFactors: 'Ich trinke viel Kaffee, ca. 5-6 Tassen am Tag. Bin gerade auch viel unter Stress wegen der Arbeit.',
    additionalInfo: 'Bewusstlos war ich nicht. Brustschmerzen richtige nicht, eher dieses enge Gefühl. Ich hatte sowas ähnliches schon mal vor einem Monat.',
  },
  'Chronische Müdigkeit und Gewichtsverlust': {
    painLevel: 1,
    eventDescription: 'Schleichend seit etwa 2-3 Monaten. Bin einfach nur noch müde und habe 6 Kilo abgenommen ohne Diät.',
    symptomDetails: 'Extreme Müdigkeit, selbst nach 10 Stunden Schlaf. Nachtschweiß mehrmals pro Woche. Appetitlosigkeit.',
    riskFactors: 'Ich rauche seit 25 Jahren. In der Familie gab es Krebserkrankungen.',
    additionalInfo: 'Der Hausarzt hat Blut abgenommen, aber die Ergebnisse stehen noch aus. Ich huste auch mehr als sonst, aber ohne Blut.',
  },
}

const GENERIC_DIALOGUES = {
  painLevel: 5,
  eventDescription: 'Die Beschwerden haben vor einigen Stunden begonnen und sind seitdem nicht richtig besser geworden.',
  symptomDetails: 'Es ist deutlich unangenehm und beeinträchtigt mich im Alltag.',
  riskFactors: 'Mir sind keine besonderen Risikofaktoren bekannt.',
  additionalInfo: 'Mehr kann ich im Moment nicht sicher sagen, aber ich möchte das bitte gründlich abgeklärt haben.',
}

const CODE_BASED_DIALOGUES = {
  'S00': [
    {
      painLevel: 3,
      eventDescription: 'Ich bin beim Fahrradfahren gestürzt und über den Asphalt gerutscht.',
      symptomDetails: 'Die Haut brennt stark, vor allem am Knie und am Ellenbogen, und es nässt etwas.',
      riskFactors: 'Ich nehme keine Blutverdünner und habe keine bekannten Gerinnungsstörungen.',
      additionalInfo: 'Mir ist wichtig, dass alles sauber gereinigt wird, weil noch Schmutz in der Wunde sein könnte.',
    },
    {
      painLevel: 2,
      eventDescription: 'Die Schürfwunde ist nach einem Stolpersturz auf dem Gehweg entstanden.',
      symptomDetails: 'Es sind oberflächliche Verletzungen, aber die Stellen sind empfindlich und beim Bewegen schmerzhaft.',
      riskFactors: 'Ich habe keine wesentlichen Vorerkrankungen.',
      additionalInfo: 'Die Blutung ist gering, aber das Brennen wird stärker, wenn Kleidung daran reibt.',
    },
  ],
  'S01': [
    {
      painLevel: 4,
      eventDescription: 'Ich habe mir den Kopf an einer Kante aufgeschlagen, danach hat es direkt geblutet.',
      symptomDetails: 'Die Wunde an der Kopfhaut klafft etwas, und beim Berühren tut es deutlich weh.',
      riskFactors: 'Ich nehme keine Blutverdünner.',
      additionalInfo: 'Mir war kurz schwindelig, aber ich war nicht bewusstlos.',
    },
    {
      painLevel: 5,
      eventDescription: 'Nach dem Sturz hatte ich sofort eine Platzwunde mit recht starker Blutung.',
      symptomDetails: 'Die Stelle pocht und ist druckempfindlich, ansonsten habe ich keine neurologischen Ausfälle bemerkt.',
      riskFactors: 'In der Vorgeschichte keine Gerinnungsprobleme.',
      additionalInfo: 'Bitte prüfen Sie auch, ob die Wunde genäht werden muss.',
    },
  ],
  'S61': [
    {
      painLevel: 5,
      eventDescription: 'Ich habe mich beim Schneiden mit dem Küchenmesser in die Hand geschnitten.',
      symptomDetails: 'Der Schnitt ist relativ tief, und beim Bewegen der Finger zieht es stark.',
      riskFactors: 'Tetanus-Impfung sollte noch aktuell sein.',
      additionalInfo: 'Das Gefühl in den Fingern ist da, aber die Stelle blutet ohne Druckverband weiter.',
    },
    {
      painLevel: 4,
      eventDescription: 'Die Verletzung ist beim Öffnen einer Verpackung mit einer Klinge passiert.',
      symptomDetails: 'Es ist eine saubere Schnittverletzung, aber die Wundränder stehen auseinander.',
      riskFactors: 'Keine bekannten Blutgerinnungsstörungen.',
      additionalInfo: 'Ich kann die Finger bewegen, möchte aber keine Narbenprobleme bekommen.',
    },
  ],
  'S72': [
    {
      painLevel: 8,
      eventDescription: 'Nach dem Sturz auf die Hüfte konnte ich nicht mehr aufstehen.',
      symptomDetails: 'Die Schmerzen in der Hüfte sind sehr stark, und jede Bewegung verschlechtert es sofort.',
      riskFactors: 'Ich bin älter und hatte schon vorher Probleme mit der Knochendichte.',
      additionalInfo: 'Belasten kann ich das Bein überhaupt nicht mehr.',
    },
  ],
  'S82': [
    {
      painLevel: 8,
      eventDescription: 'Ich bin umgeknickt und habe dabei ein deutliches Knacken im Unterschenkel gespürt.',
      symptomDetails: 'Der Unterschenkel ist geschwollen und fehlgestellt, Belastung ist nicht möglich.',
      riskFactors: 'Keine besonderen Risikofaktoren bekannt.',
      additionalInfo: 'Bitte kontrollieren Sie Durchblutung und Gefühl im Fuß.',
    },
  ],
  'S32': [
    {
      painLevel: 8,
      eventDescription: 'Nach einem Sturz bestehen starke Schmerzen im Beckenbereich.',
      symptomDetails: 'Schon kleine Lageänderungen machen deutliche Schmerzen, Gehen ist kaum möglich.',
      riskFactors: 'Vorherige Verletzungen im Beckenbereich sind nicht bekannt.',
      additionalInfo: 'Mir ist dabei auch schwindelig geworden.',
    },
  ],
}

function getSpecificDialogue(patient) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const codeKey = Object.keys(CODE_BASED_DIALOGUES).find(key => code.startsWith(key))
  if (codeKey) return pick(CODE_BASED_DIALOGUES[codeKey])
  return COMPLAINT_DIALOGUES[patient.chiefComplaint] || GENERIC_DIALOGUES
}

function introComplaintText(patient) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const chief = String(patient?.chiefComplaint || '').trim()
  if (code.startsWith('S00')) return 'mit Schürfwunden am Knie und am Ellenbogen'
  if (code.startsWith('S01')) return 'mit einer Platzwunde am Kopf'
  if (code.startsWith('S61')) return 'mit einer Schnittverletzung an der Hand'
  if (code.startsWith('S72')) return 'mit starken Hüftschmerzen nach einem Sturz'
  if (code.startsWith('S82')) return 'mit starken Schmerzen am Unterschenkel nach einem Sturz'
  if (code.startsWith('S32')) return 'mit starken Schmerzen im Beckenbereich nach einem Unfall'
  if (!chief) return 'wegen akuter Beschwerden'
  const normalized = chief.charAt(0).toLowerCase() + chief.slice(1)
  return `mit ${normalized}`
}

function resolveConversationLanguage(patient) {
  return ['en', 'es'].includes(patient?.languageCode) ? patient.languageCode : 'de'
}

function getLocalizedChiefComplaintByKeywords(patient, lang = 'de') {
  const complaint = String(patient?.chiefComplaint || '').trim()
  if (lang === 'de') return complaint || 'akute Beschwerden'
  const source = complaint.toLowerCase()
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const isEn = lang === 'en'

  const speak = (enText, esText) => (isEn ? enText : esText)
  const has = (re) => re.test(source)

  if (has(/brust|thorax|herz|koronar|rasen/) || code.startsWith('I')) {
    return speak('chest pain and cardiac symptoms', 'dolor toracico y sintomas cardiacos')
  }
  if (has(/luftnot|atem|husten|stridor|dyspnoe/) || code.startsWith('J')) {
    return speak('shortness of breath and respiratory symptoms', 'falta de aire y sintomas respiratorios')
  }
  if (has(/bauch|oberbauch|unterbauch|ileus|flanke|uebel|übel|erbrechen/) || code.startsWith('K') || code.startsWith('N')) {
    return speak('abdominal pain with gastrointestinal symptoms', 'dolor abdominal con sintomas gastrointestinales')
  }
  if (has(/sturz|fraktur|schnitt|wunde|blutung|verletz|trauma/) || code.startsWith('S') || code.startsWith('T')) {
    return speak('an acute injury after trauma', 'una lesion aguda tras un traumatismo')
  }
  if (has(/kopfschmerz|sprach|laehm|lähm|krampf|schwindel|neurolog/) || code.startsWith('G') || code.startsWith('H')) {
    return speak('neurological symptoms', 'sintomas neurologicos')
  }
  if (has(/fieber|schuettelfrost|schüttelfrost|infekt|sepsis/) || code.startsWith('A')) {
    return speak('fever with possible infection symptoms', 'fiebre con posibles sintomas de infeccion')
  }
  return speak('acute symptoms', 'sintomas agudos')
}

export function getLocalizedChiefComplaint(patient, lang = null) {
  const resolved = lang || resolveConversationLanguage(patient)
  return getLocalizedChiefComplaintByKeywords(patient, resolved)
}

function maybeWithCommunicationPrefix(text, patient) {
  if (patient?.communicationNeeds === 'mute') return `[schreibt] ${text}`
  if (patient?.communicationNeeds === 'deaf') return `[liest mit] ${text}`
  return text
}

function psychProfileType(patient) {
  const type = String(patient?.psychProfile?.type || '').toLowerCase()
  return ['aggressive', 'confused', 'psychotic'].includes(type) ? type : null
}

function applyPsychProfile(dialogue, patient) {
  const type = psychProfileType(patient)
  if (!type || !dialogue?.questions) return dialogue
  const lang = resolveConversationLanguage(patient)
  const byLang = {
    de: {
      aggressive: {
        chief: 'Ich bin nur hier, weil alle so einen Aufstand machen. Machen Sie schnell.',
        symptoms: 'Ich habe Beschwerden, aber diese ständigen Fragen nerven mich gerade.',
        additional: 'Ich will eine zügige Behandlung, sonst werde ich noch unruhiger.',
      },
      confused: {
        chief: 'Ich glaube, ich habe den Überblick verloren... mir fällt das Antworten schwer.',
        symptoms: 'Die Beschwerden wechseln gefühlt ständig, ich kann das nicht gut sortieren.',
        additional: 'Bitte sprechen Sie langsam mit mir, dann kann ich besser folgen.',
      },
      psychotic: {
        chief: 'Seit heute fühlt sich alles unwirklich an, ich bin sehr angespannt und misstrauisch.',
        symptoms: 'Ich bin innerlich extrem unruhig und habe das Gefühl, nicht sicher zu sein.',
        additional: 'Bitte lassen Sie mich nicht allein, ich brauche gerade klare Orientierung.',
      },
    },
    en: {
      aggressive: {
        chief: 'I am only here because everyone made a big deal out of this. Please be quick.',
        symptoms: 'I do have symptoms, but all these questions are stressing me right now.',
        additional: 'I need fast treatment, otherwise I will become more agitated.',
      },
      confused: {
        chief: 'I feel like I lost track of everything... answering is difficult right now.',
        symptoms: 'The symptoms feel inconsistent and I cannot sort them clearly.',
        additional: 'Please speak slowly so I can follow better.',
      },
      psychotic: {
        chief: 'Since today everything feels unreal, and I am very tense and suspicious.',
        symptoms: 'I feel extremely restless and unsafe right now.',
        additional: 'Please do not leave me alone; I need clear orientation.',
      },
    },
    es: {
      aggressive: {
        chief: 'Solo estoy aqui porque todos hicieron un gran drama. Por favor, vaya rapido.',
        symptoms: 'Tengo sintomas, pero tantas preguntas me ponen mas nervioso.',
        additional: 'Necesito una atencion rapida, si no me voy a agitar mas.',
      },
      confused: {
        chief: 'Siento que he perdido el hilo de todo... me cuesta responder ahora.',
        symptoms: 'Los sintomas cambian y no logro ordenarlos bien.',
        additional: 'Por favor, hable despacio para que pueda seguirle.',
      },
      psychotic: {
        chief: 'Desde hoy todo se siente irreal y estoy muy tenso y desconfiado.',
        symptoms: 'Me siento muy inquieto y con sensacion de inseguridad.',
        additional: 'Por favor, no me deje solo; necesito orientacion clara.',
      },
    },
  }
  const byType = (byLang[lang] || byLang.de)[type]
  const questions = dialogue.questions.map(q => {
    if (q.id === 'chief_complaint') return { ...q, answer: byType.chief }
    if (q.id === 'symptoms') return { ...q, answer: byType.symptoms }
    if (q.id === 'additional') return { ...q, answer: byType.additional }
    return q
  })
  return {
    ...dialogue,
    questions,
  }
}

function buildForeignDialogue(patient, lang = 'en', anamnesis = null) {
  const painLevel = 2 + Math.floor(Math.random() * 7)
  const localizedComplaint = getLocalizedChiefComplaint(patient, lang)
  const profile = anamnesis || {
    allergies: 'Keine bekannt',
    medications: 'Keine regelmaessigen',
    pastHistory: 'Keine Vorerkrankungen',
    lastMeal: 'Heute Morgen gefruehstueckt, vor etwa 3 Stunden.',
  }
  const hasKnownAllergies = !/keine/i.test(String(profile.allergies || ''))
  const hasRegularMeds = !/keine/i.test(String(profile.medications || ''))
  const hasPastHistory = !/keine/i.test(String(profile.pastHistory || ''))
  const base = lang === 'es'
    ? {
      chiefQ: 'Was führt Sie heute zu uns?',
      chiefA: `Vengo por ${localizedComplaint}.`,
      symptomsQ: 'Können Sie die Beschwerden genauer beschreiben?',
      symptomsA: 'Los sintomas han empeorado en las ultimas horas y me encuentro bastante mal.',
      painQ: 'Wie stark sind die Schmerzen von 0 bis 10?',
      painA: `Diria que es un ${painLevel} de 10.`,
      eventQ: 'Was war das auslösende Ereignis?',
      eventA: 'Comenzo de forma bastante repentina, sin una causa clara.',
      allergiesQ: 'Haben Sie Allergien?',
      allergiesA: hasKnownAllergies ? `Si, alergia a ${profile.allergies}.` : 'No tengo alergias conocidas.',
      medsQ: 'Nehmen Sie regelmäßig Medikamente?',
      medsA: hasRegularMeds ? `Tomo ${profile.medications}.` : 'No tomo medicacion de forma regular.',
      historyQ: 'Haben Sie Vorerkrankungen?',
      historyA: hasPastHistory ? `Antecedentes: ${profile.pastHistory}.` : 'No tengo antecedentes importantes.',
      mealQ: 'Wann war die letzte Mahlzeit?',
      mealA: String(profile.lastMeal || 'Comi algo ligero hace unas horas.'),
      riskQ: 'Gibt es Risikofaktoren?',
      riskA: 'No conozco factores de riesgo concretos.',
      additionalQ: 'Gibt es noch etwas Wichtiges?',
      additionalA: 'Me preocupa que haya empeorado tan rapido.',
      onsetQ: 'Werden die Beschwerden besser oder schlechter?',
      onsetA: 'En general diria que van a peor.',
    }
    : {
      chiefQ: 'Was führt Sie heute zu uns?',
      chiefA: `I came in with ${localizedComplaint}.`,
      symptomsQ: 'Können Sie die Beschwerden genauer beschreiben?',
      symptomsA: 'The symptoms got worse over the last few hours and I feel unwell.',
      painQ: 'Wie stark sind die Schmerzen von 0 bis 10?',
      painA: `I would rate the pain around ${painLevel} out of 10.`,
      eventQ: 'Was war das auslösende Ereignis?',
      eventA: 'It started rather suddenly without a clear trigger.',
      allergiesQ: 'Haben Sie Allergien?',
      allergiesA: hasKnownAllergies ? `Yes, I am allergic to ${profile.allergies}.` : 'No known allergies.',
      medsQ: 'Nehmen Sie regelmäßig Medikamente?',
      medsA: hasRegularMeds ? `I take ${profile.medications}.` : 'I do not take regular medication.',
      historyQ: 'Haben Sie Vorerkrankungen?',
      historyA: hasPastHistory ? `Past history: ${profile.pastHistory}.` : 'No major previous conditions.',
      mealQ: 'Wann war die letzte Mahlzeit?',
      mealA: String(profile.lastMeal || 'I had a light meal a few hours ago.'),
      riskQ: 'Gibt es Risikofaktoren?',
      riskA: 'No specific risk factors that I know of.',
      additionalQ: 'Gibt es noch etwas Wichtiges?',
      additionalA: 'I am worried because things got worse quickly.',
      onsetQ: 'Werden die Beschwerden besser oder schlechter?',
      onsetA: 'Overall, the symptoms are getting worse.',
    }
  return {
    painLevel,
    allergies: profile.allergies,
    medications: profile.medications,
    pastHistory: profile.pastHistory,
    lastMeal: profile.lastMeal,
    questions: [
      { id: 'chief_complaint', category: 'Chief Complaint', question: base.chiefQ, answer: base.chiefA },
      { id: 'symptoms', category: 'Symptoms', question: base.symptomsQ, answer: base.symptomsA },
      { id: 'pain', category: 'Pain', question: base.painQ, answer: base.painA },
      { id: 'event', category: 'History', question: base.eventQ, answer: base.eventA },
      { id: 'allergies', category: 'SAMPLERS', question: base.allergiesQ, answer: base.allergiesA },
      { id: 'medications', category: 'SAMPLERS', question: base.medsQ, answer: base.medsA },
      { id: 'past_history', category: 'SAMPLERS', question: base.historyQ, answer: base.historyA },
      { id: 'last_meal', category: 'SAMPLERS', question: base.mealQ, answer: base.mealA },
      { id: 'risk_factors', category: 'Risk', question: base.riskQ, answer: base.riskA },
      { id: 'additional', category: 'Additional', question: base.additionalQ, answer: base.additionalA },
      { id: 'onset', category: 'Course', question: base.onsetQ, answer: base.onsetA },
    ],
  }
}

export function generatePatientGreeting(patient, mode = 'triage') {
  const psychType = psychProfileType(patient)
  const lang = resolveConversationLanguage(patient)
  const status = String(patient?.status || '').toLowerCase()
  const treatmentCount = Number(patient?.appliedTreatments?.length || 0)
  const admitted = ['triaged', 'waiting', 'in_treatment', 'in_diagnostics', 'ward', 'icu', 'or'].includes(status)
  const progressed = treatmentCount >= 2 || ['in_treatment', 'in_diagnostics', 'ward', 'icu', 'or'].includes(status)
  const painNow = Number(patient?.clinicalState?.pain || 0)
  const dyspneaNow = Number(patient?.clinicalState?.dyspnea || 0)
  const painState = painNow >= 7 ? 'high' : painNow >= 4 ? 'medium' : 'low'
  const breathingState = dyspneaNow >= 6 ? 'bad' : dyspneaNow >= 3 ? 'mid' : 'good'

  if (lang === 'en') {
    const firstName = String(patient?.name || '').split(' ')[0] || 'Patient'
    if (progressed) {
      const painText = painState === 'high' ? 'still quite severe' : painState === 'medium' ? 'still present' : 'improving'
      const breathText = breathingState === 'bad' ? 'breathing is still difficult' : breathingState === 'mid' ? 'breathing is somewhat better' : 'breathing feels much calmer'
      return `Hello, this is ${firstName} again. Thanks for the treatment so far. My symptoms are ${painText}, and ${breathText}.`
    }
    if (admitted) {
      return `Hello, this is ${firstName}. I have already been admitted and would like to update you on how I feel now.`
    }
    const suffix = psychType ? ' I feel mentally very distressed right now.' : ''
    return `Hello, my name is ${firstName}. I came in with ${getLocalizedChiefComplaint(patient, 'en')}.${suffix}`
  }
  if (lang === 'es') {
    const firstName = String(patient?.name || '').split(' ')[0] || 'Paciente'
    if (progressed) {
      const painText = painState === 'high' ? 'fuertes' : painState === 'medium' ? 'presentes' : 'mejorando'
      const breathText = breathingState === 'bad' ? 'la respiración sigue difícil' : breathingState === 'mid' ? 'la respiración está algo mejor' : 'la respiración está mucho más tranquila'
      return `Hola, soy ${firstName} de nuevo. Gracias por el tratamiento hasta ahora. Mis sintomas siguen ${painText}, y ${breathText}.`
    }
    if (admitted) {
      return `Hola, soy ${firstName}. Ya estoy ingresado y le cuento como me siento ahora mismo.`
    }
    const suffix = psychType ? ' Además me siento psicológicamente muy alterado.' : ''
    return `Hola, soy ${firstName}. Vengo por ${getLocalizedChiefComplaint(patient, 'es')}.${suffix}`
  }
  if (mode === 'rd') {
    const chief = String(patient?.chiefComplaint || '').trim()
    const lc = chief.toLowerCase()
    const clean = chief.replace(/\s+/g, ' ').replace(/\.+$/g, '').trim()
    const upperFirst = (txt) => txt ? `${txt.charAt(0).toUpperCase()}${txt.slice(1)}` : ''
    const lowerFirst = (txt) => txt ? `${txt.charAt(0).toLowerCase()}${txt.slice(1)}` : ''

    if (lc.includes('dialyse') && (lc.includes('krankentransport') || lc.includes('fahrt'))) {
      return 'Guten Tag, ich habe Sie gerufen, weil ich einen geplanten Krankentransport zur Dialyse habe. Ich habe keine akuten Beschwerden.'
    }
    if (lc.includes('bewusstlos') || lc.includes('synkope')) {
      return 'Guten Tag, ich habe Sie gerufen, weil ich kurzzeitig bewusstlos war. Jetzt bin ich wieder ansprechbar, aber ich habe noch Schwindel und Schwäche.'
    }
    if (lc.includes('atemnot') || lc.includes('luftnot')) {
      return 'Guten Tag, ich habe Sie gerufen, weil ich schlecht Luft bekomme. Es ist etwas besser, aber ich bin weiterhin kurzatmig.'
    }
    if (lc.includes('brust') || lc.includes('thorax')) {
      return 'Guten Tag, ich habe Sie gerufen, weil ich starken Druck auf der Brust hatte. Aktuell ist es etwas besser, aber die Beschwerden sind noch da.'
    }
    if (lc.includes('sturz') || lc.includes('verletz')) {
      return 'Guten Tag, ich habe Sie gerufen, weil ich gestürzt bin und seitdem Schmerzen habe. Ich bin ansprechbar, aber weiterhin deutlich eingeschränkt.'
    }
    if (clean) {
      const parts = clean
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
      if (parts.length >= 2) {
        const main = lowerFirst(parts[0])
        const tail = parts.slice(1).join(', ').replace(/\.+$/g, '').trim()
        if (/keine akuten beschwerden/i.test(tail)) {
          return `Guten Tag, ich habe Sie gerufen, weil ich ${main} habe. Ich habe aktuell keine akuten Beschwerden.`
        }
        return `Guten Tag, ich habe Sie gerufen, weil ich ${main} habe. ${upperFirst(tail)}.`
      }
      const normalized = lowerFirst(clean)
      if (/keine akuten beschwerden/i.test(normalized)) {
        return 'Guten Tag, ich habe Sie gerufen, weil eine kurze medizinische Abklärung nötig war. Ich habe aktuell keine akuten Beschwerden.'
      }
      return `Guten Tag, ich habe Sie gerufen, weil ich ${normalized} habe. Die Beschwerden bestehen weiterhin.`
    }
    return 'Guten Tag, ich habe Sie gerufen, weil es mir akut nicht gut ging. Ich bin jetzt ansprechbar, habe aber weiterhin Beschwerden.'
  }
  if (mode === 'ward') {
    if (progressed) {
      const painText = painState === 'high' ? 'noch schlecht' : painState === 'medium' ? 'etwas besser' : 'deutlich besser'
      const breathText = breathingState === 'bad' ? 'die Luft bleibt knapp' : breathingState === 'mid' ? 'die Atmung ist etwas besser' : 'die Atmung ist deutlich ruhiger'
      return `Guten Tag, ich bin inzwischen aufgenommen und bereits behandelt worden. Insgesamt geht es mir ${painText}, und ${breathText}.`
    }
    const chief = String(patient?.chiefComplaint || '').trim()
    const clean = chief.replace(/\s+/g, ' ').replace(/\.+$/g, '').trim()
    const lowerFirst = (txt) => txt ? `${txt.charAt(0).toLowerCase()}${txt.slice(1)}` : ''
    if (clean) {
      if (/dialyse/i.test(clean) && /krankentransport|fahrt/i.test(clean)) {
        return 'Guten Tag. Ich bin wegen eines geplanten Transports zur Dialyse hier. Mir geht es im Moment soweit stabil.'
      }
      if (/bewusstlos/i.test(clean)) {
        return 'Guten Tag. Ich war vorhin kurz weggetreten. Jetzt bin ich wieder klar, aber noch etwas schwach und schwindelig.'
      }
      if (/atemnot|luftnot/i.test(clean)) {
        return 'Guten Tag. Die Luft war vorhin deutlich knapp. Jetzt ist es etwas besser, aber noch nicht ganz normal.'
      }
      if (/brust|thorax/i.test(clean)) {
        return 'Guten Tag. Ich hatte vorhin starken Druck auf der Brust. Es ist etwas besser geworden, aber noch nicht weg.'
      }
      return `Guten Tag. Ich bin hier, weil ich ${lowerFirst(clean)} habe.`
    }
    return 'Guten Tag. Mir ging es vorhin deutlich schlechter, deshalb bin ich jetzt zur Abklärung hier.'
  }
  if (patient?.arrivalType === 'ambulance') {
    return `[Rettungsdienst-Übergabe] ${patient.preInfo || 'Patient per RTW eingeliefert.'}`
  }
  const firstName = String(patient?.name || '').split(' ')[0] || 'Patient'
  if (progressed) {
    const psychSuffix = psychType ? ' Psychisch bin ich dabei weiterhin angespannt.' : ''
    const painText = painState === 'high' ? 'noch deutlich schmerzhaft' : painState === 'medium' ? 'spürbar besser, aber noch nicht gut' : 'deutlich besser als zu Beginn'
    const breathText = breathingState === 'bad' ? 'die Luft weiterhin knapp' : breathingState === 'mid' ? 'die Atmung etwas stabiler' : 'die Atmung deutlich ruhiger'
    return `Hallo, ich bin ${firstName} nochmal. Danke für die bisherige Behandlung. Es ist ${painText} und ${breathText}.${psychSuffix}`
  }
  if (admitted) {
    return `Hallo, ich bin ${firstName}. Ich bin bereits aufgenommen worden und wollte den aktuellen Verlauf mit Ihnen besprechen.`
  }
  const psychSuffix = psychType ? ' Zusätzlich fühle ich mich psychisch gerade sehr belastet.' : ''
  return `Hallo, ich bin ${firstName}. Ich komme ${introComplaintText(patient)}.${psychSuffix}`
}

function getComplaintContext(chiefComplaint = '') {
  const text = chiefComplaint.toLowerCase()
  return {
    respiratory: /atem|husten|dyspnoe|luft/.test(text),
    cardiac: /brust|herz|druck|rasen/.test(text),
    abdominal: /bauch|unterbauch|übel|erbrechen/.test(text),
    neuro: /kopf|schwindel|sehst|synkope/.test(text),
    trauma: /sturz|fraktur|schnitt|wunde|trauma/.test(text),
    infection: /fieber|husten|entzünd|infekt/.test(text),
  }
}

function randomPickMany(items, maxCount) {
  const shuffled = [...items].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, maxCount)
}

function normalizePastHistory(value) {
  const parts = String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  if (parts.length === 0) return 'Keine Vorerkrankungen'
  const hasNone = parts.some(v => /keine vorerkrankungen/i.test(v))
  if (!hasNone) return parts.join(', ')
  const concrete = parts.filter(v => !/keine vorerkrankungen/i.test(v))
  return concrete.length > 0 ? concrete.join(', ') : 'Keine Vorerkrankungen'
}

function buildConsistentAnamnesis() {
  const medList = pickN(MEDICATIONS_POOL, 1 + Math.floor(Math.random() * 2))
  const noRegularMeds = medList.some(m => m.includes('Keine regelmäßigen'))
  const historyBase = (noRegularMeds && Math.random() < 0.35)
    ? ['Keine Vorerkrankungen']
    : pickN(PAST_HISTORY_POOL.filter(v => !v.includes('Keine Vorerkrankungen')), 1 + Math.floor(Math.random() * 2))
  return {
    allergies: pick(ALLERGIES_POOL),
    medications: medList.join(', '),
    pastHistory: normalizePastHistory(historyBase.join(', ')),
    lastMeal: pick(LAST_MEAL_POOL),
  }
}

function resolvePatientAnamnesis(patient) {
  if (patient?.anamnesisProfile) {
    return {
      allergies: patient.anamnesisProfile.allergies || patient.allergies || 'Keine bekannt',
      medications: patient.anamnesisProfile.medications || patient.medications || 'Keine regelmäßigen',
      pastHistory: normalizePastHistory(patient.anamnesisProfile.pastHistory || patient.pastHistory || 'Keine Vorerkrankungen'),
      lastMeal: patient.anamnesisProfile.lastMeal || patient.lastMeal || 'Heute Morgen gefrühstückt, vor etwa 3 Stunden.',
    }
  }
  if (patient?.allergies || patient?.medications || patient?.pastHistory || patient?.lastMeal) {
    return {
      allergies: patient?.allergies || 'Keine bekannt',
      medications: patient?.medications || 'Keine regelmäßigen',
      pastHistory: normalizePastHistory(patient?.pastHistory || 'Keine Vorerkrankungen'),
      lastMeal: patient?.lastMeal || 'Heute Morgen gefrühstückt, vor etwa 3 Stunden.',
    }
  }
  return buildConsistentAnamnesis()
}

export function generatePatientDialogue(patient, mode = 'triage') {
  const lang = resolveConversationLanguage(patient)
  const anamnesis = resolvePatientAnamnesis(patient)
  if (lang !== 'de') return applyPsychProfile(buildForeignDialogue(patient, lang, anamnesis), patient)
  const specific = getSpecificDialogue(patient)
  const allergies = patient?.anamnesisMeme ? 'Keine bekannt' : anamnesis.allergies
  const medications = patient?.anamnesisMeme ? 'Ramipril 5mg morgens' : anamnesis.medications
  const pastHistory = patient?.anamnesisMeme ? 'Keine Vorerkrankungen' : anamnesis.pastHistory
  const lastMeal = anamnesis.lastMeal
  const painLevel = specific.painLevel
  const ctx = getComplaintContext(patient.chiefComplaint)

  if (mode === 'ward' || mode === 'rd') {
    const currentPain = Math.max(0, Math.min(10, painLevel + Math.floor(Math.random() * 3 - 1)))
    const ctx = getComplaintContext(patient.chiefComplaint)
    const dynamicWardQuestions = [
      {
        id: 'ward_appetite',
        category: 'Verlauf',
        question: 'Können Sie wieder normal essen und trinken?',
        answer: currentPain >= 6
          ? 'Essen fällt noch schwer, trinken geht langsam besser.'
          : 'Ja, deutlich besser als am Anfang.',
      },
      {
        id: 'ward_toilet',
        category: 'Pflege',
        question: 'Gab es Probleme beim Wasserlassen oder Stuhlgang?',
        answer: ctx.abdominal
          ? 'Der Bauch ist noch empfindlich, aber es geht.'
          : 'Nein, da ist alles unauffällig.',
      },
      {
        id: 'ward_mobilisation',
        category: 'Mobilität',
        question: 'Wie klappt das Aufstehen und Gehen aktuell?',
        answer: ctx.trauma
          ? 'Mit Schmerzen und nur vorsichtig, aber kurze Strecken gehen.'
          : 'Mit Unterstützung klappt es schon recht gut.',
      },
      {
        id: 'ward_breathing',
        category: 'Sicherheit',
        question: 'Wie ist die Atmung im Vergleich zu gestern?',
        answer: ctx.respiratory
          ? 'Etwas freier, aber bei Belastung noch Luftnot.'
          : 'Atmung ist unverändert unauffällig.',
      },
      {
        id: 'ward_cardiac_symptoms',
        category: 'Sicherheit',
        question: 'Gab es erneut Druck auf der Brust, Herzrasen oder Schwindel?',
        answer: ctx.cardiac
          ? 'Kurzzeitig war wieder ein Druck da, jetzt ist es ruhiger.'
          : 'Nein, seit der Aufnahme nichts davon.',
      },
      {
        id: 'ward_sleep_quality',
        category: 'Pflege',
        question: 'Wie war die letzte Nacht insgesamt?',
        answer: currentPain >= 5
          ? 'Mehrfach wach geworden, insgesamt eher schlecht.'
          : 'Ganz okay, ich konnte mehrere Stunden schlafen.',
      },
      {
        id: 'ward_discharge_ready',
        category: 'Planung',
        question: 'Fühlen Sie sich schon fit genug für eine Entlassung?',
        answer: currentPain >= 6
          ? 'Noch nicht, ich fühle mich dafür zu instabil.'
          : 'Wenn die Werte passen, würde ich mir das zutrauen.',
      },
      {
        id: 'ward_sideeffects',
        category: 'Therapie',
        question: 'Sind Nebenwirkungen durch Medikamente aufgetreten?',
        answer: Math.random() < 0.25
          ? 'Etwas Schwindel nach der Medikation, sonst nichts Auffälliges.'
          : 'Nein, keine Nebenwirkungen bemerkt.',
      },
    ]
    return applyPsychProfile({
      painLevel: currentPain,
      questions: [
        {
          id: 'ward_general',
          category: 'Verlauf',
          question: 'Wie geht es Ihnen heute insgesamt?',
          answer: currentPain >= 7
            ? 'Ehrlich gesagt nicht gut. Ich fühle mich weiterhin ziemlich schlecht.'
            : currentPain >= 4
            ? 'Etwas besser als gestern, aber ich habe noch Beschwerden.'
            : 'Ganz okay. Es ist deutlich besser als bei der Aufnahme.',
        },
        {
          id: 'ward_complaints',
          category: 'Verlauf',
          question: 'Haben Sie aktuell noch Beschwerden?',
          answer: currentPain >= 6
            ? `Ja, vor allem ${patient.chiefComplaint.toLowerCase()} macht noch Probleme.`
            : currentPain >= 3
            ? `Ein bisschen noch, aber nicht mehr so stark wie am Anfang.`
            : 'Nur noch leicht, eher ein Restgefühl.',
        },
        {
          id: 'ward_pain_now',
          category: 'Schmerzen',
          question: 'Wie stark sind Ihre Schmerzen aktuell auf einer Skala von 0 bis 10?',
          answer: buildPainAnswer(patient, currentPain, ctx),
        },
        {
          id: 'ward_med_effect',
          category: 'Therapie',
          question: 'Haben die Medikamente oder Maßnahmen bisher geholfen?',
          answer: currentPain >= 6
            ? 'Nur begrenzt. Kurz wird es besser, dann kommt es wieder.'
            : 'Ja, ich merke schon eine Besserung nach der Behandlung.',
        },
        {
          id: 'ward_new_symptoms',
          category: 'Sicherheit',
          question: 'Sind neue Symptome seit der Aufnahme dazugekommen?',
          answer: Math.random() < 0.7
            ? 'Nein, nichts Neues. Nur die bekannten Beschwerden.'
            : 'Mir ist etwas schwindelig geworden, sonst nichts Auffälliges.',
        },
        {
          id: 'ward_mobility',
          category: 'Pflege',
          question: 'Können Sie aufstehen, essen und trinken?',
          answer: currentPain >= 7
            ? 'Aufstehen fällt mir schwer, trinken geht.'
            : 'Ja, mit etwas Hilfe geht das inzwischen.',
        },
        {
          id: 'ward_concerns',
          category: 'Kommunikation',
          question: 'Haben Sie Sorgen oder Fragen zur weiteren Behandlung?',
          answer: 'Ich möchte wissen, wann ich ungefähr wieder nach Hause kann und was die Ursache genau ist.',
        },
        {
          id: 'ward_sleep',
          category: 'Pflege',
          question: 'Konnten Sie in der Nacht schlafen?',
          answer: currentPain >= 6
            ? 'Nur sehr schlecht, ich bin oft wach geworden.'
            : 'Ja, besser als gedacht.',
        },
        ...randomPickMany(dynamicWardQuestions, 6),
      ],
      allergies,
      medications,
      pastHistory,
      lastMeal,
    }, patient)
  }

  const extraTriageQuestions = [
    {
      id: 'dyspnea_severity',
      category: 'Symptome',
      question: 'Können Sie ganze Sätze sprechen oder müssen Sie wegen Luftnot pausieren?',
      answer: ctx.respiratory
        ? 'Ich muss zwischendurch pausieren, vor allem beim Sprechen und Laufen.'
        : 'Sprechen klappt normal, keine Luftnot beim Reden.',
    },
    {
      id: 'chest_radiation',
      category: 'Symptome',
      question: 'Strahlen die Beschwerden irgendwohin aus?',
      answer: ctx.cardiac
        ? 'Ja, teilweise in den linken Arm und etwas in den Kiefer.'
        : 'Nein, bleibt eher lokal.',
    },
    {
      id: 'nausea_vomit',
      category: 'Symptome',
      question: 'Gibt es Übelkeit oder Erbrechen?',
      answer: ctx.abdominal || ctx.cardiac
        ? 'Übelkeit ja, erbrochen habe ich bisher nicht.'
        : 'Nein, keine Übelkeit.',
    },
    {
      id: 'fever_course',
      category: 'Verlauf',
      question: 'Hatten Sie Schüttelfrost oder Fieberspitzen?',
      answer: ctx.infection
        ? 'Ja, vor allem abends Fieberschübe mit Schüttelfrost.'
        : 'Nein, keine echten Fieberspitzen bemerkt.',
    },
    {
      id: 'trauma_details',
      category: 'Unfallhergang',
      question: 'Gab es ein Trauma, einen Sturz oder direkten Aufprall?',
      answer: ctx.trauma
        ? 'Ja, es gab einen direkten Aufprall an der betroffenen Stelle.'
        : 'Nein, kein Unfall, es kam ohne äußeren Anlass.',
    },
    {
      id: 'neurological_redflags',
      category: 'Neurologie',
      question: 'Gab es Lähmungen, Sprachprobleme oder Taubheitsgefühle?',
      answer: ctx.neuro
        ? 'Nein, Lähmung oder Sprachprobleme hatte ich nicht.'
        : 'Nein, sowas ist nicht aufgetreten.',
    },
    {
      id: 'syncope',
      category: 'Sicherheit',
      question: 'Waren Sie bewusstlos oder kurz weggetreten?',
      answer: Math.random() < 0.2
        ? 'Einmal kurz schwarz vor Augen, aber nicht komplett bewusstlos.'
        : 'Nein, keine Bewusstlosigkeit.',
    },
    {
      id: 'anticoagulation',
      category: 'Risikofaktoren',
      question: 'Nehmen Sie Blutverdünner oder hatten Sie Gerinnungsprobleme?',
      answer: /Marcumar|Aspirin|Falithrom/.test(medications)
        ? `Ja, ich nehme ${medications}.`
        : 'Nein, keine Blutverdünner.',
    },
    {
      id: 'infection_contact',
      category: 'Anamnese',
      question: 'Gab es in Ihrem Umfeld kürzlich ähnliche Erkrankungen?',
      answer: ctx.infection
        ? 'Ja, in der Familie und auf der Arbeit sind mehrere krank.'
        : 'Nein, nichts Bekanntes im Umfeld.',
    },
    {
      id: 'allergy_reaction',
      category: 'Allergie',
      question: 'Wie hat sich Ihre Allergie damals gezeigt?',
      answer: allergies === 'Keine bekannt'
        ? 'Ich hatte bisher keine bekannte allergische Reaktion.'
        : `Mit Hautausschlag und Juckreiz nach Kontakt mit ${allergies}.`,
    },
    {
      id: 'previous_episodes',
      category: 'Verlauf',
      question: 'Hatten Sie solche Beschwerden schon einmal?',
      answer: Math.random() < 0.5
        ? 'Ähnlich, aber nicht so stark wie diesmal.'
        : 'Nein, so ausgeprägt war das bisher noch nie.',
    },
    {
      id: 'self_medication',
      category: 'Vorbehandlung',
      question: 'Haben Sie vor der Vorstellung schon selbst etwas eingenommen?',
      answer: Math.random() < 0.6
        ? 'Ja, ein Schmerzmittel, aber die Wirkung war nur kurz.'
        : 'Nein, ich habe nichts genommen.',
    },
    {
      id: 'pain_trigger',
      category: 'Schmerzcharakter',
      question: 'Wodurch werden die Beschwerden stärker oder besser?',
      answer: painLevel >= 6
        ? 'Bei Bewegung deutlich schlimmer, in Ruhe minimal besser.'
        : 'Es schwankt, aber Ruhe hilft etwas.',
    },
    {
      id: 'drinking_status',
      category: 'Anamnese',
      question: 'Wie viel haben Sie heute ungefähr getrunken?',
      answer: Math.random() < 0.5
        ? 'Eher wenig, vielleicht 1 Liter bisher.'
        : 'Normal, etwa 1,5 bis 2 Liter.',
    },
    {
      id: 'functional_limit',
      category: 'Alltag',
      question: 'Was können Sie wegen der Beschwerden aktuell nicht mehr normal machen?',
      answer: painLevel >= 6
        ? 'Treppensteigen und längeres Gehen gehen aktuell kaum.'
        : 'Alltag geht, aber nur deutlich langsamer als sonst.',
    },
  ]

  return applyPsychProfile({
    painLevel,
    questions: [
      {
        id: 'chief_complaint',
        category: 'Hauptbeschwerde',
        question: 'Was führt Sie heute zu uns?',
        answer: `${patient.chiefComplaint}. ${specific.eventDescription} Ehrlich gesagt macht mir das inzwischen ziemlich Sorgen.`,
      },
      {
        id: 'symptoms',
        category: 'Symptome',
        question: 'Können Sie Ihre Beschwerden genauer beschreiben?',
        answer: `${specific.symptomDetails} Das ist wirklich unangenehm gerade.`,
      },
      {
        id: 'pain',
        category: 'Schmerzen',
        question: 'Haben Sie Schmerzen? Auf einer Skala von 0 bis 10?',
        answer: buildPainAnswer(patient, painLevel, ctx),
      },
      {
        id: 'event',
        category: 'Ereignis',
        question: 'Was war das auslösende Ereignis? Wann genau fing es an?',
        answer: specific.eventDescription,
      },
      {
        id: 'allergies',
        category: 'SAMPLERS',
        question: 'Haben Sie Allergien gegen Medikamente oder andere Stoffe?',
        answer: maybeWithCommunicationPrefix(allergies === 'Keine bekannt' ? 'Nein, keine Allergien, soweit ich weiß.' : `Ja, gegen ${allergies}. Da habe ich mal schlecht reagiert.`, patient),
      },
      {
        id: 'medications',
        category: 'SAMPLERS',
        question: 'Nehmen Sie regelmäßig Medikamente ein?',
        answer: maybeWithCommunicationPrefix(medications.includes('Keine')
          ? 'Nein, nichts Regelmäßiges. Höchstens mal was bei Bedarf.'
          : `Ja, ich nehme ${medications}. Manchmal vergesse ich aber eine Dosis.`, patient),
      },
      {
        id: 'past_history',
        category: 'SAMPLERS',
        question: 'Haben Sie Vorerkrankungen oder waren Sie schon mal im Krankenhaus?',
        answer: maybeWithCommunicationPrefix(pastHistory.includes('Keine')
          ? 'Nichts Größeres bekannt, ich war sonst eher selten im Krankenhaus.'
          : `Ja, ${pastHistory}. Das spielt vielleicht auch hier mit rein.`, patient),
      },
      {
        id: 'last_meal',
        category: 'SAMPLERS',
        question: 'Wann haben Sie zuletzt etwas gegessen oder getrunken?',
        answer: lastMeal,
      },
      {
        id: 'risk_factors',
        category: 'Risikofaktoren',
        question: 'Gibt es besondere Risikofaktoren oder familiäre Vorbelastungen?',
        answer: specific.riskFactors,
      },
      {
        id: 'additional',
        category: 'Weitere Informationen',
        question: 'Gibt es noch etwas Wichtiges, das wir wissen sollten?',
        answer: `${specific.additionalInfo} Und bitte sagen Sie mir ehrlich, wenn etwas kritisch ist.`,
      },
      {
        id: 'onset',
        category: 'Verlauf',
        question: 'Werden die Beschwerden besser, schlechter oder bleiben sie gleich?',
        answer: painLevel >= 6
          ? 'Es wird eher schlimmer. Am Anfang war es noch auszuhalten, aber jetzt...'
          : painLevel >= 3
          ? 'Mal besser, mal schlechter. Aber insgesamt gleichbleibend.'
          : 'Es ist relativ konstant. Nicht schlimmer, aber auch nicht besser.',
      },
      ...randomPickMany(extraTriageQuestions, 10),
    ],
    allergies,
    medications,
    pastHistory,
    lastMeal,
  }, patient)
}
