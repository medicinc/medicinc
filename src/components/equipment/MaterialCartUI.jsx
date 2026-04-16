import { useEffect, useMemo, useRef, useState } from 'react'
import { Beaker, Droplets, TestTube2, ShieldPlus, CheckCircle2, Thermometer, Scissors, Syringe, XCircle, ChevronRight, MousePointer2, Check } from 'lucide-react'
import armAsset from '../../assets/phlebotomy/arm.png'
import armFemaleAsset from '../../assets/phlebotomy/arm-female.png'
import armWithTourniquetAsset from '../../assets/phlebotomy/arm-with-tourniquet.png'
import disinfectantAsset from '../../assets/phlebotomy/disinfectant.png'
import tourniquetAsset from '../../assets/phlebotomy/tourniquet.png'
import swabAsset from '../../assets/phlebotomy/swab.png'
import viggo14gAsset from '../../assets/access/viggo-14g.png'
import viggo16gAsset from '../../assets/access/viggo-16g.png'
import viggo18gAsset from '../../assets/access/viggo-18g.png'
import viggo20gAsset from '../../assets/access/viggo-20g.png'
import viggo22gAsset from '../../assets/access/viggo-22g.png'
import accessPlasterAsset from '../../assets/access/access-plaster.png'
import woundRegionHeadAsset from '../../assets/surgery/wound-region-head.svg'
import woundRegionArmAsset from '../../assets/surgery/wound-region-arm.svg'
import woundRegionLegAsset from '../../assets/surgery/wound-region-leg.svg'
import woundRegionAbdomenAsset from '../../assets/surgery/wound-region-abdomen.svg'
import woundRegionHeadStage1Asset from '../../assets/surgery/wound-region-head-stage1.svg'
import woundRegionHeadStage2Asset from '../../assets/surgery/wound-region-head-stage2.svg'
import woundRegionHeadStage3Asset from '../../assets/surgery/wound-region-head-stage3.svg'
import woundRegionArmStage1Asset from '../../assets/surgery/wound-region-arm-stage1.svg'
import woundRegionArmStage2Asset from '../../assets/surgery/wound-region-arm-stage2.svg'
import woundRegionArmStage3Asset from '../../assets/surgery/wound-region-arm-stage3.svg'
import woundRegionLegStage1Asset from '../../assets/surgery/wound-region-leg-stage1.svg'
import woundRegionLegStage2Asset from '../../assets/surgery/wound-region-leg-stage2.svg'
import woundRegionLegStage3Asset from '../../assets/surgery/wound-region-leg-stage3.svg'
import woundRegionAbdomenStage1Asset from '../../assets/surgery/wound-region-abdomen-stage1.svg'
import woundRegionAbdomenStage2Asset from '../../assets/surgery/wound-region-abdomen-stage2.svg'
import woundRegionAbdomenStage3Asset from '../../assets/surgery/wound-region-abdomen-stage3.svg'
import fractureArmClosedAsset from '../../assets/surgery/fracture-arm-closed.svg'
import fractureLegClosedAsset from '../../assets/surgery/fracture-leg-closed.svg'
import toolIrrigationAsset from '../../assets/surgery/tool-irrigation.svg'
import toolSutureAsset from '../../assets/surgery/tool-suture.svg'
import toolBandageAsset from '../../assets/surgery/tool-bandage.svg'
import toolForcepsAsset from '../../assets/surgery/tool-needle-driver-real.png'
import toolNeedleDriverAsset from '../../assets/surgery/tool-forceps-real.png'
import toolSplintAsset from '../../assets/surgery/tool-splint.svg'
import toolCastAsset from '../../assets/surgery/tool-cast.svg'
import debridementFragmentAsset from '../../assets/surgery/debridement-fragment.svg'
import debridementContainerAsset from '../../assets/surgery/debridement-container.svg'
import cursorIrrigationAsset from '../../assets/surgery/cursor-irrigation.svg'
import cursorForcepsAsset from '../../assets/surgery/tool-needle-driver-real.png'
import cursorNeedleDriverAsset from '../../assets/surgery/tool-forceps-real.png'
import cursorThreadAsset from '../../assets/surgery/cursor-thread.svg'
import cursorBandageAsset from '../../assets/surgery/cursor-bandage.svg'
import spraySound from '../../assets/sfx/spray.mp3'
import { playOneShot } from '../../utils/soundManager'

const BASE_ITEMS = [
  { id: 'infusion_nacl', label: 'NaCl 0.9% 500 ml', volume: 500, category: 'infusion' },
  { id: 'infusion_ringer', label: 'Ringer 500 ml', volume: 500, category: 'infusion' },
  { id: 'infusion_glucose5', label: 'Glucose 5% 500 ml', volume: 500, category: 'infusion' },
  { id: 'transfusion_ek', label: 'EK 1 Konserve', volume: 280, category: 'transfusion' },
  { id: 'transfusion_ffp', label: 'FFP 1 Konserve', volume: 250, category: 'transfusion' },
]
const STOCK_ID_BY_ITEM = {
  infusion_nacl: 'nacl09',
  infusion_ringer: 'ringer',
  infusion_glucose5: 'glucose5',
  transfusion_ek: 'transfusion_ek',
  transfusion_ffp: 'transfusion_ffp',
}

const ACCESS_TYPES = [
  { id: 'pvk_14g', label: 'PVK 14G', gauge: '14G', hint: 'großlumig', color: 'bg-orange-500 border-orange-600 text-white' },
  { id: 'pvk_16g', label: 'PVK 16G', gauge: '16G', hint: 'großlumig', color: 'bg-gray-500 border-gray-600 text-white' },
  { id: 'pvk_18g', label: 'PVK 18G', gauge: '18G', hint: 'standard', color: 'bg-green-500 border-green-600 text-white' },
  { id: 'pvk_20g', label: 'PVK 20G', gauge: '20G', hint: 'feiner', color: 'bg-pink-500 border-pink-600 text-white' },
  { id: 'pvk_22g', label: 'PVK 22G', gauge: '22G', hint: 'sehr fein', color: 'bg-sky-500 border-sky-600 text-white' },
]

const MAX_RATE_BY_GAUGE = {
  '14G': 3600,
  '16G': 1800,
  '18G': 900,
  '20G': 360,
  '22G': 180,
}

const ACCESS_SITES = [
  { id: 'ellenbeuge_links', label: 'Ellenbeuge links', x: 50, y: 47, r: 11 },
  { id: 'ellenbeuge_rechts', label: 'Ellenbeuge rechts', x: 50, y: 47, r: 11 },
  { id: 'unterarm_links', label: 'Unterarm links', x: 50, y: 60, r: 11 },
  { id: 'unterarm_rechts', label: 'Unterarm rechts', x: 50, y: 60, r: 11 },
  { id: 'handruecken_links', label: 'Handrücken links', x: 49, y: 82, r: 10 },
  { id: 'handruecken_rechts', label: 'Handrücken rechts', x: 49, y: 82, r: 10 },
]

const ACCESS_GAME_TARGETS = {
  punctureBySiteId: Object.fromEntries(
    ACCESS_SITES.map((site) => [site.id, { x: site.x, y: site.y, r: site.r || 10 }])
  ),
  upperArmBySide: {
    left: { x: 50, y: 34, r: 16 },
    right: { x: 50, y: 34, r: 16 },
  },
}

const ACCESS_GAME_CHECKLIST = [
  { id: 'dis1', label: '1) Desinfizieren' },
  { id: 'swab', label: '2) Wischen' },
  { id: 'dis2', label: '3) Erneut desinfizieren' },
  { id: 'tourniquetOn', label: '4) Stauen (flexibel auch früher)' },
  { id: 'viggo', label: '5) Viggo legen' },
  { id: 'tourniquetOff', label: '6) Stauschlauch ab' },
  { id: 'plaster', label: '7) Pflaster drauf' },
]

const ACCESS_OVERLAY_TUNING = {
  // Use scale as primary control (safe + easier).
  // 1.0 = default size; values are clamped to avoid giant overlays.
  viggoScale: 0.9,
  viggoBaseWidth: 128,
  viggoBaseHeight: 92,
  viggoTranslateXPercentLeft: -45,
  viggoTranslateYPercentLeft: -25,
  viggoTranslateXPercentRight: -55,
  viggoTranslateYPercentRight: -25,
  viggoRotationRightDeg: -110,
  viggoRotationLeftDeg: 110,
  plasterWidth: 76,
  plasterHeight: 76,
  plasterTranslateXPercent: -50,
  plasterTranslateYPercent: -50,
  plasterRotationRightDeg: 25,
  plasterRotationLeftDeg: -25,
}

const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const SURGICAL_WOUND_GRAPHICS = {
  Kopf: woundRegionHeadAsset,
  Arm: woundRegionArmAsset,
  'Bein/Becken': woundRegionLegAsset,
  'Abdomen/Leiste': woundRegionAbdomenAsset,
  'Betroffene Region': woundRegionAbdomenAsset,
}
const SURGICAL_WOUND_STAGE_GRAPHICS = {
  Kopf: [woundRegionHeadAsset, woundRegionHeadStage1Asset, woundRegionHeadStage2Asset, woundRegionHeadStage3Asset],
  Arm: [woundRegionArmAsset, woundRegionArmStage1Asset, woundRegionArmStage2Asset, woundRegionArmStage3Asset],
  'Bein/Becken': [woundRegionLegAsset, woundRegionLegStage1Asset, woundRegionLegStage2Asset, woundRegionLegStage3Asset],
  'Abdomen/Leiste': [woundRegionAbdomenAsset, woundRegionAbdomenStage1Asset, woundRegionAbdomenStage2Asset, woundRegionAbdomenStage3Asset],
  'Betroffene Region': [woundRegionAbdomenAsset, woundRegionAbdomenStage1Asset, woundRegionAbdomenStage2Asset, woundRegionAbdomenStage3Asset],
}
const SURGICAL_WOUND_TYPE_LABELS = {
  schnitt: 'Schnittwunde',
  platzwunde: 'Platz-/Rissquetschwunde',
  stich: 'Stichwunde',
}
const SURGICAL_SUTURE_PATTERN_LABELS = {
  einzelknopf: 'Einzelknopfnaht',
  fortlaufend: 'Fortlaufende Naht',
  kreuz: 'Kreuznaht',
}
const SURGICAL_WOUND_TARGETS = {
  Kopf: { x: 54, y: 47, r: 18 },
  Arm: { x: 58, y: 54, r: 20 },
  'Bein/Becken': { x: 60, y: 54, r: 20 },
  'Abdomen/Leiste': { x: 55, y: 53, r: 20 },
  'Betroffene Region': { x: 55, y: 53, r: 20 },
}
const SURGICAL_DEBRIS_POINTS = {
  Kopf: [{ x: 44, y: 44 }, { x: 52, y: 50 }, { x: 60, y: 46 }, { x: 68, y: 52 }],
  Arm: [{ x: 46, y: 51 }, { x: 54, y: 56 }, { x: 64, y: 50 }, { x: 71, y: 57 }],
  'Bein/Becken': [{ x: 47, y: 49 }, { x: 56, y: 55 }, { x: 65, y: 50 }, { x: 74, y: 54 }],
  'Abdomen/Leiste': [{ x: 44, y: 50 }, { x: 53, y: 56 }, { x: 62, y: 49 }, { x: 70, y: 54 }],
  'Betroffene Region': [{ x: 44, y: 50 }, { x: 53, y: 56 }, { x: 62, y: 49 }, { x: 70, y: 54 }],
}
const SURGICAL_SUTURE_POINTS = {
  Kopf: [{ x: 40, y: 50 }, { x: 46, y: 47 }, { x: 52, y: 50 }, { x: 58, y: 47 }, { x: 64, y: 50 }, { x: 70, y: 47 }],
  Arm: [{ x: 42, y: 56 }, { x: 48, y: 52 }, { x: 54, y: 56 }, { x: 60, y: 52 }, { x: 66, y: 56 }, { x: 72, y: 52 }],
  'Bein/Becken': [{ x: 43, y: 54 }, { x: 49, y: 50 }, { x: 55, y: 54 }, { x: 61, y: 50 }, { x: 67, y: 54 }, { x: 73, y: 50 }],
  'Abdomen/Leiste': [{ x: 42, y: 54 }, { x: 48, y: 50 }, { x: 54, y: 54 }, { x: 60, y: 50 }, { x: 66, y: 54 }, { x: 72, y: 50 }],
  'Betroffene Region': [{ x: 42, y: 54 }, { x: 48, y: 50 }, { x: 54, y: 54 }, { x: 60, y: 50 }, { x: 66, y: 54 }, { x: 72, y: 50 }],
}
const SURGICAL_CONTAINER_TARGET = { x: 86, y: 78, r: 12 }
const SURGICAL_CURSOR_HOTSPOTS = {
  irrigator: { x: 44, y: 30, carry: { x: 2, y: -8 } },
  forceps: { x: 10, y: 64, carry: { x: 0, y: 0 } },
  needle_driver: { x: 39, y: 8, carry: { x: 0, y: -8 } },
  traction: { x: 47, y: 18, carry: { x: 0, y: -8 } },
  splint: { x: 34, y: 24, carry: { x: 0, y: -8 } },
  cast: { x: 36, y: 28, carry: { x: 0, y: -8 } },
  thread: { x: 30, y: 30, carry: { x: 0, y: -8 } },
  bandage: { x: 28, y: 28, carry: { x: 0, y: -8 } },
}
const SURGICAL_CURSOR_IMAGE_STYLE = {
  irrigator: { width: '56px', height: '56px', transform: 'rotate(0deg)' },
  forceps: { width: '78px', height: '78px', transform: 'rotate(0deg)' },
  needle_driver: { width: '82px', height: '82px', transform: 'rotate(0deg)' },
  traction: { width: '90px', height: '90px', transform: 'rotate(-8deg)' },
  splint: { width: '88px', height: '88px', transform: 'rotate(0deg)' },
  cast: { width: '86px', height: '86px', transform: 'rotate(0deg)' },
  thread: { width: '56px', height: '56px', transform: 'rotate(0deg)' },
  bandage: { width: '56px', height: '56px', transform: 'rotate(0deg)' },
}
const SURGICAL_TRAY_IMAGE_STYLE = {
  irrigator: { transform: 'rotate(0deg) scale(1.02)' },
  forceps: { transform: 'rotate(-18deg) scale(1.12)' },
  traction: { transform: 'rotate(-8deg) scale(1.2)' },
  splint: { transform: 'rotate(0deg) scale(1.2)' },
  cast: { transform: 'rotate(0deg) scale(1.2)' },
  thread: { transform: 'rotate(0deg) scale(1.03)' },
  needle_driver: { transform: 'rotate(0deg) scale(1.08)' },
  bandage: { transform: 'rotate(0deg) scale(1.02)' },
}
const FRACTURE_GRAPHICS = {
  Arm: { geschlossen: fractureArmClosedAsset },
  'Bein/Becken': { geschlossen: fractureLegClosedAsset },
}
const FRACTURE_TARGETS = {
  Arm: { x: 56, y: 53, r: 18 },
  'Bein/Becken': { x: 59, y: 53, r: 20 },
  default: { x: 56, y: 53, r: 19 },
}
const FRACTURE_MOLD_POINTS = {
  Arm: [{ x: 48, y: 50 }, { x: 56, y: 54 }, { x: 63, y: 50 }, { x: 70, y: 55 }],
  'Bein/Becken': [{ x: 49, y: 49 }, { x: 58, y: 54 }, { x: 66, y: 50 }, { x: 74, y: 55 }],
  default: [{ x: 49, y: 49 }, { x: 58, y: 54 }, { x: 66, y: 50 }, { x: 74, y: 55 }],
}
const FRACTURE_WATER_TARGET = { x: 86, y: 76, r: 11 }
const SURGICAL_WOUND_TARGET_PROFILE = {
  'Kopf:schnitt': { x: 55, y: 48, r: 15 },
  'Kopf:platzwunde': { x: 54, y: 47, r: 20 },
  'Kopf:stich': { x: 56, y: 50, r: 10 },
  'Arm:schnitt': { x: 58, y: 54, r: 17 },
  'Arm:platzwunde': { x: 57, y: 53, r: 21 },
  'Arm:stich': { x: 59, y: 55, r: 10 },
  'Bein/Becken:schnitt': { x: 59, y: 54, r: 18 },
  'Bein/Becken:platzwunde': { x: 60, y: 53, r: 22 },
  'Bein/Becken:stich': { x: 60, y: 55, r: 11 },
  'Abdomen/Leiste:schnitt': { x: 55, y: 53, r: 18 },
  'Abdomen/Leiste:platzwunde': { x: 55, y: 52, r: 22 },
  'Abdomen/Leiste:stich': { x: 56, y: 53, r: 11 },
}
const SURGICAL_WOUND_CONTOUR_PROFILE = {
  'Kopf:schnitt': 'M39 51 C44 47, 50 55, 56 50 C61 46, 67 54, 72 49',
  'Kopf:platzwunde': 'M34 51 C38 45, 45 59, 50 50 C54 43, 61 59, 66 48 C69 45, 74 46, 77 49',
  'Kopf:stich': 'M54 51 C55 49, 57 49, 58 51 C57 53, 55 53, 54 51',
  'Arm:schnitt': 'M36 56 C42 52, 48 58, 54 54 C60 50, 66 58, 72 54',
  'Arm:platzwunde': 'M34 56 C39 50, 45 62, 50 55 C55 49, 62 62, 68 53 C71 50, 75 51, 78 54',
  'Arm:stich': 'M58 55 C59 53, 61 53, 62 55 C61 57, 59 57, 58 55',
  'Bein/Becken:schnitt': 'M37 54 C43 50, 49 58, 55 54 C61 50, 67 58, 73 54',
  'Bein/Becken:platzwunde': 'M34 54 C39 47, 45 61, 51 53 C56 46, 63 61, 69 52 C72 49, 77 50, 79 53',
  'Bein/Becken:stich': 'M59 54 C60 52, 62 52, 63 54 C62 56, 60 56, 59 54',
  'Abdomen/Leiste:schnitt': 'M35 53 C41 49, 47 57, 53 53 C59 49, 65 57, 71 53',
  'Abdomen/Leiste:platzwunde': 'M33 53 C38 46, 45 60, 51 52 C56 45, 63 60, 68 51 C72 47, 76 49, 78 52',
  'Abdomen/Leiste:stich': 'M55 53 C56 51, 58 51, 59 53 C58 55, 56 55, 55 53',
}
const SURGICAL_SUTURE_POINT_PROFILE = {
  'Kopf:platzwunde:einzelknopf': [{ x: 45, y: 46 }, { x: 50, y: 54 }, { x: 55, y: 46 }, { x: 60, y: 54 }, { x: 65, y: 46 }, { x: 70, y: 54 }],
  'Kopf:schnitt:fortlaufend': [{ x: 42, y: 50 }, { x: 48, y: 49 }, { x: 54, y: 50 }, { x: 60, y: 49 }, { x: 66, y: 50 }],
  'Kopf:stich:kreuz': [{ x: 54, y: 49 }, { x: 58, y: 53 }, { x: 58, y: 49 }, { x: 54, y: 53 }],
  'Arm:schnitt:fortlaufend': [{ x: 44, y: 56 }, { x: 50, y: 53 }, { x: 56, y: 56 }, { x: 62, y: 53 }, { x: 68, y: 56 }],
  'Arm:platzwunde:einzelknopf': [{ x: 42, y: 55 }, { x: 48, y: 60 }, { x: 55, y: 55 }, { x: 62, y: 60 }, { x: 69, y: 55 }, { x: 75, y: 59 }],
  'Arm:stich:kreuz': [{ x: 58, y: 54 }, { x: 62, y: 58 }, { x: 62, y: 54 }, { x: 58, y: 58 }],
  'Bein/Becken:schnitt:fortlaufend': [{ x: 45, y: 54 }, { x: 51, y: 51 }, { x: 57, y: 54 }, { x: 63, y: 51 }, { x: 69, y: 54 }],
  'Bein/Becken:platzwunde:einzelknopf': [{ x: 42, y: 53 }, { x: 49, y: 58 }, { x: 56, y: 53 }, { x: 63, y: 58 }, { x: 70, y: 53 }, { x: 77, y: 58 }],
  'Bein/Becken:stich:kreuz': [{ x: 59, y: 53 }, { x: 63, y: 57 }, { x: 63, y: 53 }, { x: 59, y: 57 }],
  'Abdomen/Leiste:schnitt:fortlaufend': [{ x: 43, y: 53 }, { x: 49, y: 50 }, { x: 55, y: 53 }, { x: 61, y: 50 }, { x: 67, y: 53 }],
  'Abdomen/Leiste:platzwunde:einzelknopf': [{ x: 41, y: 52 }, { x: 48, y: 57 }, { x: 55, y: 52 }, { x: 62, y: 57 }, { x: 69, y: 52 }, { x: 76, y: 57 }],
  'Abdomen/Leiste:stich:kreuz': [{ x: 55, y: 52 }, { x: 59, y: 56 }, { x: 59, y: 52 }, { x: 55, y: 56 }],
}

