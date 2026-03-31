import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { KNOWLEDGE_CATEGORIES } from '../data/knowledgeData'
import { getKnowledgeCost } from '../data/shopSpecials'
import {
  BookOpen, Lock, Unlock, Check, ChevronDown, ChevronUp,
  DollarSign, Heart, Siren, ClipboardList, Pill, Scissors,
  Brain, Search, ArrowLeft, Bookmark, Star, Zap
} from 'lucide-react'

const iconMap = { Heart, Siren, ClipboardList, Pill, Scissors, Brain }

export default function Knowledge() {
  const { user, updateUser, addMoney } = useAuth()
  const [activeCategory, setActiveCategory] = useState(null)
  const [expandedTopic, setExpandedTopic] = useState(null)
  const [search, setSearch] = useState('')
  const [purchaseMsg, setPurchaseMsg] = useState(null)

  const unlockedCategories = user?.unlockedKnowledge || []

  const isUnlocked = (cat) => cat.cost === 0 || unlockedCategories.includes(cat.id)

  const unlockCategory = (cat) => {
    if (isUnlocked(cat)) return
    const effectiveCost = getKnowledgeCost(cat.cost, user)
    if ((user?.wallet || 0) < effectiveCost) {
      setPurchaseMsg({ success: false, message: 'Nicht genug Guthaben!' })
      setTimeout(() => setPurchaseMsg(null), 3000)
      return
    }
    addMoney(-effectiveCost)
    updateUser({ unlockedKnowledge: [...unlockedCategories, cat.id] })
    setPurchaseMsg({ success: true, message: `${cat.name} freigeschaltet!` })
    setTimeout(() => setPurchaseMsg(null), 3000)
  }

  const filteredCategories = search
    ? KNOWLEDGE_CATEGORIES.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        cat.topics.some(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase()))
      )
    : KNOWLEDGE_CATEGORIES
  const groupedCategories = {
    medical: filteredCategories.filter(cat => cat.track !== 'rescue'),
    rescue: filteredCategories.filter(cat => cat.track === 'rescue'),
  }

  if (activeCategory) {
    const cat = KNOWLEDGE_CATEGORIES.find(c => c.id === activeCategory)
    if (!cat) return null
    const unlocked = isUnlocked(cat)

    const filteredTopics = search
      ? cat.topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase()))
      : cat.topics

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => { setActiveCategory(null); setExpandedTopic(null); setSearch('') }} className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
            {(() => { const Icon = iconMap[cat.icon] || BookOpen; return <Icon className="w-7 h-7 text-white" /> })()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-surface-900">{cat.name}</h1>
            <p className="text-surface-500 text-sm">{cat.topics.length} Themen</p>
          </div>
        </div>

        {!unlocked && (
          <div className="card p-6 mb-6 text-center border-amber-200 bg-amber-50/50">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-surface-900 mb-1">Kategorie gesperrt</h3>
            <p className="text-sm text-surface-500 mb-4">Schalte diese Kategorie frei, um alle Themen lesen zu können.</p>
            <button onClick={() => unlockCategory(cat)} className="btn-primary">
              <DollarSign className="w-4 h-4" /> Für {getKnowledgeCost(cat.cost, user).toLocaleString('de-DE')}€ freischalten
            </button>
            <p className="text-xs text-surface-400 mt-2">Guthaben: {(user?.wallet || 0).toLocaleString('de-DE')}€</p>
          </div>
        )}

        {unlocked && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-11"
                placeholder="In dieser Kategorie suchen..."
              />
            </div>

            <div className="space-y-3">
              {filteredTopics.map(topic => {
                const isExpanded = expandedTopic === topic.id
                return (
                  <div key={topic.id} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-50 transition-colors"
                    >
                      <Bookmark className="w-5 h-5 text-primary-500 shrink-0" />
                      <span className="flex-1 font-medium text-surface-900">{topic.title}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-surface-100">
                        <div className="pt-4 prose prose-sm max-w-none">
                          {topic.content.split('\n\n').map((paragraph, i) => (
                            <div key={i} className="mb-3">
                              {paragraph.split('\n').map((line, j) => {
                                const isBold = line.startsWith('**') && line.includes(':**')
                                if (isBold) {
                                  const parts = line.split(':**')
                                  const label = parts[0].replace(/\*\*/g, '')
                                  const rest = parts.slice(1).join(':**')
                                  return (
                                    <p key={j} className="text-sm text-surface-700 mb-1">
                                      <span className="font-semibold text-surface-900">{label}:</span>{rest}
                                    </p>
                                  )
                                }
                                const boldLine = line.startsWith('**') && line.endsWith('**')
                                if (boldLine) {
                                  return <p key={j} className="font-semibold text-surface-900 text-sm mb-1 mt-3">{line.replace(/\*\*/g, '')}</p>
                                }
                                if (line.startsWith('- ')) {
                                  return <p key={j} className="text-sm text-surface-600 pl-4 mb-0.5">• {line.substring(2)}</p>
                                }
                                if (/^\d+[\.\)]/.test(line)) {
                                  return <p key={j} className="text-sm text-surface-600 pl-4 mb-0.5">{line}</p>
                                }
                                return <p key={j} className="text-sm text-surface-600 mb-1">{line.replace(/\*\*/g, '')}</p>
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredTopics.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-surface-200 mx-auto mb-3" />
                <p className="text-surface-500">Keine Themen gefunden</p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-surface-900">Wissen</h1>
        <p className="text-surface-500 mt-1">Medizinisches Nachschlagewerk — lerne, verstehe und schlage während der Behandlung nach</p>
      </div>

      {purchaseMsg && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${purchaseMsg.success ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-700'}`}>
          {purchaseMsg.message}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field !pl-11"
          placeholder="Wissen durchsuchen..."
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-surface-900">{KNOWLEDGE_CATEGORIES.length}</p>
          <p className="text-xs text-surface-500">Kategorien</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{KNOWLEDGE_CATEGORIES.filter(c => isUnlocked(c)).length}</p>
          <p className="text-xs text-surface-500">Freigeschaltet</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-surface-900">{KNOWLEDGE_CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0)}</p>
          <p className="text-xs text-surface-500">Themen gesamt</p>
        </div>
      </div>

      {/* Categories */}
      {groupedCategories.medical.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Krankenhaus / Medizin</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {groupedCategories.medical.map(cat => {
              const unlocked = isUnlocked(cat)
              const Icon = iconMap[cat.icon] || BookOpen
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`card p-5 cursor-pointer transition-all hover:border-primary-200 hover:shadow-md ${!unlocked ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-surface-900">{cat.name}</h3>
                        {unlocked ? (<Unlock className="w-4 h-4 text-accent-500" />) : (<Lock className="w-4 h-4 text-surface-400" />)}
                      </div>
                      <p className="text-sm text-surface-500 mb-2">{cat.topics.length} Themen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.topics.slice(0, 3).map(t => (<span key={t.id} className="text-xs px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full">{t.title}</span>))}
                        {cat.topics.length > 3 && (<span className="text-xs px-2 py-0.5 bg-surface-100 text-surface-400 rounded-full">+{cat.topics.length - 3}</span>)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {unlocked ? (<span className="text-xs text-accent-600 font-medium px-2 py-1 bg-accent-50 rounded-lg">Verfügbar</span>)
                        : (<span className="text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded-lg">{cat.cost.toLocaleString('de-DE')}€</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {groupedCategories.rescue.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Rettungsdienst</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {groupedCategories.rescue.map(cat => {
              const unlocked = isUnlocked(cat)
              const Icon = iconMap[cat.icon] || BookOpen
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`card p-5 cursor-pointer transition-all hover:border-primary-200 hover:shadow-md ${!unlocked ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-surface-900">{cat.name}</h3>
                        {unlocked ? (<Unlock className="w-4 h-4 text-accent-500" />) : (<Lock className="w-4 h-4 text-surface-400" />)}
                      </div>
                      <p className="text-sm text-surface-500 mb-2">{cat.topics.length} Themen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.topics.slice(0, 3).map(t => (<span key={t.id} className="text-xs px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full">{t.title}</span>))}
                        {cat.topics.length > 3 && (<span className="text-xs px-2 py-0.5 bg-surface-100 text-surface-400 rounded-full">+{cat.topics.length - 3}</span>)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {unlocked ? (<span className="text-xs text-accent-600 font-medium px-2 py-1 bg-accent-50 rounded-lg">Verfügbar</span>)
                        : (<span className="text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded-lg">{cat.cost.toLocaleString('de-DE')}€</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-surface-200 mx-auto mb-3" />
          <p className="text-surface-500">Keine passenden Kategorien gefunden</p>
        </div>
      )}

      {/* Info */}
      <div className="card p-5 mt-8 bg-primary-50/50 border-primary-200">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-surface-900 mb-1">Tipp</h4>
            <p className="text-sm text-surface-600">Das Wissen hier ist nicht nur zum Lernen — du kannst es jederzeit während der Behandlung von Patienten nachschlagen. Investiere in Kategorien, die zu deinem Fachgebiet passen!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
