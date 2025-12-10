import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '../../ui/button'
import { X, Check, RotateCcw, Pause, Play } from 'lucide-react'
import { Card } from '../../../store/useStore'

interface MarathonModeProps {
  cards: Card[]
  onExit: () => void
}

export function MarathonMode({ cards, onExit }: MarathonModeProps) {
  const [shuffledCards, setShuffledCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [totalSeen, setTotalSeen] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    reshuffleCards()
  }, [])

  const reshuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled)
    setCurrentIndex(0)
  }

  const currentCard = shuffledCards[currentIndex]

  const handleFlip = () => {
    if (!isPaused) {
      setIsFlipped(!isFlipped)
    }
  }

  const handleRating = (correct: boolean) => {
    if (correct) {
      setCorrectCount(prev => prev + 1)
    } else {
      setWrongCount(prev => prev + 1)
    }
    setTotalSeen(prev => prev + 1)

    // Move to next card
    const nextIndex = (currentIndex + 1) % shuffledCards.length
    
    // If we've completed a full cycle, reshuffle
    if (nextIndex === 0) {
      reshuffleCards()
    } else {
      setCurrentIndex(nextIndex)
    }
    
    setIsFlipped(false)
  }

  const handleReset = () => {
    setCorrectCount(0)
    setWrongCount(0)
    setTotalSeen(0)
    reshuffleCards()
    setIsFlipped(false)
    setIsPaused(false)
  }

  if (!currentCard) return null

  const accuracy = totalSeen > 0 ? Math.round((correctCount / totalSeen) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Stats Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} title="Reset">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-600">Marathon Mode</div>
            <Button variant="ghost" onClick={onExit}>
              Exit
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl text-emerald-600">{correctCount}</div>
              <div className="text-xs text-gray-600">Correct</div>
            </div>
            <div>
              <div className="text-2xl text-gray-900">{totalSeen}</div>
              <div className="text-xs text-gray-600">Total Reviewed</div>
            </div>
            <div>
              <div className="text-2xl text-red-600">{wrongCount}</div>
              <div className="text-xs text-gray-600">Wrong</div>
            </div>
          </div>

          {totalSeen > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Accuracy</span>
                <span>{accuracy}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Area */}
      {isPaused ? (
        <div className="flex items-center justify-center p-4 lg:p-8" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
            <Pause className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl mb-2">Paused</p>
            <p className="text-sm text-gray-600 mb-6">Take a break, you're doing great!</p>
            <Button
              onClick={() => setIsPaused(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Resume
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-4 lg:p-8" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="w-full max-w-3xl">
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
                  className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="text-xs text-indigo-600 mb-6 uppercase tracking-wide">Question</div>
                  <p className="text-2xl md:text-3xl text-center max-w-2xl">{currentCard.front}</p>
                  <div className="absolute bottom-8 text-sm text-gray-400">Click to flip</div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 bg-indigo-600 text-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="text-xs text-indigo-200 mb-6 uppercase tracking-wide">Answer</div>
                  <p className="text-2xl md:text-3xl text-center max-w-2xl">{currentCard.back}</p>
                  <div className="absolute bottom-8 text-sm text-indigo-200">Rate your answer below</div>
                </div>
              </motion.div>
            </div>

            {/* Rating */}
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 mt-8 max-w-md mx-auto"
              >
                <p className="text-center text-sm text-gray-600">Did you get it right?</p>
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
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Correct
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
