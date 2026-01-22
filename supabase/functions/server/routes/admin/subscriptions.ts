import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { requireSuperuser } from '../../lib/guards/requireSuperuser.ts'

export function registerAdminSubscriptionRoutes(app: Hono) {

  app.post('/admin/users/:userId/premium', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    const { tier } = await c.req.json()

    await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_expiry: tier === 'lifetime'
          ? null
          : new Date().toISOString(),
      })
      .eq('id', c.req.param('userId'))

    return c.json({ success: true })
  })

  app.post('/admin/users/:userId/demote', async c => {
    const guard = await requireSuperuser(c)
    if (!guard.ok) return guard.response

    await supabase
      .from('users')
      .update({
        subscription_tier: 'free',
        subscription_expiry: null,
      })
      .eq('id', c.req.param('userId'))

    return c.json({ success: true })
  })
}