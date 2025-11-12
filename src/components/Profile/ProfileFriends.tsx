import { Users } from 'lucide-react'

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
}

export function ProfileFriends({ friends, loading }: ProfileFriendsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
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
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
