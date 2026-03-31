export const ICD10_DIAGNOSES = [
  // Kardiologie / Kreislauf
  { code: 'I10', name: 'Essentielle Hypertonie', tags: ['hypertonie', 'blutdruck', 'kardio'] },
  { code: 'I20.0', name: 'Instabile Angina pectoris', tags: ['brustschmerz', 'thoraxschmerz', 'angina'] },
  { code: 'I21.0', name: 'Akuter transmuraler Myokardinfarkt der Vorderwand', tags: ['brustschmerz', 'myokard', 'stemi'] },
  { code: 'I21.9', name: 'Akuter Myokardinfarkt, nicht näher bezeichnet', tags: ['infarkt', 'brustschmerz'] },
  { code: 'I24.9', name: 'Akute ischämische Herzkrankheit, nicht näher bezeichnet', tags: ['ischämie', 'herz'] },
  { code: 'I25.10', name: 'Atherosklerotische Herzkrankheit', tags: ['koronar', 'kardio'] },
  { code: 'I47.1', name: 'Supraventrikuläre Tachykardie', tags: ['tachykardie', 'herzrasen'] },
  { code: 'I48.0', name: 'Vorhofflimmern, paroxysmal', tags: ['palpitation', 'arrhythmie', 'herzrasen'] },
  { code: 'I48.1', name: 'Vorhofflimmern, persistierend', tags: ['arrhythmie', 'vorhofflimmern'] },
  { code: 'I49.9', name: 'Herzrhythmusstörung, nicht näher bezeichnet', tags: ['arrhythmie'] },
  { code: 'I44.0', name: 'AV-Block I. Grades', tags: ['av-block', 'bradykardie', 'ekg', 'kardio'] },
  { code: 'I44.1', name: 'AV-Block II. Grades, Typ Mobitz I (Wenckebach)', tags: ['av-block', 'mobitz', 'wenckebach', 'ekg'] },
  { code: 'I44.2', name: 'AV-Block II. Grades, sonstiger und nicht näher bezeichneter Typ', tags: ['av-block', 'mobitz II', 'ekg'] },
  { code: 'I44.3', name: 'AV-Block III. Grades (totaler AV-Block)', tags: ['av-block', 'totaler av-block', 'ekg'] },
  { code: 'I45.0', name: 'Rechtsschenkelblock', tags: ['schenkelblock', 'rsb', 'ekg', 'kardio'] },
  { code: 'I45.1', name: 'Linksschenkelblock, nicht näher bezeichnet', tags: ['schenkelblock', 'lsb', 'ekg'] },
  { code: 'I45.2', name: 'Bifaszikulärer Block', tags: ['schenkelblock', 'bifaszikulär', 'ekg'] },
  { code: 'I45.3', name: 'Bifaszikulärer Block und Linksschenkelblock, nicht näher bezeichnet', tags: ['schenkelblock', 'hemiblock', 'ekg'] },
  { code: 'I50.9', name: 'Herzinsuffizienz, nicht näher bezeichnet', tags: ['dyspnoe', 'ödem', 'herzinsuffizienz'] },
  { code: 'I50.1', name: 'Linksherzinsuffizienz', tags: ['herzinsuffizienz', 'dyspnoe', 'lungenstauung'] },
  { code: 'I26.9', name: 'Lungenembolie ohne Angabe eines akuten Cor pulmonale', tags: ['embolie', 'dyspnoe', 'thoraxschmerz'] },
  { code: 'I95.9', name: 'Hypotonie, nicht näher bezeichnet', tags: ['hypotonie', 'kollaps'] },

  // Neurologie
  { code: 'G40.9', name: 'Epilepsie, nicht näher bezeichnet', tags: ['krampfanfall', 'epilepsie'] },
  { code: 'G43.9', name: 'Migräne, nicht näher bezeichnet', tags: ['kopfschmerz', 'migräne'] },
  { code: 'G44.2', name: 'Spannungskopfschmerz', tags: ['kopfschmerz'] },
  { code: 'I63.9', name: 'Zerebraler Infarkt, nicht näher bezeichnet', tags: ['schlaganfall', 'hemiparese', 'aphasie'] },
  { code: 'I61.9', name: 'Intrazerebrale Blutung, nicht näher bezeichnet', tags: ['hirnblutung', 'neurologie'] },
  { code: 'G45.9', name: 'Transitorische zerebrale Ischämie, nicht näher bezeichnet', tags: ['tia', 'neurologie'] },
  { code: 'R47.0', name: 'Aphasie', tags: ['aphasie', 'sprache'] },
  { code: 'R42', name: 'Schwindel und Taumel', tags: ['schwindel'] },
  { code: 'H81.1', name: 'Benigner paroxysmaler Lagerungsschwindel', tags: ['schwindel', 'lagerung'] },
  { code: 'R56.8', name: 'Sonstige und nicht näher bezeichnete Krampfanfälle', tags: ['krampf', 'anfall'] },
  { code: 'R51', name: 'Kopfschmerz', tags: ['kopfschmerz'] },
  { code: 'R55', name: 'Synkope und Kollaps', tags: ['synkope', 'kollaps'] },

  // Pneumologie / Atemwege
  { code: 'J18.9', name: 'Pneumonie, nicht näher bezeichnet', tags: ['fieber', 'husten', 'dyspnoe', 'infekt'] },
  { code: 'J44.1', name: 'COPD mit akuter Exazerbation', tags: ['dyspnoe', 'husten', 'copd'] },
  { code: 'J45.9', name: 'Asthma bronchiale, nicht näher bezeichnet', tags: ['dyspnoe', 'giemen', 'asthma'] },
  { code: 'J96.0', name: 'Akute respiratorische Insuffizienz', tags: ['dyspnoe', 'hypoxie', 'atemnot'] },
  { code: 'J20.9', name: 'Akute Bronchitis, nicht näher bezeichnet', tags: ['husten', 'bronchitis'] },
  { code: 'J06.9', name: 'Akute Infektion der oberen Atemwege, nicht näher bezeichnet', tags: ['husten', 'erkältung'] },
  { code: 'J02.9', name: 'Akute Pharyngitis, nicht näher bezeichnet', tags: ['halsschmerz', 'schluckbeschwerden'] },
  { code: 'J03.9', name: 'Akute Tonsillitis, nicht näher bezeichnet', tags: ['tonsillitis', 'halsschmerz'] },
  { code: 'J10.1', name: 'Influenza mit sonstigen respiratorischen Manifestationen', tags: ['influenza', 'fieber', 'husten'] },
  { code: 'R06.0', name: 'Dyspnoe', tags: ['dyspnoe', 'atemnot'] },

  // Gastroenterologie / Abdomen
  { code: 'K35.8', name: 'Akute Appendizitis, sonstige', tags: ['bauchschmerz', 'rechter unterbauch', 'appendix'] },
  { code: 'K35.9', name: 'Akute Appendizitis, nicht näher bezeichnet', tags: ['appendizitis'] },
  { code: 'K80.2', name: 'Gallenblasenstein ohne Cholezystitis', tags: ['kolik', 'rechter oberbauch', 'galle'] },
  { code: 'K81.0', name: 'Akute Cholezystitis', tags: ['oberbauch', 'galle'] },
  { code: 'K85.9', name: 'Akute Pankreatitis, nicht näher bezeichnet', tags: ['oberbauchschmerz', 'pankreas'] },
  { code: 'K52.9', name: 'Nichtinfektiöse Gastroenteritis und Kolitis, nicht näher bezeichnet', tags: ['durchfall', 'erbrechen'] },
  { code: 'K56.6', name: 'Sonstiger und nicht näher bezeichneter Ileus', tags: ['ileus', 'abdomen'] },
  { code: 'K57.3', name: 'Divertikelkrankheit des Dickdarms ohne Perforation/Abszess', tags: ['divertikulitis', 'bauch'] },
  { code: 'K92.2', name: 'Gastrointestinale Blutung, nicht näher bezeichnet', tags: ['blutung', 'gastro'] },
  { code: 'R10.0', name: 'Akutes Abdomen', tags: ['akutes abdomen', 'bauchschmerz'] },
  { code: 'R10.3', name: 'Schmerz im Unterbauch', tags: ['unterbauchschmerz'] },
  { code: 'R10.4', name: 'Sonstige und nicht näher bezeichnete Bauchschmerzen', tags: ['bauchschmerz'] },
  { code: 'R11', name: 'Übelkeit und Erbrechen', tags: ['übelkeit', 'erbrechen'] },
  { code: 'R19.7', name: 'Diarrhoe, nicht näher bezeichnet', tags: ['durchfall'] },

  // Urologie / Nephrologie
  { code: 'N39.0', name: 'Harnwegsinfekt, nicht näher bezeichnet', tags: ['dysurie', 'harnwegsinfekt'] },
  { code: 'N10', name: 'Akute tubulointerstitielle Nephritis (Pyelonephritis)', tags: ['pyelonephritis', 'flankenschmerz', 'fieber'] },
  { code: 'N17.9', name: 'Akutes Nierenversagen, nicht näher bezeichnet', tags: ['nierenversagen', 'kreatinin'] },
  { code: 'N20.0', name: 'Nierenstein', tags: ['kolik', 'urologie'] },
  { code: 'N20.1', name: 'Harnleiterstein', tags: ['ureterstein', 'kolik', 'flankenschmerz'] },
  { code: 'N13.2', name: 'Hydronephrose mit Harnleiterobstruktion durch Stein', tags: ['kolik', 'hydronephrose'] },
  { code: 'N30.0', name: 'Akute Zystitis', tags: ['harnwegsinfekt', 'zystitis'] },
  { code: 'R30.0', name: 'Dysurie', tags: ['dysurie', 'schmerzen wasserlassen'] },
  { code: 'R33', name: 'Harnverhalt', tags: ['harnverhalt'] },

  // Endokrinologie / Stoffwechsel
  { code: 'E11.65', name: 'Diabetes mellitus Typ 2 mit Hyperglykämie', tags: ['hyperglykämie', 'diabetes'] },
  { code: 'E10.65', name: 'Diabetes mellitus Typ 1 mit Hyperglykämie', tags: ['diabetes'] },
  { code: 'E16.2', name: 'Hypoglykämie, nicht näher bezeichnet', tags: ['hypoglykämie', 'schweiß'] },
  { code: 'E86', name: 'Volumenmangel', tags: ['dehydratation'] },
  { code: 'E87.1', name: 'Hypoosmolalität und Hyponatriämie', tags: ['hyponatriämie'] },
  { code: 'E87.5', name: 'Hyperkaliämie', tags: ['hyperkaliämie'] },
  { code: 'E87.6', name: 'Hypokaliämie', tags: ['hypokaliämie'] },
  { code: 'E03.9', name: 'Hypothyreose, nicht näher bezeichnet', tags: ['hypothyreose'] },
  { code: 'E05.9', name: 'Hyperthyreose, nicht näher bezeichnet', tags: ['hyperthyreose'] },

  // Infektiologie / Sepsis
  { code: 'A41.9', name: 'Sepsis, nicht näher bezeichnet', tags: ['sepsis', 'fieber', 'hypotonie'] },
  { code: 'A09.9', name: 'Infektiöse Gastroenteritis und Kolitis, nicht näher bezeichnet', tags: ['gastroenteritis', 'durchfall'] },
  { code: 'B34.9', name: 'Virusinfektion, nicht näher bezeichnet', tags: ['virus', 'fieber'] },
  { code: 'U07.1', name: 'COVID-19, Virus nachgewiesen', tags: ['covid', 'fieber', 'husten'] },
  { code: 'U07.2', name: 'COVID-19, Virus nicht nachgewiesen', tags: ['covid'] },

  // Trauma / Chirurgie / Orthopädie
  { code: 'T07', name: 'Multiple Verletzungen, nicht näher bezeichnet', tags: ['polytrauma', 'unfall'] },
  { code: 'S06.0', name: 'Gehirnerschütterung', tags: ['kopf', 'trauma', 'sturz'] },
  { code: 'S06.5', name: 'Traumatische subdurale Blutung', tags: ['schädelhirntrauma'] },
  { code: 'S01.0', name: 'Offene Wunde der Kopfhaut', tags: ['kopfplatzwunde', 'kopfwunde', 'platzwunde', 'offene kopfwunde'] },
  { code: 'S01.9', name: 'Offene Wunde des Kopfes, nicht näher bezeichnet', tags: ['platzwunde', 'kopfwunde', 'offene kopfwunde'] },
  { code: 'S09.9', name: 'Nicht näher bezeichnete Verletzung des Kopfes', tags: ['kopfverletzung'] },
  { code: 'S12.9', name: 'Fraktur des Halses, nicht näher bezeichnet', tags: ['hws', 'fraktur'] },
  { code: 'S22.3', name: 'Fraktur einer Rippe', tags: ['rippenfraktur', 'thorax'] },
  { code: 'S32.8', name: 'Fraktur sonstiger Teile des Beckens', tags: ['beckenfraktur'] },
  { code: 'S39.0', name: 'Verstauchung/Zerrung der Lendenwirbelsäule', tags: ['rückenschmerz', 'sturz'] },
  { code: 'S42.2', name: 'Fraktur des proximalen Endes des Humerus', tags: ['humerusfraktur'] },
  { code: 'S52.5', name: 'Fraktur des distalen Radius', tags: ['radiusfraktur'] },
  { code: 'S51.8', name: 'Offene Verletzung des Unterarms, sonstige', tags: ['schnittwunde', 'unterarm'] },
  { code: 'S61.2', name: 'Offene Wunde eines oder mehrerer Finger mit Nagelschädigung', tags: ['schnittverletzung', 'finger', 'hand'] },
  { code: 'S43.0', name: 'Luxation des Schultergelenkes', tags: ['schulterluxation', 'schulter', 'luxation'] },
  { code: 'S72.0', name: 'Fraktur des Schenkelhalses', tags: ['fraktur', 'hüfte'] },
  { code: 'S82.2', name: 'Fraktur des Tibiaschaftes', tags: ['tibia', 'unterschenkelfraktur', 'fraktur'] },
  { code: 'S82.8', name: 'Fraktur sonstiger Teile des Unterschenkels', tags: ['fraktur', 'bein'] },
  { code: 'S83.5', name: 'Verletzung des Kreuzbandes des Kniegelenks', tags: ['knie', 'kreuzband'] },
  { code: 'T14.1', name: 'Offene Wunde einer nicht näher bezeichneten Körperregion', tags: ['wunde', 'verletzung'] },
  { code: 'T81.4', name: 'Infektion nach einem Eingriff, anderenorts nicht klassifiziert', tags: ['postoperativ', 'wundinfektion', 'infektion'] },
  { code: 'T78.2', name: 'Anaphylaktischer Schock, nicht näher bezeichnet', tags: ['anaphylaxie', 'allergie', 'wespenstich'] },
  { code: 'L50.0', name: 'Allergische Urtikaria', tags: ['urtikaria', 'allergie'] },
  { code: 'L50.9', name: 'Urtikaria, nicht näher bezeichnet', tags: ['urtikaria', 'ausschlag'] },
  { code: 'L29.9', name: 'Pruritus, nicht näher bezeichnet', tags: ['juckreiz'] },
  { code: 'T63.4', name: 'Toxische Wirkung durch Kontakt mit sonstigen Arthropoden', tags: ['insektenstich', 'wespe'] },

  // Psychiatrie
  { code: 'F41.0', name: 'Panikstörung [episodisch paroxysmale Angst]', tags: ['angst', 'panik', 'hyperventilation'] },
  { code: 'F41.1', name: 'Generalisierte Angststörung', tags: ['angst'] },
  { code: 'F32.9', name: 'Depressive Episode, nicht näher bezeichnet', tags: ['depression'] },
  { code: 'F10.1', name: 'Schädlicher Gebrauch von Alkohol', tags: ['alkohol'] },
  { code: 'F10.2', name: 'Abhängigkeitssyndrom durch Alkohol', tags: ['alkoholabhängigkeit'] },

  // HNO / Augen
  { code: 'H53.1', name: 'Subjektive Sehstörungen', tags: ['sehstörung', 'auge'] },
  { code: 'H53.4', name: 'Gesichtsfeldausfälle', tags: ['gesichtsfeldausfall'] },
  { code: 'H54.4', name: 'Blindheit eines Auges', tags: ['visus'] },
  { code: 'H66.9', name: 'Otitis media, nicht näher bezeichnet', tags: ['ohrenschmerzen'] },
  { code: 'H60.9', name: 'Otitis externa, nicht näher bezeichnet', tags: ['otitis'] },
  { code: 'R13', name: 'Dysphagie', tags: ['schluckstörung', 'dysphagie'] },

  // Gyn / Geburt (ausgewählte, notfallrelevante)
  { code: 'O20.0', name: 'Drohender Abort', tags: ['schwangerschaft', 'blutung'] },
  { code: 'O26.9', name: 'Schwangerschaftsbedingter Zustand, nicht näher bezeichnet', tags: ['schwangerschaft'] },
  { code: 'N93.9', name: 'Abnorme Uterus-/Vaginalblutung, nicht näher bezeichnet', tags: ['vaginalblutung'] },

  // Allgemeine Symptome / unspezifisch
  { code: 'R00.2', name: 'Palpitationen', tags: ['palpitation', 'herzrasen'] },
  { code: 'R03.0', name: 'Erhöhter Blutdruckwert ohne Hypertoniediagnose', tags: ['blutdruck'] },
  { code: 'R04.2', name: 'Hämoptyse', tags: ['bluthusten'] },
  { code: 'R05', name: 'Husten', tags: ['husten'] },
  { code: 'R06.2', name: 'Giemen', tags: ['giemen'] },
  { code: 'R07.4', name: 'Thoraxschmerz, nicht näher bezeichnet', tags: ['brustschmerz', 'thoraxschmerz'] },
  { code: 'R09.2', name: 'Atemstillstand', tags: ['atemstillstand'] },
  { code: 'R10.9', name: 'Bauch- und Beckenschmerz, nicht näher bezeichnet', tags: ['bauchschmerz'] },
  { code: 'R19.5', name: 'Sonstige anormale Ergebnisse der Stuhluntersuchung', tags: ['stuhl'] },
  { code: 'R22.4', name: 'Lokalisierte Schwellung am unteren Extremität', tags: ['schwellung'] },
  { code: 'R31', name: 'Hämaturie, nicht näher bezeichnet', tags: ['hämaturie'] },
  { code: 'R40.0', name: 'Somnolenz', tags: ['somnolenz'] },
  { code: 'R41.0', name: 'Desorientiertheit', tags: ['desorientierung'] },
  { code: 'R45.0', name: 'Nervosität', tags: ['nervosität'] },
  { code: 'R50.9', name: 'Fieber, nicht näher bezeichnet', tags: ['fieber'] },
  { code: 'R52.9', name: 'Schmerz, nicht näher bezeichnet', tags: ['schmerz'] },
  { code: 'R53', name: 'Unwohlsein und Ermüdung', tags: ['müdigkeit', 'fatigue'] },
  { code: 'R57.9', name: 'Schock, nicht näher bezeichnet', tags: ['schock'] },
  { code: 'R63.4', name: 'Abnormer Gewichtsverlust', tags: ['gewichtsverlust'] },
  { code: 'R69', name: 'Unbekannte und nicht näher bezeichnete Krankheitsursachen', tags: ['unspezifisch'] },

  // Hämatologie/Onkologie (ausgewählte)
  { code: 'D50.9', name: 'Eisenmangelanämie, nicht näher bezeichnet', tags: ['anämie'] },
  { code: 'D64.9', name: 'Anämie, nicht näher bezeichnet', tags: ['anämie'] },
  { code: 'C34.9', name: 'Bösartige Neubildung der Bronchien/Lunge, nicht näher bezeichnet', tags: ['lungenkarzinom', 'tumor'] },
  { code: 'C18.9', name: 'Bösartige Neubildung des Kolons, nicht näher bezeichnet', tags: ['tumor', 'colon'] },

  // Zusätzliche häufige ICD-10 Einträge (breitere Auswahl)
  { code: 'I11.9', name: 'Hypertensive Herzkrankheit ohne Herzinsuffizienz', tags: ['hypertonie', 'herz'] },
  { code: 'I25.2', name: 'Alter Myokardinfarkt', tags: ['kardio', 'infarkt'] },
  { code: 'I27.2', name: 'Sonstige sekundäre pulmonale Hypertonie', tags: ['dyspnoe', 'pulmonal'] },
  { code: 'I35.0', name: 'Aortenklappenstenose', tags: ['herzklappe', 'synkope'] },
  { code: 'I42.9', name: 'Kardiomyopathie, nicht näher bezeichnet', tags: ['kardiomyopathie'] },
  { code: 'I71.4', name: 'Aortenaneurysma abdominal, ohne Ruptur', tags: ['aneurysma', 'abdomen'] },
  { code: 'I80.2', name: 'Phlebitis und Thrombophlebitis sonstiger tiefer Gefäße der unteren Extremitäten', tags: ['thrombose', 'bein'] },
  { code: 'G20', name: 'Morbus Parkinson', tags: ['parkinson', 'neurologie'] },
  { code: 'G25.3', name: 'Myoklonus', tags: ['neurologie', 'zucken'] },
  { code: 'G35', name: 'Multiple Sklerose', tags: ['ms', 'neurologie'] },
  { code: 'G47.3', name: 'Schlafapnoe', tags: ['schlafapnoe'] },
  { code: 'G93.4', name: 'Enzephalopathie, nicht näher bezeichnet', tags: ['neurologie', 'verwirrtheit'] },
  { code: 'J12.9', name: 'Viruspneumonie, nicht näher bezeichnet', tags: ['pneumonie', 'virus'] },
  { code: 'J15.9', name: 'Bakterielle Pneumonie, nicht näher bezeichnet', tags: ['pneumonie', 'bakteriell'] },
  { code: 'J44.9', name: 'COPD, nicht näher bezeichnet', tags: ['copd', 'atemnot'] },
  { code: 'J69.0', name: 'Pneumonitis durch Nahrung und Erbrochenes', tags: ['aspiration', 'pneumonie'] },
  { code: 'K21.9', name: 'Gastroösophageale Refluxkrankheit ohne Ösophagitis', tags: ['reflux', 'sodbrennen'] },
  { code: 'K25.9', name: 'Ulcus ventriculi, nicht näher bezeichnet', tags: ['ulcus', 'magen'] },
  { code: 'K25.1', name: 'Akutes Ulcus ventriculi mit Perforation', tags: ['perforation', 'ulcus', 'akutes abdomen'] },
  { code: 'K29.7', name: 'Gastritis, nicht näher bezeichnet', tags: ['gastritis', 'magen'] },
  { code: 'K40.9', name: 'Leistenhernie, einseitig oder ohne Seitenangabe, ohne Gangrän', tags: ['hernie'] },
  { code: 'K40.3', name: 'Einseitige oder nicht näher bezeichnete Leistenhernie mit Inkarzeration, ohne Gangrän', tags: ['inkarzerierte hernie', 'leistenhernie', 'ileus'] },
  { code: 'K59.0', name: 'Obstipation', tags: ['verstopfung'] },
  { code: 'K60.2', name: 'Analfissur, nicht näher bezeichnet', tags: ['proktologie'] },
  { code: 'K62.5', name: 'Hämorrhagie des Anus und Rektums', tags: ['rektalblutung'] },
  { code: 'N18.9', name: 'Chronische Nierenkrankheit, nicht näher bezeichnet', tags: ['ckd', 'niere'] },
  { code: 'N23', name: 'Nierenkolik, nicht näher bezeichnet', tags: ['kolik', 'niere'] },
  { code: 'N40', name: 'Hyperplasie der Prostata', tags: ['prostata', 'harnverhalt'] },
  { code: 'N41.9', name: 'Entzündliche Krankheit der Prostata, nicht näher bezeichnet', tags: ['prostata'] },
  { code: 'E11.9', name: 'Diabetes mellitus Typ 2 ohne Komplikationen', tags: ['diabetes'] },
  { code: 'E10.9', name: 'Diabetes mellitus Typ 1 ohne Komplikationen', tags: ['diabetes'] },
  { code: 'E66.9', name: 'Adipositas, nicht näher bezeichnet', tags: ['adipositas'] },
  { code: 'E78.5', name: 'Hyperlipidämie, nicht näher bezeichnet', tags: ['lipide'] },
  { code: 'A46', name: 'Erysipel', tags: ['hautinfektion', 'fieber'] },
  { code: 'A49.9', name: 'Bakterielle Infektion, nicht näher bezeichnet', tags: ['infektion'] },
  { code: 'B37.0', name: 'Stomatitis durch Candida', tags: ['candida'] },
  { code: 'L02.9', name: 'Kutane Abszess, Furunkel und Karbunkel, nicht näher bezeichnet', tags: ['abszess'] },
  { code: 'L03.1', name: 'Cellulitis der sonstigen Teile der Extremitäten', tags: ['cellulitis'] },
  { code: 'L89.9', name: 'Dekubitalgeschwür, nicht näher bezeichnet', tags: ['dekubitus'] },
  { code: 'F05.9', name: 'Delir, nicht näher bezeichnet', tags: ['delir', 'verwirrtheit'] },
  { code: 'F20.9', name: 'Schizophrenie, nicht näher bezeichnet', tags: ['psychose'] },
  { code: 'F43.0', name: 'Akute Belastungsreaktion', tags: ['stressreaktion'] },
  { code: 'F43.1', name: 'Posttraumatische Belastungsstörung', tags: ['ptbs'] },
  { code: 'H10.9', name: 'Konjunktivitis, nicht näher bezeichnet', tags: ['auge', 'konjunktivitis'] },
  { code: 'H61.2', name: 'Cerumen obturans', tags: ['ohr', 'cerumen'] },
  { code: 'H92.0', name: 'Otalgie', tags: ['ohrenschmerz'] },
  { code: 'M10.9', name: 'Gicht, nicht näher bezeichnet', tags: ['gicht', 'gelenk'] },
  { code: 'M25.5', name: 'Gelenkschmerz', tags: ['arthralgie'] },
  { code: 'M54.5', name: 'Kreuzschmerz', tags: ['lumbago', 'rueckenschmerz'] },
  { code: 'M79.6', name: 'Schmerz in den Extremitäten', tags: ['beinschmerz', 'armschmerz'] },
  { code: 'R00.0', name: 'Tachykardie, nicht näher bezeichnet', tags: ['tachykardie'] },
  { code: 'R03.1', name: 'Niedriger Blutdruckwert ohne Hypotoniediagnose', tags: ['hypotonie'] },
  { code: 'R06.4', name: 'Hyperventilation', tags: ['hyperventilation'] },
  { code: 'R21', name: 'Hautausschlag und sonstige unspezifische Hauteruption', tags: ['ausschlag'] },
  { code: 'R25.1', name: 'Tremor, nicht näher bezeichnet', tags: ['tremor'] },
  { code: 'R26.8', name: 'Sonstige und nicht näher bezeichnete Störungen des Ganges und der Mobilität', tags: ['gangstoerung'] },
  { code: 'R33.9', name: 'Harnverhalt, nicht näher bezeichnet', tags: ['harnverhalt'] },
  { code: 'R35.0', name: 'Polyurie', tags: ['polyurie'] },
  { code: 'R60.0', name: 'Lokales Ödem', tags: ['oedem'] },
  { code: 'R73.9', name: 'Hyperglykämie, nicht näher bezeichnet', tags: ['hyperglykaemie'] },
  { code: 'F10.0', name: 'Akute Alkoholintoxikation', tags: ['alkohol', 'intox', 'vergiftung', 'rausch'] },
  { code: 'F19.0', name: 'Akute Intoxikation durch multiple Substanzen', tags: ['intox', 'vergiftung', 'drogen'] },
  { code: 'T51.0', name: 'Toxische Wirkung von Ethanol', tags: ['alkoholintox', 'ethanol', 'vergiftung'] },
  { code: 'T36.9', name: 'Vergiftung durch systemisch wirkendes Antibiotikum, nicht näher bezeichnet', tags: ['vergiftung', 'intox'] },
  { code: 'T39.1', name: 'Vergiftung durch 4-Aminophenol-Derivate (Paracetamol)', tags: ['paracetamol', 'intox', 'vergiftung'] },
  { code: 'T40.2', name: 'Vergiftung durch sonstige Opioide', tags: ['opioid', 'intox', 'ueberdosis'] },
  { code: 'T42.4', name: 'Vergiftung durch Benzodiazepine', tags: ['benzo', 'intox', 'vergiftung'] },
  { code: 'T43.6', name: 'Vergiftung durch Psychostimulanzien', tags: ['amphetamin', 'kokain', 'intox'] },
  { code: 'T50.9', name: 'Vergiftung durch Arzneimittel/biologische Substanz, nicht näher bezeichnet', tags: ['intox', 'vergiftung'] },
  { code: 'X49', name: 'Akzidentelle Vergiftung durch sonstige/unspezifische Chemikalien', tags: ['chemikalie', 'vergiftung', 'intox'] },
  { code: 'S62.2', name: 'Fraktur des ersten Mittelhandknochens', tags: ['fraktur hand', 'mittelhand', 'bruch hand'] },
  { code: 'S62.3', name: 'Fraktur eines sonstigen Mittelhandknochens', tags: ['fraktur hand', 'mittelhand', 'bruch'] },
  { code: 'S62.5', name: 'Fraktur des Daumens', tags: ['daumenfraktur', 'fraktur hand'] },
  { code: 'S62.6', name: 'Fraktur eines sonstigen Fingers', tags: ['fingerfraktur', 'fraktur hand'] },
  { code: 'S62.8', name: 'Fraktur sonstiger und mehrerer Knochen der Hand', tags: ['handfraktur', 'fraktur hand', 'bruch hand'] },
  { code: 'S63.0', name: 'Luxation des Handgelenkes', tags: ['luxation', 'handgelenk'] },
  { code: 'S63.2', name: 'Luxation eines Fingers', tags: ['fingerluxation'] },
  { code: 'S60.2', name: 'Prellung sonstiger Teile des Handgelenks und der Hand', tags: ['prellung hand', 'kontusion'] },
  { code: 'S61.0', name: 'Offene Wunde eines Fingers ohne Nagelschaden', tags: ['wunde finger', 'schnitt hand'] },
  { code: 'S61.4', name: 'Offene Wunde der Handfläche', tags: ['wunde hand', 'schnittverletzung'] },
  { code: 'S52.6', name: 'Fraktur des distalen Endes von Ulna und Radius', tags: ['unterarmfraktur', 'radius ulna'] },
  { code: 'S42.4', name: 'Fraktur des distalen Endes des Humerus', tags: ['oberarmfraktur', 'ellenbogenfraktur'] },
  { code: 'S83.2', name: 'Riss des Meniskus (frisch)', tags: ['meniskus', 'knieverletzung'] },
  { code: 'S93.4', name: 'Verstauchung und Zerrung des oberen Sprunggelenkes', tags: ['osg', 'distorsion', 'knicktrauma'] },
  { code: 'S93.6', name: 'Verstauchung und Zerrung von Zehen', tags: ['zehe', 'distorsion'] },
  { code: 'S99.9', name: 'Nicht näher bezeichnete Verletzung von Sprunggelenk und Fuß', tags: ['fussverletzung', 'sprunggelenk'] },
  { code: 'T14.0', name: 'Oberflächliche Verletzung einer nicht näher bezeichneten Körperregion', tags: ['schuerfwunde', 'verletzung'] },
  { code: 'S00.8', name: 'Sonstige oberflächliche Verletzungen des Kopfes', tags: ['schuerfwunde', 'kopfverletzung', 'sturz'] },
  { code: 'T14.9', name: 'Verletzung einer nicht näher bezeichneten Körperregion, nicht näher bezeichnet', tags: ['verletzung unklar'] },
  { code: 'A08.4', name: 'Virusbedingte Darminfektion, nicht näher bezeichnet', tags: ['gastroenteritis', 'erbrechen', 'durchfall'] },
  { code: 'B37.3', name: 'Kandidose der Vulva und Vagina', tags: ['kandidose'] },
  { code: 'I48.2', name: 'Chronisches Vorhofflimmern', tags: ['vorhofflimmern', 'arrhythmie'] },
  { code: 'I49.0', name: 'Kammerflimmern und Kammerflattern', tags: ['vf', 'kammerflimmern'] },
  { code: 'I95.1', name: 'Orthostatische Hypotonie', tags: ['orthostase', 'kollaps'] },
  { code: 'I50.0', name: 'Rechtsherzinsuffizienz', tags: ['herzinsuffizienz', 'oedeme'] },
  { code: 'J44.0', name: 'COPD mit akuter Infektion der unteren Atemwege', tags: ['copd', 'infekt'] },
  { code: 'J98.0', name: 'Krankheiten der Bronchien, anderenorts nicht klassifiziert', tags: ['bronchospasmus', 'giemen'] },
  { code: 'K57.2', name: 'Divertikulitis des Dickdarms mit Perforation/Abszess', tags: ['divertikulitis', 'abdomen'] },
  { code: 'K70.3', name: 'Alkoholische Leberzirrhose', tags: ['leberzirrhose', 'alkohol'] },
  { code: 'K74.6', name: 'Sonstige und nicht näher bezeichnete Leberzirrhose', tags: ['zirrhose', 'leber'] },
  { code: 'N17.0', name: 'Akutes Nierenversagen mit tubulärer Nekrose', tags: ['akutes nierenversagen'] },
  { code: 'N39.3', name: 'Belastungsinkontinenz', tags: ['inkontinenz'] },
  { code: 'E87.2', name: 'Azidose', tags: ['azidose', 'metabolisch'] },
  { code: 'E87.3', name: 'Alkalose', tags: ['alkalose'] },
  { code: 'E83.4', name: 'Störungen des Magnesiumstoffwechsels', tags: ['magnesium', 'hypomagnesiaemie'] },
  { code: 'G93.6', name: 'Hirnödem', tags: ['hirnoedem', 'neurologie'] },
  { code: 'H66.0', name: 'Akute eitrige Otitis media', tags: ['otitis media', 'ohr'] },
  { code: 'L03.0', name: 'Cellulitis der Finger und Zehen', tags: ['cellulitis', 'finger'] },
  { code: 'M54.2', name: 'Zervikalgie', tags: ['nackenschmerz'] },
  { code: 'M75.1', name: 'Ruptur der Rotatorenmanschette', tags: ['schulter', 'ruptur'] },
  { code: 'R07.1', name: 'Thoraxschmerz beim Atmen', tags: ['thoraxschmerz', 'pleuritisch'] },
  { code: 'R11.0', name: 'Übelkeit', tags: ['uebelkeit'] },
  { code: 'R11.1', name: 'Erbrechen', tags: ['erbrechen'] },
  { code: 'R34', name: 'Anurie und Oligurie', tags: ['anurie', 'oligurie'] },
  { code: 'R58', name: 'Blutung, anderenorts nicht klassifiziert', tags: ['blutung', 'haemorrhagie'] },
  { code: 'Z99.2', name: 'Abhängigkeit von Dialyse', tags: ['dialyse'] },
  { code: 'Z51.1', name: 'Chemotherapie wegen Neoplasie', tags: ['onkologie', 'chemo'] },
  // Zusätzliche Codes aus aktiven Patienten-Templates
  { code: 'M79.81', name: 'Muskelkompartmentsyndrom', tags: ['kompartmentsyndrom', 'trauma', 'weichteil'] },
  { code: 'T20.2', name: 'Verbrennung Kopf und Hals, Tiefe nicht näher bezeichnet', tags: ['verbrennung', 'kopf', 'thermal'] },
  { code: 'T21.2', name: 'Verbrennung Rumpf, Tiefe nicht näher bezeichnet', tags: ['verbrennung', 'thorax', 'rumpf'] },
  { code: 'T22.1', name: 'Verbrennung 1. Grades Schulter und Arm', tags: ['verbrennung', 'oberflächlich', 'arm'] },
  { code: 'T22.2', name: 'Verbrennung 2. Grades Schulter und Arm', tags: ['verbrennung', 'blasen', 'arm'] },
  { code: 'T22.3', name: 'Verbrennung 3. Grades Schulter und Arm', tags: ['verbrennung', 'vollhaut', 'arm'] },
  { code: 'T23.1', name: 'Verbrennung 1. Grades der Hand und des Handgelenks', tags: ['verbrennung', 'hand', 'oberflächlich'] },
  { code: 'T23.2', name: 'Verbrennung 2. Grades der Hand und des Handgelenks', tags: ['verbrennung', 'hand', 'trauma'] },
  { code: 'T23.3', name: 'Verbrennung 3. Grades der Hand und des Handgelenks', tags: ['verbrennung', 'hand', 'tief'] },
  { code: 'T24.2', name: 'Verbrennung 2. Grades Hüftregion und untere Extremität', tags: ['verbrennung', 'bein', 'brand'] },
  { code: 'T25.2', name: 'Verbrennung 2. Grades Knöchel und Fuß', tags: ['verbrennung', 'fuß', 'brand'] },
  { code: 'T29.0', name: 'Verbrennungen mehrerer Körperregionen, oberflächlich', tags: ['verbrennung', 'polytrauma', 'brand'] },
  { code: 'T30.0', name: 'Verbrennung oberflächlicher Körperregionen, Ausmaß <10 % KOF', tags: ['verbrennung', 'kof', 'o1o'] },
  { code: 'T31.20', name: 'Verbrennung 10–19 % der Körperoberfläche', tags: ['verbrennung', 'fläche', 'schwerbrand'] },
  { code: 'S30.22', name: 'Prellung der äußeren Genitalorgane', tags: ['prellung', 'genitaltrauma'] },
  { code: 'R57.1', name: 'Hypovolämischer Schock', tags: ['schock', 'hypovolamie', 'kreislauf'] },
  { code: 'I46.9', name: 'Herzstillstand, nicht näher bezeichnet', tags: ['reanimation', 'herzstillstand'] },
  { code: 'T67.1', name: 'Hitzekollaps', tags: ['hitzekollaps', 'dehydratation', 'notfall'] },
  { code: 'T18.9', name: 'Fremdkörper im Verdauungstrakt, Teil nicht näher bezeichnet', tags: ['fremdkorper', 'ingestion'] },
  { code: 'T54.9', name: 'Toxische Wirkung einer ätzenden Substanz, nicht näher bezeichnet', tags: ['chemikalie', 'inhalation', 'vergiftung'] },
  { code: 'T88.2', name: 'Schock infolge Anästhesie', tags: ['anaphylaxie', 'schock', 'notfall'] },
  { code: 'T88.5', name: 'Sonstige Komplikationen infolge Narkose', tags: ['narkosekomplikation', 'atemweg'] },
  { code: 'T88.4', name: 'Schwierige oder fehlgeschlagene Intubation', tags: ['schwieriger atemweg', 'difficult airway', 'intubation', 'atemweg'] },
  { code: 'R52.2', name: 'Sonstiger chronischer Schmerz', tags: ['schmerz', 'akut'] },
  { code: 'J95.8', name: 'Sonstige respiratorische Komplikationen nach medizinischen Maßnahmen', tags: ['respiratorisch', 'postinterventionell'] },
  { code: 'J98.8', name: 'Sonstige näher bezeichnete Krankheiten der Atmungsorgane', tags: ['atemwege', 'respiratorisch'] },
  { code: 'J95.2', name: 'Akute pulmonale Insuffizienz nach nichtthorakaler Operation', tags: ['pulmonal', 'insuffizienz', 'postoperativ'] },
  { code: 'T88.7', name: 'Nicht näher bezeichnete unerwünschte Arzneimittelwirkung', tags: ['nebenwirkung', 'medikament'] },
  { code: 'G43.1', name: 'Migräne mit Aura', tags: ['migrane', 'neurologie', 'kopfschmerz'] },
  { code: 'G61.0', name: 'Guillain-Barré-Syndrom', tags: ['neurologie', 'paresen', 'guillain-barre'] },
]

