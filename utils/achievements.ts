export type AchievementCategory = 
  | 'streaks' 
  | 'milestones' 
  | 'creation' 
  | 'social' 
  | 'time' 
  | 'customization' 
  | 'mastery' 
  | 'fun' 
  | 'tiered'

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
  studiedThisWeekend: boolean
  perfectScores: number
  
  // Time-based
  studiedBeforeEightAM: boolean
  studiedAfterMidnight: boolean
  studiedSixtyMinutesNonstop: boolean
  studiedThreeHoursInOneDay: boolean
  
  // Customization
  customizedDeckTheme: boolean
  hasProfilePicture: boolean
  changedAppTheme: boolean
  
  // Engagement
  decksOwned: number
  notesWritten: number
  
  // Social (for future)
  deckFavorites: number
  deckDownloads: number
  commentsLeft: number
  
  // Meta/Fun
  flippedCardFiveTimes: boolean
  studiedOnLowBattery: boolean
  studiedInDarkMode: boolean
  slowCardReview: boolean
  
  // Unlocked achievements
  unlockedAchievements: string[]
}

export const ACHIEVEMENTS: Achievement[] = [
  // 🕐 Study Streaks & Consistency
  {
    id: 'first-step',
    icon: '🕐',
    title: 'First Step',
    description: 'Complete your first study session',
    category: 'streaks',
    checkCondition: (stats) => stats.totalStudySessions >= 1,
  },
  {
    id: 'on-a-roll',
    icon: '🔥',
    title: 'On a Roll',
    description: 'Study 3 days in a row',
    category: 'streaks',
    checkCondition: (stats) => stats.studyStreak >= 3,
  },
  {
    id: 'steady-scholar',
    icon: '⚡',
    title: 'Steady Scholar',
    description: 'Study 7 days in a row',
    category: 'streaks',
    checkCondition: (stats) => stats.studyStreak >= 7,
  },
  {
    id: 'night-owl',
    icon: '🌙',
    title: 'Night Owl',
    description: 'Study between midnight and 3 AM',
    category: 'streaks',
    checkCondition: (stats) => stats.studiedAfterMidnight,
  },
  {
    id: 'early-bird',
    icon: '☀️',
    title: 'Early Bird',
    description: 'Study before 8 AM',
    category: 'streaks',
    checkCondition: (stats) => stats.studiedBeforeEightAM,
  },
  {
    id: 'consistency-royalty',
    icon: '📅',
    title: 'Consistency King/Queen',
    description: 'Maintain a 30-day streak',
    category: 'streaks',
    checkCondition: (stats) => stats.studyStreak >= 30,
  },
  {
    id: 'year-grind',
    icon: '🏆',
    title: '365 Grind',
    description: 'Study every day for a full year',
    category: 'streaks',
    checkCondition: (stats) => stats.studyStreak >= 365,
  },

  // 🧠 Learning Milestones
  {
    id: 'memory-spark',
    icon: '🪄',
    title: 'Memory Spark',
    description: 'Review your first 10 cards',
    category: 'milestones',
    checkCondition: (stats) => stats.cardsReviewed >= 10,
  },
  {
    id: 'deck-master',
    icon: '📚',
    title: 'Deck Master',
    description: 'Complete all cards in one deck',
    category: 'milestones',
    checkCondition: (stats) => stats.totalStudySessions >= 1 && stats.perfectScores >= 1,
  },
  {
    id: 'quick-learner',
    icon: '💡',
    title: 'Quick Learner',
    description: 'Get 20 cards right in a row',
    category: 'milestones',
    checkCondition: (stats) => stats.correctAnswersInRow >= 20,
  },
  {
    id: 'card-crusher',
    icon: '🧩',
    title: 'Card Crusher',
    description: 'Review 500 cards',
    category: 'milestones',
    checkCondition: (stats) => stats.cardsReviewed >= 500,
  },
  {
    id: 'brain-builder',
    icon: '🧠',
    title: 'Brain Builder',
    description: 'Review 1,000 cards',
    category: 'milestones',
    checkCondition: (stats) => stats.cardsReviewed >= 1000,
  },
  {
    id: 'master-recall',
    icon: '🏅',
    title: 'Master of Recall',
    description: 'Maintain 90% accuracy over 100 cards',
    category: 'milestones',
    checkCondition: (stats) => stats.cardsReviewed >= 100 && stats.averageAccuracy >= 90,
  },
  {
    id: 'knowledge-architect',
    icon: '🧬',
    title: 'Knowledge Architect',
    description: 'Create 10 custom decks',
    category: 'milestones',
    checkCondition: (stats) => stats.decksCreated >= 10,
  },
  {
    id: 'focus-mode',
    icon: '🔍',
    title: 'Focus Mode',
    description: 'Study for 60+ minutes without exiting',
    category: 'milestones',
    checkCondition: (stats) => stats.studiedSixtyMinutesNonstop,
  },

  // 🛠️ Creation & Contribution
  {
    id: 'maker',
    icon: '🛠️',
    title: 'Maker',
    description: 'Create your first deck',
    category: 'creation',
    checkCondition: (stats) => stats.decksCreated >= 1,
  },
  {
    id: 'designer',
    icon: '🎨',
    title: 'Designer',
    description: "Customize your first deck's theme",
    category: 'creation',
    checkCondition: (stats) => stats.customizedDeckTheme,
  },
  {
    id: 'contributor',
    icon: '🌍',
    title: 'Contributor',
    description: 'Publish your first public deck',
    category: 'creation',
    checkCondition: (stats) => stats.decksPublished >= 1,
  },
  {
    id: 'rising-scholar',
    icon: '⭐',
    title: 'Rising Scholar',
    description: 'Get your deck favorited by 5 other users',
    category: 'creation',
    checkCondition: (stats) => stats.deckFavorites >= 5,
  },
  {
    id: 'deck-hero',
    icon: '👑',
    title: 'Deck Hero',
    description: 'Reach 100 downloads on a deck',
    category: 'creation',
    checkCondition: (stats) => stats.deckDownloads >= 100,
  },
  {
    id: 'community-mentor',
    icon: '🧑‍🏫',
    title: 'Community Mentor',
    description: 'Contribute 5+ public decks',
    category: 'creation',
    checkCondition: (stats) => stats.decksPublished >= 5,
  },

  // 💬 Social & Collaboration
  {
    id: 'study-buddy',
    icon: '🤝',
    title: 'Study Buddy',
    description: 'Join or create your first study group',
    category: 'social',
    checkCondition: (stats) => false, // Future feature
  },
  {
    id: 'helpful-human',
    icon: '💬',
    title: 'Helpful Human',
    description: 'Leave your first comment or tip',
    category: 'social',
    checkCondition: (stats) => stats.commentsLeft >= 1,
  },
  {
    id: 'team-player',
    icon: '🏅',
    title: 'Team Player',
    description: 'Contribute to a shared deck',
    category: 'social',
    checkCondition: (stats) => false, // Future feature
  },
  {
    id: 'challenge-accepted',
    icon: '🏁',
    title: 'Challenge Accepted',
    description: 'Participate in your first weekly challenge',
    category: 'social',
    checkCondition: (stats) => false, // Future feature
  },
  {
    id: 'top-learner',
    icon: '🧗',
    title: 'Top Learner',
    description: 'Rank in the top 10 of a leaderboard',
    category: 'social',
    checkCondition: (stats) => false, // Future feature
  },

  // ⏱️ Time-Based Achievements
  {
    id: 'focused-fifteen',
    icon: '⏳',
    title: 'Focused 15',
    description: 'Study for 15 minutes straight',
    category: 'time',
    checkCondition: (stats) => stats.totalStudyMinutes >= 15,
  },
  {
    id: 'flow-state',
    icon: '🧘',
    title: 'Flow State',
    description: 'Study for 1 hour without pausing',
    category: 'time',
    checkCondition: (stats) => stats.studiedSixtyMinutesNonstop,
  },
  {
    id: 'study-marathon',
    icon: '🚀',
    title: 'Study Marathon',
    description: 'Study 3+ hours in one day',
    category: 'time',
    checkCondition: (stats) => stats.studiedThreeHoursInOneDay,
  },
  {
    id: 'weekend-warrior',
    icon: '🕰️',
    title: 'Weekend Warrior',
    description: 'Study on both Saturday and Sunday',
    category: 'time',
    checkCondition: (stats) => stats.studiedThisWeekend,
  },
  {
    id: 'morning-momentum',
    icon: '🌄',
    title: 'Morning Momentum',
    description: 'Complete a study session before breakfast',
    category: 'time',
    checkCondition: (stats) => stats.studiedBeforeEightAM,
  },

  // 🎨 Customization & Personal Growth
  {
    id: 'style-points',
    icon: '🎨',
    title: 'Style Points',
    description: 'Change your app theme',
    category: 'customization',
    checkCondition: (stats) => stats.changedAppTheme,
  },
  {
    id: 'identity',
    icon: '🪞',
    title: 'Identity',
    description: 'Add a profile picture',
    category: 'customization',
    checkCondition: (stats) => stats.hasProfilePicture,
  },
  {
    id: 'collectionist',
    icon: '🧩',
    title: 'Collectionist',
    description: 'Own 10+ decks',
    category: 'customization',
    checkCondition: (stats) => stats.decksOwned >= 10,
  },
  {
    id: 'logo-lover',
    icon: '🖼️',
    title: 'Logo Lover',
    description: 'Upload a deck logo',
    category: 'customization',
    checkCondition: (stats) => stats.customizedDeckTheme,
  },
  {
    id: 'reflective-thinker',
    icon: '💭',
    title: 'Reflective Thinker',
    description: 'Write your first note or reflection',
    category: 'customization',
    checkCondition: (stats) => stats.notesWritten >= 1,
  },

  // 🧩 Challenge & Mastery Achievements
  {
    id: 'perfect-recall',
    icon: '💯',
    title: 'Perfect Recall',
    description: 'Get every card right in a deck',
    category: 'mastery',
    checkCondition: (stats) => stats.perfectScores >= 1,
  },
  {
    id: 'comeback-kid',
    icon: '🔄',
    title: 'Comeback Kid',
    description: 'Recover from a 3-day streak break',
    category: 'mastery',
    checkCondition: (stats) => stats.studyStreak >= 3, // Simplified
  },
  {
    id: 'hidden-scholar',
    icon: '🔐',
    title: 'Hidden Scholar',
    description: 'Find an Easter egg or hidden feature',
    category: 'mastery',
    checkCondition: (stats) => false, // Manual unlock
  },
  {
    id: 'knowledge-wizard',
    icon: '🧙',
    title: 'Knowledge Wizard',
    description: 'Complete every card in the app',
    category: 'mastery',
    checkCondition: (stats) => stats.cardsReviewed >= 1000 && stats.averageAccuracy >= 95,
  },
  {
    id: 'speed-demon',
    icon: '🕹️',
    title: 'Speed Demon',
    description: 'Complete a deck under a certain time limit',
    category: 'mastery',
    checkCondition: (stats) => false, // Need timing implementation
  },
  {
    id: 'ultimate-deck-builder',
    icon: '🧩',
    title: 'Ultimate Deck Builder',
    description: 'Create a deck with 100+ cards',
    category: 'mastery',
    checkCondition: (stats) => stats.totalCards >= 100,
  },
  {
    id: 'flashcard-philosopher',
    icon: '🧠',
    title: 'Flashcard Philosopher',
    description: 'Study 10 different subjects',
    category: 'mastery',
    checkCondition: (stats) => stats.decksOwned >= 10,
  },

  // 🪙 Meta & Fun / Easter Egg Achievements
  {
    id: 'slow-and-steady',
    icon: '🐢',
    title: 'Slow and Steady',
    description: 'Take over 10 minutes to review one card 😅',
    category: 'fun',
    checkCondition: (stats) => stats.slowCardReview,
  },
  {
    id: 'oops',
    icon: '💥',
    title: 'Oops!',
    description: 'Flip the same card five times in a row',
    category: 'fun',
    checkCondition: (stats) => stats.flippedCardFiveTimes,
  },
  {
    id: 'out-of-juice',
    icon: '🔋',
    title: 'Out of Juice',
    description: 'Your phone battery dropped below 5% while studying',
    category: 'fun',
    checkCondition: (stats) => stats.studiedOnLowBattery,
  },
  {
    id: 'secret-genius',
    icon: '🕶️',
    title: 'Secret Genius',
    description: 'Unlock a hidden deck or feature',
    category: 'fun',
    checkCondition: (stats) => false, // Manual unlock
  },
  {
    id: 'collector',
    icon: '🎉',
    title: 'Collector',
    description: 'Earn 20 achievements',
    category: 'fun',
    checkCondition: (stats) => stats.unlockedAchievements.length >= 20,
  },
  {
    id: 'shadow-learner',
    icon: '👻',
    title: 'Shadow Learner',
    description: 'Study in dark mode for a week straight',
    category: 'fun',
    checkCondition: (stats) => stats.studiedInDarkMode && stats.studyStreak >= 7,
  },

  // 🏅 Tiered Achievements (Gamified Progression)
  {
    id: 'deck-builder-i',
    icon: '🏗️',
    title: 'Deck Builder I',
    description: 'Create 1 deck',
    category: 'tiered',
    checkCondition: (stats) => stats.decksCreated >= 1,
  },
  {
    id: 'deck-builder-ii',
    icon: '🏗️',
    title: 'Deck Builder II',
    description: 'Create 5 decks',
    category: 'tiered',
    checkCondition: (stats) => stats.decksCreated >= 5,
  },
  {
    id: 'deck-builder-iii',
    icon: '🏗️',
    title: 'Deck Builder III',
    description: 'Create 20 decks',
    category: 'tiered',
    checkCondition: (stats) => stats.decksCreated >= 20,
  },
  {
    id: 'study-streak-i',
    icon: '🔥',
    title: 'Study Streak I',
    description: '3 days in a row',
    category: 'tiered',
    checkCondition: (stats) => stats.studyStreak >= 3,
  },
  {
    id: 'study-streak-ii',
    icon: '🔥',
    title: 'Study Streak II',
    description: '7 days in a row',
    category: 'tiered',
    checkCondition: (stats) => stats.studyStreak >= 7,
  },
  {
    id: 'study-streak-iii',
    icon: '🔥',
    title: 'Study Streak III',
    description: '30 days in a row',
    category: 'tiered',
    checkCondition: (stats) => stats.studyStreak >= 30,
  },
  {
    id: 'card-crusher-i',
    icon: '🎯',
    title: 'Card Crusher I',
    description: 'Review 100 cards',
    category: 'tiered',
    checkCondition: (stats) => stats.cardsReviewed >= 100,
  },
  {
    id: 'card-crusher-ii',
    icon: '🎯',
    title: 'Card Crusher II',
    description: 'Review 500 cards',
    category: 'tiered',
    checkCondition: (stats) => stats.cardsReviewed >= 500,
  },
  {
    id: 'card-crusher-iii',
    icon: '🎯',
    title: 'Card Crusher III',
    description: 'Review 1,000 cards',
    category: 'tiered',
    checkCondition: (stats) => stats.cardsReviewed >= 1000,
  },
]

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streaks: '🕐 Study Streaks & Consistency',
  milestones: '🧠 Learning Milestones',
  creation: '🛠️ Creation & Contribution',
  social: '💬 Social & Collaboration',
  time: '⏱️ Time-Based Achievements',
  customization: '🎨 Customization & Personal Growth',
  mastery: '🧩 Challenge & Mastery',
  fun: '🪙 Meta & Fun',
  tiered: '🏅 Tiered Achievements',
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
    streaks: { unlocked: [], locked: [] },
    milestones: { unlocked: [], locked: [] },
    creation: { unlocked: [], locked: [] },
    social: { unlocked: [], locked: [] },
    time: { unlocked: [], locked: [] },
    customization: { unlocked: [], locked: [] },
    mastery: { unlocked: [], locked: [] },
    fun: { unlocked: [], locked: [] },
    tiered: { unlocked: [], locked: [] },
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
