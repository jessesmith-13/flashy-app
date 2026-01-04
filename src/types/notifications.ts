export type NotificationType =
  // Social/Friends
  | 'friend_request'
  // Comments & Engagement
  | 'reply'
  | 'deck_comment'
  | 'mention'
  | 'comment_like'
  // Moderation Actions (Deletion)
  | 'comment_deleted'
  | 'deck_deleted'
  | 'card_deleted'
  // Moderation Actions (Restoration)
  | 'comment_restored'
  | 'deck_restored'
  | 'card_restored'
  // Flagging
  | 'deck_flagged'
  | 'card_flagged'
  | 'comment_flagged'
  // Moderation
  | 'warning'
  // Premium/Subscription
  | 'premium_granted'
  | 'premium_revoked'
  // Support Tickets
  | 'ticket_created'
  | 'ticket_mention'
  | 'ticket_comment'
  | 'ticket_assigned'

/**
 * Notification type for frontend (camelCase)
 */
export interface Notification {
  id: string
  userId: string
  type: string
  message: string
  isRead: boolean
  isSeen: boolean
  createdAt: string
  relatedUserId?: string
  relatedDeckId?: string
  relatedCommentId?: string
  relatedReplyId?: string
  requesterDisplayName?: string
  requesterAvatar?: string
  deckName?: string
  commentText?: string
}

/**
 * Notification type from database (snake_case)
 */
interface NotificationFromDB {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  is_seen: boolean;
  created_at: string;
  related_user_id?: string;
  related_deck_id?: string;
  related_comment_id?: string;
  related_reply_id?: string;
  requester_display_name?: string;
  requester_avatar?: string;
  deck_name?: string;
  comment_text?: string;
}

export /**
 * Map database notification to frontend notification
 */
const mapNotification = (dbNotification: NotificationFromDB): Notification => {
  return {
    id: dbNotification.id,
    userId: dbNotification.user_id,
    type: dbNotification.type,
    message: dbNotification.message,
    isRead: dbNotification.is_read,
    isSeen: dbNotification.is_seen,
    createdAt: dbNotification.created_at,
    relatedUserId: dbNotification.related_user_id,
    relatedDeckId: dbNotification.related_deck_id,
    relatedCommentId: dbNotification.related_comment_id,
    relatedReplyId: dbNotification.related_reply_id,
    requesterDisplayName: dbNotification.requester_display_name,
    requesterAvatar: dbNotification.requester_avatar,
    deckName: dbNotification.deck_name,
    commentText: dbNotification.comment_text,
  }
}