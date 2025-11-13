import { useState, useEffect } from 'react'
import { useStore } from '../../../store/useStore'
import { ArrowLeft, Bell, Check, X, UserPlus, MessageCircle, Reply, FileText, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import * as api from '../../../utils/api'
import { toast } from 'sonner'

export function NotificationsScreen() {
  const { 
    setCurrentView,
    removeFriendRequest, 
    addFriend, 
    accessToken,
    mentionNotifications,
    setMentionNotifications,
    removeMentionNotification,
    setViewingCommunityDeckId,
    setTargetCommentId
  } = useStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'friend_requests' | 'comments' | 'replies'>('all')

  // Load notifications when component mounts
  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    if (!accessToken) return
    
    try {
      const notifications = await api.getNotifications(accessToken)
      setMentionNotifications(notifications)
      
      // Mark all as seen when viewing this page
      if (notifications.length > 0) {
        await api.markAllNotificationsSeen(accessToken)
      }
    } catch (error) {
      // Completely silent - notifications are non-critical
      // Only log to console for debugging
    }
  }

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
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!accessToken) return
    
    try {
      await api.markNotificationRead(accessToken, notificationId)
      removeMentionNotification(notificationId)
      toast.success('Notification removed')
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  const handleClearAll = async () => {
    if (!accessToken) return
    
    try {
      await api.clearAllNotifications(accessToken)
      setMentionNotifications([])
      toast.success('All notifications cleared')
    } catch (error) {
      console.error('Failed to clear notifications:', error)
      toast.error('Failed to clear notifications')
    }
  }

  // Filter notifications based on selected filter
  const filteredNotifications = mentionNotifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'friend_requests') return notification.type === 'friend_request'
    if (filter === 'comments') return notification.type === 'deck_comment'
    if (filter === 'replies') return notification.type === 'reply'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('decks')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
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
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All ({mentionNotifications.length})
          </button>
          <button
            onClick={() => setFilter('friend_requests')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === 'friend_requests'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Friend Requests ({mentionNotifications.filter(n => n.type === 'friend_request').length})
          </button>
          <button
            onClick={() => setFilter('comments')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === 'comments'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Comments ({mentionNotifications.filter(n => n.type === 'deck_comment').length})
          </button>
          <button
            onClick={() => setFilter('replies')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === 'replies'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Replies ({mentionNotifications.filter(n => n.type === 'reply').length})
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
              {filter === 'all' 
                ? "You're all caught up!"
                : `No ${filter.replace('_', ' ')} at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              // Friend Request Notification
              if (notification.type === 'friend_request') {
                return (
                  <div
                    key={notification.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      {notification.fromUserAvatar ? (
                        <img
                          src={notification.fromUserAvatar}
                          alt={notification.fromUserName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                          {notification.fromUserName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {notification.fromUserName}
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
                            onClick={() => handleAcceptRequest(notification.fromUserId)}
                            disabled={loading === notification.fromUserId}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineRequest(notification.fromUserId)}
                            disabled={loading === notification.fromUserId}
                            className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Reply Notification
              if (notification.type === 'reply') {
                return (
                  <div
                    key={notification.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                    onClick={async () => {
                      // Navigate to community tab and view deck
                      setCurrentView('community')
                      setViewingCommunityDeckId(notification.deckId)
                      setTargetCommentId(notification.parentCommentId)
                      
                      // Mark notification as read
                      try {
                        await api.markNotificationRead(accessToken!, notification.id)
                        removeMentionNotification(notification.id)
                      } catch (error) {
                        console.error('Failed to mark notification as read:', error)
                      }
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification.id)
                      }}
                      className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      {notification.fromUserAvatar ? (
                        <img
                          src={notification.fromUserAvatar}
                          alt={notification.fromUserName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                          {notification.fromUserName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {notification.fromUserName}
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
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Deck Comment Notification
              if (notification.type === 'deck_comment') {
                return (
                  <div
                    key={notification.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                    onClick={async () => {
                      // Navigate to community tab and view deck
                      setCurrentView('community')
                      setViewingCommunityDeckId(notification.deckId)
                      
                      // Mark notification as read
                      try {
                        await api.markNotificationRead(accessToken!, notification.id)
                        removeMentionNotification(notification.id)
                      } catch (error) {
                        console.error('Failed to mark notification as read:', error)
                      }
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification.id)
                      }}
                      className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      {notification.fromUserAvatar ? (
                        <img
                          src={notification.fromUserAvatar}
                          alt={notification.fromUserName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                          {notification.fromUserName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {notification.fromUserName}
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
                      </div>
                    </div>
                  </div>
                )
              }
              
              return null
            })}
          </div>
        )}
      </div>
    </div>
  )
}