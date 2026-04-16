import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HospitalProvider } from './context/HospitalContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import App from './App'
import './index.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'

const ALPHA_RELEASE_STORAGE_CLEANUP_KEY = 'medisim_alpha_release_cleanup_2026_05_03_v2'
const LEGACY_TEST_EMAILS = new Set([
  'leitstelle.admin@medisim.app',
  'klinik.admin@medisim.app',
  'gast.01@medisim.app',
  'gast.02@medisim.app',
  'gast.03@medisim.app',
  'alpha.01@medisim.app',
  'alpha.02@medisim.app',
  'alpha.03@medisim.app',
  'alpha.04@medisim.app',
  'alpha.05@medisim.app',
])
const LEGACY_HOSPITAL_IDS = new Set(['h_city_clinic_berlin', 'h_charite_berlin'])

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

function sanitizeHospitalState(hospital) {
  if (!hospital || typeof hospital !== 'object') return hospital
  const resetRoomPatients = Array.isArray(hospital.rooms)
    ? hospital.rooms.map((room) => ({ ...room, patients: [] }))
    : hospital.rooms
  const resetTreatmentRooms = Array.isArray(hospital.treatmentRooms)
    ? hospital.treatmentRooms.map((room) => ({ ...room, patientId: null }))
    : hospital.treatmentRooms
  return {
    ...hospital,
    rooms: resetRoomPatients,
    treatmentRooms: resetTreatmentRooms,
    patients: [],
    waitingRoom: [],
    alertQueue: [],
    pagerMessages: [],
    ivenaQueue: [],
    activeEvent: null,
  }
}

function runAlphaReleaseStorageCleanup() {
  try {
    if (window.localStorage.getItem(ALPHA_RELEASE_STORAGE_CLEANUP_KEY) === '1') return

    const keysToRemove = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key) continue

      if (key === 'medisim_open_hospital_dev' || key === 'medisim_last_runtime_error') {
        keysToRemove.push(key)
        continue
      }

      if (key.startsWith('medisim_user_')) {
        const profile = safeParseJson(window.localStorage.getItem(key), null)
        const email = String(profile?.email || '').toLowerCase()
        if (LEGACY_TEST_EMAILS.has(email) || profile?.role === 'admin' || profile?.role === 'guest') {
          keysToRemove.push(key)
        }
        continue
      }

      if (key.startsWith('medisim_hospital_')) {
        const hospital = safeParseJson(window.localStorage.getItem(key), null)
        if (LEGACY_HOSPITAL_IDS.has(String(hospital?.id || ''))) {
          window.localStorage.setItem(key, JSON.stringify(sanitizeHospitalState(hospital)))
        }
      }
    }

    const activeProfile = safeParseJson(window.localStorage.getItem('medisim_user'), null)
    const activeEmail = String(activeProfile?.email || '').toLowerCase()
    if (
      LEGACY_TEST_EMAILS.has(activeEmail)
      || activeProfile?.role === 'admin'
      || activeProfile?.role === 'guest'
    ) {
      keysToRemove.push('medisim_user')
    }

    const registry = safeParseJson(window.localStorage.getItem('medisim_hospitals_registry'), null)
    if (Array.isArray(registry)) {
      const cleaned = registry.map((entry) => (
        LEGACY_HOSPITAL_IDS.has(String(entry?.id || ''))
          ? { ...entry, state: sanitizeHospitalState(entry?.state) }
          : entry
      ))
      window.localStorage.setItem('medisim_hospitals_registry', JSON.stringify(cleaned))
    }

    Array.from(new Set(keysToRemove)).forEach((key) => window.localStorage.removeItem(key))
    window.localStorage.setItem(ALPHA_RELEASE_STORAGE_CLEANUP_KEY, '1')
  } catch (_error) {
    // Ignore cleanup issues and continue boot.
  }
}

runAlphaReleaseStorageCleanup()

