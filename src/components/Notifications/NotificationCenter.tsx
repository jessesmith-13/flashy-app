import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { Bell, X, Check, UserPlus, MessageCircle, Reply, FileText } from 'lucide-react'
import { Button } from '../../ui/button'
import * as api from '../../../utils/api'
import { toast } from 'sonner'
import { handleAuthError } from '../../../utils/authErrorHandler'

export function NotificationCenter() {
  const { 
    removeFriendRequest, 
    addFriend, 
    accessToken,
    mentionNotifications,
    setMentionNotifications,
    removeMentionNotification,
    setCurrentSection,
    setViewingCommunityDeckId,
    setTargetCommentId
  } = useStore()
  const { navigateTo } = useNavigation()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  // Load mention notifications when component mounts or when opened
  useEffect(() => {
    if (accessToken) {
      loadMentionNotifications()
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadMentionNotifications()
      }, 30000) // 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [accessToken])
  
  // Mark as seen when dropdown opens
  useEffect(() => {
    if (accessToken && isOpen && mentionNotifications.some(n => !n.seen)) {
      markNotificationsAsSeen()
    }
  }, [accessToken, isOpen])
  
  const markNotificationsAsSeen = async () => {
    if (!accessToken) return
    
    try {
      await api.markAllNotificationsSeen(accessToken)
      // Update local state to mark all as seen
      setMentionNotifications(mentionNotifications.map(n => ({ ...n, seen: true })))
    } catch (error) {
      console.error('Failed to mark notifications as seen:', error)
      handleAuthError(error)
    }
  }

  const loadMentionNotifications = async () => {
    if (!accessToken) return
    
    try {
      const notifications = await api.getNotifications(accessToken)
      setMentionNotifications(notifications)
    } catch (error) {
      // Completely silent - no console logs, no toasts, no auth error handling
      // Notifications are a background feature and shouldn't interrupt the user
      // If there's an auth error, the user will be prompted to log in when they
      // try to perform an actual action (not background polling)
    }
  }

  // Count friend request notifications
  const friendRequestNotifications = mentionNotifications.filter(n => n.type === 'friend_request')
  const totalNotifications = mentionNotifications.length
  // Only show unseen notifications in the badge
  const unseenCount = mentionNotifications.filter(n => !n.seen).length

  const handleAcceptRequest = async (userId: string) => {
    if (!accessToken) return
    
    setLoading(userId)
    try {
      await api.acceptFriendRequest(accessToken, userId)
      addFriend(userId)
      removeFriendRequest(userId)
      
      // Also remove the notification from mentionNotifications
      const notification = mentionNotifications.find(n => n.type === 'friend_request' && n.fromUserId === userId)
      if (notification) {
        removeMentionNotification(notification.id)
      }
      
      toast.success('Friend request accepted!')
    } catch (error) {
      console.error('Failed to accept friend request:', error)
      toast.error('Failed to accept friend request')
      handleAuthError(error)
    } finally {
      setLoading(null)
    }
  }

  const handleDeclineRequest = async (userId: string) => {
    if (!accessToken) return
    
    setLoading(userId)
    try {
      await api.declineFriendRequest(accessToken, userId)
      removeFriendRequest(userId)
      
      // Also remove the notification from mentionNotifications
      const notification = mentionNotifications.find(n => n.type === 'friend_request' && n.fromUserId === userId)
      if (notification) {
        removeMentionNotification(notification.id)
      }
      
      toast.success('Friend request declined')
    } catch (error) {
      console.error('Failed to decline friend request:', error)
      toast.error('Failed to decline friend request')
      handleAuthError(error)
    } finally {
      setLoading(null)
    }
  }

  const handleMentionClick = (notification: any) => {
    // Set the current section to the notification's section
    setCurrentSection(notification.section)
    // Set the viewing community deck ID
    setViewingCommunityDeckId(notification.context)
    // Remove the notification from the list
    removeMentionNotification(notification.id)
    // Close the notification center
    setIsOpen(false)
  }

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
      {isOpen && createPortal(
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
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
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No new notifications</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {/* Show all notifications (including friend requests and mentions) */}
                    {mentionNotifications.slice(0, 5).map((notification) => {
                      if (notification.type === 'friend_request') {
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg transition-colors ${
                              !notification.read 
                                ? 'bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30' 
                                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* User Avatar */}
                              {notification.fromUserAvatar ? (
                                <img
                                  src={notification.fromUserAvatar}
                                  alt={notification.fromUserName}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                  {notification.fromUserName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                      {notification.fromUserName}
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
                                    onClick={() => handleAcceptRequest(notification.fromUserId)}
                                    disabled={loading === notification.fromUserId}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeclineRequest(notification.fromUserId)}
                                    disabled={loading === notification.fromUserId}
                                    className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 h-8"
                                  >
                                    <X className="w-3.5 h-3.5 mr-1.5" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Handle reply notifications
                      if (notification.type === 'reply') {
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg transition-colors cursor-pointer ${
                              !notification.read 
                                ? 'bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30' 
                                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={async () => {
                              // Navigate to community tab and view deck
                              setCurrentSection('community')
                              navigateTo('community')
                              setViewingCommunityDeckId(notification.deckId)
                              setTargetCommentId(notification.parentCommentId) // Scroll to the parent comment
                              setIsOpen(false)
                              
                              // Mark notification as read
                              try {
                                await api.markNotificationRead(accessToken!, notification.id)
                                removeMentionNotification(notification.id)
                              } catch (error) {
                                console.error('Failed to mark notification as read:', error)
                                handleAuthError(error)
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {/* User Avatar */}
                              {notification.fromUserAvatar ? (
                                <img
                                  src={notification.fromUserAvatar}
                                  alt={notification.fromUserName}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                  {notification.fromUserName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                      {notification.fromUserName}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      replied to your comment
                                    </p>
                                  </div>
                                  <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                </div>

                                {/* Comment preview */}
                                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {notification.commentText}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Handle deck comment notifications
                      if (notification.type === 'deck_comment') {
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg transition-colors cursor-pointer ${
                              !notification.read 
                                ? 'bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30' 
                                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={async () => {
                              // Navigate to community tab and view deck
                              setCurrentSection('community')
                              navigateTo('community')
                              setViewingCommunityDeckId(notification.deckId)
                              setIsOpen(false)
                              
                              // Mark notification as read
                              try {
                                await api.markNotificationRead(accessToken!, notification.id)
                                removeMentionNotification(notification.id)
                              } catch (error) {
                                console.error('Failed to mark notification as read:', error)
                                handleAuthError(error)
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {/* User Avatar */}
                              {notification.fromUserAvatar ? (
                                <img
                                  src={notification.fromUserAvatar}
                                  alt={notification.fromUserName}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                  {notification.fromUserName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                      {notification.fromUserName}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      commented on your deck "{notification.deckName}"
                                    </p>
                                  </div>
                                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                </div>

                                {/* Comment preview */}
                                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {notification.commentText}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Handle mention notifications (default)
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg transition-colors cursor-pointer ${
                            !notification.read 
                              ? 'bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30' 
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={async () => {
                            // Navigate to community tab
                            navigateTo('community')
                            setIsOpen(false)
                            
                            // Mark notification as read
                            try {
                              await api.markNotificationRead(accessToken!, notification.id)
                              removeMentionNotification(notification.id)
                            } catch (error) {
                              console.error('Failed to mark notification as read:', error)
                              handleAuthError(error)
                            }
                            
                            // TODO: Navigate to the specific deck
                            toast.info('Opening comment...')
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* User Avatar */}
                            {notification.fromUserAvatar ? (
                              <img
                                src={notification.fromUserAvatar}
                                alt={notification.fromUserName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                {notification.fromUserName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                    {notification.fromUserName}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    mentioned you in a comment
                                  </p>
                                </div>
                                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              </div>

                              {/* Comment preview */}
                              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                {notification.commentText}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* See All Button */}
                  {totalNotifications > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        className="w-full py-2 text-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                        onClick={() => {
                          setIsOpen(false)
                          navigateTo('notifications')
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
  )
}
