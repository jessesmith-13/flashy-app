import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/useStore'
import { Bell, X, Check, UserPlus, MessageCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { MOCK_USERS } from '../../utils/mockCommunityData'
import * as api from '../../utils/api'
import { toast } from 'sonner'

export function NotificationCenter() {
  const { 
    friendRequests, 
    removeFriendRequest, 
    addFriend, 
    accessToken,
    mentionNotifications,
    setMentionNotifications,
    removeMentionNotification,
    setCurrentView,
    setCurrentSection,
    setReturnToCommunityDeck
  } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  // Load mention notifications when component mounts or when opened
  useEffect(() => {
    if (accessToken && isOpen) {
      loadMentionNotifications()
    }
  }, [accessToken, isOpen])

  const loadMentionNotifications = async () => {
    if (!accessToken) return
    
    try {
      const notifications = await api.getNotifications(accessToken)
      setMentionNotifications(notifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  // Get friend request users
  const requestUsers = friendRequests
    .map(userId => MOCK_USERS.find(u => u.id === userId))
    .filter((user): user is NonNullable<typeof user> => user !== undefined && user !== null)

  const handleAcceptRequest = async (userId: string) => {
    if (!accessToken) return
    
    setLoading(userId)
    try {
      await api.acceptFriendRequest(accessToken, userId)
      addFriend(userId)
      removeFriendRequest(userId)
      toast.success('Friend request accepted!')
    } catch (error) {
      console.error('Failed to accept friend request:', error)
      toast.error('Failed to accept friend request')
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
      toast.success('Friend request declined')
    } catch (error) {
      console.error('Failed to decline friend request:', error)
      toast.error('Failed to decline friend request')
    } finally {
      setLoading(null)
    }
  }

  const handleMentionClick = (notification: any) => {
    // Set the current view to the notification's context
    setCurrentView(notification.context)
    // Set the current section to the notification's section
    setCurrentSection(notification.section)
    // Set the return to community deck flag
    setReturnToCommunityDeck(true)
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
        {(friendRequests.length + mentionNotifications.length) > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {friendRequests.length + mentionNotifications.length}
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
              {friendRequests.length === 0 && mentionNotifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No new notifications</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {requestUsers.slice(0, 3).map((user) => (
                      <div
                        key={user!.id}
                        className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* User Avatar */}
                          {user!.avatarUrl ? (
                            <img
                              src={user!.avatarUrl}
                              alt={user!.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                              {user!.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                  {user!.displayName || user!.name}
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
                                onClick={() => handleAcceptRequest(user!.id)}
                                disabled={loading === user!.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                              >
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeclineRequest(user!.id)}
                                disabled={loading === user!.id}
                                className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 h-8"
                              >
                                <X className="w-3.5 h-3.5 mr-1.5" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {mentionNotifications.slice(0, 3).map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={async () => {
                          // Navigate to community tab
                          setCurrentSection('community')
                          setIsOpen(false)
                          
                          // Mark notification as read
                          try {
                            await api.markNotificationRead(accessToken!, notification.id)
                            removeMentionNotification(notification.id)
                          } catch (error) {
                            console.error('Failed to mark notification as read:', error)
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
                    ))}
                  </div>
                  
                  {/* See All Button */}
                  {friendRequests.length > 3 || mentionNotifications.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        className="w-full py-2 text-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                        onClick={() => {
                          setIsOpen(false)
                          toast.info('View all notifications coming soon!')
                        }}
                      >
                        See All Notifications ({friendRequests.length + mentionNotifications.length})
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