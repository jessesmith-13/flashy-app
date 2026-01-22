import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import type { FriendRequestRow, FriendResponse } from '../../types/friends.ts'

export function registerFriendsListRoutes(app: Hono) {

  // Get current user's friends list
  app.get('/friends', async (c) => {
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

      console.log(`🔍 Fetching friends for user ${userId}`)

      const { data: friendsData, error: friendsError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .eq('status', 'accepted')

      if (friendsError) {
        console.log(`❌ Error fetching friends: ${friendsError.message}`)
        return c.json({ error: 'Failed to fetch friends' }, 500)
      }

      console.log(`📊 Fetched ${friendsData?.length || 0} friends from database`)

      const enrichedFriends = await Promise.all(
        ((friendsData ?? []) as FriendRequestRow[]).map(
          async (friendRow): Promise<FriendResponse | null> => {
            const friendId =
              friendRow.sender_id === userId
                ? friendRow.recipient_id
                : friendRow.sender_id

            try {
              const { data } =
                await supabase.auth.admin.getUserById(friendId)

              const friendUser = data?.user
              if (!friendUser) return null

              return {
                id: friendUser.id,
                email: friendUser.email ?? undefined,
                name: friendUser.user_metadata?.name ?? '',
                displayName:
                  friendUser.user_metadata?.displayName ??
                  friendUser.user_metadata?.name ??
                  '',
                avatarUrl: friendUser.user_metadata?.avatarUrl ?? null,
                decksPublic:
                  friendUser.user_metadata?.decksPublic ?? true,
              }
            } catch (err) {
              console.log(`⚠️ Error fetching friend ${friendId}:`, err)
              return null
            }
          }
        )
      )

      // Type-safe filter
      const validFriends: FriendResponse[] =
        enrichedFriends.filter(
          (f): f is FriendResponse => f !== null
        )

      console.log(
        `✅ getFriends - returning ${validFriends.length} friends with details`
      )

      return c.json({ friends: validFriends })
    } catch (error) {
      console.log(`❌ Get friends exception: ${error}`)
      return c.json({ error: 'Failed to fetch friends' }, 500)
    }
  })
}