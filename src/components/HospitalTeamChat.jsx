import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchHospitalChatMessages,
  sendHospitalChatMessage,
  subscribeHospitalChatMessages,
} from '../services/hospitalChatService'
import { getSupabaseClient } from '../lib/supabaseClient'

export default function HospitalTeamChat({ hospitalId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!hospitalId || !getSupabaseClient()) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error: fetchError } = await fetchHospitalChatMessages(hospitalId)
      if (cancelled) return
      if (fetchError) setError(fetchError.message || 'Nachrichten konnten nicht geladen werden.')
      setMessages(data || [])
      setLoading(false)
      setTimeout(scrollDown, 50)
    })()
    const unsub = subscribeHospitalChatMessages(hospitalId, (row) => {
      if (!row?.id) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev
        return [...prev, row]
      })
      setTimeout(scrollDown, 30)
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [hospitalId, scrollDown])

  const send = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = String(text || '').trim()
    if (!trimmed || !user?.id || !hospitalId) return
    const sb = getSupabaseClient()
    if (!sb) return
    const { error: sendError } = await sendHospitalChatMessage(hospitalId, user.id, trimmed, {
      displayName: user.name || null,
    })
    if (sendError) {
      setError(sendError.message || 'Senden fehlgeschlagen.')
      return
    }
    setText('')
  }

  if (!getSupabaseClient()) return null

  return (
    <div className="card p-5 flex flex-col h-[min(420px,55vh)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-primary-600" />
        <h3 className="font-display font-semibold text-surface-900">Team-Chat</h3>
      </div>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 text-sm">
        {loading && <p className="text-surface-500">Lade Nachrichten…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-surface-500">Noch keine Nachrichten. Schreib die erste Zeile an dein Team.</p>
        )}
        {messages.map((m) => {
          const own = String(m.user_id) === String(user?.id)
          return (
            <div
              key={m.id}
              className={`rounded-xl px-3 py-2 max-w-[95%] ${own ? 'ml-auto bg-primary-50 text-surface-900' : 'mr-auto bg-surface-100 text-surface-800'}`}
            >
              <p className="text-xs text-surface-500 mb-0.5">
                {own ? 'Du' : 'Team'} · {m.created_at ? new Date(m.created_at).toLocaleString('de-DE') : ''}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field flex-1"
          placeholder="Nachricht an das Krankenhaus-Team…"
          maxLength={4000}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
