import { useState, useRef, useEffect, useMemo } from 'react'
import { generatePatientDialogue, generatePatientGreeting, getLocalizedChiefComplaint } from '../data/patientDialogue'
import { Stethoscope, Clock, Heart, AlertCircle, Languages, Send } from 'lucide-react'
import {
  isAiChatConfigured,
  requestAiPatientReply,
  requestAiPatientGreeting,
} from '../services/patientChatAiService'

const GENDER_AVATARS = {
  männlich: { bg: 'from-blue-400 to-blue-600', emoji: '👨' },
  weiblich: { bg: 'from-pink-400 to-pink-600', emoji: '👩' },
}

const TRANSLATION_REPLACEMENTS = {
  de: {
    en: [
      ['was führt sie heute zu uns\\?', 'what brings you in today?'],
      ['können sie ihre beschwerden genauer beschreiben\\?', 'can you describe your symptoms in more detail?'],
      ['können sie die beschwerden genauer beschreiben\\?', 'can you describe your symptoms in more detail?'],
      ['haben sie schmerzen\\? auf einer skala von 0 bis 10\\?', 'do you have pain? on a scale from 0 to 10?'],
      ['wie stark sind die schmerzen von 0 bis 10\\?', 'how strong is the pain from 0 to 10?'],
      ['was war das auslösende ereignis\\? wann genau fing es an\\?', 'what was the triggering event? when did it start?'],
      ['haben sie allergien\\?', 'do you have any allergies?'],
      ['nehmen sie regelmäßig medikamente\\?', 'do you take regular medication?'],
      ['haben sie vorerkrankungen\\?', 'do you have any prior medical conditions?'],
      ['wann war die letzte mahlzeit\\?', 'when was your last meal?'],
      ['gibt es noch etwas wichtiges\\?', 'is there anything else important?'],
      ['werden die beschwerden besser oder schlechter\\?', 'are your symptoms getting better or worse?'],
      ['bitte sprechen sie langsam mit mir, dann kann ich besser folgen\\.', 'please speak slowly so I can follow better.'],
      ['hallo, ich bin', 'hello, my name is'],
      ['ich komme', 'i came in with'],
      ['aufnahmegrund:', 'reason for admission:'],
      ['beschwerde:', 'chief complaint:'],
    ],
    es: [
      ['was führt sie heute zu uns\\?', 'que le trae hoy a urgencias?'],
      ['können sie ihre beschwerden genauer beschreiben\\?', 'puede describir sus sintomas con mas detalle?'],
      ['können sie die beschwerden genauer beschreiben\\?', 'puede describir sus sintomas con mas detalle?'],
      ['haben sie schmerzen\\? auf einer skala von 0 bis 10\\?', 'tiene dolor? en una escala de 0 a 10?'],
      ['wie stark sind die schmerzen von 0 bis 10\\?', 'que intensidad tiene el dolor de 0 a 10?'],
      ['was war das auslösende ereignis\\? wann genau fing es an\\?', 'cual fue el desencadenante? cuando empezo exactamente?'],
      ['haben sie allergien\\?', 'tiene alergias?'],
      ['nehmen sie regelmäßig medikamente\\?', 'toma medicacion de forma regular?'],
      ['haben sie vorerkrankungen\\?', 'tiene enfermedades previas?'],
      ['wann war die letzte mahlzeit\\?', 'cuando fue su ultima comida?'],
      ['gibt es noch etwas wichtiges\\?', 'hay algo mas importante que debamos saber?'],
      ['werden die beschwerden besser oder schlechter\\?', 'sus sintomas van mejor o peor?'],
      ['hallo, ich bin', 'hola, soy'],
      ['ich komme', 'vengo por'],
      ['aufnahmegrund:', 'motivo de ingreso:'],
      ['beschwerde:', 'motivo de consulta:'],
    ],
  },
  en: {
    de: [
      ["sorry, i don't understand german\\. could you please ask in english\\?", 'Entschuldigung, ich verstehe kein Deutsch. Können Sie bitte Englisch sprechen?'],
      ["i cannot follow in german\\. do you speak english\\?", 'Ich kann auf Deutsch nicht folgen. Sprechen Sie Englisch?'],
      ['could you repeat that in english, please\\?', 'Können Sie das bitte auf Englisch wiederholen?'],
      ["i didn't understand\\. could you ask in english, please\\?", 'Ich habe das nicht verstanden. Bitte fragen Sie auf Englisch.'],
      ["i don't understand the question in german\\.", 'Ich verstehe die Frage auf Deutsch nicht.'],
      ['english please\\? i did not understand\\.', 'Bitte Englisch, ich habe es nicht verstanden.'],
      ["sorry, i didn't get that question\\.", 'Entschuldigung, ich habe die Frage nicht verstanden.'],
      ['please speak english, i cannot follow in german\\.', 'Bitte sprechen Sie Englisch, ich kann dem Deutschen nicht folgen.'],
      ["sorry, i don't understand your german question\\.", 'Entschuldigung, ich verstehe Ihre deutsche Frage nicht.'],
      ['none known', 'Keine bekannten Allergien'],
      ['regular medications', 'Regelmäßige Medikamente'],
      ['no major history', 'Keine relevanten Vorerkrankungen'],
      ['light meal a few hours ago\\.', 'Leichte Mahlzeit vor einigen Stunden.'],
    ],
  },
  es: {
    de: [
      ['perdón, no entiendo alemán\\. ¿puede hablar en español\\?', 'Entschuldigung, ich verstehe kein Deutsch. Können Sie Spanisch sprechen?'],
      ['no comprendo su pregunta en alemán\\. ¿español, por favor\\?', 'Ich verstehe Ihre Frage auf Deutsch nicht. Bitte Spanisch.'],
      ['¿puede repetir en español\\? no entiendo alemán\\.', 'Können Sie auf Spanisch wiederholen? Ich verstehe kein Deutsch.'],
      ['perdón, no entiendo su pregunta en alemán\\.', 'Entschuldigung, ich verstehe Ihre Frage auf Deutsch nicht.'],
      ['¿puede hablar español, por favor\\?', 'Können Sie bitte Spanisch sprechen?'],
      ['lo siento, no entiendo bien\\. ¿español\\?', 'Entschuldigung, ich verstehe nicht gut. Spanisch?'],
      ['no comprendí\\. ¿puede explicarlo en español\\?', 'Ich habe es nicht verstanden. Können Sie es auf Spanisch erklären?'],
      ['no entiendo\\. ¿podemos hablar en español\\?', 'Ich verstehe es nicht. Können wir Spanisch sprechen?'],
      ['ninguna conocida', 'Keine bekannten Allergien'],
      ['medicaciones habituales', 'Regelmäßige Medikamente'],
      ['sin antecedentes relevantes', 'Keine relevanten Vorerkrankungen'],
      ['comida ligera hace unas horas\\.', 'Leichte Mahlzeit vor einigen Stunden.'],
    ],
  },
}

