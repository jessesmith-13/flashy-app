import { projectId, publicAnonKey } from './supabase/info'
import { createClient } from '@supabase/supabase-js'

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a1502a9`

export const supabaseClient = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

// Auth API
export const signUp = async (email: string, password: string, name: string) => {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ email, password, name }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Sign up failed')
  }

  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Check if user is banned
  if (data.user?.user_metadata?.isBanned === true) {
    const banReason = data.user?.user_metadata?.banReason || ''
    console.log('=== USER BANNED ===')
    console.log('User attempted to sign in but account is banned')
    console.log('Ban Reason:', banReason || 'No reason provided')
    console.log('Please contact support for more information.')
    console.log('==================')
    
    // Sign out immediately
    await supabaseClient.auth.signOut()
    
    // Throw error with special prefix so UI can detect it
    const error = new Error(`Your account has been banned. Please contact support for more information.`)
    error.name = 'ACCOUNT_BANNED'
    ;(error as any).banReason = banReason
    throw error
  }

  return data
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const signOut = async () => {
  try {
    const { error } = await supabaseClient.auth.signOut()
    if (error && error.message !== 'Auth session missing!') throw error
  } catch (err) {
    console.warn('Supabase signOut warning:', err)
  }
}

export const getSession = async () => {
  try {
    const { data, error } = await supabaseClient.auth.getSession()
    
    if (error) {
      // Don't throw for missing/invalid refresh tokens - just return null
      // This is normal for logged out users or expired sessions
      if (error.message.includes('Refresh Token') || error.message.includes('Auth session missing')) {
        console.log('No active session found')
      } else {
        console.log('Session check error:', error.message)
      }
      return null
    }

    return data.session
  } catch (err) {
    // Catch any unexpected errors
    console.log('Session check failed:', err)
    return null
  }
}

// Deck API
export const fetchDecks = async (accessToken: string) => {
  try {
    console.log('=== FETCH DECKS START ===')
    console.log('API Base URL:', API_BASE)
    console.log('Full URL:', `${API_BASE}/decks`)
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...')
    
    const response = await fetch(`${API_BASE}/decks`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    let data
    try {
      const text = await response.text()
      console.log('Response text:', text)
      data = JSON.parse(text)
      console.log('Parsed data:', data)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Server returned invalid JSON')
    }
    
    if (!response.ok) {
      console.error('Response not OK - Status:', response.status, 'Error:', data.error)
      throw new Error(data.error || `Server error: ${response.status}`)
    }

    console.log('Decks fetched successfully:', data.decks?.length || 0, 'decks')
    console.log('=== FETCH DECKS END ===')
    return data.decks || []
  } catch (error) {
    console.error('=== FETCH DECKS ERROR ===')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

export const createDeck = async (
  accessToken: string,
  deck: { name: string; color?: string; emoji?: string; deckType?: string; category?: string; subtopic?: string; difficulty?: string; frontLanguage?: string; backLanguage?: string }
) => {
  const response = await fetch(`${API_BASE}/decks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(deck),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create deck:', data.error)
    throw new Error(data.error || 'Failed to create deck')
  }

  return data.deck
}

export const updateDeck = async (
  accessToken: string,
  deckId: string,
  updates: Partial<{ name: string; color: string; emoji: string; deckType: string; favorite: boolean; learned: boolean; category: string; subtopic: string; difficulty: string; frontLanguage: string; backLanguage: string }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update deck:', data.error)
    throw new Error(data.error || 'Failed to update deck')
  }

  return data.deck
}

export const updateDeckPositions = async (
  accessToken: string,
  positions: { id: string; position: number }[]
) => {
  const response = await fetch(`${API_BASE}/decks/positions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update deck positions:', data.error)
    throw new Error(data.error || 'Failed to update deck positions')
  }

  return data
}

export const updateCardPositions = async (
  accessToken: string,
  deckId: string,
  positions: { id: string; position: number }[]
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/positions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ positions }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update card positions:', data.error)
    throw new Error(data.error || 'Failed to update card positions')
  }

  return data
}

export const publishDeck = async (
  accessToken: string,
  deckId: string,
  publishData: { category: string; subtopic: string }
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(publishData),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to publish deck:', data.error)
    throw new Error(data.error || 'Failed to publish deck')
  }

  return data
}

export const unpublishDeck = async (
  accessToken: string,
  communityDeckId: string
) => {
  const response = await fetch(`${API_BASE}/decks/${communityDeckId}/unpublish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to unpublish deck:', data.error)
    throw new Error(data.error || 'Failed to unpublish deck')
  }

  return data
}