const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
window.localStorage.setItem = (key, value) => {
  try {
    originalSetItem(key, value)
  } catch (error) {
    // Prevent hard crashes when localStorage quota is exceeded.
    console.warn('[localStorage] Speichern fehlgeschlagen:', key, error)
  }
}

function showGlobalCrashOverlay(title, message) {
  const id = 'medisim-global-crash-overlay'
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  const wrap = document.createElement('div')
  wrap.id = id
  wrap.style.position = 'fixed'
  wrap.style.inset = '0'
  wrap.style.zIndex = '999999'
  wrap.style.background = '#f8fafc'
  wrap.style.display = 'flex'
  wrap.style.alignItems = 'center'
  wrap.style.justifyContent = 'center'
  wrap.style.padding = '24px'
  const card = document.createElement('div')
  card.style.maxWidth = '760px'
  card.style.width = '100%'
  card.style.background = 'white'
  card.style.border = '1px solid #fecaca'
  card.style.borderRadius = '16px'
  card.style.boxShadow = '0 8px 30px rgba(0,0,0,.08)'
  card.style.padding = '20px'
  card.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif'

  const heading = document.createElement('h2')
  heading.style.margin = '0 0 10px 0'
  heading.style.fontSize = '22px'
  heading.style.color = '#0f172a'
  heading.textContent = String(title || 'Unerwarteter Fehler')

  const paragraph = document.createElement('p')
  paragraph.style.margin = '0 0 10px 0'
  paragraph.style.color = '#334155'
  paragraph.textContent = String(message || 'Ein unerwarteter Fehler ist aufgetreten.')

  const buttonRow = document.createElement('div')
  buttonRow.style.display = 'flex'
  buttonRow.style.gap = '10px'
  buttonRow.style.marginTop = '12px'

  const reloadBtn = document.createElement('button')
  reloadBtn.id = 'medisim-reload-btn'
  reloadBtn.style.flex = '1'
  reloadBtn.style.padding = '10px 12px'
  reloadBtn.style.borderRadius = '10px'
  reloadBtn.style.border = 'none'
  reloadBtn.style.background = '#2563eb'
  reloadBtn.style.color = 'white'
  reloadBtn.style.fontWeight = '600'
  reloadBtn.style.cursor = 'pointer'
  reloadBtn.textContent = 'Seite neu laden'
  buttonRow.appendChild(reloadBtn)

  card.appendChild(heading)
  card.appendChild(paragraph)
  card.appendChild(buttonRow)
  wrap.appendChild(card)
  document.body.appendChild(wrap)
  reloadBtn.addEventListener('click', () => window.location.reload())
}

window.addEventListener('error', (event) => {
  const payload = {
    at: new Date().toISOString(),
    route: window.location.pathname,
    type: 'window.error',
    message: event?.error?.message || event?.message || 'Unbekannter Laufzeitfehler',
    stack: event?.error?.stack || '',
  }
  try {
    localStorage.setItem('medisim_last_runtime_error', JSON.stringify(payload))
  } catch (_e) {
    // Ignore storage failures.
  }
  showGlobalCrashOverlay(
    'Unerwarteter Laufzeitfehler',
    'Es ist ein unerwarteter Fehler aufgetreten. Bitte lade die Seite neu.'
  )
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const payload = {
    at: new Date().toISOString(),
    route: window.location.pathname,
    type: 'unhandledrejection',
    message: reason?.message || String(reason || 'Promise-Rejection ohne Details'),
    stack: reason?.stack || '',
  }
  try {
    localStorage.setItem('medisim_last_runtime_error', JSON.stringify(payload))
  } catch (_e) {
    // Ignore storage failures.
  }
  showGlobalCrashOverlay(
    'Unbehandelter Promise-Fehler',
    'Eine Promise wurde ohne Fehlerbehandlung abgebrochen.',
    `${payload.message}\n\n${payload.stack}`
  )
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <App />
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  </AppErrorBoundary>
)
