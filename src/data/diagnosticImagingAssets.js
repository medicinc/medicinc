import roomXray from '../assets/diagnostics/room-xray-1.png'
import roomMrt from '../assets/diagnostics/room-mrt-1.png'
import roomCt from '../assets/diagnostics/room-ct-1.png'
import roomHkl from '../assets/diagnostics/room-hkl-1.png'

import xrayArmRightHealthy from '../assets/diagnostics/xray-armright-healthy.png'
import xrayArmRightFracture from '../assets/diagnostics/xray-armright-fractureupperarm.png'
import xrayArmLeftHealthy from '../assets/diagnostics/xray-armleft-healthy.png'
import xrayArmLeftFracture from '../assets/diagnostics/xray-armleft-fractureupperarm.png'
import xrayHandRightHealthy from '../assets/diagnostics/xray-handright-healthy.png'
import xrayHandRightFracture from '../assets/diagnostics/xray-handright-fracture.png'
import xrayHandLeftHealthy from '../assets/diagnostics/xray-handleft-healthy.png'
import xrayHandLeftFracture from '../assets/diagnostics/xray-handleft-fracture.png'
import xrayFootRightHealthy from '../assets/diagnostics/xray-footright-healthy.png'
import xrayFootRightFracture from '../assets/diagnostics/xray-footright-fracture.png'
import xrayFootLeftHealthy from '../assets/diagnostics/xray-footleft-healthy.png'
import xrayFootLeftFracture from '../assets/diagnostics/xray-footleft-fracture.png'
import xrayLegRightHealthy from '../assets/diagnostics/xray-legright-healthy.png'
import xrayLegLeftHealthy from '../assets/diagnostics/xray-legleft-healthy.png'
import xrayLegFracture from '../assets/diagnostics/xray-leg-fractured-generic.png'
import xrayPelvisHealthy from '../assets/diagnostics/xray-pelvis-healthy.png'
import xrayPelvisFracture from '../assets/diagnostics/xray-pelvis-fractured.png'
import xraySkullHealthy from '../assets/diagnostics/xray-skull-healthy.png'
import xraySkullFracture from '../assets/diagnostics/xray-skull-fracture.png'
import xrayThoraxHealthy from '../assets/diagnostics/xray-thorax-healthy.png'
import xrayThoraxPneumothorax from '../assets/diagnostics/xray-thorax-pneumothorax.png'
import xrayThoraxPneumonia from '../assets/diagnostics/xray-thorax-pneumonia.png'
import xrayThoraxRibFracture from '../assets/diagnostics/xray-thorax-ribfracture.png'

import mrtSkullHealthy from '../assets/diagnostics/mrt-skull-healthy.png'
import mrtSkullFracture from '../assets/diagnostics/mrt-skull-fracture.png'
import mrtBody from '../assets/diagnostics/mrt-body.png'
import { buildDiagnosticPlaceholderImage } from './ordersCatalog'
import { pickSeriesFrame } from './diagnosticSeriesCatalog'

export function getDiagnosticRoomBackground(modalityId) {
  const key = String(modalityId || '').toLowerCase()
  if (key === 'xray') return roomXray
  if (key === 'mri') return roomMrt
  if (key === 'ct') return roomCt
  if (key === 'hkl') return roomHkl
  return roomXray
}

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function classifyXrayCase(patient, order) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const text = [
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.name,
    order?.notes,
    order?.bodyPart,
    order?.title,
  ].map(normalizeText).join(' ')
  const side = /links|left/.test(text) ? 'left' : /rechts|right/.test(text) ? 'right' : null
  if (/thorax|lunge|brust|rib|rippe|pneumothorax|pneumonie/.test(text) || /^J|^S22/.test(code)) return { region: 'thorax', side }
  if (/schädel|kopf|kranium|hirn|skull/.test(text) || /^S0[2-6]|^S07/.test(code)) return { region: 'skull', side }
  if (/becken|pelvis|hüfte|huefte/.test(text) || /^S32/.test(code)) return { region: 'pelvis', side }
  if (/oberarm|humerus|arm/.test(text) || /^S42/.test(code)) return { region: 'arm', side }
  if (/hand|finger|metakarp/.test(text) || /^S62/.test(code)) return { region: 'hand', side }
  if (/fuß|fuss|foot|metatars/.test(text) || /^S92/.test(code)) return { region: 'foot', side }
  if (/bein|unterschenkel|oberschenkel|tibia|fibula|femur|leg/.test(text) || /^S7|^S8/.test(code)) return { region: 'leg', side }
  return { region: 'thorax', side }
}

function isLikelyPathologic(patient, order) {
  const code = String(patient?.diagnoses?.primary?.code || patient?.trueDiagnoses?.primary?.code || '').toUpperCase()
  const text = [
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.name,
    order?.notes,
  ].map(normalizeText).join(' ')
  return /^S|^J1[2-8]|^J93|^I6|^T/.test(code) || /fraktur|fract|bruch|pneumothorax|pneumonie|infiltrat|trauma/.test(text)
}

