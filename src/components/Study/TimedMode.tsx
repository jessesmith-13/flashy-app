import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '../../ui/button'
import { ChevronRight, Clock, X, Check } from 'lucide-react'
import { Card } from '@/types/decks'

interface TimedModeProps {
  cards: Card[]
  onNext: (wasCorrect?: boolean) => void
  currentIndex: number
  isLastCard: boolean
}

const TIME_PER_CARD = 15 // seconds

export function TimedMode({ cards, onNext, currentIndex, isLastCard }: TimedModeProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CARD)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const currentCard = cards[currentIndex]

  useEffect(() => {
    setIsFlipped(false)
    setTimeLeft(TIME_PER_CARD)
    setHasAnswered(false)
    setTimedOut(false)
  }, [currentIndex])

  useEffect(() => {
    if (hasAnswered || timedOut) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimedOut(true)
          setIsFlipped(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [hasAnswered, timedOut])

  const handleFlip = () => {
    if (!hasAnswered && !timedOut) {
      setIsFlipped(!isFlipped)
    }
  }

  const handleRating = (correct: boolean) => {
    setHasAnswered(true)
    setTimeout(() => {
      onNext(correct)
    }, 500)
  }

  if (!currentCard) return null

  const timePercentage = (timeLeft / TIME_PER_CARD) * 100
  const isLowTime = timeLeft <= 5

  return (
    <div className="flex items-center justify-center p-4 lg:p-8" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="w-full max-w-3xl">
        {/* Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Clock className={`w-6 h-6 ${isLowTime ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
            <span className={`text-3xl ${isLowTime ? 'text-red-600' : 'text-orange-600'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-3 rounded-full transition-colors ${
                isLowTime ? 'bg-red-600' : 'bg-orange-600'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${timePercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

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
            whileHover={!hasAnswered && !timedOut ? { scale: 1.02 } : {}}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              <div className="text-xs text-orange-600 mb-6 uppercase tracking-wide">Question</div>
              <p className="text-2xl md:text-3xl text-center max-w-2xl">{currentCard.front}</p>
              {!hasAnswered && !timedOut && (
                <div className="absolute bottom-8 text-sm text-gray-400">Click to reveal answer</div>
              )}
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-orange-600 text-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-xs text-orange-200 mb-6 uppercase tracking-wide">Answer</div>
              <p className="text-2xl md:text-3xl text-center max-w-2xl">{currentCard.back}</p>
              {!hasAnswered && !timedOut && (
                <div className="absolute bottom-8 text-sm text-orange-200">Rate your answer below</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Rating or Time Out Message */}
        {timedOut && !hasAnswered ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 mt-8 max-w-md mx-auto"
          >
            <div className="p-4 rounded-xl text-center bg-red-50 text-red-800">
              <X className="w-6 h-6 mx-auto mb-2" />
              <p>Time's up!</p>
            </div>
            <Button
              size="lg"
              onClick={() => handleRating(false)}
              disabled={isLastCard}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : isFlipped && !hasAnswered ? (
          <div className="flex flex-col gap-4 mt-8 max-w-md mx-auto">
            <p className="text-center text-sm text-gray-600">Did you get it right?</p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleRating(false)}
                disabled={isLastCard}
                className="flex-1 border-red-300 hover:bg-red-50 hover:border-red-400"
              >
                <X className="w-5 h-5 mr-2 text-red-600" />
                Wrong
              </Button>
              <Button
                size="lg"
                onClick={() => handleRating(true)}
                disabled={isLastCard}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Check className="w-5 h-5 mr-2" />
                Correct
              </Button>
            </div>
          </div>
        ) : !isFlipped && !timedOut ? (
          <div className="mt-8 text-center text-sm text-gray-500 max-w-md mx-auto">
            <p>Answer as quickly as you can!</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
