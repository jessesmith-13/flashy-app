// api/users.ts

import { API_BASE } from '../../src/supabase/runtime'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ============================================================
// TYPES
// ============================================================

export type UpdateProfilePayload = {
  displayName?: string
  avatarUrl?: string
  decksPublic?: boolean
  subscriptionTier?: string
  subscriptionExpiry?: string
  isSuperuser?: boolean
}

// ============================================================
// USERS – PUBLIC
// ============================================================

// Get a users profile (publicly accessible)
export const getUserProfile = async (userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/profile`, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
    },
  })

  const data = await response.json()
  console.log('user profile data:', data)

  if (!response.ok) {
    console.error('Failed to fetch user profile:', data.error)
    throw new Error(data.error || 'Failed to fetch user profile')
  }

  return data.user
}

// ============================================================
// USERS – AUTHENTICATED
// ============================================================
// Update personal profile
export const updateProfile = async (
  userId: string,
  accessToken: string,
  updates: UpdateProfilePayload
) => {
  const response = await fetch(
    `${API_BASE}/users/${userId}/profile`,
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
    console.error('Failed to update profile:', data.error)
    throw new Error(data.error || 'Failed to update profile')
  }

  return data.user
}

// ============================================================
// USERS – DECK ACCESS (READ-ONLY)
// ============================================================

export const getUserDeck = async (
  accessToken: string,
  userId: string,
  deckId: string
) => {
  const response = await fetch(
    `${API_BASE}/users/${userId}/decks/${deckId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to fetch user deck:', data.error)
    throw new Error(data.error || 'Failed to fetch user deck')
  }

  return data
}

// ============================================================
// USERS – FRIENDS (READ)
// ============================================================

export const getUserFriends = async (
  accessToken: string,
  userId: string
) => {
  const response = await fetch(
    `${API_BASE}/users/${userId}/friends`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to fetch user friends:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      url: `${API_BASE}/users/${userId}/friends`,
    })
    throw new Error(data.error || 'Failed to fetch user friends')
  }

  return data.friends
}