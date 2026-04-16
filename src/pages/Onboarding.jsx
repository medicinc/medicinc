import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SUBJECT_EXAMS, REQUIRED_EXAMS } from '../data/quizData'
import { RESCUE_EXAMS, REQUIRED_RESCUE_EXAMS } from '../data/rescueQuizData'
import { selectQuestions, prepareQuestion, formatTime, getTimerSeconds } from '../utils/quizHelpers'
import {
  BookOpen, Siren, Heart, Pill, Scissors, Check, X, ArrowRight,
  ArrowLeft, Trophy, AlertTriangle, Star, GraduationCap, ClipboardList,
  Zap, ShieldCheck, RotateCcw, Clock, Ambulance, Stethoscope
} from 'lucide-react'

const iconMap = { BookOpen, Siren, Heart, Pill, Scissors, Ambulance, Stethoscope }

export default function Onboarding() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [activeExam, setActiveExam] = useState(null)
  const [preparedQuestions, setPreparedQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [answers, setAnswers] = useState([])
  const [examResult, setExamResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedTrack, setSelectedTrack] = useState(
    user?.pendingMedicalOnboarding
      ? 'medical'
      : (user?.pendingRescueOnboarding ? 'rescue' : (user?.careerTrack || null))
  )
  const timerRef = useRef(null)

  const forcedTrack = user?.pendingMedicalOnboarding
    ? 'medical'
    : (user?.pendingRescueOnboarding ? 'rescue' : null)
  const effectiveTrack = forcedTrack || selectedTrack
  const examsPool = effectiveTrack === 'rescue' ? RESCUE_EXAMS : SUBJECT_EXAMS
  const requiredExamIds = effectiveTrack === 'rescue' ? REQUIRED_RESCUE_EXAMS : REQUIRED_EXAMS
  const completedMedicalExams = user?.completedExams || []
  const completedRescueExams = user?.completedRescueExams || []
  const completedExams = effectiveTrack === 'rescue' ? completedRescueExams : completedMedicalExams
  const allRequiredDone = requiredExamIds.every(id => completedExams.includes(id))

  const resetTutorialFlags = useCallback(() => {
    const userId = user?.id
    if (!userId) return
    const donePrefix = `medisim_hospital_tutorial_done_${userId}_`
    const forcePrefix = `medisim_hospital_tutorial_force_${userId}_`
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith(donePrefix) || key.startsWith(forcePrefix)) keys.push(key)
    }
    keys.forEach(key => localStorage.removeItem(key))
  }, [user?.id])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    if (timeLeft <= 0 && activeExam && !examResult && preparedQuestions.length > 0) {
      finishExam([...answers, ...(new Array(preparedQuestions.length - answers.length).fill(-1))])
    }
  }, [timeLeft])

  const startExam = (exam) => {
    const count = exam.questionsPerAttempt || 10
    const selected = selectQuestions(exam.questions, count)
    const prepared = selected.map(q => prepareQuestion(q))
    setPreparedQuestions(prepared)
    setActiveExam(exam)
    setCurrentQ(0)
    setSelectedAnswer(null)
    setConfirmed(false)
    setAnswers([])
    setExamResult(null)
    const totalTime = getTimerSeconds(exam.difficulty || 'anfaenger', prepared.length)
    setTimeLeft(totalTime)
    stopTimer()
    timerRef.current = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000)
  }

  const confirmAnswer = () => {
    if (selectedAnswer === null) return
    setConfirmed(true)
  }

  const finishExam = (finalAnswers) => {
    stopTimer()
    const correct = finalAnswers.filter((a, i) => preparedQuestions[i] && a === preparedQuestions[i].correct).length
    const pct = Math.round((correct / preparedQuestions.length) * 100)
    const passed = pct >= activeExam.passingScore
    setExamResult({ correct, total: preparedQuestions.length, pct, passed })
    if (passed && !completedExams.includes(activeExam.id)) {
      if (effectiveTrack === 'rescue') {
        updateUser({ completedRescueExams: [...completedRescueExams, activeExam.id], xp: (user?.xp || 0) + 100 })
      } else {
        updateUser({ completedExams: [...completedMedicalExams, activeExam.id], xp: (user?.xp || 0) + 100 })
      }
    }
  }

  const nextQuestion = () => {
    const newAnswers = [...answers, selectedAnswer]
    setAnswers(newAnswers)
    if (currentQ + 1 >= preparedQuestions.length) {
      finishExam(newAnswers)
    } else {
      setCurrentQ(currentQ + 1)
      setSelectedAnswer(null)
      setConfirmed(false)
    }
  }

  const finishOnboarding = () => {
    if (effectiveTrack === 'rescue') {
      updateUser({
        onboardingComplete: true,
        careerTrack: user?.careerTrack || 'rescue',
        rescueCertified: true,
        rescueLevel: user?.rescueLevel || 'rettungssanitaeter',
        pendingRescueOnboarding: false,
        profession: user?.medicalLicense ? 'dual' : 'rettungssanitaeter',
        showDailyLoginIntro: true,
      })
    } else {
      updateUser({
        onboardingComplete: true,
        medicalLicense: true,
        pendingMedicalOnboarding: false,
        careerTrack: user?.careerTrack || 'medical',
        profession: user?.rescueCertified ? 'dual' : 'assistenzarzt',
        showDailyLoginIntro: true,
      })
    }
    resetTutorialFlags()
    navigate(effectiveTrack === 'rescue' ? '/rescue-station-choice' : '/hospital-choice')
  }

  const timerColor = timeLeft < 30 ? 'text-red-600' : timeLeft < 60 ? 'text-amber-600' : 'text-surface-600'

  if (!effectiveTrack) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">Wähle deinen Einstieg</h1>
          <p className="text-surface-500">Du kannst als Rettungssanitäter starten oder direkt den medizinischen Studienpfad wählen.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <button
            onClick={() => setSelectedTrack('rescue')}
            className="card p-6 text-left hover:border-orange-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
              <Ambulance className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-semibold text-surface-900 mb-1">Rettungssanitäter</h2>
            <p className="text-sm text-surface-600">3 RD-Quizze auf Rettungsdienst-Niveau, danach Dienst im Rettungsdienst möglich.</p>
          </button>
          <button
            onClick={() => setSelectedTrack('medical')}
            className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-semibold text-surface-900 mb-1">Assistenzarzt</h2>
            <p className="text-sm text-surface-600">
              Einstieg in den klinischen Alltag wie nach dem Studium: drei kurze Pflichttests aus Medizinbasics, dann wählst du ein Krankenhaus und arbeitest am echten Patientenfluss mit – Triage, Station, Akutversorgung.
            </p>
          </button>
        </div>
      </div>
    )
  }

  if (activeExam && examResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card overflow-hidden">
          <div className={`p-8 text-center ${examResult.passed ? 'bg-gradient-to-br from-accent-500 to-accent-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              {examResult.passed ? <ShieldCheck className="w-10 h-10" /> : <X className="w-10 h-10" />}
            </div>
            <h2 className="font-display text-3xl font-bold mb-1">{examResult.passed ? 'Bestanden!' : 'Nicht bestanden'}</h2>
            <p className="text-white/80">{activeExam.name}</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">{examResult.pct}%</p><p className="text-sm text-surface-500">Ergebnis</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">{examResult.correct}/{examResult.total}</p><p className="text-sm text-surface-500">Richtig</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-surface-900">{activeExam.passingScore}%</p><p className="text-sm text-surface-500">Bestehensgrenze</p></div>
            </div>
            {examResult.passed ? (
              <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-accent-600 shrink-0" />
                <div><p className="font-medium text-accent-800">Prüfung bestanden! +100 EP</p><p className="text-sm text-accent-700">{activeExam.name} erfolgreich abgelegt.</p></div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <div><p className="font-medium text-red-800">Leider nicht bestanden</p><p className="text-sm text-red-700">Du benötigst mindestens {activeExam.passingScore}%. Die Fragen und Antworten werden bei jedem Versuch neu gemischt.</p></div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setActiveExam(null); setExamResult(null) }} className="btn-secondary flex-1"><ArrowLeft className="w-4 h-4" /> Übersicht</button>
              {!examResult.passed && <button onClick={() => startExam(activeExam)} className="btn-primary flex-1"><RotateCcw className="w-4 h-4" /> Erneut versuchen</button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeExam && preparedQuestions.length > 0) {
    const question = preparedQuestions[currentQ]
    const progress = (currentQ / preparedQuestions.length) * 100

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { stopTimer(); setActiveExam(null) }} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Abbrechen
          </button>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${timerColor}`}>
              <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
            </div>
            <span className="text-sm font-medium text-surface-500">Frage {currentQ + 1}/{preparedQuestions.length}</span>
          </div>
        </div>
        <div className="h-2 bg-surface-100 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeExam.color} flex items-center justify-center`}><ClipboardList className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs text-surface-500 uppercase tracking-wider">{activeExam.name}</p><p className="text-sm font-medium text-surface-700">Frage {currentQ + 1}</p></div>
          </div>
          <h2 className="text-lg font-semibold text-surface-900 mb-6">{question.q}</h2>
          <div className="space-y-3 mb-8">
            {question.options.map((opt, i) => {
              const isSelected = selectedAnswer === i
              const isCorrect = i === question.correct
              let style = 'border-surface-200 hover:border-surface-300'
              if (confirmed) {
                if (isCorrect) style = 'border-accent-500 bg-accent-50'
                else if (isSelected && !isCorrect) style = 'border-red-500 bg-red-50'
              } else if (isSelected) style = 'border-primary-500 bg-primary-50'
              return (
                <button key={i} onClick={() => !confirmed && setSelectedAnswer(i)} disabled={confirmed}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${style}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      confirmed && isCorrect ? 'bg-accent-500 text-white' :
                      confirmed && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                      isSelected ? 'bg-primary-500 text-white' : 'bg-surface-100 text-surface-600'
                    }`}>{confirmed && isCorrect ? <Check className="w-4 h-4" /> : confirmed && isSelected && !isCorrect ? <X className="w-4 h-4" /> : String.fromCharCode(65 + i)}</div>
                    <span className={`font-medium ${confirmed && isCorrect ? 'text-accent-700' : confirmed && isSelected && !isCorrect ? 'text-red-700' : isSelected ? 'text-primary-700' : 'text-surface-700'}`}>{opt}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {!confirmed ? (
            <button onClick={confirmAnswer} disabled={selectedAnswer === null} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">Antwort bestätigen</button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary w-full">{currentQ + 1 >= preparedQuestions.length ? 'Ergebnis anzeigen' : 'Nächste Frage'} <ArrowRight className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!forcedTrack && (
        <div className="mb-6">
          <button
            onClick={() => setSelectedTrack(null)}
            className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zur Einstiegsauswahl
          </button>
        </div>
      )}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4"><GraduationCap className="w-8 h-8 text-white" /></div>
        <h1 className="font-display text-3xl font-bold text-surface-900 mb-2">Willkommen, {user?.name}!</h1>
        <p className="text-surface-500 text-lg max-w-xl mx-auto">
          {effectiveTrack === 'rescue'
            ? 'Bevor du im Rettungsdienst in den Dienst gehst, musst du die Pflichtprüfungen ablegen. Fragen und Antworten werden pro Versuch zufällig gemischt.'
            : 'Damit der Einstieg im Klinikalltag stimmig ist, legst du zuerst drei kompakte Pflichtchecks zu Grundlagen ab. Die Fragen werden jedes Mal neu gemischt – wie in einer kurzen Vorbereitung vor dem Stationsbeginn.'}
        </p>
      </div>

      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-surface-900">{effectiveTrack === 'rescue' ? 'Fortschritt zur RD-Zulassung' : 'Fortschritt zur Approbation'}</h2>
          <span className="text-sm font-medium text-primary-600">{completedExams.filter(id => requiredExamIds.includes(id)).length} / {requiredExamIds.length} Pflichtprüfungen</span>
        </div>
        <div className="h-3 bg-surface-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${(completedExams.filter(id => requiredExamIds.includes(id)).length / Math.max(1, requiredExamIds.length)) * 100}%` }} />
        </div>
        {allRequiredDone && (
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-accent-600" /><div><p className="font-medium text-accent-800">Alle Pflichtprüfungen bestanden!</p><p className="text-sm text-accent-700">{effectiveTrack === 'rescue' ? 'Du kannst jetzt deine Rettungswache auswählen und in den Dienst starten.' : 'Du kannst jetzt einem Krankenhaus beitreten oder ein eigenes gründen.'}</p></div></div>
            <button onClick={finishOnboarding} className="btn-accent">Weiter <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold text-surface-900 mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Pflichtprüfungen</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {examsPool.filter(e => e.required).map(exam => {
          const Icon = iconMap[exam.icon] || BookOpen
          const passed = completedExams.includes(exam.id)
          const totalTime = getTimerSeconds(exam.difficulty || 'anfaenger', exam.questionsPerAttempt || 10)
          return (
            <div key={exam.id} className={`card overflow-hidden ${passed ? 'ring-2 ring-accent-400' : ''}`}>
              <div className={`h-1.5 bg-gradient-to-r ${exam.color}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${exam.color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
                  {passed && <span className="flex items-center gap-1 text-xs font-medium text-accent-600 bg-accent-50 px-2 py-1 rounded-full"><Check className="w-3 h-3" /> Bestanden</span>}
                </div>
                <h3 className="font-semibold text-surface-900 mb-1">{exam.name}</h3>
                <p className="text-sm text-surface-500 mb-3">{exam.description}</p>
                <div className="text-xs text-surface-400 mb-3">
                  {exam.questionsPerAttempt || 10} Fragen pro Versuch &bull; {exam.passingScore}% &bull; <Clock className="w-3 h-3 inline" /> {formatTime(totalTime)}
                </div>
                <button onClick={() => startExam(exam)} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${passed ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                  {passed ? 'Wiederholen' : 'Prüfung starten'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {examsPool.some(e => !e.required) && (
        <>
          <h2 className="text-xl font-semibold text-surface-900 mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-purple-500" /> Optionale Fachprüfungen</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {examsPool.filter(e => !e.required).map(exam => {
              const Icon = iconMap[exam.icon] || BookOpen
              const passed = completedExams.includes(exam.id)
              return (
                <div key={exam.id} className={`card overflow-hidden ${passed ? 'ring-2 ring-accent-400' : ''}`}>
                  <div className={`h-1.5 bg-gradient-to-r ${exam.color}`} />
                  <div className="p-5 flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${exam.color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-surface-900">{exam.name}</h3>
                      <p className="text-sm text-surface-500 truncate">{exam.description}</p>
                      <p className="text-xs text-surface-400 mt-1">{exam.questionsPerAttempt || 8} Fragen pro Versuch &bull; <Clock className="w-3 h-3 inline" /> {formatTime(getTimerSeconds(exam.difficulty, exam.questionsPerAttempt || 8))}</p>
                    </div>
                    <button onClick={() => startExam(exam)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${passed ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>{passed ? 'Wiederholen' : 'Ablegen'}</button>
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
