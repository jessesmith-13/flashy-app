import { Deck } from '../../types/decks'
import { Button } from '../../ui/button'
import { ArrowLeft, RotateCcw, StopCircle } from 'lucide-react'

interface StudyHeaderProps {
  deck: Deck
  studyAllCards: boolean
  isTemporaryStudy: boolean
  continuousShuffle: boolean
  currentIndex: number
  sessionCardsLength: number
  timedMode: boolean
  timeLeft: number
  correctAnswers: number
  wrongAnswers: number
  onBack: () => void
  onRestart: () => void
  onStop: () => void
  onViewDeckDetails?: () => void
}

export function StudyHeader({
  deck,
  studyAllCards,
  isTemporaryStudy,
  continuousShuffle,
  currentIndex,
  sessionCardsLength,
  timedMode,
  timeLeft,
  correctAnswers,
  wrongAnswers,
  onBack,
  onRestart,
  onStop,
  onViewDeckDetails
}: StudyHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">
            {isTemporaryStudy ? 'Back to Community' : (studyAllCards ? 'Back to All Cards' : 'Back to Deck')}
          </span>
        </Button>
        <div className="flex items-center gap-3">
          {studyAllCards ? (
            <>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br from-emerald-500 to-blue-500">
                📚
              </div>
              <span className="hidden sm:inline text-gray-900 dark:text-gray-100">All Cards</span>
            </>
          ) : deck ? (
            <>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: deck.color }}
              >
                {deck.emoji}
              </div>
              <span className="hidden sm:inline text-gray-900 dark:text-gray-100">{deck.name}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isTemporaryStudy && onViewDeckDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDeckDetails}
              className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hidden sm:flex"
            >
              View Deck Details
            </Button>
          )}
          {continuousShuffle && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onStop}
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onRestart} title="Restart">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress and Timer */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>
            {continuousShuffle 
              ? `Card ${currentIndex + 1} • Continuous` 
              : `Card ${currentIndex + 1} of ${sessionCardsLength}`
            }
          </span>
          <div className="flex items-center gap-4">
            {timedMode && (
              <span className={`${timeLeft <= 10 ? 'text-red-600 dark:text-red-400' : ''}`}>
                ⏱️ {timeLeft}s
              </span>
            )}
            <span>
              ✓ {correctAnswers} • ✗ {wrongAnswers}
            </span>
          </div>
        </div>
        {!continuousShuffle && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / sessionCardsLength) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
