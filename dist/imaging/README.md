# Imaging Assets (CT/HKL)

Lege hier die exportierten Bilddateien fuer CT/HKL ab.
Die App nutzt aktuell strukturierte Ordner je Untersuchungsregion und Befundklasse.

## CT-Ordnerstruktur

- `public/imaging/ct/kopf/gesund/`
- `public/imaging/ct/kopf/krank/`
- `public/imaging/ct/thorax/gesund/`
- `public/imaging/ct/thorax/krank/`
- `public/imaging/ct/abdomen/gesund/`
- `public/imaging/ct/abdomen/krank/`
- `public/imaging/ct/angio/gesund/`
- `public/imaging/ct/angio/krank/`

CT-Protokolle werden auf diese Ordner gemappt:
- `ct_schaedel` -> `kopf`
- `ct_thorax` -> `thorax`
- `ct_abdomen` -> `abdomen`
- `ct_angio` -> `angio`

## HKL-Ordnerstruktur

- `public/imaging/hkl/gesund/`
- `public/imaging/hkl/krank/`

## Erwartete Dateinamen (wichtig)

Pro Ordner mindestens eine dieser Dateien ablegen:
- `slice-001.png` (empfohlen)
- optional zusaetzlich `slice-002.png`, `slice-003.png`
- alternativ gehen auch `.jpg` oder `.webp` mit identischem Namen

Wenn die Dateinamen anders sind, zeigt die App einen Platzhalter.

## Hinweis zu DICOM (.dcm)

Webbrowser koennen `.dcm` nicht direkt als normales `<img>` anzeigen.
Deshalb ist im Projekt ein Konverter enthalten:
- `tools/convert_dicom_series.py`

### 1) Rohdaten ablegen

Lege DICOMs in diese Quellstruktur:

- `imaging-source/ct/kopf/gesund/*.dcm`
- `imaging-source/ct/kopf/krank/*.dcm`
- `imaging-source/ct/thorax/gesund/*.dcm`
- `imaging-source/ct/thorax/krank/*.dcm`
- `imaging-source/ct/abdomen/gesund/*.dcm`
- `imaging-source/ct/abdomen/krank/*.dcm`
- `imaging-source/ct/angio/gesund/*.dcm`
- `imaging-source/ct/angio/krank/*.dcm`
- `imaging-source/hkl/gesund/*.dcm`
- `imaging-source/hkl/krank/*.dcm`

### 2) Konvertierung starten

```powershell
pip install pydicom numpy pillow
python tools/convert_dicom_series.py --source imaging-source --target public/imaging
```

Der Konverter schreibt standardmaessig alle Slices als:
- `slice-001.png`, `slice-002.png`, ...
- plus `manifest.json` pro Zielordner

Optional auf weniger Slices begrenzen:

```powershell
python tools/convert_dicom_series.py --source imaging-source --target public/imaging --max-slices 40
```

## Synthetische CT-Pathologien aus gesunden Serien erzeugen

Wenn nur gesunde CT-Serien vorliegen, kannst du fuer Demo-/Trainingszwecke synthetische pathologische Varianten generieren:

```powershell
python tools/generate_ct_pathologies.py --imaging-root public/imaging
```

Der Generator erstellt pro Region mehrere Presets unter:

- `public/imaging/ct/kopf/krank/bleed/`
- `public/imaging/ct/kopf/krank/ischemia/`
- `public/imaging/ct/thorax/krank/pneumonia/`
- `public/imaging/ct/thorax/krank/pneumothorax/`
- `public/imaging/ct/abdomen/krank/appendicitis/`
- `public/imaging/ct/abdomen/krank/pancreatitis/`
- `public/imaging/ct/abdomen/krank/ileus/`

Hinweis:
- Diese Daten sind kuenstlich erzeugt und nicht diagnostisch validiert.
- Ausschliesslich fuer Demonstration, UI-/Gameplay-Tests und Lernzwecke nutzen.

Wichtig:
- nur vollstaendig anonymisierte DICOM-Daten verwenden
- keine Namen, IDs, Geburtsdaten oder Study-UIDs mit Personenbezug
