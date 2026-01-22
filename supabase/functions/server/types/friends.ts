export type FriendRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'

export interface FriendRequestRow {
  id: string
  sender_id: string
  recipient_id: string
  status: FriendRequestStatus
  created_at: string
  updated_at: string | null
}

export interface FriendResponse {
  id: string
  email?: string
  name: string
  displayName: string
  avatarUrl?: string | null
  decksPublic?: boolean
}

export interface FriendRequestResponse {
  id: string
  email?: string
  name: string
  displayName: string
  avatarUrl?: string | null
}