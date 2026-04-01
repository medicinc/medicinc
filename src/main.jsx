import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HospitalProvider } from './context/HospitalContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import App from './App'
import './index.css'

const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
window.localStorage.setItem = (key, value) => {
  try {
    originalSetItem(key, value)
  } catch (error) {
    // Prevent hard crashes when localStorage quota is exceeded.
    console.warn('[localStorage] Speichern fehlgeschlagen:', key, error)
  }
}

function showGlobalCrashOverlay(title, message, details = '') {
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

  const detailBox = document.createElement('div')
  detailBox.style.fontSize = '12px'
  detailBox.style.color = '#b91c1c'
  detailBox.style.background = '#fef2f2'
  detailBox.style.border = '1px solid #fecaca'
  detailBox.style.borderRadius = '10px'
  detailBox.style.padding = '10px'
  detailBox.style.whiteSpace = 'pre-wrap'
  detailBox.textContent = String(details || '').slice(0, 4000)

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
  card.appendChild(detailBox)
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
    'Ein globaler JavaScript-Fehler wurde abgefangen.',
    `${payload.message}\n\n${payload.stack}`
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
