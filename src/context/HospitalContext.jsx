import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { generatePatient, generatePatientByDiagnosis, TRIAGE_LEVELS } from '../data/patientGenerator'
import { WORKER_TYPES } from '../data/workerTypes'
import {
  MASS_CASUALTY_EVENTS,
  TREATMENT_ROOM_COST,
  SHOCK_ROOM_COST,
  DEFAULT_ER_FULL_EQUIPMENT,
  SHOCK_ROOM_DEFAULT_EQUIPMENT,
  SHOCK_ROOM_AUTO_MEDICATIONS,
  EQUIPMENT,
} from '../data/equipmentData'
import { SPECIALIZATION_REQUIRED_CASES } from '../data/specialties'
import { estimateCaseRevenue } from '../data/caseEconomics'
import { getCurrentRank, hasRankCapability } from '../data/ranks'
import { applyActionToPatient, applyMedicationToPatient, applyDiagnosticInterventions, ensureClinicalState, ensureVitals, ensureResuscitationState, getTreatmentLabModifiers } from '../data/treatmentEffects'
import { applyClinicalProgressionTick } from '../data/diseaseProgressionRules'
import { evaluateDischargeRequirements } from '../data/dischargeRequirements'
import { evaluateTherapyProgress } from '../data/therapeuticProgress'
import { getOrderModality } from '../data/ordersCatalog'
import {
  ASSISTENZARZT_BASIC_STOCK_LIMIT,
  MEDICATIONS,
  isBasicMedicationForAssistenzarzt,
  medicationRequiresVenousAccess,
} from '../data/medications'
import { isPrimaryDiagnosisMatch } from '../data/conditionMapping'
import { getActiveEffects, getKhCaseMoneyBonusPct, getMedicationDiscountPct, getLabOrderCost, getRoomDiscountPct } from '../data/shopSpecials'
import { getSupabaseClient } from '../lib/supabaseClient'
import { fetchHospitalById, upsertHospitalState, subscribeHospitalRealtime } from '../services/hospitalService'

const HospitalContext = createContext(null)

const DEFAULT_PERMISSIONS = {
  manage_hospital: false,
  manage_rooms: false,
  manage_staff: false,
  manage_members: false,
  manage_permissions: false,
  manage_finances: false,
  treat_patients: true,
}

const OWNER_PERMISSIONS = Object.fromEntries(
  Object.keys(DEFAULT_PERMISSIONS).map(k => [k, true])
)

const SPECIALTY_LOCKED_ACTION_IDS = new Set([
  'defibrillate',
  'intubate',
  'ventilator_start',
  'cardioversion',
  'echo',
  'advanced_assessment',
])

const HOSPITAL_MED_SAFETY_RULES = {
  atropin: { windowMs: 20 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  atropine: { windowMs: 20 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  adrenalin: { windowMs: 15 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  adrenaline: { windowMs: 15 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  noradrenalin: { windowMs: 20 * 60 * 1000, warningCount: 4, criticalCount: 6 },
  noradrenaline: { windowMs: 20 * 60 * 1000, warningCount: 4, criticalCount: 6 },
  insulin: { windowMs: 25 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  glucose: { windowMs: 20 * 60 * 1000, warningCount: 3, criticalCount: 5 },
  nitro: { windowMs: 10 * 60 * 1000, warningCount: 4, criticalCount: 7 },
  midazolam: { windowMs: 20 * 60 * 1000, warningCount: 4, criticalCount: 6 },
  fentanyl: { windowMs: 20 * 60 * 1000, warningCount: 4, criticalCount: 6 },
  morphin: { windowMs: 25 * 60 * 1000, warningCount: 4, criticalCount: 6 },
  morphine: { windowMs: 25 * 60 * 1000, warningCount: 4, criticalCount: 6 },
}

function requiresSpecialtySelection(user) {
  if (!user) return false
  const rankLevel = Number(getCurrentRank(user)?.level || 1)
  const casesCompleted = Number(user?.stats?.casesCompleted || 0)
  return rankLevel >= 2 && casesCompleted >= SPECIALIZATION_REQUIRED_CASES && !user?.specialty
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback
}

function normalizeEquipmentList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([id]) => id)
  }
  return []
}

function normalizeStationEquipment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.entries(value).reduce((acc, [stationId, equipment]) => {
    acc[stationId] = normalizeEquipmentList(equipment)
    return acc
  }, {})
}

function normalizeDutyRoster(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.entries(value).reduce((acc, [userId, entry]) => {
    if (!userId || !entry || typeof entry !== 'object') return acc
    acc[userId] = {
      stationId: String(entry.stationId || 'er'),
      active: !!entry.active,
      since: entry.since || null,
      name: entry.name || null,
      rank: entry.rank || null,
    }
    return acc
  }, {})
}

function normalizeWorker(value) {
  if (!value || typeof value !== 'object') return null
  return {
    ...value,
    stationId: value.stationId ? String(value.stationId) : null,
  }
}

function hasOnDutyDoctorAtStation(state, stationId = 'er') {
  const roster = state?.dutyRoster || {}
  return Object.values(roster).some(entry => entry?.active && entry?.stationId === stationId)
}

function countOnDutyDoctorsAtStation(state, stationId = 'er') {
  const roster = state?.dutyRoster || {}
  return Object.values(roster).filter(entry => entry?.active && entry?.stationId === stationId).length
}

function computeArrivalLoadMetrics(state) {
  const patients = Array.isArray(state?.patients) ? state.patients : []
  const waitingPatients = patients.filter(p => ['waiting_triage', 'triaged', 'waiting'].includes(String(p?.status || '').toLowerCase()))
  const admittedPatients = patients.filter(p => {
    const status = String(p?.status || '').toLowerCase()
    if (['discharged', 'morgue'].includes(status)) return false
    return ['in_treatment', 'in_diagnostics', 'ward', 'icu', 'or'].includes(status) || !!p?.assignedRoom
  })
  const prealerts = Array.isArray(state?.ivenaQueue) ? state.ivenaQueue : []
  const nowMs = Date.now()
  const prealertWeighted = prealerts.reduce((sum, item) => {
    const etaMs = Date.parse(item?.etaAt || '')
    const etaMin = Number.isFinite(etaMs) ? Math.max(0, (etaMs - nowMs) / 60000) : 15
    const weight = etaMin <= 5 ? 1.15 : etaMin <= 12 ? 0.8 : 0.45
    return sum + weight
  }, 0)
  const waitingCount = waitingPatients.length
  const admittedCount = admittedPatients.length
  const loadScore = waitingCount * 1.2 + admittedCount * 0.85 + prealertWeighted
  return {
    waitingCount,
    admittedCount,
    prealertCount: prealerts.length,
    prealertWeighted,
    loadScore,
  }
}

const NON_TREATMENT_ROOM_STATIONS = new Set(['radiology', 'cardiology', 'pneumology', 'neurology', 'lab', 'morgue'])
const ROOM_BUILD_COSTS = {
  ambulance_intake: 3000,
  waiting_room: 1000,
  icu: 8000,
  or: 12000,
  lab: 6000,
  radiology: 10000,
  cardiology: 12000,
  pneumology: 8000,
  neurology: 10000,
  pharmacy: 4000,
  rehab: 4500,
  er: 5000,
  ward: 3000,
  morgue: 3500,
}
const DEFAULT_REVENUE_DISTRIBUTION = {
  primary: 40,
  assistant: 20,
  hospital: 30,
  supervisor: 10,
}

function buildDefaultErTreatmentRoom() {
  return {
    id: `tr_er_default_${Date.now()}`,
    name: 'ZNA Standardraum 1',
    station: 'er',
    roomType: 'standard',
    equipment: [...DEFAULT_ER_FULL_EQUIPMENT],
    equipmentState: {},
    patientId: null,
    builtAt: new Date().toISOString(),
    autoProvisioned: true,
  }
}

function ensureErBootstrapRoom(state) {
  const rooms = asArray(state?.rooms)
  const hasErStation = rooms.some(r => String(r?.id || '') === 'er')
  const existingTreatmentRooms = asArray(state?.treatmentRooms)
  if (!hasErStation || existingTreatmentRooms.length > 0) return existingTreatmentRooms
  return [buildDefaultErTreatmentRoom()]
}

const CHARITE_BERLIN_ID = 'h_charite_berlin'
const CHARITE_EXTRA_ROOM_IDS = ['pharmacy', 'radiology']
const CHARITE_STATION_EQUIPMENT_DEFAULTS = {
  radiology: ['ultrasound', 'xray_mobile', 'xray_portable', 'ct_scanner', 'mri_scanner'],
  lab: ['lab_analyzer', 'centrifuge', 'microscope'],
}

/** Staatliches Standard-KH: Apotheke & Radiologie inkl. kompletter Geräteliste. */
function ensureCityClinicInfrastructure(state) {
  if (!state || String(state.id) !== CHARITE_BERLIN_ID) return state
  const rooms = asArray(state.rooms)
  const have = new Set(rooms.map(r => String(r?.id || '')))
  const extraRooms = CHARITE_EXTRA_ROOM_IDS.filter(id => !have.has(id)).map(id => ({
    id,
    level: 1,
    condition: 100,
    patients: [],
  }))
  const stationEquipment = { ...(state.stationEquipment || {}) }
  Object.entries(CHARITE_STATION_EQUIPMENT_DEFAULTS).forEach(([stationId, defaults]) => {
    const cur = asArray(stationEquipment[stationId])
    stationEquipment[stationId] = [...new Set([...cur, ...defaults])]
  })
  return {
    ...state,
    rooms: [...rooms, ...extraRooms],
    stationEquipment,
  }
}

function normalizeHospitalState(raw, user) {
  if (!raw || typeof raw !== 'object') return createDefaultHospital(user)
  const normalizedRooms = (() => {
    const base = asArray(raw.rooms)
    const hasEr = base.some((room) => String(room?.id || '') === 'er')
    const hasWaitingRoom = base.some((room) => String(room?.id || '') === 'waiting_room')
    const isStandardHospital = String(raw?.ownerId || '') === 'state'
    if (isStandardHospital && hasEr && !hasWaitingRoom) {
      return [...base, { id: 'waiting_room', level: 1, condition: 100, patients: [] }]
    }
    return base
  })()
  const treatmentRooms = ensureErBootstrapRoom(raw).map(room => ({
    ...room,
    equipment: normalizeEquipmentList(room?.equipment),
    equipmentState: room?.equipmentState && typeof room.equipmentState === 'object' && !Array.isArray(room.equipmentState)
      ? room.equipmentState
      : {},
    roomType: room?.roomType === 'shock' ? 'shock' : 'standard',
  }))
  const members = asArray(raw.members).map(member => ({
    ...member,
    permissions: { ...DEFAULT_PERMISSIONS, ...(member?.permissions || {}) },
  }))
  const medicationInventory = raw.medicationInventory && typeof raw.medicationInventory === 'object' && !Array.isArray(raw.medicationInventory)
    ? raw.medicationInventory
    : {}
  const stationEquipment = normalizeStationEquipment(raw.stationEquipment)
  const dutyRoster = normalizeDutyRoster(raw.dutyRoster)
  const customStationNames = raw.customStationNames && typeof raw.customStationNames === 'object' && !Array.isArray(raw.customStationNames)
    ? Object.fromEntries(
      Object.entries(raw.customStationNames).map(([k, v]) => [String(k), String(v || '').trim()]).filter(([, v]) => v.length > 0)
    )
    : {}
  const mobileSonoDeploymentRaw = (() => {
    const rawDeployment = raw?.mobileSonoDeployment
    if (!rawDeployment || typeof rawDeployment !== 'object') return {}
    // Backward compatibility: single deployment object -> station keyed map.
    if (Object.prototype.hasOwnProperty.call(rawDeployment, 'roomId')) {
      const stationId = String(rawDeployment.stationId || 'er')
      return {
        [stationId]: {
          roomId: rawDeployment.roomId || null,
          stationId,
          fetchedAt: rawDeployment.fetchedAt || null,
          patientId: rawDeployment.patientId || null,
        },
      }
    }
    return Object.entries(rawDeployment).reduce((acc, [stationId, entry]) => {
      if (!entry || typeof entry !== 'object') return acc
      acc[String(stationId)] = {
        roomId: entry.roomId || null,
        stationId: String(entry.stationId || stationId),
        fetchedAt: entry.fetchedAt || null,
        patientId: entry.patientId || null,
      }
      return acc
    }, {})
  })()
  const baseState = {
    ...raw,
    rooms: normalizedRooms,
    treatmentRooms,
    members,
    workers: asArray(raw.workers).map(normalizeWorker).filter(Boolean),
    patients: asArray(raw.patients).map(patient => {
      const normalized = normalizePatientResuscitation(patient)
      return {
        ...normalized,
        wardClothing: normalized?.wardClothing === 'gown' ? 'gown' : 'casual',
        venousAccesses: normalizeVenousAccesses(normalized?.venousAccesses),
      }
    }),
    waitingRoom: asArray(raw.waitingRoom),
    activityLog: asArray(raw.activityLog),
    alertQueue: asArray(raw.alertQueue),
    pagerMessages: asArray(raw.pagerMessages),
    ivenaQueue: asArray(raw.ivenaQueue),
    medicationInventory,
    stationEquipment,
    dutyRoster,
    customStationNames,
    mobileSonoDeployment: mobileSonoDeploymentRaw,
    revenueDistribution: raw.revenueDistribution || DEFAULT_REVENUE_DISTRIBUTION,
    debtFlags: raw.debtFlags || { warningIssued: false, autoClosed: false, insolvencyThreatIssued: false, policeStrikeCount: 0, lastPoliceTriggerBalance: null },
    debtPopupToken: Number(raw.debtPopupToken || 0),
    debtPopupMessage: String(raw.debtPopupMessage || ''),
  }
  return ensureCityClinicInfrastructure(baseState)
}

function isDiagnosisCorrect(patient) {
  const assignedCode = patient?.diagnoses?.primary?.code
  const trueCode = patient?.trueDiagnoses?.primary?.code
  return isPrimaryDiagnosisMatch(assignedCode, trueCode)
}

function hasActiveCarePermission(patient, userId) {
  if (!patient || !userId) return false
  const team = patient.careTeam || {}
  const assistants = Array.isArray(team.assistant) ? team.assistant : (team.assistant ? [team.assistant] : [])
  return team.primary === userId || team.supervisor === userId || assistants.includes(userId)
}

function normalizeVenousAccesses(rawAccesses) {
  return asArray(rawAccesses)
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const status = entry.status === 'removed' ? 'removed' : 'active'
      return {
        id: entry.id || ('va_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        typeId: entry.typeId || 'pvk_18g',
        gauge: entry.gauge || '18G',
        site: entry.site || 'Unterarm',
        placedAt: entry.placedAt || entry.createdAt || new Date().toISOString(),
        placedBy: entry.placedBy || 'Team',
        status,
        removedAt: status === 'removed' ? (entry.removedAt || new Date().toISOString()) : null,
        removedBy: status === 'removed' ? (entry.removedBy || null) : null,
        complication: entry.complication || null,
        lastIssueAt: entry.lastIssueAt || null,
      }
    })
    .filter(Boolean)
}

function hasActiveVenousAccess(patient) {
  return normalizeVenousAccesses(patient?.venousAccesses).some(entry => entry.status === 'active')
}

function normalizePatientResuscitation(patient) {
  const clinical = ensureClinicalState(patient)
  return {
    ...patient,
    clinicalState: {
      ...clinical,
      resuscitation: ensureResuscitationState(clinical?.resuscitation),
    },
  }
}

function isShockableRhythm(rhythm) {
  const value = String(rhythm || '').toLowerCase()
  return value === 'vf' || value === 'pvt'
}

function hasDeathCertificate(patient) {
  return (patient?.documents || []).some(doc => String(doc?.templateId || '').toLowerCase() === 'totenschein')
}

function parseBpString(bp) {
  const [sysRaw, diaRaw] = String(bp || '120/75').split('/')
  const sys = Number.parseInt(sysRaw, 10)
  const dia = Number.parseInt(diaRaw, 10)
  return {
    sys: Number.isFinite(sys) ? sys : 120,
    dia: Number.isFinite(dia) ? dia : 75,
  }
}

function formatBpString(sys, dia) {
  const s = Math.max(0, Math.min(240, Math.round(Number(sys || 0))))
  const d = Math.max(0, Math.min(140, Math.round(Number(dia || 0))))
  return `${s}/${d}`
}

function resolveResusTargetPatient(patients, patientId) {
  const list = Array.isArray(patients) ? patients : []
  const wantedId = patientId == null ? '' : String(patientId)
  if (wantedId) {
    const direct = list.find(p => String(p?.id || '') === wantedId)
    if (direct) return direct
  }
  const activeResus = list.filter((p) => ensureResuscitationState(p?.clinicalState?.resuscitation).active)
  if (activeResus.length === 1) return activeResus[0]
  const cartFetched = activeResus.filter((p) => ensureResuscitationState(p?.clinicalState?.resuscitation).cartFetched)
  if (cartFetched.length === 1) return cartFetched[0]
  return null
}

function createResusDebugPayload(patients, requestedPatientId) {
  const list = Array.isArray(patients) ? patients : []
  const activeResusIds = list
    .filter((p) => ensureResuscitationState(p?.clinicalState?.resuscitation).active)
    .map((p) => String(p?.id || ''))
  return {
    requestedPatientId: requestedPatientId == null ? null : String(requestedPatientId),
    patientCount: list.length,
    patientIds: list.slice(0, 12).map((p) => String(p?.id || '')),
    activeResusIds,
  }
}

function getManvDiagnosisPool(eventId) {
  const pools = {
    bus_accident: [
      { specialty: 'trauma', code: 'S06.0' },
      { specialty: 'trauma', code: 'S22.3' },
      { specialty: 'trauma', code: 'S42.2' },
      { specialty: 'trauma', code: 'S82.1' },
      { specialty: 'neurology', code: 'S06.5' },
    ],
    building_fire: [
      { specialty: 'pneumology', code: 'T59.8' },
      { specialty: 'trauma', code: 'T22.0' },
      { specialty: 'trauma', code: 'T24.0' },
      { specialty: 'innere', code: 'J70.5' },
    ],
    train_collision: [
      { specialty: 'trauma', code: 'S06.0' },
      { specialty: 'trauma', code: 'S32.4' },
      { specialty: 'trauma', code: 'S22.4' },
      { specialty: 'trauma', code: 'S72.3' },
    ],
    chemical_spill: [
      { specialty: 'pneumology', code: 'J68.0' },
      { specialty: 'innere', code: 'T65.9' },
      { specialty: 'pneumology', code: 'J96.0' },
    ],
    concert_stampede: [
      { specialty: 'trauma', code: 'S06.0' },
      { specialty: 'trauma', code: 'S83.2' },
      { specialty: 'trauma', code: 'S92.3' },
      { specialty: 'innere', code: 'R55' },
    ],
    school_incident: [
      { specialty: 'trauma', code: 'S42.2' },
      { specialty: 'trauma', code: 'S52.5' },
      { specialty: 'innere', code: 'T78.2' },
      { specialty: 'pneumology', code: 'J45.9' },
    ],
  }
  return pools[String(eventId || '')] || pools.bus_accident
}

function getManvInjuryPatterns(eventId) {
  const map = {
    bus_accident: ['Polytrauma', 'Schädel-Hirn-Trauma', 'Thoraxtrauma', 'Frakturen Extremitäten'],
    building_fire: ['Rauchgasinhalation', 'Verbrennungen', 'Atemwegsreizung', 'Dyspnoe'],
    train_collision: ['Mehrfachverletzungen', 'Becken-/Wirbelsäulentrauma', 'SHT', 'Kreislaufinstabilität'],
    chemical_spill: ['toxische Inhalation', 'Atemnot', 'chemische Reizung Haut/Auge', 'Kopfschmerz/Übelkeit'],
    concert_stampede: ['Thoraxkompression', 'Prellungen', 'Frakturen', 'Synkope/Panikreaktion'],
    school_incident: ['Sturzverletzungen', 'Frakturen', 'Asthma-/Anaphylaxierisiko', 'SHT leicht'],
  }
  return map[String(eventId || '')] || ['Trauma', 'Atemwegsprobleme']
}

