import { useState, useMemo, useEffect, useRef } from 'react'
import {
  FileText, FlaskConical, HeartPulse, Pill, Clock, AlertCircle, Check,
  ChevronDown, ChevronUp, X, Activity, Clipboard, Search,
  MessageCircle, Stethoscope, Plus, XCircle, Scan, Sparkles, Lightbulb, DollarSign
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LAB_CATEGORIES, LAB_PARAMETERS, isAbnormal, getLabReadyAtIso } from '../data/labValues'
import { searchIcd10, evaluateDiagnosisMatch } from '../data/icd10Data'
import { evaluateCaseTiming, estimateCaseRevenue } from '../data/caseEconomics'
import { MEDICATIONS } from '../data/medications'
import { evaluateDischargeRequirements } from '../data/dischargeRequirements'
import { ORDER_MODALITIES, buildDiagnosticPlaceholderImage, getOrderStatusLabel, getOrderWorkflowSteps } from '../data/ordersCatalog'
import { getDiagnosticWorkflowConfig } from '../data/diagnosticWorkflows'
import { DOCUMENT_TEMPLATES, getDocumentTemplate } from '../data/documentTemplates'
import { getHintCost, getLabOrderCost, getLabReadyAtAdjusted } from '../data/shopSpecials'

const DEFAULT_PARAM_COST = 3
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0))
const ROOM_MODALITIES = new Set(['xray', 'mri', 'ct', 'hkl'])
const ORDER_BODY_PARTS = {
  xray: ['Thorax', 'Schädel', 'Arm links', 'Arm rechts', 'Hand links', 'Hand rechts', 'Bein links', 'Bein rechts', 'Fuß links', 'Fuß rechts', 'Becken'],
  mri: ['Kopf', 'HWS', 'LWS', 'Thorax', 'Abdomen', 'Ganzkörper'],
  ct: ['Kopf', 'Thorax', 'Abdomen', 'Becken', 'Trauma-Scan'],
  hkl: ['Koronarangiographie', 'Linksherzkatheter', 'Rechtsherzkatheter'],
}

const ARTIFACT_MODE_SPECS = {
  xray: { mode: 'track_x', durationMs: 5000, amplitude: 0.35, periodMs: 430, instruction: 'Belichtung stabil halten: Cursor horizontal am Zielpunkt fuehren.' },
  ct: { mode: 'track_x', durationMs: 5500, amplitude: 0.32, periodMs: 390, instruction: 'Tischlauf kompensieren: Cursor horizontal stabil am Ziel halten.' },
  mri: { mode: 'track_x', durationMs: 6200, amplitude: 0.38, periodMs: 340, instruction: 'Bewegungsartefakte minimieren: ruhige, praezise Fuehrung erforderlich.' },
  hkl: { mode: 'track_x', durationMs: 5200, amplitude: 0.28, periodMs: 320, instruction: 'Katheterfuehrung simulieren: Zielbahn exakt halten.' },
  spiro: { mode: 'track_y', durationMs: 5200, amplitude: 0.34, periodMs: 410, instruction: 'Atemfluss steuern: Cursor vertikal im Sollbereich halten.' },
  langzeit_rr: { mode: 'track_y', durationMs: 5000, amplitude: 0.3, periodMs: 470, instruction: 'Manschettendruck kalibrieren: vertikale Zielspur balancieren.' },
  ekg: { mode: 'rhythm_tap', durationMs: 6000, pulseStep: 0.09, tapWindow: 0.1, instruction: 'Rhythmus-Check: Marker im gruener Zone setzen.' },
  langzeit_ekg: { mode: 'rhythm_tap', durationMs: 6500, pulseStep: 0.08, tapWindow: 0.1, instruction: 'Signalqualitaet ueber Zeit: Marker bei sauberem Peak setzen.' },
  eeg: { mode: 'rhythm_tap', durationMs: 6800, pulseStep: 0.07, tapWindow: 0.11, instruction: 'Artefaktarme Ableitung: Marker im stabilen Fenster setzen.' },
  echo: { mode: 'rhythm_tap', durationMs: 5200, pulseStep: 0.095, tapWindow: 0.12, instruction: 'Schallfenster timen: Marker im validen Bildsegment setzen.' },
}

function getArtifactSpec(modalityId) {
  return ARTIFACT_MODE_SPECS[modalityId] || { mode: 'track_x', durationMs: 5000, amplitude: 0.33, periodMs: 420, instruction: 'Artefaktkontrolle: Zielbahn stabil halten.' }
}

function qualityFromScore(score) {
  if (score >= 78) return 'gut'
  if (score >= 55) return 'eingeschraenkt'
  return 'artefakte'
}

function buildArtifactGameState(modalityId, running = false) {
  const spec = getArtifactSpec(modalityId)
  return {
    modalityId: modalityId || null,
    mode: spec.mode,
    instruction: spec.instruction,
    running,
    remainingMs: running ? spec.durationMs : 0,
    targetX: 0.5,
    targetY: 0.5,
    cursorX: 0.5,
    cursorY: 0.5,
    pulsePos: 0,
    pulseStep: spec.pulseStep || 0.09,
    tapWindow: spec.tapWindow || 0.1,
    amplitude: spec.amplitude || 0.33,
    periodMs: spec.periodMs || 420,
    accumError: 0,
    samples: 0,
    hitCount: 0,
    attempts: 0,
    score: null,
    quality: '',
  }
}

