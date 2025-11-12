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
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const signOut = async () => {
  const { error } = await supabaseClient.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

export const getSession = async () => {
  const { data, error } = await supabaseClient.auth.getSession()
  
  if (error) {
    // Don't throw for missing/invalid refresh tokens - just return null
    console.log('Session check error (this is normal for logged out users):', error.message)
    return null
  }

  return data.session
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
  deck: { name: string; color?: string; emoji?: string; deckType?: string; category?: string; subtopic?: string }
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
  updates: Partial<{ name: string; color: string; emoji: string; deckType: string; favorite: boolean; learned: boolean; category: string; subtopic: string }>
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

export const deleteDeck = async (accessToken: string, deckId: string) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete deck:', data.error)
    throw new Error(data.error || 'Failed to delete deck')
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
  card: { front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[]; frontImageUrl?: string; backImageUrl?: string }
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

export const updateCard = async (
  accessToken: string,
  deckId: string,
  cardId: string,
  updates: Partial<{ front: string; back: string; cardType: string; options?: string[]; acceptedAnswers?: string[]; favorite?: boolean; ignored?: boolean; frontImageUrl?: string; backImageUrl?: string }>
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

export const deleteCard = async (
  accessToken: string,
  deckId: string,
  cardId: string
) => {
  const response = await fetch(`${API_BASE}/decks/${deckId}/cards/${cardId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete card:', data.error)
    throw new Error(data.error || 'Failed to delete card')
  }

  return data
}

// User Profile API
export const updateProfile = async (
  accessToken: string,
  updates: { displayName?: string; avatarUrl?: string; decksPublic?: boolean; subscriptionTier?: string; subscriptionExpiry?: string }
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

// Ban/Unban user (Superuser only)
export const banUser = async (accessToken: string, userId: string, banned: boolean) => {
  const response = await fetch(`${API_BASE}/users/${userId}/ban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ banned }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to ban/unban user:', data.error)
    throw new Error(data.error || 'Failed to ban/unban user')
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
    console.error('Failed to fetch user friends:', data.error)
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
  updates: { name: string; emoji: string; color: string; category?: string; subtopic?: string; cards: any[] }
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
  communityDeckId: string
) => {
  const response = await fetch(`${API_BASE}/community/decks/${communityDeckId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to delete community deck:', data.error)
    throw new Error(data.error || 'Failed to delete community deck')
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

// Notifications API
export const getNotifications = async (accessToken: string) => {
  console.log('=== GET NOTIFICATIONS START ===')
  console.log('API Base URL:', API_BASE)
  console.log('Full URL:', `${API_BASE}/notifications`)
  console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...')
  
  const response = await fetch(`${API_BASE}/notifications`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  console.log('Response status:', response.status)
  const data = await response.json()
  console.log('Response data:', data)
  
  if (!response.ok) {
    console.error('Failed to fetch notifications:', data.error)
    throw new Error(data.error || 'Failed to fetch notifications')
  }

  return data.notifications || []
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
  const response = await fetch(`${API_BASE}/shared/${shareId}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to get shared deck:', data.error)
    throw new Error(data.error || 'Failed to get shared deck')
  }

  return data.sharedDeck
}

// Flag/Report API
export const flagCommunityItem = async (
  accessToken: string | null,
  flagData: {
    itemType: 'deck' | 'card'
    itemId: string
    reason: string
    details: string
  }
) => {
  const response = await fetch(`${API_BASE}/community/flag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken || publicAnonKey}`,
    },
    body: JSON.stringify(flagData)
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error('Failed to flag item:', data.error)
    throw new Error(data.error || 'Failed to flag item')
  }

  return data
}