import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import type { FriendRequestRow, FriendResponse } from '../../types/friends.ts'
import { sendFriendRequestEmail } from '../../lib/emailService.ts'

// ============================================================
// Helper: Get user display info from database
// ============================================================
async function getUserDisplayInfo(userId: string): Promise<{ displayName: string; avatar: string | null; email: string | null }> {
  const { data: userData, error } = await supabase
    .from('users')
    .select('display_name, avatar_url, email')
    .eq('id', userId)
    .single()
  
  if (error || !userData) {
    console.log(`⚠️ Warning: Could not fetch user info for ${userId}, using defaults`)
    return { displayName: 'Anonymous', avatar: null, email: null }
  }
  
  return {
    displayName: userData.display_name || 'Anonymous',
    avatar: userData.avatar_url || null,
    email: userData.email || null
  }
}

export function registerFriendsRequestRoutes(app: Hono) {
  // Get friend requests
  app.get('/friends/requests', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const userId = user.id

      console.log(`🔍 Fetching friend requests for user ${userId}`)

      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'pending')

      if (requestsError) {
        console.log(`❌ Error fetching friend requests: ${requestsError.message}`)
        return c.json({ error: 'Failed to fetch friend requests' }, 500)
      }

      console.log(
        `📊 Fetched ${requestsData?.length || 0} friend requests from database`
      )

      const requestsWithDetails: FriendResponse[] = []

      for (const requestRow of (requestsData ?? []) as FriendRequestRow[]) {
        try {
          // ✅ GET USER INFO FROM DATABASE (not metadata!)
          const userInfo = await getUserDisplayInfo(requestRow.sender_id)

          requestsWithDetails.push({
            id: requestRow.sender_id,
            email: userInfo.email ?? undefined,
            name: userInfo.displayName,  // ✅ Use display_name for both fields
            displayName: userInfo.displayName,
            avatarUrl: userInfo.avatar,
          })
        } catch (err) {
          console.log(
            `⚠️ Error fetching request user ${requestRow.sender_id}:`,
            err
          )
          // Skip this request if there's an error
        }
      }

      console.log(
        `✅ getFriendRequests - returning ${requestsWithDetails.length} friend requests with details`
      )

      return c.json({ requests: requestsWithDetails })
    } catch (error) {
      console.log(`❌ Get friend requests exception: ${error}`)
      return c.json({ error: 'Failed to fetch friend requests' }, 500)
    }
  })

  // Send friend request
  app.post('/friends/request/:friendId', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const friendId = c.req.param('friendId')
      const userId = user.id

      console.log(`📨 User ${userId} sending friend request to ${friendId}`)

      // ============================================================
      // Check if friend request already exists
      // ============================================================

      const {
        data: existingRequest,
        error: checkError
      }: {
        data: { id: string; status: 'pending' | 'accepted' | 'declined' } | null
        error: { code?: string; message: string } | null
      } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', userId)
        .eq('recipient_id', friendId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Error checking existing friend request: ${checkError.message}`)
        return c.json({ error: 'Failed to send friend request' }, 500)
      }

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return c.json({ message: 'Friend request already sent' })
        }
        if (existingRequest.status === 'accepted') {
          return c.json({ message: 'Already friends' })
        }
      }

      // ============================================================
      // Reverse-direction accepted check
      // ============================================================

      const { data: reverseRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', friendId)
        .eq('recipient_id', userId)
        .eq('status', 'accepted')
        .single()

      if (reverseRequest) {
        return c.json({ message: 'Already friends' })
      }

      // ============================================================
      // Create friend request
      // ============================================================

      const now = new Date().toISOString()
      const requestId = crypto.randomUUID()

      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          id: requestId,
          sender_id: userId,
          recipient_id: friendId,
          status: 'pending',
          created_at: now,
          updated_at: now
        })

      if (insertError) {
        console.log(`❌ Error creating friend request: ${insertError.message}`)
        return c.json({ error: 'Failed to send friend request' }, 500)
      }

      // ============================================================
      // Notification
      // ============================================================

      const {
        data: existingNotification,
        error: notifCheckError
      }: {
        data: { id: string } | null
        error: { code?: string; message: string } | null
      } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', friendId)
        .eq('type', 'friend_request')
        .eq('related_user_id', userId)
        .single()

      if (notifCheckError && notifCheckError.code !== 'PGRST116') {
        console.log(`⚠️ Warning: Error checking existing notification: ${notifCheckError.message}`)
      }

      if (!existingNotification) {
        const notificationId = crypto.randomUUID()
        
        // ✅ GET USER INFO FROM DATABASE (not metadata!)
        const userInfo = await getUserDisplayInfo(userId)
        const displayName = userInfo.displayName
        const avatarUrl = userInfo.avatar

        await supabase.from('notifications').insert({
          id: notificationId,
          user_id: friendId,
          type: 'friend_request',
          related_user_id: userId,
          message: `${displayName} sent you a friend request`,
          is_read: false,
          created_at: now,
          requester_display_name: displayName,
          requester_avatar: avatarUrl
        })
        
        console.log(`✅ Friend request notification created from ${userId} to ${friendId}`)
      }

      // ============================================================
      // Email notification
      // ============================================================

      try {
        // ✅ GET USER INFO FROM DATABASE (not metadata!)
        const friendInfo = await getUserDisplayInfo(friendId)
        const senderInfo = await getUserDisplayInfo(userId)
        
        // Get friend's email preferences from database
        const { data: friendPrefs } = await supabase
          .from('users')
          .select('email_notifications')
          .eq('id', friendId)
          .single()

        if (friendInfo.email && friendPrefs?.email_notifications !== false) {
          await sendFriendRequestEmail(
            friendId,
            friendInfo.email,
            friendInfo.displayName,
            senderInfo.displayName,
            senderInfo.avatar
          )
          
          console.log(`📧 Friend request email sent to ${friendInfo.email}`)
        }
      } catch (emailError) {
        console.error(`⚠️ Failed to send friend request email: ${emailError}`)
        // Don't fail the whole operation if email fails
      }

      return c.json({ message: 'Friend request sent successfully' })
    } catch (error) {
      console.log(`❌ Send friend request exception: ${error}`)
      return c.json({ error: 'Failed to send friend request' }, 500)
    }
  })

  // Get pending friend requests (requests I sent)
  app.get('/friends/pending', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const userId = user.id

      console.log(`📤 Fetching pending friend requests for user ${userId}`)

      // ============================================================
      // SQL VERSION: Query friend_requests table for sent requests
      // ============================================================

      const {
        data: pendingRequests,
        error: fetchError
      }: {
        data:
          | {
              id: string
              recipient_id: string
              created_at: string
              status: 'pending'
            }[]
          | null
        error: { message: string } | null
      } = await supabase
        .from('friend_requests')
        .select('id, recipient_id, created_at, status')
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.log(`❌ Error fetching pending requests: ${fetchError.message}`)
        return c.json({ error: 'Failed to fetch pending requests' }, 500)
      }

      console.log(`✅ Found ${pendingRequests?.length || 0} pending friend requests`)

      // ============================================================
      // Enrich with user details
      // ============================================================

      const pendingWithDetails = await Promise.all(
        (pendingRequests ?? []).map(async (request) => {
          try {
            // ✅ GET USER INFO FROM DATABASE (not metadata!)
            const userInfo = await getUserDisplayInfo(request.recipient_id)

            return {
              id: request.id,
              userId: request.recipient_id,
              displayName: userInfo.displayName,
              avatarUrl: userInfo.avatar,
              createdAt: request.created_at,
              status: request.status
            }
          } catch (error) {
            console.log(
              `⚠️ Failed to fetch user data for ${request.recipient_id}:`,
              error
            )
            return {
              id: request.id,
              userId: request.recipient_id,
              displayName: 'Anonymous',
              avatarUrl: null,
              createdAt: request.created_at,
              status: request.status
            }
          }
        })
      )

      return c.json({ pending: pendingWithDetails })
    } catch (error) {
      console.log(`❌ Get pending requests exception: ${error}`)
      return c.json({ error: 'Failed to fetch pending requests' }, 500)
    }
  })

  // Accept friend request (alternate route)
  app.post('/friends/accept/:userId', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const senderId = c.req.param('userId') // user who sent request
      const recipientId = user.id           // current user

      console.log(`🤝 User ${recipientId} accepting friend request from ${senderId}`)

      // ============================================================
      // Find pending friend request
      // ============================================================

      const {
        data: pendingRequest,
        error: checkError
      }: {
        data: { id: string; status: 'pending' } | null
        error: { code?: string; message: string } | null
      } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', senderId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          console.log(
            `❌ No pending friend request found from ${senderId} to ${recipientId}`
          )
          return c.json({ error: 'No pending friend request found' }, 404)
        }

        console.log(`❌ Error checking friend request: ${checkError.message}`)
        return c.json({ error: 'Failed to accept friend request' }, 500)
      }

      if (!pendingRequest) {
        return c.json({ error: 'No pending friend request found' }, 404)
      }

      // ============================================================
      // Update request → accepted
      // ============================================================

      const now = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({
          status: 'accepted',
          updated_at: now
        })
        .eq('id', pendingRequest.id)

      if (updateError) {
        console.log(`❌ Error accepting friend request: ${updateError.message}`)
        return c.json({ error: 'Failed to accept friend request' }, 500)
      }

      console.log(`✅ Updated friend request status to accepted`)

      // ============================================================
      // Insert friendships (bidirectional)
      // ============================================================

      const friendshipId1 = crypto.randomUUID()
      const friendshipId2 = crypto.randomUUID()

      const { error: insertError } = await supabase
        .from('friends')
        .insert([
          {
            id: friendshipId1,
            user_id: senderId,
            friend_id: recipientId,
            created_at: now
          },
          {
            id: friendshipId2,
            user_id: recipientId,
            friend_id: senderId,
            created_at: now
          }
        ])

      if (insertError) {
        console.log(
          `❌ Error creating friendship records: ${insertError.message}`
        )
        return c.json({ error: 'Failed to create friendship' }, 500)
      }

      console.log(
        `✅ Created friendship records in friends table: ${senderId} ↔️ ${recipientId}`
      )

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING - FRIEND ACHIEVEMENTS (BOTH USERS!)
      // ============================================================

      try {
        // Track achievements for BOTH users who just became friends
        const usersToTrack = [
          { userId: recipientId, label: 'Recipient (accepted)' },
          { userId: senderId, label: 'Sender (sent request)' }
        ]

        for (const { userId, label } of usersToTrack) {
          // Count total friends for this user
          const { count: totalFriends, error: countError } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

          if (countError) {
            console.log(`⚠️ Error counting friends for ${label}: ${countError.message}`)
            continue
          }

          console.log(`📊 ${label} ${userId} now has ${totalFriends || 0} friend(s)`)

          // Get current achievements
          const { data: currentAchievements, error: achievementError } = await supabase
            .from('user_achievements')
            .select('unlocked_achievement_ids')
            .eq('user_id', userId)
            .single()

          if (achievementError && achievementError.code !== 'PGRST116') {
            console.log(`⚠️ Error fetching achievements for ${label}: ${achievementError.message}`)
            continue
          }

          const currentUnlocked = currentAchievements?.unlocked_achievement_ids || []
          const newlyUnlocked: string[] = []

          // Check friend achievements
          if ((totalFriends || 0) >= 1 && !currentUnlocked.includes('friendly')) {
            newlyUnlocked.push('friendly')  // First friend
          }
          if ((totalFriends || 0) >= 5 && !currentUnlocked.includes('social-butterfly')) {
            newlyUnlocked.push('social-butterfly')  // 5 friends
          }
          if ((totalFriends || 0) >= 10 && !currentUnlocked.includes('squad-goals')) {
            newlyUnlocked.push('squad-goals')  // 10 friends
          }

          // Update achievements if any unlocked
          if (newlyUnlocked.length > 0) {
            const { error: upsertError } = await supabase
              .from('user_achievements')
              .upsert({
                user_id: userId,
                unlocked_achievement_ids: [...currentUnlocked, ...newlyUnlocked],
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
            
            if (upsertError) {
              console.log(`❌ Error upserting achievements for ${label}: ${upsertError.message}`)
            } else {
              console.log(`🎉 ${label} ${userId} unlocked achievements: ${newlyUnlocked.join(', ')}`)
            }
          } else {
            console.log(`ℹ️ ${label} - No new achievements to unlock`)
          }
        }
      } catch (achievementTrackingError) {
        console.log(`❌ Achievement tracking error: ${achievementTrackingError}`)
        // Don't fail the whole request if achievement tracking fails
      }

      // ============================================================
      // Delete friend request notification
      // ============================================================

      const { error: deleteNotifError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', recipientId)
        .eq('type', 'friend_request')
        .eq('related_user_id', senderId)

      if (deleteNotifError) {
        console.log(
          `⚠️ Warning: Failed to delete friend request notification: ${deleteNotifError.message}`
        )
      } else {
        console.log(`✅ Deleted friend request notification`)
      }

      console.log(`✅ Friend request accepted: ${recipientId} ↔️ ${senderId}`)
      return c.json({ message: 'Friend request accepted' })
    } catch (error) {
      console.log(`❌ Accept friend request exception: ${error}`)
      return c.json({ error: 'Failed to accept friend request' }, 500)
    }
  })

  // Decline friend request
  app.post('/friends/decline/:userId', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const senderId = c.req.param('userId') // user who sent request
      const recipientId = user.id            // current user

      console.log(
        `🚫 User ${recipientId} declining friend request from ${senderId}`
      )

      // ============================================================
      // Update friend request → declined
      // ============================================================

      const {
        error: updateError
      }: {
        error: { message: string } | null
      } = await supabase
        .from('friend_requests')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('sender_id', senderId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')

      if (updateError) {
        console.log(
          `❌ Error updating friend request: ${updateError.message}`
        )
        return c.json({ error: 'Failed to decline friend request' }, 500)
      }

      console.log(`✅ Updated friend request status to declined`)

      // ============================================================
      // Delete friend request notification
      // ============================================================

      const {
        error: deleteNotifError
      }: {
        error: { message: string } | null
      } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', recipientId)
        .eq('type', 'friend_request')
        .eq('related_user_id', senderId)

      if (deleteNotifError) {
        console.log(
          `⚠️ Warning: Failed to delete friend request notification: ${deleteNotifError.message}`
        )
      } else {
        console.log(`✅ Deleted friend request notification`)
      }

      console.log(`✅ Friend request declined: ${senderId} ❌ ${recipientId}`)
      return c.json({ message: 'Friend request declined' })
    } catch (error) {
      console.log(`❌ Decline friend request exception: ${error}`)
      return c.json({ error: 'Failed to decline friend request' }, 500)
    }
  })
}
