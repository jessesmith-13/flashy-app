import { useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '../../ui/button'
import { ChevronLeft, ChevronRight, X, Check, Star, EyeOff, Volume2, Music } from 'lucide-react'
import { Card, useStore } from '../../../store/useStore'
import { toast } from 'sonner'
import * as api from '../../../utils/api'
import { speak, stopSpeaking } from '../../../utils/textToSpeech'

interface ClassicFlipModeProps {
  cards: Card[]
  onNext: (wasCorrect?: boolean) => void
  onPrevious: () => void
  currentIndex: number
  isLastCard: boolean
  isTemporaryStudy?: boolean
  frontLanguage?: string
  backLanguage?: string
}

export function ClassicFlipMode({ cards, onNext, onPrevious, currentIndex, isLastCard, isTemporaryStudy = false, frontLanguage, backLanguage }: ClassicFlipModeProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const { updateCard, accessToken, selectedDeckId, cards: storeCards, ttsProvider } = useStore()
  
  // Get current card from store to ensure we have the latest state
  const currentCard = storeCards.find(c => c.id === cards[currentIndex]?.id) || cards[currentIndex]

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleSpeak = (text: string, language: string | undefined, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation() // Prevent card flip when clicking speaker button
    }

    const result = speak({
      text,
      language,
      provider: ttsProvider,
      accessToken: accessToken || undefined,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false)
        toast.error('Failed to speak text')
      }
    })

    if (!result.success && result.error) {
      toast.error(result.error)
    }
  }

  const handleRating = (correct: boolean) => {
    onNext(correct)
    setIsFlipped(false)
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const handleToggleIgnored = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

        <div className="perspective-1000">
          <motion.div
            className="relative w-full cursor-pointer"
            style={{ 
              minHeight: '400px',
              transformStyle: 'preserve-3d'
            }}
            onClick={handleFlip}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Front */}
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8 md:p-12 flex flex-col items-center justify-start min-h-[400px] backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                position: isFlipped ? 'absolute' : 'relative',
                inset: isFlipped ? 0 : 'auto',
                width: '100%',
              }}
            >
              <div className="w-full flex items-center justify-between mb-6">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Question</div>
                {currentCard.front && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleSpeak(currentCard.front, frontLanguage, e)}
                    className="gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    title="Read question aloud"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-600 animate-pulse' : 'text-gray-500'}`} />
                  </Button>
                )}
              </div>
              {currentCard.front && <p className="text-2xl md:text-3xl text-center max-w-2xl text-gray-900 dark:text-gray-100 mb-4">{currentCard.front}</p>}
              {currentCard.frontImageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border max-w-2xl w-full mx-auto">
                  <img 
                    src={currentCard.frontImageUrl} 
                    alt="Question" 
                    className="w-full h-auto object-contain bg-gray-50 dark:bg-gray-900"
                    style={{ maxHeight: '500px' }}
                  />
                </div>
              )}
              {currentCard.frontAudio && (
                <div className="mt-4 w-full max-w-md">
                  <audio controls className="w-full" onClick={(e) => e.stopPropagation()}>
                    <source src={currentCard.frontAudio} type="audio/wav" />
                    <source src={currentCard.frontAudio} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">Click to flip</div>
            </div>

            {/* Back */}
            <div
              className="bg-emerald-600 dark:bg-emerald-700 text-white rounded-2xl shadow-2xl p-4 sm:p-8 md:p-12 flex flex-col items-center justify-start min-h-[400px] backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                position: isFlipped ? 'relative' : 'absolute',
                inset: isFlipped ? 'auto' : 0,
                width: '100%',
              }}
            >
              <div className="w-full flex items-center justify-between mb-6">
                <div className="text-xs text-emerald-200 dark:text-emerald-300 uppercase tracking-wide">Answer</div>
                {currentCard.back && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleSpeak(currentCard.back, backLanguage, e)}
                    className="gap-1.5 hover:bg-emerald-500/20"
                    title="Read answer aloud"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-white animate-pulse' : 'text-emerald-200'}`} />
                  </Button>
                )}
              </div>
              {currentCard.back && <p className="text-2xl md:text-3xl text-center max-w-2xl mb-4">{currentCard.back}</p>}
              {currentCard.backImageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border border-emerald-400 max-w-2xl w-full mx-auto">
                  <img 
                    src={currentCard.backImageUrl} 
                    alt="Answer" 
                    className="w-full h-auto object-contain bg-white/10"
                    style={{ maxHeight: '500px' }}
                  />
                </div>
              )}
              {currentCard.backAudio && (
                <div className="mt-4 w-full max-w-md">
                  <audio controls className="w-full" onClick={(e) => e.stopPropagation()}>
                    <source src={currentCard.backAudio} type="audio/wav" />
                    <source src={currentCard.backAudio} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <div className="mt-6 text-sm text-emerald-200 dark:text-emerald-300">Rate your answer below</div>
            </div>
          </motion.div>
        </div>

        {/* Navigation and Rating */}
        {!isFlipped ? (
          <div className="flex items-center justify-between mt-4 sm:mt-6 gap-3 sm:gap-4 max-w-md mx-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setIsFlipped(true)
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Reveal Answer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4 mt-4 sm:mt-6 max-w-md mx-auto">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Did you get it right?</p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleRating(false)}
                className="flex-1 border-red-300 hover:bg-red-50 hover:border-red-400"
              >
                <X className="w-5 h-5 mr-2 text-red-600" />
                Wrong
              </Button>
              <Button
                size="lg"
                onClick={() => handleRating(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-5 h-5 mr-2" />
                Correct
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}