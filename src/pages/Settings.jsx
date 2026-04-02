import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Save, Settings as SettingsIcon, Check, RotateCcw, Shield, Download, Trash2,
  MessageSquarePlus, Paperclip, Loader2,
} from 'lucide-react'
import { exportUserDataBundle } from '../services/profileService'
import { requestSupabaseDsarDelete, requestSupabaseDsarExport } from '../services/dsarService'
import { uploadFeedbackFiles, submitFeedback } from '../services/feedbackService'
import { getSupabaseClient, isUuid } from '../lib/supabaseClient'

export default function Settings() {
  const { user, updateUser, deleteUserAccountData } = useAuth()
  const [textBlocks, setTextBlocks] = useState(Array.isArray(user?.documentTextBlocks) ? user.documentTextBlocks.join('\n') : '')
  const [saved, setSaved] = useState(false)
  const [tutorialResetInfo, setTutorialResetInfo] = useState('')
  const [privacyInfo, setPrivacyInfo] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [reducedIntensity, setReducedIntensity] = useState(() => {
    try { return localStorage.getItem('medisim_content_intensity') === 'reduced' } catch { return false }
  })
  const [feedbackCategory, setFeedbackCategory] = useState('feedback')
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackBody, setFeedbackBody] = useState('')
  const [feedbackFiles, setFeedbackFiles] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackBanner, setFeedbackBanner] = useState('')

  const feedbackAvailable = Boolean(user && isUuid(user.id) && getSupabaseClient())

  const saveSettings = async () => {
    const nextBlocks = String(textBlocks || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 60)
    await updateUser({ documentTextBlocks: nextBlocks })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const restartHospitalTutorial = () => {
    const userId = user?.id
    const hospitalId = user?.hospitalId
    if (!userId || !hospitalId) {
      setTutorialResetInfo('Tutorial kann erst nach Krankenhausbeitritt neu gestartet werden.')
      setTimeout(() => setTutorialResetInfo(''), 2600)
      return
    }
    const doneKey = `medisim_hospital_tutorial_done_${userId}_${hospitalId}`
    const forceKey = `medisim_hospital_tutorial_force_${userId}_${hospitalId}`
    localStorage.removeItem(doneKey)
    localStorage.setItem(forceKey, '1')
    setTutorialResetInfo('Tutorial wird beim nächsten Öffnen der Krankenhausseite erneut gestartet.')
    setTimeout(() => setTutorialResetInfo(''), 2800)
  }

  const savePrivacyPreferences = () => {
    try {
      localStorage.setItem('medisim_content_intensity', reducedIntensity ? 'reduced' : 'default')
      setPrivacyInfo('Jugendschutz-Präferenzen gespeichert.')
      setTimeout(() => setPrivacyInfo(''), 2600)
    } catch {
      setPrivacyInfo('Speichern nicht möglich (Storage blockiert).')
      setTimeout(() => setPrivacyInfo(''), 2600)
    }
  }

  const exportData = async () => {
    const remote = await requestSupabaseDsarExport(user)
    const local = await exportUserDataBundle(user)
    const bundle = {
      source: remote.ok ? 'supabase+local' : 'local-only',
      remote: remote.ok ? remote.data : { message: remote.message || 'Kein Supabase-Export verfügbar.' },
      local: local.data,
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medisim-dsar-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setPrivacyInfo(remote.ok ? 'Export erstellt (Supabase + lokal).' : 'Export erstellt (nur lokale Daten, keine gültige Cloud-Session).')
    setTimeout(() => setPrivacyInfo(''), 3200)
  }

  const sendFeedback = async () => {
    setFeedbackBanner('')
    if (!feedbackAvailable) {
      setFeedbackBanner('Bugreports und Feedback mit Anhängen sind nur mit einem registrierten Supabase-Konto (E-Mail-Login) möglich.')
      setTimeout(() => setFeedbackBanner(''), 5000)
      return
    }
    setFeedbackSending(true)
    let banner = ''
    try {
      const upload = await uploadFeedbackFiles(user.id, feedbackFiles)
      if (!upload.ok) {
        banner = upload.message || 'Upload fehlgeschlagen.'
      } else {
        const sub = await submitFeedback({
          title: feedbackTitle,
          body: feedbackBody,
          category: feedbackCategory,
          attachmentPaths: upload.paths,
        })
        if (sub.ok) {
          setFeedbackTitle('')
          setFeedbackBody('')
          setFeedbackFiles(null)
          setFileInputKey((k) => k + 1)
          banner = sub.message || 'Vielen Dank! Dein Feedback wurde übermittelt.'
        } else {
          banner = sub.message || 'Senden fehlgeschlagen.'
        }
      }
    } catch (err) {
      banner = String(err?.message || err || 'Unerwarteter Fehler.')
    } finally {
      setFeedbackSending(false)
      if (banner) {
        setFeedbackBanner(banner)
        setTimeout(() => setFeedbackBanner(''), 6000)
      }
    }
  }

  const deleteData = async () => {
    if (deleteConfirm !== 'LÖSCHEN') {
      setPrivacyInfo('Bitte zur Bestätigung exakt "LÖSCHEN" eingeben.')
      setTimeout(() => setPrivacyInfo(''), 3200)
      return
    }
    const remote = await requestSupabaseDsarDelete(user)
    await deleteUserAccountData()
    const serverWipe = remote.ok && remote.data?.serverDeletionImplemented === true
    setPrivacyInfo(
      serverWipe
        ? 'Lokale Daten entfernt; Server-Löschung wurde ausgelöst. Du kannst dich bei Bedarf neu registrieren.'
        : 'Lokale App-Daten und Session wurden entfernt. Ein vollständiges Löschen des Supabase-Kontos und aller Cloud-Tabellen ist über den DSAR-Endpunkt noch nicht implementiert – wende dich bei Bedarf an den Betreiber.',
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900">Einstellungen</h1>
          <p className="text-sm text-surface-500">Persönliche Dokument-Textbausteine verwalten</p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-emerald-700 text-sm">
          <Check className="w-4 h-4" />
          Einstellungen gespeichert.
        </div>
      )}
      {tutorialResetInfo && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 flex items-center gap-2 text-primary-700 text-sm">
          <Check className="w-4 h-4" />
          {tutorialResetInfo}
        </div>
      )}
      {privacyInfo && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center gap-2 text-indigo-700 text-sm">
          <Check className="w-4 h-4" />
          {privacyInfo}
        </div>
      )}
      {feedbackBanner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-amber-900 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          {feedbackBanner}
        </div>
      )}

      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-surface-900">Textbausteine</h2>
        <p className="text-sm text-surface-500">
          Eine Zeile entspricht einem Textbaustein. Diese Bausteine erscheinen im Dokumente-Tab im Textbaustein-Popup.
        </p>
        <textarea
          value={textBlocks}
          onChange={(e) => setTextBlocks(e.target.value)}
          className="input-field min-h-[240px] resize-y"
          placeholder="z. B. Klinisch stabil, kreislaufkompensiert."
        />
        <div className="flex justify-end">
          <button onClick={saveSettings} className="btn-primary">
            <Save className="w-4 h-4" /> Speichern
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-surface-900 flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-primary-600" />
          Feedback &amp; Bugreports
        </h2>
        <p className="text-sm text-surface-500">
          Melde Fehler, Wünsche oder Verbesserungsvorschläge. Optional bis zu sechs Screenshots (PNG, JPEG, WebP, GIF, max. 5&nbsp;MB pro Datei).
          {!feedbackAvailable && (
            <span className="block mt-1 text-amber-800"> Hinweis: Nur mit E-Mail-Konto (Supabase), nicht mit rein lokalen Demo-Logins.</span>
          )}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm text-surface-700">
            <span className="block mb-1 font-medium">Art</span>
            <select
              value={feedbackCategory}
              onChange={(e) => setFeedbackCategory(e.target.value)}
              className="input-field"
              disabled={!feedbackAvailable || feedbackSending}
            >
              <option value="bug">Fehler / Bug</option>
              <option value="feedback">Feedback</option>
              <option value="idea">Verbesserungsvorschlag</option>
              <option value="other">Sonstiges</option>
            </select>
          </label>
          <label className="block text-sm text-surface-700 sm:col-span-2">
            <span className="block mb-1 font-medium">Titel</span>
            <input
              value={feedbackTitle}
              onChange={(e) => setFeedbackTitle(e.target.value)}
              className="input-field"
              placeholder="Kurz beschreiben, worum es geht"
              maxLength={200}
              disabled={!feedbackAvailable || feedbackSending}
            />
          </label>
        </div>
        <label className="block text-sm text-surface-700">
          <span className="block mb-1 font-medium">Beschreibung</span>
          <textarea
            value={feedbackBody}
            onChange={(e) => setFeedbackBody(e.target.value)}
            className="input-field min-h-[160px] resize-y"
            placeholder="Was ist passiert? Was hast du erwartet? Schritte zur Reproduktion …"
            disabled={!feedbackAvailable || feedbackSending}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-surface-700">
          <span className="font-medium inline-flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-surface-500" />
            Anhänge (optional)
          </span>
          <input
            key={fileInputKey}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-800"
            onChange={(e) => setFeedbackFiles(e.target.files)}
            disabled={!feedbackAvailable || feedbackSending}
          />
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={sendFeedback}
            className="btn-primary"
            disabled={!feedbackAvailable || feedbackSending}
          >
            {feedbackSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
            Absenden
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-surface-900">Tutorial</h2>
        <p className="text-sm text-surface-500">
          Starte das interaktive Einsteiger-Tutorial erneut. Es wird auf der Krankenhausseite als Guide-Box angezeigt.
        </p>
        <div className="flex justify-end">
          <button onClick={restartHospitalTutorial} className="btn-secondary">
            <RotateCcw className="w-4 h-4" /> Tutorial neu starten
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-surface-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" /> Datenschutz & Rechte (DSAR)
        </h2>
        <p className="text-sm text-surface-500 leading-relaxed">
          <strong className="font-medium text-surface-700">Datenexport:</strong> Die JSON-Datei enthält zum einen ein{' '}
          <strong className="font-medium text-surface-700">lokales Profil</strong> (Snapshot aus dem Browser, u. a. Spielstand und Einstellungen)
          und – bei gültiger Supabase-Session – einen <strong className="font-medium text-surface-700">Cloud-Auszug</strong> mit
          Kontometadaten (z. B. E-Mail, Nutzer-ID) sowie der Zeile <code className="text-xs bg-surface-100 px-1 rounded">profiles</code> inklusive{' '}
          <code className="text-xs bg-surface-100 px-1 rounded">game_data</code>. Chatverläufe, alle Krankenhausdetails oder vollständige
          Multiplayer-Historie sind darin noch nicht enthalten.
        </p>
        <label className="flex items-start gap-3 text-sm text-surface-700">
          <input type="checkbox" checked={reducedIntensity} onChange={(e) => setReducedIntensity(e.target.checked)} className="mt-0.5" />
          <span>Reduzierte Intensität für medizinische Beschreibungen aktivieren (Jugendschutz-Option).</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={savePrivacyPreferences} className="btn-secondary">Präferenzen speichern</button>
          <button onClick={exportData} className="btn-secondary"><Download className="w-4 h-4" /> Datenexport (JSON)</button>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-sm text-red-700 font-medium">Konto-/Profildaten löschen</p>
          <p className="text-xs text-red-600">Zur Bestätigung bitte LÖSCHEN eingeben.</p>
          <div className="flex gap-2">
            <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="input-field" placeholder="LÖSCHEN" />
            <button onClick={deleteData} className="btn-secondary text-red-700 border-red-300"><Trash2 className="w-4 h-4" /> Löschen</button>
          </div>
        </div>
      </div>
    </div>
  )
}
