import { API_BASE } from "../../src/supabase/runtime";

/**
 * ============================================================
 * NOTIFICATIONS API
 * ============================================================
 */

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
  ticket_id?: string;
}

/**
 * Notification type for frontend (camelCase)
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  isSeen: boolean;
  createdAt: string;
  relatedUserId?: string;
  relatedDeckId?: string;
  relatedCommentId?: string;
  relatedReplyId?: string;
  requesterDisplayName?: string;
  requesterAvatar?: string;
  deckName?: string;
  commentText?: string;
  ticketId?: string;
}

/**
 * Map database notification to frontend notification
 */
const mapNotification = (
  dbNotification: NotificationFromDB,
): Notification => {
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
    ticketId: dbNotification.ticket_id,
  };
};

/**
 * Get all notifications for the current user
 */
export const getNotifications = async (
  accessToken: string,
): Promise<Notification[]> => {
  const response = await fetch(`${API_BASE}/notifications`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data
        ? (data as { error?: string }).error
        : undefined;

    throw new Error(
      errorMessage || "Failed to fetch notifications",
    );
  }

  const rawNotifications =
    (data as { notifications?: NotificationFromDB[] })
      .notifications || [];

  // Map database fields to camelCase
  return rawNotifications.map(mapNotification);
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (
  accessToken: string,
  notificationId: string,
) => {
  const response = await fetch(
    `${API_BASE}/notifications/${notificationId}/read`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Failed to mark notification as read:",
      data.error,
    );
    throw new Error(
      data.error || "Failed to mark notification as read",
    );
  }

  return data;
};

/**
 * Mark all notifications as seen
 */
export const markAllNotificationsSeen = async (
  accessToken: string,
) => {
  const response = await fetch(
    `${API_BASE}/notifications/mark-seen`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Failed to mark notifications as seen:",
      data.error,
    );
    throw new Error(
      data.error || "Failed to mark notifications as seen",
    );
  }

  return data;
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async (
  accessToken: string,
) => {
  const response = await fetch(`${API_BASE}/notifications`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to clear notifications:", data.error);
    throw new Error(
      data.error || "Failed to clear notifications",
    );
  }

  return data;
};