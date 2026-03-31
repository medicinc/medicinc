const MOD_REPORT_KEY = 'medisim_moderation_reports'

function safeParse(value, fallback) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

export function submitModerationReport(report) {
  const current = safeParse(localStorage.getItem(MOD_REPORT_KEY), [])
  const entry = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...report,
  }
  localStorage.setItem(MOD_REPORT_KEY, JSON.stringify([entry, ...current].slice(0, 500)))
  return entry
}
