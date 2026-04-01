import { getSupabaseClient, isUuid } from '../lib/supabaseClient'

const REGISTRY_KEY = 'medisim_hospitals_registry'
export const CITY_CLINIC_ID = 'h_city_clinic_berlin'
const CHARITE_MEMBER_PERMISSIONS = {
  manage_hospital: true,
  manage_rooms: true,
  manage_staff: true,
  manage_members: true,
  manage_permissions: true,
  manage_finances: true,
  treat_patients: true,
}
const SEEDED_HOSPITALS = [
  {
    id: CITY_CLINIC_ID,
    name: 'Zentralklinik Berlin-Mitte',
    ownerId: 'state',
    balance: 0,
    rooms: [
      { id: 'er', level: 2, condition: 100, patients: [] },
      { id: 'waiting_room', level: 1, condition: 100, patients: [] },
      { id: 'ward', level: 2, condition: 100, patients: [] },
      { id: 'lab', level: 1, condition: 100, patients: [] },
      { id: 'pharmacy', level: 1, condition: 100, patients: [] },
      { id: 'radiology', level: 1, condition: 100, patients: [] },
    ],
    stationEquipment: {
      radiology: ['ultrasound', 'xray_mobile', 'xray_portable', 'ct_scanner', 'mri_scanner'],
      lab: ['lab_analyzer', 'centrifuge', 'microscope'],
    },
    treatmentRooms: [],
    members: [
      {
        userId: 'state',
        name: 'Staat',
        role: 'owner',
        rank: 'Traeger',
        permissions: {
          manage_hospital: true,
          manage_rooms: true,
          manage_staff: true,
          manage_members: true,
          manage_permissions: true,
          manage_finances: true,
          treat_patients: true,
        },
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    workers: [],
    patients: [],
    waitingRoom: [],
    settings: {
      name: 'Zentralklinik Berlin-Mitte',
      city: 'Berlin',
      specialty: 'general',
      isPublic: true,
      maxMembers: 250,
      level: 8,
      reputation: 95,
      motto: 'Spitzenmedizin für alle',
    },
    activityLog: [],
    dailyCosts: 0,
    dailyIncome: 0,
    isClosed: false,
    closedAt: null,
    closureFines: 0,
    activeEvent: null,
    alertQueue: [],
  },
]

function safeParseJson(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_error) {
    return fallback
  }
}

function loadRegistry() {
  return safeParseJson(localStorage.getItem(REGISTRY_KEY), [])
}

function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
}

function toRegistryEntry(hospital, existingCreatedAt = null) {
  const now = new Date().toISOString()
  return {
    id: hospital.id,
    name: hospital.name || 'Krankenhaus',
    city: hospital.settings?.city || null,
    specialty: hospital.settings?.specialty || null,
    max_members: hospital.settings?.maxMembers || 20,
    owner_id: hospital.ownerId || null,
    is_public: hospital.settings?.isPublic !== false,
    state: hospital,
    created_at: existingCreatedAt || now,
    updated_at: now,
  }
}

function mergeWithSeedIfEmpty(id, merged) {
  if (id !== CITY_CLINIC_ID) return merged
  const hasRooms = Array.isArray(merged.rooms) && merged.rooms.length > 0
  if (hasRooms) return merged
  const seed = SEEDED_HOSPITALS.find((s) => s.id === CITY_CLINIC_ID)
  if (!seed) return merged
  return { ...seed, ...merged, id: seed.id, settings: { ...seed.settings, ...(merged.settings || {}) } }
}

function dbRowToHospital(row) {
  if (!row) return null
  const rawState = row.hospital_state && typeof row.hospital_state === 'object' ? row.hospital_state : {}
  let merged = { ...rawState }
  merged = mergeWithSeedIfEmpty(row.id, merged)
  merged.id = row.id
  merged.name = row.name || merged.name
  merged.balance = Number(row.balance ?? merged.balance ?? 0)
  if (row.owner_id) {
    merged.ownerId = String(row.owner_id)
  } else if (!merged.ownerId) {
    merged.ownerId = 'state'
  }
  if (row.city || row.specialty) {
    merged.settings = {
      ...(merged.settings || {}),
      ...(row.city ? { city: row.city } : {}),
      ...(row.specialty ? { specialty: row.specialty } : {}),
    }
  }
  merged._syncVersion = row.version ?? 1
  merged._updatedAt = row.updated_at
  return merged
}