// Card API
export const fetchCards = async (accessToken: string, deckId: string) => {
  try {
    console.log('=== FETCH CARDS START ===')
    console.log('Deck ID:', deckId)
    console.log('Full URL:', `${API_BASE}/decks/${deckId}/cards`)
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...')
    
    const response = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
    let data
    try {
      const text = await response.text()
      console.log('Response text:', text)
      data = JSON.parse(text)
      console.log('Parsed data:', data)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Server returned invalid JSON')
    }
    
    if (!response.ok) {
      console.error('Response not OK - Status:', response.status, 'DeckId:', deckId, 'Error:', data.error)
      throw new Error(data.error || `Server error: ${response.status}`)
    }

    console.log('Cards fetched successfully:', data.cards?.length || 0, 'cards')
    console.log('=== FETCH CARDS END ===')
    return data.cards || []
  } catch (error) {
    console.error('=== FETCH CARDS ERROR ===')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

export const createCard = async (
  accessToken: string,
  deckId: string,
  card: { front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[]; frontImageUrl?: string; backImageUrl?: string; frontAudio?: string; backAudio?: string }
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(card),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create card:', data.error)
    throw new Error(data.error || 'Failed to create card')
  }

  return data.card
}

export const createCardsBatch = async (
  accessToken: string,
  deckId: string,
  cards: Array<{ front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[]; frontImageUrl?: string; backImageUrl?: string; frontAudio?: string; backAudio?: string }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cards }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create cards batch:', data.error)
    throw new Error(data.error || 'Failed to create cards')
  }

  return data.cards
}

export const updateCard = async (
  accessToken: string,
  deckId: string,
  cardId: string,
  updates: Partial<{ front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[]; favorite?: boolean; ignored?: boolean; frontImageUrl?: string; backImageUrl?: string; frontAudio?: string; backAudio?: string }>
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update card:', data.error)
    throw new Error(data.error || 'Failed to update card')
  }

  return data.card
}

// User Profile API
export const updateProfile = async (
  accessToken: string,
  updates: { displayName?: string; avatarUrl?: string; decksPublic?: boolean; subscriptionTier?: string; subscriptionExpiry?: string; isSuperuser?: boolean }
) => {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update profile:', data.error)
    throw new Error(data.error || 'Failed to update profile')
  }

  return data.user
}