function buildManvEventPlan(event, count) {
  const nowMs = Date.now()
  const pool = getManvDiagnosisPool(event?.id)
  const immediateWalkIns = Math.max(1, Math.round(count * 0.2))
  const generated = Array.from({ length: count }, (_, idx) => {
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const patient = generatePatientByDiagnosis(pick.specialty, pick.code, idx < immediateWalkIns ? 'walk_in' : 'ambulance')
    return { patient, pick }
  })
  const immediatePatients = generated.slice(0, immediateWalkIns).map((x) => x.patient)
  const ivenaBatch = generated.slice(immediateWalkIns).map((x, idx) => {
    const etaMinutes = 2 + Math.floor(Math.random() * 9) + Math.floor(idx / 4)
    return {
      id: `manv_ivena_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(nowMs).toISOString(),
      etaAt: new Date(nowMs + etaMinutes * 60000).toISOString(),
      etaMinutes,
      patient: x.patient,
      dispatch: ['RTW 3/83-1', 'RTW 5/83-2', 'NEF 1/82-1'][Math.floor(Math.random() * 3)],
      priority: x.patient.suggestedTriage || 'yellow',
      note: `MANV-Lage ${event?.title || 'Unbekannt'}: ${x.patient.chiefComplaint}`,
    }
  })
  const incidentFacts = {
    location: ['A2 Höhe Ausfahrt Nord', 'Innenstadt / Bahnhofsumfeld', 'Industriegebiet Ost', 'Stadthalle / Eventbereich'][Math.floor(Math.random() * 4)],
    weather: ['regen/nasse Fahrbahn', 'trocken/gute Sicht', 'starker Wind', 'Nachtlage'][Math.floor(Math.random() * 4)],
    hazards: ['unklare Treibstofflage', 'eingeschlossene Personen', 'Atemwegsreizstoffe', 'hohes Angehörigenaufkommen'][Math.floor(Math.random() * 4)],
    triageSummary: {
      red: generated.filter((g) => ['red'].includes(String(g.patient?.suggestedTriage || '').toLowerCase())).length,
      yellow: generated.filter((g) => ['yellow'].includes(String(g.patient?.suggestedTriage || '').toLowerCase())).length,
      green: generated.filter((g) => ['green', 'blue'].includes(String(g.patient?.suggestedTriage || '').toLowerCase())).length,
    },
    injuryPatterns: getManvInjuryPatterns(event?.id),
    mechanism: String(event?.title || '').replace(/^EILMELDUNG:\s*/i, ''),
  }
  return { immediatePatients, ivenaBatch, incidentFacts }
}

function createDefaultHospital(user) {
  const baseStartingRooms = user.ownedHospital?.startingRooms || []
  const startingRooms = baseStartingRooms.includes('er') && !baseStartingRooms.includes('waiting_room')
    ? [...baseStartingRooms, 'waiting_room']
    : baseStartingRooms
  const hasErStation = startingRooms.includes('er')
  return {
    id: user.hospitalId,
    name: user.hospitalName,
    ownerId: user.id,
    balance: 0,
    rooms: startingRooms.map(rId => ({ id: rId, level: 1, condition: 100, patients: [] })),
    treatmentRooms: hasErStation ? [buildDefaultErTreatmentRoom()] : [],
    members: [
      {
        userId: user.id,
        name: user.name,
        role: 'owner',
        rank: user.title || 'Assistenzarzt/-ärztin',
        permissions: OWNER_PERMISSIONS,
        joinedAt: new Date().toISOString(),
      },
    ],
    workers: [],
    patients: [],
    waitingRoom: [],
    settings: user.ownedHospital || {},
    activityLog: [],
    dailyCosts: 0,
    dailyIncome: 0,
    isClosed: false,
    closedAt: null,
    closureFines: 0,
    activeEvent: null,
    alertQueue: [],
    pagerMessages: [],
    ivenaQueue: [],
    stationEquipment: {},
    mobileSonoDeployment: {},
    dutyRoster: {},
    customStationNames: {},
    revenueDistribution: DEFAULT_REVENUE_DISTRIBUTION,
    debtFlags: { warningIssued: false, autoClosed: false, insolvencyThreatIssued: false, policeStrikeCount: 0, lastPoliceTriggerBalance: null },
    debtPopupToken: 0,
    debtPopupMessage: '',
  }
}

export function HospitalProvider({ children }) {
  const { user, updateUser, addMoney, triggerPolicePenalty } = useAuth()
  const [hospital, setHospital] = useState(() => {
    if (!user?.hospitalId) return null
    const saved = localStorage.getItem('medisim_hospital_' + user.hospitalId)
    const parsed = safeParseJson(saved)
    if (parsed) return normalizeHospitalState(parsed, user)
    return createDefaultHospital(user)
  })
  const timerRef = useRef(null)
  const autoTriageRef = useRef(null)
  const fineTimerRef = useRef(null)
  const nextPatientRef = useRef(null)
  const clinicalTickRef = useRef(null)
  const infusionTickRef = useRef(null)
  const hospitalMedicationSafetyRef = useRef({})
  const hospitalPoliceCooldownRef = useRef({})
  const lastSyncedSignatureRef = useRef('')
  const suppressNextCloudSyncRef = useRef(false)
  const cloudSyncTimerRef = useRef(null)
  const withDebtSpendPopup = useCallback((prev, updated, spendLabel = 'Einkauf') => {
    if (Number(prev?.balance || 0) >= 0) return updated
    return {
      ...updated,
      debtPopupToken: Number(prev?.debtPopupToken || 0) + 1,
      debtPopupMessage: `Warnung: Krankenhaus ist bereits verschuldet. Weiterer Kauf (${spendLabel}) erhöht die Verschuldung.`,
      activityLog: [
        { time: new Date().toISOString(), message: `⚠️ Verschuldungswarnung bei Kauf: ${spendLabel}.` },
        ...(updated.activityLog || []).slice(0, 49),
      ],
    }
  }, [])

  const addSpecialtyAction = useCallback((actionKey, increment = 1) => {
    if (!actionKey || !user) return
    const prevStats = user.stats || {}
    const prevSpecialty = prevStats.specialtyActionStats || {}
    updateUser({
      stats: {
        ...prevStats,
        specialtyActionStats: {
          ...prevSpecialty,
          [actionKey]: (prevSpecialty[actionKey] || 0) + increment,
        },
      },
    })
  }, [user, updateUser])

  useEffect(() => {
    hospitalMedicationSafetyRef.current = {}
    hospitalPoliceCooldownRef.current = {}
  }, [hospital?.id])

  const triggerHospitalPoliceWithCooldown = useCallback((key, payload, cooldownMs = 120000) => {
    const nowMs = Date.now()
    const last = Number(hospitalPoliceCooldownRef.current?.[key] || 0)
    if (nowMs - last < cooldownMs) return false
    hospitalPoliceCooldownRef.current[key] = nowMs
    triggerPolicePenalty(payload)
    return true
  }, [triggerPolicePenalty])

  const evaluateHospitalMedicationMalpractice = useCallback((patient, medId, medName = '') => {
    if (!patient?.id || !medId) return
    const nowMs = Date.now()
    const medKey = String(medId || '').toLowerCase()
    const patientKey = String(patient.id)
    const bucketKey = `${patientKey}:${medKey}`
    const prev = Array.isArray(hospitalMedicationSafetyRef.current[bucketKey]) ? hospitalMedicationSafetyRef.current[bucketKey] : []
    const inWindowGeneral = prev.filter((entry) => nowMs - Number(entry?.at || 0) <= (25 * 60 * 1000))
    const next = [...inWindowGeneral, { at: nowMs }]
    hospitalMedicationSafetyRef.current[bucketKey] = next

    const rule = HOSPITAL_MED_SAFETY_RULES[medKey]
    if (rule) {
      const inRule = next.filter((entry) => nowMs - Number(entry?.at || 0) <= rule.windowMs)
      if (inRule.length >= rule.criticalCount) {
        triggerHospitalPoliceWithCooldown(`med_count_critical_${bucketKey}`, {
          reason: `KH-Medikation auffällig: ${medName || medId} wurde ${inRule.length}x in kurzer Zeit gegeben.`,
          source: 'hospital_medication_count',
          severity: 'critical',
          forceJail: true,
        })
      } else if (inRule.length >= rule.warningCount) {
        triggerHospitalPoliceWithCooldown(`med_count_warning_${bucketKey}`, {
          reason: `KH-Medikation auffällig: wiederholte Gabe von ${medName || medId} (${inRule.length}x).`,
          source: 'hospital_medication_count',
          severity: 'high',
          forceJail: false,
        })
      }
    }

    const rapid2m = next.filter((entry) => nowMs - Number(entry?.at || 0) <= (2 * 60 * 1000)).length
    if (rapid2m >= 6) {
      triggerHospitalPoliceWithCooldown(`med_rapid_${bucketKey}`, {
        reason: `KH-Medikation auffällig: ${medName || medId} ${rapid2m}x innerhalb von 2 Minuten.`,
        source: 'hospital_medication_rapid',
        severity: 'high',
        forceJail: false,
      }, 180000)
    }

    const v = patient?.vitals || {}
    const hr = Number(v.hr || 0)
    const sys = Number(v.sys || 0)
    const rr = Number(v.rr || 0)
    const spo2 = Number(v.spo2 || 0)
    const glucose = Number(v.glucose || 0)
    const consciousness = String(patient?.clinicalState?.consciousness || '').toLowerCase()
    if ((medKey === 'adrenalin' || medKey === 'adrenaline') && (hr >= 130 || sys >= 180)) {
      triggerHospitalPoliceWithCooldown(`med_contra_adr_${patientKey}`, {
        reason: `Adrenalin trotz Tachykardie/Hypertonie (HF ${hr}/min, RRsys ${sys}).`,
        source: 'hospital_medication_contra',
        severity: 'critical',
        forceJail: true,
      })
    }
    if ((medKey === 'insulin') && ((glucose > 0 && glucose < 90) || consciousness === 'bewusstlos')) {
      triggerHospitalPoliceWithCooldown(`med_contra_ins_${patientKey}`, {
        reason: 'Insulin trotz Hypoglykämie-Verdacht oder kritischem Bewusstseinszustand.',
        source: 'hospital_medication_contra',
        severity: 'high',
      })
    }
    if ((medKey === 'glucose') && glucose >= 260) {
      triggerHospitalPoliceWithCooldown(`med_contra_glu_${patientKey}`, {
        reason: `Glukosegabe trotz Hyperglykämie (${glucose} mg/dl).`,
        source: 'hospital_medication_contra',
        severity: 'high',
      })
    }
    if ((medKey === 'morphin' || medKey === 'morphine' || medKey === 'fentanyl' || medKey === 'midazolam') && (rr <= 8 || spo2 <= 88)) {
      triggerHospitalPoliceWithCooldown(`med_resp_risk_${bucketKey}`, {
        reason: `${medName || medId} bei respiratorischer Instabilität (AF ${rr}/min, SpO2 ${spo2}%).`,
        source: 'hospital_medication_contra',
        severity: 'high',
      })
    }
  }, [triggerHospitalPoliceWithCooldown])

  const persist = useCallback((h) => {
    if (!h) return
    const normalized = normalizeHospitalState(h, user)
    setHospital(normalized)
    localStorage.setItem('medisim_hospital_' + normalized.id, JSON.stringify(normalized))
    if (getSupabaseClient()) {
      upsertHospitalState(normalized).then((res) => {
        if (res?.error?.code === 'CONFLICT') {
          console.warn('[MediSim] Krankenhaus-Sync: Versionskonflikt – bitte Seite neu laden.')
        }
      }).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    if (!user?.hospitalId) {
      setHospital(null)
      return
    }
    let cancelled = false
    const sb = getSupabaseClient()
    ;(async () => {
      if (sb) {
        const { data, error } = await fetchHospitalById(user.hospitalId)
        if (cancelled) return
        if (error) {
          console.warn('[MediSim] Krankenhaus laden:', error)
        }
        if (data?.state) {
          setHospital(normalizeHospitalState(data.state, user))
          return
        }
      }
      const saved = localStorage.getItem('medisim_hospital_' + user.hospitalId)
      if (saved) {
        const parsed = safeParseJson(saved)
        if (parsed) {
          setHospital(normalizeHospitalState(parsed, user))
          return
        }
      }

      // Do not fabricate a joined hospital from user profile.
      // This previously caused public hospitals to be overwritten with wrong owner/member state.
      const isOwnHospital = !!user?.ownedHospital && user?.ownedHospital?.id === user?.hospitalId
      if (!isOwnHospital) {
        setHospital(null)
        return
      }

      const fresh = createDefaultHospital(user)
      const normalizedFresh = normalizeHospitalState(fresh, user)
      setHospital(normalizedFresh)
      localStorage.setItem('medisim_hospital_' + fresh.id, JSON.stringify(normalizedFresh))
      if (sb) {
        upsertHospitalState(normalizedFresh).catch(() => {})
      }
    })()
    return () => { cancelled = true }
  }, [user?.hospitalId, user?.hospitalName, user?.id, user?.name, user?.ownedHospital, user?.title])

  useEffect(() => {
    if (!user?.hospitalId || !hospital?.id) return
    const sb = getSupabaseClient()
    if (!sb) return
    const unsub = subscribeHospitalRealtime(hospital.id, (remoteState) => {
      if (!remoteState?.id) return
      suppressNextCloudSyncRef.current = true
      setHospital((prev) => {
        const merged = normalizeHospitalState(remoteState, user)
        const signature = JSON.stringify({ ...merged, _syncVersion: undefined, _updatedAt: undefined })
        lastSyncedSignatureRef.current = signature
        localStorage.setItem('medisim_hospital_' + merged.id, JSON.stringify(merged))
        return merged
      })
    })
    return unsub
  }, [user?.hospitalId, hospital?.id, user])

  useEffect(() => {
    if (!hospital?.id) return
    const sb = getSupabaseClient()
    if (!sb) return
    const signature = JSON.stringify({ ...hospital, _syncVersion: undefined, _updatedAt: undefined })
    if (signature === lastSyncedSignatureRef.current) return
    if (suppressNextCloudSyncRef.current) {
      suppressNextCloudSyncRef.current = false
      lastSyncedSignatureRef.current = signature
      return
    }
    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current)
    cloudSyncTimerRef.current = setTimeout(() => {
      upsertHospitalState(hospital).then((res) => {
        if (!res?.error) {
          lastSyncedSignatureRef.current = signature
        }
      }).catch(() => {})
    }, 180)
    return () => {
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current)
    }
  }, [hospital])

  const roomsExist = useCallback((roomId) => {
    return hospital?.rooms?.some(r => r.id === roomId) || false
  }, [hospital?.rooms])

  const hasReceivingInfrastructure = roomsExist('er') || roomsExist('ambulance_intake')
  const canReceive = hasReceivingInfrastructure && hasOnDutyDoctorAtStation(hospital, 'er')
  const hasER = roomsExist('er')

  const scheduleNextPatient = useCallback((forcedDelayMs = null) => {
    if (nextPatientRef.current) clearTimeout(nextPatientRef.current)
    const fallbackDelay = 42000 + Math.random() * 24000
    const delayMs = Number.isFinite(forcedDelayMs) && forcedDelayMs > 0 ? forcedDelayMs : fallbackDelay
    nextPatientRef.current = setTimeout(() => {
      let nextDelay = 42000 + Math.random() * 24000
      setHospital(prev => {
        if (!prev || prev.isClosed) return prev
        const hasErRoom = prev.rooms?.some(r => r.id === 'er')
        const hasAmbulance = prev.rooms?.some(r => r.id === 'ambulance_intake')
        if (!hasErRoom && !hasAmbulance) return prev
        if (!hasOnDutyDoctorAtStation(prev, 'er')) return prev

        const erDoctors = Math.max(1, countOnDutyDoctorsAtStation(prev, 'er'))
        const hasNurseInEr = (prev.workers || []).some(w => w?.typeId === 'pflegefachkraft' && String(w?.stationId || 'er') === 'er')
        const metrics = computeArrivalLoadMetrics(prev)
        const baseCapacity = erDoctors * 2.8 + (hasNurseInEr ? 0.7 : 0)
        const lowerBound = Math.max(1.2, baseCapacity * 0.55)
        const upperBound = Math.max(lowerBound + 0.8, baseCapacity * 1.0)
        const overloadRatio = metrics.loadScore / Math.max(0.1, upperBound)
        const underloadRatio = metrics.loadScore / Math.max(0.1, lowerBound)
        const severeOverload = overloadRatio >= 1.35
        const moderateOverload = overloadRatio >= 1.05

        if (severeOverload) {
          nextDelay = 95000 + Math.random() * 55000
          return prev
        }
        if (moderateOverload && Math.random() < 0.7) {
          nextDelay = 70000 + Math.random() * 45000
          return prev
        }

        const fx = getActiveEffects(user)
        const rushMult = fx.nightShiftRushMode ? 0.62 : 1
        if (underloadRatio < 0.75) {
          nextDelay = (22000 + Math.random() * 18000) * rushMult
        } else {
          nextDelay = (42000 + Math.random() * 32000) * rushMult
        }

        const ambulanceChanceBase = moderateOverload ? 0.24 : underloadRatio < 0.75 ? 0.42 : 0.34
        const ambulanceChance = Math.min(0.78, ambulanceChanceBase * (fx.nightShiftRushMode ? 1.3 : 1))
        const isAmbulanceArrival = hasErRoom && hasAmbulance && Math.random() < ambulanceChance
        const type = isAmbulanceArrival ? 'ambulance' : 'walk_in'
        let patient = generatePatient(type)
        if (fx.privatePatientMode) {
          const isMild = (entry) => {
            const triage = String(entry?.suggestedTriage || '').toLowerCase()
            return triage === 'green' || triage === 'blue'
          }
          for (let i = 0; i < 8 && !isMild(patient); i += 1) {
            patient = generatePatient(type)
          }
        }
        if (type === 'ambulance') {
          const nowMs = Date.now()
          const etaMinutes = 6 + Math.floor(Math.random() * 16)
          const preannounce = {
            id: 'ivena_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            createdAt: new Date(nowMs).toISOString(),
            etaAt: new Date(nowMs + etaMinutes * 60000).toISOString(),
            etaMinutes,
            patient,
            dispatch: ['RTW 3/83-1', 'RTW 5/83-2', 'NEF 1/82-1'][Math.floor(Math.random() * 3)],
            priority: patient.suggestedTriage || 'yellow',
            note: patient.preInfo || 'Präklinische Versorgung läuft, Übergabe bei Eintreffen.',
          }
          const updated = {
            ...prev,
            ivenaQueue: [preannounce, ...(prev.ivenaQueue || [])].slice(0, 15),
            activityLog: [
              { time: new Date().toISOString(), message: `📡 RETTUNGSLEITNETZ: Voranmeldung ${preannounce.dispatch} — ${patient.chiefComplaint}, ETA ${etaMinutes} Min.` },
              ...prev.activityLog.slice(0, 49),
            ],
          }
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        }
        const updated = {
          ...prev,
          patients: [...prev.patients, patient],
          activityLog: [
            { time: new Date().toISOString(), message: `${patient.name} (${patient.age}J, ${patient.gender}) ist ${type === 'ambulance' ? 'per Rettungswagen' : 'zu Fuß'} eingetroffen: ${patient.chiefComplaint}` },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })
      scheduleNextPatient(nextDelay)
    }, delayMs)
  }, [user])

  useEffect(() => {
    if (nextPatientRef.current) { clearTimeout(nextPatientRef.current); nextPatientRef.current = null }
    if (!hospital?.id || !canReceive || hospital.isClosed) return
    scheduleNextPatient()
    return () => { if (nextPatientRef.current) { clearTimeout(nextPatientRef.current); nextPatientRef.current = null } }
  }, [hospital?.id, canReceive, hospital?.isClosed, scheduleNextPatient])

  // Mass casualty event check — very rare, ~0.8% chance per 2 min cycle
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (!hospital?.id || !canReceive || hospital.isClosed) return

    timerRef.current = setInterval(() => {

      const event = MASS_CASUALTY_EVENTS[Math.floor(Math.random() * MASS_CASUALTY_EVENTS.length)]
      const count = event.patientMin + Math.floor(Math.random() * (event.patientMax - event.patientMin + 1))

      setHospital(prev => {
        if (!prev || prev.isClosed) return prev
        const hasErRoom = prev.rooms?.some(r => r.id === 'er')
        if (!hasErRoom) return prev
        if (!hasOnDutyDoctorAtStation(prev, 'er')) return prev
        const erDoctors = Math.max(1, countOnDutyDoctorsAtStation(prev, 'er'))
        const metrics = computeArrivalLoadMetrics(prev)
        const dynamicChance = erDoctors <= 1 ? 0.0015 : erDoctors === 2 ? 0.004 : 0.007
        if (metrics.loadScore > erDoctors * 3.8) return prev
        if (Math.random() > dynamicChance) return prev

        const plan = buildManvEventPlan(event, count)

        const updated = {
          ...prev,
          patients: [...prev.patients, ...plan.immediatePatients],
          ivenaQueue: [...plan.ivenaBatch, ...(prev.ivenaQueue || [])].slice(0, 40),
          activeEvent: {
            ...event,
            id: `manv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            patientCount: count,
            immediateCount: plan.immediatePatients.length,
            timestamp: new Date().toISOString(),
            callActive: true,
            callEndsAt: new Date(Date.now() + (2 + Math.floor(Math.random() * 2)) * 60000).toISOString(),
            source: 'live',
            incidentFacts: plan.incidentFacts,
          },
          activityLog: [
            { time: new Date().toISOString(), message: `⚠️ GROSSEREIGNIS: ${event.title} — Leitstelle alarmiert, ${plan.immediatePatients.length} Patienten sofort, weitere als Leitnetz-Voranmeldung.` },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })

      setTimeout(() => {
        setHospital(prev => {
          if (!prev) return prev
          const updated = prev.activeEvent
            ? { ...prev, activeEvent: { ...prev.activeEvent, callActive: false } }
            : prev
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        })
      }, 180000)
    }, 120000)

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [hospital?.id, canReceive, hospital?.isClosed])

  const setDoctorOnDuty = useCallback((stationId = 'er', enabled = true) => {
    if (!user?.id) return { success: false, message: 'Nicht eingeloggt.' }
    let result = { success: false, message: 'Aktion nicht möglich.' }
    setHospital(prev => {
      if (!prev) return prev
      const normalizedStationId = String(stationId || 'er')
      const stationBuilt = (prev.rooms || []).some(r => r.id === normalizedStationId)
      if (enabled && !stationBuilt) {
        result = { success: false, message: 'Diese Station ist noch nicht gebaut.' }
        return prev
      }
      const member = (prev.members || []).find(m => m.userId === user.id)
      if (!member) {
        result = { success: false, message: 'Kein Krankenhausmitglied.' }
        return prev
      }
      const nextRoster = {
        ...(prev.dutyRoster || {}),
        [user.id]: {
          stationId: normalizedStationId,
          active: !!enabled,
          since: enabled ? new Date().toISOString() : null,
          name: user?.name || member.name || 'Arzt/Ärztin',
          rank: user?.rank || member.rank || null,
        },
      }
      const updated = {
        ...prev,
        dutyRoster: nextRoster,
        activityLog: [
          {
            time: new Date().toISOString(),
            message: enabled
              ? `🪪 ${user?.name || 'Arzt/Ärztin'} hat sich auf ${normalizedStationId === 'er' ? 'Notaufnahme' : normalizedStationId} in den Dienst gemeldet.`
              : `🛑 ${user?.name || 'Arzt/Ärztin'} hat den Dienst beendet.`,
          },
          ...(prev.activityLog || []).slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true, roster: nextRoster }
      return updated
    })
    return result
  }, [user?.id, user?.name, user?.rank])

  const renameStation = useCallback((stationId, customName) => {
    const id = String(stationId || '').trim()
    if (!id) return { success: false, message: 'Ungültige Station.' }
    const nextName = String(customName || '').trim()
    let changed = false
    let denied = false
    setHospital(prev => {
      if (!prev) return prev
      const member = (prev.members || []).find(m => m.userId === user?.id)
      const canManageRooms = Boolean(member?.role === 'owner' || member?.permissions?.manage_rooms)
      if (!canManageRooms) {
        denied = true
        return prev
      }
      if (!(prev.rooms || []).some(r => r.id === id)) return prev
      const nextMap = { ...(prev.customStationNames || {}) }
      if (nextName) nextMap[id] = nextName
      else delete nextMap[id]
      const updated = {
        ...prev,
        customStationNames: nextMap,
        activityLog: [
          { time: new Date().toISOString(), message: nextName ? `Station umbenannt: ${id} → ${nextName}` : `Stationsname zurückgesetzt: ${id}` },
          ...(prev.activityLog || []).slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      changed = true
      return updated
    })
    if (denied) return { success: false, message: 'Keine Berechtigung' }
    return changed ? { success: true } : { success: false, message: 'Station konnte nicht umbenannt werden.' }
  }, [user?.id])

  const renameTreatmentRoom = useCallback((treatmentRoomId, customName) => {
    const roomId = String(treatmentRoomId || '').trim()
    const nextName = String(customName || '').trim()
    if (!roomId || !nextName) return { success: false, message: 'Ungültiger Name.' }
    let changed = false
    let denied = false
    setHospital(prev => {
      if (!prev) return prev
      const member = (prev.members || []).find(m => m.userId === user?.id)
      const canManageRooms = Boolean(member?.role === 'owner' || member?.permissions?.manage_rooms)
      if (!canManageRooms) {
        denied = true
        return prev
      }
      let renamedRoom = null
      const nextRooms = (prev.treatmentRooms || []).map(room => {
        if (room.id !== roomId) return room
        renamedRoom = { ...room, name: nextName }
        changed = true
        return renamedRoom
      })
      if (!changed) return prev
      const updated = {
        ...prev,
        treatmentRooms: nextRooms,
        activityLog: [
          { time: new Date().toISOString(), message: `Zimmer umbenannt: ${renamedRoom?.name || roomId}` },
          ...(prev.activityLog || []).slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    if (denied) return { success: false, message: 'Keine Berechtigung' }
    return changed ? { success: true } : { success: false, message: 'Zimmer konnte nicht umbenannt werden.' }
  }, [user?.id])

  // Closure fine timer
  useEffect(() => {
    if (fineTimerRef.current) { clearInterval(fineTimerRef.current); fineTimerRef.current = null }
    if (!hospital?.id || !hospital.isClosed) return

    const patientLoad = hospital.patients?.length || 0
    const treatmentCapacity = (hospital.treatmentRooms?.length || 0) + (hospital.rooms?.filter(r => ['er', 'ward', 'icu'].includes(r.id)).length || 0) * 3
    const loadRatio = treatmentCapacity > 0 ? patientLoad / treatmentCapacity : 0

    if (loadRatio < 0.8) {
      fineTimerRef.current = setInterval(() => {
        const fineAmount = 500
        setHospital(prev => {
          if (!prev || !prev.isClosed) return prev
          const updated = {
            ...prev,
            balance: (prev.balance || 0) - fineAmount,
            closureFines: (prev.closureFines || 0) + fineAmount,
            activityLog: [
              { time: new Date().toISOString(), message: `💰 Strafgebühr: ${fineAmount}€ wegen Schließung bei niedriger Auslastung (${Math.round(loadRatio * 100)}%)` },
              ...prev.activityLog.slice(0, 49),
            ],
          }
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        })
      }, 60000)
    }

    return () => { if (fineTimerRef.current) { clearInterval(fineTimerRef.current); fineTimerRef.current = null } }
  }, [hospital?.id, hospital?.isClosed, hospital?.patients?.length])

  useEffect(() => {
    if (!hospital?.id) return
    let ownerCredit = 0
    let shouldCreditOwner = false
    setHospital(prev => {
      if (!prev) return prev
      const balance = Number(prev.balance || 0)
      const isStandardHospital = String(prev?.ownerId || '') === 'state'
      const flags = prev.debtFlags || { warningIssued: false, autoClosed: false, insolvencyThreatIssued: false, policeStrikeCount: 0, lastPoliceTriggerBalance: null }
      if (balance > -10000 && (flags.warningIssued || flags.insolvencyThreatIssued)) {
        const updated = { ...prev, debtFlags: { ...flags, warningIssued: false, insolvencyThreatIssued: false } }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      }

      if (isStandardHospital) {
        const lastPoliceBalance = Number(flags.lastPoliceTriggerBalance)
        const canEscalateAgain = !Number.isFinite(lastPoliceBalance) || balance <= (lastPoliceBalance - 500)
        if (balance <= -40000 && canEscalateAgain) {
          const nextStrike = Math.max(1, Number(flags.policeStrikeCount || 0) + 1)
          const fineAmount = 1800 + (nextStrike - 1) * 900
          triggerPolicePenalty({
            reason: `Staatliches KH stark verschuldet (${balance.toLocaleString('de-DE')}€).`,
            source: 'hospital_debt',
            severity: 'critical',
            forceJail: false,
            fineAmountOverride: fineAmount,
          })
          const updated = {
            ...prev,
            debtFlags: {
              ...flags,
              warningIssued: true,
              policeStrikeCount: nextStrike,
              lastPoliceTriggerBalance: balance,
            },
            activityLog: [
              { time: new Date().toISOString(), message: `🚨 Polizei-Finanzstrafe #${nextStrike}: ${fineAmount.toLocaleString('de-DE')}€ (Kontostand ${balance.toLocaleString('de-DE')}€).` },
              ...prev.activityLog.slice(0, 49),
            ],
          }
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        }
        if (balance < -10000 && !flags.warningIssued) {
          const updated = {
            ...prev,
            debtFlags: { ...flags, warningIssued: true },
            activityLog: [
              { time: new Date().toISOString(), message: `⚠️ Finanzwarnung: Staatliches KH im Minus (${balance.toLocaleString('de-DE')}€). Ab -40.000€ droht Polizei-Strafe.` },
              ...prev.activityLog.slice(0, 49),
            ],
          }
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        }
        return prev
      }

      if (balance <= -60000 && !flags.autoClosed) {
        const equipmentValue = (() => {
          let total = 0
          for (const room of (prev.treatmentRooms || [])) {
            for (const eqId of (room.equipment || [])) {
              const eq = EQUIPMENT.find(e => e.id === eqId)
              total += Number(eq?.cost || 0)
            }
          }
          Object.values(prev.stationEquipment || {}).forEach(list => {
            for (const eqId of (Array.isArray(list) ? list : [])) {
              const eq = EQUIPMENT.find(e => e.id === eqId)
              total += Number(eq?.cost || 0)
            }
          })
          return total
        })()
        const treatmentRoomValue = (prev.treatmentRooms || []).length * TREATMENT_ROOM_COST
        const workerValue = (prev.workers || []).reduce((sum, w) => {
          const wt = WORKER_TYPES.find(item => item.id === w.typeId)
          return sum + Number(wt?.hireCost || 0)
        }, 0)
        const liquidationValue = equipmentValue + treatmentRoomValue + workerValue
        ownerCredit = Math.round(liquidationValue * 0.5)
        shouldCreditOwner = ownerCredit > 0 && prev.ownerId === user?.id
        const updated = {
          ...prev,
          isClosed: true,
          closedAt: new Date().toISOString(),
          treatmentRooms: [],
          workers: [],
          stationEquipment: {},
          medicationInventory: {},
          patients: [],
          waitingRoom: [],
          ivenaQueue: [],
          debtFlags: { ...flags, warningIssued: true, autoClosed: true, insolvencyThreatIssued: true },
          activityLog: [
            {
              time: new Date().toISOString(),
              message: `⛔ Krankenhaus insolvent geschlossen (Kontostand ${balance.toLocaleString('de-DE')}€). Verkaufserlös: ${liquidationValue.toLocaleString('de-DE')}€, Eigentümergutschrift: ${ownerCredit.toLocaleString('de-DE')}€.`,
            },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      }
      if (balance <= -30000 && !flags.insolvencyThreatIssued) {
        const updated = {
          ...prev,
          debtFlags: { ...flags, warningIssued: true, insolvencyThreatIssued: true },
          activityLog: [
            { time: new Date().toISOString(), message: `⚠️ Insolvenzandrohung: Eigenes KH bei ${balance.toLocaleString('de-DE')}€. Zwischen -30.000€ und -50.000€ kritisch, ab -60.000€ Schließung.` },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      }
      return prev
    })
    if (shouldCreditOwner && ownerCredit > 0) addMoney(ownerCredit)
  }, [hospital?.id, hospital?.balance, user?.id, addMoney, triggerPolicePenalty])

  // Auto-triage by worker (slower)
  useEffect(() => {
    if (autoTriageRef.current) { clearInterval(autoTriageRef.current); autoTriageRef.current = null }
    if (!hospital?.id) return
    const hasTriageWorker = hospital.workers?.some(w => w.typeId === 'triagekraft')
    if (!hasTriageWorker) return

    autoTriageRef.current = setInterval(() => {
      setHospital(prev => {
        if (!prev) return prev
        const untriaged = prev.patients.filter(p => p.status === 'waiting_triage')
        if (untriaged.length === 0) return prev
        const p = untriaged[0]
        const nowIso = new Date().toISOString()
        const nextVitals = p.vitals || {
          hr: 75 + Math.floor(Math.random() * 30),
          bp: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
          rr: 14 + Math.floor(Math.random() * 8),
          temp: +(36.5 + Math.random() * 1.5).toFixed(1),
          spo2: 94 + Math.floor(Math.random() * 6),
        }
        const triaged = {
          ...p,
          status: 'triaged',
          triaged: true,
          triageLevel: p.suggestedTriage,
          vitals: nextVitals,
          vitalsHistory: [...(p.vitalsHistory || []), { time: nowIso, source: 'auto_triage', ...nextVitals }].slice(-240),
          clinicalState: {
            ...ensureClinicalState(p),
            lastUpdatedAt: nowIso,
          },
        }
        const updated = {
          ...prev,
          patients: prev.patients.map(pt => pt.id === p.id ? triaged : pt),
          activityLog: [
            { time: new Date().toISOString(), message: `[Auto-Triage] ${p.name} wurde als "${TRIAGE_LEVELS.find(t => t.id === p.suggestedTriage)?.name}" eingestuft.` },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })
    }, 15000)

    return () => { if (autoTriageRef.current) { clearInterval(autoTriageRef.current); autoTriageRef.current = null } }
  }, [hospital?.id, hospital?.workers?.length])

  // Clinical progression engine: updates all active patients continuously.
  useEffect(() => {
    if (clinicalTickRef.current) { clearInterval(clinicalTickRef.current); clinicalTickRef.current = null }
    if (!hospital?.id) return

    clinicalTickRef.current = setInterval(() => {
      setHospital(prev => {
        if (!prev) return prev
        const nowIso = new Date().toISOString()
        const nowMs = Date.parse(nowIso)
        const activeStatuses = new Set(['waiting_triage', 'triaged', 'waiting', 'in_treatment', 'in_diagnostics'])
      const hasNurse = prev.workers?.some(w => w.typeId === 'pflegefachkraft')
      const securityWorkers = (prev.workers || []).filter(w => w.typeId === 'sicherheitsdienst')
      const hasSecurityWorker = securityWorkers.length > 0
      const erSecurityCount = securityWorkers.filter(w => (w.stationId || null) === 'er').length
      const hasWaitingRoom = !!(prev.rooms || []).some(r => r.id === 'waiting_room')
        const activityEvents = []
        const generatedAlerts = []
        let changedAny = false
        let inventory = { ...(prev.medicationInventory || {}) }
        let tickDamageCost = 0
        const readyIvena = (prev.ivenaQueue || []).filter(item => {
          const etaMs = Date.parse(item?.etaAt || '')
          return Number.isFinite(etaMs) && etaMs <= nowMs
        })
        const remainingIvena = (prev.ivenaQueue || []).filter(item => !readyIvena.includes(item))
        if (readyIvena.length > 0) changedAny = true
        const arrivedIvenaPatients = readyIvena.map(item => {
          if (!item?.patient) return null
          return {
            ...item.patient,
            arrivalMeta: {
              dispatch: item.dispatch || null,
              note: item.note || null,
              etaAt: item.etaAt || null,
              ivenaId: item.id || null,
            },
          }
        }).filter(Boolean)
        readyIvena.forEach(item => {
          activityEvents.push({
            time: nowIso,
            message: `🚑 Leitnetz-Eintreffen: ${item.patient?.name || 'Patient'} (${item.dispatch || 'RTW'}) ist angekommen.`,
          })
        })

        const nextPatients = [...prev.patients, ...arrivedIvenaPatients].map(patient => {
          if (!activeStatuses.has(patient.status)) return patient
          let progressedResult = null
          try {
            progressedResult = applyClinicalProgressionTick(patient, nowIso)
          } catch (error) {
            activityEvents.push({
              time: nowIso,
              message: `⚠️ Klinischer Tick übersprungen für ${patient?.name || 'Patient'} (inkonsistente Daten korrigiert).`,
            })
            const fallbackPatient = {
              ...patient,
              vitals: ensureVitals(patient?.vitals),
              clinicalState: {
                ...ensureClinicalState(patient),
                lastUpdatedAt: nowIso,
              },
            }
            return fallbackPatient
          }
          const { patient: progressed, events, changed } = progressedResult
          if (changed || (events && events.length > 0)) changedAny = true
          if (events?.length) {
            events.forEach(evt => {
              activityEvents.push({ time: nowIso, message: `🔔 ${evt.message}` })
              generatedAlerts.push({
                id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                time: nowIso,
                patientId: patient.id,
                patientName: patient.name,
                severity: evt.severity || (evt.type === 'critical' ? 'critical' : evt.type === 'warning' ? 'high' : 'medium'),
                priority: Number.isFinite(evt.priority) ? evt.priority : (evt.type === 'critical' ? 3 : evt.type === 'warning' ? 2 : 1),
                code: evt.code || evt.type || 'event',
                message: evt.message,
              })
            })
          }
          let nextPatient = {
            ...progressed,
            therapyProgress: evaluateTherapyProgress(progressed),
            patientLog: [
              ...(progressed.patientLog || []),
              ...(events || []).map(evt => ({
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                time: nowIso,
                type: evt.type === 'critical' ? 'alert' : (evt.type || 'event'),
                author: 'System',
                text: evt.message,
              })),
            ],
          }

          const psychType = String(nextPatient?.psychProfile?.type || '').toLowerCase()
          if (psychType) {
            const lastPsychTs = Date.parse(nextPatient.lastPsychEventAt || '')
            const minutesSincePsych = Number.isFinite(lastPsychTs) ? (nowMs - lastPsychTs) / 60000 : 999
            const securityPosted = !!nextPatient?.securityPosted
            const baseChance = securityPosted ? 0.005 : hasSecurityWorker ? 0.01 : 0.025
            if (minutesSincePsych >= 8 && Math.random() < baseChance) {
              const psychEvents = psychType === 'aggressive'
                ? ['false_alarm', 'vandalism']
                : psychType === 'psychotic'
                  ? ['self_harm', 'med_theft', 'false_alarm']
                  : ['false_alarm', 'med_theft']
              const picked = psychEvents[Math.floor(Math.random() * psychEvents.length)]
              let message = `${nextPatient.name} zeigt psychisch auffälliges Verhalten.`
              let severity = 'high'
              let priority = 2
              if (picked === 'false_alarm') {
                message = `${nextPatient.name} betätigt wiederholt die Klingel ohne medizinischen Grund (Fehlalarm).`
                severity = 'medium'
                priority = 1
              } else if (picked === 'vandalism') {
                message = `${nextPatient.name} randaliert im Zimmer und beschädigt Material.`
              } else if (picked === 'med_theft') {
                message = `${nextPatient.name} versucht Medikamente aus dem Wagen zu entwenden.`
                const medEntries = Object.entries(inventory || {}).filter(([, qty]) => Number(qty || 0) > 0)
                if (medEntries.length > 0) {
                  const [medId, qty] = medEntries[Math.floor(Math.random() * medEntries.length)]
                  inventory[medId] = Math.max(0, Number(qty || 0) - 1)
                }
              } else if (picked === 'self_harm') {
                message = `${nextPatient.name} verletzt sich selbst. Sofortige Sicherung erforderlich.`
                severity = securityPosted || hasSecurityWorker ? 'high' : 'critical'
                priority = securityPosted || hasSecurityWorker ? 2 : 3
                nextPatient = {
                  ...nextPatient,
                  clinicalState: {
                    ...(nextPatient.clinicalState || {}),
                    complaintLevel: Math.min(10, Number(nextPatient?.clinicalState?.complaintLevel || 2) + 1.2),
                    hemodynamics: Math.max(-10, Number(nextPatient?.clinicalState?.hemodynamics || 0) - 0.8),
                    lastUpdatedAt: nowIso,
                  },
                }
              }
              if (securityPosted || hasSecurityWorker) {
                message += ' Sicherheitsdienst deeskaliert die Lage.'
              }
              activityEvents.push({ time: nowIso, message: `⚠️ ${message}` })
              generatedAlerts.push({
                id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                time: nowIso,
                patientId: nextPatient.id,
                patientName: nextPatient.name,
                severity,
                priority,
                code: 'psych_' + picked,
                message,
              })
              nextPatient = {
                ...nextPatient,
                lastPsychEventAt: nowIso,
                patientLog: [
                  ...(nextPatient.patientLog || []),
                  {
                    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    time: nowIso,
                    type: 'alert',
                    author: 'System',
                    text: message,
                  },
                ],
              }
              changedAny = true
            }
          }

          const waitedMinutes = (() => {
            const startMs = Date.parse(nextPatient.statusChangedAt || nextPatient.arrivalTime || '')
            if (!Number.isFinite(startMs)) return 0
            return (nowMs - startMs) / 60000
          })()
          const waitingInQueue = new Set(['waiting_triage', 'triaged', 'waiting']).has(nextPatient.status)
          const threshold = nextPatient.status === 'waiting_triage' ? 12 : 20
          const lastComplaintMs = Date.parse(nextPatient.lastWaitComplaintAt || '')
          const complaintCooldownPassed = !Number.isFinite(lastComplaintMs) || (nowMs - lastComplaintMs) >= 15 * 60000
          if (waitingInQueue && waitedMinutes >= threshold && complaintCooldownPassed) {
            const complaint = nextPatient.status === 'waiting_triage'
              ? `${nextPatient.name} wartet seit ${Math.round(waitedMinutes)} Min. auf Triage und beschwert sich über die Wartezeit.`
              : `${nextPatient.name} wartet seit ${Math.round(waitedMinutes)} Min. auf Behandlung und beschwert sich.`
            activityEvents.push({ time: nowIso, message: `🔔 ${complaint}` })
            generatedAlerts.push({
              id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              time: nowIso,
              patientId: nextPatient.id,
              patientName: nextPatient.name,
              severity: 'medium',
              priority: 1,
              code: nextPatient.status === 'waiting_triage' ? 'waiting_triage_complaint' : 'waiting_treatment_complaint',
              message: complaint,
            })
            nextPatient = {
              ...nextPatient,
              lastWaitComplaintAt: nowIso,
              patientLog: [
                ...(nextPatient.patientLog || []),
                {
                  id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                  time: nowIso,
                  type: 'alert',
                  author: 'System',
                  text: complaint,
                },
              ],
            }
            changedAny = true
          }

          if (!hasWaitingRoom && waitingInQueue) {
            const lastNoRoomTs = Date.parse(nextPatient.lastNoWaitingRoomEventAt || '')
            const noRoomCooldownPassed = !Number.isFinite(lastNoRoomTs) || (nowMs - lastNoRoomTs) >= (erSecurityCount > 0 ? 10 : 8) * 60000
            if (waitedMinutes >= 6 && noRoomCooldownPassed) {
              const unrestChance = erSecurityCount > 0 ? 0.12 : 0.28
              if (Math.random() < unrestChance) {
                const unrestTypePool = erSecurityCount > 0
                  ? ['complaint', 'false_alarm', 'minor_vandalism']
                  : ['complaint', 'false_alarm', 'minor_vandalism', 'major_vandalism']
                const unrestType = unrestTypePool[Math.floor(Math.random() * unrestTypePool.length)]
                const baseMsg = `${nextPatient.name} wartet ohne Wartezimmer-Struktur und sorgt für Unruhe in der Notaufnahme.`
                let message = baseMsg
                let severity = 'high'
                let priority = 2
                let repairCost = 0
                if (unrestType === 'complaint') {
                  message = `${nextPatient.name} beschwert sich lautstark über die Wartebedingungen ohne Wartezimmer.`
                  severity = 'medium'
                  priority = 1
                } else if (unrestType === 'false_alarm') {
                  message = `${nextPatient.name} löst mehrfach Fehlalarme aus und bindet das Team.`
                  severity = 'high'
                  priority = 2
                } else if (unrestType === 'minor_vandalism') {
                  repairCost = 120 + Math.floor(Math.random() * 280)
                  message = `${nextPatient.name} beschädigt kleinere Gegenstände im Aufnahmebereich. Reparaturkosten: ${repairCost}€.`
                  severity = 'high'
                  priority = 2
                } else {
                  repairCost = 450 + Math.floor(Math.random() * 550)
                  message = `${nextPatient.name} randaliert im Aufnahmebereich und beschädigt Inventar. Reparaturkosten: ${repairCost}€.`
                  severity = erSecurityCount > 0 ? 'high' : 'critical'
                  priority = erSecurityCount > 0 ? 2 : 3
                }
                if (erSecurityCount > 0) {
                  message += ` Sicherheitsdienst (NA) greift ein und reduziert die Lage${repairCost > 0 ? ' teilweise' : ''}.`
                  if (repairCost > 0) repairCost = Math.round(repairCost * 0.55)
                }
                if (repairCost > 0) {
                  activityEvents.push({
                    time: nowIso,
                    message: `💸 Unruheschaden im Aufnahmebereich: ${repairCost.toLocaleString('de-DE')}€ vom Krankenhauskonto abgebucht.`,
                  })
                  tickDamageCost += repairCost
                }
                activityEvents.push({ time: nowIso, message: `⚠️ ${message}` })
                generatedAlerts.push({
                  id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                  time: nowIso,
                  patientId: nextPatient.id,
                  patientName: nextPatient.name,
                  severity,
                  priority,
                  code: `no_waiting_room_${unrestType}`,
                  message,
                })
                nextPatient = {
                  ...nextPatient,
                  lastNoWaitingRoomEventAt: nowIso,
                  patientLog: [
                    ...(nextPatient.patientLog || []),
                    {
                      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                      time: nowIso,
                      type: 'alert',
                      author: 'System',
                      text: message,
                    },
                  ],
                }
                changedAny = true
              }
            }
          }

          const currentAccesses = normalizeVenousAccesses(nextPatient.venousAccesses)
          const activeAccesses = currentAccesses.filter(entry => entry.status === 'active')
          if (activeAccesses.length > 0) {
            let accessChanged = false
            const updatedAccesses = currentAccesses.map(entry => {
              if (entry.status !== 'active') return entry
              const placedMs = Date.parse(entry.placedAt || '')
              if (!Number.isFinite(placedMs)) return entry
              const hoursActive = (nowMs - placedMs) / 3600000
              if (hoursActive < 24) return entry
              const lastIssueMs = Date.parse(entry.lastIssueAt || '')
              const issueCooldownPassed = !Number.isFinite(lastIssueMs) || (nowMs - lastIssueMs) >= 6 * 3600000
              if (!issueCooldownPassed) return entry
              if (Math.random() > 0.1) return entry
              const issueType = Math.random() < 0.65 ? 'pain' : 'phlebitis'
              const issueMessage = issueType === 'pain'
                ? `${nextPatient.name} klagt über Schmerzen am Zugang (${entry.gauge || 'PVK'}, ${entry.site || 'unbekannt'}).`
                : `${nextPatient.name} zeigt Zeichen einer möglichen Phlebitis am Zugang (${entry.gauge || 'PVK'}, ${entry.site || 'unbekannt'}).`
              activityEvents.push({ time: nowIso, message: `⚠️ ${issueMessage}` })
              generatedAlerts.push({
                id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                time: nowIso,
                patientId: nextPatient.id,
                patientName: nextPatient.name,
                severity: issueType === 'phlebitis' ? 'high' : 'medium',
                priority: issueType === 'phlebitis' ? 2 : 1,
                code: issueType === 'phlebitis' ? 'venous_access_phlebitis' : 'venous_access_pain',
                message: issueMessage,
              })
              nextPatient = {
                ...nextPatient,
                clinicalState: {
                  ...(nextPatient.clinicalState || {}),
                  complaintLevel: Math.min(10, Number(nextPatient?.clinicalState?.complaintLevel || 2) + (issueType === 'phlebitis' ? 0.8 : 0.4)),
                  infectionLoad: Math.min(10, Number(nextPatient?.clinicalState?.infectionLoad || 0.5) + (issueType === 'phlebitis' ? 0.35 : 0.08)),
                  lastUpdatedAt: nowIso,
                },
                patientLog: [
                  ...(nextPatient.patientLog || []),
                  {
                    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    time: nowIso,
                    type: 'alert',
                    author: 'System',
                    text: issueMessage,
                  },
                ],
              }
              accessChanged = true
              changedAny = true
              return {
                ...entry,
                complication: issueType === 'phlebitis' ? 'Rötung/Entzündungsverdacht' : 'Druckschmerz',
                lastIssueAt: nowIso,
              }
            })
            if (accessChanged) {
              nextPatient = {
                ...nextPatient,
                venousAccesses: updatedAccesses,
              }
            }
          }

          if (hasNurse && Array.isArray(nextPatient.medicationPlan) && nextPatient.medicationPlan.length > 0) {
            const nextPlan = nextPatient.medicationPlan.map(entry => {
              if (!entry?.active || !entry?.medId) return entry
              const intervalHours = Number(entry.intervalHours || 8)
              const intervalMs = Math.max(30, intervalHours * 3600000)
              const startMs = Date.parse(entry.startAt || nextPatient.arrivalTime || nowIso)
              const nextDueMs = Date.parse(entry.nextDueAt || '')
              const dueMs = Number.isFinite(nextDueMs) ? nextDueMs : startMs
              if (!Number.isFinite(dueMs) || nowMs < dueMs) return entry

              const stock = inventory[entry.medId] || 0
              if (stock <= 0) {
                activityEvents.push({
                  time: nowIso,
                  message: `⚠️ Automedikation pausiert: ${entry.medName || entry.medId} für ${nextPatient.name} nicht auf Lager.`,
                })
                return {
                  ...entry,
                  nextDueAt: new Date(nowMs + 30 * 60000).toISOString(),
                  lastAutoErrorAt: nowIso,
                }
              }
              const medDef = MEDICATIONS.find(med => med.id === entry.medId)
              if (medDef && medicationRequiresVenousAccess(medDef) && !hasActiveVenousAccess(nextPatient)) {
                activityEvents.push({
                  time: nowIso,
                  message: `⚠️ Automedikation pausiert: ${entry.medName || entry.medId} bei ${nextPatient.name} ohne venösen Zugang.`,
                })
                return {
                  ...entry,
                  nextDueAt: new Date(nowMs + 30 * 60000).toISOString(),
                  lastAutoErrorAt: nowIso,
                }
              }

              inventory[entry.medId] = stock - 1
              const medApplied = applyMedicationToPatient(nextPatient, entry.medId, entry.medName || entry.medId, 'Pflegekraft (Auto)', nowIso)
              nextPatient = {
                ...medApplied.patient,
                patientLog: [
                  ...(medApplied.patient.patientLog || []),
                  {
                    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    time: nowIso,
                    type: 'medication',
                    author: 'Pflegekraft',
                    text: `${entry.medName || entry.medId} automatisch verabreicht (${entry.dose || 'Standarddosis'})${medApplied.effectSummary ? ` — ${medApplied.effectSummary}` : ''}`,
                  },
                ],
              }
              changedAny = true
              activityEvents.push({
                time: nowIso,
                message: `💊 Automedikation: ${entry.medName || entry.medId} bei ${nextPatient.name} verabreicht.`,
              })
              return {
                ...entry,
                lastGivenAt: nowIso,
                nextDueAt: new Date(nowMs + intervalMs).toISOString(),
                administrations: (entry.administrations || 0) + 1,
              }
            })
            nextPatient = { ...nextPatient, medicationPlan: nextPlan }
          }
          return nextPatient
        })

        if (!changedAny && activityEvents.length === 0 && generatedAlerts.length === 0) return prev

        const sixHoursAgo = nowMs - 6 * 60 * 60000
        const existingAlerts = (prev.alertQueue || []).filter(alert => {
          const ts = Date.parse(alert.time || '')
          return Number.isFinite(ts) && ts >= sixHoursAgo
        })
        const mergedAlerts = [...existingAlerts]
        generatedAlerts.forEach(alert => {
          const duplicate = mergedAlerts.find(existing => {
            if (existing.patientId !== alert.patientId) return false
            if (existing.code !== alert.code) return false
            const existingTs = Date.parse(existing.time || '')
            const alertTs = Date.parse(alert.time || '')
            return Number.isFinite(existingTs) && Number.isFinite(alertTs) && Math.abs(alertTs - existingTs) < 8 * 60000
          })
          if (!duplicate) mergedAlerts.push(alert)
        })

        const nextAlertQueue = mergedAlerts
          .sort((a, b) => {
            const prioDiff = (b.priority || 0) - (a.priority || 0)
            if (prioDiff !== 0) return prioDiff
            return Date.parse(b.time || '') - Date.parse(a.time || '')
          })
          .slice(0, 30)

        const updated = {
          ...prev,
          balance: Math.max(0, Number(prev.balance || 0) - tickDamageCost),
          patients: nextPatients,
          ivenaQueue: remainingIvena,
          medicationInventory: inventory,
          alertQueue: nextAlertQueue,
          activityLog: [...activityEvents, ...prev.activityLog].slice(0, 50),
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })
    }, 60000)

    return () => { if (clinicalTickRef.current) { clearInterval(clinicalTickRef.current); clinicalTickRef.current = null } }
  }, [hospital?.id])

  // Background infusion/transfusion engine:
  // keeps material cart infusions running even when UI is closed and applies continuous hemodynamic effects.
  useEffect(() => {
    if (infusionTickRef.current) { clearInterval(infusionTickRef.current); infusionTickRef.current = null }
    if (!hospital?.id) return
    infusionTickRef.current = setInterval(() => {
      setHospital(prev => {
        if (!prev) return prev
        const nowIso = new Date().toISOString()
        const mlDeltaByPatient = {}
        const oxygenStateByPatient = {}
        const roomFallbackPatientId = {}
        ;(prev.patients || []).forEach((p) => {
          const rid = String(p?.assignedRoom || '')
          if (!rid) return
          if (!roomFallbackPatientId[rid]) roomFallbackPatientId[rid] = String(p?.id || '')
        })
        let anyRoomChanged = false
        let anyFluidDelivered = false
        const finishEvents = []

        const nextRooms = (prev.treatmentRooms || []).map(room => {
          const materialState = room?.equipmentState?.material_cart
          const oxygenState = room?.equipmentState?.oxygen
          const resolvedPatientId = String(room?.patientId || roomFallbackPatientId[String(room?.id || '')] || '')
          if (resolvedPatientId && oxygenState?.powered && oxygenState?.running) {
            oxygenStateByPatient[resolvedPatientId] = {
              modeId: String(oxygenState?.modeId || 'nasal_cannula').toLowerCase(),
              flow: Math.max(1, Math.min(80, Number(oxygenState?.settings?.flow || 2))),
              fio2: Math.max(21, Math.min(100, Number(oxygenState?.settings?.fio2 || 28))),
            }
          }
          const running = Array.isArray(materialState?.running) ? materialState.running : []
          if (running.length === 0) return room
          let roomChanged = false
          const nextRunning = running.map(item => {
            if (!item?.active || item?.paused) return item
            const rate = Math.max(20, Math.min(6000, Number(item.rate || 120)))
            const volume = Math.max(50, Number(item.volume || 500))
            const prevInfused = Number(item.infused || 0)
            const nextInfused = Math.min(volume, prevInfused + (rate / 3600))
            const delivered = Math.max(0, nextInfused - prevInfused)
            if (delivered > 0 && resolvedPatientId) {
              const key = resolvedPatientId
              const bucket = mlDeltaByPatient[key] || { crystalloidMl: 0, ekMl: 0, ffpMl: 0 }
              if (String(item.id || '').startsWith('transfusion_ek')) bucket.ekMl += delivered
              else if (String(item.id || '').startsWith('transfusion_ffp')) bucket.ffpMl += delivered
              else bucket.crystalloidMl += delivered
              mlDeltaByPatient[key] = bucket
              anyFluidDelivered = true
            }
            const stillActive = nextInfused < volume - 0.001
            if (stillActive !== !!item.active || Math.abs(nextInfused - prevInfused) > 0.001) roomChanged = true
            if (!stillActive && item.active && resolvedPatientId) {
              finishEvents.push({
                time: nowIso,
                message: `💧 ${item.label || item.id} bei Patient ${resolvedPatientId} beendet.`,
              })
            }
            return {
              ...item,
              infused: nextInfused,
              active: stillActive,
              paused: !!item.paused,
              finishedAt: stillActive ? item.finishedAt : (item.finishedAt || nowIso),
            }
          })
          if (!roomChanged) return room
          anyRoomChanged = true
          return {
            ...room,
            equipmentState: {
              ...(room.equipmentState || {}),
              material_cart: {
                ...(materialState || {}),
                running: nextRunning,
                updatedAt: nowIso,
              },
            },
          }
        })

        if (!anyRoomChanged && !anyFluidDelivered && Object.keys(oxygenStateByPatient).length === 0) return prev

        const nextPatients = (prev.patients || []).map(patient => {
          const key = String(patient?.id || '')
          const delta = mlDeltaByPatient[key]
          const oxygenCfg = oxygenStateByPatient[key]
          if (!delta && !oxygenCfg) return patient
          const vitals = ensureVitals(patient?.vitals)
          const clinical = ensureClinicalState(patient)
          const bp = parseBpString(vitals.bp)
          const resus = ensureResuscitationState(clinical?.resuscitation)
          const isDead = String(clinical?.outcome || '').toLowerCase() === 'dead' || String(resus?.status || '').toLowerCase() === 'dead'
          const activeArrest = !!resus?.active

          let nextClinical = { ...clinical, lastUpdatedAt: nowIso }
          let nextVitals = { ...vitals }
          const applySpo2Delta = (deltaValue) => {
            const delta = Number(deltaValue || 0)
            if (!Number.isFinite(delta) || Math.abs(delta) < 0.0001) return
            const carry = Number(nextClinical?.spo2Carry || 0)
            const current = Number(nextVitals?.spo2 || 0)
            const raw = Math.max(0, Math.min(100, current + delta + carry))
            const rounded = Math.round(raw)
            nextVitals = { ...nextVitals, spo2: rounded }
            nextClinical = { ...nextClinical, spo2Carry: raw - rounded }
          }

          if (delta) {
            const crystL = Number(delta.crystalloidMl || 0) / 1000
            const ekUnits = Number(delta.ekMl || 0) / 280
            const ffpUnits = Number(delta.ffpMl || 0) / 250

            const currentSys = Number(bp.sys || 120)
            const currentDia = Number(bp.dia || 75)
            const currentHr = Number(vitals.hr || 90)
            const carryHr = Number(clinical?.hrCarry || 0)
            const volumeDeficit = Math.max(0, -Number(clinical.volumeStatus || 0))
            const hypotensionDepth = Math.max(0, 95 - currentSys)
            const carrySys = Number(clinical?.fluidCarrySys || 0)
            const carryDia = Number(clinical?.fluidCarryDia || 0)
            // Fluid response is stronger when hypotension/volume deficit is present.
            const shockFactor = Math.min(1.8, 0.35 + hypotensionDepth / 35 + volumeDeficit / 6)
            const fluidResponsiveness = Math.min(1.2, Math.max(0, hypotensionDepth / 28 + volumeDeficit / 4.2))
            // Above normal pressure, the same fluid amount has less BP effect.
            const pressureDamping = currentSys >= 120
              ? Math.max(0.18, 1 - (currentSys - 120) / 90)
              : Math.min(1.35, 1 + (120 - currentSys) / 80)
            const highPressureGuard = currentSys >= 150
              ? Math.max(0, 1 - (currentSys - 150) / 32)
              : 1

            const hemoGain = crystL * (0.18 + 0.20 * shockFactor)
              + ekUnits * (0.28 + 0.12 * shockFactor)
              + ffpUnits * (0.18 + 0.10 * shockFactor)
            const sysGainRaw = (
              crystL * (9.0 + 19.0 * fluidResponsiveness)
              + ekUnits * (8.0 + 10.0 * fluidResponsiveness)
              + ffpUnits * (5.5 + 7.5 * fluidResponsiveness)
            ) * pressureDamping * highPressureGuard
            const diaGainRaw = (
              crystL * (4.5 + 9.2 * fluidResponsiveness)
              + ekUnits * (3.8 + 5.0 * fluidResponsiveness)
              + ffpUnits * (2.6 + 3.4 * fluidResponsiveness)
            ) * pressureDamping * highPressureGuard
            const sysGain = Math.max(-2.5, Math.min(16, sysGainRaw))
            const diaGain = Math.max(-1.8, Math.min(10, diaGainRaw))
            const hrDrop = crystL * (1.8 + 2.4 * shockFactor)
              + ekUnits * (1.4 + 1.6 * shockFactor)
              + ffpUnits * (1.0 + 1.2 * shockFactor)

            const volumeGain = crystL * (0.7 + 0.35 * shockFactor)
              + ekUnits * (0.65 + 0.25 * shockFactor)
              + ffpUnits * (0.5 + 0.2 * shockFactor)
            const spo2PerfusionGain = (currentSys < 95 || volumeDeficit > 1.2)
              ? Math.min(0.12, sysGain * 0.16)
              : 0
            const rawSys = currentSys + sysGain + carrySys
            const rawDia = currentDia + diaGain + carryDia
            const boundedRawSys = Math.max(55, Math.min(215, rawSys))
            const boundedRawDia = Math.max(30, Math.min(130, rawDia))
            const roundedSys = Math.round(boundedRawSys)
            const roundedDia = Math.round(boundedRawDia)

            nextClinical = {
              ...nextClinical,
              volumeStatus: Math.min(10, Number(nextClinical.volumeStatus || 0) + volumeGain),
              hemodynamics: Math.min(10, Number(nextClinical.hemodynamics || 0) + hemoGain),
              fluidCarrySys: boundedRawSys - roundedSys,
              fluidCarryDia: boundedRawDia - roundedDia,
            }
            const mapRise = Math.max(0, roundedSys - currentSys)
            const reflexHrDrop = mapRise * (currentHr >= 100 ? 0.34 : 0.2)
            const rawHr = currentHr - hrDrop - reflexHrDrop + carryHr
            const roundedHr = Math.round(Math.max(25, Math.min(220, rawHr)))
            nextVitals = {
              ...nextVitals,
              hr: roundedHr,
              bp: formatBpString(roundedSys, roundedDia),
            }
            nextClinical.hrCarry = rawHr - roundedHr
            applySpo2Delta(spo2PerfusionGain)
          }

          if (oxygenCfg && !isDead && !activeArrest) {
            const diagCode = String(patient?.trueDiagnoses?.primary?.code || patient?.diagnoses?.primary?.code || '').toUpperCase()
            const isCopd = diagCode.startsWith('J44')
            const targetSpo2 = isCopd ? 93 : 98
            const flowFactor = Math.min(1.5, 0.55 + Number(oxygenCfg.flow || 1) / 12)
            const fio2Factor = Math.min(1.7, 0.5 + (Number(oxygenCfg.fio2 || 21) - 21) / 40)
            const modeFactor = oxygenCfg.modeId === 'nasal_cannula' ? 0.8
              : oxygenCfg.modeId === 'simple_mask' ? 1.0
                : oxygenCfg.modeId === 'reservoir_mask' ? 1.2
                  : oxygenCfg.modeId === 'high_flow' ? 1.35
                    : oxygenCfg.modeId === 'bvm' ? 1.45
                      : oxygenCfg.modeId === 'intubation' ? 1.55
                        : 1.0
            const currentSpo2 = Number(nextVitals.spo2 || 0)
            const deficit = Math.max(0, targetSpo2 - currentSpo2)
            const gainPerSec = Math.min(1.4, (0.05 + deficit * 0.045) * flowFactor * fio2Factor * modeFactor)
            const rrDropPerSec = Math.min(0.35, (0.01 + deficit * 0.008) * modeFactor)
            applySpo2Delta(gainPerSec)
            nextVitals.rr = Math.max(6, Math.round(Number(nextVitals.rr || 16) - rrDropPerSec))
            nextClinical.dyspnea = Math.max(0, Number(nextClinical.dyspnea || 0) - Math.min(0.12, gainPerSec * 0.18))
            nextClinical.lastOxygenSupportAt = nowIso
            nextClinical.spo2Debug = {
              condition: isCopd ? 'copd' : 'oxygen_running',
              isCopdLike: isCopd,
              dynamicTarget: +targetSpo2.toFixed(1),
              minutesSinceO2: 0,
              currentSpo2Before: +currentSpo2.toFixed(1),
              trend: 'rising',
              appliedDelta: +gainPerSec.toFixed(2),
            }
          } else if (!oxygenCfg && !isDead && !activeArrest) {
            const diagCode = String(patient?.trueDiagnoses?.primary?.code || patient?.diagnoses?.primary?.code || '').toUpperCase()
            const isCopdLike = diagCode.startsWith('J44') || diagCode.startsWith('J45')
            const conditionKey = diagCode.startsWith('J') ? 'dyspnea'
              : diagCode.startsWith('A41') ? 'sepsis'
                : diagCode.startsWith('E86') ? 'dehydration'
                  : 'generic'
            const baselineTarget = isCopdLike ? 92
              : conditionKey === 'dyspnea' ? 93
                : conditionKey === 'sepsis' ? 94
                  : 96
            const dynamicTarget = Math.max(
              isCopdLike ? 88 : 90,
              Math.min(
                isCopdLike ? 94 : 98,
                baselineTarget
                  - Number(nextClinical.dyspnea || 0) * 0.45
                  - Number(nextClinical.infectionLoad || 0) * 0.25
                  + Number(nextClinical.hemodynamics || 0) * 0.12
              )
            )
            const lastO2Ms = Date.parse(nextClinical.lastOxygenSupportAt || '')
            const minutesSinceO2 = Number.isFinite(lastO2Ms) ? Math.max(0, (Date.now() - lastO2Ms) / 60000) : 999
            const currentSpo2 = Number(nextVitals.spo2 || 0)
            let trend = 'steady'
            let appliedDelta = 0
            if (minutesSinceO2 >= 0.2 && currentSpo2 > dynamicTarget + 0.2) {
              const excess = currentSpo2 - dynamicTarget
              const fallPerSec = Math.max(
                0.06,
                Math.min(
                  0.55,
                  0.03 + excess * 0.08 + (conditionKey === 'dyspnea' ? 0.06 : 0)
                )
              )
              applySpo2Delta(-fallPerSec)
              trend = 'falling'
              appliedDelta = -fallPerSec
            }
            nextClinical.spo2Debug = {
              condition: conditionKey,
              isCopdLike,
              dynamicTarget: +dynamicTarget.toFixed(1),
              minutesSinceO2: Number.isFinite(minutesSinceO2) ? +minutesSinceO2.toFixed(2) : null,
              currentSpo2Before: +currentSpo2.toFixed(1),
              trend,
              appliedDelta: +appliedDelta.toFixed(2),
            }
          }

          return {
            ...patient,
            vitals: nextVitals,
            clinicalState: nextClinical,
            therapyProgress: evaluateTherapyProgress({ ...patient, vitals: nextVitals, clinicalState: nextClinical }),
          }
        })

        const updated = {
          ...prev,
          treatmentRooms: nextRooms,
          patients: nextPatients,
          activityLog: finishEvents.length > 0 ? [...finishEvents, ...prev.activityLog].slice(0, 50) : prev.activityLog,
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })
    }, 1000)

    return () => {
      if (infusionTickRef.current) {
        clearInterval(infusionTickRef.current)
        infusionTickRef.current = null
      }
    }
  }, [hospital?.id])

  const hasPermission = useCallback((perm) => {
    if (!hospital || !user) return false
    const member = hospital.members?.find(m => m.userId === user.id)
    if (!member) return false
    const baseAllowed = member.role === 'owner' || member.permissions?.[perm] === true
    if (!baseAllowed) return false

    // Rank floor for hospital management/budget operations:
    // Assistenzarzt must not edit rooms/stations or spend hospital money.
    const rankLevel = Number(getCurrentRank(user)?.level || 1)
    const minRankByPermission = {
      manage_hospital: 2,
      manage_rooms: 2,
      manage_finances: 2,
    }
    const minRank = Number(minRankByPermission[perm] || 1)
    if (rankLevel < minRank) return false
    return true
  }, [hospital, user])

  const isOwner = useCallback(() => {
    return hospital?.ownerId === user?.id
  }, [hospital, user])

  const hasCapability = useCallback((capabilityId) => {
    return hasRankCapability(user, capabilityId)
  }, [user])

  const updateMemberPermissions = useCallback((userId, permissions) => {
    if (!hasCapability('manage_permissions')) return false
    if (!hasPermission('manage_permissions')) return false
    setHospital(prev => {
      const updated = { ...prev, members: prev.members.map(m => m.userId === userId ? { ...m, permissions: { ...m.permissions, ...permissions } } : m) }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return true
  }, [hasCapability, hasPermission])

  const setMemberRole = useCallback((userId, role) => {
    if (!hasCapability('promote_members')) return false
    if (!isOwner() && !hasPermission('manage_members')) return false
    setHospital(prev => {
      const perms = role === 'admin' ? { ...OWNER_PERMISSIONS, manage_permissions: false } : DEFAULT_PERMISSIONS
      const updated = { ...prev, members: prev.members.map(m => m.userId === userId && m.role !== 'owner' ? { ...m, role, permissions: perms } : m) }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return true
  }, [hasCapability, isOwner, hasPermission])

  const hireWorker = useCallback((typeId) => {
    if (!hasCapability('manage_staffing')) return { success: false, message: 'Benötigt Rang Oberarzt oder höher.' }
    if (!hasPermission('manage_staff')) return { success: false, message: 'Keine Berechtigung' }
    const wType = WORKER_TYPES.find(w => w.id === typeId)
    if (!wType) return { success: false, message: 'Unbekannter Arbeitertyp' }
    setHospital(prev => {
      if (!prev) return prev
      const worker = {
        id: 'w_' + Date.now(),
        typeId,
        name: wType.name,
        hiredAt: new Date().toISOString(),
        dailyCost: wType.costPerDay,
        stationId: typeId === 'sicherheitsdienst' ? 'er' : null,
      }
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - wType.hireCost,
        workers: [...prev.workers, worker],
        activityLog: [{ time: new Date().toISOString(), message: `${wType.name} wurde eingestellt (${wType.hireCost}€)` }, ...prev.activityLog.slice(0, 49)],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `${wType.name} einstellen`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      return withDebt
    })
    return { success: true, message: `${wType.name} wurde eingestellt!` }
  }, [hasCapability, hasPermission, user, withDebtSpendPopup])

  const fireWorker = useCallback((workerId) => {
    if (!hasCapability('manage_staffing')) return false
    if (!hasPermission('manage_staff')) return false
    setHospital(prev => {
      const worker = prev.workers.find(w => w.id === workerId)
      const updated = { ...prev, workers: prev.workers.filter(w => w.id !== workerId), activityLog: [{ time: new Date().toISOString(), message: `${worker?.name || 'Mitarbeiter'} wurde entlassen` }, ...prev.activityLog.slice(0, 49)] }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return true
  }, [hasCapability, hasPermission])

  const setWorkerStation = useCallback((workerId, stationId = null) => {
    if (!hasCapability('manage_staffing')) return { success: false, message: 'Benötigt Rang Oberarzt oder höher.' }
    if (!hasPermission('manage_staff')) return { success: false, message: 'Keine Berechtigung' }
    let changed = false
    setHospital(prev => {
      if (!prev) return prev
      const worker = (prev.workers || []).find(w => w.id === workerId)
      if (!worker) return prev
      if (worker.typeId !== 'sicherheitsdienst') return prev
      const nextStation = stationId ? String(stationId) : null
      if (worker.stationId === nextStation) return prev
      const updated = {
        ...prev,
        workers: (prev.workers || []).map(w => w.id === workerId ? { ...w, stationId: nextStation } : w),
        activityLog: [
          { time: new Date().toISOString(), message: `${worker.name || 'Sicherheitsdienst'} zugewiesen: ${nextStation ? `Station ${nextStation}` : 'keine Station'}` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      changed = true
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return changed ? { success: true } : { success: false, message: 'Zuweisung nicht geändert.' }
  }, [hasCapability, hasPermission])

  const triagePatient = useCallback((patientId, level, triageData) => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = prev.patients.find(p => p.id === patientId)
      if (!patient) return prev
      const nowIso = new Date().toISOString()
      const vitals = triageData?.vitals || patient.vitals || {
        hr: 75 + Math.floor(Math.random() * 30),
        bp: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
        rr: 14 + Math.floor(Math.random() * 8),
        temp: +(36.5 + Math.random() * 1.5).toFixed(1),
        spo2: 94 + Math.floor(Math.random() * 6),
      }
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          status: 'triaged',
          triaged: true,
          triageLevel: level,
          vitals,
          vitalsHistory: [...(p.vitalsHistory || []), { time: nowIso, source: 'triage', ...vitals }].slice(-240),
          clinicalState: {
            ...ensureClinicalState(p),
            lastUpdatedAt: nowIso,
          },
          careTeam: {
            primary: p.careTeam?.primary || user?.id || null,
            assistant: Array.isArray(p.careTeam?.assistant) ? p.careTeam.assistant : (p.careTeam?.assistant ? [p.careTeam.assistant] : []),
            supervisor: p.careTeam?.supervisor || null,
          },
          bloodDrawn: triageData?.bloodDrawn || false,
          painLevel: triageData?.painLevel ?? null,
          allergies: triageData?.allergies ?? p.allergies ?? null,
          medications: triageData?.medications ?? p.medications ?? null,
          pastHistory: triageData?.pastHistory ?? p.pastHistory ?? null,
          lastMeal: triageData?.lastMeal ?? p.lastMeal ?? null,
          chatData: {
            ...(p.chatData || {}),
            painLevel: triageData?.painLevel ?? p.chatData?.painLevel ?? null,
            allergies: triageData?.allergies ?? p.chatData?.allergies ?? p.allergies ?? null,
            medications: triageData?.medications ?? p.chatData?.medications ?? p.medications ?? null,
            pastHistory: triageData?.pastHistory ?? p.chatData?.pastHistory ?? p.pastHistory ?? null,
            lastMeal: triageData?.lastMeal ?? p.chatData?.lastMeal ?? p.lastMeal ?? null,
          },
          notes: triageData?.notes ? [...(p.notes || []), { text: triageData.notes, time: new Date().toISOString(), type: 'triage' }] : p.notes,
          examResults: [
            ...(p.examResults || []),
            ...((triageData?.examResults || []).map(r => ({
              ...r,
              time: r.time || new Date().toISOString(),
              author: user?.name || 'Arzt',
            }))),
          ],
          patientLog: [
            ...(p.patientLog || []),
            {
              time: new Date().toISOString(),
              type: 'triage',
              author: user?.name || 'Triage',
              text: `Triage abgeschlossen (${TRIAGE_LEVELS.find(t => t.id === level)?.name || level})`,
            },
            ...(triageData?.notes ? [{
              time: new Date().toISOString(),
              type: 'note',
              author: user?.name || 'Triage',
              text: triageData.notes,
            }] : []),
            ...((triageData?.examResults || []).map(r => ({
              time: r.time || new Date().toISOString(),
              type: 'physical_exam',
              author: user?.name || 'Arzt',
              text: `Körperliche Untersuchung: ${r.title || 'Befund'}${r.summary ? ` — ${r.summary}` : ''}`,
            }))),
          ],
        } : p),
        activityLog: [
          { time: new Date().toISOString(), message: `${patient.name} triagiert als "${TRIAGE_LEVELS.find(t => t.id === level)?.name}"` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name, user?.id])

  const addPatientExamResult = useCallback((patientId, result) => {
    if (!result || !patientId) return
    if (result.subtype === 'auscultation') addSpecialtyAction('auscultations', 1)
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          examResults: [
            ...(p.examResults || []),
            {
              ...result,
              time: result.time || new Date().toISOString(),
              author: user?.name || 'Arzt',
            },
          ],
          patientLog: [
            ...(p.patientLog || []),
            {
              time: result.time || new Date().toISOString(),
              type: 'physical_exam',
              author: user?.name || 'Arzt',
              text: `Körperliche Untersuchung: ${result.title || 'Befund'}${result.summary ? ` — ${result.summary}` : ''}`,
            },
          ],
        } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name, addSpecialtyAction])

  const moveToWaiting = useCallback((patientId) => {
    if (!hospital?.rooms?.some(r => r.id === 'waiting_room')) {
      return { success: false, message: 'Für diese Aktion muss zuerst ein Wartezimmer gebaut werden.' }
    }
    let moved = false
    setHospital(prev => {
      if (!prev) return prev
      if (!prev.rooms?.some(r => r.id === 'waiting_room')) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? { ...p, status: 'waiting', assignedRoom: null, statusChangedAt: new Date().toISOString() } : p),
      }
      moved = true
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return moved ? { success: true } : { success: false, message: 'Patient konnte nicht verschoben werden.' }
  }, [hospital?.rooms])

  const moveToTreatment = useCallback((patientId, roomId) => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = { ...prev, patients: prev.patients.map(p => p.id === patientId ? { ...p, status: 'in_treatment', assignedRoom: roomId, treatedAt: new Date().toISOString() } : p) }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const dischargePatient = useCallback((patientId) => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = prev.patients.find(p => p.id === patientId)
      const updated = { ...prev, patients: prev.patients.filter(p => p.id !== patientId), activityLog: [{ time: new Date().toISOString(), message: `${patient?.name || 'Patient'} wurde entlassen` }, ...prev.activityLog.slice(0, 49)] }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const addRoom = useCallback((roomId) => {
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }
    const baseBuildCost = Number(ROOM_BUILD_COSTS[roomId] || 0)
    const roomDiscountPct = getRoomDiscountPct(user)
    const buildCost = Math.max(0, Math.round(baseBuildCost * (1 - roomDiscountPct / 100)))
    let created = false
    setHospital(prev => {
      if (!prev || prev.rooms.some(r => r.id === roomId)) return prev
      const shouldBootstrapErRoom = roomId === 'er' && (prev.treatmentRooms || []).length === 0
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - buildCost,
        rooms: [...prev.rooms, { id: roomId, level: 1, condition: 100, patients: [] }],
        treatmentRooms: shouldBootstrapErRoom ? [...(prev.treatmentRooms || []), buildDefaultErTreatmentRoom()] : (prev.treatmentRooms || []),
        activityLog: [{ time: new Date().toISOString(), message: `Neuer Raum gebaut: ${roomId} (${buildCost.toLocaleString('de-DE')}€${roomDiscountPct > 0 ? `, -${roomDiscountPct}%` : ''})` }, ...prev.activityLog.slice(0, 49)],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `Station ${roomId}`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      created = true
      return withDebt
    })
    return created ? { success: true } : { success: false, message: 'Raum konnte nicht gebaut werden.' }
  }, [hasCapability, hasPermission, user, withDebtSpendPopup])

  const removeRoom = useCallback((roomId) => {
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }
    if (!roomId) return { success: false, message: 'Ungültiger Raum.' }
    let removed = false
    setHospital(prev => {
      if (!prev) return prev
      const roomExists = (prev.rooms || []).some(r => r.id === roomId)
      if (!roomExists) return prev
      const hasLinkedTreatmentRooms = (prev.treatmentRooms || []).some(r => r.station === roomId)
      if (hasLinkedTreatmentRooms) return prev
      const baseRefund = Math.round(Number(ROOM_BUILD_COSTS[roomId] || 0) * 0.4)
      const stationEquipIds = (prev.stationEquipment || {})[roomId] || []
      const stationEquipRefund = stationEquipIds.reduce((sum, eqId) => {
        const eq = EQUIPMENT.find(item => item.id === eqId)
        return sum + Math.round(Number(eq?.cost || 0) * 0.35)
      }, 0)
      const refund = Math.max(0, baseRefund + stationEquipRefund)
      const nextStationEquipment = { ...(prev.stationEquipment || {}) }
      delete nextStationEquipment[roomId]
      const nextSonoDeployment = { ...(prev.mobileSonoDeployment || {}) }
      delete nextSonoDeployment[roomId]
      const updated = {
        ...prev,
        balance: Number(prev.balance || 0) + refund,
        rooms: (prev.rooms || []).filter(r => r.id !== roomId),
        stationEquipment: nextStationEquipment,
        mobileSonoDeployment: nextSonoDeployment,
        activityLog: [
          { time: new Date().toISOString(), message: `Raum/Station abgerissen: ${roomId} (+${refund.toLocaleString('de-DE')}€ Rückerstattung)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      removed = true
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return removed ? { success: true } : { success: false, message: 'Abriss nicht möglich (prüfe verknüpfte Zimmer).' }
  }, [hasCapability, hasPermission])

  const addTreatmentRoom = useCallback((name, station, options = {}) => {
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }
    if (NON_TREATMENT_ROOM_STATIONS.has(station)) {
      return { success: false, message: 'Für Diagnostikstationen werden keine Behandlungszimmer gebaut.' }
    }
    const roomType = options?.roomType === 'shock' ? 'shock' : 'standard'
    if (roomType === 'shock' && station !== 'er') {
      return { success: false, message: 'Schockräume sind nur in der Notaufnahme verfügbar.' }
    }
    const baseRoomCost = roomType === 'shock' ? SHOCK_ROOM_COST : TREATMENT_ROOM_COST
    const roomDiscountPct = getRoomDiscountPct(user)
    const roomCost = Math.max(0, Math.round(baseRoomCost * (1 - roomDiscountPct / 100)))
    setHospital(prev => {
      if (!prev) return prev
      const hasErStation = (prev.rooms || []).some(r => r.id === 'er')
      if (roomType === 'shock' && !hasErStation) return prev
      const roomNum = (prev.treatmentRooms?.length || 0) + 1
      const defaultEquipment = roomType === 'shock' ? [...SHOCK_ROOM_DEFAULT_EQUIPMENT] : []
      const medicationTopup = roomType === 'shock' ? SHOCK_ROOM_AUTO_MEDICATIONS : null
      const nextMedicationInventory = { ...(prev.medicationInventory || {}) }
      if (medicationTopup) {
        Object.entries(medicationTopup).forEach(([medId, qty]) => {
          const current = Number(nextMedicationInventory[medId] || 0)
          nextMedicationInventory[medId] = current + Number(qty || 0)
        })
      }
      const newRoom = {
        id: `tr_${Date.now()}`,
        name: name || (roomType === 'shock' ? `Schockraum ${roomNum}` : `Zimmer ${roomNum}`),
        station: station || 'er',
        roomType,
        equipment: defaultEquipment,
        equipmentState: {},
        patientId: null,
        builtAt: new Date().toISOString(),
      }
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - roomCost,
        medicationInventory: nextMedicationInventory,
        treatmentRooms: [...(prev.treatmentRooms || []), newRoom],
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `Neues ${roomType === 'shock' ? 'Schockraum-' : ''}Behandlungszimmer gebaut: ${newRoom.name} (${station === 'er' ? 'Notaufnahme' : station === 'ward' ? 'Station' : station === 'icu' ? 'Intensiv' : station})`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `${roomType === 'shock' ? 'Schockraum' : 'Behandlungszimmer'} bauen`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      return withDebt
    })
    return { success: true }
  }, [hasCapability, hasPermission, user, withDebtSpendPopup])

  const addEquipmentToRoom = useCallback((treatmentRoomId, equipmentId) => {
    const eq = EQUIPMENT.find(e => e.id === equipmentId)
    if (!eq) return { success: false, message: 'Unbekanntes Gerät' }
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }
    if (equipmentId === 'ultrasound_portable') {
      return { success: false, message: 'Mobiles Sono ist ein Stationsgerät und wird nicht fest im Zimmer installiert.' }
    }
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - eq.cost,
        treatmentRooms: (prev.treatmentRooms || []).map(r => r.id === treatmentRoomId
          ? { ...r, equipment: [...(r.equipment || []), equipmentId], equipmentState: r.equipmentState || {} }
          : r
        ),
        activityLog: [
          { time: new Date().toISOString(), message: `${eq.name} installiert (${eq.cost.toLocaleString('de-DE')}€)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `${eq.name} installieren`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      return withDebt
    })
    return { success: true }
  }, [hasCapability, hasPermission, withDebtSpendPopup])

  const purchaseStationEquipment = useCallback((stationId, equipmentId) => {
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }
    const eq = EQUIPMENT.find(e => e.id === equipmentId)
    if (!eq) return { success: false, message: 'Unbekanntes Gerät' }
    if (!eq.rooms?.includes(stationId)) return { success: false, message: 'Gerät passt nicht zu dieser Station' }

    let alreadyPurchased = false
    setHospital(prev => {
      if (!prev) return prev
      const current = new Set(prev.stationEquipment?.[stationId] || [])
      if (current.has(equipmentId)) {
        alreadyPurchased = true
        return prev
      }
      current.add(equipmentId)
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - eq.cost,
        stationEquipment: {
          ...(prev.stationEquipment || {}),
          [stationId]: [...current],
        },
        activityLog: [
          { time: new Date().toISOString(), message: `${eq.name} für Station ${stationId} gekauft (${eq.cost.toLocaleString('de-DE')}€)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `${eq.name} kaufen`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      return withDebt
    })

    if (alreadyPurchased) return { success: false, message: 'Gerät bereits vorhanden' }
    return { success: true }
  }, [hasCapability, hasPermission, withDebtSpendPopup])

  const removeEquipmentFromRoom = useCallback((treatmentRoomId, equipmentId) => {
    const eq = EQUIPMENT.find(e => e.id === equipmentId)
    if (!eq) return { success: false, message: 'Unbekanntes Gerät' }
    if (!hasCapability('manage_rooms_basic')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    if (!hasPermission('manage_rooms')) return { success: false, message: 'Keine Berechtigung' }

    let removed = false
    setHospital(prev => {
      if (!prev) return prev
      const updatedRooms = (prev.treatmentRooms || []).map(room => {
        if (room.id !== treatmentRoomId) return room
        const equipment = Array.isArray(room.equipment) ? [...room.equipment] : []
        const idx = equipment.lastIndexOf(equipmentId)
        if (idx < 0) return room
        equipment.splice(idx, 1)
        removed = true
        const nextEqState = { ...(room.equipmentState || {}) }
        if (!equipment.includes(equipmentId)) delete nextEqState[equipmentId]
        return { ...room, equipment, equipmentState: nextEqState }
      })
      if (!removed) return prev

      const refund = Math.max(0, Math.round((eq.cost || 0) * 0.35))
      const updated = {
        ...prev,
        balance: (prev.balance || 0) + refund,
        treatmentRooms: updatedRooms,
        activityLog: [
          { time: new Date().toISOString(), message: `${eq.name} abgebaut (+${refund.toLocaleString('de-DE')}€ Rückerstattung)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return removed ? { success: true } : { success: false, message: 'Gerät nicht gefunden' }
  }, [hasCapability, hasPermission])

  const updateTreatmentRoomEquipmentState = useCallback((treatmentRoomId, equipmentId, equipmentStatePatch) => {
    if (!treatmentRoomId || !equipmentId) return
    setHospital(prev => {
      if (!prev) return prev
      let changed = false
      const updated = {
        ...prev,
        treatmentRooms: (prev.treatmentRooms || []).map(room => {
          if (room.id !== treatmentRoomId) return room
          const prevState = room.equipmentState || {}
          const nextState = {
            ...prevState,
            [equipmentId]: {
              ...(prevState[equipmentId] || {}),
              ...(equipmentStatePatch || {}),
              updatedAt: new Date().toISOString(),
            },
          }
          changed = true
          return { ...room, equipmentState: nextState }
        }),
      }
      if (!changed) return prev
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const assignPatientToTreatmentRoom = useCallback((patientId, treatmentRoomId) => {
    setHospital(prev => {
      if (!prev) return prev
      const room = prev.treatmentRooms?.find(r => r.id === treatmentRoomId)
      if (!room || room.patientId) return prev
      const patient = prev.patients.find(p => p.id === patientId)
      const previousRoomId = patient?.assignedRoom || null
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          status: 'in_treatment',
          assignedRoom: treatmentRoomId,
          treatedAt: new Date().toISOString(),
          careTeam: {
            primary: p.careTeam?.primary || user?.id || null,
            assistant: Array.isArray(p.careTeam?.assistant) ? p.careTeam.assistant : (p.careTeam?.assistant ? [p.careTeam.assistant] : []),
            supervisor: p.careTeam?.supervisor || null,
          },
          patientLog: [
            ...(p.patientLog || []),
            {
              time: new Date().toISOString(),
              type: 'transfer',
              author: user?.name || 'System',
              text: `In ${room.name} verlegt`,
            },
          ],
        } : p),
        treatmentRooms: prev.treatmentRooms.map(r => {
          if (r.id === treatmentRoomId) return { ...r, patientId }
          if (previousRoomId && r.id === previousRoomId) return { ...r, patientId: null, equipmentState: {} }
          return r
        }),
        activityLog: [
          { time: new Date().toISOString(), message: `${patient?.name || 'Patient'} in ${room.name} verlegt` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name, user?.id])

  const removePatientFromRoom = useCallback((treatmentRoomId) => {
    setHospital(prev => {
      if (!prev) return prev
      const room = prev.treatmentRooms?.find(r => r.id === treatmentRoomId)
      if (!room?.patientId) return prev
      const updated = {
        ...prev,
        treatmentRooms: prev.treatmentRooms.map(r => r.id === treatmentRoomId ? { ...r, patientId: null, equipmentState: {} } : r),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const toggleClosed = useCallback(() => {
    if (!hasCapability('close_hospital_intake')) return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    setHospital(prev => {
      if (!prev) return prev
      const newClosed = !prev.isClosed
      const updated = {
        ...prev,
        isClosed: newClosed,
        closedAt: newClosed ? new Date().toISOString() : null,
        closureFines: newClosed ? 0 : prev.closureFines,
        activityLog: [
          { time: new Date().toISOString(), message: newClosed ? '🔴 Krankenhaus für neue Patienten GESCHLOSSEN' : '🟢 Krankenhaus für neue Patienten GEÖFFNET' },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [hasCapability])

  const dismissEvent = useCallback(() => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = { ...prev, activeEvent: null }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const dismissAlert = useCallback((alertId) => {
    if (!alertId) return
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        alertQueue: (prev.alertQueue || []).filter(alert => alert.id !== alertId),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const sendPagerMessage = useCallback((toUserId, text) => {
    const body = String(text || '').trim()
    if (!body) return { success: false, message: 'Leere Nachricht' }
    setHospital(prev => {
      if (!prev) return prev
      const toMember = (prev.members || []).find(m => m.userId === toUserId)
      const entry = {
        id: 'pg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        time: new Date().toISOString(),
        fromUserId: user?.id || null,
        fromName: user?.name || 'Unbekannt',
        toUserId: toUserId || null,
        toName: toMember?.name || 'Team',
        text: body,
      }
      const updated = {
        ...prev,
        pagerMessages: [entry, ...(prev.pagerMessages || [])].slice(0, 120),
        activityLog: [
          { time: entry.time, message: `📟 Pager: ${entry.fromName} → ${entry.toName}: ${body}` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [user?.id, user?.name])

  const leaveHospital = useCallback(() => {
    if (isOwner()) return { success: false, message: 'Als Inhaber kannst du dein Krankenhaus nicht verlassen. Übertrage zuerst die Leitung.' }
    setHospital(prev => {
      if (!prev) return prev
      const updated = { ...prev, members: prev.members.filter(m => m.userId !== user?.id), activityLog: [{ time: new Date().toISOString(), message: `${user?.name} hat das Krankenhaus verlassen` }, ...prev.activityLog.slice(0, 49)] }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    updateUser({ hospitalId: null, hospitalName: null, ownedHospital: null })
    return { success: true, message: 'Du hast das Krankenhaus verlassen.' }
  }, [isOwner, user, updateUser])

  const disbandHospital = useCallback(() => {
    if (!isOwner()) return { success: false, message: 'Nur der Inhaber kann das Krankenhaus auflösen.' }
    if (hospital?.id) localStorage.removeItem('medisim_hospital_' + hospital.id)
    setHospital(null)
    updateUser({ hospitalId: null, hospitalName: null, ownedHospital: null })
    return { success: true, message: 'Krankenhaus aufgelöst.' }
  }, [isOwner, hospital, updateUser])

  const updateHospitalSettings = useCallback((settings) => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = { ...prev, settings: { ...prev.settings, ...settings } }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Hospital bank account
  const depositToHospital = useCallback((amount) => {
    if (!amount || amount <= 0) return { success: false, message: 'Ungültiger Betrag' }
    if ((user?.wallet || 0) < amount) return { success: false, message: 'Nicht genug persönliches Guthaben' }
    addMoney(-amount)
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        balance: (prev.balance || 0) + amount,
        activityLog: [
          { time: new Date().toISOString(), message: `💰 ${user?.name} hat ${amount.toLocaleString('de-DE')}€ auf das Krankenhauskonto eingezahlt` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [user, addMoney])

  const takeLoan = useCallback((amount, interestRate, termDays) => {
    if (!hasCapability('manage_hospital_strategy')) return { success: false, message: 'Benötigt Rang Chefarzt.' }
    setHospital(prev => {
      if (!prev) return prev
      const loan = {
        id: 'loan_' + Date.now(),
        amount,
        interestRate,
        termDays,
        totalDue: Math.round(amount * (1 + interestRate / 100)),
        takenAt: new Date().toISOString(),
        paid: false,
      }
      const updated = {
        ...prev,
        balance: (prev.balance || 0) + amount,
        loans: [...(prev.loans || []), loan],
        activityLog: [
          { time: new Date().toISOString(), message: `🏦 Kredit aufgenommen: ${amount.toLocaleString('de-DE')}€ (${interestRate}% Zinsen, ${termDays} Tage)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [hasCapability])

  const repayLoan = useCallback((loanId) => {
    if (!hasCapability('manage_hospital_strategy')) return { success: false, message: 'Benötigt Rang Chefarzt.' }
    setHospital(prev => {
      if (!prev) return prev
      const loan = prev.loans?.find(l => l.id === loanId)
      if (!loan || loan.paid) return prev
      if ((prev.balance || 0) < loan.totalDue) return prev
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - loan.totalDue,
        loans: prev.loans.map(l => l.id === loanId ? { ...l, paid: true } : l),
        activityLog: [
          { time: new Date().toISOString(), message: `🏦 Kredit zurückgezahlt: ${loan.totalDue.toLocaleString('de-DE')}€` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [hasCapability])

  const updateRevenueDistribution = useCallback((distribution) => {
    if (!hasCapability('manage_hospital_strategy')) return { success: false, message: 'Benötigt Rang Chefarzt.' }
    if (!hasPermission('manage_finances')) return { success: false, message: 'Keine Berechtigung' }
    const raw = {
      primary: Math.max(0, Math.floor(Number(distribution?.primary || 0))),
      assistant: Math.max(0, Math.floor(Number(distribution?.assistant || 0))),
      hospital: Math.max(0, Math.floor(Number(distribution?.hospital || 0))),
      supervisor: Math.max(0, Math.floor(Number(distribution?.supervisor || 0))),
    }
    const sum = raw.primary + raw.assistant + raw.hospital + raw.supervisor
    if (sum !== 100) return { success: false, message: `Die Summe muss exakt 100% ergeben (aktuell ${sum}%).` }
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        revenueDistribution: raw,
        activityLog: [
          { time: new Date().toISOString(), message: `💶 Vergütungsverteilung aktualisiert (HB ${raw.primary}%, NB ${raw.assistant}%, KH ${raw.hospital}%, SV ${raw.supervisor}%).` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true, distribution: raw }
  }, [hasCapability, hasPermission])

  // Dev tools
  const devSpawnPatient = useCallback((type) => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = generatePatient(type)
      const updated = {
        ...prev,
        patients: [...prev.patients, patient],
        activityLog: [
          { time: new Date().toISOString(), message: `[DEV] ${patient.name} manuell hinzugefügt (${type})` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const devSpawnTemplatePatient = useCallback((specialty, diagnosisCode, arrivalType) => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = generatePatientByDiagnosis(specialty, diagnosisCode, arrivalType)
      const updated = {
        ...prev,
        patients: [...prev.patients, patient],
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `[DEV] Template-Patient hinzugefügt (${specialty} • ${diagnosisCode} • ${patient.arrivalType})`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const devSpawnCtPreviewPatient = useCallback((region = 'kopf', options = {}) => {
    let result = { success: false, message: 'CT-Vorschau konnte nicht erstellt werden.' }
    const mode = String(options?.mode || 'pathologic').toLowerCase() === 'healthy' ? 'healthy' : 'pathologic'
    const requestedPreset = String(options?.preset || '').trim().toLowerCase()
    const regionConfig = {
      kopf: {
        protocol: 'ct_schaedel',
        label: 'Kopf',
        healthy: { specialty: 'neurologie', diagnosisCode: 'R51' },
        pathological: {
          defaultPreset: 'bleed',
          byPreset: {
            bleed: { specialty: 'neurologie', diagnosisCode: 'I61.9' },
            ischemia: { specialty: 'neurologie', diagnosisCode: 'I63.9' },
          },
        },
      },
      thorax: {
        protocol: 'ct_thorax',
        label: 'Thorax',
        healthy: { specialty: 'pneumologie', diagnosisCode: 'J06.9' },
        pathological: {
          defaultPreset: 'pneumonia',
          byPreset: {
            pneumonia: { specialty: 'pneumologie', diagnosisCode: 'J18.9' },
            pneumothorax: { specialty: 'pneumologie', diagnosisCode: 'I26.9' },
          },
        },
      },
      abdomen: {
        protocol: 'ct_abdomen',
        label: 'Abdomen',
        healthy: { specialty: 'chirurgie', diagnosisCode: 'R10.4' },
        pathological: {
          defaultPreset: 'appendicitis',
          byPreset: {
            appendicitis: { specialty: 'chirurgie', diagnosisCode: 'K35.8' },
            pancreatitis: { specialty: 'innere', diagnosisCode: 'K85.9' },
            ileus: { specialty: 'chirurgie', diagnosisCode: 'K56.6' },
          },
        },
      },
    }
    const cfg = regionConfig[String(region || '').toLowerCase()] || regionConfig.kopf
    const pathologyPreset = mode === 'pathologic'
      ? (cfg.pathological.byPreset[requestedPreset] ? requestedPreset : cfg.pathological.defaultPreset)
      : ''
    const patientBlueprint = mode === 'healthy'
      ? cfg.healthy
      : (cfg.pathological.byPreset[pathologyPreset] || cfg.healthy)
    setHospital(prev => {
      if (!prev) {
        result = { success: false, message: 'Krankenhaus nicht geladen.' }
        return prev
      }
      const hasRadiology = (prev.rooms || []).some(r => String(r?.id || '') === 'radiology')
      if (!hasRadiology) {
        result = { success: false, message: 'Radiologie ist nicht gebaut.' }
        return prev
      }
      const ownedRadiologyEquipment = (prev.stationEquipment || {}).radiology || []
      if (!ownedRadiologyEquipment.includes('ct_scanner')) {
        result = { success: false, message: 'CT-Scanner ist in der Radiologie nicht vorhanden.' }
        return prev
      }
      const nowIso = new Date().toISOString()
      const patient = generatePatientByDiagnosis(patientBlueprint.specialty, patientBlueprint.diagnosisCode, 'walk_in')
      const order = {
        id: 'ord_devct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        modality: 'ct',
        title: `CT ${cfg.label} (DEV Preview)`,
        station: 'radiology',
        category: 'Radiologie',
        bodyPart: cfg.label,
        requiredEquipment: 'ct_scanner',
        status: 'in_progress',
        notes: `DEV CT Preview (${cfg.label})`,
        createdAt: nowIso,
        createdBy: user?.name || 'Arzt',
        assignedTo: user?.name || 'Arzt',
        assignedToId: user?.id || null,
        acceptedAt: nowIso,
        startedAt: nowIso,
        completedAt: null,
        result: null,
        controls: {
          protocol: cfg.protocol,
          source: 'dev_ct_preview',
          ctForceBucket: mode === 'healthy' ? 'gesund' : 'krank',
          ctForcePreset: pathologyPreset || null,
        },
      }
      const devPatient = {
        ...patient,
        status: 'in_diagnostics',
        assignedRoom: null,
        previousTreatmentRoomId: null,
        diagnosticStation: 'radiology',
        diagnosticEquipment: 'ct_scanner',
        orders: [...(patient.orders || []), order],
        patientLog: [
          ...(patient.patientLog || []),
          {
            time: nowIso,
            type: 'dev',
            author: user?.name || 'DEV',
            text: `[DEV] CT Preview gestartet (${cfg.label})`,
          },
        ],
      }
      const updated = {
        ...prev,
        patients: [...(prev.patients || []), devPatient],
        activityLog: [
          { time: nowIso, message: `🧪 [DEV] CT-Preview geöffnet (${cfg.label})` },
          ...(prev.activityLog || []).slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = {
        success: true,
        patientId: devPatient.id,
        roomId: 'radiology_ct_scanner',
        region: String(region || 'kopf').toLowerCase(),
        protocol: cfg.protocol,
        mode,
        preset: pathologyPreset || null,
      }
      return updated
    })
    return result
  }, [user?.id, user?.name])

  const devRemovePatientById = useCallback((patientId, reason = 'DEV-Patient entfernt.') => {
    if (!patientId) return { success: false, message: 'Patient-ID fehlt.' }
    let removed = false
    let removedName = ''
    setHospital(prev => {
      if (!prev) return prev
      const target = (prev.patients || []).find(p => p.id === patientId)
      if (!target) return prev
      removed = true
      removedName = target.name || String(patientId)
      const updated = {
        ...prev,
        patients: (prev.patients || []).filter(p => p.id !== patientId),
        treatmentRooms: (prev.treatmentRooms || []).map(room => (
          room?.patientId === patientId ? { ...room, patientId: null, equipmentState: {} } : room
        )),
        alertQueue: (prev.alertQueue || []).filter(alert => (
          alert?.patientId !== patientId
          && alert?.targetId !== patientId
          && alert?.payload?.patientId !== patientId
        )),
        activityLog: [
          { time: new Date().toISOString(), message: `🧪 [DEV] ${reason} (${removedName})` },
          ...(prev.activityLog || []).slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return removed
      ? { success: true, message: `${removedName} entfernt.` }
      : { success: false, message: 'Patient wurde nicht gefunden.' }
  }, [])

  const devSpawnSpecialPatient = useCallback((arrivalType, specialType) => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = generatePatient(arrivalType || 'walk_in', { forceSpecialType: specialType })
      const updated = {
        ...prev,
        patients: [...prev.patients, patient],
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `[DEV] Spezialpatient gespawnt (${specialType || 'default'} • ${patient.arrivalType})`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const devTriggerMassEvent = useCallback(() => {
    const event = MASS_CASUALTY_EVENTS[Math.floor(Math.random() * MASS_CASUALTY_EVENTS.length)]
    const count = event.patientMin + Math.floor(Math.random() * (event.patientMax - event.patientMin + 1))

    setTimeout(() => {
      setHospital(prev => {
        if (!prev) return prev
        const plan = buildManvEventPlan(event, count)
        const updated = {
          ...prev,
          patients: [...prev.patients, ...plan.immediatePatients],
          ivenaQueue: [...plan.ivenaBatch, ...(prev.ivenaQueue || [])].slice(0, 45),
          activeEvent: {
            ...event,
            id: `manv_dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            patientCount: count,
            immediateCount: plan.immediatePatients.length,
            timestamp: new Date().toISOString(),
            callActive: true,
            callEndsAt: new Date(Date.now() + (2 + Math.floor(Math.random() * 2)) * 60000).toISOString(),
            source: 'dev',
            incidentFacts: plan.incidentFacts,
          },
          activityLog: [
            { time: new Date().toISOString(), message: `⚠️ [DEV] GROSSEREIGNIS: ${event.title} — Leitstellenanruf gestartet, ${plan.immediatePatients.length} Fußläufige sofort.` },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
        return updated
      })
      setTimeout(() => {
        setHospital(prev => {
          if (!prev) return prev
          const updated = prev.activeEvent
            ? { ...prev, activeEvent: { ...prev.activeEvent, callActive: false } }
            : prev
          localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
          return updated
        })
      }, 180000)
    }, 5000)
  }, [])

  const devSpawnIvenaPrealert = useCallback(() => {
    setHospital(prev => {
      if (!prev) return prev
      const patient = generatePatient('ambulance')
      const nowMs = Date.now()
      const etaMinutes = 4 + Math.floor(Math.random() * 17)
      const preannounce = {
        id: 'ivena_dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date(nowMs).toISOString(),
        etaAt: new Date(nowMs + etaMinutes * 60000).toISOString(),
        etaMinutes,
        patient,
        dispatch: ['RTW 3/83-1', 'RTW 5/83-2', 'NEF 1/82-1'][Math.floor(Math.random() * 3)],
        priority: patient.suggestedTriage || 'yellow',
        note: patient.preInfo || 'Präklinische Versorgung läuft, Übergabe bei Eintreffen.',
      }
      const updated = {
        ...prev,
        ivenaQueue: [preannounce, ...(prev.ivenaQueue || [])].slice(0, 20),
        activityLog: [
          { time: new Date().toISOString(), message: `📡 [DEV] Leitnetz-Voranmeldung erstellt (${preannounce.dispatch}, ETA ${etaMinutes} Min.)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const devSkipTime = useCallback((hours = 1) => {
    const h = Math.max(0, Number(hours || 0))
    if (!Number.isFinite(h) || h <= 0) return { success: false, message: 'Ungültige Stundenangabe.' }
    const deltaMs = Math.round(h * 3600 * 1000)
    setHospital(prev => {
      if (!prev) return prev
      const shiftIso = (iso) => {
        const ts = Date.parse(iso || '')
        if (!Number.isFinite(ts)) return iso || null
        return new Date(Math.max(0, ts - deltaMs)).toISOString()
      }
      const updated = {
        ...prev,
        ivenaQueue: (prev.ivenaQueue || []).map((entry) => ({
          ...entry,
          createdAt: shiftIso(entry.createdAt),
          etaAt: shiftIso(entry.etaAt),
        })),
        activeEvent: prev.activeEvent
          ? {
            ...prev.activeEvent,
            timestamp: shiftIso(prev.activeEvent.timestamp),
            callEndsAt: shiftIso(prev.activeEvent.callEndsAt),
          }
          : null,
        loans: (prev.loans || []).map((loan) => ({
          ...loan,
          takenAt: shiftIso(loan.takenAt),
        })),
        activityLog: [
          { time: new Date().toISOString(), message: `[DEV] Zeitübersprung: +${h}h simuliert.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    const special = user?.specialState && typeof user.specialState === 'object' ? user.specialState : null
    if (special?.activeUtilityPass?.expiresAt) {
      const ts = Date.parse(special.activeUtilityPass.expiresAt)
      if (Number.isFinite(ts)) {
        updateUser({
          specialState: {
            ...special,
            activeUtilityPass: {
              ...special.activeUtilityPass,
              expiresAt: new Date(Math.max(0, ts - deltaMs)).toISOString(),
            },
          },
        })
      }
    }
    return { success: true }
  }, [updateUser, user?.specialState])

  const createIvenaPrealertFromRescue = useCallback((payload = {}) => {
    setHospital(prev => {
      if (!prev) return prev
      const nowMs = Date.now()
      const etaMinutes = Math.max(2, Number(payload.etaMinutes || 8))
      const generated = generatePatient('ambulance')
      const patient = {
        ...generated,
        chiefComplaint: payload.chiefComplaint || generated.chiefComplaint,
        suggestedTriage: payload.priority || generated.suggestedTriage,
        preInfo: payload.note || generated.preInfo,
      }
      const preannounce = {
        id: 'ivena_ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date(nowMs).toISOString(),
        etaAt: new Date(nowMs + etaMinutes * 60000).toISOString(),
        etaMinutes,
        patient,
        dispatch: payload.dispatch || 'RTW extern',
        priority: payload.priority || patient.suggestedTriage || 'yellow',
        note: payload.note || patient.preInfo || 'Präklinische Versorgung läuft.',
      }
      const updated = {
        ...prev,
        ivenaQueue: [preannounce, ...(prev.ivenaQueue || [])].slice(0, 30),
        activityLog: [
          { time: new Date().toISOString(), message: `📡 Leitnetz-Voranmeldung erhalten (${preannounce.dispatch}, ETA ${etaMinutes} Min.)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const devClearAllPatients = useCallback(() => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: [],
        ivenaQueue: [],
        alertQueue: [],
        activeEvent: null,
        treatmentRooms: (prev.treatmentRooms || []).map(room => ({ ...room, patientId: null, equipmentState: {} })),
        activityLog: [
          { time: new Date().toISOString(), message: '🧹 [DEV] Alle Patienten und Voranmeldungen wurden entfernt.' },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const getRequiredEquipmentList = useCallback((modality) => {
    const req = modality?.requiredEquipment
    if (!req) return []
    return Array.isArray(req) ? req.filter(Boolean) : [req]
  }, [])

  const getModalityAvailability = useCallback((state, modality, options = {}) => {
    const stationId = options?.stationId || modality.station
    const roomEquipment = Array.isArray(options?.roomEquipment) ? options.roomEquipment : []
    const hasStation = (state.rooms || []).some(r => r.id === stationId)
    const requiredEquipmentList = getRequiredEquipmentList(modality)
    const stationOwned = (state.stationEquipment || {})[stationId] || []
    const radiologyOwned = (state.stationEquipment || {}).radiology || []
    const hasEquipment = requiredEquipmentList.length === 0 || requiredEquipmentList.some(eqId => {
      if (roomEquipment.includes(eqId)) return true
      if (stationOwned.includes(eqId)) return true
      // Mobile Röntgen kann in Radiologie gekauft und stationsübergreifend genutzt werden.
      if (eqId === 'xray_portable') return radiologyOwned.includes('xray_portable')
      // Mobiles Sono kann stationsgebunden als Ersatz für stationäres Sono genutzt werden.
      if (eqId === 'ultrasound') return stationOwned.includes('ultrasound_portable') || roomEquipment.includes('ultrasound_portable')
      return false
    })
    return { hasStation, hasEquipment }
  }, [getRequiredEquipmentList])

  const createPatientOrder = useCallback((patientId, payload) => {
    if (!patientId || !payload?.modality) return { success: false, message: 'Ungültige Anordnung.' }
    const modality = getOrderModality(payload.modality)
    if (!modality) return { success: false, message: 'Unbekannte Anordnungsart.' }
    if (!hospital) return { success: false, message: 'Krankenhaus nicht geladen.' }
    const patient = (hospital.patients || []).find(p => p.id === patientId)
    if (!patient) return { success: false, message: 'Patient nicht gefunden.' }
    const currentRoom = (hospital.treatmentRooms || []).find(r => r.id === patient.assignedRoom)
    let resolvedStation = modality.station
    let resolvedAvailability = getModalityAvailability(hospital, modality, { stationId: resolvedStation })
    const strictDiagnosticStations = new Set(['radiology', 'cardiology', 'pneumology', 'neurology', 'lab'])
    if (currentRoom && !strictDiagnosticStations.has(String(modality.station || '').toLowerCase())) {
      const localAvailability = getModalityAvailability(hospital, modality, {
        stationId: currentRoom.station,
        roomEquipment: currentRoom.equipment || [],
      })
      if (localAvailability.hasStation && localAvailability.hasEquipment) {
        resolvedStation = currentRoom.station
        resolvedAvailability = localAvailability
      }
    }
    if (!resolvedAvailability.hasStation) {
      return { success: false, message: `${modality.category}-Station nicht gebaut.` }
    }
    if (!resolvedAvailability.hasEquipment) {
      return { success: false, message: `${modality.name} kann erst nach Gerätekauf genutzt werden.` }
    }
    const requiredEquipmentList = getRequiredEquipmentList(modality)
    const stationOwned = (hospital.stationEquipment || {})[resolvedStation] || []
    const radiologyOwned = (hospital.stationEquipment || {}).radiology || []
    const roomEquipment = currentRoom && currentRoom.station === resolvedStation ? (currentRoom.equipment || []) : []
    const resolvedEquipment = requiredEquipmentList.find(eqId =>
      roomEquipment.includes(eqId)
      || stationOwned.includes(eqId)
      || (eqId === 'xray_portable' && radiologyOwned.includes('xray_portable'))
      || (eqId === 'ultrasound' && (stationOwned.includes('ultrasound_portable') || roomEquipment.includes('ultrasound_portable')))
    ) || requiredEquipmentList[0] || null
    let created = false
    setHospital(prev => {
      if (!prev) return prev
      const nowIso = new Date().toISOString()
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== patientId) return p
          const bodyPart = String(payload?.bodyPart || '').trim()
          const order = {
            id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            modality: modality.id,
            title: bodyPart ? `${modality.name} - ${bodyPart}` : modality.name,
            station: resolvedStation,
            category: modality.category,
            bodyPart,
            requiredEquipment: resolvedEquipment,
            status: 'open',
            notes: payload.notes || '',
            createdAt: nowIso,
            createdBy: user?.name || 'Arzt',
            assignedTo: null,
            startedAt: null,
            completedAt: null,
            result: null,
          }
          created = true
          return {
            ...p,
            orders: [...(p.orders || []), order],
            patientLog: [
              ...(p.patientLog || []),
              { time: nowIso, type: 'order', author: user?.name || 'Arzt', text: `Anordnung erstellt: ${modality.name}${bodyPart ? ` (${bodyPart})` : ''} (${resolvedStation})${payload.notes ? ` — ${payload.notes}` : ''}` },
            ],
          }
        }),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return created ? { success: true } : { success: false, message: 'Patient nicht gefunden.' }
  }, [hospital, getModalityAvailability, getRequiredEquipmentList, user?.name])

  const updatePatientOrderStatus = useCallback((patientId, orderId, action, extra = {}) => {
    let ok = false
    let failMessage = 'Aktion für diese Anordnung aktuell nicht möglich.'
    setHospital(prev => {
      if (!prev) return prev
      const nowIso = new Date().toISOString()
      const patientList = prev.patients || []
      let resolvedPatientId = patientId
      let targetPatient = patientList.find(p => p.id === resolvedPatientId)
      if (!targetPatient) {
        const fallbackPatient = patientList.find(p => (p.orders || []).some(o => o.id === orderId))
        if (fallbackPatient?.id) {
          resolvedPatientId = fallbackPatient.id
          targetPatient = fallbackPatient
        }
      }
      const currentRoom = prev.treatmentRooms?.find(r => r.patientId === resolvedPatientId)
      const targetOrder = (targetPatient?.orders || []).find(o => o.id === orderId)
      if (!targetPatient) {
        failMessage = 'Patient nicht gefunden.'
        return prev
      }
      if (!targetOrder) {
        failMessage = 'Anordnung nicht gefunden.'
        return prev
      }
      const targetModality = targetOrder ? getOrderModality(targetOrder.modality) : null
      const resolvedOrderStation = targetModality?.station || targetOrder?.station
      const shouldLeaveCurrentRoom = (action === 'transfer' || action === 'start')
        && !!currentRoom
        && !!targetOrder
        && (currentRoom.station !== resolvedOrderStation)
      if ((action === 'transfer' || action === 'start') && targetOrder) {
        const modality = targetModality
        if (modality) {
          const targetStation = modality.station || targetOrder.station
          const roomEquipment = currentRoom && currentRoom.station === targetStation ? (currentRoom.equipment || []) : []
          const availability = getModalityAvailability(prev, modality, {
            stationId: targetStation,
            roomEquipment,
          })
          if (!availability.hasStation) {
            failMessage = `${modality.category}-Station nicht gebaut.`
            return prev
          }
          if (!availability.hasEquipment) {
            failMessage = `${modality.name} nicht verfügbar: Gerät fehlt.`
            return prev
          }
        }
      }
      const updated = {
        ...prev,
        treatmentRooms: [...(prev.treatmentRooms || [])],
        patients: prev.patients.map(p => {
          if (p.id !== resolvedPatientId) return p
          const orders = (p.orders || []).map(order => {
            if (order.id !== orderId) return order
            if (action === 'claim') {
              ok = true
              return { ...order, status: order.status === 'open' ? 'accepted' : order.status, assignedTo: user?.name || 'Arzt', assignedToId: user?.id || null, acceptedAt: nowIso }
            }
            if (action === 'transfer' || action === 'start') {
              if (order.status !== 'accepted' && order.status !== 'in_progress') return order
              ok = true
              return {
                ...order,
                station: targetModality?.station || order.station,
                status: 'in_progress',
                startedAt: nowIso,
              }
            }
            if (action === 'complete') {
              if (order.status !== 'in_progress') return order
              ok = true
              return { ...order, status: 'completed', completedAt: nowIso, result: extra?.result || null }
            }
            if (action === 'record_result') {
              if (order.status !== 'in_progress') return order
              ok = true
              return {
                ...order,
                result: {
                  ...(order.result || {}),
                  ...(extra?.result || {}),
                  updatedAt: nowIso,
                  updatedBy: user?.name || 'Arzt',
                },
              }
            }
            if (action === 'annotate') {
              if (order.status !== 'completed') return order
              ok = true
              return {
                ...order,
                result: {
                  ...(order.result || {}),
                  assessment: extra?.assessment || '',
                  assessmentAt: nowIso,
                  assessmentBy: user?.name || 'Arzt',
                },
              }
            }
            if (action === 'cancel') {
              ok = true
              return { ...order, status: 'cancelled', cancelledAt: nowIso }
            }
            return order
          })
          let nextPatient = { ...p, orders }
          if (action === 'transfer' || action === 'start') {
            const activeOrder = orders.find(o => o.id === orderId)
            if (activeOrder) {
              const needsDiagnosticTransfer = ['radiology', 'cardiology', 'pneumology', 'neurology', 'lab'].includes(activeOrder.station)
              nextPatient = {
                ...nextPatient,
                status: needsDiagnosticTransfer ? 'in_diagnostics' : 'in_treatment',
                diagnosticStation: needsDiagnosticTransfer ? activeOrder.station : null,
                diagnosticEquipment: needsDiagnosticTransfer ? (activeOrder.requiredEquipment || null) : null,
                previousTreatmentRoomId: shouldLeaveCurrentRoom ? (currentRoom?.id || nextPatient.previousTreatmentRoomId || null) : (nextPatient.previousTreatmentRoomId || null),
              }
            }
          }
          if (action === 'complete') {
            const activeOrder = orders.find(o => o.id === orderId)
            const interventions = Array.isArray(extra?.result?.interventions) ? extra.result.interventions : []
            const interventionApplied = applyDiagnosticInterventions(nextPatient, interventions, user?.name || 'Arzt', nowIso)
            const diagnostics = [...(nextPatient.diagnostics || []), {
              id: 'diag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              modality: activeOrder?.modality || extra?.modality,
              station: activeOrder?.station || extra?.station,
              result: extra?.result || null,
              time: nowIso,
              author: user?.name || 'Arzt',
            }]
            nextPatient = {
              ...interventionApplied.patient,
              diagnostics,
              status: 'in_treatment',
              diagnosticStation: null,
              diagnosticEquipment: null,
              lastDiagnosticInterventionSummary: interventionApplied.summary || null,
              therapyProgress: evaluateTherapyProgress(interventionApplied.patient),
            }
          }
          if (action === 'return_from_diagnostics') {
            if (nextPatient.status === 'in_diagnostics') {
              ok = true
              nextPatient = {
                ...nextPatient,
                status: 'in_treatment',
                diagnosticStation: null,
                diagnosticEquipment: null,
              }
            }
          }
          const logText = action === 'claim'
            ? 'Anordnung übernommen'
            : (action === 'transfer' || action === 'start')
              ? (
                ['radiology', 'cardiology', 'pneumology', 'neurology', 'lab'].includes(orders.find(o => o.id === orderId)?.station)
                  ? 'Patient in Diagnostik verlegt'
                  : 'Untersuchung am Stationsgerät gestartet'
              )
              : action === 'complete'
                ? `Anordnung abgeschlossen, Patient zurückverlegt${nextPatient.lastDiagnosticInterventionSummary ? ` (${nextPatient.lastDiagnosticInterventionSummary})` : ''}`
                : action === 'annotate'
                  ? 'Befundbeurteilung ergänzt'
                  : action === 'record_result'
                    ? 'Zwischenbefund dokumentiert'
                    : action === 'return_from_diagnostics'
                      ? 'Patient aus Diagnostik zurückverlegt'
                : 'Anordnung storniert'
          nextPatient = {
            ...nextPatient,
            patientLog: [
              ...(nextPatient.patientLog || []),
              { time: nowIso, type: 'order', author: user?.name || 'Arzt', text: `${logText}` },
            ],
          }
          return nextPatient
        }),
      }
      if ((action === 'transfer' || action === 'start') && currentRoom && shouldLeaveCurrentRoom) {
        updated.treatmentRooms = updated.treatmentRooms.map(r => r.id === currentRoom.id ? { ...r, patientId: null } : r)
      }
      if (action === 'complete') {
        const completedPatient = updated.patients.find(p => p.id === patientId)
        const prevRoomId = completedPatient?.previousTreatmentRoomId
        if (prevRoomId) {
          updated.treatmentRooms = updated.treatmentRooms.map(r => {
            if (r.id !== prevRoomId) return r
            if (r.patientId) return r
            return { ...r, patientId }
          })
          updated.patients = updated.patients.map(p => p.id === patientId ? { ...p, previousTreatmentRoomId: null } : p)
        }
      }
      if (action === 'return_from_diagnostics') {
        const donePatient = updated.patients.find(p => p.id === patientId)
        const prevRoomId = donePatient?.previousTreatmentRoomId
        if (prevRoomId) {
          updated.treatmentRooms = updated.treatmentRooms.map(r => {
            if (r.id !== prevRoomId) return r
            if (r.patientId) return r
            return { ...r, patientId }
          })
          updated.patients = updated.patients.map(p => p.id === patientId ? { ...p, previousTreatmentRoomId: null } : p)
        }
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return ok ? { success: true } : { success: false, message: failMessage }
  }, [getModalityAvailability, user?.id, user?.name])

  const executeAction = useCallback((actionId, actionName, duration, xpReward, targetPatientId, extra = null) => {
    if (targetPatientId) {
      const target = hospital?.patients?.find(p => p.id === targetPatientId)
      if (target && !hasActiveCarePermission(target, user?.id)) {
        return {
          blocked: true,
          message: 'Aktion nicht erlaubt: Nur eingetragene Behandler oder Supervisor dürfen diesen Patienten behandeln.',
        }
      }
    }
    const mustChooseSpecialty = requiresSpecialtySelection(user)
    if (mustChooseSpecialty && SPECIALTY_LOCKED_ACTION_IDS.has(actionId)) {
      return {
        blocked: true,
        message: 'Für diese Aktion musst du zuerst eine Fachrichtung festlegen.',
      }
    }
    const accessRequiredActions = new Set([
      'infusion_nacl',
      'infusion_ringer',
      'infusion_glucose5',
      'transfusion_ek',
      'transfusion_ffp',
    ])
    const inventoryRequiredActions = {
      infusion_nacl: 'nacl09',
      infusion_ringer: 'ringer',
      infusion_glucose5: 'glucose5',
      transfusion_ek: 'transfusion_ek',
      transfusion_ffp: 'transfusion_ffp',
    }
    if (targetPatientId && accessRequiredActions.has(actionId)) {
      const target = hospital?.patients?.find(p => p.id === targetPatientId)
      if (target && !hasActiveVenousAccess(target)) {
        return {
          blocked: true,
          message: 'Für diese Maßnahme muss zuerst ein venöser Zugang gelegt werden.',
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(inventoryRequiredActions, actionId)) {
      const stockId = inventoryRequiredActions[actionId]
      const stock = Number((hospital?.medicationInventory || {})[stockId] || 0)
      if (stock <= 0) {
        return {
          blocked: true,
          message: `${actionName}: Nicht auf Lager in der Apotheke.`,
        }
      }
    }
    const level = Math.max(1, Number(user?.level || 1))
    const xpBonusFactor = Math.min(1.3, 1 + (level - 1) * 0.05)
    const adjustedXp = Math.max(0, Math.round((xpReward || 0) * xpBonusFactor))
    const result = {
      actionId,
      actionName,
      duration,
      xpReward: adjustedXp,
      timestamp: new Date().toISOString(),
      patientId: targetPatientId || null,
    }
    if (adjustedXp && user) {
      updateUser({ xp: (user.xp || 0) + adjustedXp })
    }
    if (actionId === 'nibp_measure' || actionId === 'auscultation') addSpecialtyAction('auscultations', 1)
    if (actionId === 'ecg_connect' || actionId === 'ekg' || actionId === 'ecg_12') addSpecialtyAction('ecgs', 1)
    setHospital(prev => {
      if (!prev) return prev
      let actionEffectSummary = ''
      const patient = targetPatientId ? prev.patients.find(p => p.id === targetPatientId) : null
      const nextInventory = { ...(prev.medicationInventory || {}) }
      if (Object.prototype.hasOwnProperty.call(inventoryRequiredActions, actionId)) {
        const stockId = inventoryRequiredActions[actionId]
        const current = Number(nextInventory[stockId] || 0)
        if (current <= 0) return prev
        nextInventory[stockId] = Math.max(0, current - 1)
      }
      const updated = {
        ...prev,
        medicationInventory: nextInventory,
        patients: targetPatientId ? prev.patients.map(p => {
          if (p.id !== targetPatientId) return p
          const nowIso = new Date().toISOString()
          const effected = applyActionToPatient(p, actionId, actionName, user?.name || 'Arzt', nowIso)
          actionEffectSummary = effected.effectSummary || ''
          let nextPatient = {
            ...effected.patient,
            patientLog: [
              ...(effected.patient.patientLog || []),
              {
                time: nowIso,
                type: 'action',
                author: user?.name || 'Arzt',
                text: actionEffectSummary ? `${actionName} — ${actionEffectSummary}` : actionName,
              },
            ],
          }
          if (actionId === 'ecg_finalize' && extra?.ekgReport && typeof extra.ekgReport === 'object') {
            const report = extra.ekgReport
            const docId = report.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8))
            nextPatient = {
              ...nextPatient,
              documents: [
                ...(nextPatient.documents || []),
                {
                  id: docId,
                  type: 'ekg_report',
                  templateId: 'ekg_report',
                  title: report.title || 'EKG-Befund',
                  fields: report.fields || {},
                  image: report.image || null,
                  createdAt: nowIso,
                  createdBy: user?.name || 'Arzt',
                  updatedAt: nowIso,
                  updatedBy: user?.name || 'Arzt',
                },
              ],
              examResults: [
                ...(nextPatient.examResults || []),
                {
                  type: 'physical_exam',
                  subtype: 'ekg',
                  title: report.title || 'EKG-Befund',
                  summary: report.fields?.interpretation || 'EKG dokumentiert',
                  note: report.fields?.suspectedDiagnosis || null,
                  image: report.image || null,
                  time: nowIso,
                  author: user?.name || 'Arzt',
                },
              ],
            }
          }
          if (actionId === 'iv_access_place') {
            const accessSite = String(extra?.site || 'Unterarm').trim()
            const accessGauge = String(extra?.gauge || '18G').trim()
            const existing = normalizeVenousAccesses(nextPatient.venousAccesses)
            const sameSiteActive = existing.some(entry => entry.status === 'active' && String(entry.site || '').toLowerCase() === accessSite.toLowerCase())
            if (!sameSiteActive) {
              nextPatient = {
                ...nextPatient,
                venousAccesses: [
                  ...existing,
                  {
                    id: 'va_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    typeId: String(extra?.accessTypeId || 'pvk_18g'),
                    gauge: accessGauge,
                    site: accessSite,
                    placedAt: nowIso,
                    placedBy: user?.name || 'Arzt',
                    status: 'active',
                    removedAt: null,
                    removedBy: null,
                    complication: null,
                    lastIssueAt: null,
                  },
                ],
              }
            }
          }
          if (actionId === 'iv_access_remove') {
            const existing = normalizeVenousAccesses(nextPatient.venousAccesses)
            const targetId = String(extra?.accessId || '')
            const candidate = existing.find(entry => entry.status === 'active' && entry.id === targetId)
              || [...existing].reverse().find(entry => entry.status === 'active')
            if (candidate) {
              nextPatient = {
                ...nextPatient,
                venousAccesses: existing.map(entry => {
                  if (entry.id !== candidate.id) return entry
                  return {
                    ...entry,
                    status: 'removed',
                    removedAt: nowIso,
                    removedBy: user?.name || 'Arzt',
                    complication: null,
                  }
                }),
              }
            }
          }
          if (actionId === 'temp_measure') {
            const measuredTemp = (() => {
              const fromExtra = Number(extra?.temp)
              if (Number.isFinite(fromExtra) && fromExtra > 30 && fromExtra < 45) return fromExtra
              const base = Number(nextPatient?.vitals?.temp || 36.8)
              return Math.max(34.5, Math.min(41.5, +(base + (Math.random() * 0.6 - 0.3)).toFixed(1)))
            })()
            nextPatient = {
              ...nextPatient,
              vitals: {
                ...(nextPatient.vitals || {}),
                temp: measuredTemp,
              },
              temperatureMeasuredAt: nowIso,
            }
          }
          if (actionId === 'oxygen_start') {
            const modeId = String(extra?.modeId || 'nasal_cannula').toLowerCase()
            const flow = Math.max(1, Math.min(80, Number(extra?.flow || 2)))
            const fio2 = Math.max(21, Math.min(100, Number(extra?.fio2 || 28)))
            const currentSpo2 = Number(nextPatient?.vitals?.spo2 || 90)
            const currentRr = Number(nextPatient?.vitals?.rr || 18)
            const currentDyspnea = Number(nextPatient?.clinicalState?.dyspnea || 0)
            const deviceFactor = modeId === 'nasal_cannula' ? 0.8
              : modeId === 'simple_mask' ? 1.0
                : modeId === 'reservoir_mask' ? 1.25
                  : modeId === 'high_flow' ? 1.35
                    : modeId === 'bvm' ? 1.45
                      : modeId === 'intubation' ? 1.6
                        : 1.0
            const flowFactor = Math.min(1.35, 0.6 + flow / 12)
            const fio2Factor = Math.min(1.45, 0.55 + (fio2 - 21) / 45)
            const hypoxemiaBoost = Math.min(1.8, 0.6 + Math.max(0, 95 - currentSpo2) / 8)
            // Only a small immediate bump on start; sustained effect is handled continuously in background tick while running.
            const immediateGain = Math.min(2.4, Math.max(0.4, deviceFactor * flowFactor * fio2Factor * hypoxemiaBoost * 0.35))
            const rrDrop = Math.min(1.2, Math.max(0.1, immediateGain * 0.35))
            const nextSpo2 = Math.max(0, Math.min(100, Math.round(currentSpo2 + immediateGain)))
            nextPatient = {
              ...nextPatient,
              vitals: {
                ...(nextPatient.vitals || {}),
                spo2: nextSpo2,
                rr: Math.max(6, Math.round(currentRr - rrDrop)),
              },
              clinicalState: {
                ...ensureClinicalState(nextPatient),
                dyspnea: Math.max(0, +(currentDyspnea - Math.min(0.8, immediateGain * 0.22)).toFixed(2)),
                lastUpdatedAt: nowIso,
              },
            }
          }
          if (actionId === 'oral_suction' || actionId === 'endo_suction') {
            const currentSpo2 = Number(nextPatient?.vitals?.spo2 || 90)
            const currentRr = Number(nextPatient?.vitals?.rr || 18)
            const currentDyspnea = Number(nextPatient?.clinicalState?.dyspnea || 0)
            const currentComplaint = Number(nextPatient?.clinicalState?.complaintLevel || 0)
            const gain = actionId === 'endo_suction' ? 3 : 2
            const rrRelief = actionId === 'endo_suction' ? 3 : 2
            nextPatient = {
              ...nextPatient,
              vitals: {
                ...(nextPatient.vitals || {}),
                spo2: Math.max(0, Math.min(100, Math.round(currentSpo2 + gain))),
                rr: Math.max(6, Math.round(currentRr - rrRelief)),
              },
              clinicalState: {
                ...ensureClinicalState(nextPatient),
                dyspnea: Math.max(0, +(currentDyspnea - (actionId === 'endo_suction' ? 0.8 : 0.5)).toFixed(2)),
                complaintLevel: Math.max(0, +(currentComplaint - 0.2).toFixed(2)),
                lastUpdatedAt: nowIso,
              },
            }
            actionEffectSummary = actionId === 'endo_suction'
              ? 'Sekretlast reduziert, Oxygenierung verbessert'
              : 'Mund-/Rachensekret abgesaugt, Atmung entlastet'
          }
          if (actionId === 'vomit_cleanup') {
            const currentClinical = ensureClinicalState(nextPatient)
            const currentVomit = currentClinical?.vomit || {}
            if (currentVomit.active) {
              nextPatient = {
                ...nextPatient,
                clinicalState: {
                  ...currentClinical,
                  complaintLevel: Math.max(0, Number(currentClinical.complaintLevel || 0) - 0.35),
                  vomit: {
                    ...currentVomit,
                    active: false,
                    cleanedAt: nowIso,
                  },
                  lastUpdatedAt: nowIso,
                },
              }
            }
          }
          return nextPatient
        }) : prev.patients,
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `${user?.name || 'Arzt'}: ${actionName}${patient ? ` bei ${patient.name}` : ''}${actionEffectSummary ? ` (${actionEffectSummary})` : ''} (+${adjustedXp} XP)`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return result
  }, [user, updateUser, addSpecialtyAction, hospital?.patients, hospital?.medicationInventory])

  const fetchMobileSono = useCallback((roomId, patientId = null) => {
    if (!roomId) return { success: false, message: 'Zimmer nicht gefunden.' }
    let result = { success: false, message: 'Mobiles Sono konnte nicht geholt werden.' }
    setHospital(prev => {
      if (!prev) return prev
      const room = (prev.treatmentRooms || []).find(r => r.id === roomId)
      if (!room) {
        result = { success: false, message: 'Zimmer nicht gefunden.' }
        return prev
      }
      const stationId = String(room.station || '')
      const stationOwned = (prev.stationEquipment || {})[stationId] || []
      if (!stationOwned.includes('ultrasound_portable')) {
        result = { success: false, message: 'Auf dieser Station wurde kein mobiles Sono gekauft.' }
        return prev
      }
      const deploymentMap = { ...(prev.mobileSonoDeployment || {}) }
      const current = deploymentMap[stationId]
      if (current?.roomId && String(current.roomId) !== String(roomId)) {
        result = { success: false, message: 'Das mobile Sono dieser Station ist bereits in einem anderen Zimmer im Einsatz.' }
        return prev
      }
      deploymentMap[stationId] = {
        roomId,
        stationId,
        fetchedAt: new Date().toISOString(),
        patientId: patientId || room.patientId || null,
      }
      const updated = {
        ...prev,
        mobileSonoDeployment: deploymentMap,
        activityLog: [
          { time: new Date().toISOString(), message: `🩺 Mobiles Sono in ${room.name} bereitgestellt.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  const returnMobileSono = useCallback((roomId) => {
    let result = { success: false, message: 'Mobiles Sono war nicht im Zimmer.' }
    setHospital(prev => {
      if (!prev) return prev
      const room = (prev.treatmentRooms || []).find(r => r.id === roomId)
      if (!room) return prev
      const stationId = String(room.station || '')
      const deploymentMap = { ...(prev.mobileSonoDeployment || {}) }
      const current = deploymentMap[stationId]
      if (!current?.roomId || String(current.roomId) !== String(roomId)) return prev
      delete deploymentMap[stationId]
      const updated = {
        ...prev,
        mobileSonoDeployment: deploymentMap,
        activityLog: [
          { time: new Date().toISOString(), message: `🩺 Mobiles Sono aus ${room?.name || 'Zimmer'} zurück auf Station.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  const fetchResuscitationCart = useCallback((patientId) => {
    let result = { success: false, message: 'Patient nicht gefunden.' }
    setHospital(prev => {
      if (!prev) return prev
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
      if (!resus.active) {
        result = { success: false, message: 'Kein aktiver Reanimationsfall.' }
        return prev
      }
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== patientId) return p
          const nowIso = new Date().toISOString()
          return {
            ...p,
            clinicalState: {
              ...ensureClinicalState(p),
              resuscitation: {
                ...resus,
                cartFetched: true,
                lastInterventionAt: nowIso,
              },
              lastUpdatedAt: nowIso,
            },
            patientLog: [
              ...(p.patientLog || []),
              { time: nowIso, type: 'action', author: user?.name || 'Team', text: 'Reanimationswagen ans Bett geholt.' },
            ],
          }
        }),
        activityLog: [
          { time: new Date().toISOString(), message: `🚑 Reanimationswagen geholt bei ${(patient?.name || 'Patient')}.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [user?.name])

  const toggleCpr = useCallback((patientId, active) => {
    const patient = resolveResusTargetPatient(hospital?.patients, patientId)
    if (!patient) {
      return {
        success: false,
        message: 'Patient nicht gefunden.',
        debug: createResusDebugPayload(hospital?.patients, patientId),
      }
    }
    const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }
    const resolvedPatientId = patient.id
    const nowIso = new Date().toISOString()
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id !== resolvedPatientId ? p : ({
          ...p,
          clinicalState: {
            ...ensureClinicalState(p),
            resuscitation: {
              ...ensureResuscitationState(p?.clinicalState?.resuscitation),
              cprActive: !!active,
              lastInterventionAt: nowIso,
            },
            lastUpdatedAt: nowIso,
          },
          patientLog: [
            ...(p.patientLog || []),
            {
              time: nowIso,
              type: 'action',
              author: user?.name || 'Team',
              text: active ? 'Herzdruckmassage gestartet.' : 'Herzdruckmassage pausiert.',
            },
          ],
        })),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [hospital?.patients, user?.name])

  const defibAnalyze = useCallback((patientId) => {
    const patient = resolveResusTargetPatient(hospital?.patients, patientId)
    if (!patient) {
      return {
        success: false,
        message: 'Patient nicht gefunden. [RDBG_CTX_ANALYZE]',
        debug: createResusDebugPayload(hospital?.patients, patientId),
      }
    }
    const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }
    const rhythm = String(resus.rhythm || '').toLowerCase()
    const shockable = isShockableRhythm(rhythm)
    return {
      success: true,
      rhythm: rhythm || 'unknown',
      shockable,
      recommendation: shockable ? 'Schock empfohlen.' : 'Kein Schock empfohlen, CPR fortführen.',
    }
  }, [hospital?.patients])

  const defibCharge = useCallback((patientId, joule = 200) => {
    const patient = resolveResusTargetPatient(hospital?.patients, patientId)
    if (!patient) {
      return {
        success: false,
        message: 'Patient nicht gefunden. [RDBG_CTX_CHARGE]',
        debug: createResusDebugPayload(hospital?.patients, patientId),
      }
    }
    const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }
    const resolvedPatientId = patient.id
    const nowIso = new Date().toISOString()
    const safeJoule = Math.max(50, Number(joule || 200))
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id !== resolvedPatientId ? p : ({
          ...p,
          clinicalState: {
            ...ensureClinicalState(p),
            resuscitation: {
              ...ensureResuscitationState(p?.clinicalState?.resuscitation),
              lastInterventionAt: nowIso,
            },
            lastUpdatedAt: nowIso,
          },
          patientLog: [
            ...(p.patientLog || []),
            { time: nowIso, type: 'action', author: user?.name || 'Team', text: `Defibrillator geladen (${safeJoule}J).` },
          ],
        })),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [hospital?.patients, user?.name])

  const defibShock = useCallback((patientId, joule = 200) => {
    const patient = resolveResusTargetPatient(hospital?.patients, patientId)
    if (!patient) {
      return {
        success: false,
        message: 'Patient nicht gefunden. [RDBG_CTX_SHOCK]',
        debug: createResusDebugPayload(hospital?.patients, patientId),
      }
    }
    const baseClinical = ensureClinicalState(patient)
    const resus = ensureResuscitationState(baseClinical?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }
    const resolvedPatientId = patient.id
    const nowIso = new Date().toISOString()
    const shockable = isShockableRhythm(resus.rhythm)
    const safeJoule = Math.max(50, Number(joule || 200))
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== resolvedPatientId) return p
          const currentClinical = ensureClinicalState(p)
          const currentResus = ensureResuscitationState(currentClinical?.resuscitation)
          const nextFailure = Math.max(0, Number(currentResus.failureScore || 0) + (shockable ? -1.6 : 1.4))
          return {
            ...p,
            clinicalState: {
              ...currentClinical,
              hemodynamics: Math.min(10, Number(currentClinical.hemodynamics || 0) + (shockable ? 0.7 : -0.25)),
              resuscitation: {
                ...currentResus,
                shockCount: Number(currentResus.shockCount || 0) + 1,
                lastShockAt: nowIso,
                lastInterventionAt: nowIso,
                failureScore: nextFailure,
                rhythm: shockable ? (Math.random() < 0.45 ? 'pea' : 'vf') : currentResus.rhythm,
              },
              lastUpdatedAt: nowIso,
            },
            patientLog: [
              ...(p.patientLog || []),
              {
                time: nowIso,
                type: 'action',
                author: user?.name || 'Team',
                text: `Schock abgegeben (${safeJoule}J)${shockable ? '' : ' — nicht schockbarer Rhythmus'}.`,
              },
            ],
          }
        }),
        activityLog: [
          { time: nowIso, message: `⚡ Schockabgabe bei ${patient.name} (${safeJoule}J).` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true, shockable }
  }, [hospital?.patients, user?.name])

  const giveResusMedication = useCallback((patientId, medId, dose = null, administration = {}) => {
    const allowed = new Set(['adrenalin', 'amiodaron', 'atropin', 'noradrenalin'])
    if (!allowed.has(medId)) return { success: false, message: 'Unbekanntes Reanimationsmedikament.' }
    const patient = resolveResusTargetPatient(hospital?.patients, patientId)
    if (!patient) {
      return {
        success: false,
        message: 'Patient nicht gefunden. [RDBG_CTX_MED]',
        debug: createResusDebugPayload(hospital?.patients, patientId),
      }
    }
    if (!hasActiveVenousAccess(patient)) {
      return { success: false, message: 'Für Reanimationsmedikamente ist ein venöser Zugang erforderlich.' }
    }
    const clinical = ensureClinicalState(patient)
    const resus = ensureResuscitationState(clinical?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }

    const inventory = { ...(hospital?.medicationInventory || {}) }
    const consumeUnits = Math.max(1, Number(administration?.consumeUnits ?? 1))
    if ((inventory[medId] || 0) < consumeUnits) return { success: false, message: `${medId} ist nicht ausreichend auf Lager.` }

    const nowIso = new Date().toISOString()
    const nowMs = Date.parse(nowIso)
    const lastDoseIso = medId === 'adrenalin'
      ? resus.lastAdrenalineAt
      : medId === 'amiodaron'
        ? resus.lastAmiodaroneAt
        : medId === 'atropin'
          ? resus.lastAtropineAt
          : resus.lastNoradrenalineAt
    const lastDoseMs = Date.parse(lastDoseIso || '')
    const cooldownMs = medId === 'adrenalin'
      ? 180000
      : medId === 'amiodaron'
        ? 300000
        : medId === 'atropin'
          ? 120000
          : 120000
    if (Number.isFinite(lastDoseMs) && nowMs - lastDoseMs < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (nowMs - lastDoseMs)) / 1000)
      return { success: false, message: `Zu früh für nächste Dosis (${waitSec}s).` }
    }

    const resolvedPatientId = patient.id
    const medName = medId === 'adrenalin'
      ? 'Adrenalin i.v.'
      : medId === 'amiodaron'
        ? 'Amiodaron i.v.'
        : medId === 'atropin'
          ? 'Atropin i.v.'
          : 'Noradrenalin i.v.'
    const doseLabel = String(dose || administration?.doseLabel || '').trim()
    const effected = applyMedicationToPatient(patient, medId, medName, user?.name || 'Team', nowIso)
    const nextResus = ensureResuscitationState(effected.patient?.clinicalState?.resuscitation)
    if (medId === 'adrenalin') {
      nextResus.adrenalineDoses = Number(nextResus.adrenalineDoses || 0) + 1
      nextResus.lastAdrenalineAt = nowIso
      nextResus.failureScore = Math.max(0, Number(nextResus.failureScore || 0) - 0.9)
    } else if (medId === 'amiodaron') {
      nextResus.amiodaroneDoses = Number(nextResus.amiodaroneDoses || 0) + 1
      nextResus.lastAmiodaroneAt = nowIso
      nextResus.failureScore = Math.max(0, Number(nextResus.failureScore || 0) - 0.6)
    } else if (medId === 'atropin') {
      nextResus.atropineDoses = Number(nextResus.atropineDoses || 0) + 1
      nextResus.lastAtropineAt = nowIso
      nextResus.failureScore = Math.max(0, Number(nextResus.failureScore || 0) - 0.35)
    } else if (medId === 'noradrenalin') {
      nextResus.noradrenalineDoses = Number(nextResus.noradrenalineDoses || 0) + 1
      nextResus.lastNoradrenalineAt = nowIso
      nextResus.failureScore = Math.max(0, Number(nextResus.failureScore || 0) - 0.45)
    }
    nextResus.lastInterventionAt = nowIso

    setHospital(prev => {
      if (!prev) return prev
      const inv = { ...(prev.medicationInventory || {}) }
      inv[medId] = Math.max(0, Number(inv[medId] || 0) - consumeUnits)
      const updated = {
        ...prev,
        medicationInventory: inv,
        patients: prev.patients.map(p => p.id !== resolvedPatientId ? p : ({
          ...effected.patient,
          clinicalState: {
            ...ensureClinicalState(effected.patient),
            resuscitation: nextResus,
            lastUpdatedAt: nowIso,
          },
          patientLog: [
            ...(effected.patient.patientLog || []),
            {
              time: nowIso,
              type: 'medication',
              author: user?.name || 'Team',
              text: `${medName}${doseLabel ? ` (${doseLabel})` : ''} im Reanimationsalgorithmus gegeben${consumeUnits > 1 ? ` [${consumeUnits} Einheiten]` : ''}.`,
            },
          ],
        })),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    if (medId === 'atropin' && Number(nextResus?.atropineDoses || 0) >= 5) {
      triggerHospitalPoliceWithCooldown(`resus_atropin_${resolvedPatientId}`, {
        reason: `Reanimationsmedikation auffällig: Atropin ${Number(nextResus.atropineDoses)}x gegeben.`,
        source: 'hospital_resus_medication',
        severity: Number(nextResus.atropineDoses) >= 7 ? 'critical' : 'high',
        forceJail: Number(nextResus.atropineDoses) >= 7,
      }, 120000)
    }
    if (medId === 'adrenalin' && Number(nextResus?.adrenalineDoses || 0) >= 5) {
      triggerHospitalPoliceWithCooldown(`resus_adrenalin_${resolvedPatientId}`, {
        reason: `Reanimationsmedikation auffällig: Adrenalin ${Number(nextResus.adrenalineDoses)}x.`,
        source: 'hospital_resus_medication',
        severity: Number(nextResus.adrenalineDoses) >= 8 ? 'critical' : 'high',
        forceJail: Number(nextResus.adrenalineDoses) >= 8,
      }, 120000)
    }
    return { success: true }
  }, [hospital?.medicationInventory, hospital?.patients, user?.name, triggerHospitalPoliceWithCooldown])

  const triggerReanimationAlarm = useCallback((patientId = null) => {
    let payload = { success: false, message: 'Alarm konnte nicht ausgelöst werden.' }
    let falseAlarm = false
    setHospital(prev => {
      if (!prev) return prev
      const nowIso = new Date().toISOString()
      const patient = patientId ? (prev.patients || []).find(p => p.id === patientId) : null
      const anyActiveResus = (prev.patients || []).some((p) => {
        const clinical = ensureClinicalState(p?.clinicalState)
        return !!ensureResuscitationState(clinical.resuscitation).active
      })
      let patientInResus = false
      if (patient) {
        const clinicalP = ensureClinicalState(patient.clinicalState)
        patientInResus = !!ensureResuscitationState(clinicalP.resuscitation).active
      }
      const alarmLegitimate = anyActiveResus && (!patientId || !patient || patientInResus)
      falseAlarm = !alarmLegitimate
      const stationId = patient?.assignedRoom
        ? ((prev.treatmentRooms || []).find(r => r.id === patient.assignedRoom)?.station || 'er')
        : 'er'
      const text = patient
        ? `REANIMATIONSALARM: ${patient.name} (${stationId.toUpperCase()}) - sofort zum Zimmer!`
        : `REANIMATIONSALARM: Notfallteam sofort auf Station ${stationId.toUpperCase()}!`
      const alert = {
        id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        time: nowIso,
        patientId: patient?.id || null,
        patientName: patient?.name || 'Unbekannt',
        severity: 'critical',
        priority: 3,
        code: 'reanimation_alarm',
        message: text,
      }
      const pagerMsg = {
        id: 'pg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        time: nowIso,
        fromUserId: user?.id || 'system',
        fromName: user?.name || 'System',
        toUserId: 'all',
        toName: 'Alle',
        text,
      }
      const updated = {
        ...prev,
        alertQueue: [alert, ...(prev.alertQueue || [])].slice(0, 30),
        pagerMessages: [pagerMsg, ...(prev.pagerMessages || [])].slice(0, 60),
        activityLog: [
          { time: nowIso, message: `📟 ${text}` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      payload = { success: true, text }
      return updated
    })
    if (falseAlarm) {
      triggerHospitalPoliceWithCooldown('rea_false_alarm_no_code', {
        reason: 'Fehlalarm: Reanimationsalarm ausgelöst, ohne dass eine Reanimation läuft.',
        source: 'pager_false_reanimation',
        severity: 'medium',
        forceJail: true,
        jailMinutesOverride: 1,
        fineAmountOverride: 380,
      }, 45000)
    }
    return payload
  }, [user?.id, user?.name, triggerHospitalPoliceWithCooldown])

  const devForceResusState = useCallback((patientId, mode = 'vf') => {
    let result = { success: false, message: 'Patient nicht gefunden.' }
    setHospital(prev => {
      if (!prev) return prev
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      const nowIso = new Date().toISOString()
      const normalizedMode = String(mode || 'vf').toLowerCase()
      const currentClinical = ensureClinicalState(patient)
      const currentResus = ensureResuscitationState(currentClinical.resuscitation)
      let nextPatient = { ...patient, clinicalState: { ...currentClinical }, vitals: ensureVitals(patient?.vitals) }
      if (normalizedMode === 'rosc') {
        nextPatient = {
          ...nextPatient,
          vitals: { ...nextPatient.vitals, hr: Math.max(58, Number(nextPatient.vitals.hr || 75)), spo2: Math.max(90, Number(nextPatient.vitals.spo2 || 95)) },
          clinicalState: {
            ...nextPatient.clinicalState,
            stability: 'instabil',
            consciousness: 'somnolent',
            outcome: 'alive',
            resuscitation: {
              ...currentResus,
              active: false,
              status: 'rosc',
              rhythm: 'sinus',
              cprActive: false,
              roscAt: nowIso,
              lastInterventionAt: nowIso,
              cartFetched: true,
            },
            lastUpdatedAt: nowIso,
          },
        }
      } else if (normalizedMode === 'dead') {
        nextPatient = {
          ...nextPatient,
          vitals: { ...nextPatient.vitals, hr: 0, spo2: 0, bp: '0/0' },
          clinicalState: {
            ...nextPatient.clinicalState,
            stability: 'kritisch',
            consciousness: 'bewusstlos',
            outcome: 'dead',
            resuscitation: {
              ...currentResus,
              active: false,
              status: 'dead',
              rhythm: 'asystole',
              cprActive: false,
              lastInterventionAt: nowIso,
              cartFetched: true,
            },
            lastUpdatedAt: nowIso,
          },
        }
      } else {
        const rhythm = ['vf', 'asystole', 'pea', 'pvt'].includes(normalizedMode) ? normalizedMode : 'vf'
        nextPatient = {
          ...nextPatient,
          vitals: {
            ...nextPatient.vitals,
            hr: rhythm === 'vf' || rhythm === 'pvt' ? 190 : 0,
            spo2: Math.max(70, Number(nextPatient.vitals.spo2 || 90) - 8),
          },
          clinicalState: {
            ...nextPatient.clinicalState,
            stability: 'kritisch',
            consciousness: 'bewusstlos',
            outcome: 'alive',
            resuscitation: {
              ...currentResus,
              active: true,
              status: 'arrest',
              rhythm,
              startedAt: nowIso,
              lastCycleAt: nowIso,
              cprActive: false,
              cycles: 0,
              failureScore: 0,
              cartFetched: false,
              lastInterventionAt: nowIso,
            },
            lastUpdatedAt: nowIso,
          },
        }
      }
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? nextPatient : p),
        activityLog: [
          { time: nowIso, message: `🧪 DEV: Reanimationsstatus für ${patient.name} -> ${normalizedMode.toUpperCase()}` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  const devForceVomitState = useCallback((patientId, active = true) => {
    let result = { success: false, message: 'Patient nicht gefunden.' }
    setHospital(prev => {
      if (!prev) return prev
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      const nowIso = new Date().toISOString()
      const clinical = ensureClinicalState(patient)
      const vomit = clinical?.vomit || {}
      const nextPatient = {
        ...patient,
        clinicalState: {
          ...clinical,
          vomit: {
            ...vomit,
            active: !!active,
            count: Number(vomit.count || 0) + (active ? 1 : 0),
            lastAt: active ? nowIso : (vomit.lastAt || nowIso),
            cleanedAt: active ? null : nowIso,
            nextEarliestAt: new Date(Date.now() + 6 * 60000).toISOString(),
            cause: active ? 'dev' : (vomit.cause || 'manual'),
          },
          lastUpdatedAt: nowIso,
        },
        patientLog: [
          ...(patient.patientLog || []),
          {
            time: nowIso,
            type: 'event',
            author: 'Dev',
            text: active ? 'Dev: Erbrechen ausgelöst.' : 'Dev: Erbrechen beendet.',
          },
        ],
      }
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? nextPatient : p),
        activityLog: [
          { time: nowIso, message: `🧪 DEV: Erbrechen für ${patient.name} ${active ? 'aktiviert' : 'beendet'}.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  // Override dischargePatient to add revenue to hospital balance
  const dischargePatientWithRevenue = useCallback((patientId) => {
    const mustChooseSpecialty = requiresSpecialtySelection(user)
    if (mustChooseSpecialty) {
      return { success: false, message: 'Vor Entlassungen bitte Fachrichtung festlegen.' }
    }
    if (!hospital || !Array.isArray(hospital?.patients)) {
      return { success: false, message: 'Krankenhausdaten sind noch nicht bereit. Bitte erneut versuchen.' }
    }
    let resultPayload = { success: false, message: 'Patient nicht gefunden oder bereits entlassen.' }
    setHospital(prev => {
      if (!prev) {
        resultPayload = { success: false, message: 'Krankenhausdaten sind noch nicht bereit. Bitte erneut versuchen.' }
        return prev
      }
      const patient = prev.patients.find(p => p.id === patientId)
      if (!patient) {
        resultPayload = { success: false, message: 'Patient nicht gefunden oder bereits entlassen.' }
        return prev
      }
      const hasDischargeDocument = !!(patient?.documents || []).some((doc) => doc?.templateId === 'entlassungsbogen')
      if (!hasDischargeDocument) {
        resultPayload = { success: false, message: 'Entlassung nur mit Entlassungsbogen in der Patientenakte möglich.' }
        return prev
      }
      const room = prev.treatmentRooms?.find(r => r.patientId === patientId)
      const diagnosisCorrect = isDiagnosisCorrect(patient)
      const dischargeChecklist = evaluateDischargeRequirements(patient)
      const therapy = evaluateTherapyProgress(patient)
      const revenueInfo = estimateCaseRevenue(patient, diagnosisCorrect, dischargeChecklist?.summary)
      const nowMs = Date.now()
      const arrivalMsRaw = new Date(patient?.arrivalTime || patient?.createdAt || nowMs).getTime()
      const arrivalMs = Number.isFinite(arrivalMsRaw) ? arrivalMsRaw : nowMs
      const minutesSinceArrival = Math.max(0, (nowMs - arrivalMs) / 60000)
      const medicationEvents = (patient?.patientLog || []).filter((entry) => String(entry?.type || '').toLowerCase() === 'medication').length
      const hasOrders = Array.isArray(patient?.orders) && patient.orders.length > 0
      const clinicalActionCount = Number(patient?.appliedTreatments?.length || 0)
        + Number(patient?.examResults?.length || 0)
        + medicationEvents
        + (hasOrders ? 1 : 0)
      const hasPrimaryDiagnosis = !!patient?.diagnoses?.primary?.code
      const v = patient?.vitals || {}
      const dangerousVitals = (
        Number(v.hr || 90) >= 140
        || Number(v.hr || 90) <= 35
        || Number(v.spo2 || 98) <= 88
        || Number(v.sys || 120) <= 90
        || Number(v.rr || 16) >= 30
        || Number(v.rr || 16) <= 8
        || Number(v.gcs || 15) <= 10
      )
      const unstableState = String(patient?.clinicalState?.stability || '').toLowerCase() === 'instabil' || dangerousVitals
      const checklistSummary = dischargeChecklist?.summary || {}
      const missingCritical = Math.max(0, Number(checklistSummary.criticalTotal || 0) - Number(checklistSummary.criticalDone || 0))
      const immediateDischarge = minutesSinceArrival < 5
      const noMeaningfulCare = clinicalActionCount < 2
      const careTeam = patient.careTeam || {}
      const distribution = prev.revenueDistribution || DEFAULT_REVENUE_DISTRIBUTION
      const shareByRole = {
        Hauptbehandler: Math.max(0, Number(distribution.primary || 0)) / 100,
        Nebenbehandler: Math.max(0, Number(distribution.assistant || 0)) / 100,
        Supervisor: Math.max(0, Number(distribution.supervisor || 0)) / 100,
      }
      const hospitalShareRatio = Math.max(0, Number(distribution.hospital || 0)) / 100
      const physicianRole =
        careTeam.primary === user?.id ? 'Hauptbehandler' :
        (Array.isArray(careTeam.assistant) ? careTeam.assistant.includes(user?.id) : careTeam.assistant === user?.id) ? 'Nebenbehandler' :
        careTeam.supervisor === user?.id ? 'Supervisor' : null
      const physicianRankBonus = Math.max(0, Number(getCurrentRank(user)?.perks?.physicianShareBonusPercent || 0))
      const personalShareBase = physicianRole ? Math.round(revenueInfo.gross * (shareByRole[physicianRole] || 0)) : 0
      const diagnosisCode = patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || ''
      const specialsBonusPct = getKhCaseMoneyBonusPct(user, diagnosisCode)
      const personalShare = Math.round(personalShareBase * (1 + physicianRankBonus / 100) * (1 + specialsBonusPct / 100))
      const hospitalShare = Math.round(revenueInfo.gross * hospitalShareRatio)
      const updated = {
        ...prev,
        patients: prev.patients.filter(p => p.id !== patientId),
        balance: (prev.balance || 0) + hospitalShare,
        treatmentRooms: room ? prev.treatmentRooms.map(r => r.id === room.id ? { ...r, patientId: null, equipmentState: {} } : r) : prev.treatmentRooms,
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `${patient?.name || 'Patient'} entlassen — ${revenueInfo.gross.toLocaleString('de-DE')}€ Gesamt (${diagnosisCorrect ? 'Diagnose korrekt' : 'Diagnose unklar/abweichend'})`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      resultPayload = {
        success: true,
        gross: revenueInfo.gross,
        hospitalShare,
        physicianShare: personalShare,
        billable: revenueInfo.timing.billable,
        diagnosisCorrect,
        therapyProgressPercent: therapy?.percent || 0,
        therapyReadyForDischarge: !!therapy?.readyForDischarge,
        dischargeChecklist,
        misconduct: {
          immediateDischarge,
          noMeaningfulCare,
          unstableState,
          hasPrimaryDiagnosis,
          minutesSinceArrival,
          missingCritical,
        },
      }
      return updated
    })
    if (resultPayload.success) {
      addSpecialtyAction('discharges', 1)
      if (resultPayload.physicianShare > 0) addMoney(resultPayload.physicianShare)
      if (user) {
        const prevStats = user.stats || {}
        const criticalTotal = Number(resultPayload?.dischargeChecklist?.summary?.criticalTotal || 0)
        const criticalDone = Number(resultPayload?.dischargeChecklist?.summary?.criticalDone || 0)
        const criticalChecklistPassed = criticalTotal <= 0 ? true : criticalDone >= criticalTotal
        const therapyPercent = Number(resultPayload?.therapyProgressPercent || 0)
        const countsAsTreatedCase = criticalChecklistPassed && therapyPercent >= 70
        const successfulOutcome = countsAsTreatedCase
          && criticalChecklistPassed
          && therapyPercent >= 85
          && !!resultPayload?.diagnosisCorrect
          && !!resultPayload?.billable

        const prevCases = Number(prevStats.casesCompleted || 0)
        const casesCompleted = prevCases + (countsAsTreatedCase ? 1 : 0)
        const prevHelped = prevStats.patientsHelped || 0
        const prevSuccessfulCases = Number(prevStats.successfulCases || 0)
        const successfulCases = prevSuccessfulCases + (successfulOutcome ? 1 : 0)
        const successRate = casesCompleted > 0
          ? Math.round((successfulCases / casesCompleted) * 100)
          : 0
        updateUser({
          stats: {
            ...prevStats,
            casesCompleted,
            patientsHelped: prevHelped + 1,
            successfulCases,
            successRate,
          },
        })
      }
      const misconduct = resultPayload?.misconduct || {}
      const therapyPercent = Number(resultPayload?.therapyProgressPercent || 0)
      const reasons = []
      let severityScore = 0
      if (misconduct.immediateDischarge) {
        reasons.push(`Entlassung sehr früh nach Aufnahme (${Math.max(0, Number(misconduct.minutesSinceArrival || 0)).toFixed(1)} Min)`)
        severityScore += 2
      }
      if (!misconduct.hasPrimaryDiagnosis) {
        reasons.push('keine Primärdiagnose dokumentiert')
        severityScore += 1
      }
      if (misconduct.noMeaningfulCare) {
        reasons.push('keine ausreichende Behandlung/Diagnostik dokumentiert')
        severityScore += 2
      }
      if (misconduct.unstableState) {
        reasons.push('Patient war zum Entlasszeitpunkt instabil')
        severityScore += 2
      }
      if (Number(misconduct.missingCritical || 0) >= 1) {
        reasons.push(`${Number(misconduct.missingCritical)} kritische Entlasskriterien offen`)
        severityScore += Number(misconduct.missingCritical) >= 3 ? 3 : 2
      }
      if (!resultPayload?.therapyReadyForDischarge && therapyPercent < 60) {
        reasons.push(`Therapieabschluss zu niedrig (${therapyPercent}%)`)
        severityScore += therapyPercent < 35 ? 2 : 1
      }
      if (reasons.length > 0) {
        const severity = severityScore >= 6 ? 'critical' : severityScore >= 4 ? 'high' : 'medium'
        triggerPolicePenalty({
          reason: `KH-Entlassung auffällig: ${reasons.join('; ')}`,
          source: 'hospital_discharge',
          severity,
          forceJail: severity === 'critical',
        })
      }
    }
    return resultPayload
  }, [user, addMoney, updateUser, addSpecialtyAction, triggerPolicePenalty])

  const purchaseMedication = useCallback((medId, packSize, packCost, medName) => {
    const med = MEDICATIONS.find((entry) => entry.id === medId)
    const discountPct = getMedicationDiscountPct(user, med?.category)
    const effectivePackCost = Math.max(0, Math.round(Number(packCost || 0) * (1 - discountPct / 100)))
    const rankId = String(getCurrentRank(user)?.id || '')
    const isAssistenzarztBasicBuy = rankId === 'assistenzarzt' && isBasicMedicationForAssistenzarzt(med)
    if (!hasCapability('purchase_standard_medication') && !isAssistenzarztBasicBuy) {
      return { success: false, message: 'Benötigt Rang Facharzt oder höher.' }
    }
    if (!hasPermission('manage_rooms') && !isAssistenzarztBasicBuy) return { success: false, message: 'Keine Berechtigung' }
    if (isAssistenzarztBasicBuy) {
      const currentStock = Number((hospital?.medicationInventory || {})[medId] || 0)
      if (currentStock + Number(packSize || 0) > ASSISTENZARZT_BASIC_STOCK_LIMIT) {
        return {
          success: false,
          message: `Assistenzarzt-Limit erreicht (${ASSISTENZARZT_BASIC_STOCK_LIMIT} pro Basismedikament).`,
        }
      }
    }
    setHospital(prev => {
      const inventory = { ...(prev.medicationInventory || {}) }
      if (isAssistenzarztBasicBuy) {
        const currentStock = Number(inventory[medId] || 0)
        if (currentStock + Number(packSize || 0) > ASSISTENZARZT_BASIC_STOCK_LIMIT) return prev
      }
      inventory[medId] = (inventory[medId] || 0) + packSize
      const updated = {
        ...prev,
        balance: (prev.balance || 0) - effectivePackCost,
        medicationInventory: inventory,
        activityLog: [
          { time: new Date().toISOString(), message: `${medName} bestellt (${packSize}x, ${effectivePackCost.toLocaleString('de-DE')}€${discountPct > 0 ? `, -${discountPct}%` : ''})` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      const withDebt = withDebtSpendPopup(prev, updated, `${medName} bestellen`)
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      return withDebt
    })
    return { success: true, message: `${medName} bestellt${discountPct > 0 ? ` (-${discountPct}% Rabatt)` : ''}!` }
  }, [hasCapability, hasPermission, hospital?.medicationInventory, user, withDebtSpendPopup])

  const useMedication = useCallback((medId, medName, patientId, administration = {}) => {
    const targetPatient = patientId ? hospital?.patients?.find(p => p.id === patientId) : null
    if (patientId) {
      const target = targetPatient
      if (target && !hasActiveCarePermission(target, user?.id)) {
        return { success: false, message: 'Nur eingetragene Behandler oder Supervisor dürfen Medikamente verabreichen.' }
      }
      const medDef = MEDICATIONS.find(med => med.id === medId)
      if (target && medDef && medicationRequiresVenousAccess(medDef) && !hasActiveVenousAccess(target)) {
        return { success: false, message: 'Dieses Medikament erfordert einen venösen Zugang.' }
      }
    }
    let applied = false
    const consumeUnits = Math.max(0, Number(administration?.consumeUnits ?? 1))
    const preparedDoseText = String(administration?.doseLabel || '').trim()
    setHospital(prev => {
      if (!prev) return prev
      const inventory = { ...(prev.medicationInventory || {}) }
      if (consumeUnits > 0) {
        if ((inventory[medId] || 0) < consumeUnits) return prev
        inventory[medId] = inventory[medId] - consumeUnits
      }
      let medEffectSummary = ''
      const updated = {
        ...prev,
        medicationInventory: inventory,
        patients: patientId ? prev.patients.map(p => {
          if (p.id !== patientId) return p
          const nowIso = new Date().toISOString()
          const effected = applyMedicationToPatient(p, medId, medName, user?.name || 'Arzt', nowIso)
          medEffectSummary = effected.effectSummary || ''
          return {
            ...effected.patient,
            patientLog: [
              ...(effected.patient.patientLog || []),
              {
                time: nowIso,
                type: 'medication',
                author: user?.name || 'Arzt',
                text: medEffectSummary
                  ? `${medName}${preparedDoseText ? ` (${preparedDoseText})` : ''} verabreicht — ${medEffectSummary}`
                  : `${medName}${preparedDoseText ? ` (${preparedDoseText})` : ''} verabreicht`,
              },
            ],
          }
        }) : prev.patients,
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `${medName}${preparedDoseText ? ` (${preparedDoseText})` : ''} verabreicht${medEffectSummary ? ` (${medEffectSummary})` : ''}${consumeUnits > 1 ? ` [${consumeUnits} Einheiten]` : ''}`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      applied = true
      return updated
    })
    if (applied && targetPatient) {
      evaluateHospitalMedicationMalpractice(targetPatient, medId, medName)
    }
    return applied ? { success: true } : { success: false, message: 'Medikation konnte nicht verabreicht werden.' }
  }, [user?.name, user?.id, hospital?.patients, evaluateHospitalMedicationMalpractice])

  const addLabResults = useCallback((patientId, results, cost, categories, selectedParams, meta = {}) => {
    const mustChooseSpecialty = requiresSpecialtySelection(user)
    if (mustChooseSpecialty) {
      const blockedCats = new Set(['cardiac', 'coagulation', 'microbiology'])
      const selected = categories || []
      if (selected.some(cat => blockedCats.has(cat))) {
        return { success: false, message: 'Für erweiterte Labordiagnostik zuerst Fachrichtung festlegen.' }
      }
    }
    const effectiveCost = meta?.fromTriage ? 0 : getLabOrderCost(cost || 0, user)
    let success = false
    setHospital(prev => {
      if (!prev) return prev
      const hasLabRoom = (prev.rooms || []).some(r => r.id === 'lab')
      if (!meta?.fromTriage && !hasLabRoom) {
        failReason = 'no_lab'
        return prev
      }
      const newBalance = (prev.balance || 0) - effectiveCost
      const patient = prev.patients.find(p => p.id === patientId)
      const labMod = patient ? getTreatmentLabModifiers(patient, Date.now()) : null
      const labEntry = {
        results: Object.fromEntries(
          Object.entries(results || {}).map(([paramId, result]) => [
            paramId,
            {
              ...result,
              value: (() => {
                const raw = result?.value
                if (!labMod || typeof raw !== 'number') return raw
                const id = String(paramId || '').toLowerCase()
                if (id.includes('crp') || id.includes('pct') || id.includes('leuko')) return +(raw * labMod.inflammationFactor).toFixed(2)
                if (id.includes('inr') || id.includes('ptt') || id.includes('fibrin')) return +(raw * labMod.coagFactor).toFixed(2)
                if (id.includes('laktat')) return +(raw * labMod.lactateFactor).toFixed(2)
                if (id.includes('hb') || id.includes('haemoglobin') || id.includes('hgb')) return +(raw * labMod.hbFactor).toFixed(2)
                if (id.includes('gluk') || id.includes('glucose')) return +(raw * labMod.glucoseFactor).toFixed(2)
                return raw
              })(),
              time: result?.time || new Date().toISOString(),
              readyAt: result?.readyAt || result?.time || new Date().toISOString(),
            },
          ])
        ),
        time: new Date().toISOString(),
        categories: categories || [],
        selectedParams: selectedParams || Object.keys(results || {}),
        cost: effectiveCost,
        possibleFalsified: !!meta?.possibleFalsified,
        warningNote: meta?.warningNote || '',
      }
      const updated = {
        ...prev,
        balance: newBalance,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          labHistory: [...(p.labHistory || []), labEntry],
          patientLog: [
            ...(p.patientLog || []),
            {
              time: new Date().toISOString(),
              type: 'lab',
              author: user?.name || 'Labor',
              text: `Labor beauftragt (${Object.keys(results || {}).length} Parameter, ${effectiveCost}€)${meta?.possibleFalsified ? ' - Hinweis: möglicherweise verfälscht' : ''}${meta?.fromTriage ? ' - aus Triage-Blutabnahme' : ''}`,
            },
          ],
        } : p),
        activityLog: [
          { time: new Date().toISOString(), message: `Laboruntersuchung für Patient angeordnet (${effectiveCost}€)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      const withDebt = withDebtSpendPopup(prev, updated, 'Laborauftrag')
      localStorage.setItem('medisim_hospital_' + withDebt.id, JSON.stringify(withDebt))
      success = true
      return withDebt
    })
    if (success) {
      addSpecialtyAction('labsOrdered', 1)
      if (meta?.fromBloodDraw) addSpecialtyAction('bloodDraws', 1)
      return { success: true }
    }
    if (failReason === 'no_lab') {
      return { success: false, message: 'Für Laboraufträge muss zuerst ein Labor gebaut werden.' }
    }
    return { success: false, message: 'Labor konnte nicht angefordert werden.' }
  }, [user, addSpecialtyAction, withDebtSpendPopup])

  const addPatientNote = useCallback((patientId, noteText) => {
    if (!noteText?.trim()) return
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          patientLog: [
            ...(p.patientLog || []),
            { time: new Date().toISOString(), type: 'note', author: user?.name || 'Arzt', text: noteText.trim() },
          ],
        } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name])

  const updatePatientMedicationPlan = useCallback((patientId, medicationPlan) => {
    setHospital(prev => {
      if (!prev) return prev
      const cleanedPlan = Array.isArray(medicationPlan)
        ? medicationPlan.map(entry => ({
            ...entry,
            intervalHours: Number(entry.intervalHours || 8),
            active: entry.active !== false,
            startAt: entry.startAt || new Date().toISOString(),
          }))
        : []
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? { ...p, medicationPlan: cleanedPlan } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true }
  }, [])

  const updatePatientChatSnapshot = useCallback((patientId, chatSnapshot) => {
    if (!patientId) return { success: false, message: 'Patient nicht gefunden.' }
    const snapshotMessages = Array.isArray(chatSnapshot?.messages) ? chatSnapshot.messages : []
    const snapshotAskedIds = Array.isArray(chatSnapshot?.askedIds) ? chatSnapshot.askedIds : []
    let saved = false
    setHospital(prev => {
      if (!prev) return prev
      const exists = (prev.patients || []).some((p) => p.id === patientId)
      if (!exists) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map((p) => (
          p.id === patientId
            ? {
                ...p,
                chatSnapshot: {
                  patientId,
                  messages: snapshotMessages,
                  askedIds: snapshotAskedIds,
                  updatedAt: new Date().toISOString(),
                },
              }
            : p
        )),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      saved = true
      return updated
    })
    return saved ? { success: true } : { success: false, message: 'Patient nicht gefunden.' }
  }, [])

  const addPatientLogEntry = useCallback((patientId, type, text) => {
    if (!text?.trim()) return
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          patientLog: [
            ...(p.patientLog || []),
            {
              id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              time: new Date().toISOString(),
              type: type || 'event',
              author: user?.name || 'System',
              text: text.trim(),
            },
          ],
        } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name])

  const updatePatientLogEntry = useCallback((patientId, entryIndex, updates) => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== patientId) return p
          const log = [...(p.patientLog || [])]
          if (entryIndex < 0 || entryIndex >= log.length) return p
          log[entryIndex] = {
            ...log[entryIndex],
            ...updates,
            editedAt: new Date().toISOString(),
            editedBy: user?.name || 'Arzt',
          }
          return { ...p, patientLog: log }
        }),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name])

  const deletePatientLogEntry = useCallback((patientId, entryIndex) => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== patientId) return p
          const log = [...(p.patientLog || [])]
          if (entryIndex < 0 || entryIndex >= log.length) return p
          log.splice(entryIndex, 1)
          return { ...p, patientLog: log }
        }),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [])

  const upsertPatientDocument = useCallback((patientId, documentDraft) => {
    if (!patientId || !documentDraft?.title) return { success: false, message: 'Dokument unvollständig.' }
    let success = false
    setHospital(prev => {
      if (!prev) return prev
      const nowIso = new Date().toISOString()
      const updated = {
        ...prev,
        patients: prev.patients.map(p => {
          if (p.id !== patientId) return p
          const docs = [...(p.documents || [])]
          const docId = documentDraft.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8))
          const idx = docs.findIndex(d => d.id === docId)
          const base = idx >= 0 ? docs[idx] : {}
          const nextDoc = {
            ...base,
            ...documentDraft,
            id: docId,
            updatedAt: nowIso,
            updatedBy: user?.name || 'Arzt',
            createdAt: base.createdAt || nowIso,
            createdBy: base.createdBy || user?.name || 'Arzt',
          }
          if (idx >= 0) docs[idx] = nextDoc
          else docs.push(nextDoc)
          success = true
          return {
            ...p,
            documents: docs,
            patientLog: [
              ...(p.patientLog || []),
              {
                time: nowIso,
                type: 'note',
                author: user?.name || 'Arzt',
                text: `Dokument ${idx >= 0 ? 'aktualisiert' : 'erstellt'}: ${nextDoc.title}`,
              },
            ],
          }
        }),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return success ? { success: true } : { success: false, message: 'Patient nicht gefunden.' }
  }, [user?.name])

  const assignDiagnoses = useCallback((patientId, diagnoses) => {
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          diagnoses: diagnoses || { primary: null, secondary: [], chronic: [] },
          patientLog: [
            ...(p.patientLog || []),
            {
              time: new Date().toISOString(),
              type: 'diagnosis',
              author: user?.name || 'Arzt',
              text: `Diagnosen aktualisiert${diagnoses?.primary ? ` (Hauptdiagnose: ${diagnoses.primary.code})` : ''}`,
            },
          ],
        } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
  }, [user?.name])

  const assignCareTeam = useCallback((patientId, action) => {
    if (!user?.id) return { success: false, message: 'Nicht eingeloggt.' }
    let result = { success: false, message: 'Aktion nicht möglich.' }
    setHospital(prev => {
      if (!prev) return prev
      const target = prev.patients.find(p => p.id === patientId)
      if (!target) return prev
      const currentTeam = {
        primary: target.careTeam?.primary || null,
        assistant: Array.isArray(target.careTeam?.assistant)
          ? target.careTeam.assistant
          : (target.careTeam?.assistant ? [target.careTeam.assistant] : []),
        supervisor: target.careTeam?.supervisor || null,
      }
      const nextTeam = { ...currentTeam, assistant: [...currentTeam.assistant] }

      if (action?.type === 'claim_primary') {
        if (currentTeam.primary && currentTeam.primary !== user.id) {
          result = { success: false, message: 'Hauptbehandler bereits vergeben.' }
          return prev
        }
        if (currentTeam.assistant.includes(user.id)) {
          result = { success: false, message: 'Du bist bereits als Nebenbehandler eingetragen.' }
          return prev
        }
        nextTeam.primary = user.id
        result = { success: true }
      } else if (action?.type === 'release_primary') {
        if (currentTeam.primary !== user.id) {
          result = { success: false, message: 'Nur der aktuelle Hauptbehandler kann sich austragen.' }
          return prev
        }
        nextTeam.primary = null
        result = { success: true }
      } else if (action?.type === 'toggle_assistant') {
        if (currentTeam.primary === user.id) {
          result = { success: false, message: 'Als Hauptbehandler kannst du nicht zusätzlich Nebenbehandler sein.' }
          return prev
        }
        if (nextTeam.assistant.includes(user.id)) {
          nextTeam.assistant = nextTeam.assistant.filter(id => id !== user.id)
        } else {
          nextTeam.assistant.push(user.id)
        }
        result = { success: true }
      } else if (action?.type === 'claim_supervisor') {
        if (!hasCapability('assign_supervisor')) {
          result = { success: false, message: 'Supervisor erst ab Oberarzt möglich.' }
          return prev
        }
        if (currentTeam.supervisor && currentTeam.supervisor !== user.id) {
          result = { success: false, message: 'Supervisor bereits vergeben.' }
          return prev
        }
        nextTeam.supervisor = user.id
        result = { success: true }
      } else if (action?.type === 'release_supervisor') {
        if (currentTeam.supervisor !== user.id) {
          result = { success: false, message: 'Nur der aktuelle Supervisor kann sich austragen.' }
          return prev
        }
        nextTeam.supervisor = null
        result = { success: true }
      } else {
        result = { success: false, message: 'Unbekannte Behandler-Aktion.' }
        return prev
      }

      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? {
          ...p,
          careTeam: nextTeam,
        } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return result
  }, [hasCapability, user?.id])

  const setPatientSecurityPosting = useCallback((patientId, enabled = true) => {
    let result = { success: false, message: 'Patient nicht gefunden.' }
    setHospital(prev => {
      if (!prev) return prev
      const hasSecurity = (prev.workers || []).some(w => w.typeId === 'sicherheitsdienst')
      if (enabled && !hasSecurity) {
        result = { success: false, message: 'Kein Sicherheitsdienst im Personal vorhanden.' }
        return prev
      }
      const exists = (prev.patients || []).some(p => p.id === patientId)
      if (!exists) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? { ...p, securityPosted: !!enabled } : p),
        activityLog: [
          {
            time: new Date().toISOString(),
            message: enabled
              ? `🛡️ Sicherheitsdienst bei Patient ${patientId} postiert.`
              : `🛡️ Sicherheitsdienst bei Patient ${patientId} abgezogen.`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  const setPatientWardClothing = useCallback((patientId, clothing = 'casual') => {
    let result = { success: false, message: 'Patient nicht gefunden.' }
    const nextClothing = clothing === 'gown' ? 'gown' : 'casual'
    setHospital(prev => {
      if (!prev) return prev
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      const updated = {
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? { ...p, wardClothing: nextClothing } : p),
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      result = { success: true }
      return updated
    })
    return result
  }, [])

  const transferPatientToPsychiatry = useCallback((patientId) => {
    let outcome = { success: false, message: 'Verlegung nicht möglich.' }
    setHospital(prev => {
      if (!prev) return prev
      const patient = prev.patients.find(p => p.id === patientId)
      if (!patient) return prev
      const hasReferral = (patient.documents || []).some(doc => doc.templateId === 'psychiatrie_einweisung')
      if (!hasReferral) {
        outcome = { success: false, message: 'Psychiatrie-Einweisung fehlt in den Dokumenten.' }
        return prev
      }
      const triage = String(patient?.triageLevel || '').toLowerCase()
      const stability = String(patient?.clinicalState?.stability || '').toLowerCase()
      const critical = triage === 'rot' || triage === 'orange' || stability === 'kritisch' || stability === 'instabil'
      if (critical) {
        const penaltyHospital = 1200
        const updatedCritical = {
          ...prev,
          balance: Number(prev.balance || 0) - penaltyHospital,
          activityLog: [
            {
              time: new Date().toISOString(),
              message: `⛔ Verlegung von ${patient.name} in Psychiatrie abgelehnt (kritischer Zustand). Strafe ${penaltyHospital}€.`,
            },
            ...prev.activityLog.slice(0, 49),
          ],
        }
        localStorage.setItem('medisim_hospital_' + updatedCritical.id, JSON.stringify(updatedCritical))
        addMoney(-300)
        outcome = { success: false, message: 'Patient zu kritisch/schwer für Verlegung. Strafe wurde berechnet.' }
        return updatedCritical
      }

      const diagnosisCorrect = isDiagnosisCorrect(patient)
      const dischargeChecklist = evaluateDischargeRequirements(patient)
      const revenueInfo = estimateCaseRevenue(patient, diagnosisCorrect, dischargeChecklist?.summary)
      const transferRevenue = Math.round(revenueInfo.gross * 0.35)
      const updated = {
        ...prev,
        patients: prev.patients.filter(p => p.id !== patientId),
        treatmentRooms: (prev.treatmentRooms || []).map(r => r.patientId === patientId ? { ...r, patientId: null, equipmentState: {} } : r),
        balance: Number(prev.balance || 0) + transferRevenue,
        activityLog: [
          {
            time: new Date().toISOString(),
            message: `🚑 ${patient.name} nach psychiatrischer Einweisung verlegt. Reduzierte Vergütung: ${transferRevenue.toLocaleString('de-DE')}€.`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      outcome = { success: true, revenue: transferRevenue }
      return updated
    })
    return outcome
  }, [addMoney])

  const abortResuscitation = useCallback((patientId) => {
    const patient = (hospital?.patients || []).find(p => p.id === patientId)
    if (!patient) return { success: false, message: 'Patient nicht gefunden.' }
    const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
    if (!resus.active) return { success: false, message: 'Keine laufende Reanimation.' }
    const cycles = Number(resus.cycles || 0)
    const shocks = Number(resus.shockCount || 0)
    const veryEarlyAbort = cycles < 1
    const earlyAbort = cycles < 3 && shocks < 1

    const nowIso = new Date().toISOString()
    setHospital(prev => {
      if (!prev) return prev
      const room = (prev.treatmentRooms || []).find(r => r.patientId === patientId)
      const updated = {
        ...prev,
        patients: (prev.patients || []).map(p => {
          if (p.id !== patientId) return p
          const clinical = ensureClinicalState(p)
          const currentResus = ensureResuscitationState(clinical.resuscitation)
          return {
            ...p,
            clinicalState: {
              ...clinical,
              stability: 'kritisch',
              consciousness: 'bewusstlos',
              outcome: 'dead',
              lastUpdatedAt: nowIso,
              resuscitation: {
                ...currentResus,
                active: false,
                status: 'dead',
                rhythm: 'asystole',
                cprActive: false,
                failureScore: Math.max(9.5, Number(currentResus.failureScore || 0)),
                lastInterventionAt: nowIso,
                terminatedAt: nowIso,
              },
            },
            vitals: { ...ensureVitals(p?.vitals), hr: 0, rr: 0, spo2: 0, bp: '0/0' },
            patientLog: [
              ...(p.patientLog || []),
              { time: nowIso, type: 'critical', author: user?.name || 'Team', text: 'Reanimation beendet, Tod festgestellt.' },
            ],
          }
        }),
        treatmentRooms: (prev.treatmentRooms || []).map(r => {
          if (!room || r.id !== room.id) return r
          const prevEqState = r.equipmentState || {}
          return {
            ...r,
            equipmentState: {
              ...prevEqState,
              monitor: { ...(prevEqState.monitor || {}), powered: false, updatedAt: nowIso },
              ecg: { ...(prevEqState.ecg || {}), powered: false, updatedAt: nowIso },
            },
          }
        }),
        activityLog: [
          { time: nowIso, message: `⛔ Reanimation bei ${patient.name} beendet, Tod festgestellt.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    if (veryEarlyAbort || earlyAbort) {
      triggerHospitalPoliceWithCooldown(`abort_resus_${patientId}`, {
        reason: `Reanimation mutmaßlich zu früh beendet (Zyklen: ${cycles}, Schocks: ${shocks}).`,
        source: 'hospital_abort_resuscitation',
        severity: veryEarlyAbort ? 'critical' : 'high',
        forceJail: veryEarlyAbort,
      }, 180000)
    }
    return { success: true }
  }, [hospital?.patients, user?.name, triggerHospitalPoliceWithCooldown])

  const transferDeceasedToMorgue = useCallback((patientId) => {
    let outcome = { success: false, message: 'Verlegung in Leichenhalle nicht möglich.' }
    setHospital(prev => {
      if (!prev) return prev
      const hasMorgue = (prev.rooms || []).some(r => r.id === 'morgue')
      if (!hasMorgue) {
        outcome = { success: false, message: 'Leichenhalle ist nicht gebaut.' }
        return prev
      }
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      const outcomeDead = String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead'
      const resusDead = String(patient?.clinicalState?.resuscitation?.status || '').toLowerCase() === 'dead'
      if (!outcomeDead && !resusDead) {
        outcome = { success: false, message: 'Patient ist nicht als verstorben markiert.' }
        return prev
      }
      if (!hasDeathCertificate(patient)) {
        outcome = { success: false, message: 'Totenschein fehlt in den Dokumenten.' }
        return prev
      }
      const nowIso = new Date().toISOString()
      const updated = {
        ...prev,
        patients: (prev.patients || []).map(p => p.id === patientId ? {
          ...p,
          status: 'morgue',
          assignedRoom: null,
          statusChangedAt: nowIso,
          patientLog: [
            ...(p.patientLog || []),
            { time: nowIso, type: 'transfer', author: user?.name || 'Team', text: 'In Leichenhalle verlegt.' },
          ],
        } : p),
        treatmentRooms: (prev.treatmentRooms || []).map(r => r.patientId === patientId ? { ...r, patientId: null, equipmentState: {} } : r),
        activityLog: [
          { time: nowIso, message: `🕯️ ${patient.name} in die Leichenhalle verlegt.` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      outcome = { success: true }
      return updated
    })
    return outcome
  }, [user?.name])

  const sendDeceasedToUndertaker = useCallback((patientId) => {
    let outcome = { success: false, message: 'Übergabe an Bestatter nicht möglich.' }
    setHospital(prev => {
      if (!prev) return prev
      const patient = (prev.patients || []).find(p => p.id === patientId)
      if (!patient) return prev
      if (patient.status !== 'morgue') {
        outcome = { success: false, message: 'Patient befindet sich nicht in der Leichenhalle.' }
        return prev
      }
      if (!hasDeathCertificate(patient)) {
        outcome = { success: false, message: 'Totenschein fehlt in den Dokumenten.' }
        return prev
      }
      const therapy = evaluateTherapyProgress(patient)
      const resus = ensureResuscitationState(patient?.clinicalState?.resuscitation)
      const treatmentVolume = Number(patient?.appliedTreatments?.length || 0)
      const interventionScore = Math.min(9, treatmentVolume * 0.05 + Number(resus.cycles || 0) * 0.18 + Number(resus.shockCount || 0) * 0.22)
      const severeCase = /^(I4|R57|A4|J96|S06|T7)/.test(String(patient?.trueDiagnoses?.primary?.code || patient?.diagnoses?.primary?.code || '').toUpperCase())
      const prognosisAdj = severeCase ? 380 : -120
      const therapyAdj = Number(therapy?.overallScore || 0) >= 55 ? 260 : (Number(therapy?.overallScore || 0) >= 35 ? 40 : -420)
      const payout = Math.round(Math.max(-1800, Math.min(1400, -750 + interventionScore * 210 + prognosisAdj + therapyAdj)))
      const nowIso = new Date().toISOString()
      const updated = {
        ...prev,
        patients: (prev.patients || []).filter(p => p.id !== patientId),
        balance: Number(prev.balance || 0) + payout,
        activityLog: [
          {
            time: nowIso,
            message: `${payout >= 0 ? '✅' : '⛔'} ${patient.name} an Bestatter übergeben (${payout >= 0 ? '+' : ''}${payout.toLocaleString('de-DE')}€).`,
          },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      outcome = { success: true, payout }
      return updated
    })
    return outcome
  }, [])

  const performAssistantTask = useCallback((taskId) => {
    const taskMap = {
      blood_sample: { label: 'Wiederholte Blutabnahme assistiert', xp: 2, payout: 25, actionKey: 'bloodDraws' },
      ekg_write: { label: 'EKG geschrieben', xp: 3, payout: 30, actionKey: 'ecgs' },
      nibp_round: { label: 'NIBP-Rundgang durchgeführt', xp: 1, payout: 18, actionKey: null },
    }
    const task = taskMap[taskId]
    if (!task) return { success: false, message: 'Unbekannte Aufgabe' }
    const level = Math.max(1, Number(user?.level || 1))
    const xpBonusFactor = Math.min(1.3, 1 + (level - 1) * 0.05)
    const payoutBonusFactor = Math.min(1.25, 1 + (level - 1) * 0.03)
    const adjustedXp = Math.round((task.xp || 0) * xpBonusFactor)
    const adjustedPayout = Math.round((task.payout || 0) * payoutBonusFactor)
    if (adjustedPayout > 0) addMoney(adjustedPayout)
    if (user) {
      const prevStats = user.stats || {}
      const mini = { ...(prevStats.assistantMiniStats || {}) }
      if (taskId === 'blood_sample') mini.bloodAssist = (mini.bloodAssist || 0) + 1
      if (taskId === 'ekg_write') mini.ekgMini = (mini.ekgMini || 0) + 1
      if (taskId === 'nibp_round') mini.nibpMini = (mini.nibpMini || 0) + 1
      updateUser({
        xp: (user.xp || 0) + adjustedXp,
        stats: { ...prevStats, assistantMiniStats: mini },
      })
    }
    if (task.actionKey) addSpecialtyAction(task.actionKey, 1)
    setHospital(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        activityLog: [
          { time: new Date().toISOString(), message: `${user?.name || 'Arzt'}: ${task.label} (+${adjustedPayout}€ / +${adjustedXp} XP)` },
          ...prev.activityLog.slice(0, 49),
        ],
      }
      localStorage.setItem('medisim_hospital_' + updated.id, JSON.stringify(updated))
      return updated
    })
    return { success: true, task: { ...task, payout: adjustedPayout, xp: adjustedXp } }
  }, [addMoney, addSpecialtyAction, updateUser, user])

  return (
    <HospitalContext.Provider value={{
      hospital, hasPermission, isOwner,
      updateMemberPermissions, setMemberRole,
      hireWorker, fireWorker, setWorkerStation,
      triagePatient, moveToWaiting, moveToTreatment,
      dischargePatient: dischargePatientWithRevenue,
      addRoom, removeRoom, addTreatmentRoom, addEquipmentToRoom, purchaseStationEquipment, removeEquipmentFromRoom, updateTreatmentRoomEquipmentState,
      renameStation, renameTreatmentRoom,
      assignPatientToTreatmentRoom, removePatientFromRoom,
      toggleClosed, dismissEvent, dismissAlert,
      sendPagerMessage,
      leaveHospital, disbandHospital, updateHospitalSettings,
      depositToHospital, takeLoan, repayLoan, updateRevenueDistribution,
      executeAction,
      purchaseMedication, useMedication, addLabResults,
      fetchResuscitationCart, fetchMobileSono, returnMobileSono, toggleCpr, defibAnalyze, defibCharge, defibShock, giveResusMedication, triggerReanimationAlarm, devForceResusState, devForceVomitState,
      createPatientOrder, updatePatientOrderStatus,
      addPatientNote, updatePatientMedicationPlan, updatePatientChatSnapshot, addPatientLogEntry, updatePatientLogEntry, deletePatientLogEntry, addPatientExamResult, assignDiagnoses, assignCareTeam, upsertPatientDocument,
      setPatientSecurityPosting, setPatientWardClothing, transferPatientToPsychiatry, abortResuscitation, transferDeceasedToMorgue, sendDeceasedToUndertaker,
      setDoctorOnDuty,
      performAssistantTask,
      devSpawnPatient, devSpawnTemplatePatient, devSpawnCtPreviewPatient, devRemovePatientById, devSpawnSpecialPatient, devTriggerMassEvent, devSpawnIvenaPrealert, createIvenaPrealertFromRescue, devClearAllPatients, devSkipTime,
      canReceivePatients: canReceive,
      hasReceivingInfrastructure,
    }}>
      {children}
    </HospitalContext.Provider>
  )
}

export function useHospital() {
  const ctx = useContext(HospitalContext)
  if (!ctx) throw new Error('useHospital muss innerhalb von HospitalProvider verwendet werden')
  return ctx
}
