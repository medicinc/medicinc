import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { EQUIPMENT, getEquipmentForRoom } from '../data/equipmentData'
import { EQUIPMENT_ACTIONS } from '../data/roomFunctions'
import { TRIAGE_LEVELS } from '../data/patientGenerator'
import MonitorUI from './equipment/MonitorUI'
import DefibrillatorUI from './equipment/DefibrillatorUI'
import VentilatorUI from './equipment/VentilatorUI'
import InfusionPumpUI from './equipment/InfusionPumpUI'
import EcgUI from './equipment/EcgUI'
import OxygenTherapyUI from './equipment/OxygenTherapyUI'
import GenericEquipmentUI from './equipment/GenericEquipmentUI'
import MaterialCartUI from './equipment/MaterialCartUI'
import ResuscitationCartUI from './equipment/ResuscitationCartUI'
import MedicationPanel from './equipment/MedicationPanel'
import PortableSonoUI from './equipment/PortableSonoUI'
import PatientChat from './PatientChat'
import PhysicalExamModal from './exam/PhysicalExamModal'
import { getEquipmentGraphic } from './equipment/EquipmentGraphics'
import erRoomBackground from '../assets/room-v2/er-room.png'
import wardRoomBackground from '../assets/room-v2/ward-room.png'
import monitorAsset from '../assets/room-v2/monitor.png'
import monitorOffAsset from '../assets/room-v2/monitor-off.png'
import materialCartAsset from '../assets/room-v2/material-cart.png'
import femaleYoungCasual from '../assets/room-v2/female-young-casual.png'
import femaleYoungCasualPained from '../assets/room-v2/female-young-casual-pained.png'
import femaleYoungCasualClosedEyes from '../assets/room-v2/female-young-casual-closedeyes.png'
import femaleYoungCasualCyanosis from '../assets/room-v2/female-young-casual-cyanosis.png'
import femaleYoungGown from '../assets/room-v2/female-young-gown.png'
import femaleMiddleCasual from '../assets/room-v2/female-middle-casual.png'
import femaleMiddleCasualPained from '../assets/room-v2/female-middle-casual-pained.png'
import femaleMiddleCasualClosedEyes from '../assets/room-v2/female-middle-casual-closedeyes.png'
import femaleMiddleCasualCyanosis from '../assets/room-v2/female-middle-casual-cyanosis.png'
import femaleMiddleGown from '../assets/room-v2/female-middle-gown.png'
import femaleOldCasual from '../assets/room-v2/female-old-casual.png'
import femaleOldCasualPained from '../assets/room-v2/female-old-casual-pained.png'
import femaleOldCasualClosedEyes from '../assets/room-v2/female-old-casual-closedeyes.png'
import femaleOldCasualCyanosis from '../assets/room-v2/female-old-casual-cyanosis.png'
import femaleOldGown from '../assets/room-v2/female-old-gown.png'
import maleYoungCasual from '../assets/room-v2/male-young-casual.png'
import maleYoungCasualPained from '../assets/room-v2/male-young-casual-pained.png'
import maleYoungCasualClosedEyes from '../assets/room-v2/male-young-casual-closedeyes.png'
import maleYoungCasualCyanosis from '../assets/room-v2/male-young-casual-cyanosis.png'
import maleYoungGown from '../assets/room-v2/male-young-gown.png'
import maleMiddleCasual from '../assets/room-v2/male-middle-casual.png'
import maleMiddleCasualPained from '../assets/room-v2/male-middle-casual-pained.png'
import maleMiddleCasualClosedEyes from '../assets/room-v2/male-middle-casual-closedeyes.png'
import maleMiddleCasualCyanosis from '../assets/room-v2/male-middle-casual-cyanosis.png'
import maleMiddleGown from '../assets/room-v2/male-middle-gown.png'
import maleOldCasual from '../assets/room-v2/male-old-casual.png'
import maleOldCasualPained from '../assets/room-v2/male-old-casual-pained.png'
import maleOldCasualClosedEyes from '../assets/room-v2/male-old-casual-closedeyes.png'
import maleOldCasualCyanosis from '../assets/room-v2/male-old-casual-cyanosis.png'
import maleOldGown from '../assets/room-v2/male-old-gown.png'
import ecgAsset from '../assets/room-v2/ecg-on.png'
import ecgOffAsset from '../assets/room-v2/ecg-off.png'
import defibrillatorAsset from '../assets/er-room/defibrillator.svg'
import ventilatorAsset from '../assets/room-v2/ventilator-on.png'
import ventilatorOffAsset from '../assets/room-v2/ventilator-off.png'
import infusionPumpAsset from '../assets/er-room/infusion-pump.svg'
import ultrasoundAsset from '../assets/er-room/ultrasound.svg'
import crashCartAsset from '../assets/er-room/crash-cart-real.png'
import oxygenAsset from '../assets/er-room/oxygen.svg'
import suctionAsset from '../assets/er-room/suction.svg'
import xrayMobileAsset from '../assets/er-room/xray-mobile.svg'
import hdmOverlayAsset from '../assets/room-v2/hdm.png'
import bloodOverlayAsset from '../assets/surgery/blood-overlay.svg'
import infusionMarkerAsset from '../assets/rd-scene/infusion-marker.png'
import monitorNormalSound from '../assets/sfx/monitornormal.mp3'
import tachykardieSound from '../assets/sfx/tachykardie.mp3'
import flatlineSound from '../assets/sfx/flatline.mp3'
import { startLoop, stopLoop } from '../utils/soundManager'
import {
  X, ArrowLeft, User, Plus, Monitor, Activity, HeartPulse, Wind,
  Bed, Stethoscope, AlertCircle, Clock, Check, Droplets, Zap,
  Pill, Clipboard, FileText, ShoppingCart, MessageCircle, ArrowRightLeft
} from 'lucide-react'

const EQUIPMENT_UI_MAP = {
  monitor: MonitorUI,
  defibrillator: DefibrillatorUI,
  ventilator: VentilatorUI,
  infusion_pump: InfusionPumpUI,
  ecg: EcgUI,
  oxygen: OxygenTherapyUI,
  ultrasound_portable: PortableSonoUI,
  material_cart: MaterialCartUI,
  crash_cart: ResuscitationCartUI,
}

// Manual tuning point for crash cart in room scene.
// Change x/y/w below to manually move or resize the Notfallwagen.
const CRASH_CART_LAYOUT_TUNING = { x: 10, y: 82, w: 16 }

