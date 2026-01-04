import { create } from 'zustand'
import { projectId } from '../utils/supabase/info'

export type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'mixed'

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: string
  position: number
  cardType: CardType  // Each card has its own type
  favorite?: boolean  // Mark card as favorite
  ignored?: boolean   // Mark card as ignored
  frontImageUrl?: string  // Optional image for the question (premium feature)
  backImageUrl?: string  // Optional image for the answer (premium feature, classic-flip only)
  frontAudioUrl?: string  // Optional audio for the question (premium feature)
  backAudioUrl?: string  // Optional audio for the answer (premium feature)
  // For multiple-choice card type
  incorrectAnswers?: string[]
  correctAnswers?: string[]  // Array of correct answers for multiple choice (if undefined, 'back' is the single correct answer)
  // For type-answer card type
  acceptedAnswers?: string[]  // Array of alternative acceptable answers
}

export type DeckType = 'classic-flip' | 'multiple-choice' | 'type-answer'

export interface Deck {
  id: string
  name: string
  color: string
  emoji: string
  userId: string
  createdAt: string
  cardCount: number
  deckType: DeckType
  position: number
  theme?: string
  favorite?: boolean  // Mark deck as favorite
  learned?: boolean   // Mark deck as learned
  category?: string   // Deck category
  subtopic?: string   // Deck subtopic
  difficulty?: DifficultyLevel  // Deck difficulty level
  frontLanguage?: string   // Language of the question/front (e.g., "English")
  backLanguage?: string    // Language of the answer/back (e.g., "Spanish")
  sourceCommunityDeckId?: string  // Track which community deck this was imported from
  communityPublishedId?: string   // Track which community deck ID this deck was published as
  communityDeckVersion?: number   // Track version of imported community deck
  cannotRepublish?: boolean  // Flag if deck cannot be republished (set by superuser)
  cannotRepublishReason?: string  // Reason why deck cannot be republished
  isDeleted?: boolean  // Soft-delete flag
  deletedAt?: string  // When the deck was deleted
  lastSyncedAt?: string  // When the deck was last synced with community version
}

// CommunityDeck extends Deck and adds community-specific fields
export interface CommunityDeck extends Omit<Deck, 'userId' | 'position' | 'favorite' | 'learned' | 'sourceCommunityDeckId' | 'communityPublishedId' | 'communityDeckVersion'> {
  authorId: string // Replaces userId for community context
  author: string // Display name of the author
  cards: Card[] // Community decks include cards inline
  publishedAt: string // When it was published
  updatedAt?: string // When it was last updated
  downloads: number // Number of times downloaded
  featured?: boolean // Featured by superuser
  version?: number // Version number for updates
  averageRating?: number // Average rating from users
  ratingCount?: number // Number of ratings
  commentCount?: number // Number of comments
  isPublished: boolean
}

export interface StudyOptions {
  timedMode: boolean
  continuousShuffle: boolean
  order: 'randomized' | 'linear'
  excludeIgnored: boolean
  favoritesOnly: boolean
}

export interface StudySession {
  deckId: string
  startedAt: string
  endedAt: string
  cardsStudied: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  mode: string
  timeSpentSeconds: number
  score: number
}

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
}

export type SubscriptionTier = 'free' | 'monthly' | 'annual' | 'lifetime'

export interface FriendRequest {
  id: string
  name: string
  displayName?: string
  email: string
  avatarUrl?: string
}

export interface Notification {
  id: string
  userId: string
  type: "friend_request" | "comment" | "reply" | "deck_comment" | "warning" | "mention" | "comment_like" | "ticket_mention" | "ticket_comment" | "ticket_assigned";
  message: string
  relatedUserId: string
  requesterDisplayName: string
  requesterAvatar: string | null
  createdAt: string
  relatedDeckId: string | null
  relatedCommentId: string | null
  relatedReplyId: string | null
  fromUserId?: string
  fromUserName?: string
  fromUserAvatar?: string
  deckName?: string
  commentText?: string
  isRead: boolean
  isSeen: boolean
}

export interface TemporaryStudyDeck {
  deck: CommunityDeck
  cards: Card[]
}

interface User {
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
}

interface AppState {
  // Auth state
  user: User | null
  accessToken: string | null
  setAuth: (user: User | null, accessToken: string | null) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
  
