import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '../../ui/button'
import { ChevronRight, Check, X, Star, EyeOff } from 'lucide-react'
import { Card, useStore } from '../../../store/useStore'
import { toast } from 'sonner'
import * as api from '../../../utils/api'

interface MultipleChoiceModeProps {
  cards: Card[]
  onNext: (wasCorrect?: boolean) => void
  currentIndex: number
  isLastCard: boolean
  isTemporaryStudy?: boolean
}

export function MultipleChoiceMode({ cards, onNext, currentIndex, isTemporaryStudy = false }: MultipleChoiceModeProps) {
  const [options, setOptions] = useState<string[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)

  const { updateCard, accessToken, selectedDeckId, cards: storeCards } = useStore()
  
  // Get current card from store to ensure we have the latest state
  const currentCard = storeCards.find(c => c.id === cards[currentIndex]?.id) || cards[currentIndex]
  const correctAnswers = currentCard?.correctAnswers || [currentCard?.back]
  const hasMultipleCorrect = correctAnswers.length > 1

  useEffect(() => {
    if (currentCard) {
      generateOptions()
      setSelectedAnswers([])
      setHasAnswered(false)
    }
  }, [currentIndex, currentCard])

  const generateOptions = () => {
    if (!currentCard) return

    // Support multiple correct answers
    const correctAnswers = currentCard.correctAnswers || [currentCard.back]
    
    // Use the card's predefined options if available
    let wrongAnswers: string[] = []
    if (currentCard.options && currentCard.options.length > 0) {
      wrongAnswers = currentCard.options
    } else {
      // Fallback: generate options from other cards if no predefined options
      wrongAnswers = cards
        .filter(c => c.id !== currentCard.id && !correctAnswers.includes(c.back))
        .map(c => c.back)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
    }

    const allOptions = [...correctAnswers, ...wrongAnswers].sort(() => Math.random() - 0.5)
    setOptions(allOptions)
  }

  const handleSelectAnswer = (answer: string) => {
    if (hasAnswered) return
    
    if (hasMultipleCorrect) {
      // Allow multiple selection
      if (selectedAnswers.includes(answer)) {
        setSelectedAnswers(selectedAnswers.filter(a => a !== answer))
      } else {
        setSelectedAnswers([...selectedAnswers, answer])
      }
    } else {
      // Single selection (existing behavior)
      setSelectedAnswers([answer])
      setHasAnswered(true)
    }
  }
  
  const handleSubmit = () => {
    if (hasMultipleCorrect && !hasAnswered) {
      setHasAnswered(true)
    }
  }

  const handleNext = () => {
    const correctAnswersSet = new Set(correctAnswers)
    const selectedAnswersSet = new Set(selectedAnswers)
    
    // Check if all correct answers are selected and no incorrect answers are selected
    const isCorrect = 
      correctAnswersSet.size === selectedAnswersSet.size &&
      [...correctAnswersSet].every(ans => selectedAnswersSet.has(ans))
    
    onNext(isCorrect)
  }

  const handleToggleFavorite = async () => {
    if (!accessToken || !selectedDeckId) return

    const newFavoriteValue = !currentCard.favorite

    // Optimistically update the UI immediately
    updateCard(currentCard.id, { favorite: newFavoriteValue })

    try {
      await api.updateCard(accessToken, selectedDeckId, currentCard.id, { favorite: newFavoriteValue })
      toast.success(newFavoriteValue ? 'Added to favorites' : 'Removed from favorites')
    } catch (error) {
      // Revert on error
      updateCard(currentCard.id, { favorite: !newFavoriteValue })
      console.error('Failed to toggle favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  const handleToggleIgnored = async () => {
    if (!accessToken || !selectedDeckId) return

    const newIgnoredValue = !currentCard.ignored

    // Optimistically update the UI immediately
    updateCard(currentCard.id, { ignored: newIgnoredValue })

    try {
      await api.updateCard(accessToken, selectedDeckId, currentCard.id, { ignored: newIgnoredValue })
      toast.success(newIgnoredValue ? 'Card ignored - will be excluded from future study sessions' : 'Card unignored')
    } catch (error) {
      // Revert on error
      updateCard(currentCard.id, { ignored: !newIgnoredValue })
      console.error('Failed to toggle ignored:', error)
      toast.error('Failed to update ignored status')
    }
  }

  if (!currentCard) return null

  const correctAnswersSet = new Set(correctAnswers)
  const selectedAnswersSet = new Set(selectedAnswers)
  const isCorrect = 
    correctAnswersSet.size === selectedAnswersSet.size &&
    [...correctAnswersSet].every(ans => selectedAnswersSet.has(ans))

  return (
    <div className="flex items-center justify-center p-2 sm:p-4 lg:p-8" style={{ minHeight: 'calc(100vh - 280px)' }}>
      <div className="w-full max-w-3xl">
        {/* Quick Actions - Only show for personal decks */}
        {!isTemporaryStudy && (
          <div className="flex items-center justify-end gap-2 mb-3">
            <Button
              variant={currentCard.favorite ? "default" : "outline"}
              size="sm"
              onClick={handleToggleFavorite}
              className={`gap-1.5 transition-all ${
                currentCard.favorite 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-yellow-500 hover:text-yellow-600'
              }`}
              title={currentCard.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${currentCard.favorite ? 'fill-current' : ''}`} />
              <span className="text-xs">{currentCard.favorite ? 'Favorited' : 'Favorite'}</span>
            </Button>
            <Button
              variant={currentCard.ignored ? "default" : "outline"}
              size="sm"
              onClick={handleToggleIgnored}
              className={`gap-1.5 transition-all ${
                currentCard.ignored 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600' 
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-600 hover:text-gray-700'
              }`}
              title={currentCard.ignored ? 'Unignore card' : 'Ignore card (exclude from study)'}
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">{currentCard.ignored ? 'Ignored' : 'Ignore'}</span>
            </Button>
          </div>
        )}

        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8 md:p-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-4 sm:mb-6 uppercase tracking-wide text-center">
            Multiple Choice {hasMultipleCorrect && `(Select ${correctAnswers.length})`}
          </div>
          <p className="text-2xl md:text-3xl text-center mb-6 sm:mb-8 md:mb-12 max-w-2xl mx-auto text-gray-900 dark:text-gray-100">{currentCard.front}</p>
          
          {hasMultipleCorrect && !hasAnswered && (
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
              Select all correct answers ({correctAnswers.length} correct)
            </p>
          )}

          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedAnswers.includes(option)
              const isCorrectOption = correctAnswersSet.has(option)
              
              let buttonClass = 'border-2 transition-all'
              if (!hasAnswered) {
                buttonClass += ' border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              } else if (isCorrectOption) {
                buttonClass += ' border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              } else if (isSelected && !isCorrectOption) {
                buttonClass += ' border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
              } else {
                buttonClass += ' border-gray-200 dark:border-gray-700 opacity-50'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={hasAnswered}
                  className={`w-full p-4 rounded-xl text-left ${buttonClass} flex items-center justify-between group`}
                >
                  <span className="text-lg text-gray-900 dark:text-gray-100">{option}</span>
                  {hasAnswered && isCorrectOption && (
                    <Check className="w-6 h-6 text-emerald-600" />
                  )}
                  {hasAnswered && isSelected && !isCorrectOption && (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Submit button for multiple correct answers */}
          {hasMultipleCorrect && !hasAnswered && selectedAnswers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 sm:mt-6"
            >
              <Button
                size="lg"
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit Answer
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 sm:mt-6"
            >
              <div className={`p-4 rounded-xl text-center mb-4 sm:mb-6 ${
                isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}>
                {isCorrect ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>Correct!</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <X className="w-5 h-5" />
                      <span>Incorrect</span>
                    </div>
                    <p className="text-sm">
                      The correct {correctAnswers.length > 1 ? 'answers are' : 'answer is'}: <strong>{correctAnswers.join(', ')}</strong>
                    </p>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                onClick={handleNext}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next Question
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
