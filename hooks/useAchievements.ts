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
    setUserAchievements 
  } = useStore()

  // Initialize achievements if not set
  useEffect(() => {
    if (!userAchievements) {
      setUserAchievements({
        unlockedAchievementIds: [],
        customizedDeckTheme: false,
        hasProfilePicture: false,
        decksPublished: 0,
        studiedBeforeEightAM: false,
        studiedAfterMidnight: false,
        studiedSixtyMinutesNonstop: false,
        studiedThreeHoursInOneDay: false,
        flippedCardFiveTimes: false,
        studiedOnLowBattery: false,
        studiedInDarkMode: false,
        slowCardReview: false,
      })
    }
  }, [userAchievements, setUserAchievements])

  // Check for new achievements whenever relevant data changes
  useEffect(() => {
    if (!userStats || !userAchievements) return

    const stats: AchievementStats = {
      // Deck stats
      decksCreated: decks.length,
      totalCards: userStats.totalCards,
      decksPublished: userAchievements.decksPublished,
      
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
      studiedThisWeekend: false, // TODO: implement
      perfectScores: userStats.perfectScores,
      
      // Time-based
      studiedBeforeEightAM: userAchievements.studiedBeforeEightAM,
      studiedAfterMidnight: userAchievements.studiedAfterMidnight,
      studiedSixtyMinutesNonstop: userAchievements.studiedSixtyMinutesNonstop,
      studiedThreeHoursInOneDay: userAchievements.studiedThreeHoursInOneDay,
      
      // Customization
      customizedDeckTheme: userAchievements.customizedDeckTheme,
      hasProfilePicture: userAchievements.hasProfilePicture,
      changedAppTheme: false, // TODO: implement
      
      // Engagement
      decksOwned: decks.length,
      notesWritten: 0, // TODO: implement
      
      // Social (for future)
      deckFavorites: 0,
      deckDownloads: 0,
      commentsLeft: 0,
      
      // Meta/Fun
      flippedCardFiveTimes: userAchievements.flippedCardFiveTimes,
      studiedOnLowBattery: userAchievements.studiedOnLowBattery,
      studiedInDarkMode: userAchievements.studiedInDarkMode,
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
  }, [decks, studySessions, userStats, userAchievements])
}