export const recordTermsAcceptance = async (
  accessToken: string,
  termsAcceptedAt: string
) => {
  const response = await fetch(`${API_BASE}/record-terms-acceptance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ termsAcceptedAt }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to record terms acceptance:', data.error)
    throw new Error(data.error || 'Failed to record terms acceptance')
  }

  return data
}

export const uploadAvatar = async (
  accessToken: string,
  file: File
) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload-avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to upload avatar:', data.error)
    throw new Error(data.error || 'Failed to upload avatar')
  }

  return data.url
}

export const uploadCardImage = async (
  accessToken: string,
  file: File
) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload-card-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to upload card image:', data.error)
    throw new Error(data.error || 'Failed to upload card image')
  }

  return data.url
}

export const uploadCardAudio = async (file: File) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload-card-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to upload card audio:', data.error)
    throw new Error(data.error || 'Failed to upload card audio')
  }

  return data.url
}

export const getUserProfile = async (userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch user profile:', data.error)
    throw new Error(data.error || 'Failed to fetch user profile')
  }

  return data.user
}

// Get a specific user's deck (read-only)
export const getUserDeck = async (
  accessToken: string,
  userId: string,
  deckId: string
) => {
  const response = await fetch(`${API_BASE}/users/${userId}/decks/${deckId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch user deck:', data.error)
    throw new Error(data.error || 'Failed to fetch user deck')
  }

  return data
}

// Friend API
export const sendFriendRequest = async (accessToken: string, friendId: string) => {
  const response = await fetch(`${API_BASE}/friends/request/${friendId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to send friend request:', data.error)
    throw new Error(data.error || 'Failed to send friend request')
  }

  return data
}

export const acceptFriendRequest = async (accessToken: string, requestId: string) => {
  const response = await fetch(`${API_BASE}/friends/accept/${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to accept friend request:', data.error)
    throw new Error(data.error || 'Failed to accept friend request')
  }

  return data
}

export const declineFriendRequest = async (accessToken: string, requestId: string) => {
  const response = await fetch(`${API_BASE}/friends/decline/${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to decline friend request:', data.error)
    throw new Error(data.error || 'Failed to decline friend request')
  }

  return data
}

export const removeFriend = async (accessToken: string, friendId: string) => {
  const response = await fetch(`${API_BASE}/friends/${friendId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to remove friend:', data.error)
    throw new Error(data.error || 'Failed to remove friend')
  }

  return data
}

// Study Sessions API
export const fetchStudySessions = async (accessToken: string) => {
  try {
    const response = await fetch(`${API_BASE}/study-sessions`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Failed to fetch study sessions:', data.error)
      throw new Error(data.error || 'Failed to fetch study sessions')
    }

    return data.sessions || []
  } catch (error) {
    console.error('Error fetching study sessions:', error)
    throw error
  }
}

export const getFriendRequests = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/friends/requests`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    // Silently fail for unauthorized errors (logged out users)
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    console.error('Failed to fetch friend requests:', data.error)
    throw new Error(data.error || 'Failed to fetch friend requests')
  }

  return data.requests
}

export const getFriends = async (accessToken: string) => {
  console.log('getFriends API call - URL:', `${API_BASE}/friends`)
  console.log('getFriends API call - accessToken exists:', !!accessToken)
  
  const response = await fetch(`${API_BASE}/friends`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  console.log('getFriends API call - response status:', response.status)
  console.log('getFriends API call - response ok:', response.ok)
  
  const data = await response.json()
  console.log('getFriends API call - response data:', data)
  
  if (!response.ok) {
    // Silently fail for unauthorized errors (logged out users)
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    console.error('Failed to fetch friends:', data.error)
    throw new Error(data.error || 'Failed to fetch friends')
  }

  console.log('getFriends API call - returning data.friends:', data.friends)
  return data.friends
}

// Ban/unban a user (Superuser only)
export const banUser = async (accessToken: string, userId: string, banned: boolean, reason?: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/ban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isBanned: banned, reason }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to ban/unban user:', data.error)
    throw new Error(data.error || 'Failed to ban/unban user')
  }

  return data
}

// Toggle moderator status (Superuser only)
export const toggleModeratorStatus = async (accessToken: string, userId: string, isModerator: boolean) => {
  const response = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isModerator }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to toggle moderator status:', data.error)
    throw new Error(data.error || 'Failed to toggle moderator status')
  }

  return data
}

// Manual premium upgrade (Superuser only)
export const grantPremium = async (accessToken: string, userId: string, reason: string, tier: string, customReason?: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/premium`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason, tier, customReason }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to grant premium:', data.error)
    throw new Error(data.error || 'Failed to grant premium')
  }

  return data
}

// Demote premium user to free (Superuser only)
export const demotePremium = async (accessToken: string, userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/demote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to demote user:', data.error)
    throw new Error(data.error || 'Failed to demote user')
  }

  return data
}

// Get all users (Superuser only)
export const getAllUsers = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get all users:', data.error)
    throw new Error(data.error || 'Failed to get all users')
  }

  return data.users
}

// Get user activity history (Superuser only)
export const getUserActivity = async (accessToken: string, userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/activity`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get user activity:', data.error)
    throw new Error(data.error || 'Failed to get user activity')
  }

  return data
}

// Get user's friends list
export const getUserFriends = async (accessToken: string, userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/friends`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch user friends:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      url: `${API_BASE}/users/${userId}/friends`
    })
    throw new Error(data.error || 'Failed to fetch user friends')
  }

  return data.friends
}

