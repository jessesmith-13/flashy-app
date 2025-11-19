export type AchievementCategory = 
  | 'getting-started'
  | 'study-streaks' 
  | 'study-mastery' 
  | 'deck-creation' 
  | 'community' 
  | 'social'
  | 'premium'
  | 'hidden'

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  category: AchievementCategory
  checkCondition: (stats: AchievementStats) => boolean
}

export interface AchievementStats {
  // Deck stats
  decksCreated: number
  totalCards: number
  decksPublished: number
  decksImported: number
  
  // Study stats
  studyStreak: number
  totalStudySessions: number
  cardsReviewed: number
  correctAnswersInRow: number
  averageAccuracy: number
  totalStudyMinutes: number
  
  // Session stats
  lastStudyDate: string
  studiedToday: boolean
  perfectScores: number
  
  // Time-based
  studiedBeforeEightAM: boolean
  studiedAfterMidnight: boolean
  studiedSixtyMinutesNonstop: boolean
  studiedThreeHoursInOneDay: boolean
  
  // Customization
  customizedDeckTheme: boolean
  hasProfilePicture: boolean
  usedDarkMode: boolean
  
  // Card types
  createdMultipleChoiceCard: boolean
  createdTrueFalseCard: boolean
  createdImageCard: boolean
  
  // Difficulty
  completedBeginnerDeck: boolean
  completedIntermediateDeck: boolean
  completedAdvancedDeck: boolean
  completedExpertDeck: boolean
  completedMasterDeck: boolean
  
  // Social
  friendsAdded: number
  commentsLeft: number
  ratingsGiven: number
  
  // Community engagement
  deckFavorites: number
  deckDownloads: number
  deckRatings: number
  
  // Premium features
  usedAI: boolean
  aiCardsGenerated: number
  isPremium: boolean
  
  // Meta/Fun
  flippedCardFiveTimes: boolean
  studiedOnLowBattery: boolean
  slowCardReview: boolean
  
  // Unlocked achievements
  unlockedAchievements: string[]
}

