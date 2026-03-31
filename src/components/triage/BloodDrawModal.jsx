import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Check, AlertCircle, FlaskConical, MousePointer2 } from 'lucide-react'
import { LAB_CATEGORIES, LAB_PARAMETERS, getLabReadyAtIso } from '../../data/labValues'
import armAsset from '../../assets/phlebotomy/arm.png'
import armFemaleAsset from '../../assets/phlebotomy/arm-female.png'
import armWithTourniquetAsset from '../../assets/phlebotomy/arm-with-tourniquet.png'
import disinfectantAsset from '../../assets/phlebotomy/disinfectant.png'
import tourniquetAsset from '../../assets/phlebotomy/tourniquet.png'
import butterflyAsset from '../../assets/phlebotomy/butterfly.png'
import butterflyRolledAsset from '../../assets/phlebotomy/butterfly-rolledup.png'
import swabAsset from '../../assets/phlebotomy/swab.png'
import plasterAsset from '../../assets/phlebotomy/plaster.png'
import monoEdtaAsset from '../../assets/phlebotomy/monovette-edta.png'
import monoHeparinAsset from '../../assets/phlebotomy/monovette-heparin.png'
import monoSerumAsset from '../../assets/phlebotomy/monovette-serum.png'
import mouthMainAsset from '../../assets/exam/mouth-main.png'
import microSwabAsset from '../../assets/exam/micro-swab.svg'
import microVialAsset from '../../assets/exam/micro-vial.svg'
import spraySound from '../../assets/sfx/spray.mp3'
import { playOneShot } from '../../utils/soundManager'

const DEFAULT_PARAM_COST = 3

const TOOLS = {
  disinfect: { id: 'disinfect', label: 'Desinfektion', image: disinfectantAsset },
  tourniquet: { id: 'tourniquet', label: 'Stauschlauch', image: tourniquetAsset },
  butterfly: { id: 'butterfly', label: 'Butterfly', image: butterflyRolledAsset },
  tube_edta: { id: 'tube_edta', label: 'Monovette EDTA', image: monoEdtaAsset },
  tube_heparin: { id: 'tube_heparin', label: 'Monovette Heparin', image: monoHeparinAsset },
  tube_serum: { id: 'tube_serum', label: 'Monovette Serum', image: monoSerumAsset },
  swab: { id: 'swab', label: 'Tupfer', image: swabAsset },
  plaster: { id: 'plaster', label: 'Pflaster', image: plasterAsset },
}

const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

const TARGETS = {
  punctureSite: { x: 48, y: 58, r: 18 },
  upperArm: { x: 46, y: 24, r: 20 },
}

const TUBE_CATEGORY_MAP = {
  tube_edta: ['blood_count'],
  tube_heparin: ['electrolytes'],
  tube_serum: ['liver', 'kidney', 'cardiac', 'coagulation', 'inflammation', 'metabolic'],
}

const TUBE_ORDER = ['tube_edta', 'tube_heparin', 'tube_serum']
const MOUTH_MICRO_PARAM_IDS = new Set([
  'mikro_abstrich_nase',
  'mikro_sputum',
  'mikro_virus_panel',
  'mikro_pcr_sarscov2',
  'mikro_pcr_influenza',
])

const CHECKLIST = [
  { id: 'dis1', label: '1) Desinfizieren' },
  { id: 'swab', label: '2) Mit Tupfer wischen' },
  { id: 'dis2', label: '3) Erneut desinfizieren' },
  { id: 'tourniquet', label: '4) Stauschlauch anlegen (auch vor Desinfektion erlaubt)' },
  { id: 'puncture', label: '5) Punktieren mit Butterfly' },
  { id: 'tubes', label: '6) Monovetten abnehmen (mind. 1)' },
  { id: 'release', label: '7) Stauschlauch entfernen' },
  { id: 'removeNeedle', label: '8) Butterfly ziehen' },
  { id: 'plaster', label: '9) Pflaster aufkleben' },
]

