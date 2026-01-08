import { NotificationFromDB, Notification } from '../../src/types/notifications'

export function mapApiNotificationToUINotification(notification: NotificationFromDB): Notification {
  return {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    message: notification.message,
    relatedUserId: notification.related_user_id,
    requesterDisplayName: notification.requester_display_name,
    requesterAvatar: notification.requester_avatar,
    relatedDeckId: notification.related_deck_id,
    relatedCommentId: notification.related_comment_id,
    relatedReplyId: notification.related_reply_id,
    deckName: notification.deck_name,
    commentText: notification.comment_text,
    isRead: notification.is_read,
    isSeen: notification.is_seen,
    createdAt: notification.created_at,
  }
}