import { useState, useEffect } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../../hooks/useNavigation";
import {
  markAllNotificationsSeen,
  getNotifications,
  clearAllNotifications,
  markNotificationRead,
} from "../../../utils/api/notifications";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "../../../utils/api/friends";
import {
  ArrowLeft,
  Bell,
  UserPlus,
  Check,
  X,
  Trash2,
  Reply,
  FileText,
  MessageCircle,
  Heart,
  AlertTriangle,
  Ticket,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

export function NotificationsScreen() {
  const {
    removeFriendRequest,
    addFriend,
    accessToken,
    mentionNotifications,
    setMentionNotifications,
    removeMentionNotification,
    setViewingCommunityDeckId,
    setTargetCommentId,
    setViewingTicketId,
  } = useStore();
  const { navigateTo } = useNavigation();
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "friend_requests" | "comments" | "replies" | "moderation"
  >("all");

  // Load notifications when component mounts
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!accessToken) return;

    try {
      const notifications = await getNotifications(accessToken);
      console.log("Loaded notifications:", notifications);
      setMentionNotifications(notifications);

      // Mark all as seen when viewing this page
      if (notifications.length > 0) {
        await markAllNotificationsSeen(accessToken);
      }
    } catch (error) {
      // Completely silent - notifications are non-critical
      // Only log to console for debugging
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    if (!accessToken) return;

    setLoading(userId);
    try {
      await acceptFriendRequest(accessToken, userId);
      addFriend(userId);
      removeFriendRequest(userId);

      // Also remove the notification from mentionNotifications
      const notification = mentionNotifications.find(
        (n) => n.type === "friend_request" && n.relatedUserId === userId
      );
      if (notification) {
        removeMentionNotification(notification.id);
      }

      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      toast.error("Failed to accept friend request");
    } finally {
      setLoading(null);
    }
  };

  const handleDeclineRequest = async (userId: string) => {
    if (!accessToken) return;

    setLoading(userId);
    try {
      await declineFriendRequest(accessToken, userId);
      removeFriendRequest(userId);

      // Also remove the notification from mentionNotifications
      const notification = mentionNotifications.find(
        (n) => n.type === "friend_request" && n.relatedUserId === userId
      );
      if (notification) {
        removeMentionNotification(notification.id);
      }

      toast.success("Friend request declined");
    } catch (error) {
      console.error("Failed to decline friend request:", error);
      toast.error("Failed to decline friend request");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!accessToken) return;

    try {
      await markNotificationRead(accessToken, notificationId);
      removeMentionNotification(notificationId);
      toast.success("Notification removed");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (!accessToken) return;

    try {
      await clearAllNotifications(accessToken);
      setMentionNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = mentionNotifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "friend_requests")
      return notification.type === "friend_request";
    if (filter === "comments")
      return [
        "deck_comment",
        "mention",
        "comment_like",
        "ticket_mention",
        "ticket_comment",
      ].includes(notification.type);
    if (filter === "replies") return notification.type === "comment_reply";
    if (filter === "moderation")
      return [
        "comment_deleted",
        "comment_restored",
        "deck_deleted",
        "card_deleted",
        "deck_restored",
        "card_restored",
        "deck_flagged",
        "card_flagged",
        "comment_flagged",
        "warning",
        "ticket_mention",
        "ticket_comment",
        "ticket_assigned",
      ].includes(notification.type);
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo("decks")}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Notifications
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredNotifications.length} notification
                {filteredNotifications.length !== 1 ? "s" : ""}
              </p>
            </div>
            {mentionNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            All ({mentionNotifications.length})
          </button>
          <button
            onClick={() => setFilter("friend_requests")}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === "friend_requests"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Friend Requests (
            {
              mentionNotifications.filter((n) => n.type === "friend_request")
                .length
            }
            )
          </button>
          <button
            onClick={() => setFilter("comments")}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === "comments"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Comments (
            {
              mentionNotifications.filter((n) =>
                ["deck_comment", "mention", "comment_like"].includes(n.type)
              ).length
            }
            )
          </button>
          <button
            onClick={() => setFilter("replies")}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === "replies"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Replies (
            {
              mentionNotifications.filter((n) => n.type === "comment_reply")
                .length
            }
            )
          </button>
          <button
            onClick={() => setFilter("moderation")}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === "moderation"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Moderation (
            {
              mentionNotifications.filter((n) =>
                [
                  "comment_deleted",
                  "comment_restored",
                  "deck_deleted",
                  "card_deleted",
                  "deck_restored",
                  "card_restored",
                  "deck_flagged",
                  "card_flagged",
                  "comment_flagged",
                  "warning",
                  "ticket_mention",
                  "ticket_comment",
                  "ticket_assigned",
                ].includes(n.type)
              ).length
            }
            )
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === "all"
                ? "You're all caught up!"
                : `No ${filter.replace("_", " ")} at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sort by newest first */}
            {[...filteredNotifications]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((notification) => {
                // Friend Request Notification
                if (notification.type === "friend_request") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        {/* User Avatar */}
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={notification.requesterDisplayName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                sent you a friend request
                              </p>
                            </div>
                            <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAcceptRequest(notification.relatedUserId!)
                              }
                              disabled={loading === notification.relatedUserId}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-1.5" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeclineRequest(
                                  notification.relatedUserId!
                                )
                              }
                              disabled={loading === notification.relatedUserId}
                              className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <X className="w-4 h-4 mr-1.5" />
                              Decline
                            </Button>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Reply Notification (comment_reply type from backend)
                if (notification.type === "comment_reply") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={async () => {
                        // Navigate to community tab and view deck
                        navigateTo("community");
                        setViewingCommunityDeckId(notification.relatedDeckId!);
                        // Scroll to the PARENT comment (relatedCommentId is the parent for reply notifications)
                        setTargetCommentId(notification.relatedCommentId!);

                        // Mark notification as read
                        try {
                          await markNotificationRead(
                            accessToken!,
                            notification.id
                          );
                          removeMentionNotification(notification.id);
                        } catch (error) {
                          console.error(
                            "Failed to mark notification as read:",
                            error
                          );
                        }
                      }}
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {/* User Avatar */}
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={notification.requesterDisplayName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                replied to your comment
                              </p>
                            </div>
                            <Reply className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          </div>

                          {/* Comment preview */}
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {notification.commentText}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Deck Comment Notification
                if (notification.type === "deck_comment") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={async () => {
                        // Navigate to community tab and view deck
                        navigateTo("community");
                        setViewingCommunityDeckId(notification.relatedDeckId!);
                        // Scroll to the new comment
                        setTargetCommentId(notification.relatedCommentId!);

                        // Mark notification as read
                        try {
                          await markNotificationRead(
                            accessToken!,
                            notification.id
                          );
                          removeMentionNotification(notification.id);
                        } catch (error) {
                          console.error(
                            "Failed to mark notification as read:",
                            error
                          );
                        }
                      }}
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {/* User Avatar */}
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={notification.requesterDisplayName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                commented on your deck "{notification.deckName}"
                              </p>
                            </div>
                            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          </div>

                          {/* Comment preview */}
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {notification.commentText}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Mention Notification
                if (notification.type === "mention") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={async () => {
                        navigateTo("community");
                        setViewingCommunityDeckId(notification.relatedDeckId!);
                        // Scroll to the comment with the mention
                        setTargetCommentId(notification.relatedCommentId!);

                        try {
                          await markNotificationRead(
                            accessToken!,
                            notification.id
                          );
                          removeMentionNotification(notification.id);
                        } catch (error) {
                          console.error(
                            "Failed to mark notification as read:",
                            error
                          );
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={notification.requesterDisplayName || "User"}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                mentioned you in a comment
                              </p>
                            </div>
                            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {notification.commentText}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Comment Like Notification
                if (notification.type === "comment_like") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={async () => {
                        navigateTo("community");
                        setViewingCommunityDeckId(notification.relatedDeckId!);
                        // For comment likes, scroll to the liked comment
                        setTargetCommentId(notification.relatedCommentId!);

                        try {
                          await markNotificationRead(
                            accessToken!,
                            notification.id
                          );
                          removeMentionNotification(notification.id);
                        } catch (error) {
                          console.error(
                            "Failed to mark notification as read:",
                            error
                          );
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={notification.requesterDisplayName || "User"}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                liked your comment on "{notification.deckName}"
                              </p>
                            </div>
                            <Heart className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 fill-current" />
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Ticket Mention Notification
                if (notification.type === "ticket_mention") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => {
                        // Navigate to moderation screen and open the ticket
                        console.log(
                          "Ticket mention clicked, ticketId:",
                          notification.ticketId
                        );
                        console.log("Full notification:", notification);
                        navigateTo("moderator");
                        setViewingTicketId(notification.ticketId!);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={
                              notification.requesterDisplayName || "Moderator"
                            }
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "M")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                mentioned you in a ticket
                              </p>
                            </div>
                            <Ticket className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {notification.commentText}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Ticket Comment Notification
                if (notification.type === "ticket_comment") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => {
                        // Navigate to moderation screen and open the ticket
                        console.log(
                          "Ticket comment clicked, ticketId:",
                          notification.ticketId
                        );
                        console.log("Full notification:", notification);
                        navigateTo("moderator");
                        setViewingTicketId(notification.ticketId!);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={
                              notification.requesterDisplayName || "Moderator"
                            }
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "M")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                commented on your assigned ticket
                              </p>
                            </div>
                            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                            {notification.message}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Ticket Assigned Notification
                if (notification.type === "ticket_assigned") {
                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => {
                        // Navigate to moderation screen and open the ticket
                        console.log(
                          "Ticket assigned clicked, ticketId:",
                          notification.ticketId
                        );
                        console.log("Full notification:", notification);
                        navigateTo("moderator");
                        setViewingTicketId(notification.ticketId!);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {notification.requesterAvatar ? (
                          <img
                            src={notification.requesterAvatar}
                            alt={
                              notification.requesterDisplayName || "Moderator"
                            }
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                            {(notification.requesterDisplayName || "M")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {notification.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                assigned you a ticket
                              </p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                            {notification.message}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Warning Notification
                if (notification.type === "warning") {
                  // Parse warning metadata from comment_text field (stored as JSON)
                  let warningData;
                  try {
                    warningData = notification.commentText
                      ? JSON.parse(notification.commentText)
                      : {};
                  } catch (e) {
                    warningData = {};
                    console.log(e);
                  }

                  const reason = warningData.reason || "Unknown reason";
                  const customMessage = warningData.customMessage;
                  const timeToResolve = warningData.timeToResolve || 0;
                  const deadline = warningData.deadline;
                  const targetType = warningData.targetType || "content";
                  const targetName = warningData.targetName || "Unknown";

                  return (
                    <div
                      key={notification.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-orange-600 dark:border-orange-500 relative group"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex items-start gap-3">
                        {/* Warning Icon */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white flex-shrink-0">
                          <AlertTriangle className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-10">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                Moderator Warning
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                You have received an official warning
                              </p>
                            </div>
                            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          </div>

                          {/* Main message */}
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            You have received a warning from a moderator
                            regarding your{" "}
                            <span className="font-medium">{targetType}</span>: "
                            {targetName}"
                          </p>

                          {/* Reason */}
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              Reason:
                            </p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {reason}
                            </p>
                          </div>

                          {/* Custom Message (if provided) */}
                          {customMessage && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Message:
                              </p>
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {customMessage}
                              </p>
                            </div>
                          )}

                          {/* Deadline Banner */}
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                              Please address this within {timeToResolve} hours
                            </p>
                            {deadline && (
                              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                Deadline: {new Date(deadline).toLocaleString()}
                              </p>
                            )}
                          </div>

                          {/* Timestamp */}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // For all other notification types, render generic notification
                // (Comment deleted, deck deleted, ticket notifications, etc.)
                return (
                  <div
                    key={notification.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 relative group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white">
                          <Bell className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-8">
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-2">
                          {notification.message}
                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
