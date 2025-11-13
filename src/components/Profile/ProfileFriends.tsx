import { Users, UserMinus } from 'lucide-react'
import { Button } from '../../ui/button'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'

interface Friend {
  id: string
  displayName?: string
  name?: string
  email: string
  avatarUrl?: string
}

interface ProfileFriendsProps {
  friends: Friend[]
  loading: boolean
  onRemoveFriend: (friendId: string) => void
  onViewFriend?: (friendId: string) => void
}

export function ProfileFriends({ friends, loading, onRemoveFriend, onViewFriend }: ProfileFriendsProps) {
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm w-full overflow-hidden">
      <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Friends</h2>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading friends...</p>
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No friends yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Send friend requests in the Community tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="p-4 sm:p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer overflow-hidden"
              onClick={() => onViewFriend?.(friend.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xl">
                      {(friend.displayName || friend.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 dark:text-gray-100 truncate">{friend.displayName || friend.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{friend.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation() // Prevent triggering the card click
                    setFriendToRemove(friend)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 flex-shrink-0"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium text-gray-900 dark:text-gray-100">{friendToRemove?.displayName || friendToRemove?.name}</span> from your friends list? You can always send them another friend request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (friendToRemove) {
                  onRemoveFriend(friendToRemove.id)
                  setFriendToRemove(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Remove Friend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}