import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospital } from '../context/HospitalContext'
import { WORKER_TYPES } from '../data/workerTypes'
import { TRIAGE_LEVELS, getDiagnosisListsBySpecialty } from '../data/patientGenerator'
import { EQUIPMENT, TREATMENT_ROOM_COST, SHOCK_ROOM_COST } from '../data/equipmentData'
import { WORKER_FUNCTIONS } from '../data/roomFunctions'
import { RANKS, getCurrentRank, hasRankCapability, normalizeSpecialtyId, SPECIALTY_PROMOTION_COURSES } from '../data/ranks'
import { getEquipmentForRoom } from '../data/equipmentData'
import {
  ASSISTENZARZT_BASIC_STOCK_LIMIT,
  MEDICATIONS,
  MEDICATION_CATEGORIES,
  canUseMedication,
  getMedicationsByCategory,
  isBasicMedicationForAssistenzarzt,
} from '../data/medications'
import PatientChat from '../components/PatientChat'
import PatientFile from '../components/PatientFile'
import TreatmentRoomView from '../components/TreatmentRoomView'
import DiagnosticRoomView from '../components/DiagnosticRoomView'
import PhysicalExamModal from '../components/exam/PhysicalExamModal'
import BloodDrawModal from '../components/triage/BloodDrawModal'
import examChestAsset from '../assets/exam/front-male.png'
import armAsset from '../assets/phlebotomy/arm.png'
import ambulanceSound from '../assets/sfx/ambulance.mp3'
import pagerSound from '../assets/sfx/pager.mp3'
import bloodPressureSound from '../assets/sfx/bloodpressure.mp3'
import { playOneShot } from '../utils/soundManager'
import { SPECIALIZATION_REQUIRED_CASES } from '../data/specialties'
import { getOrderModality } from '../data/ordersCatalog'
import { getSpecialState } from '../data/shopSpecials'
import { requestDispatchReply } from '../services/dispatchChatAiService'
import dispatchPhoneFrameAsset from '../assets/ui/dispatch-phone-frame.svg'
import dispatchAvatarAsset from '../assets/ui/dispatch-avatar.svg'
import {
  Building2, Users, Bed, Shield, DollarSign, Activity, Heart,
  Wrench, FlaskConical, Scan, Sparkles, ClipboardList, Siren, Pill,
  Dumbbell, Plus, X, Check, AlertCircle, ChevronRight, Settings,
  Crown, UserPlus, Lock, Unlock, Clock, ArrowRight,
  Stethoscope, Thermometer, HeartPulse, AlertTriangle,
  MoveRight, LogOut, Clipboard, Droplets, Monitor, ShieldOff,
  ShieldAlert, ChevronDown, ChevronUp, Terminal, Banknote,
  CreditCard, PiggyBank, Send, Wallet, MessageCircle, Brain, ArrowRightLeft, Search, PhoneCall, BellRing
} from 'lucide-react'

const workerIconMap = { Heart, Wrench, FlaskConical, Scan, Sparkles, ClipboardList, Siren, Pill, Dumbbell, Users }

