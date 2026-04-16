import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHospital } from '../context/HospitalContext'
import { getRdMoneyBonusPct } from '../data/shopSpecials'
import { RESCUE_STATIONS, getRescueStationById } from '../data/rescueStations'
import { listRescueStations, subscribeRescueStations } from '../services/rescueStationService'
import rdCityMapAsset from '../assets/rd-city-map.png'
import rdCityMapMarkedAsset from '../assets/rd-city-map-marked.png'
import einsatzFemaleNormalAsset from '../assets/rd-scene/einsatz-female-normal.png'
import einsatzFemalePainedAsset from '../assets/rd-scene/einsatz-female-pained.png'
import einsatzFemaleClosedeyesAsset from '../assets/rd-scene/einsatz-female-closedeyes.png'
import einsatzFemaleNormalAsset2 from '../assets/rd-scene/einsatz-female-normal-2.png'
import einsatzFemalePainedAsset2 from '../assets/rd-scene/einsatz-female-pained-2.png'
import einsatzFemaleClosedeyesAsset2 from '../assets/rd-scene/einsatz-female-closedeyes-2.png'
import einsatzMaleNormalAsset from '../assets/rd-scene/einsatz-male-normal.png'
import einsatzMalePainedAsset from '../assets/rd-scene/einsatz-male-pained.png'
import einsatzMaleClosedeyesAsset from '../assets/rd-scene/einsatz-male-closedeyes.png'
import einsatzMaleNormalAsset2 from '../assets/rd-scene/einsatz-male-normal-2.png'
import einsatzMalePainedAsset2 from '../assets/rd-scene/einsatz-male-pained-2.png'
import einsatzMaleClosedeyesAsset2 from '../assets/rd-scene/einsatz-male-closedeyes-2.png'
import rdMonitorAsset from '../assets/rd-scene/rd-monitor.png'
import rdBackpackAsset from '../assets/rd-scene/rd-backpack.png'
import rdBackpackInsideAsset from '../assets/rd-scene/rd-backpack-inside.png'
import rdOxybagAsset from '../assets/rd-scene/rd-oxybag.png'
import rdInfusionMarkerAsset from '../assets/rd-scene/infusion-marker.png'
import medAmpouleAsset from '../assets/rd-scene/med-ampoule.png'
import medAmpouleBrokenAsset from '../assets/rd-scene/med-ampoule-broken.png'
import medSyringeAsset from '../assets/rd-scene/med-syringe.svg'
import armAsset from '../assets/phlebotomy/arm.png'
import armFemaleAsset from '../assets/phlebotomy/arm-female.png'
import armWithTourniquetAsset from '../assets/phlebotomy/arm-with-tourniquet.png'
import disinfectantAsset from '../assets/phlebotomy/disinfectant.png'
import tourniquetAsset from '../assets/phlebotomy/tourniquet.png'
import swabAsset from '../assets/phlebotomy/swab.png'
import viggo14gAsset from '../assets/access/viggo-14g.png'
import viggo16gAsset from '../assets/access/viggo-16g.png'
import viggo18gAsset from '../assets/access/viggo-18g.png'
import viggo20gAsset from '../assets/access/viggo-20g.png'
import viggo22gAsset from '../assets/access/viggo-22g.png'
import accessPlasterAsset from '../assets/access/access-plaster.png'
import statusChangeSound from '../assets/sfx/status-change.mp3'
import pagerSound from '../assets/sfx/pager.mp3'
import rrManualSound from '../assets/sfx/rr-manuell.mp3'
import monitorNormalSound from '../assets/sfx/monitornormal.mp3'
import coughMaleSound from '../assets/sfx/cough_male.mp3'
import coughFemaleSound from '../assets/sfx/cough_female.mp3'
import spraySound from '../assets/sfx/spray.mp3'
import MonitorUI from '../components/equipment/MonitorUI'
import VentilatorUI from '../components/equipment/VentilatorUI'
import PhysicalExamModal from '../components/exam/PhysicalExamModal'
import PatientChat from '../components/PatientChat'
import { playOneShot, startLoop, stopLoop } from '../utils/soundManager'
import {
  Ambulance, Radio, MapPinned, Play, PauseCircle, Siren, ShieldAlert, Navigation, CheckCircle2, Clock, Wrench, Route, X, Pill, UserCheck, ChevronDown, ChevronUp, MousePointer2, Check,
} from 'lucide-react'

const RD_STATUS = [
  { id: '0', label: '0 - Not einsatzbereit' },
  { id: '1', label: '1 - Einsatzbereit über Funk' },
  { id: '2', label: '2 - Einsatzbereit auf Wache' },
  { id: '3', label: '3 - Einsatz übernommen (Anfahrt)' },
  { id: '4', label: '4 - Am Einsatzort' },
  { id: '5', label: '5 - Sprechwunsch' },
  { id: '6', label: '6 - Nicht einsatzbereit' },
  { id: '7', label: '7 - Am Zielort' },
  { id: '8', label: '8 - Frei in Klinik' },
]

const VEHICLES = [
  { id: 'rtw', label: 'RTW', requiredCourseId: 'rd_rtw' },
  { id: 'nef', label: 'NEF', requiredCourseId: 'rd_nef' },
  { id: 'ktw', label: 'KTW', requiredCourseId: 'rd_ktw' },
  { id: 'rth', label: 'RTH', requiredCourseId: 'rd_rth' },
]

const VEHICLE_PROFILES = {
  rtw: {
    travelMultiplier: 1.0,
    equipmentListIds: ['monitor', 'oxygen', 'backpack', 'ventilator'],
    moduleIds: ['diagnostics', 'dressings', 'access', 'ampullarium', 'io_access', 'airway', 'intubation', 'comfort'],
    ampullariumIds: ['adrenaline', 'atropine', 'salbutamol', 'ipratropium', 'prednisolone', 'dexamethasone', 'nitro', 'aspirin', 'heparin', 'fentanyl', 'ketamine', 'metamizole', 'ondansetron', 'dimenhydrinate', 'midazolam', 'naloxone', 'glucose', 'adenosine', 'tranexamic_acid', 'magnesium', 'insulin'],
    infusionIds: ['infusion_nacl', 'infusion_ringer', 'infusion_glucose5'],
    hasLucas: false,
    missionSeverities: ['low', 'medium', 'high'],
  },
  nef: {
    travelMultiplier: 1.26,
    equipmentListIds: ['monitor', 'oxygen', 'backpack'],
    moduleIds: ['diagnostics', 'access', 'ampullarium', 'io_access', 'airway', 'intubation'],
    ampullariumIds: ['adrenaline', 'amiodarone', 'atropine', 'fentanyl', 'ketamine', 'midazolam', 'morphine', 'etomidate', 'rocuronium', 'norepinephrine', 'naloxone', 'dexamethasone', 'salbutamol', 'ipratropium', 'adenosine', 'tranexamic_acid', 'magnesium', 'insulin'],
    infusionIds: ['infusion_nacl', 'infusion_ringer', 'infusion_glucose5', 'transfusion_ek'],
    hasLucas: true,
    missionSeverities: ['medium', 'high'],
  },
  ktw: {
    travelMultiplier: 0.82,
    equipmentListIds: ['oxygen', 'backpack'],
    moduleIds: ['diagnostics', 'dressings', 'comfort'],
    ampullariumIds: ['metamizole', 'ondansetron', 'dimenhydrinate', 'glucose'],
    infusionIds: ['infusion_nacl'],
    hasLucas: false,
    missionSeverities: ['low', 'medium'],
  },
  rth: {
    travelMultiplier: 1.62,
    equipmentListIds: ['monitor', 'oxygen', 'backpack'],
    moduleIds: ['diagnostics', 'dressings', 'access', 'ampullarium', 'io_access', 'airway', 'intubation', 'comfort'],
    ampullariumIds: ['adrenaline', 'amiodarone', 'atropine', 'fentanyl', 'ketamine', 'midazolam', 'morphine', 'etomidate', 'rocuronium', 'norepinephrine', 'naloxone', 'dexamethasone', 'salbutamol', 'ipratropium', 'adenosine', 'tranexamic_acid', 'magnesium', 'insulin'],
    infusionIds: ['infusion_nacl', 'infusion_ringer', 'infusion_glucose5', 'transfusion_ek'],
    hasLucas: true,
    missionSeverities: ['medium', 'high'],
  },
}

const MISSIONS = [
  { id: 'm1', text: 'Bewusstlose Person, unklare Lage', severity: 'high', x: 22, y: 30, priority: 'red' },
  { id: 'm2', text: 'Thoraxschmerz links, männlicher Patient 63 J.', severity: 'high', x: 68, y: 45, priority: 'red' },
  { id: 'm3', text: 'Sturzereignis, Sprunggelenk', severity: 'medium', x: 38, y: 62, priority: 'yellow' },
  { id: 'm4', text: 'Atemnot, bekannte COPD', severity: 'high', x: 74, y: 70, priority: 'red' },
  { id: 'm5', text: 'Dialysefahrt geplant', severity: 'low', x: 50, y: 22, priority: 'green' },
  { id: 'm6', text: 'Fieberkrampf bei Kind 6 J., wieder ansprechbar', severity: 'medium', x: 56, y: 78, priority: 'yellow' },
  { id: 'm7', text: 'Synkope nach Belastung', severity: 'low', x: 83, y: 34, priority: 'green' },
]

const CITY_HOSPITALS = [
  { id: 'kh_nord', name: 'Klinikum Nord', x: 32, y: 18 },
  { id: 'kh_zentral', name: 'Klinikum Zentral', x: 49, y: 50 },
  { id: 'kh_sued', name: 'Klinikum Süd', x: 64, y: 73 },
]

const ROAD_NODES = {
  n1: { x: 15, y: 24 }, n2: { x: 30, y: 22 }, n3: { x: 47, y: 20 }, n4: { x: 63, y: 22 }, n5: { x: 81, y: 24 },
  m1: { x: 14, y: 36 }, m2: { x: 28, y: 36 }, m3: { x: 45, y: 37 }, m4: { x: 62, y: 38 }, m5: { x: 79, y: 39 },
  c1: { x: 13, y: 50 }, c2: { x: 27, y: 50 }, c3: { x: 44, y: 50 }, c4: { x: 60, y: 52 }, c5: { x: 76, y: 53 },
  s1: { x: 16, y: 65 }, s2: { x: 30, y: 64 }, s3: { x: 46, y: 65 }, s4: { x: 61, y: 66 }, s5: { x: 74, y: 67 },
  r1: { x: 24, y: 16 }, r2: { x: 25, y: 30 }, r3: { x: 26, y: 45 }, r4: { x: 27, y: 59 }, r5: { x: 28, y: 74 },
  q1: { x: 44, y: 14 }, q2: { x: 44, y: 30 }, q3: { x: 44, y: 45 }, q4: { x: 45, y: 60 }, q5: { x: 46, y: 78 },
  p1: { x: 62, y: 14 }, p2: { x: 62, y: 30 }, p3: { x: 61, y: 45 }, p4: { x: 60, y: 60 }, p5: { x: 59, y: 76 },
}

const ROAD_EDGES = [
  ['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'],
  ['m1', 'm2'], ['m2', 'm3'], ['m3', 'm4'], ['m4', 'm5'],
  ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'c5'],
  ['s1', 's2'], ['s2', 's3'], ['s3', 's4'], ['s4', 's5'],
  ['r1', 'r2'], ['r2', 'r3'], ['r3', 'r4'], ['r4', 'r5'],
  ['q1', 'q2'], ['q2', 'q3'], ['q3', 'q4'], ['q4', 'q5'],
  ['p1', 'p2'], ['p2', 'p3'], ['p3', 'p4'], ['p4', 'p5'],
  ['n2', 'r1'], ['n3', 'q1'], ['n4', 'p1'],
  ['m2', 'r2'], ['m3', 'q2'], ['m4', 'p2'],
  ['c2', 'r3'], ['c3', 'q3'], ['c4', 'p3'],
  ['s2', 'r4'], ['s3', 'q4'], ['s4', 'p4'],
  ['q5', 's3'], ['p5', 's4'], ['r5', 's2'],
]

const ROAD_MASK_PRESETS = {
  strict: { lum: 0.86, sat: 0.12, min: 205 },
  balanced: { lum: 0.82, sat: 0.16, min: 190 },
  aggressive: { lum: 0.78, sat: 0.2, min: 175 },
}

const ROAD_SEED_POINTS_PCT = [
  [20, 24], [33, 22], [48, 21], [62, 22], [77, 24],
  [27, 35], [44, 36], [60, 38],
  [27, 50], [44, 50], [60, 52],
  [30, 64], [46, 65], [61, 66],
  [28, 74], [46, 77], [59, 76],
]

const VEHICLE_ICON_BY_ID = {
  rtw: '🚑',
  nef: '🚗',
  ktw: '🚐',
  rth: '🚁',
}

const SCENE_BACKGROUND = {
  male: {
    normal: [einsatzMaleNormalAsset, einsatzMaleNormalAsset2],
    pained: [einsatzMalePainedAsset, einsatzMalePainedAsset2],
    closedeyes: [einsatzMaleClosedeyesAsset, einsatzMaleClosedeyesAsset2],
  },
  female: {
    normal: [einsatzFemaleNormalAsset, einsatzFemaleNormalAsset2],
    pained: [einsatzFemalePainedAsset, einsatzFemalePainedAsset2],
    closedeyes: [einsatzFemaleClosedeyesAsset, einsatzFemaleClosedeyesAsset2],
  },
}

const RD_SCENE_GEAR = [
  { id: 'monitor', label: 'Monitor/Defi', image: rdMonitorAsset, widthPct: 14 },
  { id: 'oxygen', label: 'Sauerstofftasche', image: rdOxybagAsset, widthPct: 15 },
  { id: 'backpack', label: 'Rettungsrucksack', image: rdBackpackAsset, widthPct: 18 },
  { id: 'ventilator', label: 'Beatmungsgerät', image: rdOxybagAsset, widthPct: 14 },
  { id: 'ampullarium', label: 'Ampullarium', image: null, widthPct: 12 },
]
const RD_PLACED_GEAR_SCALE = 1.58

