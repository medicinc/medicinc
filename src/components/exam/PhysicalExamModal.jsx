import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Stethoscope, Eye, Check, Hand, Activity, Wind, Clock, Brain } from 'lucide-react'
import stethoscopeToolAsset from '../../assets/exam/stethoscope-tool.png'
import frontMaleAsset from '../../assets/exam/front-male.png'
import frontFemaleAsset from '../../assets/exam/front-female.png'
import backMaleAsset from '../../assets/exam/back-male.png'
import backFemaleAsset from '../../assets/exam/back-female.png'
import recapHandAsset from '../../assets/exam/hand-recap.png'
import mouthMainAsset from '../../assets/exam/mouth-main.png'
import mouthLegostoneAsset from '../../assets/exam/mouth-legostone.png'
import bonesAsset from '../../assets/exam/bones.png'
import eyesOpenAsset from '../../assets/exam/eyes-open.png'
import auscultationSound from '../../assets/sfx/auscultation.mp3'
import auscultationPathologicSound from '../../assets/sfx/auskultation_pathologisch.mp3'
import { startLoop, stopLoop } from '../../utils/soundManager'

function toLocalPos(e, container) {
  const rect = container.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
}

function isPathologicAuscultationFinding(finding) {
  const text = String(finding || '').toLowerCase()
  return /rg|giemen|obstrukt|patholog|abschw|rassel|stridor|verlängertes exspirium/.test(text)
}

function classifyRespiratoryRate(rr) {
  if (!Number.isFinite(rr) || rr <= 0) return 'nicht messbar'
  if (rr < 10) return `${rr}/min (bradypnoe)`
  if (rr > 24) return `${rr}/min (tachypnoe)`
  return `${rr}/min (regelmaessig)`
}

