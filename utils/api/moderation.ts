import { API_BASE } from '../supabase/info'
import type { CreateFlagPayload } from '@/types/moderation'

export type FlagReason =
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'copyright'
  | 'other'

export type FlagTargetType = 'deck' | 'user' | 'comment' | 'card'

/**
 * ============================================================
 * MODERATION API - REFACTORED
 * ============================================================
 * 
 * ARCHITECTURE:
 * - FLAGS = Immutable user reports (create only)
 * - TICKETS = Single source of truth for moderation workflow
 * 
 * Users create flags → Moderators work with tickets
 * ============================================================
 */

/**
 * ============================================================
 * USER ACTIONS (Anyone can flag content)
 * ============================================================
 */

/**
 * Create a flag (report content)
 * This auto-creates a ticket for moderators to review
 */
export const createFlag = async (
  accessToken: string,
  flagData: CreateFlagPayload
) => {
  const response = await fetch(`${API_BASE}/moderation/flag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(flagData),
  })

  const data: { error?: string } = await response.json()

  if (!response.ok) {
    console.error('Failed to create flag:', data.error)
    throw new Error(data.error ?? 'Failed to create flag')
  }

  return data
}

/**
 * ============================================================
 * MODERATOR ACTIONS (Work with tickets)
 * ============================================================
 */

/**
 * Get all tickets with filters (Moderator only)
 * This is the main moderation queue
 */
export const getTickets = async (
  accessToken: string,
  filters?: {
    status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    category?: string
    assignedTo?: string
    unassigned?: boolean
    limit?: number
    offset?: number
  }
) => {
  const params = new URLSearchParams()

  if (filters?.status) params.append('status', filters.status)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.category) params.append('category', filters.category)
  if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)
  if (filters?.unassigned) params.append('unassigned', 'true')
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())

  const response = await fetch(
    `${API_BASE}/moderation/tickets?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to fetch tickets:', data.error)
    throw new Error(data.error || 'Failed to fetch tickets')
  }

  return data
}

/**
 * Get ticket details (includes related flag info if it exists)
 */
export const getTicketDetails = async (
  accessToken: string,
  ticketId: string
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to get ticket details:', data.error)
    throw new Error(data.error || 'Failed to get ticket details')
  }

  return data
}

/**
 * Get ticket comments
 */
export const getTicketComments = async (
  accessToken: string,
  ticketId: string
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/comments`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to get ticket comments:', data.error)
    throw new Error(data.error || 'Failed to get ticket comments')
  }

  return data
}

/**
 * Add comment to a ticket
 */
export const addTicketComment = async (
  accessToken: string,
  ticketId: string,
  commentData: {
    content: string
    mentions: string[]
  }
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(commentData),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to add ticket comment:', data.error)
    throw new Error(data.error || 'Failed to add ticket comment')
  }

  return data
}

/**
 * Get ticket action history
 */
export const getTicketActions = async (
  accessToken: string,
  ticketId: string
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/actions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to get ticket actions:', data.error)
    throw new Error(data.error || 'Failed to get ticket actions')
  }

  return data
}

/**
 * Update ticket status
 */
export const updateTicketStatus = async (
  accessToken: string,
  ticketId: string,
  statusData: {
    status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
    resolutionNote?: string,
    resolutionReason?: 'approved' | 'rejected' | 'removed'
  }
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(statusData),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to update ticket status:', data.error)
    throw new Error(data.error || 'Failed to update ticket status')
  }

  return data
}

/**
 * Assign ticket to moderator
 */
export const assignTicket = async (
  accessToken: string,
  ticketId: string,
  moderatorId: string
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/assign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ moderatorId }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to assign ticket:', data.error)
    throw new Error(data.error || 'Failed to assign ticket')
  }

  return data
}

/**
 * Get all moderators
 */
export const getModerators = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/moderation/moderators`, {
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

/**
 * ============================================================
 * MODERATION ACTIONS (Content removal, warnings, etc.)
 * ============================================================
 */

/**
 * Warn a user for flagged content (Moderator only)
 */
export const warnUser = async (
  accessToken: string,
  ticketId: string,
  warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }
) => {
  const response = await fetch(`${API_BASE}/moderation/warnings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ticketId,
      ...warning,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to warn user:', data.error)
    throw new Error(data.error || 'Failed to warn user')
  }

  return data
}

/**
 * Delete a comment (Moderator/Superuser only)
 */
export const deleteDeckComment = async (
  accessToken: string,
  deckId: string,
  commentId: string,
  reason: string
) => {
  console.log(`DECK ID`, deckId)
  console.log(`COMMENT ID`, commentId)
  const response = await fetch(
    `${API_BASE}/moderation/decks/${deckId}/comments/${commentId}`,
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
    console.error('Failed to delete comment:', data.error)
    throw new Error(data.error || 'Failed to delete comment')
  }

  return data
}

/**
 * Escalate a ticket (Moderator only)
 * Sets is_escalated = true and adds a comment explaining why
 */
export const escalateTicket = async (
  accessToken: string,
  ticketId: string,
  reason: string
) => {
  const response = await fetch(
    `${API_BASE}/moderation/tickets/${ticketId}/escalate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to escalate ticket:', data.error)
    throw new Error(data.error || 'Failed to escalate ticket')
  }

  return data
}