export const ACHIEVEMENTS: Achievement[] = [
  // ========== GETTING STARTED ==========
  {
    id: 'first-deck',
    icon: '🎉',
    title: 'First Deck',
    description: 'Create your first deck',
    category: 'getting-started',
    checkCondition: (stats) => stats.decksCreated >= 1,
  },
  {
    id: 'first-study',
    icon: '📖',
    title: 'First Study Session',
    description: 'Complete your first study session',
    category: 'getting-started',
    checkCondition: (stats) => stats.totalStudySessions >= 1,
  },
  {
    id: 'memory-spark',
    icon: '✨',
    title: 'Memory Spark',
    description: 'Review your first 10 cards',
    category: 'getting-started',
    checkCondition: (stats) => stats.cardsReviewed >= 10,
  },
  {
    id: 'community-explorer',
    icon: '🌍',
    title: 'Community Explorer',
    description: 'Import your first deck from the community',
    category: 'getting-started',
    checkCondition: (stats) => stats.decksImported >= 1,
  },
  {
    id: 'personalized',
    icon: '🎨',
    title: 'Personalized',
    description: "Customize your first deck's emoji and color",
    category: 'getting-started',
    checkCondition: (stats) => stats.customizedDeckTheme,
  },

  // ========== STUDY STREAKS ==========
  {
    id: 'on-a-roll',
    icon: '🔥',
    title: 'On a Roll',
    description: 'Study 3 days in a row',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studyStreak >= 3,
  },
  {
    id: 'week-warrior',
    icon: '⚡',
    title: 'Week Warrior',
    description: 'Study 7 days in a row',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studyStreak >= 7,
  },
  {
    id: 'unstoppable',
    icon: '💪',
    title: 'Unstoppable',
    description: 'Maintain a 14-day study streak',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studyStreak >= 14,
  },
  {
    id: 'dedication',
    icon: '📅',
    title: 'Dedication',
    description: 'Maintain a 30-day study streak',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studyStreak >= 30,
  },
  {
    id: 'legendary-streak',
    icon: '🏆',
    title: 'Legendary Streak',
    description: 'Study every day for 100 days',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studyStreak >= 100,
  },
  {
    id: 'early-bird',
    icon: '🌅',
    title: 'Early Bird',
    description: 'Study before 8 AM',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studiedBeforeEightAM,
  },
  {
    id: 'night-owl',
    icon: '🦉',
    title: 'Night Owl',
    description: 'Study between midnight and 3 AM',
    category: 'study-streaks',
    checkCondition: (stats) => stats.studiedAfterMidnight,
  },

  // ========== STUDY MASTERY ==========
  {
    id: 'perfect-score',
    icon: '💯',
    title: 'Perfect Score',
    description: 'Get every card correct in a study session',
    category: 'study-mastery',
    checkCondition: (stats) => stats.perfectScores >= 1,
  },
  {
    id: 'ace-student',
    icon: '🎓',
    title: 'Ace Student',
    description: 'Achieve 5 perfect scores',
    category: 'study-mastery',
    checkCondition: (stats) => stats.perfectScores >= 5,
  },
  {
    id: 'quick-learner',
    icon: '💡',
    title: 'Quick Learner',
    description: 'Get 20 cards correct in a row',
    category: 'study-mastery',
    checkCondition: (stats) => stats.correctAnswersInRow >= 20,
  },
  {
    id: 'unstoppable-genius',
    icon: '🧠',
    title: 'Unstoppable Genius',
    description: 'Get 50 cards correct in a row',
    category: 'study-mastery',
    checkCondition: (stats) => stats.correctAnswersInRow >= 50,
  },
  {
    id: 'hundred-cards',
    icon: '🎯',
    title: 'Century Reviewer',
    description: 'Review 100 cards total',
    category: 'study-mastery',
    checkCondition: (stats) => stats.cardsReviewed >= 100,
  },
  {
    id: 'five-hundred-cards',
    icon: '🏅',
    title: 'Knowledge Seeker',
    description: 'Review 500 cards total',
    category: 'study-mastery',
    checkCondition: (stats) => stats.cardsReviewed >= 500,
  },
  {
    id: 'thousand-cards',
    icon: '🌟',
    title: 'Master Learner',
    description: 'Review 1,000 cards total',
    category: 'study-mastery',
    checkCondition: (stats) => stats.cardsReviewed >= 1000,
  },
  {
    id: 'accuracy-expert',
    icon: '🎖️',
    title: 'Accuracy Expert',
    description: 'Maintain 90%+ accuracy over 100 cards',
    category: 'study-mastery',
    checkCondition: (stats) => stats.cardsReviewed >= 100 && stats.averageAccuracy >= 90,
  },
  {
    id: 'marathon-session',
    icon: '🏃',
    title: 'Marathon Session',
    description: 'Study for 60+ minutes without stopping',
    category: 'study-mastery',
    checkCondition: (stats) => stats.studiedSixtyMinutesNonstop,
  },
  {
    id: 'ultra-marathon',
    icon: '🚀',
    title: 'Ultra Marathon',
    description: 'Study for 3+ hours in one day',
    category: 'study-mastery',
    checkCondition: (stats) => stats.studiedThreeHoursInOneDay,
  },
  {
    id: 'beginner-master',
    icon: '🟢',
    title: 'Beginner Master',
    description: 'Complete a beginner difficulty deck',
    category: 'study-mastery',
    checkCondition: (stats) => stats.completedBeginnerDeck,
  },
  {
    id: 'intermediate-master',
    icon: '🟡',
    title: 'Intermediate Master',
    description: 'Complete an intermediate difficulty deck',
    category: 'study-mastery',
    checkCondition: (stats) => stats.completedIntermediateDeck,
  },
  {
    id: 'advanced-master',
    icon: '🟠',
    title: 'Advanced Master',
    description: 'Complete an advanced difficulty deck',
    category: 'study-mastery',
    checkCondition: (stats) => stats.completedAdvancedDeck,
  },
  {
    id: 'expert-master',
    icon: '🔴',
    title: 'Expert Master',
    description: 'Complete an expert difficulty deck',
    category: 'study-mastery',
    checkCondition: (stats) => stats.completedExpertDeck,
  },
  {
    id: 'ultimate-master',
    icon: '🌈',
    title: 'Ultimate Master',
    description: 'Complete a master difficulty deck',
    category: 'study-mastery',
    checkCondition: (stats) => stats.completedMasterDeck,
  },

  // ========== DECK CREATION ==========
  {
    id: 'deck-builder',
    icon: '🏗️',
    title: 'Deck Builder',
    description: 'Create 5 decks',
    category: 'deck-creation',
    checkCondition: (stats) => stats.decksCreated >= 5,
  },
  {
    id: 'deck-architect',
    icon: '🏛️',
    title: 'Deck Architect',
    description: 'Create 10 decks',
    category: 'deck-creation',
    checkCondition: (stats) => stats.decksCreated >= 10,
  },
  {
    id: 'deck-master',
    icon: '👑',
    title: 'Deck Master',
    description: 'Create 20 decks',
    category: 'deck-creation',
    checkCondition: (stats) => stats.decksCreated >= 20,
  },
  {
    id: 'card-variety',
    icon: '🎴',
    title: 'Card Variety',
    description: 'Create cards of all different types',
    category: 'deck-creation',
    checkCondition: (stats) => 
      stats.createdMultipleChoiceCard && 
      stats.createdTrueFalseCard && 
      stats.createdImageCard,
  },
  {
    id: 'hundred-card-deck',
    icon: '📚',
    title: 'Ambitious Creator',
    description: 'Create a deck with 100+ cards',
    category: 'deck-creation',
    checkCondition: (stats) => stats.totalCards >= 100,
  },
  {
    id: 'categorized',
    icon: '📂',
    title: 'Organized Mind',
    description: 'Create decks in 5 different categories',
    category: 'deck-creation',
    checkCondition: (stats) => false, // TODO: track categories
  },

  // ========== COMMUNITY ==========
  {
    id: 'publisher',
    icon: '📤',
    title: 'Publisher',
    description: 'Publish your first deck to the community',
    category: 'community',
    checkCondition: (stats) => stats.decksPublished >= 1,
  },
  {
    id: 'prolific-publisher',
    icon: '📦',
    title: 'Prolific Publisher',
    description: 'Publish 5 decks to the community',
    category: 'community',
    checkCondition: (stats) => stats.decksPublished >= 5,
  },
  {
    id: 'community-favorite',
    icon: '⭐',
    title: 'Community Favorite',
    description: 'Get 10 favorites on your published decks',
    category: 'community',
    checkCondition: (stats) => stats.deckFavorites >= 10,
  },
  {
    id: 'popular-creator',
    icon: '🌟',
    title: 'Popular Creator',
    description: 'Reach 50 downloads on your published decks',
    category: 'community',
    checkCondition: (stats) => stats.deckDownloads >= 50,
  },
  {
    id: 'viral-deck',
    icon: '🔥',
    title: 'Viral Deck',
    description: 'Reach 100 downloads on a single deck',
    category: 'community',
    checkCondition: (stats) => stats.deckDownloads >= 100,
  },
  {
    id: 'five-star-creator',
    icon: '⭐⭐⭐⭐⭐',
    title: 'Five Star Creator',
    description: 'Get 5 ratings of 5 stars on your decks',
    category: 'community',
    checkCondition: (stats) => stats.deckRatings >= 5,
  },

  // ========== SOCIAL ==========
  {
    id: 'friendly',
    icon: '👋',
    title: 'Friendly',
    description: 'Add your first friend',
    category: 'social',
    checkCondition: (stats) => stats.friendsAdded >= 1,
  },
  {
    id: 'social-butterfly',
    icon: '🦋',
    title: 'Social Butterfly',
    description: 'Add 5 friends',
    category: 'social',
    checkCondition: (stats) => stats.friendsAdded >= 5,
  },
  {
    id: 'squad',
    icon: '👥',
    title: 'Squad Goals',
    description: 'Add 10 friends',
    category: 'social',
    checkCondition: (stats) => stats.friendsAdded >= 10,
  },
  {
    id: 'helpful-commenter',
    icon: '💬',
    title: 'Helpful Commenter',
    description: 'Leave 5 comments on community decks',
    category: 'social',
    checkCondition: (stats) => stats.commentsLeft >= 5,
  },
  {
    id: 'active-member',
    icon: '🎤',
    title: 'Active Member',
    description: 'Leave 20 comments on community decks',
    category: 'social',
    checkCondition: (stats) => stats.commentsLeft >= 20,
  },
  {
    id: 'critic',
    icon: '⭐',
    title: 'Fair Critic',
    description: 'Rate 10 community decks',
    category: 'social',
    checkCondition: (stats) => stats.ratingsGiven >= 10,
  },

  // ========== PREMIUM FEATURES ==========
  {
    id: 'ai-pioneer',
    icon: '🤖',
    title: 'AI Pioneer',
    description: 'Use AI to generate your first card',
    category: 'premium',
    checkCondition: (stats) => stats.usedAI,
  },
  {
    id: 'ai-enthusiast',
    icon: '✨',
    title: 'AI Enthusiast',
    description: 'Generate 50 cards with AI',
    category: 'premium',
    checkCondition: (stats) => stats.aiCardsGenerated >= 50,
  },
  {
    id: 'ai-power-user',
    icon: '🚀',
    title: 'AI Power User',
    description: 'Generate 100 cards with AI',
    category: 'premium',
    checkCondition: (stats) => stats.aiCardsGenerated >= 100,
  },
  {
    id: 'premium-member',
    icon: '👑',
    title: 'Premium Member',
    description: 'Upgrade to a premium subscription',
    category: 'premium',
    checkCondition: (stats) => stats.isPremium,
  },

  // ========== HIDDEN / FUN ==========
  {
    id: 'slow-and-steady',
    icon: '🐢',
    title: 'Slow and Steady',
    description: 'Take over 10 minutes to review one card',
    category: 'hidden',
    checkCondition: (stats) => stats.slowCardReview,
  },
  {
    id: 'indecisive',
    icon: '🔄',
    title: 'Indecisive',
    description: 'Flip the same card five times in a row',
    category: 'hidden',
    checkCondition: (stats) => stats.flippedCardFiveTimes,
  },
  {
    id: 'dedication-mode',
    icon: '🔋',
    title: 'Dedication Mode',
    description: 'Study while your battery is below 5%',
    category: 'hidden',
    checkCondition: (stats) => stats.studiedOnLowBattery,
  },
  {
    id: 'dark-knight',
    icon: '🌙',
    title: 'Dark Knight',
    description: 'Use dark mode',
    category: 'hidden',
    checkCondition: (stats) => stats.usedDarkMode,
  },
  {
    id: 'achievement-hunter',
    icon: '🏆',
    title: 'Achievement Hunter',
    description: 'Unlock 20 achievements',
    category: 'hidden',
    checkCondition: (stats) => stats.unlockedAchievements.length >= 20,
  },
  {
    id: 'completionist',
    icon: '💎',
    title: 'Completionist',
    description: 'Unlock 50 achievements',
    category: 'hidden',
    checkCondition: (stats) => stats.unlockedAchievements.length >= 50,
  },
]

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  'getting-started': '🎯 Getting Started',
  'study-streaks': '🔥 Study Streaks',
  'study-mastery': '🧠 Study Mastery',
  'deck-creation': '🛠️ Deck Creation',
  'community': '🌍 Community',
  'social': '👥 Social',
  'premium': '👑 Premium Features',
  'hidden': '🎉 Hidden Achievements',
}

