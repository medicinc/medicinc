import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unbekannter Fehler' }
  }

  componentDidCatch(error, errorInfo) {
    const payload = {
      at: new Date().toISOString(),
      route: window.location.pathname,
      message: error?.message || 'Unbekannter Fehler',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
    }
    try {
      localStorage.setItem('medisim_last_runtime_error', JSON.stringify(payload))
    } catch (_e) {
      // Ignore storage failures.
    }
    console.error('[AppErrorBoundary] UI-Absturz abgefangen', payload)
  }

  handleReload = () => {
    window.location.reload()
  }

  componentDidUpdate(_prevProps, prevState) {
    if (!prevState.hasError && this.state.hasError) {
      try {
        document.body.style.background = '#f8fafc'
      } catch (_e) {
        // Ignore DOM errors.
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-surface-900 mb-2">Die Ansicht musste neu geladen werden</h1>
          <p className="text-sm text-surface-600 mb-4">
            Es ist ein unerwarteter UI-Fehler aufgetreten. Deine gespeicherten Daten bleiben erhalten.
          </p>
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            Fehler: {this.state.message}
          </p>
          <button onClick={this.handleReload} className="btn-primary w-full">
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }
}
