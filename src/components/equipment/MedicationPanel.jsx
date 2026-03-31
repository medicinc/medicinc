import { useEffect, useMemo, useState } from 'react'
import { Pill, Search, Check, Shield, Syringe, FlaskConical, X } from 'lucide-react'
import { MEDICATIONS, MEDICATION_CATEGORIES, canUseMedication, medicationRequiresVenousAccess } from '../../data/medications'

function inferSourceForms(med) {
  const form = String(med?.form || '').toLowerCase()
  const options = []
  if (/amp|ampulle|injekt|iv|i\.v\./.test(form)) options.push('Ampulle')
  if (/pulver|lyo|trocken|rekonst/.test(form)) options.push('Pulver')
  if (/tablett|kapsel|dragee|retard|oral/.test(form)) options.push('Tablette/Kapsel')
  if (/tropf|sirup|lösung|loesung/.test(form)) options.push('Lösung')
  if (/spray|aerosol|inhal/.test(form)) options.push('Spray/Inhalation')
  if (options.length === 0) options.push('Standardform')
  return options
}

function inferCarrierOptions(route) {
  const key = String(route || '').toLowerCase()
  if (key.includes('i.v')) return ['NaCl 0.9%', 'Glucose 5%', 'Ringer', 'Keine (pur)']
  if (key.includes('i.m') || key.includes('s.c')) return ['Keine (pur)']
  if (key.includes('inhal')) return ['NaCl 0.9% (Vernebler)', 'Keine (pur)']
  return ['Keine (pur)', 'Wasser']
}

function inferRouteOptionsFromMedication(med) {
  const form = String(med?.form || '').toLowerCase()
  const normalized = new Set()
  const push = (route) => normalized.add(route)
  if (/(^|[\s/,-])i\.?v\.?($|[\s/,-])|intraven/i.test(form)) push('i.v.')
  if (/(^|[\s/,-])p\.?o\.?($|[\s/,-])|per os|oral/i.test(form)) push('p.o.')
  if (/(^|[\s/,-])i\.?m\.?($|[\s/,-])|intramusk/i.test(form)) push('i.m.')
  if (/(^|[\s/,-])s\.?c\.?($|[\s/,-])|subkutan/i.test(form)) push('s.c.')
  if (/inhal|verneb|spray|intranasal|s\.?l\.?/i.test(form)) push('inhalativ')
  if (normalized.size === 0) push('i.v.')
  return [...normalized]
}

function toMg(value, unit) {
  const u = String(unit || '').toLowerCase()
  if (u === 'g') return value * 1000
  if (u === 'mcg' || u === 'µg') return value / 1000
  return value
}

function deriveMedicationDoseProfile(med, sourceForm) {
  const raw = String(med?.dose || '').replaceAll(',', '.')
  const concentration = raw.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg)\s*\/\s*(\d+(?:\.\d+)?)\s*ml/i)
  let doseUnit = 'mg'
  let perUnitDose = 1
  let perUnitVolumeMl = null

  if (concentration) {
    doseUnit = 'mg'
    perUnitDose = Math.max(0.1, toMg(Number(concentration[1]), concentration[2]))
    perUnitVolumeMl = Math.max(0.1, Number(concentration[3]))
  } else {
    const massMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg)/gi)]
    const volumeMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*ml/gi)]
    if (massMatches.length > 0) {
      const massValuesMg = massMatches
        .map((m) => toMg(Number(m[1]), m[2]))
        .filter((v) => Number.isFinite(v) && v > 0)
      if (massValuesMg.length > 0) {
        doseUnit = 'mg'
        perUnitDose = Math.max(...massValuesMg)
      }
      if (volumeMatches.length > 0) {
        const volumes = volumeMatches.map((m) => Number(m[1])).filter((v) => Number.isFinite(v) && v > 0)
        if (volumes.length > 0) perUnitVolumeMl = Math.max(...volumes)
      }
    } else if (volumeMatches.length > 0) {
      const volumes = volumeMatches.map((m) => Number(m[1])).filter((v) => Number.isFinite(v) && v > 0)
      doseUnit = 'ml'
      perUnitDose = Math.max(...volumes)
      perUnitVolumeMl = perUnitDose
    } else {
      doseUnit = 'Einheit'
      perUnitDose = 1
      perUnitVolumeMl = null
    }
  }

  let sourceUnitLabel = 'Einheit'
  const sf = String(sourceForm || '').toLowerCase()
  if (sf.includes('ampulle')) sourceUnitLabel = 'Ampulle'
  else if (sf.includes('pulver')) sourceUnitLabel = 'Vial'
  else if (sf.includes('tablette')) sourceUnitLabel = 'Tablette'
  else if (sf.includes('spray')) sourceUnitLabel = 'Hub'

  return {
    doseUnit,
    perUnitDose: Math.max(0.1, perUnitDose),
    perUnitVolumeMl: Number.isFinite(perUnitVolumeMl) && perUnitVolumeMl > 0 ? perUnitVolumeMl : null,
    sourceUnitLabel,
  }
}

