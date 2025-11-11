import { create } from 'zustand'
export type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

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
  // For multiple-choice card type
  options?: string[]  // Array of incorrect options
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
  sourceCommunityDeckId?: string  // Track which community deck this was imported from
  communityPublishedId?: string   // Track which community deck ID this deck was published as
  communityDeckVersion?: number   // Track version of imported community deck
}

export interface CommunityDeck  extends Deck {
  featured: boolean
  downloads: number
  publishedAt: string
  updatedAt: string
  authorId: string
  author: string
  cards: Card[]
  version: number
}

export interface DeckRating {
  averageRating: number
  totalRatings: number
  userRating: number | null
}

export interface StudyOptions {
  timedMode: boolean
  continuousShuffle: boolean
  order: 'randomized' | 'linear'
  excludeIgnored: boolean
  favoritesOnly: boolean
}

export interface StudySession {
  id: string
  deckId: string
  date: string
  correctAnswers: number
  totalQuestions: number
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
  studiedBeforeEightAM: boolean
  studiedAfterMidnight: boolean
  studiedSixtyMinutesNonstop: boolean
  studiedThreeHoursInOneDay: boolean
  flippedCardFiveTimes: boolean
  studiedOnLowBattery: boolean
  studiedInDarkMode: boolean
  slowCardReview: boolean
}

export type SubscriptionTier = 'free' | 'monthly' | 'annual' | 'lifetime'

interface User {
  id: string
  email: string
  name: string
  displayName?: string
  avatarUrl?: string
  decksPublic?: boolean
  subscriptionTier?: SubscriptionTier
  subscriptionExpiry?: string // For monthly/annual subscriptions
  isSuperuser?: boolean // Superuser role for "Flashy" admin account
  isBanned?: boolean // User ban status (managed by superuser)
}

export interface AppState {
  // Auth state
  user: User | null
  accessToken: string | null
  setAuth: (user: User | null, accessToken: string | null) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
  
  // Friends state
  friends: string[]
  friendRequests: string[] // User IDs who sent friend requests to me
  pendingFriendRequests: string[] // User IDs I sent friend requests to
  setFriends: (friends: string[]) => void
  setFriendRequests: (requests: string[]) => void
  setPendingFriendRequests: (requests: string[]) => void
  addFriend: (userId: string) => void
  removeFriend: (userId: string) => void
  addFriendRequest: (userId: string) => void
  removeFriendRequest: (userId: string) => void
  addPendingFriendRequest: (userId: string) => void
  removePendingFriendRequest: (userId: string) => void

  // Notifications state
  mentionNotifications: any[]
  setMentionNotifications: (notifications: any[]) => void
  removeMentionNotification: (notificationId: string) => void
  clearAllMentionNotifications: () => void

  // Deck state
  decks: Deck[]
  setDecks: (decks: Deck[]) => void
  addDeck: (deck: Deck) => void
  updateDeck: (deckId: string, updates: Partial<Deck>) => void
  removeDeck: (deckId: string) => void

  // Card state
  cards: Card[]
  setCards: (cards: Card[]) => void
  addCard: (card: Card) => void
  updateCard: (cardId: string, updates: Partial<Card>) => void
  removeCard: (cardId: string) => void

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
  currentView: 'landing' | 'login' | 'signup' | 'decks' | 'deck-detail' | 'study' | 'study-options' | 'community' | 'profile' | 'ai-generate' | 'upgrade' | 'all-cards' | 'settings' | 'privacy' | 'terms' | 'contact'
  currentSection: 'flashcards' | 'community' | 'profile'
  selectedDeckId: string | null
  studyOptions: StudyOptions
  studyAllCards: boolean
  darkMode: boolean
  temporaryStudyDeck: { deck: any; cards: Card[] } | null // For studying community decks without adding them
  returnToCommunityDeck: any | null // Track which community deck to return to after studying
  setCurrentView: (view: 'landing' | 'login' | 'signup' | 'decks' | 'deck-detail' | 'study' | 'study-options' | 'community' | 'profile' | 'ai-generate' | 'upgrade' | 'all-cards' | 'settings' | 'privacy' | 'terms' | 'contact') => void
  setCurrentSection: (section: 'flashcards' | 'community' | 'profile') => void
  setSelectedDeckId: (deckId: string | null) => void
  setStudyOptions: (options: StudyOptions) => void
  setStudyAllCards: (studyAll: boolean) => void
  setDarkMode: (darkMode: boolean) => void
  toggleDarkMode: () => void
  setTemporaryStudyDeck: (deck: { deck: any; cards: Card[] } | null) => void
  setReturnToCommunityDeck: (deck: any | null) => void
}

export const useStore = create<AppState>((set) => ({
  // Auth state
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null
  })),
  logout: () => set({ user: null, accessToken: null, decks: [], cards: [], currentView: 'landing', currentSection: 'flashcards', friends: [] }),
  
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
    friendRequests: state.friendRequests.includes(userId) ? state.friendRequests : [...state.friendRequests, userId] 
  })),
  removeFriendRequest: (userId) => set((state) => ({ 
    friendRequests: state.friendRequests.filter(id => id !== userId) 
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
  setDecks: (decks) => set({ decks }),
  addDeck: (deck) => set((state) => ({ decks: [...state.decks, deck] })),
  updateDeck: (deckId, updates) =>
    set((state) => ({
      decks: state.decks.map((deck) =>
        deck.id === deckId ? { ...deck, ...updates } : deck
      ),
    })),
  removeDeck: (deckId) =>
    set((state) => ({
      decks: state.decks.filter((deck) => deck.id !== deckId),
    })),

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

  // Study sessions
  studySessions: [],
  setStudySessions: (sessions) => set({ studySessions: sessions }),
  addStudySession: (session) => set((state) => ({ studySessions: [...state.studySessions, session] })),

  // User stats
  userStats: null,
  setUserStats: (stats) => set({ userStats: stats }),

  // User achievements
  userAchievements: null,
  setUserAchievements: (achievements) => set({ userAchievements: achievements }),
  unlockAchievement: (achievementId) => 
    set((state) => ({
      userAchievements: state.userAchievements
        ? {
            ...state.userAchievements,
            unlockedAchievementIds: [...state.userAchievements.unlockedAchievementIds, achievementId]
          }
        : null
    })),

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
  darkMode: false,
  temporaryStudyDeck: null,
  returnToCommunityDeck: null,
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentSection: (section) => set({ currentSection: section }),
  setSelectedDeckId: (deckId) => set({ selectedDeckId: deckId }),
  setStudyOptions: (options) => set({ studyOptions: options }),
  setStudyAllCards: (studyAll) => set({ studyAllCards: studyAll }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setTemporaryStudyDeck: (deck) => set({ temporaryStudyDeck: deck }),
  setReturnToCommunityDeck: (deck) => set({ returnToCommunityDeck: deck }),
}))