const RD_BACKPACK_MODULES = [
  { id: 'diagnostics', label: 'Diagnostik', x: 20, y: 26, tone: 'bg-sky-50 border-sky-200 text-sky-800' },
  { id: 'dressings', label: 'Verbände', x: 22, y: 48, tone: 'bg-amber-50 border-amber-200 text-amber-800' },
  { id: 'access', label: 'Zugangstasche', x: 21, y: 73, tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { id: 'ampullarium', label: 'Ampullarium', x: 62, y: 23, tone: 'bg-rose-50 border-rose-200 text-rose-800' },
  { id: 'io_access', label: 'IO-Zugänge', x: 72, y: 48, tone: 'bg-violet-50 border-violet-200 text-violet-800' },
  { id: 'airway', label: 'Atemweg + Beatmung', x: 79, y: 30, tone: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  { id: 'intubation', label: 'Intubation', x: 81, y: 54, tone: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { id: 'comfort', label: 'Kühlkissen / Sicksacks', x: 68, y: 80, tone: 'bg-lime-50 border-lime-200 text-lime-800' },
]

const RD_BACKPACK_MODULE_META = {
  diagnostics: { title: 'Diagnostik-Set', subtitle: 'Vitalchecks, Auskultation, Pupillenkontrolle', accent: 'from-sky-500 via-cyan-500 to-blue-500' },
  dressings: { title: 'Verbandmaterial', subtitle: 'Wundversorgung und Lokalisierung', accent: 'from-amber-500 via-orange-500 to-rose-500' },
  access: { title: 'Zugangsmodul', subtitle: 'i.v.-Zugang, Pneumothorax, Infusion', accent: 'from-emerald-500 via-teal-500 to-cyan-500' },
  ampullarium: { title: 'Ampullarium', subtitle: 'Medikamente und Dosierung', accent: 'from-fuchsia-500 via-pink-500 to-rose-500' },
  io_access: { title: 'IO-Zugänge', subtitle: 'Intraossärer Zugang', accent: 'from-violet-500 via-indigo-500 to-purple-500' },
  airway: { title: 'Atemweg + Beatmung', subtitle: 'Atemwegshilfen und Ambu', accent: 'from-cyan-500 via-sky-500 to-indigo-500' },
  intubation: { title: 'Intubation', subtitle: 'Atemwegssicherung', accent: 'from-indigo-500 via-blue-500 to-violet-500' },
  comfort: { title: 'Comfort-Care', subtitle: 'Symptomlinderung', accent: 'from-lime-500 via-green-500 to-emerald-500' },
}

const DRESSING_LOCATIONS = [
  { id: 'kopfwunde', label: 'Kopf/Skalp' },
  { id: 'thorax', label: 'Thorax' },
  { id: 'bauch', label: 'Abdomen' },
  { id: 'arm-links', label: 'Arm links' },
  { id: 'arm-rechts', label: 'Arm rechts' },
  { id: 'bein-links', label: 'Bein links' },
  { id: 'bein-rechts', label: 'Bein rechts' },
]

const AMPULLARIUM_ACTIONS = [
  { id: 'adrenaline', label: 'Adrenalin', unit: 'mg', defaultDose: 1, step: 0.1, min: 0.1, max: 2, category: 'Reanimation', route: 'i.v./i.o.' },
  { id: 'amiodarone', label: 'Amiodaron', unit: 'mg', defaultDose: 300, step: 10, min: 50, max: 450, category: 'Reanimation', route: 'i.v.' },
  { id: 'atropine', label: 'Atropin', unit: 'mg', defaultDose: 0.5, step: 0.1, min: 0.1, max: 3, category: 'Bradykardie', route: 'i.v.' },
  { id: 'adenosine', label: 'Adenosin', unit: 'mg', defaultDose: 6, step: 3, min: 3, max: 18, category: 'Tachykardie', route: 'i.v. Bolus' },
  { id: 'salbutamol', label: 'Salbutamol', unit: 'mg', defaultDose: 2.5, step: 0.5, min: 1.25, max: 10, category: 'Atemweg', route: 'inhalativ' },
  { id: 'ipratropium', label: 'Ipratropium', unit: 'mg', defaultDose: 0.5, step: 0.1, min: 0.1, max: 1.5, category: 'Atemweg', route: 'inhalativ' },
  { id: 'prednisolone', label: 'Prednisolon', unit: 'mg', defaultDose: 100, step: 10, min: 20, max: 250, category: 'Atemweg/Allergie', route: 'i.v.' },
  { id: 'dexamethasone', label: 'Dexamethason', unit: 'mg', defaultDose: 8, step: 1, min: 2, max: 16, category: 'Atemweg/Neuro', route: 'i.v.' },
  { id: 'magnesium', label: 'Magnesiumsulfat', unit: 'g', defaultDose: 2, step: 0.5, min: 1, max: 4, category: 'Rhythmus/Atemweg', route: 'i.v.' },
  { id: 'nitro', label: 'Nitrospray', unit: 'Hub', defaultDose: 1, step: 1, min: 1, max: 3, category: 'ACS', route: 'sublingual' },
  { id: 'aspirin', label: 'ASS', unit: 'mg', defaultDose: 250, step: 50, min: 100, max: 500, category: 'ACS', route: 'i.v./p.o.' },
  { id: 'heparin', label: 'Heparin', unit: 'IE', defaultDose: 5000, step: 500, min: 1000, max: 10000, category: 'ACS/Thrombose', route: 'i.v.' },
  { id: 'tranexamic_acid', label: 'Tranexamsäure', unit: 'mg', defaultDose: 1000, step: 250, min: 250, max: 2000, category: 'Trauma/Blutung', route: 'i.v.' },
  { id: 'fentanyl', label: 'Fentanyl', unit: 'mcg', defaultDose: 50, step: 25, min: 12.5, max: 200, category: 'Analgesie', route: 'i.v./intranasal' },
  { id: 'ketamine', label: 'Ketamin', unit: 'mg', defaultDose: 25, step: 5, min: 5, max: 100, category: 'Analgesie', route: 'i.v.' },
  { id: 'metamizole', label: 'Metamizol', unit: 'mg', defaultDose: 1000, step: 250, min: 250, max: 2500, category: 'Analgesie', route: 'i.v.' },
  { id: 'ondansetron', label: 'Ondansetron', unit: 'mg', defaultDose: 4, step: 1, min: 1, max: 8, category: 'Antiemese', route: 'i.v.' },
  { id: 'dimenhydrinate', label: 'Dimenhydrinat', unit: 'mg', defaultDose: 62, step: 10, min: 20, max: 100, category: 'Antiemese', route: 'i.v.' },
  { id: 'midazolam', label: 'Midazolam', unit: 'mg', defaultDose: 2.5, step: 0.5, min: 0.5, max: 10, category: 'Krampfanfall/Sedierung', route: 'i.v./intranasal' },
  { id: 'morphine', label: 'Morphin', unit: 'mg', defaultDose: 3, step: 1, min: 1, max: 10, category: 'Analgesie NEF', route: 'i.v.' },
  { id: 'etomidate', label: 'Etomidat', unit: 'mg', defaultDose: 10, step: 2, min: 4, max: 24, category: 'Narkoseeinleitung', route: 'i.v.' },
  { id: 'rocuronium', label: 'Rocuronium', unit: 'mg', defaultDose: 50, step: 10, min: 20, max: 100, category: 'RSI', route: 'i.v.' },
  { id: 'norepinephrine', label: 'Noradrenalin', unit: 'mcg/min', defaultDose: 20, step: 5, min: 5, max: 80, category: 'Vasopressor', route: 'Perfusor' },
  { id: 'naloxone', label: 'Naloxon', unit: 'mg', defaultDose: 0.4, step: 0.1, min: 0.1, max: 2, category: 'Intox', route: 'i.v./intranasal' },
  { id: 'glucose', label: 'Glukose 40%', unit: 'ml', defaultDose: 20, step: 5, min: 5, max: 60, category: 'Hypoglykaemie', route: 'i.v. Bolus' },
  { id: 'insulin', label: 'Insulin (kurzwirksam)', unit: 'IE', defaultDose: 4, step: 1, min: 1, max: 10, category: 'Hyperglykaemie', route: 'i.v. nach Protokoll' },
]

const RD_MEDICATION_PACKAGING = {
  adrenaline: { dosePerAmpoule: 1, unit: 'mg', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
  amiodarone: { dosePerAmpoule: 150, unit: 'mg', volumePerAmpouleMl: 3, sourceForms: ['Ampulle'] },
  atropine: { dosePerAmpoule: 0.5, unit: 'mg', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
  adenosine: { dosePerAmpoule: 6, unit: 'mg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle'] },
  salbutamol: { dosePerAmpoule: 2.5, unit: 'mg', volumePerAmpouleMl: 2.5, sourceForms: ['Ampulle', 'Spray/Inhalation'] },
  ipratropium: { dosePerAmpoule: 0.5, unit: 'mg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle', 'Spray/Inhalation'] },
  prednisolone: { dosePerAmpoule: 100, unit: 'mg', volumePerAmpouleMl: 10, sourceForms: ['Pulver', 'Ampulle'] },
  dexamethasone: { dosePerAmpoule: 8, unit: 'mg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle'] },
  magnesium: { dosePerAmpoule: 2, unit: 'g', volumePerAmpouleMl: 10, sourceForms: ['Ampulle'] },
  nitro: { dosePerAmpoule: 1, unit: 'Hub', volumePerAmpouleMl: 1, sourceForms: ['Spray/Inhalation'] },
  aspirin: { dosePerAmpoule: 500, unit: 'mg', volumePerAmpouleMl: 5, sourceForms: ['Ampulle', 'Tablette/Kapsel'] },
  heparin: { dosePerAmpoule: 5000, unit: 'IE', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
  tranexamic_acid: { dosePerAmpoule: 1000, unit: 'mg', volumePerAmpouleMl: 10, sourceForms: ['Ampulle'] },
  fentanyl: { dosePerAmpoule: 100, unit: 'mcg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle'] },
  ketamine: { dosePerAmpoule: 25, unit: 'mg', volumePerAmpouleMl: 2.5, sourceForms: ['Ampulle'] },
  metamizole: { dosePerAmpoule: 1000, unit: 'mg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle'] },
  ondansetron: { dosePerAmpoule: 4, unit: 'mg', volumePerAmpouleMl: 2, sourceForms: ['Ampulle'] },
  dimenhydrinate: { dosePerAmpoule: 62, unit: 'mg', volumePerAmpouleMl: 10, sourceForms: ['Ampulle'] },
  midazolam: { dosePerAmpoule: 5, unit: 'mg', volumePerAmpouleMl: 5, sourceForms: ['Ampulle'] },
  morphine: { dosePerAmpoule: 10, unit: 'mg', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
  etomidate: { dosePerAmpoule: 20, unit: 'mg', volumePerAmpouleMl: 10, sourceForms: ['Ampulle'] },
  rocuronium: { dosePerAmpoule: 50, unit: 'mg', volumePerAmpouleMl: 5, sourceForms: ['Ampulle'] },
  norepinephrine: { dosePerAmpoule: 100, unit: 'mcg/min', volumePerAmpouleMl: 50, sourceForms: ['Ampulle', 'Perfusor-Vorbereitung'] },
  naloxone: { dosePerAmpoule: 0.4, unit: 'mg', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
  glucose: { dosePerAmpoule: 20, unit: 'ml', volumePerAmpouleMl: 20, sourceForms: ['Ampulle'] },
  insulin: { dosePerAmpoule: 10, unit: 'IE', volumePerAmpouleMl: 1, sourceForms: ['Ampulle'] },
}

const AMPULLARIUM_SAFETY_RULES = {
  adrenaline: { windowMs: 12 * 60 * 1000, warningDose: 3, criticalDose: 6, unit: 'mg' },
  atropine: { windowMs: 20 * 60 * 1000, warningDose: 2.5, criticalDose: 4.5, unit: 'mg' },
  fentanyl: { windowMs: 20 * 60 * 1000, warningDose: 300, criticalDose: 450, unit: 'mcg' },
  midazolam: { windowMs: 20 * 60 * 1000, warningDose: 15, criticalDose: 25, unit: 'mg' },
  morphine: { windowMs: 25 * 60 * 1000, warningDose: 12, criticalDose: 20, unit: 'mg' },
}

const RD_INFUSIONS = [
  { id: 'infusion_nacl', label: 'NaCl 0.9% 500 ml', volume: 500 },
  { id: 'infusion_ringer', label: 'Ringer 500 ml', volume: 500 },
  { id: 'infusion_glucose5', label: 'Glucose 5% 500 ml', volume: 500 },
  { id: 'transfusion_ek', label: 'EK 1 Konserve', volume: 280 },
]

// Manual tuning point for ampoule mini-game visuals.
// Use these values to adjust size/transition behavior of intact/broken ampoule.
const RD_AMPOULE_MINIGAME_TUNING = {
  imageHeightPx: 196,
  brokenScale: 0.9,
  snapScale: 0.95,
}

const SCENE_SUPPORT_UNITS = [
  { id: 'nef', label: 'NEF nachfordern', etaSec: 22, note: 'Notärztliche Unterstützung verfügbar.' },
  { id: 'rth', label: 'RTH nachfordern', etaSec: 34, note: 'Luftrettung in Bereitschaft für zeitkritischen Transport.' },
  { id: 'fire', label: 'Feuerwehr nachfordern', etaSec: 28, note: 'Technische Hilfe / Sicherheit vor Ort verfügbar.' },
  { id: 'hearse', label: 'Leichenwagen nachfordern', etaSec: 45, note: 'Bestatterdienst angefordert.' },
]

const ACCESS_TYPES = [
  { id: 'pvk_14g', label: 'PVK 14G', gauge: '14G', hint: 'großlumig', color: 'bg-orange-500 border-orange-600 text-white' },
  { id: 'pvk_16g', label: 'PVK 16G', gauge: '16G', hint: 'großlumig', color: 'bg-gray-500 border-gray-600 text-white' },
  { id: 'pvk_18g', label: 'PVK 18G', gauge: '18G', hint: 'standard', color: 'bg-green-500 border-green-600 text-white' },
  { id: 'pvk_20g', label: 'PVK 20G', gauge: '20G', hint: 'feiner', color: 'bg-pink-500 border-pink-600 text-white' },
  { id: 'pvk_22g', label: 'PVK 22G', gauge: '22G', hint: 'sehr fein', color: 'bg-sky-500 border-sky-600 text-white' },
]

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

function randomScenePatientForMission(mission) {
  const missionText = String(mission?.text || '').toLowerCase()
  const missionId = String(mission?.id || '')
  const hasFemaleMarker = /weiblich|patientin|frau/.test(missionText)
  const hasMaleMarker = /männlich|maennlich|patient(?!in)|mann/.test(missionText)
  const sex = hasFemaleMarker && !hasMaleMarker
    ? 'female'
    : hasMaleMarker && !hasFemaleMarker
      ? 'male'
      : (Math.random() > 0.5 ? 'male' : 'female')
  const pained = mission?.severity === 'high' || (mission?.severity === 'medium' && Math.random() > 0.45)
  const unconscious = mission?.severity === 'high' && Math.random() > 0.62
  const ageByMission = {
    m1: 71,
    m2: 63,
    m3: 34,
    m4: 68,
    m5: 58,
    m6: 6,
    m7: 41,
  }
  return {
    sex,
    sceneVisualVariant: Math.random() > 0.5 ? 1 : 0,
    pained,
    unconscious,
    age: ageByMission[missionId] || (mission?.severity === 'high' ? 68 : mission?.severity === 'medium' ? 49 : 34),
  }
}

function buildMissionDispatchText(mission, profile, scenePatient) {
  const id = String(mission?.id || '')
  const sexLabel = scenePatient?.sex === 'female' ? 'Patientin' : 'Patient'
  if (id === 'm1') return `Bewusstlosigkeit/Präsynkope, ${sexLabel} ${scenePatient?.age || 68} J.`
  if (id === 'm2') return `Thoraxdruck mit Ausstrahlung linken Arm, ${sexLabel} ${scenePatient?.age || 63} J.`
  if (id === 'm3') return `Sturztrauma Sprunggelenk rechts, ${sexLabel} ${scenePatient?.age || 34} J.`
  if (id === 'm4') return `Akute Atemnot bei COPD-Exazerbation, ${sexLabel} ${scenePatient?.age || 68} J.`
  if (id === 'm5') return `Geplanter Transport zur Dialyse, ${sexLabel} ${scenePatient?.age || 49} J.`
  if (id === 'm6') return `Fieberkrampf, Kind ${scenePatient?.age || 6} J., wieder ansprechbar`
  if (id === 'm7') return `Synkope nach Belastung, ${sexLabel} ${scenePatient?.age || 34} J.`
  return profile?.chiefComplaint || mission?.text || 'Unklare Einsatzlage'
}

function buildCaseProfileForMission(mission) {
  const id = String(mission?.id || '')
  if (id === 'm1') {
    return {
      diagnosis: { code: 'R55', name: 'Synkope unklarer Genese' },
      chiefComplaint: 'Kurzzeitige Bewusstlosigkeit, jetzt wieder ansprechbar, Schwindel und Schwäche.',
      symptoms: ['Schwindel', 'Schwächegefühl', 'kurze Bewusstlosigkeit'],
      allergies: 'Keine bekannten Allergien.',
      medications: 'Ramipril 5 mg 1-0-0.',
      pastHistory: 'Arterielle Hypertonie.',
      lastMeal: 'Leichte Mahlzeit vor etwa 3 Stunden.',
      languageCode: 'de',
    }
  }
  if (id === 'm2') {
    return {
      diagnosis: { code: 'I20.0', name: 'Akutes Koronarsyndrom (Verdacht)' },
      chiefComplaint: 'Druck im Brustkorb seit 25 Minuten mit Ausstrahlung in den linken Arm.',
      symptoms: ['Thoraxdruck', 'Dyspnoe', 'kalter Schweiß'],
      allergies: 'Keine bekannten Allergien.',
      medications: 'ASS 100 mg, Atorvastatin 20 mg.',
      pastHistory: 'KHK, Hypertonie.',
      lastMeal: 'Kleines Mittagessen vor 2 Stunden.',
      languageCode: 'de',
    }
  }
  if (id === 'm3') {
    return {
      diagnosis: { code: 'S93.4', name: 'Distorsion OSG' },
      chiefComplaint: 'Umknicktrauma, deutliche Schmerzen und Schwellung am rechten Sprunggelenk.',
      symptoms: ['Belastungsschmerz', 'Schwellung', 'Unsicherheit beim Gehen'],
      allergies: 'Pollenallergie.',
      medications: 'Keine Dauermedikation.',
      pastHistory: 'Keine relevanten Vorerkrankungen.',
      lastMeal: 'Abendessen vor 4 Stunden.',
      languageCode: 'de',
    }
  }
  if (id === 'm4') {
    return {
      diagnosis: { code: 'J44.1', name: 'COPD-Exazerbation' },
      chiefComplaint: 'Zunehmende Atemnot seit dem Morgen, spricht in kurzen Sätzen.',
      symptoms: ['Atemnot', 'Giemen', 'Tachypnoe'],
      allergies: 'Keine bekannten Allergien.',
      medications: 'Salbutamol-Spray bei Bedarf, Tiotropium täglich.',
      pastHistory: 'COPD Gold II, Nikotinanamnese.',
      lastMeal: 'Kaffee und Brötchen vor 5 Stunden.',
      languageCode: 'de',
    }
  }
  if (id === 'm5') {
    return {
      diagnosis: { code: 'Z99.2', name: 'Chronische Dialysepflicht' },
      chiefComplaint: 'Geplanter Krankentransport zur Dialyse, keine akuten Beschwerden.',
      symptoms: ['Müdigkeit'],
      allergies: 'Heparin-Unverträglichkeit in hoher Dosis.',
      medications: 'Erythropoetin laut Dialyseplan.',
      pastHistory: 'Terminale Niereninsuffizienz.',
      lastMeal: 'Leichtes Frühstück vor 2 Stunden.',
      languageCode: 'de',
    }
  }
  if (id === 'm6') {
    return {
      diagnosis: { code: 'R56.0', name: 'Fieberkrampf (anamnestisch)' },
      chiefComplaint: 'Krampfanfall bei Fieber, aktuell wieder wach, aber abgeschlagen.',
      symptoms: ['Fieber', 'postiktale Müdigkeit', 'Kopfschmerz'],
      allergies: 'Keine bekannten Allergien.',
      medications: 'Paracetamol Saft bei Bedarf.',
      pastHistory: 'Vorheriger Fieberkrampf vor 1 Jahr.',
      lastMeal: 'Leichte Nahrung vor 1 Stunde.',
      languageCode: 'de',
    }
  }
  return {
    diagnosis: { code: 'R55', name: 'Kreislaufreaktion unklar' },
    chiefComplaint: mission?.text || 'Unklare Beschwerden.',
    symptoms: ['Schwindel'],
    allergies: 'Keine bekannten Allergien.',
    medications: 'Keine Dauermedikation.',
    pastHistory: 'Keine relevanten Vorerkrankungen.',
    lastMeal: 'Unklar.',
    languageCode: 'de',
  }
}

function createMissionExamPreset(mission) {
  const profile = mission?.caseProfile || buildCaseProfileForMission(mission)
  const diagnosisCode = String(profile?.diagnosis?.code || '').toUpperCase()
  const isThoraxCase = diagnosisCode.startsWith('I20')
  const isRespCase = diagnosisCode.startsWith('J44')
  const isTraumaCase = diagnosisCode.startsWith('S93')
  const isSyncopeCase = diagnosisCode.startsWith('R55')
  const severe = mission?.severity === 'high'
  return {
    'Kopf/HWS': isSyncopeCase ? 'Leichte Okzipitaldolenz, keine neurologischen Herdzeichen.' : (severe ? 'Druckdolenz parietal, HWS klinisch unauffällig.' : 'Keine Auffälligkeiten.'),
    Thorax: isThoraxCase ? 'Retrosteraler Druck, keine seitendifferente Ventilation.' : (isRespCase ? 'Exspiratorisches Giemen, AF erhöht.' : 'Thorax seitengleich, kein Knacken.'),
    Abdomen: diagnosisCode.startsWith('Z99') ? 'Weich, keine peritonealen Reize, Dialysebauch unauffällig.' : 'Weich, diffuse Druckdolenz ohne Abwehrspannung.',
    Becken: isTraumaCase ? 'Becken stabil, keine Instabilitätszeichen.' : 'Stabil, keine Instabilitätszeichen.',
    Wirbelsäule: isTraumaCase ? 'Keine Klopf- oder Stauchschmerzen der Wirbelsäule.' : (severe ? 'Paravertebraler Druckschmerz lumbal.' : 'Kein Klopfschmerz.'),
    'rechter Arm': 'DMS intakt, keine grobe Fehlstellung.',
    'linker Arm': 'DMS intakt, keine grobe Fehlstellung.',
    'rechtes Bein': isTraumaCase ? 'Sprunggelenk geschwollen, schmerzhaft.' : 'Keine Auffälligkeiten.',
    'linkes Bein': 'Keine Auffälligkeiten.',
  }
}

function formatSceneProtocol(protocol) {
  if (!protocol || typeof protocol !== 'object') return ''
  const lines = [
    protocol.transportReason ? `Transportgrund: ${protocol.transportReason}` : '',
    protocol.anamnesis ? `Anamnese: ${protocol.anamnesis}` : '',
    protocol.findings ? `Befunde: ${protocol.findings}` : '',
    protocol.diagnostics ? `Diagnostik: ${protocol.diagnostics}` : '',
    protocol.therapy ? `Therapie: ${protocol.therapy}` : '',
    protocol.handover ? `Verlauf/Uebergabe: ${protocol.handover}` : '',
    protocol.recommendation ? `Empfehlung: ${protocol.recommendation}` : '',
  ].filter(Boolean)
  return lines.join(' | ')
}

function removeBlackBackgroundFromImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        resolve(src)
        return
      }
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < data.data.length; i += 4) {
        const r = data.data[i]
        const g = data.data[i + 1]
        const b = data.data[i + 2]
        if (r < 24 && g < 24 && b < 24) {
          data.data[i + 3] = 0
        }
      }
      ctx.putImageData(data, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

function canUseVehicle(user, vehicle) {
  const done = user?.completedCourses || []
  return done.includes(vehicle.requiredCourseId) || vehicle.id === 'rtw'
}

function pointDistance(a, b) {
  const dx = Number(a?.x || 0) - Number(b?.x || 0)
  const dy = Number(a?.y || 0) - Number(b?.y || 0)
  return Math.sqrt(dx * dx + dy * dy)
}

function totalRouteDistance(points = []) {
  if (!Array.isArray(points) || points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i += 1) total += pointDistance(points[i - 1], points[i])
  return total
}

function nearestRoadNode(point) {
  let bestId = null
  let bestDist = Infinity
  Object.entries(ROAD_NODES).forEach(([id, node]) => {
    const d = pointDistance(point, node)
    if (d < bestDist) {
      bestDist = d
      bestId = id
    }
  })
  return bestId
}

function shortestPathRoad(startId, endId) {
  if (!startId || !endId || !ROAD_NODES[startId] || !ROAD_NODES[endId]) return []
  const neighbors = {}
  Object.keys(ROAD_NODES).forEach((id) => { neighbors[id] = [] })
  ROAD_EDGES.forEach(([a, b]) => {
    const w = pointDistance(ROAD_NODES[a], ROAD_NODES[b])
    neighbors[a].push({ id: b, w })
    neighbors[b].push({ id: a, w })
  })

  const dist = {}
  const prev = {}
  const queue = new Set(Object.keys(ROAD_NODES))
  Object.keys(ROAD_NODES).forEach((id) => { dist[id] = Infinity; prev[id] = null })
  dist[startId] = 0

  while (queue.size > 0) {
    let u = null
    let best = Infinity
    queue.forEach((id) => {
      if (dist[id] < best) {
        best = dist[id]
        u = id
      }
    })
    if (!u) break
    queue.delete(u)
    if (u === endId) break
    neighbors[u].forEach(({ id: v, w }) => {
      if (!queue.has(v)) return
      const alt = dist[u] + w
      if (alt < dist[v]) {
        dist[v] = alt
        prev[v] = u
      }
    })
  }

  const path = []
  let cur = endId
  while (cur) {
    path.unshift(cur)
    cur = prev[cur]
  }
  return path[0] === startId ? path : []
}

function buildRoadRoute(start, target) {
  const a = nearestRoadNode(start)
  const b = nearestRoadNode(target)
  const ids = shortestPathRoad(a, b)
  const nodes = ids.map((id) => ROAD_NODES[id])
  return [start, ...nodes, target]
}

function estimateEtaMinutesByRoute(points = [], withSiren = false) {
  const distance = totalRouteDistance(points)
  const speed = withSiren ? 11.5 : 8.5 // map units/min
  return Math.max(2, Math.round(distance / speed))
}

function estimateTravelMsByRoute(points = [], withSiren = false, speedMultiplier = 1) {
  const distance = totalRouteDistance(points)
  const speedPerMin = (withSiren ? 11.5 : 8.5) * Math.max(0.6, Number(speedMultiplier) || 1)
  const minutes = Math.max(1.2, distance / speedPerMin)
  return Math.round(minutes * 60000)
}

function pickMissionForVehicle(vehicleId) {
  const profile = VEHICLE_PROFILES[vehicleId] || VEHICLE_PROFILES.rtw
  const allowed = new Set(profile.missionSeverities || ['low', 'medium', 'high'])
  const pool = MISSIONS.filter((m) => allowed.has(String(m?.severity || '').toLowerCase()))
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
}

function mapPointFromStation(station, idx = 0) {
  const d = String(station?.district || '').toLowerCase()
  if (d.includes('nord')) return { x: 46, y: 17 }
  if (d.includes('süd') || d.includes('sued')) return { x: 54, y: 74 }
  if (d.includes('west')) return { x: 19, y: 46 }
  if (d.includes('ost')) return { x: 83, y: 48 }
  if (d.includes('mitte') || d.includes('zent')) return { x: 50, y: 49 }
  const fallback = [{ x: 22, y: 68 }, { x: 34, y: 74 }, { x: 71, y: 70 }, { x: 75, y: 58 }]
  return fallback[idx % fallback.length]
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function parseRouteOptions(routeText) {
  const raw = String(routeText || '').toLowerCase()
  const options = []
  if (/i\.?v/.test(raw) || raw.includes('intraven')) options.push('i.v.')
  if (/i\.?o/.test(raw) || raw.includes('intraoss')) options.push('i.o.')
  if (/p\.?o/.test(raw) || raw.includes('oral') || raw.includes('per os')) options.push('p.o.')
  if (/i\.?m/.test(raw) || raw.includes('intramusk')) options.push('i.m.')
  if (/s\.?c/.test(raw) || raw.includes('subkutan')) options.push('s.c.')
  if (/inhal|intranasal|spray|s\.?l/.test(raw)) options.push('inhalativ')
  if (/perfusor/.test(raw)) options.push('Perfusor')
  return options.length > 0 ? [...new Set(options)] : ['i.v.']
}

function createSceneMedicationDraft(action) {
  const packaging = RD_MEDICATION_PACKAGING[action?.id] || {}
  const routeOptions = parseRouteOptions(action?.route)
  const sourceForms = Array.isArray(packaging.sourceForms) && packaging.sourceForms.length > 0
    ? packaging.sourceForms
    : (routeOptions.includes('inhalativ') ? ['Spray/Inhalation'] : ['Ampulle'])
  const unit = packaging.unit || action?.unit || 'mg'
  const perAmpouleDose = Math.max(
    Number(action?.step || 0.1),
    Number(packaging.dosePerAmpoule || action?.defaultDose || action?.min || 1)
  )
  const ampoules = 1
  const maxByAmpoules = perAmpouleDose * ampoules
  const startDose = clamp(Number(action?.defaultDose || perAmpouleDose), Number(action?.step || 0.1), maxByAmpoules)
  return {
    ...action,
    dose: Number(startDose.toFixed(2)),
    unit,
    doseUnit: unit,
    routeOptions,
    route: routeOptions[0],
    sourceForms,
    sourceForm: sourceForms[0],
    ampoules,
    dosePerAmpoule: perAmpouleDose,
    volumePerAmpouleMl: Math.max(0.5, Number(packaging.volumePerAmpouleMl || 2)),
  }
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function buildRoadMaskFromImage(imageData, width, height, preset = 'strict') {
  const total = width * height
  const raw = new Uint8Array(total)
  const data = imageData.data
  const cfg = ROAD_MASK_PRESETS[preset] || ROAD_MASK_PRESETS.strict
  for (let i = 0; i < total; i += 1) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const nearWhite = lum > cfg.lum && sat < cfg.sat && min > cfg.min
    const notYellowRoadMark = !(r > 180 && g > 170 && b < 140)
    const whiteRoadLike = nearWhite && notYellowRoadMark
    raw[i] = whiteRoadLike ? 1 : 0
  }

  const filtered = new Uint8Array(total)
  const get = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0
    return raw[y * width + x]
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      if (!raw[i]) continue
      let neighbors = 0
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (xx === 0 && yy === 0) continue
          if (get(x + xx, y + yy)) neighbors += 1
        }
      }
      if (neighbors >= 2) filtered[i] = 1
    }
  }
  // One pass dilation to reconnect small gaps.
  const dilated = new Uint8Array(total)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = false
      for (let yy = -1; yy <= 1 && !on; yy += 1) {
        for (let xx = -1; xx <= 1 && !on; xx += 1) {
          const nx = x + xx
          const ny = y + yy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (filtered[ny * width + nx]) on = true
        }
      }
      if (on) dilated[y * width + x] = 1
    }
  }
  return dilated
}

function dilateMask(mask, width, height, iterations = 1) {
  let src = mask
  for (let iter = 0; iter < iterations; iter += 1) {
    const out = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let on = false
        for (let yy = -1; yy <= 1 && !on; yy += 1) {
          for (let xx = -1; xx <= 1 && !on; xx += 1) {
            const nx = x + xx
            const ny = y + yy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            if (src[ny * width + nx]) on = true
          }
        }
        if (on) out[y * width + x] = 1
      }
    }
    src = out
  }
  return src
}

function buildRoadMaskFromMarkedImage(imageData, width, height, preset = 'strict') {
  const total = width * height
  const data = imageData.data
  const base = new Uint8Array(total)
  for (let i = 0; i < total; i += 1) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const strongRed = r > 160 && g < 120 && b < 120 && r > g + 45 && r > b + 45
    base[i] = strongRed ? 1 : 0
  }
  const iterations = preset === 'strict' ? 1 : preset === 'balanced' ? 2 : 3
  return dilateMask(base, width, height, iterations)
}

function extractConnectedRoadNetwork(mask, width, height, seedPointsPx = []) {
  const out = new Uint8Array(width * height)
  const q = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (!mask[i] || out[i]) return
    out[i] = 1
    q.push([x, y])
  }
  seedPointsPx.forEach((p) => push(Math.round(p.x), Math.round(p.y)))
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  while (q.length > 0) {
    const [x, y] = q.shift()
    dirs.forEach(([dx, dy]) => push(x + dx, y + dy))
  }
  return out
}

function maskToDataUrl(mask, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(width, height)
  for (let i = 0; i < width * height; i += 1) {
    const on = mask[i] === 1
    const k = i * 4
    img.data[k] = 255
    img.data[k + 1] = on ? 40 : 0
    img.data[k + 2] = on ? 40 : 0
    img.data[k + 3] = on ? 120 : 0
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

function nearestRoadPixel(mask, width, height, sx, sy, maxRadius = 80) {
  const ix = clamp(Math.round(sx), 0, width - 1)
  const iy = clamp(Math.round(sy), 0, height - 1)
  if (mask[iy * width + ix]) return { x: ix, y: iy }
  for (let r = 1; r <= maxRadius; r += 1) {
    for (let y = -r; y <= r; y += 1) {
      const x1 = -r
      const x2 = r
      const px1 = ix + x1
      const py1 = iy + y
      const px2 = ix + x2
      const py2 = iy + y
      if (px1 >= 0 && py1 >= 0 && px1 < width && py1 < height && mask[py1 * width + px1]) return { x: px1, y: py1 }
      if (px2 >= 0 && py2 >= 0 && px2 < width && py2 < height && mask[py2 * width + px2]) return { x: px2, y: py2 }
    }
    for (let x = -r + 1; x <= r - 1; x += 1) {
      const y1 = -r
      const y2 = r
      const px1 = ix + x
      const py1 = iy + y1
      const px2 = ix + x
      const py2 = iy + y2
      if (px1 >= 0 && py1 >= 0 && px1 < width && py1 < height && mask[py1 * width + px1]) return { x: px1, y: py1 }
      if (px2 >= 0 && py2 >= 0 && px2 < width && py2 < height && mask[py2 * width + px2]) return { x: px2, y: py2 }
    }
  }
  return null
}

function pathOnRoadMask(mask, width, height, start, goal) {
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ]
  const key = (x, y) => `${x},${y}`
  const h = (x, y) => Math.hypot(goal.x - x, goal.y - y)
  const open = [{ x: start.x, y: start.y, f: h(start.x, start.y), g: 0 }]
  const gScore = new Map([[key(start.x, start.y), 0]])
  const came = new Map()
  const visited = new Set()
  let guard = 0

  while (open.length > 0 && guard < 120000) {
    guard += 1
    open.sort((a, b) => a.f - b.f)
    const cur = open.shift()
    const curKey = key(cur.x, cur.y)
    if (visited.has(curKey)) continue
    visited.add(curKey)
    if (cur.x === goal.x && cur.y === goal.y) {
      const path = [{ x: cur.x, y: cur.y }]
      let k = curKey
      while (came.has(k)) {
        const prev = came.get(k)
        path.unshift({ x: prev.x, y: prev.y })
        k = key(prev.x, prev.y)
      }
      return path
    }
    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (!mask[ny * width + nx]) continue
      const nKey = key(nx, ny)
      const tentative = (gScore.get(curKey) ?? Infinity) + cost
      if (tentative < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentative)
        came.set(nKey, { x: cur.x, y: cur.y })
        open.push({ x: nx, y: ny, g: tentative, f: tentative + h(nx, ny) })
      }
    }
  }
  return null
}

function simplifyPathPoints(path = [], minGap = 2.2) {
  if (!Array.isArray(path) || path.length <= 2) return path
  const out = [path[0]]
  let last = path[0]
  for (let i = 1; i < path.length - 1; i += 1) {
    const p = path[i]
    if (pointDistance(last, p) >= minGap) {
      out.push(p)
      last = p
    }
  }
  out.push(path[path.length - 1])
  return out
}

function advanceAlongRoute(current, points, stepDistance) {
  let pos = { ...current }
  const remaining = [...points]
  let budget = Math.max(0, Number(stepDistance || 0))
  while (budget > 0 && remaining.length > 0) {
    const next = remaining[0]
    const d = pointDistance(pos, next)
    if (d <= budget || d < 0.001) {
      pos = { ...next }
      remaining.shift()
      budget -= d
      continue
    }
    const t = budget / d
    pos = {
      x: pos.x + (next.x - pos.x) * t,
      y: pos.y + (next.y - pos.y) * t,
    }
    budget = 0
  }
  return { position: pos, points: remaining }
}

