import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { checkNewAchievements, AchievementStats } from '../utils/achievements'
import { toast } from 'sonner'

export function useAchievementTracking() {
  const { 
    decks, 
    cards,
    studySessions,
    userStats, 
    userAchievements, 
    unlockAchievement,
    setUserAchievements,
    darkMode,
    user,
    friends
  } = useStore()

  // Track which achievements we've already shown toasts for in this session
  const shownToastsRef = useRef<Set<string>>(new Set())
  
  // Track the previous unlocked achievements to detect when backend data changes
  const prevUnlockedRef = useRef<string[]>([])

  // Initialize achievements if not set
  useEffect(() => {
    if (!userAchievements) {
      setUserAchievements({
        unlockedAchievementIds: [],
        customizedDeckTheme: false,
        hasProfilePicture: false,
        decksPublished: 0,
        decksImported: 0,
        studiedBeforeEightAM: false,
        studiedAfterMidnight: false,
        studiedSixtyMinutesNonstop: false,
        studiedThreeHoursInOneDay: false,
        flippedCardFiveTimes: false,
        studiedOnLowBattery: false,
        slowCardReview: false,
        createdMultipleChoiceCard: false,
        createdTrueFalseCard: false,
        createdImageCard: false,
        completedBeginnerDeck: false,
        completedIntermediateDeck: false,
        completedAdvancedDeck: false,
        completedExpertDeck: false,
        completedMasterDeck: false,
        usedAI: false,
        aiCardsGenerated: 0,
        commentsLeft: 0,
        ratingsGiven: 0,
      })
    }
  }, [userAchievements, setUserAchievements])

  // Reset shown toasts when backend unlocked achievements change
  useEffect(() => {
    if (!userAchievements) return
    
    const currentUnlocked = userAchievements.unlockedAchievementIds
    const prevUnlocked = prevUnlockedRef.current
    
    // Check if the unlocked list changed (backend reload or reset)
    const hasChanged = 
      currentUnlocked.length !== prevUnlocked.length ||
      currentUnlocked.some(id => !prevUnlocked.includes(id)) ||
      prevUnlocked.some(id => !currentUnlocked.includes(id))
    
    if (hasChanged) {
      console.log('[Achievement] Backend unlocked list changed, resetting toast tracking')
      console.log('[Achievement] Previous:', prevUnlocked)
      console.log('[Achievement] Current:', currentUnlocked)
      
      // Reset the shown toasts to match what's in the backend
      // Only keep achievements that are still unlocked
      const newShownToasts = new Set<string>()
      currentUnlocked.forEach(id => newShownToasts.add(id))
      shownToastsRef.current = newShownToasts
      
      prevUnlockedRef.current = [...currentUnlocked]
    }
  }, [userAchievements])

  // Check for new achievements whenever relevant data changes
  useEffect(() => {
    if (!userStats || !userAchievements) return

    // Count card types
    const multipleChoiceCards = cards.filter(c => c.cardType === 'multiple-choice').length
    const typeAnswerCards = cards.filter(c => c.cardType === 'type-answer').length
    const imageCards = cards.filter(c => c.frontImageUrl || c.backImageUrl).length

    // Count unique categories used in user's created decks (not imported from community)
    const uniqueCategories = new Set(
      decks
        .filter(d => !d.sourceCommunityDeckId && d.category) // Only user-created decks with categories
        .map(d => d.category)
    )
    const categoriesUsed = uniqueCategories.size

    const stats: AchievementStats = {
      // Deck stats
      decksCreated: decks.filter(d => !d.sourceCommunityDeckId).length,
      totalCards: userStats.totalCards,
      decksPublished: userAchievements.decksPublished,
      decksImported: userAchievements.decksImported,
      
      // Study stats
      studyStreak: userStats.studyStreak,
      totalStudySessions: userStats.totalStudySessions,
      cardsReviewed: userStats.cardsReviewed,
      correctAnswersInRow: userStats.correctAnswersInRow,
      averageAccuracy: userStats.averageScore,
      totalStudyMinutes: userStats.totalStudyMinutes,
      
      // Session stats
      lastStudyDate: userStats.lastStudyDate,
      studiedToday: userStats.lastStudyDate === new Date().toDateString(),
      perfectScores: userStats.perfectScores,
      
      // Time-based
      studiedBeforeEightAM: userAchievements.studiedBeforeEightAM,
      studiedAfterMidnight: userAchievements.studiedAfterMidnight,
      studiedSixtyMinutesNonstop: userAchievements.studiedSixtyMinutesNonstop,
      studiedThreeHoursInOneDay: userAchievements.studiedThreeHoursInOneDay,
      
      // Customization
      customizedDeckTheme: userAchievements.customizedDeckTheme,
      hasProfilePicture: userAchievements.hasProfilePicture,
      usedDarkMode: darkMode,
      
      // Deck organization
      categoriesUsed: categoriesUsed,
      
      // Card types
      createdMultipleChoiceCard: multipleChoiceCards > 0 || userAchievements.createdMultipleChoiceCard,
      createdTypeAnswerCard: typeAnswerCards > 0 || userAchievements.createdTrueFalseCard,
      createdImageCard: imageCards > 0 || userAchievements.createdImageCard,
      
      // Difficulty
      completedBeginnerDeck: userAchievements.completedBeginnerDeck,
      completedIntermediateDeck: userAchievements.completedIntermediateDeck,
      completedAdvancedDeck: userAchievements.completedAdvancedDeck,
      completedExpertDeck: userAchievements.completedExpertDeck,
      completedMasterDeck: userAchievements.completedMasterDeck,
      
      // Social
      friendsAdded: friends.length,
      commentsLeft: userAchievements.commentsLeft,
      ratingsGiven: userAchievements.ratingsGiven,
      
      // Community engagement
      deckFavorites: 0, // TODO: track from backend
      deckDownloads: 0, // TODO: track from backend
      deckRatings: 0, // TODO: track from backend
      
      // Premium features
      usedAI: userAchievements.usedAI,
      aiCardsGenerated: userAchievements.aiCardsGenerated,
      isPremium: user?.subscriptionTier === 'monthly' || user?.subscriptionTier === 'annual' || user?.subscriptionTier === 'lifetime',
      
      // Meta/Fun
      flippedCardFiveTimes: userAchievements.flippedCardFiveTimes,
      studiedOnLowBattery: userAchievements.studiedOnLowBattery,
      slowCardReview: userAchievements.slowCardReview,
      
      // Unlocked achievements
      unlockedAchievements: userAchievements.unlockedAchievementIds,
    }

    const newAchievements = checkNewAchievements(
      stats,
      userAchievements.unlockedAchievementIds
    )

    console.log('[Achievement] Checking for new achievements...')
    console.log('[Achievement] Currently unlocked:', userAchievements.unlockedAchievementIds)
    console.log('[Achievement] New achievements detected:', newAchievements.map(a => a.id))

    // Unlock new achievements and show notifications
    newAchievements.forEach((achievement) => {
      // Check if we've already shown a toast for this achievement in this session
      if (shownToastsRef.current.has(achievement.id)) {
        console.log(`[Achievement] Skipping duplicate toast for: ${achievement.id}`)
        return
      }

      // Mark as shown BEFORE unlocking (in case unlock triggers re-render)
      shownToastsRef.current.add(achievement.id)
      
      console.log(`[Achievement] 🎉 Unlocking: ${achievement.id} - ${achievement.title}`)
      
      // Unlock the achievement (saves to backend)
      unlockAchievement(achievement.id)
      
      // Show achievement unlock toast
      toast.success(
        `Achievement Unlocked! ${achievement.icon}`,
        {
          description: `${achievement.title} - ${achievement.description}`,
          duration: 5000,
        }
      )
    })
  }, [decks, cards, studySessions, userStats, userAchievements, darkMode, user, friends, unlockAchievement])
}
