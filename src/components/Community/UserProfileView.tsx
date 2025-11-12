import { useState, useEffect } from 'react'
import { AppLayout } from '../Layout/AppLayout'
import { Flame, Trophy, Target, ArrowLeft, UserPlus, UserMinus, Lock, CheckCircle2, ShieldOff, Shield, Users } from 'lucide-react'
import { Button } from '../../ui/button'
import * as api from '../../../utils/api'
import { toast } from 'sonner'
import { getAchievementsByCategory, CATEGORY_LABELS, AchievementCategory } from '../../../utils/achievements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
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
import { useStore } from '../../../store/useStore'

interface UserProfileViewProps {
  userId: string
  onBack: () => void
  onViewDeck?: (deckId: string, userId: string) => void
  onViewUser?: (userId: string) => void
}

export function UserProfileView({ userId, onBack, onViewDeck, onViewUser }: UserProfileViewProps) {
  const { accessToken, friends, pendingFriendRequests, addFriend: addFriendToStore, removeFriend: removeFriendFromStore, addPendingFriendRequest, user } = useStore()
  const [profileUser, setProfileUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [banLoading, setBanLoading] = useState(false)
  const [userFriends, setUserFriends] = useState<any[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)

  const isFriend = friends.includes(userId)
  const isPending = pendingFriendRequests.includes(userId)
  const isOwnProfile = user?.id === userId
  const isSuperuser = user?.isSuperuser === true
  const isUserBanned = profileUser?.isBanned === true

  // Debug logging
  useEffect(() => {
    console.log('UserProfileView - Checking friend status for userId:', userId)
    console.log('UserProfileView - Current friends array:', friends)
    console.log('UserProfileView - isFriend:', isFriend)
    console.log('UserProfileView - isPending:', isPending)
  }, [userId, friends, isFriend, isPending])

  useEffect(() => {
    loadUserProfile()
    loadUserFriends() // Load friends when profile loads
  }, [userId])

  useEffect(() => {
    // Debug log to check superuser status
    console.log('UserProfileView - Current user:', user)
    console.log('UserProfileView - isSuperuser:', isSuperuser)
    console.log('UserProfileView - isOwnProfile:', isOwnProfile)
  }, [user, isSuperuser, isOwnProfile])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      
      // Load from API only
      const userData = await api.getUserProfile(userId)
      console.log('UserProfileView - Loaded user data:', userData)
      console.log('UserProfileView - Achievements:', userData.achievements)
      console.log('UserProfileView - Decks:', userData.decks)
      console.log('UserProfileView - decksPublic:', userData.decksPublic)
      console.log('UserProfileView - Number of decks:', userData.decks?.length || 0)
      setProfileUser(userData)
    } catch (error) {
      console.error('Failed to load user profile:', error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSendFriendRequest = async () => {
    if (!accessToken) return
    
    setActionLoading(true)
    try {
      await api.sendFriendRequest(accessToken, userId)
      addPendingFriendRequest(userId)
      toast.success('Friend request sent!')
    } catch (error) {
      console.error('Failed to send friend request:', error)
      toast.error('Failed to send friend request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!accessToken) return
    
    setActionLoading(true)
    try {
      await api.removeFriend(accessToken, userId)
      removeFriendFromStore(userId)
      toast.success('Friend removed')
    } catch (error) {
      console.error('Failed to remove friend:', error)
      toast.error('Failed to remove friend')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!accessToken || !isSuperuser) return
    
    setBanLoading(true)
    try {
      const newBannedStatus = !isUserBanned
      await api.banUser(accessToken, userId, newBannedStatus)
      
      // Update local state
      setProfileUser((prev: any) => ({
        ...prev,
        isBanned: newBannedStatus
      }))
      
      toast.success(newBannedStatus ? 'User banned successfully' : 'User unbanned successfully')
      setShowBanDialog(false)
    } catch (error) {
      console.error('Failed to ban/unban user:', error)
      toast.error('Failed to ban/unban user')
    } finally {
      setBanLoading(false)
    }
  }

  const loadUserFriends = async () => {
    if (!accessToken) return
    
    setFriendsLoading(true)
    try {
      const friendsData = await api.getUserFriends(accessToken, userId)
      setUserFriends(friendsData)
    } catch (error) {
      console.error('Failed to load user friends:', error)
      toast.error('Failed to load user friends')
    } finally {
      setFriendsLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (!profileUser) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">User not found</div>
        </div>
      </AppLayout>
    )
  }

  // Get user's achievements and decks
  const userAchievementIds = profileUser.achievements || []
  const achievementsByCategory = getAchievementsByCategory(userAchievementIds)
  const totalAchievements = Object.values(achievementsByCategory).reduce(
    (sum, cat) => sum + cat.unlocked.length + cat.locked.length,
    0
  )
  const unlockedCount = userAchievementIds.length

  const userDecks = profileUser.decks || []
  const showDecks = profileUser.decksPublic !== false
  
  // Filter out any null or undefined decks as a safety measure
  const validDecks = userDecks.filter((deck: any) => deck && deck.id && deck.name)
  
  // Debug logging
  console.log('UserProfileView - Computed values:')
  console.log('  userDecks:', userDecks)
  console.log('  showDecks:', showDecks)
  console.log('  validDecks:', validDecks)
  console.log('  validDecks.length:', validDecks.length)

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                {profileUser.avatarUrl ? (
                  <img
                    src={profileUser.avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-4xl">
                    {(profileUser.displayName || profileUser.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h1 className="text-3xl text-gray-900 dark:text-gray-100">{profileUser.displayName || profileUser.name}</h1>
                  {isUserBanned && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-full">
                      Banned
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Trophy className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-gray-900 dark:text-gray-100">{unlockedCount} achievements</span>
                  </div>
                  {showDecks && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Target className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      <span className="text-gray-900 dark:text-gray-100">{userDecks.length} decks</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    <span className="text-gray-900 dark:text-gray-100">{friendsLoading ? '...' : userFriends.length} friends</span>
                  </div>
                </div>
                
                {!isOwnProfile && (
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {isFriend ? (
                      <Button
                        onClick={handleRemoveFriend}
                        disabled={actionLoading}
                        variant="outline"
                        className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove Friend
                      </Button>
                    ) : isPending ? (
                      <Button
                        disabled
                        variant="outline"
                        className="border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Friend Request Pending
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSendFriendRequest}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                      </Button>
                    )}
                    
                    {/* Superuser Ban/Unban Button */}
                    {isSuperuser && (
                      <Button
                        onClick={() => setShowBanDialog(true)}
                        variant="outline"
                        className={isUserBanned 
                          ? "border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          : "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        }
                      >
                        {isUserBanned ? (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Unban User
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-4 h-4 mr-2" />
                            Ban User
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="achievements" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="decks">Decks</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
            </TabsList>

            {/* Achievements Tab */}
            <TabsContent value="achievements">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Achievements</h2>
                
                <div className="space-y-8">
                  {Object.entries(achievementsByCategory).map(([category, { unlocked, locked }]) => {
                    const total = unlocked.length + locked.length
                    if (total === 0) return null
                    
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-gray-900 dark:text-gray-100">
                            {CATEGORY_LABELS[category as AchievementCategory]}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {unlocked.length}/{total}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Show unlocked first */}
                          {unlocked.map((achievement) => (
                            <div
                              key={achievement.id}
                              className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-3xl">{achievement.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                                    {achievement.title}
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Show locked achievements */}
                          {locked.map((achievement) => (
                            <div
                              key={achievement.id}
                              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-3xl grayscale">{achievement.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                                    {achievement.title}
                                    <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Decks Tab */}
            <TabsContent value="decks">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Decks</h2>
                
                {!showDecks ? (
                  <div className="text-center py-12">
                    <Lock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">This user's decks are private</p>
                  </div>
                ) : validDecks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">No decks yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {validDecks.map((deck) => (
                      <div
                        key={deck.id}
                        onClick={() => onViewDeck?.(deck.id, userId)}
                        className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer"
                        style={{ borderColor: deck.color + '40', backgroundColor: deck.color + '10' }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-4xl">{deck.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 dark:text-gray-100 truncate">{deck.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Friends Tab */}
            <TabsContent value="friends">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Friends</h2>
                
                {friendsLoading ? (
                  <div className="text-center py-12">
                    <Flame className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading friends...</p>
                  </div>
                ) : userFriends.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">No friends yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userFriends.map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => onViewUser?.(friend.id)}
                        className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt="Profile"
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-3xl">
                                {(friend.displayName || friend.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 dark:text-gray-100 truncate">{friend.displayName || friend.name}</h3>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Ban/Unban Confirmation Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isUserBanned ? 'Unban User?' : 'Ban User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isUserBanned ? (
                <>
                  Are you sure you want to unban <strong>{profileUser.displayName || profileUser.name}</strong>? 
                  They will regain full access to the platform.
                </>
              ) : (
                <>
                  Are you sure you want to ban <strong>{profileUser.displayName || profileUser.name}</strong>? 
                  This will restrict their access to the platform.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className={isUserBanned 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-red-600 hover:bg-red-700"
              }
              disabled={banLoading}
            >
              {banLoading ? 'Processing...' : (isUserBanned ? 'Unban User' : 'Ban User')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}