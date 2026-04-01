import { getSupabaseClient, isUuid } from '../lib/supabaseClient'
const MOD_REPORT_KEY = 'medisim_moderation_reports'

function safeParse(value, fallback) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

export async function submitModerationReport(report) {
  const current = safeParse(localStorage.getItem(MOD_REPORT_KEY), [])
  const entry = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...report,
  }
  const sb = getSupabaseClient()
  if (sb && isUuid(report?.reporterId)) {
    const { error } = await sb.from('moderation_reports').insert({
      id: entry.id,
      target_type: String(report?.targetType || 'unknown'),
      target_id: report?.targetId || null,
      target_label: report?.targetLabel || null,
      reason: String(report?.reason || 'Unbekannt'),
      reporter_id: report?.reporterId || null,
      created_at: entry.createdAt,
    })
    if (!error) return entry
  }
  localStorage.setItem(MOD_REPORT_KEY, JSON.stringify([entry, ...current].slice(0, 500)))
  return entry
}
