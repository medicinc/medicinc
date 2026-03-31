export function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function selectQuestions(pool, count) {
  return shuffleArray(pool).slice(0, Math.min(count, pool.length))
}

export function prepareQuestion(question) {
  const correctAnswer = question.options[question.correct]
  let optionsToUse = [...question.options]

  if (question.extraDistractors?.length) {
    const wrongOptions = question.options.filter((_, i) => i !== question.correct)
    const extras = shuffleArray(question.extraDistractors)
    const numToSwap = Math.min(extras.length, Math.floor(Math.random() * 2) + 1)
    const wrongIndices = shuffleArray(wrongOptions.map((_, i) => i)).slice(0, numToSwap)

    let extraIdx = 0
    optionsToUse = question.options.map((opt, i) => {
      if (i === question.correct) return opt
      const wrongPos = wrongOptions.indexOf(opt)
      if (wrongIndices.includes(wrongPos) && extraIdx < numToSwap) {
        return extras[extraIdx++]
      }
      return opt
    })
  }

  const shuffledOptions = shuffleArray(optionsToUse)
  const newCorrectIndex = shuffledOptions.indexOf(correctAnswer)
  return { ...question, options: shuffledOptions, correct: newCorrectIndex }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getTimerSeconds(difficulty, questionCount) {
  const normalized = difficulty === 'schwer' ? 'fortgeschritten' : difficulty
  const perQuestion = {
    'anfaenger': 45,
    'mittel': 35,
    'fortgeschritten': 28,
    'experte': 20,
  }
  return (perQuestion[normalized] || 35) * questionCount
}