// Community API
export const addDeckFromCommunity = async (
  accessToken: string,
  communityDeck: { communityDeckId: string; name: string; color: string; emoji: string; cards: { front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[] }[]; category?: string; subtopic?: string; version?: number }
) => {
  const response = await fetch(`${API_BASE}/community/add-deck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(communityDeck),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to add deck from community:', data.error)
    throw new Error(data.error || 'Failed to add deck from community')
  }

  return data.deck
}

export const publishDeckToCommunity = async (
  accessToken: string,
  deckData: { deckId: string; category: string; subtopic: string }
) => {
  const response = await fetch(`${API_BASE}/community/publish-deck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(deckData),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to publish deck to community:', data.error)
    throw new Error(data.error || 'Failed to publish deck to community')
  }

  return data
}

export const updateCommunityDeck = async (
  accessToken: string,
  communityDeckId: string,
  updates: { name: string; emoji: string; color: string; category?: string; subtopic?: string; difficulty?: string; cards: any[] }
) => {
  const response = await fetch(`${API_BASE}/community/decks/${communityDeckId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update community deck:', data.error)
    throw new Error(data.error || 'Failed to update community deck')
  }

  return data
}

export const deleteCommunityDeck = async (
  accessToken: string,
  communityDeckId: string,
  reason: string
) => {
  const response = await fetch(`${API_BASE}/community/decks/${communityDeckId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete community deck:', data.error)
    throw new Error(data.error || 'Failed to delete community deck')
  }

  return data
}

export const deleteCommunityCard = async (
  accessToken: string,
  communityDeckId: string,
  cardId: string,
  reason: string
) => {
  const response = await fetch(`${API_BASE}/community/decks/${communityDeckId}/cards/${cardId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete community card:', data.error)
    throw new Error(data.error || 'Failed to delete community card')
  }

  return data
}

export const toggleCommunityDeckFeatured = async (
  accessToken: string,
  communityDeckId: string
) => {
  const response = await fetch(`${API_BASE}/community/decks/${communityDeckId}/featured`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to toggle featured status:', data.error)
    throw new Error(data.error || 'Failed to toggle featured status')
  }

  return data
}

export const fetchCommunityDecks = async () => {
  const response = await fetch(`${API_BASE}/community/decks`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch community decks:', data.error)
    throw new Error(data.error || 'Failed to fetch community decks')
  }

  return data.decks || []
}

export const getCommunityDeck = async (deckId: string) => {
  const response = await fetch(`${API_BASE}/community/decks/${deckId}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch community deck:', data.error)
    return null
  }

  return data.deck || null
}

export const fetchFeaturedCommunityDecks = async () => {
  const response = await fetch(`${API_BASE}/community/decks/featured`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch featured community decks:', data.error)
    throw new Error(data.error || 'Failed to fetch featured community decks')
  }

  return data.decks || []
}

export const fetchDownloadCounts = async (deckIds: string[]) => {
  const response = await fetch(`${API_BASE}/community/downloads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ deckIds }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch download counts:', data.error)
    throw new Error(data.error || 'Failed to fetch download counts')
  }

  return data.downloads || {}
}

export const updateImportedDeck = async (
  accessToken: string,
  deckId: string,
  communityDeckData: { name: string; color: string; emoji: string; cards: any[]; category?: string; subtopic?: string; version: number }
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/update-from-community`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(communityDeckData),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update imported deck:', data.error)
    throw new Error(data.error || 'Failed to update imported deck')
  }

  return data.deck
}

export const searchCommunityUsers = async (query: string) => {
  const response = await fetch(`${API_BASE}/community/users/search?q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to search community users:', data.error)
    throw new Error(data.error || 'Failed to search users')
  }

  return data.users || []
}

// Ratings API
export const rateDeck = async (
  accessToken: string,
  deckId: string,
  rating: number
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ rating }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to rate deck:', data.error)
    throw new Error(data.error || 'Failed to rate deck')
  }

  return data
}

export const getDeckRatings = async (deckId: string, accessToken?: string) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/ratings`, {
    headers: {
      Authorization: `Bearer ${accessToken || publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch ratings:', data.error)
    throw new Error(data.error || 'Failed to fetch ratings')
  }

  return data
}

// Comments API
export const getDeckComments = async (deckId: string) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/comments`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch comments:', data.error)
    throw new Error(data.error || 'Failed to fetch comments')
  }

  return data.comments || []
}

export const postDeckComment = async (
  accessToken: string,
  deckId: string,
  text: string,
  parentId?: string
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, parentId }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to post comment:', data.error)
    throw new Error(data.error || 'Failed to post comment')
  }

  return data.comment
}

// Delete a comment (Moderator/Superuser only)
export const deleteDeckComment = async (
  accessToken: string,
  deckId: string,
  commentId: string,
  reason: string
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete comment:', data.error)
    throw new Error(data.error || 'Failed to delete comment')
  }

  return data
}

