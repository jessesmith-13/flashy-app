import { useEffect } from 'react'
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
    subscriptionTier,
    friends
  } = useStore()

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

  // Check for new achievements whenever relevant data changes
  useEffect(() => {
    if (!userStats || !userAchievements) return

    // Count card types
    const multipleChoiceCards = cards.filter(c => c.type === 'multiple-choice').length
    const trueFalseCards = cards.filter(c => c.type === 'true-false').length
    const imageCards = cards.filter(c => c.frontImageUrl || c.backImageUrl).length

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
      
      // Card types
      createdMultipleChoiceCard: multipleChoiceCards > 0 || userAchievements.createdMultipleChoiceCard,
      createdTrueFalseCard: trueFalseCards > 0 || userAchievements.createdTrueFalseCard,
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
      isPremium: subscriptionTier === 'premium' || subscriptionTier === 'pro',
      
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

    // Unlock new achievements and show notifications
    newAchievements.forEach((achievement) => {
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
  }, [decks, cards, studySessions, userStats, userAchievements, darkMode, subscriptionTier, friends])
}
