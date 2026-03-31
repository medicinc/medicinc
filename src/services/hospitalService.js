const REGISTRY_KEY = 'medisim_hospitals_registry'
const CITY_CLINIC_ID = 'h_city_clinic_berlin'
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

export async function fetchHospitalById(hospitalId) {
  if (!hospitalId) return { data: null, error: null }
  const raw = localStorage.getItem('medisim_hospital_' + hospitalId)
  const state = safeParseJson(raw, null)
  if (!state) return { data: null, error: null }
  const registry = loadRegistry()
  const existing = registry.find(h => h.id === hospitalId)
  return { data: toRegistryEntry(state, existing?.created_at), error: null }
}

export async function upsertHospitalState(hospital) {
  if (!hospital?.id) return { data: null, error: new Error('Ungültige Krankenhausdaten.') }
  localStorage.setItem('medisim_hospital_' + hospital.id, JSON.stringify(hospital))

  const registry = loadRegistry()
  const existing = registry.find(h => h.id === hospital.id)
  const nextEntry = toRegistryEntry(hospital, existing?.created_at)
  const nextRegistry = existing
    ? registry.map(h => (h.id === hospital.id ? nextEntry : h))
    : [nextEntry, ...registry]
  saveRegistry(nextRegistry)
  return { data: nextEntry, error: null }
}

export async function listPublicHospitals() {
  for (const seed of SEEDED_HOSPITALS) {
    const existing = safeParseJson(localStorage.getItem('medisim_hospital_' + seed.id), null)
    if (!existing) {
      await upsertHospitalState(seed)
    }
  }

  const registry = loadRegistry()
  const byId = new Map(registry.map(entry => [entry.id, entry]))

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
    .filter(h => h.is_public)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  return { data, error: null }
}

export async function createHospitalMembership(hospitalId, user, role = 'member', permissions = {}) {
  if (!hospitalId || !user?.id) return { data: null, error: null }
  const raw = localStorage.getItem('medisim_hospital_' + hospitalId)
  const hospital = safeParseJson(raw, null)
  if (!hospital) return { data: null, error: new Error('Krankenhaus nicht gefunden.') }

  const currentMembers = Array.isArray(hospital.members) ? hospital.members : []
  const existingIndex = currentMembers.findIndex(m => m.userId === user.id)
  const effectivePermissions = hospitalId === CITY_CLINIC_ID
    ? { ...CHARITE_MEMBER_PERMISSIONS, ...permissions }
    : permissions

  const membership = {
    userId: user.id,
    name: user.name || 'Unbekannt',
    role,
    rank: user.title || 'Assistenzarzt/-ärztin',
    permissions: existingIndex >= 0
      ? { ...effectivePermissions, ...(currentMembers[existingIndex].permissions || {}) }
      : effectivePermissions,
    joinedAt: existingIndex >= 0 ? currentMembers[existingIndex].joinedAt : new Date().toISOString(),
  }

  const members = existingIndex >= 0
    ? currentMembers.map((m, idx) => (idx === existingIndex ? { ...m, ...membership } : m))
    : [...currentMembers, membership]

  const updatedHospital = { ...hospital, members }
  await upsertHospitalState(updatedHospital)
  return { data: membership, error: null }
}

export function subscribeHospitalRealtime() {
  return () => {}
}

export async function removeHospitalsOwnedByUser(userId) {
  if (!userId) return { data: { removed: 0 }, error: null }
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