  // Friends state
  friends: string[]
  friendRequests: FriendRequest[] // Full user objects who sent friend requests to me
  pendingFriendRequests: string[] // User IDs I sent friend requests to
  setFriends: (friends: string[]) => void
  setFriendRequests: (requests: FriendRequest[]) => void
  setPendingFriendRequests: (requests: string[]) => void
  addFriend: (userId: string) => void
  removeFriend: (userId: string) => void
  addFriendRequest: (userId: string) => void
  removeFriendRequest: (userId: string) => void
  addPendingFriendRequest: (userId: string) => void
  removePendingFriendRequest: (userId: string) => void

  // Notifications state
  mentionNotifications: Notification[]
  setMentionNotifications: (notifications: Notification[]) => void
  removeMentionNotification: (notificationId: string) => void
  clearAllMentionNotifications: () => void

  // Deck state
  decks: Deck[]
  setDecks: (decks: Deck[]) => void
  addDeck: (deck: Deck) => void
  updateDeck: (deckId: string, updates: Partial<Deck>) => void
  removeDeck: (deckId: string) => void
  decksLastLoaded: number | null // Timestamp when decks were last loaded
  decksCacheInvalidated: boolean // Flag to force reload
  invalidateDecksCache: () => void // Manually invalidate cache
  shouldReloadDecks: () => boolean // Check if decks need reloading

  // Card state
  cards: Card[]
  setCards: (cards: Card[]) => void
  addCard: (card: Card) => void
  updateCard: (cardId: string, updates: Partial<Card>) => void
  removeCard: (cardId: string) => void

  communityDecks: CommunityDeck[]
  setCommunityDecks: (decks: CommunityDeck[]) => void
  updateCommunityDeck: (deckId: string, updates: Partial<CommunityDeck>) => void

  // Study sessions
  studySessions: StudySession[]
  setStudySessions: (sessions: StudySession[]) => void
  addStudySession: (session: StudySession) => void

  // User stats
  userStats: UserStats | null
  setUserStats: (stats: UserStats) => void

  // User achievements
  userAchievements: UserAchievements | null
  setUserAchievements: (achievements: UserAchievements) => void
  unlockAchievement: (achievementId: string) => void

