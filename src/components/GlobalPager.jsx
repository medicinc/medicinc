import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHospital } from '../context/HospitalContext'
import { MessageCircle } from 'lucide-react'
import pagerSound from '../assets/sfx/pager.mp3'
import reanimationAlarmSound from '../assets/sfx/rea-alarm.mp3'
import { playOneShot } from '../utils/soundManager'

export default function GlobalPager() {
  const { isAuthenticated, user } = useAuth()
  const { hospital, sendPagerMessage, triggerReanimationAlarm } = useHospital()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('feed')
  const [target, setTarget] = useState('all')
  const [draft, setDraft] = useState('')
  const [reaConfirm, setReaConfirm] = useState(false)
  const [seenTopId, setSeenTopId] = useState(null)
  const topMsgRef = useRef(null)
  const seenFeedIdsRef = useRef(new Set())

  const alertQueue = hospital?.alertQueue || []
  const pagerMessages = (hospital?.pagerMessages || [])
    .filter(msg => msg.toUserId === 'all' || msg.toUserId === user?.id || msg.fromUserId === user?.id)
  const pagerFeed = useMemo(() => ([
    ...alertQueue.map(a => ({
      id: `al_${a.id}`,
      type: 'alert',
      time: a.time,
      text: a.message,
      severity: a.severity || 'medium',
      from: 'System',
      code: a.code || null,
    })),
    ...pagerMessages.map(m => ({
      id: `pg_${m.id}`,
      type: 'page',
      time: m.time,
      text: m.text,
      severity: 'info',
      from: m.fromName || 'Team',
      to: m.toName || 'Team',
    })),
  ].sort((a, b) => Date.parse(b.time || '') - Date.parse(a.time || ''))), [alertQueue, pagerMessages])

  useEffect(() => {
    const currentIds = new Set(pagerFeed.map(item => item.id))
    if (seenFeedIdsRef.current.size === 0) {
      seenFeedIdsRef.current = currentIds
      const first = pagerFeed[0]
      if (first?.id) {
        setSeenTopId(first.id)
        topMsgRef.current = first.id
      }
      return
    }
    const newItems = pagerFeed.filter(item => !seenFeedIdsRef.current.has(item.id))
    seenFeedIdsRef.current = currentIds
    if (newItems.length === 0) return
    const newest = newItems[0]
    topMsgRef.current = newest.id
    setSeenTopId(newest.id)
    const isRea = newest.code === 'reanimation_alarm' || /reanimationsalarm/i.test(String(newest.text || ''))
    playOneShot(isRea ? reanimationAlarmSound : pagerSound, { volume: isRea ? 0.2 : 0.14 })
  }, [pagerFeed, seenTopId])

  const handleSendPager = () => {
    const text = draft.trim()
    if (!text) return
    const res = sendPagerMessage?.(target, text)
    if (res?.success) setDraft('')
  }

  if (!isAuthenticated || !hospital?.id) return null

  const visibleItems = (tab === 'feed'
    ? pagerFeed
    : tab === 'alerts'
      ? pagerFeed.filter(x => x.type === 'alert')
      : pagerFeed.filter(x => x.type === 'page')
  ).slice(0, 24)

  return (
    <div className={`fixed bottom-4 z-40 transition-all duration-200 ${
      open
        ? 'left-2 right-2 sm:left-4 sm:right-auto sm:w-[360px]'
        : 'left-2 w-[140px] sm:left-4 sm:w-[180px]'
    }`}>
      <div className="rounded-2xl shadow-xl border border-surface-700 bg-surface-900 text-surface-100 overflow-hidden">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full px-3 py-2.5 flex items-center justify-between bg-surface-800/90 hover:bg-surface-800 transition-colors"
        >
          <span className="text-xs font-semibold tracking-wide flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Pager
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500 text-white">{pagerFeed.length}</span>
        </button>
        {open && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-1 bg-surface-800 rounded-lg p-1">
              {[
                { id: 'feed', label: 'Feed' },
                { id: 'alerts', label: 'Alerts' },
                { id: 'team', label: 'Team' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-[11px] px-2 py-1.5 rounded-md ${tab === t.id ? 'bg-primary-600 text-white' : 'text-surface-300 hover:bg-surface-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs"
              >
                <option value="all">An: Alle</option>
                {(hospital.members || []).map(m => (
                  <option key={m.userId} value={m.userId}>An: {m.name}</option>
                ))}
              </select>
              <button onClick={handleSendPager} className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-xs font-semibold">Senden</button>
            </div>
            <button
              onClick={() => {
                if (!reaConfirm) {
                  setReaConfirm(true)
                  return
                }
                triggerReanimationAlarm?.(null)
                setReaConfirm(false)
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold ${
                reaConfirm ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              {reaConfirm ? 'Bestätigen: Reanimationsalarm an alle senden' : 'Reanimationsalarm'}
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Pager-Nachricht schreiben..."
              className="w-full h-16 rounded-lg bg-surface-800 border border-surface-700 px-2.5 py-2 text-xs resize-none"
            />
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {visibleItems.map(item => (
                <div key={item.id} className={`rounded-lg px-2.5 py-2 text-xs ${
                  item.severity === 'critical' ? 'bg-red-900/50 border border-red-700/50'
                    : item.severity === 'high' ? 'bg-amber-900/40 border border-amber-700/40'
                    : item.severity === 'medium' ? 'bg-blue-900/35 border border-blue-700/35'
                    : 'bg-surface-800 border border-surface-700'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold">{item.from}</span>
                    <span className="text-[10px] text-surface-400">{new Date(item.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-surface-100">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