function hospitalToDbPayload(hospital) {
  const ownerId = hospital.ownerId && hospital.ownerId !== 'state' && isUuid(hospital.ownerId)
    ? hospital.ownerId
    : null
  return {
    id: hospital.id,
    name: hospital.name || 'Krankenhaus',
    owner_id: ownerId,
    balance: Number(hospital.balance ?? 0),
    is_public: hospital.settings?.isPublic !== false,
    city: hospital.settings?.city || null,
    specialty: hospital.settings?.specialty || null,
    hospital_state: hospital,
    updated_at: new Date().toISOString(),
  }
}

export async function fetchHospitalById(hospitalId) {
  if (!hospitalId) return { data: null, error: null }
  const sb = getSupabaseClient()
  if (sb) {
    const { data: row, error } = await sb.from('hospitals').select('*').eq('id', hospitalId).maybeSingle()
    if (error) return { data: null, error }
    if (!row) return { data: null, error: null }
    const state = dbRowToHospital(row)
    return { data: toRegistryEntry(state, row.created_at), error: null }
  }

  const raw = localStorage.getItem('medisim_hospital_' + hospitalId)
  const state = safeParseJson(raw, null)
  if (!state) return { data: null, error: null }
  const registry = loadRegistry()
  const existing = registry.find((h) => h.id === hospitalId)
  return { data: toRegistryEntry(state, existing?.created_at), error: null }
}

export async function upsertHospitalState(hospital) {
  if (!hospital?.id) return { data: null, error: new Error('Ungültige Krankenhausdaten.') }

  const sb = getSupabaseClient()
  if (sb) {
    const clean = { ...hospital, _syncVersion: undefined, _updatedAt: undefined }
    const { data: prev } = await sb.from('hospitals').select('version').eq('id', hospital.id).maybeSingle()
    if (!prev) {
      const payload = hospitalToDbPayload(clean)
      payload.version = 1
      const { data: inserted, error } = await sb.from('hospitals').insert(payload).select().maybeSingle()
      if (error) return { data: null, error }
      const state = dbRowToHospital(inserted)
      localStorage.setItem('medisim_hospital_' + hospital.id, JSON.stringify(state))
      return { data: toRegistryEntry(state, inserted?.created_at || null), error: null, version: inserted?.version }
    }
    const prevVersion = prev.version ?? 0
    const nextVersion = prevVersion + 1
    const payload = hospitalToDbPayload(clean)
    payload.version = nextVersion
    const { data: updated, error } = await sb
      .from('hospitals')
      .update(payload)
      .eq('id', hospital.id)
      .eq('version', prevVersion)
      .select()
      .maybeSingle()
    if (error) return { data: null, error }
    if (!updated) {
      return { data: null, error: Object.assign(new Error('Versionskonflikt: bitte Seite neu laden.'), { code: 'CONFLICT' }) }
    }
    const state = dbRowToHospital(updated)
    localStorage.setItem('medisim_hospital_' + hospital.id, JSON.stringify(state))
    return { data: toRegistryEntry(state, null), error: null, version: updated.version }
  }

  localStorage.setItem('medisim_hospital_' + hospital.id, JSON.stringify(hospital))

  const registry = loadRegistry()
  const existing = registry.find((h) => h.id === hospital.id)
  const nextEntry = toRegistryEntry(hospital, existing?.created_at)
  const nextRegistry = existing
    ? registry.map((h) => (h.id === hospital.id ? nextEntry : h))
    : [nextEntry, ...registry]
  saveRegistry(nextRegistry)
  return { data: nextEntry, error: null }
}

export async function listPublicHospitals() {
  const sb = getSupabaseClient()
  if (sb) {
    const { data: rows, error } = await sb.rpc('list_public_hospitals')
    if (error) return { data: null, error }
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      specialty: r.specialty,
      max_members: 250,
      owner_id: null,
      is_public: true,
      state: null,
      updated_at: r.updated_at,
    }))
    return { data: mapped, error: null }
  }

  for (const seed of SEEDED_HOSPITALS) {
    const existing = safeParseJson(localStorage.getItem('medisim_hospital_' + seed.id), null)
    if (!existing) {
      await upsertHospitalState(seed)
    }
  }

  const registry = loadRegistry()
  const byId = new Map(registry.map((entry) => [entry.id, entry]))

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('medisim_hospital_')) continue
    const hospital = safeParseJson(localStorage.getItem(key), null)
    if (!hospital?.id || byId.has(hospital.id)) continue
    byId.set(hospital.id, toRegistryEntry(hospital))
  }

  const merged = Array.from(byId.values())
  saveRegistry(merged)

  const data = merged
    .filter((h) => h.is_public)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  return { data, error: null }
}