function inferSurgicalWoundType(symptomsText, primaryCode) {
  const s = String(symptomsText || '').toLowerCase()
  const code = String(primaryCode || '').toUpperCase()
  if (/stich|messerstich|stichwunde|perforation|penetrierend/.test(s)) return 'stich'
  if (/platzwunde|rissquetsch|platz|lazer|laceration|riss/.test(s)) return 'platzwunde'
  if (/schnitt|inzision|schnittverletzung/.test(s)) return 'schnitt'
  if (/^S01\./.test(code)) return 'platzwunde'
  if (/^S11\./.test(code) || /^S21\./.test(code) || /^S31\./.test(code)) return 'stich'
  return 'schnitt'
}

function inferDefaultSuturePattern(region, woundType) {
  if (woundType === 'stich') return 'kreuz'
  if (region === 'Kopf' && woundType === 'platzwunde') return 'einzelknopf'
  if (woundType === 'schnitt') return 'fortlaufend'
  return 'einzelknopf'
}

function computeRecentGlycemicMedicationShift(patient, nowMs) {
  const entries = Array.isArray(patient?.appliedTreatments) ? patient.appliedTreatments : []
  let shift = 0
  for (const entry of entries) {
    const ts = Date.parse(entry?.time || '')
    if (!Number.isFinite(ts)) continue
    const ageMin = (nowMs - ts) / 60000
    if (ageMin < 0 || ageMin > 45) continue
    const id = String(entry?.id || '').toLowerCase()
    const name = String(entry?.name || '').toLowerCase()
    const medKey = `${id} ${name}`
    const phase = ageMin <= 2 ? 0.35
      : ageMin <= 8 ? 1
        : ageMin <= 20 ? 0.75
          : ageMin <= 35 ? 0.4
            : 0.15
    if (medKey.includes('glucose40') || medKey.includes('glukose 40') || medKey.includes('dextrose')) {
      shift += 30 * phase
    } else if (medKey.includes('glucose') || medKey.includes('glukose')) {
      shift += 14 * phase
    } else if (medKey.includes('glucagon')) {
      shift += 18 * phase
    } else if (medKey.includes('insulin')) {
      shift -= 22 * phase
    }
  }
  return Math.round(clamp(shift, -120, 220))
}

