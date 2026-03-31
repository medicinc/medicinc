const CT_PROTOCOL_TO_REGION = {
  ct_schaedel: 'kopf',
  ct_thorax: 'thorax',
  ct_abdomen: 'abdomen',
  ct_angio: 'angio',
}

const FORCE_CT_TEST_FOLDER = false

const FILE_CANDIDATES = [
  ...Array.from({ length: 300 }, (_, i) => `slice-${String(i + 1).padStart(3, '0')}.png`),
  ...Array.from({ length: 300 }, (_, i) => `slice-${String(i + 1).padStart(3, '0')}.jpg`),
  ...Array.from({ length: 300 }, (_, i) => `slice-${String(i + 1).padStart(3, '0')}.webp`),
]

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function hashString(text) {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function hasLikelyPathology(patient, order) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const text = [
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.name,
    order?.notes,
    order?.bodyPart,
    order?.title,
  ].map(normalizeText).join(' ')
  return /^S|^I2|^I6|^I7|^J|^T/.test(code) || /okklusion|stenose|isch|blutung|infarkt|pe|embolie|trauma|fraktur|infiltrat|dissektion/.test(text)
}

function pickFromList(list, seedText) {
  if (!Array.isArray(list) || list.length === 0) return null
  const index = hashString(seedText || 'default') % list.length
  return list[index]
}

function getCodeFromPatient(patient) {
  return String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
}

function resolveCtPathologyPreset(region, patient, order) {
  const code = getCodeFromPatient(patient)
  const text = normalizeText([
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.name,
    order?.title,
    order?.notes,
  ].join(' '))

  if (region === 'kopf') {
    if (code.startsWith('I61') || /blutung|haemorrhag|hämorrhag/.test(text)) return 'bleed'
    if (code.startsWith('I63') || code.startsWith('G45') || /isch|insult|stroke/.test(text)) return 'ischemia'
    if (code.startsWith('S06')) return 'bleed'
    return 'bleed'
  }

  if (region === 'thorax') {
    if (code.startsWith('J18') || code.startsWith('J15') || code.startsWith('J12') || /pneumonie|infiltrat/.test(text)) return 'pneumonia'
    if (code.startsWith('I26') || /pneumothorax|ptx/.test(text)) return 'pneumothorax'
    return 'pneumonia'
  }

  if (region === 'abdomen') {
    if (code.startsWith('K35') || /appendiz|appendic/.test(text)) return 'appendicitis'
    if (code.startsWith('K85') || /pankreat|pancreat/.test(text)) return 'pancreatitis'
    if (code.startsWith('K56') || /ileus|subileus/.test(text)) return 'ileus'
    return 'appendicitis'
  }

  return null
}

export function pickSeriesFrame({ modalityId, patient, order, controls = {} }) {
  const modality = String(modalityId || '').toLowerCase()
  const pathologic = hasLikelyPathology(patient, order)
  const seed = [
    patient?.id,
    patient?.name,
    order?.id,
    order?.title,
    order?.createdAt,
  ].map((value) => String(value || '')).join('|')

  if (modality === 'ct') {
    const region = FORCE_CT_TEST_FOLDER ? 'thorax' : getCtRegionFromOrder(order, controls)
    const forcedBucketRaw = String(controls?.ctForceBucket || '').toLowerCase()
    const forcedBucket = forcedBucketRaw === 'gesund' || forcedBucketRaw === 'krank' ? forcedBucketRaw : null
    const effectivePathologic = forcedBucket ? forcedBucket === 'krank' : pathologic
    const bucket = FORCE_CT_TEST_FOLDER ? 'gesund' : (forcedBucket || (effectivePathologic ? 'krank' : 'gesund'))
    const forcedPreset = String(controls?.ctForcePreset || '').trim().toLowerCase()
    const autoPreset = effectivePathologic ? resolveCtPathologyPreset(region, patient, order) : null
    const preset = bucket === 'krank'
      ? (forcedPreset || autoPreset)
      : null
    const basePath = (bucket === 'krank' && preset)
      ? `/imaging/ct/${region}/${bucket}/${preset}`
      : `/imaging/ct/${region}/${bucket}`
    const fallbackBasePath = `/imaging/ct/${region}/${bucket}`
    const series = [
      ...FILE_CANDIDATES.map((file) => `${basePath}/${file}`),
      ...(basePath !== fallbackBasePath ? FILE_CANDIDATES.map((file) => `${fallbackBasePath}/${file}`) : []),
    ]
    const src = pickFromList(series, seed)
    return {
      src,
      series,
      manifestUrl: `${basePath}/manifest.json`,
      fallbackManifestUrl: basePath !== fallbackBasePath ? `${fallbackBasePath}/manifest.json` : null,
      pathologic: effectivePathologic,
      sourceType: 'series-image',
      region,
      bucket,
      preset,
      testMode: FORCE_CT_TEST_FOLDER,
    }
  }

  /* HKL slice stacks under /public/imaging/hkl are optional; missing files produced broken <img> URLs.
   * Fluoroscopy is simulated in-app (HklPtcaMinigame); fall through to SVG placeholder in pickDiagnosticCaptureImage. */
  if (modality === 'hkl') {
    return null
  }

  return null
}

export function getCtRegionFromOrder(order, controls = {}) {
  const fromControls = String(controls?.protocol || '').toLowerCase()
  if (CT_PROTOCOL_TO_REGION[fromControls]) return CT_PROTOCOL_TO_REGION[fromControls]
  const text = normalizeText(`${order?.title || ''} ${order?.bodyPart || ''} ${order?.notes || ''}`)
  if (/thorax|lunge/.test(text)) return 'thorax'
  if (/abdomen|bauch/.test(text)) return 'abdomen'
  if (/angio|cta|gefaess|gefäß/.test(text)) return 'angio'
  return 'kopf'
}

export function buildExpectedCtFolders() {
  return [
    '/imaging/ct/kopf/gesund',
    '/imaging/ct/kopf/krank',
    '/imaging/ct/thorax/gesund',
    '/imaging/ct/thorax/krank',
    '/imaging/ct/abdomen/gesund',
    '/imaging/ct/abdomen/krank',
    '/imaging/ct/angio/gesund',
    '/imaging/ct/angio/krank',
  ]
}

export function buildExpectedHklFolders() {
  return [
    '/imaging/hkl/gesund',
    '/imaging/hkl/krank',
  ]
}