// Like/unlike a comment
export const likeComment = async (
  accessToken: string,
  deckId: string,
  commentId: string
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to like comment:', data.error)
    throw new Error(data.error || 'Failed to like comment')
  }

  return data
}

// Delete a deck (Superuser only)
export const deleteDeck = async (
  accessToken: string,
  deckId: string,
  reason?: string
) => {
  const body = reason ? { reason } : undefined
  
  const response = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete deck:', data.error)
    throw new Error(data.error || 'Failed to delete deck')
  }

  return data
}

// Delete a card (Superuser only)
export const deleteCard = async (
  accessToken: string,
  deckId: string,
  cardId: string,
  reason?: string
) => {
  const body = reason ? { reason } : undefined
  
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete card:', data.error)
    throw new Error(data.error || 'Failed to delete card')
  }

  return data
}

// Get deleted items (Superuser only)
export const getDeletedItems = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/deleted-items`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch deleted items:', data.error)
    throw new Error(data.error || 'Failed to fetch deleted items')
  }

  return data
}

// Restore a deleted item (Superuser only)
export const restoreDeletedItem = async (
  accessToken: string,
  itemId: string,
  itemType: 'comment' | 'deck' | 'card'
) => {
  const response = await fetch(`${API_BASE}/deleted-items/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ itemId, itemType }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to restore item:', data.error)
    throw new Error(data.error || 'Failed to restore item')
  }

  return data
}

// Notifications API
export const getNotifications = async (accessToken: string) => {
  try {
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    // Try to parse JSON response
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      throw new Error('Invalid response from server')
    }
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch notifications')
    }

    return data.notifications || []
  } catch (error) {
    // Re-throw to let the caller handle it silently
    throw error
  }
}

export const markNotificationRead = async (accessToken: string, notificationId: string) => {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to mark notification as read:', data.error)
    throw new Error(data.error || 'Failed to mark notification as read')
  }

  return data
}

export const markAllNotificationsSeen = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/notifications/mark-seen`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to mark notifications as seen:', data.error)
    throw new Error(data.error || 'Failed to mark notifications as seen')
  }

  return data
}

export const clearAllNotifications = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/notifications`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to clear notifications:', data.error)
    throw new Error(data.error || 'Failed to clear notifications')
  }

  return data
}

// Share API
export const createShareLink = async (
  accessToken: string,
  deckId: string,
  isCommunityDeck: boolean
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isCommunityDeck }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create share link:', data.error)
    throw new Error(data.error || 'Failed to create share link')
  }

  return data
}

export const getSharedDeck = async (shareId: string) => {
  console.log('getSharedDeck - Making request for shareId:', shareId)
  console.log('getSharedDeck - API_BASE:', API_BASE)
  
  const response = await fetch(`${API_BASE}/shared/${shareId}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  console.log('getSharedDeck - Response status:', response.status)
  const data = await response.json()
  console.log('getSharedDeck - Response data:', data)
  
  if (!response.ok) {
    console.error('Failed to get shared deck:', data.error)
    throw new Error(data.error || 'Failed to get shared deck')
  }

  return data.sharedDeck
}

// Flag/Report API
export const createFlag = async (
  accessToken: string,
  flagData: {
    targetType: 'deck' | 'user' | 'comment' | 'card'
    targetId: string
    reason: 'inappropriate' | 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other'
    notes?: string
    targetDetails?: any // Additional context like deckId for cards/comments
  }
) => {
  const response = await fetch(`${API_BASE}/flags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(flagData)
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create flag:', data.error)
    throw new Error(data.error || 'Failed to create flag')
  }

  return data
}

