import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, Play, Send, WandSparkles, X } from 'lucide-react'
import maleMiddleCasual from '../assets/room-v2/male-middle-casual.png'
import femaleMiddleCasual from '../assets/room-v2/female-middle-casual.png'
import xraySound from '../assets/sfx/xray.mp3'
import mrtSound from '../assets/sfx/mrt.mp3'
import { playOneShot } from '../utils/soundManager'
import { getDiagnosticRoomBackground, pickDiagnosticCaptureImage } from '../data/diagnosticImagingAssets'
import { buildDiagnosticPlaceholderImage, getOrderModality } from '../data/ordersCatalog'
import HklPtcaMinigame from './HklPtcaMinigame'

function detectRoomModality(equipmentId) {
  const id = String(equipmentId || '').toLowerCase()
  if (id.includes('xray')) return 'xray'
  if (id.includes('mri')) return 'mri'
  if (id.includes('ct')) return 'ct'
  if (id.includes('hkl')) return 'hkl'
  return null
}

function matchesRoomEquipment(orderEquipment, roomEquipmentId) {
  if (!orderEquipment) return true
  if (orderEquipment === roomEquipmentId) return true
  const isXrayRoom = String(roomEquipmentId || '').includes('xray_')
  const isXrayOrderEquipment = String(orderEquipment || '').includes('xray_')
  return isXrayRoom && isXrayOrderEquipment
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

const HEAD_CT_FIXED_PATHOLOGY_ROI = {
  xPct: 46.51,
  yPct: 34.32,
  wPct: 5.68,
  hPct: 23.4,
}
const CT_PATHOLOGY_DEBUG_DEFAULTS = {
  sliceSpread: 0.11,
  maxOpacityBleed: 0.72,
  maxOpacityIschemia: 0.42,
}
const HEAD_CT_PATHOLOGY_CENTER_T = 63 / 234
// Quick rollback switch:
// - 'baseline': original full anatomical blend
// - 'roi_reposition': same blend styling, but lesion placement constrained to ROI area
const CT_HEAD_PATHOLOGY_RENDER_MODE = 'roi_reposition'
function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)))
}
function smoothstep01(value) {
  const v = clamp01(value)
  return v * v * (3 - (2 * v))
}
function hashText(value) {
  const text = String(value || '')
  let hash = 2166136261
  for (let idx = 0; idx < text.length; idx += 1) {
    hash ^= text.charCodeAt(idx)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
function seededUnit(seed, salt) {
  return (hashText(`${seed}|${salt}`) % 1000000) / 999999
}

function getCtRegionFromProtocol(protocol) {
  const key = String(protocol || '').toLowerCase()
  if (key === 'ct_thorax') return 'thorax'
  if (key === 'ct_abdomen') return 'abdomen'
  if (key === 'ct_angio') return 'angio'
  return 'kopf'
}

function buildDevCtRoiShapes({ region, preset }) {
  if (region === 'kopf') {
    // Fixed ROI from in-game debug export: use same region for bleed/ischemia on all slices.
    const fixedHeadRoi = { type: 'rect', x: 46.51, y: 34.32, w: 5.68, h: 23.4, label: 'Generator-ROI Kopf' }
    if (preset === 'bleed' || preset === 'ischemia') return [fixedHeadRoi]
    return [fixedHeadRoi]
  }
  if (region === 'thorax') {
    if (preset === 'pneumothorax') {
      return [{ type: 'rect', x: 12, y: 22, w: 15, h: 55, label: 'ROI Pneumothorax' }]
    }
    return [{ type: 'ellipse', cx: 66, cy: 61, rx: 14, ry: 16, label: 'ROI Pneumonie' }]
  }
  if (region === 'abdomen') {
    if (preset === 'pancreatitis') {
      return [{ type: 'ellipse', cx: 50, cy: 58, rx: 14, ry: 8, label: 'ROI Pankreas' }]
    }
    if (preset === 'ileus') {
      return [
        { type: 'ellipse', cx: 47, cy: 62, rx: 10, ry: 9, label: 'ROI Darmschlinge' },
        { type: 'ellipse', cx: 58, cy: 69, rx: 8, ry: 8, label: 'ROI Darmschlinge' },
      ]
    }
    return [{ type: 'ellipse', cx: 62, cy: 70, rx: 6, ry: 7, label: 'ROI Appendix' }]
  }
  return []
}

export default function DiagnosticRoomView({
  roomEntry,
  hospital,
  onClose,
  onOpenPatientFile,
  onOrderAction,
  onUpsertDocument,
  onClinicalProcedureEffect,
}) {
  const modality = detectRoomModality(roomEntry?.equipmentId)
  const [busy, setBusy] = useState(false)
  const [captureModalOpen, setCaptureModalOpen] = useState(false)
  const [captureImage, setCaptureImage] = useState(null)
  const [ctSeriesFrames, setCtSeriesFrames] = useState([])
  const [ctSliceIndex, setCtSliceIndex] = useState(0)
  const [ctWindowLevel, setCtWindowLevel] = useState(50)
  const [ctWindowWidth, setCtWindowWidth] = useState(70)
  const [ctInvert, setCtInvert] = useState(false)
  const [ctCinePlay, setCtCinePlay] = useState(false)
  const [ctMaskHealthyFailed, setCtMaskHealthyFailed] = useState(false)
  const [showDevRoiOverlay, setShowDevRoiOverlay] = useState(false)
  const [ctPathologyDebugEnabled, setCtPathologyDebugEnabled] = useState(false)
  const [ctPathologyDebugStart, setCtPathologyDebugStart] = useState(null)
  const [ctPathologyDebugCursor, setCtPathologyDebugCursor] = useState(null)
  const [ctPathologyDebugRects, setCtPathologyDebugRects] = useState([])
  const [ctPathologyDebugCopyState, setCtPathologyDebugCopyState] = useState('')
  const [ctPathologySliceSpread, setCtPathologySliceSpread] = useState(CT_PATHOLOGY_DEBUG_DEFAULTS.sliceSpread)
  const [ctPathologyMaxOpacityBleed, setCtPathologyMaxOpacityBleed] = useState(CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityBleed)
  const [ctPathologyMaxOpacityIschemia, setCtPathologyMaxOpacityIschemia] = useState(CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityIschemia)
  const [reportFields, setReportFields] = useState({
    befund: '',
    beurteilung: '',
    diagnose: '',
    signature: '',
  })
  const [lastSubmittedResult, setLastSubmittedResult] = useState(null)
  const [hklPtcaCaptures, setHklPtcaCaptures] = useState([])
  const [hklPtcaLog, setHklPtcaLog] = useState([])
  const [hklPtcaSessionKey, setHklPtcaSessionKey] = useState(0)

  const [xrayControls, setXrayControls] = useState({
    strahlenschutz: 0,
    markerSide: '',
    marker: false,
    sicherung: 0,
    projektion: 'ap',
    kv: 72,
    mas: 8,
    sid: 110,
  })
  const [mriControls, setMriControls] = useState({
    metallscan: 50,
    metallcheck: false,
    gehoerschutz: 0,
    notfallklingel: false,
    sequenz: 't2',
    schichtdicke: 4,
    felderstaerke: '1.5t',
  })
  const [ctControls, setCtControls] = useState({
    identityCheck: false,
    contrastCheck: false,
    breathHold: 0,
    protocol: 'ct_schaedel',
    sliceThickness: 3,
    windowPreset: 'weichteil',
  })
  const [hklControls, setHklControls] = useState({
    sterileField: 0,
    timeoutDone: false,
    monitorConnected: false,
    accessSite: 'radial',
    projection: 'lao',
    contrastMl: 80,
  })
  const [message, setMessage] = useState(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  })
  const holdTimersRef = useRef({ shield: null, mriEar: null })
  const viewerRef = useRef(null)
  const [annotationTool, setAnnotationTool] = useState('pan')
  const [annotationLabel, setAnnotationLabel] = useState('L')
  const [annotationStrokes, setAnnotationStrokes] = useState([])
  const [currentStroke, setCurrentStroke] = useState(null)
  const [annotationLabels, setAnnotationLabels] = useState([])
  const [measureDraftStart, setMeasureDraftStart] = useState(null)
  const [measurementLines, setMeasurementLines] = useState([])

  const roomBackground = getDiagnosticRoomBackground(modality)
  const allPatients = hospital?.patients || []
  const allOrders = useMemo(
    () => allPatients.flatMap((p) => (p.orders || []).map((o) => ({ patient: p, order: o }))),
    [allPatients],
  )

  const roomOrders = useMemo(() => allOrders
    .filter(({ order }) => {
      const canonicalStation = getOrderModality(order?.modality)?.station || order?.station
      return String(canonicalStation || '') === String(roomEntry?.stationId || '')
    })
    .filter(({ order }) => String(order?.modality || '') === String(modality || ''))
    .filter(({ order }) => matchesRoomEquipment(order?.requiredEquipment, roomEntry?.equipmentId))
    .filter(({ order }) => !['completed', 'cancelled'].includes(String(order?.status || '').toLowerCase()))
    .sort((a, b) => Date.parse(b.order?.createdAt || '') - Date.parse(a.order?.createdAt || '')),
  [allOrders, roomEntry?.stationId, roomEntry?.equipmentId, modality])

  const roomPatient = roomEntry?.patient
    || allPatients.find((p) => (
      p.status === 'in_diagnostics'
      && p.diagnosticStation === roomEntry?.stationId
      && matchesRoomEquipment(p.diagnosticEquipment, roomEntry?.equipmentId)
    ))
    || null

  const activeOrder = useMemo(() => {
    if (!roomPatient) return null
    const patientOrders = (roomPatient.orders || [])
      .filter((o) => String(o?.modality || '') === String(modality || ''))
      .filter((o) => matchesRoomEquipment(o?.requiredEquipment, roomEntry?.equipmentId))
      .filter((o) => !['completed', 'cancelled'].includes(String(o?.status || '').toLowerCase()))
    return patientOrders.find((o) => o.status === 'in_progress')
      || patientOrders.find((o) => o.status === 'accepted')
      || patientOrders.find((o) => o.status === 'open')
      || null
  }, [roomPatient, roomEntry?.equipmentId, modality])
  const activePatientId = useMemo(() => {
    const candidate = String(roomPatient?.id || '')
    if (candidate && allPatients.some((p) => String(p?.id || '') === candidate)) return candidate
    if (activeOrder?.id) {
      const owner = allPatients.find((p) => (p.orders || []).some((o) => o.id === activeOrder.id))
      if (owner?.id) return owner.id
    }
    return null
  }, [roomPatient?.id, activeOrder?.id, allPatients])

  const patientSprite = String(roomPatient?.gender || '').toLowerCase().startsWith('w')
    ? femaleMiddleCasual
    : maleMiddleCasual

  const controlsReady = modality === 'xray'
    ? (xrayControls.strahlenschutz >= 100 && xrayControls.marker && xrayControls.sicherung >= 100)
    : modality === 'mri'
      ? (mriControls.metallcheck && mriControls.gehoerschutz >= 100 && mriControls.notfallklingel)
      : modality === 'ct'
        ? (ctControls.identityCheck && ctControls.contrastCheck && ctControls.breathHold >= 100)
        : modality === 'hkl'
          ? (hklControls.sterileField >= 100 && hklControls.timeoutDone && hklControls.monitorConnected)
          : false
  const checkScore = modality === 'xray'
    ? [xrayControls.strahlenschutz >= 100, xrayControls.marker, xrayControls.sicherung >= 100].filter(Boolean).length
    : modality === 'mri'
      ? [mriControls.metallcheck, mriControls.gehoerschutz >= 100, mriControls.notfallklingel].filter(Boolean).length
      : modality === 'ct'
        ? [ctControls.identityCheck, ctControls.contrastCheck, ctControls.breathHold >= 100].filter(Boolean).length
        : modality === 'hkl'
          ? [hklControls.sterileField >= 100, hklControls.timeoutDone, hklControls.monitorConnected].filter(Boolean).length
          : 0

  const activeControls = modality === 'xray'
    ? xrayControls
    : modality === 'mri'
      ? mriControls
      : modality === 'ct'
        ? ctControls
        : hklControls
  const isDevCtPreview = modality === 'ct' && String(activeOrder?.controls?.source || '').toLowerCase() === 'dev_ct_preview'
  const devCtRegion = getCtRegionFromProtocol(activeOrder?.controls?.protocol || ctControls.protocol)
  const devCtPreset = String(captureImage?.pathologyPreset || activeOrder?.controls?.ctForcePreset || '').toLowerCase()
  const devCtRoiShapes = useMemo(
    () => buildDevCtRoiShapes({ region: devCtRegion, preset: devCtPreset }),
    [devCtRegion, devCtPreset],
  )
  const ctHeadPathologyMask = useMemo(() => {
    if (modality !== 'ct') return null
    if (getCtRegionFromProtocol(ctControls?.protocol) !== 'kopf') return null
    const rawSrc = String(captureImage?.src || '')
    if (!rawSrc) return null
    const lower = rawSrc.toLowerCase()
    const isPathologic = lower.includes('/imaging/ct/kopf/krank/')
    const preset = String(captureImage?.pathologyPreset || activeOrder?.controls?.ctForcePreset || '').toLowerCase()
    const canUseFixedMask = preset === 'bleed' || preset === 'ischemia' || /\/krank\/(bleed|ischemia)\//.test(lower)
    if (!isPathologic || !canUseFixedMask) return null
    const healthySrc = rawSrc
      .replace(/\/krank\/(?:bleed|ischemia)\//i, '/gesund/')
      .replace(/\/krank\//i, '/gesund/')
    return {
      healthySrc,
      roi: HEAD_CT_FIXED_PATHOLOGY_ROI,
    }
  }, [modality, ctControls?.protocol, captureImage?.src, captureImage?.pathologyPreset, activeOrder?.controls?.ctForcePreset])
  const ctHeadPathologyPreset = useMemo(() => {
    if (!ctHeadPathologyMask) return ''
    return String(captureImage?.pathologyPreset || activeOrder?.controls?.ctForcePreset || '').toLowerCase()
  }, [ctHeadPathologyMask, captureImage?.pathologyPreset, activeOrder?.controls?.ctForcePreset])
  const ctHeadPathologyWindowFactor = useMemo(() => {
    if (!ctHeadPathologyMask) return 1
    const ww = Math.max(20, Number(ctWindowWidth || 70))
    const wl = Number(ctWindowLevel || 50)
    // Stronger, clinically plausible response to WL/WW controls.
    const wwFactor = Math.max(0.55, Math.min(1.70, 1.28 - ((ww - 70) / 120)))
    const wlFactor = Math.max(0.62, Math.min(1.15, 1 - (Math.abs(wl - 50) / 110)))
    return wwFactor * wlFactor
  }, [ctHeadPathologyMask, ctWindowWidth, ctWindowLevel])
  const ctHeadPathologyVisibility = useMemo(() => {
    if (!ctHeadPathologyMask) return 0
    if (ctSeriesFrames.length <= 1) return 1
    const t = ctSliceIndex / Math.max(1, ctSeriesFrames.length - 1)
    const sigma = Math.max(0.03, Math.min(0.45, Number(ctPathologySliceSpread || CT_PATHOLOGY_DEBUG_DEFAULTS.sliceSpread)))
    // Use calibrated center from debug ROI reference slice (63/234).
    const center = HEAD_CT_PATHOLOGY_CENTER_T
    const delta = 1 / Math.max(1, ctSeriesFrames.length - 1)
    const bell = (x) => Math.exp(-((x - center) ** 2) / (2 * sigma * sigma))
    // Light temporal smoothing across neighboring slices to avoid flicker.
    const raw = (
      bell(t - (2 * delta)) * 1 +
      bell(t - delta) * 2 +
      bell(t) * 3 +
      bell(t + delta) * 2 +
      bell(t + (2 * delta)) * 1
    ) / 9
    return smoothstep01(raw)
  }, [ctHeadPathologyMask, ctSliceIndex, ctSeriesFrames.length, ctPathologySliceSpread])
  const ctHeadPathologyOpacity = useMemo(() => {
    if (!ctHeadPathologyMask) return 0
    const maxOpacity = ctHeadPathologyPreset === 'ischemia'
      ? Math.max(0.05, Math.min(1, Number(ctPathologyMaxOpacityIschemia || CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityIschemia)))
      : Math.max(0.05, Math.min(1, Number(ctPathologyMaxOpacityBleed || CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityBleed)))
    const value = ctHeadPathologyVisibility * maxOpacity * ctHeadPathologyWindowFactor
    return value < 0.06 ? 0 : Math.min(maxOpacity, value)
  }, [ctHeadPathologyMask, ctHeadPathologyPreset, ctHeadPathologyVisibility, ctPathologyMaxOpacityBleed, ctPathologyMaxOpacityIschemia, ctHeadPathologyWindowFactor])
  const ctHeadPathologyFilterAdjust = useMemo(() => {
    if (!ctHeadPathologyMask) return ''
    const ww = Math.max(20, Number(ctWindowWidth || 70))
    const wl = Number(ctWindowLevel || 50)
    const contrastBoost = Math.max(0.86, Math.min(1.18, 1 + ((70 - ww) / 260)))
    const brightnessShift = Math.max(0.72, Math.min(1.04, 0.9 - ((wl - 50) / 420)))
    if (ctHeadPathologyPreset === 'ischemia') {
      return `contrast(${(contrastBoost * 0.94).toFixed(3)}) brightness(${(brightnessShift * 0.98).toFixed(3)})`
    }
    return `contrast(${(contrastBoost * 1.04).toFixed(3)}) brightness(${(brightnessShift * 0.94).toFixed(3)})`
  }, [ctHeadPathologyMask, ctHeadPathologyPreset, ctWindowWidth, ctWindowLevel])
  const ctHeadPathologyOverlayPlacement = useMemo(() => {
    if (!ctHeadPathologyMask || CT_HEAD_PATHOLOGY_RENDER_MODE === 'baseline') return null
    const roi = ctHeadPathologyMask.roi || HEAD_CT_FIXED_PATHOLOGY_ROI
    const seed = `${activeOrder?.id || 'order'}|${activePatientId || 'patient'}|${ctHeadPathologyPreset || 'preset'}`

    // Random target point inside fixed rectangle (with tiny overlap allowance).
    const targetXPct = roi.xPct + (roi.wPct * (-0.04 + (seededUnit(seed, 'x') * 1.08)))
    const targetYPct = roi.yPct + (roi.hPct * (-0.04 + (seededUnit(seed, 'y') * 1.08)))

    // Estimated source anchor where lesion commonly appears in native pathological frame.
    const sourceXPct = ctHeadPathologyPreset === 'ischemia' ? 49.6 : 49.8
    const sourceYPct = ctHeadPathologyPreset === 'ischemia' ? 45.8 : 46.6

    return {
      dxPct: targetXPct - sourceXPct,
      dyPct: targetYPct - sourceYPct,
      // Keep patch compact to avoid visible doubled anatomy.
      rxPct: Math.max(1.8, roi.wPct * 0.42),
      ryPct: Math.max(3.2, roi.hPct * 0.18),
      cxPct: targetXPct,
      cyPct: targetYPct,
    }
  }, [ctHeadPathologyMask, ctHeadPathologyPreset, activeOrder?.id, activePatientId])
  useEffect(() => {
    if (modality !== 'ct') return
    const preferredProtocol = String(activeOrder?.controls?.protocol || activeOrder?.protocol || '').toLowerCase()
    if (!preferredProtocol.startsWith('ct_')) return
    setCtControls((prev) => (
      prev.protocol === preferredProtocol
        ? prev
        : { ...prev, protocol: preferredProtocol }
    ))
  }, [modality, activeOrder?.controls?.protocol, activeOrder?.protocol])

  const triggerOrderAction = async (patientId, orderId, action, extra = {}) => {
    setBusy(true)
    const res = await Promise.resolve(onOrderAction?.(patientId, orderId, action, extra))
    setBusy(false)
    if (res?.success === false) {
      setMessage({ type: 'error', text: res.message || 'Aktion nicht möglich.' })
      return false
    }
    return true
  }

  const resolveAvailableSeries = useCallback(async (candidates = [], firstSrc = null, manifestUrl = null) => {
    const fromManifest = async () => {
      if (!manifestUrl) return []
      try {
        const res = await window.fetch(manifestUrl, { cache: 'no-store' })
        if (!res.ok) return []
        const payload = await res.json()
        if (!Array.isArray(payload?.files)) return []
        const basePath = manifestUrl.replace(/\/manifest\.json$/i, '')
        return payload.files
          .filter(Boolean)
          .map((file) => (String(file).startsWith('/') ? String(file) : `${basePath}/${String(file)}`))
      } catch {
        return []
      }
    }

    const manifestSeries = await fromManifest()
    if (manifestSeries.length > 0) return manifestSeries

    const unique = []
    const seen = new Set()
    const seed = [firstSrc, ...candidates].filter(Boolean)
    seed.forEach((entry) => {
      if (!seen.has(entry)) {
        seen.add(entry)
        unique.push(entry)
      }
    })
    if (unique.length === 0) return []
    const checks = await Promise.all(unique.map((src) => new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => resolve(src)
      img.onerror = () => resolve(null)
      img.src = src
    })))
    return checks.filter(Boolean)
  }, [])

  const claimAndTransfer = async ({ patient, order }) => {
    if (!patient?.id || !order?.id) return
    const status = String(order.status || '')
    if (status === 'open') {
      const claimed = await triggerOrderAction(patient.id, order.id, 'claim')
      if (!claimed) return
    }
    await triggerOrderAction(patient.id, order.id, 'transfer')
  }

  const prepareCapture = async () => {
    if (!roomPatient || !activeOrder) return
    if (String(activeOrder.status || '') !== 'in_progress') {
      setMessage({ type: 'error', text: 'Anordnung zuerst übernehmen und in Durchführung setzen.' })
      return
    }
    if (!controlsReady) {
      setMessage({ type: 'error', text: 'Bitte Sicherheitscheck vollständig abschließen.' })
      return
    }
    const sound = modality === 'mri' ? mrtSound : xraySound
    playOneShot(sound, { volume: 0.7, maxDurationMs: 2800 })
    const selected = pickDiagnosticCaptureImage({
      modalityId: modality,
      patient: roomPatient,
      order: activeOrder,
      controls: {
        ...(activeControls || {}),
        ...(activeOrder?.controls || {}),
      },
    })
    const availableSeries = modality === 'ct'
      ? await resolveAvailableSeries(selected?.series || [], selected?.src, selected?.manifestUrl)
      : []
    const initialCtSrc = availableSeries[0] || selected?.src
    setCaptureImage(selected)
    if (modality === 'ct') {
      setCtSeriesFrames(availableSeries)
      setCtSliceIndex(0)
      setCtWindowLevel(50)
      setCtWindowWidth(70)
      setCtInvert(false)
      setCtCinePlay(false)
      setShowDevRoiOverlay(false)
      if (initialCtSrc) {
        setCaptureImage((prev) => ({ ...(prev || {}), src: initialCtSrc }))
      }
      if (availableSeries.length === 0) {
        setMessage({ type: 'error', text: 'Keine CT-Slices gefunden. Bitte erst DICOM nach PNG konvertieren (slice-001.png usw.).' })
      }
    } else {
      setCtSeriesFrames([])
      setCtSliceIndex(0)
      setCtCinePlay(false)
    }
    setImageZoom(1)
    setImagePan({ x: 0, y: 0 })
    setAnnotationStrokes([])
    setCurrentStroke(null)
    setAnnotationLabels([])
    setMeasureDraftStart(null)
    setMeasurementLines([])
    setAnnotationTool('pan')
    setAnnotationLabel('L')
    setCtPathologyDebugEnabled(false)
    setCtPathologyDebugStart(null)
    setCtPathologyDebugCursor(null)
    setCtPathologyDebugRects([])
    setCtPathologyDebugCopyState('')
    setCtPathologySliceSpread(CT_PATHOLOGY_DEBUG_DEFAULTS.sliceSpread)
    setCtPathologyMaxOpacityBleed(CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityBleed)
    setCtPathologyMaxOpacityIschemia(CT_PATHOLOGY_DEBUG_DEFAULTS.maxOpacityIschemia)
    if (modality === 'hkl') {
      setHklPtcaCaptures([])
      setHklPtcaLog([])
      setHklPtcaSessionKey((k) => k + 1)
    }
    setCaptureModalOpen(true)
  }

  const buildAnnotatedImage = useCallback(async (image, strokes, labels) => {
    if (!image?.src) return image
    const src = await new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const naturalW = img.naturalWidth || 1280
        const naturalH = img.naturalHeight || 720
        const scale = Math.min(1, 1280 / Math.max(1, naturalW))
        canvas.width = Math.max(640, Math.round(naturalW * scale))
        canvas.height = Math.max(360, Math.round(naturalH * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(image.src)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const strokeWidth = Math.max(2, Math.round(canvas.width / 380))
        strokes.forEach((stroke) => {
          if (!Array.isArray(stroke.points) || stroke.points.length < 2) return
          ctx.strokeStyle = '#ef4444'
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.lineWidth = strokeWidth
          ctx.beginPath()
          stroke.points.forEach((pt, index) => {
            const x = clamp(pt.x, 0, 1) * canvas.width
            const y = clamp(pt.y, 0, 1) * canvas.height
            if (index === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.stroke()
        })
        labels.forEach((label) => {
          const x = clamp(label.x, 0, 1) * canvas.width
          const y = clamp(label.y, 0, 1) * canvas.height
          ctx.font = `${Math.max(22, Math.round(canvas.width / 24))}px Arial`
          ctx.lineWidth = Math.max(2, Math.round(canvas.width / 600))
          ctx.strokeStyle = '#0f172a'
          ctx.fillStyle = '#facc15'
          ctx.strokeText(label.text || 'L', x, y)
          ctx.fillText(label.text || 'L', x, y)
        })
        measurementLines.forEach((line) => {
          const x1 = clamp(line.x1, 0, 1) * canvas.width
          const y1 = clamp(line.y1, 0, 1) * canvas.height
          const x2 = clamp(line.x2, 0, 1) * canvas.width
          const y2 = clamp(line.y2, 0, 1) * canvas.height
          const dx = x2 - x1
          const dy = y2 - y1
          const pxLen = Math.sqrt((dx * dx) + (dy * dy))
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = Math.max(2, Math.round(canvas.width / 520))
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
          ctx.fillStyle = '#22d3ee'
          ctx.font = `${Math.max(14, Math.round(canvas.width / 45))}px Arial`
          const text = `${Math.round(pxLen)} px`
          ctx.fillText(text, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6)
        })
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => resolve(image.src)
      img.src = image.src
    })
    return {
      ...image,
      src,
      caption: `${image.caption || 'Radiologische Aufnahme'} (annotiert)`,
    }
  }, [measurementLines])

  const submitReport = async () => {
    if (!roomPatient || !activeOrder || !captureImage) return
    const resolvedPatientId = (allPatients.find((p) => (p.orders || []).some((o) => o.id === activeOrder.id))?.id) || activePatientId
    if (!resolvedPatientId) {
      setMessage({ type: 'error', text: 'Patient im Raum nicht eindeutig zuordenbar.' })
      return
    }
    if (!reportFields.befund.trim() || !reportFields.signature.trim()) {
      setMessage({ type: 'error', text: 'Bitte Befund und Signatur ausfüllen.' })
      return
    }
    const reportImageBase = modality === 'hkl' && hklPtcaCaptures.length > 0
      ? {
        ...captureImage,
        src: hklPtcaCaptures[hklPtcaCaptures.length - 1].dataUrl,
        caption: hklPtcaCaptures[hklPtcaCaptures.length - 1].label || captureImage.caption || 'HKL PTCA',
      }
      : captureImage
    const annotatedImage = await buildAnnotatedImage(reportImageBase, annotationStrokes, annotationLabels)
    const resultPayload = {
      text: reportFields.befund.trim(),
      impression: reportFields.beurteilung.trim(),
      report: reportFields.befund.trim(),
      assessment: reportFields.beurteilung.trim(),
      diagnosis: reportFields.diagnose.trim(),
      signature: reportFields.signature.trim(),
      image: annotatedImage,
      annotationMeta: {
        strokeCount: annotationStrokes.length,
        labelCount: annotationLabels.length,
        measurementCount: measurementLines.length,
      },
      controls: activeControls,
      room: roomEntry?.name || roomEntry?.id,
      time: new Date().toISOString(),
      ...(modality === 'hkl'
        ? {
          ptca: {
            captures: hklPtcaCaptures,
            sessionLog: hklPtcaLog,
          },
        }
        : {}),
    }
    const ok = await triggerOrderAction(resolvedPatientId, activeOrder.id, 'record_result', { result: resultPayload })
    if (!ok) return
    const ptcaDocAppend = modality === 'hkl' && hklPtcaCaptures.length > 0
      ? `\n\nPTCA-Aufnahmen im Bericht: ${hklPtcaCaptures.length}. ${hklPtcaCaptures.map((c, i) => `[${i + 1}] ${c.label} (${c.createdAt})`).join('; ')}`
      : ''
    const docResult = await Promise.resolve(onUpsertDocument?.(resolvedPatientId, {
      orderId: activeOrder.id,
      title: `${activeOrder.title} Befund`,
      templateId: 'befundbericht',
      type: 'befundbericht',
      content: [
        `Befund: ${reportFields.befund.trim()}`,
        reportFields.beurteilung.trim() ? `Beurteilung: ${reportFields.beurteilung.trim()}` : null,
        reportFields.diagnose.trim() ? `Diagnose: ${reportFields.diagnose.trim()}` : null,
        `Signatur: ${reportFields.signature.trim()}`,
        ptcaDocAppend || null,
      ].filter(Boolean).join('\n\n'),
      image: {
        ...annotatedImage,
        src: reportImageBase.src,
      },
      fields: {
        befund: reportFields.befund.trim(),
        beurteilung: reportFields.beurteilung.trim(),
        diagnose: reportFields.diagnose.trim(),
        signature: reportFields.signature.trim(),
        modality,
        ...(modality === 'hkl'
          ? {
            ptcaCaptures: hklPtcaCaptures,
            ptcaLog: hklPtcaLog,
          }
          : {}),
      },
      readonly: true,
      createdAt: new Date().toISOString(),
    }))
    if (docResult?.success === false) {
      setMessage({ type: 'success', text: `Befund gespeichert. Hinweis: Dokument konnte nicht direkt erstellt werden und wird aus der Anordnung abgeleitet.` })
    }
    setLastSubmittedResult(resultPayload)
    closeCaptureModal()
    setMessage({ type: 'success', text: 'Befund gespeichert. Patient bleibt im Diagnostikraum.' })
  }

  const completeAndReturn = async () => {
    if (!roomPatient || !activeOrder) return
    const resolvedPatientId = (allPatients.find((p) => (p.orders || []).some((o) => o.id === activeOrder.id))?.id) || activePatientId
    if (!resolvedPatientId) return
    await triggerOrderAction(resolvedPatientId, activeOrder.id, 'complete', { result: lastSubmittedResult || activeOrder.result || null })
  }

  const returnWithoutCompleting = async () => {
    if (!roomPatient || !activeOrder) return
    const resolvedPatientId = (allPatients.find((p) => (p.orders || []).some((o) => o.id === activeOrder.id))?.id) || activePatientId
    if (!resolvedPatientId) return
    await triggerOrderAction(resolvedPatientId, activeOrder.id, 'return_from_diagnostics')
  }

  const beginImageDrag = (event) => {
    setDragState({
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: imagePan.x,
      startPanY: imagePan.y,
    })
  }

  const moveDraggedImage = (event) => {
    if (!dragState.active) return
    const dx = event.clientX - dragState.startX
    const dy = event.clientY - dragState.startY
    setImagePan({
      x: dragState.startPanX + dx,
      y: dragState.startPanY + dy,
    })
  }

  const stopImageDrag = () => {
    if (!dragState.active) return
    setDragState((prev) => ({ ...prev, active: false }))
  }

  const stopHold = (key) => {
    const timer = holdTimersRef.current[key]
    if (timer) {
      window.clearInterval(timer)
      holdTimersRef.current[key] = null
    }
  }

  const startXrayShieldHold = () => {
    stopHold('shield')
    holdTimersRef.current.shield = window.setInterval(() => {
      setXrayControls((prev) => ({ ...prev, strahlenschutz: Math.min(100, prev.strahlenschutz + 8) }))
    }, 70)
  }

  const startMriEarHold = () => {
    stopHold('mriEar')
    holdTimersRef.current.mriEar = window.setInterval(() => {
      setMriControls((prev) => ({ ...prev, gehoerschutz: Math.min(100, prev.gehoerschutz + 7) }))
    }, 70)
  }

  useEffect(() => () => {
    stopHold('shield')
    stopHold('mriEar')
  }, [])

  useEffect(() => {
    if (modality !== 'xray') return undefined
    const decay = window.setInterval(() => {
      setXrayControls((prev) => {
        if (prev.sicherung <= 0 || prev.sicherung >= 100) return prev
        return { ...prev, sicherung: Math.max(0, prev.sicherung - 2) }
      })
    }, 260)
    return () => window.clearInterval(decay)
  }, [modality])

  useEffect(() => {
    setMriControls((prev) => ({ ...prev, metallcheck: prev.metallscan >= 42 && prev.metallscan <= 58 }))
  }, [mriControls.metallscan])

  useEffect(() => {
    if (modality !== 'ct') return undefined
    if (!ctCinePlay || ctSeriesFrames.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setCtSliceIndex((prev) => (prev + 1) % ctSeriesFrames.length)
    }, 380)
    return () => window.clearInterval(timer)
  }, [ctCinePlay, ctSeriesFrames, modality])

  useEffect(() => {
    if (modality !== 'ct' || ctSeriesFrames.length === 0) return
    const nextSrc = ctSeriesFrames[Math.max(0, Math.min(ctSeriesFrames.length - 1, ctSliceIndex))]
    if (!nextSrc) return
    setCaptureImage((prev) => (prev ? { ...prev, src: nextSrc } : prev))
  }, [ctSliceIndex, ctSeriesFrames, modality])

  useEffect(() => {
    setCtMaskHealthyFailed(false)
  }, [captureImage?.src, ctHeadPathologyMask?.healthySrc])

  useEffect(() => {
    if (!captureModalOpen || modality !== 'ct' || ctSeriesFrames.length <= 1) return undefined
    const handleKeydown = (event) => {
      const activeEl = document.activeElement
      const isTypingTarget = !!activeEl && (
        activeEl.tagName === 'INPUT'
        || activeEl.tagName === 'TEXTAREA'
        || activeEl.isContentEditable
      )
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault()
        setCtSliceIndex((prev) => Math.min(ctSeriesFrames.length - 1, prev + 1))
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault()
        setCtSliceIndex((prev) => Math.max(0, prev - 1))
      } else if (event.key === ' ') {
        if (isTypingTarget) return
        event.preventDefault()
        setCtCinePlay((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [captureModalOpen, modality, ctSeriesFrames.length])

  const getPoint = (event) => {
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
      y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1),
    }
  }

  const onViewerMouseDown = (event) => {
    if (modality === 'ct' && ctPathologyDebugEnabled) {
      const point = getPoint(event)
      if (!point) return
      setCtPathologyDebugStart(point)
      setCtPathologyDebugCursor(point)
      return
    }
    if (annotationTool === 'pan') {
      beginImageDrag(event)
      return
    }
    const point = getPoint(event)
    if (!point) return
    if (annotationTool === 'label') {
      setAnnotationLabels((prev) => [...prev, { x: point.x, y: point.y, text: annotationLabel }])
      return
    }
    if (annotationTool === 'draw') {
      setCurrentStroke({ points: [point] })
      return
    }
    if (annotationTool === 'measure') {
      if (!measureDraftStart) {
        setMeasureDraftStart(point)
      } else {
        const line = {
          x1: measureDraftStart.x,
          y1: measureDraftStart.y,
          x2: point.x,
          y2: point.y,
        }
        setMeasurementLines((prev) => [...prev, line])
        setMeasureDraftStart(null)
      }
    }
  }

  const onViewerMouseMove = (event) => {
    if (modality === 'ct' && ctPathologyDebugEnabled) {
      if (!ctPathologyDebugStart) return
      const point = getPoint(event)
      if (!point) return
      setCtPathologyDebugCursor(point)
      return
    }
    if (annotationTool === 'pan') {
      moveDraggedImage(event)
      return
    }
    if (annotationTool !== 'draw' || !currentStroke) return
    const point = getPoint(event)
    if (!point) return
    setCurrentStroke((prev) => {
      if (!prev) return prev
      return { ...prev, points: [...prev.points, point] }
    })
  }

  const onViewerMouseUp = (event) => {
    if (modality === 'ct' && ctPathologyDebugEnabled) {
      if (ctPathologyDebugStart && ctPathologyDebugCursor) {
        const releasePoint = getPoint(event) || ctPathologyDebugCursor
        const x1 = Math.min(ctPathologyDebugStart.x, releasePoint.x)
        const y1 = Math.min(ctPathologyDebugStart.y, releasePoint.y)
        const x2 = Math.max(ctPathologyDebugStart.x, releasePoint.x)
        const y2 = Math.max(ctPathologyDebugStart.y, releasePoint.y)
        const w = x2 - x1
        const h = y2 - y1
        // Ignore accidental clicks that do not create a visible box.
        if (w >= 0.005 && h >= 0.005) {
          setCtPathologyDebugRects((prev) => ([
            ...prev,
            {
              id: `ct_dbg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              sliceIndex: ctSliceIndex,
              sliceNumber: ctSliceIndex + 1,
              xPct: +((x1 * 100).toFixed(2)),
              yPct: +((y1 * 100).toFixed(2)),
              wPct: +((w * 100).toFixed(2)),
              hPct: +((h * 100).toFixed(2)),
              note: '',
            },
          ]))
        }
      }
      setCtPathologyDebugStart(null)
      setCtPathologyDebugCursor(null)
      return
    }
    if (annotationTool === 'pan') {
      stopImageDrag()
      return
    }
    if (annotationTool === 'draw' && currentStroke?.points?.length > 1) {
      setAnnotationStrokes((prev) => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }

  const ctPathologyDebugPayload = useMemo(() => JSON.stringify({
    modality,
    protocol: ctControls.protocol,
    region: getCtRegionFromProtocol(ctControls.protocol),
    pathologyPreset: String(captureImage?.pathologyPreset || activeOrder?.controls?.ctForcePreset || ''),
    imageSrc: String(captureImage?.src || ''),
    frameCount: ctSeriesFrames.length,
    tuning: {
      sliceSpread: +ctPathologySliceSpread.toFixed(3),
      maxOpacityBleed: +ctPathologyMaxOpacityBleed.toFixed(2),
      maxOpacityIschemia: +ctPathologyMaxOpacityIschemia.toFixed(2),
    },
    boxes: ctPathologyDebugRects.map((box) => ({
      sliceIndex: box.sliceIndex,
      sliceNumber: box.sliceNumber,
      xPct: box.xPct,
      yPct: box.yPct,
      wPct: box.wPct,
      hPct: box.hPct,
      note: box.note || '',
    })),
  }, null, 2), [modality, ctControls.protocol, captureImage?.pathologyPreset, captureImage?.src, activeOrder?.controls?.ctForcePreset, ctSeriesFrames.length, ctPathologySliceSpread, ctPathologyMaxOpacityBleed, ctPathologyMaxOpacityIschemia, ctPathologyDebugRects])

  const copyCtPathologyDebugPayload = async () => {
    try {
      await window.navigator.clipboard.writeText(ctPathologyDebugPayload)
      setCtPathologyDebugCopyState('copied')
      window.setTimeout(() => setCtPathologyDebugCopyState(''), 1600)
    } catch {
      setCtPathologyDebugCopyState('error')
      window.setTimeout(() => setCtPathologyDebugCopyState(''), 1800)
    }
  }

  const closeCaptureModal = () => {
    setCaptureModalOpen(false)
    setCtPathologyDebugEnabled(false)
    setCtPathologyDebugStart(null)
    setCtPathologyDebugCursor(null)
    setHklPtcaCaptures([])
    setHklPtcaLog([])
  }

  const ctFilterStyle = modality === 'ct'
    ? `grayscale(1) brightness(${(ctWindowLevel / 50).toFixed(2)}) contrast(${(ctWindowWidth / 50).toFixed(2)})${ctInvert ? ' invert(1)' : ''}`
    : 'none'

  const handleCaptureImageError = () => {
    const fallback = buildDiagnosticPlaceholderImage(modality, String(modality || '').toUpperCase())
    setCaptureImage((prev) => ({ ...(prev || {}), ...fallback }))
    setMessage({ type: 'error', text: 'Bild momentan nicht verfuegbar. Es wird eine Ersatzansicht angezeigt.' })
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full p-3 md:p-5">
        <div className="h-full w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900">
          <div className="relative h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_360px]">
            <div className="relative">
              <img src={roomBackground} alt="Diagnostikraum" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 via-slate-900/10 to-slate-900/50" />

              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="px-3 py-2 rounded-xl bg-black/45 border border-white/15 text-white">
                  <p className="text-xs uppercase tracking-wide opacity-80">{String(modality || '').toUpperCase()}-Raum</p>
                  <p className="text-sm font-semibold">{roomEntry?.name}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl bg-black/45 text-white border border-white/15 hover:bg-black/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {roomPatient ? (
                <div className="absolute bottom-3 left-3 right-3 sm:right-auto rounded-2xl bg-black/45 border border-white/15 p-2.5 w-[min(320px,calc(100vw-1.5rem))]">
                  <p className="text-[11px] text-white/75 mb-1">Patient im Raum</p>
                  <div className="rounded-xl bg-slate-900/70 p-2 border border-white/10">
                    <img src={patientSprite} alt="Patient" className="w-full h-44 object-contain" />
                    <p className="text-xs font-semibold text-white mt-1 truncate">{roomPatient.name}</p>
                    <button onClick={() => onOpenPatientFile?.(roomPatient)} className="mt-1 text-[11px] px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700">Akte öffnen</button>
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-3 left-3 rounded-xl bg-black/55 border border-white/15 px-3 py-2 text-xs text-white/90">
                  Kein Patient im Raum
                </div>
              )}
            </div>

            <div className="h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-l border-white/10 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3 text-white">
                <Activity className="w-4 h-4 text-cyan-300" />
                <h3 className="font-semibold">Kontrollzentrum</h3>
              </div>

              {message && (
                <div className={`mb-3 rounded-lg px-3 py-2 text-xs border ${message.type === 'error' ? 'bg-red-500/15 text-red-100 border-red-400/40' : 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40'}`}>
                  {message.text}
                </div>
              )}

              {!roomPatient && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">Wartende Anordnungen</p>
                  {roomOrders.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                      Keine passenden Anordnungen verfügbar.
                    </div>
                  )}
                  {roomOrders.map(({ patient, order }) => (
                    <div key={order.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm text-white font-medium">{patient.name}</p>
                      <p className="text-xs text-slate-300">{order.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Status: {order.status}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => triggerOrderAction(patient.id, order.id, 'claim')} disabled={busy || order.status !== 'open'} className="px-2 py-1 rounded bg-slate-700 text-white text-xs disabled:opacity-40">Übernehmen</button>
                        <button onClick={() => claimAndTransfer({ patient, order })} disabled={busy} className="px-2 py-1 rounded bg-primary-600 text-white text-xs disabled:opacity-40">Übernehmen + verlegen</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {roomPatient && activeOrder && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-300">Aktive Anordnung</p>
                    <p className="text-sm text-white font-semibold">{activeOrder.title}</p>
                    <p className="text-xs text-slate-300 mt-1">Status: {activeOrder.status}</p>
                    {activeOrder.bodyPart && <p className="text-xs text-cyan-200 mt-1">Zielregion: {activeOrder.bodyPart}</p>}
                    {String(activeOrder.status || '') !== 'in_progress' && (
                      <button onClick={() => claimAndTransfer({ patient: roomPatient, order: activeOrder })} className="mt-2 px-3 py-1.5 rounded bg-primary-600 text-white text-xs">
                        Starten (übernehmen + verlegen)
                      </button>
                    )}
                  </div>

                  {(modality === 'xray' || modality === 'mri' || modality === 'ct' || modality === 'hkl') && (
                    <>
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-cyan-100 inline-flex items-center gap-1.5"><WandSparkles className="w-3.5 h-3.5" /> Interaktiver Sicherheits-Check</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${controlsReady ? 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40' : 'bg-amber-500/20 text-amber-100 border-amber-300/40'}`}>
                            {checkScore}/3
                          </span>
                        </div>
                        <div className="space-y-2">
                          {modality === 'xray' && (
                            <>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${xrayControls.strahlenschutz >= 100 ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Strahlenschutz anlegen (halten)</p>
                                <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden"><div className="h-full bg-cyan-300 transition-all" style={{ width: `${xrayControls.strahlenschutz}%` }} /></div>
                                <button
                                  onMouseDown={startXrayShieldHold}
                                  onMouseUp={() => stopHold('shield')}
                                  onMouseLeave={() => stopHold('shield')}
                                  className="mt-1.5 px-2 py-1 rounded bg-cyan-600 text-white text-[11px]"
                                >
                                  Schutzschild halten
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${xrayControls.marker ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Seitenmarker setzen</p>
                                <div className="mt-1 flex gap-1.5">
                                  <button onClick={() => setXrayControls((p) => ({ ...p, markerSide: 'L' }))} className={`px-2 py-1 rounded text-[11px] ${xrayControls.markerSide === 'L' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-100'}`}>L</button>
                                  <button onClick={() => setXrayControls((p) => ({ ...p, markerSide: 'R' }))} className={`px-2 py-1 rounded text-[11px] ${xrayControls.markerSide === 'R' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-100'}`}>R</button>
                                  <button onClick={() => setXrayControls((p) => ({ ...p, markerSide: 'none' }))} className={`px-2 py-1 rounded text-[11px] ${xrayControls.markerSide === 'none' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-100'}`}>Keinen</button>
                                  <button onClick={() => setXrayControls((p) => ({ ...p, marker: Boolean(p.markerSide) }))} className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">Marker platzieren</button>
                                </div>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${xrayControls.sicherung >= 100 ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Patient stabilisieren (mehrfach tippen)</p>
                                <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden"><div className="h-full bg-rose-300 transition-all" style={{ width: `${xrayControls.sicherung}%` }} /></div>
                                <button onClick={() => setXrayControls((p) => ({ ...p, sicherung: Math.min(100, p.sicherung + 18) }))} className="mt-1.5 px-2 py-1 rounded bg-rose-600 text-white text-[11px]">Stabilisieren</button>
                              </div>
                            </>
                          )}
                          {modality === 'mri' && (
                            <>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${mriControls.metallcheck ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Metallsensor kalibrieren (Zielbereich 42-58)</p>
                                <input type="range" min={0} max={100} value={mriControls.metallscan} onChange={(e) => setMriControls((p) => ({ ...p, metallscan: Number(e.target.value) }))} className="w-full mt-1" />
                                <p className="text-[11px] mt-1">Scanwert: {mriControls.metallscan} {mriControls.metallcheck ? ' - sauber' : ' - prüfen'}</p>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${mriControls.gehoerschutz >= 100 ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Gehörschutz anpassen (halten)</p>
                                <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden"><div className="h-full bg-cyan-300 transition-all" style={{ width: `${mriControls.gehoerschutz}%` }} /></div>
                                <button
                                  onMouseDown={startMriEarHold}
                                  onMouseUp={() => stopHold('mriEar')}
                                  onMouseLeave={() => stopHold('mriEar')}
                                  className="mt-1.5 px-2 py-1 rounded bg-cyan-600 text-white text-[11px]"
                                >
                                  Gehörschutz fixieren
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${mriControls.notfallklingel ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Notfallklingel demonstrieren</p>
                                <button onClick={() => setMriControls((p) => ({ ...p, notfallklingel: true }))} className="mt-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">Testton abspielen</button>
                              </div>
                            </>
                          )}
                          {modality === 'ct' && (
                            <>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${ctControls.identityCheck ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Patientenidentität und Aufklärungsstatus prüfen</p>
                                <button onClick={() => setCtControls((p) => ({ ...p, identityCheck: true }))} className="mt-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">
                                  Check dokumentieren
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${ctControls.contrastCheck ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Kontrastmittel-/Nierencheck bestätigen</p>
                                <button onClick={() => setCtControls((p) => ({ ...p, contrastCheck: true }))} className="mt-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">
                                  Freigeben
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${ctControls.breathHold >= 100 ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Atemkommando trainieren (mehrfach tippen)</p>
                                <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden">
                                  <div className="h-full bg-cyan-300 transition-all" style={{ width: `${ctControls.breathHold}%` }} />
                                </div>
                                <button onClick={() => setCtControls((p) => ({ ...p, breathHold: Math.min(100, p.breathHold + 20) }))} className="mt-1.5 px-2 py-1 rounded bg-cyan-600 text-white text-[11px]">
                                  Atemkommando
                                </button>
                              </div>
                            </>
                          )}
                          {modality === 'hkl' && (
                            <>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${hklControls.sterileField >= 100 ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Steriles Feld vorbereiten (halten)</p>
                                <div className="mt-1 h-1.5 rounded bg-black/40 overflow-hidden">
                                  <div className="h-full bg-cyan-300 transition-all" style={{ width: `${hklControls.sterileField}%` }} />
                                </div>
                                <button onClick={() => setHklControls((p) => ({ ...p, sterileField: Math.min(100, p.sterileField + 18) }))} className="mt-1.5 px-2 py-1 rounded bg-cyan-600 text-white text-[11px]">
                                  Steril vorbereiten
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${hklControls.timeoutDone ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Team-Time-out durchführen</p>
                                <button onClick={() => setHklControls((p) => ({ ...p, timeoutDone: true }))} className="mt-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">
                                  Time-out dokumentieren
                                </button>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 text-xs transition-all ${hklControls.monitorConnected ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50' : 'bg-slate-800/40 border-white/10 text-white'}`}>
                                <p>Monitoring/Defi-Pads bestätigen</p>
                                <button onClick={() => setHklControls((p) => ({ ...p, monitorConnected: true }))} className="mt-1.5 px-2 py-1 rounded bg-emerald-600 text-white text-[11px]">
                                  Monitoring aktiv
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                        <p className="text-xs text-slate-300">Geräteeinstellungen</p>
                        {modality === 'xray' ? (
                          <>
                            <select value={xrayControls.projektion} onChange={(e) => setXrayControls((p) => ({ ...p, projektion: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="ap">AP</option>
                              <option value="pa">PA</option>
                              <option value="seitlich">Seitlich</option>
                            </select>
                            <div className="text-xs text-slate-300">kV: {xrayControls.kv}</div>
                            <input type="range" min={45} max={125} value={xrayControls.kv} onChange={(e) => setXrayControls((p) => ({ ...p, kv: Number(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-slate-300">mAs: {xrayControls.mas}</div>
                            <input type="range" min={2} max={20} value={xrayControls.mas} onChange={(e) => setXrayControls((p) => ({ ...p, mas: Number(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-slate-300">SID: {xrayControls.sid} cm</div>
                            <input type="range" min={90} max={150} value={xrayControls.sid} onChange={(e) => setXrayControls((p) => ({ ...p, sid: Number(e.target.value) }))} className="w-full" />
                          </>
                        ) : modality === 'mri' ? (
                          <>
                            <select value={mriControls.sequenz} onChange={(e) => setMriControls((p) => ({ ...p, sequenz: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="t1">T1</option>
                              <option value="t2">T2</option>
                              <option value="flair">FLAIR</option>
                              <option value="dwi">DWI</option>
                            </select>
                            <select value={mriControls.felderstaerke} onChange={(e) => setMriControls((p) => ({ ...p, felderstaerke: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="1.5t">1.5 Tesla</option>
                              <option value="3t">3 Tesla</option>
                            </select>
                            <div className="text-xs text-slate-300">Schichtdicke: {mriControls.schichtdicke} mm</div>
                            <input type="range" min={2} max={8} value={mriControls.schichtdicke} onChange={(e) => setMriControls((p) => ({ ...p, schichtdicke: Number(e.target.value) }))} className="w-full" />
                          </>
                        ) : modality === 'ct' ? (
                          <>
                            <select value={ctControls.protocol} onChange={(e) => setCtControls((p) => ({ ...p, protocol: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="ct_schaedel">CCT nativ</option>
                              <option value="ct_thorax">CT Thorax</option>
                              <option value="ct_abdomen">CT Abdomen</option>
                              <option value="ct_angio">CT Angio</option>
                            </select>
                            <select value={ctControls.windowPreset} onChange={(e) => setCtControls((p) => ({ ...p, windowPreset: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="weichteil">Fenster: Weichteil</option>
                              <option value="lungen">Fenster: Lunge</option>
                              <option value="knochen">Fenster: Knochen</option>
                            </select>
                            <div className="text-xs text-slate-300">Schichtdicke: {ctControls.sliceThickness} mm</div>
                            <input type="range" min={1} max={5} value={ctControls.sliceThickness} onChange={(e) => setCtControls((p) => ({ ...p, sliceThickness: Number(e.target.value) }))} className="w-full" />
                          </>
                        ) : (
                          <>
                            <select value={hklControls.accessSite} onChange={(e) => setHklControls((p) => ({ ...p, accessSite: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="radial">Zugang radial</option>
                              <option value="femoral">Zugang femoral</option>
                            </select>
                            <select value={hklControls.projection} onChange={(e) => setHklControls((p) => ({ ...p, projection: e.target.value }))} className="w-full rounded bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1.5">
                              <option value="lao">LAO</option>
                              <option value="rao">RAO</option>
                              <option value="cranial">Cranial</option>
                              <option value="caudal">Caudal</option>
                            </select>
                            <div className="text-xs text-slate-300">Kontrastmittel: {hklControls.contrastMl} ml</div>
                            <input type="range" min={40} max={180} value={hklControls.contrastMl} onChange={(e) => setHklControls((p) => ({ ...p, contrastMl: Number(e.target.value) }))} className="w-full" />
                          </>
                        )}
                      </div>

                      <button onClick={prepareCapture} disabled={busy || !controlsReady} className={`w-full py-3 rounded-xl text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40 transition-all ${controlsReady ? 'bg-rose-500 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.65)] ring-2 ring-rose-300/60' : 'bg-rose-500'}`}>
                        <Play className="w-4 h-4" /> Aufnahme auslösen
                      </button>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={completeAndReturn} disabled={busy || !lastSubmittedResult} className="px-2 py-2 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-40">Abschließen & zurück</button>
                    <button onClick={returnWithoutCompleting} disabled={busy} className="px-2 py-2 rounded-lg bg-slate-600 text-white text-xs disabled:opacity-40">Zurückverlegen</button>
                  </div>
                </div>
              )}

              {roomPatient && !activeOrder && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Für diesen Patienten liegt in diesem Raum keine aktive passende Anordnung vor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {captureModalOpen && captureImage && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/70" onClick={closeCaptureModal} />
          <div className="relative w-full max-w-[95vw] max-h-[95vh] rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] h-[88vh] lg:h-[92vh]">
              <div className="p-4 bg-slate-50 min-h-0 flex flex-col">
                {modality === 'hkl' ? (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                      <HklPtcaMinigame
                        key={hklPtcaSessionKey}
                        contrastMl={hklControls.contrastMl}
                        patient={roomPatient}
                        patientVitals={roomPatient?.vitals}
                        projectionLabel={String(hklControls.projection || 'lao').toUpperCase()}
                        onClinicalEffect={(action) => onClinicalProcedureEffect?.(action, roomPatient?.id)}
                        onCapturesChange={setHklPtcaCaptures}
                        onSessionLogChange={setHklPtcaLog}
                      />
                    </div>
                    <p className="text-xs text-surface-500 mt-2">{captureImage.caption}</p>
                  </>
                ) : (
                <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-surface-500">Bildbetrachter (CT: Mausrad = Slice, Ctrl + Mausrad = Zoom, Leertaste = Cine)</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setImageZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))} className="px-2 py-1 rounded bg-slate-200 text-xs">-</button>
                    <button onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }) }} className="px-2 py-1 rounded bg-slate-200 text-xs">Reset</button>
                    <button onClick={() => setImageZoom((z) => Math.min(4, +(z + 0.2).toFixed(2)))} className="px-2 py-1 rounded bg-slate-200 text-xs">+</button>
                    <button onClick={() => setAnnotationStrokes([])} className="px-2 py-1 rounded bg-amber-100 text-xs text-amber-800">Linien löschen</button>
                    <button onClick={() => setAnnotationLabels([])} className="px-2 py-1 rounded bg-amber-100 text-xs text-amber-800">Marker löschen</button>
                    <button onClick={() => { setMeasurementLines([]); setMeasureDraftStart(null) }} className="px-2 py-1 rounded bg-cyan-100 text-xs text-cyan-800">Messungen löschen</button>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5 relative z-20">
                  <button onClick={() => setAnnotationTool('pan')} className={`px-2 py-1 rounded text-xs ${annotationTool === 'pan' ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Verschieben</button>
                  <button onClick={() => setAnnotationTool('draw')} className={`px-2 py-1 rounded text-xs ${annotationTool === 'draw' ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Stift</button>
                  <button onClick={() => setAnnotationTool('label')} className={`px-2 py-1 rounded text-xs ${annotationTool === 'label' ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'}`}>L/R setzen</button>
                  <button onClick={() => setAnnotationTool('measure')} className={`px-2 py-1 rounded text-xs ${annotationTool === 'measure' ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Messen</button>
                  <button onClick={() => setAnnotationLabel('L')} className={`px-2.5 py-1 rounded text-xs font-semibold ${annotationLabel === 'L' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 text-slate-700'} ${annotationTool !== 'label' ? 'opacity-60' : ''}`}>L</button>
                  <button onClick={() => setAnnotationLabel('R')} className={`px-2.5 py-1 rounded text-xs font-semibold ${annotationLabel === 'R' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 text-slate-700'} ${annotationTool !== 'label' ? 'opacity-60' : ''}`}>R</button>
                </div>
                {modality === 'ct' && (
                  <div className="mb-2 rounded-lg border border-slate-300 bg-white px-2 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => setCtSliceIndex((i) => Math.max(0, i - 1))} className="px-2 py-1 rounded bg-slate-200 text-xs">Slice -</button>
                      <button onClick={() => setCtSliceIndex((i) => Math.min(Math.max(0, ctSeriesFrames.length - 1), i + 1))} className="px-2 py-1 rounded bg-slate-200 text-xs">Slice +</button>
                      <button onClick={() => setCtCinePlay((prev) => !prev)} className={`px-2 py-1 rounded text-xs ${ctCinePlay ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {ctCinePlay ? 'Cine Stop' : 'Cine Play'}
                      </button>
                      <button onClick={() => setCtInvert((prev) => !prev)} className={`px-2 py-1 rounded text-xs ${ctInvert ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        Invert
                      </button>
                      {isDevCtPreview && (
                        <button
                          onClick={() => setShowDevRoiOverlay((prev) => !prev)}
                          className={`px-2 py-1 rounded text-xs ${showDevRoiOverlay ? 'bg-fuchsia-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                        >
                          ROI Overlay {showDevRoiOverlay ? 'an' : 'aus'}
                        </button>
                      )}
                      <span className="text-[11px] text-slate-600">
                        Slice {Math.min(ctSliceIndex + 1, Math.max(1, ctSeriesFrames.length))}/{Math.max(1, ctSeriesFrames.length)}
                      </span>
                    </div>
                    {ctSeriesFrames.length > 1 && (
                      <label className="mt-2 block text-[11px] text-slate-600">
                        Slice Slider
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, ctSeriesFrames.length - 1)}
                          value={Math.max(0, Math.min(ctSliceIndex, Math.max(0, ctSeriesFrames.length - 1)))}
                          onChange={(e) => setCtSliceIndex(Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    )}
                    {isDevCtPreview && (
                      <p className="mt-1 text-[11px] text-fuchsia-700">
                        ROI-Overlay zeigt nur den erlaubten Generatorbereich fuer die Pathologieplatzierung.
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-slate-600">
                        Window Level: {ctWindowLevel}
                        <input
                          type="range"
                          min={20}
                          max={120}
                          value={ctWindowLevel}
                          onChange={(e) => setCtWindowLevel(Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                      <label className="text-[11px] text-slate-600">
                        Window Width: {ctWindowWidth}
                        <input
                          type="range"
                          min={20}
                          max={140}
                          value={ctWindowWidth}
                          onChange={(e) => setCtWindowWidth(Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                    </div>
                    {captureImage?.testMode && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Testmodus aktiv: jedes CT nutzt aktuell den Ordner <code>/imaging/ct/thorax/gesund</code>.
                      </p>
                    )}
                    {ctPathologyDebugEnabled && (
                      <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
                        <p className="text-[11px] text-red-700">
                          Debug aktiv: Mit gedrueckter Maustaste ziehen und loslassen, um eine Pathologie-Grenzbox fuer den aktuellen Slice zu speichern.
                        </p>
                        <p className="mt-1 text-[11px] text-slate-700">
                          Boxen gesamt: {ctPathologyDebugRects.length} • aktueller Slice: {ctPathologyDebugRects.filter((b) => b.sliceIndex === ctSliceIndex).length}
                        </p>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <label className="text-[11px] text-slate-700">
                            Slice-Spanne: {ctPathologySliceSpread.toFixed(3)}
                            <input
                              type="range"
                              min={0.03}
                              max={0.35}
                              step={0.005}
                              value={ctPathologySliceSpread}
                              onChange={(e) => setCtPathologySliceSpread(Number(e.target.value))}
                              className="w-full"
                            />
                          </label>
                          <label className="text-[11px] text-slate-700">
                            Max-Intensität Blutung: {ctPathologyMaxOpacityBleed.toFixed(2)}
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.01}
                              value={ctPathologyMaxOpacityBleed}
                              onChange={(e) => setCtPathologyMaxOpacityBleed(Number(e.target.value))}
                              className="w-full"
                            />
                          </label>
                          <label className="text-[11px] text-slate-700">
                            Max-Intensität Ischämie: {ctPathologyMaxOpacityIschemia.toFixed(2)}
                            <input
                              type="range"
                              min={0.05}
                              max={0.8}
                              step={0.01}
                              value={ctPathologyMaxOpacityIschemia}
                              onChange={(e) => setCtPathologyMaxOpacityIschemia(Number(e.target.value))}
                              className="w-full"
                            />
                          </label>
                        </div>
                        {ctPathologyDebugCopyState === 'copied' && <p className="mt-1 text-[11px] text-emerald-700">JSON in die Zwischenablage kopiert.</p>}
                        {ctPathologyDebugCopyState === 'error' && <p className="mt-1 text-[11px] text-red-700">Kopieren fehlgeschlagen (Browserrechte).</p>}
                        <textarea
                          value={ctPathologyDebugPayload}
                          readOnly
                          className="mt-2 w-full h-32 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-mono text-slate-700"
                        />
                      </div>
                    )}
                  </div>
                )}
                <div
                  ref={viewerRef}
                  className={`w-full flex-1 rounded-xl border border-surface-200 bg-black overflow-hidden ${
                    modality === 'ct' && ctPathologyDebugEnabled
                      ? 'cursor-crosshair'
                      : annotationTool === 'pan'
                      ? (dragState.active ? 'cursor-grabbing' : 'cursor-grab')
                      : (annotationTool === 'draw' || annotationTool === 'measure')
                        ? 'cursor-crosshair'
                        : 'cursor-cell'
                  }`}
                  onWheel={(e) => {
                    e.preventDefault()
                    if (modality === 'ct') {
                      if (e.ctrlKey || e.metaKey) {
                        const delta = e.deltaY < 0 ? 0.12 : -0.12
                        setImageZoom((z) => Math.max(1, Math.min(5, +(z + delta).toFixed(2))))
                        return
                      }
                      if (ctSeriesFrames.length > 1) {
                        const direction = e.deltaY < 0 ? -1 : 1
                        setCtSliceIndex((prev) => Math.max(0, Math.min(ctSeriesFrames.length - 1, prev + direction)))
                      }
                      return
                    }
                    const delta = e.deltaY < 0 ? 0.12 : -0.12
                    setImageZoom((z) => Math.max(1, Math.min(4, +(z + delta).toFixed(2))))
                  }}
                  onMouseDown={onViewerMouseDown}
                  onMouseMove={onViewerMouseMove}
                  onMouseUp={onViewerMouseUp}
                  onMouseLeave={onViewerMouseUp}
                  onDoubleClick={() => setImageZoom((z) => (z > 1 ? 1 : 1.8))}
                >
                  <div
                    className="relative w-full h-full"
                    style={{ transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src={ctHeadPathologyMask && !ctMaskHealthyFailed ? ctHeadPathologyMask.healthySrc : captureImage.src}
                      alt={captureImage.alt}
                      className="w-full h-full object-contain select-none"
                      onError={() => {
                        if (ctHeadPathologyMask && !ctMaskHealthyFailed) {
                          setCtMaskHealthyFailed(true)
                          return
                        }
                        handleCaptureImageError()
                      }}
                      style={{ filter: ctFilterStyle }}
                      draggable={false}
                    />
                    {ctHeadPathologyMask && !ctMaskHealthyFailed && (
                      CT_HEAD_PATHOLOGY_RENDER_MODE === 'baseline' || !ctHeadPathologyOverlayPlacement ? (
                        <img
                          src={captureImage.src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                          style={{
                            // Blend full pathological texture for realistic anatomy instead of synthetic shape overlays.
                            filter: `${ctFilterStyle} ${ctHeadPathologyFilterAdjust} blur(0.12px)`.trim(),
                            opacity: ctHeadPathologyOpacity,
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{
                            clipPath: `ellipse(${ctHeadPathologyOverlayPlacement.rxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.ryPct.toFixed(3)}% at ${ctHeadPathologyOverlayPlacement.cxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.cyPct.toFixed(3)}%)`,
                            WebkitMaskImage: `radial-gradient(ellipse ${ctHeadPathologyOverlayPlacement.rxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.ryPct.toFixed(3)}% at ${ctHeadPathologyOverlayPlacement.cxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.cyPct.toFixed(3)}%, rgba(0,0,0,1) 56%, rgba(0,0,0,0) 100%)`,
                            maskImage: `radial-gradient(ellipse ${ctHeadPathologyOverlayPlacement.rxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.ryPct.toFixed(3)}% at ${ctHeadPathologyOverlayPlacement.cxPct.toFixed(3)}% ${ctHeadPathologyOverlayPlacement.cyPct.toFixed(3)}%, rgba(0,0,0,1) 56%, rgba(0,0,0,0) 100%)`,
                          }}
                        >
                          <img
                            src={captureImage.src}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                            style={{
                              filter: `${ctFilterStyle} ${ctHeadPathologyFilterAdjust} blur(0.12px)`.trim(),
                              opacity: ctHeadPathologyOpacity,
                              transform: `translate(${ctHeadPathologyOverlayPlacement.dxPct.toFixed(3)}%, ${ctHeadPathologyOverlayPlacement.dyPct.toFixed(3)}%)`,
                              transformOrigin: 'center center',
                            }}
                            draggable={false}
                          />
                        </div>
                      )
                    )}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                      {annotationStrokes.map((stroke, idx) => (
                        <polyline
                          key={`stroke_${idx}`}
                          points={stroke.points.map((pt) => `${(pt.x * 1000).toFixed(2)},${(pt.y * 1000).toFixed(2)}`).join(' ')}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                      {currentStroke?.points?.length > 1 && (
                        <polyline
                          points={currentStroke.points.map((pt) => `${(pt.x * 1000).toFixed(2)},${(pt.y * 1000).toFixed(2)}`).join(' ')}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {ctPathologyDebugRects
                        .filter((box) => box.sliceIndex === ctSliceIndex)
                        .map((box) => (
                          <g key={box.id}>
                            <rect
                              x={(box.xPct * 10).toFixed(2)}
                              y={(box.yPct * 10).toFixed(2)}
                              width={(box.wPct * 10).toFixed(2)}
                              height={(box.hPct * 10).toFixed(2)}
                              fill="rgba(239,68,68,0.18)"
                              stroke="#ef4444"
                              strokeWidth="4"
                            />
                            <text
                              x={((box.xPct * 10) + 8).toFixed(2)}
                              y={((box.yPct * 10) + 24).toFixed(2)}
                              fill="#fecaca"
                              fontSize="20"
                              fontWeight="700"
                            >
                              ROI {box.sliceNumber}
                            </text>
                          </g>
                        ))}
                      {ctPathologyDebugEnabled && ctPathologyDebugStart && ctPathologyDebugCursor && (
                        <rect
                          x={(Math.min(ctPathologyDebugStart.x, ctPathologyDebugCursor.x) * 1000).toFixed(2)}
                          y={(Math.min(ctPathologyDebugStart.y, ctPathologyDebugCursor.y) * 1000).toFixed(2)}
                          width={(Math.abs(ctPathologyDebugCursor.x - ctPathologyDebugStart.x) * 1000).toFixed(2)}
                          height={(Math.abs(ctPathologyDebugCursor.y - ctPathologyDebugStart.y) * 1000).toFixed(2)}
                          fill="rgba(248,113,113,0.12)"
                          stroke="#f97316"
                          strokeWidth="4"
                          strokeDasharray="10 8"
                        />
                      )}
                      {measurementLines.map((line, idx) => {
                        const x1 = (line.x1 * 1000).toFixed(2)
                        const y1 = (line.y1 * 1000).toFixed(2)
                        const x2 = (line.x2 * 1000).toFixed(2)
                        const y2 = (line.y2 * 1000).toFixed(2)
                        const dx = Number(x2) - Number(x1)
                        const dy = Number(y2) - Number(y1)
                        const len = Math.sqrt((dx * dx) + (dy * dy))
                        const cx = (Number(x1) + Number(x2)) / 2
                        const cy = (Number(y1) + Number(y2)) / 2
                        return (
                          <g key={`measure_${idx}`}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22d3ee" strokeWidth="4" />
                            <circle cx={x1} cy={y1} r="5" fill="#22d3ee" />
                            <circle cx={x2} cy={y2} r="5" fill="#22d3ee" />
                            <text x={cx + 8} y={cy - 8} fill="#22d3ee" fontSize="20" fontWeight="700">{`${Math.round(len)} px`}</text>
                          </g>
                        )
                      })}
                      {annotationTool === 'measure' && measureDraftStart && (
                        <circle cx={(measureDraftStart.x * 1000).toFixed(2)} cy={(measureDraftStart.y * 1000).toFixed(2)} r="6" fill="#67e8f9" />
                      )}
                    </svg>
                    {annotationLabels.map((label, idx) => (
                      <div
                        key={`label_${idx}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-yellow-300 font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none"
                        style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%` }}
                      >
                        {label.text}
                      </div>
                    ))}
                    {modality === 'ct' && (
                      <>
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-cyan-200 text-[11px] font-mono">R</div>
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-cyan-200 text-[11px] font-mono">L</div>
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-cyan-200 text-[11px] font-mono">A</div>
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-cyan-200 text-[11px] font-mono">P</div>
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/70 text-cyan-100 text-[11px] font-mono">
                          WL {ctWindowLevel} | WW {ctWindowWidth} | Slice {Math.min(ctSliceIndex + 1, Math.max(1, ctSeriesFrames.length))}/{Math.max(1, ctSeriesFrames.length)}
                        </div>
                      </>
                    )}
                    {modality === 'ct' && isDevCtPreview && showDevRoiOverlay && devCtRoiShapes.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <svg className="h-full w-full max-h-full max-w-full aspect-square" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <clipPath id="ct-dev-roi-fov">
                              <circle cx="50" cy="50" r="46" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#ct-dev-roi-fov)">
                            {devCtRoiShapes.map((shape, idx) => (
                              shape.type === 'rect'
                                ? (
                                  <g key={`dev_roi_${idx}`}>
                                    <rect
                                      x={shape.x}
                                      y={shape.y}
                                      width={shape.w}
                                      height={shape.h}
                                      fill="none"
                                      stroke="#f472b6"
                                      strokeWidth="0.55"
                                      strokeDasharray="1.2 1.2"
                                    />
                                    {shape.label ? (
                                      <text x={shape.x + 1.2} y={Math.max(4, shape.y - 1)} fill="#f472b6" fontSize="2.2" fontWeight="700">{shape.label}</text>
                                    ) : null}
                                  </g>
                                )
                                : (
                                  <g key={`dev_roi_${idx}`}>
                                    <ellipse
                                      cx={shape.cx}
                                      cy={shape.cy}
                                      rx={shape.rx}
                                      ry={shape.ry}
                                      fill="none"
                                      stroke="#f472b6"
                                      strokeWidth="0.55"
                                      strokeDasharray="1.2 1.2"
                                    />
                                    {shape.label ? (
                                      <text x={shape.cx - shape.rx} y={Math.max(4, shape.cy - shape.ry - 1)} fill="#f472b6" fontSize="2.2" fontWeight="700">{shape.label}</text>
                                    ) : null}
                                  </g>
                                )
                            ))}
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-surface-500 mt-2">{captureImage.caption}</p>
                </>
                )}
              </div>
              <div className="p-4 space-y-2 overflow-y-auto">
                <p className="text-sm font-semibold text-surface-900">Befundung</p>
                {modality === 'hkl' && hklPtcaCaptures.length > 0 && (
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-[11px] text-cyan-900">
                    PTCA-Aufnahmen für den Bericht: {hklPtcaCaptures.length} (im Befund und Akte als Liste/Felder gespeichert)
                  </div>
                )}
                <textarea value={reportFields.befund} onChange={(e) => setReportFields((p) => ({ ...p, befund: e.target.value }))} className="input-field !h-24 text-xs resize-none" placeholder="Befundbeschreibung..." />
                <textarea value={reportFields.beurteilung} onChange={(e) => setReportFields((p) => ({ ...p, beurteilung: e.target.value }))} className="input-field !h-20 text-xs resize-none" placeholder="Beurteilung..." />
                <input value={reportFields.diagnose} onChange={(e) => setReportFields((p) => ({ ...p, diagnose: e.target.value }))} className="input-field text-xs" placeholder="Diagnose" />
                <input value={reportFields.signature} onChange={(e) => setReportFields((p) => ({ ...p, signature: e.target.value }))} className="input-field text-xs" placeholder="Signatur" />
                <button onClick={submitReport} className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center justify-center gap-1.5">
                  <Send className="w-4 h-4" /> Befund abschicken
                </button>
                {(annotationStrokes.length > 0 || annotationLabels.length > 0 || measurementLines.length > 0) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Annotationen aktiv: {annotationStrokes.length} Linien, {annotationLabels.length} Marker, {measurementLines.length} Messungen
                  </div>
                )}
                {reportFields.befund.trim() && reportFields.signature.trim() && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Textfelder werden mit dem Bild zusammen gespeichert.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
