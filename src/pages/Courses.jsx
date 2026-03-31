import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { COURSES } from '../data/courseData'
import { getCurrentRank, RANKS, normalizeSpecialtyId, SPECIALTY_PROMOTION_COURSES } from '../data/ranks'
import { getCourseCostWithSpecials } from '../data/shopSpecials'
import { selectQuestions, prepareQuestion, formatTime, getTimerSeconds } from '../utils/quizHelpers'
import {
  BookOpen, Heart, Scissors, Siren, Wind, Brain, Scan, Shield,
  MessageCircle, Check, X, ArrowRight, ArrowLeft, Trophy, Lock,
  Star, ClipboardList, GraduationCap, Zap, UserCheck,
  AlertTriangle, RotateCcw, Baby, Pill, Clock, DollarSign,
  BookMarked, ChevronDown, ChevronUp, Lightbulb, ShoppingCart
} from 'lucide-react'

const iconMap = { Heart, Scissors, Siren, Wind, Brain, Scan, Shield, MessageCircle, BookOpen, UserCheck, Baby, Pill }

export default function Courses() {
  const { user, updateUser, addMoney } = useAuth()
  const [activeCourse, setActiveCourse] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [studyMode, setStudyMode] = useState(false)
  const [preparedQuestions, setPreparedQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [answers, setAnswers] = useState([])
  const [lessonResult, setLessonResult] = useState(null)
  const [filter, setFilter] = useState('all')
  const [timeLeft, setTimeLeft] = useState(0)
  const [expandedStudy, setExpandedStudy] = useState(null)
  const [purchaseMsg, setPurchaseMsg] = useState(null)
  const timerRef = useRef(null)

  const completedCourses = user?.completedCourses || []
  const purchasedCourses = user?.purchasedCourses || []
  const courseProgress = user?.courseProgress || {}
  const currentRank = getCurrentRank(user)
  const currentRankPerks = currentRank?.perks || {}
  const isRescueOnly = user?.careerTrack === 'rescue' && !user?.medicalLicense
  const hasDualRole = !!(user?.medicalLicense && user?.rescueCertified)
  const specialtyId = normalizeSpecialtyId(user?.specialty)
  const coreSpecialtyCourseBySpecialty = {
    innere: 'innere',
    chirurgie: 'chirurgie',
    notfallmedizin: 'notfall',
    anaesthesie: 'anaesthesie',
    neurologie: 'neurologie_kurs',
  }
  const coreSpecialtyByCourseId = Object.entries(coreSpecialtyCourseBySpecialty).reduce((acc, [specId, courseId]) => {
    acc[courseId] = specId
    return acc
  }, {})
  const specialtyTrack = SPECIALTY_PROMOTION_COURSES[specialtyId] || null
  const nextPromotionCourseId = currentRank.level === 2
    ? (specialtyTrack?.oberarzt || null)
    : currentRank.level === 3
      ? (specialtyTrack?.chefarzt || null)
      : null
  const resolvePriceWithDiscount = (basePrice, discountPercent = 0) => {
    const raw = Math.max(0, Number(basePrice || 0))
    const disc = Math.max(0, Math.min(95, Number(discountPercent || 0)))
    return Math.max(0, Math.round(raw * (1 - disc / 100)))
  }

  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    if (timeLeft <= 0 && activeLesson && !lessonResult && preparedQuestions.length > 0) {
      finishLesson([...answers, ...(new Array(preparedQuestions.length - answers.length).fill(-1))])
    }
  }, [timeLeft])

  const canAccessCourse = (course) => {
    const prerequisites = Array.isArray(course?.prerequisiteCourseIds) ? course.prerequisiteCourseIds : []
    if (prerequisites.length > 0) {
      const hasAllPrerequisites = prerequisites.every((courseId) => completedCourses.includes(courseId))
      if (!hasAllPrerequisites) return false
    }
    if (course.track !== 'rescue' && (course?.careerStep === 'oberarzt' || course?.careerStep === 'chefarzt')) {
      if (!specialtyId || specialtyId !== normalizeSpecialtyId(course?.specialtyId)) return false
    }
    if (course.track !== 'rescue') {
      const mappedSpecialty = coreSpecialtyByCourseId[course.id]
      if (mappedSpecialty && specialtyId && currentRank.level >= 2 && mappedSpecialty !== specialtyId) return false
    }
    if (course.track === 'rescue') return !!(user?.rescueCertified || user?.careerTrack === 'rescue' || user?.medicalLicense)
    const reqRank = RANKS.find(r => r.id === course.requiredRank)
    if (!reqRank) return true
    return currentRank.level >= reqRank.level
  }
  const getLockedReason = (course) => {
    const prerequisites = Array.isArray(course?.prerequisiteCourseIds) ? course.prerequisiteCourseIds : []
    if (prerequisites.length > 0) {
      const missing = prerequisites.filter((courseId) => !completedCourses.includes(courseId))
      if (missing.length > 0) return 'Voraussetzungen fehlen'
    }
    if (course.track !== 'rescue' && (course?.careerStep === 'oberarzt' || course?.careerStep === 'chefarzt')) {
      const courseSpecialty = normalizeSpecialtyId(course?.specialtyId)
      if (!specialtyId) return 'Fachrichtung wählen'
      if (specialtyId !== courseSpecialty) return 'Falsche Fachrichtung'
      if (course.careerStep === 'oberarzt') {
        const baseCourseId = coreSpecialtyCourseBySpecialty[specialtyId]
        if (!baseCourseId || !completedCourses.includes(baseCourseId)) return 'Facharztkurs zuerst abschließen'
      }
    }
    if (course.track !== 'rescue') {
      const mappedSpecialty = coreSpecialtyByCourseId[course.id]
      if (mappedSpecialty && specialtyId && currentRank.level >= 2 && mappedSpecialty !== specialtyId) {
        return 'Andere Fachrichtung (Profil wechseln)'
      }
    }
    return 'Rang nicht ausreichend'
  }

  const hasPurchased = (course) => course.cost === 0 || purchasedCourses.includes(course.id)
  const getCourseCompletion = (course) => {
    const prog = courseProgress[course.id] || []
    return Math.round((prog.length / course.lessons.length) * 100)
  }
  const isLessonDone = (courseId, lessonId) => (courseProgress[courseId] || []).includes(lessonId)

  const purchaseCourse = (course) => {
    const baseCost = resolvePriceWithDiscount(course.cost, currentRankPerks.courseCostDiscountPercent)
    const effectiveCost = getCourseCostWithSpecials(course, baseCost, user, Number(currentRank?.level || 1))
    if ((user?.wallet || 0) < effectiveCost) {
      setPurchaseMsg({ success: false, msg: 'Nicht genügend Guthaben!' })
      setTimeout(() => setPurchaseMsg(null), 3000)
      return
    }
    addMoney(-effectiveCost)
    updateUser({ purchasedCourses: [...purchasedCourses, course.id] })
    setPurchaseMsg({ success: true, msg: `${course.name} für ${effectiveCost}€ freigeschaltet!` })
    setTimeout(() => setPurchaseMsg(null), 3000)
  }

  const startLesson = (course, lesson) => {
    if (lesson.retryCost || course.retryCost) {
      const baseCost = lesson.retryCost || course.retryCost || 0
      const discounted = resolvePriceWithDiscount(baseCost, currentRankPerks.retryCostDiscountPercent)
      const cost = getCourseCostWithSpecials(course, discounted, user, Number(currentRank?.level || 1))
      const done = isLessonDone(course.id, lesson.id)
      if (!done && cost > 0) {
        if ((user?.wallet || 0) < cost) {
          setPurchaseMsg({ success: false, msg: `Prüfungsgebühr: ${cost}€ — nicht genügend Guthaben!` })
          setTimeout(() => setPurchaseMsg(null), 3000)
          return
        }
        addMoney(-cost)
      }
    }

    const count = lesson.questionsPerAttempt || 5
    const selected = selectQuestions(lesson.questions, count)
    const prepared = selected.map(q => prepareQuestion(q))
    setPreparedQuestions(prepared)
    setActiveCourse(course)
    setActiveLesson(lesson)
    setStudyMode(false)
    setCurrentQ(0)
    setSelectedAnswer(null)
    setConfirmed(false)
    setAnswers([])
    setLessonResult(null)
    const totalTime = Number(lesson?.timerSeconds || 0) > 0
      ? Number(lesson.timerSeconds)
      : getTimerSeconds(course.difficulty || 'mittel', prepared.length)
    setTimeLeft(totalTime)
    stopTimer()
    timerRef.current = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000)
  }

  const confirmAnswer = () => { if (selectedAnswer === null) return; setConfirmed(true) }

  const finishLesson = (finalAnswers) => {
    stopTimer()
    const correct = finalAnswers.filter((a, i) => preparedQuestions[i] && a === preparedQuestions[i].correct).length
    const pct = Math.round((correct / preparedQuestions.length) * 100)
    const passed = pct >= 70
    setLessonResult({ correct, total: preparedQuestions.length, pct, passed })

    if (passed) {
      const prog = courseProgress[activeCourse.id] || []
      if (!prog.includes(activeLesson.id)) {
        const newProg = [...prog, activeLesson.id]
        const newCourseProgress = { ...courseProgress, [activeCourse.id]: newProg }
        const courseFullyDone = newProg.length >= activeCourse.lessons.length
        const newCompletedCourses = courseFullyDone && !completedCourses.includes(activeCourse.id)
          ? [...completedCourses, activeCourse.id] : completedCourses
        const baseXpGain = courseFullyDone ? activeCourse.xpReward : 50
        const xpGain = Math.round(baseXpGain * (1 + (Number(currentRankPerks.courseXpBonusPercent || 0) / 100)))
        const previousRank = getCurrentRank(user)
        const updates = {
          courseProgress: newCourseProgress,
          completedCourses: newCompletedCourses,
          xp: (user?.xp || 0) + xpGain,
        }
        if (courseFullyDone && activeCourse.grantsRescueLevel) {
          updates.rescueLevel = activeCourse.grantsRescueLevel
          updates.rescueCertified = true
          updates.careerTrack = user?.careerTrack || 'rescue'
          updates.profession = user?.medicalLicense ? 'dual' : activeCourse.grantsRescueLevel
        }
        if (courseFullyDone && activeCourse.isBtmCourse) {
          updates.btmCertified = true
        }
        const projectedUser = {
          ...user,
          ...updates,
          stats: updates.stats || user?.stats,
        }
        const promotedRank = getCurrentRank(projectedUser)
        if (Number(promotedRank?.level || 0) > Number(previousRank?.level || 0)) {
          setPurchaseMsg({ success: true, msg: `Beförderung: Du bist jetzt ${promotedRank.name}!` })
          setTimeout(() => setPurchaseMsg(null), 4000)
        }
        updateUser(updates)
      }
    }
  }

  const nextQuestion = () => {
    const newAnswers = [...answers, selectedAnswer]
    setAnswers(newAnswers)
    if (currentQ + 1 >= preparedQuestions.length) { finishLesson(newAnswers) }
    else { setCurrentQ(currentQ + 1); setSelectedAnswer(null); setConfirmed(false) }
  }

  const timerColor = timeLeft < 30 ? 'text-red-600' : timeLeft < 60 ? 'text-amber-600' : 'text-surface-600'
  const getDifficultyMeta = (difficulty) => {
    const normalized = difficulty === 'schwer' ? 'fortgeschritten' : difficulty
    if (normalized === 'anfaenger') return { label: 'Anfänger', classes: 'bg-green-50 text-green-700' }
    if (normalized === 'mittel') return { label: 'Mittel', classes: 'bg-yellow-50 text-yellow-700' }
    if (normalized === 'experte') return { label: 'Experte', classes: 'bg-fuchsia-50 text-fuchsia-700' }
    return { label: 'Fortgeschritten', classes: 'bg-red-50 text-red-700' }
  }

  const filteredCourses = COURSES.filter(c => {
    if (nextPromotionCourseId && c.id === nextPromotionCourseId) return true
    if (filter === 'facharzt') return c.category === 'Facharzt-Weiterbildung'
    if (filter === 'allgemein') return c.category === 'Allgemeine Weiterbildung'
    if (filter === 'rettungsdienst') return c.track === 'rescue'
    if (filter === 'inprogress') return getCourseCompletion(c) > 0 && getCourseCompletion(c) < 100
    if (filter === 'completed') return completedCourses.includes(c.id)
    return true
  })
  const groupedCourses = {
    medical: filteredCourses.filter(c => c.track !== 'rescue'),
    rescue: filteredCourses.filter(c => c.track === 'rescue'),
  }
  groupedCourses.medical.sort((a, b) => {
    if (a.id === nextPromotionCourseId) return -1
    if (b.id === nextPromotionCourseId) return 1
    return 0
  })

  if (activeCourse && activeLesson && lessonResult) {
    const courseFullyDone = completedCourses.includes(activeCourse.id) || (lessonResult.passed && ((courseProgress[activeCourse.id] || []).length + (isLessonDone(activeCourse.id, activeLesson.id) ? 0 : 1)) >= activeCourse.lessons.length)
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card overflow-hidden">
          <div className={`p-8 text-center ${lessonResult.passed ? 'bg-gradient-to-br from-accent-500 to-accent-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">{lessonResult.passed ? <Check className="w-10 h-10" /> : <X className="w-10 h-10" />}</div>
            <h2 className="font-display text-2xl font-bold mb-1">{lessonResult.passed ? 'Lektion abgeschlossen!' : 'Nicht bestanden'}</h2>
            <p className="text-white/80">{activeLesson.title}</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">{lessonResult.pct}%</p><p className="text-sm text-surface-500">Ergebnis</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">{lessonResult.correct}/{lessonResult.total}</p><p className="text-sm text-surface-500">Richtig</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">70%</p><p className="text-sm text-surface-500">Bestehensgrenze</p></div>
            </div>
            {lessonResult.passed && courseFullyDone && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-600 shrink-0" /><div><p className="font-medium text-amber-800">Kurs abgeschlossen! +{activeCourse.xpReward} EP</p></div>
              </div>
            )}
            {lessonResult.passed && !courseFullyDone && <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-4"><p className="text-sm text-accent-700">Lektion bestanden! +50 EP</p></div>}
            {!lessonResult.passed && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm text-red-700">Mind. 70% nötig. Fragen werden neu gemischt.</p>
                  {activeCourse.retryCost > 0 && <p className="text-xs text-red-600 mt-1">Erneuter Versuch: {activeCourse.retryCost}€</p>}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setActiveLesson(null); setLessonResult(null) }} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Kursübersicht</button>
              {!lessonResult.passed && <button onClick={() => startLesson(activeCourse, activeLesson)} className="btn-primary flex-1"><RotateCcw className="w-4 h-4" /> Erneut ({activeCourse.retryCost || 0}€)</button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- QUIZ ---
  if (activeCourse && activeLesson && preparedQuestions.length > 0) {
    const question = preparedQuestions[currentQ]
    const progress = (currentQ / preparedQuestions.length) * 100
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { stopTimer(); setActiveLesson(null) }} className="flex items-center gap-2 text-surface-500 hover:text-surface-700"><ArrowLeft className="w-4 h-4" /> Abbrechen</button>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${timerColor}`}><Clock className="w-4 h-4" /> {formatTime(timeLeft)}</div>
            <span className="text-sm font-medium text-surface-500">Frage {currentQ + 1}/{preparedQuestions.length}</span>
          </div>
        </div>
        <div className="h-2 bg-surface-100 rounded-full overflow-hidden mb-8"><div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-surface-900 mb-6">{question.q}</h2>
          <div className="space-y-3 mb-8">
            {question.options.map((opt, i) => {
              const isSelected = selectedAnswer === i, isCorrect = i === question.correct
              let style = 'border-surface-200 hover:border-surface-300'
              if (confirmed) { if (isCorrect) style = 'border-accent-500 bg-accent-50'; else if (isSelected && !isCorrect) style = 'border-red-500 bg-red-50' }
              else if (isSelected) style = 'border-primary-500 bg-primary-50'
              return (
                <button key={i} onClick={() => !confirmed && setSelectedAnswer(i)} disabled={confirmed} className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${style}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${confirmed && isCorrect ? 'bg-accent-500 text-white' : confirmed && isSelected && !isCorrect ? 'bg-red-500 text-white' : isSelected ? 'bg-primary-500 text-white' : 'bg-surface-100 text-surface-600'}`}>
                      {confirmed && isCorrect ? <Check className="w-4 h-4" /> : confirmed && isSelected && !isCorrect ? <X className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                    </div>
                    <span className={`font-medium ${confirmed && isCorrect ? 'text-accent-700' : confirmed && isSelected && !isCorrect ? 'text-red-700' : isSelected ? 'text-primary-700' : 'text-surface-700'}`}>{opt}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {!confirmed ? (
            <button onClick={confirmAnswer} disabled={selectedAnswer === null} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">Antwort bestätigen</button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary w-full">{currentQ + 1 >= preparedQuestions.length ? 'Ergebnis' : 'Nächste Frage'} <ArrowRight className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    )
  }

  // --- COURSE DETAIL (Study + Lessons) ---
  if (activeCourse) {
    const Icon = iconMap[activeCourse.icon] || BookOpen
    const completion = getCourseCompletion(activeCourse)
    const purchased = hasPurchased(activeCourse)
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => { setActiveCourse(null); setStudyMode(false) }} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6"><ArrowLeft className="w-4 h-4" /> Alle Kurse</button>

        <div className="card overflow-hidden mb-6">
          <div className={`p-6 bg-gradient-to-r ${activeCourse.color} text-white`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center"><Icon className="w-7 h-7" /></div>
              <div>
                <p className="text-white/70 text-sm">{activeCourse.category}</p>
                <h2 className="text-2xl font-bold">{activeCourse.name}</h2>
                <p className="text-white/80 text-sm mt-1">{activeCourse.description}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {purchased && (
              <>
                <div className="flex items-center justify-between text-sm mb-2"><span className="text-surface-500">Fortschritt</span><span className="font-medium text-surface-900">{completion}%</span></div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden mb-4"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${completion}%` }} /></div>
              </>
            )}
            <div className="flex gap-4 text-sm text-surface-500">
              <span>{activeCourse.lessons.length} Lektionen</span><span>{activeCourse.duration}</span><span>{activeCourse.difficulty}</span><span>+{activeCourse.xpReward} EP</span>
              {activeCourse.retryCost > 0 && <span>Wiederholung: {resolvePriceWithDiscount(activeCourse.retryCost, currentRankPerks.retryCostDiscountPercent)}€</span>}
            </div>
          </div>
        </div>

        {purchaseMsg && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${purchaseMsg.success ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-700'}`}>{purchaseMsg.msg}</div>
        )}

        {!purchased && (
          <div className="card p-6 mb-6 text-center border-amber-200 bg-amber-50/50">
            <ShoppingCart className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h3 className="font-semibold text-surface-900 mb-1">Kurs freischalten</h3>
            <p className="text-sm text-surface-500 mb-4">Kaufe diesen Kurs, um Lernmaterialien und Prüfungen freizuschalten.</p>
            <button onClick={() => purchaseCourse(activeCourse)} className="btn-primary">
              <DollarSign className="w-4 h-4" /> Für {resolvePriceWithDiscount(activeCourse.cost, currentRankPerks.courseCostDiscountPercent).toLocaleString('de-DE')}€ freischalten
            </button>
            <p className="text-xs text-surface-400 mt-2">Guthaben: {(user?.wallet || 0).toLocaleString('de-DE')}€</p>
          </div>
        )}

        {purchased && (
          <>
            {/* Tab: Study / Exam */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setStudyMode(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!studyMode ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                <ClipboardList className="w-4 h-4" /> Prüfungen
              </button>
              <button onClick={() => setStudyMode(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${studyMode ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                <BookMarked className="w-4 h-4" /> Lernmaterial
              </button>
            </div>

            {studyMode ? (
              <div className="space-y-4">
                {activeCourse.studyContent?.length > 0 ? activeCourse.studyContent.map((section, idx) => (
                  <div key={idx} className="card overflow-hidden">
                    <button onClick={() => setExpandedStudy(expandedStudy === idx ? null : idx)} className="w-full p-5 flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Lightbulb className="w-5 h-5" /></div>
                        <h4 className="font-medium text-surface-900">{section.title}</h4>
                      </div>
                      {expandedStudy === idx ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                    </button>
                    {expandedStudy === idx && (
                      <div className="px-5 pb-5 border-t border-surface-100 pt-4">
                        <p className="text-sm text-surface-700 leading-relaxed mb-4">{section.content}</p>
                        {section.keyPoints && (
                          <div className="bg-primary-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider mb-2">Kernpunkte</p>
                            <ul className="space-y-1.5">
                              {section.keyPoints.map((kp, ki) => (
                                <li key={ki} className="flex items-start gap-2 text-sm text-primary-800">
                                  <Check className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" /> {kp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-12"><BookOpen className="w-12 h-12 text-surface-200 mx-auto mb-3" /><p className="text-surface-500">Kein Lernmaterial für diesen Kurs verfügbar</p></div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activeCourse.lessons.map((lesson, idx) => {
                  const done = isLessonDone(activeCourse.id, lesson.id)
                  return (
                    <div key={lesson.id} className={`card p-5 flex items-center gap-4 ${done ? 'border-accent-200 bg-accent-50/30' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${done ? 'bg-accent-500 text-white' : 'bg-surface-100 text-surface-600'}`}>
                        {done ? <Check className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-surface-900">{lesson.title}</h4>
                        <p className="text-sm text-surface-500 truncate">{lesson.content}</p>
                        <p className="text-xs text-surface-400 mt-1">
                          {lesson.questionsPerAttempt || 5} aus {lesson.questions.length} Fragen &bull; <Clock className="w-3 h-3 inline" /> {formatTime(Number(lesson?.timerSeconds || 0) > 0 ? Number(lesson.timerSeconds) : getTimerSeconds(activeCourse.difficulty, lesson.questionsPerAttempt || 5))}
                          {!done && activeCourse.retryCost > 0 && <span> &bull; Gebühr: {resolvePriceWithDiscount(activeCourse.retryCost, currentRankPerks.retryCostDiscountPercent)}€</span>}
                        </p>
                      </div>
                      <button onClick={() => startLesson(activeCourse, lesson)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${done ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                        {done ? 'Wiederholen' : 'Starten'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // --- COURSE LIST ---
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900">Weiterbildung</h1>
          <p className="text-surface-500 mt-1">Kurse kaufen, Lernmaterial studieren und Prüfungen ablegen</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium">
          <GraduationCap className="w-4 h-4" /> {completedCourses.length}/{COURSES.length}
        </div>
      </div>

      {purchaseMsg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${purchaseMsg.success ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-700'}`}>{purchaseMsg.msg}</div>}

      <div className="card p-4 mb-6 bg-gradient-to-r from-surface-50 to-primary-50/50 flex items-center gap-4">
        <Zap className="w-6 h-6 text-primary-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-surface-900">
            Rang: <span className="text-primary-600">{currentRank.name}</span>
            {hasDualRole ? <span className="text-rose-600"> + Rettungsdienst aktiv</span> : null}
          </p>
          <p className="text-xs text-surface-500">{isRescueOnly ? 'Schließe RD-Kurse ab, um deine Einsatzkompetenz zu erweitern.' : 'Schließe Facharzt-Kurse ab, um aufzusteigen. Jede Prüfung hat einen Timer und zufällige Fragen.'}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[{ id: 'all', label: 'Alle' }, { id: 'facharzt', label: 'Facharzt' }, { id: 'allgemein', label: 'Allgemein' }, { id: 'rettungsdienst', label: 'Rettungsdienst' }, { id: 'inprogress', label: 'In Bearbeitung' }, { id: 'completed', label: 'Abgeschlossen' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{f.label}</button>
        ))}
      </div>

      {groupedCourses.medical.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Krankenhaus / Medizin</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {groupedCourses.medical.map(course => {
              const Icon = iconMap[course.icon] || BookOpen
              const locked = !canAccessCourse(course)
              const done = completedCourses.includes(course.id)
              const purchased = hasPurchased(course)
              const completion = getCourseCompletion(course)
              const difficultyMeta = getDifficultyMeta(course.difficulty)
              return (
                <div key={course.id} className={`card overflow-hidden ${locked ? 'opacity-60' : ''} ${done ? 'ring-2 ring-accent-400' : ''}`}>
                  <div className={`h-1.5 bg-gradient-to-r ${course.color}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center`}>
                        {locked ? <Lock className="w-5 h-5 text-white" /> : <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {done && <span className="flex items-center gap-1 text-xs font-medium text-accent-600 bg-accent-50 px-2 py-1 rounded-full"><Check className="w-3 h-3" /> Fertig</span>}
                        {course.cost > 0 && !purchased && !locked && <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{resolvePriceWithDiscount(course.cost, currentRankPerks.courseCostDiscountPercent)}€</span>}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyMeta.classes}`}>
                          {difficultyMeta.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-surface-900 mb-1">{course.name}</h3>
                    <p className="text-sm text-surface-500 mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-3 text-xs text-surface-400 mb-3">
                      <span>{course.lessons.length} Lektionen</span><span>{course.duration}</span><span>+{course.xpReward} EP</span>
                    </div>
                    {completion > 0 && !done && purchased && (
                      <div className="mb-3"><div className="flex justify-between text-xs text-surface-500 mb-1"><span>Fortschritt</span><span>{completion}%</span></div><div className="h-1.5 bg-surface-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${completion}%` }} /></div></div>
                    )}
                    <button onClick={() => !locked && setActiveCourse(course)} disabled={locked} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      locked ? 'bg-surface-100 text-surface-400 cursor-not-allowed' :
                      done ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' :
                      !purchased ? 'bg-amber-500 text-white hover:bg-amber-600' :
                      completion > 0 ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' :
                      'bg-primary-600 text-white hover:bg-primary-700'
                    }`}>
                      {locked ? getLockedReason(course) : done ? 'Wiederholen' : !purchased ? `Freischalten (${resolvePriceWithDiscount(course.cost, currentRankPerks.courseCostDiscountPercent)}€)` : completion > 0 ? 'Weiterlernen' : 'Kurs starten'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {groupedCourses.rescue.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Rettungsdienst</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {groupedCourses.rescue.map(course => {
              const Icon = iconMap[course.icon] || BookOpen
              const locked = !canAccessCourse(course)
              const done = completedCourses.includes(course.id)
              const purchased = hasPurchased(course)
              const completion = getCourseCompletion(course)
              const difficultyMeta = getDifficultyMeta(course.difficulty)
              return (
                <div key={course.id} className={`card overflow-hidden ${locked ? 'opacity-60' : ''} ${done ? 'ring-2 ring-accent-400' : ''}`}>
                  <div className={`h-1.5 bg-gradient-to-r ${course.color}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center`}>
                        {locked ? <Lock className="w-5 h-5 text-white" /> : <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {done && <span className="flex items-center gap-1 text-xs font-medium text-accent-600 bg-accent-50 px-2 py-1 rounded-full"><Check className="w-3 h-3" /> Fertig</span>}
                        {course.cost > 0 && !purchased && !locked && <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{resolvePriceWithDiscount(course.cost, currentRankPerks.courseCostDiscountPercent)}€</span>}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyMeta.classes}`}>
                          {difficultyMeta.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-surface-900 mb-1">{course.name}</h3>
                    <p className="text-sm text-surface-500 mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-3 text-xs text-surface-400 mb-3">
                      <span>{course.lessons.length} Lektionen</span><span>{course.duration}</span><span>+{course.xpReward} EP</span>
                    </div>
                    {completion > 0 && !done && purchased && (
                      <div className="mb-3"><div className="flex justify-between text-xs text-surface-500 mb-1"><span>Fortschritt</span><span>{completion}%</span></div><div className="h-1.5 bg-surface-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${completion}%` }} /></div></div>
                    )}
                    <button onClick={() => !locked && setActiveCourse(course)} disabled={locked} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      locked ? 'bg-surface-100 text-surface-400 cursor-not-allowed' :
                      done ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' :
                      !purchased ? 'bg-amber-500 text-white hover:bg-amber-600' :
                      completion > 0 ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' :
                      'bg-primary-600 text-white hover:bg-primary-700'
                    }`}>
                      {locked ? getLockedReason(course) : done ? 'Wiederholen' : !purchased ? `Freischalten (${resolvePriceWithDiscount(course.cost, currentRankPerks.courseCostDiscountPercent)}€)` : completion > 0 ? 'Weiterlernen' : 'Kurs starten'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