export default function PatientFile({
  patient,
  hospital,
  initialTab = 'overview',
  lockedToTab = null,
  labOrderMeta = null,
  onClose,
  onOrderLab,
  onAddPatientNote,
  onUpdateMedicationPlan,
  onAddPatientLogEntry,
  onUpdatePatientLogEntry,
  onDeletePatientLogEntry,
  onAssignDiagnoses,
  onUpsertDocument,
  onCreateOrder,
  onUpdateOrderStatus,
  onOpenDiagnosticRoom,
  onOpenBloodDraw,
  onAssignCareTeam,
  currentUser,
  hasNurse = false,
  canManagePatientActions = true,
}) {
  const { user, addMoney } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedLabParams, setSelectedLabParams] = useState([])
  const [labOrdering, setLabOrdering] = useState(false)
  const [expandedLabIdx, setExpandedLabIdx] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [newLogType, setNewLogType] = useState('visit')
  const [newLogText, setNewLogText] = useState('')
  const [editLogIndex, setEditLogIndex] = useState(null)
  const [editLogType, setEditLogType] = useState('note')
  const [editLogText, setEditLogText] = useState('')
  const [diagQuery, setDiagQuery] = useState('')
  const [labMessage, setLabMessage] = useState(null)
  const [nowTs, setNowTs] = useState(Date.now())
  const [medPlanForm, setMedPlanForm] = useState({
    medId: '',
    dose: '',
    doseMultiplier: 1,
    route: 'i.v.',
    intervalHours: '',
  })
  const [medPlanSearch, setMedPlanSearch] = useState('')
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [editPlanForm, setEditPlanForm] = useState({ dose: '', route: 'i.v.', intervalHours: '' })
  const [orderModality, setOrderModality] = useState('ct')
  const [orderBodyPart, setOrderBodyPart] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [orderMessage, setOrderMessage] = useState(null)
  const [assessmentDrafts, setAssessmentDrafts] = useState({})
  const [activeProcedureOrderId, setActiveProcedureOrderId] = useState(null)
  const [procedureStep, setProcedureStep] = useState(0)
  const [procedureConfig, setProcedureConfig] = useState({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] })
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [documentDraft, setDocumentDraft] = useState(null)
  const [newDocumentTemplateId, setNewDocumentTemplateId] = useState('aufnahmebogen')
  const [artifactGame, setArtifactGame] = useState(buildArtifactGameState(null, false))
  const [textBlockPicker, setTextBlockPicker] = useState({ open: false, fieldId: null })
  const [zoomedImage, setZoomedImage] = useState({ open: false, src: '', alt: '', caption: '', scale: 1 })
  const [tipMessage, setTipMessage] = useState(null)
  const [purchasedTips, setPurchasedTips] = useState({})
  const rxSignatureRef = useRef(null)
  const rxDrawingRef = useRef(false)
  const [rxSignatureEmpty, setRxSignatureEmpty] = useState(true)

  const labHistory = patient?.labHistory || []
  const patientLog = patient?.patientLog || []
  const examResults = patient?.examResults || []
  const diagnoses = patient?.diagnoses || { primary: null, secondary: [], chronic: [] }
  const medicationPlan = patient?.medicationPlan || []
  const normalizedDiagQuery = String(diagQuery || '').trim()
  const diagnosisResults = useMemo(() => {
    if (normalizedDiagQuery.length < 2) return []
    return searchIcd10(normalizedDiagQuery).slice(0, 80)
  }, [normalizedDiagQuery])
  const primaryDxCheck = evaluateDiagnosisMatch(patient, diagnoses)
  const careTeam = patient?.careTeam || { primary: null, assistant: null, supervisor: null }
  const orders = patient?.orders || []
  const careTeamMembers = hospital?.members || []
  const assistantIds = Array.isArray(careTeam.assistant)
    ? careTeam.assistant
    : (careTeam.assistant ? [careTeam.assistant] : [])
  const getMemberName = (id) => careTeamMembers.find(m => m.userId === id)?.name || 'Unbekannt'
  const rankOrder = { assistenzarzt: 1, facharzt: 2, oberarzt: 3, chefarzt: 4 }
  const canBeSupervisor = (rankOrder[currentUser?.rank || 'assistenzarzt'] || 1) >= 3
  const caseTiming = evaluateCaseTiming(patient)
  const dischargeRequirements = evaluateDischargeRequirements(patient)
  const estimatedRevenue = estimateCaseRevenue(patient, !!primaryDxCheck?.details?.primaryMatch, dischargeRequirements?.summary)
  const clinicalState = patient?.clinicalState || null
  const vitalsHistory = patient?.vitalsHistory || []
  const availableMedications = MEDICATIONS.filter(m =>
    !medPlanSearch
      || (m?.name || '').toLowerCase().includes(medPlanSearch.toLowerCase())
      || (m?.generic || '').toLowerCase().includes(medPlanSearch.toLowerCase())
  ).slice(0, 100)
  const selectedMedication = MEDICATIONS.find(m => m.id === medPlanForm.medId)
  const doseOptions = (selectedMedication?.dose || '')
    .split('/')
    .map(v => v.trim())
    .filter(Boolean)
  const selectedOrderModality = ORDER_MODALITIES.find(m => m.id === orderModality) || null
  const bodyPartOptions = ORDER_BODY_PARTS[orderModality] || []
  const readOnlyPatient = !canManagePatientActions
  const selectedStationBuilt = selectedOrderModality
    ? (hospital?.rooms || []).some(r => r.id === selectedOrderModality.station)
    : false
  const selectedEquipmentOwned = selectedOrderModality
    ? (() => {
      const req = Array.isArray(selectedOrderModality.requiredEquipment)
        ? selectedOrderModality.requiredEquipment
        : [selectedOrderModality.requiredEquipment].filter(Boolean)
      const owned = ((hospital?.stationEquipment || {})[selectedOrderModality.station] || [])
      return req.length === 0 || req.some(eqId => owned.includes(eqId))
    })()
    : false
  const canCreateSelectedOrder = !!selectedOrderModality
  const activeProcedureOrder = orders.find(o => o.id === activeProcedureOrderId) || null
  const activeWorkflowSteps = getOrderWorkflowSteps(activeProcedureOrder?.modality)
  const activeWorkflowConfig = getDiagnosticWorkflowConfig(activeProcedureOrder?.modality)
  const latestLabEntry = labHistory.length > 0 ? labHistory[labHistory.length - 1] : null
  const latestEkgOrder = [...orders].reverse().find(o => o.status === 'completed' && ['ekg', 'langzeit_ekg'].includes(String(o.modality || '').toLowerCase()))

  const getHintOffersForTab = (tabId) => {
    const trueDx = patient?.trueDiagnoses?.primary || null
    const firstOpenCritical = dischargeRequirements?.items?.find(item => item.critical && !item.done) || null
    const firstOpenAny = dischargeRequirements?.items?.find(item => !item.done) || null
    const therapyOpen = dischargeRequirements?.therapyProgress?.milestones?.find(m => !m.done) || null

    if (tabId === 'overview') {
      return [
        {
          id: 'ov_next_step',
          cost: 220,
          title: 'Nächster sinnvoller Schritt',
          text: firstOpenCritical
            ? `Priorität: ${firstOpenCritical.title}. ${firstOpenCritical.detail}`
            : (firstOpenAny ? `${firstOpenAny.title}: ${firstOpenAny.detail}` : 'Entlass-Checkliste ist aktuell gut erfüllt.'),
        },
      ]
    }

    if (tabId === 'diagnosis') {
      return [
        trueDx
          ? {
            id: 'dx_primary_reveal',
            cost: 420,
            title: 'Hauptdiagnose aufdecken',
            text: `Verdeckte Hauptdiagnose: ${trueDx.code} - ${trueDx.name}`,
          }
          : {
            id: 'dx_direction',
            cost: 260,
            title: 'Diagnostische Richtung',
            text: `Leitsymptom spricht am ehesten für: ${String(patient?.chiefComplaint || 'unklar')} — prüfe passende ICD-10 Gruppen und klinische Korrelation.`,
          },
      ]
    }

    if (tabId === 'lab') {
      const abnormalNames = latestLabEntry
        ? Object.entries(latestLabEntry.results || {})
          .filter(([paramId, r]) => isAbnormal(paramId, r?.value))
          .map(([paramId]) => LAB_PARAMETERS.find(p => p.id === paramId)?.name || paramId)
        : []
      return [
        {
          id: 'lab_pattern',
          cost: 280,
          title: 'Labor-Muster interpretieren',
          text: abnormalNames.length > 0
            ? `Auffällig sind vor allem: ${abnormalNames.slice(0, 6).join(', ')}. Diese Konstellation mit Klinikbild zusammenführen.`
            : 'Aktuell kein klares pathologisches Muster sichtbar oder Befunde noch ausstehend.',
        },
      ]
    }

    if (tabId === 'orders') {
      return [
        {
          id: 'ord_ekg_reveal',
          cost: 360,
          title: 'EKG-Befundhinweis',
          text: latestEkgOrder?.result?.text
            ? `EKG-Hinweis: ${latestEkgOrder.result.text}`
            : 'Es liegt noch kein abgeschlossener EKG-Befund vor.',
        },
      ]
    }

    if (tabId === 'medications') {
      return [
        {
          id: 'med_core',
          cost: 240,
          title: 'Therapie-Hinweis Medikation',
          text: 'Nutze syndromorientiert: Schmerzen -> Analgesie, Atemnot -> O2/Bronchodilatation, Infektzeichen -> zeitnahe Antiinfektiva nach Diagnostik.',
        },
      ]
    }

    return []
  }

  const purchaseHint = (offer) => {
    if (!offer?.id) return
    if (purchasedTips[offer.id]) return
    const balance = Number(user?.wallet || 0)
    const cost = getHintCost(Number(offer.cost || 0), user)
    if (balance < cost) {
      setTipMessage({ type: 'error', text: `Nicht genug Guthaben für diesen Tipp (${cost}€).` })
      setTimeout(() => setTipMessage(null), 2400)
      return
    }
    addMoney(-cost)
    setPurchasedTips(prev => ({ ...prev, [offer.id]: true }))
    setTipMessage({ type: 'success', text: `Tipp freigeschaltet (-${cost}€).` })
    setTimeout(() => setTipMessage(null), 2200)
  }

  const renderHintPanel = (tabId) => {
    const offers = getHintOffersForTab(tabId)
    if (!offers.length) return null
    return (
      <div className="card p-2.5 mb-3 border-surface-200 bg-surface-50/60">
        {tipMessage && (
          <div className={`mb-2 rounded-lg border px-2.5 py-1.5 text-xs ${tipMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {tipMessage.text}
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3 text-surface-500" /> Optionaler Hinweis
          </p>
          <span className="text-[11px] text-surface-500">Wallet: {(user?.wallet || 0).toLocaleString('de-DE')}€</span>
        </div>
        <div className="space-y-2">
          {offers.map(offer => {
            const unlocked = !!purchasedTips[offer.id]
            const effectiveCost = getHintCost(Number(offer.cost || 0), user)
            return (
              <div key={offer.id} className="rounded-lg border border-surface-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-surface-800">{offer.title}</p>
                  {!unlocked && (
                    <button onClick={() => purchaseHint(offer)} className="text-[11px] px-2 py-1 rounded bg-surface-700 text-white hover:bg-surface-800 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {effectiveCost}€
                    </button>
                  )}
                </div>
                <p className={`text-xs mt-1 ${unlocked ? 'text-emerald-700' : 'text-surface-500'}`}>
                  {unlocked ? offer.text : 'Gesperrt - Tipp gegen Ingame-Geld freischalten'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  useEffect(() => {
    setActiveTab(initialTab || 'overview')
  }, [initialTab, patient?.id])

  useEffect(() => {
    if (!lockedToTab) return
    if (activeTab !== lockedToTab) setActiveTab(lockedToTab)
  }, [lockedToTab, activeTab])

  useEffect(() => {
    setDiagQuery('')
  }, [patient?.id])

  useEffect(() => {
    setPurchasedTips({})
    setTipMessage(null)
  }, [patient?.id])

  useEffect(() => {
    if (!readOnlyPatient) return
    if (activeTab !== 'overview' && activeTab !== 'diagnosis') setActiveTab('overview')
  }, [readOnlyPatient, activeTab])

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!artifactGame.running) return
    const tick = setInterval(() => {
      setArtifactGame(prev => {
        if (!prev.running) return prev
        const nextRemaining = prev.remainingMs - 100
        const mode = prev.mode || 'track_x'
        const nextTargetX = clamp01(0.5 + Math.sin(Date.now() / Math.max(180, prev.periodMs || 420)) * (prev.amplitude || 0.33))
        const nextTargetY = clamp01(0.5 + Math.cos(Date.now() / Math.max(180, prev.periodMs || 420)) * (prev.amplitude || 0.33))
        const error = mode === 'track_y'
          ? Math.abs((prev.cursorY ?? 0.5) - nextTargetY)
          : mode === 'track_x'
            ? Math.abs((prev.cursorX ?? 0.5) - nextTargetX)
            : 0
        const accum = prev.accumError + error
        const samples = prev.samples + 1
        const pulsePos = mode === 'rhythm_tap'
          ? ((prev.pulsePos || 0) + (prev.pulseStep || 0.09)) % 1
          : (prev.pulsePos || 0)
        if (nextRemaining <= 0) {
          const score = mode === 'rhythm_tap'
            ? (() => {
              const attempts = prev.attempts || 0
              if (attempts <= 0) return 0
              const precision = clamp01((prev.hitCount || 0) / attempts)
              const activityBonus = attempts >= 4 ? 1 : attempts / 4
              return Math.round(clamp01(precision * activityBonus) * 100)
            })()
            : (() => {
              const avgError = samples > 0 ? (accum / samples) : 1
              return Math.round(clamp01(1 - avgError) * 100)
            })()
          const quality = qualityFromScore(score)
          return {
            ...prev,
            running: false,
            remainingMs: 0,
            targetX: nextTargetX,
            targetY: nextTargetY,
            pulsePos,
            accumError: accum,
            samples,
            score,
            quality,
          }
        }
        return {
          ...prev,
          remainingMs: nextRemaining,
          targetX: nextTargetX,
          targetY: nextTargetY,
          pulsePos,
          accumError: accum,
          samples,
        }
      })
    }, 100)
    return () => clearInterval(tick)
  }, [artifactGame.running])

  useEffect(() => {
    if (!artifactGame.quality) return
    setProcedureConfig(prev => ({ ...prev, quality: artifactGame.quality }))
  }, [artifactGame.quality])

  const baseLabCost = useMemo(() =>
    selectedLabParams.reduce((sum, paramId) => {
      const p = LAB_PARAMETERS.find(lp => lp.id === paramId)
      return sum + (p?.cost || DEFAULT_PARAM_COST)
    }, 0),
    [selectedLabParams]
  )
  const totalLabCost = useMemo(() => getLabOrderCost(baseLabCost, user), [baseLabCost, user])

  const toggleLabParam = (paramId) => {
    setSelectedLabParams(prev =>
      prev.includes(paramId) ? prev.filter(id => id !== paramId) : [...prev, paramId]
    )
  }

  const toggleCategoryQuickSelect = (catId) => {
    const categoryParamIds = LAB_PARAMETERS.filter(p => p.category === catId).map(p => p.id)
    if (categoryParamIds.length === 0) return
    setSelectedLabParams(prev => {
      const allSelected = categoryParamIds.every(id => prev.includes(id))
      if (allSelected) return prev.filter(id => !categoryParamIds.includes(id))
      return [...new Set([...prev, ...categoryParamIds])]
    })
  }

  const selectAllLab = () => setSelectedLabParams(LAB_PARAMETERS.map(p => p.id))
  const clearLabSelection = () => setSelectedLabParams([])

  const handleOrderLab = () => {
    if (selectedLabParams.length === 0 || labOrdering) return
    setLabOrdering(true)
    setTimeout(() => {
      const orderedAt = new Date().toISOString()
      const results = {}
      const selectedCategories = new Set()
      LAB_PARAMETERS.forEach(p => {
        if (selectedLabParams.includes(p.id)) {
          results[p.id] = {
            value: p.genFn(),
            time: orderedAt,
            readyAt: getLabReadyAtAdjusted(getLabReadyAtIso(p.id, orderedAt), user),
          }
          selectedCategories.add(p.category)
        }
      })
      const orderResult = onOrderLab?.(
        patient.id,
        results,
        baseLabCost,
        [...selectedCategories],
        selectedLabParams,
        labOrderMeta || undefined,
      )
      if (orderResult?.success === false) {
        setLabMessage({ type: 'error', text: orderResult.message || 'Labor konnte nicht beauftragt werden.' })
      } else {
        setLabMessage({ type: 'success', text: 'Labor beauftragt.' })
      }
      setLabOrdering(false)
      setSelectedLabParams([])
      setTimeout(() => setLabMessage(null), 2500)
    }, 2500)
  }

  const updateDiagnoses = (next) => {
    onAssignDiagnoses?.(patient.id, next)
  }

  const setPrimaryDiagnosis = (dx) => {
    updateDiagnoses({
      ...diagnoses,
      primary: dx,
    })
  }

  const addSecondaryDiagnosis = (dx) => {
    if (diagnoses.secondary.some(d => d.code === dx.code)) return
    updateDiagnoses({
      ...diagnoses,
      secondary: [...diagnoses.secondary, dx],
    })
  }

  const addChronicDiagnosis = (dx) => {
    if (diagnoses.chronic.some(d => d.code === dx.code)) return
    updateDiagnoses({
      ...diagnoses,
      chronic: [...diagnoses.chronic, dx],
    })
  }

  const removeDiagnosis = (bucket, code) => {
    if (bucket === 'primary') {
      updateDiagnoses({ ...diagnoses, primary: null })
      return
    }
    updateDiagnoses({
      ...diagnoses,
      [bucket]: diagnoses[bucket].filter(d => d.code !== code),
    })
  }

  const addNote = () => {
    const text = newNote.trim()
    if (!text) return
    onAddPatientNote?.(patient.id, text)
    setNewNote('')
  }

  const addStructuredLogEntry = () => {
    const text = newLogText.trim()
    if (!text) return
    onAddPatientLogEntry?.(patient.id, newLogType, text)
    setNewLogText('')
  }

  const createOrder = () => {
    if (!orderModality) return
    const res = onCreateOrder?.(patient.id, { modality: orderModality, bodyPart: orderBodyPart || '', notes: orderNote.trim() })
    if (res?.success === false) {
      setOrderMessage({ type: 'error', text: res.message || 'Anordnung konnte nicht erstellt werden.' })
      return
    }
    setOrderMessage({ type: 'success', text: 'Anordnung erstellt.' })
    setOrderNote('')
    if (bodyPartOptions.length > 0) setOrderBodyPart(bodyPartOptions[0] || '')
    setTimeout(() => setOrderMessage(null), 2200)
  }

  const triggerOrderAction = (order, action) => {
    if (!order?.id) return
    if (action === 'begin_procedure') {
      setActiveProcedureOrderId(order.id)
      setProcedureStep(0)
      setProcedureConfig({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] })
      setArtifactGame(buildArtifactGameState(order.modality, false))
      return true
    }
    const res = onUpdateOrderStatus?.(patient.id, order.id, action)
    if (res?.success === false) {
      setOrderMessage({ type: 'error', text: res.message || 'Aktion nicht möglich.' })
      return false
    }
    setOrderMessage(null)
    return true
  }

  useEffect(() => {
    const options = ORDER_BODY_PARTS[orderModality] || []
    if (options.length === 0) {
      if (orderBodyPart) setOrderBodyPart('')
      return
    }
    if (!options.includes(orderBodyPart)) {
      setOrderBodyPart(options[0])
    }
  }, [orderModality, orderBodyPart])

  const completeProcedureOrder = (order) => {
    const image = buildDiagnosticPlaceholderImage(order?.modality, order?.title)
    const resultText = 'Bild-/Signalbefund erhoben. Bitte Diagnoseabgleich und Therapieplan dokumentieren.'
    const res = onUpdateOrderStatus?.(patient.id, order.id, 'complete', {
      result: {
        text: resultText,
        stepCount: procedureStep + 1,
        workflow: {
          protocol: procedureConfig.protocol || null,
          quality: procedureConfig.quality || null,
          positioningDone: !!procedureConfig.positioningDone,
        },
        findings: procedureConfig.findings || [],
        interventions: procedureConfig.interventions || [],
        image,
        interpretationRequired: true,
      },
    })
    if (res?.success === false) {
      setOrderMessage({ type: 'error', text: res.message || 'Abschluss nicht möglich.' })
      return
    }
    setActiveProcedureOrderId(null)
    setProcedureStep(0)
    setProcedureConfig({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] })
  }

  const addMedicationPlanEntry = () => {
    if (!hasNurse) return
    if (!medPlanForm.medId) return
    const med = MEDICATIONS.find(m => m.id === medPlanForm.medId)
    if (!med) return
    const nowIso = new Date().toISOString()
    const intervalHours = Math.max(1, Number(medPlanForm.intervalHours || 8))
    const entry = {
      id: 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      medId: med.id,
      medName: med.name,
      dose: `${Math.max(1, Number(medPlanForm.doseMultiplier || 1))}x ${medPlanForm.dose?.trim() || med.dose || 'Standarddosis'}`,
      route: medPlanForm.route || med.form || 'i.v.',
      intervalHours,
      startAt: nowIso,
      nextDueAt: nowIso,
      lastGivenAt: null,
      active: true,
      administrations: 0,
    }
    onUpdateMedicationPlan?.(patient.id, [...medicationPlan, entry])
    setMedPlanForm({
      medId: '',
      dose: '',
      doseMultiplier: 1,
      route: 'i.v.',
      intervalHours: '',
    })
  }

  const removeMedicationPlanEntry = (entryId) => {
    onUpdateMedicationPlan?.(patient.id, medicationPlan.filter(e => e.id !== entryId))
  }

  const toggleMedicationPlanEntry = (entryId) => {
    onUpdateMedicationPlan?.(patient.id, medicationPlan.map(entry => entry.id === entryId ? { ...entry, active: !entry.active } : entry))
  }

  const startEditMedicationPlanEntry = (entry) => {
    setEditingPlanId(entry.id)
    setEditPlanForm({
      dose: entry.dose || '',
      route: entry.route || 'i.v.',
      intervalHours: entry.intervalHours || '',
    })
  }

  const saveMedicationPlanEntry = (entryId) => {
    const next = medicationPlan.map(entry => {
      if (entry.id !== entryId) return entry
      return {
        ...entry,
        dose: editPlanForm.dose?.trim() || entry.dose,
        route: editPlanForm.route || entry.route,
        intervalHours: Math.max(1, Number(editPlanForm.intervalHours || entry.intervalHours || 8)),
      }
    })
    onUpdateMedicationPlan?.(patient.id, next)
    setEditingPlanId(null)
  }

  const toggleProcedureListItem = (key, id) => {
    setProcedureConfig(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : []
      const exists = current.includes(id)
      return {
        ...prev,
        [key]: exists ? current.filter(v => v !== id) : [...current, id],
      }
    })
  }

  const resetArtifactGame = (modalityId = activeProcedureOrder?.modality) => {
    setArtifactGame(buildArtifactGameState(modalityId, false))
    setProcedureConfig(prev => ({ ...prev, quality: '' }))
  }

  const startArtifactGame = (modalityId = activeProcedureOrder?.modality) => {
    setProcedureConfig(prev => ({ ...prev, quality: '' }))
    setArtifactGame(buildArtifactGameState(modalityId, true))
  }

  const markRhythmHit = () => {
    setArtifactGame(prev => {
      if (!prev.running || prev.mode !== 'rhythm_tap') return prev
      const inWindow = Math.abs((prev.pulsePos || 0) - 0.5) <= (prev.tapWindow || 0.1)
      return {
        ...prev,
        attempts: (prev.attempts || 0) + 1,
        hitCount: (prev.hitCount || 0) + (inWindow ? 1 : 0),
      }
    })
  }

  const LOG_TYPE_META = {
    visit: { label: 'Visite', cls: 'bg-indigo-100 text-indigo-700' },
    procedure: { label: 'Prozedur', cls: 'bg-amber-100 text-amber-700' },
    handover: { label: 'Übergabe', cls: 'bg-cyan-100 text-cyan-700' },
    order: { label: 'Anordnung', cls: 'bg-emerald-100 text-emerald-700' },
    note: { label: 'Notiz', cls: 'bg-surface-100 text-surface-700' },
    triage: { label: 'Triage', cls: 'bg-rose-100 text-rose-700' },
    lab: { label: 'Labor', cls: 'bg-purple-100 text-purple-700' },
    transfer: { label: 'Verlegung', cls: 'bg-blue-100 text-blue-700' },
    medication: { label: 'Medikation', cls: 'bg-red-100 text-red-700' },
    diagnosis: { label: 'Diagnose', cls: 'bg-lime-100 text-lime-700' },
    action: { label: 'Aktion', cls: 'bg-slate-100 text-slate-700' },
  }
  const ORDER_STATION_LABELS = {
    radiology: 'Radiologie',
    cardiology: 'Kardiologie',
    pneumology: 'Pneumologie',
    neurology: 'Neurologie',
    lab: 'Labor',
  }
  const getWorkflowTitle = (modality) => {
    const mod = ORDER_MODALITIES.find(m => m.id === modality)
    return `${mod?.name || 'Untersuchung'}-Workflow`
  }
  const getWorkflowTheme = (modality) => {
    const map = {
      xray: { shell: 'from-indigo-900 via-blue-900 to-cyan-800', border: 'border-indigo-300', chip: 'text-cyan-100' },
      ct: { shell: 'from-slate-900 via-slate-800 to-sky-900', border: 'border-sky-300', chip: 'text-sky-100' },
      mri: { shell: 'from-violet-900 via-indigo-900 to-slate-900', border: 'border-violet-300', chip: 'text-violet-100' },
      hkl: { shell: 'from-teal-900 via-cyan-900 to-slate-900', border: 'border-teal-300', chip: 'text-teal-100' },
      ekg: { shell: 'from-emerald-900 via-teal-900 to-slate-900', border: 'border-emerald-300', chip: 'text-emerald-100' },
      langzeit_ekg: { shell: 'from-emerald-900 via-cyan-900 to-slate-900', border: 'border-cyan-300', chip: 'text-cyan-100' },
      langzeit_rr: { shell: 'from-rose-900 via-pink-900 to-slate-900', border: 'border-rose-300', chip: 'text-rose-100' },
      spiro: { shell: 'from-sky-900 via-cyan-900 to-teal-900', border: 'border-sky-300', chip: 'text-sky-100' },
      eeg: { shell: 'from-purple-900 via-indigo-900 to-slate-900', border: 'border-purple-300', chip: 'text-purple-100' },
      echo: { shell: 'from-blue-900 via-indigo-900 to-slate-900', border: 'border-blue-300', chip: 'text-blue-100' },
    }
    return map[modality] || map.ct
  }
  const resolveWorkflowItemLabel = (modality, type, id) => {
    const cfg = getDiagnosticWorkflowConfig(modality)
    const list = type === 'interventions' ? (cfg.interventions || []) : (cfg.findings || [])
    return list.find(item => item.id === id)?.label || id
  }

  const documentColorClass = (color) => {
    const map = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      violet: 'bg-violet-50 border-violet-200 text-violet-700',
      teal: 'bg-teal-50 border-teal-200 text-teal-700',
      slate: 'bg-slate-50 border-slate-200 text-slate-700',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
    }
    return map[color] || 'bg-surface-50 border-surface-200 text-surface-700'
  }

  const patientDocuments = Array.isArray(patient?.documents) ? patient.documents : []
  const orderById = new Map((orders || []).map((o) => [o.id, o]))
  const mergePtcaImageIfNeeded = (imageField, ptcaCaptures) => {
    const caps = Array.isArray(ptcaCaptures) ? ptcaCaptures : []
    const last = caps.length ? caps[caps.length - 1] : null
    if (!last?.dataUrl) return imageField || null
    const src = imageField?.src ? String(imageField.src) : ''
    const brokeHklPlaceholder = /^\/imaging\/hkl\//i.test(src)
    if (brokeHklPlaceholder || !src) {
      return imageField
        ? { ...imageField, src: last.dataUrl, alt: 'PTCA-Aufnahme', caption: last.label || imageField.caption }
        : { src: last.dataUrl, alt: 'PTCA-Aufnahme', caption: last.label || 'HKL PTCA' }
    }
    return imageField || null
  }
  const manualDocumentTemplates = DOCUMENT_TEMPLATES.filter(t => !['ekg_befund', 'triageprotokoll', 'rtw_protokoll', 'surgical_bericht'].includes(t.id))
  const triageNotes = (patient?.notes || [])
    .filter(n => n?.type === 'triage')
    .map(n => n?.text)
    .filter(Boolean)
  const triageExamSnippets = (patient?.examResults || [])
    .filter(r => r?.source === 'triage')
    .map(r => r?.summary || r?.title)
    .filter(Boolean)
  const resolveBloodPressureText = () => {
    const candidateBps = [
      patient?.vitals?.bp,
      ...(patient?.vitalsHistory || []).map(v => v?.bp),
    ]
    for (const bp of candidateBps) {
      const raw = String(bp || '').trim()
      if (!raw.includes('/')) continue
      const [sysRaw, diaRaw] = raw.split('/')
      const sys = Number.parseInt(sysRaw, 10)
      const dia = Number.parseInt(diaRaw, 10)
      if (Number.isFinite(sys) && Number.isFinite(dia) && sys > 0 && dia > 0) return `${sys}/${dia}`
    }
    const candidatePairs = [
      [patient?.vitals?.sbp, patient?.vitals?.dbp],
      ...(patient?.vitalsHistory || []).map(v => [v?.sbp, v?.dbp]),
    ]
    for (const [sysRaw, diaRaw] of candidatePairs) {
      const sys = Number(sysRaw)
      const dia = Number(diaRaw)
      if (Number.isFinite(sys) && Number.isFinite(dia) && sys > 0 && dia > 0) return `${Math.round(sys)}/${Math.round(dia)}`
    }
    return '--/--'
  }
  const bpText = resolveBloodPressureText()
  const rtwFrom = patient?.arrivalTime ? new Date(patient.arrivalTime) : null
  const rtwTo = patient?.triagedAt ? new Date(patient.triagedAt) : null
  const triageCode = String(patient?.triageLevel || 'unbekannt').toUpperCase()
  const preInfoText = String(patient?.preInfo || '').trim()
  const symptomList = Array.isArray(patient?.symptoms) ? patient.symptoms.filter(Boolean) : []
  const symptomText = symptomList.length > 0 ? symptomList.slice(0, 4).join(', ') : 'keine verlässliche Symptomliste übermittelt'
  const neuroText = (patient?.examResults || [])
    .filter(r => /neurolog|pupille|gcs|bewusst/i.test(String(r?.label || '') + ' ' + String(r?.result || '')))
    .slice(0, 2)
    .map(r => `${r.label}: ${r.result}`)
    .join('; ')
  const vitalsText = `RR ${bpText} mmHg, HF ${patient?.vitals?.hr || '--'}/min, AF ${patient?.vitals?.rr || '--'}/min, SpO2 ${patient?.vitals?.spo2 || '--'}%${patient?.vitals?.temp ? `, Temp ${patient.vitals.temp} °C` : ''}`
  const rtwTimeText = rtwFrom
    ? `${rtwFrom.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${rtwTo ? ` -> ${rtwTo.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : 'Nicht dokumentiert'
  const triageAutoDoc = patient?.arrivalType !== 'ambulance' && patient?.triaged ? [{
    id: `auto_triage_${patient.id}`,
    type: 'triageprotokoll',
    templateId: 'triageprotokoll',
    title: 'Triageprotokoll (auto)',
    fields: {
      aufnahmeart: 'Fußpatient',
      triagestufe: patient?.triageLevel || 'Nicht dokumentiert',
      hauptbeschwerde: patient?.chiefComplaint || '',
      schmerzscore: Number.isFinite(patient?.painLevel) ? `${patient.painLevel}/10` : 'Nicht erhoben',
      vitalstatus: `RR ${bpText} mmHg, HF ${patient?.vitals?.hr || 0}/min, AF ${patient?.vitals?.rr || 0}/min, SpO2 ${patient?.vitals?.spo2 || 0}%`,
      triage_notiz: triageNotes.join('\n') || 'Keine zusätzliche Triage-Notiz.',
      triage_befunde: triageExamSnippets.join('\n') || 'Keine zusätzlichen Triage-Befunde.',
    },
    createdAt: patient?.triagedAt || patient?.arrivalTime,
    updatedAt: patient?.triagedAt || patient?.arrivalTime,
    createdBy: 'System',
    readonly: true,
    color: 'indigo',
  }] : []
  const rtwAutoDoc = patient?.arrivalType === 'ambulance' ? [{
    id: `auto_rtw_${patient.id}`,
    type: 'rtw_protokoll',
    templateId: 'rtw_protokoll',
    title: 'RTW-Protokoll (auto)',
    fields: {
      rettungsmittel: patient?.arrivalType === 'ambulance' ? 'RTW/NEF' : '—',
      einsatznummer: patient?.arrivalMeta?.dispatch || 'RTW Voranmeldung',
      einsatzzeit: rtwTimeText,
      einsatzort: patient?.arrivalMeta?.location || 'Einsatzort nicht übermittelt',
      einsatzmeldung: [
        `Leitstelle: ${patient?.arrivalMeta?.dispatch || 'RTW Voranmeldung'}${patient?.arrivalMeta?.priority ? ` (Priorität ${patient.arrivalMeta.priority})` : ''}.`,
        `Alarmgrund: ${patient?.chiefComplaint || 'akutes internistisches/chirurgisches Ereignis'}.`,
        `Einsatzort: ${patient?.arrivalMeta?.location || 'nicht übermittelt'}.`,
        `Anfahrt/Besonderheiten: ${patient?.arrivalMeta?.scene || 'keine besonderen Gefahren an Einsatzstelle gemeldet'}.`,
      ].join('\n'),
      erstbefund: [
        `Zustand bei Eintreffen: ${patient?.arrivalMeta?.status || 'wach und ansprechbar'}.`,
        `Leitsymptome präklinisch: ${symptomText}.`,
        `Schmerzangabe: ${Number.isFinite(patient?.painLevel) ? `${patient.painLevel}/10` : 'nicht sicher erhebbar'}.`,
        `Neurologischer Kurzstatus: ${neuroText || 'keine fokal-neurologischen Auffälligkeiten sicher dokumentiert'}.`,
      ].join('\n'),
      anamnese: [
        `SAMPLER/Anamnese: ${preInfoText || 'präklinisch nur eingeschränkt erhebbar; Fokus auf Leitsymptom und Vitalstabilisierung.'}`,
        patient?.chatData?.allergies ? `Allergien: ${patient.chatData.allergies}.` : 'Allergien: keine verlässlichen Angaben.',
        patient?.chatData?.medications ? `Dauermedikation: ${patient.chatData.medications}.` : 'Dauermedikation: nicht sicher bekannt.',
        patient?.chatData?.pastHistory ? `Vorerkrankungen: ${patient.chatData.pastHistory}.` : 'Relevante Vorerkrankungen: nicht sicher bekannt.',
      ].join('\n'),
      vitalstatus: [
        `Erstwerte am Einsatzort: ${vitalsText}.`,
        `Transportverlauf: wiederholte Kontrollen ohne abrupte Entgleisung dokumentiert.`,
        `Triage bei Übergabe: ${triageCode}.`,
      ].join('\n'),
      monitoring: [
        'Monitoring durchgeführt: EKG-Monitoring, pulsoxymetrische Überwachung und wiederholte RR-Kontrollen.',
        `Klinischer Gesamteindruck im Verlauf: ${patient?.clinicalState?.stability || 'stabil'}${patient?.clinicalState?.consciousness ? `, Bewusstsein: ${patient.clinicalState.consciousness}` : ''}.`,
        'Reevaluation unmittelbar vor Schockraum-/ZNA-Übergabe erfolgt.',
      ].join('\n'),
      massnahmen: [
        patient?.arrivalMeta?.note || 'Präklinisch symptomorientierte Maßnahmen gemäß Standardalgorithmus umgesetzt.',
        'Zusätzlich: patientenschonende Lagerung, venöser Zugang, engmaschige Überwachung und fortlaufende Reassessment-Schleifen.',
      ].join('\n'),
      medikation: [
        patient?.arrivalMeta?.medication || 'Keine gesicherte präklinische Medikamentendokumentation übermittelt.',
        'Medikationswirkung und Verträglichkeit wurden bis zur Übergabe klinisch mitbeobachtet.',
      ].join('\n'),
      uebergabe: [
        'Übergabe strukturiert nach SBAR/ABCDE an das aufnehmende Team der ZNA.',
        'Übergeben wurden Einsatzmeldung, zeitlicher Verlauf, Anamnese/SAMPLER, komplette Vitalparameter inklusive Trends sowie alle präklinischen Maßnahmen und Medikation.',
        'Offene Punkte und Prioritäten (Diagnostik/Therapie) wurden ausdrücklich benannt.',
      ].join('\n'),
    },
    createdAt: patient?.arrivalTime,
    updatedAt: patient?.arrivalTime,
    createdBy: 'System',
    readonly: true,
    color: 'emerald',
  }] : []
  const autoDocuments = [
    ...triageAutoDoc,
    ...rtwAutoDoc,
  ]
  const orderDocuments = (orders || [])
    .filter(o => !!o?.result && (o?.status === 'completed' || o?.status === 'in_progress'))
    .map((o) => ({
      id: `auto_order_${o.id}`,
      type: 'befundbericht',
      templateId: 'befundbericht',
      title: `${o.title || 'Diagnostik'} Befund (auto)`,
      orderId: o.id,
      fields: {
        befund: o?.result?.report || o?.result?.text || '',
        beurteilung: o?.result?.impression || o?.result?.assessment || '',
        diagnose: o?.result?.diagnosis || '',
        signature: o?.result?.signature || '',
        ...(Array.isArray(o?.result?.ptca?.captures) && o.result.ptca.captures.length > 0
          ? {
            ptcaCaptures: o.result.ptca.captures,
            ptcaLog: o.result.ptca.sessionLog || [],
          }
          : {}),
      },
      content: [
        o?.result?.report || o?.result?.text ? `Befund: ${o?.result?.report || o?.result?.text}` : '',
        o?.result?.impression || o?.result?.assessment ? `Beurteilung: ${o?.result?.impression || o?.result?.assessment}` : '',
        o?.result?.diagnosis ? `Diagnose: ${o.result.diagnosis}` : '',
        o?.result?.signature ? `Signatur: ${o.result.signature}` : '',
      ].filter(Boolean).join('\n\n'),
      image: mergePtcaImageIfNeeded(o?.result?.image || null, o?.result?.ptca?.captures),
      createdAt: o?.completedAt || o?.result?.updatedAt || o?.startedAt || o?.createdAt,
      updatedAt: o?.result?.updatedAt || o?.completedAt || o?.startedAt || o?.createdAt,
      createdBy: o?.assignedTo || o?.createdBy || 'System',
      readonly: true,
      color: 'emerald',
    }))
  const hydratedPatientDocuments = patientDocuments.map((doc) => {
    if (!doc) return doc
    const directOrderId = doc?.orderId || doc?.fields?.orderId || null
    const linkedOrder = directOrderId ? orderById.get(directOrderId) : null
    const fallbackOrder = linkedOrder || (orders || []).find((o) => {
      if (!o?.result) return false
      const orderTitle = String(o?.title || '').trim()
      if (!orderTitle) return false
      return String(doc?.title || '').includes(orderTitle)
    })
    if (!fallbackOrder?.result) return doc
    const mergedFields = { ...(doc.fields || {}) }
    if (!String(mergedFields.befund || '').trim()) mergedFields.befund = fallbackOrder.result.report || fallbackOrder.result.text || ''
    if (!String(mergedFields.beurteilung || '').trim()) mergedFields.beurteilung = fallbackOrder.result.impression || fallbackOrder.result.assessment || ''
    if (!String(mergedFields.diagnose || '').trim()) mergedFields.diagnose = fallbackOrder.result.diagnosis || ''
    if (!String(mergedFields.signature || '').trim()) mergedFields.signature = fallbackOrder.result.signature || ''
    if ((!Array.isArray(mergedFields.ptcaCaptures) || mergedFields.ptcaCaptures.length === 0) && Array.isArray(fallbackOrder.result?.ptca?.captures) && fallbackOrder.result.ptca.captures.length > 0) {
      mergedFields.ptcaCaptures = fallbackOrder.result.ptca.captures
      mergedFields.ptcaLog = fallbackOrder.result.ptca.sessionLog || mergedFields.ptcaLog || []
    }
    const fallbackContent = [
      fallbackOrder.result.report || fallbackOrder.result.text ? `Befund: ${fallbackOrder.result.report || fallbackOrder.result.text}` : '',
      fallbackOrder.result.impression || fallbackOrder.result.assessment ? `Beurteilung: ${fallbackOrder.result.impression || fallbackOrder.result.assessment}` : '',
      fallbackOrder.result.diagnosis ? `Diagnose: ${fallbackOrder.result.diagnosis}` : '',
      fallbackOrder.result.signature ? `Signatur: ${fallbackOrder.result.signature}` : '',
    ].filter(Boolean).join('\n\n')
    const baseImg = doc?.image?.src ? doc.image : (fallbackOrder.result.image || null)
    return {
      ...doc,
      fields: mergedFields,
      content: String(doc?.content || '').trim() || fallbackContent,
      image: mergePtcaImageIfNeeded(baseImg, mergedFields.ptcaCaptures),
      updatedAt: doc.updatedAt || fallbackOrder.result.updatedAt || fallbackOrder.completedAt || doc.createdAt,
    }
  })
  const documentsForView = [...autoDocuments, ...orderDocuments, ...hydratedPatientDocuments]
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))

  const toDocumentDraft = (doc) => {
    if (!doc) return null
    const template = getDocumentTemplate(doc.templateId || doc.type)
    const oid = doc.orderId || doc?.fields?.orderId || null
    const linked = oid ? orderById.get(oid) : null
    const fallback = linked || (orders || []).find((o) => {
      if (!o?.result) return false
      const orderTitle = String(o?.title || '').trim()
      if (!orderTitle) return false
      return String(doc?.title || '').includes(orderTitle)
    })
    let fields = { ...(doc.fields || {}) }
    const orderCaps = fallback?.result?.ptca?.captures
    if ((!Array.isArray(fields.ptcaCaptures) || fields.ptcaCaptures.length === 0) && Array.isArray(orderCaps) && orderCaps.length > 0) {
      fields = {
        ...fields,
        ptcaCaptures: orderCaps,
        ptcaLog: (fields.ptcaLog?.length ? fields.ptcaLog : null) || (fallback.result.ptca.sessionLog || []) || [],
      }
    }
    const image = mergePtcaImageIfNeeded(doc.image || null, fields.ptcaCaptures)
    return {
      id: doc.id,
      title: doc.title || template?.label || 'Dokument',
      templateId: doc.templateId || doc.type || 'aufnahmebogen',
      color: template?.color || doc.color || 'blue',
      fields,
      content: doc.content || '',
      image,
      readonly: !!doc.readonly,
      orderId: doc.orderId || null,
    }
  }

  const openDocumentEditor = (doc) => {
    if (!doc) return
    setDocumentDraft(toDocumentDraft(doc))
    setActiveDocumentId(doc.id)
  }

  useEffect(() => {
    if (activeTab !== 'notes') return
    // Do not auto-select any document when entering the documents tab.
    if (activeDocumentId || documentDraft) {
      setActiveDocumentId(null)
      setDocumentDraft(null)
    }
  }, [activeTab])

  const createDocumentFromTemplate = () => {
    const template = getDocumentTemplate(newDocumentTemplateId)
    if (!template) return
    const fields = Object.fromEntries((template.fields || []).map(f => [f.id, '']))
    setDocumentDraft({
      id: null,
      title: template.label,
      templateId: template.id,
      color: template.color || 'blue',
      fields,
      content: '',
      image: null,
      readonly: false,
    })
    setActiveDocumentId('new')
  }

  const insertTextBlock = (fieldId, block) => {
    setDocumentDraft(prev => {
      if (!prev) return prev
      const cur = String(prev.fields?.[fieldId] || '')
      const next = cur ? `${cur}\n${block}` : block
      return { ...prev, fields: { ...(prev.fields || {}), [fieldId]: next } }
    })
  }

  const textBlockLabel = (block, index) => {
    const cleaned = String(block || '').replace(/\s+/g, ' ').trim()
    const hint = cleaned.split(/[.!?]/)[0]?.trim() || cleaned
    return `Baustein ${index + 1}: ${hint.slice(0, 34)}${hint.length > 34 ? '…' : ''}`
  }

  const profileTextBlocks = Array.isArray(currentUser?.documentTextBlocks)
    ? currentUser.documentTextBlocks.map(item => String(item || '').trim()).filter(Boolean)
    : []

  const getAvailableTextBlocks = () => {
    const tplBlocks = (getDocumentTemplate(documentDraft?.templateId)?.textBlocks || []).map(item => String(item || '').trim()).filter(Boolean)
    return [...new Set([...profileTextBlocks, ...tplBlocks])]
  }

  const primeRxSignatureCanvas = () => {
    const canvas = rxSignatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = Math.max(1, Math.floor(rect.width))
    const cssH = Math.max(1, Math.floor(rect.height))
    if (canvas.width !== cssW || canvas.height !== cssH) {
      canvas.width = cssW
      canvas.height = cssH
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setRxSignatureEmpty(true)
  }

  const beginRxSignature = (e) => {
    const canvas = rxSignatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratioX = canvas.width / Math.max(1, rect.width)
    const ratioY = canvas.height / Math.max(1, rect.height)
    const x = ((e.clientX || (e.touches?.[0]?.clientX || 0)) - rect.left) * ratioX
    const y = ((e.clientY || (e.touches?.[0]?.clientY || 0)) - rect.top) * ratioY
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    rxDrawingRef.current = true
  }

  const drawRxSignature = (e) => {
    if (!rxDrawingRef.current) return
    const canvas = rxSignatureRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratioX = canvas.width / Math.max(1, rect.width)
    const ratioY = canvas.height / Math.max(1, rect.height)
    const x = ((e.clientX || (e.touches?.[0]?.clientX || 0)) - rect.left) * ratioX
    const y = ((e.clientY || (e.touches?.[0]?.clientY || 0)) - rect.top) * ratioY
    const ctx = canvas.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setRxSignatureEmpty(false)
  }

  const endRxSignature = () => {
    rxDrawingRef.current = false
  }

  const clearRxSignature = () => {
    const canvas = rxSignatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setRxSignatureEmpty(true)
  }

  useEffect(() => {
    if (documentDraft?.templateId !== 'rezept' || documentDraft?.readonly) return
    const preset = String(documentDraft?.fields?.signaturePng || '').trim()
    setRxSignatureEmpty(!preset)
    const timer = setTimeout(() => {
      primeRxSignatureCanvas()
      if (preset) {
        const img = new Image()
        img.onload = () => {
          const canvas = rxSignatureRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setRxSignatureEmpty(false)
        }
        img.src = preset
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [documentDraft?.id, documentDraft?.templateId, documentDraft?.readonly])

  const saveDocumentDraft = () => {
    if (!documentDraft || documentDraft.readonly) return
    const template = getDocumentTemplate(documentDraft.templateId)
    const requiredMissing = (template?.fields || [])
      .filter(f => f.required)
      .some(f => !String(documentDraft.fields?.[f.id] || '').trim())
    if (requiredMissing) {
      setOrderMessage({ type: 'error', text: 'Bitte alle Pflichtfelder im Dokument ausfüllen.' })
      return
    }
    if (documentDraft?.templateId === 'rezept' && rxSignatureEmpty) {
      setOrderMessage({ type: 'error', text: 'Bitte Rezept unterschreiben.' })
      return
    }
    const signaturePng = documentDraft?.templateId === 'rezept'
      ? (rxSignatureRef.current?.toDataURL('image/png') || documentDraft?.fields?.signaturePng || '')
      : (documentDraft?.fields?.signaturePng || '')
    const draftId = documentDraft.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8))
    const res = onUpsertDocument?.(patient.id, {
      id: draftId,
      title: documentDraft.title || template?.label || 'Dokument',
      type: documentDraft.templateId,
      templateId: documentDraft.templateId,
      color: documentDraft.color,
      fields: { ...(documentDraft.fields || {}), ...(documentDraft?.templateId === 'rezept' ? { signaturePng } : {}) },
      content: documentDraft.content || '',
      image: documentDraft.image || null,
    })
    if (res?.success === false) {
      setOrderMessage({ type: 'error', text: res.message || 'Dokument konnte nicht gespeichert werden.' })
      return
    }
    setDocumentDraft(prev => prev ? { ...prev, id: draftId, readonly: true } : prev)
    setActiveDocumentId(draftId)
    setOrderMessage({ type: 'success', text: 'Dokument gespeichert.' })
    setTimeout(() => setOrderMessage(null), 1600)
  }

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: FileText },
    { id: 'vitals', label: 'Vitalprotokoll', icon: HeartPulse },
    { id: 'lab', label: 'Labor', icon: FlaskConical, badge: labHistory.length },
    { id: 'exams', label: 'Untersuchungen', icon: Activity, badge: examResults.length },
    { id: 'diagnosis', label: 'Diagnosen', icon: Stethoscope, badge: (diagnoses.primary ? 1 : 0) + diagnoses.secondary.length + diagnoses.chronic.length },
    { id: 'orders', label: 'Anordnungen', icon: FileText, badge: orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length },
    { id: 'log', label: 'Verlauf / Log', icon: MessageCircle, badge: patientLog.length },
    { id: 'medications', label: 'Medikation', icon: Pill },
    { id: 'notes', label: 'Dokumente', icon: Clipboard },
  ]
  const visibleTabs = readOnlyPatient
    ? tabs.filter(t => t.id === 'overview' || t.id === 'diagnosis')
    : tabs
  const constrainedTabs = lockedToTab
    ? visibleTabs.filter((t) => t.id === lockedToTab)
    : visibleTabs

  return (
    <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 55 }}>
      <div className="bg-surface-50 border-b border-surface-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-surface-200 rounded-lg"><X className="w-5 h-5 text-surface-500" /></button>
        <div className="flex-1">
          <h2 className="font-bold text-surface-900">Patientenakte: {patient.name}</h2>
          <p className="text-xs text-surface-500">{patient.age}J, {patient.gender} — {patient.chiefComplaint}</p>
        </div>
        <div className="text-right text-xs text-surface-400">
          <p>Aufnahme: {new Date(patient.arrivalTime).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
          <p>ID: {patient.id?.slice(0, 8)}</p>
        </div>
      </div>

      <div className="flex gap-1 px-6 py-2 bg-white border-b border-surface-200 shrink-0 overflow-x-auto">
        {constrainedTabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-primary-100 text-primary-700' : 'text-surface-500 hover:bg-surface-100'}`}>
              <Icon className="w-4 h-4" />{t.label}
              {t.badge > 0 && <span className="ml-1 text-[10px] bg-primary-200 text-primary-700 px-1.5 py-0.5 rounded-full font-bold">{t.badge}</span>}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {readOnlyPatient && (
          <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nur Akteneinsicht: Für Untersuchungen und Behandlungen musst du zuerst als Haupt-/Nebenbehandler oder Supervisor eingetragen sein.
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {renderHintPanel('overview')}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4"><p className="text-xs text-surface-400">Name</p><p className="font-bold text-surface-900">{patient.name}</p></div>
              <div className="card p-4"><p className="text-xs text-surface-400">Alter / Geschlecht</p><p className="font-bold text-surface-900">{patient.age}J, {patient.gender}</p></div>
              <div className="card p-4"><p className="text-xs text-surface-400">Triage</p><p className="font-bold text-surface-900">{patient.triageLevel || 'Ausstehend'}</p></div>
              <div className="card p-4"><p className="text-xs text-surface-400">Aufnahmeart</p><p className="font-bold text-surface-900">{patient.arrivalType === 'ambulance' ? 'RTW' : 'Zu Fuß'}</p></div>
            </div>
            <div className="card p-4">
              <p className="text-xs text-surface-400 mb-1">Hauptbeschwerde</p>
              <p className="font-medium text-surface-900">{patient.chiefComplaint}</p>
              {patient.preInfo && <p className="text-sm text-surface-600 mt-1 italic">{patient.preInfo}</p>}
            </div>
            {clinicalState && (
              <div className="card p-4">
                <p className="text-xs text-surface-400 mb-2">Aktueller klinischer Zustand</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-surface-50 p-2">
                    <p className="text-[10px] text-surface-400">Stabilität</p>
                    <p className={`text-sm font-bold ${clinicalState.stability === 'kritisch' ? 'text-red-600' : clinicalState.stability === 'instabil' ? 'text-amber-600' : 'text-emerald-600'}`}>{clinicalState.stability}</p>
                  </div>
                  <div className="rounded-lg bg-surface-50 p-2">
                    <p className="text-[10px] text-surface-400">Bewusstsein</p>
                    <p className="text-sm font-bold text-surface-800">{clinicalState.consciousness}</p>
                  </div>
                  <div className="rounded-lg bg-surface-50 p-2">
                    <p className="text-[10px] text-surface-400">Dyspnoe</p>
                    <p className="text-sm font-bold text-surface-800">{Number(clinicalState.dyspnea || 0).toFixed(1)} / 10</p>
                  </div>
                  <div className="rounded-lg bg-surface-50 p-2">
                    <p className="text-[10px] text-surface-400">Beschwerdelast</p>
                    <p className="text-sm font-bold text-surface-800">{Number(clinicalState.complaintLevel || 0).toFixed(1)} / 10</p>
                  </div>
                </div>
              </div>
            )}
            {patient.vitals && (
              <div className="card p-4">
                <p className="text-xs text-surface-400 mb-2">Vitalzeichen bei Aufnahme</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { l: 'HF', v: patient.vitals.hr, u: '/min' },
                    { l: 'RR', v: patient.vitals.bp, u: 'mmHg' },
                    { l: 'AF', v: patient.vitals.rr, u: '/min' },
                    { l: 'Temp', v: patient.vitals.temp, u: '°C' },
                    { l: 'SpO₂', v: patient.vitals.spo2, u: '%' },
                  ].map(v => (
                    <div key={v.l} className="text-center p-2 bg-surface-50 rounded-lg">
                      <p className="text-[10px] text-surface-400">{v.l}</p>
                      <p className="text-lg font-bold text-surface-900">{v.v || '--'}</p>
                      <p className="text-[10px] text-surface-400">{v.u}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {patient.allergies && <div className="card p-4"><p className="text-xs text-surface-400 mb-1">Allergien</p><p className="text-sm text-surface-900">{patient.allergies}</p></div>}
            {patient.medications && <div className="card p-4"><p className="text-xs text-surface-400 mb-1">Dauermedikation</p><p className="text-sm text-surface-900">{patient.medications}</p></div>}
            {Array.isArray(patient.venousAccesses) && patient.venousAccesses.some(access => access?.status === 'active') && (
              <div className="card p-4">
                <p className="text-xs text-surface-400 mb-1">Venöser Zugang</p>
                <div className="space-y-1">
                  {patient.venousAccesses
                    .filter(access => access?.status === 'active')
                    .map(access => (
                      <p key={access.id} className="text-sm text-surface-900">
                        {access.gauge || 'PVK'} • {access.site || 'unbekannte Stelle'}
                        {access.complication ? <span className="text-amber-700"> — {access.complication}</span> : null}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <h3 className="font-bold text-surface-900">Körperliche Untersuchungen</h3>
            {examResults.length === 0 ? (
              <div className="card p-6 text-center">
                <Stethoscope className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-surface-400">Noch keine Untersuchungsbefunde vorhanden</p>
              </div>
            ) : (
              examResults.slice().reverse().map((r, idx) => (
                <div key={idx} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{r.title || 'Untersuchung'}</p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {r.author || 'Arzt'} • {new Date(r.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {r.subtype || 'Befund'}
                    </span>
                  </div>
                  {r.summary && <p className="text-sm text-surface-700 mt-2">{r.summary}</p>}
                  {r.note && <p className="text-xs text-surface-500 mt-1 italic">Notiz: {r.note}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="max-w-4xl mx-auto">
            <h3 className="font-bold text-surface-900 mb-4">Vitalprotokoll</h3>
            {patient.vitals ? (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-surface-50">
                    <th className="text-left p-3 font-medium text-surface-500">Zeit</th>
                    <th className="text-center p-3 font-medium text-surface-500">HF</th>
                    <th className="text-center p-3 font-medium text-surface-500">RR</th>
                    <th className="text-center p-3 font-medium text-surface-500">AF</th>
                    <th className="text-center p-3 font-medium text-surface-500">Temp</th>
                    <th className="text-center p-3 font-medium text-surface-500">SpO₂</th>
                  </tr></thead>
                  <tbody>
                    {(vitalsHistory.length > 0 ? vitalsHistory.slice().reverse() : [{
                      time: patient.arrivalTime,
                      ...patient.vitals,
                    }]).map((entry, idx) => (
                      <tr key={idx} className="border-t border-surface-100">
                        <td className="p-3 font-mono text-surface-600">{new Date(entry.time || patient.arrivalTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 text-center font-mono font-bold">{entry.hr || '--'}</td>
                        <td className="p-3 text-center font-mono font-bold">{entry.bp || '--'}</td>
                        <td className="p-3 text-center font-mono">{entry.rr || '--'}</td>
                        <td className="p-3 text-center font-mono">{entry.temp || '--'}°C</td>
                        <td className="p-3 text-center font-mono">{entry.spo2 || '--'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12"><HeartPulse className="w-12 h-12 text-surface-200 mx-auto mb-3" /><p className="text-surface-400">Noch keine Vitalzeichen erfasst</p></div>
            )}
          </div>
        )}

        {activeTab === 'lab' && (
          <div className="max-w-6xl mx-auto">
            {renderHintPanel('lab')}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-surface-900">Laborergebnisse</h3>
              <p className="text-xs text-surface-400">{labHistory.length} Befund{labHistory.length !== 1 ? 'e' : ''}</p>
            </div>

            {/* Order new lab */}
            <div className="card p-4 mb-6">
              {labMessage && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${labMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {labMessage.text}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-surface-900 text-sm flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-500" /> Labor</h4>
                <div className="flex items-center gap-3">
                  <button onClick={selectAllLab} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Alle auswählen</button>
                  <button onClick={clearLabSelection} className="text-xs text-surface-500 hover:text-surface-700 font-medium">Zurücksetzen</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={handleOrderLab} disabled={selectedLabParams.length === 0 || labOrdering} className="btn-secondary text-sm disabled:opacity-50">
                  {labOrdering ? 'Analysiert...' : 'Anfordern'}
                </button>
                <button onClick={() => onOpenBloodDraw?.(patient, selectedLabParams)} className="btn-primary text-sm">
                  Selbst abnehmen
                </button>
              </div>
              <p className="text-xs text-surface-500 mb-2">Gruppen-Quick-Select (klickt automatisch die Einzelwerte an/ab):</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                {LAB_CATEGORIES.map(cat => {
                  const categoryParams = LAB_PARAMETERS.filter(p => p.category === cat.id)
                  const selectedCount = categoryParams.filter(p => selectedLabParams.includes(p.id)).length
                  const allSelected = categoryParams.length > 0 && selectedCount === categoryParams.length
                  const categoryCost = categoryParams.reduce((sum, p) => sum + (p.cost || DEFAULT_PARAM_COST), 0)
                  return (
                    <button key={cat.id} onClick={() => toggleCategoryQuickSelect(cat.id)}
                      className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                        allSelected ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-surface-300'
                      }`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-surface-800">{cat.name}</span>
                        {allSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                      </div>
                      <p className="text-[10px] text-surface-400">{selectedCount}/{categoryParams.length} Werte — bis {categoryCost}€</p>
                    </button>
                  )
                })}
              </div>
              <div className="rounded-xl border border-surface-200 max-h-[34rem] overflow-y-auto mb-3">
                {LAB_CATEGORIES.map(cat => {
                  const params = LAB_PARAMETERS.filter(p => p.category === cat.id)
                  if (params.length === 0) return null
                  return (
                    <div key={cat.id} className="border-b border-surface-100 last:border-b-0">
                      <div className={`px-3 py-2 text-xs font-semibold ${cat.color}`}>{cat.name}</div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                        {params.map(p => {
                          const checked = selectedLabParams.includes(p.id)
                          return (
                            <label key={p.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200 hover:border-surface-300'}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLabParam(p.id)}
                                className="mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-300"
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-medium text-surface-800">{p.name}</span>
                                <span className="block text-[10px] text-surface-500">{p.unit || 'qualitativ'}{typeof p.refMin === 'number' && typeof p.refMax === 'number' ? ` • Ref ${p.refMin}-${p.refMax === 999 ? '∞' : p.refMax}` : ''} • {p.cost || DEFAULT_PARAM_COST}€</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedLabParams.length > 0 && (
                <div className="pt-2 border-t border-surface-100">
                  <div className="text-sm text-surface-600">
                    {selectedLabParams.length} Laborwert{selectedLabParams.length !== 1 ? 'e' : ''} ausgewählt — <span className="font-bold">{totalLabCost}€</span>
                  </div>
                </div>
              )}
            </div>

            {/* Lab history */}
            {labHistory.length > 0 ? (
              <div className="space-y-3">
                {labHistory.slice().reverse().map((lab, idx) => {
                  const realIdx = labHistory.length - 1 - idx
                  const expanded = expandedLabIdx === realIdx
                  const pendingCount = Object.entries(lab.results || {}).filter(([, r]) => {
                    const readyAtMs = Date.parse(r?.readyAt || r?.time || '')
                    return Number.isFinite(readyAtMs) && nowTs < readyAtMs
                  }).length
                  const abnormalCount = Object.entries(lab.results || {}).filter(([paramId, r]) => {
                    const readyAtMs = Date.parse(r?.readyAt || r?.time || '')
                    if (Number.isFinite(readyAtMs) && nowTs < readyAtMs) return false
                    return isAbnormal(paramId, r.value)
                  }).length
                  const cats = lab.categories || LAB_CATEGORIES.map(c => c.id)
                  const hasWarning = !!lab.possibleFalsified || !!lab.warningNote
                  return (
                    <div key={realIdx} className="card overflow-hidden">
                      <button onClick={() => setExpandedLabIdx(expanded ? null : realIdx)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-surface-50 transition-colors text-left">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-surface-900 text-sm">Laborbefund #{labHistory.length - idx}</p>
                          <p className="text-xs text-surface-500">{new Date(lab.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} — {Object.keys(lab.results || {}).length} Parameter</p>
                        </div>
                        {hasWarning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">mögl. verfälscht</span>}
                        {pendingCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{pendingCount} ausstehend</span>}
                        {abnormalCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{abnormalCount} auffällig</span>}
                        {expanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                      </button>
                      {expanded && (
                        <div className="border-t border-surface-100">
                          {hasWarning && (
                            <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                              {lab.warningNote || 'Hinweis: Laborwerte möglicherweise verfälscht.'}
                            </div>
                          )}
                          {LAB_CATEGORIES.filter(cat => cats.includes(cat.id)).map(cat => {
                            const params = LAB_PARAMETERS.filter(p => p.category === cat.id)
                            const hasResults = params.some(p => lab.results?.[p.id])
                            if (!hasResults) return null
                            return (
                              <div key={cat.id}>
                                <div className={`px-4 py-2 ${cat.color} font-semibold text-xs`}>{cat.name}</div>
                                <table className="w-full text-sm">
                                  <thead><tr className="bg-surface-50/50">
                                    <th className="text-left p-2 font-medium text-surface-400 text-xs">Parameter</th>
                                    <th className="text-right p-2 font-medium text-surface-400 text-xs">Wert</th>
                                    <th className="text-left p-2 font-medium text-surface-400 text-xs">Einheit</th>
                                    <th className="text-left p-2 font-medium text-surface-400 text-xs">Referenz</th>
                                    <th className="w-8" />
                                  </tr></thead>
                                  <tbody>
                                    {params.map(p => {
                                      const result = lab.results?.[p.id]
                                      if (!result) return null
                                      const readyAtMs = Date.parse(result?.readyAt || result?.time || '')
                                      const pending = Number.isFinite(readyAtMs) && nowTs < readyAtMs
                                      const remainingMs = pending ? (readyAtMs - nowTs) : 0
                                      const remainingText = pending
                                        ? (remainingMs >= 3600000
                                          ? `noch ${Math.ceil(remainingMs / 3600000)}h`
                                          : `noch ${Math.ceil(remainingMs / 60000)}min`)
                                        : null
                                      const abn = isAbnormal(p.id, result.value)
                                      return (
                                        <tr key={p.id} className={`border-t border-surface-100 ${abn && !pending ? 'bg-red-50/50' : ''}`}>
                                          <td className="p-2 text-xs text-surface-700">{p.name}</td>
                                          <td className={`p-2 text-right font-mono font-bold text-xs ${abn && !pending ? 'text-red-600' : 'text-surface-900'}`}>
                                            {pending ? 'Ausstehend' : (typeof result.value === 'number' ? result.value.toLocaleString('de-DE') : result.value)}
                                          </td>
                                          <td className="p-2 text-xs text-surface-500">{p.unit}</td>
                                          <td className="p-2 text-xs text-surface-400 font-mono">
                                            {pending
                                              ? remainingText
                                              : (Number.isFinite(Number(p.refMin)) && Number.isFinite(Number(p.refMax))
                                                ? `${p.refMin}–${p.refMax === 999 ? '∞' : p.refMax}`
                                                : '')}
                                          </td>
                                          <td className="p-2 text-center">
                                            {pending
                                              ? <span className="text-blue-600 font-bold text-[10px]">…</span>
                                              : (abn ? <span className="text-red-600 font-bold text-[10px]">{result.value < p.refMin ? '↓' : '↑'}</span> : <Check className="w-3 h-3 text-green-500 mx-auto" />)}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FlaskConical className="w-12 h-12 text-surface-200 mx-auto mb-3" />
                <p className="text-surface-400 mb-1">Keine Laborergebnisse vorhanden</p>
                <p className="text-xs text-surface-300">Wähle oben einzelne Werte per Checkliste und beauftrage das Labor</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {renderHintPanel('diagnosis')}
            <div className="card p-4">
              <h3 className="font-bold text-surface-900 mb-3">ICD-10 Diagnosen</h3>
              <p className="text-xs text-surface-500 mb-2">
                {normalizedDiagQuery.length < 2
                  ? 'Bitte mindestens 2 Zeichen eingeben.'
                  : `Treffer: ${diagnosisResults.length} (max. 80 angezeigt)`}
              </p>
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={diagQuery}
                  onChange={(e) => setDiagQuery(e.target.value)}
                  placeholder="ICD-10 Code oder Diagnose suchen (z.B. I21, Pneumonie, Dyspnoe)"
                  className="input-field pl-9"
                  disabled={readOnlyPatient}
                />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-surface-200">
                {normalizedDiagQuery.length < 2 && (
                  <div className="p-4 text-sm text-surface-500">Suche starten: mindestens 2 Zeichen eingeben.</div>
                )}
                {normalizedDiagQuery.length >= 2 && diagnosisResults.length === 0 && (
                  <div className="p-4 text-sm text-surface-500">Keine passenden Diagnosen gefunden.</div>
                )}
                {normalizedDiagQuery.length >= 2 && diagnosisResults.map(dx => (
                  <div key={dx.code} className="p-3 border-b border-surface-100 last:border-b-0 hover:bg-surface-50">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-surface-900 font-mono">{dx.code}</p>
                        <p className="text-sm text-surface-700">{dx.name}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button disabled={readOnlyPatient} onClick={() => setPrimaryDiagnosis(dx)} className="text-[10px] px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed">Haupt</button>
                        <button disabled={readOnlyPatient} onClick={() => addSecondaryDiagnosis(dx)} className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">Neben</button>
                        <button disabled={readOnlyPatient} onClick={() => addChronicDiagnosis(dx)} className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">Chronisch</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-2">Behandlerteam</p>
                <div className="space-y-2">
                  <div className="rounded-lg border border-surface-200 p-2.5">
                    <p className="text-xs text-surface-500 mb-1">Hauptbehandler</p>
                    <p className="text-sm font-medium text-surface-900 mb-2">{careTeam.primary ? getMemberName(careTeam.primary) : 'Nicht gesetzt'}</p>
                    {!careTeam.primary && (
                      <button
                        onClick={() => onAssignCareTeam?.(patient.id, { type: 'claim_primary' })}
                        className="btn-secondary text-xs"
                      >
                        Mich als Hauptbehandler eintragen
                      </button>
                    )}
                    {careTeam.primary === currentUser?.id && (
                      <button
                        onClick={() => onAssignCareTeam?.(patient.id, { type: 'release_primary' })}
                        className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Als Hauptbehandler austragen
                      </button>
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-200 p-2.5">
                    <p className="text-xs text-surface-500 mb-1">Nebenbehandler</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {assistantIds.length === 0 ? (
                        <span className="text-xs text-surface-400">Keine</span>
                      ) : assistantIds.map(id => (
                        <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{getMemberName(id)}</span>
                      ))}
                    </div>
                    {careTeam.primary !== currentUser?.id && (
                      <button
                        onClick={() => onAssignCareTeam?.(patient.id, { type: 'toggle_assistant' })}
                        className="btn-secondary text-xs"
                      >
                        {assistantIds.includes(currentUser?.id) ? 'Mich als Nebenbehandler austragen' : 'Mich als Nebenbehandler eintragen'}
                      </button>
                    )}
                    {careTeam.primary === currentUser?.id && (
                      <p className="text-[11px] text-surface-400">Als Hauptbehandler ist keine Nebenrolle möglich.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-200 p-2.5">
                    <p className="text-xs text-surface-500 mb-1">Supervisor (ab Oberarzt)</p>
                    <p className="text-sm font-medium text-surface-900 mb-2">{careTeam.supervisor ? getMemberName(careTeam.supervisor) : 'Nicht gesetzt'}</p>
                    {canBeSupervisor && !careTeam.supervisor && (
                      <button
                        onClick={() => onAssignCareTeam?.(patient.id, { type: 'claim_supervisor' })}
                        className="btn-secondary text-xs"
                      >
                        Mich als Supervisor eintragen
                      </button>
                    )}
                    {careTeam.supervisor === currentUser?.id && (
                      <button
                        onClick={() => onAssignCareTeam?.(patient.id, { type: 'release_supervisor' })}
                        className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Als Supervisor austragen
                      </button>
                    )}
                    {!canBeSupervisor && <p className="text-[11px] text-surface-400">Nur ab Rang Oberarzt möglich.</p>}
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-2">Aufenthaltsdauer / Abrechnung</p>
                <div className="text-xs text-surface-600 space-y-1 mb-2">
                  <p>Aktuell: <span className="font-semibold">{caseTiming.elapsedHours.toFixed(1)}h</span></p>
                  <p>Minimum abrechenbar: {caseTiming.minHours}h</p>
                  <p>Optimal: {caseTiming.optimalMinHours}h - {caseTiming.optimalMaxHours}h</p>
                  <p>Ab Verlustzone: &gt; {caseTiming.maxHours}h</p>
                </div>
                <div className="h-3 bg-surface-100 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-amber-200" style={{ width: `${Math.min(100, (caseTiming.minHours / caseTiming.maxHours) * 100)}%` }} />
                  <div
                    className="absolute inset-y-0 bg-emerald-300"
                    style={{
                      left: `${Math.min(100, (caseTiming.optimalMinHours / caseTiming.maxHours) * 100)}%`,
                      width: `${Math.max(2, Math.min(100, ((caseTiming.optimalMaxHours - caseTiming.optimalMinHours) / caseTiming.maxHours) * 100))}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-1 bg-primary-600"
                    style={{ left: `${Math.min(100, (caseTiming.elapsedHours / caseTiming.maxHours) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-surface-500 mt-2">
                  Erwartete Fallvergütung: <span className="font-semibold">{estimatedRevenue.gross.toLocaleString('de-DE')}€</span>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-2">Hauptdiagnose</p>
                {diagnoses.primary ? (
                  <div className="p-2 rounded-lg bg-primary-50 border border-primary-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-primary-700">{diagnoses.primary.code}</p>
                        <p className="text-sm text-primary-900">{diagnoses.primary.name}</p>
                      </div>
                      <button onClick={() => removeDiagnosis('primary')} className="text-primary-500 hover:text-primary-700"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : <p className="text-sm text-surface-400">Keine Hauptdiagnose gesetzt</p>}
              </div>

              <div className="card p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-2">Nebendiagnosen</p>
                <div className="space-y-1">
                  {diagnoses.secondary.length === 0 && <p className="text-sm text-surface-400">Keine</p>}
                  {diagnoses.secondary.map(dx => (
                    <div key={dx.code} className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start justify-between gap-2">
                      <div><p className="text-[11px] font-mono font-bold text-amber-700">{dx.code}</p><p className="text-xs text-amber-900">{dx.name}</p></div>
                      <button onClick={() => removeDiagnosis('secondary', dx.code)} className="text-amber-500 hover:text-amber-700"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-2">Chronische Diagnosen</p>
                <div className="space-y-1">
                  {diagnoses.chronic.length === 0 && <p className="text-sm text-surface-400">Keine</p>}
                  {diagnoses.chronic.map(dx => (
                    <div key={dx.code} className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-2">
                      <div><p className="text-[11px] font-mono font-bold text-emerald-700">{dx.code}</p><p className="text-xs text-emerald-900">{dx.name}</p></div>
                      <button onClick={() => removeDiagnosis('chronic', dx.code)} className="text-emerald-500 hover:text-emerald-700"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`card p-4 border ${primaryDxCheck.plausible ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <p className={`text-sm font-semibold ${primaryDxCheck.plausible ? 'text-emerald-700' : 'text-red-700'}`}>
                Diagnoseabgleich: {primaryDxCheck.plausible ? 'Korrekt' : 'Nicht korrekt'} ({primaryDxCheck.score}%)
              </p>
              <p className="text-sm text-surface-600 mt-1">{primaryDxCheck.reason}</p>
              {primaryDxCheck.details && (
                <div className="mt-2 text-xs text-surface-500 space-y-0.5">
                  <p>Hauptdiagnose: {primaryDxCheck.details.primaryMatch ? 'Treffer' : 'Kein Treffer'}</p>
                  <p>Nebendiagnosen: {primaryDxCheck.details.secondaryMatches}/{primaryDxCheck.details.secondaryTotal}</p>
                  <p>Chronische Diagnosen: {primaryDxCheck.details.chronicMatches}/{primaryDxCheck.details.chronicTotal}</p>
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-surface-900">Entlass-Checkliste</h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-surface-700">
                  {dischargeRequirements.summary.done}/{dischargeRequirements.summary.total} erfüllt
                </span>
              </div>
              <p className="text-xs text-surface-500 mb-3">
                Für volle Vergütung sollten alle Punkte erfüllt sein. Kritische Lücken führen bei Entlassung zu Malus.
              </p>
              <div className="space-y-2">
                {dischargeRequirements.items.map(item => (
                  <div key={item.id} className="rounded-xl border border-surface-200 bg-white px-3 py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900">
                        {item.title}
                        {item.critical && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Kritisch</span>}
                      </p>
                      <p className="text-xs text-surface-500">{item.detail}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {item.done ? 'Erfüllt' : 'Offen'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {dischargeRequirements?.therapyProgress && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-surface-900">Therapiefortschritt</h4>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dischargeRequirements.therapyProgress.readyForDischarge ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {dischargeRequirements.therapyProgress.percent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 overflow-hidden mb-2">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, dischargeRequirements.therapyProgress.percent)}%` }} />
                </div>
                <p className="text-xs text-surface-500 mb-2">
                  Verlauf: {dischargeRequirements.therapyProgress.elapsedHours.toFixed(1)}h / Mindestdauer {dischargeRequirements.therapyProgress.minHours}h
                </p>
                <div className="space-y-1.5">
                  {dischargeRequirements.therapyProgress.milestones.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span className="text-surface-700">{m.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full ${m.done ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}`}>
                        {m.done ? 'Erfüllt' : 'Offen'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {renderHintPanel('orders')}
            <div className="card p-4">
              <h3 className="font-bold text-surface-900 mb-3">Anordnung erstellen</h3>
              {orderMessage && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${orderMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {orderMessage.text}
                </div>
              )}
              <div className="grid md:grid-cols-[190px_190px_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Art</label>
                  <select value={orderModality} onChange={(e) => setOrderModality(e.target.value)} className="input-field">
                    {ORDER_MODALITIES.map(m => <option key={m.id} value={m.id}>{m.name} ({m.category})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Körperteil / Zielregion</label>
                  <select value={orderBodyPart} onChange={(e) => setOrderBodyPart(e.target.value)} className="input-field">
                    {bodyPartOptions.length === 0 && <option value="">Allgemein</option>}
                    {bodyPartOptions.map(part => <option key={part} value={part}>{part}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Hinweis</label>
                  <input value={orderNote} onChange={(e) => setOrderNote(e.target.value)} className="input-field" placeholder="Fragestellung / klinischer Kontext" />
                </div>
                <button onClick={createOrder} disabled={!canCreateSelectedOrder} className="btn-primary disabled:opacity-50"><Plus className="w-4 h-4" /> Anordnen</button>
              </div>
              {!selectedStationBuilt && selectedOrderModality && (
                <p className="mt-2 text-xs text-red-600">Hinweis: Standard-Station für {selectedOrderModality.name} ist noch nicht gebaut. Falls das Gerät bereits in der aktuellen Patientenstation vorhanden ist, kann die Anordnung trotzdem möglich sein.</p>
              )}
              {selectedStationBuilt && !selectedEquipmentOwned && selectedOrderModality && (
                <p className="mt-2 text-xs text-red-600">Hinweis: Standardgerät fehlt. Alternativ kann die Anordnung über passende Geräte in der aktuellen Patientenstation laufen.</p>
              )}
            </div>

            <div className="space-y-2">
              {orders.length === 0 && <div className="card p-6 text-center text-surface-400">Noch keine Anordnungen vorhanden.</div>}
              {orders.slice().reverse().map(order => {
                const isProcedure = activeProcedureOrderId === order.id
                return (
                  <div key={order.id} className="card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-surface-900">{order.title} • {ORDER_STATION_LABELS[order.station] || order.station}</p>
                        <p className="text-xs text-surface-500">{order.createdBy} • {new Date(order.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'in_progress' ? 'bg-amber-100 text-amber-700'
                            : order.status === 'accepted' ? 'bg-blue-100 text-blue-700'
                              : order.status === 'cancelled' ? 'bg-surface-100 text-surface-500'
                                : 'bg-rose-100 text-rose-700'
                      }`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    {order.bodyPart && <p className="text-xs text-surface-600 mt-1">Zielregion: {order.bodyPart}</p>}
                    {order.notes && <p className="text-xs text-surface-600 mt-1">{order.notes}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {order.status === 'open' && <button onClick={() => triggerOrderAction(order, 'claim')} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Übernehmen</button>}
                      {(order.status === 'accepted') && <button onClick={() => triggerOrderAction(order, 'transfer')} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">Patient verlegen</button>}
                      {(order.status === 'accepted' && ROOM_MODALITIES.has(String(order.modality || '').toLowerCase())) && (
                        <button
                          onClick={() => {
                            const ok = triggerOrderAction(order, 'transfer')
                            if (ok) onOpenDiagnosticRoom?.(order)
                          }}
                          className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-700 hover:bg-violet-200"
                        >
                          Zur Radiologie
                        </button>
                      )}
                      {(order.status === 'in_progress' && ROOM_MODALITIES.has(String(order.modality || '').toLowerCase())) && (
                        <button
                          onClick={() => onOpenDiagnosticRoom?.(order)}
                          className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-700 hover:bg-violet-200"
                        >
                          Zur Radiologie
                        </button>
                      )}
                      {(order.status === 'in_progress' && !ROOM_MODALITIES.has(String(order.modality || '').toLowerCase()) && !isProcedure) && <button onClick={() => triggerOrderAction(order, 'begin_procedure')} className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200">Geräte-Workflow</button>}
                      {(order.status === 'open' || order.status === 'accepted') && <button onClick={() => triggerOrderAction(order, 'cancel')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Stornieren</button>}
                    </div>

                    {isProcedure && (
                      <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                        {getWorkflowTitle(order.modality)} ist als Popup geöffnet.
                      </div>
                    )}

                    {order.status === 'completed' && order?.result?.text && (
                      <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2 text-xs text-emerald-800 space-y-2">
                        <p>Befund: {order.result.text}</p>
                        {(order?.result?.report || order?.result?.diagnosis || order?.result?.signature || order?.result?.impression) && (
                          <div className="grid md:grid-cols-2 gap-2">
                            {order?.result?.impression && (
                              <div className="rounded border border-emerald-200 bg-white px-2 py-1.5">
                                <p className="text-[10px] uppercase tracking-wide text-emerald-700">Beurteilung</p>
                                <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">{order.result.impression}</p>
                              </div>
                            )}
                            {order?.result?.report && (
                              <div className="rounded border border-emerald-200 bg-white px-2 py-1.5">
                                <p className="text-[10px] uppercase tracking-wide text-emerald-700">Befundtext</p>
                                <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">{order.result.report}</p>
                              </div>
                            )}
                            {order?.result?.diagnosis && (
                              <div className="rounded border border-emerald-200 bg-white px-2 py-1.5">
                                <p className="text-[10px] uppercase tracking-wide text-emerald-700">Diagnose</p>
                                <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">{order.result.diagnosis}</p>
                              </div>
                            )}
                            {order?.result?.signature && (
                              <div className="rounded border border-emerald-200 bg-white px-2 py-1.5">
                                <p className="text-[10px] uppercase tracking-wide text-emerald-700">Signatur</p>
                                <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">{order.result.signature}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {Array.isArray(order?.result?.ptca?.captures) && order.result.ptca.captures.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-emerald-800">PTCA-Aufnahmeserie ({order.result.ptca.captures.length})</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {order.result.ptca.captures.map((cap, idx) => (
                                <button
                                  key={cap.id || `ptca_${idx}`}
                                  type="button"
                                  onClick={() => setZoomedImage({ open: true, src: cap.dataUrl, alt: cap.label || `Aufnahme ${idx + 1}`, caption: cap.label || `PTCA ${idx + 1}`, scale: 1 })}
                                  className="text-left rounded-lg border border-emerald-200 bg-white overflow-hidden hover:ring-2 hover:ring-emerald-400/60 transition-shadow"
                                >
                                  <img src={cap.dataUrl} alt="" className="w-full h-28 object-cover" />
                                  <p className="text-[10px] text-emerald-800 px-1.5 py-1 truncate" title={cap.label}>{cap.label || `Aufnahme ${idx + 1}`}</p>
                                </button>
                              ))}
                            </div>
                            {order?.result?.annotationMeta?.strokeCount > 0 && order?.result?.image?.src && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                                <p className="text-[10px] font-semibold text-amber-900 mb-1">Befundbild mit Annotationen</p>
                                <button
                                  type="button"
                                  onClick={() => setZoomedImage({ open: true, src: order.result.image.src, alt: order.result.image.alt || 'Annotiert', caption: order.result.image.caption || '', scale: 1 })}
                                  className="w-full"
                                >
                                  <img src={order.result.image.src} alt="" className="w-full max-h-48 object-contain rounded border border-amber-200" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : order?.result?.image?.src ? (
                          <div>
                            <img src={order.result.image.src} alt={order.result.image.alt || 'Diagnostikbild'} className="w-full rounded-lg border border-emerald-200 bg-white" />
                            <p className="text-[11px] text-emerald-700 mt-1">{order.result.image.caption || 'Bildbefund'}</p>
                          </div>
                        ) : null}
                        {Array.isArray(order?.result?.findings) && order.result.findings.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700 mb-1">Erfasste Befundmuster</p>
                            <div className="flex flex-wrap gap-1">
                              {order.result.findings.map(f => <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{resolveWorkflowItemLabel(order.modality, 'findings', f)}</span>)}
                            </div>
                          </div>
                        )}
                        {Array.isArray(order?.result?.interventions) && order.result.interventions.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700 mb-1">Dokumentierte Therapie</p>
                            <div className="flex flex-wrap gap-1">
                              {order.result.interventions.map(i => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{resolveWorkflowItemLabel(order.modality, 'interventions', i)}</span>)}
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg border border-emerald-200 bg-white p-2.5">
                          <p className="text-[11px] font-semibold text-emerald-700 mb-1">Eigene Beurteilung</p>
                          <textarea
                            value={assessmentDrafts[order.id] ?? order?.result?.assessment ?? ''}
                            onChange={(e) => setAssessmentDrafts(prev => ({ ...prev, [order.id]: e.target.value }))}
                            className="input-field !h-20 resize-none text-xs"
                            placeholder="Eigene Befundbeurteilung und klinische Konsequenz dokumentieren..."
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-emerald-700/80">{order?.result?.assessmentAt ? `Zuletzt gespeichert: ${new Date(order.result.assessmentAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Noch nicht gespeichert'}</span>
                            <button
                              onClick={() => {
                                const text = (assessmentDrafts[order.id] ?? order?.result?.assessment ?? '').trim()
                                if (!text) return
                                const res = onUpdateOrderStatus?.(patient.id, order.id, 'annotate', { assessment: text })
                                if (res?.success === false) {
                                  setOrderMessage({ type: 'error', text: res.message || 'Beurteilung konnte nicht gespeichert werden.' })
                                  return
                                }
                                setOrderMessage({ type: 'success', text: 'Beurteilung gespeichert.' })
                                setTimeout(() => setOrderMessage(null), 1600)
                              }}
                              className="text-[11px] px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Beurteilung speichern
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="card p-4">
              <h3 className="font-bold text-surface-900 mb-3">Verlaufseintrag hinzufügen</h3>
              <div className="grid md:grid-cols-[180px_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Eintragstyp</label>
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value)}
                    className="input-field"
                  >
                    <option value="visit">Visite</option>
                    <option value="procedure">Prozedur</option>
                    <option value="handover">Übergabe</option>
                    <option value="order">Anordnung</option>
                    <option value="note">Notiz</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Inhalt</label>
                  <textarea
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    placeholder="z.B. CA-Visite: Patient wach, orientiert, Schmerzen 3/10, Plan: Mobilisation, Laborkontrolle."
                    className="input-field !h-20 resize-none"
                  />
                </div>
                <button onClick={addStructuredLogEntry} className="btn-primary h-fit"><Plus className="w-4 h-4" /> Eintrag</button>
              </div>
              <div className="mt-3 pt-3 border-t border-surface-100">
                <label className="text-xs text-surface-500 block mb-1">Schnelle Freitext-Notiz</label>
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Zusatznotiz..."
                    className="input-field !h-16 resize-none"
                  />
                  <button onClick={addNote} className="btn-secondary shrink-0 self-end">Notiz speichern</button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {patientLog.length === 0 && (
                <div className="card p-6 text-center">
                  <MessageCircle className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">Noch keine Verlaufseinträge vorhanden</p>
                </div>
              )}
              {patientLog.slice().reverse().map((entry, idx) => {
                const realIdx = patientLog.length - 1 - idx
                const meta = LOG_TYPE_META[entry.type] || LOG_TYPE_META.note
                const isEditing = editLogIndex === realIdx
                return (
                  <div key={entry.id || `${entry.time}_${idx}`} className="card p-4">
                    <div className="grid grid-cols-[120px_120px_1fr_auto] gap-3 items-start">
                      <div className="text-xs text-surface-500">
                        {new Date(entry.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-surface-500">{entry.author || 'System'}</div>
                      <div className="min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <select
                              value={editLogType}
                              onChange={(e) => setEditLogType(e.target.value)}
                              className="input-field !py-1.5 text-sm"
                            >
                              <option value="visit">Visite</option>
                              <option value="procedure">Prozedur</option>
                              <option value="handover">Übergabe</option>
                              <option value="order">Anordnung</option>
                              <option value="note">Notiz</option>
                            </select>
                            <textarea
                              value={editLogText}
                              onChange={(e) => setEditLogText(e.target.value)}
                              className="input-field !h-20 resize-none"
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-surface-900 whitespace-pre-line">{entry.text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const txt = editLogText.trim()
                                if (!txt) return
                                onUpdatePatientLogEntry?.(patient.id, realIdx, { type: editLogType, text: txt })
                                setEditLogIndex(null)
                              }}
                              className="text-[10px] px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => setEditLogIndex(null)}
                              className="text-[10px] px-2 py-1 rounded bg-surface-100 text-surface-600 hover:bg-surface-200"
                            >
                              Abbruch
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditLogIndex(realIdx)
                                setEditLogType(entry.type || 'note')
                                setEditLogText(entry.text || '')
                              }}
                              className="text-[10px] px-2 py-1 rounded bg-surface-100 text-surface-600 hover:bg-surface-200"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => onDeletePatientLogEntry?.(patient.id, realIdx)}
                              className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Löschen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="max-w-4xl mx-auto">
            {renderHintPanel('medications')}
            <h3 className="font-bold text-surface-900 mb-4">Medikation</h3>
            {!hasNurse && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Für automatische Verabreichung muss auf Station eine <strong>Pflegefachkraft</strong> eingestellt sein.
              </div>
            )}
            <div className="card p-4 mb-4">
              <p className="text-sm font-semibold text-surface-900 mb-3">Neuen Medikationsplan ansetzen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input
                    value={medPlanSearch}
                    onChange={(e) => setMedPlanSearch(e.target.value)}
                    placeholder="Medikament suchen..."
                    className="input-field !py-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2 rounded-xl border border-surface-200 p-2 max-h-44 overflow-y-auto bg-surface-50/60">
                  {availableMedications.length === 0 ? (
                    <p className="text-xs text-surface-400 px-2 py-2">Kein Medikament gefunden.</p>
                  ) : (
                    <div className="space-y-1">
                      {availableMedications.map(med => (
                        <button
                          key={med.id}
                          onClick={() => {
                            setMedPlanForm(prev => ({
                              ...prev,
                              medId: med.id,
                              dose: med.dose?.split('/')[0]?.trim() || med.dose || '',
                              route: med?.form?.includes('/') ? med.form.split('/')[0].trim() : (med?.form || 'i.v.'),
                            }))
                          }}
                          className={`w-full text-left rounded-lg px-3 py-2.5 border transition-colors ${
                            medPlanForm.medId === med.id ? 'border-primary-300 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'
                          }`}
                          disabled={!hasNurse}
                        >
                          <p className="text-sm font-medium text-surface-900">{med.name}</p>
                          <p className="text-xs text-surface-500">{med.generic} • Standard: {med.dose}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {doseOptions.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-surface-500 mb-1">Standarddosierungen</p>
                    <div className="flex flex-wrap gap-2">
                      {doseOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setMedPlanForm(prev => ({ ...prev, dose: option }))}
                          className={`px-3 py-2 text-xs rounded-lg border ${medPlanForm.dose === option ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'}`}
                          disabled={!hasNurse}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Anzahl Standarddosen</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={medPlanForm.doseMultiplier}
                    onChange={(e) => setMedPlanForm(prev => ({ ...prev, doseMultiplier: Math.max(1, Number(e.target.value || 1)) }))}
                    placeholder="z.B. 3"
                    className="input-field !py-3 text-sm"
                    disabled={!hasNurse}
                  />
                </div>
                <select
                  value={medPlanForm.route}
                  onChange={(e) => setMedPlanForm(prev => ({ ...prev, route: e.target.value }))}
                  className="input-field !py-3 text-sm"
                  disabled={!hasNurse}
                >
                  <option value="i.v.">i.v.</option>
                  <option value="p.o.">p.o.</option>
                  <option value="s.c.">s.c.</option>
                  <option value="i.m.">i.m.</option>
                  <option value="inhalativ">inhalativ</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={medPlanForm.intervalHours}
                  onChange={(e) => setMedPlanForm(prev => ({ ...prev, intervalHours: e.target.value }))}
                  className="input-field !py-3 text-sm"
                  disabled={!hasNurse}
                  placeholder="Vergabe alle X Stunden"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={addMedicationPlanEntry}
                  disabled={!hasNurse || !medPlanForm.medId}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> In Plan aufnehmen
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {medicationPlan.length === 0 ? (
                <div className="text-center py-10 card">
                  <Pill className="w-10 h-10 text-surface-200 mx-auto mb-2" />
                  <p className="text-surface-400 text-sm">Noch kein Medikationsplan angelegt</p>
                </div>
              ) : (
                medicationPlan.map(entry => (
                  <div key={entry.id} className="card p-3">
                    {editingPlanId === entry.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          value={editPlanForm.dose}
                          onChange={(e) => setEditPlanForm(prev => ({ ...prev, dose: e.target.value }))}
                          className="input-field !py-2.5 text-sm"
                          placeholder="Dosis"
                        />
                        <select
                          value={editPlanForm.route}
                          onChange={(e) => setEditPlanForm(prev => ({ ...prev, route: e.target.value }))}
                          className="input-field !py-2.5 text-sm"
                        >
                          <option value="i.v.">i.v.</option>
                          <option value="p.o.">p.o.</option>
                          <option value="s.c.">s.c.</option>
                          <option value="i.m.">i.m.</option>
                          <option value="inhalativ">inhalativ</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={editPlanForm.intervalHours}
                          onChange={(e) => setEditPlanForm(prev => ({ ...prev, intervalHours: e.target.value }))}
                          className="input-field !py-2.5 text-sm"
                          placeholder="alle Xh"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveMedicationPlanEntry(entry.id)} className="btn-primary text-xs flex-1">Speichern</button>
                          <button onClick={() => setEditingPlanId(null)} className="btn-secondary text-xs flex-1">Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${entry.active ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-900">{entry.medName}</p>
                      <p className="text-xs text-surface-500">
                        {entry.dose} • {entry.route} • alle {entry.intervalHours}h
                        {entry.lastGivenAt ? ` • letzte Gabe: ${new Date(entry.lastGivenAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ' • noch nicht verabreicht'}
                      </p>
                    </div>
                    <button onClick={() => startEditMedicationPlanEntry(entry)} className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200">
                      Bearbeiten
                    </button>
                    <button onClick={() => toggleMedicationPlanEntry(entry.id)} className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200">
                      {entry.active ? 'Pausieren' : 'Aktivieren'}
                    </button>
                    <button onClick={() => removeMedicationPlanEntry(entry.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                      Entfernen
                    </button>
                  </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4 gap-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 via-white to-emerald-50 p-4">
              <div>
                <h3 className="font-bold text-surface-900">Dokumente & Berichte</h3>
                <p className="text-xs text-surface-500">Formularansicht im Klinikstil inkl. Signatur und Textbausteinen</p>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <p className="text-[11px] text-surface-500 mb-1">Neues Formular</p>
                  <select value={newDocumentTemplateId} onChange={(e) => setNewDocumentTemplateId(e.target.value)} className="input-field !py-2 !text-sm min-w-[260px]">
                    {manualDocumentTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <button onClick={createDocumentFromTemplate} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Neu</button>
              </div>
            </div>
            <div className="grid lg:grid-cols-[320px_1fr] gap-5">
              <div className="space-y-2">
                {documentsForView.length === 0 && (
                  <div className="card p-4 text-xs text-surface-500">Noch keine Dokumente vorhanden.</div>
                )}
                {documentsForView.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => openDocumentEditor(doc)}
                    className={`w-full text-left card p-3 border ${activeDocumentId === doc.id ? 'border-primary-300 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-600" />
                      <p className="text-sm font-medium text-surface-900 truncate">{doc.title}</p>
                    </div>
                    <p className="text-[10px] text-surface-500 mt-1">{getDocumentTemplate(doc.templateId || doc.type)?.label || 'Dokument'}</p>
                    <p className="text-[11px] text-surface-500 mt-1">
                      {new Date(doc.updatedAt || doc.createdAt || Date.now()).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                ))}
              </div>
              <div className="card p-5 min-h-[680px]">
                {!documentDraft ? (
                  <div className="h-full flex items-center justify-center text-surface-400 text-sm">
                    Dokument links auswählen oder neues Formular erstellen.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`rounded-xl border px-4 py-3 ${documentColorClass(documentDraft.color)}`}>
                      <input
                        value={documentDraft.title || ''}
                        onChange={(e) => setDocumentDraft(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-transparent text-base font-semibold outline-none"
                        disabled={documentDraft.readonly}
                      />
                      <p className="text-xs opacity-80 mt-0.5">Template: {getDocumentTemplate(documentDraft.templateId)?.label || documentDraft.templateId}</p>
                    </div>

                    {!documentDraft.readonly && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setTextBlockPicker({ open: true, fieldId: null })}
                          className="text-[11px] px-2.5 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200"
                        >
                          Textbausteine
                        </button>
                      </div>
                    )}

                    {documentDraft.templateId === 'rezept' ? (
                      <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-b from-rose-50 to-white p-5 shadow-sm space-y-4">
                        <div className="rounded-xl border border-rose-200 bg-white p-3 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-rose-700 font-semibold">Patient</p>
                            <p className="text-surface-800">{patient?.name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-rose-700 font-semibold">Datum</p>
                            <p className="text-surface-800">{new Date().toLocaleDateString('de-DE')}</p>
                          </div>
                          <div>
                            <p className="text-rose-700 font-semibold">Verordner</p>
                            <p className="text-surface-800">{currentUser?.name || 'Arzt'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-rose-200 bg-white p-3">
                            <p className="text-[11px] text-rose-700 font-semibold mb-1">Arzneimittel</p>
                            <input
                              value={documentDraft.fields?.medikament || ''}
                              onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), medikament: e.target.value } }))}
                              className="input-field !py-2.5"
                              disabled={documentDraft.readonly}
                            />
                          </div>
                          <div className="rounded-lg border border-rose-200 bg-white p-3">
                            <p className="text-[11px] text-rose-700 font-semibold mb-1">Dosierung</p>
                            <input
                              value={documentDraft.fields?.dosierung || ''}
                              onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), dosierung: e.target.value } }))}
                              className="input-field !py-2.5"
                              disabled={documentDraft.readonly}
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-white p-3">
                          <p className="text-[11px] text-rose-700 font-semibold mb-1">Einnahmehinweise</p>
                          <textarea
                            value={documentDraft.fields?.einnahme || ''}
                            onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), einnahme: e.target.value } }))}
                            className="input-field !h-28 resize-none"
                            disabled={documentDraft.readonly}
                          />
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-white p-3">
                          <p className="text-[11px] text-rose-700 font-semibold mb-1">Therapiedauer</p>
                          <input
                            value={documentDraft.fields?.dauer || ''}
                            onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), dauer: e.target.value } }))}
                            className="input-field !py-2.5"
                            disabled={documentDraft.readonly}
                          />
                        </div>
                        {!documentDraft.readonly && (
                          <div className="rounded-lg border border-rose-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] text-rose-700 font-semibold">Unterschrift</p>
                              <button onClick={clearRxSignature} className="text-[11px] px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200">Leeren</button>
                            </div>
                            <canvas
                              ref={rxSignatureRef}
                              width={600}
                              height={150}
                              onMouseDown={beginRxSignature}
                              onMouseMove={drawRxSignature}
                              onMouseUp={endRxSignature}
                              onMouseLeave={endRxSignature}
                              onTouchStart={beginRxSignature}
                              onTouchMove={drawRxSignature}
                              onTouchEnd={endRxSignature}
                              className="w-full h-24 rounded-lg border border-dashed border-rose-300 bg-white touch-none"
                            />
                          </div>
                        )}
                        {documentDraft.readonly && !!documentDraft.fields?.signaturePng && (
                          <div className="rounded-lg border border-rose-200 bg-white p-3">
                            <p className="text-[11px] text-rose-700 font-semibold mb-2">Unterschrift</p>
                            <img
                              src={documentDraft.fields.signaturePng}
                              alt="Rezept-Signatur"
                              className="w-full h-24 object-contain rounded border border-dashed border-rose-300 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`rounded-2xl border-2 p-4 space-y-3 shadow-sm ${documentColorClass(documentDraft.color)}`}>
                        {String(documentDraft.content || '').trim() && (
                          <div className="rounded-xl border border-white/70 p-4 bg-white/85">
                            <label className="text-sm text-surface-700">Freitextbericht</label>
                            <p className="mt-1 text-sm text-surface-800 whitespace-pre-wrap">{documentDraft.content}</p>
                          </div>
                        )}
                        {(getDocumentTemplate(documentDraft.templateId)?.fields || []).length > 0 ? (
                          (getDocumentTemplate(documentDraft.templateId)?.fields || []).map(field => (
                            <div key={field.id} className="rounded-xl border border-white/70 p-4 bg-white/85">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-sm text-surface-700">{field.label}{field.required ? ' *' : ''}</label>
                                {!documentDraft.readonly && (
                                  <button
                                    onClick={() => setTextBlockPicker({ open: true, fieldId: field.id })}
                                    className="text-[11px] px-2 py-1 rounded bg-surface-100 text-surface-700 hover:bg-surface-200"
                                  >
                                    Textbausteine
                                  </button>
                                )}
                              </div>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={documentDraft.fields?.[field.id] || ''}
                                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), [field.id]: e.target.value } }))}
                                  className="input-field !h-36 resize-none"
                                  disabled={documentDraft.readonly}
                                />
                              ) : (
                                <input
                                  value={documentDraft.fields?.[field.id] || ''}
                                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, fields: { ...(prev.fields || {}), [field.id]: e.target.value } }))}
                                  className="input-field !py-3"
                                  disabled={documentDraft.readonly}
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          Object.entries(documentDraft.fields || {})
                            .filter(([key, value]) => key !== 'signaturePng' && key !== 'ptcaCaptures' && key !== 'ptcaLog' && String(value || '').trim())
                            .map(([key, value]) => (
                              <div key={key} className="rounded-xl border border-white/70 p-4 bg-white/85">
                                <label className="text-sm text-surface-700 capitalize">{key.replace(/_/g, ' ')}</label>
                                <p className="mt-1 text-sm text-surface-800 whitespace-pre-wrap">{String(value || '')}</p>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    {Array.isArray(documentDraft?.fields?.ptcaCaptures) && documentDraft.fields.ptcaCaptures.length > 0 ? (
                      <div className="rounded-lg border border-surface-200 p-2 space-y-2">
                        <p className="text-xs text-surface-600 font-semibold">PTCA-Aufnahmeserie ({documentDraft.fields.ptcaCaptures.length})</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {documentDraft.fields.ptcaCaptures.map((cap, idx) => (
                            <button
                              key={cap.id || `doc_ptca_${idx}`}
                              type="button"
                              onClick={() => setZoomedImage({ open: true, src: cap.dataUrl, alt: cap.label || `Aufnahme ${idx + 1}`, caption: cap.label || `PTCA ${idx + 1}`, scale: 1 })}
                              className="text-left rounded border border-surface-200 overflow-hidden hover:bg-surface-50"
                            >
                              <img src={cap.dataUrl} alt="" className="w-full h-24 object-cover" />
                              <p className="text-[10px] text-surface-600 px-1 py-0.5 truncate">{cap.label || `Aufnahme ${idx + 1}`}</p>
                            </button>
                          ))}
                        </div>
                        {documentDraft?.image?.src && (
                          <div className="pt-2 border-t border-surface-200">
                            <p className="text-[11px] text-surface-500 mb-1">Berichtsexport (ggf. mit Annotationen)</p>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-surface-500">Hauptbild für Archiv</p>
                              <button
                                type="button"
                                onClick={() => setZoomedImage({ open: true, src: documentDraft.image.src, alt: documentDraft.image.alt || 'Dokumentbild', caption: documentDraft.image.caption || '', scale: 1 })}
                                className="text-[11px] px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-surface-700"
                              >
                                Vergrößern
                              </button>
                            </div>
                            <img src={documentDraft.image.src} alt={documentDraft.image.alt || 'Dokumentbild'} className="w-full rounded border border-surface-200 cursor-zoom-in max-h-64 object-contain" onClick={() => setZoomedImage({ open: true, src: documentDraft.image.src, alt: documentDraft.image.alt || 'Dokumentbild', caption: documentDraft.image.caption || '', scale: 1 })} />
                          </div>
                        )}
                      </div>
                    ) : documentDraft?.image?.src ? (
                      <div className="rounded-lg border border-surface-200 p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-surface-500">Angehaengtes Befundbild</p>
                          <button
                            onClick={() => setZoomedImage({ open: true, src: documentDraft.image.src, alt: documentDraft.image.alt || 'Dokumentbild', caption: documentDraft.image.caption || '', scale: 1 })}
                            className="text-[11px] px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-surface-700"
                          >
                            Vergrößern
                          </button>
                        </div>
                        <img src={documentDraft.image.src} alt={documentDraft.image.alt || 'Dokumentbild'} className="w-full rounded border border-surface-200 cursor-zoom-in" onClick={() => setZoomedImage({ open: true, src: documentDraft.image.src, alt: documentDraft.image.alt || 'Dokumentbild', caption: documentDraft.image.caption || '', scale: 1 })} />
                      </div>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setDocumentDraft(null); setActiveDocumentId(null) }} className="btn-secondary text-sm">Schliessen</button>
                      {documentDraft.readonly && !String(documentDraft.id || '').startsWith('auto_') && (
                        <button onClick={() => setDocumentDraft(prev => prev ? { ...prev, readonly: false } : prev)} className="btn-secondary text-sm">Bearbeiten</button>
                      )}
                      {!documentDraft.readonly && (
                        <button onClick={saveDocumentDraft} className="btn-primary text-sm">Dokument speichern</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {textBlockPicker.open && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTextBlockPicker({ open: false, fieldId: null })} />
            <div className="relative w-full max-w-2xl rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                <p className="font-semibold text-surface-900">Textbausteine</p>
                <button onClick={() => setTextBlockPicker({ open: false, fieldId: null })} className="p-1.5 rounded hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                {getAvailableTextBlocks().length === 0 ? (
                  <p className="text-sm text-surface-500">Keine Textbausteine vorhanden. Du kannst sie im Profil hinterlegen.</p>
                ) : getAvailableTextBlocks().map((tb, idx) => (
                  <button
                    key={`${tb}_${idx}`}
                    onClick={() => {
                      const fallbackField = (getDocumentTemplate(documentDraft?.templateId)?.fields || [])[0]?.id || null
                      const targetField = textBlockPicker.fieldId || fallbackField
                      if (targetField) insertTextBlock(targetField, tb)
                      setTextBlockPicker({ open: false, fieldId: null })
                    }}
                    className="text-left rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 px-3 py-2 text-xs text-surface-700"
                  >
                    {textBlockLabel(tb, idx)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {zoomedImage.open && (
          <div className="fixed inset-0 z-[78] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setZoomedImage({ open: false, src: '', alt: '', caption: '', scale: 1 })} />
            <div className="relative w-full max-w-6xl rounded-2xl border border-surface-200 bg-slate-950 shadow-2xl overflow-hidden">
              <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-white">
                <p className="text-sm font-semibold">{zoomedImage.caption || 'Bildansicht'}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoomedImage(prev => ({ ...prev, scale: Math.max(1, +(prev.scale - 0.25).toFixed(2)) }))} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">-</button>
                  <button onClick={() => setZoomedImage(prev => ({ ...prev, scale: Math.min(4, +(prev.scale + 0.25).toFixed(2)) }))} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">+</button>
                  <button onClick={() => setZoomedImage(prev => ({ ...prev, scale: 1 }))} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Reset</button>
                  <button onClick={() => setZoomedImage({ open: false, src: '', alt: '', caption: '', scale: 1 })} className="p-1.5 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="h-[78vh] overflow-auto flex items-center justify-center p-6">
                <img src={zoomedImage.src} alt={zoomedImage.alt} className="max-w-none rounded border border-white/10" style={{ transform: `scale(${zoomedImage.scale})`, transformOrigin: 'center center' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {activeProcedureOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => { setActiveProcedureOrderId(null); setProcedureStep(0); setProcedureConfig({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] }); resetArtifactGame() }} />
          <div className={`relative w-full max-w-3xl rounded-2xl overflow-hidden border shadow-2xl bg-gradient-to-br text-white ${getWorkflowTheme(activeProcedureOrder.modality).border} ${getWorkflowTheme(activeProcedureOrder.modality).shell}`}>
            <div className="p-5 border-b border-white/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center animate-pulse">
                    <Scan className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold tracking-wide uppercase ${getWorkflowTheme(activeProcedureOrder.modality).chip}`}>{getWorkflowTitle(activeProcedureOrder.modality)}</p>
                    <p className="text-xs text-cyan-200/90">Patient in Diagnostik • Bedienoberfläche</p>
                  </div>
                </div>
                <button onClick={() => { setActiveProcedureOrderId(null); setProcedureStep(0); setProcedureConfig({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] }); resetArtifactGame() }} className="text-xs px-2.5 py-1 rounded bg-white/15 hover:bg-white/25">
                  Schließen
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-sm font-semibold mb-1">{activeProcedureOrder.title}</p>
                <p className="text-xs text-cyan-100">Schritt {procedureStep + 1}/{activeWorkflowSteps.length + 1}: {activeWorkflowSteps[procedureStep] || 'Befund dokumentieren'}</p>
                <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-cyan-300 transition-all duration-300" style={{ width: `${((procedureStep + 1) / (activeWorkflowSteps.length + 1)) * 100}%` }} />
                </div>
              </div>

              {procedureStep === 0 && (
                <label className="flex items-center gap-2 text-sm bg-white/10 rounded-lg px-3 py-2">
                  <input type="checkbox" checked={procedureConfig.positioningDone} onChange={(e) => setProcedureConfig(prev => ({ ...prev, positioningDone: e.target.checked }))} />
                  Patient korrekt positioniert und Strahlenschutz/Artefaktkontrolle durchgeführt
                </label>
              )}
              {procedureStep === 1 && (
                <select
                  value={procedureConfig.protocol}
                  onChange={(e) => setProcedureConfig(prev => ({ ...prev, protocol: e.target.value }))}
                  className="input-field !bg-white !text-surface-900"
                >
                  <option value="">Protokoll wählen...</option>
                  {(activeWorkflowConfig.protocols || []).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                  {(activeWorkflowConfig.protocols || []).length === 0 && <option value="standard">Standardprotokoll</option>}
                </select>
              )}
              {procedureStep === 2 && (
                <div className="space-y-2">
                  <p className="text-xs text-cyan-100">{artifactGame.instruction}</p>
                  {artifactGame.mode === 'rhythm_tap' ? (
                    <div className="space-y-2">
                      <div className="relative h-14 rounded-xl bg-white/15 border border-white/25 overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-emerald-300/25 border-x border-emerald-300/60" style={{ left: `${(50 - (artifactGame.tapWindow || 0.1) * 100).toFixed(2)}%`, width: `${((artifactGame.tapWindow || 0.1) * 200).toFixed(2)}%` }} />
                        <div className="absolute inset-y-0 w-px bg-cyan-200/30 left-1/2" />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-100 ring-2 ring-cyan-300 transition-all duration-75" style={{ left: `calc(${((artifactGame.pulsePos || 0) * 100).toFixed(2)}% - 6px)` }} />
                      </div>
                      <button onClick={markRhythmHit} disabled={!artifactGame.running} className="px-3 py-1.5 rounded-lg bg-emerald-300 text-slate-900 text-xs font-semibold disabled:opacity-50">
                        Marker setzen
                      </button>
                    </div>
                  ) : (
                    <div
                      className="relative h-20 rounded-xl bg-white/15 border border-white/25 overflow-hidden"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = clamp01((e.clientX - rect.left) / Math.max(1, rect.width))
                        const y = clamp01((e.clientY - rect.top) / Math.max(1, rect.height))
                        setArtifactGame(prev => ({ ...prev, cursorX: x, cursorY: y }))
                      }}
                    >
                      <div className="absolute inset-y-0 w-px bg-cyan-200/30 left-1/2" />
                      <div className="absolute inset-x-0 h-px bg-cyan-200/30 top-1/2" />
                      <div
                        className="absolute w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)] transition-all duration-100"
                        style={{
                          left: `calc(${(artifactGame.targetX * 100).toFixed(2)}% - 4px)`,
                          top: `calc(${(artifactGame.targetY * 100).toFixed(2)}% - 4px)`,
                        }}
                      />
                      <div
                        className="absolute w-3 h-3 rounded-full bg-white ring-2 ring-cyan-300 transition-all duration-75"
                        style={{
                          left: `calc(${(artifactGame.cursorX * 100).toFixed(2)}% - 6px)`,
                          top: `calc(${(artifactGame.cursorY * 100).toFixed(2)}% - 6px)`,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-cyan-100">
                    <span>{artifactGame.running ? `Laeuft: ${(artifactGame.remainingMs / 1000).toFixed(1)}s` : 'Bereit fuer Testlauf'}</span>
                    <span>{artifactGame.score !== null ? `Score: ${artifactGame.score}%` : 'Score: -'}</span>
                  </div>
                  {artifactGame.mode === 'rhythm_tap' && (
                    <p className="text-xs text-cyan-200">
                      Treffer: {artifactGame.hitCount || 0}/{artifactGame.attempts || 0}
                    </p>
                  )}
                  {artifactGame.quality && (
                    <p className="text-xs text-emerald-200">
                      Automatische Qualitaetseinstufung: <strong>{artifactGame.quality === 'gut' ? 'Gut' : artifactGame.quality === 'eingeschraenkt' ? 'Eingeschraenkt' : 'Artefaktbehaftet'}</strong>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => startArtifactGame(activeProcedureOrder?.modality)} disabled={artifactGame.running} className="px-3 py-1.5 rounded-lg bg-cyan-300 text-slate-900 text-xs font-semibold disabled:opacity-50">
                      {artifactGame.running ? 'Laeuft...' : 'Artefakt-Test starten'}
                    </button>
                    <button onClick={() => resetArtifactGame(activeProcedureOrder?.modality)} disabled={artifactGame.running} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs disabled:opacity-50">
                      Reset
                    </button>
                  </div>
                </div>
              )}
              {procedureStep >= 2 && (activeWorkflowConfig.findings || []).length > 0 && (
                <div>
                  <p className="text-xs text-cyan-100 mb-1">Befundmuster</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeWorkflowConfig.findings.map(f => (
                      <button
                        key={f.id}
                        onClick={() => toggleProcedureListItem('findings', f.id)}
                        className={`text-[11px] px-2 py-1 rounded-full border ${procedureConfig.findings.includes(f.id) ? 'bg-cyan-300 text-slate-900 border-cyan-200' : 'bg-white/10 text-white border-white/30'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {procedureStep >= activeWorkflowSteps.length && (
                <div className="space-y-2">
                  <div className="rounded-lg bg-emerald-400/20 border border-emerald-200/40 px-3 py-2 text-sm text-emerald-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Untersuchung abschliessen. Die Beurteilung erfolgt danach direkt am Bildbefund in der Anordnung.
                  </div>
                  {(activeWorkflowConfig.interventions || []).length > 0 && (
                    <div>
                      <p className="text-xs text-cyan-100 mb-1">Therapeutische Konsequenz</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeWorkflowConfig.interventions.map(i => (
                          <button
                            key={i.id}
                            onClick={() => toggleProcedureListItem('interventions', i.id)}
                            className={`text-[11px] px-2 py-1 rounded-full border ${procedureConfig.interventions.includes(i.id) ? 'bg-emerald-300 text-slate-900 border-emerald-200' : 'bg-white/10 text-white border-white/30'}`}
                          >
                            {i.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => { setActiveProcedureOrderId(null); setProcedureStep(0); setProcedureConfig({ positioningDone: false, protocol: '', quality: '', findings: [], interventions: [] }); resetArtifactGame() }} className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm">
                  Abbrechen
                </button>
                {procedureStep < activeWorkflowSteps.length ? (
                  <button
                    onClick={() => setProcedureStep(prev => prev + 1)}
                    disabled={
                      (procedureStep === 0 && !procedureConfig.positioningDone)
                      || (procedureStep === 1 && !procedureConfig.protocol)
                      || (procedureStep === 2 && !procedureConfig.quality)
                    }
                    className="px-3 py-2 rounded-lg bg-cyan-400 text-slate-900 font-semibold hover:bg-cyan-300 disabled:opacity-50"
                  >
                    Nächster Schritt
                  </button>
                ) : (
                  <button onClick={() => completeProcedureOrder(activeProcedureOrder)} className="px-3 py-2 rounded-lg bg-emerald-300 text-slate-900 font-semibold hover:bg-emerald-200 disabled:opacity-50">
                    Untersuchung abschließen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