function applyTranslationReplacements(text, replacements) {
  let output = String(text || '')
  replacements.forEach(([pattern, replacement]) => {
    output = output.replace(new RegExp(pattern, 'gi'), replacement)
  })
  return output
}

function translateChatText(text, fromLang, toLang) {
  if (!text || fromLang === toLang) return String(text || '')
  const replacements = TRANSLATION_REPLACEMENTS?.[fromLang]?.[toLang]
  if (!Array.isArray(replacements)) return String(text || '')
  return applyTranslationReplacements(text, replacements)
}

function applyIntensityFilter(text) {
  let reduced = false
  try { reduced = localStorage.getItem('medisim_content_intensity') === 'reduced' } catch { reduced = false }
  if (!reduced) return String(text || '')
  return String(text || '')
    .replace(/starke blutung/gi, 'starke Verletzung')
    .replace(/offene fraktur/gi, 'schwere Fraktur')
    .replace(/reanimationspflichtig/gi, 'kritisch instabil')
}

/** NRS aus Patientenantwort parsen (z. B. „5/10“, „bei 7“, „so eine 8 von zehn“) – Fallback: Dialogue-Template. */
function extractPainNrsFromMessages(messages, fallback) {
  if (!Array.isArray(messages) || messages.length === 0) return fallback
  const candidates = [...messages].reverse().filter((m) => m.type === 'patient' && typeof m.text === 'string')
  for (const m of candidates) {
    const raw = String(m.text)
    const t = raw.replace(/\*+/g, '')
    const slash = t.match(/\b(\d{1,2})\s*\/\s*10\b/i)
    if (slash) {
      const n = Number(slash[1])
      if (Number.isFinite(n) && n >= 0 && n <= 10) return n
    }
    const von = t.match(/\b(\d{1,2})\s+von\s+10\b/i)
    if (von) {
      const n = Number(von[1])
      if (Number.isFinite(n) && n >= 0 && n <= 10) return n
    }
    const vonZehn = t.match(/\b(\d{1,2})\s+von\s+zehn\b/i)
    if (vonZehn) {
      const n = Number(vonZehn[1])
      if (Number.isFinite(n) && n >= 0 && n <= 10) return n
    }
    const painCtx = /schmerz|wehtut|tut weh|tut\s+richtig|krampf|zieht|nrs|skala|dolor|pain/i.test(t)
    if (painCtx) {
      const beiSo = t.match(/\b(?:bei|so|ca\.?|ungefähr|um\s+die|roundabout)\s+(\d{1,2})\b/i)
      if (beiSo) {
        const n = Number(beiSo[1])
        if (Number.isFinite(n) && n >= 0 && n <= 10) return n
      }
      const aufSkala = t.match(/\b(?:auf|auf\s+einer)\s+(?:der\s+)?(?:skala)?\s*(\d{1,2})\b/i)
      if (aufSkala) {
        const n = Number(aufSkala[1])
        if (Number.isFinite(n) && n >= 0 && n <= 10) return n
      }
      const sind = t.match(/\b(?:sind|wären|liegt|liegen|habe)\s+(?:so\s+)?(?:bei\s+)?(\d{1,2})\b/i)
      if (sind) {
        const n = Number(sind[1])
        if (Number.isFinite(n) && n >= 0 && n <= 10) return n
      }
    }
  }
  return fallback
}

