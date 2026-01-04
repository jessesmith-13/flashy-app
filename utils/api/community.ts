import { API_BASE, publicAnonKey } from '../supabase/info'
import { CommunityCard } from '../../src/types/community'

// ============================================================
// COMMUNITY DECKS
// ============================================================

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
    console.error('Failed to fetch featured decks:', data.error)
    throw new Error(data.error || 'Failed to fetch featured decks')
  }

  return data.decks || []
}

// ============================================================
// COMMUNITY PUBLISH / IMPORT
// ============================================================

export const publishDeck = async (
  accessToken: string,
  deckId: string,
  publishData: { category: string; subtopic: string }
) => {
  console.log('📤 publishDeck called with:')
  console.log('  - deckId:', deckId)
  console.log('  - publishData:', publishData)
  console.log('  - URL:', `${API_BASE}/decks/${deckId}/publish`)
  
  const payload = {
    category: publishData.category,
    subtopic: publishData.subtopic,
  }
  
  console.log('📦 Request body:', JSON.stringify(payload, null, 2))
  console.log('📦 Headers:', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
  })

  const response = await fetch(`${API_BASE}/decks/${deckId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  console.log('📥 Response status:', response.status, response.statusText)
  
  let data
  try {
    data = await response.json()
    console.log('📥 Response data:', data)
  } catch (e) {
    console.error('❌ Failed to parse response JSON:', e)
    throw new Error('Invalid response from server')
  }

  if (!response.ok) {
    console.error('❌ Publish failed:', data.error)
    throw new Error(data.error || 'Failed to publish deck')
  }

  return data
}

export const unpublishDeck = async (
  accessToken: string,
  communityDeckId: string
) => {
  const response = await fetch(
    `${API_BASE}/decks/${communityDeckId}/unpublish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to unpublish deck:', data.error)
    throw new Error(data.error || 'Failed to unpublish deck')
  }

  return data
}

export const addDeckFromCommunity = async (
  accessToken: string,
  communityDeck: {
    communityDeckId: string
    name: string
    color: string
    emoji: string
    cards: {
      front: string
      back: string
      cardType: string
      correctAnswers?: string[]
      incorrectAnswers?: string[]
      acceptedAnswers?: string[]
    }[]
    category?: string
    subtopic?: string
    version?: number
  }
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

export const updateCommunityDeck = async (
  accessToken: string,
  communityDeckId: string,
  updates: {
    name: string
    emoji: string
    color: string
    category?: string
    subtopic?: string
    difficulty?: string
    cards: CommunityCard[]
  }
) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${communityDeckId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to update community deck:', data.error)
    throw new Error(data.error || 'Failed to update community deck')
  }

  return data
}

// ============================================================
// COMMUNITY INTERACTION
// ============================================================

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

export const searchCommunityUsers = async (query: string) => {
  const response = await fetch(
    `${API_BASE}/community/users/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to search users:', data.error)
    throw new Error(data.error || 'Failed to search users')
  }

  return data.users || []
}

// ============================================================
// RATINGS
// ============================================================

export const rateDeck = async (
  accessToken: string,
  deckId: string,
  rating: number
) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${deckId}/rate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ rating }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to rate deck:', data.error)
    throw new Error(data.error || 'Failed to rate deck')
  }

  return data
}

export const getDeckRatings = async (
  deckId: string,
  accessToken?: string
) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${deckId}/ratings`,
    {
      headers: {
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to fetch ratings:', data.error)
    throw new Error(data.error || 'Failed to fetch ratings')
  }

  return data
}

// ============================================================
// COMMENTS
// ============================================================

export const getDeckComments = async (deckId: string) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${deckId}/comments`,
    {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to fetch comments:', data.error)
    throw new Error(data.error || 'Failed to fetch comments')
  }

    // Map backend response (content, userId, etc.) to frontend format (text, userId, etc.)
    const comments = (data.comments || []).map((comment: any) => ({
      id: comment.id,
      userId: comment.userId,
      userName: comment.userName,
      userDisplayName: comment.userDisplayName,
      userAvatar: comment.userAvatar,
      text: comment.content,  // ✅ Map 'content' to 'text'
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      communityDeckId: comment.communityDeckId,
      replies: (comment.replies || []).map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        userName: reply.userName,
        userDisplayName: reply.userDisplayName,
        userAvatar: reply.userAvatar,
        text: reply.content,  // ✅ Map 'content' to 'text'
        communityDeckId: reply.communityDeckId,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      })),
      likes: comment.likes || [],
    }))

    return comments
  }

export const postDeckComment = async (
  accessToken: string,
  deckId: string,
  text: string,
  parentId?: string
) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${deckId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content: text, parentCommentId: parentId }),  // ✅ Fixed: use correct field names
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to post comment:', data.error)
    throw new Error(data.error || 'Failed to post comment')
  }

  return data.comment
}

export const likeComment = async (
  accessToken: string,
  deckId: string,
  commentId: string
) => {
  const response = await fetch(
    `${API_BASE}/community/decks/${deckId}/comments/${commentId}/like`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to like comment:', data.error)
    throw new Error(data.error || 'Failed to like comment')
  }

  return data
}