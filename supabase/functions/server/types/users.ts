export type User = {
  id: string
  email: string | null

  display_name: string | null
  avatar_url: string | null

  is_superuser: boolean
  is_moderator: boolean

  subscription_tier: 'free' | 'monthly' | 'annual' | 'lifetime'
  subscription_expiry: string | null
  subscription_cancelled_at_period_end: boolean

  is_banned: boolean
  banned_reason: string | null
  banned_at: string | null
  banned_by: string | null

  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

export interface UpdateUserProfilePayload {
  displayName?: string
  avatarUrl?: string | null
  decksPublic?: boolean
  subscriptionTier?: 'free' | 'monthly' | 'annual' | 'lifetime'
  subscriptionExpiry?: string | null
  emailNotificationsEnabled?: boolean
  emailOffers?: boolean
  emailCommentReplies?: boolean
  emailFriendRequests?: boolean
  emailFlaggedContent?: boolean
  emailModerationNotices?: boolean
}

export interface UserRow {
  id: string
  display_name: string
  avatar_url: string | null
  decks_public: boolean
  subscription_tier: string | null
  subscription_expiry: string | null
  is_banned: boolean
  is_moderator: boolean
  email_notifications_enabled: boolean
  email_offers: boolean
  email_comment_replies: boolean
  email_friend_requests: boolean
  email_flagged_content: boolean
  email_moderation_notices: boolean
}

export type FixSubscriptionResponse =
  | {
      success: true
      message: string
      oldTier?: string
      newTier?: string
      hasPremiumAccess?: boolean
      currentTier?: string
      note?: string
    }
  | { error: string }

export interface FriendRowJoin {
  users: {
    id: string
    email: string
    display_name: string
    avatar_url: string | null
    decks_public: boolean | null
  } | null
}

export interface FriendSummary {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  decksPublic: boolean
}