function SourceVisual({ type }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-center">
      <p className="text-xs font-semibold text-surface-700 mb-2">{type}</p>
      <div className="h-16 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-2xl">
        {String(type).toLowerCase().includes('ampulle') ? '💉'
          : String(type).toLowerCase().includes('pulver') ? '🧪'
            : String(type).toLowerCase().includes('tablette') ? '💊'
              : String(type).toLowerCase().includes('spray') ? '🫁'
                : '🧴'}
      </div>
    </div>
  )
}

function SliderNumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  placeholder = '',
  unitLabel = '',
  disabled = false,
}) {
  const numericValue = Number(value)
  const sliderValue = Number.isFinite(numericValue) ? numericValue : min
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] text-surface-600">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(String(e.target.value))}
        disabled={disabled}
        className="w-full accent-primary-600"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white"
        />
        {unitLabel ? (
          <span className="text-xs text-surface-500 shrink-0">{unitLabel}</span>
        ) : null}
      </div>
    </div>
  )
}

export default function MedicationPanel({ patient, inventory, userRank, onUseMedication }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [administered, setAdministered] = useState([])
  const [preparedMeds, setPreparedMeds] = useState([])
  const [directModal, setDirectModal] = useState(null)
  const [prepModal, setPrepModal] = useState(null)
  const [partialDraft, setPartialDraft] = useState({})
  const hasActiveVenousAccess = Array.isArray(patient?.venousAccesses)
    ? patient.venousAccesses.some(access => access?.status === 'active')
    : false

  const filtered = useMemo(() => MEDICATIONS
    .filter(m => category === 'all' || m.category === category)
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic.toLowerCase().includes(search.toLowerCase()))
    .filter(m => (inventory?.[m.id] || 0) > 0), [category, search, inventory])

  const logAdmin = (name, dose, qty) => {
    setAdministered(prev => [...prev, {
      medId: name,
      name,
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      dose,
      qty,
    }])
  }

  const openDirectModal = (med) => {
    const routeOptions = inferRouteOptionsFromMedication(med)
    const sourceForms = inferSourceForms(med)
    const sourceForm = sourceForms[0]
    const profile = deriveMedicationDoseProfile(med, sourceForm)
    setDirectModal({
      medId: med.id,
      medName: med.name,
      rawDose: med.dose || '',
      sourceForms,
      sourceForm,
      routeOptions,
      route: routeOptions[0],
      doseValue: '',
      doseUnit: profile.doseUnit,
      perUnitDose: profile.perUnitDose,
      perUnitVolumeMl: profile.perUnitVolumeMl,
      sourceUnitLabel: profile.sourceUnitLabel,
      ampoules: 1,
    })
  }

  const openPrepareModal = (med) => {
    const sourceForms = inferSourceForms(med)
    const routeOptions = inferRouteOptionsFromMedication(med)
    const route = routeOptions[0]
    const carrierOptions = inferCarrierOptions(route)
    const profile = deriveMedicationDoseProfile(med, sourceForms[0])
    setPrepModal({
      medId: med.id,
      medName: med.name,
      rawDose: med.dose || '',
      sourceForms,
      sourceForm: sourceForms[0],
      routeOptions,
      route,
      carrierOptions,
      carrier: '',
      carrierVolumeMl: '',
      doseValue: '',
      doseUnit: profile.doseUnit,
      perUnitDose: profile.perUnitDose,
      perUnitVolumeMl: profile.perUnitVolumeMl,
      sourceUnitLabel: profile.sourceUnitLabel,
      syringeMl: 10,
      ampoules: 1,
    })
  }

  const confirmPrepareMedication = () => {
    if (!prepModal?.medId) return
    const preparedId = `${prepModal.medId}_${Date.now()}`
    const totalMl = Math.max(1, Number(prepModal.syringeMl || 10))
    const maxDose = Math.max(0.1, Number(prepModal.perUnitDose || 0.1) * Math.max(1, Number(prepModal.ampoules || 1)))
    const doseNumeric = Math.min(maxDose, Math.max(0, Number(prepModal.doseValue || 0)))
    if (!doseNumeric) return
    setPreparedMeds(prev => [...prev, {
      id: preparedId,
      ...prepModal,
      doseValue: doseNumeric,
      totalMl,
      remainingMl: totalMl,
      inventoryConsumed: false,
      preparedAt: Date.now(),
    }])
    setPartialDraft((prev) => ({ ...prev, [preparedId]: Math.min(2, totalMl) }))
    setPrepModal(null)
  }

  const administerPrepared = (entry) => {
    const giveMl = Math.max(0.1, Number(partialDraft?.[entry.id] || 1))
    const clampedGiveMl = Math.min(Number(entry.remainingMl || 0), giveMl)
    if (!Number.isFinite(clampedGiveMl) || clampedGiveMl <= 0) return
    const ratio = Number(entry.totalMl || 0) > 0 ? (clampedGiveMl / Number(entry.totalMl || 1)) : 1
    const partialDose = Number(entry.doseValue || 0) * ratio
    const doseLabel = `${partialDose.toFixed(2)} ${entry.doseUnit} (${clampedGiveMl.toFixed(1)} ml aus vorbereiteter Spritze, Route: ${entry.route})`
    const res = onUseMedication?.(entry.medId, entry.medName, patient?.id, {
      consumeUnits: entry.inventoryConsumed ? 0 : Math.max(1, Number(entry?.ampoules || 1)),
      doseLabel,
    })
    if (res?.success === false) return
    logAdmin(entry.medName, doseLabel, 1)
    setPreparedMeds((prev) => prev
      .map((p) => (p.id !== entry.id ? p : {
        ...p,
        inventoryConsumed: true,
        remainingMl: Math.max(0, Number(p.remainingMl || 0) - clampedGiveMl),
      }))
      .filter((p) => Number(p.remainingMl || 0) > 0.01))
  }

  const discardPrepared = (entryId) => {
    setPreparedMeds((prev) => prev.filter((p) => p.id !== entryId))
    setPartialDraft((prev) => {
      const next = { ...prev }
      delete next[entryId]
      return next
    })
  }

  const administerDirect = () => {
    if (!directModal?.medId) return
    const maxDose = Math.max(0.1, Number(directModal.perUnitDose || 0.1) * Math.max(1, Number(directModal.ampoules || 1)))
    const doseNumeric = Math.max(0, Number(directModal.doseValue || 0))
    const clampedDose = Math.min(maxDose, doseNumeric)
    if (!clampedDose) return
    const perDose = Number(directModal.perUnitDose || 0)
    const perVol = Number(directModal.perUnitVolumeMl || 0)
    const volumeNumeric = perDose > 0 && perVol > 0
      ? Number(((clampedDose / perDose) * perVol).toFixed(2))
      : null
    const volumePart = volumeNumeric ? `, ${volumeNumeric} ml` : ''
    const doseLabel = `${clampedDose} ${directModal.doseUnit}${volumePart}, ${directModal.route}, ${directModal.sourceForm}`
    const res = onUseMedication?.(directModal.medId, directModal.medName, patient?.id, {
      consumeUnits: Math.max(1, Number(directModal.ampoules || 1)),
      doseLabel,
    })
    if (res?.success === false) return
    logAdmin(directModal.medName, doseLabel, Math.max(1, Number(directModal.ampoules || 1)))
    setDirectModal(null)
  }

  useEffect(() => {
    if (!patient?.id) return
    const key = `medisim_prepared_meds_${patient.id}`
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(parsed)) setPreparedMeds(parsed)
    } catch (_error) {
      setPreparedMeds([])
    }
  }, [patient?.id])

  useEffect(() => {
    if (!patient?.id) return
    const key = `medisim_prepared_meds_${patient.id}`
    localStorage.setItem(key, JSON.stringify(preparedMeds))
  }, [patient?.id, preparedMeds])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Nach Handelsname oder Wirkstoff suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-3 rounded-lg border border-surface-200 text-sm focus:border-primary-400 outline-none"
          />
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          <button onClick={() => setCategory('all')} className={`text-[10px] px-2 py-0.5 rounded-full ${category === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500'}`}>Alle</button>
          {MEDICATION_CATEGORIES.slice(0, 6).map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={`text-[10px] px-2 py-0.5 rounded-full ${category === cat.id ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500'}`}>{cat.name}</button>
          ))}
        </div>
      </div>

      {preparedMeds.length > 0 && (
        <div className="px-4 pb-2 shrink-0">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 mb-2 flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5" /> Vorbereitete Medikamente ({preparedMeds.length})
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {preparedMeds.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-violet-200 bg-white px-2.5 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-800 truncate">{entry.medName}</p>
                    <p className="text-[11px] text-surface-500">
                      {entry.doseValue} {entry.doseUnit} in {entry.totalMl} ml • Rest: {Number(entry.remainingMl || 0).toFixed(1)} ml • {entry.route} • {entry.carrier}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0.1"
                      max={Math.max(0.1, Number(entry.remainingMl || 0))}
                      step="0.1"
                      value={partialDraft?.[entry.id] ?? Math.min(2, Number(entry.remainingMl || 0))}
                      onChange={(e) => setPartialDraft((prev) => ({ ...prev, [entry.id]: Number(e.target.value || 0.1) }))}
                      className="w-20 text-[11px] px-2 py-1.5 rounded border border-surface-200"
                    />
                    <button
                      onClick={() => administerPrepared(entry)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                    >
                      Teilgabe
                    </button>
                    <button
                      onClick={() => discardPrepared(entry.id)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                      title="Vorbereitete Spritze verwerfen"
                    >
                      Verwerfen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Pill className="w-8 h-8 text-surface-200 mx-auto mb-2" />
            <p className="text-xs text-surface-400">{search ? 'Kein Medikament gefunden' : 'Keine Medikamente auf Lager'}</p>
          </div>
        ) : (
          filtered.map(med => {
            const stock = inventory?.[med.id] || 0
            const canUse = canUseMedication(med, userRank || 'famulant')
            const requiresAccess = medicationRequiresVenousAccess(med)
            const accessBlocked = requiresAccess && !hasActiveVenousAccess
            const catDef = MEDICATION_CATEGORIES.find(c => c.id === med.category)
            return (
              <div key={med.id} className="p-3 rounded-xl border border-surface-200 hover:border-primary-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg ${catDef?.color || 'bg-surface-100'} flex items-center justify-center shrink-0`}>
                    <Pill className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-surface-900 truncate">{med.name}</p>
                      {med.requiresBtm && <span className="text-[8px] px-1 rounded bg-red-100 text-red-600 shrink-0">BtM</span>}
                    </div>
                    <p className="text-[11px] text-surface-500">Handelsname: {med.name}</p>
                    <p className="text-[11px] text-surface-500">Wirkstoff: {med.generic}</p>
                    <p className="text-xs text-surface-400">{med.dose} — {med.form} — Bestand: {stock}</p>
                  </div>
                  {canUse ? (
                    <div className="flex flex-col gap-1 shrink-0 min-w-[210px]">
                      <button
                        onClick={() => openPrepareModal(med)}
                        disabled={accessBlocked}
                        className="text-xs px-3 py-2 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 justify-center"
                      >
                        <FlaskConical className="w-3.5 h-3.5" /> Vorbereiten
                      </button>
                      <button
                        onClick={() => openDirectModal(med)}
                        disabled={accessBlocked}
                        className="text-xs px-3 py-2 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Direkt geben
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-amber-600 shrink-0 flex items-center gap-0.5"><Shield className="w-3 h-3" />{med.minRank}</span>
                  )}
                </div>
                {accessBlocked && (
                  <p className="mt-1.5 text-[10px] text-amber-600">
                    Für dieses i.v.-Medikament muss zuerst ein venöser Zugang gelegt werden.
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {directModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setDirectModal(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-surface-900">Direkte Medikamentengabe: {directModal.medName}</p>
              <button onClick={() => setDirectModal(null)} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-4 grid md:grid-cols-[220px,1fr] gap-4">
              <SourceVisual type={directModal.sourceForm} />
              <div className="space-y-3 min-w-0">
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-600 mb-2">1) Applikation</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Darreichung</label>
                      <select value={directModal.sourceForm} onChange={(e) => {
                        const sourceForm = e.target.value
                        const profile = deriveMedicationDoseProfile({ dose: directModal.rawDose || '', form: sourceForm }, sourceForm)
                        setDirectModal((prev) => {
                          const maxDose = Math.max(0.1, profile.perUnitDose * Math.max(1, Number(prev.ampoules || 1)))
                          const currentDose = Number(prev.doseValue || 0)
                          const nextDose = currentDose ? Math.min(maxDose, currentDose) : ''
                          return {
                            ...prev,
                            sourceForm,
                            sourceUnitLabel: profile.sourceUnitLabel,
                            doseUnit: profile.doseUnit,
                            perUnitDose: profile.perUnitDose,
                            perUnitVolumeMl: profile.perUnitVolumeMl,
                            doseValue: nextDose,
                          }
                        })
                      }} className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white">
                        {directModal.sourceForms.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Weg</label>
                      <div className="flex flex-wrap gap-1.5">
                        {directModal.routeOptions.map((route) => (
                          <button
                            key={route}
                            type="button"
                            onClick={() => setDirectModal((prev) => ({ ...prev, route }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border ${directModal.route === route ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-surface-700 border-surface-200 hover:border-primary-300'}`}
                          >
                            {route}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-600 mb-2">2) Dosis</p>
                  <div className="space-y-3">
                    <SliderNumberField
                      label="Menge Medikament"
                      value={directModal.doseValue}
                      onChange={(doseValue) => setDirectModal((prev) => {
                        const maxDose = Math.max(0.1, Number(prev.perUnitDose || 0.1) * Math.max(1, Number(prev.ampoules || 1)))
                        const requested = Number(doseValue || 0)
                        return { ...prev, doseValue: String(Math.max(0.1, Math.min(maxDose, requested || 0.1))) }
                      })}
                      min={0.1}
                      max={Math.max(0.1, Number(directModal.perUnitDose || 0.1) * Math.max(1, Number(directModal.ampoules || 1)))}
                      step={0.1}
                      placeholder="Menge Medikament"
                      unitLabel={directModal.doseUnit}
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-surface-600 mb-1">Einheit (automatisch)</label>
                        <div className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-surface-700">
                          {directModal.doseUnit}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-surface-600 mb-1">Anzahl {directModal.sourceUnitLabel}</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDirectModal((prev) => ({ ...prev, ampoules: Math.max(1, Number(prev.ampoules || 1) - 1) }))}
                            className="w-9 h-9 rounded-lg border border-surface-200 text-surface-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={directModal.ampoules}
                            onChange={(e) => setDirectModal((prev) => {
                              const ampoules = Math.max(1, Number(e.target.value || 1))
                              const maxDose = Math.max(0.1, Number(prev.perUnitDose || 0.1) * ampoules)
                              const currentDose = Number(prev.doseValue || 0)
                              return { ...prev, ampoules, doseValue: currentDose ? String(Math.min(maxDose, currentDose)) : prev.doseValue }
                            })}
                            className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setDirectModal((prev) => ({ ...prev, ampoules: Math.min(6, Number(prev.ampoules || 1) + 1) }))}
                            className="w-9 h-9 rounded-lg border border-surface-200 text-surface-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      Maximal verfuegbar: {(Number(directModal.perUnitDose || 0) * Math.max(1, Number(directModal.ampoules || 1))).toFixed(2)} {directModal.doseUnit}
                      {Number(directModal.perUnitVolumeMl || 0) > 0 ? ` (${(Number(directModal.perUnitVolumeMl || 0) * Math.max(1, Number(directModal.ampoules || 1))).toFixed(2)} ml)` : ''}
                    </div>
                    {Number(directModal.perUnitVolumeMl || 0) > 0 && Number(directModal.perUnitDose || 0) > 0 && Number(directModal.doseValue || 0) > 0 ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Applizierte Menge (automatisch berechnet): {(((Number(directModal.doseValue || 0) / Number(directModal.perUnitDose || 1)) * Number(directModal.perUnitVolumeMl || 0))).toFixed(2)} ml
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setDirectModal(null)} className="btn-secondary text-sm">Abbrechen</button>
              <button onClick={administerDirect} className="btn-primary text-sm">Dosis verabreichen</button>
            </div>
          </div>
        </div>
      )}

      {prepModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setPrepModal(null)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-surface-200 bg-white shadow-2xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-surface-900">Medikament vorbereiten: {prepModal.medName}</p>
              <button onClick={() => setPrepModal(null)} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-4 grid md:grid-cols-[220px,1fr] gap-4">
              <SourceVisual type={prepModal.sourceForm} />
              <div className="space-y-3 min-w-0">
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-600 mb-2">1) Ausgangsmedikament</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Darreichung</label>
                      <select value={prepModal.sourceForm} onChange={(e) => {
                        const sourceForm = e.target.value
                        const profile = deriveMedicationDoseProfile({ dose: prepModal.rawDose || '', form: sourceForm }, sourceForm)
                        setPrepModal((prev) => {
                          const maxDose = Math.max(0.1, profile.perUnitDose * Math.max(1, Number(prev.ampoules || 1)))
                          const currentDose = Number(prev.doseValue || 0)
                          const nextDose = currentDose ? Math.min(maxDose, currentDose) : ''
                          return {
                            ...prev,
                            sourceForm,
                            sourceUnitLabel: profile.sourceUnitLabel,
                            doseUnit: profile.doseUnit,
                            perUnitDose: profile.perUnitDose,
                            perUnitVolumeMl: profile.perUnitVolumeMl,
                            doseValue: nextDose,
                          }
                        })
                      }} className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white">
                        {prepModal.sourceForms.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Anzahl {prepModal.sourceUnitLabel}</label>
                      <input type="number" min="1" max="6" value={prepModal.ampoules} onChange={(e) => setPrepModal((prev) => {
                        const ampoules = Math.max(1, Number(e.target.value || 1))
                        const maxDose = Math.max(0.1, Number(prev.perUnitDose || 0.1) * ampoules)
                        const currentDose = Number(prev.doseValue || 0)
                        return { ...prev, ampoules, doseValue: currentDose ? String(Math.min(maxDose, currentDose)) : prev.doseValue }
                      })} className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-600 mb-2">2) Applikationsweg & Mischung</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Weg</label>
                      <div className="flex flex-wrap gap-1.5">
                        {prepModal.routeOptions.map((route) => (
                          <button
                            key={route}
                            type="button"
                            onClick={() => {
                              const carrierOptions = inferCarrierOptions(route)
                              setPrepModal((prev) => ({ ...prev, route, carrierOptions, carrier: '' }))
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border ${prepModal.route === route ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-surface-700 border-surface-200 hover:border-primary-300'}`}
                          >
                            {route}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-surface-600 mb-1">Trägerlösung</label>
                        <select value={prepModal.carrier} onChange={(e) => setPrepModal((prev) => ({ ...prev, carrier: e.target.value }))} className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-white">
                          <option value="">-- Trägerlösung wählen --</option>
                          {prepModal.carrierOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <SliderNumberField
                        label="Menge Trägerlösung"
                        value={prepModal.carrierVolumeMl}
                        onChange={(carrierVolumeMl) => setPrepModal((prev) => ({ ...prev, carrierVolumeMl }))}
                        min={0}
                        max={100}
                        step={0.5}
                        placeholder="Menge Trägerlösung"
                        unitLabel="ml"
                      />
                    </div>
                    <SliderNumberField
                      label="Zielspritze"
                      value={prepModal.syringeMl}
                      onChange={(syringeMl) => setPrepModal((prev) => ({ ...prev, syringeMl: Math.max(1, Number(syringeMl || 10)) }))}
                      min={1}
                      max={50}
                      step={1}
                      unitLabel="ml"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-600 mb-2">3) Ziel-Dosis in der Spritze</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <SliderNumberField
                      label="Menge Medikament"
                      value={prepModal.doseValue}
                      onChange={(doseValue) => setPrepModal((prev) => {
                        const maxDose = Math.max(0.1, Number(prev.perUnitDose || 0.1) * Math.max(1, Number(prev.ampoules || 1)))
                        const requested = Number(doseValue || 0)
                        return { ...prev, doseValue: String(Math.max(0.1, Math.min(maxDose, requested || 0.1))) }
                      })}
                      min={0.1}
                      max={Math.max(0.1, Number(prepModal.perUnitDose || 0.1) * Math.max(1, Number(prepModal.ampoules || 1)))}
                      step={0.1}
                      placeholder="Menge Medikament"
                      unitLabel={prepModal.doseUnit}
                    />
                    <div>
                      <label className="block text-[11px] text-surface-600 mb-1">Einheit (automatisch)</label>
                      <div className="w-full text-sm px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-surface-700">
                        {prepModal.doseUnit}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    Maximal verfuegbar: {(Number(prepModal.perUnitDose || 0) * Math.max(1, Number(prepModal.ampoules || 1))).toFixed(2)} {prepModal.doseUnit}
                    {Number(prepModal.perUnitVolumeMl || 0) > 0 ? ` (${(Number(prepModal.perUnitVolumeMl || 0) * Math.max(1, Number(prepModal.ampoules || 1))).toFixed(2)} ml)` : ''}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPrepModal(null)} className="btn-secondary text-sm">Abbrechen</button>
              <button onClick={confirmPrepareMedication} className="btn-primary text-sm">In Spritze vorbereiten</button>
            </div>
          </div>
        </div>
      )}

      {/* Administered log */}
      {administered.length > 0 && (
        <div className="border-t border-surface-200 px-4 py-3 shrink-0">
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Verabreicht ({administered.length})</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {administered.slice().reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <Check className="w-3 h-3 text-green-500 shrink-0" />
                <span className="font-mono text-surface-400">{entry.time}</span>
                <span className="text-surface-700 font-medium truncate">{entry.name}</span>
                <span className="text-surface-400 ml-auto shrink-0">{entry.qty}x {entry.dose}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
