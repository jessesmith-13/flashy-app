export interface UserStats {
  totalDecks: number
  totalCards: number
  studyStreak: number
  lastStudyDate: string
  totalStudySessions: number
  averageScore: number
  cardsReviewed: number
  correctAnswersInRow: number
  totalStudyMinutes: number
  perfectScores: number
}

export interface UserAchievements {
  unlockedAchievementIds: string[]
  customizedDeckTheme: boolean
  hasProfilePicture: boolean
  decksPublished: number
  decksImported: number
  studiedBeforeEightAM: boolean
  studiedAfterMidnight: boolean
  studiedSixtyMinutesNonstop: boolean
  studiedThreeHoursInOneDay: boolean
  flippedCardFiveTimes: boolean
  studiedOnLowBattery: boolean
  slowCardReview: boolean
  createdMultipleChoiceCard: boolean
  createdTrueFalseCard: boolean
  createdImageCard: boolean
  completedBeginnerDeck: boolean
  completedIntermediateDeck: boolean
  completedAdvancedDeck: boolean
  completedExpertDeck: boolean
  completedMasterDeck: boolean
  usedAI: boolean
  aiCardsGenerated: number
  commentsLeft: number
  ratingsGiven: number
  studiedInDarkMode: boolean
}

export interface User {
  id: string
  email: string
  name: string
  displayName?: string
  avatarUrl?: string
  decksPublic?: boolean
  subscriptionTier?: SubscriptionTier
  subscriptionExpiry?: string // For monthly/annual subscriptions
  subscriptionCancelledAtPeriodEnd?: boolean // If subscription is set to cancel at period end
  isSuperuser?: boolean // Superuser role for "Flashy" admin account (full admin privileges)
  isModerator?: boolean // Moderator role (can manage flags, has premium features)
  isBanned?: boolean // User ban status (managed by superuser)
  stripeSubscriptionId?: string | null // Stripe subscription ID
  emailNotificationsEnabled?: boolean // Master email notifications toggle
  emailOffers?: boolean // Promotional offers
  emailCommentReplies?: boolean // Notifications for comment replies
  emailFriendRequests?: boolean // Notifications for friend requests
  emailFlaggedContent?: boolean // Notifications for flagged content
  emailModerationNotices?: boolean // Notifications for moderation actions
}

export type SubscriptionTier = 'free' | 'monthly' | 'annual' | 'lifetime'