export function checkNewAchievements(
  stats: AchievementStats,
  previousUnlocked: string[]
): Achievement[] {
  const newlyUnlocked: Achievement[] = []
  
  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (previousUnlocked.includes(achievement.id)) continue
    
    // Check if achievement condition is met
    if (achievement.checkCondition(stats)) {
      newlyUnlocked.push(achievement)
    }
  }
  
  return newlyUnlocked
}

export function getAchievementsByCategory(unlockedIds: string[]): Record<AchievementCategory, { unlocked: Achievement[], locked: Achievement[] }> {
  const result: Record<AchievementCategory, { unlocked: Achievement[], locked: Achievement[] }> = {
    'getting-started': { unlocked: [], locked: [] },
    'study-streaks': { unlocked: [], locked: [] },
    'study-mastery': { unlocked: [], locked: [] },
    'deck-creation': { unlocked: [], locked: [] },
    'community': { unlocked: [], locked: [] },
    'social': { unlocked: [], locked: [] },
    'premium': { unlocked: [], locked: [] },
    'hidden': { unlocked: [], locked: [] },
  }
  
  for (const achievement of ACHIEVEMENTS) {
    const isUnlocked = unlockedIds.includes(achievement.id)
    if (isUnlocked) {
      result[achievement.category].unlocked.push(achievement)
    } else {
      result[achievement.category].locked.push(achievement)
    }
  }
  
  return result
}