export async function createHospitalMembership(hospitalId, user, role = 'member', permissions = {}) {
  if (!hospitalId || !user?.id) return { data: null, error: null }

  const effectivePermissions = hospitalId === CITY_CLINIC_ID
    ? { ...CHARITE_MEMBER_PERMISSIONS, ...permissions }
    : permissions

  const membership = {
    userId: user.id,
    name: user.name || 'Unbekannt',
    role,
    rank: user.title || 'Assistenzarzt/-ärztin',
    permissions: effectivePermissions,
    joinedAt: new Date().toISOString(),
  }

  const sb = getSupabaseClient()
  if (sb && isUuid(user.id)) {
    const memberRow = {
      hospital_id: hospitalId,
      user_id: user.id,
      role,
      display_rank: user.title || null,
      permissions: effectivePermissions,
      joined_at: membership.joinedAt,
    }
    let memErr = (await sb.from('hospital_members').insert(memberRow)).error
    if (memErr?.code === '23505') {
      memErr = (await sb.from('hospital_members').update({
        role,
        display_rank: user.title || null,
        permissions: effectivePermissions,
      }).eq('hospital_id', hospitalId).eq('user_id', user.id)).error
    }
    if (memErr) return { data: null, error: memErr }

    const { data: row, error: fetchErr } = await sb.from('hospitals').select('*').eq('id', hospitalId).maybeSingle()
    if (fetchErr) return { data: null, error: fetchErr }
    if (!row) return { data: null, error: new Error('Krankenhaus nicht gefunden.') }

    let hospital = dbRowToHospital(row)
    const currentMembers = Array.isArray(hospital.members) ? hospital.members : []
    const existingIndex = currentMembers.findIndex((m) => m.userId === user.id)
    const mergedMembership = {
      ...membership,
      permissions: existingIndex >= 0
        ? { ...effectivePermissions, ...(currentMembers[existingIndex].permissions || {}) }
        : effectivePermissions,
      joinedAt: existingIndex >= 0 ? currentMembers[existingIndex].joinedAt : membership.joinedAt,
    }
    const members = existingIndex >= 0
      ? currentMembers.map((m, idx) => (idx === existingIndex ? { ...m, ...mergedMembership } : m))
      : [...currentMembers, mergedMembership]
    hospital = { ...hospital, members }
    await upsertHospitalState(hospital)
    return { data: mergedMembership, error: null }
  }

  const raw = localStorage.getItem('medisim_hospital_' + hospitalId)
  const hospital = safeParseJson(raw, null)
  if (!hospital) return { data: null, error: new Error('Krankenhaus nicht gefunden.') }

  const currentMembers = Array.isArray(hospital.members) ? hospital.members : []
  const existingIndex = currentMembers.findIndex((m) => m.userId === user.id)
  const mergedMembership = {
    ...membership,
    permissions: existingIndex >= 0
      ? { ...effectivePermissions, ...(currentMembers[existingIndex].permissions || {}) }
      : effectivePermissions,
    joinedAt: existingIndex >= 0 ? currentMembers[existingIndex].joinedAt : membership.joinedAt,
  }

  const members = existingIndex >= 0
    ? currentMembers.map((m, idx) => (idx === existingIndex ? { ...m, ...mergedMembership } : m))
    : [...currentMembers, mergedMembership]

  const updatedHospital = { ...hospital, members }
  await upsertHospitalState(updatedHospital)
  return { data: mergedMembership, error: null }
}

export function subscribeHospitalRealtime(hospitalId, onUpdate) {
  const sb = getSupabaseClient()
  if (!sb || !hospitalId || typeof onUpdate !== 'function') return () => {}

  const channel = sb
    .channel(`hospital:${hospitalId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hospitals', filter: `id=eq.${hospitalId}` },
      (payload) => {
        const row = payload.new || payload.old
        if (!row?.hospital_state) return
        const state = dbRowToHospital(row)
        onUpdate(state, row)
      }
    )
    .subscribe()

  return () => {
    sb.removeChannel(channel)
  }
}

export async function removeHospitalsOwnedByUser(userId) {
  if (!userId) return { data: { removed: 0 }, error: null }
  const sb = getSupabaseClient()
  if (sb && isUuid(userId)) {
    const { data, error } = await sb.from('hospitals').delete().eq('owner_id', userId).select('id')
    if (error) return { data: null, error }
    const removed = data?.length || 0
    return { data: { removed }, error: null }
  }

  let removed = 0
  const registry = loadRegistry()
  const keep = []
  registry.forEach((entry) => {
    if (entry?.owner_id === userId) {
      localStorage.removeItem('medisim_hospital_' + entry.id)
      removed += 1
    } else {
      keep.push(entry)
    }
  })
  saveRegistry(keep)
  return { data: { removed }, error: null }
}