export default function PhysicalExamModal({ patient, onClose, onSave, initialExam = 'auscultation', allowedExamIds = null, title = 'Körperliche Untersuchung' }) {
  const auscultationLoopKeyRef = useRef(`exam_auscultation_loop_${Math.random().toString(36).slice(2, 9)}`)
  const allowedExamSet = useMemo(() => {
    if (!Array.isArray(allowedExamIds) || allowedExamIds.length === 0) return null
    return new Set(allowedExamIds)
  }, [allowedExamIds])
  const isExamAllowed = (examId) => !allowedExamSet || allowedExamSet.has(examId)
  const [activeExam, setActiveExam] = useState(() => {
    if (isExamAllowed(initialExam)) return initialExam
    if (isExamAllowed('auscultation')) return 'auscultation'
    return allowedExamSet ? Array.from(allowedExamSet)[0] : 'auscultation'
  })
  const [viewSide, setViewSide] = useState('chest')
  const [toolPos, setToolPos] = useState({ x: 50, y: 50 })
  const [checkedPoints, setCheckedPoints] = useState([])
  const [examNote, setExamNote] = useState('')
  const [lampPos, setLampPos] = useState({ x: 50, y: 30 })
  const [pupilExam, setPupilExam] = useState({
    left: { tested: false, direct: false, consensual: false, baseMm: 5.0, reactMm: 3.0 },
    right: { tested: false, direct: false, consensual: false, baseMm: 5.0, reactMm: 3.0 },
  })
  const [bodySide, setBodySide] = useState('front')
  const [palpated, setPalpated] = useState([])
  const [recapMeasured, setRecapMeasured] = useState(null)
  const [turgorMeasured, setTurgorMeasured] = useState(null)
  const [mouthChecks, setMouthChecks] = useState([])
  const [boneChecks, setBoneChecks] = useState([])
  const [beFastStepIndex, setBeFastStepIndex] = useState(0)
  const [beFastChecks, setBeFastChecks] = useState({
    balance: null,
    eyes: null,
    face: null,
    arm: null,
    speech: null,
    time: null,
  })

  const auscultationTargets = useMemo(() => {
    const isRespComplaint = /atem|husten|dyspnoe|lungen|bronch|asthma|copd/i.test(patient?.chiefComplaint || '')
    return viewSide === 'chest'
      ? [
          { id: 'apex_l', x: 36, y: 35, label: 'Apex links', finding: isRespComplaint ? 'Vesikulär abgeschwächt links apikal' : 'Vesikulär, kein Nebengeräusch' },
          { id: 'apex_r', x: 64, y: 35, label: 'Apex rechts', finding: 'Vesikulär, kein Nebengeräusch' },
          { id: 'base_l', x: 38, y: 62, label: 'Basis links', finding: 'Vesikulär, diskret verlängertes Exspirium' },
          { id: 'base_r', x: 62, y: 62, label: 'Basis rechts', finding: isRespComplaint ? 'Feinblasige RG basal rechts' : 'Vesikulär, kein Nebengeräusch' },
        ]
      : [
          { id: 'post_upper_l', x: 36, y: 34, label: 'Dorsal oben links', finding: 'Vesikulär' },
          { id: 'post_upper_r', x: 64, y: 34, label: 'Dorsal oben rechts', finding: 'Vesikulär' },
          { id: 'post_lower_l', x: 39, y: 66, label: 'Dorsal unten links', finding: 'Vesikulär, kein Nebengeräusch' },
          { id: 'post_lower_r', x: 61, y: 66, label: 'Dorsal unten rechts', finding: isRespComplaint ? 'Giemen exspiratorisch' : 'Vesikulär, kein Nebengeräusch' },
        ]
  }, [patient?.chiefComplaint, viewSide])

  const nearestTarget = useMemo(() => {
    let best = null
    let bestDist = Infinity
    for (const t of auscultationTargets) {
      const d = Math.hypot(toolPos.x - t.x, toolPos.y - t.y)
      if (d < bestDist) {
        bestDist = d
        best = t
      }
    }
    return bestDist <= 10 ? best : null
  }, [toolPos, auscultationTargets])

  useEffect(() => {
    const loopKey = auscultationLoopKeyRef.current
    const shouldLoop = activeExam === 'auscultation' && !!nearestTarget
    if (!shouldLoop) {
      stopLoop(loopKey)
      return
    }
    const source = isPathologicAuscultationFinding(nearestTarget?.finding)
      ? auscultationPathologicSound
      : auscultationSound
    startLoop(loopKey, source, {
      volume: 0.16,
      loopStartSec: 0.06,
      trimEndSec: 0.08,
      seamCrossfadeSec: 0.016,
      detectSilenceBounds: true,
    })
    return () => stopLoop(loopKey)
  }, [activeExam, nearestTarget?.id, nearestTarget?.finding])

  useEffect(() => () => {
    stopLoop(auscultationLoopKeyRef.current)
  }, [])

  const lampOnLeft = Math.hypot(lampPos.x - 22, lampPos.y - 44) < 12
  const lampOnRight = Math.hypot(lampPos.x - 64.3, lampPos.y - 44) < 12
  const primaryCode = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const diagnosisCode = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const likelyPathologicPupils = /anisokor|trauma|hirn|schlaganfall|neurolog|krampf|bewusstlos/i.test(patient?.chiefComplaint || '')
    || primaryCode.startsWith('I61')
    || primaryCode.startsWith('I63')
    || primaryCode.startsWith('S06')
  const leftPupilNarrow = lampOnLeft || (lampOnRight && (likelyPathologicPupils ? !!pupilExam.left.consensual : true))
  const rightPupilNarrow = lampOnRight || (lampOnLeft && (likelyPathologicPupils ? !!pupilExam.right.consensual : true))

  const isKidneyInfectionCase = /pyeloneph|nierenbecken|nierenentz|flankenschmerz|harnwegsinfekt|nierenschmerz/i.test(patient?.chiefComplaint || '')
    || /^(N10|N12|N39\.0)/.test(diagnosisCode)
  const palpationZones = bodySide === 'front'
    ? [
      { id: 'front_ruq', x: 44, y: 52, label: 'Rechter Oberbauch' },
      { id: 'front_luq', x: 56, y: 52, label: 'Linker Oberbauch' },
      { id: 'front_rlq', x: 44, y: 66, label: 'Rechter Unterbauch' },
      { id: 'front_llq', x: 56, y: 66, label: 'Linker Unterbauch' },
    ]
    : [
      { id: 'back_cva_left', x: 44, y: 58, label: 'Flanke links (Nierenlager)' },
      { id: 'back_cva_right', x: 56, y: 58, label: 'Flanke rechts (Nierenlager)' },
      { id: 'back_lumbar_left', x: 44, y: 70, label: 'LWS/Paravertebral links' },
      { id: 'back_lumbar_right', x: 56, y: 70, label: 'LWS/Paravertebral rechts' },
    ]
  const boneZones = [
    { id: 'skull', x: 50, y: 13, label: 'Schädel/Gesicht', group: 'head' },
    { id: 'hws', x: 50, y: 24, label: 'HWS', group: 'spine_cervical' },
    { id: 'clavicle_l', x: 42, y: 30, label: 'Clavicula links', group: 'shoulder_left' },
    { id: 'clavicle_r', x: 58, y: 30, label: 'Clavicula rechts', group: 'shoulder_right' },
    { id: 'thorax', x: 50, y: 38, label: 'Thorax/Rippen', group: 'thorax' },
    { id: 'humerus_l', x: 36, y: 40, label: 'Humerus links', group: 'upper_arm_left' },
    { id: 'humerus_r', x: 64, y: 40, label: 'Humerus rechts', group: 'upper_arm_right' },
    { id: 'forearm_l', x: 30, y: 52, label: 'Unterarm links', group: 'forearm_left' },
    { id: 'forearm_r', x: 70, y: 52, label: 'Unterarm rechts', group: 'forearm_right' },
    { id: 'pelvis', x: 50, y: 56, label: 'Becken', group: 'pelvis' },
    { id: 'femur_l', x: 43, y: 67, label: 'Femur links', group: 'femur_left' },
    { id: 'femur_r', x: 57, y: 67, label: 'Femur rechts', group: 'femur_right' },
    { id: 'knee_l', x: 43, y: 79, label: 'Knie links', group: 'knee_left' },
    { id: 'knee_r', x: 57, y: 79, label: 'Knie rechts', group: 'knee_right' },
    { id: 'lowerleg_l', x: 43, y: 88, label: 'Unterschenkel links', group: 'lower_leg_left' },
    { id: 'lowerleg_r', x: 57, y: 88, label: 'Unterschenkel rechts', group: 'lower_leg_right' },
  ]

  const isTraumaCase = /trauma|sturz|fraktur|unfall|verletz/i.test(patient?.chiefComplaint || '')
  const isAbdCase = /bauch|abdomen|append|übelkeit|erbrechen/i.test(patient?.chiefComplaint || '')
  const vitals = patient?.vitals || {}
  const systolicBp = Number(String(vitals.bp || '').split('/')[0] || 0)
  const hr = Number(vitals.hr || 0)
  const spo2 = Number(vitals.spo2 || 0)
  const temp = Number(vitals.temp || 0)
  const dehydratedByComplaint = /dehydrat|erbrechen|durchfall|fieber|wenig getrunken|exsikk/i.test(patient?.chiefComplaint || '')
  const perfusionRisk = /schock|sepsis|blutung|synkope|hypoton|kalt|kaltschweiß/i.test(patient?.chiefComplaint || '')
    || /^R57|A41|T79|I95/.test(diagnosisCode)
    || (systolicBp > 0 && systolicBp < 95)
    || hr >= 120
    || (spo2 > 0 && spo2 < 92)
  const dehydrationRisk = dehydratedByComplaint
    || /^E86|A09|K52|R11/.test(diagnosisCode)
    || temp >= 39
    || (systolicBp > 0 && systolicBp < 100)
  const fractureFlags = {
    head: /^S0[2-6]/.test(diagnosisCode),
    spine_cervical: /^S12/.test(diagnosisCode),
    thorax: /^S2[0-2]/.test(diagnosisCode),
    pelvis: /^S32/.test(diagnosisCode),
    shoulder_left: /^S42/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    shoulder_right: /^S42/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
    upper_arm_left: /^S42/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    upper_arm_right: /^S42/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
    forearm_left: /^S52/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    forearm_right: /^S52/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
    femur_left: /^S72/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    femur_right: /^S72/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
    knee_left: /^S82/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    knee_right: /^S82/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
    lower_leg_left: /^S82/.test(diagnosisCode) && /(links|left|link)/i.test(patient?.chiefComplaint || ''),
    lower_leg_right: /^S82/.test(diagnosisCode) && /(rechts|right|recht)/i.test(patient?.chiefComplaint || ''),
  }
  if (/^S42/.test(diagnosisCode) && !Object.values(fractureFlags).some(Boolean)) {
    fractureFlags.upper_arm_left = true
    fractureFlags.upper_arm_right = true
  }
  if (/^S52/.test(diagnosisCode) && !Object.values(fractureFlags).some(Boolean)) {
    fractureFlags.forearm_left = true
    fractureFlags.forearm_right = true
  }
  if (/^S72/.test(diagnosisCode) && !Object.values(fractureFlags).some(Boolean)) {
    fractureFlags.femur_left = true
    fractureFlags.femur_right = true
  }
  if (/^S82/.test(diagnosisCode) && !Object.values(fractureFlags).some(Boolean)) {
    fractureFlags.lower_leg_left = true
    fractureFlags.lower_leg_right = true
  }
  const combinedCaseText = `${patient?.chiefComplaint || ''} ${patient?.diagnoses?.primary?.name || ''} ${patient?.trueDiagnoses?.primary?.name || ''}`.toLowerCase()
  const isForeignBodyMouthCase = /fremdk|aspiration|bolus|verschluck|atemweg|hals.*fremd|mund.*fremd/i.test(combinedCaseText)
    || /^T17|^T18/.test(diagnosisCode)
  const hasOralCoatingFinding = /angina|tonsill|pharyng|stomat|candida|soor|belag/i.test(combinedCaseText)
    || /^J02|^J03|^B37/.test(diagnosisCode)
  const hasCyanosisMouthFinding = /zyanose|hypox|atemnot|dyspnoe|lungenödem|lungenoedem|schock/i.test(combinedCaseText)
    || (spo2 > 0 && spo2 < 90)
  const respiratoryRateValue = Number(vitals.rr || 0)
  const respiratoryRateFinding = classifyRespiratoryRate(respiratoryRateValue)
  const breathOdorFinding = /alkohol/i.test(combinedCaseText)
    ? 'Atemgeruch: alkoholisch'
    : (/keto|diabet/i.test(combinedCaseText) ? 'Atemgeruch: fruchtig (ketotisch)' : 'Atemgeruch: unauffaellig')
  const addMouthChecks = (entries) => {
    const cleaned = (Array.isArray(entries) ? entries : [entries]).filter(Boolean)
    if (cleaned.length === 0) return
    setMouthChecks((prev) => {
      const next = [...prev]
      for (const entry of cleaned) {
        if (!next.includes(entry)) next.push(entry)
      }
      return next
    })
  }
  const isFemale = patient?.gender === 'weiblich'
  const beFastCaseText = `${patient?.chiefComplaint || ''} ${patient?.diagnoses?.primary?.name || ''} ${patient?.trueDiagnoses?.primary?.name || ''}`.toLowerCase()
  const beFastStepDefs = [
    { id: 'balance', label: 'B - Balance', help: 'Stand/Gangbild beurteilen' },
    { id: 'eyes', label: 'E - Eyes', help: 'Sehen, Blickabweichung, Doppelbilder' },
    { id: 'face', label: 'F - Face', help: 'Mimik/Fazialisparese prüfen' },
    { id: 'arm', label: 'A - Arm', help: 'Armhalteversuch links/rechts' },
    { id: 'speech', label: 'S - Speech', help: 'Sprache/Artikulation beurteilen' },
    { id: 'time', label: 'T - Time', help: 'Symptombeginn erfragen' },
  ]
  const beFastAbnormalByStep = {
    balance: /schwindel|atax|gang|unsicher|neurolog|stroke|schlaganfall/i.test(beFastCaseText),
    eyes: /blick|doppelbild|hemianops|sehst|amaurose|neurolog|stroke|schlaganfall/i.test(beFastCaseText),
    face: /fazialis|gesicht|mundwinkel|facial|neurolog|stroke|schlaganfall/i.test(beFastCaseText),
    arm: /parese|arm.*schwach|hemipare|lähmung|neurolog|stroke|schlaganfall/i.test(beFastCaseText),
    speech: /aphas|dysarth|sprache|wortfind|neurolog|stroke|schlaganfall/i.test(beFastCaseText),
    time: true,
  }
  const runBeFastStep = (stepId) => {
    const stepPos = beFastStepDefs.findIndex((s) => s.id === stepId)
    if (stepPos < 0 || stepPos > beFastStepIndex) return
    if (beFastChecks[stepId]) return
    const abnormal = !!beFastAbnormalByStep[stepId]
    const finding = (() => {
      if (stepId === 'time') {
        return /seit|beginn|uhr|minute|stunde/i.test(beFastCaseText)
          ? 'Symptombeginn anamnestisch erhoben, Zeitfenster dokumentiert.'
          : 'Symptombeginn unklar, Zeitfenster kritisch abzuklären.'
      }
      return abnormal ? 'Auffällig' : 'Unauffällig'
    })()
    setBeFastChecks((prev) => ({
      ...prev,
      [stepId]: { abnormal, finding },
    }))
    setBeFastStepIndex((prev) => Math.min(beFastStepDefs.length - 1, Math.max(prev, stepPos + 1)))
  }
  const auscultationBodyAsset = viewSide === 'chest'
    ? (isFemale ? frontFemaleAsset : frontMaleAsset)
    : (isFemale ? backFemaleAsset : backMaleAsset)
  const generalBodyAsset = bodySide === 'front'
    ? (isFemale ? frontFemaleAsset : frontMaleAsset)
    : (isFemale ? backFemaleAsset : backMaleAsset)

  const buildAuscultationResult = () => {
    if (checkedPoints.length === 0) return null
    const findings = checkedPoints.length > 0 ? checkedPoints.map(p => `${p.label}: ${p.finding}`) : ['Keine standardisierten Punkte dokumentiert']
    return {
      type: 'physical_exam',
      subtype: 'auscultation',
      title: 'Auskultation Thorax',
      summary: findings.join(' | '),
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildPupilsResult = () => {
    const hasData = pupilExam.left.tested || pupilExam.right.tested
    if (!hasData) return null
    const findings = [
      `Pupille links: ${pupilExam.left.baseMm.toFixed(1)}mm -> ${pupilExam.left.reactMm.toFixed(1)}mm, direkt ${pupilExam.left.direct ? 'positiv' : 'negativ'}, konsensuell ${pupilExam.left.consensual ? 'positiv' : 'negativ'}`,
      `Pupille rechts: ${pupilExam.right.baseMm.toFixed(1)}mm -> ${pupilExam.right.reactMm.toFixed(1)}mm, direkt ${pupilExam.right.direct ? 'positiv' : 'negativ'}, konsensuell ${pupilExam.right.consensual ? 'positiv' : 'negativ'}`,
    ]
    return {
      type: 'physical_exam',
      subtype: 'pupils',
      title: 'Pupillenreaktion',
      summary: findings.join(' | '),
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildPalpationResult = () => {
    if (palpated.length === 0) return null
    const findings = palpated.length > 0
      ? palpated.map(p => `${p.label}: ${p.finding}`)
      : ['Keine Palpationszonen dokumentiert']
    return {
      type: 'physical_exam',
      subtype: 'palpation',
      title: 'Palpation Abdomen',
      summary: findings.join(' | '),
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildRecapResult = () => {
    if (recapMeasured == null) return null
    const value = recapMeasured ?? 2.1
    const findings = [`Rekapillarisierungszeit: ${value.toFixed(1)}s`]
    return {
      type: 'physical_exam',
      subtype: 'recap',
      title: 'Rekapillarisierungszeit',
      summary: findings[0],
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildTurgorResult = () => {
    if (turgorMeasured == null) return null
    const value = turgorMeasured ?? 1.2
    const findings = [`Hautturgor: Rückstellzeit ${value.toFixed(1)}s`]
    return {
      type: 'physical_exam',
      subtype: 'skin_turgor',
      title: 'Hautturgor',
      summary: findings[0],
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildMouthBreathResult = () => {
    if (mouthChecks.length === 0) return null
    const findings = mouthChecks.length > 0
      ? mouthChecks
      : ['Mund-/Atemkontrolle ohne Auffälligkeit dokumentiert']
    return {
      type: 'physical_exam',
      subtype: 'mouth_breath',
      title: 'Mund- und Atemkontrolle',
      summary: findings.join(' | '),
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildBoneStabilityResult = () => {
    if (boneChecks.length === 0) return null
    const findings = boneChecks.length > 0 ? boneChecks.map(b => `${b.label}: ${b.finding}`) : ['Keine Stabilitätstests dokumentiert']
    return {
      type: 'physical_exam',
      subtype: 'bone_stability',
      title: 'Knochenstabilität',
      summary: findings.join(' | '),
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const buildBeFastResult = () => {
    const tested = beFastStepDefs
      .map((s) => ({ step: s, result: beFastChecks[s.id] }))
      .filter((entry) => !!entry.result)
    if (tested.length === 0) return null
    const abnormalCount = tested.filter((entry) => entry.result?.abnormal).length
    const findings = tested.map((entry) => `${entry.step.label}: ${entry.result?.finding || 'Unauffällig'}`)
    return {
      type: 'physical_exam',
      subtype: 'be_fast',
      title: 'BE-FAST Schlaganfall-Screening',
      summary: `BE-FAST positiv in ${abnormalCount}/${tested.length} Punkten`,
      findings,
      note: examNote.trim() || null,
      time: new Date().toISOString(),
    }
  }

  const traumaContext = `${patient?.chiefComplaint || ''} ${patient?.diagnoses?.primary?.name || ''} ${patient?.trueDiagnoses?.primary?.name || ''}`.toLowerCase()
  const groupKeywordMatchers = {
    head: /schädel|gesicht|nase|orbita|kiefer|kopf/i,
    spine_cervical: /hws|hals|nacken|zervikal/i,
    thorax: /rippe|thorax|brustkorb|sternum/i,
    pelvis: /becken|hüfte|acetabul/i,
    shoulder_left: /(link|links).*(schulter|clavicula|humerus)|(schulter|clavicula|humerus).*(link|links)/i,
    shoulder_right: /(recht|rechts).*(schulter|clavicula|humerus)|(schulter|clavicula|humerus).*(recht|rechts)/i,
    upper_arm_left: /(link|links).*(oberarm|humerus)|(oberarm|humerus).*(link|links)/i,
    upper_arm_right: /(recht|rechts).*(oberarm|humerus)|(oberarm|humerus).*(recht|rechts)/i,
    forearm_left: /(link|links).*(unterarm|radius|ulna|handgelenk)|(unterarm|radius|ulna|handgelenk).*(link|links)/i,
    forearm_right: /(recht|rechts).*(unterarm|radius|ulna|handgelenk)|(unterarm|radius|ulna|handgelenk).*(recht|rechts)/i,
    femur_left: /(link|links).*(femur|oberschenkel|schenkelhals)|(femur|oberschenkel|schenkelhals).*(link|links)/i,
    femur_right: /(recht|rechts).*(femur|oberschenkel|schenkelhals)|(femur|oberschenkel|schenkelhals).*(recht|rechts)/i,
    knee_left: /(link|links).*(knie|tibia)|(knie|tibia).*(link|links)/i,
    knee_right: /(recht|rechts).*(knie|tibia)|(knie|tibia).*(recht|rechts)/i,
    lower_leg_left: /(link|links).*(unterschenkel|tibia|fibula|sprunggelenk)|(unterschenkel|tibia|fibula|sprunggelenk).*(link|links)/i,
    lower_leg_right: /(recht|rechts).*(unterschenkel|tibia|fibula|sprunggelenk)|(unterschenkel|tibia|fibula|sprunggelenk).*(recht|rechts)/i,
  }
  const getBoneFindingForZone = (zone) => {
    const isFractureLikely = Boolean(fractureFlags[zone.group]) || Boolean(groupKeywordMatchers[zone.group]?.test(traumaContext))
    if (isFractureLikely) {
      return { finding: 'Deutlicher Druck-/Stauchungsschmerz, Frakturverdacht in diesem Areal', abnormal: true }
    }
    if (isTraumaCase) return { finding: 'Leicht druckdolent, jedoch stabil ohne Krepitation', abnormal: false }
    return { finding: 'Stabil ohne Krepitation', abnormal: false }
  }

  const collectedResults = useMemo(() => {
    return [
      buildAuscultationResult(),
      buildPupilsResult(),
      buildPalpationResult(),
      buildRecapResult(),
      buildTurgorResult(),
      buildMouthBreathResult(),
      buildBoneStabilityResult(),
      buildBeFastResult(),
    ].filter(Boolean)
  }, [checkedPoints, pupilExam, palpated, recapMeasured, turgorMeasured, mouthChecks, boneChecks, beFastChecks, examNote])

  const saveAllResults = () => {
    if (collectedResults.length === 0) return
    onSave?.(collectedResults)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        <div className="w-72 border-r border-surface-200 p-4 space-y-2 bg-surface-50/50">
          <h3 className="font-bold text-surface-900 text-sm">{title}</h3>
          <p className="text-xs text-surface-500 mb-3">{patient?.name}</p>
          {isExamAllowed('auscultation') && (
            <button onClick={() => setActiveExam('auscultation')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'auscultation' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Stethoscope className="w-4 h-4" /> Auskultation</div>
              <p className="text-xs mt-1 text-surface-500">Thorax vorn/hinten abhorchen</p>
            </button>
          )}
          {isExamAllowed('pupils') && (
            <button onClick={() => setActiveExam('pupils')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'pupils' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Eye className="w-4 h-4" /> Pupillen</div>
              <p className="text-xs mt-1 text-surface-500">Lichtreaktion prüfen</p>
            </button>
          )}
          {isExamAllowed('palpation') && (
            <button onClick={() => setActiveExam('palpation')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'palpation' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Hand className="w-4 h-4" /> Palpation</div>
              <p className="text-xs mt-1 text-surface-500">Abdomen quadrantenweise prüfen</p>
            </button>
          )}
          {isExamAllowed('recap') && (
            <button onClick={() => setActiveExam('recap')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'recap' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Clock className="w-4 h-4" /> Rekap</div>
              <p className="text-xs mt-1 text-surface-500">Kapillarfüllung messen</p>
            </button>
          )}
          {isExamAllowed('skin_turgor') && (
            <button onClick={() => setActiveExam('skin_turgor')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'skin_turgor' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Hand className="w-4 h-4" /> Hautturgor</div>
              <p className="text-xs mt-1 text-surface-500">Rückstellzeit der Hautfalte</p>
            </button>
          )}
          {isExamAllowed('mouth_breath') && (
            <button onClick={() => setActiveExam('mouth_breath')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'mouth_breath' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Wind className="w-4 h-4" /> Mund / Atem</div>
              <p className="text-xs mt-1 text-surface-500">Atemweg, Mundraum, Geruch</p>
            </button>
          )}
          {isExamAllowed('bone_stability') && (
            <button onClick={() => setActiveExam('bone_stability')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'bone_stability' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Activity className="w-4 h-4" /> Knochenstabilität</div>
              <p className="text-xs mt-1 text-surface-500">Stabilität in kritischen Regionen</p>
            </button>
          )}
          {isExamAllowed('be_fast') && (
            <button onClick={() => setActiveExam('be_fast')} className={`w-full text-left p-3 rounded-xl border ${activeExam === 'be_fast' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-surface-200 hover:bg-surface-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><Brain className="w-4 h-4" /> BE-FAST Test</div>
              <p className="text-xs mt-1 text-surface-500">Neurologisches Stroke-Screening</p>
            </button>
          )}
          <div className="pt-3 mt-3 border-t border-surface-200">
            <p className="text-xs text-surface-500 mb-1">Freitext</p>
            <textarea value={examNote} onChange={(e) => setExamNote(e.target.value)} className="input-field !h-24 resize-none text-sm" placeholder="Zusätzliche Befunde..." />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-surface-900">
              {activeExam === 'auscultation' && 'Auskultation-Minigame'}
              {activeExam === 'pupils' && 'Pupillen-Minigame'}
              {activeExam === 'palpation' && 'Palpation-Minigame'}
              {activeExam === 'recap' && 'Rekapillarisierungszeit'}
              {activeExam === 'skin_turgor' && 'Hautturgor-Messung'}
              {activeExam === 'mouth_breath' && 'Mund- und Atemkontrolle'}
              {activeExam === 'bone_stability' && 'Knochenstabilität'}
              {activeExam === 'be_fast' && 'BE-FAST Test'}
            </p>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-400" /></button>
          </div>

          {activeExam === 'auscultation' ? (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <div className="flex gap-2">
                <button onClick={() => setViewSide('chest')} className={`px-3 py-1.5 rounded-lg text-xs ${viewSide === 'chest' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Thorax vorne</button>
                <button onClick={() => setViewSide('back')} className={`px-3 py-1.5 rounded-lg text-xs ${viewSide === 'back' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Thorax hinten</button>
              </div>
              <div
                className="relative flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white overflow-hidden"
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return
                  const pos = toLocalPos(e, e.currentTarget)
                  setToolPos(pos)
                }}
                onClick={(e) => {
                  const pos = toLocalPos(e, e.currentTarget)
                  setToolPos(pos)
                }}
              >
                <img src={auscultationBodyAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                {auscultationTargets.map(t => (
                  <div key={t.id} className="absolute w-3 h-3 rounded-full bg-primary-300/70" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)' }} />
                ))}
                <div className="absolute" style={{ left: `${toolPos.x}%`, top: `${toolPos.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <img src={stethoscopeToolAsset} alt="Stethoskop" className="w-16 h-16 drop-shadow-md select-none pointer-events-none object-contain" draggable={false} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-surface-500">
                  {nearestTarget ? `Zielpunkt: ${nearestTarget.label}` : 'Stethoskop auf einen markierten Punkt setzen'}
                </div>
                <button
                  onClick={() => {
                    if (!nearestTarget || checkedPoints.some(p => p.id === nearestTarget.id)) return
                    setCheckedPoints(prev => [...prev, nearestTarget])
                  }}
                  disabled={!nearestTarget || checkedPoints.some(p => p.id === nearestTarget.id)}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  Punkt auswerten
                </button>
              </div>
              <div className="max-h-28 overflow-y-auto rounded-xl border border-surface-200 p-2 space-y-1">
                {checkedPoints.length === 0 ? (
                  <p className="text-xs text-surface-400">Noch keine Befunde dokumentiert.</p>
                ) : checkedPoints.map(p => (
                  <div key={p.id} className="text-xs text-surface-700"><span className="font-semibold">{p.label}:</span> {p.finding}</div>
                ))}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : activeExam === 'pupils' ? (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <div className="relative flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-slate-100 via-white to-slate-50 overflow-hidden"
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return
                  setLampPos(toLocalPos(e, e.currentTarget))
                }}
                onClick={(e) => setLampPos(toLocalPos(e, e.currentTarget))}
              >
                <img src={eyesOpenAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                {(lampOnLeft || lampOnRight) && (
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon
                      points={`${lampPos.x},${lampPos.y} ${lampOnLeft ? 31 : 54},35 ${lampOnLeft ? 45 : 68},53`}
                      fill="#fde68a"
                      opacity="0.24"
                    />
                  </svg>
                )}
                <div className="absolute left-[22%] top-[44%] w-24 h-24 rounded-full bg-transparent flex items-center justify-center pointer-events-none">
                  <div className={`rounded-full bg-slate-900 transition-all duration-200 shadow-sm ${leftPupilNarrow ? 'w-3 h-3' : 'w-5 h-5'}`} />
                </div>
                <div className="absolute left-[64.3%] top-[44%] w-24 h-24 rounded-full bg-transparent flex items-center justify-center pointer-events-none">
                  <div className={`rounded-full bg-slate-900 transition-all duration-200 shadow-sm ${rightPupilNarrow ? 'w-3 h-3' : 'w-5 h-5'}`} />
                </div>
                <div className="absolute" style={{ left: `${lampPos.x}%`, top: `${lampPos.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <svg viewBox="0 0 72 72" className="w-12 h-12 drop-shadow-md">
                    <rect x="24" y="14" width="24" height="34" rx="7" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
                    <rect x="20" y="46" width="32" height="12" rx="6" fill="#374151" />
                    <circle cx="36" cy="20" r="5" fill="#fde68a" />
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-lg p-2 border ${pupilExam.left.tested ? 'bg-accent-50 border-accent-200 text-accent-700' : 'bg-surface-50 border-surface-200 text-surface-500'}`}>
                  <p className="font-semibold">Links</p>
                  <p>{pupilExam.left.tested ? `${pupilExam.left.baseMm.toFixed(1)} -> ${pupilExam.left.reactMm.toFixed(1)} mm` : 'Noch nicht getestet'}</p>
                  <p>Direkt: {pupilExam.left.direct ? 'positiv' : 'offen'} • Konsensuell: {pupilExam.left.consensual ? 'positiv' : 'offen'}</p>
                </div>
                <div className={`rounded-lg p-2 border ${pupilExam.right.tested ? 'bg-accent-50 border-accent-200 text-accent-700' : 'bg-surface-50 border-surface-200 text-surface-500'}`}>
                  <p className="font-semibold">Rechts</p>
                  <p>{pupilExam.right.tested ? `${pupilExam.right.baseMm.toFixed(1)} -> ${pupilExam.right.reactMm.toFixed(1)} mm` : 'Noch nicht getestet'}</p>
                  <p>Direkt: {pupilExam.right.direct ? 'positiv' : 'offen'} • Konsensuell: {pupilExam.right.consensual ? 'positiv' : 'offen'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!lampOnLeft) return
                      setPupilExam(prev => ({
                        ...prev,
                        left: { ...prev.left, tested: true, direct: true, baseMm: 5.0, reactMm: 3.0 },
                        right: { ...prev.right, tested: prev.right.tested, consensual: !likelyPathologicPupils, baseMm: 5.1, reactMm: !likelyPathologicPupils ? 3.4 : prev.right.reactMm },
                      }))
                    }}
                    className="btn-secondary text-xs"
                  >
                    Licht links testen
                  </button>
                  <button
                    onClick={() => {
                      if (!lampOnRight) return
                      setPupilExam(prev => ({
                        ...prev,
                        right: { ...prev.right, tested: true, direct: true, baseMm: 5.0, reactMm: 3.0 },
                        left: { ...prev.left, tested: prev.left.tested, consensual: !likelyPathologicPupils, baseMm: 4.9, reactMm: !likelyPathologicPupils ? 3.3 : prev.left.reactMm },
                      }))
                    }}
                    className="btn-secondary text-xs"
                  >
                    Licht rechts testen
                  </button>
                </div>
                <button
                  onClick={() => {
                    setPupilExam({
                      left: { tested: false, direct: false, consensual: false, baseMm: 5.0, reactMm: 3.0 },
                      right: { tested: false, direct: false, consensual: false, baseMm: 5.0, reactMm: 3.0 },
                    })
                  }}
                  className="btn-secondary text-xs"
                >
                  Pupillenbefund reset
                </button>
              </div>
              <p className="text-xs text-surface-500">Setze die Lampe gezielt auf ein Auge und trigger den Testbutton fuer direkte/konsensuelle Reaktion.</p>
            </div>
          ) : activeExam === 'palpation' ? (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <div className="flex gap-2">
                <button onClick={() => setBodySide('front')} className={`px-3 py-1.5 rounded-lg text-xs ${bodySide === 'front' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Vorderseite</button>
                <button onClick={() => setBodySide('back')} className={`px-3 py-1.5 rounded-lg text-xs ${bodySide === 'back' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Rückseite</button>
              </div>
              <div className="relative flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white overflow-hidden">
                <img src={generalBodyAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                {palpationZones.map(z => {
                  const checked = palpated.some(p => p.id === z.id)
                  return (
                    <button
                      key={z.id}
                      onClick={() => {
                        if (checked) return
                        let finding = 'Weich, keine Abwehrspannung'
                        if (bodySide === 'front' && isAbdCase && (z.id === 'front_rlq' || z.id === 'front_ruq')) {
                          finding = 'Druckschmerzhaft'
                        }
                        if (bodySide === 'back') {
                          if (isKidneyInfectionCase && (z.id === 'back_cva_left' || z.id === 'back_cva_right')) {
                            finding = 'Deutlicher Klopfschmerz über dem Nierenlager'
                          } else {
                            finding = 'Kein relevanter Klopf-/Druckschmerz'
                          }
                        }
                        setPalpated(prev => [...prev, { ...z, finding }])
                      }}
                      className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border text-[10px] font-semibold ${checked ? 'bg-accent-100 border-accent-300 text-accent-700' : 'bg-white/90 border-surface-300 hover:border-primary-300'}`}
                      style={{ left: `${z.x}%`, top: `${z.y}%` }}
                    >
                      <Hand className="w-4 h-4 mx-auto" />
                    </button>
                  )
                })}
              </div>
              <div className="rounded-xl border border-surface-200 p-2 max-h-28 overflow-y-auto">
                {(palpated.filter(p => bodySide === 'front' ? p.id.startsWith('front_') : p.id.startsWith('back_'))).length === 0
                  ? <p className="text-xs text-surface-400">Noch keine Zone geprüft.</p>
                  : palpated
                    .filter(p => bodySide === 'front' ? p.id.startsWith('front_') : p.id.startsWith('back_'))
                    .map(p => <p key={p.id} className="text-xs"><span className="font-semibold">{p.label}:</span> {p.finding}</p>)}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : activeExam === 'recap' ? (
            <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
              <div className="rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white p-5">
                <p className="text-sm text-surface-700 mb-3">Drücke 2 Sekunden auf die Fingerbeere, um die Rekapillarisierungszeit zu messen.</p>
                <div className="h-56 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center">
                  <button
                    onMouseDown={() => {
                      const delay = perfusionRisk ? (3.0 + Math.random() * 1.6) : (1.1 + Math.random() * 1.2)
                      setTimeout(() => setRecapMeasured(+delay.toFixed(1)), 700)
                    }}
                    className="w-40 h-40 rounded-2xl bg-white border border-surface-200 flex items-center justify-center shadow-sm"
                  >
                    <img src={recapHandAsset} alt="Hand" className="w-28 h-28 object-contain select-none pointer-events-none" draggable={false} />
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-surface-200 p-3 text-sm">
                {recapMeasured == null ? 'Noch keine Messung.' : `Gemessene Rekap-Zeit: ${recapMeasured.toFixed(1)}s`}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : activeExam === 'skin_turgor' ? (
            <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
              <div className="flex gap-2">
                <button onClick={() => setBodySide('front')} className={`px-3 py-1.5 rounded-lg text-xs ${bodySide === 'front' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Vorderseite</button>
                <button onClick={() => setBodySide('back')} className={`px-3 py-1.5 rounded-lg text-xs ${bodySide === 'back' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>Rückseite</button>
              </div>
              <div className="rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white p-5">
                <p className="text-sm text-surface-700 mb-3">Klicke auf die markierte Hautfalte, um die Rückstellzeit zu messen.</p>
                <div className="relative h-56 rounded-xl bg-surface-100 border border-surface-200 overflow-hidden">
                  <img src={generalBodyAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                  <button
                    onClick={() => {
                      const delay = dehydrationRisk ? (2.1 + Math.random() * 1.4) : (0.8 + Math.random() * 0.9)
                      setTurgorMeasured(+delay.toFixed(1))
                    }}
                    className="absolute left-1/2 top-[66%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-100/95 border-2 border-amber-300 text-amber-700 flex items-center justify-center"
                  >
                    <Hand className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-surface-200 p-3 text-sm">
                {turgorMeasured == null ? 'Noch keine Messung.' : `Rückstellzeit: ${turgorMeasured.toFixed(1)}s`}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : activeExam === 'mouth_breath' ? (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <div className="relative flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white p-4">
                <div className="h-full flex flex-col gap-3">
                  <div className="rounded-xl border border-surface-200 bg-white p-3">
                    <p className="text-xs text-surface-500 mb-2">Mundinspektion (Hauptansicht)</p>
                    <div className="relative h-[410px] rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={isForeignBodyMouthCase ? mouthLegostoneAsset : mouthMainAsset}
                        alt="Mundraum"
                        className="h-full w-auto object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                      {hasCyanosisMouthFinding && (
                        <div className="absolute bottom-[18%] left-[25%] right-[25%] h-[14%] rounded-full bg-sky-700/28 blur-[1px] pointer-events-none" />
                      )}
                      {hasOralCoatingFinding && !isForeignBodyMouthCase && (
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                          <ellipse cx="49" cy="55" rx="8" ry="3" fill="#f8fafc" opacity="0.8" />
                          <ellipse cx="55" cy="58" rx="6" ry="2.6" fill="#f8fafc" opacity="0.75" />
                          <ellipse cx="43" cy="59" rx="5.8" ry="2.5" fill="#f8fafc" opacity="0.7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-surface-200 bg-white p-3 flex flex-wrap gap-2 mt-auto">
                    <button
                      onClick={() => {
                        const findings = [
                          isForeignBodyMouthCase
                            ? 'Mundraum: Fremdkoerper sichtbar, partielle Atemwegsverlegung moeglich'
                            : 'Mundraum: frei einsehbar ohne mechanische Verlegung',
                          hasOralCoatingFinding
                            ? 'Schleimhaut: Belaege sichtbar'
                            : 'Schleimhaut: reizlos, keine Belaege',
                          hasCyanosisMouthFinding
                            ? 'Lippen/Schleimhaut: zyanotischer Eindruck'
                            : 'Lippen/Schleimhaut: rosig',
                        ]
                        addMouthChecks(findings)
                      }}
                      className="rounded-xl border border-surface-200 hover:border-primary-300 bg-white px-3 py-2 text-sm font-medium text-surface-800"
                    >
                      Mundinspektion speichern
                    </button>
                    <button
                      onClick={() => {
                        addMouthChecks([
                          breathOdorFinding,
                          `Atemfrequenz: ${respiratoryRateFinding}`,
                          isForeignBodyMouthCase ? 'Atemweg: Fremdkoerper/Obstruktion klinisch mitbeurteilen' : 'Atemweg: klinisch frei',
                        ])
                      }}
                      className="rounded-xl border border-cyan-200 hover:border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-900"
                    >
                      Atemkontrolle durchfuehren
                    </button>
                    <p className="text-[11px] text-surface-500 w-full">
                      Ergebnisse erscheinen erst nach Button-Klick im Dokumentations-Log unten.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-surface-200 p-2 max-h-28 overflow-y-auto">
                {mouthChecks.length === 0 ? <p className="text-xs text-surface-400">Noch keine Checks dokumentiert.</p> : mouthChecks.map((c, i) => <p key={i} className="text-xs">{c}</p>)}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : activeExam === 'be_fast' ? (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-900">Schritt-für-Schritt BE-FAST</p>
                <p className="text-xs text-indigo-700 mt-1">
                  Führe die Punkte nacheinander durch. Auffällige Befunde erhöhen die Schlaganfall-Wahrscheinlichkeit.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
                {beFastStepDefs.map((step, idx) => {
                  const done = !!beFastChecks[step.id]
                  const isCurrent = idx === beFastStepIndex
                  const disabled = !done && idx > beFastStepIndex
                  const abnormal = !!beFastChecks[step.id]?.abnormal
                  return (
                    <button
                      key={step.id}
                      onClick={() => runBeFastStep(step.id)}
                      disabled={disabled}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        done
                          ? (abnormal ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50')
                          : isCurrent
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-surface-200 bg-white'
                      } disabled:opacity-55`}
                    >
                      <p className="text-sm font-semibold text-surface-900">{step.label}</p>
                      <p className="text-xs text-surface-600 mt-1">{step.help}</p>
                      <p className={`text-xs mt-2 ${abnormal ? 'text-red-700' : 'text-surface-500'}`}>
                        {done ? beFastChecks[step.id]?.finding : (isCurrent ? 'Jetzt prüfen' : 'Noch gesperrt')}
                      </p>
                    </button>
                  )
                })}
              </div>
              <div className="rounded-xl border border-surface-200 p-2">
                <p className="text-xs text-surface-600">
                  Positiv: {Object.values(beFastChecks).filter((v) => v?.abnormal).length} / {Object.values(beFastChecks).filter(Boolean).length || 0}
                </p>
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          ) : (
            <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
              <p className="text-xs text-surface-500">
                Ganzkörper-Skelettstatus: auf die markierten Regionen klicken und Stabilität prüfen.
              </p>
              <div className="relative flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white overflow-hidden">
                <img src={bonesAsset} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none p-2" draggable={false} />
                {boneZones.map(z => {
                  const checked = boneChecks.some(b => b.id === z.id)
                  return (
                    <button
                      key={z.id}
                      onClick={() => {
                        if (checked) return
                        const evalResult = getBoneFindingForZone(z)
                        setBoneChecks(prev => [...prev, { ...z, finding: evalResult.finding, abnormal: !!evalResult.abnormal }])
                      }}
                      className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                        checked
                          ? (boneChecks.find(b => b.id === z.id)?.abnormal
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-green-100 border-green-300 text-green-700')
                          : 'bg-white border-surface-300 hover:border-primary-300'
                      }`}
                      style={{ left: `${z.x}%`, top: `${z.y}%` }}
                      title={z.label}
                    >
                      <Activity className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  )
                })}
              </div>
              <div className="rounded-xl border border-surface-200 p-2 max-h-28 overflow-y-auto">
                {boneChecks.length === 0 ? <p className="text-xs text-surface-400">Noch keine Stabilitätstests dokumentiert.</p> : boneChecks.map(b => <p key={b.id} className="text-xs"><span className="font-semibold">{b.label}:</span> {b.finding}</p>)}
              </div>
              <p className="text-xs text-surface-500 self-end">Befund bleibt beim Tabwechsel erhalten.</p>
            </div>
          )}
          <div className="px-4 py-3 border-t border-surface-200 flex items-center justify-between bg-surface-50">
            <p className="text-xs text-surface-600">{collectedResults.length} Untersuchung{collectedResults.length !== 1 ? 'en' : ''} dokumentiert</p>
            <button onClick={saveAllResults} disabled={collectedResults.length === 0} className="btn-primary text-sm disabled:opacity-50">
              <Check className="w-4 h-4" /> Alles speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

