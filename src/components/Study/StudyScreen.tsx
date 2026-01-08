import { useState, useEffect } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { AppLayout } from '../Layout/AppLayout'
import { ClassicFlipMode } from './ClassicFlipMode'
import { MultipleChoiceMode } from './MultipleChoiceMode'
import { TypeAnswerMode } from './TypeAnswerMode'
import { StudyHeader } from './StudyHeader'
import { StudyStats } from './StudyStats'
import { EmptyDeckState } from './EmptyDeckState'

export function StudyScreen() {
  const { selectedDeckId, decks, cards, studyOptions, studyAllCards, userAchievements, setUserAchievements, addStudySession, temporaryStudyDeck, setTemporaryStudyDeck, setReturnToCommunityDeck, setReturnToUserDeck, returnToSharedDeckId, setReturnToSharedDeckId } = useStore()
  const { navigateTo } = useNavigation()
  
  // Check if we're studying a temporary community deck
  const isTemporaryStudy = temporaryStudyDeck !== null
  const deck = isTemporaryStudy ? temporaryStudyDeck.deck : decks.find((d) => d.id === selectedDeckId)
  const deckCards = isTemporaryStudy 
    ? temporaryStudyDeck.cards 
    : (studyAllCards ? cards : cards.filter((c) => c.deckId === selectedDeckId))
  
  const [sessionCards, setSessionCards] = useState<typeof deckCards>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState(0)
  const [cardsStudied, setCardsStudied] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now())
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now())
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [showStats, setShowStats] = useState(false)

  const { timedMode, continuousShuffle, order, excludeIgnored, favoritesOnly } = studyOptions

  useEffect(() => {
    // Filter cards based on study options
    let filteredCards = [...deckCards]
    
    if (excludeIgnored) {
      filteredCards = filteredCards.filter(c => !c.isIgnored)
    }
    
    if (favoritesOnly) {
      filteredCards = filteredCards.filter(c => c.favorite)
    }
    
    // Order cards based on study options
    const orderedCards = [...filteredCards]
    
    if (order === 'randomized') {
      orderedCards.sort(() => Math.random() - 0.5)
    } else {
      // Linear - sort by position
      orderedCards.sort((a, b) => (a.position || 0) - (b.position || 0))
    }
    
    setSessionCards(orderedCards)
    setSessionStartTime(Date.now())
    setCardStartTime(Date.now())
    setTimeLeft(30)
    
    // Check time of day for achievements
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 3 && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        studiedAfterMidnight: true,
      })
    }
    if (hour >= 5 && hour < 8 && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        studiedBeforeEightAM: true,
      })
    }
  }, [])

  // Timer effect for timed mode
  useEffect(() => {
    if (!timedMode || showStats) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto advance
          handleNext(false)
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentIndex, timedMode, showStats])

  const handleNext = (wasCorrect?: boolean) => {
    // Check if user took over 10 minutes on this card
    const timeOnCard = (Date.now() - cardStartTime) / 1000 / 60
    if (timeOnCard > 10 && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        slowCardReview: true,
      })
    }

    // Update stats for current card
    const newCardsStudied = cardsStudied + 1
    const newCorrect = wasCorrect === true ? correctAnswers + 1 : correctAnswers
    const newWrong = wasCorrect === false ? wrongAnswers + 1 : wrongAnswers

    setCardsStudied(newCardsStudied)
    setCorrectAnswers(newCorrect)
    setWrongAnswers(newWrong)
    setCardStartTime(Date.now())
    setTimeLeft(30)

    if (continuousShuffle) {
      // In continuous shuffle mode, shuffle and restart when reaching the end
      if (currentIndex >= sessionCards.length - 1) {
        const shuffled = [...sessionCards].sort(() => Math.random() - 0.5)
        setSessionCards(shuffled)
        setCurrentIndex(0)
      } else {
        setCurrentIndex(currentIndex + 1)
      }
    } else {
      // Normal mode - advance or complete
      if (currentIndex < sessionCards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Session complete - show stats
        completeSession(newCorrect, newWrong, newCardsStudied)
      }
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setTimeLeft(30)
    }
  }

  const completeSession = (finalCorrect?: number, finalWrong?: number, finalCardsStudied?: number) => {
    const sessionDurationMinutes = (Date.now() - sessionStartTime) / 1000 / 60
    
    const correct = finalCorrect ?? correctAnswers
    const wrong = finalWrong ?? wrongAnswers
    const studied = finalCardsStudied ?? cardsStudied
    
    // Only save study session if studying a specific deck (not all cards)
    if (selectedDeckId && !studyAllCards) {
      const totalQuestions = correct + wrong
      const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
      
      // Only save study session for personal decks, not temporary community decks
      if (!isTemporaryStudy && selectedDeckId) {
        addStudySession({
          deckId: selectedDeckId,
          startedAt: new Date(sessionStartTime).toISOString(),
          endedAt: new Date().toISOString(),
          cardsStudied: studied,
          correctCount: correct,
          incorrectCount: wrong,
          skippedCount: 0,
          mode: 'review',
          timeSpentSeconds: Math.floor((Date.now() - sessionStartTime) / 1000),
          score: score
        })
      }
    }
    
    // Check for time-based achievements
    if (sessionDurationMinutes >= 60 && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        studiedSixtyMinutesNonstop: true,
      })
    }
    
    if (sessionDurationMinutes >= 180 && userAchievements) {
      setUserAchievements({
        ...userAchievements,
        studiedThreeHoursInOneDay: true,
      })
    }

    setShowStats(true)
  }

  const handleStopStudy = () => {
    completeSession()
  }

  const handleBackNavigation = () => {
    if (isTemporaryStudy) {
      setTemporaryStudyDeck(null)
      setReturnToCommunityDeck(null)
      setReturnToUserDeck(null) // Clear user deck return state
      navigateTo('community')
    } else {
      navigateTo(studyAllCards ? 'all-cards' : 'deck-detail')
    }
  }

  const handleViewDeckDetails = () => {
    // Check if we came from a shared deck
    if (returnToSharedDeckId) {
      // Clear temporary study and return to shared deck view
      setTemporaryStudyDeck(null)
      const shareId = returnToSharedDeckId
      setReturnToSharedDeckId(null)
      window.location.hash = `#/shared/${shareId}`
    } else {
      // Keep the return deck set, just clear temporary study and go back to community
      setTemporaryStudyDeck(null)
      navigateTo('community')
    }
  }

  const handleRestart = () => {
    // Filter cards based on study options
    let filteredCards = [...deckCards]
    
    if (excludeIgnored) {
      filteredCards = filteredCards.filter(c => !c.isIgnored)
    }
    
    if (favoritesOnly) {
      filteredCards = filteredCards.filter(c => c.favorite)
    }
    
    const orderedCards = [...filteredCards]
    
    if (order === 'randomized') {
      orderedCards.sort(() => Math.random() - 0.5)
    } else {
      orderedCards.sort((a, b) => (a.position || 0) - (b.position || 0))
    }
    
    setSessionCards(orderedCards)
    setCurrentIndex(0)
    setCorrectAnswers(0)
    setWrongAnswers(0)
    setCardsStudied(0)
    setSessionStartTime(Date.now())
    setCardStartTime(Date.now())
    setTimeLeft(30)
    setShowStats(false)
  }

  const isLastCard = currentIndex === sessionCards.length - 1 && !continuousShuffle

  // No cards available
  if (sessionCards.length === 0) {
    return (
      <AppLayout>
        <EmptyDeckState
          excludeIgnored={excludeIgnored}
          favoritesOnly={favoritesOnly}
          isTemporaryStudy={isTemporaryStudy}
          studyAllCards={studyAllCards}
          onBack={handleBackNavigation}
        />
      </AppLayout>
    )
  }
  
  // Deck not found
  if (!studyAllCards && !deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-900 dark:text-gray-100">Deck not found</div>
        </div>
      </AppLayout>
    )
  }

  const currentCard = sessionCards[currentIndex]

  // Show statistics screen
  if (showStats) {
    return (
      <AppLayout>
        <StudyStats
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          cardsStudied={cardsStudied}
          isTemporaryStudy={isTemporaryStudy}
          studyAllCards={studyAllCards}
          onRestart={handleRestart}
          onBack={handleBackNavigation}
          onViewDeckDetails={isTemporaryStudy ? handleViewDeckDetails : undefined}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Study Header */}
        <StudyHeader
          deck={deck}
          studyAllCards={studyAllCards}
          isTemporaryStudy={isTemporaryStudy}
          continuousShuffle={continuousShuffle}
          currentIndex={currentIndex}
          sessionCardsLength={sessionCards.length}
          timedMode={timedMode}
          timeLeft={timeLeft}
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          onBack={handleBackNavigation}
          onRestart={handleRestart}
          onStop={handleStopStudy}
          onViewDeckDetails={isTemporaryStudy ? handleViewDeckDetails : undefined}
        />

        {/* Study Mode Content - Based on Card Type */}
        {currentCard && (
          <>
            {currentCard.cardType === 'classic-flip' && (
              <ClassicFlipMode
                cards={sessionCards}
                onNext={handleNext}
                onPrevious={handlePrevious}
                currentIndex={currentIndex}
                isLastCard={isLastCard}
                isTemporaryStudy={isTemporaryStudy}
                frontLanguage={deck?.frontLanguage ?? undefined}
                backLanguage={deck?.backLanguage ?? undefined}
              />
            )}
            
            {currentCard.cardType === 'multiple-choice' && (
              <MultipleChoiceMode
                cards={sessionCards}
                onNext={handleNext}
                currentIndex={currentIndex}
                isLastCard={isLastCard}
                isTemporaryStudy={isTemporaryStudy}
                frontLanguage={deck?.frontLanguage ?? undefined}
              />
            )}
            
            {currentCard.cardType === 'type-answer' && (
              <TypeAnswerMode
                cards={sessionCards}
                onNext={handleNext}
                currentIndex={currentIndex}
                isLastCard={isLastCard}
                isTemporaryStudy={isTemporaryStudy}
                frontLanguage={deck?.frontLanguage ?? undefined}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}