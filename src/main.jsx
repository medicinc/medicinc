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
  wrap.innerHTML = `
    <div style="max-width:760px;width:100%;background:white;border:1px solid #fecaca;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <h2 style="margin:0 0 10px 0;font-size:22px;color:#0f172a;">${title}</h2>
      <p style="margin:0 0 10px 0;color:#334155;">${message}</p>
      <div style="font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px;white-space:pre-wrap;">${String(details || '').slice(0, 4000)}</div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button id="medisim-reload-btn" style="flex:1;padding:10px 12px;border-radius:10px;border:none;background:#2563eb;color:white;font-weight:600;cursor:pointer;">Seite neu laden</button>
      </div>
    </div>
  `
  document.body.appendChild(wrap)
  const reloadBtn = document.getElementById('medisim-reload-btn')
  if (reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload())
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
