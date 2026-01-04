import { API_BASE } from '../supabase/info'

/**
 * ============================================================
 * ADMIN API (Superuser / Moderator)
 * ============================================================
 */

/**
 * Ban / unban a user (Superuser only)
 */
export const banUser = async (
  accessToken: string,
  userId: string,
  banned: boolean,
  reason?: string
) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
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

/**
 * Toggle moderator status (Superuser only)
 */
export const toggleModeratorStatus = async (
  accessToken: string,
  userId: string,
  isModerator: boolean
) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
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

/**
 * Grant premium manually (Superuser only)
 */
export const grantPremium = async (
  accessToken: string,
  userId: string,
  reason: string,
  tier: string,
  customReason?: string
) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/premium`, {
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

/**
 * Demote premium user to free (Superuser only)
 */
export const demotePremium = async (
  accessToken: string,
  userId: string
) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/demote`, {
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

/**
 * Get all users (Superuser only)
 */
export const getAllUsers = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/admin/users`, {
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

/**
 * Get user activity history (Superuser only)
 */
export const getUserActivity = async (
  accessToken: string,
  userId: string
) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/activity`, {
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

/**
 * Delete a community deck (Superuser only)
 */
export const deleteCommunityDeck = async (
  accessToken: string,
  communityDeckId: string,
  reason: string
) => {
  const response = await fetch(
    `${API_BASE}/admin/community/decks/${communityDeckId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to delete community deck:', data.error)
    throw new Error(data.error || 'Failed to delete community deck')
  }

  return data
}

/**
 * Delete a community card (Superuser only)
 */
export const deleteCommunityCard = async (
  accessToken: string,
  communityDeckId: string,
  cardId: string,
  reason: string
) => {
  console.log(`COMMUNITY DECK ID`, communityDeckId)
  const response = await fetch(
    `${API_BASE}/admin/community/decks/${communityDeckId}/cards/${cardId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to delete community card:', data.error)
    throw new Error(data.error || 'Failed to delete community card')
  }

  return data
}

/**
 * Delete a deck (Superuser only)
 */
export const deleteDeck = async (
  accessToken: string,
  deckId: string,
  reason?: string
) => {
  const response = await fetch(`${API_BASE}/admin/decks/${deckId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    ...(reason && { body: JSON.stringify({ reason }) }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to delete deck:', data.error)
    throw new Error(data.error || 'Failed to delete deck')
  }

  return data
}

/**
 * Delete a card (Superuser only)
 */
export const deleteCard = async (
  accessToken: string,
  deckId: string,
  cardId: string,
  reason?: string
) => {
  const response = await fetch(
    `${API_BASE}/admin/decks/${deckId}/cards/${cardId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      ...(reason && { body: JSON.stringify({ reason }) }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to delete card:', data.error)
    throw new Error(data.error || 'Failed to delete card')
  }

  return data
}

/**
 * Feature / unfeature a community deck (Superuser only)
 */
export const toggleCommunityDeckFeatured = async (
  accessToken: string,
  communityDeckId: string
) => {
  const response = await fetch(
    `${API_BASE}/admin/community/decks/${communityDeckId}/featured`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to toggle featured status:', data.error)
    throw new Error(data.error || 'Failed to toggle featured status')
  }

  return data
}

/**
 * Get deleted items (Superuser only)
 */
export const getDeletedItems = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/admin/deleted-items`, {
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

/**
 * Restore deleted item (Superuser only)
 */
export const restoreDeletedItem = async (
  accessToken: string,
  itemId: string,
  itemType: 'comment' | 'deck' | 'card'
) => {
  const response = await fetch(
    `${API_BASE}/admin/deleted-items/restore`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ itemId, itemType }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to restore item:', data.error)
    throw new Error(data.error || 'Failed to restore item')
  }

  return data
}