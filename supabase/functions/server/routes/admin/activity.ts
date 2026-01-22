import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { buildUserActivity } from '../../lib/adminHelpers.ts'
import { requireSuperuser } from '../../lib/guards/requireSuperuser.ts'

export function registerAdminActivityRoutes(app: Hono) {
  app.get('/admin/users/:userId/activity', async (c) => {
    const auth = await requireSuperuser(c)
    if (!auth.ok) return auth.response

    const query = c.req.param('userId')

    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', query)
      .single()

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    const activity = await buildUserActivity(targetUser)

    return c.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.display_name,
        isModerator: targetUser.is_moderator,
        isSuperuser: targetUser.is_superuser,
        isBanned: targetUser.is_banned
      },
      activity
    })
  })
}