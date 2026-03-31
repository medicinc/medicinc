const activeLoops = new Map()
const decodedBufferCache = new Map()
let sharedAudioContext = null

function createAudio(src, volume = 1, loop = false) {
  const audio = new Audio(src)
  audio.volume = Math.max(0, Math.min(1, volume))
  audio.loop = loop
  return audio
}

function getAudioContext() {
  if (sharedAudioContext) return sharedAudioContext
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  sharedAudioContext = new Ctx()
  return sharedAudioContext
}

async function getDecodedBuffer(src) {
  if (!decodedBufferCache.has(src)) {
    const loadPromise = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`)
        return res.arrayBuffer()
      })
      .then((arrayBuffer) => {
        const context = getAudioContext()
        if (!context) throw new Error('WebAudio not available')
        return context.decodeAudioData(arrayBuffer.slice(0))
      })
    decodedBufferCache.set(src, loadPromise)
  }
  return decodedBufferCache.get(src)
}

function findNearestZeroCrossingIndex(channelData, targetIndex, searchRadius) {
  if (!channelData || channelData.length === 0) return targetIndex
  const safeTarget = Math.max(1, Math.min(channelData.length - 2, targetIndex))
  const min = Math.max(1, safeTarget - searchRadius)
  const max = Math.min(channelData.length - 2, safeTarget + searchRadius)
  let best = safeTarget
  let bestScore = Number.POSITIVE_INFINITY
  for (let i = min; i <= max; i += 1) {
    const a = channelData[i]
    const b = channelData[i + 1]
    const crossing = (a <= 0 && b >= 0) || (a >= 0 && b <= 0)
    const absLevel = Math.min(Math.abs(a), Math.abs(b))
    const distance = Math.abs(i - safeTarget)
    if (crossing) {
      const score = distance + absLevel * 1200
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    } else if (bestScore === Number.POSITIVE_INFINITY) {
      // Fallback if we don't find an exact sign crossing nearby.
      const score = distance + absLevel * 2500
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
  }
  return best
}

function calculateSeamScore(channelData, startIndex, endIndex, windowSize) {
  const n = channelData.length
  if (!channelData || n < 4) return Number.POSITIVE_INFINITY
  const safeWindow = Math.max(8, Math.min(windowSize, 192))
  if (startIndex + safeWindow >= n || endIndex - safeWindow < 1) return Number.POSITIVE_INFINITY

  let error = 0
  for (let i = 0; i < safeWindow; i += 1) {
    const a = channelData[startIndex + i]
    const b = channelData[endIndex - safeWindow + i]
    const d = a - b
    error += d * d
  }

  const startA = channelData[Math.max(1, startIndex)]
  const startB = channelData[Math.max(2, startIndex + 1)]
  const endA = channelData[Math.max(1, endIndex - 1)]
  const endB = channelData[Math.max(2, endIndex - 2)]
  const slopeStart = startB - startA
  const slopeEnd = endA - endB
  const slopeDiff = slopeStart - slopeEnd
  error += slopeDiff * slopeDiff * 180

  const ampDiff = startA - endA
  error += ampDiff * ampDiff * 260
  return error
}

function computeSeamAwareLoopPoints(
  buffer,
  loopStartSec = 0,
  trimEndSec = 0,
  {
    seamSearchRadiusSec = 0.16,
    seamWindowSec = 0.0035,
    detectSilenceBounds = false,
    silenceThreshold = 0.0025,
  } = {},
) {
  const duration = Number(buffer?.duration || 0)
  if (!Number.isFinite(duration) || duration <= 0.06) {
    return { startAt: Math.max(0, Number(loopStartSec) || 0), endAt: Math.max(0.06, duration) }
  }
  const baseStart = Math.max(0, Number(loopStartSec) || 0)
  const baseEnd = Math.max(baseStart + 0.04, duration - Math.max(0, Number(trimEndSec) || 0))
  const channelData = buffer.getChannelData(0)
  if (!channelData || channelData.length < 8) {
    return { startAt: baseStart, endAt: Math.min(duration - 0.002, baseEnd) }
  }
  const sampleRate = Number(buffer.sampleRate || 44100)
  let startFloorSec = 0
  let endCeilSec = duration
  if (detectSilenceBounds) {
    const thr = Math.max(0.0002, Number(silenceThreshold) || 0.0025)
    const minRun = Math.max(12, Math.round(sampleRate * 0.004))
    let first = -1
    let run = 0
    for (let i = 0; i < channelData.length; i += 1) {
      if (Math.abs(channelData[i]) >= thr) {
        run += 1
        if (run >= minRun) {
          first = i - run + 1
          break
        }
      } else {
        run = 0
      }
    }
    let last = -1
    run = 0
    for (let i = channelData.length - 1; i >= 0; i -= 1) {
      if (Math.abs(channelData[i]) >= thr) {
        run += 1
        if (run >= minRun) {
          last = i + run - 1
          break
        }
      } else {
        run = 0
      }
    }
    if (first >= 0 && last >= 0 && last > first + Math.round(sampleRate * 0.05)) {
      startFloorSec = Math.max(0, first / sampleRate + 0.004)
      endCeilSec = Math.min(duration, last / sampleRate - 0.004)
    }
  }
  const boundedStart = Math.max(baseStart, startFloorSec)
  const boundedEnd = Math.min(baseEnd, endCeilSec)
  const safeStart = Math.min(boundedStart, Math.max(0, boundedEnd - 0.06))
  const safeEnd = Math.max(safeStart + 0.05, boundedEnd)
  const targetStartIndex = Math.round(safeStart * sampleRate)
  const targetEndIndex = Math.round(safeEnd * sampleRate)
  const searchRadius = Math.max(128, Math.round(sampleRate * 0.08))
  const seamSearchRadius = Math.max(512, Math.round(sampleRate * Math.max(0.05, Number(seamSearchRadiusSec) || 0.16)))
  const seamWindowSamples = Math.max(16, Math.round(sampleRate * Math.max(0.0015, Number(seamWindowSec) || 0.0035)))
  const startIndex = findNearestZeroCrossingIndex(channelData, targetStartIndex, searchRadius)
  let endIndex = findNearestZeroCrossingIndex(channelData, targetEndIndex, searchRadius)

  // Refine end loop point by matching seam window to loop start window.
  const minSeamGap = Math.max(Math.round(sampleRate * 0.04), 64)
  const candidateMin = Math.max(startIndex + minSeamGap, targetEndIndex - seamSearchRadius)
  const candidateMax = Math.min(channelData.length - 2, targetEndIndex + seamSearchRadius)
  let bestCandidate = endIndex
  let bestScore = calculateSeamScore(channelData, startIndex, endIndex, seamWindowSamples)
  const step = 1
  for (let i = candidateMin; i <= candidateMax; i += step) {
    const score = calculateSeamScore(channelData, startIndex, i, seamWindowSamples)
    if (score < bestScore) {
      bestScore = score
      bestCandidate = i
    }
  }
  endIndex = bestCandidate

  const minGap = Math.round(sampleRate * 0.04)
  if (endIndex <= startIndex + minGap) {
    endIndex = Math.min(channelData.length - 2, startIndex + minGap)
  }
  const startAt = Math.max(0, startIndex / sampleRate)
  const endAt = Math.min(duration - 0.001, endIndex / sampleRate)
  return {
    startAt,
    endAt: Math.max(startAt + 0.03, endAt),
  }
}

function attachTrimmedLoop(audio, { loopStartSec = 0, trimEndSec = 0 } = {}) {
  const startAt = Math.max(0, Number(loopStartSec) || 0)
  const trimEnd = Math.max(0, Number(trimEndSec) || 0)
  if (!audio || trimEnd <= 0) return () => {}

  audio.loop = false
  let timerId = null

  const jumpToStart = () => {
    try {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      const endAt = Math.max(startAt + 0.05, audio.duration - trimEnd)
      const preJumpWindowSec = 0.045
      if (audio.currentTime >= (endAt - preJumpWindowSec)) {
        audio.currentTime = startAt
        if (audio.paused) {
          const p = audio.play()
          if (p && typeof p.catch === 'function') p.catch(() => {})
        }
      }
    } catch {
      // Ignore playback edge errors.
    }
  }

  const handleLoadedMetadata = () => {
    if (startAt > 0) {
      try {
        audio.currentTime = Math.min(startAt, Math.max(0, (audio.duration || 0) - 0.05))
      } catch {
        // Ignore seeking errors if metadata is not fully available yet.
      }
    }
  }

  audio.addEventListener('loadedmetadata', handleLoadedMetadata)
  audio.addEventListener('ended', jumpToStart)
  timerId = window.setInterval(jumpToStart, 8)

  return () => {
    if (timerId) window.clearInterval(timerId)
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    audio.removeEventListener('ended', jumpToStart)
  }
}

function createCrossfadeWebAudioLoop(context, buffer, { startAt, endAt, volume, crossfadeSec }) {
  const loopDuration = Math.max(0.05, endAt - startAt)
  const xfade = Math.max(0.004, Math.min(crossfadeSec, loopDuration * 0.45))
  const step = Math.max(0.02, loopDuration - xfade)
  const masterGain = context.createGain()
  masterGain.gain.value = Math.max(0, Math.min(1, volume))
  masterGain.connect(context.destination)

  const activeNodes = new Set()
  let schedulerTimer = null
  let stopped = false
  let nextStartTime = context.currentTime + 0.03
  let isFirst = true

  const cleanupNode = (nodeRef) => {
    if (!nodeRef) return
    activeNodes.delete(nodeRef)
    try {
      nodeRef.source.disconnect()
      nodeRef.gain.disconnect()
    } catch {
      // Ignore node cleanup races.
    }
  }

  const scheduleSegment = (atTime, firstSegment = false) => {
    if (stopped) return
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.connect(gain)
    gain.connect(masterGain)

    if (firstSegment) {
      gain.gain.setValueAtTime(1, atTime)
    } else {
      gain.gain.setValueAtTime(0, atTime)
      gain.gain.linearRampToValueAtTime(1, atTime + xfade)
    }
    gain.gain.setValueAtTime(1, atTime + Math.max(xfade, 0.006))
    gain.gain.linearRampToValueAtTime(0, atTime + loopDuration)

    const nodeRef = { source, gain }
    activeNodes.add(nodeRef)
    source.onended = () => cleanupNode(nodeRef)
    source.start(atTime, startAt, loopDuration)
    source.stop(atTime + loopDuration + 0.03)
  }

  const scheduler = () => {
    if (stopped) return
    const lookAhead = 0.24
    const now = context.currentTime
    while (nextStartTime <= now + lookAhead) {
      scheduleSegment(nextStartTime, isFirst)
      isFirst = false
      nextStartTime += step
    }
  }

  scheduler()
  schedulerTimer = window.setInterval(scheduler, 35)

  return {
    masterGain,
    stop: () => {
      stopped = true
      if (schedulerTimer) window.clearInterval(schedulerTimer)
      activeNodes.forEach((nodeRef) => {
        try { nodeRef.source.stop() } catch {}
        cleanupNode(nodeRef)
      })
      try { masterGain.disconnect() } catch {}
    },
  }
}

export function playOneShot(src, {
  volume = 0.5,
  maxDurationMs = null,
  trimStartSec = null,
  fromTailSec = null,
} = {}) {
  if (!src) return null
  const audio = createAudio(src, volume, false)
  const startAt = Number.isFinite(trimStartSec)
    ? Math.max(0, Number(trimStartSec) || 0)
    : null
  const tailLen = Number.isFinite(fromTailSec) ? Math.max(0, Number(fromTailSec) || 0) : null
  if (startAt != null || tailLen != null) {
    const seekFromMetadata = () => {
      try {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
        const seekTime = tailLen != null
          ? Math.max(0, audio.duration - tailLen)
          : startAt
        if (Number.isFinite(seekTime)) audio.currentTime = seekTime
      } catch {
        // Ignore seek failures on locked media metadata.
      }
    }
    if (Number.isFinite(audio.duration) && audio.duration > 0) seekFromMetadata()
    else audio.addEventListener('loadedmetadata', seekFromMetadata, { once: true })
  }
  const playPromise = audio.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {})
  }
  if (maxDurationMs && maxDurationMs > 0) {
    window.setTimeout(() => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // Ignore cleanup errors when browser has already disposed audio.
      }
    }, maxDurationMs)
  }
  return audio
}

export function startLoop(
  key,
  src,
  {
    volume = 0.2,
    loopStartSec = 0,
    trimEndSec = 0,
    seamSearchRadiusSec = 0.16,
    seamWindowSec = 0.0035,
    seamCrossfadeSec = 0,
    detectSilenceBounds = false,
    silenceThreshold = 0.0025,
  } = {},
) {
  if (!key || !src) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  const existing = activeLoops.get(key)
  if (existing && existing.src === src) {
    if (existing.type === 'html') {
      existing.audio.volume = clampedVolume
      return
    }
    if (existing.type === 'webaudio') {
      if (existing.trimEndSec === trimEndSec && existing.loopStartSec === loopStartSec) {
        existing.gainNode.gain.value = clampedVolume
        return
      }
    }
    if (existing.type === 'webaudio_xfade') {
      if (
        existing.trimEndSec === trimEndSec
        && existing.loopStartSec === loopStartSec
        && existing.seamCrossfadeSec === seamCrossfadeSec
      ) {
        existing.masterGain.gain.value = clampedVolume
        return
      }
    }
    if (existing.type === 'webaudio_pending') {
      existing.volume = clampedVolume
      return
    }
  }
  if (existing) {
    stopLoop(key)
  }

  if (trimEndSec > 0) {
    const context = getAudioContext()
    if (context) {
      const token = Symbol(`loop_${key}`)
      activeLoops.set(key, { type: 'webaudio_pending', src, token, volume: clampedVolume, loopStartSec, trimEndSec })
      const resumePromise = context.state === 'suspended' ? context.resume().catch(() => {}) : Promise.resolve()
      resumePromise.then(() => {
        getDecodedBuffer(src)
          .then((buffer) => {
            const current = activeLoops.get(key)
            if (!current || current.type !== 'webaudio_pending' || current.token !== token) return
            const { startAt, endAt } = computeSeamAwareLoopPoints(
              buffer,
              loopStartSec,
              trimEndSec,
              { seamSearchRadiusSec, seamWindowSec, detectSilenceBounds, silenceThreshold },
            )
            if (seamCrossfadeSec > 0.001) {
              const xfadeLoop = createCrossfadeWebAudioLoop(context, buffer, {
                startAt,
                endAt,
                volume: current.volume,
                crossfadeSec: seamCrossfadeSec,
              })
              activeLoops.set(key, {
                type: 'webaudio_xfade',
                src,
                masterGain: xfadeLoop.masterGain,
                stopCrossfade: xfadeLoop.stop,
                loopStartSec: loopStartSec,
                trimEndSec: trimEndSec,
                seamCrossfadeSec,
                startAt,
                endAt,
              })
              return
            }
            const source = context.createBufferSource()
            const gainNode = context.createGain()
            gainNode.gain.value = Math.max(0, Math.min(1, current.volume))
            source.buffer = buffer
            source.loop = true
            source.loopStart = startAt
            source.loopEnd = endAt
            source.connect(gainNode)
            gainNode.connect(context.destination)
            source.start(0, startAt)
            activeLoops.set(key, {
              type: 'webaudio',
              src,
              source,
              gainNode,
              loopStartSec: loopStartSec,
              trimEndSec: trimEndSec,
              seamCrossfadeSec,
              startAt,
              endAt,
            })
          })
          .catch(() => {
            const current = activeLoops.get(key)
            if (!current || current.type !== 'webaudio_pending' || current.token !== token) return
            // Fallback to HTMLAudio trimmed loop if WebAudio decode fails.
            const fallbackAudio = createAudio(src, clampedVolume, false)
            const cleanupTrimmedLoop = attachTrimmedLoop(fallbackAudio, { loopStartSec, trimEndSec })
            const playPromise = fallbackAudio.play()
            if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {})
            activeLoops.set(key, { type: 'html', audio: fallbackAudio, src, cleanupTrimmedLoop })
          })
      })
      return
    }
  }

  const audio = createAudio(src, clampedVolume, trimEndSec <= 0)
  const cleanupTrimmedLoop = attachTrimmedLoop(audio, { loopStartSec, trimEndSec })
  const playPromise = audio.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {})
  }
  activeLoops.set(key, { type: 'html', audio, src, cleanupTrimmedLoop })
}

export function startToneLoop(key, { frequency = 980, volume = 0.12, wave = 'square' } = {}) {
  if (!key) return
  const clampedVolume = Math.max(0, Math.min(1, Number(volume) || 0))
  const existing = activeLoops.get(key)
  if (existing?.type === 'tone') {
    try {
      existing.gainNode.gain.value = clampedVolume
      existing.oscillator.frequency.value = Number(frequency) || 980
      return
    } catch {
      stopLoop(key)
    }
  } else if (existing) {
    stopLoop(key)
  }

  const context = getAudioContext()
  if (!context) return
  const token = Symbol(`tone_${key}`)
  activeLoops.set(key, { type: 'tone_pending', token, src: '__tone__' })
  const resumePromise = context.state === 'suspended' ? context.resume().catch(() => {}) : Promise.resolve()
  resumePromise.then(() => {
    const current = activeLoops.get(key)
    // Ensure key was not replaced while awaiting resume.
    if (!current || current.type !== 'tone_pending' || current.token !== token) return
    const osc = context.createOscillator()
    const gainNode = context.createGain()
    osc.type = wave
    osc.frequency.value = Number(frequency) || 980
    gainNode.gain.value = clampedVolume
    osc.connect(gainNode)
    gainNode.connect(context.destination)
    osc.start()
    activeLoops.set(key, { type: 'tone', oscillator: osc, gainNode, src: '__tone__' })
  })
}

export function stopLoop(key) {
  const existing = activeLoops.get(key)
  if (!existing) return
  if (existing.type === 'webaudio_pending') {
    activeLoops.delete(key)
    return
  }
  if (existing.type === 'tone_pending') {
    activeLoops.delete(key)
    return
  }
  if (existing.type === 'tone') {
    try {
      existing.oscillator.stop()
    } catch {
      // Ignore oscillator stop race conditions.
    }
    try {
      existing.oscillator.disconnect()
      existing.gainNode.disconnect()
    } catch {
      // Ignore disconnect errors.
    }
    activeLoops.delete(key)
    return
  }
  if (existing.type === 'webaudio') {
    try {
      existing.source.stop()
    } catch {
      // Ignore stop race conditions.
    }
    try {
      existing.source.disconnect()
      existing.gainNode.disconnect()
    } catch {
      // Ignore disconnect errors.
    }
    activeLoops.delete(key)
    return
  }
  if (existing.type === 'webaudio_xfade') {
    try {
      if (typeof existing.stopCrossfade === 'function') existing.stopCrossfade()
    } catch {
      // Ignore crossfade loop cleanup races.
    }
    activeLoops.delete(key)
    return
  }
  try {
    existing.audio.pause()
    existing.audio.currentTime = 0
    if (typeof existing.cleanupTrimmedLoop === 'function') {
      existing.cleanupTrimmedLoop()
    }
  } catch {
    // Ignore cleanup errors when browser has already disposed audio.
  }
  activeLoops.delete(key)
}

export function stopAllLoops() {
  for (const key of activeLoops.keys()) {
    stopLoop(key)
  }
}

export function getActiveLoopsSnapshot() {
  const result = []
  activeLoops.forEach((entry, key) => {
    result.push({
      key,
      type: entry?.type || 'unknown',
      src: entry?.src || null,
      loopStartSec: Number.isFinite(entry?.loopStartSec) ? entry.loopStartSec : null,
      trimEndSec: Number.isFinite(entry?.trimEndSec) ? entry.trimEndSec : null,
      seamCrossfadeSec: Number.isFinite(entry?.seamCrossfadeSec) ? entry.seamCrossfadeSec : null,
      startAt: Number.isFinite(entry?.startAt) ? Number(entry.startAt.toFixed(4)) : null,
      endAt: Number.isFinite(entry?.endAt) ? Number(entry.endAt.toFixed(4)) : null,
    })
  })
  return result
}