const ROOM_EQUIPMENT_LAYOUT = {
  infusion_pump:  { x: 68, y: 16, w: 9 },
  monitor:        { x: 63, y: 41.5, w: 13 },
  ecg:            { x: 23, y: 71, w: 40 },
  defibrillator:  { x: 81, y: 41, w: 9.5 },
  crash_cart:     CRASH_CART_LAYOUT_TUNING,
  ventilator:     { x: 76, y: 70, w: 37 },
  ultrasound:     { x: 79, y: 67, w: 9.5 },
  ultrasound_portable: { x: 79, y: 67, w: 9.5 },
  suction:        { x: 72, y: 56, w: 8 },
  oxygen:         { x: 38, y: 27.5, w: 8 },
  xray_mobile:    { x: 88, y: 58, w: 9 },
  material_cart:  { x: 49.5, y: 83, w: 26 },
}

const PATIENT_SPRITES = {
  weiblich: {
    young: {
      casual: {
        normal: femaleYoungCasual,
        pained: femaleYoungCasualPained,
        closedeyes: femaleYoungCasualClosedEyes,
        cyanosis: femaleYoungCasualCyanosis,
      },
      gown: femaleYoungGown,
    },
    middle: {
      casual: {
        normal: femaleMiddleCasual,
        pained: femaleMiddleCasualPained,
        closedeyes: femaleMiddleCasualClosedEyes,
        cyanosis: femaleMiddleCasualCyanosis,
      },
      gown: femaleMiddleGown,
    },
    old: {
      casual: {
        normal: femaleOldCasual,
        pained: femaleOldCasualPained,
        closedeyes: femaleOldCasualClosedEyes,
        cyanosis: femaleOldCasualCyanosis,
      },
      gown: femaleOldGown,
    },
  },
  maennlich: {
    young: {
      casual: {
        normal: maleYoungCasual,
        pained: maleYoungCasualPained,
        closedeyes: maleYoungCasualClosedEyes,
        cyanosis: maleYoungCasualCyanosis,
      },
      gown: maleYoungGown,
    },
    middle: {
      casual: {
        normal: maleMiddleCasual,
        pained: maleMiddleCasualPained,
        closedeyes: maleMiddleCasualClosedEyes,
        cyanosis: maleMiddleCasualCyanosis,
      },
      gown: maleMiddleGown,
    },
    old: {
      casual: {
        normal: maleOldCasual,
        pained: maleOldCasualPained,
        closedeyes: maleOldCasualClosedEyes,
        cyanosis: maleOldCasualCyanosis,
      },
      gown: maleOldGown,
    },
  },
}

const ROOM_ASSET_MAP = {
  monitor: monitorAsset,
  ecg: ecgAsset,
  defibrillator: defibrillatorAsset,
  ventilator: ventilatorAsset,
  infusion_pump: infusionPumpAsset,
  ultrasound: ultrasoundAsset,
  ultrasound_portable: ultrasoundAsset,
  crash_cart: crashCartAsset,
  oxygen: oxygenAsset,
  material_cart: materialCartAsset,
  suction: suctionAsset,
  xray_mobile: xrayMobileAsset,
}

const ROOM_ASSET_OFF_MAP = {
  monitor: monitorOffAsset,
  ecg: ecgOffAsset,
  ventilator: ventilatorOffAsset,
}

// Manual tuning point for blood overlay placement in room view.
// Adjust left/top/width per region if you want to fine tune the position.
const SURGICAL_BLOOD_OVERLAY_POSITIONS = {
  head: { left: '48%', top: '18%', width: '20%', opacity: 0.78 },
  arm: { left: '40%', top: '42%', width: '21%', opacity: 0.8 },
  leg: { left: '65%', top: '78%', width: '24%', opacity: 0.82 },
  abdomen: { left: '49%', top: '45%', width: '23%', opacity: 0.8 },
  default: { left: '49%', top: '45%', width: '21%', opacity: 0.78 },
}

// Manual tuning point for infusion marker in patient room.
// Adjust right/top/width if you want to move or resize it.
const INFUSION_MARKER_LAYOUT_TUNING = { right: '81%', top: '13%', width: '26%' }