function TypingIndicator({ avatar }) {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center text-sm shrink-0 shadow-sm`}>
        {avatar.emoji}
      </div>
      <div className="bg-white border border-surface-200 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export default function PatientChat({
  patient,
  onComplete,
  mode = 'triage',
  initialSnapshot = null,
  onSnapshotChange = null,
  injectedPatientMessage = null,
  onInjectedMessageConsumed = null,
}) {
  const dialogue = useMemo(() => generatePatientDialogue(patient, mode), [patient.id, mode])
  const germanDialogue = useMemo(() => generatePatientDialogue({ ...patient, languageCode: 'de' }, mode), [patient, mode])
  const [messages, setMessages] = useState([])
  const [askedIds, setAskedIds] = useState(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const conversationLang = useMemo(() => ['en', 'es'].includes(patient?.languageCode) ? patient.languageCode : 'de', [patient?.languageCode])
  const [translatorEnabled, setTranslatorEnabled] = useState(false)
  const [freeQuestion, setFreeQuestion] = useState('')
  const [chatNotice, setChatNotice] = useState(null)
  const [painStimulusContext, setPainStimulusContext] = useState(null)
  const [painStimulusDialogue, setPainStimulusDialogue] = useState({ explained: false })
  const messagesScrollRef = useRef(null)

  const avatar = GENDER_AVATARS[patient.gender] || GENDER_AVATARS.männlich
  const isForeignConversation = conversationLang !== 'de'
  const consciousness = String(patient?.clinicalState?.consciousness || '').toLowerCase()
  const patientCanSpeak = !/(bewusstlos|unconscious|nicht ansprechbar|reanimationspflichtig)/i.test(consciousness)
  const complaintContext = useMemo(() => {
    const text = String(patient?.chiefComplaint || '').toLowerCase()
    return {
      trauma: /sturz|fraktur|schnitt|wunde|trauma|verletz/.test(text),
      respiratory: /atem|luft|dyspnoe|husten/.test(text),
      cardiac: /brust|herz|druck|rasen/.test(text),
      abdominal: /bauch|unterbauch|uebel|übel|erbrechen/.test(text),
      neuro: /kopf|schwindel|seh|neurolog/.test(text),
    }
  }, [patient?.chiefComplaint])

  useEffect(() => {
    setTranslatorEnabled(false)
  }, [conversationLang, patient?.id])

  useEffect(() => {
    setFreeQuestion('')
    setChatNotice(null)
  }, [patient?.id])

  const getPatientFallbackPrompt = (lang) => {
    if (lang === 'en') {
      const prompts = [
        "Sorry, I don't understand German. Could you please ask in English?",
        'I cannot follow in German. Do you speak English?',
        'Could you repeat that in English, please?',
      ]
      return prompts[Math.floor(Math.random() * prompts.length)]
    }
    if (lang === 'es') {
      const prompts = [
        'Perdón, no entiendo alemán. ¿Puede hablar en español?',
        'No comprendo su pregunta en alemán. ¿Español, por favor?',
        '¿Puede repetir en español? No entiendo alemán.',
      ]
      return prompts[Math.floor(Math.random() * prompts.length)]
    }
    return ''
  }

  const getGreetingTranslation = () => {
    const firstName = String(patient?.name || '').split(' ')[0] || 'Patient'
    const complaintDe = getLocalizedChiefComplaint(patient, 'de')
    return `Hallo, ich bin ${firstName}. Ich komme mit ${complaintDe}.`
  }

  const getPatientMessageGermanVersion = (msg) => {
    if (!msg) return ''
    if (msg.id === 'greeting') return getGreetingTranslation()
    const rawId = String(msg.id || '')
    if (!rawId.startsWith('a_')) return ''
    const questionId = rawId.slice(2)
    return germanDialogue?.questions?.find(q => q.id === questionId)?.answer || ''
  }

  const normalizeText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const getRuleBasedFallback = (doctorText) => {
    const normalized = normalizeText(doctorText)
    if (!normalized) return null
    const queryTokens = new Set(normalized.split(' ').filter(token => token.length > 2))
    let best = null
    dialogue.questions.forEach(item => {
      const qTokens = new Set(normalizeText(item.question).split(' ').filter(token => token.length > 2))
      const overlap = Array.from(queryTokens).filter(token => qTokens.has(token)).length
      if (!best || overlap > best.score) best = { item, score: overlap }
    })
    if (!best || best.score <= 0) return null
    return best.item
  }

  const getStructuredReplyFromQuestion = (doctorText) => {
    const normalized = normalizeText(doctorText)
    const hasAny = (patterns) => patterns.some(pattern => normalized.includes(pattern))
    const byId = (id) => dialogue.questions.find(q => q.id === id) || null
    if (hasAny(['allerg', 'allergy', 'alerg'])) return byId('allergies')
    if (hasAny(['medik', 'medication', 'medicacion', 'tablette', 'nimmt', 'nehmen'])) return byId('medications')
    if (hasAny(['vorerkrank', 'history', 'antecedente', 'fruehere erkrank'])) return byId('past_history')
    if (hasAny(['letzte mahlzeit', 'gegessen', 'eaten', 'comido'])) return byId('last_meal')
    if (hasAny(['schmerz', 'pain', 'dolor', 'nrs', 'skala'])) return byId('pain')
    if (hasAny(['hauptbeschwerde', 'chief complaint', 'motivo'])) return byId('chief_complaint')
    return null
  }

  useEffect(() => {
    const snapMessages = Array.isArray(initialSnapshot?.messages) ? initialSnapshot.messages : null
    const snapAsked = Array.isArray(initialSnapshot?.askedIds) ? initialSnapshot.askedIds : null
    const injectedMessageId = String(injectedPatientMessage?.id || '').trim()
    const injectedMessageText = String(injectedPatientMessage?.text || '').trim()
    if (injectedMessageId && injectedMessageText) {
      setPainStimulusContext(injectedPatientMessage?.context?.type === 'pain_stimulus' ? injectedPatientMessage.context : null)
      setPainStimulusDialogue({ explained: false })
      setIsTyping(false)
      setMessages([{
        id: injectedMessageId,
        type: 'patient',
        text: injectedMessageText,
        time: new Date(),
      }])
      setAskedIds(new Set())
      if (typeof onInjectedMessageConsumed === 'function') onInjectedMessageConsumed(injectedMessageId)
      return
    }
    setPainStimulusContext(null)
    setPainStimulusDialogue({ explained: false })
    if (snapMessages && snapMessages.length > 0) {
      setMessages(snapMessages.map(msg => ({
        ...msg,
        time: msg?.time instanceof Date ? msg.time : new Date(msg?.time || Date.now()),
      })))
      setAskedIds(new Set(snapAsked || []))
      return
    }
    if (!patientCanSpeak) {
      setIsTyping(false)
      setMessages([{
        id: 'greeting_unconscious',
        type: 'patient',
        text: '[keine verbale Reaktion – Patient*in ist bewusstlos]',
        time: new Date(),
      }])
      setAskedIds(new Set())
      return
    }
    let cancelled = false
    const fallbackGreeting = generatePatientGreeting(patient, mode)
    setIsTyping(true)
    const pushGreeting = (text) => {
      if (cancelled) return
      const showGreeting = () => {
        if (cancelled) return
        setIsTyping(false)
        setMessages([{
          id: 'greeting',
          type: 'patient',
          text,
          time: new Date(),
        }])
        setAskedIds(new Set())
      }
      // Keep a short typing phase so the UI is never blank.
      setTimeout(showGreeting, 450)
    }

    if (isAiChatConfigured()) {
      requestAiPatientGreeting({
        patient,
        mode,
        lang: conversationLang,
        translatorEnabled,
      })
        .then((aiResult) => {
          const text = String(aiResult?.text || '').trim()
          pushGreeting(text || fallbackGreeting)
        })
        .catch(() => pushGreeting(fallbackGreeting))
    } else {
      pushGreeting(fallbackGreeting)
    }

    return () => {
      cancelled = true
      setIsTyping(false)
    }
  }, [patient.id, mode, initialSnapshot?.patientId, conversationLang, patientCanSpeak, injectedPatientMessage?.id, injectedPatientMessage?.text, onInjectedMessageConsumed])

  useEffect(() => {
    if (typeof onSnapshotChange !== 'function') return
    onSnapshotChange({
      patientId: patient?.id,
      messages,
      askedIds: Array.from(askedIds),
    })
  }, [messages, askedIds, onSnapshotChange, patient?.id])

  useEffect(() => {
    const messageId = String(injectedPatientMessage?.id || '').trim()
    const messageText = String(injectedPatientMessage?.text || '').trim()
    if (!messageId || !messageText) return
    setMessages((prev) => {
      if (prev.some((entry) => entry.id === messageId)) return prev
      return [...prev, {
        id: messageId,
        type: 'patient',
        text: messageText,
        time: new Date(),
      }]
    })
    if (typeof onInjectedMessageConsumed === 'function') onInjectedMessageConsumed(messageId)
  }, [injectedPatientMessage?.id, injectedPatientMessage?.text, onInjectedMessageConsumed])

  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const askFreeQuestion = async (forcedText = '') => {
    const text = String(forcedText || freeQuestion || '').trim()
    if (!text || isTyping) return
    if (!patientCanSpeak) {
      setChatNotice({ type: 'warn', text: 'Patient*in ist bewusstlos und kann aktuell nicht antworten.' })
      window.setTimeout(() => setChatNotice(null), 3200)
      return
    }

    setFreeQuestion('')
    setMessages(prev => [...prev, {
      id: `q_free_${Date.now()}`,
      type: 'doctor',
      text,
      time: new Date(),
    }])
    setIsTyping(true)

    const lang = String(patient?.languageCode || 'de').toLowerCase()
    let answerText = ''
    let matchedFallbackQuestion = null

    const aiAvailable = isAiChatConfigured()
    const getPainStimulusReply = (doctorText) => {
      if (!painStimulusContext?.type || painStimulusContext.type !== 'pain_stimulus') return null
      const normalized = normalizeText(doctorText)
      const hasAny = (patterns) => patterns.some((pattern) => normalized.includes(pattern))
      if (painStimulusContext.noResponse) {
        return { text: '[keine verbale Reaktion]', explained: false }
      }
      if (hasAny(['gespuert', 'gespürt', 'gemerkt', 'wahrgenommen', 'reaktion'])) {
        if (painStimulusContext.reducedResponse) {
          return {
            text: 'Ja... ich habe das gespürt. Es war kurz unangenehm, die eigentlichen Beschwerden sind aber weiterhin da.',
            explained: painStimulusDialogue.explained,
          }
        }
        return {
          text: 'Ja, ich habe es deutlich gemerkt. Es hat kurz gestochen, aber mein Hauptproblem ist noch da.',
          explained: painStimulusDialogue.explained,
        }
      }
      if (hasAny(['schmerzreiz', 'ansprechbarkeit', 'neurologisch', 'bewusstsein', 'reflex', 'test'])) {
        if (painStimulusDialogue.explained) {
          return {
            text: painStimulusContext.reducedResponse
              ? 'Okay... verstanden. Danke für die kurze Erklärung.'
              : 'Alles klar, danke für die Erklärung.',
            explained: true,
          }
        }
        if (painStimulusContext.reducedResponse) {
          return { text: 'Okay... verstanden. Ich war nur kurz irritiert, weil ich nicht wusste, was Sie testen.', explained: true }
        }
        const responses = [
          'Okay, verstanden. Danke fürs Erklären.',
          'Alles klar, wenn das ein Test war, passt das.',
          'Verstanden. Sagen Sie bitte kurz Bescheid, bevor Sie so etwas machen.',
        ]
        return { text: responses[Math.floor(Math.random() * responses.length)], explained: true }
      }
      if (hasAny(['entschuld', 'sorry', 'tut mir leid'])) {
        return {
          text: painStimulusContext.reducedResponse
            ? 'Schon gut... ich war nur erschrocken.'
            : 'Ist schon okay, ich war nur kurz erschrocken.',
          explained: painStimulusDialogue.explained,
        }
      }
      if (hasAny(['warum', 'weh', 'gemacht'])) {
        if (painStimulusDialogue.explained) {
          return {
            text: painStimulusContext.reducedResponse
              ? 'Okay... ich habe es verstanden, danke.'
              : 'Verstanden, danke. Bitte sagen Sie so etwas kurz vorher.',
            explained: true,
          }
        }
        return {
          text: painStimulusContext.reducedResponse
            ? 'Ich wollte nur wissen, was das gerade war.'
            : 'Ich wollte nur wissen, warum das gerade gemacht wurde.',
          explained: false,
        }
      }
      return null
    }
    const detectIntentIds = () => {
      const normalized = normalizeText(text)
      const ids = new Set()
      const hasAny = (patterns) => patterns.some(pattern => normalized.includes(pattern))
      if (hasAny(['schmerz', 'pain', 'dolor', 'nrs', 'skala'])) ids.add('pain')
      if (hasAny(['allerg', 'allergy', 'alerg'])) ids.add('allergies')
      if (hasAny(['medik', 'medication', 'medicacion', 'tablette', 'nimmt', 'nehmen'])) ids.add('medications')
      if (hasAny(['vorerkrank', 'krankheit', 'history', 'antecedente'])) ids.add('past_history')
      if (hasAny(['letzte mahlzeit', 'gegessen', 'eaten', 'comido'])) ids.add('last_meal')
      if (hasAny(['auslö', 'begonnen', 'seit wann', 'when did', 'empezo'])) ids.add('event')
      if (hasAny(['risiko', 'familie', 'risk factor'])) ids.add('risk_factors')
      if (hasAny(['hauptbeschwerde', 'was führt', 'chief complaint', 'motivo'])) ids.add('chief_complaint')
      if (hasAny(['symptom', 'beschwerden genauer', 'describe'])) ids.add('symptoms')
      if (hasAny(['besser', 'schlechter', 'verlauf', 'course'])) ids.add('onset')
      if (hasAny(['sonst', 'wichtig', 'anything else', 'algo mas'])) ids.add('additional')
      return ids
    }

    const painStimulusReply = getPainStimulusReply(text)
    if (painStimulusReply) {
      answerText = painStimulusReply.text
      setPainStimulusDialogue((prev) => ({
        explained: typeof painStimulusReply.explained === 'boolean' ? painStimulusReply.explained : prev.explained,
      }))
    } else if (lang !== 'de' && !translatorEnabled) {
      answerText = getPatientFallbackPrompt(lang)
    } else if (aiAvailable) {
      const aiResult = await requestAiPatientReply({
        patient,
        mode,
        lang,
        translatorEnabled,
        doctorMessage: text,
        history: messages,
      })
      if (aiResult?.ok && aiResult?.text) {
        answerText = aiResult.text
      } else {
        const structuredReply = getStructuredReplyFromQuestion(text)
        matchedFallbackQuestion = structuredReply || getRuleBasedFallback(text)
        answerText = matchedFallbackQuestion?.answer || 'Ich bin mir nicht sicher, wie ich das beschreiben soll. Können Sie bitte genauer nachfragen?'
        const detail = aiResult?.status
          ? `HTTP ${aiResult.status}${aiResult?.message ? `: ${aiResult.message}` : ''}`
          : (aiResult?.message || aiResult?.error || 'Unbekannter Fehler')
        setChatNotice({ type: 'warn', text: `Antwort nicht verfügbar (${detail}) — Fallback genutzt.` })
        setTimeout(() => setChatNotice(null), 5200)
      }
    } else {
      const structuredReply = getStructuredReplyFromQuestion(text)
      matchedFallbackQuestion = structuredReply || getRuleBasedFallback(text)
      answerText = matchedFallbackQuestion?.answer || 'Ich bin mir nicht sicher, wie ich das beschreiben soll. Können Sie bitte genauer nachfragen?'
      setChatNotice({ type: 'warn', text: 'AI-Simulationsdialog ist deaktiviert oder nicht verfügbar. Fallback genutzt.' })
      setTimeout(() => setChatNotice(null), 4500)
    }

    const intentIds = detectIntentIds()
    if (matchedFallbackQuestion?.id) intentIds.add(matchedFallbackQuestion.id)
    if (intentIds.size > 0) {
      setAskedIds(prev => new Set([...prev, ...Array.from(intentIds)]))
    }

    if (patient?.communicationNeeds === 'mute' && !String(answerText).startsWith('[schreibt]')) {
      answerText = `[schreibt] ${answerText}`
    }

    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: `a_free_${Date.now()}`,
        type: 'patient',
        text: answerText,
        time: new Date(),
      }])
    }, 700 + Math.random() * 650)
  }

  const discoveredPain = useMemo(() => {
    if (!askedIds.has('pain')) return null
    return extractPainNrsFromMessages(messages, dialogue.painLevel)
  }, [askedIds, messages, dialogue.painLevel])

  const quickTemplates = useMemo(() => {
    const core = [
      'Was führt Sie heute zu uns?',
      'Können Sie die Beschwerden genauer beschreiben?',
      'Seit wann bestehen die Beschwerden?',
      'Wie stark sind die Schmerzen auf einer Skala von 0 bis 10?',
      'Gibt es Auslöser oder wird es bei etwas schlimmer/besser?',
      'Haben Sie Allergien gegen Medikamente oder andere Stoffe?',
      'Nehmen Sie regelmäßig Medikamente ein?',
      'Haben Sie relevante Vorerkrankungen?',
      'Wann haben Sie zuletzt gegessen oder getrunken?',
      'Gab es ähnliche Beschwerden schon einmal?',
      'Gibt es noch etwas Wichtiges, das ich wissen sollte?',
    ]
    const trauma = [
      'Gab es einen Sturz, Unfall oder direkten Aufprall?',
      'Wo genau tut es am meisten weh?',
      'Können Sie die betroffene Stelle bewegen und belasten?',
      'Haben Sie Taubheit, Kribbeln oder Kraftverlust bemerkt?',
    ]
    const resp = [
      'Fällt Ihnen das Atmen in Ruhe schwer oder nur bei Belastung?',
      'Haben Sie Husten, Auswurf oder pfeifende Atmung?',
      'Wird die Luftnot beim Liegen schlechter?',
    ]
    const cardiac = [
      'Strahlen die Beschwerden in Arm, Rücken oder Kiefer aus?',
      'Gab es Druck auf der Brust, Herzrasen oder Kaltschweißigkeit?',
      'Wird es in Ruhe besser oder bleibt es gleich?',
    ]
    const abdominal = [
      'Wo im Bauch sitzen die Schmerzen genau?',
      'Gab es Übelkeit, Erbrechen oder Veränderungen beim Stuhlgang?',
      'Haben Sie Fieber oder Schüttelfrost bemerkt?',
    ]
    const neuro = [
      'Gab es Schwindel, Sehstörungen oder Sprachprobleme?',
      'Hatten Sie plötzlich starke Kopfschmerzen?',
      'Gab es Lähmungen oder Taubheitsgefühle?',
    ]
    const ward = [
      'Wie geht es Ihnen seit der letzten Behandlung insgesamt?',
      'Sind neue Beschwerden hinzugekommen?',
      'Hat die Medikation bisher geholfen?',
      'Konnten Sie essen, trinken und schlafen?',
    ]
    const rd = [
      'Können Sie mir kurz schildern, was genau passiert ist?',
      'Waren Sie zwischenzeitlich bewusstlos?',
      'Sind Blutverdünner oder Vorerkrankungen bekannt?',
      'Wo ist aktuell das dringendste Problem?',
    ]
    const conditionals = [
      ...(complaintContext.trauma ? trauma : []),
      ...(complaintContext.respiratory ? resp : []),
      ...(complaintContext.cardiac ? cardiac : []),
      ...(complaintContext.abdominal ? abdominal : []),
      ...(complaintContext.neuro ? neuro : []),
      ...(mode === 'ward' ? ward : []),
      ...(mode === 'rd' ? rd : []),
    ]
    return [...core, ...conditionals].slice(0, 22)
  }, [complaintContext, mode])

  const collectedData = {
    painLevel: discoveredPain,
    allergies: askedIds.has('allergies') ? dialogue.allergies : null,
    medications: askedIds.has('medications') ? dialogue.medications : null,
    pastHistory: askedIds.has('past_history') ? dialogue.pastHistory : null,
    lastMeal: askedIds.has('last_meal') ? dialogue.lastMeal : null,
    askedQuestionIds: Array.from(askedIds),
    questionsAsked: askedIds.size,
    totalQuestions: dialogue.questions.length,
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Patient header — always visible */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-surface-200 bg-white shrink-0 z-10">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center text-2xl shadow-lg ring-4 ring-white`}>
          {avatar.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-surface-900 text-lg">{patient.name}</h3>
          <p className="text-sm text-surface-500">
            {patient.age} Jahre, {patient.gender}
            {patient.arrivalType === 'ambulance' && <span className="text-red-500 font-medium ml-2 bg-red-50 px-2 py-0.5 rounded-full text-xs">RTW</span>}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(patient.arrivalTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {discoveredPain !== null && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              discoveredPain >= 7 ? 'bg-red-100 text-red-700' : discoveredPain >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              <Heart className="w-3.5 h-3.5" />
              NRS {discoveredPain}/10
            </div>
          )}
          <p className="text-xs text-surface-400">{askedIds.size}/{dialogue.questions.length} Fragen</p>
        </div>
      </div>

      {/* Complaint banner */}
      <div className="px-6 py-2.5 bg-surface-50 border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-surface-400 shrink-0" />
          <p className="text-sm text-surface-600">
            <span className="font-medium">{mode === 'ward' ? 'Aufnahmegrund:' : 'Beschwerde:'}</span> {getLocalizedChiefComplaint(patient, conversationLang)}
          </p>
        </div>
        {isForeignConversation && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-indigo-700">
              <Languages className="w-4 h-4" />
              <span className="font-medium">Chat-Übersetzer</span>
              <span className="text-indigo-500">
                {conversationLang === 'en' ? 'Deutsch ↔ Englisch' : 'Deutsch ↔ Spanisch'}
              </span>
            </div>
            <button
              onClick={() => setTranslatorEnabled(prev => !prev)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                translatorEnabled
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-100'
              }`}
            >
              {translatorEnabled ? 'Aktiv' : 'Aus'}
            </button>
          </div>
        )}
      </div>

      {/* Chat messages — scrollable area fills remaining space */}
      <div ref={messagesScrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-1 bg-gradient-to-b from-surface-50/80 to-white min-h-0" style={{ flexBasis: 0 }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'doctor' ? 'justify-end' : 'justify-start'} mb-4`}>
            {msg.type === 'patient' && (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center text-sm mr-3 shrink-0 self-end shadow-sm`}>
                {avatar.emoji}
              </div>
            )}
            <div className={`max-w-[70%] ${
              msg.type === 'doctor'
                ? 'bg-primary-500 text-white rounded-2xl rounded-br-md shadow-md shadow-primary-500/20'
                : 'bg-white border border-surface-200 text-surface-800 rounded-2xl rounded-bl-md shadow-sm'
            } px-5 py-3`}>
              {msg.category && (
                <span className="block text-[11px] uppercase tracking-wider opacity-60 mb-1 font-medium">{msg.category}</span>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{applyIntensityFilter(msg.text)}</p>
              {translatorEnabled && isForeignConversation && (
                <p className={`text-[12px] mt-1.5 whitespace-pre-line ${
                  msg.type === 'doctor' ? 'text-primary-100/90' : 'text-surface-500'
                }`}>
                  {msg.type === 'doctor'
                    ? translateChatText(msg.text, 'de', conversationLang)
                    : (getPatientMessageGermanVersion(msg) || translateChatText(msg.text, conversationLang, 'de'))}
                </p>
              )}
              <span className={`block text-[11px] mt-1.5 ${msg.type === 'doctor' ? 'text-primary-200' : 'text-surface-400'}`}>
                {msg.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.type === 'doctor' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ml-3 shrink-0 self-end shadow-sm">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        {isTyping && <TypingIndicator avatar={avatar} />}
      </div>

      {/* Chat input */}
      <div className="border-t border-surface-200 bg-white shrink-0">
        {chatNotice && (
          <div className={`mx-6 mt-2 rounded-lg border px-3 py-1.5 text-xs ${
            chatNotice.type === 'warn'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {chatNotice.text}
          </div>
        )}
        <div className="px-6 pt-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickTemplates.map((template) => (
              <button
                key={template}
                onClick={() => askFreeQuestion(template)}
                disabled={isTyping || !patientCanSpeak}
                className="shrink-0 rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-100 disabled:opacity-50"
                title={template}
              >
                {template}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 pb-3 pt-1 border-t border-surface-100 shrink-0">
          <div className="flex gap-2">
            <input
              value={freeQuestion}
              onChange={(e) => setFreeQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') askFreeQuestion()
              }}
              placeholder="Nachricht eingeben..."
              className="input-field !py-2.5 text-sm flex-1"
              disabled={!patientCanSpeak}
            />
            <button
              onClick={askFreeQuestion}
              disabled={!freeQuestion.trim() || isTyping || !patientCanSpeak}
              className="px-3 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Finish section */}
        {mode === 'triage' && onComplete && (
          <div className="px-6 pb-5 border-t border-surface-100">
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-surface-400">
                {askedIds.size}/{dialogue.questions.length} Fragen gestellt
              </p>
              <button
                onClick={() => onComplete(collectedData)}
                className="btn-primary px-6 py-2.5"
              >
                Weiter zur Triage-Bewertung
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
