import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { updateProfile, getUserFriends } from '../../../utils/api/users'
import { uploadAvatar } from '../../../utils/api/storage'
import { removeFriend as removeFriendApi } from '../../../utils/api/friends'
import { toast } from 'sonner'
import { getAchievementsByCategory } from '../../../utils/achievements'
import { AppLayout } from '../Layout/AppLayout'
import { ProfileHeader } from './ProfileHeader'
import { ProfileStats } from './ProfileStats'
import { ProfileAchievements } from './ProfileAchievements'
import { ProfileFriends } from './ProfileFriends'
import { EditProfileDialog } from './EditProfileDialog'
import { InviteFriendDialog } from './InviteFriendDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { BarChart3, Trophy, Users } from 'lucide-react'

export function ProfileScreen() {
  const { user, accessToken, decks, studySessions, userStats, userAchievements, setUserStats, updateUser, friends, removeFriend, setViewingUserId, setUserProfileReturnView, fetchUserAchievements } = useStore()
  const { navigateTo } = useNavigation()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [inviteFriendDialogOpen, setInviteFriendDialogOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [decksPublic, setDecksPublic] = useState(user?.decksPublic ?? true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userFriends, setUserFriends] = useState<any[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)

    useEffect(() => {
    if (accessToken && !userAchievements) {
      console.log('📊 Fetching achievements for profile...')
      fetchUserAchievements()
    }
  }, [accessToken, userAchievements, fetchUserAchievements])

  useEffect(() => {
    loadUserFriends()
  }, [accessToken, user?.id])

  // Reload friends when the friends array in Zustand changes
  useEffect(() => {
    if (friends.length > 0) {
      loadUserFriends()
    }
  }, [friends])

  useEffect(() => {
    // Calculate user stats
    const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount || 0), 0)
    const totalSessions = studySessions.length
    const avgScore = totalSessions > 0
      ? studySessions.reduce((sum, session) => sum + session.score, 0) / totalSessions
      : 0

    // Calculate study streak
    const sortedSessions = [...studySessions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    console.log('📚 All study sessions:', studySessions.map(s => ({
      date: s.date,
      dateString: new Date(s.date).toDateString(),
      score: s.score
    })))
    
    // Group sessions by day (in case there are multiple sessions per day)
    const uniqueDaysSet = new Set<number>()
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date)
      sessionDate.setHours(0, 0, 0, 0)
      uniqueDaysSet.add(sessionDate.getTime())
    }
    
    // Convert to sorted array of unique days as timestamps (most recent first)
    const sortedDayTimestamps = Array.from(uniqueDaysSet).sort((a, b) => b - a)
    
    let streak = 0
    
    if (sortedDayTimestamps.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayTimestamp = yesterday.getTime()
      
      const mostRecentStudyTimestamp = sortedDayTimestamps[0]
      
      // Check if the most recent study was today or yesterday
      // (if yesterday, the streak is still active but they haven't studied today yet)
      if (mostRecentStudyTimestamp === todayTimestamp || mostRecentStudyTimestamp === yesterdayTimestamp) {
        // Start counting consecutive days from the most recent study day
        let expectedTimestamp = mostRecentStudyTimestamp
        
        for (const dayTimestamp of sortedDayTimestamps) {
          if (dayTimestamp === expectedTimestamp) {
            streak++
            // Move to previous day
            const nextExpectedDate = new Date(expectedTimestamp)
            nextExpectedDate.setDate(nextExpectedDate.getDate() - 1)
            expectedTimestamp = nextExpectedDate.getTime()
          } else {
            // Gap in streak found, stop counting
            break
          }
        }
        
        console.log('📊 Streak calculation:', {
          today: new Date(todayTimestamp).toDateString(),
          mostRecentStudy: new Date(mostRecentStudyTimestamp).toDateString(),
          uniqueDays: sortedDayTimestamps.map(ts => new Date(ts).toDateString()),
          calculatedStreak: streak
        })
      } else {
        console.log('📊 Streak broken - last study was more than 1 day ago:', {
          today: new Date(todayTimestamp).toDateString(),
          lastStudy: new Date(mostRecentStudyTimestamp).toDateString()
        })
      }
      // If most recent study was more than 1 day ago, streak is 0 (broken)
    }
    
    const lastStudy = studySessions.length > 0 
      ? new Date(studySessions[studySessions.length - 1].date).toDateString()
      : ''

    // Calculate cards reviewed and perfect scores
    const cardsReviewed = studySessions.reduce((sum, session) => sum + (session.cardsStudied || 0), 0)
    const perfectScores = studySessions.filter(s => s.score === 100).length

    setUserStats({
      totalDecks: decks.length,
      totalCards,
      studyStreak: streak,
      lastStudyDate: lastStudy,
      totalStudySessions: totalSessions,
      averageScore: Math.round(avgScore),
      cardsReviewed,
      correctAnswersInRow: 0, // TODO: implement proper tracking
      totalStudyMinutes: totalSessions * 15, // Estimate
      perfectScores,
    })
  }, [decks, studySessions, setUserStats])

  const achievementsByCategory = getAchievementsByCategory(
    userAchievements?.unlockedAchievementIds || []
  )

  const totalAchievements = Object.values(achievementsByCategory).reduce(
    (sum, cat) => sum + cat.unlocked.length + cat.locked.length,
    0
  )
  const unlockedCount = userAchievements?.unlockedAchievementIds.length || 0
  const progressPercentage = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0

  const handleSaveProfile = async () => {
    if (!accessToken) return
    
    setSaving(true)
    try {
      if (!user?.id || !accessToken) return
      const updatedUser = await updateProfile(
        user.id,
        accessToken,
        {
          displayName: displayName.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
          decksPublic,
        }
      )
      
      updateUser({
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        decksPublic: updatedUser.decksPublic,
      })
      
      toast.success('Profile updated successfully!')
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && accessToken) {
        await handleFileUpload(file)
      }
    }
    input.click()
  }

  const handleFileUpload = async (file: File) => {
    if (!accessToken || !user?.id) return

    // Validate file size
    if (file.size > 5242880) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only images are allowed.')
      return
    }

    setUploading(true)
    try {
      console.log('Uploading avatar...')
      const url = await uploadAvatar(accessToken, file)
      console.log('Avatar uploaded:', url)
      
      // Update profile with new avatar URL
      const updatedUser = await updateProfile(user.id, accessToken, {
        avatarUrl: url,
      })
      
      updateUser({
        avatarUrl: updatedUser.avatarUrl,
      })
      
      setAvatarUrl(url)
      toast.success('Profile picture updated!')
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      toast.error('Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  const loadUserFriends = async () => {
    if (!accessToken || !user?.id) {
      console.log('Skipping loadUserFriends: no accessToken or user.id')
      return
    }
    
    setFriendsLoading(true)
    try {
      const friendsData = await getUserFriends(accessToken, user.id)
      setUserFriends(friendsData)
    } catch (error) {
      console.error('Failed to load user friends:', error)
      // Only show toast if it's not an auth error (auth errors are handled by App.tsx)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('Unauthorized') && !errorMessage.includes('401')) {
        toast.error('Failed to load user friends')
      }
    } finally {
      setFriendsLoading(false)
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    if (!accessToken) return

    try {
      await removeFriendApi(accessToken, friendId)
      
      // Update Zustand store
      removeFriend(friendId)
      
      // Update local state
      setUserFriends((prev) => prev.filter((f) => f.id !== friendId))
      
      toast.success('Friend removed')
    } catch (error) {
      console.error('Failed to remove friend:', error)
      toast.error('Failed to remove friend')
    }
  }

  const handleViewFriend = (friendId: string) => {
    // Navigate to community tab and set the viewing user ID in Zustand
    setViewingUserId(friendId)
    setUserProfileReturnView('profile') // Set return view to profile
    navigateTo('community')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto overflow-x-hidden">
          <ProfileHeader
            user={{
              avatarUrl: user?.avatarUrl,
              displayName: user?.displayName,
              name: user?.name,
            }}
            studyStreak={userStats?.studyStreak || 0}
            unlockedAchievements={unlockedCount}
            totalAchievements={totalAchievements}
            friendsCount={userFriends.length}
            uploading={uploading}
            onAvatarClick={handleAvatarClick}
            onEditClick={() => setEditDialogOpen(true)}
            onInviteClick={() => setInviteFriendDialogOpen(true)}
          />

          {/* Tabs */}
          <Tabs defaultValue="stats" className="w-full overflow-x-hidden" onValueChange={(value) => {
            if (value === 'friends' && userFriends.length === 0 && !friendsLoading) {
              loadUserFriends()
            }
          }}>
            <TabsList className="w-full flex justify-center mb-6">
              <TabsTrigger value="stats" className="flex-none"><BarChart3 className="w-4 h-4 mr-2" />Stats</TabsTrigger>
              <TabsTrigger value="achievements" className="flex-none"><Trophy className="w-4 h-4 mr-2" />Achievements</TabsTrigger>
              <TabsTrigger value="friends" className="flex-none"><Users className="w-4 h-4 mr-2" />Friends</TabsTrigger>
            </TabsList>

            {/* Stats Tab */}
            <TabsContent value="stats" className="w-full overflow-hidden">
              <ProfileStats
                userStats={{
                  totalDecks: userStats?.totalDecks || 0,
                  cardsReviewed: userStats?.cardsReviewed || 0,
                  totalStudySessions: userStats?.totalStudySessions || 0,
                  averageScore: userStats?.averageScore || 0,
                }}
                unlockedCount={unlockedCount}
                totalAchievements={totalAchievements}
                progressPercentage={progressPercentage}
              />
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="w-full overflow-hidden">
              <ProfileAchievements
                unlockedAchievementIds={userAchievements?.unlockedAchievementIds || []}
              />
            </TabsContent>

            {/* Friends Tab */}
            <TabsContent value="friends" className="w-full overflow-hidden">
              <ProfileFriends
                friends={userFriends}
                loading={friendsLoading}
                onRemoveFriend={handleRemoveFriend}
                onViewFriend={handleViewFriend}
              />
            </TabsContent>
          </Tabs>

          <EditProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            avatarUrl={avatarUrl}
            onAvatarUrlChange={setAvatarUrl}
            decksPublic={decksPublic}
            onDecksPublicChange={setDecksPublic}
            onAvatarUploadClick={handleAvatarClick}
            onSave={handleSaveProfile}
            saving={saving}
            uploading={uploading}
          />

          <InviteFriendDialog
            open={inviteFriendDialogOpen}
            onOpenChange={setInviteFriendDialogOpen}
            accessToken={accessToken}
          />
        </div>
      </div>
    </AppLayout>
  )
}