const ROOM_DEFS = {
  er: { name: 'Notaufnahme', icon: Siren, color: 'bg-red-100 text-red-600' },
  ward: { name: 'Allgemeinstation', icon: Bed, color: 'bg-blue-100 text-blue-600' },
  icu: { name: 'Intensivstation', icon: HeartPulse, color: 'bg-rose-100 text-rose-600' },
  or: { name: 'OP-Saal', icon: Stethoscope, color: 'bg-amber-100 text-amber-600' },
  lab: { name: 'Labor', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-600' },
  radiology: { name: 'Radiologie', icon: Scan, color: 'bg-indigo-100 text-indigo-600' },
  pharmacy: { name: 'Apotheke', icon: Pill, color: 'bg-violet-100 text-violet-600' },
  rehab: { name: 'Rehabilitationszentrum', icon: Dumbbell, color: 'bg-lime-100 text-lime-600' },
  morgue: { name: 'Leichenhalle', icon: Clipboard, color: 'bg-slate-100 text-slate-600' },
  cardiology: { name: 'Kardiologie', icon: HeartPulse, color: 'bg-pink-100 text-pink-600' },
  pneumology: { name: 'Pneumologie', icon: Activity, color: 'bg-sky-100 text-sky-600' },
  neurology: { name: 'Neurologie', icon: Brain, color: 'bg-indigo-100 text-indigo-600' },
  ambulance_intake: { name: 'Ambulante Aufnahme', icon: Plus, color: 'bg-cyan-100 text-cyan-600' },
  waiting_room: { name: 'Wartezimmer', icon: Clock, color: 'bg-gray-100 text-gray-600' },
}

const BUILDABLE_ROOMS = [
  { id: 'ambulance_intake', cost: 3000 },
  { id: 'waiting_room', cost: 1000 },
  { id: 'icu', cost: 8000 },
  { id: 'or', cost: 12000 },
  { id: 'lab', cost: 6000 },
  { id: 'radiology', cost: 10000 },
  { id: 'cardiology', cost: 12000 },
  { id: 'pneumology', cost: 8000 },
  { id: 'neurology', cost: 10000 },
  { id: 'pharmacy', cost: 4000 },
  { id: 'rehab', cost: 4500 },
  { id: 'morgue', cost: 3500 },
  { id: 'er', cost: 5000 },
  { id: 'ward', cost: 3000 },
]

const STATION_LABELS = { er: 'Notaufnahme', ward: 'Allgemeinstation', icu: 'Intensivstation', or: 'OP-Saal', lab: 'Labor', radiology: 'Radiologie', cardiology: 'Kardiologie', pneumology: 'Pneumologie', neurology: 'Neurologie', pharmacy: 'Apotheke', rehab: 'Rehabilitationszentrum', morgue: 'Leichenhalle' }
const TREATMENT_ROOM_STATIONS = ['er', 'ward', 'icu', 'or']
const DIAGNOSTIC_STATIONS = ['radiology', 'cardiology', 'pneumology', 'neurology']

function IcuWave({ className = '', color = '#22c55e' }) {
  return (
    <svg viewBox="0 0 220 52" preserveAspectRatio="none" className={className}>
      {[...Array(12)].map((_, i) => (
        <line key={`v-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="52" stroke="rgba(34,197,94,0.08)" strokeWidth="0.8" />
      ))}
      {[...Array(6)].map((_, i) => (
        <line key={`h-${i}`} x1="0" y1={i * 10} x2="220" y2={i * 10} stroke="rgba(34,197,94,0.08)" strokeWidth="0.8" />
      ))}
      <path d="M0 30 L22 30 L32 30 L40 14 L48 42 L58 30 L70 30 L84 30 L92 24 L100 30 L112 30 L120 30 L128 13 L136 43 L146 30 L160 30 L172 30 L180 24 L188 30 L220 30" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M0 30 L22 30 L32 30 L40 14 L48 42 L58 30 L70 30 L84 30 L92 24 L100 30 L112 30 L120 30 L128 13 L136 43 L146 30 L160 30 L172 30 L180 24 L188 30 L220 30" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="16 8" opacity="0.8">
        <animate attributeName="stroke-dashoffset" from="0" to="-96" dur="1.2s" repeatCount="indefinite" />
      </path>
      <rect x="0" y="0" width="220" height="52" fill="rgba(16,185,129,0.08)" />
    </svg>
  )
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function parseBp(bpString) {
  const [sys, dia] = String(bpString || '120/80').split('/').map(v => Number(v || 0))
  return {
    sys: Number.isFinite(sys) && sys > 0 ? sys : 120,
    dia: Number.isFinite(dia) && dia > 0 ? dia : 80,
  }
}

function smoothToward(current, target, ratio = 0.35) {
  return current + (target - current) * ratio
}

const ASSISTANT_MINI_COOLDOWN_MS = 30000
const PRACTICE_BLOOD_DRAW_PATIENT = { id: 'practice_phlebotomy', name: 'Übungspatient (Standard)', gender: 'm' }

const PERM_LABELS = {
  manage_hospital: 'Krankenhaus verwalten',
  manage_rooms: 'Räume bauen/bearbeiten',
  manage_staff: 'Personal einstellen/entlassen',
  manage_members: 'Mitglieder verwalten',
  manage_permissions: 'Berechtigungen ändern',
  manage_finances: 'Finanzen verwalten',
  treat_patients: 'Patienten behandeln',
}

const DEV_MEDICAL_SPECIALTIES = [
  { id: 'notfallmedizin', name: 'Notfallmedizin' },
  { id: 'innere', name: 'Innere Medizin' },
  { id: 'chirurgie', name: 'Chirurgie' },
  { id: 'neurologie', name: 'Neurologie' },
  { id: 'anaesthesie', name: 'Anaesthesiologie' },
]

export default function Hospital() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateUser, addMoney, triggerPolicePenalty, clearLegalState, resetUserProfile } = useAuth()
  const canUseDevTools = user?.role === 'admin'
  const {
    hospital, hasPermission, isOwner, hireWorker, fireWorker, setWorkerStation,
    triagePatient, moveToWaiting, moveToTreatment, dischargePatient,
    addRoom, removeRoom, addTreatmentRoom, addEquipmentToRoom, purchaseStationEquipment, removeEquipmentFromRoom, updateTreatmentRoomEquipmentState,
    assignPatientToTreatmentRoom, removePatientFromRoom,
    toggleClosed, dismissEvent, dismissAlert,
    updateMemberPermissions, setMemberRole, canReceivePatients, hasReceivingInfrastructure,
    leaveHospital, disbandHospital,
    depositToHospital, takeLoan, repayLoan, updateRevenueDistribution,
    executeAction,
    purchaseMedication, useMedication, addLabResults,
    fetchResuscitationCart, fetchMobileSono, returnMobileSono, toggleCpr, defibAnalyze, defibCharge, defibShock, giveResusMedication, triggerReanimationAlarm, devForceResusState, devForceVomitState,
    createPatientOrder, updatePatientOrderStatus,
    addPatientNote, updatePatientMedicationPlan, updatePatientChatSnapshot, addPatientLogEntry, updatePatientLogEntry, deletePatientLogEntry, addPatientExamResult, assignDiagnoses, upsertPatientDocument,
    assignCareTeam, setPatientSecurityPosting, transferPatientToPsychiatry, abortResuscitation, transferDeceasedToMorgue, sendDeceasedToUndertaker, setDoctorOnDuty, performAssistantTask,
    renameStation, renameTreatmentRoom,
    devSpawnPatient, devSpawnTemplatePatient, devSpawnCtPreviewPatient, devRemovePatientById, devSpawnSpecialPatient, devTriggerMassEvent, devSpawnIvenaPrealert, devClearAllPatients, devSkipTime,
  } = useHospital()

  const [tab, setTab] = useState('overview')
  const [medCategory, setMedCategory] = useState('all')
  const [medSearch, setMedSearch] = useState('')
  const [showMedDetail, setShowMedDetail] = useState(null)
  const [medQuantities, setMedQuantities] = useState({})
  const [bulkMedQty, setBulkMedQty] = useState(1)
  const [bulkMedSelection, setBulkMedSelection] = useState({})
  const btmCertified = user?.btmCertified || false
  const [btmTestModal, setBtmTestModal] = useState(false)
  const [patientFileOpen, setPatientFileOpen] = useState(null)
  const [patientFileInitialTab, setPatientFileInitialTab] = useState('overview')
  const [patientFileLockedTab, setPatientFileLockedTab] = useState(null)
  const [showHire, setShowHire] = useState(false)
  const [showBuild, setShowBuild] = useState(false)
  const [showBuildTR, setShowBuildTR] = useState(false)
  const [showEquipment, setShowEquipment] = useState(null)
  const [roomRemoveTarget, setRoomRemoveTarget] = useState(null)
  const [roomRemoveConfirmText, setRoomRemoveConfirmText] = useState('')
  const [roomRemoveArmed, setRoomRemoveArmed] = useState(false)
  const [hireResult, setHireResult] = useState(null)
  const [editPermsFor, setEditPermsFor] = useState(null)
  const [triageModal, setTriageModal] = useState(null)
  const [assignModal, setAssignModal] = useState(null)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [manvConfirmOpen, setManvConfirmOpen] = useState(false)
  const [manvConfirmStep, setManvConfirmStep] = useState(1)
  const [showDevMenu, setShowDevMenu] = useState(false)
  const [devEventPending, setDevEventPending] = useState(false)
  const diagnosisCatalog = useMemo(() => getDiagnosisListsBySpecialty(), [])
  const [devSpecialty, setDevSpecialty] = useState(diagnosisCatalog[0]?.specialty || 'innere')
  const currentDevDiagnoses = diagnosisCatalog.find(s => s.specialty === devSpecialty)?.diagnoses || []
  const [devDiagnosisCode, setDevDiagnosisCode] = useState(currentDevDiagnoses[0]?.code || '')
  const [devArrivalType, setDevArrivalType] = useState('walk_in')
  const [devCtRegion, setDevCtRegion] = useState('kopf')
  const [devCtMode, setDevCtMode] = useState('pathologic')
  const [devCtPreset, setDevCtPreset] = useState('bleed')
  const [devCtPreviewPatientId, setDevCtPreviewPatientId] = useState(null)
  const [devCtLaunching, setDevCtLaunching] = useState(false)
  const devCtPresetOptions = useMemo(() => ({
    kopf: [
      { id: 'bleed', label: 'Blutung' },
      { id: 'ischemia', label: 'Ischämie' },
    ],
    thorax: [
      { id: 'pneumonia', label: 'Pneumonie' },
      { id: 'pneumothorax', label: 'Pneumothorax' },
    ],
    abdomen: [
      { id: 'appendicitis', label: 'Appendizitis' },
      { id: 'pancreatitis', label: 'Pankreatitis' },
      { id: 'ileus', label: 'Ileus' },
    ],
  }), [])

  useEffect(() => {
    if (!currentDevDiagnoses.some(d => d.code === devDiagnosisCode)) {
      setDevDiagnosisCode(currentDevDiagnoses[0]?.code || '')
    }
  }, [devSpecialty, devDiagnosisCode, currentDevDiagnoses])
  useEffect(() => {
    const options = devCtPresetOptions[devCtRegion] || []
    if (!options.some(opt => opt.id === devCtPreset)) {
      setDevCtPreset(options[0]?.id || '')
    }
  }, [devCtRegion, devCtPreset, devCtPresetOptions])
  const [showFinances, setShowFinances] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [revenueSplit, setRevenueSplit] = useState({ primary: 40, assistant: 20, hospital: 30, supervisor: 10 })
  const [revenueSplitError, setRevenueSplitError] = useState('')
  const [loanModal, setLoanModal] = useState(false)
  const [newTRName, setNewTRName] = useState('')
  const [newTRStation, setNewTRStation] = useState('er')
  const [newTRType, setNewTRType] = useState('standard')
  const [activeAction, setActiveAction] = useState(null) // { action, progress, timer }
  const [actionResult, setActionResult] = useState(null)
  useEffect(() => {
    if (newTRStation !== 'er' && newTRType !== 'standard') {
      setNewTRType('standard')
    }
  }, [newTRStation, newTRType])
  const [openRoomView, setOpenRoomView] = useState(null) // treatment room id to open in full-screen view
  const [openDiagnosticRoomView, setOpenDiagnosticRoomView] = useState(null) // diagnostic device room id
  const [devCheatMoney, setDevCheatMoney] = useState('5000')
  const [devSkipHours, setDevSkipHours] = useState('2')
  const [devCheatXp, setDevCheatXp] = useState('500')
  const [devCasesCompleted, setDevCasesCompleted] = useState('0')
  const [devSuccessRate, setDevSuccessRate] = useState('0')
  const [devPatientsHelped, setDevPatientsHelped] = useState('0')
  const [devCoursesCompleted, setDevCoursesCompleted] = useState('0')
  const [debtWarningSeenToken, setDebtWarningSeenToken] = useState(0)
  const [debtPopup, setDebtPopup] = useState(null)
  const [dispatchCallOpen, setDispatchCallOpen] = useState(false)
  const [dispatchInput, setDispatchInput] = useState('')
  const [dispatchTyping, setDispatchTyping] = useState(false)
  const [dispatchChat, setDispatchChat] = useState([])
  const dispatchEventIdRef = useRef(null)

  const dispatchLiveContext = useMemo(() => {
    const evt = hospital?.activeEvent || null
    const queue = (hospital?.ivenaQueue || []).filter((q) => String(q?.id || '').startsWith('manv_') || String(q?.id || '').startsWith('manv_dev_'))
    const now = Date.now()
    const etaList = queue
      .map((q) => {
        const ts = Date.parse(q?.etaAt || '')
        return Number.isFinite(ts) ? Math.max(0, Math.round((ts - now) / 60000)) : null
      })
      .filter((v) => v !== null)
      .sort((a, b) => a - b)
    const triageFromQueue = queue.reduce((acc, q) => {
      const t = String(q?.priority || q?.patient?.suggestedTriage || '').toLowerCase()
      if (t === 'red') acc.red += 1
      else if (t === 'yellow') acc.yellow += 1
      else acc.green += 1
      return acc
    }, { red: 0, yellow: 0, green: 0 })
    const diagnosisHintsDynamic = [...new Set(queue
      .map((q) => q?.patient?.trueDiagnoses?.primary?.name || q?.patient?.diagnoses?.primary?.name || q?.patient?.chiefComplaint || '')
      .filter(Boolean))]
      .slice(0, 8)
    const dispatchUnits = [...new Set(queue.map((q) => q?.dispatch).filter(Boolean))]
    return {
      title: evt?.title || '',
      expectedTotal: Number(evt?.patientCount || 0),
      immediateArrivals: Number(evt?.immediateCount || 0),
      remainingIvena: queue.length,
      firstEtaMinutes: etaList.length ? etaList[0] : null,
      lastEtaMinutes: etaList.length ? etaList[etaList.length - 1] : null,
      triageQueued: triageFromQueue,
      dispatchUnits,
      diagnosisHints: (evt?.incidentFacts?.injuryPatterns || []).length
        ? evt.incidentFacts.injuryPatterns
        : diagnosisHintsDynamic,
      incidentFacts: evt?.incidentFacts || null,
    }
  }, [hospital?.activeEvent, hospital?.ivenaQueue])

  const canReopenDispatchPhone = useMemo(() => {
    const evt = hospital?.activeEvent
    if (!evt?.id) return false
    const startedAt = Date.parse(evt.timestamp || '')
    if (!Number.isFinite(startedAt)) return false
    return (Date.now() - startedAt) <= (60 * 60 * 1000)
  }, [hospital?.activeEvent])

  function buildLocalDispatchReply(question, ctx) {
    const q = String(question || '').toLowerCase()
    const facts = ctx?.incidentFacts || {}
    if (/was genau passiert|was ist passiert|lagebild|einsatzlage/.test(q)) {
      return `Leitstelle: Lagebild ${ctx.title || 'MANV'} an ${facts.location || 'unklarer Örtlichkeit'}. Primärlage: ${facts.hazards || 'noch in Klärung'}. Wetter/Umfeld: ${facts.weather || 'ohne besondere Witterungsmeldung'}.`
    }
    if (/was für.*unfall|welcher unfall|ursache|szenario/.test(q)) {
      return `Leitstelle: Szenario "${ctx.title || 'MANV'}". Nach aktueller Lagemeldung erwarten wir vor allem ${(ctx.diagnosisHints || []).slice(0, 4).join(', ') || 'Trauma-/Atemwegslagen'}.`
    }
    if (/wie viele.*(verletzte|patient)/.test(q)) {
      return `Leitstelle: Aktuell erwarten wir insgesamt ca. ${ctx.expectedTotal || 0} Betroffene, davon ${ctx.immediateArrivals || 0} sofort/zu Fuß und ${ctx.remainingIvena || 0} als Leitnetz-Zulauf.`
    }
    if (/wie viele.*rtw|rtw.*wie viele|wieviele.*rtw/.test(q)) {
      return `Leitstelle: Stand jetzt ${ctx.dispatchUnits?.length || 0} gemeldete RTW/NEF-Kennungen in den Voranmeldungen (${(ctx.dispatchUnits || []).slice(0, 5).join(', ') || 'noch keine Kennungen'}).`
    }
    if (/wann.*(erste|patient|eintreff|ankunft)/.test(q)) {
      if (ctx.firstEtaMinutes == null) return 'Leitstelle: ETA der ersten Welle noch unklar, wir geben Update sobald disponiert.'
      return `Leitstelle: Erste transportierte Patienten voraussichtlich in ca. ${ctx.firstEtaMinutes} min, letzte gemeldete Welle ca. ${ctx.lastEtaMinutes ?? ctx.firstEtaMinutes} min.`
    }
    if (/welche.*(verletzung|krank|diagnose|muster)/.test(q)) {
      return `Leitstelle: Typische Verletzungsmuster aktuell: ${(ctx.diagnosisHints || []).join(', ') || 'Trauma- und Atemwegslagen gemischt'}. Triage-Zulauf R:${ctx.triageQueued?.red || 0} / Y:${ctx.triageQueued?.yellow || 0} / G:${ctx.triageQueued?.green || 0}.`
    }
    return `Leitstelle: Lage läuft. Erwartet ${ctx.expectedTotal || 0} Betroffene, aktuell ${ctx.remainingIvena || 0} Leitnetz-Voranmeldungen offen. Bei Bedarf priorisieren wir Rot-Patienten zuerst.`
  }

  useEffect(() => {
    if (!canUseDevTools) return
    const shouldOpen = localStorage.getItem('medisim_open_hospital_dev') === '1'
    if (!shouldOpen) return
    localStorage.removeItem('medisim_open_hospital_dev')
    setShowDevMenu(true)
  }, [canUseDevTools])

  useEffect(() => {
    const token = Number(hospital?.debtPopupToken || 0)
    if (!token || token === debtWarningSeenToken) return
    setDebtWarningSeenToken(token)
    setDebtPopup(hospital?.debtPopupMessage || 'Warnung: Das Krankenhaus ist verschuldet. Weitere Ausgaben erhöhen die Schulden.')
  }, [hospital?.debtPopupToken, hospital?.debtPopupMessage, debtWarningSeenToken])

  useEffect(() => {
    const evt = hospital?.activeEvent
    if (!evt?.id || !evt?.callActive) return
    if (dispatchEventIdRef.current === evt.id) return
    dispatchEventIdRef.current = evt.id
    setDispatchCallOpen(true)
    const facts = evt?.incidentFacts || {}
    const triage = facts?.triageSummary || {}
    setDispatchChat([
      {
        role: 'assistant',
        content: `Leitstelle: MANV-Lage "${evt.title}". Ort: ${facts.location || 'unklar'}. Lagebild: ${facts.hazards || 'noch unklar'}. Erwartete Triage aktuell R:${triage.red || 0} / Y:${triage.yellow || 0} / G:${triage.green || 0}. Leitnetz-Zulauf kommt gestaffelt.`,
      },
    ])
  }, [hospital?.activeEvent])

  useEffect(() => {
    if (!dispatchCallOpen) return
    const endTs = Date.parse(hospital?.activeEvent?.callEndsAt || '')
    if (!Number.isFinite(endTs)) return
    const timer = setInterval(() => {
      if (Date.now() < endTs) return
      setDispatchTyping(false)
      setDispatchChat((prev) => {
        if (prev.some((m) => m.meta === 'end_notice')) return prev
        return [
          ...prev,
          {
            role: 'assistant',
            content: 'Leitstelle: Ich muss wieder in die Einsatzkoordination. Weitere Voranmeldungen laufen wie besprochen. Ende.',
            meta: 'end_notice',
          },
        ]
      })
      clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [dispatchCallOpen, hospital?.activeEvent?.callEndsAt])

  const sendDispatchMessage = async () => {
    const text = String(dispatchInput || '').trim()
    if (!text || dispatchTyping) return
    setDispatchInput('')
    const eventTitle = hospital?.activeEvent?.title || 'MANV'
    const nextHistory = [...dispatchChat, { role: 'user', content: text }]
    setDispatchChat(nextHistory)
    setDispatchTyping(true)
    const fallback = buildLocalDispatchReply(text, dispatchLiveContext)
    const res = await requestDispatchReply({
      eventTitle,
      eventContext: dispatchLiveContext,
      userMessage: text,
      history: nextHistory,
    })
    setDispatchTyping(false)
    const aiText = String(res?.ok ? res.text : '').trim()
    const generic = /lage laeuft|lage läuft|priorisieren wir rot-patienten zuerst|keine information|noch unklar|keine.*daten|keine.*meldung/i.test(aiText)
    const asksSpecific = /was genau|was für|welche|wie viele|wann|eta|rtw|verletz|patient/.test(text.toLowerCase())
    const tooVague = generic && asksSpecific
    setDispatchChat((prev) => [
      ...prev,
      { role: 'assistant', content: res?.ok ? (tooVague ? fallback : aiText) : fallback },
    ])
  }

  useEffect(() => {
    if (!canUseDevTools) return undefined
    const onOpenDevMenu = () => setShowDevMenu(true)
    window.addEventListener('medisim:openHospitalDevMenu', onOpenDevMenu)
    return () => window.removeEventListener('medisim:openHospitalDevMenu', onOpenDevMenu)
  }, [canUseDevTools])
  useEffect(() => {
    if (canUseDevTools) return
    if (showDevMenu) setShowDevMenu(false)
  }, [canUseDevTools, showDevMenu])
  const [icuMonitorMap, setIcuMonitorMap] = useState({})

  // Triage state
  const [triagePhase, setTriagePhase] = useState('chat') // 'chat' | 'vitals' | 'assess'
  const [chatData, setChatData] = useState(null)
  const [triageChatSnapshot, setTriageChatSnapshot] = useState(null)
  const [triageChatSnapshots, setTriageChatSnapshots] = useState({})
  const [triageVitals, setTriageVitals] = useState(null)
  const [triageBlood, setTriageBlood] = useState(false)
  const [triageNotes, setTriageNotes] = useState('')
  const [triageLevel, setTriageLevel] = useState(null)
  const [triageExamResults, setTriageExamResults] = useState([])
  const [showTriageExamModal, setShowTriageExamModal] = useState(false)
  const [showBloodDrawModal, setShowBloodDrawModal] = useState(false)
  const [bloodDrawPatient, setBloodDrawPatient] = useState(null)
  const [bloodDrawMode, setBloodDrawMode] = useState('clinical')
  const [bloodDrawPresetParams, setBloodDrawPresetParams] = useState([])
  const [dutyStation, setDutyStation] = useState('er')
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [measuringVitals, setMeasuringVitals] = useState({})
  const [triageLabOrdered, setTriageLabOrdered] = useState(false)
  const [showBpMiniGame, setShowBpMiniGame] = useState(false)
  const [bpMiniStep, setBpMiniStep] = useState(0)
  const [showEkgMiniGame, setShowEkgMiniGame] = useState(false)
  const [ekgMiniStep, setEkgMiniStep] = useState(0)
  const [ekgPlacedLeads, setEkgPlacedLeads] = useState({})
  const [assistantCooldownUntil, setAssistantCooldownUntil] = useState({ blood: 0, ekg: 0, nibp: 0 })
  const [assistantCooldownTick, setAssistantCooldownTick] = useState(0)
  useEffect(() => {
    const now = Date.now()
    const active = ['blood', 'ekg', 'nibp'].some((k) => Number(assistantCooldownUntil[k] || 0) > now)
    if (!active) return undefined
    const id = setInterval(() => setAssistantCooldownTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [assistantCooldownUntil])
  const bumpAssistantCooldown = (key) => {
    setAssistantCooldownUntil((prev) => ({ ...prev, [key]: Date.now() + ASSISTANT_MINI_COOLDOWN_MS }))
  }
  const assistantCooldownRemaining = (key) =>
    Math.max(0, Math.ceil((Number(assistantCooldownUntil[key] || 0) - Date.now()) / 1000))
  const [psychTransferConfirm, setPsychTransferConfirm] = useState(null)
  const [undertakerConfirm, setUndertakerConfirm] = useState(null)
  const [dischargeConfirm, setDischargeConfirm] = useState(null)
  const [idSwipeModal, setIdSwipeModal] = useState({ open: false, payload: null })
  const [renameModal, setRenameModal] = useState({
    open: false,
    mode: 'station',
    stationId: null,
    roomId: null,
    label: '',
    value: '',
  })

  useEffect(() => {
    setRevenueSplit(hospital?.revenueDistribution || { primary: 40, assistant: 20, hospital: 30, supervisor: 10 })
    setRevenueSplitError('')
  }, [hospital?.revenueDistribution])
  useEffect(() => {
    if (!showDevMenu) return
    setDevCasesCompleted(String(Number(user?.stats?.casesCompleted || 0)))
    setDevSuccessRate(String(Number(user?.stats?.successRate || 0)))
    setDevPatientsHelped(String(Number(user?.stats?.patientsHelped || 0)))
    setDevCoursesCompleted(String(Number(user?.completedCourses?.length || 0)))
  }, [showDevMenu, user?.stats?.casesCompleted, user?.stats?.successRate, user?.stats?.patientsHelped, user?.completedCourses?.length])
  const [idSwipeProgress, setIdSwipeProgress] = useState(0)
  const [idSwipeDragging, setIdSwipeDragging] = useState(false)
  const [idSwipeX, setIdSwipeX] = useState(0)
  const [selectedIvena, setSelectedIvena] = useState(null)
  const tutorialDoneKey = `medisim_hospital_tutorial_done_${user?.id || 'anon'}_${hospital?.id || 'none'}`
  const tutorialForceKey = `medisim_hospital_tutorial_force_${user?.id || 'anon'}_${hospital?.id || 'none'}`
  const tutorialSteps = [
    { title: 'Willkommen in Medic Inc', text: 'Hier siehst du den Krankenhausstatus, offene Alerts und deine wichtigsten Aktionen.', tab: 'overview', anchor: 'top-right' },
    { title: 'Fälle bearbeiten', text: 'Im Tab "Fälle" triagierst du Patienten und weist sie Zimmern zu.', tab: 'patients', anchor: 'mid-left' },
    { title: 'Simulationsakte: Übersicht', text: 'Jetzt öffnen wir eine Simulationsakte. In der Übersicht findest du Kerninfos zum Fall und klinische Lage.', tab: 'patients', anchor: 'center-right', action: 'open_sim_overview' },
    { title: 'Simulationsakte: Vitalprotokoll', text: 'Hier verfolgst du Vitalverläufe und erkennst Trends frühzeitig.', tab: 'patients', anchor: 'center-right', action: 'open_sim_vitals' },
    { title: 'Simulationsakte: Labor', text: 'Im Laborbereich wählst du Werte, startest Selbstabnahme oder forderst Labor direkt an.', tab: 'patients', anchor: 'center-right', action: 'open_sim_lab' },
    { title: 'Simulationsakte: Diagnosen', text: 'Hier setzt du Haupt-, Neben- und chronische Diagnosen und prüfst die Plausibilität.', tab: 'patients', anchor: 'center-right', action: 'open_sim_diagnosis' },
    { title: 'Simulationsakte: Dokumente', text: 'Hier findest du Berichte/Protokolle und dokumentierst den Verlauf sauber.', tab: 'patients', anchor: 'center-right', action: 'open_sim_documents' },
    { title: 'Zimmer & Geräte', text: 'Unter "Zimmer" öffnest du Behandlungsräume, nutzt Geräte und behandelst Patienten.', tab: 'treatment_rooms', anchor: 'mid-right' },
    { title: 'Finanzen', text: 'Unter "Finanzen" verwaltest du Budget, Einnahmen und Vergütungsverteilung.', tab: 'finances', anchor: 'top-right' },
    { title: 'Dienst melden', text: 'Melde dich in der Notaufnahme in den Dienst, damit neue Patienten eintreffen können.', tab: 'overview', anchor: 'top-right' },
  ]
  const tutorialSimPatient = useMemo(() => ({
    id: 'tutorial_sim_patient',
    name: 'Max Mustermann (Simulation)',
    age: 54,
    gender: 'männlich',
    arrivalType: 'walk_in',
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Brustschmerz seit 40 Minuten',
    symptoms: ['Brustschmerz', 'Übelkeit', 'Schweißausbruch'],
    preInfo: 'Simulationsfall zur Einführung in die Patientenakte.',
    status: 'triaged',
    triageLevel: 'orange',
    triaged: true,
    triagedAt: new Date().toISOString(),
    vitals: { hr: 104, bp: '156/92', rr: 22, temp: 37.1, spo2: 95 },
    vitalsHistory: [{ time: new Date().toISOString(), source: 'tutorial', hr: 104, bp: '156/92', rr: 22, temp: 37.1, spo2: 95 }],
    labHistory: [],
    examResults: [],
    diagnoses: { primary: null, secondary: [], chronic: [] },
    trueDiagnoses: { primary: { code: 'I21.9', name: 'Akuter Myokardinfarkt' }, secondary: [], chronic: [] },
    medicationPlan: [],
    patientLog: [{ time: new Date().toISOString(), type: 'tutorial', author: 'System', text: 'Simulationsfall gestartet.' }],
    notes: [],
    documents: [],
    orders: [],
    careTeam: { primary: user?.id || null, assistant: [], supervisor: null },
    clinicalState: { stability: 'instabil', consciousness: 'wach', dyspnea: 3, complaintLevel: 6, pain: 6 },
  }), [user?.id])
  const knownPatientIdsRef = useRef(new Set((hospital?.patients || []).map(p => p.id)))
  const lastEventTsRef = useRef(hospital?.activeEvent?.timestamp || null)
  const knownAlertIdsRef = useRef(new Set((hospital?.alertQueue || []).map(a => a.id)))

  useEffect(() => {
    if (!hospital) return
    const known = knownPatientIdsRef.current
    const incomingAmbulance = (hospital.patients || []).find(p => !known.has(p.id) && p.arrivalType === 'ambulance')
    knownPatientIdsRef.current = new Set((hospital.patients || []).map(p => p.id))
    if (incomingAmbulance) {
      playOneShot(ambulanceSound, { volume: 0.16, maxDurationMs: 5000 })
    }
  }, [hospital])

  useEffect(() => {
    if (!hospital) return
    const currentTs = hospital.activeEvent?.timestamp || null
    if (currentTs && currentTs !== lastEventTsRef.current) {
      playOneShot(pagerSound, { volume: 0.16 })
    }
    lastEventTsRef.current = currentTs
  }, [hospital])

  useEffect(() => {
    if (!hospital) return
    const queue = hospital.alertQueue || []
    const currentIds = new Set(queue.map(a => a.id))
    if (knownAlertIdsRef.current.size === 0) {
      knownAlertIdsRef.current = currentIds
      return
    }
    const newlyAdded = queue.filter(a => !knownAlertIdsRef.current.has(a.id))
    knownAlertIdsRef.current = currentIds
    const topNewAlert = newlyAdded[0]
    if (topNewAlert && (topNewAlert.severity === 'critical' || topNewAlert.severity === 'high')) {
      playOneShot(pagerSound, { volume: 0.14 })
    }
  }, [hospital])

  useEffect(() => {
    if (!hospital?.id || !user?.id) return
    const force = localStorage.getItem(tutorialForceKey) === '1'
    const done = localStorage.getItem(tutorialDoneKey) === '1'
    if (force || !done) {
      setShowTutorial(true)
      setTutorialStep(0)
    }
    if (force) localStorage.removeItem(tutorialForceKey)
  }, [hospital?.id, user?.id, tutorialDoneKey, tutorialForceKey])

  useEffect(() => {
    if (!showTutorial) return
    const targetTab = tutorialSteps[tutorialStep]?.tab
    if (targetTab) setTab(targetTab)
  }, [showTutorial, tutorialStep, tutorialSteps])

  useEffect(() => {
    const action = tutorialSteps[tutorialStep]?.action
    const tabMap = {
      open_sim_overview: 'overview',
      open_sim_vitals: 'vitals',
      open_sim_lab: 'lab',
      open_sim_diagnosis: 'diagnosis',
      open_sim_documents: 'notes',
    }
    const targetTab = action ? tabMap[action] : null
    if (showTutorial && targetTab && patientFileOpen?.id === 'tutorial_sim_patient') {
      setPatientFileInitialTab(targetTab)
      return
    }
    if (patientFileOpen?.id === 'tutorial_sim_patient') {
      setPatientFileOpen(null)
      setPatientFileInitialTab('overview')
    }
  }, [showTutorial, tutorialStep, tutorialSteps, tutorialSimPatient, patientFileOpen?.id])

  useEffect(() => {
    const openPatientId = location?.state?.openPatientId
    if (!openPatientId || !hospital?.patients?.length) return
    const target = hospital.patients.find(p => p.id === openPatientId)
    if (!target) return
    openPatientFileAtTab(target, location?.state?.openTab || 'overview')
    navigate(location.pathname, { replace: true, state: {} })
  }, [location?.state, hospital?.patients, navigate, location?.pathname])

  useEffect(() => {
    const rooms = (hospital?.treatmentRooms || [])
      .filter(room => room.station === 'icu' && room.patientId)
    const icuPatients = rooms
      .map(room => (hospital?.patients || []).find(p => p.id === room.patientId))
      .filter(Boolean)

    if (icuPatients.length === 0) {
      setIcuMonitorMap({})
      return
    }

    const tick = () => {
      setIcuMonitorMap(prev => {
        const next = {}
        icuPatients.forEach(patient => {
          const current = prev?.[patient.id]
          const base = patient?.vitals || {}
          const baseHr = Number(base.hr || 80)
          const baseRr = Number(base.rr || 16)
          const baseTemp = Number(base.temp || 36.8)
          const baseSpo2 = Number(base.spo2 || 97)
          const parsedBp = parseBp(base.bp || '120/80')
          const phase = Date.now() / 1000
          const targetHr = clampNumber(baseHr + Math.sin(phase) * 1.5, 35, 190)
          const targetRr = clampNumber(baseRr + Math.cos(phase * 0.8) * 0.8, 8, 42)
          const targetTemp = clampNumber(baseTemp + Math.sin(phase * 0.25) * 0.08, 34.0, 41.5)
          const targetSpo2 = clampNumber(baseSpo2 + Math.sin(phase * 0.55) * 0.5, 0, 100)
          const targetSys = clampNumber(parsedBp.sys + Math.sin(phase * 0.7) * 2, 0, 220)
          const targetDia = clampNumber(parsedBp.dia + Math.cos(phase * 0.7) * 1.5, 0, 140)
          const hr = Math.round(clampNumber(smoothToward(Number(current?.hr || targetHr), targetHr), 35, 190))
          const rr = Math.round(clampNumber(smoothToward(Number(current?.rr || targetRr), targetRr), 8, 42))
          const temp = +clampNumber(smoothToward(Number(current?.temp || targetTemp), targetTemp, 0.28), 34.0, 41.5).toFixed(1)
          const spo2 = Math.round(clampNumber(smoothToward(Number(current?.spo2 || targetSpo2), targetSpo2), 0, 100))
          const currentBp = parseBp(current?.bp || `${targetSys}/${targetDia}`)
          const sys = Math.round(clampNumber(smoothToward(currentBp.sys, targetSys), 0, 220))
          const dia = Math.round(clampNumber(smoothToward(currentBp.dia, targetDia), 0, 140))
          next[patient.id] = { hr, rr, temp, spo2, bp: `${sys}/${dia}` }
        })
        return next
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [hospital?.treatmentRooms, hospital?.patients])

  if (!hospital) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-16 h-16 text-surface-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-surface-900 mb-2">Kein Krankenhaus</h2>
        <p className="text-surface-500">Du bist noch keinem Krankenhaus beigetreten.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: Building2 },
    { id: 'patients', label: 'Fälle', icon: Activity, count: hospital.patients?.length || 0 },
    { id: 'treatment_rooms', label: 'Zimmer', icon: Stethoscope, count: hospital.treatmentRooms?.length || 0 },
    { id: 'rooms', label: 'Stationen & Räume', icon: Bed },
    ...(((hospital?.rooms || []).some(r => r.id === 'pharmacy')) ? [{ id: 'medications', label: 'Apotheke', icon: Pill }] : []),
    { id: 'staff', label: 'Personal', icon: Users },
    { id: 'finances', label: 'Finanzen', icon: Banknote },
    { id: 'members', label: 'Mitglieder', icon: Shield },
    { id: 'log', label: 'Aktivität', icon: Clipboard },
  ]

  const patientsByStatus = {
    waiting_triage: hospital.patients?.filter(p => p.status === 'waiting_triage') || [],
    triaged: hospital.patients?.filter(p => p.status === 'triaged') || [],
    waiting: hospital.patients?.filter(p => p.status === 'waiting') || [],
    in_treatment: hospital.patients?.filter(p => p.status === 'in_treatment') || [],
    in_diagnostics: hospital.patients?.filter(p => p.status === 'in_diagnostics') || [],
    morgue: hospital.patients?.filter(p => p.status === 'morgue') || [],
  }
  const currentMedicalRank = getCurrentRank(user)
  const currentRankLevel = Number(currentMedicalRank?.level || 1)
  const mustChooseSpecialty = currentRankLevel >= 2 && (user?.stats?.casesCompleted || 0) >= SPECIALIZATION_REQUIRED_CASES && !user?.specialty
  const canPurchaseMedsByRank = hasRankCapability(user, 'purchase_standard_medication')
  const canAssistenzarztBuyBasicMeds = currentMedicalRank?.id === 'assistenzarzt'
  const canToggleIntakeByRank = hasRankCapability(user, 'close_hospital_intake')
  const canPromoteMembers = hasRankCapability(user, 'promote_members')
  const canManagePermissionsByRank = hasRankCapability(user, 'manage_permissions')
  const canManageStrategy = hasRankCapability(user, 'manage_hospital_strategy')
  const canEditRevenueDistribution = (isOwner() || hasPermission('manage_finances')) && canManageStrategy
  const dutyRoster = hospital?.dutyRoster || {}
  const myDuty = dutyRoster?.[user?.id] || null
  const isOnDuty = !!myDuty?.active
  const currentDutyStation = myDuty?.stationId || null
  const getStationLabel = (stationId) => {
    const id = String(stationId || '')
    return hospital?.customStationNames?.[id] || STATION_LABELS[id] || ROOM_DEFS[id]?.name || id
  }
  const availableDutyStations = (() => {
    const built = new Set((hospital?.rooms || []).map(r => r.id))
    return ['er', 'ward', 'icu', 'or'].filter(id => built.has(id))
  })()
  const hasPharmacyBuilt = (hospital?.rooms || []).some(r => r.id === 'pharmacy')
  const filteredMedications = (
    MEDICATIONS
      .filter(m => medCategory === 'all' || m.category === medCategory)
      .filter(m => {
        if (!medSearch) return true
        const q = medSearch.toLowerCase()
        const name = (m?.name || '').toLowerCase()
        const generic = (m?.generic || '').toLowerCase()
        return name.includes(q) || generic.includes(q)
      })
  )
  const selectedBulkMeds = filteredMedications.filter(m => !!bulkMedSelection[m.id] && !m.requiresBtm)
  const bulkTotalCost = selectedBulkMeds.reduce((sum, med) => sum + (Number(med.costPerUnit || 0) * Math.max(1, Number(bulkMedQty || 1))), 0)
  const erDutyCount = Object.values(dutyRoster).filter(entry => entry?.active && entry?.stationId === 'er').length
  const alertQueue = hospital.alertQueue || []
  const ivenaQueue = hospital.ivenaQueue || []
  const criticalAlerts = alertQueue.filter(a => a.severity === 'critical')
  const highAlerts = alertQueue.filter(a => a.severity === 'high')
  const mediumAlerts = alertQueue.filter(a => a.severity === 'medium')

  const handleBuildRoom = (roomId) => {
    const res = addRoom(roomId)
    if (res?.success === false) {
      setActionResult({ name: res.message || 'Raum konnte nicht gebaut werden.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2800)
      return
    }
    setShowBuild(false)
  }

  const handleHire = (typeId) => {
    const result = hireWorker(typeId)
    setHireResult(result)
    if (result.success) setTimeout(() => { setHireResult(null); setShowHire(false) }, 1500)
    else setTimeout(() => setHireResult(null), 3000)
  }

  const openTriageModal = (patient) => {
    const existingSnapshot = triageChatSnapshots?.[patient?.id] || null
    setTriageModal(patient)
    setShowTriageExamModal(false)
    setTriagePhase('chat')
    setChatData(null)
    setTriageChatSnapshot(existingSnapshot || { patientId: patient?.id, messages: null, askedIds: [] })
    setTriageVitals(null)
    setTriageBlood(false)
    setTriageNotes('')
    setTriageLevel(null)
    setTriageExamResults([])
    setMeasuringVitals({})
    setShowBloodDrawModal(false)
    setBloodDrawPatient(null)
    setBloodDrawPresetParams([])
  }

  const handleTriageSnapshotChange = (snapshot) => {
    setTriageChatSnapshot(snapshot)
    const patientId = snapshot?.patientId
    if (!patientId) return
    setTriageChatSnapshots(prev => ({ ...prev, [patientId]: snapshot }))
  }

  const handleChatComplete = (data) => {
    setChatData(prev => {
      if (!prev) return data
      const prevIds = Array.isArray(prev.askedQuestionIds) ? prev.askedQuestionIds : []
      const nextIds = Array.isArray(data?.askedQuestionIds) ? data.askedQuestionIds : []
      const mergedIds = [...new Set([...prevIds, ...nextIds])]
      return {
        ...prev,
        ...data,
        painLevel: data?.painLevel ?? prev?.painLevel ?? null,
        allergies: data?.allergies ?? prev?.allergies ?? null,
        medications: data?.medications ?? prev?.medications ?? null,
        pastHistory: data?.pastHistory ?? prev?.pastHistory ?? null,
        lastMeal: data?.lastMeal ?? prev?.lastMeal ?? null,
        askedQuestionIds: mergedIds,
        questionsAsked: mergedIds.length,
        totalQuestions: Math.max(Number(prev?.totalQuestions || 0), Number(data?.totalQuestions || 0)),
      }
    })
    setTriagePhase('vitals')
  }

  const VITAL_DURATIONS = { hr: 1500, bp: 4000, rr: 3000, temp: 2000, spo2: 1500, bz: 1800 }

  const measureVital = (type) => {
    if (measuringVitals[type]) return
    setMeasuringVitals(prev => ({ ...prev, [type]: true }))
    if (type === 'bp') playOneShot(bloodPressureSound, { volume: 0.26 })
    const dur = VITAL_DURATIONS[type] || 2000
    setTimeout(() => {
      const base = triageModal?.vitals || triageModal?.triageSeedVitals || {}
      setTriageVitals(prev => {
        const current = prev || {}
        const jitter = (val, range) => val + Math.floor(Math.random() * range * 2 - range)
        const jitterF = (val, range) => +(val + (Math.random() * range * 2 - range)).toFixed(1)
        switch (type) {
          case 'hr': { const baseVal = base.hr || (70 + Math.floor(Math.random() * 30)); return { ...current, hr: current.hr ? jitter(current.hr, 3) : baseVal } }
          case 'bp': {
            if (current.bp) {
              const [s, d] = current.bp.split('/').map(Number)
              return { ...current, bp: `${jitter(s, 4)}/${jitter(d, 3)}` }
            }
            return { ...current, bp: base.bp || `${110 + Math.floor(Math.random() * 30)}/${65 + Math.floor(Math.random() * 15)}` }
          }
          case 'rr': { const baseVal = base.rr || (14 + Math.floor(Math.random() * 6)); return { ...current, rr: current.rr ? jitter(current.rr, 1) : baseVal } }
          case 'temp': { const baseVal = base.temp || +(36.4 + Math.random() * 1.5).toFixed(1); return { ...current, temp: current.temp ? jitterF(current.temp, 0.1) : baseVal } }
          case 'spo2': { const baseVal = base.spo2 || (93 + Math.floor(Math.random() * 6)); return { ...current, spo2: current.spo2 ? Math.min(100, jitter(current.spo2, 1)) : baseVal } }
          case 'bz': {
            const baseVal = Number.isFinite(Number(base.bz))
              ? Number(base.bz)
              : (Number.isFinite(Number(triageModal?.clinicalState?.bloodSugar)) ? Number(triageModal.clinicalState.bloodSugar) : (75 + Math.floor(Math.random() * 40)))
            const next = current.bz != null ? Math.max(25, jitter(Number(current.bz), 5)) : Math.max(25, Math.round(baseVal))
            return { ...current, bz: next }
          }
          default: return current
        }
      })
      setMeasuringVitals(prev => ({ ...prev, [type]: false }))
    }, dur)
  }

  const measureAllVitals = () => {
    ;['hr', 'bp', 'rr', 'temp', 'spo2', 'bz'].forEach(measureVital)
  }

  const allVitalsMeasured = triageVitals?.hr && triageVitals?.bp && triageVitals?.rr && triageVitals?.temp && triageVitals?.spo2

  const handleBloodDraw = () => {
    if (!triageModal) return
    setTriageBlood(true)
    setTriageLabOrdered(true)
    openPatientFileAtTab(triageModal, 'lab', { lockToTab: 'lab' })
  }

  const openPatientFileAtTab = (patient, tabId = 'overview', options = {}) => {
    setPatientFileLockedTab(options?.lockToTab || null)
    setPatientFileInitialTab(tabId)
    setPatientFileOpen(patient)
  }

  const canManagePatientActions = (patientId) => {
    if (!patientId) return true
    const p = (hospital?.patients || []).find(x => x.id === patientId)
    if (!p) return true
    if (p.status === 'waiting_triage' || p.status === 'triaged') return true
    const team = p.careTeam || {}
    const assistants = Array.isArray(team.assistant)
      ? team.assistant
      : (team.assistant ? [team.assistant] : [])
    return team.primary === user?.id || team.supervisor === user?.id || assistants.includes(user?.id)
  }

  const denyPatientAction = () => {
    setActionResult({ name: 'Diese Aktion ist nur für Behandler oder Supervisor erlaubt.', xp: 0, kind: 'error' })
    setTimeout(() => setActionResult(null), 2800)
    return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
  }

  const openBloodDrawForPatient = (patient, mode = 'clinical', presetParams = []) => {
    setBloodDrawPatient(patient)
    setBloodDrawMode(mode)
    setBloodDrawPresetParams(Array.isArray(presetParams) ? presetParams : [])
    setShowBloodDrawModal(true)
  }

  const finishTutorial = () => {
    localStorage.setItem(tutorialDoneKey, '1')
    setShowTutorial(false)
    setTutorialStep(0)
    if (patientFileOpen?.id === 'tutorial_sim_patient') {
      setPatientFileOpen(null)
      setPatientFileInitialTab('overview')
    }
  }

  const nextTutorialStep = () => {
    if (tutorialStep >= tutorialSteps.length - 1) {
      finishTutorial()
      return
    }
    setTutorialStep(prev => prev + 1)
  }

  const tutorialFloatingStyle = (() => {
    const anchor = tutorialSteps[tutorialStep]?.anchor || 'bottom-right'
    if (anchor === 'top-right') return { right: '20px', top: '96px' }
    if (anchor === 'mid-right') return { right: '20px', top: '50%', transform: 'translateY(-50%)' }
    if (anchor === 'center-right') return { right: '24px', top: '36%' }
    if (anchor === 'mid-left') return { left: '20px', top: '34%' }
    return { right: '20px', bottom: '24px' }
  })()

  const toggleDuty = () => {
    if (!isOnDuty && (user?.activeService === 'rd' || user?.rescueDuty?.onDuty)) {
      setActionResult({ name: 'Dienststart nicht möglich: Du bist aktuell im Rettungsdienst im Dienst.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2600)
      return
    }
    const nextActive = !isOnDuty
    if (nextActive && !availableDutyStations.includes(dutyStation)) {
      setActionResult({ name: 'Diese Station ist noch nicht gebaut und nicht dienstfähig.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2600)
      return
    }
    startIdSwipe(() => {
      const res = setDoctorOnDuty(nextActive ? dutyStation : (currentDutyStation || dutyStation), nextActive)
      if (res?.success) {
        updateUser({ activeService: nextActive ? 'hospital' : (user?.activeService === 'hospital' ? null : user?.activeService) })
        setActionResult({
          name: nextActive
            ? `Dienst gestartet (${getStationLabel(dutyStation)}).`
            : 'Dienst beendet.',
          xp: 0,
          kind: 'success',
        })
      } else {
        setActionResult({ name: res?.message || 'Dienststatus konnte nicht geändert werden.', xp: 0, kind: 'error' })
      }
      setTimeout(() => setActionResult(null), 2600)
    })
  }

  const startIdSwipe = (payload) => {
    setIdSwipeProgress(0)
    setIdSwipeDragging(false)
    setIdSwipeX(72)
    setIdSwipeModal({ open: true, payload })
  }

  const openDischargeConfirm = (patient, room, triage) => {
    const hasDischargeDoc = !!(patient?.documents || []).some((doc) => doc?.templateId === 'entlassungsbogen')
    setDischargeConfirm({
      id: patient?.id,
      name: patient?.name,
      chiefComplaint: patient?.chiefComplaint || '—',
      triageLevel: triage?.name || patient?.triageLevel || 'n/a',
      roomName: room?.name || 'Kein Zimmer',
      hasDischargeDoc,
      firstConfirmed: false,
    })
  }

  const updateIdSwipeFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    setIdSwipeX(Math.max(0, Math.min(rect.width, x)))
    const progress = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setIdSwipeProgress(progress)
    if (progress >= 92 && idSwipeModal?.payload) {
      const action = idSwipeModal.payload
      setIdSwipeModal({ open: false, payload: null })
      setIdSwipeProgress(0)
      setIdSwipeX(0)
      action?.()
    }
  }

  const handleIdCardDrag = (event) => {
    if (!idSwipeDragging) return
    updateIdSwipeFromEvent(event)
  }

  const startAssistantBloodDrawMiniGame = () => {
    const left = assistantCooldownRemaining('blood')
    if (left > 0) {
      setActionResult({ name: `Kurz Pause – nächste Assistenz-Blutabnahme in ${left}s.`, xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2200)
      return
    }
    const candidate = patientsByStatus.in_treatment[0] || patientsByStatus.triaged[0] || patientsByStatus.waiting[0]
    openBloodDrawForPatient(candidate || PRACTICE_BLOOD_DRAW_PATIENT, 'assistant')
  }

  const startBpMiniGame = () => {
    const left = assistantCooldownRemaining('nibp')
    if (left > 0) {
      setActionResult({ name: `RR-Rundgang: noch ${left}s Cooldown.`, xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2200)
      return
    }
    setBpMiniStep(0)
    setShowBpMiniGame(true)
  }

  const advanceBpMiniGame = () => {
    if (bpMiniStep === 1) playOneShot(bloodPressureSound, { volume: 0.25 })
    const next = bpMiniStep + 1
    if (next > 2) {
      setShowBpMiniGame(false)
      setBpMiniStep(0)
      const res = performAssistantTask('nibp_round')
      if (res?.success) {
        bumpAssistantCooldown('nibp')
        setActionResult({ name: 'NIBP-Messung erfolgreich dokumentiert.', xp: res.task?.xp || 0 })
        setTimeout(() => setActionResult(null), 2600)
      }
      return
    }
    setBpMiniStep(next)
  }

  const startEkgMiniGame = () => {
    const left = assistantCooldownRemaining('ekg')
    if (left > 0) {
      setActionResult({ name: `EKG-Assistenz: noch ${left}s Cooldown.`, xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2200)
      return
    }
    setEkgMiniStep(0)
    setEkgPlacedLeads({})
    setShowEkgMiniGame(true)
  }

  const placeEkgLead = (leadId) => {
    if (ekgPlacedLeads[leadId]) return
    const nextPlaced = { ...ekgPlacedLeads, [leadId]: true }
    setEkgPlacedLeads(nextPlaced)
    const count = Object.keys(nextPlaced).length
    setEkgMiniStep(Math.min(2, Math.floor(count / 4)))
    if (count >= 10) {
      setShowEkgMiniGame(false)
      setEkgMiniStep(0)
      const res = performAssistantTask('ekg_write')
      if (res?.success) {
        bumpAssistantCooldown('ekg')
        setActionResult({ name: 'EKG-Minigame abgeschlossen.', xp: res.task?.xp || 0 })
        setTimeout(() => setActionResult(null), 2600)
      }
      return
    }
  }

  const finalizeTriage = () => {
    if (!triageLevel || !triageModal) return
    triagePatient(triageModal.id, triageLevel, {
      vitals: triageVitals,
      bloodDrawn: triageBlood,
      painLevel: chatData?.painLevel ?? null,
      notes: triageNotes,
      allergies: chatData?.allergies,
      medications: chatData?.medications,
      pastHistory: chatData?.pastHistory,
      lastMeal: chatData?.lastMeal,
      examResults: triageExamResults,
    })
    setPatientFileLockedTab(null)
    setTriageModal(null)
    setShowTriageExamModal(false)
  }

  const handleBuildTR = () => {
    const res = addTreatmentRoom(newTRName, newTRStation, { roomType: newTRType })
    if (res.success) {
      setShowBuildTR(false)
      setNewTRName('')
      setNewTRType('standard')
      return
    }
    setActionResult({ name: res?.message || 'Zimmer konnte nicht gebaut werden.', xp: 0, kind: 'error' })
    setTimeout(() => setActionResult(null), 2800)
  }

  const handleRenameStation = (stationId) => {
    setRenameModal({
      open: true,
      mode: 'station',
      stationId,
      roomId: null,
      label: getStationLabel(stationId),
      value: getStationLabel(stationId),
    })
  }

  const handleRenameTreatmentRoom = (room) => {
    setRenameModal({
      open: true,
      mode: 'room',
      stationId: null,
      roomId: room?.id || null,
      label: room?.name || 'Zimmer',
      value: room?.name || '',
    })
  }

  const submitRenameModal = () => {
    if (!renameModal.open) return
    if (renameModal.mode === 'station') {
      const res = renameStation(renameModal.stationId, renameModal.value)
      if (res?.success === false) {
        setActionResult({ name: res.message || 'Station konnte nicht umbenannt werden.', xp: 0, kind: 'error' })
        setTimeout(() => setActionResult(null), 2800)
        return
      }
      setActionResult({ name: 'Stationsname aktualisiert.', xp: 0, kind: 'success' })
      setTimeout(() => setActionResult(null), 1800)
      setRenameModal({ open: false, mode: 'station', stationId: null, roomId: null, label: '', value: '' })
      return
    }
    const res = renameTreatmentRoom(renameModal.roomId, renameModal.value)
    if (res?.success === false) {
      setActionResult({ name: res.message || 'Zimmer konnte nicht umbenannt werden.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2800)
      return
    }
    setActionResult({ name: 'Zimmername aktualisiert.', xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 1800)
    setRenameModal({ open: false, mode: 'station', stationId: null, roomId: null, label: '', value: '' })
  }

  const handleMoveToWaiting = (patientId) => {
    const res = moveToWaiting(patientId)
    if (res?.success === false) {
      setActionResult({ name: res.message || 'Patient konnte nicht ins Wartezimmer verschoben werden.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2800)
    }
  }

  const openRemoveRoomDialog = (roomId) => {
    setRoomRemoveTarget(roomId)
    setRoomRemoveConfirmText('')
    setRoomRemoveArmed(false)
  }

  const executeRemoveRoom = () => {
    if (!roomRemoveTarget) return
    const roomDef = ROOM_DEFS[roomRemoveTarget] || { name: roomRemoveTarget }
    if (!roomRemoveArmed || roomRemoveConfirmText.trim().toLowerCase() !== roomDef.name.trim().toLowerCase()) return
    const res = removeRoom(roomRemoveTarget)
    if (res?.success === false) {
      setActionResult({ name: res.message || 'Abriss nicht möglich.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2800)
      return
    }
    setActionResult({ name: `${roomDef.name} abgerissen`, xp: 0 })
    setTimeout(() => setActionResult(null), 2200)
    setRoomRemoveTarget(null)
    setRoomRemoveConfirmText('')
    setRoomRemoveArmed(false)
  }

  const handleExecuteAction = (action, patientId) => {
    if (patientId && !canManagePatientActions(patientId)) {
      denyPatientAction()
      return
    }
    if (activeAction) return
    const duration = (action.duration || 3) * 1000
    setActiveAction({ ...action, progress: 0, patientId })
    const interval = 50
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += interval
      const pct = Math.min(100, (elapsed / duration) * 100)
      setActiveAction(prev => prev ? { ...prev, progress: pct } : null)
      if (elapsed >= duration) {
        clearInterval(timer)
        const result = executeAction(action.id, action.name, action.duration, action.xpReward || 0, patientId, action.extra || null)
        setActiveAction(null)
        if (result?.blocked) {
          setActionResult({ name: result.message || 'Aktion blockiert', xp: 0, kind: 'error' })
        } else {
          setActionResult({ name: action.name, xp: action.xpReward || 0 })
        }
        setTimeout(() => setActionResult(null), 3000)
      }
    }, interval)
  }

  const resolveDevSpecialty = () => {
    const normalized = normalizeSpecialtyId(user?.specialty)
    if (SPECIALTY_PROMOTION_COURSES[normalized]) return normalized
    return 'notfallmedizin'
  }

  const withMinCourseCount = (courseIds, minCount) => {
    const merged = new Set(Array.isArray(user?.completedCourses) ? user.completedCourses : [])
    for (const id of courseIds) {
      if (id) merged.add(id)
    }
    let cursor = 1
    while (merged.size < minCount) {
      const devId = `dev_course_${cursor}`
      if (!merged.has(devId)) merged.add(devId)
      cursor += 1
    }
    return Array.from(merged)
  }

  const completeDevPromotionCourse = async (step) => {
    if (!user) return
    const specialty = resolveDevSpecialty()
    const track = SPECIALTY_PROMOTION_COURSES[specialty]
    if (!track) return
    const current = Array.isArray(user?.completedCourses) ? user.completedCourses : []
    const nextSet = new Set(current)
    if (step === 'facharzt') {
      nextSet.add(track.facharzt)
    } else if (step === 'oberarzt') {
      nextSet.add(track.facharzt)
      nextSet.add(track.oberarzt)
    } else if (step === 'chefarzt') {
      nextSet.add(track.facharzt)
      nextSet.add(track.oberarzt)
      nextSet.add(track.chefarzt)
    }
    await updateUser({
      specialty,
      completedCourses: Array.from(nextSet),
    })
    setActionResult({ name: `DEV: ${step} Kurs für ${specialty} abgeschlossen`, xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2400)
  }

  const applyRankCheat = async (rankId) => {
    const targetRank = RANKS.find(r => r.id === rankId)
    if (!targetRank || !user) return
    const minCourses = Math.max(0, Number(targetRank.requirements?.courses || 0))
    const minCases = Math.max(0, Number(targetRank.requirements?.casesCompleted || 0))
    const minSuccessRate = Math.max(0, Number(targetRank.requirements?.successRate || 0))
    const specialty = resolveDevSpecialty()
    const track = SPECIALTY_PROMOTION_COURSES[specialty]
    const selectedCourses = []
    if (track?.facharzt) selectedCourses.push(track.facharzt)
    if ((rankId === 'oberarzt' || rankId === 'chefarzt') && track?.oberarzt) selectedCourses.push(track.oberarzt)
    if (rankId === 'chefarzt' && track?.chefarzt) selectedCourses.push(track.chefarzt)
    const completedCourses = withMinCourseCount(selectedCourses, minCourses)
    const targetXp = Math.max(Number(user?.xp || 0), Math.max(0, targetRank.level - 1) * 500)

    await updateUser({
      specialty: rankId === 'assistenzarzt' ? user?.specialty : specialty,
      xp: targetXp,
      completedCourses,
      stats: {
        ...(user?.stats || {}),
        casesCompleted: Math.max(Number(user?.stats?.casesCompleted || 0), minCases),
        successRate: Math.max(Number(user?.stats?.successRate || 0), minSuccessRate),
      },
    })
    setActionResult({ name: `DEV: Rangsystem auf ${targetRank.shortName || targetRank.name} gesetzt`, xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2400)
  }

  const applyMoneyCheat = async () => {
    const amount = Math.max(0, Number(devCheatMoney || 0))
    if (!Number.isFinite(amount) || amount <= 0) return
    await addMoney(amount)
    setActionResult({ name: `DEV: +${amount.toLocaleString('de-DE')}€ Wallet`, xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2200)
  }

  const applyXpCheat = async () => {
    const amount = Math.max(0, Number(devCheatXp || 0))
    if (!Number.isFinite(amount) || amount <= 0) return
    await updateUser({ xp: Number(user?.xp || 0) + amount })
    setActionResult({ name: `DEV: +${amount.toLocaleString('de-DE')} XP`, xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2200)
  }

  const applyDevTimeSkip = () => {
    const hours = Math.max(0, Number(devSkipHours || 0))
    if (!Number.isFinite(hours) || hours <= 0) return
    const res = devSkipTime(hours)
    if (res?.success === false) {
      setActionResult({ name: res.message || 'DEV: Zeitsprung fehlgeschlagen', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2600)
      return
    }
    setActionResult({ name: `DEV: +${hours}h Zeit simuliert`, xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2400)
  }

  const applyProfileStatsCheat = async () => {
    if (!user) return
    const casesCompleted = Math.max(0, Number(devCasesCompleted || 0))
    const successRate = Math.max(0, Math.min(100, Number(devSuccessRate || 0)))
    const patientsHelped = Math.max(0, Number(devPatientsHelped || 0))
    const completedCoursesCount = Math.max(0, Number(devCoursesCompleted || 0))
    if (!Number.isFinite(casesCompleted) || !Number.isFinite(successRate) || !Number.isFinite(patientsHelped) || !Number.isFinite(completedCoursesCount)) return

    const successfulCases = Math.round((successRate / 100) * casesCompleted)
    const completedCourses = withMinCourseCount([], completedCoursesCount)
    await updateUser({
      completedCourses,
      stats: {
        ...(user?.stats || {}),
        casesCompleted,
        patientsHelped,
        successfulCases,
        successRate,
      },
    })
    setActionResult({ name: 'DEV: Profil-Statistiken aktualisiert', xp: 0, kind: 'success' })
    setTimeout(() => setActionResult(null), 2400)
  }

  const handleCloseToggle = () => {
    if (!canToggleIntakeByRank) {
      setActionResult({ name: 'Benötigt Rang Facharzt oder höher.', xp: 0, kind: 'error' })
      setTimeout(() => setActionResult(null), 2200)
      return
    }
    if (!hospital.isClosed) {
      setCloseConfirm(true)
      return
    } else {
      toggleClosed()
    }
  }

  const dailyWorkerCost = hospital.workers?.reduce((sum, w) => {
    const wt = WORKER_TYPES.find(t => t.id === w.typeId)
    return sum + (wt?.costPerDay || 0)
  }, 0) || 0
  const specialState = getSpecialState(user)
  const canManualManv = !!specialState.manvTriggerReady

  const handleManualManvTrigger = () => {
    if (!canManualManv) return
    const delayMs = (60 + Math.floor(Math.random() * 61)) * 1000
    updateUser({
      specialState: {
        ...specialState,
        manvTriggerReady: false,
      },
    })
    setActionResult({ name: `MANV ausgelöst. Großereignis startet in ca. ${Math.round(delayMs / 1000)} Sekunden...`, xp: 0, kind: 'success' })
    setTimeout(() => devTriggerMassEvent(), delayMs)
    setTimeout(() => setActionResult(null), 3200)
    setManvConfirmOpen(false)
    setManvConfirmStep(1)
  }

  const availableTreatmentRooms = (hospital.treatmentRooms || []).filter(r => !r.patientId && TREATMENT_ROOM_STATIONS.includes(r.station))
  const visibleTreatmentRooms = (hospital.treatmentRooms || []).filter(r => TREATMENT_ROOM_STATIONS.includes(r.station))
  const treatmentRoomsByStation = (hospital.treatmentRooms || []).reduce((acc, room) => {
    if (!TREATMENT_ROOM_STATIONS.includes(room.station)) return acc
    const key = room.station || 'er'
    if (!acc[key]) acc[key] = []
    acc[key].push(room)
    return acc
  }, {})
  const diagnosticDeviceRooms = DIAGNOSTIC_STATIONS.flatMap(stationId => {
    const bought = (hospital?.stationEquipment || {})[stationId] || []
    return bought.map(eqId => {
      const eq = EQUIPMENT.find(e => e.id === eqId)
      const patientInDeviceRoom = (hospital?.patients || []).find(p =>
        p.status === 'in_diagnostics'
        && p.diagnosticStation === stationId
        && (!p.diagnosticEquipment || p.diagnosticEquipment === eqId)
      )
      return {
        id: `${stationId}_${eqId}`,
        stationId,
        equipmentId: eqId,
        name: eq?.name || eqId,
        patient: patientInDeviceRoom || null,
      }
    })
  })
  const openDiagnosticRoomForOrder = (order) => {
    const modality = getOrderModality(order?.modality)
    if (!modality) return
    const requiredList = Array.isArray(modality.requiredEquipment)
      ? modality.requiredEquipment
      : [modality.requiredEquipment].filter(Boolean)
    const pickedEquipment = order?.requiredEquipment || requiredList[0] || null
    const directId = `${modality.station}_${pickedEquipment}`
    const directMatch = diagnosticDeviceRooms.find(dr => dr.id === directId)
    if (directMatch) {
      setOpenDiagnosticRoomView(directMatch.id)
      return
    }
    const fallback = diagnosticDeviceRooms.find(dr =>
      dr.stationId === modality.station
      && (pickedEquipment ? String(dr.equipmentId).includes(String(pickedEquipment).split('_')[0]) : true)
    ) || diagnosticDeviceRooms.find(dr => dr.stationId === modality.station)
    if (fallback) setOpenDiagnosticRoomView(fallback.id)
  }

  const launchDevCtPreview = () => {
    if (devCtLaunching) return
    setDevCtLaunching(true)
    const res = devSpawnCtPreviewPatient(devCtRegion, {
      mode: devCtMode,
      preset: devCtMode === 'pathologic' ? devCtPreset : '',
    })
    if (res?.success) {
      setDevCtPreviewPatientId(res.patientId || null)
      setOpenDiagnosticRoomView(res.roomId || 'radiology_ct_scanner')
      setShowDevMenu(false)
      setActionResult({
        name: `DEV: CT-Preview gestartet (${String(devCtRegion || 'kopf')} • ${devCtMode === 'healthy' ? 'gesund' : (devCtPreset || 'pathologisch')})`,
        xp: 0,
        kind: 'success',
      })
      setTimeout(() => setActionResult(null), 2400)
    } else {
      setActionResult({
        name: res?.message || 'CT-Preview konnte nicht gestartet werden.',
        xp: 0,
        kind: 'error',
      })
      setTimeout(() => setActionResult(null), 2800)
    }
    setDevCtLaunching(false)
  }

  const closeDiagnosticRoom = () => {
    setOpenDiagnosticRoomView(null)
    if (devCtPreviewPatientId) {
      devRemovePatientById(devCtPreviewPatientId, 'DEV-CT-Preview geschlossen; Patient entfernt.')
      setDevCtPreviewPatientId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Mass casualty event banner */}
      {hospital.activeEvent && (
        <div className="mb-6 bg-red-600 text-white rounded-2xl p-4 shadow-lg shadow-red-600/30 animate-pulse-slow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700 opacity-50" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{hospital.activeEvent.title}</p>
              <p className="text-red-100 text-sm mt-1">{hospital.activeEvent.description}</p>
              <p className="text-red-200 text-xs mt-2">{hospital.activeEvent.patientCount} Patienten eingetroffen &bull; {new Date(hospital.activeEvent.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button onClick={() => dismissEvent()} className="p-1.5 hover:bg-white/20 rounded-lg shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Hospital closed banner */}
      {hospital.isClosed && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-4">
          <ShieldOff className="w-8 h-8 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Krankenhaus für neue Patienten geschlossen</p>
            <p className="text-sm text-amber-600">Keine neuen Patienten werden aufgenommen. {hospital.closureFines > 0 && `Bisherige Strafgebühren: ${hospital.closureFines.toLocaleString('de-DE')}€`}</p>
          </div>
          <button onClick={() => toggleClosed()} disabled={!canToggleIntakeByRank} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Wieder öffnen
          </button>
        </div>
      )}

      {alertQueue.length > 0 && (
        <div className={`mb-6 rounded-2xl border p-4 ${criticalAlerts.length > 0 ? 'bg-red-50 border-red-300' : highAlerts.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${criticalAlerts.length > 0 ? 'text-red-600' : highAlerts.length > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
              <p className="font-semibold text-surface-900">
                Patienten-Alerts
                <span className="ml-2 text-sm text-surface-500">
                  {criticalAlerts.length} kritisch • {highAlerts.length} hoch • {mediumAlerts.length} mittel
                </span>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {alertQueue.slice(0, 4).map(alert => (
              <div key={alert.id} className="rounded-xl bg-white/90 border border-surface-200 px-3 py-2 flex items-start gap-3">
                <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${alert.severity === 'critical' ? 'bg-red-600' : alert.severity === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800">{alert.message}</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {alert.patientName} • {new Date(alert.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      const target = hospital.patients?.find(p => p.id === alert.patientId)
                      if (target) openPatientFileAtTab(target, 'overview')
                    }}
                    className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200"
                  >
                    Öffnen
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200"
                  >
                    Erledigt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leitnetz preview panel */}
      {ivenaQueue.length > 0 && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-30 w-[calc(100vw-1rem)] sm:w-[420px] lg:w-[460px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-300 bg-white shadow-2xl overflow-hidden">
          <div className="px-3 py-2 bg-amber-400 text-surface-900 flex items-center justify-between border-b border-amber-500">
            <p className="text-xs font-bold tracking-wide">Rettungsleitnetz — Voranmeldungen Rettungsdienst</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 border border-amber-600/30">{ivenaQueue.length}</span>
          </div>
          <div className="grid grid-cols-[20%_15%_45%_20%] bg-amber-100 text-[10px] font-semibold text-surface-700 border-b border-surface-200">
            <div className="px-2 py-1.5 border-r border-surface-200">ETA</div>
            <div className="px-2 py-1.5 border-r border-surface-200">KS</div>
            <div className="px-2 py-1.5 border-r border-surface-200">Meldung</div>
            <div className="px-2 py-1.5">RTW</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {ivenaQueue.slice(0, 6).map(item => {
              const etaMs = Date.parse(item.etaAt || '')
              const mins = Number.isFinite(etaMs) ? Math.max(0, Math.ceil((etaMs - Date.now()) / 60000)) : item.etaMinutes
              const urgency = item.priority === 'red' ? 'KS1' : item.priority === 'orange' ? 'KS2' : 'KS3'
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIvena(item)}
                  className="w-full text-left grid grid-cols-[20%_15%_45%_20%] text-[10px] border-b border-surface-200 hover:bg-amber-50/60"
                >
                  <div className="px-2 py-1.5 border-r border-surface-200 font-semibold text-surface-700">{mins} Min</div>
                  <div className="px-2 py-1.5 border-r border-surface-200">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      urgency === 'KS1' ? 'bg-red-100 text-red-700' : urgency === 'KS2' ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-700'
                    }`}>{urgency}</span>
                  </div>
                  <div className="px-2 py-1.5 border-r border-surface-200">
                    <p className="font-semibold text-surface-800 truncate">{item.patient?.chiefComplaint}</p>
                    <p className="text-[10px] text-surface-500 truncate">{item.patient?.name}, {item.patient?.age}J</p>
                  </div>
                  <div className="px-2 py-1.5 text-surface-700 truncate">{item.dispatch}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedIvena && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedIvena(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-surface-200">
            <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
              <h3 className="font-bold text-surface-900">Leitnetz-Voranmeldung</h3>
              <button onClick={() => setSelectedIvena(null)} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface-50 p-3"><p className="text-xs text-surface-500">Transport</p><p className="font-semibold text-surface-900">{selectedIvena.dispatch}</p></div>
              <div className="rounded-lg bg-surface-50 p-3"><p className="text-xs text-surface-500">ETA</p><p className="font-semibold text-surface-900">{Math.max(0, Math.ceil((Date.parse(selectedIvena.etaAt || '') - Date.now()) / 60000))} Min</p></div>
              <div className="rounded-lg bg-surface-50 p-3"><p className="text-xs text-surface-500">Patient</p><p className="font-semibold text-surface-900">{selectedIvena.patient?.name} • {selectedIvena.patient?.age}J • {selectedIvena.patient?.gender}</p></div>
              <div className="rounded-lg bg-surface-50 p-3"><p className="text-xs text-surface-500">Dringlichkeit</p><p className="font-semibold text-surface-900">{selectedIvena.priority || '-'}</p></div>
              <div className="rounded-lg bg-surface-50 p-3 col-span-2"><p className="text-xs text-surface-500">Leitsymptom</p><p className="font-semibold text-surface-900">{selectedIvena.patient?.chiefComplaint}</p></div>
              <div className="rounded-lg bg-surface-50 p-3 col-span-2"><p className="text-xs text-surface-500">Voranmeldung</p><p className="text-surface-700">{selectedIvena.note || 'Keine zusätzlichen Angaben.'}</p></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900">{hospital.name}</h1>
          <p className="text-surface-500">{hospital.settings?.city || 'Standort unbekannt'} &bull; {hospital.members?.length || 1} Mitglieder</p>
        </div>
        <div className="flex items-center gap-3">
          {!hasReceivingInfrastructure && (
            <div className="card px-4 py-2 bg-amber-50 border-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-700">Baue eine Notaufnahme oder Ambulante Aufnahme</p>
            </div>
          )}
          {hasReceivingInfrastructure && !canReceivePatients && (
            <div className="card px-4 py-2 bg-amber-50 border-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-700">Kein Arzt in der Notaufnahme im Dienst.</p>
            </div>
          )}
          {canReceivePatients && !hospital.isClosed && (
            <button
              onClick={handleCloseToggle}
              disabled={!canToggleIntakeByRank}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Aufnahme stoppen
              </span>
            </button>
          )}
          {canReceivePatients && !hospital.isClosed && canManualManv && (
            <button
              type="button"
              onClick={() => setManvConfirmOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              <span className="flex items-center gap-2">
                <Siren className="w-4 h-4" />
                MANV manuell auslösen
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                tab === t.id ? 'bg-white/20' : 'bg-primary-100 text-primary-700'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {mustChooseSpecialty && (
            <div className="card p-4 border-amber-200 bg-amber-50/70">
              <p className="text-sm font-semibold text-amber-800">Fachrichtung erforderlich</p>
              <p className="text-xs text-amber-700 mt-1">
                Du hast bereits {user?.stats?.casesCompleted || 0} Fälle abgeschlossen. Für erweiterte Aktionen bitte jetzt eine Fachrichtung im Profil festlegen.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div>
                <p className="text-sm text-surface-500">Patienten</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">{hospital.patients?.length || 0}</p>
              <p className="text-xs text-surface-400 mt-1">{patientsByStatus.in_treatment.length} in Behandlung &bull; {patientsByStatus.waiting_triage.length} warten auf Triage</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                <p className="text-sm text-surface-500">Personal</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">{hospital.workers?.length || 0}</p>
              <p className="text-xs text-surface-400 mt-1">{dailyWorkerCost.toLocaleString('de-DE')}€/Tag</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Stethoscope className="w-5 h-5" /></div>
                <p className="text-sm text-surface-500">Zimmer</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">{hospital.treatmentRooms?.length || 0}</p>
              <p className="text-xs text-surface-400 mt-1">{availableTreatmentRooms.length} frei</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                <p className="text-sm text-surface-500">Mitglieder</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">{hospital.members?.length || 1}</p>
            </div>
          </div>

          <div className="card p-4 border-primary-200 bg-gradient-to-r from-primary-50 to-sky-50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-surface-900">Dienstmeldung</h3>
                <p className="text-xs text-surface-600">
                  Ohne aktiven ER-Dienst kommen keine neuen Patienten. Stationswechsel nur außerhalb des aktiven Dienstes.
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${isOnDuty ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}`}>
                {isOnDuty ? `Im Dienst (${getStationLabel(currentDutyStation || 'er')})` : 'Nicht im Dienst'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {availableDutyStations.map(stationId => (
                <button
                  key={stationId}
                  onClick={() => !isOnDuty && setDutyStation(stationId)}
                  disabled={isOnDuty}
                  className={`text-left px-3 py-2 rounded-xl border transition-all ${
                    dutyStation === stationId
                      ? 'bg-primary-600 text-white border-primary-600 shadow'
                      : 'bg-white text-surface-700 border-surface-200 hover:border-primary-300'
                  } ${isOnDuty ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <p className="text-xs font-semibold">{getStationLabel(stationId)}</p>
                  <p className={`text-[10px] ${dutyStation === stationId ? 'text-white/80' : 'text-surface-400'}`}>dienstfähig</p>
                </button>
              ))}
              {availableDutyStations.length === 0 && (
                <span className="text-xs text-surface-500">Baue zuerst eine dienstfähige Station (z. B. Notaufnahme).</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-surface-600">
                Ärzte im ER-Dienst: <span className="font-semibold text-surface-900">{erDutyCount}</span>
                {isOnDuty && <span className="ml-2 text-amber-700">Station gesperrt bis Dienstende</span>}
              </p>
              <button onClick={toggleDuty} className={`px-3 py-2 rounded-lg text-sm font-medium ${isOnDuty ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                {isOnDuty ? 'Dienst beenden' : 'In Dienst melden'}
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-surface-900">Assistenz-Aufgaben (Minigame)</h3>
              <span className="text-xs text-surface-500">kleine Einnahmen</span>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startAssistantBloodDrawMiniGame}
                disabled={assistantCooldownRemaining('blood') > 0}
                className="btn-secondary text-sm disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {assistantCooldownRemaining('blood') > 0
                  ? `Blutabnahme (${assistantCooldownRemaining('blood')}s)`
                  : 'Blutabnahme assistieren (+25€)'}
              </button>
              <button
                type="button"
                onClick={startEkgMiniGame}
                disabled={assistantCooldownRemaining('ekg') > 0}
                className="btn-secondary text-sm disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {assistantCooldownRemaining('ekg') > 0
                  ? `EKG (${assistantCooldownRemaining('ekg')}s)`
                  : 'EKG schreiben (+30€)'}
              </button>
              <button
                type="button"
                onClick={startBpMiniGame}
                disabled={assistantCooldownRemaining('nibp') > 0}
                className="btn-secondary text-sm disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {assistantCooldownRemaining('nibp') > 0
                  ? `NIBP (${assistantCooldownRemaining('nibp')}s)`
                  : 'NIBP-Rundgang (+18€)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENTS TAB */}
      {tab === 'patients' && (
        <div className="space-y-6">
          {patientsByStatus.waiting_triage.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Warten auf Triage ({patientsByStatus.waiting_triage.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.waiting_triage.map(p => (
                  <div key={p.id} className="card p-4 border-red-200 bg-red-50/30 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900">{p.name} <span className="text-surface-500 text-sm">({p.age}J, {p.gender})</span></p>
                      <p className="text-sm text-surface-600">{p.chiefComplaint}</p>
                      <p className="text-xs text-surface-400">Zu Fuß eingetroffen &bull; {new Date(p.arrivalTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); openTriageModal(p) }} className="btn-primary text-sm shrink-0">
                      Triage durchführen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {patientsByStatus.triaged.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                Triagiert - Zuordnung ausstehend ({patientsByStatus.triaged.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.triaged.map(p => {
                  const tl = TRIAGE_LEVELS.find(t => t.id === p.triageLevel)
                  return (
                    <div key={p.id} className="card p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tl?.color + '20', color: tl?.color }}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-surface-900">{p.name} <span className="text-surface-500 text-sm">({p.age}J)</span></p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tl?.bgColor}`}>{tl?.name}</span>
                          {p.arrivalType === 'ambulance' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">RTW</span>}
                        </div>
                        <p className="text-sm text-surface-600">{p.chiefComplaint}</p>
                        {p.preInfo && <p className="text-xs text-surface-500 mt-1 italic">{p.preInfo}</p>}
                        {p.vitals && (
                          <div className="flex gap-3 mt-2 text-xs text-surface-500">
                            <span>HF: {p.vitals.hr}</span><span>RR: {p.vitals.bp}</span><span>AF: {p.vitals.rr}</span><span>Temp: {p.vitals.temp}°C</span><span>SpO₂: {p.vitals.spo2}%</span>
                            {p.bloodDrawn && <span className="text-emerald-600">✓ Blut abgenommen</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        <button onClick={(e) => { e.stopPropagation(); handleMoveToWaiting(p.id) }} className="btn-secondary text-sm">
                          <Clock className="w-3.5 h-3.5" /> Wartezimmer
                        </button>
                        {availableTreatmentRooms.length > 0 ? (
                          <button onClick={(e) => { e.stopPropagation(); setAssignModal(p) }} className="btn-primary text-sm">
                            <MoveRight className="w-3.5 h-3.5" /> Zimmer zuweisen
                          </button>
                        ) : (
                          <span className="text-xs text-surface-400 py-2">Kein Zimmer frei</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {patientsByStatus.waiting.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Wartezimmer ({patientsByStatus.waiting.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.waiting.map(p => {
                  const tl = TRIAGE_LEVELS.find(t => t.id === p.triageLevel)
                  return (
                    <div key={p.id} className="card p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900">{p.name}</p>
                          {tl && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tl.bgColor}`}>{tl.name}</span>}
                        </div>
                        <p className="text-sm text-surface-500">{p.chiefComplaint}</p>
                      </div>
                      {availableTreatmentRooms.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); setAssignModal(p) }} className="btn-primary text-sm shrink-0">
                          <MoveRight className="w-3.5 h-3.5" /> Zimmer zuweisen
                        </button>
                      ) : (
                        <span className="text-xs text-surface-400 shrink-0">Kein Zimmer frei</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {patientsByStatus.in_diagnostics.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-500" />
                In Diagnostik ({patientsByStatus.in_diagnostics.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.in_diagnostics.map(p => (
                  <div
                    key={p.id}
                    className="card p-4 flex items-center gap-4 border-indigo-200 bg-indigo-50/30 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
                    onClick={() => openPatientFileAtTab(p, 'orders')}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Scan className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-surface-900">{p.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{STATION_LABELS[p.diagnosticStation] || p.diagnosticStation || 'Diagnostik'}</span>
                        {p.diagnosticEquipment && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-700">
                            {EQUIPMENT.find(e => e.id === p.diagnosticEquipment)?.name || p.diagnosticEquipment}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-surface-600">{p.chiefComplaint}</p>
                      <p className="text-xs text-indigo-600 mt-1">In Geräteraum verlegt — Klick öffnet Akte</p>
                    </div>
                    <div className="shrink-0">
                      <Clipboard className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {patientsByStatus.in_treatment.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-accent-500" />
                In Behandlung ({patientsByStatus.in_treatment.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.in_treatment.map(p => {
                  const tl = TRIAGE_LEVELS.find(t => t.id === p.triageLevel)
                  const room = (hospital.treatmentRooms || []).find(r => r.id === p.assignedRoom)
                  const hasPsychReferral = (p.documents || []).some(doc => doc.templateId === 'psychiatrie_einweisung')
                  return (
                    <div key={p.id}
                      className="card p-4 flex items-center gap-4 border-accent-200 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
                      onClick={() => p.assignedRoom && setOpenRoomView(p.assignedRoom)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-surface-900">{p.name}</p>
                          {tl && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tl.bgColor}`}>{tl.name}</span>}
                          {room && <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{room.name} ({STATION_LABELS[room.station] || room.station})</span>}
                        </div>
                        <p className="text-sm text-surface-600">{p.chiefComplaint}</p>
                        {p.vitals && (
                          <div className="flex gap-3 mt-1 text-xs text-surface-500">
                            <span>HF: {p.vitals.hr}</span><span>RR: {p.vitals.bp}</span><span>SpO₂: {p.vitals.spo2}%</span>
                          </div>
                        )}
                        {room && <p className="text-xs text-primary-500 mt-1 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Klicken um Zimmer zu öffnen</p>}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openPatientFileAtTab(p, 'overview') }} className="btn-secondary text-sm">
                          <Clipboard className="w-3.5 h-3.5" /> Akte
                        </button>
                        {availableTreatmentRooms.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setAssignModal(p) }}
                            className="btn-secondary text-xs text-primary-700 hover:bg-primary-50"
                          >
                            <MoveRight className="w-3.5 h-3.5" /> In anderes Zimmer verlegen
                          </button>
                        )}
                        {p.psychProfile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const res = setPatientSecurityPosting(p.id, !p.securityPosted)
                              if (res?.success === false && res?.message) {
                                setActionResult({ name: res.message, xp: 0, kind: 'error' })
                                setTimeout(() => setActionResult(null), 3000)
                              }
                            }}
                            className={`btn-secondary text-xs ${p.securityPosted ? 'text-emerald-700' : 'text-amber-700'}`}
                          >
                            <Shield className="w-3.5 h-3.5" /> {p.securityPosted ? 'Sicherheit aktiv' : 'Sicherheit postieren'}
                          </button>
                        )}
                        {hasPsychReferral && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPsychTransferConfirm({
                                id: p.id,
                                name: p.name,
                                chiefComplaint: p.chiefComplaint,
                                triageLevel: tl?.name || p.triageLevel || 'n/a',
                                roomName: room?.name || 'Kein Zimmer',
                              })
                            }}
                            className="btn-secondary text-xs text-indigo-700 hover:bg-indigo-50"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> In Psychiatrie verlegen
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openDischargeConfirm(p, room, tl)
                          }}
                          className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Entlassen
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {patientsByStatus.morgue.length > 0 && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-slate-600" />
                Leichenhalle ({patientsByStatus.morgue.length})
              </h3>
              <div className="space-y-2">
                {patientsByStatus.morgue.map(p => {
                  const hasDeathCertificate = (p.documents || []).some(doc => doc.templateId === 'totenschein')
                  return (
                    <div key={p.id} className="card p-4 flex items-center gap-4 border-slate-300 bg-slate-50/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-surface-900">{p.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Verstorben</span>
                        </div>
                        <p className="text-sm text-surface-600">{p.chiefComplaint}</p>
                        <p className="text-xs text-surface-500 mt-1">
                          {hasDeathCertificate ? 'Totenschein dokumentiert' : 'Totenschein fehlt'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => openPatientFileAtTab(p, 'documents')} className="btn-secondary text-sm">
                          <Clipboard className="w-3.5 h-3.5" /> Dokumente
                        </button>
                        <button
                          onClick={() => setUndertakerConfirm({ id: p.id, name: p.name })}
                          disabled={!hasDeathCertificate}
                          className="btn-secondary text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Zum Bestatter
                        </button>
                        <button
                          disabled
                          className="btn-secondary text-xs text-surface-400 cursor-not-allowed"
                          title="Kommt später"
                        >
                          <Search className="w-3.5 h-3.5" /> Pathologie (später)
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hospital.patients?.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500">
                {hospital.isClosed ? 'Krankenhaus geschlossen — keine neuen Patienten.' : canReceivePatients ? 'Noch keine Patienten eingetroffen. Patienten kommen automatisch...' : 'Baue eine Notaufnahme oder Ambulante Aufnahme, um Patienten zu empfangen.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TREATMENT ROOMS TAB */}
      {tab === 'treatment_rooms' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Zimmer ({visibleTreatmentRooms.length})</h3>
            {hasPermission('manage_rooms') && (
              <button onClick={() => setShowBuildTR(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Zimmer bauen ({TREATMENT_ROOM_COST.toLocaleString('de-DE')}€)
              </button>
            )}
          </div>

          {visibleTreatmentRooms.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500 mb-2">Noch keine Zimmer gebaut.</p>
              <p className="text-xs text-surface-400">Zimmer werden benötigt, um Patienten zuzuweisen und zu behandeln.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(treatmentRoomsByStation).map(([stationId, rooms]) => (
                <div key={stationId}>
                  <h4 className="text-sm font-semibold text-surface-700 mb-2">{getStationLabel(stationId)}</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map(room => {
                      const patient = room.patientId ? hospital.patients?.find(p => p.id === room.patientId) : null
                      const tl = patient ? TRIAGE_LEVELS.find(t => t.id === patient.triageLevel) : null
                      const eqCount = [...new Set(room.equipment || [])].length
                      const monitorVitals = patient ? (icuMonitorMap?.[patient.id] || patient.vitals || {}) : null
                      return (
                        <div
                          key={room.id}
                          className={`card p-5 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all group ${patient ? 'border-accent-200' : 'border-surface-200'}`}
                          onClick={() => setOpenRoomView(room.id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors">{room.name}</p>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-surface-400">{getStationLabel(room.station)}</p>
                                {room.roomType === 'shock' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Schockraum</span>
                                )}
                              </div>
                            </div>
                            {hasPermission('manage_rooms') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRenameTreatmentRoom(room) }}
                                className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-600 hover:bg-surface-200"
                              >
                                Umbenennen
                              </button>
                            )}
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${patient ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {patient ? 'Belegt' : 'Frei'}
                            </span>
                          </div>
                          <div className="mb-3">
                            {eqCount > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {[...new Set(Array.isArray(room.equipment) ? room.equipment : [])].map((eqId, i) => {
                                  const eq = EQUIPMENT.find(e => e.id === eqId)
                                  return eq && <span key={`${eqId}-${i}`} className="text-xs px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full">{eq.name}</span>
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-surface-400">Keine Geräte installiert</p>
                            )}
                          </div>
                          {patient ? (
                            <div className="bg-surface-50 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-surface-900 text-sm">{patient.name}</p>
                                {tl && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tl.bgColor}`}>{tl.id}</span>}
                              </div>
                              <p className="text-xs text-surface-500">{patient.chiefComplaint}</p>
                              {room.station === 'icu' && monitorVitals && (
                                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-950 p-2.5 text-emerald-100">
                                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1.5">
                                    <span className="font-semibold">Monitoring aktiv</span>
                                    <span className="text-emerald-300/80 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                      ITS
                                    </span>
                                  </div>
                                  <IcuWave className="h-10 w-full rounded bg-emerald-900/40 mb-2" />
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
                                    <span>HF: <span className="font-semibold text-emerald-200">{monitorVitals.hr || '--'}/min</span></span>
                                    <span>SpO₂: <span className="font-semibold text-emerald-200">{monitorVitals.spo2 || '--'}%</span></span>
                                    <span>RR: <span className="font-semibold text-emerald-200">{monitorVitals.bp || '--/--'}</span></span>
                                    <span>AF: <span className="font-semibold text-emerald-200">{monitorVitals.rr || '--'}/min</span></span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-surface-50 rounded-xl p-3 text-center text-xs text-surface-400">Kein Patient zugewiesen</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="card p-4 mt-4">
            <h4 className="text-sm font-semibold text-surface-800 mb-2">Diagnostik-Geräteräume</h4>
            {diagnosticDeviceRooms.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-2">
                {diagnosticDeviceRooms.map(dr => (
                  <button key={dr.id} onClick={() => setOpenDiagnosticRoomView(dr.id)} className={`rounded-xl border px-3 py-2 transition-all text-left ${dr.patient ? 'border-primary-300 bg-gradient-to-r from-primary-50 to-indigo-50 shadow-sm' : 'border-surface-200 bg-surface-50 hover:border-surface-300'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-surface-900">{dr.name}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${dr.patient ? 'bg-primary-100 text-primary-700' : 'bg-surface-200 text-surface-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dr.patient ? 'bg-primary-500 animate-pulse' : 'bg-surface-400'}`} />
                        {dr.patient ? 'Belegt' : 'Frei'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500">{getStationLabel(dr.stationId)}</p>
                    {dr.patient && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPatientFileAtTab(dr.patient, 'orders') }}
                        className="mt-2 text-xs inline-flex items-center gap-1 rounded-full bg-primary-600 text-white px-2.5 py-1 hover:bg-primary-700 shadow-sm"
                      >
                        <Clipboard className="w-3 h-3" />
                        {dr.patient.name} in Diagnostik - Akte öffnen
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-500">Noch keine Diagnostikgeräte gekauft.</p>
            )}
          </div>
        </div>
      )}

      {/* ROOMS TAB */}
      {tab === 'rooms' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Stationen & Räume ({hospital.rooms?.length || 0})</h3>
            {hasPermission('manage_rooms') && (
              <button onClick={() => setShowBuild(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Raum bauen
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hospital.rooms?.map(room => {
              const def = ROOM_DEFS[room.id] || { name: room.id, icon: Bed, color: 'bg-gray-100 text-gray-600' }
              const RoomIcon = def.icon
              const roomTRs = (hospital.treatmentRooms || []).filter(tr => tr.station === room.id)
              const stationDevices = EQUIPMENT.filter(eq => eq.rooms?.includes(room.id) && [
                'ct_scanner',
                'mri_scanner',
                'xray_mobile',
                'xray_portable',
                'hkl_suite',
                'holter_ecg',
                'holter_rr',
                'spirometry',
                'eeg_system',
                'crash_cart',
                'ultrasound_portable',
              ].includes(eq.id))
              const boughtStationDevices = (hospital.stationEquipment || {})[room.id] || []
              const canRemoveRoom = hasPermission('manage_rooms') && roomTRs.length === 0
              return (
                <div key={room.id} className="card p-4 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl ${def.color} flex items-center justify-center`}>
                      <RoomIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900">{getStationLabel(room.id)}</p>
                      <p className="text-xs text-surface-400">Stufe {room.level} &bull; {roomTRs.length} Zimmer</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500">Zustand: {room.condition}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${room.condition > 60 ? 'bg-accent-500' : room.condition > 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${room.condition}%` }} />
                  </div>
                  {hasPermission('manage_rooms') && (
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleRenameStation(room.id)}
                        className="text-xs px-2.5 py-1.5 rounded bg-surface-100 text-surface-700 hover:bg-surface-200"
                      >
                        Umbenennen
                      </button>
                      <button
                        onClick={() => canRemoveRoom && openRemoveRoomDialog(room.id)}
                        disabled={!canRemoveRoom}
                        className="text-xs px-2.5 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                      >
                        Station abreißen
                      </button>
                    </div>
                  )}
                  {hasPermission('manage_rooms') && !canRemoveRoom && (
                    <p className="mt-1 text-[11px] text-surface-500">Abriss erst möglich, wenn keine Behandlungszimmer dieser Station mehr existieren.</p>
                  )}
                  {stationDevices.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-surface-200">
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Stationsgeräte</p>
                      <div className="space-y-2">
                        {stationDevices.map(eq => {
                          const isBought = boughtStationDevices.includes(eq.id)
                          return (
                            <div key={eq.id} className="flex items-center justify-between gap-2 rounded-lg border border-surface-200 p-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-surface-900">{eq.name}</p>
                                <p className="text-xs text-surface-500">{eq.cost.toLocaleString('de-DE')}€</p>
                              </div>
                              {isBought ? (
                                <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Vorhanden</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const res = purchaseStationEquipment(room.id, eq.id)
                                    if (res?.success === false) {
                                      setActionResult({ name: res.message || 'Kauf nicht möglich.', xp: 0, kind: 'error' })
                                      setTimeout(() => setActionResult(null), 2600)
                                    }
                                  }}
                                  disabled={!hasPermission('manage_rooms')}
                                  className="text-xs px-2.5 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                                >
                                  Kaufen
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MEDICATIONS TAB */}
      {tab === 'medications' && (
        <div className="space-y-6">
          {!hasPharmacyBuilt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Die Apotheke ist noch nicht gebaut. Bitte zuerst den Raum "Apotheke" unter "Stationen & Räume" bauen.
            </div>
          )}
          {/* Inventory overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-sm text-surface-500">Medikamente vorrätig</p>
              <p className="text-2xl font-bold text-surface-900">{Object.values(hospital.medicationInventory || {}).reduce((a, b) => a + b, 0)}</p>
              <p className="text-xs text-surface-400">{Object.keys(hospital.medicationInventory || {}).filter(k => (hospital.medicationInventory[k] || 0) > 0).length} verschiedene Medikamente</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-500">Krankenhausguthaben</p>
              <p className="text-2xl font-bold text-primary-600">{(hospital.balance || 0).toLocaleString('de-DE')}€</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-500">Kategorien</p>
              <p className="text-2xl font-bold text-surface-900">{MEDICATION_CATEGORIES.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-500">Dein Rang</p>
              <p className="text-lg font-bold text-surface-900 capitalize">{user?.rank || 'famulant'}</p>
            </div>
          </div>

          {/* Search and filter */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Medikament suchen..."
              value={medSearch}
              onChange={e => setMedSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-surface-200 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
            />
            <select
              value={medCategory}
              onChange={e => setMedCategory(e.target.value)}
              className="px-4 py-2 rounded-xl border border-surface-200 text-sm focus:border-primary-400 outline-none bg-white"
            >
              <option value="all">Alle Kategorien</option>
              {MEDICATION_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Schnellkauf</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="1"
                value={bulkMedQty}
                onChange={(e) => setBulkMedQty(Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1))}
                className="w-28 text-center text-sm px-2 py-2 rounded-lg border border-violet-200 focus:border-violet-400 outline-none bg-white"
              />
              <span className="text-xs text-violet-700">Menge pro ausgewähltem Medikament</span>
              <button
                onClick={() => {
                  if (selectedBulkMeds.length === 0) {
                    setActionResult({ name: 'Bitte zuerst Medikamente auswählen.', xp: 0, kind: 'error' })
                    setTimeout(() => setActionResult(null), 2400)
                    return
                  }
                  const qty = Math.max(1, Number(bulkMedQty || 1))
                  startIdSwipe(() => {
                    let purchased = 0
                    for (const med of selectedBulkMeds) {
                      const res = purchaseMedication(med.id, qty, med.costPerUnit * qty, med.name)
                      if (res?.success) purchased += 1
                    }
                    if (purchased === 0) {
                      setActionResult({ name: 'Schnellkauf nicht möglich (Budget/Berechtigung prüfen).', xp: 0, kind: 'error' })
                    } else {
                      setActionResult({ name: `Schnellkauf abgeschlossen: ${purchased} Medikamente gekauft.`, xp: 0, kind: 'success' })
                      setBulkMedSelection({})
                    }
                    setTimeout(() => setActionResult(null), 2600)
                  })
                }}
                disabled={!hasPharmacyBuilt || selectedBulkMeds.length === 0}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Alles kaufen ({bulkTotalCost.toFixed(0)}€)
              </button>
            </div>
          </div>

          {/* Category tabs (compact) */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setMedCategory('all')} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${medCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>Alle</button>
            {MEDICATION_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setMedCategory(cat.id)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${medCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{cat.name}</button>
            ))}
          </div>

          {/* Medication list */}
          <div className="space-y-2">
            {filteredMedications
              .map(med => {
                const stock = (hospital.medicationInventory || {})[med.id] || 0
                const canUse = canUseMedication(med, user?.rank || 'famulant')
                const assistBasic = canAssistenzarztBuyBasicMeds && isBasicMedicationForAssistenzarzt(med)
                const canBuyMedByRank = canPurchaseMedsByRank || assistBasic
                const plannedQty = Number(medQuantities[med.id] || 1)
                const assistStockLimited = assistBasic && (Number(stock || 0) + plannedQty > ASSISTENZARZT_BASIC_STOCK_LIMIT)
                const catDef = MEDICATION_CATEGORIES.find(c => c.id === med.category)
                return (
                  <div key={med.id} className="card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${catDef?.color || 'bg-surface-100 text-surface-600'} flex items-center justify-center shrink-0`}>
                        <Pill className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {!med.requiresBtm ? (
                          <label className="inline-flex items-center gap-2 mb-1 text-[11px] text-surface-600">
                            <input
                              type="checkbox"
                              checked={!!bulkMedSelection[med.id]}
                              onChange={(e) => setBulkMedSelection(prev => ({ ...prev, [med.id]: !!e.target.checked }))}
                              disabled={!hasPharmacyBuilt || !canBuyMedByRank}
                            />
                            Für Schnellkauf markieren
                          </label>
                        ) : (
                          <p className="text-[11px] text-rose-600 mb-1">BtM: kein Schnellkauf möglich</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-surface-900">{med.name}</p>
                          {med.requiresBtm && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">BtM</span>}
                          {!canUse && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Ab {med.minRank}</span>}
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">{med.generic} — {med.form}</p>
                        <p className="text-xs text-surface-400 mt-0.5">{med.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-surface-500">Dosis: {med.dose}</span>
                          <span className="text-surface-400">|</span>
                          <span className={`font-medium ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Bestand: {stock} {med.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 items-end">
                        <button onClick={() => setShowMedDetail(med)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Details</button>
                        {med.requiresBtm && !btmCertified ? (
                          <button onClick={() => setBtmTestModal(true)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">BtM-Prüfung erforderlich</button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={medQuantities[med.id] || 1}
                              onChange={(e) => setMedQuantities(prev => ({ ...prev, [med.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-24 text-center text-sm px-2 py-2.5 rounded-lg border border-surface-200 focus:border-primary-400 outline-none"
                            />
                            <button
                              onClick={() => {
                                const qty = medQuantities[med.id] || 1
                                const totalCost = med.costPerUnit * qty
                                startIdSwipe(() => {
                                  const result = purchaseMedication(med.id, qty, totalCost, med.name)
                                  if (!result.success) {
                                    setActionResult({ name: result.message || 'Kauf nicht möglich.', xp: 0, kind: 'error' })
                                    setTimeout(() => setActionResult(null), 2600)
                                  } else {
                                    setActionResult({ name: `${med.name} nachbestellt.`, xp: 0, kind: 'success' })
                                    setTimeout(() => setActionResult(null), 1800)
                                  }
                                })
                              }}
                              disabled={!hasPharmacyBuilt || !canBuyMedByRank || assistStockLimited || !((hospital.balance || 0) >= med.costPerUnit * (medQuantities[med.id] || 1))}
                              className="btn-primary text-sm px-4 py-2.5 disabled:opacity-50 whitespace-nowrap"
                            >
                              {(med.costPerUnit * (medQuantities[med.id] || 1)).toFixed(0)}€
                            </button>
                          </div>
                        )}
                        {assistBasic && (
                          <p className={`text-[11px] ${assistStockLimited ? 'text-red-600' : 'text-amber-700'}`}>
                            Assistenzarzt-Limit: max. {ASSISTENZARZT_BASIC_STOCK_LIMIT} auf Lager
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
            })}
          </div>
        </div>
      )}

      {/* MEDICATION DETAIL MODAL */}
      {showMedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMedDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-surface-900 text-lg">{showMedDetail.name}</h3>
              <button onClick={() => setShowMedDetail(null)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-400 mb-1">Wirkstoff</p>
                  <p className="text-sm font-medium text-surface-900">{showMedDetail.generic}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-400 mb-1">Applikation</p>
                  <p className="text-sm font-medium text-surface-900">{showMedDetail.form}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-400 mb-1">Dosierung</p>
                  <p className="text-sm font-medium text-surface-900">{showMedDetail.dose}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3">
                  <p className="text-xs text-surface-400 mb-1">Mindestrang</p>
                  <p className="text-sm font-medium text-surface-900 capitalize">{showMedDetail.minRank}</p>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-600 font-semibold mb-1">Indikation</p>
                <p className="text-sm text-green-800">{showMedDetail.indication}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-600 font-semibold mb-1">Kontraindikation</p>
                <p className="text-sm text-red-800">{showMedDetail.contraindication}</p>
              </div>
              <div className="bg-surface-50 rounded-xl p-3">
                <p className="text-xs text-surface-400 mb-1">Beschreibung</p>
                <p className="text-sm text-surface-700">{showMedDetail.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm text-surface-500">Bestand: <span className="font-bold text-surface-900">{(hospital.medicationInventory || {})[showMedDetail.id] || 0}</span></p>
                  <p className="text-xs text-surface-400">Packungsgröße: {showMedDetail.packSize} — {showMedDetail.packCost}€</p>
                </div>
                <button
                  onClick={() => {
                    startIdSwipe(() => {
                      const result = purchaseMedication(showMedDetail.id, showMedDetail.packSize, showMedDetail.packCost, showMedDetail.name)
                      if (!result.success) {
                        setActionResult({ name: result.message || 'Kauf nicht möglich.', xp: 0, kind: 'error' })
                        setTimeout(() => setActionResult(null), 2600)
                      } else {
                        setActionResult({ name: `${showMedDetail.name} nachbestellt.`, xp: 0, kind: 'success' })
                        setTimeout(() => setActionResult(null), 1800)
                      }
                    })
                  }}
                  disabled={!(canPurchaseMedsByRank || (canAssistenzarztBuyBasicMeds && isBasicMedicationForAssistenzarzt(showMedDetail)))
                    || ((canAssistenzarztBuyBasicMeds && isBasicMedicationForAssistenzarzt(showMedDetail))
                      && (Number((hospital.medicationInventory || {})[showMedDetail.id] || 0) + Number(showMedDetail.packSize || 0) > ASSISTENZARZT_BASIC_STOCK_LIMIT))}
                  className="btn-primary disabled:opacity-50"
                >
                  Nachbestellen ({showMedDetail.packCost}€)
                </button>
              </div>
              {showMedDetail.requiresBtm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">Dieses Medikament unterliegt dem Betäubungsmittelgesetz (BtMG). Dokumentationspflicht!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BTM INFO MODAL */}
      {btmTestModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 70 }}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBtmTestModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 z-10 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-surface-900 text-lg mb-2">BtM-Qualifikation erforderlich</h3>
            <p className="text-sm text-surface-500 mb-4">Um Betäubungsmittel bestellen zu können, musst du den BtM-Kurs unter „Kurse & Prüfungen" absolvieren.</p>
            <div className="flex gap-3">
              <button onClick={() => setBtmTestModal(false)} className="btn-secondary flex-1">Schließen</button>
              <button onClick={() => { setBtmTestModal(false); window.location.hash = '#/courses' }} className="btn-primary flex-1">Zu den Kursen</button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF TAB */}
      {tab === 'staff' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Personal ({hospital.workers?.length || 0})</h3>
            {hasPermission('manage_staff') && (
              <button onClick={() => setShowHire(true)} className="btn-primary text-sm">
                <UserPlus className="w-4 h-4" /> Personal einstellen
              </button>
            )}
          </div>
          {hospital.workers?.length > 0 ? (
            <div className="space-y-2">
              {hospital.workers.map(w => {
                const wt = WORKER_TYPES.find(t => t.id === w.typeId)
                const Icon = workerIconMap[wt?.icon] || Users
                const wf = WORKER_FUNCTIONS[w.typeId]
                const functionLabels = [
                  ...(wf?.passiveEffects || []).map(eff => eff.description),
                  ...(wt?.autoTasks || []).map(task => task.description || task.name),
                ].filter(Boolean).slice(0, 4)
                return (
                  <div key={w.id} className="card p-4 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wt?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900">{wt?.name || w.name}</p>
                        <p className="text-sm text-surface-500">{wt?.description}</p>
                        {w.typeId === 'sicherheitsdienst' && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-surface-500">Einsatzort</span>
                            <select
                              value={w.stationId || ''}
                              onChange={(e) => setWorkerStation(w.id, e.target.value || null)}
                              disabled={!hasPermission('manage_staff')}
                              className="text-xs rounded border border-surface-200 bg-white px-2 py-1"
                            >
                              <option value="">Nicht zugewiesen</option>
                              <option value="er">Notaufnahme</option>
                            </select>
                          </div>
                        )}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {wt?.autoTasks?.map(task => (
                            <span key={task.id} className="text-xs px-2 py-0.5 bg-surface-100 rounded-full text-surface-600">{task.name}</span>
                          ))}
                        </div>
                        {functionLabels.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Funktionen</p>
                            {functionLabels.map((label, idx) => (
                              <p key={`${w.id}_fn_${idx}`} className="text-xs text-surface-600 leading-relaxed">
                                • {label}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <p className="text-sm font-medium text-surface-900">{wt?.costPerDay?.toLocaleString('de-DE')}€/Tag</p>
                        {hasPermission('manage_staff') && (
                          <button onClick={() => fireWorker(w.id)} className="text-xs text-red-600 hover:text-red-700">Entlassen</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500">Noch kein Personal eingestellt</p>
            </div>
          )}
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === 'members' && (
        <div>
          <h3 className="font-semibold text-surface-900 mb-4">Mitglieder ({hospital.members?.length || 0})</h3>
          <div className="space-y-2">
            {hospital.members?.map(m => (
              <div key={m.userId} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold">
                  {m.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-surface-900">{m.name}</p>
                    {m.role === 'owner' && <Crown className="w-4 h-4 text-amber-500" />}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.role === 'owner' ? 'bg-amber-50 text-amber-700' : m.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-surface-100 text-surface-600'
                    }`}>{m.role === 'owner' ? 'Inhaber' : m.role === 'admin' ? 'Admin' : 'Mitglied'}</span>
                  </div>
                  <p className="text-sm text-surface-500">{m.rank}</p>
                </div>
                {(isOwner() || hasPermission('manage_permissions')) && m.role !== 'owner' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditPermsFor(m)} disabled={!canManagePermissionsByRank} className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                      <Shield className="w-3.5 h-3.5" /> Berechtigungen
                    </button>
                    {isOwner() && canPromoteMembers && m.role !== 'admin' && (
                      <button onClick={() => setMemberRole(m.userId, 'admin')} className="text-xs text-primary-600 hover:text-primary-700">Zum Admin</button>
                    )}
                    {isOwner() && canPromoteMembers && m.role === 'admin' && (
                      <button onClick={() => setMemberRole(m.userId, 'member')} className="text-xs text-surface-500 hover:text-surface-700">Zum Mitglied</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-surface-200">
            {isOwner() ? (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Gefahrenzone</h4>
                <p className="text-sm text-surface-500 mb-3">Das Auflösen deines Krankenhauses kann nicht rückgängig gemacht werden.</p>
                <button onClick={() => { if (confirm('Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.')) { disbandHospital(); navigate('/hospital-choice') } }} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                  Krankenhaus auflösen
                </button>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-surface-700 mb-2">Krankenhaus verlassen</h4>
                <p className="text-sm text-surface-500 mb-3">Du kannst danach einem anderen Krankenhaus beitreten oder ein eigenes gründen.</p>
                <button onClick={() => { const r = leaveHospital(); if (r.success) navigate('/hospital-choice') }} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                  <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Krankenhaus verlassen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINANCES TAB */}
      {tab === 'finances' && (
        <div className="space-y-6">
          {/* Balance cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-6 h-6 text-emerald-600" />
                <p className="text-sm font-medium text-surface-600">Krankenhauskonto</p>
              </div>
              <p className="text-3xl font-bold text-surface-900">{(hospital.balance || 0).toLocaleString('de-DE')}€</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 text-primary-600" />
                <p className="text-sm font-medium text-surface-600">Dein Guthaben</p>
              </div>
              <p className="text-3xl font-bold text-surface-900">{(user?.wallet || 0).toLocaleString('de-DE')}€</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-6 h-6 text-amber-600" />
                <p className="text-sm font-medium text-surface-600">Offene Kredite</p>
              </div>
              <p className="text-3xl font-bold text-surface-900">
                {(hospital.loans?.filter(l => !l.paid).reduce((s, l) => s + l.totalDue, 0) || 0).toLocaleString('de-DE')}€
              </p>
            </div>
          </div>

          {/* Deposit */}
          <div className="card p-5">
            <h4 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary-600" /> Geld einzahlen
            </h4>
            <p className="text-sm text-surface-500 mb-3">Überweise Geld von deinem persönlichen Konto auf das Krankenhauskonto.</p>
            <div className="flex gap-3">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input-field flex-1"
                placeholder="Betrag in €..."
                min="1"
              />
              <button
                onClick={() => { const amt = parseInt(depositAmount); if (amt > 0) { depositToHospital(amt); setDepositAmount('') } }}
                disabled={!depositAmount || parseInt(depositAmount) <= 0 || parseInt(depositAmount) > (user?.wallet || 0)}
                className="btn-primary disabled:opacity-50"
              >
                Einzahlen
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {[500, 1000, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(String(amt))}
                  className="text-xs px-3 py-1 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors"
                >
                  {amt.toLocaleString('de-DE')}€
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h4 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-600" /> Vergütungsverteilung
            </h4>
            <p className="text-sm text-surface-500 mb-4">Lege fest, wie die Fallvergütung prozentual verteilt wird.</p>
            {!canEditRevenueDistribution && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Benötigt Rang Chefarzt und Finanz-Berechtigung (oder Inhaber).
              </div>
            )}
            <div className="space-y-3">
              {[
                { key: 'primary', label: 'Hauptbehandler' },
                { key: 'assistant', label: 'Nebenbehandler' },
                { key: 'hospital', label: 'Krankenhauskonto' },
                { key: 'supervisor', label: 'Supervisor' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-surface-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={revenueSplit[item.key]}
                      disabled={!canEditRevenueDistribution}
                      onChange={(e) => {
                        setRevenueSplitError('')
                        setRevenueSplit(prev => ({ ...prev, [item.key]: Math.max(0, Math.min(100, Number(e.target.value || 0))) }))
                      }}
                      className="input-field !py-2 !w-24 text-right disabled:opacity-60"
                    />
                    <span className="text-sm font-semibold text-surface-900">%</span>
                  </div>
                </div>
              ))}
              <div className="text-xs text-surface-500">
                Summe aktuell: {Object.values(revenueSplit).reduce((s, v) => s + Number(v || 0), 0)}%
              </div>
              {revenueSplitError && (
                <div className="text-xs px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  {revenueSplitError}
                </div>
              )}
              <button
                disabled={!canEditRevenueDistribution}
                onClick={() => {
                  const total = Object.values(revenueSplit).reduce((s, v) => s + Number(v || 0), 0)
                  if (total !== 100) {
                    setRevenueSplitError(`Die Summe muss genau 100% sein (aktuell ${total}%).`)
                    return
                  }
                  const res = updateRevenueDistribution(revenueSplit)
                  if (!res?.success) {
                    setRevenueSplitError(res?.message || 'Speichern fehlgeschlagen.')
                    return
                  }
                  setRevenueSplitError('')
                  setActionResult({ name: 'Vergütungsverteilung gespeichert.', xp: 0, kind: 'success' })
                  setTimeout(() => setActionResult(null), 2200)
                }}
                className="btn-primary text-sm disabled:opacity-60"
              >
                Verteilung speichern
              </button>
            </div>
          </div>

          {/* Loans */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-surface-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" /> Kredite
              </h4>
              <button onClick={() => setLoanModal(true)} disabled={!canManageStrategy} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" /> Kredit aufnehmen
              </button>
            </div>
            {hospital.loans?.length > 0 ? (
              <div className="space-y-2">
                {hospital.loans.map(loan => (
                  <div key={loan.id} className={`flex items-center gap-4 p-3 rounded-xl border ${loan.paid ? 'border-surface-200 opacity-60' : 'border-amber-200 bg-amber-50/30'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 text-sm">
                        {loan.amount.toLocaleString('de-DE')}€
                        <span className="text-surface-500 font-normal"> → Rückzahlung: {loan.totalDue.toLocaleString('de-DE')}€</span>
                      </p>
                      <p className="text-xs text-surface-400">{loan.interestRate}% Zinsen &bull; {loan.termDays} Tage Laufzeit &bull; {new Date(loan.takenAt).toLocaleDateString('de-DE')}</p>
                    </div>
                    {loan.paid ? (
                      <span className="text-xs text-accent-600 font-medium px-2 py-1 bg-accent-50 rounded-lg">Bezahlt</span>
                    ) : (
                      <button
                        onClick={() => repayLoan(loan.id)}
                        disabled={!canManageStrategy || (hospital.balance || 0) < loan.totalDue}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        Zurückzahlen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500">Keine aktiven Kredite</p>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY LOG */}
      {tab === 'log' && (
        <div>
          <h3 className="font-semibold text-surface-900 mb-4">Aktivitätsprotokoll</h3>
          {hospital.activityLog?.length > 0 ? (
            <div className="space-y-2">
              {hospital.activityLog.map((log, i) => (
                <div key={i} className="card p-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-400 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-surface-700">{log.message}</p>
                    <p className="text-xs text-surface-400">{new Date(log.time).toLocaleString('de-DE')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clipboard className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-500">Noch keine Aktivitäten</p>
            </div>
          )}
        </div>
      )}

      {/* ENHANCED TRIAGE MODAL WITH PATIENT CHAT */}
      {triageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setTriageModal(null); setShowTriageExamModal(false) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[94vh] flex flex-col overflow-hidden">
            {/* Phase indicator */}
            <div className="flex items-center gap-1 px-6 pt-5 pb-3 shrink-0">
              <button onClick={() => { setTriageModal(null); setShowTriageExamModal(false) }} className="p-1.5 hover:bg-surface-100 rounded-lg mr-2"><X className="w-5 h-5 text-surface-400" /></button>
              {[
                { id: 'chat', label: 'Patientengespräch', icon: MessageCircle },
                { id: 'vitals', label: 'Vitalzeichen & Blut', icon: HeartPulse },
                { id: 'assess', label: 'Triage-Einstufung', icon: ClipboardList },
              ].map((phase, i) => (
                <div key={phase.id} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors ${
                    triagePhase === phase.id ? 'bg-primary-100 text-primary-700' :
                    (triagePhase === 'vitals' && i === 0) || (triagePhase === 'assess' && i <= 1) ? 'bg-accent-50 text-accent-700' :
                    'bg-surface-100 text-surface-400'
                  }`}>
                    <phase.icon className="w-3.5 h-3.5" />
                    {phase.label}
                    {((triagePhase === 'vitals' && i === 0) || (triagePhase === 'assess' && i <= 1)) && <Check className="w-3 h-3 ml-auto" />}
                  </div>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-surface-300 shrink-0 mx-1" />}
                </div>
              ))}
            </div>

            {/* Phase: Chat */}
            {triagePhase === 'chat' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <PatientChat
                  patient={triageModal}
                  onComplete={handleChatComplete}
                  initialSnapshot={triageChatSnapshot?.patientId === triageModal?.id ? triageChatSnapshot : null}
                  onSnapshotChange={handleTriageSnapshotChange}
                />
              </div>
            )}

            {/* Phase: Vitals & Blood */}
            {triagePhase === 'vitals' && (
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Chat summary */}
                {chatData && (
                  <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider mb-2">Gesprächszusammenfassung</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {chatData.painLevel !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-surface-500">Schmerzen (NRS):</span>
                          <span className={`font-semibold ${chatData.painLevel >= 7 ? 'text-red-600' : chatData.painLevel >= 4 ? 'text-amber-600' : 'text-green-600'}`}>
                            {chatData.painLevel}/10
                          </span>
                        </div>
                      )}
                      {chatData.allergies && <div><span className="text-surface-500">Allergien:</span> <span className="text-surface-700">{chatData.allergies}</span></div>}
                      {chatData.medications && <div><span className="text-surface-500">Medikamente:</span> <span className="text-surface-700">{chatData.medications}</span></div>}
                      {chatData.pastHistory && <div><span className="text-surface-500">Vorerkrankungen:</span> <span className="text-surface-700">{chatData.pastHistory}</span></div>}
                      {chatData.lastMeal && <div className="col-span-2"><span className="text-surface-500">Letzte Mahlzeit:</span> <span className="text-surface-700">{chatData.lastMeal}</span></div>}
                    </div>
                    <p className="text-xs text-surface-400 mt-2">{chatData.questionsAsked}/{chatData.totalQuestions} Fragen gestellt</p>
                  </div>
                )}

                {/* Vitals section — individual measurements */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-surface-900 flex items-center gap-2">
                      <Thermometer className="w-5 h-5 text-primary-500" /> Vitalzeichen erheben (parallel möglich)
                    </h4>
                    <button onClick={measureAllVitals} className="btn-secondary text-xs">
                      Alle gleichzeitig messen
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {[
                      { key: 'hr', label: 'Herzfrequenz', short: 'HF', icon: HeartPulse, unit: '/min', warn: triageVitals?.hr && (triageVitals.hr > 100 || triageVitals.hr < 60), color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                      { key: 'bp', label: 'Blutdruck', short: 'RR', icon: Activity, unit: 'mmHg', warn: triageVitals?.bp && (parseInt(triageVitals.bp) > 140 || parseInt(triageVitals.bp) < 90), color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                      { key: 'rr', label: 'Atemfrequenz', short: 'AF', icon: Activity, unit: '/min', warn: triageVitals?.rr && (triageVitals.rr > 20 || triageVitals.rr < 12), color: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
                      { key: 'temp', label: 'Temperatur', short: 'Temp', icon: Thermometer, unit: '°C', warn: triageVitals?.temp && (triageVitals.temp > 38.0 || triageVitals.temp < 36.0), color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                      { key: 'spo2', label: 'SpO₂', short: 'SpO₂', icon: Droplets, unit: '%', warn: triageVitals?.spo2 && triageVitals.spo2 < 94, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
                      { key: 'bz', label: 'Blutzucker', short: 'BZ', icon: Droplets, unit: 'mg/dl', warn: triageVitals?.bz && (triageVitals.bz < 70 || triageVitals.bz > 180), color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
                    ].map(v => {
                      const Icon = v.icon
                      const value = triageVitals?.[v.key]
                      const measured = value != null
                      const isMeasuring = !!measuringVitals[v.key]
                      return (
                        <div key={v.key} className={`rounded-xl p-3 text-center transition-all ${
                          isMeasuring ? 'bg-primary-50 border-2 border-primary-300 animate-pulse' :
                          measured ? (v.warn ? 'bg-red-50 border border-red-200' : 'bg-surface-50 border border-surface-200') :
                          'bg-surface-50 border-2 border-dashed border-surface-200'
                        }`}>
                          <p className="text-xs text-surface-500 mb-1">{v.short}</p>
                          {isMeasuring ? (
                            <div className="py-2"><div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-[10px] text-primary-500 mt-1">Misst...</p></div>
                          ) : measured ? (
                            <>
                              <p className={`text-lg font-bold ${v.warn ? 'text-red-600' : 'text-surface-900'}`}>{value}</p>
                              <p className="text-xs text-surface-400">{v.unit}</p>
                              <button onClick={() => measureVital(v.key)} disabled={isMeasuring} className="text-[10px] text-primary-600 mt-1 hover:underline disabled:opacity-40">Neu messen</button>
                            </>
                          ) : (
                            <button onClick={() => measureVital(v.key)} disabled={isMeasuring} className={`mt-1 w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${v.color}`}>
                              <Icon className="w-3.5 h-3.5 mx-auto mb-0.5" /> Messen
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Blood draw — available regardless of vital completion */}
                <div className="mb-4">
                  {triageBlood ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-emerald-700">Laboranforderung vorbereitet</span>
                      </div>
                      <button onClick={() => openPatientFileAtTab(triageModal, 'lab', { lockToTab: 'lab' })} className="text-xs text-primary-600 font-medium hover:text-primary-700">Laborwerte auswählen →</button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={handleBloodDraw} className="btn-secondary flex-1">
                        <FlaskConical className="w-4 h-4" /> Labor anfordern
                      </button>
                      <button onClick={() => openBloodDrawForPatient(triageModal)} className="btn-primary flex-1">
                        <Droplets className="w-4 h-4" /> Selbst abnehmen
                      </button>
                    </div>
                  )}
                </div>

                {/* Physical exam mini games */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-surface-700">Körperliche Untersuchung</p>
                    <button onClick={() => setShowTriageExamModal(true)} className="btn-secondary text-xs">
                      <Stethoscope className="w-3.5 h-3.5" /> Untersuchung starten
                    </button>
                  </div>
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                    {triageExamResults.length === 0 ? (
                      <p className="text-xs text-surface-400">Noch keine Untersuchung dokumentiert.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {triageExamResults.map((r, idx) => (
                          <p key={idx} className="text-xs text-surface-700">
                            <span className="font-semibold">{r.title}:</span> {r.summary}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-surface-700 mb-2">Anmerkungen (optional)</p>
                  <textarea
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    className="input-field !h-20 resize-none"
                    placeholder="Weitere Beobachtungen..."
                  />
                </div>

                <button onClick={() => setTriagePhase('assess')} className="btn-primary w-full">
                  Weiter zur Triage-Einstufung
                </button>
                <button onClick={() => setTriagePhase('chat')} className="btn-secondary w-full mt-2">
                  Zurück zum Gespräch
                </button>
              </div>
            )}

            {/* Phase: Assessment */}
            {triagePhase === 'assess' && (
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Quick summary row */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  {chatData?.painLevel !== null && (
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      chatData.painLevel >= 7 ? 'bg-red-100 text-red-700' : chatData.painLevel >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      NRS: {chatData.painLevel}/10
                    </div>
                  )}
                  {triageVitals && (
                    <>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${triageVitals.spo2 < 94 ? 'bg-red-100 text-red-700' : 'bg-surface-100 text-surface-600'}`}>SpO₂: {triageVitals.spo2}%</div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${triageVitals.hr > 100 ? 'bg-red-100 text-red-700' : 'bg-surface-100 text-surface-600'}`}>HF: {triageVitals.hr}/min</div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${triageVitals.temp > 38 ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>Temp: {triageVitals.temp}°C</div>
                      {triageVitals.bz != null && <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${triageVitals.bz < 70 || triageVitals.bz > 180 ? 'bg-violet-100 text-violet-700' : 'bg-surface-100 text-surface-600'}`}>BZ: {triageVitals.bz} mg/dl</div>}
                    </>
                  )}
                  {triageBlood && <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Blut abgenommen</div>}
                  {triageExamResults.length > 0 && <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Untersuchungen: {triageExamResults.length}</div>}
                </div>

                <p className="text-sm font-medium text-surface-700 mb-3">Dringlichkeitsstufe basierend auf Befunden wählen:</p>
                <div className="space-y-2 mb-4">
                  {TRIAGE_LEVELS.map(level => (
                    <button
                      key={level.id}
                      onClick={() => setTriageLevel(level.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                        triageLevel === level.id ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
                      <div className="flex-1">
                        <p className="font-medium text-surface-900 text-sm">{level.name}</p>
                        <p className="text-xs text-surface-500">{level.description}</p>
                      </div>
                      {triageLevel === level.id && <Check className="w-4 h-4 text-primary-600" />}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTriagePhase('vitals')} className="btn-secondary w-full">
                    Zurück
                  </button>
                  <button onClick={finalizeTriage} disabled={!triageLevel} className="btn-primary w-full disabled:opacity-50">
                    Triage abschließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTriageExamModal && triageModal && (
        <PhysicalExamModal
          patient={triageModal}
          onClose={() => setShowTriageExamModal(false)}
          onSave={(resultOrResults) => {
            const results = Array.isArray(resultOrResults) ? resultOrResults : [resultOrResults]
            setTriageExamResults(prev => {
              const next = [...prev]
              results.forEach(r => {
                const idx = next.findIndex(x => x.subtype === r.subtype)
                if (idx >= 0) next[idx] = r
                else next.push(r)
              })
              return next
            })
          }}
        />
      )}

      {/* ASSIGN TO TREATMENT ROOM MODAL */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="font-semibold text-surface-900 text-lg mb-1">Patient zuweisen: {assignModal.name}</h3>
            <p className="text-sm text-surface-500 mb-4">Wähle ein freies Zimmer</p>
            {availableTreatmentRooms.length > 0 ? (
              <div className="space-y-2 mb-4">
                {availableTreatmentRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => { assignPatientToTreatmentRoom(assignModal.id, room.id); setAssignModal(null) }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-surface-200 hover:border-primary-300 text-left transition-colors"
                  >
                    <Stethoscope className="w-5 h-5 text-primary-500" />
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 text-sm">{room.name}</p>
                      <p className="text-xs text-surface-500">{getStationLabel(room.station)} &bull; {room.equipment?.length || 0} Geräte</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-surface-400" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm mb-4">Keine freien Zimmer verfügbar.</p>
            )}
            <button onClick={() => setAssignModal(null)} className="btn-secondary w-full">Abbrechen</button>
          </div>
        </div>
      )}

      {/* BUILD TREATMENT ROOM MODAL */}
      {showBuildTR && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 70 }}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBuildTR(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10">
            <h3 className="font-semibold text-surface-900 text-lg mb-4">Zimmer bauen</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1 block">Name</label>
                <input
                  type="text"
                  value={newTRName}
                  onChange={(e) => setNewTRName(e.target.value)}
                  className="input-field"
                  placeholder={`Zimmer ${(hospital.treatmentRooms?.length || 0) + 1}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1 block">Station</label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_ROOM_STATIONS.map((id) => {
                    const label = getStationLabel(id)
                    const exists = hospital.rooms?.some(r => r.id === id)
                    return (
                      <button
                        key={id}
                        onClick={() => exists && setNewTRStation(id)}
                        disabled={!exists}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          newTRStation === id ? 'bg-primary-600 text-white' : exists ? 'bg-surface-100 text-surface-600 hover:bg-surface-200' : 'bg-surface-50 text-surface-300'
                        }`}
                      >
                        {label}
                        {!exists && <span className="block text-[10px]">Nicht gebaut</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              {newTRStation === 'er' && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-1 block">Raumtyp</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewTRType('standard')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        newTRType === 'standard' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                      }`}
                    >
                      Standard-ZNA
                    </button>
                    <button
                      onClick={() => setNewTRType('shock')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        newTRType === 'shock' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      Schockraum
                    </button>
                  </div>
                  {newTRType === 'shock' && (
                    <p className="text-[11px] text-rose-700 mt-1">
                      Inklusive Notfallwagen, Perfusor, Beatmungs-Setup und Notfallmedikamenten-Basisstock.
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-surface-500">
                Kosten: <span className="font-semibold">{(newTRType === 'shock' ? SHOCK_ROOM_COST : TREATMENT_ROOM_COST).toLocaleString('de-DE')}€</span> &bull; Krankenhauskonto: {(hospital?.balance || 0).toLocaleString('de-DE')}€
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBuildTR(false)} className="btn-secondary flex-1">Abbrechen</button>
              <button onClick={handleBuildTR} className="btn-primary flex-1">Bauen</button>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT MODAL (filtered by room station) */}
      {showEquipment && (() => {
        const stationId = showEquipment.station || 'er'
        const installedSet = new Set(showEquipment.equipment || [])
        const availableEquip = getEquipmentForRoom(stationId)
          .filter(eq => !installedSet.has(eq.id))
          .filter(eq => eq.id !== 'crash_cart' && eq.id !== 'ultrasound_portable')
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEquipment(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-surface-900 text-lg">Geräte: {showEquipment.name}</h3>
                  <p className="text-sm text-surface-500">Station: {getStationLabel(stationId)} &bull; Krankenhauskonto: {(hospital?.balance || 0).toLocaleString('de-DE')}€</p>
                </div>
                <button onClick={() => setShowEquipment(null)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {availableEquip.map(eq => {
                  return (
                    <div key={eq.id} className="flex items-center gap-4 p-3 rounded-xl border border-surface-200">
                      <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-500 shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 text-sm">{eq.name}</p>
                        <p className="text-xs text-surface-500">{eq.description}</p>
                        <p className="text-xs text-surface-400 mt-0.5">{eq.cost.toLocaleString('de-DE')}€</p>
                      </div>
                      <button
                        onClick={() => {
                          const res = addEquipmentToRoom(showEquipment.id, eq.id)
                          if (res?.success) {
                            setShowEquipment({
                              ...showEquipment,
                              equipment: [...new Set([...(showEquipment.equipment || []), eq.id])],
                            })
                          } else {
                            setActionResult({ name: res?.message || 'Kauf nicht möglich.', xp: 0, kind: 'error' })
                            setTimeout(() => setActionResult(null), 2600)
                          }
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 bg-primary-600 text-white hover:bg-primary-700"
                      >
                        Kaufen
                      </button>
                    </div>
                  )
                })}
                {availableEquip.length === 0 && (
                  <p className="text-sm text-surface-500 text-center py-4">Alle verfügbaren Geräte für diesen Raum wurden bereits gekauft.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* HIRE MODAL */}
      {showHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHire(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 text-lg">Personal einstellen</h3>
              <button onClick={() => setShowHire(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {hireResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${hireResult.success ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-700'}`}>
                {hireResult.message}
              </div>
            )}
            <div className="space-y-2">
              {WORKER_TYPES.map(wt => {
                const Icon = workerIconMap[wt.icon] || Users
                const wf = WORKER_FUNCTIONS[wt.id]
                return (
                  <div key={wt.id}
                    className="rounded-xl border border-surface-200 hover:border-primary-200 transition-colors overflow-hidden group/worker"
                  >
                    <div className="flex items-center gap-4 p-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wt.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 text-sm">{wt.name}</p>
                        <p className="text-xs text-surface-500">{wt.description}</p>
                        <p className="text-xs text-surface-400 mt-0.5">{wt.hireCost.toLocaleString('de-DE')}€ &bull; {wt.costPerDay.toLocaleString('de-DE')}€/Tag</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHire(wt.id) }}
                        className="btn-primary text-xs shrink-0"
                      >
                        Einstellen
                      </button>
                    </div>
                    {wf && (
                      <div className="grid grid-rows-[0fr] group-hover/worker:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <div className="overflow-hidden">
                          <div className="px-3 pb-3 pt-1">
                            <div className="bg-surface-50 rounded-lg p-2.5 space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-surface-400 font-semibold">Effekte bei Einstellung</p>
                              {wf.passiveEffects?.map(eff => (
                                <div key={eff.id} className="flex items-center gap-1.5 text-xs text-accent-700">
                                  <Check className="w-3 h-3 shrink-0" />
                                  <span>{eff.description}</span>
                                </div>
                              ))}
                              {(wt.autoTasks || []).map(task => (
                                <div key={task.id} className="flex items-center gap-1.5 text-xs text-primary-600">
                                  <ArrowRight className="w-3 h-3 shrink-0" />
                                  <span>{task.name}: {task.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* BUILD ROOM MODAL */}
      {showBuild && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 70 }}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBuild(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col z-10">
            <div className="flex items-center justify-between p-6 pb-3 shrink-0">
              <h3 className="font-semibold text-surface-900 text-lg">Station / Raum bauen</h3>
              <button onClick={() => setShowBuild(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-surface-500 px-6 mb-4">Krankenhauskonto: {(hospital?.balance || 0).toLocaleString('de-DE')}€</p>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto px-6 pb-6">
              {BUILDABLE_ROOMS.map(br => {
                const def = ROOM_DEFS[br.id] || { name: br.id, icon: Bed, color: 'bg-gray-100 text-gray-600' }
                const RoomIcon = def.icon
                const alreadyBuilt = hospital.rooms?.some(r => r.id === br.id)
                return (
                  <button
                    key={br.id}
                    onClick={() => !alreadyBuilt && handleBuildRoom(br.id)}
                    disabled={alreadyBuilt}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      alreadyBuilt ? 'border-accent-200 bg-accent-50/50 opacity-60' : 'border-surface-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg ${def.color} flex items-center justify-center`}>
                        <RoomIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 text-sm">{def.name}</p>
                        <p className="text-xs text-surface-500">{br.cost.toLocaleString('de-DE')}€</p>
                      </div>
                    </div>
                    {alreadyBuilt && <span className="text-xs text-accent-600">Bereits gebaut</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {roomRemoveTarget && (() => {
        const roomDef = ROOM_DEFS[roomRemoveTarget] || { name: roomRemoveTarget }
        const nameMatches = roomRemoveConfirmText.trim().toLowerCase() === roomDef.name.trim().toLowerCase()
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRoomRemoveTarget(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="font-semibold text-surface-900 text-lg mb-2">Station wirklich abreißen?</h3>
              <p className="text-sm text-surface-600 mb-3">
                Dieser Schritt entfernt <span className="font-semibold">{roomDef.name}</span> inkl. Stationsgeräte. Rückbau nur mit Teilrückerstattung.
              </p>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={roomRemoveArmed}
                  onChange={(e) => setRoomRemoveArmed(e.target.checked)}
                  className="rounded border-surface-300 text-red-600 focus:ring-red-300"
                />
                <span className="text-sm text-surface-700">Ich bestätige den endgültigen Abriss</span>
              </label>
              <label className="text-xs text-surface-500 block mb-1">Zur Bestätigung Stationsname eingeben: <span className="font-semibold">{roomDef.name}</span></label>
              <input
                value={roomRemoveConfirmText}
                onChange={(e) => setRoomRemoveConfirmText(e.target.value)}
                className="input-field mb-4"
                placeholder={roomDef.name}
              />
              <div className="flex gap-3">
                <button onClick={() => setRoomRemoveTarget(null)} className="btn-secondary flex-1">Abbrechen</button>
                <button
                  onClick={executeRemoveRoom}
                  disabled={!roomRemoveArmed || !nameMatches}
                  className="flex-1 rounded-xl bg-red-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
                >
                  Endgültig abreißen
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* PERMISSIONS MODAL */}
      {editPermsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditPermsFor(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-semibold text-surface-900 text-lg mb-1">Berechtigungen: {editPermsFor.name}</h3>
            <p className="text-sm text-surface-500 mb-4">Rolle: {editPermsFor.role === 'admin' ? 'Admin' : 'Mitglied'}</p>
            <div className="space-y-3 mb-6">
              {Object.entries(PERM_LABELS).map(([key, label]) => {
                const val = editPermsFor.permissions?.[key] || false
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-surface-700">{label}</span>
                    <button
                      onClick={() => {
                        const newPerms = { ...editPermsFor.permissions, [key]: !val }
                        updateMemberPermissions(editPermsFor.userId, newPerms)
                        setEditPermsFor({ ...editPermsFor, permissions: newPerms })
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative ${val ? 'bg-primary-600' : 'bg-surface-300'}`}
                    >
                      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: val ? '18px' : '2px' }} />
                    </button>
                  </div>
                )
              })}
            </div>
            <button onClick={() => setEditPermsFor(null)} className="btn-primary w-full">Fertig</button>
          </div>
        </div>
      )}

      {/* CLOSE CONFIRMATION MODAL */}
      {closeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCloseConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <ShieldOff className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-surface-900 mb-2">Patientenaufnahme stoppen?</h3>
            <p className="text-sm text-surface-500 mb-2">Während der Schließung werden keine neuen Patienten aufgenommen.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p className="text-sm text-amber-700 font-medium">Achtung: Bei niedriger Auslastung (&lt;80%) werden 500€/Min vom Krankenhauskonto abgezogen. Staatliches KH: ab -40.000€ Polizei-Strafe. Eigenes KH: ab -30.000€ Insolvenzandrohung, ab -60.000€ Schließung.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCloseConfirm(false)} className="btn-secondary flex-1">Abbrechen</button>
              <button onClick={() => { toggleClosed(); setCloseConfirm(false) }} disabled={!canToggleIntakeByRank} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Aufnahme stoppen
              </button>
            </div>
          </div>
        </div>
      )}
      {manvConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setManvConfirmOpen(false); setManvConfirmStep(1) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
              <Siren className="w-8 h-8 text-amber-700" />
            </div>
            <h3 className="text-xl font-bold text-surface-900 mb-2">MANV manuell auslösen?</h3>
            <p className="text-sm text-surface-600 mb-4">
              Das erzeugt ein Großereignis mit hohem Patientenaufkommen nach 1-2 Minuten.
            </p>
            {manvConfirmStep === 1 ? (
              <div className="flex gap-3">
                <button onClick={() => setManvConfirmOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
                <button onClick={() => setManvConfirmStep(2)} className="btn-primary flex-1">Weiter</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setManvConfirmOpen(false); setManvConfirmStep(1) }} className="btn-secondary flex-1">Abbrechen</button>
                <button onClick={handleManualManvTrigger} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                  Ja, endgültig auslösen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {debtPopup && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setDebtPopup(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Verschuldungswarnung</h3>
                <p className="text-sm text-surface-600 mt-1">{debtPopup}</p>
              </div>
            </div>
            <button onClick={() => setDebtPopup(null)} className="btn-primary w-full mt-5">Verstanden</button>
          </div>
        </div>
      )}
      {dispatchCallOpen && (
        <div className="fixed inset-0 z-[93] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setDispatchCallOpen(false)} />
          <div className="relative w-full max-w-[560px]">
            <img src={dispatchPhoneFrameAsset} alt="Smartphone-Rahmen" className="w-full h-auto select-none pointer-events-none drop-shadow-2xl" />
            <div className="absolute inset-[7%_12.4%_6.8%_12.4%] rounded-[30px] overflow-hidden border border-surface-200 bg-white flex flex-col shadow-inner">
            <div className="px-4 py-2 border-b border-surface-200 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 shrink-0">
              <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1">
                <span>{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>5G • 89%</span>
              </div>
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={dispatchAvatarAsset} alt="Leitstelle Avatar" className="w-8 h-8 rounded-full border border-emerald-200" />
                <div>
                  <p className="font-semibold text-surface-900 leading-tight">Leitstelle am Telefon</p>
                  <p className="text-[11px] text-surface-500 leading-tight">MANV-Livekoordination</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <BellRing className="w-3 h-3" /> aktiv
                </span>
                <button onClick={() => setDispatchCallOpen(false)} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-4 h-4" /></button>
              </div>
            </div>
            </div>
            <div className="p-3 flex-1 min-h-0 overflow-y-auto space-y-2 bg-gradient-to-b from-surface-50 via-white to-emerald-50/30">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] text-cyan-800">
                Erwartet: {dispatchLiveContext.expectedTotal || 0} • Sofort: {dispatchLiveContext.immediateArrivals || 0} • Leitnetz offen: {dispatchLiveContext.remainingIvena || 0}
              </div>
              <div className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-[11px] text-surface-600">
                Simulationsdialog: keine reale Einsatzkommunikation, keine Therapieanweisungen.
              </div>
              {dispatchChat.map((m, idx) => (
                <div key={`${m.role}_${idx}`} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === 'assistant' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'ml-auto bg-primary-600 text-white'}`}>
                  {m.content}
                </div>
              ))}
              {dispatchTyping && <div className="inline-flex px-3 py-2 rounded-2xl bg-surface-100 text-surface-500 text-sm">Leitstelle schreibt ...</div>}
            </div>
            <div className="p-3 border-t border-surface-200 flex items-center gap-2 shrink-0 bg-white">
              <input
                value={dispatchInput}
                onChange={(e) => setDispatchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendDispatchMessage()}
                className="input-field flex-1"
                placeholder="Frage an die Leitstelle ..."
              />
              <button onClick={sendDispatchMessage} className="btn-primary px-3" disabled={dispatchTyping || !dispatchInput.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAN MODAL */}
      {loanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLoanModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 text-lg">Kredit aufnehmen</h3>
              <button onClick={() => setLoanModal(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-surface-500 mb-4">Wähle einen Kreditrahmen für dein Krankenhaus.</p>
            <div className="space-y-3">
              {[
                { amount: 5000, rate: 5, days: 30, label: 'Kleinkredit' },
                { amount: 15000, rate: 8, days: 60, label: 'Standardkredit' },
                { amount: 50000, rate: 12, days: 90, label: 'Großkredit' },
                { amount: 100000, rate: 15, days: 120, label: 'Investitionskredit' },
                { amount: 250000, rate: 20, days: 180, label: 'Expansionskredit' },
              ].map(opt => (
                <button
                  key={opt.amount}
                  onClick={() => { takeLoan(opt.amount, opt.rate, opt.days); setLoanModal(false) }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900">{opt.label}</p>
                    <p className="text-sm text-surface-500">{opt.amount.toLocaleString('de-DE')}€ &bull; {opt.rate}% Zinsen &bull; {opt.days} Tage</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-surface-900">{Math.round(opt.amount * (1 + opt.rate / 100)).toLocaleString('de-DE')}€</p>
                    <p className="text-xs text-surface-400">Rückzahlung</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PATIENT FILE */}
      {patientFileOpen && (() => {
        const livePatient = hospital.patients?.find(p => p.id === patientFileOpen.id) || patientFileOpen
        const isTutorialSim = String(livePatient?.id || '') === 'tutorial_sim_patient'
        return (
          <PatientFile
            patient={livePatient}
            hospital={hospital}
            initialTab={patientFileInitialTab}
            lockedToTab={patientFileLockedTab}
            labOrderMeta={
              patientFileLockedTab === 'lab' && triageModal?.id === livePatient?.id
                ? { fromTriage: true }
                : null
            }
            onClose={() => { setPatientFileOpen(null); setPatientFileInitialTab('overview'); setPatientFileLockedTab(null) }}
            onOrderLab={(patientId, results, cost, categories, selectedParams, metaExtra) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              return addLabResults(patientId, results, cost, categories, selectedParams, metaExtra || {})
            }}
            onCreateOrder={(patientId, payload) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              return createPatientOrder(patientId, payload)
            }}
            onUpdateOrderStatus={(patientId, orderId, action, extra) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              return updatePatientOrderStatus(patientId, orderId, action, extra)
            }}
            onOpenDiagnosticRoom={(order) => openDiagnosticRoomForOrder(order)}
            onOpenBloodDraw={(p, presetParams = []) => {
              if (!canManagePatientActions(p?.id)) return denyPatientAction()
              openBloodDrawForPatient(p, 'clinical', presetParams)
            }}
            onAddPatientNote={(patientId, text) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              addPatientNote(patientId, text)
            }}
            onUpdateMedicationPlan={(patientId, medicationPlan) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              updatePatientMedicationPlan(patientId, medicationPlan)
            }}
            hasNurse={!!hospital?.workers?.some(w => w.typeId === 'pflegefachkraft')}
            onAddPatientLogEntry={(patientId, type, text) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              addPatientLogEntry(patientId, type, text)
            }}
            onUpdatePatientLogEntry={(patientId, entryIndex, updates) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              updatePatientLogEntry(patientId, entryIndex, updates)
            }}
            onDeletePatientLogEntry={(patientId, entryIndex) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              deletePatientLogEntry(patientId, entryIndex)
            }}
            onAssignDiagnoses={(patientId, diagnoses) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              assignDiagnoses(patientId, diagnoses)
            }}
            onUpsertDocument={(patientId, draft) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              upsertPatientDocument(patientId, draft)
            }}
            currentUser={user}
            onAssignCareTeam={(patientId, action) => {
              if (isTutorialSim) return
              const res = assignCareTeam(patientId, action)
              if (res?.success === false && res?.message) {
                setActionResult({ name: res.message, xp: 0, kind: 'error' })
                setTimeout(() => setActionResult(null), 2600)
              }
            }}
            canManagePatientActions={isTutorialSim ? true : canManagePatientActions(livePatient?.id)}
          />
        )
      })()}

      {/* DIAGNOSTIC ROOM VIEW (full-screen) */}
      {openDiagnosticRoomView && (() => {
        const roomEntry = diagnosticDeviceRooms.find((dr) => dr.id === openDiagnosticRoomView)
        if (!roomEntry) return null
        return (
          <DiagnosticRoomView
            roomEntry={roomEntry}
            hospital={hospital}
            onClose={closeDiagnosticRoom}
            onOpenPatientFile={(p) => openPatientFileAtTab(p, 'orders')}
            onOrderAction={(patientId, orderId, action, extra) => {
              const directPatientId = String(patientId || '')
              const resolvedPatientId = (hospital?.patients || []).some((p) => String(p?.id || '') === directPatientId)
                ? directPatientId
                : ((hospital?.patients || []).find((p) => (p.orders || []).some((o) => o.id === orderId))?.id || null)
              if (!resolvedPatientId) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(resolvedPatientId)) return denyPatientAction()
              return updatePatientOrderStatus(resolvedPatientId, orderId, action, extra)
            }}
            onUpsertDocument={(patientId, draft) => {
              const directPatientId = String(patientId || '')
              let resolvedPatientId = (hospital?.patients || []).some((p) => String(p?.id || '') === directPatientId)
                ? directPatientId
                : null
              if (!resolvedPatientId && draft?.orderId) {
                resolvedPatientId = (hospital?.patients || []).find((p) => (p.orders || []).some((o) => o.id === draft.orderId))?.id || null
              }
              if (!resolvedPatientId) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(resolvedPatientId)) return denyPatientAction()
              return upsertPatientDocument(resolvedPatientId, draft)
            }}
            onClinicalProcedureEffect={(action, patientIdDirect) => {
              const pid = String(patientIdDirect || '')
              const resolved = (hospital?.patients || []).some((p) => String(p?.id || '') === pid)
                ? pid
                : null
              if (!resolved) return
              if (!canManagePatientActions(resolved)) {
                denyPatientAction()
                return
              }
              handleExecuteAction(
                {
                  id: action.id,
                  name: action.name || action.id,
                  duration: action.duration ?? 3,
                  xpReward: action.xpReward ?? 0,
                  extra: action.extra || null,
                },
                resolved,
              )
            }}
          />
        )
      })()}

      {/* TREATMENT ROOM VIEW (full-screen) */}
      {openRoomView && (() => {
        const viewRoom = hospital.treatmentRooms?.find(r => r.id === openRoomView)
        if (!viewRoom) return null
        const viewPatient = viewRoom.patientId ? hospital.patients?.find(p => p.id === viewRoom.patientId) : null
        return (
          <TreatmentRoomView
            room={viewRoom}
            patient={viewPatient}
            hospital={hospital}
            userRank={user?.rank}
            onClose={() => setOpenRoomView(null)}
            onEquipmentAction={(actionId, actionName, duration, xpReward, patientId, extra) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              handleExecuteAction({ id: actionId, name: actionName, duration, xpReward, extra }, patientId)
            }}
            onAddEquipment={hasPermission('manage_rooms') ? true : null}
            addEquipmentToRoom={addEquipmentToRoom}
            removeEquipmentFromRoom={removeEquipmentFromRoom}
            onSaveEquipmentState={(roomId, equipmentId, statePatch) => {
              if (viewPatient?.id && !canManagePatientActions(viewPatient.id)) return denyPatientAction()
              updateTreatmentRoomEquipmentState(roomId, equipmentId, statePatch)
            }}
            onUseMedication={(medId, medName, patientId) => {
              if (!canManagePatientActions(patientId)) {
                denyPatientAction()
                return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              }
              const res = useMedication(medId, medName, patientId)
              if (res?.success === false) {
                setActionResult({ name: res.message || 'Aktion nicht erlaubt', xp: 0 })
                setTimeout(() => setActionResult(null), 2600)
              }
              return res
            }}
            onOpenPatientFile={(p) => openPatientFileAtTab(p, 'overview')}
            onPatientChatSnapshotChange={(patientId, snapshot) => {
              if (!patientId) return
              updatePatientChatSnapshot(patientId, snapshot)
            }}
            onSaveExamResult={(patientId, result) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              addPatientExamResult(patientId, result)
            }}
            onUpsertPatientDocument={(patientId, draft) => {
              if (!canManagePatientActions(patientId)) return denyPatientAction()
              upsertPatientDocument(patientId, draft)
            }}
            onFetchResuscitationCart={(patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return denyPatientAction()
              return fetchResuscitationCart(pid)
            }}
            onFetchMobileSono={(roomId, patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId || null
              if (pid && !canManagePatientActions(pid)) return denyPatientAction()
              return fetchMobileSono(roomId, pid)
            }}
            onReturnMobileSono={(roomId) => returnMobileSono(roomId)}
            onResusAnalyze={(patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return {
                success: false,
                message: 'Patient nicht gefunden.',
                debug: {
                  from: 'Hospital.onResusAnalyze',
                  patientId: patientId || null,
                  viewPatientId: viewPatient?.id || null,
                  viewRoomPatientId: viewRoom?.patientId || null,
                  openRoomView: openRoomView || null,
                },
              }
              if (!canManagePatientActions(pid)) return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              return defibAnalyze(pid)
            }}
            onResusCharge={(patientId, joule) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return {
                success: false,
                message: 'Patient nicht gefunden. [RDBG_HOSP_CHARGE_NOPID]',
                debug: {
                  from: 'Hospital.onResusCharge',
                  patientId: patientId || null,
                  viewPatientId: viewPatient?.id || null,
                  viewRoomPatientId: viewRoom?.patientId || null,
                  openRoomView: openRoomView || null,
                },
              }
              if (!canManagePatientActions(pid)) return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              return defibCharge(pid, joule)
            }}
            onResusShock={(patientId, joule) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              return defibShock(pid, joule)
            }}
            onResusToggleCpr={(patientId, active) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              return toggleCpr(pid, active)
            }}
            onResusGiveMedication={(patientId, medId, dose) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return {
                success: false,
                message: 'Patient nicht gefunden. [RDBG_HOSP_MED_NOPID]',
                debug: {
                  from: 'Hospital.onResusGiveMedication',
                  patientId: patientId || null,
                  viewPatientId: viewPatient?.id || null,
                  viewRoomPatientId: viewRoom?.patientId || null,
                  openRoomView: openRoomView || null,
                  medId: medId || null,
                },
              }
              if (!canManagePatientActions(pid)) return { success: false, message: 'Keine Berechtigung für diese Patientenaktion.' }
              return giveResusMedication(pid, medId, dose)
            }}
            onTriggerReanimationAlarm={(patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId || null
              if (pid && !canManagePatientActions(pid)) return denyPatientAction()
              return triggerReanimationAlarm(pid)
            }}
            onDevForceResusState={(patientId, mode) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return denyPatientAction()
              return devForceResusState(pid, mode)
            }}
            onDevForceVomit={(patientId, active) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return denyPatientAction()
              return devForceVomitState(pid, active)
            }}
            onAbortResuscitation={(patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return denyPatientAction()
              return abortResuscitation(pid)
            }}
            onTransferToMorgue={(patientId) => {
              const pid = patientId || viewPatient?.id || viewRoom?.patientId
              if (!pid) return { success: false, message: 'Patient nicht gefunden.' }
              if (!canManagePatientActions(pid)) return denyPatientAction()
              const res = transferDeceasedToMorgue(pid)
              if (res?.success === false) {
                setActionResult({ name: res.message || 'Verlegung in Leichenhalle nicht möglich.', xp: 0, kind: 'error' })
                setTimeout(() => setActionResult(null), 3000)
              } else {
                setActionResult({ name: 'Patient in Leichenhalle verlegt.', xp: 0, kind: 'success' })
                setTimeout(() => setActionResult(null), 2200)
              }
              return res
            }}
            currentUser={user}
            canManagePatientActions={viewPatient ? canManagePatientActions(viewPatient.id) : true}
          />
        )
      })()}

      {showBloodDrawModal && bloodDrawPatient && (
        <BloodDrawModal
          patient={bloodDrawPatient}
          initialSelectedParams={bloodDrawPresetParams}
          onClose={() => { setShowBloodDrawModal(false); setBloodDrawPatient(null); setBloodDrawMode('clinical'); setBloodDrawPresetParams([]) }}
          onSubmit={({ results, cost, categories, selectedParams, meta }) => {
            if (bloodDrawMode === 'assistant') {
              const res = performAssistantTask('blood_sample')
              if (res?.success) {
                bumpAssistantCooldown('blood')
                setActionResult({ name: 'Assistenz-Blutabnahme erfolgreich', xp: res.task?.xp || 0 })
                setTimeout(() => setActionResult(null), 2600)
              }
            } else {
              const fromTriage = triageModal?.id === bloodDrawPatient.id
              const res = addLabResults(
                bloodDrawPatient.id,
                results,
                cost,
                categories,
                selectedParams,
                { ...(meta || {}), fromTriage, fromBloodDraw: true }
              )
              if (res?.success === false) {
                setActionResult({ name: res.message || 'Labor konnte nicht gespeichert werden.', xp: 0, kind: 'error' })
                setTimeout(() => setActionResult(null), 2800)
              } else if (fromTriage) {
                setTriageBlood(true)
              }
            }
            setShowBloodDrawModal(false)
            setBloodDrawPatient(null)
            setBloodDrawMode('clinical')
            setBloodDrawPresetParams([])
          }}
        />
      )}

      {showBpMiniGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowBpMiniGame(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-surface-900">Minigame: Blutdruck messen</h3>
              <button onClick={() => setShowBpMiniGame(false)} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className={`rounded-lg border px-3 py-2 ${bpMiniStep >= 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>1) Klicke auf den Oberarm (Manschette anlegen)</div>
              <div className={`rounded-lg border px-3 py-2 ${bpMiniStep >= 1 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>2) Klicke auf die Pumpe (Druck aufbauen)</div>
              <div className={`rounded-lg border px-3 py-2 ${bpMiniStep >= 2 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>3) Klicke auf die Ellenbeuge (auskultieren & ablassen)</div>
            </div>
            <div className="relative rounded-xl border border-surface-200 bg-surface-50 h-56 mb-3 overflow-hidden">
              <img src={armAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
              <button
                onClick={() => bpMiniStep === 0 && advanceBpMiniGame()}
                className={`absolute left-[34%] top-[34%] px-2 py-1 rounded-md text-xs ${bpMiniStep === 0 ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-500'}`}
              >
                Oberarm
              </button>
              <button
                onClick={() => bpMiniStep === 1 && advanceBpMiniGame()}
                className={`absolute right-[18%] top-[46%] px-2 py-1 rounded-md text-xs ${bpMiniStep === 1 ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-500'}`}
              >
                Pumpe
              </button>
              <button
                onClick={() => bpMiniStep === 2 && advanceBpMiniGame()}
                className={`absolute left-[52%] top-[52%] px-2 py-1 rounded-md text-xs ${bpMiniStep === 2 ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-500'}`}
              >
                Ellenbeuge
              </button>
            </div>
            <p className="text-xs text-surface-500">Fortschritt: {Math.min(100, Math.round(((bpMiniStep + 1) / 3) * 100))}%</p>
          </div>
        </div>
      )}

      {showEkgMiniGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowEkgMiniGame(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-surface-900">Minigame: EKG schreiben</h3>
              <button onClick={() => setShowEkgMiniGame(false)} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className={`rounded-lg border px-3 py-2 ${ekgMiniStep >= 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>1) Brustwand-Elektroden setzen (V1–V6)</div>
              <div className={`rounded-lg border px-3 py-2 ${ekgMiniStep >= 1 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>2) Extremitätenableitungen setzen (RA/LA/RL/LL)</div>
              <div className={`rounded-lg border px-3 py-2 ${ekgMiniStep >= 2 ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200'}`}>3) Bei 10/10 wird das EKG automatisch abgeschlossen</div>
            </div>
            <div className="relative rounded-xl border border-surface-200 bg-surface-50 h-80 overflow-hidden">
              <img src={examChestAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
              {[
                { id: 'v1', x: '46%', y: '38%' }, { id: 'v2', x: '54%', y: '38%' },
                { id: 'v3', x: '49%', y: '45%' }, { id: 'v4', x: '56%', y: '48%' },
                { id: 'v5', x: '62%', y: '48%' }, { id: 'v6', x: '67%', y: '48%' },
                { id: 'ra', x: '34%', y: '24%' }, { id: 'la', x: '66%', y: '24%' },
                { id: 'rl', x: '40%', y: '74%' }, { id: 'll', x: '60%', y: '74%' },
              ].map(lead => (
                <button
                  key={lead.id}
                  onClick={() => placeEkgLead(lead.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[10px] font-bold border ${
                    ekgPlacedLeads[lead.id]
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white text-surface-600 border-surface-300 hover:border-primary-400'
                  }`}
                  style={{ left: lead.x, top: lead.y }}
                >
                  {lead.id.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-surface-600">
              Elektroden gesetzt: <span className="font-bold">{Object.keys(ekgPlacedLeads).length}/10</span>
            </p>
          </div>
        </div>
      )}

      {psychTransferConfirm && (
        <div className="fixed inset-0 z-[88] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPsychTransferConfirm(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-surface-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-surface-900">In Psychiatrie verlegen?</h3>
              <button onClick={() => setPsychTransferConfirm(null)} className="p-1.5 rounded-lg hover:bg-surface-100">
                <X className="w-4 h-4 text-surface-500" />
              </button>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-surface-700 space-y-1">
              <p><span className="text-surface-500">Patient:</span> <span className="font-medium text-surface-900">{psychTransferConfirm.name}</span></p>
              <p><span className="text-surface-500">Beschwerde:</span> {psychTransferConfirm.chiefComplaint}</p>
              <p><span className="text-surface-500">Triage:</span> {psychTransferConfirm.triageLevel}</p>
              <p><span className="text-surface-500">Aktueller Bereich:</span> {psychTransferConfirm.roomName}</p>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              Hinweis: Die Verlegung ist nur mit dokumentierter Psychiatrie-Einweisung sinnvoll und wird reduziert vergütet.
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setPsychTransferConfirm(null)} className="btn-secondary text-sm">Abbrechen</button>
              <button
                onClick={() => {
                  const res = transferPatientToPsychiatry(psychTransferConfirm.id)
                  setPsychTransferConfirm(null)
                  if (res?.success === false && res?.message) {
                    setActionResult({ name: res.message, xp: 0, kind: 'error' })
                    setTimeout(() => setActionResult(null), 3000)
                  } else if (res?.success) {
                    setActionResult({ name: `Patient in Psychiatrie verlegt (+${Number(res.revenue || 0).toLocaleString('de-DE')}€)`, xp: 0, kind: 'success' })
                    setTimeout(() => setActionResult(null), 3500)
                  }
                }}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Verlegung bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {dischargeConfirm && (
        <div className="fixed inset-0 z-[88] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-surface-900">Patient entlassen?</h3>
            <p className="text-sm text-surface-600 mt-1">
              Doppelte Bestätigung erforderlich: medizinische Freigabe + Dienstausweis-Swipe.
            </p>
            <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm space-y-1">
              <p><span className="text-surface-500">Patient:</span> <span className="font-medium text-surface-900">{dischargeConfirm.name}</span></p>
              <p><span className="text-surface-500">Beschwerde:</span> {dischargeConfirm.chiefComplaint}</p>
              <p><span className="text-surface-500">Triage:</span> {dischargeConfirm.triageLevel}</p>
              <p><span className="text-surface-500">Aktueller Bereich:</span> {dischargeConfirm.roomName}</p>
            </div>
            {!dischargeConfirm.hasDischargeDoc && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Entlassung gesperrt: Es muss zuerst ein Entlassungsbogen in der Patientenakte erstellt werden.
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setDischargeConfirm((prev) => prev ? ({ ...prev, firstConfirmed: !prev.firstConfirmed }) : prev)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${dischargeConfirm.firstConfirmed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-surface-300 bg-white text-surface-700'}`}
              >
                {dischargeConfirm.firstConfirmed ? '1/2 Medizinisch bestätigt' : '1/2 Medizinisch bestätigen'}
              </button>
              <span className="text-xs text-surface-500">2/2 erfolgt über Ausweis-Swipe</span>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setDischargeConfirm(null)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (!dischargeConfirm.firstConfirmed || !dischargeConfirm.hasDischargeDoc) return
                  startIdSwipe(() => {
                    const res = dischargePatient(dischargeConfirm.id)
                    if (res?.success === false && res?.message) {
                      setActionResult({ name: res.message, xp: 0, kind: 'error' })
                      setTimeout(() => setActionResult(null), 3000)
                    } else {
                      setActionResult({ name: `${dischargeConfirm.name} entlassen.`, xp: 0, kind: 'success' })
                      setTimeout(() => setActionResult(null), 2200)
                    }
                    setDischargeConfirm(null)
                  })
                }}
                disabled={!dischargeConfirm.firstConfirmed || !dischargeConfirm.hasDischargeDoc}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ausweis-Swipe & Entlassen
              </button>
            </div>
          </div>
        </div>
      )}

      {undertakerConfirm && (
        <div className="fixed inset-0 z-[88] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUndertakerConfirm(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-surface-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-surface-900">An Bestatter übergeben?</h3>
              <button onClick={() => setUndertakerConfirm(null)} className="p-1.5 rounded-lg hover:bg-surface-100">
                <X className="w-4 h-4 text-surface-500" />
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-surface-700">
              <p><span className="text-surface-500">Patient:</span> <span className="font-medium text-surface-900">{undertakerConfirm.name}</span></p>
              <p className="text-xs text-surface-500 mt-1">Die Vergütung/Strafe wird nach Behandlungsumfang und Fallkontext berechnet.</p>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setUndertakerConfirm(null)} className="btn-secondary text-sm">Abbrechen</button>
              <button
                onClick={() => {
                  const res = sendDeceasedToUndertaker(undertakerConfirm.id)
                  setUndertakerConfirm(null)
                  if (res?.success === false && res?.message) {
                    setActionResult({ name: res.message, xp: 0, kind: 'error' })
                    setTimeout(() => setActionResult(null), 3200)
                  } else if (res?.success) {
                    const payout = Number(res.payout || 0)
                    setActionResult({
                      name: `Übergabe abgeschlossen (${payout >= 0 ? '+' : ''}${payout.toLocaleString('de-DE')}€)`,
                      xp: 0,
                      kind: payout >= 0 ? 'success' : 'error',
                    })
                    setTimeout(() => setActionResult(null), 3600)
                  }
                }}
                className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800"
              >
                Übergabe bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION PROGRESS OVERLAY */}
      {activeAction && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-primary-200 shadow-xl rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[320px]">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-surface-900 text-sm">{activeAction.name}</p>
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-75" style={{ width: `${activeAction.progress}%` }} />
            </div>
            <p className="text-xs text-surface-400 mt-0.5">{Math.round(activeAction.progress)}% — {activeAction.duration}s</p>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed z-[92] w-full max-w-md transition-all duration-300" style={tutorialFloatingStyle}>
          <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-white/92 via-sky-50/92 to-indigo-50/92 backdrop-blur-md shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
            <div className="px-5 py-4 border-b border-sky-100/90 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-indigo-600 font-semibold">Interaktiver Schnellstart</p>
                <h3 className="font-bold text-slate-900">{tutorialSteps[tutorialStep]?.title}</h3>
              </div>
              <button onClick={finishTutorial} className="text-xs px-2.5 py-1 rounded-lg bg-white/70 text-slate-700 border border-slate-200 hover:bg-white">
                Überspringen
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-slate-700">{tutorialSteps[tutorialStep]?.text}</p>
              {String(tutorialSteps[tutorialStep]?.action || '').startsWith('open_sim_') && (
                <button
                  onClick={() => {
                    const action = tutorialSteps[tutorialStep]?.action
                    const tabMap = {
                      open_sim_overview: 'overview',
                      open_sim_vitals: 'vitals',
                      open_sim_lab: 'lab',
                      open_sim_diagnosis: 'diagnosis',
                      open_sim_documents: 'notes',
                    }
                    setPatientFileInitialTab(tabMap[action] || 'overview')
                    setPatientFileOpen(tutorialSimPatient)
                  }}
                  className="w-full text-sm px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Simulationsakte öffnen
                </button>
              )}
              <div className="h-2 rounded-full bg-white/80 border border-sky-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300" style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Schritt {tutorialStep + 1} / {tutorialSteps.length}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                    disabled={tutorialStep === 0}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/70 text-slate-700 border border-slate-200 hover:bg-white disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <button onClick={nextTutorialStep} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                    {tutorialStep >= tutorialSteps.length - 1 ? 'Fertig' : 'Weiter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {renameModal.open && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setRenameModal({ open: false, mode: 'station', stationId: null, roomId: null, label: '', value: '' })} />
          <div className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white shadow-2xl p-5">
            <h3 className="text-lg font-semibold text-surface-900 mb-1">
              {renameModal.mode === 'station' ? 'Station umbenennen' : 'Zimmer umbenennen'}
            </h3>
            <p className="text-sm text-surface-500 mb-4">
              Aktuell: <span className="font-medium text-surface-700">{renameModal.label}</span>
            </p>
            <label className="text-xs text-surface-500 block mb-1">Neuer Name</label>
            <input
              value={renameModal.value}
              onChange={(e) => setRenameModal(prev => ({ ...prev, value: e.target.value }))}
              className="input-field mb-4"
              placeholder={renameModal.mode === 'station' ? 'z. B. Schockraum Nord' : 'z. B. Zimmer 1A'}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRenameModal({ open: false, mode: 'station', stationId: null, roomId: null, label: '', value: '' })}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
              {renameModal.mode === 'station' && (
                <button
                  onClick={() => setRenameModal(prev => ({ ...prev, value: '' }))}
                  className="btn-secondary flex-1"
                >
                  Standardname
                </button>
              )}
              <button onClick={submitRenameModal} className="btn-primary flex-1">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION RESULT TOAST */}
      {actionResult && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white shadow-xl rounded-2xl px-6 py-3 flex items-center gap-3 animate-bounce ${actionResult.kind === 'error' ? 'bg-red-600' : 'bg-accent-600'}`}>
          <Check className="w-5 h-5" />
          <span className="font-medium text-sm">{actionResult.kind === 'error' ? actionResult.name : `${actionResult.name} abgeschlossen!`}</span>
          {actionResult.kind !== 'error' && <span className="text-accent-200 text-sm">+{actionResult.xp} XP</span>}
        </div>
      )}

      {/* ID CARD SWIPE MODAL */}
      {idSwipeModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIdSwipeModal({ open: false, payload: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 select-none">
            <h3 className="text-lg font-bold text-surface-900 mb-1">Dienstausweis prüfen</h3>
            <p className="text-sm text-surface-500 mb-4">Ziehe den Ausweis über den Sensor, um die Aktion freizugeben.</p>
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white p-3 mb-3 shadow">
                <p className="text-[10px] text-slate-200 uppercase tracking-wide">Klinik-Dienstausweis</p>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-[11px] text-slate-200">Rang: {currentMedicalRank?.name || user?.title}</p>
                <p className="text-[10px] text-slate-300 mt-1">ID {String(user?.id || '').slice(-8)} • gültig</p>
              </div>
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIdSwipeDragging(true)
                  updateIdSwipeFromEvent(e)
                }}
                onMouseMove={handleIdCardDrag}
                onMouseUp={() => setIdSwipeDragging(false)}
                onMouseLeave={() => setIdSwipeDragging(false)}
                className={`relative h-16 rounded-xl border border-primary-200 bg-white overflow-hidden ${idSwipeDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div className="absolute inset-y-0 left-0 bg-primary-500/20" style={{ width: `${idSwipeProgress}%` }} />
                <div
                  onMouseDown={(e) => { e.preventDefault(); setIdSwipeDragging(true) }}
                  onMouseUp={() => setIdSwipeDragging(false)}
                  className="absolute top-1 bottom-1 w-36 rounded-lg bg-gradient-to-r from-primary-700 to-primary-500 text-white text-xs font-semibold flex flex-col items-center justify-center cursor-ew-resize shadow"
                  style={{ left: `${idSwipeX}px`, transform: 'translateX(-50%)' }}
                >
                  <span>Dienstausweis</span>
                  <span className="text-[10px] text-primary-100">{user?.name}</span>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-24 h-10 rounded-lg border border-dashed border-primary-300 bg-primary-50 flex items-center justify-center text-[10px] text-primary-700 font-semibold">
                  Sensor
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEV MENU */}
      {canUseDevTools && showDevMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDevMenu(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="font-semibold text-surface-900 text-lg flex items-center gap-2">
                <Terminal className="w-5 h-5 text-surface-400" /> Entwicklermenü
              </h3>
              <button onClick={() => setShowDevMenu(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(92vh-72px)] space-y-3">
              <div>
                <p className="text-sm font-medium text-surface-700 mb-2">Patient hinzufügen</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => devSpawnPatient('walk_in')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" /> Zu Fuß
                  </button>
                  <button
                    onClick={() => devSpawnPatient('ambulance')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Siren className="w-4 h-4" /> Rettungswagen
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-200">
                <p className="text-sm font-medium text-surface-700 mb-2">Template-Patient (Diagnosebasiert)</p>
                <div className="space-y-2">
                  <select
                    value={devSpecialty}
                    onChange={(e) => setDevSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 text-sm bg-white"
                  >
                    {diagnosisCatalog.map(section => (
                      <option key={section.specialty} value={section.specialty}>{section.specialty}</option>
                    ))}
                  </select>
                  <select
                    value={devDiagnosisCode}
                    onChange={(e) => setDevDiagnosisCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 text-sm bg-white"
                  >
                    {currentDevDiagnoses.map(dx => (
                      <option key={dx.code} value={dx.code}>{dx.code} - {dx.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDevArrivalType('walk_in')}
                      className={`py-2 rounded-xl text-sm font-medium ${devArrivalType === 'walk_in' ? 'bg-blue-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'}`}
                    >
                      Zu Fuß
                    </button>
                    <button
                      onClick={() => setDevArrivalType('ambulance')}
                      className={`py-2 rounded-xl text-sm font-medium ${devArrivalType === 'ambulance' ? 'bg-red-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'}`}
                    >
                      RTW
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!devDiagnosisCode) return
                      devSpawnTemplatePatient(devSpecialty, devDiagnosisCode, devArrivalType)
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Template-Patient spawnen
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-200">
                <p className="text-sm font-medium text-surface-700 mb-2">CT-Schnellstart (DEV)</p>
                <p className="text-xs text-surface-500 mb-2">Springt direkt in den CT-Raum. Beim Schließen wird der DEV-Patient automatisch entfernt.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'kopf', label: 'Kopf' },
                    { id: 'thorax', label: 'Thorax' },
                    { id: 'abdomen', label: 'Abdomen' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setDevCtRegion(opt.id)}
                      className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                        devCtRegion === opt.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setDevCtMode('healthy')}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      devCtMode === 'healthy'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    Gesund
                  </button>
                  <button
                    onClick={() => setDevCtMode('pathologic')}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      devCtMode === 'pathologic'
                        ? 'bg-rose-600 text-white'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    Pathologisch
                  </button>
                </div>
                {devCtMode === 'pathologic' && (
                  <select
                    value={devCtPreset}
                    onChange={(e) => setDevCtPreset(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-surface-200 text-sm bg-white"
                  >
                    {(devCtPresetOptions[devCtRegion] || []).map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={launchDevCtPreview}
                  disabled={devCtLaunching}
                  className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {devCtLaunching ? 'Starte CT-Preview...' : 'CT-Preview öffnen'}
                </button>
              </div>

              <div className="pt-3 border-t border-surface-200">
                <p className="text-sm font-medium text-surface-700 mb-2">Spezialpatienten (DEV)</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => devSpawnSpecialPatient('walk_in', 'foreign')}
                    className="py-2 rounded-xl text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100"
                  >
                    Fremdsprache
                  </button>
                  <button
                    onClick={() => devSpawnSpecialPatient('walk_in', 'sensory')}
                    className="py-2 rounded-xl text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100"
                  >
                    Taub/Stumm
                  </button>
                  <button
                    onClick={() => devSpawnSpecialPatient('walk_in', 'psych')}
                    className="py-2 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    Psych auffällig
                  </button>
                  <button
                    onClick={() => devSpawnSpecialPatient('walk_in', 'meme')}
                    className="py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    SAMPLER-Meme
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-200">
                <p className="text-sm font-medium text-surface-700 mb-2">Großereignis auslösen</p>
                <button
                  onClick={() => { if (!devEventPending) { setDevEventPending(true); devTriggerMassEvent(); setTimeout(() => setDevEventPending(false), 6000) } }}
                  disabled={devEventPending}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {devEventPending ? 'MANV wird eingeleitet...' : 'Großereignis starten'}
                </button>
                {devEventPending && <p className="text-xs text-surface-400 text-center mt-1">Leitstelle meldet Lage, dann kommen stufenweise Leitnetz-Anmeldungen.</p>}
              </div>

              <div className="pt-3 border-t border-surface-200 space-y-2">
                <p className="text-sm font-medium text-surface-700">Rang-Cheat</p>
                <p className="text-xs text-surface-500">Aktuell: {currentMedicalRank?.name || user?.title || 'Unbekannt'}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {DEV_MEDICAL_SPECIALTIES.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => updateUser({ specialty: spec.id })}
                      className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                        normalizeSpecialtyId(user?.specialty) === spec.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                      }`}
                    >
                      {spec.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => completeDevPromotionCourse('facharzt')}
                    className="py-2 rounded-xl text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100"
                  >
                    DEV: Facharzt-Kurs fertig
                  </button>
                  <button
                    onClick={() => completeDevPromotionCourse('oberarzt')}
                    className="py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    DEV: Oberarzt-Kurs fertig
                  </button>
                  <button
                    onClick={() => completeDevPromotionCourse('chefarzt')}
                    className="py-2 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    DEV: Chefarzt-Kurs fertig
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {RANKS.map(rank => (
                    <button
                      key={rank.id}
                      onClick={() => applyRankCheat(rank.id)}
                      className="py-2 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      {rank.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-200 space-y-2">
                <p className="text-sm font-medium text-surface-700">Money-/XP-Cheats</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={devCheatMoney}
                    onChange={(e) => setDevCheatMoney(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Geldbetrag"
                  />
                  <button
                    onClick={applyMoneyCheat}
                    className="py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Geld geben
                  </button>
                  <input
                    value={devCheatXp}
                    onChange={(e) => setDevCheatXp(e.target.value)}
                    className="input-field text-sm"
                    placeholder="XP-Betrag"
                  />
                  <button
                    onClick={applyXpCheat}
                    className="py-2 rounded-xl text-sm font-medium bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                  >
                    XP geben
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={devSkipHours}
                    onChange={(e) => setDevSkipHours(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Stunden (z. B. 6)"
                  />
                  <button
                    onClick={applyDevTimeSkip}
                    className="py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Zeit skippen
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-200 space-y-2">
                <p className="text-sm font-medium text-surface-700">Profil-Stats (DEV)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={devCasesCompleted}
                    onChange={(e) => setDevCasesCompleted(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Abgeschlossene Fälle"
                  />
                  <input
                    value={devSuccessRate}
                    onChange={(e) => setDevSuccessRate(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Erfolgsrate %"
                  />
                  <input
                    value={devPatientsHelped}
                    onChange={(e) => setDevPatientsHelped(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Patienten geholfen"
                  />
                  <input
                    value={devCoursesCompleted}
                    onChange={(e) => setDevCoursesCompleted(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Abgeschl. Kurse"
                  />
                </div>
                <button
                  onClick={applyProfileStatsCheat}
                  className="w-full py-2 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  Profilwerte übernehmen
                </button>
              </div>

              <div className="pt-3 border-t border-surface-200 space-y-2">
                <p className="text-sm font-medium text-surface-700">Weitere DEV-Aktionen</p>
                <button
                  onClick={() => devSpawnIvenaPrealert()}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Leitnetz-Voranmeldung spawnen
                </button>
                <button
                  onClick={() => devClearAllPatients()}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-surface-800 text-white hover:bg-surface-700 transition-colors"
                >
                  Alle Patienten entfernen
                </button>
                <button
                  onClick={() => triggerPolicePenalty({ reason: 'DEV-Trigger: Absichtliche Fehlbehandlung (KH).', source: 'dev', severity: 'critical', forceJail: true })}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Polizei-Trigger auslösen
                </button>
                <button
                  onClick={() => clearLegalState()}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  DEV: Sofort freikaufen
                </button>
                <button
                  onClick={() => {
                    resetUserProfile()
                    setActionResult({ name: 'DEV: Benutzerprofil vollständig zurückgesetzt.', xp: 0, kind: 'success' })
                    setTimeout(() => setActionResult(null), 2800)
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-700 text-white hover:bg-red-800 transition-colors"
                >
                  DEV: Profil komplett zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dev menu floating button */}
      {canReopenDispatchPhone && !dispatchCallOpen && (
        <button
          onClick={() => setDispatchCallOpen(true)}
          className="fixed bottom-6 left-[210px] h-12 px-4 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 z-50"
          title="Leitstelle öffnen"
        >
          <PhoneCall className="w-4 h-4" />
          <span className="text-sm font-medium">Leitstelle</span>
        </button>
      )}
      {canUseDevTools && (
        <button
          onClick={() => setShowDevMenu(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-surface-800 text-white shadow-lg hover:bg-surface-700 transition-colors flex items-center justify-center z-40"
          title="Entwicklermenü"
        >
          <Terminal className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