export default function TreatmentRoomView({
  room, patient, hospital, onClose, onEquipmentAction,
  onAddEquipment, addEquipmentToRoom, removeEquipmentFromRoom, onSaveEquipmentState,
  onUseMedication, userRank, onOpenPatientFile, onSaveExamResult,
  onUpsertPatientDocument, currentUser, canManagePatientActions = true,
  onPatientChatSnapshotChange,
  onFetchResuscitationCart, onResusAnalyze, onResusCharge, onResusShock, onResusToggleCpr, onResusGiveMedication,
  onFetchMobileSono, onReturnMobileSono,
  onTriggerReanimationAlarm, onDevForceResusState, onAbortResuscitation, onTransferToMorgue,
  onDevForceVomit,
}) {
  const [activeEquipment, setActiveEquipment] = useState(null)
  const [showMedPanel, setShowMedPanel] = useState(false)
  const [showEquipShop, setShowEquipShop] = useState(false)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [reaAlarmConfirm, setReaAlarmConfirm] = useState(false)
  const [showResusDev, setShowResusDev] = useState(false)
  const [painStimulusMessage, setPainStimulusMessage] = useState(null)
  const [morgueTransferConfirm, setMorgueTransferConfirm] = useState(false)
  const [cprPulsePhase, setCprPulsePhase] = useState(false)
  const [vomitOverlayFailed, setVomitOverlayFailed] = useState(false)
  const monitorLoopKey = useMemo(() => `room_monitor_${room?.id || 'default'}`, [room?.id])
  const monitorFlatlineLoopKey = useMemo(() => `room_monitor_flatline_${room?.id || 'default'}`, [room?.id])
  const monitorTachyLoopKey = useMemo(() => `room_monitor_tachy_${room?.id || 'default'}`, [room?.id])
  const equipmentScrollRef = useRef(null)

  const tl = patient ? TRIAGE_LEVELS.find(t => t.id === patient.triageLevel) : null

  const uniqueEquipment = useMemo(() =>
    [...new Set(room.equipment || [])]
      .map(eqId => EQUIPMENT.find(e => e.id === eqId))
      .filter(eq => !!eq && eq.id !== 'wound_care'),
    [room.equipment]
  )

  const canTreatPatient = !patient || !!canManagePatientActions
  const roomPatientId = patient?.id || room?.patientId || null

  useEffect(() => {
    if (canTreatPatient) return
    setShowChatPanel(false)
    setShowMedPanel(false)
    setShowExamModal(false)
    setActiveEquipment(null)
  }, [canTreatPatient])

  const handleAction = useCallback((actionId, actionName, duration, xpReward, extra = null) => {
    const scrollTop = equipmentScrollRef.current?.scrollTop ?? 0
    if (onEquipmentAction) {
      const result = onEquipmentAction(actionId, actionName, duration, xpReward, patient?.id, extra)
      requestAnimationFrame(() => {
        if (equipmentScrollRef.current) equipmentScrollRef.current.scrollTop = scrollTop
      })
      return result
    }
    return null
  }, [onEquipmentAction, patient?.id])

  const callResusAnalyze = useCallback((patientId) => onResusAnalyze?.(patientId || roomPatientId), [onResusAnalyze, roomPatientId])
  const callResusCharge = useCallback((patientId, joule) => onResusCharge?.(patientId || roomPatientId, joule), [onResusCharge, roomPatientId])
  const callResusShock = useCallback((patientId, joule) => onResusShock?.(patientId || roomPatientId, joule), [onResusShock, roomPatientId])
  const callResusToggleCpr = useCallback((patientId, active) => onResusToggleCpr?.(patientId || roomPatientId, active), [onResusToggleCpr, roomPatientId])
  const callResusGiveMedication = useCallback(
    (patientId, medId, dose, administration = {}) => onResusGiveMedication?.(patientId || roomPatientId, medId, dose, administration),
    [onResusGiveMedication, roomPatientId],
  )
  const callResusAbort = useCallback((patientId) => onAbortResuscitation?.(patientId || roomPatientId), [onAbortResuscitation, roomPatientId])

  const saveEquipmentState = useCallback((eqId, state) => {
    onSaveEquipmentState?.(room.id, eqId, state)
  }, [onSaveEquipmentState, room.id])
  const getEquipmentState = useCallback((eqId) => room?.equipmentState?.[eqId], [room?.equipmentState])

  const EquipmentComponent = activeEquipment ? (EQUIPMENT_UI_MAP[activeEquipment.id] || GenericEquipmentUI) : null

  const resusState = patient?.clinicalState?.resuscitation || {}
  const resusRhythmKey = String(resusState?.rhythm || '').toLowerCase()
  const noPerfusionDisplay = !!(String(resusState.status || '').toLowerCase() === 'dead' || String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead')
  const lowPerfusionDisplay = !!(resusState.active && (resusRhythmKey === 'asystole' || resusRhythmKey === 'pea'))
  const zeroRespDisplay = !!(resusState.active || noPerfusionDisplay)
  const hasDeathCertificate = !!(patient?.documents || []).some(doc => doc?.templateId === 'totenschein')
  const stationCrashCartBought = !!(hospital?.stationEquipment?.[room.station || ''] || []).includes('crash_cart')
  const stationMobileSonoBought = !!(hospital?.stationEquipment?.[room.station || ''] || []).includes('ultrasound_portable')
  const crashCartVisible = !!(patient && resusState.active && stationCrashCartBought && resusState.cartFetched)
  const mobileSonoDeployment = (hospital?.mobileSonoDeployment || {})[room.station || ''] || null
  const mobileSonoVisible = !!stationMobileSonoBought
    && !!mobileSonoDeployment
    && String(mobileSonoDeployment.roomId || '') === String(room.id || '')
  const visibleEquipment = useMemo(() => {
    let next = uniqueEquipment
    if (crashCartVisible) {
      const hasPhysicalCrashCart = next.some(eq => eq.id === 'crash_cart')
      if (!hasPhysicalCrashCart) {
        const crashCartEq = EQUIPMENT.find(eq => eq.id === 'crash_cart')
        if (crashCartEq) next = [...next, crashCartEq]
      }
    }
    if (mobileSonoVisible) {
      const hasPortableSono = next.some(eq => eq.id === 'ultrasound_portable')
      if (!hasPortableSono) {
        const portableSono = EQUIPMENT.find(eq => eq.id === 'ultrasound_portable')
        if (portableSono) next = [...next, portableSono]
      }
    }
    // Standard-ER: Notfallwagen nur bei aktivem Rea-Fall sichtbar.
    if (room?.roomType !== 'shock' && !crashCartVisible) {
      next = next.filter(eq => eq.id !== 'crash_cart')
    }
    return next
  }, [uniqueEquipment, crashCartVisible, mobileSonoVisible, room?.roomType])
  const hasMonitor = visibleEquipment.some(eq => eq.id === 'monitor')
  const monitorState = getEquipmentState('monitor') || {}
  const monitorMuted = !!monitorState?.muted
  const monitorPowered = hasMonitor && !!monitorState?.powered
  const monitorConnections = {
    hr: monitorPowered && !!monitorState?.ecgConnected,
    af: monitorPowered && !!monitorState?.ecgConnected,
    spo2: monitorPowered && !!monitorState?.spo2Connected,
    bp: monitorPowered && !!monitorState?.nibpActive,
    temp: monitorPowered,
  }
  const latestNibpEntry = Array.isArray(monitorState?.nibpProtocol) && monitorState.nibpProtocol.length > 0
    ? monitorState.nibpProtocol[monitorState.nibpProtocol.length - 1]
    : null
  const showPatientVomit = !!patient?.clinicalState?.vomit?.active
  const VOMIT_OVERLAY_SRC = '/vomit-overlay.png'
  const miniMonitorBp = zeroRespDisplay
    ? '0/0'
    : (monitorState?.nibpActive ? (monitorState?.nibpLastReading?.bp || latestNibpEntry?.bp || '--/--') : '--/--')

  const availableEquip = getEquipmentForRoom(room.station || 'er')
    .filter(eq => !(room.equipment || []).includes(eq.id))
    .filter(eq => eq.id !== 'wound_care')
    .filter(eq => eq.id !== 'crash_cart')
    .filter(eq => eq.id !== 'ultrasound_portable')
  const roomBackground = room.station === 'er' ? erRoomBackground : wardRoomBackground
  const patientGenderKey = (patient?.gender || '').toLowerCase().startsWith('w') ? 'weiblich' : 'maennlich'
  const patientAgeGroup = (patient?.age || 0) < 35 ? 'young' : (patient?.age || 0) < 60 ? 'middle' : 'old'
  const patientClothing = patient?.wardClothing === 'gown' ? 'gown' : 'casual'
  const patientSpriteSet = patient
    ? (PATIENT_SPRITES[patientGenderKey]?.[patientAgeGroup] || PATIENT_SPRITES.maennlich.middle)
    : null
  const patientSprite = patient
    ? (patientClothing === 'gown'
        ? (patientSpriteSet?.gown || PATIENT_SPRITES.maennlich.middle.gown)
        : (patientSpriteSet?.casual?.normal || PATIENT_SPRITES.maennlich.middle.casual.normal))
    : null
  const patientExpressionSprite = (() => {
    if (!patient || patientClothing !== 'casual') return patientSprite
    const expressionSet = patientSpriteSet?.casual
    if (!expressionSet) return patientSprite
    const spo2 = Number(patient?.vitals?.spo2 || 98)
    const pain = Number(patient?.clinicalState?.pain || 0)
    const complaint = Number(patient?.clinicalState?.complaintLevel || 0)
    const consciousness = String(patient?.clinicalState?.consciousness || '').toLowerCase()
    const outcome = String(patient?.clinicalState?.outcome || '').toLowerCase()
    if (/bewusstlos|coma|komat|nicht ansprechbar/.test(consciousness) || outcome === 'dead') {
      return expressionSet.closedeyes || expressionSet.normal || patientSprite
    }
    if (spo2 < 94) {
      return expressionSet.cyanosis || expressionSet.normal || patientSprite
    }
    const stability = String(patient?.clinicalState?.stability || '').toLowerCase()
    if (pain >= 6 || complaint >= 7 || stability === 'instabil' || stability === 'kritisch') {
      return expressionSet.pained || expressionSet.normal || patientSprite
    }
    return expressionSet.normal || patientSprite
  })()
  const woundSymptomsText = [
    patient?.chiefComplaint || '',
    patient?.diagnoses?.primary?.name || '',
    patient?.trueDiagnoses?.primary?.name || '',
    ...(Array.isArray(patient?.symptoms) ? patient.symptoms : []),
    ...(Array.isArray(patient?.presentingSymptoms) ? patient.presentingSymptoms : []),
  ].join(' ')
  const woundPrimaryCode = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const hasOpenWoundHint = /wunde|platzwunde|schnitt|lazeration|lazer|stich|offene verletzung|starke blutung|blutung|hieb|riss/i.test(woundSymptomsText)
  const hasOpenWoundCode = /^(S0[1-9]|S1[1-9]|S2[1-9]|S3[1-9]|S4[1-9]|S5[1-9]|S6[1-9]|S7[1-9]|S8[1-9]|S9[1-9])\./.test(woundPrimaryCode)
    || woundPrimaryCode.startsWith('T14.1')
  const likelyPolytraumaBleeding = /polytrauma|mehrfachverletzung/i.test(woundSymptomsText)
    && Number(patient?.vitals?.hr || 0) >= 115
    && Number(patient?.vitals?.spo2 || 100) < 95
  const woundIsDressed = Array.isArray(patient?.appliedTreatments) && patient.appliedTreatments.some(t => t?.kind === 'action' && t?.id === 'wound_dressing')
  const showSurgicalBloodOverlay = !!patient && (hasOpenWoundHint || hasOpenWoundCode || likelyPolytraumaBleeding) && !woundIsDressed
  const roomMaterialInfusions = Array.isArray(room?.equipmentState?.material_cart?.running)
    ? room.equipmentState.material_cart.running
    : []
  const hasMaterialCartInfusion = roomMaterialInfusions.length > 0
  const hasInfusionPumpRunning = !!(room?.equipmentState?.infusion_pump?.powered && room?.equipmentState?.infusion_pump?.running)
  const showInfusionMarker = !!patient && (hasMaterialCartInfusion || hasInfusionPumpRunning)
  const surgicalOverlayPosition = (() => {
    if (/kopf|stirn|gesicht|schädel/i.test(woundSymptomsText) || /^(S00|S01|S09)/.test(woundPrimaryCode)) {
      return SURGICAL_BLOOD_OVERLAY_POSITIONS.head
    }
    if (/unterarm|arm|schulter|hand|ellen|humerus/i.test(woundSymptomsText) || /^(S41|S51|S61)/.test(woundPrimaryCode)) {
      return SURGICAL_BLOOD_OVERLAY_POSITIONS.arm
    }
    if (/hüfte|bein|tibia|femur|schenkel|becken|unterschenkel|oberschenkel/i.test(woundSymptomsText) || /^(S71|S81)/.test(woundPrimaryCode) || /^S(72|82|32)\./.test(woundPrimaryCode)) {
      return SURGICAL_BLOOD_OVERLAY_POSITIONS.leg
    }
    if (/bauch|abdomen|leiste|thorax|brust/i.test(woundSymptomsText) || /^(S21|S31)/.test(woundPrimaryCode)) {
      return SURGICAL_BLOOD_OVERLAY_POSITIONS.abdomen
    }
    return SURGICAL_BLOOD_OVERLAY_POSITIONS.default
  })()
  const isEquipmentPowered = useCallback((eqId) => {
    const state = getEquipmentState(eqId) || {}
    if ((eqId === 'monitor' || eqId === 'ecg') && !patient) return false
    if (eqId === 'monitor' || eqId === 'ecg' || eqId === 'ventilator') return !!state.powered
    return true
  }, [getEquipmentState, patient])

  const triggerPainStimulus = useCallback(() => {
    if (!patient) return
    const consciousness = String(patient?.clinicalState?.consciousness || '').toLowerCase()
    const dyspnea = Number(patient?.clinicalState?.dyspnea || 0)
    const pain = Number(patient?.clinicalState?.pain || 0)
    const noResponse = /bewusstlos|coma|komat|nicht ansprechbar/.test(consciousness)
    const reducedResponse = /somnol|sopor|verlangsamt|benommen/.test(consciousness)
    const pickOne = (items) => items[Math.floor(Math.random() * items.length)]
    const reactionText = noResponse
      ? pickOne([
          '[Patient reagiert nicht zielgerichtet auf Schmerzreiz.]',
          '[Keine verwertbare Reaktion auf Schmerzreiz.]',
          '[Patient reagiert nicht.]',
        ])
      : reducedResponse
        ? pickOne([
            'Was machen Sie da...?',
            'Aua... was war das gerade?',
            'Warum tun Sie mir weh...?',
          ])
        : dyspnea >= 5
          ? pickOne([
              'Aua... warum machen Sie das? Ich bekomme ohnehin schlecht Luft.',
              'Au, bitte vorsichtig... warum tun Sie mir weh?',
              'Was machen Sie da? Ich kriege kaum Luft.',
            ])
          : pain >= 7
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
    setPainStimulusMessage({
      id: `pain_stim_${patient.id}_${Date.now()}`,
      text: reactionText,
      context: {
        type: 'pain_stimulus',
        noResponse,
        reducedResponse,
      },
    })
    setShowMedPanel(false)
    setActiveEquipment(null)
    setShowChatPanel(true)
  }, [patient])

  useEffect(() => {
    setPainStimulusMessage(null)
  }, [patient?.id])

  useEffect(() => {
    if (!patient?.clinicalState?.resuscitation?.cprActive) return
    const timer = setInterval(() => setCprPulsePhase(prev => !prev), 500)
    return () => clearInterval(timer)
  }, [patient?.clinicalState?.resuscitation?.cprActive])

  useEffect(() => {
    const hr = Number(patient?.vitals?.hr || 0)
    const shouldPlayNormalLoop = monitorPowered && monitorConnections.hr && !monitorMuted && patient && !resusState?.active && !noPerfusionDisplay && hr >= 60 && hr <= 100
    const shouldPlayFlatlineLoop = monitorPowered && monitorConnections.hr && !monitorMuted && patient && (noPerfusionDisplay || (resusState?.active && (resusRhythmKey === 'asystole' || resusRhythmKey === 'pea')))
    const shouldPlayTachyLoop = monitorPowered && monitorConnections.hr && !monitorMuted && patient && !noPerfusionDisplay && resusState?.active && (resusRhythmKey === 'vf' || resusRhythmKey === 'pvt')
    if (shouldPlayNormalLoop && !shouldPlayFlatlineLoop && !shouldPlayTachyLoop) startLoop(monitorLoopKey, monitorNormalSound, { volume: 0.12 })
    else stopLoop(monitorLoopKey)
    if (shouldPlayFlatlineLoop) startLoop(monitorFlatlineLoopKey, flatlineSound, {
      volume: 0.11,
      trimEndSec: 0.42,
      loopStartSec: 0.22,
      seamSearchRadiusSec: 0.4,
      seamWindowSec: 0.008,
      seamCrossfadeSec: 0,
      detectSilenceBounds: true,
      silenceThreshold: 0.008,
    })
    else stopLoop(monitorFlatlineLoopKey)
    if (shouldPlayTachyLoop) startLoop(monitorTachyLoopKey, tachykardieSound, { volume: 0.12 })
    else stopLoop(monitorTachyLoopKey)
    return () => {
      stopLoop(monitorLoopKey)
      stopLoop(monitorFlatlineLoopKey)
      stopLoop(monitorTachyLoopKey)
    }
  }, [monitorPowered, monitorConnections.hr, monitorMuted, patient, resusState?.active, resusRhythmKey, noPerfusionDisplay, patient?.vitals?.hr, monitorLoopKey, monitorFlatlineLoopKey, monitorTachyLoopKey])

  const renderEquipmentVisual = (eqId, className, powerOn = true) => {
    const sprite = powerOn ? ROOM_ASSET_MAP[eqId] : (ROOM_ASSET_OFF_MAP[eqId] || ROOM_ASSET_MAP[eqId])
    if (sprite) {
      return <img src={sprite} alt="" className={className} draggable={false} />
    }
    const FallbackGraphic = getEquipmentGraphic(eqId)
    return <FallbackGraphic className={className} active={powerOn} />
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-100">
      {/* Top bar */}
      <div className="bg-white border-b border-surface-200 px-6 py-2.5 flex items-center gap-4 shrink-0 shadow-sm">
        <button onClick={onClose} className="flex items-center gap-2 text-surface-600 hover:text-surface-900 transition-colors">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">Zurück</span>
        </button>
        <div className="h-6 w-px bg-surface-200" />
        <div className="flex-1">
          <h2 className="font-bold text-surface-900 text-sm">{room.name}</h2>
          <p className="text-[11px] text-surface-500">{room.station === 'er' ? 'Notaufnahme' : room.station === 'icu' ? 'Intensivstation' : room.station === 'or' ? 'OP-Saal' : 'Allgemeinstation'}</p>
        </div>
        {patient && (
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenPatientFile?.(patient)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors text-xs font-medium">
              <Clipboard className="w-3.5 h-3.5" /> Patientenakte
            </button>
            <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold">{patient.name?.[0]}</div>
              <div>
                <p className="text-xs font-medium text-surface-900">{patient.name}</p>
                <p className="text-[10px] text-surface-500">{patient.age}J, {patient.gender}{tl ? ` — ${tl.name}` : ''}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 2D Room view */}
        <div className="flex-1 min-h-[42vh] lg:min-h-0 flex items-center justify-center overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {/* Room container */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-surface-200" style={{ background: '#faf9f6', aspectRatio: '1024 / 788', height: '100%', maxWidth: '100%' }}>

              {/* Room background */}
              <img src={roomBackground} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />

              {/* Room status indicator */}
              {patient && (
                <button
                  onClick={triggerPainStimulus}
                  disabled={!canTreatPatient}
                  className="absolute top-2 left-2 flex items-center gap-2 bg-rose-50/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-sm border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  title="Schmerzreiz setzen"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Schmerzreiz</span>
                </button>
              )}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm z-10">
                <div className={`w-2 h-2 rounded-full ${patient ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
                <span className="text-[9px] font-medium text-surface-600">{patient ? 'Belegt' : 'Frei'}</span>
              </div>

              {/* Patient sprite (overlay on bed area of new backgrounds) */}
              <div className="absolute pointer-events-none overflow-hidden" style={{ left: '30%', top: '24%', width: '39%', height: '46%' }}>
                <div className="relative w-full h-full flex items-end justify-center">
                  {patient && patientExpressionSprite && (
                    <div className="relative w-[65%] h-[100%] overflow-hidden">
                      <img
                        src={patientExpressionSprite}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-center select-none"
                        draggable={false}
                      />
                      {showInfusionMarker && (
                        <div
                          className="absolute rounded-lg bg-white/86 border border-cyan-200 shadow-md p-1.5 pointer-events-none"
                          style={{
                            right: INFUSION_MARKER_LAYOUT_TUNING.right,
                            top: INFUSION_MARKER_LAYOUT_TUNING.top,
                            width: INFUSION_MARKER_LAYOUT_TUNING.width,
                          }}
                        >
                          <img src={infusionMarkerAsset} alt="Infusion aktiv" className="w-full h-auto object-contain" draggable={false} />
                          <p className="text-[8px] text-cyan-800 font-semibold text-center -mt-0.5"></p>
                        </div>
                      )}
                      {showPatientVomit && (
                        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 w-[38%] pointer-events-none">
                          {!vomitOverlayFailed ? (
                            <img
                              src={VOMIT_OVERLAY_SRC}
                              alt=""
                              className="w-full h-auto object-contain opacity-95"
                              onError={() => setVomitOverlayFailed(true)}
                              draggable={false}
                            />
                          ) : (
                            <svg viewBox="0 0 200 80" className="w-full h-auto">
                              <path d="M12 58 C35 42, 55 66, 77 54 C93 45, 110 68, 132 56 C147 48, 166 68, 188 58 L188 78 L12 78 Z" fill="#9bcf66" opacity="0.9" />
                              <path d="M28 58 C40 50, 58 62, 73 55 C89 48, 103 63, 120 56 C137 50, 154 62, 172 57" stroke="#6f9f4b" strokeWidth="4" fill="none" opacity="0.8" />
                            </svg>
                          )}
                        </div>
                      )}
                      {patient?.clinicalState?.resuscitation?.active && patient?.clinicalState?.resuscitation?.cprActive && (
                        <img
                          src={hdmOverlayAsset}
                          alt=""
                          className="absolute left-1/2 top-[38%] -translate-x-1/2 w-[38%] object-contain pointer-events-none select-none opacity-95 transition-transform duration-300"
                          style={{ transform: `translateX(-50%) rotate(90deg) scale(${cprPulsePhase ? 1.06 : 0.9})` }}
                          draggable={false}
                        />
                      )}
                      {showSurgicalBloodOverlay && (
                        <img
                          src={bloodOverlayAsset}
                          alt=""
                          className="absolute -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none select-none"
                          style={{
                            left: surgicalOverlayPosition.left,
                            top: surgicalOverlayPosition.top,
                            width: surgicalOverlayPosition.width,
                            opacity: surgicalOverlayPosition.opacity,
                            mixBlendMode: 'multiply',
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                  )}
                </div>
                {patient && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 py-0.5 rounded-full shadow border border-surface-200 z-10">
                    <p className="text-[9px] font-semibold text-surface-700 whitespace-nowrap">{patient.name}</p>
                  </div>
                )}
              </div>

              {/* Equipment placed in room (strict fixed ER slots) */}
              {visibleEquipment
                .filter(eq => ROOM_EQUIPMENT_LAYOUT[eq.id] && ROOM_ASSET_MAP[eq.id])
                .map((eq, i) => {
                  const layout = ROOM_EQUIPMENT_LAYOUT[eq.id]
                  const isActive = activeEquipment?.id === eq.id
                  const isPowered = isEquipmentPowered(eq.id)
                  return (
                    <div
                      key={`${eq.id}-${i}`}
                      className="absolute z-20"
                      style={{ left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.w}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <button
                        onClick={() => {
                          if (!canTreatPatient && patient) return
                          setShowMedPanel(false); setShowChatPanel(false); setShowEquipShop(false); setActiveEquipment(isActive ? null : eq)
                        }}
                        className="relative w-full transition-all duration-150"
                      >
                        <div className="transition-all">
                          {renderEquipmentVisual(eq.id, 'w-full h-auto object-contain select-none', isPowered)}
                        </div>
                      </button>
                    </div>
                  )
                })}

              {/* Add equipment button */}
              {onAddEquipment && (
                <button onClick={() => setShowEquipShop(true)} className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border-2 border-dashed border-surface-300 text-surface-500 hover:border-primary-400 hover:text-primary-600 transition-all flex items-center gap-1.5 text-[10px] font-medium z-10 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Gerät hinzufügen
                </button>
              )}
            </div>
          </div>

          {/* Equipment Shop Overlay (floats above room) */}
          {showEquipShop && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowEquipShop(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[70vh] flex flex-col z-10">
                <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-bold text-surface-900">Geräte kaufen</h3>
                    <p className="text-xs text-surface-500">{room.name} — Guthaben: {(hospital?.balance || 0).toLocaleString('de-DE')}€</p>
                  </div>
                  <button onClick={() => setShowEquipShop(false)} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {availableEquip.map(eq => {
                    const canAfford = (hospital?.balance || 0) >= eq.cost
                    return (
                      <div key={eq.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-surface-300 transition-colors">
                        <div className="w-10 h-10 shrink-0">{renderEquipmentVisual(eq.id, 'w-full h-full object-contain', true)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-surface-900 text-sm">{eq.name}</p>
                          <p className="text-xs text-surface-500 truncate">{eq.description}</p>
                          <p className="text-xs font-mono text-surface-400 mt-0.5">{eq.cost.toLocaleString('de-DE')}€</p>
                        </div>
                        <button
                          onClick={() => { if (addEquipmentToRoom) addEquipmentToRoom(room.id, eq.id) }}
                          disabled={!canAfford}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 ${canAfford ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-surface-100 text-surface-400'}`}
                        >
                          Kaufen
                        </button>
                      </div>
                    )
                  })}
                  {availableEquip.length === 0 && (
                    <div className="text-xs text-surface-500 rounded-xl border border-dashed border-surface-300 p-3">
                      Alle verfügbaren Geräte für diesen Raum wurden bereits gekauft.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-[360px] xl:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-surface-200 flex flex-col shrink-0 overflow-hidden">
          {/* Mini monitor */}
          {hasMonitor && activeEquipment?.id !== 'monitor' && !showMedPanel && patient && (
            <button onClick={() => { setShowMedPanel(false); setShowChatPanel(false); setActiveEquipment(EQUIPMENT.find(e => e.id === 'monitor')) }}
              className="mx-3 mt-3 p-2.5 rounded-xl bg-[#0a0e14] border border-surface-700 hover:border-emerald-500 transition-colors cursor-pointer shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-green-500 font-mono font-bold">MONITOR</span>
                <span className="text-[8px] text-surface-600 font-mono">Klicken für Details</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-[7px] text-green-500/60 font-mono">HF</p>
                  <p className="text-sm font-bold font-mono text-green-400">
                    {monitorConnections.hr ? ((noPerfusionDisplay || lowPerfusionDisplay) ? 0 : (patient.vitals?.hr || '--')) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] text-cyan-500/60 font-mono">SpO₂</p>
                  <p className="text-sm font-bold font-mono text-cyan-400">
                    {monitorConnections.spo2 ? (zeroRespDisplay ? 0 : (Number.isFinite(Number(patient.vitals?.spo2)) ? Math.round(Number(patient.vitals?.spo2)) : '--')) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] text-white/40 font-mono">RR</p>
                  <p className="text-xs font-bold font-mono text-white">{monitorConnections.bp ? miniMonitorBp : '--/--'}</p>
                </div>
                <div>
                  <p className="text-[7px] text-yellow-500/60 font-mono">AF</p>
                  <p className="text-sm font-bold font-mono text-yellow-400">
                    {monitorConnections.af ? (zeroRespDisplay ? 0 : (Number.isFinite(Number(patient.vitals?.rr)) ? Math.max(0, Math.round(Number(patient.vitals?.rr))) : 16)) : '--'}
                  </p>
                </div>
              </div>
            </button>
          )}

          {showChatPanel ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-surface-200 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                <div className="flex-1"><h3 className="font-bold text-surface-900 text-sm">Patientengespräch</h3><p className="text-xs text-surface-500">{patient?.name || 'Kein Patient'}</p></div>
                <button onClick={() => { setShowChatPanel(false); setPainStimulusMessage(null) }} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-400" /></button>
              </div>
              <div className="flex-1 min-h-0">
                {patient ? (
                  <PatientChat
                    patient={patient}
                    mode="ward"
                    initialSnapshot={patient?.chatSnapshot || null}
                    onSnapshotChange={(snapshot) => onPatientChatSnapshotChange?.(patient?.id, snapshot)}
                    injectedPatientMessage={painStimulusMessage}
                    onInjectedMessageConsumed={(messageId) => {
                      if (!messageId) return
                      setPainStimulusMessage((prev) => (prev?.id === messageId ? null : prev))
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-surface-400">Kein Patient im Zimmer</div>
                )}
              </div>
            </div>
          ) : showMedPanel ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-surface-200 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><Pill className="w-5 h-5" /></div>
                <div className="flex-1"><h3 className="font-bold text-surface-900 text-sm">Medikamente</h3><p className="text-xs text-surface-500">{patient?.name || 'Kein Patient'}</p></div>
                <button onClick={() => setShowMedPanel(false)} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-400" /></button>
              </div>
              <MedicationPanel patient={patient} inventory={hospital?.medicationInventory} userRank={userRank} onUseMedication={canTreatPatient ? onUseMedication : undefined} />
            </div>
          ) : activeEquipment && EquipmentComponent ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-surface-200 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                  {renderEquipmentVisual(activeEquipment.id, 'w-7 h-7 object-contain', isEquipmentPowered(activeEquipment.id))}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-surface-900 text-sm">{activeEquipment.name}</h3>
                  <p className="text-xs text-surface-500">{activeEquipment.description}</p>
                </div>
                <button onClick={() => setActiveEquipment(null)} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-400" /></button>
              </div>
              <div ref={equipmentScrollRef} className="flex-1 overflow-y-auto">
                <EquipmentComponent
                  equipment={activeEquipment} patient={patient} onAction={handleAction}
                  room={room}
                  savedState={getEquipmentState(activeEquipment.id)}
                  onSaveState={(state) => saveEquipmentState(activeEquipment.id, state)}
                  medicationInventory={hospital?.medicationInventory}
                  onSaveExamResult={onSaveExamResult}
                  onUpsertPatientDocument={onUpsertPatientDocument}
                  currentUser={currentUser}
                  onResusAnalyze={callResusAnalyze}
                  onResusCharge={callResusCharge}
                  onResusShock={callResusShock}
                  onResusToggleCpr={callResusToggleCpr}
                  onResusGiveMedication={callResusGiveMedication}
                  onAbortResuscitation={callResusAbort}
                  userRank={userRank}
                  externalAudioManaged={activeEquipment?.id === 'monitor'}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {patient ? (
                <div className="p-5 border-b border-surface-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-surface-900 flex items-center gap-2"><User className="w-4 h-4 text-primary-600" />Patient</h3>
                    <button onClick={() => onOpenPatientFile?.(patient)} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"><FileText className="w-3 h-3" /> Akte öffnen</button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-surface-500">Name</span><span className="font-medium text-surface-900">{patient.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-surface-500">Alter</span><span>{patient.age}J, {patient.gender}</span></div>
                    {tl && <div className="flex justify-between text-sm"><span className="text-surface-500">Triage</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tl.bgColor}`}>{tl.name}</span></div>}
                    <div className="text-sm"><span className="text-surface-500 block">Beschwerde</span><span className="text-surface-900 text-xs">{patient.chiefComplaint}</span></div>
                    {Array.isArray(patient.venousAccesses) && patient.venousAccesses.some(access => access?.status === 'active') && (
                      <div className="text-sm">
                        <span className="text-surface-500 block">Venöser Zugang</span>
                        <span className="text-surface-900 text-xs">
                          {patient.venousAccesses
                            .filter(access => access?.status === 'active')
                            .map(access => `${access.gauge || 'PVK'} ${access.site || ''}`.trim())
                            .join(' | ')}
                        </span>
                      </div>
                    )}
                    {patient.vitals && monitorPowered && (
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[
                          monitorConnections.hr ? { l: 'HF', v: patient.vitals.hr, w: patient.vitals.hr > 100 || patient.vitals.hr < 60 } : null,
                          monitorConnections.bp ? { l: 'RR', v: miniMonitorBp, w: false } : null,
                          monitorConnections.af ? { l: 'AF', v: patient.vitals.rr, w: patient.vitals.rr > 20 } : null,
                          monitorConnections.temp ? { l: 'T°', v: patient.vitals.temp, w: patient.vitals.temp > 38 } : null,
                          monitorConnections.spo2 ? { l: 'O₂', v: Number.isFinite(Number(patient.vitals?.spo2)) ? Math.round(Number(patient.vitals.spo2)) : '--', w: patient.vitals.spo2 < 94 } : null,
                        ].filter(Boolean).map(v => (
                          <div key={v.l} className={`text-center p-1 rounded-lg ${v.w ? 'bg-red-50' : 'bg-surface-50'}`}>
                            <p className="text-[9px] text-surface-400">{v.l}</p>
                            <p className={`text-xs font-bold ${v.w ? 'text-red-600' : 'text-surface-800'}`}>{v.v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 border-b border-surface-200 text-center">
                  <Bed className="w-10 h-10 text-surface-200 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">Kein Patient zugewiesen</p>
                </div>
              )}

              <div className="p-5">
                <h3 className="font-bold text-surface-900 mb-3 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary-600" />Geräte ({visibleEquipment.length})</h3>
                {visibleEquipment.length > 0 ? (
                  <div className="space-y-1.5">
                    {visibleEquipment.map((eq, i) => {
                      return (
                        <div key={`${eq.id}-${i}`} className="w-full flex items-center gap-2 p-2 rounded-xl border border-surface-200 hover:border-primary-300 transition-all">
                          <button
                            onClick={() => { if (!canTreatPatient && patient) return; setActiveEquipment(eq) }}
                            className="flex-1 min-w-0 flex items-center gap-3 text-left hover:bg-primary-50/30 rounded-lg p-1.5 transition-colors"
                          >
                            <div className="w-9 h-9 shrink-0">{renderEquipmentVisual(eq.id, 'w-full h-full object-contain', isEquipmentPowered(eq.id))}</div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-900">{eq.name}</p></div>
                            <Activity className="w-3.5 h-3.5 text-surface-300" />
                          </button>
                          {onAddEquipment && (room.equipment || []).includes(eq.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const res = removeEquipmentFromRoom?.(room.id, eq.id)
                                if (res?.success && activeEquipment?.id === eq.id) setActiveEquipment(null)
                              }}
                              className="text-[10px] px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 shrink-0"
                            >
                              Abreißen
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-surface-400 mb-2">Keine Geräte</p>
                    <button onClick={() => setShowEquipShop(true)} className="text-sm text-primary-600 font-medium">+ Hinzufügen</button>
                  </div>
                )}
              </div>

              <div className="p-5 pt-0 space-y-2">
                {patient?.clinicalState?.resuscitation?.active && stationCrashCartBought && !patient?.clinicalState?.resuscitation?.cartFetched && (
                  <button
                    onClick={() => onFetchResuscitationCart?.(patient.id)}
                    disabled={!canTreatPatient}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors text-left disabled:opacity-50"
                  >
                    <HeartPulse className="w-4 h-4" />
                    <span className="text-sm font-medium">Reanimationswagen holen</span>
                  </button>
                )}
                {patient && stationMobileSonoBought && !mobileSonoVisible && (
                  <button
                    onClick={() => onFetchMobileSono?.(room.id, patient.id)}
                    disabled={!canTreatPatient}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-left disabled:opacity-50"
                  >
                    <Activity className="w-4 h-4" />
                    <span className="text-sm font-medium">Mobiles Sono ans Bett holen</span>
                  </button>
                )}
                {mobileSonoVisible && (
                  <button
                    onClick={() => onReturnMobileSono?.(room.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 transition-colors text-left"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Mobiles Sono zurückgeben</span>
                  </button>
                )}
                {patient && !patient?.clinicalState?.resuscitation?.active && String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead' && patient?.status !== 'morgue' && (
                  <button
                    onClick={() => {
                      if (!morgueTransferConfirm) {
                        setMorgueTransferConfirm(true)
                        return
                      }
                      const res = onTransferToMorgue?.(patient.id)
                      if (res?.success) setMorgueTransferConfirm(false)
                    }}
                    disabled={!canTreatPatient || !hasDeathCertificate}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-colors text-left disabled:opacity-50 ${
                      morgueTransferConfirm
                        ? 'border-slate-600 bg-slate-700 text-white'
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">{morgueTransferConfirm ? 'Bestätigen: In Leichenhalle verlegen' : 'In Leichenhalle verlegen'}</span>
                  </button>
                )}
                {patient && !patient?.clinicalState?.resuscitation?.active && String(patient?.clinicalState?.outcome || '').toLowerCase() === 'dead' && patient?.status !== 'morgue' && !hasDeathCertificate && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Für die Verlegung in die Leichenhalle muss zuerst ein Totenschein in der Patientenakte erstellt werden.
                  </div>
                )}
                {patient?.clinicalState?.resuscitation?.active && !stationCrashCartBought && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Kein Reanimationswagen auf dieser Station gekauft (Stationen & Räume).
                  </div>
                )}
                {patient && (
                  <button
                    onClick={() => {
                      if (!reaAlarmConfirm) {
                        setReaAlarmConfirm(true)
                        return
                      }
                      onTriggerReanimationAlarm?.(patient.id)
                      setReaAlarmConfirm(false)
                    }}
                    disabled={!canTreatPatient}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-colors text-left disabled:opacity-50 ${
                      reaAlarmConfirm
                        ? 'border-red-500 bg-red-600 text-white'
                        : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{reaAlarmConfirm ? 'Bestätigen: Reanimationsalarm senden' : 'Reanimationsalarm'}</span>
                  </button>
                )}
                {onAddEquipment && (
                  <button onClick={() => setShowEquipShop(true)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-dashed border-surface-200 text-surface-500 hover:border-primary-300 hover:text-primary-600 transition-colors text-left">
                    <ShoppingCart className="w-4 h-4" /><span className="text-sm font-medium">Gerät kaufen</span>
                  </button>
                )}
                {patient && (
                  <button onClick={() => setShowExamModal(true)} disabled={!canTreatPatient}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                    <Stethoscope className="w-4 h-4" /><span className="text-sm font-medium">Körperlich untersuchen</span>
                  </button>
                )}
                {patient && (
                  <button onClick={() => { setShowChatPanel(false); setActiveEquipment(null); setShowMedPanel(true) }} disabled={!canTreatPatient}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                    <Pill className="w-4 h-4" /><span className="text-sm font-medium">Medikament verabreichen</span>
                  </button>
                )}
                {patient && (
                  <button onClick={() => { setPainStimulusMessage(null); setShowMedPanel(false); setActiveEquipment(null); setShowChatPanel(true) }} disabled={!canTreatPatient}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                    <MessageCircle className="w-4 h-4" /><span className="text-sm font-medium">Mit Patient sprechen</span>
                  </button>
                )}
                {patient && (
                  <button
                    onClick={() => setShowResusDev(prev => !prev)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-surface-300 bg-surface-50 hover:bg-surface-100 text-surface-700 transition-colors text-left"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Rea-Devmenü {showResusDev ? 'ausblenden' : 'anzeigen'}</span>
                  </button>
                )}
                {patient && showResusDev && (
                  <div className="rounded-xl border border-surface-300 bg-white p-2.5 space-y-1.5">
                    <p className="text-[11px] text-surface-500">Temporär für Tests</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => onDevForceResusState?.(patient.id, 'vf')} className="text-[11px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200">Arrest VF</button>
                      <button onClick={() => onDevForceResusState?.(patient.id, 'asystole')} className="text-[11px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200">Arrest Asystolie</button>
                      <button onClick={() => onDevForceResusState?.(patient.id, 'pea')} className="text-[11px] px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200">Arrest PEA</button>
                      <button onClick={() => onDevForceResusState?.(patient.id, 'rosc')} className="text-[11px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">ROSC</button>
                      <button onClick={() => onDevForceResusState?.(patient.id, 'dead')} className="text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 col-span-2">Tod erzwingen</button>
                      <button onClick={() => onDevForceVomit?.(patient.id, true)} className="text-[11px] px-2 py-1 rounded bg-lime-100 text-lime-700 hover:bg-lime-200">Erbrechen AN</button>
                      <button onClick={() => onDevForceVomit?.(patient.id, false)} className="text-[11px] px-2 py-1 rounded bg-lime-100 text-lime-700 hover:bg-lime-200">Erbrechen AUS</button>
                    </div>
                  </div>
                )}
                {patient && !canTreatPatient && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Keine Behandlungsrechte: Bitte zuerst als Haupt-/Nebenbehandler oder Supervisor eintragen.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showExamModal && patient && (
        <PhysicalExamModal
          patient={patient}
          onClose={() => setShowExamModal(false)}
          onSave={(resultOrResults) => {
            const results = Array.isArray(resultOrResults) ? resultOrResults : [resultOrResults]
            results.forEach(r => onSaveExamResult?.(patient.id, r))
          }}
        />
      )}
    </div>
  )
}