export const getFlags = async (
  accessToken: string,
  filters?: {
    status?: 'open' | 'reviewing' | 'resolved'
    targetType?: 'deck' | 'user' | 'comment' | 'card'
    flashy?: boolean
    isEscalated?: boolean
  }
) => {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.targetType) params.append('targetType', filters.targetType)
  if (filters?.flashy) params.append('flashy', 'true')
  if (filters?.isEscalated) params.append('escalated', 'true')
  
  const response = await fetch(`${API_BASE}/flags?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to fetch flags:', data.error)
    throw new Error(data.error || 'Failed to fetch flags')
  }

  return data.flags || []
}

export const updateFlagStatus = async (
  accessToken: string,
  flagId: string,
  status: 'open' | 'reviewing' | 'resolved',
  resolutionReason?: 'approved' | 'rejected' | 'removed',
  moderatorNotes?: string
) => {
  const response = await fetch(`${API_BASE}/flags/${flagId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ status, resolutionReason, moderatorNotes })
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update flag:', data.error)
    throw new Error(data.error || 'Failed to update flag')
  }

  return data
}

export const escalateFlag = async (
  accessToken: string,
  flagId: string,
  reason: string
) => {
  const response = await fetch(`${API_BASE}/flags/${flagId}/escalate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ escalationReason: reason })
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to escalate flag:', data.error)
    throw new Error(data.error || 'Failed to escalate flag')
  }

  return data
}

export const warnUser = async (
  accessToken: string,
  flagId: string,
  warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }
) => {
  const response = await fetch(`${API_BASE}/warnings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      flagId,
      ...warning
    })
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to warn user:', data.error)
    throw new Error(data.error || 'Failed to warn user')
  }

  return data
}

export const resolveFlag = async (
  accessToken: string,
  flagId: string,
  resolutionReason: 'approved' | 'rejected' | 'removed',
  moderatorNotes: string
) => {
  return updateFlagStatus(accessToken, flagId, 'resolved', resolutionReason, moderatorNotes)
}

// Legacy flag function - kept for backwards compatibility but not recommended
export const flagCommunityItem = async (
  accessToken: string | null,
  flagData: {
    itemType: 'deck' | 'card'
    itemId: string
    reason: string
    details: string
  }
) => {
  // Map old format to new format
  return createFlag(accessToken!, {
    targetType: flagData.itemType === 'deck' ? 'deck' : 'deck', // cards map to decks
    targetId: flagData.itemId,
    reason: 'other',
    notes: `${flagData.reason}: ${flagData.details}`
  })
}

// Ticket System API (for Flag Management)
export const getTicketDetails = async (accessToken: string, ticketId: string) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get ticket details:', data.error)
    throw new Error(data.error || 'Failed to get ticket details')
  }

  return data
}

export const getTicketComments = async (accessToken: string, ticketId: string) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get ticket comments:', data.error)
    throw new Error(data.error || 'Failed to get ticket comments')
  }

  return data
}

export const addTicketComment = async (
  accessToken: string,
  ticketId: string,
  commentData: {
    content: string
    mentions: string[]
  }
) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(commentData),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to add ticket comment:', data.error)
    throw new Error(data.error || 'Failed to add ticket comment')
  }

  return data
}

export const getTicketActions = async (accessToken: string, ticketId: string) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/actions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get ticket actions:', data.error)
    throw new Error(data.error || 'Failed to get ticket actions')
  }

  return data
}

export const updateTicketStatus = async (
  accessToken: string,
  ticketId: string,
  statusData: {
    status: 'pending' | 'under_review' | 'resolved' | 'dismissed'
    resolutionNote?: string
  }
) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(statusData),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to update ticket status:', data.error)
    throw new Error(data.error || 'Failed to update ticket status')
  }

  return data
}

export const assignTicket = async (
  accessToken: string,
  ticketId: string,
  moderatorId: string
) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ moderatorId }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to assign ticket:', data.error)
    throw new Error(data.error || 'Failed to assign ticket')
  }

  return data
}

