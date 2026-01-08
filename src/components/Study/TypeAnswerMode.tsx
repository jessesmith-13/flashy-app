import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { ChevronRight, Check, X, Star, EyeOff, Volume2 } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import { UICard } from '@/types/decks'
import { toast } from 'sonner'
import * as api from '../../../utils/api'
import { speak } from '../../../utils/textToSpeech'

interface TypeAnswerModeProps {
  cards: UICard[]
  onNext: (wasCorrect?: boolean) => void
  currentIndex: number
  isLastCard: boolean
  isTemporaryStudy?: boolean
  frontLanguage?: string
}

export function TypeAnswerMode({ cards, onNext, currentIndex, isTemporaryStudy = false, frontLanguage }: TypeAnswerModeProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const { updateCard, accessToken, selectedDeckId, cards: storeCards, ttsProvider } = useStore()
  
  // Get current card from store to ensure we have the latest state
  const currentCard = storeCards.find(c => c.id === cards[currentIndex]?.id) || cards[currentIndex]

  useEffect(() => {
    setUserAnswer('')
    setHasAnswered(false)
    setIsCorrect(false)
  }, [currentIndex])

  const handleSpeak = (text: string | null) => {
    if (!text) return
    const result = speak({
      text,
      language: frontLanguage,
      provider: ttsProvider,
      accessToken: accessToken || undefined,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false)
        toast.error('Failed to speak text')
      }
    })

    if (result instanceof Promise) {
      result.then(res => {
        if (!res.success && res.error) {
          toast.error(res.error)
        }
      })
    } else {
      if (!result.success && result.error) {
        toast.error(result.error)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userAnswer.trim() || hasAnswered || !currentCard.back) return

    // Case-insensitive comparison, trimming whitespace
    const normalizedAnswer = userAnswer.trim().toLowerCase()
    const normalizedCorrectAnswer = currentCard.back.trim().toLowerCase()
    
    // Check if answer matches the main answer
    let correct = normalizedAnswer === normalizedCorrectAnswer
    
    // Also check against accepted alternatives if they exist
    if (!correct && currentCard.acceptedAnswers && currentCard.acceptedAnswers.length > 0) {
      correct = currentCard.acceptedAnswers.some(
        acceptedAnswer => normalizedAnswer === acceptedAnswer.trim().toLowerCase()
      )
    }
    
    setIsCorrect(correct)
    setHasAnswered(true)
  }

  const handleNext = () => {
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

    const newIgnoredValue = !currentCard.isIgnored

    // Optimistically update the UI immediately
    updateCard(currentCard.id, { isIgnored: newIgnoredValue })

    try {
      await api.updateCard(accessToken, selectedDeckId, currentCard.id, { isIgnored: newIgnoredValue })
      toast.success(newIgnoredValue ? 'Card ignored - will be excluded from future study sessions' : 'Card unignored')
    } catch (error) {
      // Revert on error
      updateCard(currentCard.id, { isIgnored: !newIgnoredValue })
      console.error('Failed to toggle ignored:', error)
      toast.error('Failed to update ignored status')
    }
  }

  if (!currentCard) return null

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
              variant={currentCard.isIgnored ? "default" : "outline"}
              size="sm"
              onClick={handleToggleIgnored}
              className={`gap-1.5 transition-all ${
                currentCard.isIgnored 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600' 
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-600 hover:text-gray-700'
              }`}
              title={currentCard.isIgnored ? 'Unignore card' : 'Ignore card (exclude from study)'}
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">{currentCard.isIgnored ? 'Ignored' : 'Ignore'}</span>
            </Button>
          </div>
        )}

        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8 md:p-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide text-center">
              Type to Answer
            </div>
            {currentCard.front && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSpeak(currentCard.front)}
                className="gap-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                title="Read question aloud"
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-purple-600 animate-pulse' : 'text-gray-500'}`} />
              </Button>
            )}
          </div>
          <p className="text-2xl md:text-3xl text-center mb-6 sm:mb-8 md:mb-12 max-w-2xl mx-auto text-gray-900 dark:text-gray-100">{currentCard.front}</p>

          {currentCard.frontImageUrl && (
            <div className="mb-6 rounded-lg overflow-hidden border max-w-2xl mx-auto">
              <img 
                src={currentCard.frontImageUrl} 
                alt="Question" 
                className="w-full h-auto object-contain bg-gray-50 dark:bg-gray-900"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}
          
          {currentCard.frontAudio && (
            <div className="mb-6 w-full max-w-md mx-auto">
              <audio controls className="w-full">
                <source src={currentCard.frontAudio} type="audio/wav" />
                <source src={currentCard.frontAudio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={hasAnswered}
                className={`text-lg p-6 text-center ${
                  hasAnswered
                    ? isCorrect
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : ''
                }`}
                autoFocus
              />
            </div>

            {!hasAnswered ? (
              <Button
                type="submit"
                size="lg"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!userAnswer.trim()}
              >
                Check Answer
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                      <p className="text-sm">Your answer: <strong>{userAnswer}</strong></p>
                      <p className="text-sm mt-1">Correct answer: <strong>{currentCard.back}</strong></p>
                      {currentCard.acceptedAnswers && currentCard.acceptedAnswers.length > 0 && (
                        <p className="text-sm mt-1">Also accepted: <strong>{currentCard.acceptedAnswers.join(', ')}</strong></p>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Next Question
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </form>

          {!hasAnswered && (
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              Press Enter to submit
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}