  // UI state
  currentView: 'landing' | 'login' | 'signup' | 'decks' | 'deck-detail' | 'study' | 'study-options' | 'community' | 'profile' | 'ai-generate' | 'upgrade' | 'all-cards' | 'settings' | 'privacy' | 'terms' | 'contact' | 'notifications'
  currentSection: 'flashcards' | 'community' | 'profile'
  selectedDeckId: string | null
  studyOptions: StudyOptions
  studyAllCards: boolean
  darkMode: boolean
  ttsProvider: 'browser' | 'openai'
  temporaryStudyDeck: TemporaryStudyDeck | null // For studying community decks without adding them
  returnToCommunityDeck: CommunityDeck | null // Track which community deck to return to after studying
  returnToUserDeck: { deck: any; cards: any[]; ownerId: string } | null // Track which user deck to return to after studying
  returnToSharedDeckId: string | null // Track which shared deck to return to after studying
  viewingCommunityDeckId: string | null // Track which community deck to view (for notifications)
  targetCommentId: string | null // Track which comment to scroll to (for notifications)
  targetCardIndex: number | null // Track which card to scroll to (for flags)
  viewingUserId: string | null // Track which user profile to view
  viewingTicketId: string | null // Track which ticket to view (for notifications)
  userProfileReturnView: 'community' | 'profile' | 'superuser' | null // Track where to return after viewing a user profile
  setCurrentView: (view: 'landing' | 'login' | 'signup' | 'decks' | 'deck-detail' | 'study' | 'study-options' | 'community' | 'profile' | 'ai-generate' | 'upgrade' | 'all-cards' | 'settings' | 'privacy' | 'terms' | 'contact' | 'notifications') => void
  setCurrentSection: (section: 'flashcards' | 'community' | 'profile') => void
  setSelectedDeckId: (deckId: string | null) => void
  setStudyOptions: (options: StudyOptions) => void
  setStudyAllCards: (studyAll: boolean) => void
  setDarkMode: (darkMode: boolean) => void
  toggleDarkMode: () => void
  setTTSProvider: (provider: 'browser' | 'openai') => void
  setTemporaryStudyDeck: (deck: TemporaryStudyDeck | null) => void
  setReturnToCommunityDeck: (deck: CommunityDeck | null) => void
  setReturnToUserDeck: (userDeck: { deck: any; cards: any[]; ownerId: string } | null) => void
  setReturnToSharedDeckId: (deckId: string | null) => void
  setViewingCommunityDeckId: (deckId: string | null) => void
  setTargetCommentId: (commentId: string | null) => void
  setTargetCardIndex: (cardIndex: number | null) => void
  setViewingUserId: (userId: string | null) => void
  setViewingTicketId: (ticketId: string | null) => void
  setUserProfileReturnView: (view: 'community' | 'profile' | 'superuser' | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  // Auth state
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => {
    // Invalidate decks cache when setting auth (login)
    // This ensures decks reload when switching users
    set({ 
      user, 
      accessToken, 
      decksCacheInvalidated: true,
      decksLastLoaded: null 
    })
  },
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null
  })),
  logout: () => set({ 
    user: null, 
    accessToken: null, 
    decks: [], 
    cards: [], 
    currentView: 'landing', 
    currentSection: 'flashcards', 
    friends: [],
    decksCacheInvalidated: false,
    decksLastLoaded: null  // Reset cache timestamp on logout
  }),
  
  // Friends state
  friends: [],
  friendRequests: [],
  pendingFriendRequests: [],
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  setPendingFriendRequests: (requests) => set({ pendingFriendRequests: requests }),
  addFriend: (userId) => set((state) => ({ friends: [...state.friends, userId] })),
  removeFriend: (userId) => set((state) => ({ friends: state.friends.filter(id => id !== userId) })),
  addFriendRequest: (userId) => set((state) => ({ 
    friendRequests: state.friendRequests.some(req => req.id === userId) ? state.friendRequests : [...state.friendRequests, {id: userId, name: '', email: ''}] 
  })),
  removeFriendRequest: (userId) => set((state) => ({ 
    friendRequests: state.friendRequests.filter(req => req.id !== userId) 
  })),
  addPendingFriendRequest: (userId) => set((state) => ({ 
    pendingFriendRequests: state.pendingFriendRequests.includes(userId) ? state.pendingFriendRequests : [...state.pendingFriendRequests, userId] 
  })),
  removePendingFriendRequest: (userId) => set((state) => ({ 
    pendingFriendRequests: state.pendingFriendRequests.filter(id => id !== userId) 
  })),

  // Notifications state
  mentionNotifications: [],
  setMentionNotifications: (notifications) => set({ mentionNotifications: notifications }),
  removeMentionNotification: (notificationId) => set((state) => ({
    mentionNotifications: state.mentionNotifications.filter(notification => notification.id !== notificationId)
  })),
  clearAllMentionNotifications: () => set({ mentionNotifications: [] }),

  // Deck state
  decks: [],
  setDecks: (decks) => set({ decks, decksLastLoaded: Date.now(), decksCacheInvalidated: false }),
  addDeck: (deck) => set((state) => ({ decks: [...state.decks, deck], decksCacheInvalidated: true })),
  updateDeck: (deckId, updates) =>
    set((state) => ({
      decks: state.decks.map((deck) =>
        deck.id === deckId ? { ...deck, ...updates } : deck
      ),
      decksCacheInvalidated: true
    })),
  removeDeck: (deckId) =>
    set((state) => ({
      decks: state.decks.filter((deck) => deck.id !== deckId),
      decksCacheInvalidated: true
    })),
  decksLastLoaded: null,
  decksCacheInvalidated: false,
  invalidateDecksCache: () => set({ decksCacheInvalidated: true }),
  shouldReloadDecks: () => {
    const state = get()
    // Force reload if cache was invalidated
    if (state.decksCacheInvalidated) {
      return true
    }
    // Reload if never loaded
    if (!state.decksLastLoaded) {
      return true
    }
    // Reload if cache is older than 5 minutes (300000ms)
    const cacheAge = Date.now() - state.decksLastLoaded
    return cacheAge > 300000
  },

  // Card state
  cards: [],
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, ...updates } : card
      ),
    })),
  removeCard: (cardId) =>
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== cardId),
    })),

  communityDecks: [],
  setCommunityDecks: (decks) => set({ communityDecks: decks }),
  updateCommunityDeck: (deckId, updates) =>
    set((state) => ({
      communityDecks: state.communityDecks.map((deck) =>
        deck.id === deckId ? { ...deck, ...updates } : deck
      ),
    })),

  // Study sessions
  studySessions: [],
  setStudySessions: (sessions) => set({ studySessions: sessions }),
  addStudySession: (session) => {
    set((state) => ({ studySessions: [...state.studySessions, session] }))
    
    // Persist to backend
    const state = get()
    if (state.accessToken) {
      fetch(`https://${projectId}.supabase.co/functions/v1/server/study/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({ session })
      })
        .then(response => {
          if (!response.ok) {
            console.error('Failed to save study session to backend')
          }
        })
        .catch(error => {
          console.error('Error saving study session:', error)
        })
    }
  },

  // User stats
  userStats: null,
  setUserStats: (stats) => set({ userStats: stats }),

  // User achievements
  userAchievements: null,
  setUserAchievements: (achievements) => set({ userAchievements: achievements }),
  unlockAchievement: (achievementId) => {
    const state = get()
    const newAchievements = state.userAchievements
      ? {
          ...state.userAchievements,
          unlockedAchievementIds: [...state.userAchievements.unlockedAchievementIds, achievementId],
          // ADD THIS LINE - backend expects this field name:
          unlockedAchievements: [...state.userAchievements.unlockedAchievementIds, achievementId]
        }
      : null

        console.log('💾 [UNLOCK] Achievement ID:', achievementId)
        console.log('💾 [UNLOCK] New achievements object:', newAchievements)
        console.log('💾 [UNLOCK] unlockedAchievementIds:', newAchievements?.unlockedAchievementIds)
        console.log('💾 [UNLOCK] unlockedAchievements:', newAchievements?.unlockedAchievements)
    
    set({ userAchievements: newAchievements })
    
    // Persist to backend
    if (state.accessToken && newAchievements) {
      fetch(`https://${projectId}.supabase.co/functions/v1/server/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({ achievements: newAchievements }),
      })
    }
  },

  // UI state
  currentView: 'landing',
  currentSection: 'flashcards',
  selectedDeckId: null,
  studyOptions: {
    timedMode: false,
    continuousShuffle: false,
    order: 'randomized',
    excludeIgnored: false,
    favoritesOnly: false,
  },
  studyAllCards: false,
  darkMode: typeof window !== 'undefined' && localStorage.getItem('flashy-darkMode') === 'true',
  ttsProvider: 'browser', // Default to browser TTS
  temporaryStudyDeck: null,
  returnToCommunityDeck: null,
  returnToUserDeck: null,
  returnToSharedDeckId: null,
  viewingCommunityDeckId: null,
  targetCommentId: null,
  targetCardIndex: null,
  viewingUserId: null,
  viewingTicketId: null,
  userProfileReturnView: null,
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentSection: (section) => set({ currentSection: section }),
  setSelectedDeckId: (deckId) => set({ selectedDeckId: deckId }),
  setStudyOptions: (options) => set({ studyOptions: options }),
  setStudyAllCards: (studyAll) => set({ studyAllCards: studyAll }),
  setDarkMode: (darkMode) => {
    localStorage.setItem('flashy-darkMode', String(darkMode))
    set({ darkMode })
  },
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode
    localStorage.setItem('flashy-darkMode', String(newDarkMode))
    return { darkMode: newDarkMode }
  }),
  setTTSProvider: (provider) => set({ ttsProvider: provider }),
  setTemporaryStudyDeck: (deck) => set({ temporaryStudyDeck: deck }),
  setReturnToCommunityDeck: (deck) => set({ returnToCommunityDeck: deck }),
  setReturnToUserDeck: (userDeck) => set({ returnToUserDeck: userDeck }),
  setReturnToSharedDeckId: (deckId) => set({ returnToSharedDeckId: deckId }),
  setViewingCommunityDeckId: (deckId) => set({ viewingCommunityDeckId: deckId }),
  setTargetCommentId: (commentId) => set({ targetCommentId: commentId }),
  setTargetCardIndex: (cardIndex) => set({ targetCardIndex: cardIndex }),
  setViewingUserId: (userId) => set({ viewingUserId: userId }),
  setViewingTicketId: (ticketId) => set({ viewingTicketId: ticketId }),
  setUserProfileReturnView: (view) => set({ userProfileReturnView: view }),
}))