export const getModerators = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/moderators`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get moderators:', data.error)
    throw new Error(data.error || 'Failed to get moderators')
  }

  return data
}

// AI Generation API
export const generateCardsWithAI = async (
  topic: string, 
  numCards: number, 
  cardTypes: { classicFlip: boolean, multipleChoice: boolean, typeAnswer: boolean } = { classicFlip: true, multipleChoice: false, typeAnswer: false }, 
  includeImages: boolean = false, 
  difficulty: string = 'mixed',
  frontLanguage: string = '',
  backLanguage: string = ''
) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/ai-generate-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ topic, numCards: numCards.toString(), cardTypes, includeImages, difficulty, frontLanguage, backLanguage }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate cards with AI')
  }

  return data
}

export const generateCardsFromCSV = async (
  accessToken: string,
  file: File
): Promise<{ cards: GeneratedCard[] }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE}/ai-generate-csv`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to import CSV')
  }

  return response.json()
}

export const generateCardsFromPDF = async (
  file: File, 
  numCards: number,
  customInstructions?: string,
  cardTypes?: { classicFlip: boolean; multipleChoice: boolean; typeAnswer: boolean },
  frontLanguage?: string,
  backLanguage?: string
) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('numCards', numCards.toString())
  
  if (customInstructions) {
    formData.append('customInstructions', customInstructions)
  }
  
  if (cardTypes) {
    formData.append('cardTypes', JSON.stringify(cardTypes))
  }
  
  if (frontLanguage) {
    formData.append('frontLanguage', frontLanguage)
  }
  
  if (backLanguage) {
    formData.append('backLanguage', backLanguage)
  }

  const response = await fetch(`${API_BASE}/ai-generate-pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  const data = await response.json()
  
  // PDF endpoint returns 501 status with helpful error message
  if (response.status === 501) {
    return data // Return the error message and workaround
  }
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate cards from PDF')
  }

  return data
}

export const translateText = async (
  accessToken: string,
  text: string,
  targetLanguage: string
): Promise<{ translatedText: string }> => {
  const response = await fetch(
    `${API_BASE}/ai-translate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text, targetLanguage }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to translate text')
  }

  return response.json()
}

export const generateTextToSpeech = async (
  accessToken: string,
  text: string,
  language?: string
): Promise<{ audioData: string; format: string }> => {
  const response = await fetch(
    `${API_BASE}/tts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text, language }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to generate speech')
  }

  return response.json()
}

// ==================== REFERRAL API ====================

export const sendReferralInvite = async (
  accessToken: string,
  email: string
): Promise<{ message: string; referralCode: string; referralLink: string; note: string }> => {
  const response = await fetch(
    `${API_BASE}/referrals/invite`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to send referral invite')
  }

  return response.json()
}

export const getReferralStats = async (
  accessToken: string
): Promise<{ totalInvites: number; completedReferrals: number; pendingReferrals: number; invites: any[] }> => {
  const response = await fetch(
    `${API_BASE}/referrals/stats`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to get referral stats')
  }

  return response.json()
}

export const applyReferralCode = async (
  referralCode: string,
  newUserId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(
    `${API_BASE}/referrals/apply`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ referralCode, newUserId }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to apply referral code')
  }

  return response.json()
}

// ==================== STRIPE PAYMENT API ====================

// Create a Stripe Checkout Session
export const createCheckoutSession = async (accessToken: string, planType: 'monthly' | 'annual' | 'lifetime') => {
  const response = await fetch(`${API_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ planType }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create checkout session:', data.error)
    throw new Error(data.error || 'Failed to create checkout session')
  }

  return data.url
}

// Verify payment and upgrade user (fallback if webhook doesn't fire)
export const verifyPayment = async (accessToken: string, sessionId: string) => {
  const response = await fetch(`${API_BASE}/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ sessionId }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to verify payment:', data.error)
    throw new Error(data.error || 'Failed to verify payment')
  }

  return data
}

// Create a Stripe Customer Portal Session (for managing subscriptions)
export const createPortalSession = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/create-portal-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to create portal session:', data.error)
    throw new Error(data.error || 'Failed to create portal session')
  }

  return data.url
}

// Cancel subscription
export const cancelSubscription = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/cancel-subscription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to cancel subscription:', data.error)
    throw new Error(data.error || 'Failed to cancel subscription')
  }

  return data
}

// Change subscription plan
export const changeSubscriptionPlan = async (accessToken: string, newPlan: 'monthly' | 'annual' | 'lifetime') => {
  const response = await fetch(`${API_BASE}/change-subscription-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ newPlan }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to change subscription plan:', data.error)
    throw new Error(data.error || 'Failed to change subscription plan')
  }

  return data
}