export function pickDiagnosticCaptureImage({ modalityId, patient, order, controls = {} }) {
  const modality = String(modalityId || '').toLowerCase()
  if (modality === 'ct' || modality === 'hkl') {
    const seriesFrame = pickSeriesFrame({ modalityId: modality, patient, order, controls })
    if (seriesFrame?.src) {
      const caption = modality === 'ct'
        ? `CT-Bildserie (${String(seriesFrame.region || 'kopf')})`
        : 'HKL-Angiographie-Serie'
      return {
        src: seriesFrame.src,
        series: Array.isArray(seriesFrame.series) ? seriesFrame.series : undefined,
        manifestUrl: seriesFrame.manifestUrl,
        fallbackManifestUrl: seriesFrame.fallbackManifestUrl || undefined,
        pathologyPreset: seriesFrame.preset || undefined,
        testMode: Boolean(seriesFrame.testMode),
        alt: modality === 'ct' ? 'CT-Aufnahme' : 'HKL-Aufnahme',
        caption: `${caption}${seriesFrame.pathologic ? ` (pathologischer Befund${seriesFrame.preset ? `: ${seriesFrame.preset}` : ''})` : ' (ohne akuten pathologischen Befund)'}`,
      }
    }
    return buildDiagnosticPlaceholderImage(modality, modality === 'ct' ? 'CT' : 'HKL')
  }
  if (modality === 'mri') {
    const text = [
      patient?.chiefComplaint,
      patient?.diagnoses?.primary?.name,
      patient?.trueDiagnoses?.primary?.name,
      order?.notes,
      order?.bodyPart,
    ].map(normalizeText).join(' ')
    const pathologic = isLikelyPathologic(patient, order)
    const skullContext = /kopf|schädel|neuro|hirn|stroke|cva/.test(text)
    const src = skullContext ? (pathologic ? mrtSkullFracture : mrtSkullHealthy) : mrtBody
    return {
      src,
      alt: pathologic ? 'MRT pathologischer Befund' : 'MRT ohne pathologischen Befund',
      caption: skullContext ? 'MRT Kopf' : 'MRT Körperregion',
    }
  }

  const pathologic = isLikelyPathologic(patient, order)
  const { region, side } = classifyXrayCase(patient, order)
  const text = [
    patient?.chiefComplaint,
    patient?.diagnoses?.primary?.name,
    patient?.trueDiagnoses?.primary?.name,
    order?.notes,
    order?.bodyPart,
  ].map(normalizeText).join(' ')

  if (region === 'thorax') {
    let src = xrayThoraxHealthy
    if (pathologic && /pneumonie|infiltrat/.test(text)) src = xrayThoraxPneumonia
    else if (pathologic && /pneumothorax/.test(text)) src = xrayThoraxPneumothorax
    else if (pathologic) src = xrayThoraxRibFracture
    return { src, alt: 'Thorax-Röntgen', caption: 'Röntgen Thorax' }
  }
  if (region === 'skull') {
    return { src: pathologic ? xraySkullFracture : xraySkullHealthy, alt: 'Schädel-Röntgen', caption: 'Röntgen Schädel' }
  }
  if (region === 'pelvis') {
    return { src: pathologic ? xrayPelvisFracture : xrayPelvisHealthy, alt: 'Becken-Röntgen', caption: 'Röntgen Becken' }
  }
  if (region === 'arm') {
    if (side === 'left') return { src: pathologic ? xrayArmLeftFracture : xrayArmLeftHealthy, alt: 'Arm links Röntgen', caption: 'Röntgen Arm links' }
    return { src: pathologic ? xrayArmRightFracture : xrayArmRightHealthy, alt: 'Arm rechts Röntgen', caption: 'Röntgen Arm rechts' }
  }
  if (region === 'hand') {
    if (side === 'left') return { src: pathologic ? xrayHandLeftFracture : xrayHandLeftHealthy, alt: 'Hand links Röntgen', caption: 'Röntgen Hand links' }
    return { src: pathologic ? xrayHandRightFracture : xrayHandRightHealthy, alt: 'Hand rechts Röntgen', caption: 'Röntgen Hand rechts' }
  }
  if (region === 'foot') {
    if (side === 'left') return { src: pathologic ? xrayFootLeftFracture : xrayFootLeftHealthy, alt: 'Fuß links Röntgen', caption: 'Röntgen Fuß links' }
    return { src: pathologic ? xrayFootRightFracture : xrayFootRightHealthy, alt: 'Fuß rechts Röntgen', caption: 'Röntgen Fuß rechts' }
  }
  if (region === 'leg') {
    if (pathologic) return { src: xrayLegFracture, alt: 'Bein-Röntgen mit Fraktur', caption: 'Röntgen Bein' }
    if (side === 'left') return { src: xrayLegLeftHealthy, alt: 'Bein links Röntgen', caption: 'Röntgen Bein links' }
    return { src: xrayLegRightHealthy, alt: 'Bein rechts Röntgen', caption: 'Röntgen Bein rechts' }
  }

  return {
    src: controls?.modality === 'mri' ? mrtBody : xrayThoraxHealthy,
    alt: 'Diagnostische Aufnahme',
    caption: 'Radiologische Aufnahme',
  }
}
