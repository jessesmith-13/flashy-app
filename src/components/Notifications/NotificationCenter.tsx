import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../shared/hooks/useNavigation";
import {
  markAllNotificationsSeen,
  getNotifications,
} from "../../shared/api/notifications";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "../../shared/api/friends";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  Bell,
  X,
  UserPlus,
  Reply,
  FileText,
  MessageCircle,
  Check,
  Heart,
  AlertTriangle,
  Ticket,
} from "lucide-react";

// Helper to handle auth errors
function handleAuthError(error: any) {
  if (
    error.message?.includes("Invalid token") ||
    error.message?.includes("JWT")
  ) {
    // Token is invalid, user needs to log in again
    // This will be handled by the global error handler
  }
}

export function NotificationCenter() {
  const {
    removeFriendRequest,
    addFriend,
    accessToken,
    mentionNotifications,
    setMentionNotifications,
    removeMentionNotification,
  } = useStore();
  const { navigateTo } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Load mention notifications when component mounts or when opened
  useEffect(() => {
    if (accessToken) {
      loadMentionNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadMentionNotifications();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [accessToken]);

  // Mark as seen when dropdown opens
  useEffect(() => {
    if (accessToken && isOpen && mentionNotifications.some((n) => !n.isSeen)) {
      markNotificationsAsSeen();
    }
  }, [accessToken, isOpen]);

  const markNotificationsAsSeen = async () => {
    if (!accessToken) return;

    try {
      await markAllNotificationsSeen(accessToken);
      // Update local state to mark all as seen
      setMentionNotifications(
        mentionNotifications.map((n) => ({ ...n, isSeen: true }))
      );
    } catch (error) {
      console.error("Failed to mark notifications as seen:", error);
      handleAuthError(error);
    }
  };

  const loadMentionNotifications = async () => {
    if (!accessToken) return;

    try {
      // NEW API already returns camelCase - no mapper needed!
      const notifications = await getNotifications(accessToken);
      console.log("🔔 Loaded notifications:", notifications);
      setMentionNotifications(notifications);
    } catch (error) {
      // Completely silent - no console logs, no toasts, no auth error handling
      // Notifications are a background feature and shouldn't interrupt the user
      // If there's an auth error, the user will be prompted to log in when they
      // try to perform an actual action (not background polling)
    }
  };

  // Count friend request notifications
  const totalNotifications = mentionNotifications.length;
  // Only show unseen notifications in the badge
  const unseenCount = mentionNotifications.filter((n) => !n.isSeen).length;

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
      handleAuthError(error);
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
      handleAuthError(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unseenCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown - Using Portal */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown content */}
            <div className="fixed left-4 top-20 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[9999] max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-2">
                {totalNotifications === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {/* Show all notifications */}
                      {/* Sort by newest first */}
                      {[...mentionNotifications]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                        .slice(0, 5)
                        .map((notification) => {
                          // Handle warning notifications
                          if (notification.type === "warning") {
                            return (
                              <div
                                key={notification.id}
                                className={`p-4 rounded-lg transition-colors ${
                                  !notification.isRead
                                    ? "bg-orange-50/70 dark:bg-orange-900/20"
                                    : "bg-gray-50 dark:bg-gray-700/50"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Warning Icon */}
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                          ⚠️ Moderator Warning
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                          You have received an official warning
                                        </p>
                                      </div>
                                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                    </div>

                                    {/* Warning Message */}
                                    <div className="bg-orange-100 dark:bg-orange-900/30 rounded px-2 py-2 mb-2">
                                      <p className="text-xs text-gray-700 dark:text-gray-300">
                                        {notification.message}
                                      </p>
                                    </div>

                                    {/* Timestamp */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        notification.createdAt
                                      ).toLocaleDateString()}{" "}
                                      at{" "}
                                      {new Date(
                                        notification.createdAt
                                      ).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (notification.type === "friend_request") {
                            return (
                              <div
                                key={notification.id}
                                className={`p-4 rounded-lg transition-colors ${
                                  !notification.isRead
                                    ? "bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30"
                                    : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* User Avatar */}
                                  {notification.requesterAvatar ? (
                                    <img
                                      src={notification.requesterAvatar}
                                      alt={notification.requesterDisplayName}
                                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                      {notification.requesterDisplayName
                                        ?.charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  )}

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                      <div>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                          {notification.requesterDisplayName}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                          sent you a friend request
                                        </p>
                                      </div>
                                      <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleAcceptRequest(
                                            notification.relatedUserId!
                                          )
                                        }
                                        disabled={
                                          loading === notification.relatedUserId
                                        }
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                      >
                                        <Check className="w-3.5 h-3.5 mr-1.5" />
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
                                        disabled={
                                          loading === notification.relatedUserId
                                        }
                                        className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 h-8"
                                      >
                                        <X className="w-3.5 h-3.5 mr-1.5" />
                                        Decline
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // For all other notification types, show a default view
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 rounded-lg transition-colors cursor-pointer ${
                                !notification.isRead
                                  ? "bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30"
                                  : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                              onClick={() => {
                                setIsOpen(false);
                                navigateTo("notifications");
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon based on notification type */}
                                <div className="flex-shrink-0">
                                  {notification.type === "comment_reply" && (
                                    <Reply className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  )}
                                  {notification.type === "deck_comment" && (
                                    <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  )}
                                  {notification.type === "mention" && (
                                    <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                  )}
                                  {notification.type === "comment_like" && (
                                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  )}
                                  {[
                                    "comment_deleted",
                                    "deck_deleted",
                                    "card_deleted",
                                  ].includes(notification.type) && (
                                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  )}
                                  {[
                                    "comment_restored",
                                    "deck_restored",
                                    "card_restored",
                                  ].includes(notification.type) && (
                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  )}
                                  {[
                                    "deck_flagged",
                                    "card_flagged",
                                    "comment_flagged",
                                  ].includes(notification.type) && (
                                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                  )}
                                  {notification.type === "premium_granted" && (
                                    <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  )}
                                  {notification.type === "premium_revoked" && (
                                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                  )}
                                  {notification.type === "ticket_created" && (
                                    <Ticket className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                  )}
                                  {![
                                    "comment_reply",
                                    "deck_comment",
                                    "mention",
                                    "comment_like",
                                    "comment_deleted",
                                    "deck_deleted",
                                    "card_deleted",
                                    "comment_restored",
                                    "deck_restored",
                                    "card_restored",
                                    "deck_flagged",
                                    "card_flagged",
                                    "comment_flagged",
                                    "premium_granted",
                                    "premium_revoked",
                                    "ticket_created",
                                  ].includes(notification.type) && (
                                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Main message */}
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    {notification.message}
                                  </p>

                                  {/* Additional info for specific types */}
                                  {notification.type === "premium_granted" &&
                                    notification.tier && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        Tier: {notification.tier}
                                      </p>
                                    )}

                                  {notification.requesterDisplayName && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      From {notification.requesterDisplayName}
                                    </p>
                                  )}

                                  {/* Timestamp */}
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {new Date(
                                      notification.createdAt
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>

                                {/* Unread indicator */}
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* See All Button */}
                    {totalNotifications > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          className="w-full py-2 text-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                          onClick={() => {
                            setIsOpen(false);
                            navigateTo("notifications");
                          }}
                        >
                          See All Notifications
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
