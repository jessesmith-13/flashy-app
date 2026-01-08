import { create } from 'zustand'
import { projectId } from '../utils/supabase/info'
import { fetchUserAchievements } from '../utils/api/achievements'
import { UIDeck, UICard } from '../src/types/decks'
import { UICommunityDeck } from '@/types/community'
import { CommunityDeck } from '@/types/community'
import { StudyOptions, StudySession, TemporaryStudyDeck } from '@/types/study'
import { UserStats, UserAchievements } from '@/types/users'
import { FriendRequest } from '@/types/friends'
import { Notification } from '@/types/notifications'
import { User } from '@/types/users'

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
  decks: UIDeck[]
  setDecks: (decks: UIDeck[]) => void
  addDeck: (deck: UIDeck) => void
  updateDeck: (deckId: string, updates: Partial<UIDeck>) => void
  removeDeck: (deckId: string) => void
  decksLastLoaded: number | null // Timestamp when decks were last loaded
  decksCacheInvalidated: boolean // Flag to force reload
  invalidateDecksCache: () => void // Manually invalidate cache
  shouldReloadDecks: () => boolean // Check if decks need reloading

  // Card state
  cards: UICard[]
  setCards: (cards: UICard[]) => void
  addCard: (card: UICard) => void
  updateCard: (cardId: string, updates: Partial<UICard>) => void
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
  fetchUserAchievements: () => Promise<void>

  // UI state
  currentView: 'landing' | 'login' | 'signup' | 'decks' | 'deck-detail' | 'study' | 'study-options' | 'community' | 'profile' | 'ai-generate' | 'upgrade' | 'all-cards' | 'settings' | 'privacy' | 'terms' | 'contact' | 'notifications'
  currentSection: 'flashcards' | 'community' | 'profile'
  selectedDeckId: string | null
  studyOptions: StudyOptions
  studyAllCards: boolean
  darkMode: boolean
  ttsProvider: 'browser' | 'openai'
  temporaryStudyDeck: TemporaryStudyDeck | null // For studying community decks without adding them
  returnToCommunityDeck: UICommunityDeck | null // Track which community deck to return to after studying
  returnToUserDeck: { deck: UICommunityDeck; cards: UICard[]; ownerId: string } | null // Track which user deck to return to after studying
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
  setReturnToCommunityDeck: (deck: UICommunityDeck | null) => void
  setReturnToUserDeck: (userDeck: { deck: UICommunityDeck; cards: UICard[]; ownerId: string } | null) => void
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
    set({ 
      user, 
      accessToken, 
      decksCacheInvalidated: true,
      decksLastLoaded: null 
    })
    
    // ✅ Fetch achievements on login
    if (user && accessToken) {
      get().fetchUserAchievements()
    }
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
  updateDeck: (deckId, updates) => {
    console.log('🔧 updateDeck called:', { deckId, updates })
    
    set((state) => {
      console.log('   Current deck count:', state.decks.find(d => d.id === deckId)?.cardCount)
      
      const newDecks = state.decks.map((deck) =>
        deck.id === deckId ? { ...deck, ...updates } : deck
      )
      
      console.log('   New deck count:', newDecks.find(d => d.id === deckId)?.cardCount)
      
      return {
        decks: newDecks,
        decksCacheInvalidated: true
      }
    })
  },
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
  addStudySession: async (session: StudySession) => {
    set((state) => ({ studySessions: [...state.studySessions, session] }))
    
    const state = get()
    if (state.accessToken) {
      try {
        console.log('📤 Sending study session to backend:', session)
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/study/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.accessToken}`,
          },
          body: JSON.stringify({ session })
        })
        
        if (!response.ok) {
          console.error('Failed to save study session to backend')
          return
        }
        
        const result = await response.json()
        console.log('📥 Backend response:', result)
        
        // ✅ Show toasts for new achievements
        if (result.newAchievements && result.newAchievements.length > 0) {
          const { toast } = await import('sonner')
          
          result.newAchievements.forEach((achievement: { icon: string, title: string, description: string} ) => {
            toast.success(`🎉 ${achievement.icon} ${achievement.title}!`, {
              description: achievement.description
            })
          })
        }
        
        // ✅ FETCH fresh achievements from backend (source of truth!)
        const achievementsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/achievements`,
          {
            headers: { Authorization: `Bearer ${state.accessToken}` }
          }
        )
        
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json()
          console.log('✅ Fresh achievements from DB:', achievementsData)
          
          if (achievementsData.achievements) {
            set({ userAchievements: achievementsData.achievements })
          }
        }
        
        // ✅ Log achievement stats
        if (result.achievementStats) {
          console.log('🔥 Achievement stats:', result.achievementStats)
        }
      } catch (error) {
        console.error('Error saving study session:', error)
      }
    }
  },

  // User stats
  userStats: null,
  setUserStats: (stats) => set({ userStats: stats }),

  // User achievements
  userAchievements: null,
  setUserAchievements: (achievements) => set({ userAchievements: achievements }),
  fetchUserAchievements: async () => {
  const state = get()
  
  if (!state.accessToken) {
    console.log('⚠️ No access token, skipping achievement fetch')
    return
  }
  
  try {
    const achievements = await fetchUserAchievements(state.accessToken)
    
    if (achievements) {
      console.log('✅ Synced achievements to store:', achievements)
      set({ userAchievements: achievements })
    } else {
      console.error('❌ Failed to fetch achievements, using defaults')
      // Set defaults if fetch failed
      set({
        userAchievements: {
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
          studiedInDarkMode: false,
        }
      })
    }
  } catch (error) {
    console.error('❌ Error fetching achievements:', error)
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