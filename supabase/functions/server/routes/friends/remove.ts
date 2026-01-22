import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { supabaseAdmin } from '../../lib/supabaseAdmin.ts'

export function registerFriendsRemoveRoutes(app: Hono) {
  app.delete('/friends/:friendId', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const friendId = c.req.param('friendId')
      if (!friendId) {
        return c.json({ error: 'Friend ID is required' }, 400)
      }

      const userId = user.id

      // Delete user → friend
      const { error: deleteError1 } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', friendId)

      // Delete friend → user
      const { error: deleteError2 } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', userId)

      if (deleteError1 && deleteError2) {
        return c.json({ error: 'Failed to remove friend' }, 500)
      }

      // Cleanup friend_requests (either direction)
      await supabaseAdmin
        .from('friend_requests')
        .delete()
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`
        )

      return c.json({ message: 'Friend removed successfully' })
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })
}