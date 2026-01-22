// routes/users/fixSubscriptionTier.ts
import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { FixSubscriptionResponse } from '../../types/users.ts'

export function registerFixSubscriptionRoutes(app: Hono) {
  app.post('/users/fix-subscription-tier', async c => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data, error } = await supabase.auth.getUser(accessToken)
    const user = data?.user

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const currentTier = user.user_metadata?.subscriptionTier as string | undefined

    if (currentTier === 'premium') {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          subscriptionTier: 'free',
        },
      })

      const hasPremiumAccess =
        user.user_metadata?.isModerator === true ||
        user.user_metadata?.isSuperuser === true

      const response: FixSubscriptionResponse = {
        success: true,
        message: 'Subscription tier fixed',
        oldTier: 'premium',
        newTier: 'free',
        hasPremiumAccess,
        note: hasPremiumAccess
          ? 'Premium access retained via staff role'
          : 'Upgrade to premium for advanced features',
      }

      return c.json(response)
    }

    return c.json({
      success: true,
      message: 'No fix needed',
      currentTier: currentTier ?? 'free',
    })
  })
}