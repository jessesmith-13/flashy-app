// routes/users/friends.ts
import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerFriendsRoutes(app: Hono) {
  app.get('/users/:userId/friends', async c => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data?.user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = c.req.param('userId')

    // 1️⃣ Get friend IDs
    const { data: friendRows, error: friendsError } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)

    if (friendsError) {
      console.error('❌ Failed to fetch friends:', friendsError.message)
      return c.json({ error: 'Failed to get friends' }, 500)
    }

    if (!friendRows || friendRows.length === 0) {
      return c.json({ friends: [] })
    }

    const friendIds = friendRows.map(r => r.friend_id)

    // 2️⃣ Fetch friend user profiles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, decks_public')
      .in('id', friendIds)

    if (usersError) {
      console.error('❌ Failed to fetch friend users:', usersError.message)
      return c.json({ error: 'Failed to get friends' }, 500)
    }

    return c.json({
      friends: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        decksPublic: u.decks_public ?? true,
      })),
    })
  })
}