const QUERY_SYNONYMS = {
  intox: ['vergiftung', 'intoxikation', 'toxisch', 'ueberdosis'],
  vergiftung: ['intox', 'toxisch', 'ueberdosis', 'poison'],
  fraktur: ['bruch', 'fracture', 'fissur'],
  bruch: ['fraktur', 'fracture'],
  hand: ['finger', 'daumen', 'mittelhand', 'handgelenk'],
  thorax: ['brust', 'chest'],
  dyspnoe: ['atemnot', 'luftnot'],
  atemnot: ['dyspnoe', 'luftnot'],
  alkohol: ['ethanol', 'rausch', 'alkoholintox'],
  kollaps: ['synkope', 'bewusstlosigkeit'],
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .trim()
}

function getCodeGroup(code) {
  return String(code || '').toUpperCase().trim().split('.')[0]
}

const UNIQUE_ICD10_DIAGNOSES = ICD10_DIAGNOSES.filter((entry, index, all) =>
  all.findIndex(item => item.code === entry.code) === index
)

export function searchIcd10(query) {
  const rawQuery = String(query || '').trim()
  if (!rawQuery) return UNIQUE_ICD10_DIAGNOSES
  const q = normalizeSearchText(rawQuery)
  if (!q) return UNIQUE_ICD10_DIAGNOSES
  const tokens = q.split(/\s+/).filter(Boolean)
  const expandedTokens = new Set(tokens)
  tokens.forEach((token) => {
    const syn = QUERY_SYNONYMS[token] || []
    syn.forEach(s => expandedTokens.add(normalizeSearchText(s)))
  })

  const ranked = UNIQUE_ICD10_DIAGNOSES
    .map((d) => {
      const code = normalizeSearchText(d.code)
      const name = normalizeSearchText(d.name)
      const tags = (d.tags || []).map(t => normalizeSearchText(t))
      const haystack = `${code} ${name} ${tags.join(' ')}`
      let score = 0
      if (code === q) score += 120
      else if (code.startsWith(q)) score += 80
      else if (code.includes(q)) score += 60
      if (name.startsWith(q)) score += 40
      else if (name.includes(q)) score += 25
      if (tags.some(t => t === q)) score += 30
      else if (tags.some(t => t.includes(q))) score += 15
      expandedTokens.forEach((token) => {
        if (!token || token.length < 2) return
        if (code.startsWith(token)) score += 14
        if (name.includes(token)) score += 10
        if (tags.some(t => t.includes(token))) score += 8
        if (haystack.includes(token)) score += 4
      })
      const compact = q.replace(/\s+/g, '')
      if (compact.length >= 3) {
        const compactName = name.replace(/\s+/g, '')
        if (compactName.includes(compact)) score += 10
      }
      return { d, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.d.code.localeCompare(b.d.code))

  return ranked.map(item => item.d)
}

export function evaluateDiagnosisMatch(patient, assignedDiagnoses) {
  if (!patient || !assignedDiagnoses) {
    return { plausible: false, score: 0, reason: 'Keine Diagnose oder Patientendaten gefunden.', details: null }
  }
  const hidden = patient.trueDiagnoses || {
    primary: patient?.diagnoses?.primary ? { code: patient.diagnoses.primary.code } : null,
    secondary: Array.isArray(patient?.diagnoses?.secondary) ? patient.diagnoses.secondary : [],
    chronic: Array.isArray(patient?.diagnoses?.chronic) ? patient.diagnoses.chronic : [],
  }
  if (!hidden?.primary?.code) {
    return { plausible: false, score: 0, reason: 'Kein Referenzfall hinterlegt.', details: null }
  }

  const assignedPrimary = assignedDiagnoses?.primary?.code || null
  const hiddenPrimary = hidden?.primary?.code || null
  const primaryMatch = !!assignedPrimary && (
    assignedPrimary === hiddenPrimary
    || getCodeGroup(assignedPrimary) === getCodeGroup(hiddenPrimary)
  )

  const assignedSecondary = (assignedDiagnoses?.secondary || []).map(d => d.code)
  const hiddenSecondary = (hidden?.secondary || []).map(d => d.code)
  const secondaryMatches = hiddenSecondary.filter(code =>
    assignedSecondary.includes(code)
    || assignedSecondary.some(candidate => getCodeGroup(candidate) === getCodeGroup(code))
  ).length
  const secondaryScore = hiddenSecondary.length > 0 ? Math.round((secondaryMatches / hiddenSecondary.length) * 20) : 20

  const assignedChronic = (assignedDiagnoses?.chronic || []).map(d => d.code)
  const hiddenChronic = (hidden?.chronic || []).map(d => d.code)
  const chronicMatches = hiddenChronic.filter(code =>
    assignedChronic.includes(code)
    || assignedChronic.some(candidate => getCodeGroup(candidate) === getCodeGroup(code))
  ).length
  const chronicScore = hiddenChronic.length > 0 ? Math.round((chronicMatches / hiddenChronic.length) * 15) : 15

  const score = (primaryMatch ? 65 : 0) + secondaryScore + chronicScore
  const plausible = primaryMatch

  const reason = primaryMatch
    ? 'Hauptdiagnose entspricht dem hinterlegten Fallprofil.'
    : 'Hauptdiagnose entspricht nicht dem hinterlegten Fallprofil.'

  return {
    plausible,
    score: Math.min(100, score),
    reason,
    details: {
      primaryMatch,
      hiddenPrimary,
      assignedPrimary,
      secondaryMatches,
      secondaryTotal: hiddenSecondary.length,
      chronicMatches,
      chronicTotal: hiddenChronic.length,
    },
  }
}
