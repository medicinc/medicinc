/** Shared synthetic waveforms for patient monitors (KH/RD MonitorUI, HKL cath lab, etc.) */

export const ECG_SEGMENT = [
  0, 0, 0, 0, 0, 0, 0,
  0, 0.5, 1, 0.5, 0,
  0, 0, 0, 0,
  -0.5, 0, 12, -4, 0, 0.5, 0,
  0, 0, 0, 0, 0, 0,
  0, 0.5, 1.5, 2, 2.5, 2.5, 2, 1.5, 1, 0.5, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]

function sampleEcgSegment(phaseFloat) {
  const segLen = ECG_SEGMENT.length
  let p = phaseFloat % segLen
  if (p < 0) p += segLen
  const i0 = Math.floor(p) % segLen
  const i1 = (i0 + 1) % segLen
  const t = p - Math.floor(p)
  return ECG_SEGMENT[i0] * (1 - t) + ECG_SEGMENT[i1] * t
}

export function generateEcgPath(width, height, phase, amplitude = 1) {
  const mid = height / 2
  const totalPoints = Math.max(8, Math.floor(width / 2))
  const ph = Number(phase) || 0
  const amp = Number(amplitude) || 1
  let d = ''
  for (let i = 0; i < totalPoints; i++) {
    const samp = sampleEcgSegment(i + ph)
    const val = samp * amp * (height * 0.035)
    const x = (i / Math.max(1, totalPoints - 1)) * width
    const y = mid - val
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}

export function generateFlatline(width, height) {
  const mid = height / 2
  return `M0,${mid} L${width},${mid}`
}

export function generateVfPath(width, height, phase = 0) {
  const mid = height / 2
  const totalPoints = Math.floor(width / 2)
  let d = ''
  for (let i = 0; i < totalPoints; i++) {
    const x = (i / totalPoints) * width
    const noise = Math.sin((i + phase) * 0.35) * 0.7 + Math.cos((i + phase) * 0.21) * 0.4
    const y = mid - (noise * height * 0.16)
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}

function capnoSmoothstep(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Time-based EtCO₂: scrollt mit phase01 (0…1 pro Atemzyklus); kein „Zickzack“ pro Spalte. */
export function generateCapnographyPath(width, height, phase01) {
  const n = Math.max(24, Math.floor(width / 2))
  const base = height * 0.82
  const plateau = height * 0.24
  let ph = phase01 % 1
  if (ph < 0) ph += 1
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1)) * width
    let u = ph + i / n
    u -= Math.floor(u)
    let y = base
    if (u < 0.11) {
      y = base + (plateau - base) * capnoSmoothstep(u / 0.11)
    } else if (u < 0.48) {
      y = plateau
    } else if (u < 0.56) {
      y = plateau + (base - plateau) * capnoSmoothstep((u - 0.48) / 0.08)
    } else {
      y = base
    }
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`
  }
  return d
}
