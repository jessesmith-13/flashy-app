import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { requireSuperuser } from '../../lib/guards/requireSuperuser.ts'
import { toCamelCase } from "../../lib/utils/case.ts"

export function registerAdminUserRoutes(app: Hono) {

  app.get('/admin/users', async c => {
    const guard = await requireSuperuser(c)
    if (guard.error) return guard.error

    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    const usersData = { users: toCamelCase(data || []) }

    return c.json(usersData)
  })

  app.post('/admin/users/:userId/moderator', async c => {
    const guard = await requireSuperuser(c)
    if (guard.error) return guard.error

    const { isModerator } = await c.req.json()
    if (typeof isModerator !== 'boolean') {
      return c.json({ error: 'isModerator must be boolean' }, 400)
    }

    await supabase
      .from('users')
      .update({ is_moderator: isModerator })
      .eq('id', c.req.param('userId'))

    return c.json({ success: true })
  })

  app.post('/admin/users/:userId/ban', async c => {
    const guard = await requireSuperuser(c)
    if (guard.error) return guard.error

    const { isBanned, reason } = await c.req.json()

    await supabase.from('users').update({
      is_banned: isBanned,
      banned_reason: isBanned ? reason : null,
      banned_at: isBanned ? new Date().toISOString() : null,
      banned_by: guard.user.id,
    }).eq('id', c.req.param('userId'))

    return c.json({ success: true })
  })
}