export default function Rettungsdienst() {
  const { user, updateUser, addMoney, triggerPolicePenalty, clearLegalState } = useAuth()
  const canUseDevTools = false
  const { createIvenaPrealertFromRescue, canReceivePatients, hospital } = useHospital()
  const dispatchDueRef = useRef(0)
  const mapScrollRef = useRef(null)
  const dragRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 })
  const prevZoomRef = useRef(2.1)
  const duty = user?.rescueDuty || {}
  const station = getRescueStationById(user?.rescueStationId) || RESCUE_STATIONS[0]
  const stationPos = mapPointFromStation(station, 0)
  const [onDuty, setOnDuty] = useState(!!duty.onDuty)
  const [onDutySince, setOnDutySince] = useState(duty?.onDutySince || null)
  const [vehicleId, setVehicleId] = useState(duty.vehicleId || 'rtw')
  const [status, setStatus] = useState(duty.status || '0')
  const [mission, setMission] = useState(duty.mission || null)
  const [position, setPosition] = useState(duty.position || stationPos)
  const [dispatchLog, setDispatchLog] = useState(duty.dispatchLog || ['Leitstelle: Wähle ein Rettungsmittel und melde dich in den Dienst.'])
  const [useSiren, setUseSiren] = useState(false)
  const [devOpen, setDevOpen] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [mapZoom, setMapZoom] = useState(2.1)
  const [roadPreset, setRoadPreset] = useState('strict')
  const [mapSize, setMapSize] = useState({ w: 1024, h: 683 })
  const [roadGraph, setRoadGraph] = useState(null)
  const [roadGraphs, setRoadGraphs] = useState({})
  const [roadOverlayUrl, setRoadOverlayUrl] = useState(null)
  const [showRoadOverlay, setShowRoadOverlay] = useState(false)
  const [mapStations, setMapStations] = useState([])
  const [routePoints, setRoutePoints] = useState([])
  const [routeMeta, setRouteMeta] = useState(duty.routeMeta || null)
  const [vehicleOutOfService, setVehicleOutOfService] = useState(false)
  const [sceneOpen, setSceneOpen] = useState(false)
  const [scenePlacingGearId, setScenePlacingGearId] = useState(null)
  const [sceneLoadedGearIds, setSceneLoadedGearIds] = useState([])
  const [scenePlacedGear, setScenePlacedGear] = useState({})
  const [sceneActiveGearId, setSceneActiveGearId] = useState(null)
  const [sceneProtocolDraft, setSceneProtocolDraft] = useState({
    transportReason: '',
    anamnesis: '',
    findings: '',
    diagnostics: '',
    therapy: '',
    handover: '',
    recommendation: '',
  })
  const [sceneVitals, setSceneVitals] = useState({ hr: 98, spo2: 93, rr: 22, sys: 132, dia: 82, temp: 37.8, gcs: 14, pain: 6 })
  const [sceneProtocolCollapsed, setSceneProtocolCollapsed] = useState(true)
  const [sceneExamResults, setSceneExamResults] = useState({})
  const [sceneExamModalOpen, setSceneExamModalOpen] = useState(false)
  const [sceneOxygenMode, setSceneOxygenMode] = useState('none')
  const [sceneOxygenFlow, setSceneOxygenFlow] = useState(2)
  const [sceneMedicationDraft, setSceneMedicationDraft] = useState(null)
  const [sceneMedPrep, setSceneMedPrep] = useState({
    open: false,
    actionId: null,
    stage: 'break',
    breakProgress: 0,
    drawnMl: 0,
    targetMl: 0,
    hint: '',
    swipeStart: null,
  })
  const [sceneInfusionRate, setSceneInfusionRate] = useState(500)
  const [sceneInfusions, setSceneInfusions] = useState([])
  const [sceneBackpackModuleId, setSceneBackpackModuleId] = useState('diagnostics')
  const [sceneCompletedModules, setSceneCompletedModules] = useState([])
  const [sceneWoundCare, setSceneWoundCare] = useState({ irrigation: 55, type: 'steriler Verband', compression: 45 })
  const [sceneWoundSite, setSceneWoundSite] = useState('')
  const [sceneDressingGame, setSceneDressingGame] = useState({ running: false, expectedStep: 0, score: 0 })
  const [sceneIoAccess, setSceneIoAccess] = useState({ site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' })
  const [sceneTempMeasure, setSceneTempMeasure] = useState(null)
  const [sceneManualBp, setSceneManualBp] = useState(null)
  const [sceneManualBpSide, setSceneManualBpSide] = useState('left')
  const [sceneBpSides, setSceneBpSides] = useState({ left: null, right: null })
  const [sceneManualBpMeasuring, setSceneManualBpMeasuring] = useState(false)
  const [sceneTempMeasuring, setSceneTempMeasuring] = useState(false)
  const [sceneBloodSugarMeasuring, setSceneBloodSugarMeasuring] = useState(false)
  const [sceneBloodSugar, setSceneBloodSugar] = useState(null)
  const [sceneBloodSugarBaseline, setSceneBloodSugarBaseline] = useState(null)
  const [sceneAirwayDraft, setSceneAirwayDraft] = useState({ adjunct: 'none', ambuRate: 12, oxygenAssist: true })
  const [sceneIntubationDraft, setSceneIntubationDraft] = useState({ device: 'guedel', secured: false })
  const [sceneComfortCare, setSceneComfortCare] = useState({ coolingApplied: false, sickbagGiven: false })
  const [sceneLucasActive, setSceneLucasActive] = useState(false)
  const [sceneExamFocus, setSceneExamFocus] = useState('all')
  const [sceneGearSprites, setSceneGearSprites] = useState({})
  const [sceneAccessModalOpen, setSceneAccessModalOpen] = useState(false)
  const [scenePtxModalOpen, setScenePtxModalOpen] = useState(false)
  const [scenePtxDraft, setScenePtxDraft] = useState({
    site: '4./5. ICR AAL rechts',
    desinfectionDone: false,
    punctureDone: false,
    decompressionDone: false,
  })
  const [sceneChatSnapshot, setSceneChatSnapshot] = useState(null)
  const [sceneSupportStatus, setSceneSupportStatus] = useState({})
  const [sceneActionNotice, setSceneActionNotice] = useState(null)
  const [scenePainStimulusMessage, setScenePainStimulusMessage] = useState(null)
  const [sceneAccessDraft, setSceneAccessDraft] = useState({
    typeId: ACCESS_TYPES[2].id,
    gauge: ACCESS_TYPES[2].gauge,
    siteId: ACCESS_SITES[0].id,
    stage: 'setup',
  })
  const [sceneAccessProcedure, setSceneAccessProcedure] = useState({
    disinfectionCount: 0,
    swabDone: false,
    tourniquetOn: false,
    viggoPlaced: false,
    plasterDone: false,
  })
  const [sceneAccessAttachedToolId, setSceneAccessAttachedToolId] = useState(null)
  const [sceneAccessCursorPos, setSceneAccessCursorPos] = useState({ x: 0, y: 0 })
  const [sceneAccessHint, setSceneAccessHint] = useState('')
  const [sceneMonitorState, setSceneMonitorState] = useState({})
  const [sceneVentilatorState, setSceneVentilatorState] = useState({})
  const [sceneVentilatorOpen, setSceneVentilatorOpen] = useState(false)
  const sceneCanvasRef = useRef(null)
  const sceneAccessCanvasRef = useRef(null)
  const supportTimersRef = useRef({})
  const sceneMedicationSafetyRef = useRef({})
  const sceneMedPrepTimerRef = useRef(null)
  const scenePoliceCooldownRef = useRef({})
  const rdMonitorLoopKeyRef = useRef(`rd_scene_monitor_loop_${user?.id || 'anon'}`)
  const rdCoughLoopKeyRef = useRef(`rd_scene_cough_loop_${user?.id || 'anon'}`)

  const selectedVehicle = useMemo(() => VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0], [vehicleId])
  const selectedVehicleProfile = useMemo(() => VEHICLE_PROFILES[vehicleId] || VEHICLE_PROFILES.rtw, [vehicleId])
  const availableBackpackModules = useMemo(
    () => RD_BACKPACK_MODULES.filter((m) => selectedVehicleProfile.moduleIds.includes(m.id)),
    [selectedVehicleProfile],
  )
  const availableAmpullariumActions = useMemo(
    () => AMPULLARIUM_ACTIONS.filter((a) => selectedVehicleProfile.ampullariumIds.includes(a.id)),
    [selectedVehicleProfile],
  )
  const availableInfusions = useMemo(
    () => RD_INFUSIONS.filter((i) => selectedVehicleProfile.infusionIds.includes(i.id)),
    [selectedVehicleProfile],
  )
  const availableSupportUnits = useMemo(() => {
    const blockedByVehicle = {
      nef: new Set(['nef']),
      rth: new Set(['rth']),
      ktw: new Set(['rth']),
      rtw: new Set(),
    }
    const blocked = blockedByVehicle[vehicleId] || new Set()
    return SCENE_SUPPORT_UNITS.filter((unit) => !blocked.has(unit.id))
  }, [vehicleId])
  const selectedAccessType = useMemo(
    () => ACCESS_TYPES.find((type) => type.id === sceneAccessDraft.typeId) || ACCESS_TYPES[2],
    [sceneAccessDraft.typeId]
  )
  const selectedAccessSite = useMemo(
    () => ACCESS_SITES.find((site) => site.id === sceneAccessDraft.siteId) || ACCESS_SITES[0],
    [sceneAccessDraft.siteId]
  )
  const selectedPunctureTarget = useMemo(
    () => ACCESS_GAME_TARGETS.punctureBySiteId[sceneAccessDraft.siteId] || ACCESS_GAME_TARGETS.punctureBySiteId[ACCESS_SITES[0].id],
    [sceneAccessDraft.siteId]
  )
  const selectedAccessSide = String(sceneAccessDraft.siteId || '').includes('_links') ? 'left' : 'right'
  const shouldMirrorAccessArm = selectedAccessSide === 'left'
  const mirrorTargetX = (target) => {
    if (!target) return target
    return { ...target, x: 100 - target.x }
  }
  const displayAccessPunctureTarget = useMemo(
    () => (shouldMirrorAccessArm ? mirrorTargetX(selectedPunctureTarget) : selectedPunctureTarget),
    [shouldMirrorAccessArm, selectedPunctureTarget]
  )
  const selectedUpperArmTarget = ACCESS_GAME_TARGETS.upperArmBySide[selectedAccessSide]
  const displayAccessUpperArmTarget = useMemo(
    () => (shouldMirrorAccessArm ? mirrorTargetX(selectedUpperArmTarget) : selectedUpperArmTarget),
    [shouldMirrorAccessArm, selectedUpperArmTarget]
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
  const placedViggoRotationDeg = shouldMirrorAccessArm
    ? ACCESS_OVERLAY_TUNING.viggoRotationLeftDeg
    : ACCESS_OVERLAY_TUNING.viggoRotationRightDeg
  const shouldMirrorPlacedViggo = selectedAccessSide === 'right'
  const placedViggoTranslateX = selectedAccessSide === 'right'
    ? ACCESS_OVERLAY_TUNING.viggoTranslateXPercentRight
    : ACCESS_OVERLAY_TUNING.viggoTranslateXPercentLeft
  const placedViggoTranslateY = selectedAccessSide === 'right'
    ? ACCESS_OVERLAY_TUNING.viggoTranslateYPercentRight
    : ACCESS_OVERLAY_TUNING.viggoTranslateYPercentLeft
  const placedPlasterRotationDeg = selectedAccessSide === 'right'
    ? ACCESS_OVERLAY_TUNING.plasterRotationRightDeg
    : ACCESS_OVERLAY_TUNING.plasterRotationLeftDeg
  const sceneAccessArmImage = sceneAccessProcedure.tourniquetOn
    ? armWithTourniquetAsset
    : (mission?.scenePatient?.sex === 'female' ? armFemaleAsset : armAsset)
  const viggoByGauge = useMemo(() => ({
    '14G': viggo14gAsset,
    '16G': viggo16gAsset,
    '18G': viggo18gAsset,
    '20G': viggo20gAsset,
    '22G': viggo22gAsset,
  }), [])
  const selectedViggoAsset = viggoByGauge[String(selectedAccessType.gauge || '18G').toUpperCase()] || viggo18gAsset
  const sceneAccessTools = useMemo(() => ({
    disinfect: { id: 'disinfect', label: 'Desinfektion', image: disinfectantAsset },
    swab: { id: 'swab', label: 'Tupfer', image: swabAsset },
    tourniquet: { id: 'tourniquet', label: 'Stauschlauch', image: tourniquetAsset },
    viggo: { id: 'viggo', label: `Viggo ${selectedAccessType.gauge}`, image: selectedViggoAsset },
    plaster: { id: 'plaster', label: 'Pflaster', image: accessPlasterAsset },
  }), [selectedAccessType.gauge, selectedViggoAsset])
  const sceneAccessToolOrder = ['disinfect', 'swab', 'tourniquet', 'viggo', 'plaster']
  const sceneAccessChecklistState = useMemo(() => ({
    dis1: sceneAccessProcedure.disinfectionCount >= 1,
    swab: sceneAccessProcedure.swabDone,
    dis2: sceneAccessProcedure.disinfectionCount >= 2,
    tourniquetOn: sceneAccessProcedure.tourniquetOn || sceneAccessProcedure.viggoPlaced,
    viggo: sceneAccessProcedure.viggoPlaced,
    tourniquetOff: sceneAccessProcedure.viggoPlaced && !sceneAccessProcedure.tourniquetOn,
    plaster: sceneAccessProcedure.plasterDone,
  }), [sceneAccessProcedure])
  const sceneAccessActiveInstruction = useMemo(() => {
    if (sceneAccessProcedure.disinfectionCount === 0) return 'Punktionsstelle desinfizieren.'
    if (!sceneAccessProcedure.swabDone) return 'Mit Tupfer über die Punktionsstelle wischen.'
    if (sceneAccessProcedure.disinfectionCount < 2) return 'Erneut desinfizieren.'
    if (!sceneAccessProcedure.tourniquetOn) return 'Stauschlauch anlegen (auch früher erlaubt).'
    if (!sceneAccessProcedure.viggoPlaced) return `Viggo ${selectedAccessType.gauge} legen.`
    if (sceneAccessProcedure.tourniquetOn) return 'Stauschlauch wieder lösen.'
    if (!sceneAccessProcedure.plasterDone) return 'Pflaster aufkleben.'
    return 'Zugang vollständig gelegt.'
  }, [sceneAccessProcedure, selectedAccessType.gauge])
  const canGetMission = onDuty && !vehicleOutOfService && (status === '1' || status === '2') && !mission
  const unlockedVehicle = canUseVehicle(user, selectedVehicle)
  const earningFactor = user?.rescueLevel === 'notfallsanitaeter' ? 1.5 : 1
  const hospitalTargets = useMemo(() => {
    const ownHospital = hospital?.id
      ? [{ id: `user_${hospital.id}`, name: hospital?.name || 'Dein Krankenhaus', x: 60, y: 52, userOwned: true }]
      : []
    return ownHospital.length > 0 ? ownHospital : CITY_HOSPITALS
  }, [hospital?.id, hospital?.name])
  const stationMarkers = useMemo(
    () => mapStations.map((s, idx) => ({ ...s, ...mapPointFromStation(s, idx) })),
    [mapStations],
  )
  const scenePatient = mission?.scenePatient || null
  const sceneCanClose = !!mission?.sceneDisposition
  const scenePatientUnconscious = !!scenePatient?.unconscious || sceneVitals.gcs <= 8
  const sceneStateKey = scenePatientUnconscious ? 'closedeyes' : (scenePatient?.pained ? 'pained' : 'normal')
  const fallbackMaleVariants = SCENE_BACKGROUND.male?.[sceneStateKey] || SCENE_BACKGROUND.male.normal
  const requestedVariant = Number(scenePatient?.sceneVisualVariant || 0)
  const selectedSceneVariants = SCENE_BACKGROUND[scenePatient?.sex]?.[sceneStateKey] || fallbackMaleVariants
  const sceneBackground = scenePatient
    ? (selectedSceneVariants[requestedVariant] || selectedSceneVariants[0] || fallbackMaleVariants[0])
    : (SCENE_BACKGROUND.male.normal[0] || einsatzMaleNormalAsset)
  const sceneHasActiveInfusion = Array.isArray(sceneInfusions) && sceneInfusions.length > 0
  const sceneMonitorPatient = useMemo(() => ({
    id: `rd-scene-${mission?.id || 'none'}`,
    name: 'Einsatzpatient*in',
    vitals: {
      hr: sceneVitals.hr,
      spo2: sceneVitals.spo2,
      rr: sceneVitals.rr,
      bp: `${sceneVitals.sys}/${sceneVitals.dia}`,
      bpSides: sceneBpSides,
      temp: sceneVitals.temp,
    },
    clinicalState: {
      pain: sceneVitals.pain,
      consciousness: sceneVitals.gcs <= 8 ? 'bewusstlos' : 'ansprechbar',
      resuscitation: { active: false },
    },
  }), [mission?.id, sceneVitals, sceneBpSides])
  const sceneChatPatient = useMemo(() => {
    const profile = mission?.caseProfile || buildCaseProfileForMission(mission)
    const sceneName = scenePatient?.sex === 'female' ? 'Patientin Einsatz' : 'Patient Einsatz'
    return {
      id: `rd_chat_${mission?.id || 'x'}`,
      name: sceneName,
      age: scenePatient?.age || 52,
      gender: scenePatient?.sex === 'female' ? 'weiblich' : 'männlich',
      languageCode: profile.languageCode || 'de',
      arrivalType: 'ambulance',
      arrivalTime: Date.now(),
      chiefComplaint: profile.chiefComplaint,
      symptoms: profile.symptoms || [],
      trueDiagnoses: { primary: profile.diagnosis },
      diagnoses: { primary: profile.diagnosis },
      chatData: {
        allergies: profile.allergies,
        medications: profile.medications,
        pastHistory: profile.pastHistory,
        lastMeal: profile.lastMeal,
      },
      vitals: {
        hr: sceneVitals.hr,
        bp: `${sceneVitals.sys}/${sceneVitals.dia}`,
        rr: sceneVitals.rr,
        temp: sceneVitals.temp,
        spo2: Math.round(sceneVitals.spo2),
      },
      clinicalState: {
        consciousness: scenePatientUnconscious ? 'bewusstlos' : 'ansprechbar',
      },
    }
  }, [mission, scenePatient?.sex, scenePatient?.age, sceneVitals, scenePatientUnconscious])
  const hasSceneAccess = !!mission?.sceneAccess || !!mission?.sceneIoAccess
  const sceneBackpackModule = availableBackpackModules.find((m) => m.id === sceneBackpackModuleId) || availableBackpackModules[0]

  useEffect(() => {
    if (!availableBackpackModules.length) return
    if (!availableBackpackModules.some((m) => m.id === sceneBackpackModuleId)) {
      setSceneBackpackModuleId(availableBackpackModules[0].id)
    }
  }, [availableBackpackModules, sceneBackpackModuleId])

  useEffect(() => {
    if (!sceneMedicationDraft?.id) return
    if (!availableAmpullariumActions.some((a) => a.id === sceneMedicationDraft.id)) {
      setSceneMedicationDraft(null)
    }
  }, [availableAmpullariumActions, sceneMedicationDraft?.id])

  useEffect(() => {
    let mounted = true
    const refreshStations = async () => {
      const { data } = await listRescueStations()
      if (!mounted) return
      setMapStations(data || [])
    }
    refreshStations()
    const unsub = subscribeRescueStations(refreshStations)
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const map = {}
      const entries = RD_SCENE_GEAR.filter((g) => !!g.image)
      for (const gear of entries) {
        // Remove near-black matte from uploaded PNGs for true transparency in scene.
        map[gear.id] = await removeBlackBackgroundFromImage(gear.image)
      }
      if (!cancelled) setSceneGearSprites(map)
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (cancelled) return
      const naturalW = Number(img.naturalWidth || img.width || 1024)
      const naturalH = Number(img.naturalHeight || img.height || 683)
      setMapSize({ w: naturalW, h: naturalH })

      const targetW = 640
      const scale = targetW / naturalW
      const w = Math.max(220, Math.round(naturalW * scale))
      const h = Math.max(140, Math.round(naturalH * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      const seedsPx = ROAD_SEED_POINTS_PCT.map(([xp, yp]) => ({ x: (xp / 100) * (w - 1), y: (yp / 100) * (h - 1) }))
      const graphs = {}
      Object.keys(ROAD_MASK_PRESETS).forEach((presetKey) => {
        const baseMask = buildRoadMaskFromMarkedImage(imageData, w, h, presetKey)
        const snappedSeeds = seedsPx
          .map((p) => nearestRoadPixel(baseMask, w, h, p.x, p.y, 220))
          .filter(Boolean)
        const connectedMask = snappedSeeds.length > 0
          ? extractConnectedRoadNetwork(baseMask, w, h, snappedSeeds)
          : baseMask
        graphs[presetKey] = { w, h, mask: connectedMask }
      })
      setRoadGraphs(graphs)
      setRoadGraph(graphs[roadPreset] || graphs.strict || null)
    }
    img.src = rdCityMapMarkedAsset
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setRoadGraph(roadGraphs?.[roadPreset] || roadGraphs?.strict || null)
  }, [roadGraphs, roadPreset])

  useEffect(() => {
    if (!roadGraph?.mask) {
      setRoadOverlayUrl(null)
      return
    }
    setRoadOverlayUrl(maskToDataUrl(roadGraph.mask, roadGraph.w, roadGraph.h))
  }, [roadGraph])

  useEffect(() => {
    updateUser({
      rescueDuty: {
        onDuty,
        onDutySince,
        vehicleId,
        status,
        mission,
        position,
        routePoints,
        routeMeta,
        stationId: station?.id,
        vehicleOutOfService,
        dispatchLog: dispatchLog.slice(0, 12),
      },
    })
  }, [onDuty, onDutySince, vehicleId, status, mission, position, routePoints, routeMeta, vehicleOutOfService, dispatchLog, station?.id, updateUser])

  useEffect(() => {
    if (!mission) {
      sceneMedicationSafetyRef.current = {}
      scenePoliceCooldownRef.current = {}
      setSceneOpen(false)
      setScenePlacingGearId(null)
      setSceneLoadedGearIds([])
      setScenePlacedGear({})
      setSceneActiveGearId(null)
      setSceneProtocolDraft({
        transportReason: '',
        anamnesis: '',
        findings: '',
        diagnostics: '',
        therapy: '',
        handover: '',
        recommendation: '',
      })
      setSceneExamResults({})
      setSceneExamModalOpen(false)
      setSceneOxygenMode('none')
      setSceneOxygenFlow(2)
      setSceneMedicationDraft(null)
      setSceneMedPrep({
        open: false,
        actionId: null,
        stage: 'break',
        breakProgress: 0,
        drawnMl: 0,
        targetMl: 0,
        hint: '',
        swipeStart: null,
      })
      setSceneInfusionRate(500)
      setSceneInfusions([])
      setSceneBackpackModuleId('diagnostics')
      setSceneCompletedModules([])
      setSceneWoundCare({ irrigation: 55, type: 'steriler Verband', compression: 45 })
      setSceneIoAccess({ site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' })
      setSceneTempMeasure(null)
      setSceneManualBp(null)
      setSceneManualBpMeasuring(false)
      setSceneTempMeasuring(false)
      setSceneBloodSugarMeasuring(false)
      setSceneBloodSugar(null)
      setSceneBloodSugarBaseline(null)
      setSceneAirwayDraft({ adjunct: 'none', ambuRate: 12, oxygenAssist: true })
      setSceneIntubationDraft({ device: 'guedel', secured: false })
      setSceneComfortCare({ coolingApplied: false, sickbagGiven: false })
      setSceneLucasActive(false)
      setSceneExamFocus('all')
      setSceneChatSnapshot(null)
      setSceneSupportStatus({})
      setSceneAccessModalOpen(false)
      setSceneAccessDraft({
        typeId: ACCESS_TYPES[2].id,
        gauge: ACCESS_TYPES[2].gauge,
        siteId: ACCESS_SITES[0].id,
        stage: 'setup',
      })
      setSceneAccessProcedure({
        disinfectionCount: 0,
        swabDone: false,
        tourniquetOn: false,
        viggoPlaced: false,
        plasterDone: false,
      })
      setSceneAccessAttachedToolId(null)
      setSceneAccessCursorPos({ x: 0, y: 0 })
      setSceneAccessHint('')
      setScenePtxModalOpen(false)
      setScenePtxDraft({
        site: '4./5. ICR AAL rechts',
        desinfectionDone: false,
        punctureDone: false,
        decompressionDone: false,
      })
      setSceneMonitorState({})
      setSceneVentilatorState({})
      setSceneVentilatorOpen(false)
      setScenePainStimulusMessage(null)
      return
    }
    sceneMedicationSafetyRef.current = {}
    scenePoliceCooldownRef.current = {}
    setScenePlacedGear(mission?.scenePlacedGear || {})
    setSceneLoadedGearIds(
      Array.isArray(mission?.sceneLoadedGearIds)
        ? mission.sceneLoadedGearIds
        : Object.keys(mission?.scenePlacedGear || {}),
    )
    setSceneProtocolDraft(mission?.sceneProtocol || {
      transportReason: '',
      anamnesis: '',
      findings: '',
      diagnostics: '',
      therapy: '',
      handover: '',
      recommendation: '',
    })
    setSceneExamResults(mission?.sceneExamResults || createMissionExamPreset(mission))
    setSceneMonitorState(mission?.sceneMonitorState || {})
    setSceneVentilatorState(mission?.sceneVentilatorState || {})
    setSceneVentilatorOpen(false)
    setSceneMedPrep({
      open: false,
      actionId: null,
      stage: 'break',
      breakProgress: 0,
      drawnMl: 0,
      targetMl: 0,
      hint: '',
      swipeStart: null,
    })
    setSceneCompletedModules(Array.isArray(mission?.sceneCompletedModules) ? mission.sceneCompletedModules : [])
    setSceneInfusions(Array.isArray(mission?.sceneInfusions) ? mission.sceneInfusions : [])
    setSceneInfusionRate(Number(mission?.sceneInfusionRate || 500))
    setSceneWoundCare(mission?.sceneWoundCare || { irrigation: 55, type: 'steriler Verband', compression: 45 })
    setSceneWoundSite(mission?.sceneWoundCare?.site || '')
    setSceneDressingGame({ running: false, expectedStep: 0, score: 0 })
    setSceneIoAccess(mission?.sceneIoAccess || { site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' })
    setSceneTempMeasure(mission?.sceneTempMeasure ?? null)
    setSceneManualBp(mission?.sceneManualBp || null)
    setSceneManualBpSide(String(mission?.sceneManualBpSide || 'left') === 'right' ? 'right' : 'left')
    setSceneBpSides(mission?.sceneBpSides || { left: null, right: null })
    setSceneManualBpMeasuring(false)
    setSceneBloodSugar(mission?.sceneBloodSugar ?? null)
    setSceneBloodSugarBaseline(mission?.sceneBloodSugarBaseline ?? null)
    setSceneTempMeasuring(false)
    setSceneBloodSugarMeasuring(false)
    setSceneAirwayDraft(mission?.sceneAirwayDraft || { adjunct: 'none', ambuRate: 12, oxygenAssist: true })
    setSceneIntubationDraft(mission?.sceneIntubationDraft || { device: 'guedel', secured: false })
    setSceneComfortCare(mission?.sceneComfortCare || { coolingApplied: false, sickbagGiven: false })
    setSceneLucasActive(!!mission?.sceneLucasActive)
    setSceneChatSnapshot(mission?.sceneChatSnapshot || null)
    setSceneSupportStatus(mission?.sceneSupportStatus || {})
    setSceneActionNotice(null)
    const severe = mission?.severity === 'high'
    const profile = mission?.caseProfile || buildCaseProfileForMission(mission)
    const code = String(profile?.diagnosis?.code || '').toUpperCase()
    const baseline = code.startsWith('J44')
      ? { hr: severe ? 118 : 102, rr: severe ? 30 : 24, spo2: severe ? 85 : 90, sys: severe ? 108 : 126, dia: severe ? 66 : 80, pain: severe ? 7 : 4 }
      : code.startsWith('I20')
        ? { hr: severe ? 112 : 96, rr: severe ? 24 : 18, spo2: severe ? 91 : 95, sys: severe ? 152 : 142, dia: severe ? 92 : 86, pain: severe ? 8 : 6 }
        : code.startsWith('S93')
          ? { hr: 92, rr: 18, spo2: 97, sys: 138, dia: 84, pain: 7 }
          : { hr: severe ? 122 : mission?.severity === 'medium' ? 102 : 88, rr: severe ? 27 : mission?.severity === 'medium' ? 22 : 16, spo2: severe ? 89 : mission?.severity === 'medium' ? 93 : 97, sys: severe ? 102 : mission?.severity === 'medium' ? 124 : 136, dia: severe ? 62 : mission?.severity === 'medium' ? 79 : 84, pain: severe ? 8 : mission?.severity === 'medium' ? 6 : 3 }
    const asymmetryLikely = code.startsWith('I71')
      || /dissektion|aorten|subclavia|armischämie/.test(`${profile?.chiefComplaint || ''} ${(profile?.symptoms || []).join(' ')}`.toLowerCase())
    let nextBpSides = { left: `${baseline.sys}/${baseline.dia}`, right: `${baseline.sys}/${baseline.dia}` }
    if (asymmetryLikely) {
      const sysDelta = 14 + Math.floor(Math.random() * 22)
      const diaDelta = 7 + Math.floor(Math.random() * 12)
      const leftHigher = Math.random() < 0.5
      const leftSys = leftHigher ? baseline.sys + sysDelta : Math.max(70, baseline.sys - sysDelta)
      const rightSys = leftHigher ? Math.max(70, baseline.sys - sysDelta) : baseline.sys + sysDelta
      const leftDia = leftHigher ? baseline.dia + diaDelta : Math.max(40, baseline.dia - diaDelta)
      const rightDia = leftHigher ? Math.max(40, baseline.dia - diaDelta) : baseline.dia + diaDelta
      nextBpSides = {
        left: `${Math.max(70, Math.min(230, leftSys))}/${Math.max(40, Math.min(140, leftDia))}`,
        right: `${Math.max(70, Math.min(230, rightSys))}/${Math.max(40, Math.min(140, rightDia))}`,
      }
    }
    setSceneBpSides(nextBpSides)
    updateMissionSceneState({ sceneBpSides: nextBpSides })
    setSceneVitals((prev) => ({
      ...prev,
      hr: baseline.hr,
      rr: baseline.rr,
      spo2: baseline.spo2,
      sys: baseline.sys,
      dia: baseline.dia,
      gcs: mission?.scenePatient?.unconscious ? 6 : (severe ? 12 : 14),
      pain: baseline.pain,
    }))
    setSceneManualBpMeasuring(false)
    setSceneLucasActive(false)
  }, [mission?.id])

  useEffect(() => {
    if (!sceneOpen) return
    const t = setInterval(() => {
      setSceneVitals((prev) => {
        const oxygenBonus = sceneOxygenMode === 'mask' ? 1.0 : sceneOxygenMode === 'nasal' ? 0.45 : -0.55
        const nextSpo2 = clamp(prev.spo2 + oxygenBonus * 0.14 + (Math.random() - 0.5) * 0.12, 78, 100)
        const painDrivenHr = Math.max(0, (Number(prev.pain || 0) - 2) * 0.24)
        const comfortHrDrop = Number(prev.pain || 0) <= 1 ? 0.35 : 0
        const nextHr = clamp(
          prev.hr + (nextSpo2 < 92 ? 0.6 : -0.4) + painDrivenHr - comfortHrDrop + (Math.random() - 0.5) * 1.8,
          45,
          170,
        )
        const nextRr = clamp(prev.rr + (nextSpo2 < 92 ? 0.3 : -0.2) + (Math.random() - 0.5) * 0.7, 8, 36)
        return {
          ...prev,
          spo2: Number(nextSpo2.toFixed(1)),
          hr: Math.round(nextHr),
          rr: Math.round(nextRr),
        }
      })
    }, 2200)
    return () => clearInterval(t)
  }, [sceneOpen, sceneOxygenMode])

  useEffect(() => {
    const key = rdMonitorLoopKeyRef.current
    const shouldPlay = !!(
      mission?.arrived
      && status === '4'
      && sceneMonitorState?.powered
      && sceneMonitorState?.ecgConnected
      && !sceneMonitorState?.muted
    )
    if (shouldPlay) {
      startLoop(key, monitorNormalSound, { volume: 0.12 })
    } else {
      stopLoop(key)
    }
    return () => {
      if (!shouldPlay) stopLoop(key)
    }
  }, [mission?.arrived, status, sceneMonitorState?.powered, sceneMonitorState?.ecgConnected, sceneMonitorState?.muted])

  useEffect(() => {
    const key = rdCoughLoopKeyRef.current
    const pained = Number(sceneVitals?.pain || 0) >= 6 || !!scenePatient?.pained
    const shouldPlay = !!(
      mission?.arrived
      && status === '4'
      && sceneOpen
      && pained
      && !scenePatientUnconscious
    )
    if (shouldPlay) {
      const src = scenePatient?.sex === 'female' ? coughFemaleSound : coughMaleSound
      startLoop(key, src, {
        volume: 0.08,
        loopStartSec: 0.04,
        trimEndSec: 0.08,
        seamCrossfadeSec: 0.015,
        detectSilenceBounds: true,
      })
    } else {
      stopLoop(key)
    }
    return () => {
      if (!shouldPlay) stopLoop(key)
    }
  }, [mission?.arrived, status, sceneOpen, sceneVitals?.pain, scenePatient?.pained, scenePatient?.sex, scenePatientUnconscious])

  useEffect(() => () => {
    stopLoop(rdMonitorLoopKeyRef.current)
    stopLoop(rdCoughLoopKeyRef.current)
  }, [])

  useEffect(() => () => {
    if (sceneMedPrepTimerRef.current) {
      clearTimeout(sceneMedPrepTimerRef.current)
      sceneMedPrepTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!sceneOpen) return
    if (!Array.isArray(sceneInfusions) || sceneInfusions.every((i) => !i.active || i.paused)) return
    const timer = setInterval(() => {
      setSceneInfusions((prev) => {
        const next = prev.map((inf) => {
          if (!inf.active || inf.paused) return inf
          const perSec = Number(inf.rate || 0) / 3600
          const infused = Number(inf.infused || 0) + perSec * 2
          if (infused >= Number(inf.volume || 0)) {
            return { ...inf, infused: Number(inf.volume || 0), active: false }
          }
          return { ...inf, infused }
        })
        updateMissionSceneState({ sceneInfusions: next })
        const totalRunningRate = next.filter((i) => i.active && !i.paused).reduce((acc, cur) => acc + Number(cur.rate || 0), 0)
        if (totalRunningRate > 0) {
          setSceneVitals((v) => ({
            ...v,
            sys: Math.min(190, Math.round(v.sys + Math.min(2.2, totalRunningRate / 3000))),
            dia: Math.min(115, Math.round(v.dia + Math.min(1.5, totalRunningRate / 4200))),
            hr: Math.max(45, Math.round(v.hr - Math.min(1.6, totalRunningRate / 3800))),
          }))
        }
        return next
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [sceneOpen, sceneInfusions])

  useEffect(() => {
    if (!canGetMission) return
    if (!dispatchDueRef.current) {
      const dutyMinutes = onDutySince ? ((Date.now() - Number(onDutySince)) / 60000) : 0
      const isWarmupPhase = dutyMinutes < 7
      const statusBoost = status === '1' ? 0.85 : 1.0
      const minDelay = isWarmupPhase ? 18000 : 45000
      const maxDelay = isWarmupPhase ? 65000 : 160000
      const randomized = minDelay + Math.floor(Math.random() * (maxDelay - minDelay))
      dispatchDueRef.current = Date.now() + Math.round(randomized * statusBoost)
    }
    const timer = setInterval(() => {
      if (Date.now() < dispatchDueRef.current) return
      const next = pickMissionForVehicle(vehicleId)
      const snappedMissionNode = ROAD_NODES[nearestRoadNode({ x: next.x, y: next.y })]
      const scenePatient = randomScenePatientForMission(next)
      const caseProfile = buildCaseProfileForMission(next)
      const dispatchText = buildMissionDispatchText(next, caseProfile, scenePatient)
      setMission({
        ...next,
        text: dispatchText,
        x: snappedMissionNode?.x ?? next.x,
        y: snappedMissionNode?.y ?? next.y,
        accepted: false,
        enRoute: false,
        arrived: false,
        completed: false,
        sceneAcknowledged: false,
        scenePatient,
        caseProfile,
        sceneDisposition: null,
        sceneProtocol: {
          transportReason: '',
          anamnesis: '',
          findings: '',
          diagnostics: '',
          therapy: '',
          handover: '',
          recommendation: '',
        },
        sceneExamResults: createMissionExamPreset(next),
        scenePlacedGear: {},
        sceneCompletedModules: [],
        sceneMonitorState: {},
        sceneInfusions: [],
        sceneInfusionRate: 500,
        sceneWoundCare: { irrigation: 55, type: 'steriler Verband', compression: 45 },
        sceneIoAccess: { site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' },
        sceneTempMeasure: null,
        sceneManualBp: null,
        sceneBloodSugar: null,
        sceneBloodSugarBaseline: null,
        sceneAirwayDraft: { adjunct: 'none', ambuRate: 12, oxygenAssist: true },
        sceneIntubationDraft: { device: 'guedel', secured: false },
        sceneComfortCare: { coolingApplied: false, sickbagGiven: false },
        sceneLucasActive: false,
        sceneAccess: null,
        sceneSupportStatus: {},
        sceneVentilatorState: {},
      })
      setDispatchLog((prev) => [`Leitstelle: Neuer Einsatz: ${next.text} (${next.severity.toUpperCase()})`, ...prev].slice(0, 12))
      playOneShot(pagerSound, { volume: 0.45, maxDurationMs: 2800 })
      const dutyMinutes = onDutySince ? ((Date.now() - Number(onDutySince)) / 60000) : 0
      const postMissionMin = dutyMinutes < 10 ? 50000 : 70000
      const postMissionMax = dutyMinutes < 10 ? 170000 : 260000
      const statusBoost = status === '1' ? 0.9 : 1.0
      dispatchDueRef.current = Date.now() + Math.round((postMissionMin + Math.floor(Math.random() * (postMissionMax - postMissionMin))) * statusBoost)
    }, 5000)
    return () => clearInterval(timer)
  }, [canGetMission, vehicleId, onDutySince, status])

  useEffect(() => {
    if (routePoints.length === 0 || vehicleOutOfService) return
    const t = setInterval(() => {
      setPosition((prev) => {
        const now = Date.now()
        const remainingDist = totalRouteDistance([prev, ...routePoints])
        const remainingSec = routeMeta?.etaAt ? Math.max(1, (Number(routeMeta.etaAt) - now) / 1000) : 10
        const speedPerSec = Math.max(0.6, remainingDist / remainingSec)
        const stepDist = speedPerSec * 0.8
        const advanced = advanceAlongRoute(prev, routePoints, stepDist)
        if (advanced.points.length > 0) {
          setRoutePoints(advanced.points)
          return advanced.position
        }
        if (routeMeta?.mode === 'hospital') {
          setMission((m) => m ? { ...m, atHospital: true, enRoute: false, patientOnBoard: false } : m)
          setRouteMeta(null)
          setRoutePoints([])
          setDispatchLog((p) => [`Zielklinik erreicht. Bitte Status 8 für Abschluss setzen.`, ...p].slice(0, 12))
          return advanced.position
        }
        if (routeMeta?.mode === 'scene') {
          setMission((m) => m ? { ...m, arrived: true, enRoute: false } : m)
          setRouteMeta(null)
          setRoutePoints([])
          setDispatchLog((p) => [`Einsatzort erreicht. Für Maßnahmen bitte manuell Status 4 setzen.`, ...p].slice(0, 12))
          return advanced.position
        }
        if (routeMeta?.mode === 'station') {
          setRouteMeta(null)
          setRoutePoints([])
          setDispatchLog((p) => [`Wache erreicht. Fahrzeug steht auf Status 2 bereit.`, ...p].slice(0, 12))
          return advanced.position
        }
        setRouteMeta(null)
        setRoutePoints([])
        return advanced.position
      })
    }, 800)
    return () => clearInterval(t)
  }, [routeMeta, routePoints, vehicleOutOfService])

  const buildCityRouteForGraph = (graph, start, target) => {
    if (!graph?.mask) return []
    const { w, h, mask } = graph
    const sx = (Number(start?.x || 0) / 100) * (w - 1)
    const sy = (Number(start?.y || 0) / 100) * (h - 1)
    const tx = (Number(target?.x || 0) / 100) * (w - 1)
    const ty = (Number(target?.y || 0) / 100) * (h - 1)
    const startRoad = nearestRoadPixel(mask, w, h, sx, sy, 180)
    const targetRoad = nearestRoadPixel(mask, w, h, tx, ty, 180)
    if (!startRoad || !targetRoad) return []
    const pixelPath = pathOnRoadMask(mask, w, h, startRoad, targetRoad)
    if (!pixelPath || pixelPath.length < 2) return []
    const reduced = simplifyPathPoints(pixelPath.map((p) => ({ x: p.x, y: p.y })), 2.4)
    const route = []
    reduced.forEach((p) => {
      route.push({
        x: (p.x / (w - 1)) * 100,
        y: (p.y / (h - 1)) * 100,
      })
    })
    return route.length > 1 ? route : []
  }

  const buildCityRoute = (start, target) => {
    const candidates = [
      roadGraph,
      roadGraphs?.strict,
      roadGraphs?.balanced,
      roadGraphs?.aggressive,
    ].filter(Boolean)
    for (const g of candidates) {
      const route = buildCityRouteForGraph(g, start, target)
      if (route.length > 1) return route
    }
    return []
  }

  const finishMission = (destination) => {
    if (!mission) return
    const base = mission.severity === 'high' ? 2100 : mission.severity === 'medium' ? 1450 : 900
    const protocol = mission?.sceneProtocol || {}
    const filledSections = ['transportReason', 'anamnesis', 'findings', 'diagnostics', 'therapy', 'handover', 'recommendation']
      .filter((k) => String(protocol?.[k] || '').trim().length > 0).length
    const completedModules = Array.isArray(mission?.sceneCompletedModules) ? mission.sceneCompletedModules.length : 0
    const hasExam = Array.isArray(mission?.sceneExamResults?.externalExamResults) && mission.sceneExamResults.externalExamResults.length > 0
    const hasMonitorData = !!mission?.sceneMonitorState?.powered
    const hasInfusion = Array.isArray(mission?.sceneInfusions) && mission.sceneInfusions.length > 0
    const careScore = filledSections * 0.7 + completedModules * 1.1 + (hasExam ? 1.2 : 0) + (hasMonitorData ? 0.8 : 0) + (hasInfusion ? 0.6 : 0)

    let payout = Math.round(base * earningFactor)
    const shouldTransport = mission.severity === 'high' || mission.id === 'm2' || mission.id === 'm4' || mission.id === 'm1'
    if (destination === 'left') {
      if (shouldTransport) {
        payout = -Math.round((1200 + (mission.severity === 'high' ? 900 : 520)) * earningFactor)
      } else {
        payout = Math.round((base * 0.52 + careScore * 95) * earningFactor)
        if (careScore < 2.2) payout = Math.round(payout * 0.5)
      }
    } else if (destination === 'undertaker') {
      const likelyDeceased = sceneVitals.gcs <= 3 && sceneVitals.spo2 < 70
      payout = likelyDeceased ? Math.round(500 * earningFactor) : -Math.round(1450 * earningFactor)
    } else {
      const careBonus = Math.round((careScore - 2.5) * 140)
      payout = Math.round((payout + careBonus) * (mission?.sceneDisposition === 'hospital' ? 1.05 : 1))
      payout = Math.max(420, payout)
    }
    const rdBonusPct = getRdMoneyBonusPct(user)
    const adjustedPayout = Math.round(payout * (1 + rdBonusPct / 100))
    addMoney(adjustedPayout)
    const payoutLabel = adjustedPayout >= 0 ? `+${adjustedPayout}€` : `${adjustedPayout}€`
    const qualityLabel = `Care-Score ${careScore.toFixed(1)}`
    const destinationLabel = destination === 'hospital'
      ? 'Transport Klinik'
      : destination === 'undertaker'
        ? 'Übergabe an Bestatterdienst'
        : 'Patient verbleibt vor Ort'
    setDispatchLog((prev) => [`Einsatz abgeschlossen (${destinationLabel}). Ergebnis ${payoutLabel}${rdBonusPct > 0 ? ` (inkl. +${rdBonusPct}% Bonus)` : ''} (${qualityLabel})`, ...prev].slice(0, 12))
    Object.keys(supportTimersRef.current || {}).forEach((key) => {
      if (supportTimersRef.current[key]) clearTimeout(supportTimersRef.current[key])
      supportTimersRef.current[key] = null
    })
    setMission(null)
    setRoutePoints([])
    setRouteMeta(null)
    setUseSiren(false)
  }

  const currentRemainingDistance = totalRouteDistance([position, ...routePoints])
  const currentProgress = routeMeta?.totalDistance
    ? Math.max(0, Math.min(100, ((routeMeta.totalDistance - currentRemainingDistance) / routeMeta.totalDistance) * 100))
    : 0

  const handleMapWheel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setMapZoom((z) => clamp(z + (e.deltaY < 0 ? 0.14 : -0.14), 1.0, 4.2))
  }

  const handleMapMouseDown = (e) => {
    if (!mapScrollRef.current) return
    dragRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      left: mapScrollRef.current.scrollLeft,
      top: mapScrollRef.current.scrollTop,
    }
  }

  const handleMapMouseMove = (e) => {
    if (!dragRef.current.active || !mapScrollRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    mapScrollRef.current.scrollLeft = dragRef.current.left - dx
    mapScrollRef.current.scrollTop = dragRef.current.top - dy
  }

  const stopMapDrag = () => {
    dragRef.current.active = false
  }

  useEffect(() => {
    if (!mapModalOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mapModalOpen])

  useEffect(() => () => {
    Object.values(supportTimersRef.current || {}).forEach((timerId) => {
      if (timerId) clearTimeout(timerId)
    })
  }, [])

  useEffect(() => {
    if (!mapModalOpen || !mapScrollRef.current) return
    const el = mapScrollRef.current
    requestAnimationFrame(() => {
      const targetLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
      const targetTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2)
      el.scrollLeft = targetLeft
      el.scrollTop = targetTop
      prevZoomRef.current = mapZoom
    })
  }, [mapModalOpen])

  useEffect(() => {
    if (!mapModalOpen || !mapScrollRef.current) return
    const el = mapScrollRef.current
    const prevZoom = prevZoomRef.current || mapZoom
    if (Math.abs(prevZoom - mapZoom) < 0.0001) return
    const ratio = mapZoom / prevZoom
    const centerX = el.scrollLeft + el.clientWidth / 2
    const centerY = el.scrollTop + el.clientHeight / 2
    const nextCenterX = centerX * ratio
    const nextCenterY = centerY * ratio
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, nextCenterX - el.clientWidth / 2)
      el.scrollTop = Math.max(0, nextCenterY - el.clientHeight / 2)
      prevZoomRef.current = mapZoom
    })
  }, [mapZoom, mapModalOpen])

  const playStatusChangeFx = () => {
    playOneShot(statusChangeSound, { volume: 0.35, maxDurationMs: 2200 })
  }

  const handleStatusChange = (nextStatus) => {
    if (!onDuty) return
    if (vehicleOutOfService && (nextStatus === '1' || nextStatus === '2')) {
      setVehicleOutOfService(false)
      playStatusChangeFx()
      setStatus(nextStatus)
      setDispatchLog((prev) => [`Fahrzeug wieder einsatzbereit (${nextStatus === '1' ? 'über Funk' : 'auf Wache'}).`, ...prev].slice(0, 12))
      return
    }
    if (nextStatus === '6') {
      setVehicleOutOfService(true)
      if (routePoints.length > 0) {
        setMission((m) => (m ? { ...m, enRoute: false } : m))
        setRoutePoints([])
        setRouteMeta(null)
      }
      playStatusChangeFx()
      setStatus(nextStatus)
      setDispatchLog((prev) => ['Status 6 gesetzt: Fahrzeug aktuell nicht einsatzbereit.', ...prev].slice(0, 12))
      return
    }
    if (vehicleOutOfService && nextStatus !== '0') {
      setDispatchLog((prev) => ['Fahrzeug noch Status 6. Bitte erst wieder einsatzbereit melden.', ...prev].slice(0, 12))
      return
    }
    playStatusChangeFx()
    setStatus(nextStatus)
    if ((nextStatus === '1' || nextStatus === '2') && !mission && !vehicleOutOfService) {
      const expeditedDue = Date.now() + 15000 + Math.floor(Math.random() * 35000)
      if (!dispatchDueRef.current || dispatchDueRef.current > expeditedDue) {
        dispatchDueRef.current = expeditedDue
      }
    }
    if (nextStatus === '3' && mission && !mission.accepted) {
      setMission((m) => m ? { ...m, accepted: true } : m)
      setDispatchLog((prev) => [`Status 3: Einsatz übernommen – ${mission.text}`, ...prev].slice(0, 12))
      return
    }
    if (nextStatus === '4' && mission?.arrived) {
      setMission((m) => (m ? { ...m, sceneAcknowledged: true } : m))
      setDispatchLog((prev) => ['Status 4: Einsatzstelle bestätigt, Maßnahmen freigegeben.', ...prev].slice(0, 12))
      setSceneOpen(true)
      return
    }
    if (nextStatus === '5') {
      setDispatchLog((prev) => ['Status 5: Sprechwunsch an Leitstelle. Rückmeldung: Einsatzdetails bestätigt.', ...prev].slice(0, 12))
      return
    }
    if (nextStatus === '7') {
      if (mission?.transportIntent && mission?.patientOnBoard && !mission?.atHospital) {
        const targetHospital = hospitalTargets[Math.floor(Math.random() * hospitalTargets.length)]
        const hospitalRoute = buildCityRoute(position, { x: targetHospital.x, y: targetHospital.y })
        if (hospitalRoute.length < 2) {
          setDispatchLog((prev) => ['Keine valide Straßenroute zur Zielklinik gefunden. Bitte erneut versuchen.', ...prev].slice(0, 12))
          return
        }
        const travelMs = estimateTravelMsByRoute(hospitalRoute, useSiren, selectedVehicleProfile.travelMultiplier)
        const etaMinutes = Math.max(1, Math.ceil(travelMs / 60000))
        if (hospital?.id && canReceivePatients) {
          createIvenaPrealertFromRescue({
            etaMinutes,
            dispatch: `${selectedVehicle.label} ${station?.district || ''}`.trim(),
            priority: mission.priority,
            chiefComplaint: mission.text,
            note: `Transport in ${targetHospital.name}, ETA ${etaMinutes} Min.`,
            protocol: formatSceneProtocol(mission?.sceneProtocol) || undefined,
          })
        } else {
          setDispatchLog((prev) => ['Kein aktiver KH-Dienst erkannt: Transport wird ohne Leitnetz-Voranmeldung simuliert.', ...prev].slice(0, 12))
        }
        setMission((m) => m ? { ...m, routeTarget: 'hospital', targetHospital, enRoute: true } : m)
        setRoutePoints(hospitalRoute)
        setRouteMeta({
          mode: 'hospital',
          startedAt: Date.now(),
          etaAt: Date.now() + travelMs,
          totalMinutes: etaMinutes,
          totalDistance: totalRouteDistance(hospitalRoute),
          label: targetHospital.name,
        })
        setDispatchLog((prev) => [`Status 7: Transport zu ${targetHospital.name} gestartet (ETA ${etaMinutes} Min).`, ...prev].slice(0, 12))
      } else {
        setDispatchLog((prev) => ['Status 7 ohne Transportauftrag gesetzt.', ...prev].slice(0, 12))
      }
      return
    }
    if (nextStatus === '8') {
      if (mission?.atHospital) {
        finishMission('hospital')
      } else if (mission && !canReceivePatients && mission?.transportIntent && !routeMeta && !mission?.enRoute) {
        // Fallback: falls keine Leitnetz/KH-Aufnahme moeglich war, kann nach simulierter Fahrt dennoch abgeschlossen werden.
        finishMission('hospital')
      } else {
        setDispatchLog((prev) => ['Status 8 gesetzt, aber noch keine Klinik erreicht.', ...prev].slice(0, 12))
      }
      return
    }
    if (nextStatus === '1' || nextStatus === '2') {
        const awayFromStation = Math.abs(position.x - stationPos.x) > 1 || Math.abs(position.y - stationPos.y) > 1
      if (awayFromStation && !mission) {
          const stationRoute = buildCityRoute(position, stationPos)
          if (stationRoute.length < 2) {
            setDispatchLog((prev) => ['Keine valide Straßenroute zur Wache gefunden.', ...prev].slice(0, 12))
            return
          }
          const travelMs = estimateTravelMsByRoute(stationRoute, false, selectedVehicleProfile.travelMultiplier)
          const etaMinutes = Math.max(1, Math.ceil(travelMs / 60000))
          setRoutePoints(stationRoute)
        setRouteMeta({
          mode: 'station',
          startedAt: Date.now(),
          etaAt: Date.now() + travelMs,
          totalMinutes: etaMinutes,
          totalDistance: totalRouteDistance(stationRoute),
          label: station?.name || 'Wache',
        })
        setDispatchLog((prev) => [`Status ${nextStatus}: Rückfahrt zur Wache gestartet (ETA ${etaMinutes} Min).`, ...prev].slice(0, 12))
        return
      }
    }
    {
      setDispatchLog((prev) => [`Status ${nextStatus} gesetzt`, ...prev].slice(0, 12))
    }
  }

  const startDuty = () => {
    if (!unlockedVehicle) return
    const hasHospitalDuty = !!hospital?.dutyRoster?.[user?.id]?.active
    if (user?.activeService === 'hospital' || hasHospitalDuty) {
      setDispatchLog((prev) => ['Dienststart blockiert: Du bist aktuell im Krankenhausdienst gemeldet.', ...prev].slice(0, 12))
      return
    }
    setOnDuty(true)
    setOnDutySince(Date.now())
    dispatchDueRef.current = 0
    playStatusChangeFx()
    setStatus('0')
    setVehicleOutOfService(false)
    updateUser({ activeService: 'rd' })
    setDispatchLog((prev) => [`Dienstantritt auf ${selectedVehicle.label}. Funkstatus bitte manuell setzen.`, ...prev].slice(0, 12))
  }

  const stopDuty = () => {
    setOnDuty(false)
    setOnDutySince(null)
    dispatchDueRef.current = 0
    playStatusChangeFx()
    setStatus('0')
    setMission(null)
    setUseSiren(false)
    setRoutePoints([])
    setVehicleOutOfService(false)
    setRouteMeta(null)
    updateUser({ activeService: user?.activeService === 'rd' ? null : user?.activeService })
    setDispatchLog((prev) => ['Dienst beendet.', ...prev].slice(0, 12))
  }

  const driveToMission = (withSiren) => {
    if (!mission || !mission.accepted) return
    if (vehicleOutOfService) return
    setUseSiren(withSiren)
    if (withSiren && mission.severity === 'low') {
      const penalty = Math.round(450 * earningFactor)
      addMoney(-penalty)
      setDispatchLog((prev) => [`Leitstelle: Sondersignal nicht gerechtfertigt. Strafe: -${penalty}€`, ...prev].slice(0, 12))
    }
    const sceneRoute = buildCityRoute(position, { x: mission.x, y: mission.y })
    if (sceneRoute.length < 2) {
      setDispatchLog((prev) => ['Keine valide Straßenroute zum Einsatz gefunden. Bitte erneut disponieren.', ...prev].slice(0, 12))
      return
    }
    setRoutePoints(sceneRoute)
    setMission((m) => m ? { ...m, routeTarget: 'scene', enRoute: true } : m)
    const travelMs = estimateTravelMsByRoute(sceneRoute, withSiren, selectedVehicleProfile.travelMultiplier)
    const etaMinutes = Math.max(1, Math.ceil(travelMs / 60000))
    setRouteMeta({
      mode: 'scene',
      startedAt: Date.now(),
      etaAt: Date.now() + travelMs,
      totalMinutes: etaMinutes,
      totalDistance: totalRouteDistance(sceneRoute),
      label: 'Einsatzort',
    })
    setDispatchLog((prev) => [`Anfahrt gestartet (${withSiren ? 'mit' : 'ohne'} Sonderrechte).`, ...prev].slice(0, 12))
  }

  const setDrivingMode = (withSiren) => {
    if (!mission?.enRoute) return
    setUseSiren(withSiren)
    const target = routePoints[routePoints.length - 1]
    if (target) {
      const travelMs = estimateTravelMsByRoute([position, ...routePoints], withSiren, selectedVehicleProfile.travelMultiplier)
      const etaMinutes = Math.max(1, Math.ceil(travelMs / 60000))
      setRouteMeta((prev) => prev ? {
        ...prev,
        startedAt: Date.now(),
        etaAt: Date.now() + travelMs,
        totalMinutes: etaMinutes,
        totalDistance: totalRouteDistance([position, ...routePoints]),
      } : prev)
    }
    if (withSiren && mission.severity === 'low') {
      const penalty = Math.round(250 * earningFactor)
      addMoney(-penalty)
      setDispatchLog((prev) => [`Sonderrechte während Fahrt aktiviert. Hinweis Leitstelle: fraglich, Strafe -${penalty}€`, ...prev].slice(0, 12))
      return
    }
    setDispatchLog((prev) => [`Anfahrtsart gewechselt: ${withSiren ? 'mit' : 'ohne'} Sonderrechte.`, ...prev].slice(0, 12))
  }

  const openSceneForStatus4 = () => {
    if (!mission?.arrived || status !== '4') return
    setSceneOpen(true)
    setSceneActiveGearId(null)
    setScenePlacingGearId(null)
  }

  const updateMissionSceneState = (partial) => {
    setMission((m) => (m ? { ...m, ...partial } : m))
  }

  const requestSceneSupport = (unitId) => {
    const unit = SCENE_SUPPORT_UNITS.find((entry) => entry.id === unitId)
    if (!unit) return
    const current = sceneSupportStatus?.[unitId]
    if (current?.arrived || current?.requested) return
    const etaSec = Math.max(8, unit.etaSec + Math.floor(Math.random() * 7) - 3)
    const nextStatus = {
      ...(sceneSupportStatus || {}),
      [unitId]: { requested: true, arrived: false, etaSec, requestedAt: Date.now(), arrivedAt: null },
    }
    setSceneSupportStatus(nextStatus)
    updateMissionSceneState({ sceneSupportStatus: nextStatus })
    setDispatchLog((prev) => [`Nachforderung: ${unit.label.replace(' nachfordern', '')} — ETA ca. ${etaSec}s`, ...prev].slice(0, 12))

    if (supportTimersRef.current[unitId]) clearTimeout(supportTimersRef.current[unitId])
    supportTimersRef.current[unitId] = setTimeout(() => {
      setSceneSupportStatus((prev) => {
        const arrived = {
          ...(prev || {}),
          [unitId]: { ...(prev?.[unitId] || {}), requested: true, arrived: true, arrivedAt: Date.now(), etaSec: 0 },
        }
        setMission((m) => (m ? { ...m, sceneSupportStatus: arrived } : m))
        return arrived
      })
      setDispatchLog((prev) => [`${unit.label.replace(' nachfordern', '')} ist eingetroffen. ${unit.note}`, ...prev].slice(0, 12))
      if (unitId === 'nef') {
        setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 1.8, 70, 100), sys: Math.max(90, v.sys + 6), dia: Math.max(55, v.dia + 4) }))
      }
      if (unitId === 'fire') {
        setSceneVitals((v) => ({ ...v, pain: Math.max(0, v.pain - 1), rr: Math.max(8, v.rr - 1) }))
      }
      if (unitId === 'rth') {
        setProtocolField('recommendation', `${sceneProtocolDraft.recommendation ? `${sceneProtocolDraft.recommendation} ` : ''}Transportoption RTH verfügbar.`.trim())
      }
      supportTimersRef.current[unitId] = null
    }, etaSec * 1000)
  }

  const setProtocolField = (field, value) => {
    setSceneProtocolDraft((prev) => {
      const next = { ...prev, [field]: value }
      updateMissionSceneState({ sceneProtocol: next })
      return next
    })
  }

  const handleSceneCanvasClick = (e) => {
    if (!scenePlacingGearId || !sceneCanvasRef.current) return
    const rect = sceneCanvasRef.current.getBoundingClientRect()
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 3, 97)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 6, 95)
    const placed = { x, y, placedAt: Date.now() }
    setScenePlacedGear((prev) => ({ ...prev, [scenePlacingGearId]: placed }))
    setMission((m) => (m ? { ...m, scenePlacedGear: { ...(m.scenePlacedGear || {}), [scenePlacingGearId]: placed } } : m))
    setScenePlacingGearId(null)
  }

  const appendSceneProtocolLine = (field, line) => {
    setSceneProtocolDraft((prev) => {
      const cleanLine = String(line || '').trim()
      if (!cleanLine) return prev
      const next = { ...prev, [field]: prev[field] ? `${prev[field]}\n- ${cleanLine}` : `- ${cleanLine}` }
      updateMissionSceneState({ sceneProtocol: next })
      return next
    })
  }

  const markBackpackModuleDone = (moduleId) => {
    setSceneCompletedModules((prev) => {
      if (prev.includes(moduleId)) return prev
      const next = [...prev, moduleId]
      updateMissionSceneState({ sceneCompletedModules: next })
      return next
    })
  }

  const pushSceneNotice = (kind, text) => {
    setSceneActionNotice({ kind, text })
    window.setTimeout(() => setSceneActionNotice(null), 2600)
  }

  const triggerScenePainStimulus = () => {
    if (!mission?.arrived) return
    const unconscious = scenePatientUnconscious || Number(sceneVitals?.gcs || 15) <= 8
    const severeDyspnea = Number(sceneVitals?.rr || 16) >= 30 || Number(sceneVitals?.spo2 || 96) <= 88
    const severePain = Number(sceneVitals?.pain || 0) >= 7
    const pickOne = (items) => items[Math.floor(Math.random() * items.length)]
    const reactionText = unconscious
      ? pickOne([
          '[Patient reagiert nicht zielgerichtet auf Schmerzreiz.]',
          '[Keine verwertbare Reaktion auf Schmerzreiz.]',
          '[Patient reagiert nicht.]',
        ])
      : severeDyspnea
        ? pickOne([
            'Aua... warum machen Sie das? Ich bekomme ohnehin schlecht Luft.',
            'Au, bitte vorsichtig... warum tun Sie mir weh?',
            'Was machen Sie da? Ich kriege kaum Luft.',
          ])
        : severePain
          ? pickOne([
              'Aua, warum tun Sie mir weh?',
              'Au! Warum machen Sie das?',
              'Autsch, das tut richtig weh. Warum?',
            ])
          : pickOne([
              'Au, warum machen Sie das?',
              'Aua, warum tun Sie mir weh?',
              'Was machen Sie da gerade?',
            ])
    setScenePainStimulusMessage({
      id: `rd_pain_stim_${mission?.id || 'x'}_${Date.now()}`,
      text: reactionText,
      context: {
        type: 'pain_stimulus',
        noResponse: unconscious,
        reducedResponse: false,
      },
    })
    appendSceneProtocolLine('findings', 'Schmerzreiz gesetzt, Reaktion dokumentiert.')
  }

  const applyManualBloodPressure = () => {
    if (sceneManualBpMeasuring) return
    setSceneManualBpMeasuring(true)
    playOneShot(rrManualSound, { volume: 0.34, fromTailSec: 7, maxDurationMs: 7200 })
    const delayMs = 3000 + Math.floor(Math.random() * 1000)
    window.setTimeout(() => {
      const variation = Math.round((Math.random() * 10) - 5)
      const sideBpRaw = String(sceneBpSides?.[sceneManualBpSide] || `${sceneVitals.sys || 130}/${sceneVitals.dia || 80}`)
      const [sideSysRaw, sideDiaRaw] = sideBpRaw.split('/')
      const sideSys = Number.parseInt(sideSysRaw, 10)
      const sideDia = Number.parseInt(sideDiaRaw, 10)
      const measuredSys = Math.max(75, Math.min(220, (Number.isFinite(sideSys) ? sideSys : Number(sceneVitals.sys || 130)) + variation))
      const measuredDia = Math.max(45, Math.min(140, (Number.isFinite(sideDia) ? sideDia : Number(sceneVitals.dia || 80)) + Math.round(variation * 0.7)))
      const nextBp = { sys: measuredSys, dia: measuredDia, side: sceneManualBpSide }
      setSceneManualBp(nextBp)
      updateMissionSceneState({ sceneManualBp: nextBp, sceneManualBpSide })
      appendSceneProtocolLine('diagnostics', `Manuelle RR-Messung (${sceneManualBpSide === 'right' ? 'R' : 'L'}): ${measuredSys}/${measuredDia} mmHg`)
      markBackpackModuleDone('diagnostics')
      setSceneManualBpMeasuring(false)
    }, delayMs)
  }

  const applyBloodSugarCheck = () => {
    if (sceneBloodSugarMeasuring) return
    setSceneBloodSugarMeasuring(true)
    const profileText = `${mission?.text || ''} ${mission?.caseProfile?.chiefComplaint || ''} ${(mission?.caseProfile?.symptoms || []).join(' ')}`
      .toLowerCase()
    const severe = mission?.severity === 'high'
    const likelyHypo = /hypo|unterzucker|diabet|insulin|schweiß|kaltschweiß|verwirrt|kramp|bewusstlos/.test(profileText)
    const likelyHyper = /hyper|keto|polyurie|polydipsie|exsikkose|steroid/.test(profileText)
    const delayMs = 2400 + Math.floor(Math.random() * 1800)
    window.setTimeout(() => {
      const baseline = sceneBloodSugarBaseline ?? (() => {
        if (likelyHypo) return Math.max(38, Math.min(74, Math.round(58 + Math.random() * 14)))
        if (likelyHyper) return Math.max(180, Math.min(420, Math.round(220 + Math.random() * 85)))
        if (severe) return Math.max(72, Math.min(220, Math.round(95 + Math.random() * 60)))
        return Math.max(74, Math.min(150, Math.round(92 + Math.random() * 28)))
      })()
      const measured = Math.max(35, Math.min(450, Math.round(baseline + (Math.random() * 6 - 3))))
      setSceneBloodSugarBaseline(baseline)
      setSceneBloodSugar(measured)
      updateMissionSceneState({ sceneBloodSugar: measured, sceneBloodSugarBaseline: baseline })
      appendSceneProtocolLine('diagnostics', `BZ kapillär: ${measured} mg/dl`)
      markBackpackModuleDone('diagnostics')
      setSceneBloodSugarMeasuring(false)
    }, delayMs)
  }

  const triggerPoliceWithCooldown = (key, payload, cooldownMs = 90000) => {
    const nowMs = Date.now()
    const last = Number(scenePoliceCooldownRef.current?.[key] || 0)
    if (nowMs - last < cooldownMs) return false
    scenePoliceCooldownRef.current[key] = nowMs
    triggerPolicePenalty(payload)
    return true
  }

  const evaluateMedicationSafety = (action, appliedDose) => {
    const nowMs = Date.now()
    const medId = String(action?.id || '')
    if (!medId || !Number.isFinite(appliedDose) || appliedDose <= 0) return

    const prevEventsAny = Array.isArray(sceneMedicationSafetyRef.current?.[medId]) ? sceneMedicationSafetyRef.current[medId] : []
    const inGeneralWindow = prevEventsAny.filter((entry) => nowMs - Number(entry?.at || 0) <= (25 * 60 * 1000))
    const nextEventsAny = [...inGeneralWindow, { at: nowMs, dose: appliedDose }]
    sceneMedicationSafetyRef.current[medId] = nextEventsAny
    const generalTotalDose = nextEventsAny.reduce((sum, entry) => sum + Number(entry?.dose || 0), 0)
    const rapidEvents = nextEventsAny.filter((entry) => nowMs - Number(entry?.at || 0) <= (2 * 60 * 1000))

    const rule = AMPULLARIUM_SAFETY_RULES[medId]
    if (rule) {
      const inWindow = nextEventsAny.filter((entry) => nowMs - Number(entry?.at || 0) <= rule.windowMs)
      const totalDose = inWindow.reduce((sum, entry) => sum + Number(entry?.dose || 0), 0)
      if (totalDose >= rule.criticalDose) {
        triggerPoliceWithCooldown(`cum_${medId}_critical`, {
          reason: `${action.label}: kumulative Hochrisiko-Dosis (${totalDose.toFixed(1)} ${rule.unit} in kurzer Zeit).`,
          source: 'rd_ampullarium_cumulative',
          severity: 'critical',
          forceJail: true,
        }, 120000)
      } else if (totalDose >= rule.warningDose) {
        triggerPoliceWithCooldown(`cum_${medId}_warning`, {
          reason: `${action.label}: auffällige kumulative Dosis (${totalDose.toFixed(1)} ${rule.unit}) im Einsatz.`,
          source: 'rd_ampullarium_cumulative',
          severity: 'high',
          forceJail: false,
        }, 120000)
      }
    }

    const actionMax = Number(action?.max || 0)
    if (actionMax > 0 && nextEventsAny.length >= 4 && generalTotalDose >= actionMax * 3) {
      const extreme = generalTotalDose >= actionMax * 5
      triggerPoliceWithCooldown(`cum_generic_${medId}`, {
        reason: `${action.label}: unplausibel hohe Gesamtdosis (${generalTotalDose.toFixed(1)} ${action?.unit || ''}) im Einsatz.`,
        source: 'rd_ampullarium_cumulative_generic',
        severity: extreme ? 'critical' : 'high',
        forceJail: extreme,
      }, 120000)
    }
    if (rapidEvents.length >= 5) {
      triggerPoliceWithCooldown(`rapid_${medId}`, {
        reason: `${action.label}: ungewöhnlich häufige Mehrfachgabe in kurzer Zeit (${rapidEvents.length}x / 2 Min).`,
        source: 'rd_ampullarium_rapid',
        severity: 'high',
        forceJail: false,
      }, 120000)
    }

    const hr = Number(sceneVitals?.hr || 0)
    const sys = Number(sceneVitals?.sys || 0)
    const currentBz = Number(sceneBloodSugar ?? sceneBloodSugarBaseline ?? 0)
    if (medId === 'adrenaline' && (hr >= 130 || sys >= 175)) {
      triggerPoliceWithCooldown('contra_adrenaline_tachy', {
        reason: `Adrenalin trotz ausgeprägter Tachykardie/Hypertonie (HF ${hr}/min, RRsys ${sys} mmHg).`,
        source: 'rd_ampullarium_contra',
        severity: 'critical',
        forceJail: true,
      }, 90000)
    }
    if (medId === 'insulin' && currentBz > 0 && currentBz < 90) {
      triggerPoliceWithCooldown('contra_insulin_hypo', {
        reason: `Insulin trotz niedriger BZ-Lage (${currentBz} mg/dl).`,
        source: 'rd_ampullarium_contra',
        severity: 'high',
        forceJail: false,
      }, 90000)
    }
    if (medId === 'glucose' && currentBz >= 260) {
      triggerPoliceWithCooldown('contra_glucose_hyper', {
        reason: `Glukosegabe trotz starker Hyperglykämie (${currentBz} mg/dl).`,
        source: 'rd_ampullarium_contra',
        severity: 'high',
        forceJail: false,
      }, 90000)
    }
  }

  const openSceneMedicationPrepMiniGame = (action) => {
    const draft = sceneMedicationDraft
    if (!action || !draft) return
    const dose = clamp(
      Number(draft.dose || action.defaultDose || 0),
      Number(action.min || 0.1),
      Number(draft.dosePerAmpoule || action.max || 1) * Math.max(1, Number(draft.ampoules || 1)),
    )
    const dosePerAmpoule = Math.max(0.1, Number(draft.dosePerAmpoule || action.defaultDose || 1))
    const volumePerAmpoule = Math.max(0.5, Number(draft.volumePerAmpouleMl || 2))
    const targetMl = String(draft.doseUnit || '').toLowerCase() === 'ml'
      ? dose
      : (dose / dosePerAmpoule) * volumePerAmpoule
    setSceneMedPrep({
      open: true,
      actionId: action.id,
      stage: 'break',
      breakProgress: 0,
      drawnMl: 0,
      targetMl: Math.max(0.2, Number(targetMl.toFixed(2))),
      hint: 'Ampullenhals mit einer schnellen horizontalen Swipe-Bewegung brechen.',
      swipeStart: null,
    })
  }

  const handleSceneAmpouleBreakStart = (event) => {
    if (!sceneMedPrep.open || sceneMedPrep.stage !== 'break') return
    setSceneMedPrep((prev) => ({
      ...prev,
      swipeStart: { x: event.clientX, y: event.clientY, t: Date.now() },
      hint: 'Swipe starten: horizontal über den Ampullenhals ziehen.',
    }))
  }

  const handleSceneAmpouleBreakMove = (event) => {
    if (!sceneMedPrep.open || sceneMedPrep.stage !== 'break' || !sceneMedPrep.swipeStart) return
    const dx = Math.abs(event.clientX - Number(sceneMedPrep.swipeStart.x || 0))
    const progress = clamp(dx / 130, 0, 1)
    setSceneMedPrep((prev) => ({
      ...prev,
      breakProgress: Math.max(Number(prev.breakProgress || 0), progress),
      hint: progress >= 0.72
        ? 'Gut! Jetzt loslassen, um die Ampulle zu brechen.'
        : 'Weiter horizontal swipen...',
    }))
  }

  const handleSceneAmpouleBreakEnd = (event) => {
    if (!sceneMedPrep.open || sceneMedPrep.stage !== 'break' || !sceneMedPrep.swipeStart) return
    const dx = Math.abs(event.clientX - Number(sceneMedPrep.swipeStart.x || 0))
    const dy = Math.abs(event.clientY - Number(sceneMedPrep.swipeStart.y || 0))
    const dt = Math.max(1, Date.now() - Number(sceneMedPrep.swipeStart.t || Date.now()))
    const progress = clamp(dx / 130, 0, 1)
    const speed = dx / dt
    const success = progress >= 0.72 && dy <= 86 && speed >= 0.35
    if (success) {
      setSceneMedPrep((prev) => ({
        ...prev,
        stage: 'snap',
        breakProgress: 1,
        swipeStart: null,
        hint: 'Ampulle wird sauber geöffnet...',
      }))
      if (sceneMedPrepTimerRef.current) clearTimeout(sceneMedPrepTimerRef.current)
      sceneMedPrepTimerRef.current = window.setTimeout(() => {
        setSceneMedPrep((prev) => ({
          ...prev,
          stage: 'draw',
          hint: 'Ampulle offen. Jetzt mit der Spritze Medikament aufziehen.',
        }))
        sceneMedPrepTimerRef.current = null
      }, 320)
      return
    }
    setSceneMedPrep((prev) => ({
      ...prev,
      stage: 'break',
      breakProgress: Math.max(0.12, Math.max(Number(prev.breakProgress || 0), progress) * 0.45),
      swipeStart: null,
      hint: 'Zu kurz/langsam. Erneut mit schneller horizontaler Bewegung swipen.',
    }))
  }

  const drawMedicationToSceneSyringe = () => {
    if (!sceneMedPrep.open || sceneMedPrep.stage !== 'draw') return
    const drawStep = clamp(Math.max(0.2, Number(sceneMedPrep.targetMl || 1) * 0.24), 0.2, 1.2)
    setSceneMedPrep((prev) => {
      const nextDrawn = Math.min(Number(prev.targetMl || 0), Number(prev.drawnMl || 0) + drawStep)
      const ready = nextDrawn >= Number(prev.targetMl || 0) - 0.01
      return {
        ...prev,
        drawnMl: Number(nextDrawn.toFixed(2)),
        stage: ready ? 'ready' : 'draw',
        hint: ready
          ? 'Zielsollmenge erreicht. Medikament kann jetzt appliziert werden.'
          : 'Weiter aufziehen bis die Sollmenge erreicht ist.',
      }
    })
  }

  const cancelSceneMedicationPrep = () => {
    if (sceneMedPrepTimerRef.current) {
      clearTimeout(sceneMedPrepTimerRef.current)
      sceneMedPrepTimerRef.current = null
    }
    setSceneMedPrep({
      open: false,
      actionId: null,
      stage: 'break',
      breakProgress: 0,
      drawnMl: 0,
      targetMl: 0,
      hint: '',
      swipeStart: null,
    })
  }

  const applyPreparedSceneMedication = () => {
    if (!sceneMedPrep.open || sceneMedPrep.stage !== 'ready') return
    const action = availableAmpullariumActions.find((a) => a.id === sceneMedPrep.actionId)
    if (!action) return
    useAmpullariumAction(action)
    cancelSceneMedicationPrep()
  }

  const useAmpullariumAction = (action) => {
    const appliedDose = Number(sceneMedicationDraft?.dose ?? action?.defaultDose ?? 0)
    const doseUnit = sceneMedicationDraft?.doseUnit || sceneMedicationDraft?.unit || action?.unit || ''
    const doseText = Number.isFinite(appliedDose) && appliedDose > 0 ? `Dosis ${appliedDose} ${doseUnit}` : ''
    const routeText = sceneMedicationDraft?.route ? `Route ${sceneMedicationDraft.route}` : ''
    const sourceText = sceneMedicationDraft?.sourceForm ? `Form ${sceneMedicationDraft.sourceForm}` : ''
    const metaText = [doseText, routeText, sourceText].filter(Boolean).join(', ')
    appendSceneProtocolLine('therapy', `${action.label}${metaText ? ` (${metaText})` : ''} appliziert`)
    markBackpackModuleDone('ampullarium')
    setSceneMedicationDraft(null)
    evaluateMedicationSafety(action, appliedDose)
    if (Number.isFinite(appliedDose) && Number.isFinite(Number(action?.max || 0)) && Number(action.max) > 0) {
      const overdoseRatio = appliedDose / Number(action.max)
      if (overdoseRatio >= 1.35) {
        const severeOverdose = overdoseRatio >= 1.8
        triggerPolicePenalty({
          reason: `Verdacht auf ${severeOverdose ? 'schwere ' : ''}Überdosierung (${action.label}) im RD.`,
          source: 'rd_ampullarium',
          severity: severeOverdose ? 'critical' : 'high',
          forceJail: severeOverdose,
        })
      }
    }
    if (action.id === 'salbutamol') {
      setSceneVitals((v) => ({ ...v, spo2: Math.min(100, v.spo2 + 1.0), rr: Math.max(8, v.rr - 1) }))
      return
    }
    if (['fentanyl', 'ketamine', 'metamizole'].includes(action.id)) {
      setSceneVitals((v) => ({ ...v, pain: Math.max(0, v.pain - 3), hr: Math.max(45, v.hr - 4) }))
      return
    }
    if (['ondansetron', 'dimenhydrinate'].includes(action.id)) {
      setSceneVitals((v) => ({ ...v, rr: Math.max(10, v.rr - 1), pain: Math.max(0, v.pain - 1) }))
      return
    }
    if (action.id === 'norepinephrine') {
      setSceneVitals((v) => ({ ...v, sys: Math.min(195, v.sys + 10), dia: Math.min(120, v.dia + 6), hr: Math.max(45, v.hr - 2) }))
      return
    }
    if (action.id === 'adenosine') {
      setSceneVitals((v) => ({ ...v, hr: Math.max(40, v.hr - 18), sys: Math.max(80, v.sys - 6), dia: Math.max(45, v.dia - 4) }))
      return
    }
    if (action.id === 'tranexamic_acid') {
      setSceneVitals((v) => ({ ...v, hr: Math.max(40, v.hr - 3), sys: Math.min(200, v.sys + 3) }))
      return
    }
    if (action.id === 'magnesium') {
      setSceneVitals((v) => ({ ...v, rr: Math.max(8, v.rr - 1), hr: Math.max(40, v.hr - 4) }))
      return
    }
    if (action.id === 'glucose') {
      const rise = Math.max(15, Math.min(120, Math.round((Number(sceneMedicationDraft?.dose || 20) / 20) * 38)))
      setSceneBloodSugarBaseline((prev) => {
        const base = prev ?? (sceneBloodSugar ?? 85)
        return Math.min(460, Math.round(base + rise))
      })
      setSceneBloodSugar((prev) => {
        const current = prev ?? (sceneBloodSugarBaseline ?? 85)
        return Math.min(460, Math.round(current + rise * 0.75))
      })
      return
    }
    if (action.id === 'insulin') {
      const drop = Math.max(20, Math.min(180, Math.round((Number(sceneMedicationDraft?.dose || 4)) * 18)))
      setSceneBloodSugarBaseline((prev) => {
        const base = prev ?? (sceneBloodSugar ?? 140)
        return Math.max(45, Math.round(base - drop))
      })
      setSceneBloodSugar((prev) => {
        const current = prev ?? (sceneBloodSugarBaseline ?? 140)
        return Math.max(45, Math.round(current - drop * 0.55))
      })
      return
    }
    if (['morphine', 'etomidate', 'rocuronium'].includes(action.id)) {
      setSceneVitals((v) => ({ ...v, pain: Math.max(0, v.pain - 4), hr: Math.max(40, v.hr - 6), rr: Math.max(8, v.rr - 2) }))
    }
  }

  const resetSceneAccessProcedure = () => {
    setSceneAccessProcedure({
      disinfectionCount: 0,
      swabDone: false,
      tourniquetOn: false,
      viggoPlaced: false,
      plasterDone: false,
    })
    setSceneAccessAttachedToolId(null)
    setSceneAccessHint('')
  }

  const openSceneAccessModal = () => {
    setSceneAccessDraft((prev) => ({ ...prev, stage: 'setup' }))
    resetSceneAccessProcedure()
    setSceneAccessModalOpen(true)
  }

  const startSceneAccessProcedure = () => {
    setSceneAccessDraft((prev) => ({ ...prev, stage: 'procedure' }))
    resetSceneAccessProcedure()
    setSceneAccessHint(`Vorbereitung abgeschlossen: ${selectedAccessType.gauge} an ${selectedAccessSite.label}.`)
  }

  const closeSceneAccessModal = () => {
    setSceneAccessModalOpen(false)
    setSceneAccessDraft((prev) => ({ ...prev, stage: 'setup' }))
    resetSceneAccessProcedure()
  }

  const attachSceneAccessTool = (toolId) => {
    if (sceneAccessDraft.stage !== 'procedure') return
    setSceneAccessAttachedToolId(toolId)
    setSceneAccessHint(`"${sceneAccessTools[toolId]?.label || toolId}" ausgewählt. Auf den Arm klicken.`)
  }

  const validateSceneAccessHit = (targetName, pos) => {
    const target = targetName === 'punctureSite' ? displayAccessPunctureTarget : displayAccessUpperArmTarget
    if (!target) return false
    return distance(pos, target) <= target.r
  }

  const placeSceneAccessToolOnArm = (event) => {
    if (sceneAccessDraft.stage !== 'procedure' || !sceneAccessAttachedToolId || !sceneAccessCanvasRef.current) {
      setSceneAccessHint('Bitte zuerst ein Instrument auf dem Tablett auswählen.')
      return
    }
    const rect = sceneAccessCanvasRef.current.getBoundingClientRect()
    const pos = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
    const fail = (message) => {
      setSceneAccessHint(message)
      return false
    }

    if (sceneAccessAttachedToolId === 'tourniquet') {
      if (!validateSceneAccessHit('upperArm', pos)) return fail('Stauschlauch bitte am Oberarm anlegen/abnehmen.')
      if (!sceneAccessProcedure.tourniquetOn) {
        setSceneAccessProcedure((prev) => ({ ...prev, tourniquetOn: true }))
        setSceneAccessHint('Stauschlauch angelegt.')
      } else {
        if (!sceneAccessProcedure.viggoPlaced) return fail('Stauschlauch erst nach gelegter Viggo entfernen.')
        setSceneAccessProcedure((prev) => ({ ...prev, tourniquetOn: false }))
        setSceneAccessHint('Stauschlauch entfernt.')
      }
      setSceneAccessAttachedToolId(null)
      return
    }

    if (sceneAccessAttachedToolId === 'disinfect') {
      if (!validateSceneAccessHit('punctureSite', pos)) return fail('Bitte direkt an der Punktionsstelle desinfizieren.')
      playOneShot(spraySound, { volume: 0.42, maxDurationMs: 1700 })
      if (sceneAccessProcedure.disinfectionCount === 0) {
        setSceneAccessProcedure((prev) => ({ ...prev, disinfectionCount: 1 }))
        setSceneAccessHint('Erste Desinfektion abgeschlossen.')
      } else if (sceneAccessProcedure.disinfectionCount === 1 && sceneAccessProcedure.swabDone) {
        setSceneAccessProcedure((prev) => ({ ...prev, disinfectionCount: 2 }))
        setSceneAccessHint('Zweite Desinfektion abgeschlossen.')
      } else {
        return fail('Reihenfolge: Desinfizieren -> Wischen -> erneut desinfizieren.')
      }
      setSceneAccessAttachedToolId(null)
      return
    }

    if (sceneAccessAttachedToolId === 'swab') {
      if (!validateSceneAccessHit('punctureSite', pos)) return fail('Tupfer bitte über die Punktionsstelle führen.')
      if (sceneAccessProcedure.disinfectionCount < 1) return fail('Vorher einmal desinfizieren.')
      if (sceneAccessProcedure.swabDone) return fail('Wisch-Schritt ist bereits erledigt.')
      setSceneAccessProcedure((prev) => ({ ...prev, swabDone: true }))
      setSceneAccessHint('Punktionsstelle gewischt.')
      setSceneAccessAttachedToolId(null)
      return
    }

    if (sceneAccessAttachedToolId === 'viggo') {
      if (!validateSceneAccessHit('punctureSite', pos)) return fail('Viggo bitte exakt an der Punktionsstelle legen.')
      if (sceneAccessProcedure.disinfectionCount < 2 || !sceneAccessProcedure.swabDone) return fail('Vorher: Desinfizieren -> Wischen -> Desinfizieren.')
      if (!sceneAccessProcedure.tourniquetOn) return fail('Vor dem Legen zuerst stauen.')
      if (sceneAccessProcedure.viggoPlaced) return fail('Viggo ist bereits gelegt.')
      setSceneAccessProcedure((prev) => ({ ...prev, viggoPlaced: true }))
      setSceneAccessHint(`Viggo ${selectedAccessType.gauge} erfolgreich gelegt.`)
      setSceneAccessAttachedToolId(null)
      return
    }

    if (sceneAccessAttachedToolId === 'plaster') {
      if (!validateSceneAccessHit('punctureSite', pos)) return fail('Pflaster bitte auf die Punktionsstelle setzen.')
      if (!sceneAccessProcedure.viggoPlaced) return fail('Erst Viggo legen.')
      if (sceneAccessProcedure.tourniquetOn) return fail('Vor dem Pflaster bitte erst entstauen.')
      if (sceneAccessProcedure.plasterDone) return fail('Pflaster wurde bereits gesetzt.')
      setSceneAccessProcedure((prev) => ({ ...prev, plasterDone: true }))
      setSceneAccessHint('Pflaster angelegt. Zugang erfolgreich gesichert.')
      setSceneAccessAttachedToolId(null)
    }
  }

  const finalizeSceneAccessPlacement = () => {
    if (!sceneAccessProcedure.plasterDone || sceneAccessProcedure.tourniquetOn) return
    if (!sceneAccessDraft.typeId || !sceneAccessDraft.siteId || !selectedAccessType?.gauge) return
    appendSceneProtocolLine('therapy', `i.v.-Zugang (${selectedAccessType.gauge}, ${selectedAccessSite.label}) erfolgreich`)
    markBackpackModuleDone('access')
    updateMissionSceneState({
      sceneAccess: {
        typeId: sceneAccessDraft.typeId,
        gauge: selectedAccessType.gauge,
        site: selectedAccessSite.label,
        placedAt: new Date().toISOString(),
      },
    })
    closeSceneAccessModal()
  }

  const applyIoAccess = () => {
    appendSceneProtocolLine('therapy', `IO-Zugang (${sceneIoAccess.needle}, ${sceneIoAccess.site}) gelegt`)
    markBackpackModuleDone('io_access')
    updateMissionSceneState({
      sceneIoAccess: {
        ...sceneIoAccess,
        placedAt: new Date().toISOString(),
      },
    })
  }

  const applyWoundCare = () => {
    if (!sceneWoundSite) {
      pushSceneNotice('warn', 'Bitte zuerst eine Wundlokalisation auswählen.')
      return
    }
    if (sceneDressingGame.score < 3) {
      pushSceneNotice('warn', 'Verbands-Minigame noch nicht abgeschlossen.')
      return
    }
    const quality = sceneWoundCare.irrigation >= 40 && sceneWoundCare.irrigation <= 75 ? 'adäquat' : 'suboptimal'
    const woundLabel = DRESSING_LOCATIONS.find((s) => s.id === sceneWoundSite)?.label || sceneWoundSite
    appendSceneProtocolLine('therapy', `Wundversorgung (${sceneWoundCare.type}, Lokalisation: ${woundLabel}, Spülung ${sceneWoundCare.irrigation}%, Kompression ${sceneWoundCare.compression}%, ${quality})`)
    markBackpackModuleDone('dressings')
    updateMissionSceneState({ sceneWoundCare: { ...sceneWoundCare, site: sceneWoundSite } })
    pushSceneNotice('ok', `Verband an ${woundLabel} angelegt.`)
  }

  const playDressingStep = (stepIndex) => {
    const expected = sceneDressingGame.expectedStep
    if (!sceneDressingGame.running && stepIndex !== 0) {
      pushSceneNotice('warn', 'Minigame mit Schritt 1 starten.')
      return
    }
    if (!sceneDressingGame.running && stepIndex === 0) {
      setSceneDressingGame({ running: true, expectedStep: 1, score: 1 })
      return
    }
    if (stepIndex !== expected) {
      setSceneDressingGame({ running: true, expectedStep: 0, score: 0 })
      pushSceneNotice('warn', 'Reihenfolge falsch: nochmal von vorne.')
      return
    }
    const nextScore = sceneDressingGame.score + 1
    if (nextScore >= 3) {
      setSceneDressingGame({ running: false, expectedStep: 0, score: 3 })
      pushSceneNotice('ok', 'Verbandsvorbereitung erfolgreich.')
      return
    }
    setSceneDressingGame({ running: true, expectedStep: expected + 1, score: nextScore })
  }

  const applyTemperatureCheck = () => {
    if (sceneTempMeasuring) return
    setSceneTempMeasuring(true)
    const delayMs = 2600 + Math.floor(Math.random() * 2200)
    window.setTimeout(() => {
      const measured = Math.max(34.5, Math.min(41.5, +(Number(sceneVitals.temp || 36.8) + (Math.random() * 0.2 - 0.1)).toFixed(1)))
      setSceneTempMeasure(measured)
      updateMissionSceneState({ sceneTempMeasure: measured })
      appendSceneProtocolLine('diagnostics', `Temperatur gemessen: ${measured.toFixed(1)} C`)
      markBackpackModuleDone('diagnostics')
      setSceneTempMeasuring(false)
    }, delayMs)
  }

  const startSceneInfusion = (item) => {
    if (!hasSceneAccess) return
    const selectedRate = Math.max(20, Math.min(item.id === 'transfusion_ek' ? 1200 : 6000, Number(sceneInfusionRate || 500)))
    const id = `${item.id}_${Date.now()}`
    const next = [...sceneInfusions, {
      id,
      ...item,
      rate: selectedRate,
      infused: 0,
      active: true,
      paused: false,
      startedAt: new Date().toISOString(),
    }]
    setSceneInfusions(next)
    updateMissionSceneState({ sceneInfusions: next, sceneInfusionRate: sceneInfusionRate })
    appendSceneProtocolLine('therapy', `${item.label} gestartet (${selectedRate} ml/h)`)
    markBackpackModuleDone('access')
  }

  const applyPneumothoraxSet = () => {
    setScenePtxModalOpen(true)
    setScenePtxDraft({
      site: '4./5. ICR AAL rechts',
      desinfectionDone: false,
      punctureDone: false,
      decompressionDone: false,
    })
  }

  const finalizePneumothoraxSet = () => {
    if (!scenePtxDraft.desinfectionDone || !scenePtxDraft.punctureDone || !scenePtxDraft.decompressionDone) {
      pushSceneNotice('warn', 'Bitte alle Schritte im Pneumothorax-Set abschließen.')
      return
    }
    appendSceneProtocolLine('therapy', `Pneumothorax-Entlastung durchgeführt (${scenePtxDraft.site}, Nadeldekompression)`)
    setSceneVitals((v) => {
      const severeResp = v.spo2 <= 90 || v.rr >= 28
      return {
        ...v,
        spo2: clamp(v.spo2 + (severeResp ? 4.5 : 2.2), 70, 100),
        rr: Math.max(10, v.rr - (severeResp ? 4 : 2)),
        hr: Math.max(45, v.hr - (severeResp ? 6 : 3)),
      }
    })
    markBackpackModuleDone('access')
    setScenePtxModalOpen(false)
    pushSceneNotice('ok', 'Pneumothorax-Maßnahme erfolgreich dokumentiert.')
  }

  const applyAirwayAdjunct = (adjunct) => {
    const next = { ...sceneAirwayDraft, adjunct }
    setSceneAirwayDraft(next)
    updateMissionSceneState({ sceneAirwayDraft: next })
    appendSceneProtocolLine('therapy', `Atemwegshilfe eingelegt: ${adjunct === 'none' ? 'keine' : adjunct}`)
    markBackpackModuleDone('airway')
  }

  const applyAmbuVentilation = () => {
    appendSceneProtocolLine('therapy', `Beutel-Masken-Beatmung gestartet (${sceneAirwayDraft.ambuRate}/min)`)
    setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 1.6, 70, 100), rr: Math.max(8, Math.round((v.rr + sceneAirwayDraft.ambuRate) / 2)) }))
    markBackpackModuleDone('airway')
  }

  const applyLucasSystem = () => {
    if (!selectedVehicleProfile.hasLucas) return
    setSceneLucasActive(true)
    updateMissionSceneState({ sceneLucasActive: true })
    appendSceneProtocolLine('therapy', 'LUCAS-System angelegt und laufende mechanische Reanimation gestartet')
    setSceneVitals((v) => ({
      ...v,
      hr: Math.max(0, Math.round(v.hr * 0.75)),
      sys: Math.max(70, Math.round(v.sys + 8)),
      dia: Math.max(45, Math.round(v.dia + 5)),
      spo2: clamp(v.spo2 + 1.8, 50, 100),
    }))
    markBackpackModuleDone('airway')
  }

  const applyIntubation = () => {
    if (sceneVitals.gcs > 8) {
      pushSceneNotice('warn', 'Atemwegssicherung nicht möglich: Patient*in ist wach/wehrt ab.')
      setDispatchLog((prev) => ['Intubation abgebrochen: Patient*in ist nicht ausreichend bewusstseinsgemindert.', ...prev].slice(0, 12))
      return
    }
    const deviceLabel = sceneIntubationDraft.device === 'guedel'
      ? 'Guedel-Tubus'
      : sceneIntubationDraft.device === 'wendl'
        ? 'Wendl-Tubus'
        : sceneIntubationDraft.device === 'larynx'
          ? 'Larynx-Tubus'
          : 'Endotrachealer Tubus'
    const secured = sceneIntubationDraft.device === 'ett' || sceneIntubationDraft.device === 'larynx'
    const nextDraft = { ...sceneIntubationDraft, secured }
    setSceneIntubationDraft(nextDraft)
    updateMissionSceneState({ sceneIntubationDraft: nextDraft })
    appendSceneProtocolLine('therapy', `${deviceLabel} ${secured ? 'erfolgreich platziert und gesichert' : 'angelegt'}`)
    if (secured) setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 2.4, 70, 100), rr: Math.max(10, v.rr - 1) }))
    markBackpackModuleDone('intubation')
  }

  const applyComfortMeasure = (type) => {
    if (type === 'cooling') {
      const next = { ...sceneComfortCare, coolingApplied: true }
      setSceneComfortCare(next)
      updateMissionSceneState({ sceneComfortCare: next })
      appendSceneProtocolLine('therapy', 'Kühlkissen angelegt')
      setSceneVitals((v) => ({ ...v, temp: Math.max(35.5, +(v.temp - 0.2).toFixed(1)) }))
      markBackpackModuleDone('comfort')
      return
    }
    const next = { ...sceneComfortCare, sickbagGiven: true }
    setSceneComfortCare(next)
    updateMissionSceneState({ sceneComfortCare: next })
    appendSceneProtocolLine('therapy', 'Sicksack bereitgestellt')
    markBackpackModuleDone('comfort')
  }

  const removeSceneInfusion = (id) => {
    const next = sceneInfusions.filter((i) => i.id !== id)
    setSceneInfusions(next)
    updateMissionSceneState({ sceneInfusions: next })
  }

  const toggleSceneInfusionPause = (id) => {
    const next = sceneInfusions.map((inf) => {
      if (inf.id !== id || !inf.active) return inf
      return { ...inf, paused: !inf.paused }
    })
    setSceneInfusions(next)
    updateMissionSceneState({ sceneInfusions: next })
  }

  const updateSceneInfusionRate = (id, nextRateRaw) => {
    const nextRate = Math.max(20, Math.min(6000, Number(nextRateRaw || 0)))
    const next = sceneInfusions.map((inf) => {
      if (inf.id !== id || !inf.active) return inf
      const maxRate = inf.id?.startsWith('transfusion_ek') || inf.type === 'transfusion_ek' ? 1200 : 6000
      return { ...inf, rate: Math.max(20, Math.min(maxRate, nextRate)) }
    })
    setSceneInfusions(next)
    updateMissionSceneState({ sceneInfusions: next })
  }

  const handleSceneMonitorAction = (actionId, actionName) => {
    if (actionId === 'oxygen_start') {
      setSceneOxygenMode('mask')
      setSceneOxygenFlow(10)
    }
    if (actionName) {
      const diagnostics = sceneProtocolDraft.diagnostics
        ? `${sceneProtocolDraft.diagnostics}\n- ${actionName}`
        : `- ${actionName}`
      const nextDraft = { ...sceneProtocolDraft, diagnostics }
      setSceneProtocolDraft(nextDraft)
      updateMissionSceneState({ sceneProtocol: nextDraft })
    }
  }

  const resolveSceneDisposition = (mode) => {
    if (!mission) return
    if (mode === 'hospital' && vehicleId === 'nef') {
      pushSceneNotice('warn', 'NEF transportiert nicht eigenständig. Bitte RTW/RTH anfordern oder Übergabe vor Ort dokumentieren.')
      setDispatchLog((prev) => ['NEF-Hinweis: Eigentransport nicht möglich. Übergabe an transportfähiges Rettungsmittel erforderlich.', ...prev].slice(0, 12))
      return
    }
    const mergedProtocol = sceneProtocolDraft
    const payload = {
      sceneDisposition: mode,
      sceneProtocol: mergedProtocol,
      scenePlacedGear,
      sceneLoadedGearIds,
      sceneExamResults,
      sceneCompletedModules,
      sceneMonitorState,
      sceneInfusions,
      sceneInfusionRate,
      sceneWoundCare,
      sceneIoAccess,
      sceneTempMeasure,
      sceneManualBp,
      sceneBloodSugar,
      sceneBloodSugarBaseline,
      sceneAirwayDraft,
      sceneIntubationDraft,
      sceneComfortCare,
      sceneLucasActive,
      sceneChatSnapshot,
      sceneSupportStatus,
      sceneVentilatorState,
      transportIntent: mode === 'hospital',
      patientOnBoard: mode === 'hospital',
    }
    setMission((m) => (m ? { ...m, ...payload } : m))
    if (mode === 'hospital') {
      setDispatchLog((prev) => ['Einsatz vor Ort abgeschlossen. Transportentscheidung gesetzt, bitte Status 7 für Klinikfahrt.', ...prev].slice(0, 12))
      setSceneOpen(false)
      return
    }
    if (mode === 'undertaker') {
      const likelyAlive = Number(sceneVitals?.hr || 0) > 0 || Number(sceneVitals?.rr || 0) > 0 || Number(sceneVitals?.spo2 || 0) > 0
      if (likelyAlive) {
        triggerPoliceWithCooldown('rd_undertaker_alive', {
          reason: 'Bestatter angefordert obwohl Vitalzeichen vorhanden sind.',
          source: 'rd_scene_disposition',
          severity: 'critical',
          forceJail: true,
        }, 180000)
      }
      setSceneOpen(false)
      finishMission('undertaker')
      return
    }
    if (mode === 'left') {
      const highSeverity = String(mission?.severity || '').toLowerCase() === 'high'
      const measuredSomething = !!sceneManualBp || !!sceneBloodSugar || !!sceneTempMeasure
      const documentedTherapy = String(sceneProtocolDraft?.therapy || '').trim().length > 0
      const unsafeLeave = highSeverity || (!measuredSomething && !documentedTherapy)
      if (unsafeLeave) {
        triggerPolicePenalty({
          reason: 'Patient am Einsatzort belassen ohne ausreichende Versorgung/Dokumentation.',
          source: 'rd_scene_disposition',
          severity: highSeverity ? 'critical' : 'high',
          forceJail: highSeverity,
        })
      }
    }
    setSceneOpen(false)
    finishMission('left')
  }

  const renderSceneAmpullariumPanel = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {availableAmpullariumActions.map((action) => (
          <button
            key={action.id}
            onClick={() => setSceneMedicationDraft(createSceneMedicationDraft(action))}
            className="px-2 py-1.5 rounded bg-surface-100 text-xs text-left inline-flex items-center gap-1.5 hover:bg-surface-200"
          >
            <Pill className="w-3 h-3" /> {action.label}
          </button>
        ))}
      </div>
      {sceneMedicationDraft && (
        <div className="rounded-xl border border-surface-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-surface-900">{sceneMedicationDraft.label}</p>
              <p className="text-[10px] text-surface-500">Kategorie: {sceneMedicationDraft.category || 'Ampullarium'}</p>
            </div>
            <button onClick={() => setSceneMedicationDraft(null)} className="text-[10px] px-2 py-1 rounded bg-surface-100 text-surface-700">Zurücksetzen</button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-1">Applikationsart</p>
              <select
                value={sceneMedicationDraft.route || ''}
                onChange={(e) => setSceneMedicationDraft((prev) => ({ ...prev, route: e.target.value }))}
                className="input-field !py-1.5 text-[11px]"
              >
                {(sceneMedicationDraft.routeOptions || ['i.v.']).map((route) => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-1">Darreichungsform</p>
              <select
                value={sceneMedicationDraft.sourceForm || 'Ampulle'}
                onChange={(e) => setSceneMedicationDraft((prev) => ({ ...prev, sourceForm: e.target.value }))}
                className="input-field !py-1.5 text-[11px]"
              >
                {(sceneMedicationDraft.sourceForms || ['Ampulle']).map((form) => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-2">
            <p className="text-[10px] uppercase tracking-wide text-fuchsia-700 mb-1">Ampullen-Setup</p>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button
                onClick={() => setSceneMedicationDraft((prev) => {
                  const ampoules = Math.max(1, Number(prev.ampoules || 1) - 1)
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * ampoules
                  const dose = clamp(Number(prev.dose || prev.defaultDose || 0), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, ampoules, dose: Number(dose.toFixed(2)) }
                })}
                className="px-2 py-1 rounded bg-white border border-fuchsia-200 text-fuchsia-800 text-xs"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="6"
                value={sceneMedicationDraft.ampoules || 1}
                onChange={(e) => setSceneMedicationDraft((prev) => {
                  const ampoules = clamp(Number(e.target.value || 1), 1, 6)
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * ampoules
                  const dose = clamp(Number(prev.dose || prev.defaultDose || 0), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, ampoules, dose: Number(dose.toFixed(2)) }
                })}
                className="input-field !py-1.5 text-[11px] text-center"
              />
              <button
                onClick={() => setSceneMedicationDraft((prev) => {
                  const ampoules = Math.min(6, Number(prev.ampoules || 1) + 1)
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * ampoules
                  const dose = clamp(Number(prev.dose || prev.defaultDose || 0), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, ampoules, dose: Number(dose.toFixed(2)) }
                })}
                className="px-2 py-1 rounded bg-white border border-fuchsia-200 text-fuchsia-800 text-xs"
              >
                +
              </button>
            </div>
            <p className="text-[10px] text-fuchsia-700 mt-1">
              Pro Ampulle: {Number(sceneMedicationDraft.dosePerAmpoule || 0).toFixed(2)} {sceneMedicationDraft.doseUnit}
              {' '}({Number(sceneMedicationDraft.volumePerAmpouleMl || 0).toFixed(1)} ml)
            </p>
          </div>

          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 mb-1">Gewünschte Dosis</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSceneMedicationDraft((prev) => {
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * Math.max(1, Number(prev.ampoules || 1))
                  const nextDose = clamp(Number(prev.dose || 0) - Number(prev.step || 0.1), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, dose: Number(nextDose.toFixed(2)) }
                })}
                className="px-2 py-1 rounded bg-white border border-emerald-200 text-emerald-800 text-xs"
              >
                -
              </button>
              <input
                type="number"
                value={sceneMedicationDraft.dose}
                min={sceneMedicationDraft.step || 0.1}
                max={Number(sceneMedicationDraft.dosePerAmpoule || 1) * Math.max(1, Number(sceneMedicationDraft.ampoules || 1))}
                step={sceneMedicationDraft.step || 0.1}
                onChange={(e) => setSceneMedicationDraft((prev) => {
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * Math.max(1, Number(prev.ampoules || 1))
                  const value = clamp(Number(e.target.value || prev.step || 0.1), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, dose: Number(value.toFixed(2)) }
                })}
                className="input-field !py-1.5 text-[11px] text-center"
              />
              <span className="text-[11px] w-14 text-surface-700">{sceneMedicationDraft.doseUnit}</span>
              <button
                onClick={() => setSceneMedicationDraft((prev) => {
                  const maxByAmpoules = Number(prev.dosePerAmpoule || 1) * Math.max(1, Number(prev.ampoules || 1))
                  const nextDose = clamp(Number(prev.dose || 0) + Number(prev.step || 0.1), Number(prev.step || 0.1), maxByAmpoules)
                  return { ...prev, dose: Number(nextDose.toFixed(2)) }
                })}
                className="px-2 py-1 rounded bg-white border border-emerald-200 text-emerald-800 text-xs"
              >
                +
              </button>
            </div>
            <p className="text-[10px] text-emerald-700 mt-1">
              Maximal aus Ampullen: {(Number(sceneMedicationDraft.dosePerAmpoule || 0) * Math.max(1, Number(sceneMedicationDraft.ampoules || 1))).toFixed(2)} {sceneMedicationDraft.doseUnit}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                const action = availableAmpullariumActions.find((a) => a.id === sceneMedicationDraft.id)
                if (!action) return
                openSceneMedicationPrepMiniGame(action)
              }}
              className="px-2.5 py-1.5 rounded bg-indigo-600 text-white text-xs inline-flex items-center gap-1.5"
            >
              <MousePointer2 className="w-3 h-3" />
              Ampullen-Minigame starten
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-surface-900">Rettungsdienst</h1>
        <p className="text-surface-500 mt-1">Disposition, Funkstatus und Einsatzannahme im Dienstbetrieb ({station?.name || 'Wache'})</p>
      </div>

      {routeMeta && (
        <div className="mb-5 card p-4 bg-surface-50">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-semibold text-surface-900 flex items-center gap-2">
              <Route className="w-4 h-4 text-primary-600" />
              Fahrtstatus: {routeMeta.mode === 'hospital' ? `Transport zu ${routeMeta.label}` : routeMeta.mode === 'station' ? `Rückfahrt zur ${routeMeta.label}` : 'Anfahrt Einsatzort'}
            </p>
            <span className="text-xs text-surface-600">
              ETA: {Math.max(0, Math.ceil((Number(routeMeta.etaAt || 0) - Date.now()) / 60000))} Min
            </span>
          </div>
          <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
              style={{
                width: `${currentProgress}%`,
              }}
            />
          </div>
          {routeMeta.mode === 'hospital' && (
            <p className="text-[11px] text-surface-500 mt-2">
              Leitnetz-ETA ist mit dieser Transportzeit synchronisiert{hospital?.id && canReceivePatients ? '' : ' (keine KH-Voranmeldung aktiv, da aktuell kein KH-Dienst gemeldet ist)'}.
            </p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <div className="card p-5">
          <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Dienstmeldung</p>
          <div className="space-y-2 mb-3">
            {VEHICLES.map((v) => {
              const ok = canUseVehicle(user, v)
              return (
                <button
                  key={v.id}
                  disabled={!ok || onDuty}
                  onClick={() => setVehicleId(v.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border ${vehicleId === v.id ? 'border-primary-400 bg-primary-50' : 'border-surface-200 bg-white'} disabled:opacity-50`}
                >
                  {v.label} {!ok ? '(Kurs fehlt)' : ''}
                </button>
              )
            })}
          </div>
          {!onDuty ? (
            <button onClick={startDuty} disabled={!unlockedVehicle} className="btn-primary w-full"><Play className="w-4 h-4" /> In den Dienst melden</button>
          ) : (
            <button onClick={stopDuty} className="btn-secondary w-full"><PauseCircle className="w-4 h-4" /> Dienst beenden</button>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Status / Funkgerät</p>
          <div className="rounded-xl border border-surface-200 p-3 bg-surface-50 mb-3">
            <div className="text-sm font-semibold text-surface-900 flex items-center gap-2"><Radio className="w-4 h-4 text-primary-600" /> Aktuell: Status {status}</div>
            <p className="text-xs text-surface-500 mt-1">{RD_STATUS.find((s) => s.id === status)?.label} {vehicleOutOfService ? '• Fahrzeug out of service' : ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {RD_STATUS.map((s) => (
              <button
                key={s.id}
                  onClick={() => handleStatusChange(s.id)}
                disabled={!onDuty}
                className={`text-xs px-2 py-1.5 rounded border ${status === s.id ? 'bg-primary-600 text-white border-primary-700' : 'bg-white border-surface-200'} disabled:opacity-50`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Einsatzlog</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {dispatchLog.map((line, idx) => (
              <p key={`${line}-${idx}`} className="text-xs text-surface-700">{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-surface-900 flex items-center gap-2"><MapPinned className="w-4 h-4 text-primary-600" /> Stadtkarte (Phase 2)</p>
            <span className="text-xs text-surface-500">{selectedVehicle.label} {onDuty ? 'im Dienst' : 'nicht im Dienst'}</span>
          </div>
          <button
            onClick={() => setMapModalOpen(true)}
            className="w-full rounded-xl border border-surface-200 bg-surface-50 overflow-hidden relative group"
            style={{ aspectRatio: `${mapSize.w}/${mapSize.h}` }}
          >
            <img src={rdCityMapAsset} alt="Rettungsdienst-Stadtkarte" className="w-full h-full object-fill select-none" draggable={false} />
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {routePoints.length > 0 && (
                  <polyline
                    points={[position, ...routePoints].map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={useSiren ? '#ef4444' : '#0ea5e9'}
                    strokeWidth="0.7"
                    strokeDasharray={useSiren ? '2 1' : '0'}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              {mission && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-xs bg-red-600 text-white shadow-lg animate-pulse"
                  style={{ left: `${mission.x}%`, top: `${mission.y}%` }}
                >Einsatz</div>
              )}
              {onDuty && (
                <div
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-700 ${
                    useSiren ? 'bg-red-600 ring-4 ring-red-200 animate-pulse' : 'bg-primary-600'
                  }`}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                    <span className="text-sm leading-none">{VEHICLE_ICON_BY_ID[vehicleId] || '🚑'}</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
              Karte groß öffnen
            </div>
          </button>
        </div>

        <div className="card p-4">
          <p className="font-semibold text-surface-900 mb-2">Aktueller Einsatz</p>
          {!mission ? (
            <p className="text-sm text-surface-500">Kein aktiver Einsatz. Stelle Status 1 oder 2 für neue Aufträge.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-surface-800">{mission.text}</p>
              <p className="text-xs text-surface-500">Dringlichkeit: {mission.severity.toUpperCase()}</p>
              <p className="text-xs text-surface-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Übernahme per manuellem Status 3</p>
              {!mission.accepted ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                  Zum Übernehmen bitte am Funkgerät manuell auf Status 3 schalten.
                </div>
              ) : (
                <>
                  {!mission.arrived && (
                    <>
                      <button onClick={() => driveToMission(true)} disabled={mission.enRoute} className="btn-primary w-full disabled:opacity-60"><Siren className="w-4 h-4" /> Mit Sonderrechten anfahren</button>
                      <button onClick={() => driveToMission(false)} disabled={mission.enRoute} className="btn-secondary w-full disabled:opacity-60"><Navigation className="w-4 h-4" /> Regulär anfahren</button>
                      {mission.enRoute && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setDrivingMode(true)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 inline-flex items-center justify-center gap-1.5"><Siren className="w-3.5 h-3.5" /> Sonderrechte</button>
                          <button onClick={() => setDrivingMode(false)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Normalfahrt</button>
                        </div>
                      )}
                    </>
                  )}
                  {mission.arrived && status === '4' && (
                    <>
                      <button onClick={openSceneForStatus4} className="btn-primary w-full">
                        <UserCheck className="w-4 h-4" /> Einsatzsituation öffnen
                      </button>
                      {!mission.sceneDisposition && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                          Das Einsatz-Popup muss abgeschlossen werden (Protokoll + Entscheidung), bevor der Einsatz weiterläuft.
                        </div>
                      )}
                      {mission.transportIntent && !mission.enRoute && !mission.atHospital && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                          Transport vorbereitet. Mit Status 7 startet die Fahrt zur Klinik, mit Status 8 wird nach Ankunft abgeschlossen.
                        </div>
                      )}
                      {mission.atHospital && (
                        <div className="rounded-lg bg-accent-50 border border-accent-200 p-2 text-xs text-accent-800">
                          Klinikeinlieferung erfolgt. Bitte Status 8 setzen, um den Einsatz final abzuschließen.
                        </div>
                      )}
                    </>
                  )}
                  {mission.enRoute && mission.arrived && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDrivingMode(true)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 inline-flex items-center justify-center gap-1.5">
                        <Siren className="w-3.5 h-3.5" /> Sonderrechte
                      </button>
                      <button onClick={() => setDrivingMode(false)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" /> Normalfahrt
                      </button>
                    </div>
                  )}
                  {mission.arrived && !mission.sceneAcknowledged && !mission.transportIntent && !mission.enRoute && !mission.atHospital && status !== '4' && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                      Einsatzort erreicht. Bitte manuell Status 4 setzen, um die Einsatzoptionen freizuschalten.
                    </div>
                  )}
                </>
              )}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 mt-0.5" />
                Sonder- und Wegerecht nur bei zeitkritischer Lage. Bei unbegründeter Nutzung kann eine Strafe ausgelöst werden.
              </div>
            </div>
          )}
        </div>

        {mission?.enRoute && mission?.transportIntent && (
          <div className="card p-4 mt-4">
            <p className="font-semibold text-surface-900 mb-2">RD-Protokoll waehrend Transport</p>
            <p className="text-xs text-surface-500 mb-3">
              Das komplette Protokoll bleibt waehrend der Fahrt bearbeitbar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <p className="text-[11px] text-surface-500 mb-1">Transportgrund</p>
                <input
                  value={sceneProtocolDraft.transportReason}
                  onChange={(e) => setProtocolField('transportReason', e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-surface-500 mb-1">Empfehlung</p>
                <input
                  value={sceneProtocolDraft.recommendation}
                  onChange={(e) => setProtocolField('recommendation', e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-surface-500 mb-1">Anamnese</p>
                <textarea
                  value={sceneProtocolDraft.anamnesis}
                  onChange={(e) => setProtocolField('anamnesis', e.target.value)}
                  className="input-field !h-16 !py-2 resize-none text-xs"
                />
              </div>
              <div>
                <p className="text-[11px] text-surface-500 mb-1">Befunde</p>
                <textarea
                  value={sceneProtocolDraft.findings}
                  onChange={(e) => setProtocolField('findings', e.target.value)}
                  className="input-field !h-16 !py-2 resize-none text-xs"
                />
              </div>
              <div>
                <p className="text-[11px] text-surface-500 mb-1">Diagnostik</p>
                <textarea
                  value={sceneProtocolDraft.diagnostics}
                  onChange={(e) => setProtocolField('diagnostics', e.target.value)}
                  className="input-field !h-16 !py-2 resize-none text-xs"
                />
              </div>
              <div>
                <p className="text-[11px] text-surface-500 mb-1">Therapie</p>
                <textarea
                  value={sceneProtocolDraft.therapy}
                  onChange={(e) => setProtocolField('therapy', e.target.value)}
                  className="input-field !h-16 !py-2 resize-none text-xs"
                />
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-surface-500 mb-1">Verlauf/Uebergabe</p>
                <textarea
                  value={sceneProtocolDraft.handover}
                  onChange={(e) => setProtocolField('handover', e.target.value)}
                  className="input-field !h-16 !py-2 resize-none text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {canUseDevTools && (
        <div className="mt-6 card p-4">
          <button onClick={() => setDevOpen(v => !v)} className="text-sm font-medium text-surface-700 hover:text-surface-900">
            {devOpen ? 'Dev-Menü ausblenden' : 'Dev-Menü Rettungsdienst'}
          </button>
          {devOpen && (
          <div className="mt-3 grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <button
              onClick={() => setRoadPreset((p) => (p === 'strict' ? 'balanced' : p === 'balanced' ? 'aggressive' : 'strict'))}
              className="btn-secondary"
            >
              Straßen-Maske: {roadPreset}
            </button>
            <button onClick={() => setShowRoadOverlay((v) => !v)} className="btn-secondary">
              Debug Overlay: {showRoadOverlay ? 'an' : 'aus'}
            </button>
            <button
              onClick={() => {
                const next = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
                const snappedMissionNode = ROAD_NODES[nearestRoadNode({ x: next.x, y: next.y })]
                const scenePatient = randomScenePatientForMission(next)
                const caseProfile = buildCaseProfileForMission(next)
                setMission({
                  ...next,
                  x: snappedMissionNode?.x ?? next.x,
                  y: snappedMissionNode?.y ?? next.y,
                  accepted: false,
                  enRoute: false,
                  arrived: false,
                  completed: false,
                  sceneAcknowledged: false,
                  scenePatient,
                  caseProfile,
                  sceneDisposition: null,
                  sceneProtocol: {
                    transportReason: '',
                    anamnesis: '',
                    findings: '',
                    diagnostics: '',
                    therapy: '',
                    handover: '',
                    recommendation: '',
                  },
                  sceneExamResults: createMissionExamPreset(next),
                  scenePlacedGear: {},
                  sceneCompletedModules: [],
                  sceneMonitorState: {},
                  sceneInfusions: [],
                  sceneInfusionRate: 500,
                  sceneWoundCare: { irrigation: 55, type: 'steriler Verband', compression: 45 },
                  sceneIoAccess: { site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' },
                  sceneTempMeasure: null,
                  sceneManualBp: null,
                  sceneBloodSugar: null,
                  sceneBloodSugarBaseline: null,
                  sceneAirwayDraft: { adjunct: 'none', ambuRate: 12, oxygenAssist: true },
                  sceneIntubationDraft: { device: 'guedel', secured: false },
                  sceneComfortCare: { coolingApplied: false, sickbagGiven: false },
                  sceneAccess: null,
                  sceneSupportStatus: {},
                })
                setDispatchLog((prev) => [`[DEV] Einsatz erzwungen: ${next.text}`, ...prev].slice(0, 12))
              }}
              className="btn-secondary"
            >
              Einsatz erzwingen
            </button>
            <button onClick={() => { setMission(null); setRoutePoints([]); setRouteMeta(null) }} className="btn-secondary">Einsatz löschen</button>
            <button onClick={() => setPosition(stationPos)} className="btn-secondary">Zur Wache teleportieren</button>
            <button onClick={() => addMoney(5000)} className="btn-secondary">+5.000€</button>
            <button
              onClick={() => triggerPolicePenalty({ reason: 'DEV-Trigger: Absichtliche Fehlbehandlung (RD).', source: 'dev', severity: 'critical', forceJail: true })}
              className="btn-secondary"
            >
              DEV: Polizei-Trigger
            </button>
            <button onClick={() => clearLegalState()} className="btn-secondary">DEV: Freikaufen</button>
            <button onClick={() => { setVehicleOutOfService(v => !v); setStatus((s) => (s === '6' ? '2' : '6')) }} className="btn-secondary"><Wrench className="w-4 h-4" /> Status 6 toggeln</button>
            <button onClick={() => handleStatusChange('3')} className="btn-secondary">Status 3</button>
            <button onClick={() => handleStatusChange('4')} className="btn-secondary">Status 4</button>
            <button onClick={() => handleStatusChange('7')} className="btn-secondary">Status 7</button>
            <button onClick={() => handleStatusChange('8')} className="btn-secondary">Status 8</button>
            <button
              onClick={() => {
                const next = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
                const snappedMissionNode = ROAD_NODES[nearestRoadNode({ x: next.x, y: next.y })]
                const scenePatient = randomScenePatientForMission(next)
                const caseProfile = buildCaseProfileForMission(next)
                const preparedMission = {
                  ...next,
                  x: snappedMissionNode?.x ?? next.x,
                  y: snappedMissionNode?.y ?? next.y,
                  accepted: true,
                  enRoute: false,
                  arrived: true,
                  completed: false,
                  sceneAcknowledged: true,
                  scenePatient,
                  caseProfile,
                  sceneDisposition: null,
                  sceneProtocol: {
                    transportReason: '',
                    anamnesis: '',
                    findings: '',
                    diagnostics: '',
                    therapy: '',
                    handover: '',
                    recommendation: '',
                  },
                  sceneExamResults: createMissionExamPreset({ ...next, caseProfile }),
                  scenePlacedGear: {},
                  sceneCompletedModules: [],
                  sceneMonitorState: {},
                  sceneInfusions: [],
                  sceneInfusionRate: 500,
                  sceneWoundCare: { irrigation: 55, type: 'steriler Verband', compression: 45 },
                  sceneIoAccess: { site: 'prox. Tibia rechts', needle: 'EZ-IO blau 15mm' },
                  sceneTempMeasure: null,
                  sceneManualBp: null,
                  sceneBloodSugar: null,
                  sceneBloodSugarBaseline: null,
                  sceneAirwayDraft: { adjunct: 'none', ambuRate: 12, oxygenAssist: true },
                  sceneIntubationDraft: { device: 'guedel', secured: false },
                  sceneComfortCare: { coolingApplied: false, sickbagGiven: false },
                  sceneAccess: null,
                  sceneSupportStatus: {},
                }
                setMission(preparedMission)
                setStatus('4')
                setSceneOpen(true)
                setDispatchLog((prev) => [`[DEV] Direkt in Status-4-Einsatzfenster: ${next.text}`, ...prev].slice(0, 12))
              }}
              className="btn-secondary"
            >
              DEV: Direkt Status-4-Zimmer
            </button>
            <button
              onClick={() => {
                const targetHospital = hospitalTargets[0]
                if (!targetHospital) return
                const r = buildCityRoute(position, { x: targetHospital.x, y: targetHospital.y })
                if (r.length < 2) return
                const travelMs = estimateTravelMsByRoute(r, useSiren, selectedVehicleProfile.travelMultiplier)
                const etaMinutes = Math.max(1, Math.ceil(travelMs / 60000))
                setRoutePoints(r)
                setRouteMeta({ mode: 'hospital', startedAt: Date.now(), etaAt: Date.now() + travelMs, totalMinutes: etaMinutes, totalDistance: totalRouteDistance(r), label: targetHospital.name })
                setMission((m) => (m ? { ...m, transportIntent: true, patientOnBoard: true, accepted: true, enRoute: true } : m))
              }}
              className="btn-secondary"
            >
              Test: Direkt KH-Fahrt
            </button>
          </div>
          )}
        </div>
      )}

      {sceneOpen && mission?.arrived && status === '4' && (
        <div className="fixed inset-0 z-[70] bg-slate-900/82 backdrop-blur-sm">
          <div className="relative w-screen h-screen border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_45%)] pointer-events-none" />
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-black/45 text-white text-xs border border-white/20">
              Einsatzlage vor Ort: {mission.text}
            </div>
            <button
              disabled={!sceneCanClose}
              onClick={() => setSceneOpen(false)}
              className="absolute top-4 right-4 z-10 px-2.5 py-1.5 rounded-xl text-sm disabled:opacity-50 bg-black/45 text-white border border-white/20"
              title={sceneCanClose ? 'Schließen' : 'Erst nach Entscheidung (KH-Transport oder Verbleib)'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid lg:grid-cols-[1.55fr_1.15fr] h-full">
              <div className="relative h-full border-r border-white/10">
                <button
                  ref={sceneCanvasRef}
                  type="button"
                  onClick={handleSceneCanvasClick}
                  className={`relative w-full h-full text-left ${scenePlacingGearId ? 'cursor-crosshair' : 'cursor-default'}`}
                >
                  <img src={sceneBackground} alt="Einsatzszene Wohnzimmer" className="w-full h-full object-contain select-none" draggable={false} />
                  {sceneHasActiveInfusion && (
                    <div className="absolute right-[18%] top-[12%] w-[7.5%] min-w-[44px] max-w-[84px] rounded-xl bg-white/82 border border-cyan-200 shadow-lg p-1.5">
                      <img src={rdInfusionMarkerAsset} alt="Infusion aktiv" className="w-full h-auto object-contain drop-shadow-md" draggable={false} />
                      <p className="text-[9px] text-cyan-800 font-semibold text-center mt-0.5">Infusion</p>
                    </div>
                  )}
                  {Object.entries(scenePlacedGear).map(([gearId, pos]) => {
                    const gear = RD_SCENE_GEAR.find((g) => g.id === gearId)
                    if (!gear) return null
                    return (
                      <div
                        key={`placed_${gearId}`}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${sceneActiveGearId === gearId ? 'ring-2 ring-cyan-300 rounded-xl scale-105' : ''}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${(gear.widthPct * RD_PLACED_GEAR_SCALE).toFixed(1)}%` }}
                      >
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSceneActiveGearId(gearId) }} className="w-full">
                          {gear.image ? (
                            <img
                              src={sceneGearSprites[gear.id] || gear.image}
                              alt={gear.label}
                              className="w-full h-auto drop-shadow-2xl"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full px-2 py-3 rounded-xl bg-red-600 text-white text-[11px] font-semibold shadow-xl border border-red-300/40 text-center">
                              Ampullarium
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  })}
                  {scenePlacingGearId && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-3 px-3 py-1 rounded-lg bg-black/70 text-white text-xs border border-white/20 animate-pulse">
                      Platzierung aktiv: Klick in die Szene, um {RD_SCENE_GEAR.find((g) => g.id === scenePlacingGearId)?.label} abzulegen.
                    </div>
                  )}
                </button>
              </div>

              <div className="h-full overflow-y-auto p-5 space-y-4">
                <div className="card p-4 bg-white/95">
                  <p className="text-xs uppercase tracking-wide text-surface-500 mb-2">{selectedVehicle.label}-Ausrüstung</p>
                  <div className="grid grid-cols-2 gap-2">
                    {RD_SCENE_GEAR.filter((gear) => selectedVehicleProfile.equipmentListIds.includes(gear.id)).map((gear) => {
                      const loaded = sceneLoadedGearIds.includes(gear.id)
                      const placed = !!scenePlacedGear[gear.id]
                      return (
                        <div key={gear.id} className="rounded-xl border border-surface-200 p-3 bg-surface-50">
                          <p className="text-sm text-surface-800 mb-2 font-medium">{gear.label}</p>
                          {!loaded ? (
                            <button
                              onClick={() => {
                                const next = [...sceneLoadedGearIds, gear.id]
                                setSceneLoadedGearIds(next)
                                updateMissionSceneState({ sceneLoadedGearIds: next })
                              }}
                              className="w-full px-2.5 py-2 rounded-lg bg-primary-600 text-white text-sm"
                            >
                              Aus {selectedVehicle.label} holen
                            </button>
                          ) : (
                            <button onClick={() => setScenePlacingGearId(gear.id)} className={`w-full px-2.5 py-2 rounded-lg text-sm ${placed ? 'bg-emerald-600 text-white' : 'bg-surface-200 text-surface-900'}`}>
                              {placed ? 'Umplatzieren' : 'In Szene platzieren'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="card p-0 bg-white/95 overflow-hidden">
                  <div className="px-3 py-2 border-b border-surface-200">
                    <p className="text-xs uppercase tracking-wide text-surface-500">Patientenchat (RD)</p>
                  </div>
                  <div className="h-[360px]">
                    <PatientChat
                      patient={sceneChatPatient}
                      mode="rd"
                      injectedPatientMessage={scenePainStimulusMessage}
                      onInjectedMessageConsumed={(messageId) => {
                        if (!messageId) return
                        setScenePainStimulusMessage((prev) => (prev?.id === messageId ? null : prev))
                      }}
                      initialSnapshot={sceneChatSnapshot}
                      onSnapshotChange={(snapshot) => {
                        setSceneChatSnapshot(snapshot)
                        updateMissionSceneState({ sceneChatSnapshot: snapshot })
                      }}
                    />
                  </div>
                </div>

                <div className="card p-4 bg-white/95">
                  <p className="text-xs uppercase tracking-wide text-surface-500 mb-2">Nachforderung / Unterstützung</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSupportUnits.map((unit) => {
                      const statusEntry = sceneSupportStatus?.[unit.id]
                      const arrived = !!statusEntry?.arrived
                      const requested = !!statusEntry?.requested
                      return (
                        <button
                          key={unit.id}
                          onClick={() => requestSceneSupport(unit.id)}
                          disabled={arrived || requested}
                          className={`px-3 py-2 rounded-lg text-xs border inline-flex items-center justify-between gap-2 ${
                            arrived
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : requested
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-surface-50 text-surface-700 border-surface-200 hover:border-primary-300'
                          } disabled:opacity-80`}
                        >
                          <span>{unit.label}</span>
                          <span className="text-[10px]">
                            {arrived ? 'vor Ort' : requested ? 'unterwegs' : `${unit.etaSec}s`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-surface-500 mt-2">Nachgeforderte Mittel beeinflussen Lageführung und Dokumentation im Einsatz.</p>
                </div>

                <div className="card p-4 bg-white/95">
                  <button
                    type="button"
                    onClick={() => setSceneProtocolCollapsed((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-surface-500">RD-Protokoll (Formular)</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-surface-600">
                      {sceneProtocolCollapsed ? 'Ausklappen' : 'Einklappen'}
                      {sceneProtocolCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {!sceneProtocolCollapsed && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Transportgrund</p>
                          <input value={sceneProtocolDraft.transportReason} onChange={(e) => setProtocolField('transportReason', e.target.value)} className="input-field !py-2 text-xs" />
                        </div>
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Empfehlung</p>
                          <input value={sceneProtocolDraft.recommendation} onChange={(e) => setProtocolField('recommendation', e.target.value)} className="input-field !py-2 text-xs" />
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Anamnese</p>
                          <textarea value={sceneProtocolDraft.anamnesis} onChange={(e) => setProtocolField('anamnesis', e.target.value)} className="input-field !h-16 !py-2 resize-none text-xs" />
                        </div>
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Befunde</p>
                          <textarea value={sceneProtocolDraft.findings} onChange={(e) => setProtocolField('findings', e.target.value)} className="input-field !h-16 !py-2 resize-none text-xs" />
                        </div>
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Diagnostik</p>
                          <textarea value={sceneProtocolDraft.diagnostics} onChange={(e) => setProtocolField('diagnostics', e.target.value)} className="input-field !h-16 !py-2 resize-none text-xs" />
                        </div>
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Therapie</p>
                          <textarea value={sceneProtocolDraft.therapy} onChange={(e) => setProtocolField('therapy', e.target.value)} className="input-field !h-16 !py-2 resize-none text-xs" />
                        </div>
                        <div>
                          <p className="text-[11px] text-surface-500 mb-1">Übergabe/Verlauf</p>
                          <textarea value={sceneProtocolDraft.handover} onChange={(e) => setProtocolField('handover', e.target.value)} className="input-field !h-16 !py-2 resize-none text-xs" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="card p-4 bg-white/95">
                  <p className="text-xs uppercase tracking-wide text-surface-500 mb-2">Disposition (Pflicht)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => resolveSceneDisposition('hospital')} disabled={vehicleId === 'nef'} className="px-3 py-2.5 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Transport ins KH
                    </button>
                    <button onClick={() => resolveSceneDisposition('left')} className="px-3 py-2.5 rounded-lg bg-surface-200 text-surface-900 text-sm inline-flex items-center justify-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Patient bleibt vor Ort
                    </button>
                    {!!sceneSupportStatus?.hearse?.arrived && (
                      <button onClick={() => resolveSceneDisposition('undertaker')} className="col-span-2 px-3 py-2.5 rounded-lg bg-slate-700 text-white text-sm inline-flex items-center justify-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> Übergabe an Leichenwagen
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-500 mt-2">Das Fenster bleibt geöffnet, bis eine Entscheidung getroffen wurde.</p>
                  {vehicleId === 'nef' && <p className="text-[11px] text-amber-700 mt-1">NEF kann keinen Eigentransport durchführen.</p>}
                </div>
              </div>
            </div>

            {sceneActiveGearId && (
              <div className={`absolute bottom-4 left-4 rounded-2xl border border-white/20 bg-white/95 text-surface-900 z-20 shadow-2xl animate-[fadeIn_.18s_ease-out] ${
                sceneActiveGearId === 'backpack'
                  ? 'w-[76vw] max-w-[1240px] h-[56vh] max-h-[56vh] p-4 overflow-y-scroll overflow-x-hidden'
                  : 'w-[560px] max-w-[calc(100vw-2rem)] p-3'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{RD_SCENE_GEAR.find((g) => g.id === sceneActiveGearId)?.label}</p>
                  <button onClick={() => setSceneActiveGearId(null)} className="text-surface-400 hover:text-surface-700"><X className="w-4 h-4" /></button>
                </div>
                {sceneActiveGearId === 'monitor' && (
                  <MonitorUI
                    equipment={{ id: `rd_scene_monitor_${mission?.id || 'x'}` }}
                    patient={sceneMonitorPatient}
                    onAction={handleSceneMonitorAction}
                    externalAudioManaged
                    savedState={sceneMonitorState}
                    onSaveState={(state) => {
                      setSceneMonitorState(state || {})
                      updateMissionSceneState({ sceneMonitorState: state || {} })
                    }}
                  />
                )}
                {sceneActiveGearId === 'oxygen' && (
                  <div className="space-y-2">
                    <p className="text-xs text-surface-600">RD reduziert: O2-Flasche mit Nasenbrille oder Maske.</p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setSceneOxygenMode('none')} className={`px-2 py-1 rounded ${sceneOxygenMode === 'none' ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>Aus</button>
                      <button onClick={() => setSceneOxygenMode('nasal')} className={`px-2 py-1 rounded ${sceneOxygenMode === 'nasal' ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>Brille</button>
                      <button onClick={() => setSceneOxygenMode('mask')} className={`px-2 py-1 rounded ${sceneOxygenMode === 'mask' ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>Maske</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min={1} max={15} value={sceneOxygenFlow} onChange={(e) => setSceneOxygenFlow(Number(e.target.value))} className="w-full" />
                      <span className="text-xs w-16 text-right">{sceneOxygenFlow} l/min</span>
                    </div>
                  </div>
                )}
                {sceneActiveGearId === 'backpack' && (
                  <div className="space-y-2">
                    <p className="text-xs text-surface-600">Modultaschen wie im realen Rettungsrucksack. Klicke auf eine Tasche in der Grafik und führe Maßnahmen aus.</p>
                    {sceneActionNotice && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${
                        sceneActionNotice.kind === 'ok'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sceneActionNotice.text}
                      </div>
                    )}
                    <div className="grid lg:grid-cols-[1.25fr_1fr] gap-2 items-start">
                      <div className="rounded-xl border border-surface-200 bg-slate-50 p-2">
                        <div className="relative w-full aspect-[1024/682] overflow-hidden">
                          <img src={rdBackpackInsideAsset} alt="Rettungsrucksack geöffnet" className="absolute inset-0 w-full h-full object-contain select-none" draggable={false} />
                          {availableBackpackModules.map((module) => {
                            const active = sceneBackpackModuleId === module.id
                            const done = sceneCompletedModules.includes(module.id)
                            return (
                              <button
                                key={module.id}
                                onClick={() => setSceneBackpackModuleId(module.id)}
                                style={{ left: `${module.x}%`, top: `${module.y}%` }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow transition-all duration-200 ${
                                  active
                                    ? `${module.tone} ring-2 ring-primary-500 scale-105`
                                    : 'bg-white/95 border-white text-surface-700 hover:bg-surface-100 hover:scale-105'
                                }`}
                                title={module.label}
                              >
                                {done ? '✓ ' : ''}{module.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="rounded-xl border border-surface-200 bg-white p-2.5 space-y-2 max-h-[44vh] overflow-y-auto">
                        <div className={`rounded-lg border px-2.5 py-2 text-white bg-gradient-to-r ${RD_BACKPACK_MODULE_META[sceneBackpackModuleId]?.accent || 'from-primary-500 to-primary-700'}`}>
                          <p className="text-xs font-semibold">{RD_BACKPACK_MODULE_META[sceneBackpackModuleId]?.title || sceneBackpackModule.label}</p>
                          <p className="text-[11px] text-white/85">{RD_BACKPACK_MODULE_META[sceneBackpackModuleId]?.subtitle || sceneBackpackModule.label}</p>
                        </div>

                        {sceneBackpackModuleId === 'diagnostics' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="rounded bg-surface-100 px-2 py-1.5">
                                <p className="text-[10px] text-surface-500 mb-1">RR Seite</p>
                                <div className="flex gap-1">
                                  <button onClick={() => setSceneManualBpSide('left')} className={`px-2 py-1 rounded text-[10px] ${sceneManualBpSide === 'left' ? 'bg-primary-600 text-white' : 'bg-white text-surface-700'}`}>L</button>
                                  <button onClick={() => setSceneManualBpSide('right')} className={`px-2 py-1 rounded text-[10px] ${sceneManualBpSide === 'right' ? 'bg-primary-600 text-white' : 'bg-white text-surface-700'}`}>R</button>
                                </div>
                              </div>
                              <button onClick={applyManualBloodPressure} disabled={sceneManualBpMeasuring} className="px-2 py-1.5 rounded bg-surface-100 text-[11px] text-left disabled:opacity-60">{sceneManualBpMeasuring ? 'RR wird gemessen ...' : 'Manuell RR messen'}</button>
                              <button onClick={applyBloodSugarCheck} disabled={sceneBloodSugarMeasuring} className="px-2 py-1.5 rounded bg-surface-100 text-[11px] text-left disabled:opacity-60">{sceneBloodSugarMeasuring ? 'BZ wird gemessen ...' : 'BZ messen'}</button>
                              <button onClick={applyTemperatureCheck} disabled={sceneTempMeasuring} className="px-2 py-1.5 rounded bg-surface-100 text-[11px] text-left disabled:opacity-60">{sceneTempMeasuring ? 'Temp wird gemessen ...' : 'Thermometer'}</button>
                              <button onClick={() => { setSceneExamFocus('auscultation'); setSceneExamModalOpen(true) }} className="px-2 py-1.5 rounded bg-cyan-100 text-cyan-800 text-[11px] text-left">Stethoskop (Auskultation)</button>
                              <button onClick={() => { setSceneExamFocus('palpation'); setSceneExamModalOpen(true) }} className="px-2 py-1.5 rounded bg-emerald-100 text-emerald-800 text-[11px] text-left">Palpation (Abdomen/Flanken)</button>
                              <button onClick={() => { setSceneExamFocus('bone_stability'); setSceneExamModalOpen(true) }} className="px-2 py-1.5 rounded bg-rose-100 text-rose-800 text-[11px] text-left">Fraktur-Check (Knochenstabilität)</button>
                              <button onClick={triggerScenePainStimulus} className="px-2 py-1.5 rounded bg-rose-100 text-rose-800 text-[11px] text-left col-span-2">Schmerzreiz</button>
                              <button onClick={() => { setSceneExamFocus('pupils'); setSceneExamModalOpen(true) }} className="px-2 py-1.5 rounded bg-indigo-100 text-indigo-800 text-[11px] text-left col-span-2">Pupillenleuchte (Pupillenkontrolle)</button>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Diagnostik-Display</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                                  <p className="text-[10px] text-slate-400">RR manuell</p>
                                  <p className="font-mono text-lg text-cyan-300">{sceneManualBp?.sys ? `${sceneManualBp.sys}/${sceneManualBp?.dia}` : '--/--'}</p>
                                  <p className="text-[10px] text-slate-500">mmHg {sceneManualBp?.side ? `(${sceneManualBp.side === 'right' ? 'R' : 'L'})` : ''}</p>
                                </div>
                                <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                                  <p className="text-[10px] text-slate-400">BZ</p>
                                  <p className="font-mono text-lg text-amber-300">{sceneBloodSugar == null ? '--' : sceneBloodSugar}</p>
                                  <p className="text-[10px] text-slate-500">mg/dl</p>
                                </div>
                                <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                                  <p className="text-[10px] text-slate-400">Temperatur</p>
                                  <p className="font-mono text-lg text-rose-300">{sceneTempMeasure == null ? '--' : sceneTempMeasure.toFixed(1)}</p>
                                  <p className="text-[10px] text-slate-500">C</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {sceneBackpackModuleId === 'dressings' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {DRESSING_LOCATIONS.map((loc) => (
                                <button key={loc.id} onClick={() => setSceneWoundSite(loc.id)} className={`px-2 py-1 rounded text-[11px] ${sceneWoundSite === loc.id ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800'}`}>
                                  {loc.label}
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {['Wundverband', 'Brandwundversorgung', 'Chest Seal', 'SAM Splint'].map((type) => (
                                <button key={type} onClick={() => setSceneWoundCare((prev) => ({ ...prev, type }))} className={`px-2 py-1 rounded text-[11px] ${sceneWoundCare.type === type ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>{type}</button>
                              ))}
                            </div>
                            <div className="text-[11px]">Spülung {sceneWoundCare.irrigation}% / Kompression {sceneWoundCare.compression}%</div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="range" min={10} max={100} value={sceneWoundCare.irrigation} onChange={(e) => setSceneWoundCare((prev) => ({ ...prev, irrigation: Number(e.target.value) }))} />
                              <input type="range" min={10} max={100} value={sceneWoundCare.compression} onChange={(e) => setSceneWoundCare((prev) => ({ ...prev, compression: Number(e.target.value) }))} />
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                              <p className="text-[11px] text-amber-800 mb-1">Mini-Game: Reihenfolge einhalten</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {['Reinigen', 'Abdecken', 'Fixieren'].map((stepLabel, idx) => (
                                  <button
                                    key={stepLabel}
                                    onClick={() => playDressingStep(idx)}
                                    className={`px-2 py-1 rounded text-[11px] ${
                                      sceneDressingGame.score > idx
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {idx + 1}. {stepLabel}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-amber-700 mt-1">Fortschritt: {sceneDressingGame.score}/3</p>
                            </div>
                            <button onClick={applyWoundCare} className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs">Verbandsmaßnahme anwenden</button>
                          </div>
                        )}

                        {sceneBackpackModuleId === 'access' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button onClick={openSceneAccessModal} className="px-2 py-1.5 rounded bg-surface-100 text-[11px] text-left">i.v. Zugang</button>
                              <button onClick={applyPneumothoraxSet} className="px-2 py-1.5 rounded bg-orange-100 text-orange-800 text-[11px] text-left">Pneumothorax-Set</button>
                            </div>
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <input type="range" min={20} max={6000} step={20} value={sceneInfusionRate} onChange={(e) => {
                                  const value = Number(e.target.value || 500)
                                  setSceneInfusionRate(value)
                                  updateMissionSceneState({ sceneInfusionRate: value })
                                }} className="flex-1" />
                                <span className="text-[11px] w-16 text-right">{sceneInfusionRate} ml/h</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                {availableInfusions.map((item) => (
                                  <button key={item.id} onClick={() => startSceneInfusion(item)} disabled={!hasSceneAccess} className="px-2 py-1 rounded bg-white text-[11px] text-left border border-blue-200 disabled:opacity-50">
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                              {!hasSceneAccess && <p className="text-[11px] text-amber-700 mt-1">Infusion gesperrt: erst i.v. oder IO Zugang legen.</p>}
                            </div>
                            {sceneInfusions.length > 0 && (
                              <div className="max-h-24 overflow-y-auto space-y-1">
                                {sceneInfusions.map((inf) => (
                                  <div key={inf.id} className="rounded border border-surface-200 px-2 py-1 text-[11px] flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate">{inf.label} {Math.round(inf.infused)}/{inf.volume} ml</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <input
                                          type="range"
                                          min={20}
                                          max={inf.id?.startsWith('transfusion_ek') || inf.type === 'transfusion_ek' ? 1200 : 6000}
                                          step={20}
                                          value={Number(inf.rate || 0)}
                                          onChange={(e) => updateSceneInfusionRate(inf.id, e.target.value)}
                                          className="flex-1"
                                        />
                                        <span className="w-16 text-right">{Math.round(Number(inf.rate || 0))} ml/h</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {inf.active && <button onClick={() => toggleSceneInfusionPause(inf.id)} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{inf.paused ? '▶' : '⏸'}</button>}
                                      <button onClick={() => removeSceneInfusion(inf.id)} className="px-1.5 py-0.5 rounded bg-surface-100">x</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {sceneBackpackModuleId === 'ampullarium' && (
                          renderSceneAmpullariumPanel()
                        )}

                        {sceneBackpackModuleId === 'io_access' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {['prox. Tibia rechts', 'prox. Tibia links', 'prox. Humerus rechts', 'prox. Humerus links'].map((site) => (
                                <button key={site} onClick={() => setSceneIoAccess((prev) => ({ ...prev, site }))} className={`px-2 py-1 rounded text-[11px] ${sceneIoAccess.site === site ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>{site}</button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {['EZ-IO rosa 15mm', 'EZ-IO blau 15mm', 'EZ-IO gelb 45mm'].map((needle) => (
                                <button key={needle} onClick={() => setSceneIoAccess((prev) => ({ ...prev, needle }))} className={`px-2 py-1 rounded text-[11px] ${sceneIoAccess.needle === needle ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>{needle}</button>
                              ))}
                            </div>
                            <button onClick={applyIoAccess} className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs">IO-Zugang anlegen</button>
                          </div>
                        )}

                        {sceneBackpackModuleId === 'airway' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'none', label: 'keine Hilfe' },
                                { id: 'guedel', label: 'Guedel' },
                                { id: 'wendl', label: 'Wendl' },
                                { id: 'larynx', label: 'Larynxhilfe' },
                              ].map((item) => (
                                <button key={item.id} onClick={() => applyAirwayAdjunct(item.id)} className={`px-2 py-1 rounded text-[11px] ${sceneAirwayDraft.adjunct === item.id ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>{item.label}</button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="range" min={8} max={20} step={1} value={sceneAirwayDraft.ambuRate} onChange={(e) => {
                                const next = { ...sceneAirwayDraft, ambuRate: Number(e.target.value || 12) }
                                setSceneAirwayDraft(next)
                                updateMissionSceneState({ sceneAirwayDraft: next })
                              }} className="flex-1" />
                              <span className="text-[11px] w-16 text-right">{sceneAirwayDraft.ambuRate}/min</span>
                            </div>
                            <button onClick={applyAmbuVentilation} className="px-2.5 py-1.5 rounded bg-cyan-600 text-white text-xs">Ambubeutel-Beatmung starten</button>
                            {selectedVehicleProfile.hasLucas && (
                              <button onClick={applyLucasSystem} className={`px-2.5 py-1.5 rounded text-xs ${sceneLucasActive ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                                {sceneLucasActive ? 'LUCAS läuft' : 'LUCAS-System starten'}
                              </button>
                            )}
                          </div>
                        )}

                        {sceneBackpackModuleId === 'intubation' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'guedel', label: 'Guedel' },
                                { id: 'wendl', label: 'Wendl' },
                                { id: 'larynx', label: 'Larynx-Tubus' },
                                { id: 'ett', label: 'Endotracheal-Tubus' },
                              ].map((item) => (
                                <button key={item.id} onClick={() => setSceneIntubationDraft((prev) => ({ ...prev, device: item.id }))} className={`px-2 py-1 rounded text-[11px] ${sceneIntubationDraft.device === item.id ? 'bg-primary-600 text-white' : 'bg-surface-100'}`}>{item.label}</button>
                              ))}
                            </div>
                            <button onClick={applyIntubation} className="px-2.5 py-1.5 rounded bg-indigo-600 text-white text-xs">Atemweg sichern</button>
                            <p className="text-[11px] text-surface-600">Status: {sceneIntubationDraft.secured ? 'gesichert' : 'noch nicht gesichert'}</p>
                          </div>
                        )}

                        {sceneBackpackModuleId === 'comfort' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button onClick={() => applyComfortMeasure('cooling')} className={`px-2 py-1.5 rounded text-[11px] ${sceneComfortCare.coolingApplied ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-100'}`}>Kühlkissen</button>
                              <button onClick={() => applyComfortMeasure('sickbag')} className={`px-2 py-1.5 rounded text-[11px] ${sceneComfortCare.sickbagGiven ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-100'}`}>Sicksack</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {sceneActiveGearId === 'ventilator' && (
                  <div className="space-y-2">
                    <VentilatorUI
                      equipment={{ id: 'rd_ventilator', name: 'RD-Beatmungsgerät' }}
                      patient={{ id: `rd_scene_${mission?.id || 'x'}` }}
                      savedState={sceneVentilatorState}
                      onSaveState={(next) => {
                        setSceneVentilatorState(next || {})
                        updateMissionSceneState({ sceneVentilatorState: next || {} })
                      }}
                      onAction={(actionId, label) => {
                        appendSceneProtocolLine('therapy', label || actionId || 'Beatmungsmaßnahme')
                        if (actionId === 'ventilator_start') {
                          setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 2.8, 70, 100), rr: Math.max(8, v.rr - 2) }))
                        } else if (actionId === 'oxygen_apply') {
                          setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 1.6, 70, 100), rr: Math.max(8, v.rr - 1) }))
                        } else if (actionId === 'vent_stop') {
                          setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 - 0.8, 70, 100) }))
                        }
                      }}
                    />
                  </div>
                )}
                {sceneActiveGearId === 'ampullarium' && (
                  renderSceneAmpullariumPanel()
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {sceneExamModalOpen && mission?.arrived && (
        <PhysicalExamModal
          patient={{
            id: `rd_exam_${mission?.id || 'x'}`,
            name: `${scenePatient?.sex === 'female' ? 'Patientin' : 'Patient'} Einsatz`,
            gender: scenePatient?.sex === 'female' ? 'weiblich' : 'maennlich',
            chiefComplaint: mission?.caseProfile?.chiefComplaint || mission?.text || 'Akuter Notfall',
            diagnoses: { primary: mission?.caseProfile?.diagnosis || { code: 'R55', name: 'Synkope' } },
            trueDiagnoses: {},
          }}
          onClose={() => setSceneExamModalOpen(false)}
          title={
            sceneExamFocus === 'all'
              ? 'Körperliche Untersuchung (RD)'
              : sceneExamFocus === 'auscultation'
                ? 'Auskultation (RD)'
                : sceneExamFocus === 'pupils'
                  ? 'Pupillenkontrolle (RD)'
                  : sceneExamFocus === 'palpation'
                    ? 'Palpation (RD)'
                    : sceneExamFocus === 'bone_stability'
                      ? 'Fraktur-Check (RD)'
                      : 'Körperliche Untersuchung (RD)'
          }
          initialExam={sceneExamFocus === 'all' ? 'auscultation' : sceneExamFocus}
          allowedExamIds={sceneExamFocus === 'all' ? null : [sceneExamFocus]}
          onSave={(resultOrResults) => {
            const list = Array.isArray(resultOrResults) ? resultOrResults : [resultOrResults]
            const findingsText = list.map((r) => `- ${r.title}: ${r.summary}`).join('\n')
            const nextDraft = {
              ...sceneProtocolDraft,
              findings: sceneProtocolDraft.findings
                ? `${sceneProtocolDraft.findings}\n${findingsText}`
                : findingsText,
            }
            setSceneProtocolDraft(nextDraft)
            updateMissionSceneState({
              sceneProtocol: nextDraft,
              sceneExamResults: {
                ...(mission?.sceneExamResults || {}),
                externalExamResults: list,
              },
            })
          }}
        />
      )}

      {sceneMedPrep.open && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={cancelSceneMedicationPrep} />
          <div className="relative w-[92vw] max-w-[920px] rounded-3xl border border-surface-200 bg-white shadow-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-surface-900">Ampullen-Vorbereitung (RD)</p>
                <p className="text-xs text-surface-500">
                  {sceneMedicationDraft?.label || 'Medikament'} • Sollmenge: {Number(sceneMedPrep.targetMl || 0).toFixed(2)} ml
                </p>
              </div>
              <button onClick={cancelSceneMedicationPrep} className="btn-secondary text-xs">Schließen</button>
            </div>

            <div className="mt-4 grid lg:grid-cols-[1fr_0.95fr] gap-4">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-xs uppercase tracking-wide text-indigo-700 font-semibold mb-2">1) Ampulle brechen</p>
                <div
                  className={`relative rounded-xl border px-3 pt-3 pb-14 bg-white select-none ${
                    sceneMedPrep.stage !== 'break' ? 'border-emerald-300' : 'border-indigo-200'
                  }`}
                  onMouseDown={handleSceneAmpouleBreakStart}
                  onMouseMove={handleSceneAmpouleBreakMove}
                  onMouseUp={handleSceneAmpouleBreakEnd}
                  onMouseLeave={handleSceneAmpouleBreakEnd}
                >
                  <div
                    className={`relative ${sceneMedPrep.stage === 'snap' ? 'animate-[pulse_0.32s_ease-in-out]' : ''}`}
                    style={{ height: `${RD_AMPOULE_MINIGAME_TUNING.imageHeightPx}px` }}
                  >
                    <img
                      src={medAmpouleAsset}
                      alt="Ampulle intakt"
                      className="absolute inset-0 h-full mx-auto left-0 right-0 object-contain pointer-events-none transition-all duration-300"
                      style={{
                        opacity: sceneMedPrep.stage === 'break' ? 1 : 0.1,
                        transform: `scale(${sceneMedPrep.stage === 'break' ? 1 : 0.97})`,
                      }}
                      draggable={false}
                    />
                    <img
                      src={medAmpouleBrokenAsset}
                      alt="Ampulle geöffnet"
                      className="absolute inset-0 h-full mx-auto left-0 right-0 object-contain pointer-events-none transition-all duration-300"
                      style={{
                        opacity: sceneMedPrep.stage === 'break' ? 0 : 1,
                        transform: `scale(${sceneMedPrep.stage === 'snap' ? RD_AMPOULE_MINIGAME_TUNING.snapScale : RD_AMPOULE_MINIGAME_TUNING.brokenScale})`,
                      }}
                      draggable={false}
                    />
                  </div>
                  {sceneMedPrep.stage === 'break' && (
                    <div className="absolute inset-x-4 bottom-2 rounded-lg border border-indigo-200 bg-white/95 shadow-sm px-2.5 py-1.5">
                      <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${Math.round(Number(sceneMedPrep.breakProgress || 0) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-indigo-800 font-medium mt-1">Wischstärke: {Math.round(Number(sceneMedPrep.breakProgress || 0) * 100)}%</p>
                      <p className="text-[10px] text-indigo-700 mt-0.5">Tipp: horizontal am Ampullenhals swipen und zügig loslassen.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-xs uppercase tracking-wide text-cyan-700 font-semibold mb-2">2) Mit Spritze aufziehen</p>
                <div className="rounded-xl border border-cyan-200 bg-white p-3">
                  <img src={medSyringeAsset} alt="Spritze" className="h-20 mx-auto object-contain select-none" draggable={false} />
                  <div className="mt-2 h-2 rounded-full bg-cyan-100 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${Math.round((Number(sceneMedPrep.drawnMl || 0) / Math.max(0.01, Number(sceneMedPrep.targetMl || 1))) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-cyan-800 mt-1">
                    Aufgezogen: {Number(sceneMedPrep.drawnMl || 0).toFixed(2)} / {Number(sceneMedPrep.targetMl || 0).toFixed(2)} ml
                  </p>
                  <button
                    onClick={drawMedicationToSceneSyringe}
                    disabled={sceneMedPrep.stage === 'break' || sceneMedPrep.stage === 'snap' || sceneMedPrep.stage === 'ready'}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs disabled:opacity-45"
                  >
                    Aufziehen
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
              <p className="text-xs text-surface-700">{sceneMedPrep.hint}</p>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button onClick={cancelSceneMedicationPrep} className="btn-secondary text-xs">Abbrechen</button>
              <button
                onClick={applyPreparedSceneMedication}
                disabled={sceneMedPrep.stage !== 'ready'}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-45 inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Medikament applizieren
              </button>
            </div>
          </div>
        </div>
      )}

      {sceneAccessModalOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeSceneAccessModal} />
          <div
            className="relative w-[96vw] max-w-[1600px] max-h-[95vh] overflow-y-auto rounded-3xl border border-surface-200 bg-white shadow-2xl p-4 sm:p-6"
            onMouseMove={(event) => {
              if (!sceneAccessAttachedToolId) return
              const rect = event.currentTarget.getBoundingClientRect()
              setSceneAccessCursorPos({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-surface-900">Venösen Zugang legen (RD)</p>
                <p className="text-xs text-surface-500">
                  {sceneAccessDraft.stage === 'setup' ? '1/2 Vorbereitung' : '2/2 Minigame'}
                </p>
              </div>
              <button onClick={closeSceneAccessModal} className="btn-secondary text-xs">Schließen</button>
            </div>
            {sceneAccessDraft.stage === 'setup' ? (
              <div className="mt-4 grid lg:grid-cols-[1.08fr_0.92fr] gap-5">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide mb-2">Zugangstyp / Viggo</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ACCESS_TYPES.map(type => {
                        const active = sceneAccessDraft.typeId === type.id
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
                            onClick={() => setSceneAccessDraft(prev => ({ ...prev, typeId: type.id, gauge: type.gauge }))}
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
                      style={{ transform: shouldMirrorAccessArm ? 'scaleX(-1)' : 'none' }}
                      draggable={false}
                    />
                    {ACCESS_SITES.map(site => {
                      const selected = sceneAccessDraft.siteId === site.id
                      const markerX = shouldMirrorAccessArm ? (100 - site.x) : site.x
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
                      style={{ left: `${displayAccessPunctureTarget.x}%`, top: `${displayAccessPunctureTarget.y}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ACCESS_SITES.map(site => {
                      const selected = sceneAccessDraft.siteId === site.id
                      return (
                        <button
                          key={`selector-${site.id}`}
                          onClick={() => setSceneAccessDraft(prev => ({ ...prev, siteId: site.id }))}
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
                    <button onClick={startSceneAccessProcedure} className="btn-primary text-sm">
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
                    <button onClick={() => setSceneAccessDraft(prev => ({ ...prev, stage: 'setup' }))} className="text-xs px-2 py-1 rounded bg-white border border-surface-200 hover:bg-surface-50">
                      Auswahl ändern
                    </button>
                  </div>
                  <div
                    ref={sceneAccessCanvasRef}
                    onClick={placeSceneAccessToolOnArm}
                    className="relative rounded-2xl border border-violet-200 bg-white overflow-hidden min-h-[470px] cursor-crosshair"
                  >
                    <img
                      src={sceneAccessArmImage}
                      alt="Arm"
                      className="absolute inset-0 w-full h-full object-contain p-2"
                      style={{ transform: shouldMirrorAccessArm ? 'scaleX(-1)' : 'none' }}
                      draggable={false}
                    />
                    {sceneAccessProcedure.viggoPlaced && (
                      <img
                        src={selectedViggoAsset}
                        alt="gelegte Viggo"
                        className="absolute object-contain pointer-events-none drop-shadow-md"
                        style={{
                          left: `${displayAccessPunctureTarget.x}%`,
                          top: `${displayAccessPunctureTarget.y}%`,
                          width: `${effectiveViggoWidth}px`,
                          height: `${effectiveViggoHeight}px`,
                          transform: `translate(${placedViggoTranslateX}%, ${placedViggoTranslateY}%) rotate(${placedViggoRotationDeg}deg) scaleX(${shouldMirrorPlacedViggo ? -1 : 1})`,
                        }}
                      />
                    )}
                    {sceneAccessProcedure.plasterDone && (
                      <img
                        src={accessPlasterAsset}
                        alt="Pflaster"
                        className="absolute object-contain pointer-events-none drop-shadow-sm"
                        style={{
                          left: `${displayAccessPunctureTarget.x}%`,
                          top: `${displayAccessPunctureTarget.y}%`,
                          width: `${ACCESS_OVERLAY_TUNING.plasterWidth}px`,
                          height: `${ACCESS_OVERLAY_TUNING.plasterHeight}px`,
                          transform: `translate(${ACCESS_OVERLAY_TUNING.plasterTranslateXPercent}%, ${ACCESS_OVERLAY_TUNING.plasterTranslateYPercent}%) rotate(${placedPlasterRotationDeg}deg)`,
                        }}
                      />
                    )}
                    <div
                      className="absolute w-6 h-6 rounded-full border-2 border-rose-500 bg-rose-100/60 pointer-events-none"
                      style={{
                        left: `${displayAccessPunctureTarget.x}%`,
                        top: `${displayAccessPunctureTarget.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                    <div
                      className="absolute w-10 h-10 rounded-full border border-indigo-400 bg-indigo-100/45 pointer-events-none"
                      style={{
                        left: `${displayAccessUpperArmTarget.x}%`,
                        top: `${displayAccessUpperArmTarget.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-surface-600 flex items-center gap-1.5">
                    <MousePointer2 className="w-3.5 h-3.5 text-violet-600" />
                    {sceneAccessHint || sceneAccessActiveInstruction}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-surface-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-700 mb-2">Tablett</p>
                    <div className="space-y-2">
                      {sceneAccessToolOrder.map((toolId) => {
                        const tool = sceneAccessTools[toolId]
                        const active = sceneAccessAttachedToolId === toolId
                        return (
                          <button
                            key={toolId}
                            onClick={() => attachSceneAccessTool(toolId)}
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
                      onClick={finalizeSceneAccessPlacement}
                      disabled={!sceneAccessProcedure.plasterDone || sceneAccessProcedure.tourniquetOn}
                      className="mt-3 w-full text-sm px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Zugang final bestätigen
                    </button>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">Checkliste</p>
                    <div className="space-y-1.5">
                      {ACCESS_GAME_CHECKLIST.map((step) => (
                        <div key={step.id} className={`flex items-center gap-2 text-xs ${sceneAccessChecklistState[step.id] ? 'text-emerald-700' : 'text-surface-600'}`}>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${sceneAccessChecklistState[step.id] ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-surface-300 text-transparent'}`}>
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
            {sceneAccessAttachedToolId && sceneAccessDraft.stage === 'procedure' && (
              <div
                className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: sceneAccessCursorPos.x, top: sceneAccessCursorPos.y }}
              >
                <img
                  src={sceneAccessTools[sceneAccessAttachedToolId]?.image}
                  alt={sceneAccessTools[sceneAccessAttachedToolId]?.label || sceneAccessAttachedToolId}
                  className={`object-contain drop-shadow-lg ${sceneAccessAttachedToolId === 'viggo' ? 'w-44 h-32' : 'w-24 h-20'}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {scenePtxModalOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setScenePtxModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-surface-900">Pneumothorax-Set (RD)</p>
              <button onClick={() => setScenePtxModalOpen(false)} className="btn-secondary text-xs">Schließen</button>
            </div>
            <p className="text-xs text-surface-500">
              Mini-Game: Maßnahme strukturiert durchführen (Desinfektion, Punktion, Entlastung).
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['2. ICR MCL rechts', '2. ICR MCL links', '4./5. ICR AAL rechts', '4./5. ICR AAL links'].map((site) => (
                <button
                  key={site}
                  onClick={() => setScenePtxDraft((prev) => ({ ...prev, site }))}
                  className={`px-2.5 py-2 rounded-lg text-xs border text-left ${
                    scenePtxDraft.site === site ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-surface-50 border-surface-200 text-surface-700'
                  }`}
                >
                  {site}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 space-y-2">
              <button
                onClick={() => setScenePtxDraft((prev) => ({ ...prev, desinfectionDone: true }))}
                className={`w-full px-3 py-2 rounded-lg text-xs text-left ${scenePtxDraft.desinfectionDone ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-surface-200'}`}
              >
                1) Punktionsstelle desinfizieren {scenePtxDraft.desinfectionDone ? '✓' : ''}
              </button>
              <button
                onClick={() => setScenePtxDraft((prev) => ({ ...prev, punctureDone: true }))}
                disabled={!scenePtxDraft.desinfectionDone}
                className={`w-full px-3 py-2 rounded-lg text-xs text-left disabled:opacity-50 ${scenePtxDraft.punctureDone ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-surface-200'}`}
              >
                2) Entlastungspunktion durchführen {scenePtxDraft.punctureDone ? '✓' : ''}
              </button>
              <button
                onClick={() => setScenePtxDraft((prev) => ({ ...prev, decompressionDone: true }))}
                disabled={!scenePtxDraft.punctureDone}
                className={`w-full px-3 py-2 rounded-lg text-xs text-left disabled:opacity-50 ${scenePtxDraft.decompressionDone ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-surface-200'}`}
              >
                3) Dekompression bestätigen / Verlauf prüfen {scenePtxDraft.decompressionDone ? '✓' : ''}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setScenePtxModalOpen(false)} className="btn-secondary text-sm">Abbrechen</button>
              <button onClick={finalizePneumothoraxSet} className="btn-primary text-sm">Maßnahme abschließen</button>
            </div>
          </div>
        </div>
      )}

      {sceneVentilatorOpen && mission?.arrived && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setSceneVentilatorOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-surface-200 bg-white shadow-2xl p-4">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-surface-200">
              <p className="font-semibold text-surface-900">Beatmungsgerät (RD)</p>
              <button onClick={() => setSceneVentilatorOpen(false)} className="btn-secondary text-xs">Schließen</button>
            </div>
            <VentilatorUI
              equipment={{ id: 'rd_ventilator', name: 'RD-Beatmungsgerät' }}
              patient={{ id: `rd_scene_${mission?.id || 'x'}` }}
              savedState={sceneVentilatorState}
              onSaveState={(next) => {
                setSceneVentilatorState(next || {})
                updateMissionSceneState({ sceneVentilatorState: next || {} })
              }}
              onAction={(actionId, label) => {
                appendSceneProtocolLine('therapy', label || actionId || 'Beatmungsmaßnahme')
                if (actionId === 'ventilator_start') {
                  setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 2.8, 70, 100), rr: Math.max(8, v.rr - 2) }))
                } else if (actionId === 'oxygen_apply') {
                  setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 + 1.6, 70, 100), rr: Math.max(8, v.rr - 1) }))
                } else if (actionId === 'vent_stop') {
                  setSceneVitals((v) => ({ ...v, spo2: clamp(v.spo2 - 0.8, 70, 100) }))
                }
              }}
            />
          </div>
        </div>
      )}

      {mapModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setMapModalOpen(false)} />
          <div className="relative w-[96vw] h-[92vh] rounded-2xl border border-surface-200 bg-surface-900 overflow-hidden">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button onClick={() => setMapZoom((z) => clamp(z - 0.2, 1.0, 4.2))} className="px-2.5 py-1 rounded-lg bg-black/55 text-white text-sm">-</button>
              <span className="px-2 py-1 rounded-lg bg-black/55 text-white text-xs">{Math.round(mapZoom * 100)}%</span>
              <button onClick={() => setMapZoom((z) => clamp(z + 0.2, 1.0, 4.2))} className="px-2.5 py-1 rounded-lg bg-black/55 text-white text-sm">+</button>
              <button onClick={() => setShowRoadOverlay(v => !v)} className={`px-2.5 py-1 rounded-lg text-xs ${showRoadOverlay ? 'bg-red-600 text-white' : 'bg-black/55 text-white'}`}>
                Overlay
              </button>
              <button onClick={() => setMapModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-black/55 text-white text-sm">Schließen</button>
            </div>
            <div
              ref={mapScrollRef}
              className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing"
              onWheel={handleMapWheel}
              onWheelCapture={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={stopMapDrag}
              onMouseLeave={stopMapDrag}
            >
              <div className="min-w-full min-h-full flex items-center justify-center">
                <div className="relative inline-block min-w-max">
                  <img
                    src={rdCityMapAsset}
                    alt="Rettungsdienst-Stadtkarte groß"
                    className="block max-w-none h-auto select-none"
                    draggable={false}
                    style={{ width: `${Math.round(mapSize.w * mapZoom)}px`, height: 'auto' }}
                  />
                  {showRoadOverlay && roadOverlayUrl && (
                    <img
                      src={roadOverlayUrl}
                      alt="Straßenmaske Overlay"
                      className="absolute left-0 top-0 pointer-events-none"
                      style={{ width: `${Math.round(mapSize.w * mapZoom)}px`, height: 'auto' }}
                    />
                  )}
                  <div className="absolute inset-0">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                    {routePoints.length > 0 && (
                      <polyline
                        points={[position, ...routePoints].map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={useSiren ? '#ef4444' : '#0ea5e9'}
                        strokeWidth="0.7"
                        strokeDasharray={useSiren ? '2 1' : '0'}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {stationMarkers.map((mk) => (
                    <div
                      key={`modal_station_${mk.id}`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${mk.id === station?.id ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-white/90 text-surface-700 border-surface-300'}`}
                      style={{ left: `${mk.x}%`, top: `${mk.y}%` }}
                    >
                      🚑 {mk.name}
                    </div>
                  ))}
                  {hospitalTargets.map((h) => (
                    <div
                      key={`modal_hospital_${h.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300"
                      style={{ left: `${h.x}%`, top: `${h.y}%` }}
                    >
                      🏥 {h.name}
                    </div>
                  ))}
                  {mission && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-xs bg-red-600 text-white shadow-lg animate-pulse"
                      style={{ left: `${mission.x}%`, top: `${mission.y}%` }}
                    >Einsatz</div>
                  )}
                  {onDuty && (
                    <div
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-700 ${
                        useSiren ? 'bg-red-600 ring-4 ring-red-200 animate-pulse' : 'bg-primary-600'
                      }`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    >
                      <span className="text-sm leading-none">{VEHICLE_ICON_BY_ID[vehicleId] || '🚑'}</span>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
