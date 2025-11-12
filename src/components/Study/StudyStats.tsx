import { Button } from '../../ui/button'
import { ArrowLeft, RotateCcw } from 'lucide-react'

interface StudyStatsProps {
  correctAnswers: number
  wrongAnswers: number
  cardsStudied: number
  isTemporaryStudy: boolean
  studyAllCards: boolean
  onRestart: () => void
  onBack: () => void
  onViewDeckDetails?: () => void
}

export function StudyStats({
  correctAnswers,
  wrongAnswers,
  cardsStudied,
  isTemporaryStudy,
  studyAllCards,
  onRestart,
  onBack,
  onViewDeckDetails
}: StudyStatsProps) {
  const totalAnswered = correctAnswers + wrongAnswers
  const score = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
          <div className="text-6xl mb-6">
            {score >= 90 ? '🎉' : score >= 70 ? '👏' : score >= 50 ? '👍' : '📚'}
          </div>
          <h2 className="text-3xl mb-4 text-gray-900 dark:text-gray-100">Study Session Complete!</h2>
          {isTemporaryStudy && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Preview session - Stats not saved
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
              <div className="text-4xl mb-2">✓</div>
              <div className="text-3xl text-emerald-600 dark:text-emerald-400">{correctAnswers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
              <div className="text-4xl mb-2">✗</div>
              <div className="text-3xl text-red-600 dark:text-red-400">{wrongAnswers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Wrong</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
              <div className="text-4xl mb-2">%</div>
              <div className="text-3xl text-blue-600 dark:text-blue-400">{score}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
            </div>
          </div>

          <div className="text-gray-600 dark:text-gray-400 mb-8">
            <p className="text-lg mb-2">Cards Studied: {cardsStudied}</p>
            {totalAnswered > 0 && (
              <p className="text-sm">
                You got {correctAnswers} out of {totalAnswered} questions correct!
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onRestart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Study Again
            </Button>
            {isTemporaryStudy && onViewDeckDetails && (
              <Button
                onClick={onViewDeckDetails}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                View Deck Details
              </Button>
            )}
            <Button
              onClick={onBack}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isTemporaryStudy ? 'Back to Community' : (studyAllCards ? 'Back to All Cards' : 'Back to Deck')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