export default function BloodDrawModal({ patient, onClose, onSubmit, initialSelectedParams = [] }) {
  const [phase, setPhase] = useState('procedure')
  const [hint, setHint] = useState('')
  const [veinBurstWarning, setVeinBurstWarning] = useState('')
  const [attachedToolId, setAttachedToolId] = useState(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [procedure, setProcedure] = useState({
    disinfectionCount: 0,
    swabDone: false,
    tourniquetOn: false,
    punctured: false,
    tubes: { tube_edta: false, tube_heparin: false, tube_serum: false },
    needleRemoved: false,
    plasterDone: false,
    tourniquetAppliedAt: null,
    puncturedAt: null,
    firstTubeTakenAt: null,
    firstTubeWhileTourniquetOn: null,
  })
  const [selectedLabParams, setSelectedLabParams] = useState([])
  const [ordering, setOrdering] = useState(false)
  const [bloodPayload, setBloodPayload] = useState(null)
  const [microPayload, setMicroPayload] = useState(null)
  const [microState, setMicroState] = useState({
    attachedToolId: null,
    swabProgress: 0,
    completed: false,
    cursor: { x: 0, y: 0 },
    cursorPx: { x: 0, y: 0 },
  })
  const [finalized, setFinalized] = useState(false)
  const [initialFlow, setInitialFlow] = useState({ blood: [], microMouth: [], microUnsupported: [] })
  const canvasRef = useRef(null)
  const microCanvasRef = useRef(null)
  const microLastPosRef = useRef(null)

  useEffect(() => {
    if (!Array.isArray(initialSelectedParams)) {
      setSelectedLabParams([])
      setInitialFlow({ blood: [], microMouth: [], microUnsupported: [] })
      setPhase('procedure')
      return
    }
    const normalized = [...new Set(initialSelectedParams.filter(Boolean))]
    const blood = normalized.filter((id) => {
      const param = LAB_PARAMETERS.find((p) => p.id === id)
      return param && param.category !== 'microbiology'
    })
    const micro = normalized.filter((id) => {
      const param = LAB_PARAMETERS.find((p) => p.id === id)
      return param && param.category === 'microbiology'
    })
    const microMouth = micro.filter((id) => MOUTH_MICRO_PARAM_IDS.has(id))
    const microUnsupported = micro.filter((id) => !MOUTH_MICRO_PARAM_IDS.has(id))
    setInitialFlow({ blood, microMouth, microUnsupported })
    setSelectedLabParams(normalized)
    setBloodPayload(null)
    setMicroPayload(null)
    setMicroState({
      attachedToolId: null,
      swabProgress: 0,
      completed: false,
      cursor: { x: 0, y: 0 },
      cursorPx: { x: 0, y: 0 },
    })
    setFinalized(false)
    setPhase(blood.length > 0 ? 'procedure' : (microMouth.length > 0 ? 'micro_procedure' : 'procedure'))
  }, [patient?.id, initialSelectedParams])

  const armImage = procedure.tourniquetOn
    ? armWithTourniquetAsset
    : (String(patient?.gender || '').toLowerCase().startsWith('w') ? armFemaleAsset : armAsset)

  const anyTubeTaken = procedure.tubes.tube_edta || procedure.tubes.tube_heparin || procedure.tubes.tube_serum
  const takenTubes = TUBE_ORDER.filter(id => procedure.tubes[id])

  const activeInstruction = useMemo(() => {
    if (procedure.disinfectionCount === 0) return 'Punktionsstelle desinfizieren'
    if (!procedure.swabDone) return 'Mit Tupfer wischen'
    if (procedure.disinfectionCount < 2) return 'Erneut desinfizieren'
    if (!procedure.tourniquetOn) return 'Stauschlauch anlegen'
    if (!procedure.punctured) return 'Mit Butterfly punktieren'
    if (!anyTubeTaken) return 'Mindestens eine benötigte Monovette abnehmen'
    if (procedure.tourniquetOn) return 'Stauschlauch entfernen'
    if (!procedure.needleRemoved) return 'Butterfly ziehen'
    if (!procedure.plasterDone) return 'Pflaster aufkleben'
    return 'Abnahme abgeschlossen'
  }, [procedure, anyTubeTaken])

  const availableCategories = useMemo(() => {
    const set = new Set()
    Object.entries(procedure.tubes).forEach(([tubeId, taken]) => {
      if (!taken) return
      ;(TUBE_CATEGORY_MAP[tubeId] || []).forEach(cat => set.add(cat))
    })
    return [...set]
  }, [procedure.tubes])

  const availableParams = useMemo(
    () => LAB_PARAMETERS.filter(p => availableCategories.includes(p.category)),
    [availableCategories]
  )

  const totalLabCost = useMemo(() =>
    selectedLabParams.reduce((sum, paramId) => {
      const p = LAB_PARAMETERS.find(lp => lp.id === paramId)
      return sum + (p?.cost || DEFAULT_PARAM_COST)
    }, 0),
    [selectedLabParams]
  )

  const toggleLabParam = (paramId) => {
    setSelectedLabParams(prev => (prev.includes(paramId) ? prev.filter(id => id !== paramId) : [...prev, paramId]))
  }

  const toggleCategoryQuickSelect = (catId) => {
    if (!availableCategories.includes(catId)) return
    const categoryParamIds = LAB_PARAMETERS.filter(p => p.category === catId).map(p => p.id)
    if (categoryParamIds.length === 0) return
    setSelectedLabParams(prev => {
      const allSelected = categoryParamIds.every(id => prev.includes(id))
      if (allSelected) return prev.filter(id => !categoryParamIds.includes(id))
      return [...new Set([...prev, ...categoryParamIds])]
    })
  }

  const attachTool = (toolId) => {
    if (phase !== 'procedure') return
    setAttachedToolId(toolId)
    setHint(`"${TOOLS[toolId].label}" ausgewählt. Zum Arm bewegen und erneut klicken.`)
  }

  const validateHit = (targetName, pos) => {
    const target = TARGETS[targetName]
    if (!target) return false
    return distance(pos, target) <= target.r
  }

  const distanceToTarget = (targetName, pos) => {
    const target = TARGETS[targetName]
    if (!target) return Infinity
    return distance(pos, target)
  }

  const resetProcedureAfterBurst = () => {
    setPhase('procedure')
    setAttachedToolId(null)
    setProcedure({
      disinfectionCount: 0,
      swabDone: false,
      tourniquetOn: false,
      punctured: false,
      tubes: { tube_edta: false, tube_heparin: false, tube_serum: false },
      needleRemoved: false,
      plasterDone: false,
      tourniquetAppliedAt: null,
      puncturedAt: null,
      firstTubeTakenAt: null,
      firstTubeWhileTourniquetOn: null,
    })
  }

  const placeToolOnArm = (event) => {
    if (phase !== 'procedure' || !attachedToolId || !canvasRef.current) {
      setHint('Wähle zuerst ein Instrument auf dem Tablett.')
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const pos = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }

    const toolId = attachedToolId
    const toolLabel = TOOLS[toolId]?.label || toolId

    const fail = (message) => {
      setHint(message)
      return false
    }

    if (toolId === 'tourniquet') {
      if (!validateHit('upperArm', pos)) return fail('Stauschlauch bitte am Oberarm anlegen/entfernen.')
      if (!procedure.tourniquetOn) {
        setProcedure(prev => ({ ...prev, tourniquetOn: true, tourniquetAppliedAt: Date.now() }))
        setHint('Stauschlauch angelegt.')
        setAttachedToolId(null)
      } else {
        if (!anyTubeTaken) return fail('Stauschlauch darf erst nach mindestens einer Blutabnahme entfernt werden.')
        setProcedure(prev => ({ ...prev, tourniquetOn: false }))
        setHint('Stauschlauch entfernt.')
        setAttachedToolId(null)
      }
      return
    }

    if (toolId === 'disinfect') {
      if (!validateHit('punctureSite', pos)) return fail('Bitte nahe der Punktionsstelle desinfizieren.')
      playOneShot(spraySound, { volume: 0.42, maxDurationMs: 1700 })
      if (procedure.disinfectionCount === 0) {
        setProcedure(prev => ({ ...prev, disinfectionCount: 1 }))
        setHint('Erste Desinfektion abgeschlossen.')
        setAttachedToolId(null)
        return
      }
      if (procedure.disinfectionCount === 1 && procedure.swabDone) {
        setProcedure(prev => ({ ...prev, disinfectionCount: 2 }))
        setHint('Zweite Desinfektion abgeschlossen.')
        setAttachedToolId(null)
        return
      }
      return fail('Reihenfolge: Desinfizieren -> Tupfer -> erneut desinfizieren.')
    }

    if (toolId === 'swab') {
      if (!validateHit('punctureSite', pos)) return fail('Bitte den Tupfer über die Punktionsstelle führen.')
      if (procedure.disinfectionCount !== 1) return fail('Vorher einmal desinfizieren.')
      if (procedure.swabDone) return fail('Tupfer-Schritt ist bereits abgeschlossen.')
      setProcedure(prev => ({ ...prev, swabDone: true }))
      setHint('Mit Tupfer gewischt.')
      setAttachedToolId(null)
      return
    }

    if (toolId === 'butterfly') {
      if (!validateHit('punctureSite', pos)) {
        const missDistance = distanceToTarget('punctureSite', pos)
        if (missDistance > (TARGETS.punctureSite.r + 12)) {
          setVeinBurstWarning('Fehlpunktion: Vene verletzt! Blutabnahme muss vollständig neu gestartet werden.')
          setHint('Fehlpunktion mit Butterfly. Bitte komplette Blutabnahme erneut durchführen.')
          resetProcedureAfterBurst()
          return
        }
        return fail('Punktion knapp verfehlt. Bitte genauer an der markierten Venenregion punktieren.')
      }
      if (!procedure.punctured) {
        if (procedure.disinfectionCount < 2 || !procedure.swabDone) return fail('Vor der Punktion: Desinfektion -> Tupfer -> Desinfektion.')
        if (!procedure.tourniquetOn) return fail('Vor der Punktion zuerst Stauschlauch anlegen.')
        setProcedure(prev => ({ ...prev, punctured: true, puncturedAt: Date.now() }))
        setHint('Punktion erfolgreich.')
        setVeinBurstWarning('')
        setAttachedToolId(null)
        return
      }
      if (procedure.tourniquetOn) return fail('Zuerst Stauschlauch entfernen, dann Butterfly ziehen.')
      if (!anyTubeTaken) return fail('Vor dem Ziehen muss mindestens eine Monovette abgenommen werden.')
      if (procedure.needleRemoved) return fail('Butterfly wurde bereits entfernt.')
      setProcedure(prev => ({ ...prev, needleRemoved: true }))
      setHint('Butterfly entfernt.')
      setAttachedToolId(null)
      return
    }

    if (toolId === 'tube_edta' || toolId === 'tube_heparin' || toolId === 'tube_serum') {
      if (!validateHit('punctureSite', pos)) return fail('Monovetten bitte am Butterfly-System am Arm abnehmen.')
      if (!procedure.punctured) return fail('Vor der Abnahme zuerst punktieren.')
      if (procedure.needleRemoved) return fail('Butterfly wurde bereits entfernt.')
      if (procedure.tubes[toolId]) return fail(`${toolLabel} wurde bereits abgenommen.`)

      const nowTs = Date.now()
      setProcedure(prev => ({
        ...prev,
        tubes: { ...prev.tubes, [toolId]: true },
        firstTubeTakenAt: prev.firstTubeTakenAt || nowTs,
        firstTubeWhileTourniquetOn: prev.firstTubeTakenAt
          ? prev.firstTubeWhileTourniquetOn
          : prev.tourniquetOn,
      }))
      setHint(
        procedure.tourniquetOn
          ? `${toolLabel} erfolgreich abgenommen.`
          : `${toolLabel} erfolgreich abgenommen (auch ohne Stauschlauch möglich, solange Butterfly liegt).`
      )
      setAttachedToolId(null)
      return
    }

    if (toolId === 'plaster') {
      if (!validateHit('punctureSite', pos)) return fail('Pflaster bitte an der Punktionsstelle platzieren.')
      if (!procedure.needleRemoved) return fail('Erst Butterfly ziehen, dann Pflaster.')
      if (procedure.plasterDone) return fail('Pflaster ist bereits angebracht.')
      setProcedure(prev => ({ ...prev, plasterDone: true }))
      setHint('Pflaster angelegt. Blutabnahme vollständig.')
      setAttachedToolId(null)
      setPhase('lab')
      return
    }

    setHint(`"${toolLabel}" kann in diesem Schritt nicht verwendet werden.`)
  }

  const buildLabPayload = ({ paramIds, metaPatch = {}, forcedNotTaken = false }) => {
    const orderedAt = new Date().toISOString()
    const results = {}
    const categories = new Set()
    let cost = 0
    ;(paramIds || []).forEach((paramId) => {
      const p = LAB_PARAMETERS.find((lp) => lp.id === paramId)
      if (!p) return
      categories.add(p.category)
      if (forcedNotTaken) {
        results[paramId] = {
          value: 'Nicht abgenommen',
          time: orderedAt,
          readyAt: orderedAt,
          notCollected: true,
        }
        return
      }
      results[paramId] = {
        value: p.genFn(),
        time: orderedAt,
        readyAt: getLabReadyAtIso(p.id, orderedAt),
      }
      cost += Number(p.cost || DEFAULT_PARAM_COST)
    })
    return {
      results,
      cost,
      categories: [...categories],
      selectedParams: [...new Set(paramIds || [])],
      meta: metaPatch || {},
    }
  }

  const mergePayloads = (...parts) => {
    const validParts = parts.filter(Boolean)
    const merged = {
      results: {},
      cost: 0,
      categories: [],
      selectedParams: [],
      meta: {},
    }
    const categorySet = new Set()
    const selectedSet = new Set()
    validParts.forEach((part) => {
      Object.assign(merged.results, part.results || {})
      merged.cost += Number(part.cost || 0)
      ;(part.categories || []).forEach((cat) => categorySet.add(cat))
      ;(part.selectedParams || []).forEach((id) => selectedSet.add(id))
      merged.meta = { ...merged.meta, ...(part.meta || {}) }
    })
    merged.categories = [...categorySet]
    merged.selectedParams = [...selectedSet]
    return merged
  }

  const finalizeAndSubmit = ({ forcedMissing = false } = {}) => {
    if (finalized) return
    const selectedNow = [...new Set(selectedLabParams.filter(Boolean))]
    const bloodParamIds = selectedNow.filter((id) => {
      const param = LAB_PARAMETERS.find((p) => p.id === id)
      return param && param.category !== 'microbiology'
    })
    const mouthMicroParamIds = selectedNow.filter((id) => {
      const param = LAB_PARAMETERS.find((p) => p.id === id)
      return param && param.category === 'microbiology' && MOUTH_MICRO_PARAM_IDS.has(id)
    })
    const unsupportedMicroParamIds = selectedNow.filter((id) => {
      const param = LAB_PARAMETERS.find((p) => p.id === id)
      return param && param.category === 'microbiology' && !MOUTH_MICRO_PARAM_IDS.has(id)
    })

    const needBloodNotTaken = forcedMissing && bloodParamIds.length > 0 && !bloodPayload
    const needMouthNotTaken = forcedMissing && mouthMicroParamIds.length > 0 && !microPayload
    const needUnsupportedNotTaken = unsupportedMicroParamIds.length > 0

    const notTakenMeta = {}
    if (needBloodNotTaken) bloodParamIds.forEach((id) => { notTakenMeta[id] = 'nicht_abgenommen' })
    if (needMouthNotTaken) mouthMicroParamIds.forEach((id) => { notTakenMeta[id] = 'nicht_abgenommen' })
    if (needUnsupportedNotTaken) unsupportedMicroParamIds.forEach((id) => { notTakenMeta[id] = 'nicht_abgenommen' })

    const fallbackBlood = needBloodNotTaken
      ? buildLabPayload({ paramIds: bloodParamIds, forcedNotTaken: true, metaPatch: { sampleStatusByParam: notTakenMeta } })
      : null
    const fallbackMicro = needMouthNotTaken
      ? buildLabPayload({ paramIds: mouthMicroParamIds, forcedNotTaken: true, metaPatch: { sampleStatusByParam: notTakenMeta } })
      : null
    const fallbackUnsupported = needUnsupportedNotTaken
      ? buildLabPayload({ paramIds: unsupportedMicroParamIds, forcedNotTaken: true, metaPatch: { sampleStatusByParam: notTakenMeta } })
      : null

    const merged = mergePayloads(bloodPayload || fallbackBlood, microPayload || fallbackMicro, fallbackUnsupported)
    const hasAny = Object.keys(merged.results || {}).length > 0
    if (!hasAny) return
    const missingCount = Object.values(merged.results || {}).filter((entry) => entry?.notCollected).length
    const meta = {
      ...(merged.meta || {}),
      fromBloodDraw: true,
      warningNote: missingCount > 0
        ? `Hinweis: ${missingCount} Probe(n) nicht abgenommen.`
        : (merged.meta?.warningNote || ''),
    }
    setFinalized(true)
    onSubmit?.({
      results: merged.results,
      cost: merged.cost,
      categories: merged.categories,
      selectedParams: merged.selectedParams,
      meta,
    })
  }

  const orderLab = () => {
    if (selectedLabParams.length === 0 || ordering) return
    setOrdering(true)
    setTimeout(() => {
      const selectedNow = [...new Set(selectedLabParams.filter(Boolean))]
      const bloodParamIds = selectedNow.filter((id) => {
        const p = LAB_PARAMETERS.find((lp) => lp.id === id)
        return p && p.category !== 'microbiology' && availableCategories.includes(p.category)
      })
      const mouthMicroParamIds = selectedNow.filter((id) => {
        const p = LAB_PARAMETERS.find((lp) => lp.id === id)
        return p && p.category === 'microbiology' && MOUTH_MICRO_PARAM_IDS.has(id)
      })
      const bloodPart = buildLabPayload({
        paramIds: bloodParamIds,
        metaPatch: {
          fromBloodDraw: true,
          ...(() => {
            const prolongedVenousStasis =
              !!procedure.puncturedAt &&
              !!procedure.firstTubeTakenAt &&
              procedure.firstTubeWhileTourniquetOn &&
              (procedure.firstTubeTakenAt - procedure.puncturedAt > 60000)
            return {
              possibleFalsified: prolongedVenousStasis,
              warningNote: prolongedVenousStasis
                ? 'Probe möglicherweise verfälscht (Stau >60s nach Punktion bei angelegtem Stauschlauch).'
                : '',
            }
          })(),
        },
      })
      setBloodPayload(bloodPart)
      if (mouthMicroParamIds.length > 0) {
        setHint('Blutprobe abgeschlossen. Jetzt Mund-/Rachen-Mikrobiologie durchführen.')
        setPhase('micro_procedure')
        setOrdering(false)
        return
      }
      setFinalized(true)
      const prolongedVenousStasis =
        !!procedure.puncturedAt &&
        !!procedure.firstTubeTakenAt &&
        procedure.firstTubeWhileTourniquetOn &&
        (procedure.firstTubeTakenAt - procedure.puncturedAt > 60000)
      onSubmit?.({
        results: bloodPart.results,
        cost: bloodPart.cost,
        categories: bloodPart.categories,
        selectedParams: bloodPart.selectedParams,
        meta: {
          fromBloodDraw: true,
          possibleFalsified: prolongedVenousStasis,
          warningNote: prolongedVenousStasis
            ? 'Probe möglicherweise verfälscht (Stau >60s nach Punktion bei angelegtem Stauschlauch).'
            : '',
        },
      })
      setOrdering(false)
    }, 1800)
  }

  const handleMicroCanvasMove = (event) => {
    if (phase !== 'micro_procedure' || !microCanvasRef.current) return
    const rect = microCanvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const clamped = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
    setMicroState((prev) => ({ ...prev, cursor: clamped, cursorPx: { x: event.clientX, y: event.clientY } }))
    if (microState.attachedToolId !== 'swab' || microState.completed) {
      microLastPosRef.current = clamped
      return
    }
    const inSamplingZone = clamped.x >= 28 && clamped.x <= 72 && clamped.y >= 30 && clamped.y <= 74
    if (!inSamplingZone) {
      microLastPosRef.current = clamped
      return
    }
    const last = microLastPosRef.current || clamped
    const delta = distance(clamped, last)
    if (delta > 0.05) {
      setMicroState((prev) => {
        // Slower fill to require longer, deliberate swabbing.
        const nextProgress = Math.min(100, prev.swabProgress + delta * 1.05)
        return {
          ...prev,
          swabProgress: nextProgress,
        }
      })
    }
    microLastPosRef.current = clamped
  }

  const handleMicroComplete = () => {
    const selectedNow = [...new Set(selectedLabParams.filter(Boolean))]
    const mouthMicroParamIds = selectedNow.filter((id) => {
      const p = LAB_PARAMETERS.find((lp) => lp.id === id)
      return p && p.category === 'microbiology' && MOUTH_MICRO_PARAM_IDS.has(id)
    })
    const payload = buildLabPayload({
      paramIds: mouthMicroParamIds,
      metaPatch: { fromBloodDraw: true, fromOralMicroSampling: true },
    })
    setMicroPayload(payload)
    setMicroState((prev) => ({ ...prev, completed: true, attachedToolId: null }))
    setHint('Mikrobiologie abgeschlossen.')
  }

  const handleCloseModal = () => {
    const hasBloodDone = !!bloodPayload && Object.keys(bloodPayload.results || {}).length > 0
    const hasMicroDone = !!microPayload && Object.keys(microPayload.results || {}).length > 0
    const pendingCombinedFlow = hasBloodDone || hasMicroDone
    if (pendingCombinedFlow && !finalized) {
      finalizeAndSubmit({ forcedMissing: true })
      return
    }
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={handleCloseModal} />
      <div
        className="relative w-full max-w-6xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
        onMouseDownCapture={(e) => {
          if (phase !== 'procedure' || !attachedToolId) return
          if (e.button !== 0) return
          const keepSelection = e.target?.closest?.('[data-keep-tool-selection="true"]')
          if (!keepSelection) {
            setAttachedToolId(null)
            setHint('Tool abgewählt.')
          }
        }}
      >
        <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-surface-900">Blutabnahme: Selbst abnehmen</h3>
            <p className="text-xs text-surface-500">
              {patient?.name || 'Patient'} • {phase === 'procedure' ? activeInstruction : (phase === 'lab' ? 'Labor auswählen' : 'Mikrobiologie Mund/Rachen')}
            </p>
          </div>
          <button onClick={handleCloseModal} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-4 h-4 text-surface-500" /></button>
        </div>

        {phase === 'procedure' ? (
          <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px]">
            <div className="p-5 min-h-0 flex flex-col">
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 mb-4">
                <p className="text-sm font-semibold text-surface-900">Aktueller Schritt</p>
                <p className="text-sm text-primary-700 mt-1">{activeInstruction}</p>
                {veinBurstWarning && (
                  <p className="mt-2 text-xs text-red-700 bg-red-100 border border-red-300 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {veinBurstWarning}
                  </p>
                )}
                {hint && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {hint}
                  </p>
                )}
              </div>

              <div
                ref={canvasRef}
                onClick={placeToolOnArm}
                data-keep-tool-selection="true"
                className="flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white relative overflow-hidden cursor-crosshair"
              >
                <img src={armImage} alt="Arm" className="absolute inset-0 m-auto h-[88%] object-contain select-none pointer-events-none" draggable={false} />
                {procedure.tourniquetOn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (attachedToolId) {
                        setHint('Zum Entfernen des Stauschlauchs zuerst das aktive Tool abwählen.')
                        return
                      }
                      setProcedure(prev => ({ ...prev, tourniquetOn: false }))
                      setHint('Stauschlauch entfernt.')
                    }}
                    className="absolute left-[34%] top-[21%] px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                  >
                    Stauschlauch entfernen
                  </button>
                )}

                {procedure.punctured && !procedure.needleRemoved && (
                  <img src={butterflyAsset} alt="" className="absolute left-[32%] top-[45%] w-42 h-48 object-contain rotate-[130deg] pointer-events-none" draggable={false} />
                )}
                {procedure.punctured && !procedure.needleRemoved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (attachedToolId) {
                        setHint('Zum Entfernen des Butterflys zuerst das aktive Tool abwählen.')
                        return
                      }
                      setProcedure(prev => ({ ...prev, needleRemoved: true }))
                      setHint('Butterfly entfernt.')
                    }}
                    className="absolute left-[56%] top-[59%] px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200"
                  >
                    Butterfly entfernen
                  </button>
                )}
                {procedure.plasterDone && (
                  <img src={plasterAsset} alt="" className="absolute left-[47%] top-[44%] w-16 h-20 object-contain pointer-events-none rotate-[-8deg]" draggable={false} />
                )}

                <div className="absolute top-2 left-2 text-[10px] bg-white/85 border border-surface-200 rounded-full px-2 py-1 text-surface-600">
                  {attachedToolId ? `Aktiv: ${TOOLS[attachedToolId].label} (klicken zum Anwenden)` : 'Tool klicken -> am Arm platzieren -> erneut klicken'}
                </div>

                {/* Visuelle Ablage der bereits entnommenen Monovetten */}
                {takenTubes.length > 0 && (
                  <div className="absolute left-3 bottom-3 bg-white/95 border border-surface-200 rounded-xl p-3.5 shadow-md">
                    <p className="text-xs font-semibold text-surface-700 mb-2">Abgenommene Monovetten</p>
                    <div className="flex items-end gap-2">
                      {takenTubes.map((tubeId) => (
                        <div key={tubeId} className="w-20 h-32 rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 shadow-sm">
                          <img src={TOOLS[tubeId].image} alt="" className="w-full h-full object-contain" draggable={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-l border-surface-200 p-4 overflow-y-auto bg-surface-50/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Tablett</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(TOOLS).map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => attachTool(tool.id)}
                    data-keep-tool-selection="true"
                    className={`rounded-xl border p-2 text-left transition-colors ${
                      attachedToolId === tool.id ? 'border-primary-300 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    <div className={`rounded-lg bg-surface-50 border border-surface-100 flex items-center justify-center overflow-hidden ${tool.id === 'butterfly' ? 'h-24' : 'h-20'}`}>
                      <img src={tool.image} alt={tool.label} className={`w-full object-contain select-none pointer-events-none ${tool.id === 'butterfly' ? 'h-24 scale-110' : 'h-full'}`} draggable={false} />
                    </div>
                    <p className="text-[11px] font-medium text-surface-700 mt-1">{tool.label}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-surface-200 space-y-1.5">
                {CHECKLIST.map((s, i) => {
                  const done =
                    (s.id === 'dis1' && procedure.disinfectionCount >= 1) ||
                    (s.id === 'swab' && procedure.swabDone) ||
                    (s.id === 'dis2' && procedure.disinfectionCount >= 2) ||
                    (s.id === 'tourniquet' && (procedure.tourniquetAppliedAt != null)) ||
                    (s.id === 'puncture' && procedure.punctured) ||
                    (s.id === 'tubes' && anyTubeTaken) ||
                    (s.id === 'release' && !procedure.tourniquetOn && anyTubeTaken) ||
                    (s.id === 'removeNeedle' && procedure.needleRemoved) ||
                    (s.id === 'plaster' && procedure.plasterDone)
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-400'}`}>
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className={done ? 'text-surface-700' : 'text-surface-500'}>{s.label}</span>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : phase === 'lab' ? (
          <div className="flex-1 min-h-0 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-surface-900 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-500" /> Labor aus entnommener Probe anfordern</h4>
              <div className="flex gap-2">
                <button onClick={() => setSelectedLabParams(availableParams.map(p => p.id))} className="text-xs text-primary-600 hover:text-primary-700">Alle auswählen</button>
                <button onClick={() => setSelectedLabParams([])} className="text-xs text-surface-500 hover:text-surface-700">Zurücksetzen</button>
              </div>
            </div>
            <p className="text-xs text-surface-500 mb-2">Verfügbar basierend auf entnommenen Röhrchen: {availableCategories.length > 0 ? availableCategories.join(', ') : 'keine'}</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              {LAB_CATEGORIES.map(cat => {
                if (!availableCategories.includes(cat.id)) return null
                const categoryParams = LAB_PARAMETERS.filter(p => p.category === cat.id)
                const selectedCount = categoryParams.filter(p => selectedLabParams.includes(p.id)).length
                const allSelected = categoryParams.length > 0 && selectedCount === categoryParams.length
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategoryQuickSelect(cat.id)}
                    className={`rounded-lg border-2 p-2 text-left ${allSelected ? 'border-primary-300 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'}`}
                  >
                    <p className="text-xs font-medium text-surface-800">{cat.name}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">{selectedCount}/{categoryParams.length} Werte</p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl border border-surface-200 max-h-[46vh] overflow-y-auto">
              {LAB_CATEGORIES.map(cat => {
                if (!availableCategories.includes(cat.id)) return null
                const params = LAB_PARAMETERS.filter(p => p.category === cat.id)
                if (params.length === 0) return null
                return (
                  <div key={cat.id} className="border-b border-surface-100 last:border-b-0">
                    <div className={`px-3 py-2 text-xs font-semibold ${cat.color}`}>{cat.name}</div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      {params.map(p => {
                        const checked = selectedLabParams.includes(p.id)
                        return (
                          <label key={p.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${checked ? 'bg-primary-50 border-primary-200' : 'bg-white border-surface-200 hover:border-surface-300'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleLabParam(p.id)}
                              className="mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-300"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-medium text-surface-800">{p.name}</span>
                              <span className="block text-[10px] text-surface-500">{p.unit || 'qualitativ'} • {p.cost || DEFAULT_PARAM_COST}€</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 border-t border-surface-200 pt-3 flex items-center justify-between">
              <p className="text-sm text-surface-600">{selectedLabParams.length} Werte ausgewählt • <span className="font-semibold">{totalLabCost}€</span></p>
              <button onClick={orderLab} disabled={selectedLabParams.length === 0 || ordering} className="btn-primary text-sm disabled:opacity-50">
                {ordering ? 'Analysiert...' : 'Labor beauftragen'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px]">
            <div className="p-5 min-h-0 flex flex-col">
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 mb-4">
                <p className="text-sm font-semibold text-surface-900">Mikrobiologie: Mund-/Rachenabstrich</p>
                <p className="text-sm text-primary-700 mt-1">1) Tupfer wählen 2) Probe sammeln 3) In Vial überführen</p>
                {hint && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {hint}
                  </p>
                )}
              </div>
              <div
                ref={microCanvasRef}
                onMouseMove={handleMicroCanvasMove}
                className={`flex-1 rounded-2xl border border-surface-200 bg-gradient-to-b from-surface-50 to-white relative overflow-hidden ${
                  microState.attachedToolId === 'swab' ? 'cursor-none' : 'cursor-default'
                }`}
              >
                <img src={mouthMainAsset} alt="Mundabstrich" className="absolute inset-0 m-auto h-[94%] object-contain select-none pointer-events-none" draggable={false} />
                <div className="absolute top-2 left-2 text-[10px] bg-white/85 border border-surface-200 rounded-full px-2 py-1 text-surface-600">
                  Tupfer-Fortschritt: {Math.round(microState.swabProgress)}%
                </div>
                <div className="absolute top-2 right-2 w-44">
                  <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${microState.swabProgress >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                      style={{ width: `${Math.round(microState.swabProgress)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-surface-500">Der Vial-Transfer ist erst bei 100% Abstrich möglich.</p>
                <button
                  onClick={() => {
                    if (!microState.completed) return
                    finalizeAndSubmit({ forcedMissing: true })
                  }}
                  disabled={!microState.completed}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Mikrobiologie abschließen
                </button>
              </div>
            </div>
            <div className="border-l border-surface-200 p-4 overflow-y-auto bg-surface-50/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Tablett</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setMicroState((prev) => ({ ...prev, attachedToolId: 'swab' }))
                    setHint('Tupfer aktiv. Im Mundbereich bewegen, um Material aufzunehmen.')
                  }}
                  className={`rounded-xl border p-2 text-left transition-colors ${microState.attachedToolId === 'swab' ? 'border-primary-300 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'}`}
                >
                  <div className="rounded-lg bg-surface-50 border border-surface-100 h-20 flex items-center justify-center overflow-hidden">
                    <img src={microSwabAsset} alt="Tupfer" className="h-full object-contain select-none pointer-events-none" draggable={false} />
                  </div>
                  <p className="text-[11px] font-medium text-surface-700 mt-1">Swab / Tupfer</p>
                </button>
                <button
                  onClick={() => {
                    if (microState.attachedToolId !== 'swab') {
                      setHint('Bitte zuerst den Tupfer auswählen.')
                      return
                    }
                    if (microState.swabProgress < 100) {
                      setHint('Noch nicht genug Probenmaterial gesammelt.')
                      return
                    }
                    handleMicroComplete()
                  }}
                  className="rounded-xl border p-2 text-left transition-colors border-surface-200 bg-white hover:border-surface-300"
                >
                  <div className="rounded-lg bg-surface-50 border border-surface-100 h-20 flex items-center justify-center overflow-hidden">
                    <img src={microVialAsset} alt="Vial" className="h-full object-contain select-none pointer-events-none" draggable={false} />
                  </div>
                  <p className="text-[11px] font-medium text-surface-700 mt-1">Vial</p>
                </button>
                <button
                  onClick={() => {
                    if (microState.attachedToolId) {
                      setMicroState((prev) => ({ ...prev, attachedToolId: null }))
                      setHint('Tupfer abgelegt.')
                    }
                  }}
                  className="rounded-xl border border-dashed border-surface-300 bg-white px-2 py-2 text-[11px] text-surface-600 hover:border-surface-400"
                >
                  Tool im Feld ablegen
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'procedure' && attachedToolId && (
          <div
            className="fixed z-[90] pointer-events-none"
            style={{ left: cursorPos.x + 10, top: cursorPos.y + 10 }}
          >
            <div className={`${attachedToolId === 'butterfly' ? 'w-20 h-20' : 'w-14 h-14'} rounded-xl bg-white/90 border border-primary-200 shadow-lg p-1`}>
              <img src={TOOLS[attachedToolId].image} alt="" className={`w-full h-full object-contain ${attachedToolId === 'butterfly' ? 'scale-110' : ''}`} draggable={false} />
            </div>
            <div className="mt-1 text-[10px] text-primary-700 bg-white/90 border border-primary-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Platzieren
            </div>
          </div>
        )}
        {phase === 'micro_procedure' && microState.attachedToolId === 'swab' && (
          <div
            className="fixed z-[90] pointer-events-none"
            style={{ left: (microState.cursorPx?.x || 0) + 10, top: (microState.cursorPx?.y || 0) + 10 }}
          >
            <div className="relative w-28 h-28">
              <img src={microSwabAsset} alt="" className="w-full h-full object-contain rotate-[-16deg] drop-shadow-[0_3px_4px_rgba(15,23,42,0.25)]" draggable={false} />
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  right: '16px',
                  top: '27px',
                  width: '22px',
                  height: '22px',
                  opacity: Math.min(0.92, Math.max(0.08, microState.swabProgress / 100)),
                  background: 'radial-gradient(circle, rgba(250,204,21,0.85) 0%, rgba(234,179,8,0.65) 45%, rgba(161,98,7,0.52) 100%)',
                  filter: 'blur(0.2px)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