export default function MaterialCartUI({ patient, onAction, savedState, onSaveState, onUpsertPatientDocument, currentUser, medicationInventory }) {
  const onSaveStateRef = useRef(onSaveState)
  const scrollRef = useRef(null)
  const [rate, setRate] = useState(savedState?.rate ?? 500)
  const [bedsideTestOk, setBedsideTestOk] = useState(savedState?.bedsideTestOk ?? false)
  const [running, setRunning] = useState(savedState?.running ?? [])
  const [surgicalMiniOpen, setSurgicalMiniOpen] = useState(false)
  const [surgicalStep, setSurgicalStep] = useState('irrigate')
  const [irrigationProgress, setIrrigationProgress] = useState(0)
  const [surgicalAttachedToolId, setSurgicalAttachedToolId] = useState(null)
  const [surgicalFieldCursorPos, setSurgicalFieldCursorPos] = useState({ x: 0, y: 0 })
  const [surgicalDebris, setSurgicalDebris] = useState([])
  const [surgicalLiftedDebrisId, setSurgicalLiftedDebrisId] = useState(null)
  const [surgicalDepositedCount, setSurgicalDepositedCount] = useState(0)
  const [surgicalSuturePlaced, setSurgicalSuturePlaced] = useState([])
  const [surgicalSutureMistakes, setSurgicalSutureMistakes] = useState(0)
  const [surgicalThreadLoaded, setSurgicalThreadLoaded] = useState(false)
  const [surgicalSuturePattern, setSurgicalSuturePattern] = useState('einzelknopf')
  const [surgicalBandageWraps, setSurgicalBandageWraps] = useState(0)
  const [surgicalBandageDragging, setSurgicalBandageDragging] = useState(false)
  const [surgicalBandageCarryPx, setSurgicalBandageCarryPx] = useState(0)
  const [surgicalBandageLastPos, setSurgicalBandageLastPos] = useState(null)
  const [surgicalReadyToFinalize, setSurgicalReadyToFinalize] = useState(false)
  const [surgicalFeedback, setSurgicalFeedback] = useState('')
  const [fractureMiniOpen, setFractureMiniOpen] = useState(false)
  const [fractureStep, setFractureStep] = useState('padding')
  const [fractureAttachedToolId, setFractureAttachedToolId] = useState(null)
  const [fractureFieldCursorPos, setFractureFieldCursorPos] = useState({ x: 0, y: 0 })
  const [fracturePaddingWraps, setFracturePaddingWraps] = useState(0)
  const [fractureSplintFixations, setFractureSplintFixations] = useState(0)
  const [fractureCastDipCount, setFractureCastDipCount] = useState(0)
  const [fractureCastWraps, setFractureCastWraps] = useState(0)
  const [fractureMoldPlaced, setFractureMoldPlaced] = useState([])
  const [fractureDmsChecked, setFractureDmsChecked] = useState(false)
  const [fractureReadyToFinalize, setFractureReadyToFinalize] = useState(false)
  const [fractureBandageDragging, setFractureBandageDragging] = useState(false)
  const [fractureBandageCarryPx, setFractureBandageCarryPx] = useState(0)
  const [fractureBandageLastPos, setFractureBandageLastPos] = useState(null)
  const [fractureFeedback, setFractureFeedback] = useState('')
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false)
  const [inspectionType, setInspectionType] = useState('wound')
  const [inspectionResult, setInspectionResult] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [reportDraft, setReportDraft] = useState({ region: '', indikation: '', massnahmen: '', beurteilung: '' })
  const [manualTemp, setManualTemp] = useState(savedState?.manualTemp ?? null)
  const [manualBloodSugar, setManualBloodSugar] = useState(savedState?.manualBloodSugar ?? null)
  const [manualBloodSugarBaseline, setManualBloodSugarBaseline] = useState(savedState?.manualBloodSugarBaseline ?? null)
  const [manualBloodSugarMeasuredAt, setManualBloodSugarMeasuredAt] = useState(savedState?.manualBloodSugarMeasuredAt ?? null)
  const [bloodSugarPending, setBloodSugarPending] = useState(false)
  const [bzMiniOpen, setBzMiniOpen] = useState(false)
  const [bzMiniPos, setBzMiniPos] = useState(8)
  const [bzMiniDir, setBzMiniDir] = useState(1)
  const [bzMiniHits, setBzMiniHits] = useState(0)
  const [bzMiniFeedback, setBzMiniFeedback] = useState('')
  const [manualAlcohol, setManualAlcohol] = useState(savedState?.manualAlcohol ?? null)
  const [uiNotice, setUiNotice] = useState(null)
  const [infusionHoverNotice, setInfusionHoverNotice] = useState('')
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugClicks, setDebugClicks] = useState(0)
  const [debugLastAction, setDebugLastAction] = useState('init')
  const [drawerOpen, setDrawerOpen] = useState(savedState?.drawerOpen ?? {
    access: false,
    infusion: false,
    diagnostics: false,
    surgical: false,
    running: true,
  })
  const surgicalModalRef = useRef(null)
  const surgicalFieldRef = useRef(null)
  const fractureFieldRef = useRef(null)
  const accessCanvasRef = useRef(null)
  const [accessDraft, setAccessDraft] = useState({
    typeId: ACCESS_TYPES[2].id,
    gauge: ACCESS_TYPES[2].gauge,
    siteId: ACCESS_SITES[0].id,
    stage: 'setup',
  })
  const [accessProcedure, setAccessProcedure] = useState({
    disinfectionCount: 0,
    swabDone: false,
    tourniquetOn: false,
    viggoPlaced: false,
    plasterDone: false,
  })
  const [accessAttachedToolId, setAccessAttachedToolId] = useState(null)
  const [accessCursorPos, setAccessCursorPos] = useState({ x: 0, y: 0 })
  const [accessHint, setAccessHint] = useState('')
  const canUseDebugTools = false

  const selectedAccessType = useMemo(
    () => ACCESS_TYPES.find(type => type.id === accessDraft.typeId) || ACCESS_TYPES[2],
    [accessDraft.typeId]
  )
  const selectedAccessSite = useMemo(
    () => ACCESS_SITES.find(site => site.id === accessDraft.siteId) || ACCESS_SITES[0],
    [accessDraft.siteId]
  )
  const selectedPunctureTarget = useMemo(
    () => ACCESS_GAME_TARGETS.punctureBySiteId[accessDraft.siteId] || ACCESS_GAME_TARGETS.punctureBySiteId[ACCESS_SITES[0].id],
    [accessDraft.siteId]
  )
  const selectedSide = String(accessDraft.siteId || '').includes('_links') ? 'left' : 'right'
  const shouldMirrorArm = selectedSide === 'left'
  const mirrorTargetX = (target) => {
    if (!target) return target
    return { ...target, x: 100 - target.x }
  }
  const displayPunctureTarget = useMemo(
    () => (shouldMirrorArm ? mirrorTargetX(selectedPunctureTarget) : selectedPunctureTarget),
    [shouldMirrorArm, selectedPunctureTarget]
  )
  const selectedUpperArmTarget = ACCESS_GAME_TARGETS.upperArmBySide[selectedSide]
  const displayUpperArmTarget = useMemo(
    () => (shouldMirrorArm ? mirrorTargetX(selectedUpperArmTarget) : selectedUpperArmTarget),
    [shouldMirrorArm, selectedUpperArmTarget]
  )
  const effectiveViggoScale = clamp(Number(ACCESS_OVERLAY_TUNING.viggoScale || 1), 0.45, 1.85)
  const effectiveViggoWidth = clamp(
    Math.round((ACCESS_OVERLAY_TUNING.viggoBaseWidth || 128) * effectiveViggoScale),
    52,
    240
  )
  const effectiveViggoHeight = clamp(
    Math.round((ACCESS_OVERLAY_TUNING.viggoBaseHeight || 92) * effectiveViggoScale),
    40,
    190
  )
  const placedViggoRotationDeg = shouldMirrorArm
    ? ACCESS_OVERLAY_TUNING.viggoRotationLeftDeg
    : ACCESS_OVERLAY_TUNING.viggoRotationRightDeg
  const shouldMirrorPlacedViggo = selectedSide === 'right'
  const placedViggoTranslateX = selectedSide === 'right'
    ? ACCESS_OVERLAY_TUNING.viggoTranslateXPercentRight
    : ACCESS_OVERLAY_TUNING.viggoTranslateXPercentLeft
  const placedViggoTranslateY = selectedSide === 'right'
    ? ACCESS_OVERLAY_TUNING.viggoTranslateYPercentRight
    : ACCESS_OVERLAY_TUNING.viggoTranslateYPercentLeft
  const placedPlasterRotationDeg = selectedSide === 'right'
    ? ACCESS_OVERLAY_TUNING.plasterRotationRightDeg
    : ACCESS_OVERLAY_TUNING.plasterRotationLeftDeg
  const accessArmImage = accessProcedure.tourniquetOn
    ? armWithTourniquetAsset
    : (String(patient?.gender || '').toLowerCase().startsWith('w') ? armFemaleAsset : armAsset)

  const viggoByGauge = useMemo(() => ({
    '14G': viggo14gAsset,
    '16G': viggo16gAsset,
    '18G': viggo18gAsset,
    '20G': viggo20gAsset,
    '22G': viggo22gAsset,
  }), [])
  const selectedViggoAsset = viggoByGauge[String(selectedAccessType.gauge || '18G').toUpperCase()] || viggo18gAsset
  const accessTools = useMemo(() => ({
    disinfect: { id: 'disinfect', label: 'Desinfektion', image: disinfectantAsset },
    swab: { id: 'swab', label: 'Tupfer', image: swabAsset },
    tourniquet: { id: 'tourniquet', label: 'Stauschlauch', image: tourniquetAsset },
    viggo: { id: 'viggo', label: `Viggo ${selectedAccessType.gauge}`, image: selectedViggoAsset },
    plaster: { id: 'plaster', label: 'Pflaster', image: accessPlasterAsset },
  }), [selectedAccessType.gauge, selectedViggoAsset])
  const accessToolOrder = ['disinfect', 'swab', 'tourniquet', 'viggo', 'plaster']

  const accessChecklistState = useMemo(() => ({
    dis1: accessProcedure.disinfectionCount >= 1,
    swab: accessProcedure.swabDone,
    dis2: accessProcedure.disinfectionCount >= 2,
    tourniquetOn: accessProcedure.tourniquetOn || accessProcedure.viggoPlaced,
    viggo: accessProcedure.viggoPlaced,
    tourniquetOff: accessProcedure.viggoPlaced && !accessProcedure.tourniquetOn,
    plaster: accessProcedure.plasterDone,
  }), [accessProcedure])

  const accessActiveInstruction = useMemo(() => {
    if (accessProcedure.disinfectionCount === 0) return 'Punktionsstelle desinfizieren.'
    if (!accessProcedure.swabDone) return 'Mit Tupfer über die Punktionsstelle wischen.'
    if (accessProcedure.disinfectionCount < 2) return 'Erneut desinfizieren.'
    if (!accessProcedure.tourniquetOn) return 'Stauschlauch anlegen (auch früher erlaubt).'
    if (!accessProcedure.viggoPlaced) return `Viggo ${selectedAccessType.gauge} legen.`
    if (accessProcedure.tourniquetOn) return 'Stauschlauch wieder lösen.'
    if (!accessProcedure.plasterDone) return 'Pflaster aufkleben.'
    return 'Zugang vollständig gelegt.'
  }, [accessProcedure, selectedAccessType.gauge])

  useEffect(() => {
    onSaveStateRef.current = onSaveState
  }, [onSaveState])

  useEffect(() => {
    if (Array.isArray(savedState?.running)) {
      setRunning(savedState.running)
    }
  }, [savedState?.running])

  useEffect(() => {
    onSaveStateRef.current?.({
      rate,
      bedsideTestOk,
      manualTemp,
      manualBloodSugar,
      manualBloodSugarBaseline,
      manualBloodSugarMeasuredAt,
      manualAlcohol,
      drawerOpen,
    })
  }, [rate, bedsideTestOk, manualTemp, manualBloodSugar, manualBloodSugarBaseline, manualBloodSugarMeasuredAt, manualAlcohol, drawerOpen])

  const persistRunning = (nextRunning) => {
    const prevScrollTop = scrollRef.current?.scrollTop ?? 0
    setRunning(nextRunning)
    onSaveStateRef.current?.({ running: nextRunning })
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = prevScrollTop
    })
  }

  const startedCount = useMemo(() => running.filter(r => r.active).length, [running])
  const activeAccesses = useMemo(
    () => (Array.isArray(patient?.venousAccesses) ? patient.venousAccesses.filter(access => access?.status === 'active') : []),
    [patient?.venousAccesses]
  )
  const hasActiveAccess = activeAccesses.length > 0
  const accessRateCapacity = useMemo(
    () => activeAccesses.reduce((sum, access) => sum + (MAX_RATE_BY_GAUGE[String(access?.gauge || '').toUpperCase()] || 250), 0),
    [activeAccesses]
  )
  const maxConcurrentInfusions = Math.max(0, activeAccesses.length * 2)
  const runningActiveCount = useMemo(() => running.filter(item => item?.active).length, [running])
  const runningActiveRate = useMemo(
    () => running.filter(item => item?.active).reduce((sum, item) => sum + Math.max(0, Number(item?.rate || 0)), 0),
    [running]
  )
  const remainingRateCapacity = Math.max(0, accessRateCapacity - runningActiveRate)
  const rateSliderMax = Math.max(20, Math.min(6000, hasActiveAccess ? Math.max(20, remainingRateCapacity) : 6000))
  const effectiveRate = Math.max(20, Math.min(rate, rateSliderMax))
  const primaryCode = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const diagnosisNameText = [
    patient?.diagnoses?.primary?.name || '',
    patient?.trueDiagnoses?.primary?.name || '',
  ].join(' ')
  const symptomsText = [
    patient?.chiefComplaint || '',
    diagnosisNameText,
    ...(Array.isArray(patient?.symptoms) ? patient.symptoms : []),
    ...(Array.isArray(patient?.presentingSymptoms) ? patient.presentingSymptoms : []),
  ].join(' ')
  const hasBurn = /verbrennung|brandwunde|thermal|schmor|siede|erste\s*hilfe\s*brand|kochwasser/i.test(symptomsText)
    || /^T2[0-9]\./.test(primaryCode)
    || /^T3[0-2]\./.test(primaryCode)
  const hasWound = /wunde|platzwunde|schnitt|lazer|offene verletzung|wund/i.test(symptomsText)
    || primaryCode.startsWith('S01')
    || primaryCode.startsWith('S00')
    || primaryCode.startsWith('S09')
    || primaryCode.startsWith('S51')
    || primaryCode.startsWith('S31')
    || primaryCode.startsWith('S41')
    || primaryCode.startsWith('S61')
    || primaryCode.startsWith('S71')
    || primaryCode.startsWith('S81')
    || primaryCode.startsWith('S91')
    || primaryCode.startsWith('T14.1')
    || primaryCode.startsWith('T81.4')
  const hasFracture = !hasBurn && (
    /fraktur|bruch|fehlstellung|schenkelhals|tibia|fibula|becken|unterarm|radius|ulna|humerus|femur|sprunggelenk/i.test(symptomsText)
    || /^S(32|42|52|62|72|82|92)\./.test(primaryCode)
  )
  const hasOpenFracture = hasFracture && (
    /offene fraktur|offener bruch|compound|knochen sichtbar|offen/.test(symptomsText.toLowerCase())
    || (hasWound && hasFracture)
  )
  const fractureType = 'geschlossen'
  const fractureTypeLabel = hasOpenFracture ? 'Offene Fraktur (OP-indiziert)' : 'Geschlossene Fraktur'
  const fractureCareLabel = hasOpenFracture
    ? 'Im Materialwagen nur temporaere Immobilisierung bis OP.'
    : 'Konservative Immobilisierung im Materialwagen.'
  const needsSurgicalCare = hasWound || hasFracture
  const appliedActions = Array.isArray(patient?.appliedTreatments) ? patient.appliedTreatments.filter(t => t?.kind === 'action').map(t => t?.id) : []
  const woundAlreadyCleaned = appliedActions.includes('wound_cleanse')
  const woundAlreadyClosed = appliedActions.includes('wound_suture')
  const dressingAlreadyDone = appliedActions.includes('wound_dressing')
  const castAlreadyApplied = appliedActions.includes('cast_apply')
  const affectedRegion = (() => {
    if (/kopf|stirn|gesicht|schädel/i.test(symptomsText) || primaryCode.startsWith('S01')) return 'Kopf'
    if (/unterarm|arm|schulter|radius|ulna|humerus/i.test(symptomsText) || /^S(41|42|51|52|61|62)\./.test(primaryCode)) return 'Arm'
    if (/hüfte|bein|tibia|fibula|femur|schenkel|becken|sprunggelenk|knöchel/i.test(symptomsText) || /^S(32|71|72|81|82|91|92)\./.test(primaryCode)) return 'Bein/Becken'
    if (/bauch|abdomen|leiste/i.test(symptomsText) || primaryCode.startsWith('S31')) return 'Abdomen/Leiste'
    return 'Betroffene Region'
  })()
  const castVariant = affectedRegion === 'Arm'
    ? 'Unterarmgips'
    : affectedRegion === 'Bein/Becken'
      ? 'Unterschenkel-/Beckenschiene'
      : 'Stützverband'
  const woundClinical = patient?.clinicalState?.surgicalWound || {}
  const fractureClinical = patient?.clinicalState?.fractureCare || {}
  const woundInfectionStage = Math.round(clamp(Number(woundClinical?.infectionStage || 0), 0, 100))
  const woundQualityScore = Math.round(clamp(
    (Number(woundClinical?.cleanliness || 0) * 45)
    + (Number(woundClinical?.closure || 0) * 25)
    + (Number(woundClinical?.dressing || 0) * 30),
    0,
    100
  ))
  const woundStatusLabel = woundInfectionStage >= 80
    ? 'kritisch infektverdächtig'
    : woundInfectionStage >= 55
      ? 'infektgefährdet'
      : woundQualityScore >= 70
        ? 'stabil versorgt'
        : 'engmaschig kontrollieren'
  const fractureImmobilizationScore = Math.round(clamp(Number(fractureClinical?.immobilizationQuality || 0) * 100, 0, 100))
  const fractureStatusLabel = fractureImmobilizationScore >= 80
    ? 'ruhiggestellt'
    : fractureImmobilizationScore >= 55
      ? 'grenzwertig stabil'
      : castAlreadyApplied
        ? 'nachkontrollieren'
        : 'erstversorgung erforderlich'
  const woundGraphic = SURGICAL_WOUND_GRAPHICS[affectedRegion] || SURGICAL_WOUND_GRAPHICS['Betroffene Region']
  const persistentWoundClosureRatio = clamp(Number(woundClinical?.closure || 0), 0, 1)
  const surgicalWoundType = inferSurgicalWoundType(symptomsText, primaryCode)
  const surgicalWoundTypeLabel = SURGICAL_WOUND_TYPE_LABELS[surgicalWoundType] || SURGICAL_WOUND_TYPE_LABELS.schnitt
  const suturePatternLabel = SURGICAL_SUTURE_PATTERN_LABELS[surgicalSuturePattern] || SURGICAL_SUTURE_PATTERN_LABELS.einzelknopf
  const surgicalWoundTarget = useMemo(() => {
    const exact = SURGICAL_WOUND_TARGET_PROFILE[`${affectedRegion}:${surgicalWoundType}`]
    if (exact) return exact
    const base = SURGICAL_WOUND_TARGETS[affectedRegion] || SURGICAL_WOUND_TARGETS['Betroffene Region']
    if (surgicalWoundType === 'stich') return { ...base, r: Math.max(11, base.r - 6) }
    if (surgicalWoundType === 'platzwunde') return { ...base, r: base.r + 3 }
    return base
  }, [affectedRegion, surgicalWoundType])
  const surgicalDebrisTemplate = useMemo(() => {
    const base = SURGICAL_DEBRIS_POINTS[affectedRegion] || SURGICAL_DEBRIS_POINTS['Betroffene Region']
    if (surgicalWoundType === 'stich') return base.slice(0, 2)
    if (surgicalWoundType === 'platzwunde') return [...base, { x: base[0].x + 3, y: base[0].y - 5 }, { x: base[3].x - 3, y: base[3].y + 4 }]
    return base
  }, [affectedRegion, surgicalWoundType])
  const surgicalSutureTargetPoints = useMemo(() => {
    const exact = SURGICAL_SUTURE_POINT_PROFILE[`${affectedRegion}:${surgicalWoundType}:${surgicalSuturePattern}`]
    if (exact) return exact
    const base = SURGICAL_SUTURE_POINTS[affectedRegion] || SURGICAL_SUTURE_POINTS['Betroffene Region']
    if (surgicalWoundType === 'stich') return base.slice(2, 5)
    if (surgicalSuturePattern === 'fortlaufend') return base.filter((_, idx) => idx % 2 === 0)
    return base
  }, [affectedRegion, surgicalWoundType, surgicalSuturePattern])
  const contaminationOpacity = clamp(1 - (irrigationProgress / 100), 0.12, 1)
  const debridementRemainingRatio = surgicalDebrisTemplate.length > 0
    ? clamp((surgicalDebrisTemplate.length - surgicalDepositedCount) / surgicalDebrisTemplate.length, 0, 1)
    : 0
  const sutureCoverageRatio = surgicalSutureTargetPoints.length > 0
    ? clamp(surgicalSuturePlaced.length / surgicalSutureTargetPoints.length, 0, 1)
    : 0
  const woundClosureForGraphics = surgicalMiniOpen
    ? Math.max(persistentWoundClosureRatio, sutureCoverageRatio)
    : persistentWoundClosureRatio
  const woundStageIndex = woundClosureForGraphics >= 0.86
    ? 3
    : woundClosureForGraphics >= 0.58
      ? 2
      : woundClosureForGraphics >= 0.24
        ? 1
        : 0
  const stagedWoundGraphic = (SURGICAL_WOUND_STAGE_GRAPHICS[affectedRegion] || SURGICAL_WOUND_STAGE_GRAPHICS['Betroffene Region'])?.[woundStageIndex] || woundGraphic
  const fractureGraphic = (FRACTURE_GRAPHICS[affectedRegion] || FRACTURE_GRAPHICS['Bein/Becken'] || FRACTURE_GRAPHICS.Arm)?.geschlossen || fractureArmClosedAsset
  const inspectionWoundGraphic = stagedWoundGraphic
  const inspectionFractureGraphic = fractureGraphic
  const woundInspectionSeverity = woundInfectionStage >= 80 ? 'critical' : woundInfectionStage >= 55 ? 'warning' : 'ok'
  const bandageCoverageRatio = clamp(surgicalBandageWraps / 8, 0, 1)
  const fractureTarget = FRACTURE_TARGETS[affectedRegion] || FRACTURE_TARGETS.default
  const fractureMoldTargets = FRACTURE_MOLD_POINTS[affectedRegion] || FRACTURE_MOLD_POINTS.default
  const fractureTrayTools = [
    { id: 'padding', label: 'Unterpolster', asset: toolBandageAsset, helper: 'Hautschutz vorbereiten' },
    { id: 'splint', label: 'Schiene', asset: toolSplintAsset, helper: 'Extremitaet ruhigstellen' },
    { id: 'cast', label: 'Gipsrolle', asset: toolCastAsset, helper: 'Gips wickeln und modellieren' },
  ]
  const fractureCursorAsset = fractureAttachedToolId === 'padding'
      ? toolBandageAsset
      : fractureAttachedToolId === 'splint'
      ? toolSplintAsset
      : fractureAttachedToolId === 'cast'
        ? toolCastAsset
        : null
  const fractureCursorStyle = SURGICAL_CURSOR_IMAGE_STYLE[fractureAttachedToolId] || { width: '60px', height: '60px', transform: 'rotate(0deg)' }
  const fractureStepTitle = fractureStep === 'padding'
    ? 'Schritt 1/6: Unterpolsterung'
    : fractureStep === 'splint'
      ? 'Schritt 2/6: Schienung'
      : fractureStep === 'activate_cast'
        ? 'Schritt 3/6: Gips aktivieren'
        : fractureStep === 'cast'
          ? 'Schritt 4/6: Gips wickeln'
          : fractureStep === 'mold'
            ? 'Schritt 5/6: Gips modellieren'
            : 'Schritt 6/6: DMS-Kontrolle'
  const fractureOverallProgress = clamp(
    ((fracturePaddingWraps / 6) * 100 * 0.16)
    + ((fractureSplintFixations / 4) * 100 * 0.2)
    + ((fractureCastDipCount / 3) * 100 * 0.14)
    + ((fractureCastWraps / 12) * 100 * 0.3)
    + ((fractureMoldPlaced.length / fractureMoldTargets.length) * 100 * 0.14)
    + (fractureDmsChecked ? 6 : 0),
    0,
    100
  )
  const contaminationCount = surgicalWoundType === 'stich' ? 3 : surgicalWoundType === 'platzwunde' ? 9 : 6
  const woundContourPath = SURGICAL_WOUND_CONTOUR_PROFILE[`${affectedRegion}:${surgicalWoundType}`]
    || (surgicalWoundType === 'stich'
      ? 'M52 52 C53 49, 57 48, 59 51 C57 54, 53 55, 52 52'
      : surgicalWoundType === 'platzwunde'
        ? 'M33 52 C38 46, 45 58, 51 50 C56 44, 62 58, 68 49 C70 46, 74 46, 76 49'
        : 'M35 51 C41 47, 47 55, 53 50 C58 46, 64 54, 70 49')
  const woundContourFillPath = surgicalWoundType === 'stich'
    ? `M${surgicalWoundTarget.x - 1.8} ${surgicalWoundTarget.y} C${surgicalWoundTarget.x - 0.6} ${surgicalWoundTarget.y - 2.6}, ${surgicalWoundTarget.x + 3.2} ${surgicalWoundTarget.y - 2.4}, ${surgicalWoundTarget.x + 4.2} ${surgicalWoundTarget.y} C${surgicalWoundTarget.x + 2.5} ${surgicalWoundTarget.y + 2.1}, ${surgicalWoundTarget.x - 0.2} ${surgicalWoundTarget.y + 2.3}, ${surgicalWoundTarget.x - 1.8} ${surgicalWoundTarget.y}`
    : woundContourPath
  const contaminationPoints = useMemo(() => {
    const points = []
    for (let i = 0; i < contaminationCount; i += 1) {
      const spreadX = surgicalWoundType === 'stich' ? 2.8 : surgicalWoundType === 'platzwunde' ? 16 : 12
      const spreadY = surgicalWoundType === 'stich' ? 2.2 : surgicalWoundType === 'platzwunde' ? 6 : 4.5
      const wave = Math.sin((i + 1) * 1.35)
      const x = surgicalWoundTarget.x - (spreadX * 0.5) + ((i / Math.max(1, contaminationCount - 1)) * spreadX)
      const y = surgicalWoundTarget.y + (wave * spreadY * 0.25) + (i % 2 === 0 ? -0.9 : 1.1)
      points.push({ x, y })
    }
    return points
  }, [contaminationCount, surgicalWoundTarget.x, surgicalWoundTarget.y, surgicalWoundType])
  const surgicalTrayTools = [
    { id: 'irrigator', label: 'Spüllanze', asset: toolIrrigationAsset, helper: 'Zur Wundreinigung' },
    { id: 'forceps', label: 'Pinzette', asset: toolForcepsAsset, helper: 'Debridement entnehmen' },
    { id: 'thread', label: 'Nahtfaden', asset: toolSutureAsset, helper: 'Faden vorbereiten' },
    { id: 'needle_driver', label: 'Nadelhalter', asset: toolNeedleDriverAsset, helper: 'Stiche setzen' },
    { id: 'bandage', label: 'Verbandrolle', asset: toolBandageAsset, helper: 'Manuell wickeln' },
  ]
  const surgicalCursorAsset = surgicalAttachedToolId === 'irrigator'
    ? cursorIrrigationAsset
    : surgicalAttachedToolId === 'forceps'
      ? cursorForcepsAsset
      : surgicalAttachedToolId === 'needle_driver'
        ? cursorNeedleDriverAsset
        : surgicalAttachedToolId === 'thread'
          ? cursorThreadAsset
          : surgicalAttachedToolId === 'bandage'
            ? cursorBandageAsset
            : null
  const surgicalCursorHotspot = SURGICAL_CURSOR_HOTSPOTS[surgicalAttachedToolId] || { x: 28, y: 28, carry: { x: 0, y: -8 } }
  const surgicalCursorStyle = SURGICAL_CURSOR_IMAGE_STYLE[surgicalAttachedToolId] || { width: '56px', height: '56px', transform: 'rotate(0deg)' }
  const openSurgicalReportModal = (measureLabel) => {
    setReportDraft(prev => {
      const currentMeasures = String(prev?.massnahmen || '').trim()
      const nextMeasures = currentMeasures
        ? `${currentMeasures}\n- ${measureLabel}`
        : `- ${measureLabel}`
      return {
        region: affectedRegion,
        indikation: patient?.chiefComplaint || patient?.diagnoses?.primary?.name || 'Chirurgische Versorgung',
        massnahmen: nextMeasures,
        beurteilung: '',
      }
    })
    setReportModalOpen(true)
  }

  const startItem = (item) => {
    if ((item.category === 'infusion' || item.category === 'transfusion') && !hasActiveAccess) return
    if (item.category === 'transfusion' && !bedsideTestOk) return
    const stockId = STOCK_ID_BY_ITEM[item.id]
    const stock = Number((medicationInventory || {})[stockId] || 0)
    if (stockId && stock <= 0) {
      setUiNotice({ kind: 'error', text: `${item.label} ist nicht auf Lager (Apotheke).` })
      return
    }
    if (runningActiveCount >= maxConcurrentInfusions) {
      setUiNotice({ kind: 'error', text: `Maximal ${maxConcurrentInfusions} gleichzeitige Infusionen/Transfusionen für ${activeAccesses.length} Zugänge erlaubt.` })
      return
    }
    if (remainingRateCapacity <= 0) {
      setUiNotice({ kind: 'error', text: 'Keine freie Laufkapazität mehr für weitere Infusionen.' })
      return
    }
    const absoluteMaxByAccess = Math.max(20, Math.min(item.category === 'transfusion' ? 1200 : 6000, remainingRateCapacity))
    const selectedRate = Math.max(20, Math.min(absoluteMaxByAccess, Number(effectiveRate || 500)))
    const id = `${item.id}_${Date.now()}`
    const next = [...running, {
      id,
      ...item,
      rate: selectedRate,
      infused: 0,
      active: true,
      paused: false,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    }]
    persistRunning(next)
    onAction?.(item.id, item.label, 1)
    if (item.category === 'transfusion') setBedsideTestOk(false)
    setUiNotice(null)
  }

  const resetAccessProcedure = () => {
    setAccessProcedure({
      disinfectionCount: 0,
      swabDone: false,
      tourniquetOn: false,
      viggoPlaced: false,
      plasterDone: false,
    })
    setAccessAttachedToolId(null)
    setAccessHint('')
  }

  const openAccessModal = () => {
    setAccessDraft(prev => ({ ...prev, stage: 'setup' }))
    resetAccessProcedure()
    setAccessModalOpen(true)
  }

  const startAccessProcedure = () => {
    setAccessDraft(prev => ({ ...prev, stage: 'procedure' }))
    resetAccessProcedure()
    setAccessHint(`Vorbereitung abgeschlossen: ${selectedAccessType.gauge} an ${selectedAccessSite.label}.`)
  }

  const closeAccessModal = () => {
    setAccessModalOpen(false)
    setAccessDraft(prev => ({ ...prev, stage: 'setup' }))
    resetAccessProcedure()
  }

  const attachAccessTool = (toolId) => {
    if (accessDraft.stage !== 'procedure') return
    setAccessAttachedToolId(toolId)
    setAccessHint(`"${accessTools[toolId]?.label || toolId}" ausgewählt. Auf den Arm klicken.`)
  }

  const validateAccessHit = (targetName, pos) => {
    const target = targetName === 'punctureSite' ? displayPunctureTarget : displayUpperArmTarget
    if (!target) return false
    return distance(pos, target) <= target.r
  }

  const placeAccessToolOnArm = (event) => {
    if (accessDraft.stage !== 'procedure' || !accessAttachedToolId || !accessCanvasRef.current) {
      setAccessHint('Bitte zuerst ein Instrument auf dem Tablett auswählen.')
      return
    }
    const rect = accessCanvasRef.current.getBoundingClientRect()
    const pos = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
    const fail = (message) => {
      setAccessHint(message)
      return false
    }

    if (accessAttachedToolId === 'tourniquet') {
      if (!validateAccessHit('upperArm', pos)) return fail('Stauschlauch bitte am Oberarm anlegen/abnehmen.')
      if (!accessProcedure.tourniquetOn) {
        setAccessProcedure(prev => ({ ...prev, tourniquetOn: true }))
        setAccessHint('Stauschlauch angelegt.')
      } else {
        if (!accessProcedure.viggoPlaced) return fail('Stauschlauch erst nach gelegter Viggo entfernen.')
        setAccessProcedure(prev => ({ ...prev, tourniquetOn: false }))
        setAccessHint('Stauschlauch entfernt.')
      }
      setAccessAttachedToolId(null)
      return
    }

    if (accessAttachedToolId === 'disinfect') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Bitte direkt an der Punktionsstelle desinfizieren.')
      playOneShot(spraySound, { volume: 0.42, maxDurationMs: 1700 })
      if (accessProcedure.disinfectionCount === 0) {
        setAccessProcedure(prev => ({ ...prev, disinfectionCount: 1 }))
        setAccessHint('Erste Desinfektion abgeschlossen.')
      } else if (accessProcedure.disinfectionCount === 1 && accessProcedure.swabDone) {
        setAccessProcedure(prev => ({ ...prev, disinfectionCount: 2 }))
        setAccessHint('Zweite Desinfektion abgeschlossen.')
      } else {
        return fail('Reihenfolge: Desinfizieren -> Wischen -> erneut desinfizieren.')
      }
      setAccessAttachedToolId(null)
      return
    }

    if (accessAttachedToolId === 'swab') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Tupfer bitte über die Punktionsstelle führen.')
      if (accessProcedure.disinfectionCount < 1) return fail('Vorher einmal desinfizieren.')
      if (accessProcedure.swabDone) return fail('Wisch-Schritt ist bereits erledigt.')
      setAccessProcedure(prev => ({ ...prev, swabDone: true }))
      setAccessHint('Punktionsstelle gewischt.')
      setAccessAttachedToolId(null)
      return
    }

    if (accessAttachedToolId === 'viggo') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Viggo bitte exakt an der Punktionsstelle legen.')
      if (accessProcedure.disinfectionCount < 2 || !accessProcedure.swabDone) return fail('Vorher: Desinfizieren -> Wischen -> Desinfizieren.')
      if (!accessProcedure.tourniquetOn) return fail('Vor dem Legen zuerst stauen.')
      if (accessProcedure.viggoPlaced) return fail('Viggo ist bereits gelegt.')
      setAccessProcedure(prev => ({ ...prev, viggoPlaced: true }))
      setAccessHint(`Viggo ${selectedAccessType.gauge} erfolgreich gelegt.`)
      setAccessAttachedToolId(null)
      return
    }

    if (accessAttachedToolId === 'plaster') {
      if (!validateAccessHit('punctureSite', pos)) return fail('Pflaster bitte auf die Punktionsstelle setzen.')
      if (!accessProcedure.viggoPlaced) return fail('Erst Viggo legen.')
      if (accessProcedure.tourniquetOn) return fail('Vor dem Pflaster bitte erst entstauen.')
      if (accessProcedure.plasterDone) return fail('Pflaster wurde bereits gesetzt.')
      setAccessProcedure(prev => ({ ...prev, plasterDone: true }))
      setAccessHint('Pflaster angelegt. Zugang erfolgreich gesichert.')
      setAccessAttachedToolId(null)
      return
    }
  }

  const finalizeAccessPlacement = () => {
    if (!accessProcedure.plasterDone || accessProcedure.tourniquetOn) return
    if (!accessDraft.typeId || !accessDraft.siteId || !selectedAccessType?.gauge) return
    const actionName = `Venöser Zugang gelegt (${selectedAccessType.gauge}, ${selectedAccessSite.label})`
    onAction?.('iv_access_place', actionName, 3, 9, {
      accessTypeId: accessDraft.typeId,
      gauge: selectedAccessType.gauge,
      site: selectedAccessSite.label,
    })
    closeAccessModal()
  }

  const removeAccess = (access) => {
    if (!access?.id) return
    onAction?.('iv_access_remove', `Venösen Zugang entfernt (${access.gauge || 'PVK'}, ${access.site || 'unbekannt'})`, 2, 2, {
      accessId: access.id,
    })
  }

  const resetSurgicalMiniGame = () => {
    const seededDebris = surgicalDebrisTemplate.map((point, idx) => ({
      id: `debris_${idx}`,
      x: point.x,
      y: point.y,
      removed: false,
    }))
    setSurgicalStep('irrigate')
    setIrrigationProgress(0)
    setSurgicalAttachedToolId(null)
    setSurgicalDebris(seededDebris)
    setSurgicalLiftedDebrisId(null)
    setSurgicalDepositedCount(0)
    setSurgicalSuturePlaced([])
    setSurgicalSutureMistakes(0)
    setSurgicalThreadLoaded(false)
    setSurgicalBandageWraps(0)
    setSurgicalBandageDragging(false)
    setSurgicalBandageCarryPx(0)
    setSurgicalBandageLastPos(null)
    setSurgicalReadyToFinalize(false)
    setSurgicalFeedback('Schritt 1/4: Wunde mit steriler Lösung spülen.')
  }

  const openSurgicalMiniGame = () => {
    if (!hasWound) return
    setSurgicalSuturePattern(inferDefaultSuturePattern(affectedRegion, surgicalWoundType))
    resetSurgicalMiniGame()
    setSurgicalMiniOpen(true)
  }

  const inspectWoundCare = () => {
    if (!hasWound) return
    setInspectionType('wound')
    setInspectionResult('')
    setInspectionModalOpen(true)
  }

  const toFieldPercent = (event) => {
    if (!surgicalFieldRef.current) return null
    const rect = surgicalFieldRef.current.getBoundingClientRect()
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  const attachSurgicalTool = (toolId) => {
    setSurgicalAttachedToolId(toolId)
    if (toolId === 'thread' && surgicalStep === 'suture') {
      setSurgicalThreadLoaded(true)
      setSurgicalFeedback(`Nahtfaden vorbereitet (${suturePatternLabel}). Jetzt mit dem Nadelhalter präzise Stiche setzen.`)
      return
    }
    const toolName = surgicalTrayTools.find(t => t.id === toolId)?.label || 'Instrument'
    setSurgicalFeedback(`${toolName} aufgenommen.`)
  }

  const handleSurgicalFieldClick = (event) => {
    const pos = toFieldPercent(event)
    if (!pos) return

    if (surgicalStep === 'irrigate') {
      if (surgicalAttachedToolId !== 'irrigator') {
        setSurgicalFeedback('Bitte zuerst die Spüllanze vom Tablett aufnehmen.')
        return
      }
      if (distance(pos, surgicalWoundTarget) > surgicalWoundTarget.r) {
        setSurgicalFeedback('Direkt über der Wunde spülen.')
        return
      }
      setIrrigationProgress(prev => {
        const next = Math.min(100, prev + 14)
        if (next >= 100) {
          setSurgicalStep('debride')
          setSurgicalFeedback('Schritt 2/4: Debridement mit Pinzette aufnehmen und im Container entsorgen.')
        }
        return next
      })
      return
    }

    if (surgicalStep === 'debride') {
      if (surgicalAttachedToolId !== 'forceps') {
        setSurgicalFeedback('Für Debridement bitte die Pinzette verwenden.')
        return
      }
      if (surgicalLiftedDebrisId) {
        if (distance(pos, SURGICAL_CONTAINER_TARGET) <= SURGICAL_CONTAINER_TARGET.r) {
          setSurgicalDebris(prev => prev.map(item => item.id === surgicalLiftedDebrisId ? { ...item, removed: true } : item))
          setSurgicalLiftedDebrisId(null)
          setSurgicalDepositedCount(prev => {
            const next = prev + 1
            if (next >= surgicalDebrisTemplate.length) {
              setSurgicalStep('suture')
              setSurgicalFeedback(`Schritt 3/4: ${suturePatternLabel} — Nahtfaden laden und Stichpunkte treffen.`)
            } else {
              setSurgicalFeedback('Debridement entsorgt. Weiteren Fremdkörper aufnehmen.')
            }
            return next
          })
          return
        }
        setSurgicalFeedback('Entnommenes Material im blauen Container entsorgen.')
        return
      }
      const picked = surgicalDebris.find(item => !item.removed && distance(pos, item) <= 7)
      if (picked) {
        setSurgicalLiftedDebrisId(picked.id)
        setSurgicalFeedback('Debridement aufgenommen. Jetzt im Container ablegen.')
      } else {
        setSurgicalFeedback('Pinzette exakt auf sichtbares Debridement setzen.')
      }
      return
    }

    if (surgicalStep === 'suture') {
      if (surgicalAttachedToolId !== 'needle_driver') {
        setSurgicalFeedback('Für die Naht den Nadelhalter verwenden.')
        return
      }
      if (!surgicalThreadLoaded) {
        setSurgicalFeedback('Bitte zuerst den Nahtfaden vom Tablett laden.')
        return
      }
      const nextIndex = surgicalSuturePlaced.length
      const target = surgicalSutureTargetPoints[nextIndex]
      if (!target) return
      if (distance(pos, target) <= 5.6) {
        const next = [...surgicalSuturePlaced, nextIndex]
        setSurgicalSuturePlaced(next)
        if (next.length >= surgicalSutureTargetPoints.length) {
          setSurgicalStep('dress')
          setSurgicalFeedback('Schritt 4/4: Verbandrolle aufnehmen und mehrmals manuell um die Wunde wickeln.')
        } else {
          setSurgicalFeedback('Stich sitzt. Nächsten Stichpunkt treffen.')
        }
      } else {
        setSurgicalSutureMistakes(prev => prev + 1)
        setSurgicalFeedback('Fehlstich. Mit präziserem Winkel erneut ansetzen.')
      }
    }
  }

  const handleSurgicalMouseMove = (event) => {
    if (surgicalFieldRef.current) {
      const rect = surgicalFieldRef.current.getBoundingClientRect()
      setSurgicalFieldCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
    if (!surgicalBandageDragging || surgicalStep !== 'dress' || surgicalAttachedToolId !== 'bandage' || !surgicalFieldRef.current) return
    const pos = toFieldPercent(event)
    if (!pos) return
    const prevPos = surgicalBandageLastPos
    setSurgicalBandageLastPos(pos)
    if (!prevPos) return
    const segment = distance(pos, prevPos)
    setSurgicalBandageCarryPx(prevCarry => {
      let carry = prevCarry + segment
      let addedWraps = 0
      while (carry >= 22) {
        carry -= 22
        addedWraps += 1
      }
      if (addedWraps > 0) {
        setSurgicalBandageWraps(prevWraps => {
          const next = Math.min(8, prevWraps + addedWraps)
          if (next >= 8) {
            setSurgicalReadyToFinalize(true)
            setSurgicalBandageDragging(false)
            setSurgicalBandageLastPos(null)
            setSurgicalAttachedToolId(null)
            setSurgicalFeedback('Verband vollständig. Bitte Versorgung über "Abschließen" dokumentieren.')
          }
          return next
        })
      }
      return carry
    })
  }

  const handleSurgicalMouseDown = () => {
    if (surgicalStep !== 'dress' || surgicalAttachedToolId !== 'bandage') return
    setSurgicalBandageDragging(true)
    setSurgicalFeedback('Verband wird gewickelt ... weiterziehen bis vollständige Abdeckung.')
  }

  const handleSurgicalMouseUp = () => {
    if (!surgicalBandageDragging) return
    setSurgicalBandageDragging(false)
    setSurgicalBandageLastPos(null)
  }

  const finalizeSurgicalCare = () => {
    if (!surgicalReadyToFinalize || surgicalStep !== 'dress') return
    const quality = surgicalSutureMistakes <= 1 ? 'sehr gut' : surgicalSutureMistakes <= 3 ? 'gut' : 'ausreichend'
    onAction?.('wound_cleanse', 'Wundspülung abgeschlossen', 4, 10)
    onAction?.('wound_suture', `Wunde genäht (${suturePatternLabel}, ${surgicalWoundTypeLabel}, ${quality})`, 12, quality === 'sehr gut' ? 22 : 14)
    onAction?.('wound_dressing', `Steriler Verband (${quality})`, 4, 8)
    openSurgicalReportModal(`Interaktive Wundversorgung komplett (${quality})`)
    setSurgicalFeedback(`Abgeschlossen: sterile Wundversorgung (${quality}).`)
    setSurgicalMiniOpen(false)
  }

  const resetFractureMiniGame = () => {
    setFractureStep('padding')
    setFractureAttachedToolId(null)
    setFracturePaddingWraps(0)
    setFractureSplintFixations(0)
    setFractureCastDipCount(0)
    setFractureCastWraps(0)
    setFractureMoldPlaced([])
    setFractureDmsChecked(false)
    setFractureReadyToFinalize(false)
    setFractureBandageDragging(false)
    setFractureBandageCarryPx(0)
    setFractureBandageLastPos(null)
    setFractureFeedback('Schritt 1/6: Unterpolster aufnehmen und den Bereich zuerst weich polstern.')
  }

  const openFractureMiniGame = () => {
    if (!hasFracture) return
    resetFractureMiniGame()
    setFractureMiniOpen(true)
  }

  const inspectFractureCare = () => {
    if (!hasFracture) return
    setInspectionType('fracture')
    setInspectionResult('')
    setInspectionModalOpen(true)
  }

  const performInspection = () => {
    if (inspectionType === 'wound') {
      const inspectText = `Wundkontrolle (${affectedRegion}) - Status: ${woundStatusLabel}, Infektionsstufe ${woundInfectionStage}%`
      onAction?.('wound_inspect', inspectText, 2, 4)
      const resultText = woundInfectionStage >= 80
        ? 'Inspektion: deutliche Infektionszeichen (kritisch). Re-Versorgung und antiinfektive Therapie einleiten.'
        : woundInfectionStage >= 55
          ? 'Inspektion: progrediente Entzündungszeichen. Engmaschige Kontrolle und Re-Versorgung empfohlen.'
          : woundQualityScore >= 70
            ? 'Inspektion: Wunde reizarm, Verschluss ausreichend, Verlauf stabil.'
            : 'Inspektion: Versorgung noch nicht optimal. Reinigungs-/Naht-/Verbandskontrolle sinnvoll.'
      setInspectionResult(resultText)
      setSurgicalFeedback(resultText)
      return
    }
    const inspectText = `Fraktur-/Gipskontrolle (${affectedRegion}) - Immobilisation ${fractureImmobilizationScore}%`
    onAction?.('fracture_inspect', inspectText, 2, 4)
    const resultText = fractureImmobilizationScore >= 80
      ? 'Inspektion: Immobilisierung stabil, DMS unauffällig.'
      : fractureImmobilizationScore >= 55
        ? 'Inspektion: Immobilisierung grenzwertig. Nachmodellierung/Neuversorgung erwägen.'
        : 'Inspektion: unzureichende Ruhigstellung. Re-Gipsen empfohlen.'
    setInspectionResult(resultText)
    setFractureFeedback(resultText)
  }

  const attachFractureTool = (toolId) => {
    setFractureAttachedToolId(toolId)
    const toolName = fractureTrayTools.find((t) => t.id === toolId)?.label || 'Instrument'
    setFractureFeedback(`${toolName} aufgenommen.`)
  }

  const toFractureFieldPercent = (event) => {
    if (!fractureFieldRef.current) return null
    const rect = fractureFieldRef.current.getBoundingClientRect()
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  const handleFractureFieldClick = (event) => {
    const pos = toFractureFieldPercent(event)
    if (!pos) return
    if (fractureStep === 'splint') {
      if (fractureAttachedToolId === 'splint') {
        if (distance(pos, fractureTarget) > fractureTarget.r) {
          setFractureFeedback('Schiene direkt im Frakturbereich positionieren.')
          return
        }
        setFractureSplintFixations((prev) => {
          const next = Math.min(4, prev + 1)
          if (next >= 4) {
            setFractureStep('activate_cast')
            setFractureFeedback('Schiene sitzt. Gipsrolle aufnehmen und am Wasserbecken aktivieren.')
          }
          return next
        })
        return
      }
      setFractureFeedback('Bitte zuerst die Schiene aufnehmen.')
      return
    }
    if (fractureStep === 'activate_cast') {
      if (fractureAttachedToolId !== 'cast') {
        setFractureFeedback('Zum Aktivieren bitte die Gipsrolle aufnehmen.')
        return
      }
      if (distance(pos, FRACTURE_WATER_TARGET) > FRACTURE_WATER_TARGET.r) {
        setFractureFeedback('Gipsrolle im Wasserbecken aktivieren.')
        return
      }
      setFractureCastDipCount((prev) => {
        const next = Math.min(3, prev + 1)
        if (next >= 3) {
          setFractureStep('cast')
          setFractureFeedback('Gips aktiviert. Jetzt gleichmäßig wickeln.')
        }
        return next
      })
      return
    }
    if (fractureStep === 'mold') {
      if (fractureAttachedToolId !== 'cast') {
        setFractureFeedback('Zum Modellieren bitte Gipsrolle/Handkontakt behalten.')
        return
      }
      const idx = fractureMoldTargets.findIndex((point, pointIdx) => (
        !fractureMoldPlaced.includes(pointIdx) && distance(pos, point) <= 6
      ))
      if (idx < 0) {
        setFractureFeedback('Modellierungspunkte präzise abtasten.')
        return
      }
      setFractureMoldPlaced((prev) => {
        const next = [...prev, idx]
        if (next.length >= fractureMoldTargets.length) {
          setFractureStep('dms')
          setFractureAttachedToolId(null)
          setFractureFeedback('Modellierung abgeschlossen. Jetzt DMS-Kontrolle dokumentieren.')
        }
        return next
      })
      return
    }
    if ((fractureStep === 'cast' || fractureStep === 'dms') && fractureAttachedToolId !== 'cast') {
      setFractureFeedback('Für diesen Schritt bitte Gipsrolle verwenden.')
    }
  }

  const handleFractureMouseDown = () => {
    const isPaddingStep = fractureStep === 'padding' && fractureAttachedToolId === 'padding'
    const isCastStep = fractureStep === 'cast' && fractureAttachedToolId === 'cast' && fractureSplintFixations >= 4 && fractureCastDipCount >= 3
    if (!isPaddingStep && !isCastStep) return
    setFractureBandageDragging(true)
    if (isPaddingStep) setFractureFeedback('Unterpolster wird angelegt ... gleichmäßig umwickeln.')
    else setFractureFeedback('Gips wird gewickelt ... gleichmäßige Umläufe setzen.')
  }

  const handleFractureMouseMove = (event) => {
    if (fractureFieldRef.current) {
      const rect = fractureFieldRef.current.getBoundingClientRect()
      setFractureFieldCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
    const draggingPadding = fractureBandageDragging && fractureStep === 'padding' && fractureAttachedToolId === 'padding'
    const draggingCast = fractureBandageDragging && fractureStep === 'cast' && fractureAttachedToolId === 'cast'
    if ((!draggingPadding && !draggingCast) || !fractureFieldRef.current) return
    const pos = toFractureFieldPercent(event)
    if (!pos) return
    const prev = fractureBandageLastPos
    setFractureBandageLastPos(pos)
    if (!prev) return
    const segment = distance(pos, prev)
    setFractureBandageCarryPx((prevCarry) => {
      let carry = prevCarry + segment
      let added = 0
      const threshold = draggingPadding ? 20 : 24
      while (carry >= threshold) {
        carry -= threshold
        added += 1
      }
      if (added > 0) {
        if (draggingPadding) {
          setFracturePaddingWraps((prevWraps) => {
            const next = Math.min(6, prevWraps + added)
            if (next >= 6) {
              setFractureStep('splint')
              setFractureBandageDragging(false)
              setFractureBandageLastPos(null)
              setFractureAttachedToolId(null)
              setFractureFeedback('Unterpolster vollständig. Jetzt Schiene aufnehmen und 4x fixieren.')
            }
            return next
          })
        } else {
          setFractureCastWraps((prevWraps) => {
            const next = Math.min(12, prevWraps + added)
            if (next >= 12) {
              setFractureStep('mold')
              setFractureBandageDragging(false)
              setFractureBandageLastPos(null)
              setFractureFeedback('Gipswicklung komplett. Jetzt gezielt modellieren.')
            }
            return next
          })
        }
      }
      return carry
    })
  }

  const handleFractureMouseUp = () => {
    if (!fractureBandageDragging) return
    setFractureBandageDragging(false)
    setFractureBandageLastPos(null)
  }

  const finalizeFractureCare = () => {
    if (!fractureReadyToFinalize) return
    const qualityScore = ((fracturePaddingWraps / 6) * 16)
      + ((fractureSplintFixations / 4) * 20)
      + ((fractureCastDipCount / 3) * 14)
      + ((fractureCastWraps / 12) * 30)
      + ((fractureMoldPlaced.length / Math.max(1, fractureMoldTargets.length)) * 14)
      + (fractureDmsChecked ? 6 : 0)
    const quality = qualityScore >= 90 ? 'stabil' : qualityScore >= 70 ? 'ausreichend' : 'kritisch'
    onAction?.('fracture_stabilize', `Temporäre Immobilisierung (${fractureTypeLabel})`, 8, 10)
    onAction?.('cast_apply', `${castVariant} angelegt (${quality})`, 10, quality === 'stabil' ? 18 : 12)
    openSurgicalReportModal(`Temporäre Fraktur-Immobilisierung (${fractureTypeLabel}, ${quality})`)
    setFractureMiniOpen(false)
  }

  const saveSurgicalReport = () => {
    const region = String(reportDraft.region || '').trim()
    const indikation = String(reportDraft.indikation || '').trim()
    const massnahmen = String(reportDraft.massnahmen || '').trim()
    const beurteilung = String(reportDraft.beurteilung || '').trim()
    if (!region || !indikation || !massnahmen || !beurteilung) return
    if (typeof onUpsertPatientDocument === 'function' && patient?.id) {
      onUpsertPatientDocument(patient.id, {
        title: `Chirurgischer Versorgungsbericht ${new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
        type: 'surgical_bericht',
        templateId: 'surgical_bericht',
        color: 'amber',
        fields: {
          region,
          indikation,
          massnahmen,
          beurteilung,
          signedBy: currentUser?.name || 'Arzt',
        },
      })
    }
    setReportModalOpen(false)
  }

  const runManualTemperature = () => {
    const base = Number(patient?.vitals?.temp || 36.8)
    const measured = Math.max(34.5, Math.min(41.5, +(base + (Math.random() * 0.6 - 0.3)).toFixed(1)))
    setManualTemp(measured)
    onAction?.('temp_measure', `Temperatur manuell gemessen (${measured.toFixed(1)} °C)`, 2, 3)
  }

  const runAlcoholMeasurement = () => {
    const hints = `${patient?.chiefComplaint || ''} ${(patient?.symptoms || []).join(' ')}`.toLowerCase()
    const likelyAlcohol = /alkohol|intox|betrunken|fahne|sturz nach alkohol/.test(hints)
    const measured = likelyAlcohol
      ? +(0.6 + Math.random() * 2.4).toFixed(2)
      : +(Math.random() * 0.35).toFixed(2)
    setManualAlcohol(measured)
    onAction?.('alcohol_test', `Atemalkohol gemessen (${measured.toFixed(2)} ‰)`, 2, measured >= 0.5 ? 6 : 4)
  }

  const completeBloodSugarMeasurement = () => {
    const profileText = `${patient?.chiefComplaint || ''} ${(patient?.symptoms || []).join(' ')} ${(patient?.presentingSymptoms || []).join(' ')}`.toLowerCase()
    const likelyHypo = /hypo|unterzucker|diabet|insulin|schweiß|kaltschweiß|verwirrt|kramp|bewusstlos/.test(profileText)
    const likelyHyper = /hyper|keto|polyurie|polydipsie|exsikkose|steroid/.test(profileText)
    const severe = String(patient?.triageLevel || '').toLowerCase() === 'rot'
    const nowMs = Date.now()
    const measuredAtMs = Number(manualBloodSugarMeasuredAt || 0)
    const elapsedMin = measuredAtMs > 0 ? Math.max(0, (nowMs - measuredAtMs) / 60000) : 240
    let baseline = Number(manualBloodSugarBaseline || 0)
    if (!baseline || !Number.isFinite(baseline)) {
      if (likelyHypo) baseline = Math.max(38, Math.min(74, Math.round(56 + Math.random() * 16)))
      else if (likelyHyper) baseline = Math.max(180, Math.min(420, Math.round(210 + Math.random() * 95)))
      else if (severe) baseline = Math.max(72, Math.min(220, Math.round(92 + Math.random() * 65)))
      else baseline = Math.max(74, Math.min(150, Math.round(90 + Math.random() * 30)))
    }
    const driftRange = Math.max(1, Math.min(12, elapsedMin * 0.55))
    const drift = Math.round((Math.random() * 2 - 1) * driftRange)
    const glycemicShift = computeRecentGlycemicMedicationShift(patient, nowMs)
    const nextBaseline = Math.max(35, Math.min(450, baseline + drift + glycemicShift))
    const measured = Math.max(35, Math.min(450, Math.round(nextBaseline + (Math.random() * 4 - 2))))
    setBloodSugarPending(true)
    const delayMs = 2400 + Math.floor(Math.random() * 2200)
    window.setTimeout(() => {
      setManualBloodSugarBaseline(nextBaseline)
      setManualBloodSugarMeasuredAt(new Date().toISOString())
      setManualBloodSugar(measured)
      setBloodSugarPending(false)
      onAction?.('glucose_check', `BZ kapillär gemessen (${measured} mg/dl)`, 2, 4)
    }, delayMs)
  }

  const runBloodSugarMeasurement = () => {
    if (bloodSugarPending) return
    setBzMiniOpen(true)
    setBzMiniHits(0)
    setBzMiniPos(8)
    setBzMiniDir(1)
    setBzMiniFeedback('')
  }

  const tapBzMiniGame = () => {
    if (!bzMiniOpen) return
    const inTarget = bzMiniPos >= 42 && bzMiniPos <= 58
    if (!inTarget) {
      setBzMiniHits((prev) => Math.max(0, prev - 1))
      setBzMiniFeedback('Zu ungenau - nochmal stabilisieren')
      return
    }
    const nextHits = bzMiniHits + 1
    setBzMiniHits(nextHits)
    setBzMiniFeedback(nextHits >= 3 ? 'Probe sauber gewonnen' : 'Gute Probe - weiter so')
    if (nextHits >= 3) {
      setBzMiniOpen(false)
      completeBloodSugarMeasurement()
    }
  }

  const toggleInfusionPause = (id) => {
    const next = running.map(item => {
      if (item.id !== id || !item.active) return item
      return { ...item, paused: !item.paused }
    })
    persistRunning(next)
  }

  const markDebug = (label) => {
    setDebugClicks((v) => v + 1)
    setDebugLastAction(label)
  }

  const toggleDrawer = (key) => setDrawerOpen(prev => ({ ...prev, [key]: !prev?.[key] }))
  useEffect(() => {
    if (running.length > 0 && !drawerOpen.running) {
      setDrawerOpen(prev => ({ ...prev, running: true }))
    }
  }, [running.length, drawerOpen.running])
  useEffect(() => {
    if (!uiNotice) return undefined
    const t = setTimeout(() => setUiNotice(null), 2600)
    return () => clearTimeout(t)
  }, [uiNotice])
  useEffect(() => {
    if (rate > rateSliderMax) setRate(rateSliderMax)
  }, [rate, rateSliderMax])
  useEffect(() => {
    if (!bzMiniOpen) return undefined
    const timer = window.setInterval(() => {
      setBzMiniPos((prev) => {
        let next = prev + (bzMiniDir * 7.5)
        if (next >= 100) {
          setBzMiniDir(-1)
          next = 100
        } else if (next <= 0) {
          setBzMiniDir(1)
          next = 0
        }
        return next
      })
    }, 110)
    return () => clearInterval(timer)
  }, [bzMiniOpen, bzMiniDir])

  const DrawerSection = ({ id, title, colorClass, badge, children }) => (
    <div className={`rounded-2xl border ${colorClass || 'border-surface-200 bg-surface-50'} overflow-hidden`}>
      <button
        onClick={() => { if (id === 'running') return; markDebug(`drawer:${id}`); toggleDrawer(id) }}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left bg-white/60 hover:bg-white/90 transition-colors"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-surface-700">{title}</p>
        <div className="flex items-center gap-2">
          {badge ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 text-surface-700">{badge}</span> : null}
          {id === 'running'
            ? <span className="text-[10px] text-emerald-700 font-semibold">immer offen</span>
            : <ChevronRight className={`w-3.5 h-3.5 text-surface-500 transition-transform ${drawerOpen?.[id] ? 'rotate-90' : ''}`} />}
        </div>
      </button>
      {(id === 'running' || drawerOpen?.[id]) && (
        <div className="p-3 space-y-3 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
          <p className="font-semibold text-surface-900">Materialwagen</p>
          <div className="flex items-center gap-2">
            {canUseDebugTools && (
            <button
              onClick={() => setDebugOpen((v) => !v)}
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Debug
            </button>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-700">{startedCount} aktiv</span>
          </div>
        </div>

        <div ref={scrollRef} className="p-4 space-y-4 max-h-[66vh] overflow-y-auto">
          {uiNotice && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${uiNotice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {uiNotice.text}
            </div>
          )}
          {patient?.clinicalState?.vomit?.active && (
            <div className="rounded-xl border border-lime-200 bg-lime-50 px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-xs text-lime-800">Erbrochenes sichtbar: bitte reinigen.</p>
              <button
                onClick={() => {
                  markDebug('vomit_cleanup_top')
                  onAction?.('vomit_cleanup', 'Erbrochenes entfernt', 1, 2)
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Wegwischen
              </button>
            </div>
          )}
          {running.length > 0 && (
            <DrawerSection id="running" title="Laufende Infusionen" colorClass="border-blue-200 bg-blue-50" badge={`${running.length} Einträge`}>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {running.map(item => (
                <div key={item.id} className="rounded-xl border border-surface-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-surface-900">{item.label}</p>
                    <div className="flex items-center gap-1.5">
                      {item.active && (
                        <button onClick={() => { markDebug(`infusion_toggle:${item.id}`); toggleInfusionPause(item.id) }} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {item.paused ? 'Fortsetzen' : 'Pausieren'}
                        </button>
                      )}
                      <button onClick={() => { markDebug(`infusion_remove:${item.id}`); persistRunning(running.filter(x => x.id !== item.id)) }} className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-700">Verwerfen</button>
                    </div>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{Number(item.infused || 0).toFixed(1)}/{item.volume} ml • {item.rate} ml/h • {item.active ? (item.paused ? 'pausiert' : 'läuft') : 'leer'}</p>
                </div>
              ))}
            </div>
            </DrawerSection>
          )}
          <DrawerSection id="access" title="Venöser Zugang" colorClass="border-violet-200 bg-violet-50" badge={hasActiveAccess ? `${activeAccesses.length} aktiv` : '0 aktiv'}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5" /> Venöser Zugang
              </p>
              <button
                onClick={openAccessModal}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
              >
                Zugang legen
              </button>
            </div>
            {hasActiveAccess ? (
              <div className="space-y-2">
                {activeAccesses.map(access => (
                  <div key={access.id} className="rounded-xl border border-violet-200 bg-white p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-surface-800">{access.gauge || 'PVK'} • {access.site || 'unbekannte Stelle'}</p>
                      <p className="text-[11px] text-surface-500">
                        Liegt seit {new Date(access.placedAt || Date.now()).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {access?.complication ? ` • ${access.complication}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAccess(access)}
                      className="text-[11px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Ziehen
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-600">
                Kein aktiver Zugang. Für Infusionen, Transfusionen und i.v.-Pflichtmedikamente zuerst Zugang legen.
              </p>
            )}
          </DrawerSection>

          <DrawerSection id="infusion" title="Infusion & Transfusion" colorClass="border-sky-200 bg-sky-50" badge={`${startedCount} läuft`}>
            <div className="rounded-xl border border-blue-200 p-3 bg-gradient-to-r from-blue-50 to-cyan-50">
              <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">Laufrate</p>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range"
                  min={20}
                  max={rateSliderMax}
                  step={20}
                  value={effectiveRate}
                  onChange={(e) => setRate(Number(e.target.value || 500))}
                  className="flex-1"
                />
                <span className="text-xs font-semibold text-blue-800 w-24 text-right">{effectiveRate} ml/h</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ...[250, 500, 1000, 2000, 4000, 6000].filter(v => v <= rateSliderMax),
                    ...([250, 500, 1000, 2000, 4000, 6000].some(v => v <= rateSliderMax) ? [] : [rateSliderMax]),
                  ].map(v => (
                    <button
                      key={v}
                      onClick={() => setRate(Math.min(v, rateSliderMax))}
                      className={`text-[11px] px-2 py-1 rounded-full border ${effectiveRate === v ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-blue-700">{(effectiveRate / 1000).toFixed(2)} L/h</span>
              </div>
              <p className="text-[11px] text-blue-700/90 mt-2">
                Zugangskapazität: {hasActiveAccess ? `${accessRateCapacity} ml/h` : 'kein Zugang'} • Frei: {hasActiveAccess ? `${remainingRateCapacity} ml/h` : '0 ml/h'} • Max. gleichzeitige Gaben: {maxConcurrentInfusions}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 p-3 bg-red-50">
              <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide flex items-center gap-1.5"><TestTube2 className="w-3.5 h-3.5" /> Bedside-Test (Transfusion)</p>
              <label className="flex items-center gap-2 text-sm text-surface-700">
                <input type="checkbox" checked={bedsideTestOk} onChange={(e) => setBedsideTestOk(e.target.checked)} />
                Patienten-ID + Blutprodukt geprüft
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {BASE_ITEMS.map(item => {
                const stockId = STOCK_ID_BY_ITEM[item.id]
                const stock = Number((medicationInventory || {})[stockId] || 0)
                const stockMissing = stock <= 0
                const disabled = (item.category === 'transfusion' && !bedsideTestOk) || !hasActiveAccess || runningActiveCount >= maxConcurrentInfusions || remainingRateCapacity <= 0 || stockMissing
                const noStockText = stockMissing ? `${item.label}: nicht in der Apotheke vorhanden.` : ''
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setInfusionHoverNotice(noStockText)}
                    onMouseLeave={() => setInfusionHoverNotice((current) => (current === noStockText ? '' : current))}
                  >
                    <button
                      onClick={() => startItem(item)}
                      disabled={disabled}
                      title={noStockText}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border flex items-center justify-between ${
                        item.category === 'transfusion'
                          ? 'border-red-200 bg-red-50 text-red-700 disabled:opacity-50'
                          : 'border-blue-200 bg-blue-50 text-blue-700 disabled:opacity-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.category === 'transfusion' ? <Beaker className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                    </button>
                  </div>
                )
              })}
            </div>
            {infusionHoverNotice && (
              <p className="text-[11px] text-rose-700 mt-1">
                {infusionHoverNotice}
              </p>
            )}
            {!hasActiveAccess && (
              <p className="text-[11px] text-amber-700">
                Infusion/Transfusion gesperrt: bitte zuerst einen venösen Zugang legen.
              </p>
            )}
          </DrawerSection>

          <DrawerSection id="diagnostics" title="Schnelldiagnostik" colorClass="border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5" /> Temperatur
              </p>
              <button
                onClick={runManualTemperature}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
              >
                Manuell messen
              </button>
            </div>
            <p className="text-xs text-surface-600 mt-2">
              {manualTemp == null ? 'Noch keine manuelle Messung durchgeführt.' : `Letzte Messung: ${manualTemp.toFixed(1)} °C`}
            </p>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" /> Blutzucker (BZ)
                </p>
                <button
                  onClick={runBloodSugarMeasurement}
                  disabled={bloodSugarPending}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                >
                  {bloodSugarPending ? 'Analyse läuft ...' : 'Messen'}
                </button>
              </div>
              <p className="text-xs text-surface-600 mt-2">
                {manualBloodSugar == null
                  ? (bloodSugarPending ? 'Probe analysiert ... Ergebnis folgt in wenigen Sekunden.' : 'Noch keine BZ-Messung durchgeführt.')
                  : `Letzte Messung: ${manualBloodSugar} mg/dl`}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Beaker className="w-3.5 h-3.5" /> Atemalkohol
                </p>
                <button
                  onClick={() => { markDebug('alcohol_measure'); runAlcoholMeasurement() }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                >
                  Messen
                </button>
              </div>
              <p className="text-xs text-surface-600 mt-2">
                {manualAlcohol == null ? 'Noch keine Alkoholmessung durchgeführt.' : `Letzte Messung: ${manualAlcohol.toFixed(2)} ‰`}
              </p>
            </div>
            {patient?.clinicalState?.vomit?.active && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Erbrochenes am Patientenbett</p>
                  <button
                    onClick={() => {
                      markDebug('vomit_cleanup')
                      onAction?.('vomit_cleanup', 'Erbrochenes entfernt', 1, 2)
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Wegwischen
                  </button>
                </div>
                <p className="text-xs text-surface-600 mt-2">
                  Reinigung durchführen, damit der Patient sich beruhigen kann.
                </p>
              </div>
            )}
          </DrawerSection>

          <DrawerSection id="surgical" title="Chirurgische Versorgung" colorClass="border-emerald-200 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5"><ShieldPlus className="w-3.5 h-3.5" /> Chirurgische Versorgung</p>
            <div className="rounded-xl bg-white border border-emerald-200 p-3">
              <p className="text-xs text-surface-600">Betroffene Region</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-900">{affectedRegion}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${needsSurgicalCare ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                  {needsSurgicalCare ? 'Versorgung erforderlich' : 'Keine chirurgische Maßnahme indiziert'}
                </span>
              </div>
              {hasWound && (
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Wundtyp: {surgicalWoundTypeLabel}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Naht: {suturePatternLabel}</span>
                </div>
              )}
            </div>

            {hasWound && (
              <>
                <div className="rounded-xl bg-white border border-emerald-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-surface-600">Sterile Wundversorgung</p>
                      <p className="text-[11px] text-surface-500 mt-1">Interaktiver Ablauf mit Instrumententablett: Spülung, Debridement, Naht, Verband.</p>
                      <p className="text-[11px] text-surface-600 mt-2">Status: <span className="font-semibold">{woundStatusLabel}</span> · Qualitaet {woundQualityScore}% · Infektion {woundInfectionStage}%</p>
                  </div>
                    <div className="flex flex-col gap-2">
                    <button
                        onClick={openSurgicalMiniGame}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {dressingAlreadyDone ? 'Neu versorgen' : 'Versorgung beginnen'}
                      </button>
                      <button
                        onClick={inspectWoundCare}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        Kontrollieren
                    </button>
                  </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <img src={toolIrrigationAsset} alt="Spülset" className="w-full h-16 object-contain rounded-lg border border-surface-200 bg-surface-50" />
                    <img src={toolNeedleDriverAsset} alt="Nahtset" className="w-full h-16 object-contain rounded-lg border border-surface-200 bg-surface-50" />
                    <img src={toolBandageAsset} alt="Verbandset" className="w-full h-16 object-contain rounded-lg border border-surface-200 bg-surface-50" />
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-emerald-200 p-3 flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-emerald-600" />
                  <p className="text-[11px] text-surface-600">
                    Instrumentengestützt: Aufnehmen mit Maus, auf der Wunde arbeiten, Debridement in Container, präzise Naht und manuelles Verbinden.
                  </p>
                </div>
              </>
            )}

            {hasFracture && (
              <div className="rounded-xl bg-white border border-emerald-200 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-surface-600">Interaktive Frakturversorgung</p>
                    <p className="text-[11px] text-surface-500 mt-1">{fractureTypeLabel} • Ablauf: Unterpolster, Schiene, Aktivieren, Wickeln, Modellieren, DMS</p>
                    <p className="text-[11px] text-surface-600 mt-2">Status: <span className="font-semibold">{fractureStatusLabel}</span> · Immobilisation {fractureImmobilizationScore}%</p>
                </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={openFractureMiniGame}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {castAlreadyApplied ? 'Neu versorgen' : 'Versorgung beginnen'}
                  </button>
                    <button
                      onClick={inspectFractureCare}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Kontrollieren
                  </button>
                </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <img src={toolSplintAsset} alt="Schiene" className="w-full h-16 object-contain rounded-lg border border-surface-200 bg-surface-50" />
                  <img src={toolCastAsset} alt="Gipsrolle" className="w-full h-16 object-contain rounded-lg border border-surface-200 bg-surface-50" />
                </div>
                {hasOpenFracture && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    Offene Fraktur erkannt: Im Materialwagen nur provisorische Immobilisierung. Definitive Versorgung im OP.
                  </p>
                )}
              </div>
            )}

            {!needsSurgicalCare && (
              <div className="rounded-xl bg-white border border-surface-200 p-3 text-xs text-surface-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Für diesen Fall ist aktuell keine chirurgische Wund-/Gipsversorgung indiziert.
              </div>
            )}
          </DrawerSection>

          {canUseDebugTools && debugOpen && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              Klicks: {debugClicks} • Letzte Aktion: {debugLastAction} • Drawer: {JSON.stringify(drawerOpen)}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-2">Patient: {patient?.name || '—'}</p>

      {surgicalMiniOpen && hasWound && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setSurgicalMiniOpen(false)} />
          <div
            ref={surgicalModalRef}
            className="relative w-[96vw] max-w-[1500px] rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 space-y-3"
            onMouseMove={handleSurgicalMouseMove}
            onMouseUp={handleSurgicalMouseUp}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900">Chirurgische Wundversorgung ({affectedRegion})</p>
                <p className="text-xs text-surface-500">{surgicalWoundTypeLabel} • {suturePatternLabel} • Steriler Ablauf mit Instrumententablett</p>
            </div>
              <button onClick={() => setSurgicalMiniOpen(false)} className="btn-secondary text-xs">Schließen</button>
            </div>

            <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 space-y-3">
                <div
                  ref={surgicalFieldRef}
                  className="relative w-full h-[430px] rounded-lg border border-surface-200 bg-white overflow-hidden"
                  onClick={handleSurgicalFieldClick}
                  onMouseDown={handleSurgicalMouseDown}
                >
                  <img src={stagedWoundGraphic} alt={`Wunde ${affectedRegion}`} className="absolute inset-0 w-full h-full object-contain p-4 select-none pointer-events-none" />

                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                    <g opacity={contaminationOpacity}>
                      {contaminationPoints.map((point, idx) => (
                        <circle key={`contam_${idx}`} cx={point.x} cy={point.y} r={surgicalWoundType === 'stich' ? 1.5 : 1.9} fill="#7f1d1d" />
                      ))}
                    </g>
                    <path
                      d={woundContourFillPath}
                      fill="#7f1d1d"
                      opacity={0.12 + (debridementRemainingRatio * 0.2)}
                    />
                    <path
                      d={woundContourPath}
                      stroke={sutureCoverageRatio > 0.4 ? '#7f1d1d' : '#991b1b'}
                      strokeWidth={surgicalWoundType === 'stich' ? (sutureCoverageRatio > 0.5 ? '1.2' : '1.9') : (sutureCoverageRatio > 0.7 ? '1.4' : '2.1')}
                      opacity={0.88 - (sutureCoverageRatio * 0.25)}
                      fill="none"
                      strokeLinecap="round"
                    />
                    {surgicalSuturePattern === 'fortlaufend' && surgicalSutureTargetPoints.length > 1 && (
                      <polyline
                        points={surgicalSutureTargetPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="0.45"
                        strokeDasharray="1.2 1.1"
                        opacity="0.55"
                      />
                    )}
                    {surgicalSuturePattern === 'kreuz' && surgicalSutureTargetPoints.length >= 4 && (
                      <>
                        <line x1={surgicalSutureTargetPoints[0].x} y1={surgicalSutureTargetPoints[0].y} x2={surgicalSutureTargetPoints[1].x} y2={surgicalSutureTargetPoints[1].y} stroke="#0ea5e9" strokeWidth="0.55" strokeDasharray="1.2 1.1" opacity="0.6" />
                        <line x1={surgicalSutureTargetPoints[2].x} y1={surgicalSutureTargetPoints[2].y} x2={surgicalSutureTargetPoints[3].x} y2={surgicalSutureTargetPoints[3].y} stroke="#0ea5e9" strokeWidth="0.55" strokeDasharray="1.2 1.1" opacity="0.6" />
                      </>
                    )}
                    {surgicalSutureTargetPoints.map((point, idx) => {
                      if (!surgicalSuturePlaced.includes(idx)) return null
                      return (
                        <g key={`stitch_line_${idx}`} opacity={0.9}>
                          <line x1={point.x - 1.1} y1={point.y - 1.2} x2={point.x + 1.1} y2={point.y + 1.2} stroke="#0f766e" strokeWidth="0.7" />
                          <line x1={point.x - 1.1} y1={point.y + 1.2} x2={point.x + 1.1} y2={point.y - 1.2} stroke="#0f766e" strokeWidth="0.7" />
                    </g>
                  )
                })}
                    {bandageCoverageRatio > 0 && (
                      <g opacity={0.45 + (bandageCoverageRatio * 0.4)}>
                        <rect x={surgicalWoundType === 'stich' ? 45 : 34} y={surgicalWoundType === 'stich' ? 47 : 45} width={(surgicalWoundType === 'stich' ? 16 : 36) * bandageCoverageRatio} height="3.7" rx="1.6" fill="#e2e8f0" />
                        <rect x={(surgicalWoundType === 'stich' ? 46 : 34) + (12 * (1 - bandageCoverageRatio))} y={surgicalWoundType === 'stich' ? 51 : 50} width={(surgicalWoundType === 'stich' ? 14 : 30) * bandageCoverageRatio} height="3.7" rx="1.6" fill="#e2e8f0" />
                        <rect x={(surgicalWoundType === 'stich' ? 47 : 36) + (8 * (1 - bandageCoverageRatio))} y={surgicalWoundType === 'stich' ? 55 : 55} width={(surgicalWoundType === 'stich' ? 12 : 33) * bandageCoverageRatio} height="3.7" rx="1.6" fill="#e2e8f0" />
                      </g>
                    )}
                    {debridementRemainingRatio > 0 && (
                      <ellipse cx="53" cy="52" rx={11 * debridementRemainingRatio} ry={5.5 * debridementRemainingRatio} fill="#7f1d1d" opacity="0.17" />
                    )}
              </svg>

                  <div
                    className="absolute rounded-full border-2 border-rose-300/80 bg-rose-100/40 pointer-events-none"
                    style={{
                      left: `${surgicalWoundTarget.x}%`,
                      top: `${surgicalWoundTarget.y}%`,
                      width: `${surgicalWoundTarget.r * 1.65}%`,
                      height: `${surgicalWoundTarget.r * 1.65}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />

                  {surgicalDebris.map(item => !item.removed && (
                    <img
                      key={item.id}
                      src={debridementFragmentAsset}
                      alt=""
                      className={`absolute w-8 h-8 object-contain ${surgicalLiftedDebrisId === item.id ? 'opacity-35' : 'opacity-95'}`}
                      style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  ))}

                  <div
                    className="absolute w-[16%] min-w-[90px] rounded-lg border-2 border-cyan-500 bg-cyan-50 p-1"
                    style={{ left: `${SURGICAL_CONTAINER_TARGET.x}%`, top: `${SURGICAL_CONTAINER_TARGET.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <img src={debridementContainerAsset} alt="Container" className="w-full h-16 object-contain pointer-events-none" />
                    <p className="text-[10px] text-cyan-800 text-center mt-1">{surgicalDepositedCount}/{surgicalDebrisTemplate.length}</p>
            </div>

                  {surgicalSutureTargetPoints.map((point, idx) => {
                    const done = surgicalSuturePlaced.includes(idx)
                    return (
                      <div
                        key={`suture_target_${idx}`}
                        className={`absolute rounded-full border ${done ? 'bg-emerald-500 border-emerald-600' : 'bg-white/80 border-emerald-400'}`}
                        style={{ left: `${point.x}%`, top: `${point.y}%`, width: '14px', height: '14px', transform: 'translate(-50%, -50%)' }}
                      />
                    )
                  })}

                  {surgicalAttachedToolId && (
                    <div
                      className="absolute pointer-events-none z-30"
                      style={{
                        left: surgicalFieldCursorPos.x,
                        top: surgicalFieldCursorPos.y,
                        transform: `translate(${-surgicalCursorHotspot.x}px, ${-surgicalCursorHotspot.y}px)`,
                      }}
                    >
                      {surgicalCursorAsset ? (
                        <img
                          src={surgicalCursorAsset}
                          alt=""
                          className="object-contain drop-shadow-lg"
                          style={surgicalCursorStyle}
                        />
                      ) : null}
                    </div>
                  )}

                  {surgicalLiftedDebrisId && (
                    <img
                      src={debridementFragmentAsset}
                      alt=""
                      className="absolute w-7 h-7 object-contain pointer-events-none z-40"
                      style={{
                        left: surgicalFieldCursorPos.x + (surgicalCursorHotspot?.carry?.x || 0),
                        top: surgicalFieldCursorPos.y + (surgicalCursorHotspot?.carry?.y || -8),
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </div>

                <div className="rounded-lg border border-surface-200 bg-white p-2">
                  <p className="text-[11px] text-surface-500 mb-2">Instrumententablett</p>
                  <div className="grid grid-cols-5 gap-2">
                    {surgicalTrayTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => attachSurgicalTool(tool.id)}
                        className={`rounded-lg border p-1.5 text-center transition ${surgicalAttachedToolId === tool.id ? 'border-primary-500 ring-2 ring-primary-200 bg-primary-50' : 'border-surface-200 bg-surface-50 hover:border-surface-300'}`}
                      >
                        <img
                          src={tool.asset}
                          alt={tool.label}
                          className="w-full h-14 object-contain"
                          style={SURGICAL_TRAY_IMAGE_STYLE[tool.id] || undefined}
                        />
                        <p className="text-[10px] font-medium text-surface-800">{tool.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-surface-200 bg-white p-3 space-y-3">
                <p className="text-xs font-semibold text-surface-700">{surgicalFeedback}</p>
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-2">
                  <p className="text-[11px] text-surface-600 mb-1">Nahtmuster</p>
                  <div className="flex gap-2">
                    {['einzelknopf', 'fortlaufend', 'kreuz'].map((patternId) => (
                      <button
                        key={patternId}
                        onClick={() => {
                          if (surgicalStep === 'dress') return
                          setSurgicalSuturePattern(patternId)
                          setSurgicalSuturePlaced([])
                          setSurgicalSutureMistakes(0)
                          if (surgicalStep === 'suture') {
                            setSurgicalFeedback(`${SURGICAL_SUTURE_PATTERN_LABELS[patternId]} aktiv. Präzise auf die Markierungen nähen.`)
                          }
                        }}
                        className={`text-[11px] px-2 py-1 rounded border ${surgicalSuturePattern === patternId ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'}`}
                      >
                        {SURGICAL_SUTURE_PATTERN_LABELS[patternId]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">Empfehlung: {SURGICAL_SUTURE_PATTERN_LABELS[inferDefaultSuturePattern(affectedRegion, surgicalWoundType)]}</p>
                </div>
                <div className="space-y-2 text-xs text-surface-600">
                  <div className="flex items-center justify-between"><span>Spülung</span><span className="font-semibold">{Math.round(irrigationProgress)}%</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${irrigationProgress}%` }} /></div>
                  <div className="flex items-center justify-between"><span>Debridement entsorgt</span><span className="font-semibold">{surgicalDepositedCount}/{surgicalDebrisTemplate.length}</span></div>
                  <div className="flex items-center justify-between"><span>Nahtpunkte</span><span className="font-semibold">{surgicalSuturePlaced.length}/{surgicalSutureTargetPoints.length}</span></div>
                  <div className="flex items-center justify-between"><span>Fehlstiche</span><span className="font-semibold">{surgicalSutureMistakes}</span></div>
                  <div className="flex items-center justify-between"><span>Verbandwicklungen</span><span className="font-semibold">{surgicalBandageWraps}/8</span></div>
                </div>
                {surgicalStep === 'dress' && (
                  <button
                    onClick={finalizeSurgicalCare}
                    disabled={!surgicalReadyToFinalize}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Abschließen
                  </button>
                )}
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-2 text-[11px] text-surface-600">
                  <p>Workflow:</p>
                  <p>1) Spüllanze aufnehmen, in der Wundzone klicken.</p>
                  <p>2) Pinzette nutzen, Debridement aufnehmen und im Container ablegen.</p>
                  <p>3) Nahtfaden laden, danach mit Nadelhalter die Markierungen präzise treffen.</p>
                  <p>4) Verbandrolle aufnehmen, mit gedrückter Maustaste mehrfach umwickeln.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {fractureMiniOpen && hasFracture && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setFractureMiniOpen(false)} />
          <div
            className="relative w-[95vw] max-w-[1450px] max-h-[94vh] overflow-y-auto rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50/70 via-white to-white shadow-2xl p-4 sm:p-5 space-y-4"
            onMouseMove={handleFractureMouseMove}
            onMouseUp={handleFractureMouseUp}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900">Frakturversorgung ({affectedRegion})</p>
                <p className="text-xs text-surface-600">{fractureTypeLabel} • Nicht-invasive Versorgung im Materialwagen</p>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{fractureTypeLabel}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{castVariant}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Keine invasive Frakturtherapie</span>
                </div>
                <p className="text-[11px] text-surface-500 mt-1">{fractureCareLabel}</p>
              </div>
              <button onClick={() => setFractureMiniOpen(false)} className="btn-secondary text-xs">Schließen</button>
            </div>

            <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-4">
              <div className="rounded-2xl border border-amber-100 bg-white p-3 sm:p-4 space-y-3">
                <div className="rounded-xl border border-amber-100 bg-amber-50/65 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <p className="font-semibold text-amber-800">{fractureStepTitle}</p>
                    <span className="font-semibold text-amber-700">{Math.round(fractureOverallProgress)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${fractureOverallProgress}%` }} />
                  </div>
                </div>
                <div
                  ref={fractureFieldRef}
                  className="relative w-full h-[430px] rounded-xl border border-amber-100 bg-[#fffaf5] overflow-hidden"
                  onClick={handleFractureFieldClick}
                  onMouseDown={handleFractureMouseDown}
                >
                  <img src={fractureGraphic} alt={fractureTypeLabel} className="absolute inset-0 w-full h-full object-contain p-4 select-none pointer-events-none" />
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                    <path
                      d={affectedRegion === 'Arm' ? 'M42 52 L51 46 L60 54' : 'M44 56 L52 50 L64 58'}
                      stroke="#991b1b"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinecap="round"
                      opacity={0.7 - ((fractureSplintFixations / 3) * 0.16)}
                    />
                    <circle cx={fractureTarget.x} cy={fractureTarget.y} r={fractureTarget.r * 0.58} fill="#fecaca" opacity={0.16 + ((1 - (fractureSplintFixations / 3)) * 0.18)} />
                    {fractureSplintFixations > 0 && (
                      <g opacity={0.35 + (fractureSplintFixations * 0.18)}>
                        <rect x={fractureTarget.x - 18} y={fractureTarget.y - 7} width={36} height={4} rx="1.5" fill="#94a3b8" />
                        <rect x={fractureTarget.x - 17} y={fractureTarget.y + 3} width={34} height={4} rx="1.5" fill="#94a3b8" />
                      </g>
                    )}
                    {fracturePaddingWraps > 0 && (
                      <g opacity={0.25 + (fracturePaddingWraps / 10)}>
                        <rect x={fractureTarget.x - 21} y={fractureTarget.y - 10} width={(fracturePaddingWraps / 6) * 42} height={4} rx="1.6" fill="#fef3c7" />
                        <rect x={fractureTarget.x - 20} y={fractureTarget.y - 3} width={(fracturePaddingWraps / 6) * 39} height={4} rx="1.6" fill="#fef3c7" />
                        <rect x={fractureTarget.x - 19} y={fractureTarget.y + 4} width={(fracturePaddingWraps / 6) * 36} height={4} rx="1.6" fill="#fef3c7" />
                      </g>
                    )}
                    {fractureCastWraps > 0 && (
                      <g opacity={0.22 + (fractureCastWraps / 13)}>
                        <rect x={fractureTarget.x - 20} y={fractureTarget.y - 9} width={(fractureCastWraps / 12) * 40} height={5} rx="1.8" fill="#e2e8f0" />
                        <rect x={fractureTarget.x - 19} y={fractureTarget.y - 1} width={(fractureCastWraps / 12) * 37} height={5} rx="1.8" fill="#e2e8f0" />
                        <rect x={fractureTarget.x - 18} y={fractureTarget.y + 7} width={(fractureCastWraps / 12) * 34} height={5} rx="1.8" fill="#e2e8f0" />
                      </g>
                    )}
                  </svg>

                  <div
                    className="absolute rounded-full border-2 border-rose-300/85 bg-rose-100/35 pointer-events-none"
                    style={{
                      left: `${fractureTarget.x}%`,
                      top: `${fractureTarget.y}%`,
                      width: `${fractureTarget.r * 1.72}%`,
                      height: `${fractureTarget.r * 1.72}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />

                  <div
                    className="absolute w-[15%] min-w-[88px] rounded-lg border-2 border-cyan-500 bg-cyan-50 p-1 pointer-events-none"
                    style={{ left: `${FRACTURE_WATER_TARGET.x}%`, top: `${FRACTURE_WATER_TARGET.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-full h-14 rounded bg-gradient-to-b from-cyan-200 to-cyan-400 border border-cyan-300" />
                    <p className="text-[10px] text-cyan-800 text-center mt-1">Aktivierung {fractureCastDipCount}/3</p>
                  </div>

                  {fractureMoldTargets.map((point, idx) => {
                    const done = fractureMoldPlaced.includes(idx)
                    return (
                      <div
                        key={`fracture_mold_${idx}`}
                        className={`absolute rounded-full border ${done ? 'bg-emerald-500 border-emerald-600' : 'bg-white/80 border-indigo-400'}`}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          width: '12px',
                          height: '12px',
                          transform: 'translate(-50%, -50%)',
                          opacity: fractureStep === 'mold' || done ? 1 : 0.25,
                        }}
                      />
                    )
                  })}

                  {fractureAttachedToolId && (
                    <div
                      className="absolute pointer-events-none z-30"
                      style={{
                        left: fractureFieldCursorPos.x,
                        top: fractureFieldCursorPos.y,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {fractureCursorAsset ? (
                        <img
                          src={fractureCursorAsset}
                          alt=""
                          className="object-contain drop-shadow-lg"
                          style={fractureCursorStyle}
                        />
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-2.5">
                  <p className="text-[11px] text-amber-700 font-semibold mb-2">Instrumententablett</p>
                  <div className="grid grid-cols-3 gap-2">
                    {fractureTrayTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => attachFractureTool(tool.id)}
                        className={`rounded-xl border p-1.5 text-center transition ${fractureAttachedToolId === tool.id ? 'border-amber-400 ring-2 ring-amber-200 bg-white' : 'border-amber-100 bg-white hover:border-amber-300'}`}
                      >
                        <img
                          src={tool.asset}
                          alt={tool.label}
                          className="w-full h-12 object-contain"
                          style={SURGICAL_TRAY_IMAGE_STYLE[tool.id] || undefined}
                        />
                        <p className="text-[10px] font-medium text-surface-800">{tool.label}</p>
                        <p className="text-[9px] text-surface-500 mt-0.5">{tool.helper}</p>
              </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white p-3 sm:p-4 space-y-3">
                <div className="rounded-xl border border-amber-100 bg-amber-50/65 p-2.5">
                  <p className="text-xs font-semibold text-amber-900">{fractureFeedback}</p>
                </div>
                <div className="space-y-2.5 text-xs text-surface-700">
                  <div className="flex items-center justify-between"><span>Unterpolsterung</span><span className="font-semibold">{fracturePaddingWraps}/6</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${(fracturePaddingWraps / 6) * 100}%` }} /></div>
                  <div className="flex items-center justify-between"><span>Schienenfixierung</span><span className="font-semibold">{fractureSplintFixations}/4</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-slate-500" style={{ width: `${(fractureSplintFixations / 4) * 100}%` }} /></div>
                  <div className="flex items-center justify-between"><span>Gipsaktivierung</span><span className="font-semibold">{fractureCastDipCount}/3</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${(fractureCastDipCount / 3) * 100}%` }} /></div>
                  <div className="flex items-center justify-between"><span>Gipswicklungen</span><span className="font-semibold">{fractureCastWraps}/12</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-stone-500" style={{ width: `${(fractureCastWraps / 12) * 100}%` }} /></div>
                  <div className="flex items-center justify-between"><span>Modellierungspunkte</span><span className="font-semibold">{fractureMoldPlaced.length}/{fractureMoldTargets.length}</span></div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(fractureMoldPlaced.length / fractureMoldTargets.length) * 100}%` }} /></div>
                </div>
                {fractureStep === 'dms' && (
                  <button
                    onClick={() => {
                      setFractureDmsChecked(true)
                      setFractureReadyToFinalize(true)
                      setFractureFeedback('DMS-Kontrolle dokumentiert. Versorgung kann abgeschlossen werden.')
                    }}
                    disabled={fractureDmsChecked}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    DMS-Kontrolle dokumentieren
                  </button>
                )}
                {(fractureStep === 'dms' || fractureReadyToFinalize) && (
                  <button
                    onClick={finalizeFractureCare}
                    disabled={!fractureReadyToFinalize}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Abschließen
                  </button>
                )}
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5 text-[11px] text-surface-600 space-y-1">
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fracturePaddingWraps >= 6 ? 'text-emerald-600' : 'text-surface-400'}`} /> 1) Unterpolster 6x wickeln</div>
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fractureSplintFixations >= 4 ? 'text-emerald-600' : 'text-surface-400'}`} /> 2) Schiene 4x fixieren</div>
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fractureCastDipCount >= 3 ? 'text-emerald-600' : 'text-surface-400'}`} /> 3) Gipsrolle im Wasser aktivieren</div>
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fractureCastWraps >= 12 ? 'text-emerald-600' : 'text-surface-400'}`} /> 4) Gips 12x wickeln</div>
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fractureMoldPlaced.length >= fractureMoldTargets.length ? 'text-emerald-600' : 'text-surface-400'}`} /> 5) Gipsform modellieren</div>
                  <div className="flex items-center gap-1.5"><Check className={`w-3.5 h-3.5 ${fractureDmsChecked ? 'text-emerald-600' : 'text-surface-400'}`} /> 6) DMS kontrollieren</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {inspectionModalOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setInspectionModalOpen(false)} />
          <div className="relative w-[92vw] max-w-[980px] rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900">
                  {inspectionType === 'wound' ? `Wundinspektion (${affectedRegion})` : `Fraktur-/Gipsinspektion (${affectedRegion})`}
                </p>
                <p className="text-xs text-surface-500">
                  {inspectionType === 'wound'
                    ? 'Visuelle Verlaufskontrolle mit dokumentiertem Inspektionsbefund'
                    : 'Direkte Kontrolle von Schienung, Gips und äußerer Stabilität'}
                </p>
              </div>
              <button onClick={() => setInspectionModalOpen(false)} className="btn-secondary text-xs">Schließen</button>
            </div>

            <div className="grid md:grid-cols-[1.2fr,0.8fr] gap-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                <div className="relative h-[340px] rounded-lg border border-surface-200 bg-white overflow-hidden">
                  <img
                    src={inspectionType === 'wound' ? inspectionWoundGraphic : inspectionFractureGraphic}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none select-none"
                  />
                  {inspectionType === 'wound' && (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                      <ellipse
                        cx={surgicalWoundTarget.x}
                        cy={surgicalWoundTarget.y}
                        rx={surgicalWoundTarget.r * (woundInfectionStage >= 80 ? 1.1 : woundInfectionStage >= 55 ? 0.9 : 0.6)}
                        ry={surgicalWoundTarget.r * (woundInfectionStage >= 80 ? 0.62 : 0.5)}
                        fill={woundInfectionStage >= 80 ? '#b91c1c' : woundInfectionStage >= 55 ? '#dc2626' : '#fca5a5'}
                        opacity={woundInfectionStage >= 80 ? 0.28 : woundInfectionStage >= 55 ? 0.2 : 0.1}
                      />
                      {woundInfectionStage >= 55 && (
                        <>
                          <circle cx={surgicalWoundTarget.x - 5} cy={surgicalWoundTarget.y - 2} r="1.2" fill="#7f1d1d" opacity="0.6" />
                          <circle cx={surgicalWoundTarget.x + 4} cy={surgicalWoundTarget.y + 1} r="1.1" fill="#7f1d1d" opacity="0.55" />
                        </>
                      )}
                    </svg>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-surface-200 bg-white p-3 space-y-3">
                {inspectionType === 'wound' ? (
                  <>
                    <p className="text-xs text-surface-700">Wundverschluss: <span className="font-semibold">{Math.round(woundClosureForGraphics * 100)}%</span></p>
                    <p className="text-xs text-surface-700">Infektionsstufe: <span className="font-semibold">{woundInfectionStage}%</span></p>
                    <p className="text-xs text-surface-700">Status: <span className="font-semibold">{woundStatusLabel}</span></p>
                    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${
                      woundInspectionSeverity === 'critical'
                        ? 'bg-rose-100 text-rose-700'
                        : woundInspectionSeverity === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {woundInspectionSeverity === 'critical' ? 'kritischer Verlauf' : woundInspectionSeverity === 'warning' ? 'engmaschig kontrollieren' : 'stabiler Verlauf'}
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-surface-700">Immobilisation: <span className="font-semibold">{fractureImmobilizationScore}%</span></p>
                    <p className="text-xs text-surface-700">Status: <span className="font-semibold">{fractureStatusLabel}</span></p>
                    <p className="text-xs text-surface-700">DMS zuletzt: <span className="font-semibold">{fractureClinical?.dmsChecked ? 'dokumentiert' : 'offen'}</span></p>
                  </>
                )}

                <button
                  onClick={performInspection}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Kontrollieren / Inspizieren
                </button>
                {inspectionResult && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
                    {inspectionResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {accessModalOpen && (
        <div className="fixed inset-0 z-[94] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeAccessModal} />
          <div
            className="relative w-[96vw] max-w-[1600px] max-h-[95vh] overflow-y-auto rounded-3xl border border-surface-200 bg-white shadow-2xl p-4 sm:p-6"
            onMouseMove={(event) => {
              if (!accessAttachedToolId) return
              const rect = event.currentTarget.getBoundingClientRect()
              setAccessCursorPos({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
              <p className="font-semibold text-surface-900">Venösen Zugang legen</p>
                <p className="text-xs text-surface-500">
                  {accessDraft.stage === 'setup' ? '1/2 Vorbereitung' : '2/2 Minigame'}
                </p>
              </div>
              <button onClick={closeAccessModal} className="btn-secondary text-xs">Schließen</button>
            </div>
            {accessDraft.stage === 'setup' ? (
              <div className="mt-4 grid lg:grid-cols-[1.08fr_0.92fr] gap-5">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide mb-2">Zugangstyp / Viggo</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ACCESS_TYPES.map(type => {
                  const active = accessDraft.typeId === type.id
                        const previewByGauge = {
                          '14G': viggo14gAsset,
                          '16G': viggo16gAsset,
                          '18G': viggo18gAsset,
                          '20G': viggo20gAsset,
                          '22G': viggo22gAsset,
                        }
                  return (
                    <button
                      key={type.id}
                      onClick={() => setAccessDraft(prev => ({ ...prev, typeId: type.id, gauge: type.gauge }))}
                            className={`rounded-xl border p-2 text-left transition ${active ? 'border-violet-500 ring-2 ring-violet-200 bg-white' : 'border-violet-200 bg-white hover:border-violet-400'}`}
                    >
                            <img src={previewByGauge[type.gauge]} alt={type.label} className="w-full h-16 object-contain mb-1" />
                            <p className="text-xs font-semibold text-surface-800">{type.label}</p>
                            <p className="text-[10px] text-surface-500">{type.hint}</p>
                    </button>
                  )
                })}
              </div>
            </div>
                  <div className="rounded-2xl border border-violet-200 bg-white p-3">
                    <p className="text-xs text-surface-600 mb-1">Auswahl</p>
                    <p className="text-sm font-semibold text-surface-900">
                      {selectedAccessType.label} · {selectedAccessSite.label}
                    </p>
                    <p className="text-[11px] text-surface-500 mt-1">
                      Danach startet das Minigame mit den Schritten: Desinfizieren, Wischen, Desinfizieren, Stauen, Viggo legen, Entstauen, Pflaster.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide mb-2">Punktionsstelle</p>
                  <div className="relative h-80 rounded-xl border border-violet-200 bg-white overflow-hidden">
                    <img
                      src={armAsset}
                      alt="Arm Vorschau"
                      className="absolute inset-0 m-auto h-[92%] object-contain select-none pointer-events-none"
                      style={{ transform: shouldMirrorArm ? 'scaleX(-1)' : 'none' }}
                      draggable={false}
                    />
                  {ACCESS_SITES.map(site => {
                      const selected = accessDraft.siteId === site.id
                      const markerX = shouldMirrorArm ? (100 - site.x) : site.x
                    return (
                        <div
                        key={site.id}
                          style={{ left: `${markerX}%`, top: `${site.y}%` }}
                          className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 pointer-events-none ${
                          selected
                              ? 'bg-emerald-500 border-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.22)]'
                              : 'bg-white border-violet-300'
                        }`}
                        title={site.label}
                        />
                      )
                    })}
                    <div
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-emerald-600 bg-emerald-300/25 pointer-events-none shadow-[0_0_0_6px_rgba(16,185,129,0.18)]"
                      style={{ left: `${displayPunctureTarget.x}%`, top: `${displayPunctureTarget.y}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ACCESS_SITES.map(site => {
                      const selected = accessDraft.siteId === site.id
                      return (
                        <button
                          key={`selector-${site.id}`}
                          onClick={() => setAccessDraft(prev => ({ ...prev, siteId: site.id }))}
                          className={`h-9 rounded-lg border text-[11px] font-medium px-2.5 text-left transition ${
                            selected
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : 'bg-white border-violet-300 text-violet-700 hover:bg-violet-100'
                          }`}
                        >
                          {site.label}
                      </button>
                    )
                  })}
                </div>
                  <div className="mt-2 flex justify-end">
                    <button onClick={startAccessProcedure} className="btn-primary text-sm">
                      Minigame starten
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid xl:grid-cols-[1fr_360px] gap-5">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-surface-900">{selectedAccessType.label} · {selectedAccessSite.label}</p>
                    <button onClick={() => setAccessDraft(prev => ({ ...prev, stage: 'setup' }))} className="text-xs px-2 py-1 rounded bg-white border border-surface-200 hover:bg-surface-50">
                      Auswahl ändern
                    </button>
                  </div>
                  <div
                    ref={accessCanvasRef}
                    className="relative rounded-2xl border border-violet-200 bg-white overflow-hidden min-h-[470px] cursor-crosshair"
                    onClick={placeAccessToolOnArm}
                  >
                    <img
                      src={accessArmImage}
                      alt="Arm"
                      className="absolute inset-0 w-full h-full object-contain p-2"
                      style={{ transform: shouldMirrorArm ? 'scaleX(-1)' : 'none' }}
                      draggable={false}
                    />
                    {accessProcedure.viggoPlaced && (
                      <img
                        src={selectedViggoAsset}
                        alt="Viggo gelegt"
                        className="absolute object-contain pointer-events-none drop-shadow-md"
                        style={{
                          left: `${displayPunctureTarget.x}%`,
                          top: `${displayPunctureTarget.y}%`,
                          width: `${effectiveViggoWidth}px`,
                          height: `${effectiveViggoHeight}px`,
                          transform: `translate(${placedViggoTranslateX}%, ${placedViggoTranslateY}%) rotate(${placedViggoRotationDeg}deg) scaleX(${shouldMirrorPlacedViggo ? -1 : 1})`,
                        }}
                      />
                    )}
                    {accessProcedure.plasterDone && (
                      <img
                        src={accessPlasterAsset}
                        alt="Pflaster"
                        className="absolute object-contain pointer-events-none drop-shadow-sm"
                        style={{
                          left: `${displayPunctureTarget.x}%`,
                          top: `${displayPunctureTarget.y}%`,
                          width: `${ACCESS_OVERLAY_TUNING.plasterWidth}px`,
                          height: `${ACCESS_OVERLAY_TUNING.plasterHeight}px`,
                          transform: `translate(${ACCESS_OVERLAY_TUNING.plasterTranslateXPercent}%, ${ACCESS_OVERLAY_TUNING.plasterTranslateYPercent}%) rotate(${placedPlasterRotationDeg}deg)`,
                        }}
                      />
                    )}
                    <div
                      className="absolute w-6 h-6 rounded-full border-2 border-rose-500 bg-rose-100/60 pointer-events-none"
                      style={{
                        left: `${displayPunctureTarget.x}%`,
                        top: `${displayPunctureTarget.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                    <div
                      className="absolute w-10 h-10 rounded-full border border-indigo-400 bg-indigo-100/45 pointer-events-none"
                      style={{
                        left: `${displayUpperArmTarget.x}%`,
                        top: `${displayUpperArmTarget.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-surface-600 flex items-center gap-1.5">
                    <MousePointer2 className="w-3.5 h-3.5 text-violet-600" />
                    {accessHint || accessActiveInstruction}
                </p>
              </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-surface-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-700 mb-2">Tablett</p>
                    <div className="space-y-2">
                      {accessToolOrder.map((toolId) => {
                        const tool = accessTools[toolId]
                        const active = accessAttachedToolId === toolId
                        return (
                          <button
                            key={toolId}
                            onClick={() => attachAccessTool(toolId)}
                            className={`w-full rounded-xl border px-2.5 py-2 text-left flex items-center gap-2 transition ${
                              active ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-surface-200 bg-surface-50 hover:bg-white'
                            }`}
                          >
                            <img src={tool.image} alt={tool.label} className="w-20 h-14 object-contain" />
                            <div>
                              <p className="text-xs font-semibold text-surface-800">{tool.label}</p>
                              <p className="text-[10px] text-surface-500">Zum Arm bewegen und klicken</p>
            </div>
              </button>
                        )
                      })}
            </div>
                    <button
                      onClick={finalizeAccessPlacement}
                      disabled={!accessProcedure.plasterDone || accessProcedure.tourniquetOn}
                      className="mt-3 w-full text-sm px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Zugang final bestätigen
                    </button>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">Checkliste</p>
                    <div className="space-y-1.5">
                      {ACCESS_GAME_CHECKLIST.map(step => (
                        <div key={step.id} className={`flex items-center gap-2 text-xs ${accessChecklistState[step.id] ? 'text-emerald-700' : 'text-surface-600'}`}>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${accessChecklistState[step.id] ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-surface-300 text-transparent'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {accessAttachedToolId && accessDraft.stage === 'procedure' && (
              <div
                className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: accessCursorPos.x, top: accessCursorPos.y }}
              >
                <img
                  src={accessTools[accessAttachedToolId]?.image}
                  alt={accessTools[accessAttachedToolId]?.label || accessAttachedToolId}
                  className={`object-contain drop-shadow-lg ${accessAttachedToolId === 'viggo' ? 'w-44 h-32' : 'w-24 h-20'}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {reportModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setReportModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 space-y-3">
            <p className="font-semibold text-surface-900">Chirurgischen Versorgungsbericht ausfüllen</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-surface-500 mb-1">Region</p>
                <input value={reportDraft.region} onChange={(e) => setReportDraft(prev => ({ ...prev, region: e.target.value }))} className="input-field !py-2.5" />
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Indikation</p>
                <input value={reportDraft.indikation} onChange={(e) => setReportDraft(prev => ({ ...prev, indikation: e.target.value }))} className="input-field !py-2.5" />
              </div>
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Maßnahmen</p>
              <textarea value={reportDraft.massnahmen} onChange={(e) => setReportDraft(prev => ({ ...prev, massnahmen: e.target.value }))} className="input-field !h-28 resize-none" />
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Beurteilung</p>
              <textarea value={reportDraft.beurteilung} onChange={(e) => setReportDraft(prev => ({ ...prev, beurteilung: e.target.value }))} className="input-field !h-24 resize-none" placeholder="z. B. Wundränder adaptiert, DMS intakt, ambulante Verlaufskontrolle empfohlen." />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReportModalOpen(false)} className="btn-secondary text-sm">Abbrechen</button>
              <button onClick={saveSurgicalReport} className="btn-primary text-sm">Bericht speichern</button>
            </div>
          </div>
        </div>
      )}

      {bzMiniOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setBzMiniOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 bg-white shadow-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-surface-900">BZ-Messung (kapillär)</p>
                <p className="text-xs text-surface-500 mt-1">Ziel: 3 saubere Proben im optimalen Bereich.</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                {bzMiniHits}/3 Treffer
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-blue-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-3">
              <div className="flex items-center justify-between text-[11px] text-surface-600 mb-2">
                <span>Instabil</span>
                <span className="text-emerald-700 font-semibold">Optimaler Zielbereich</span>
                <span>Instabil</span>
              </div>
              <div className="relative h-10 rounded-xl bg-white border border-surface-200 overflow-hidden">
                <div className="absolute inset-y-0 left-[42%] w-[16%] bg-emerald-200/90 border-x border-emerald-400" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.20)]"
                  style={{ left: `${bzMiniPos}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <p className="text-xs mt-2 text-surface-600">{bzMiniFeedback || 'Klicke "Probe nehmen", wenn der Marker im gruenen Feld ist.'}</p>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setBzMiniOpen(false)} className="btn-secondary text-sm">Abbrechen</button>
              <button onClick={tapBzMiniGame} className="btn-primary text-sm">Probe nehmen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
