export function normalizeMultipleChoice(
  options: string[],
  correctIndices: number[]
): {
  correctAnswers: string[]
  incorrectAnswers: string[]
  back: string
} {
  const filledOptions = options.map(o => o.trim()).filter(Boolean)

  const correctAnswers = correctIndices.map(idx => filledOptions[idx])

  const incorrectAnswers = filledOptions.filter(
    (_, idx) => !correctIndices.includes(idx)
  )

  if (!correctAnswers.length) {
    throw new Error('At least one correct answer is required')
  }

  return {
    correctAnswers,
    incorrectAnswers,
    back: correctAnswers[0], // legacy compatibility
  }
}