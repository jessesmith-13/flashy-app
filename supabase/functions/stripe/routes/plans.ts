import type { Hono, Context } from 'npm:hono@4'
import * as stripeService from '../lib/stripe.ts'
import { supabase } from '../lib/supabase.ts'
import { 
  sendCancellationConfirmationEmail, 
  sendSubscriptionUpgradedEmail, 
  sendSubscriptionDowngradedEmail 
} from '../../server/lib/emailService.ts'

export function registerSubscriptionPlanRoutes(app: Hono) {

  // ============================================================
  // Cancel Subscription
  // ============================================================
  app.post('/subscriptions/cancel-subscription', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Missing access token' }, 401)

      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      if (error || !user) return c.json({ error: 'Unauthorized' }, 401)

      // 1️⃣ Load active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      console.log('🔍 Cancel attempt:', {
        userId: user.id,
        subscriptionFound: !!subscription,
        tier: subscription?.tier,
        subscriptionIdFromDB: subscription?.stripe_subscription_id,
        subscriptionIdLength: subscription?.stripe_subscription_id?.length
      })

      if (!subscription || !subscription.stripe_subscription_id) {
        return c.json({ error: 'No active subscription found' }, 404)
      }

      console.log('🚀 Attempting to cancel in Stripe:', subscription.stripe_subscription_id)

      // 2️⃣ Cancel in Stripe (period end)
      const stripeSub = await stripeService.cancelSubscription(
        subscription.stripe_subscription_id
      )

      const periodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000).toISOString()
        : subscription.expires_at

      const now = new Date().toISOString()

      // 3️⃣ Update subscriptions table
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceling',
          canceled_at: now,
          current_period_end: periodEnd,
          expires_at: periodEnd,
          updated_at: now,
        })
        .eq('id', subscription.id)

      // 4️⃣ Update users table
      await supabase
        .from('users')
        .update({
          subscription_cancelled_at_period_end: true,
          subscription_expiry: periodEnd,
          updated_at: now,
          subscription_tier: 'free'
        })
        .eq('id', user.id)

      // 5️⃣ Mirror auth metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          subscriptionTier: 'free',
          subscriptionCancelledAtPeriodEnd: true,
          subscriptionExpiry: periodEnd,
        },
      })

      // ✅ SEND CANCELLATION EMAIL
      const { data: userData } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', user.id)
        .single()

      if (userData) {
        const planNames = {
          monthly: 'Premium Monthly',
          annual: 'Premium Annual',
          lifetime: 'Premium Lifetime'
        }
        
        await sendCancellationConfirmationEmail(
          userData.email,
          userData.display_name || 'there',
          planNames[subscription.tier as keyof typeof planNames] || 'Premium',
          new Date(periodEnd).toLocaleDateString()
        )
      }

      return c.json({
        success: true,
        expiresAt: periodEnd,
        message: 'Subscription will be cancelled at period end',
      })
    } catch (err) {
      console.error('Cancel subscription error:', err)
      return c.json({ error: 'Failed to cancel subscription' }, 500)
    }
  })

  // ============================================================
  // Create Customer Portal Session
  // ============================================================
  app.post('/subscriptions/create-portal-session', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Missing access token' }, 401)

      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      if (error || !user) return c.json({ error: 'Unauthorized' }, 401)

      const stripeCustomerId = user.user_metadata?.stripeCustomerId
      if (!stripeCustomerId) {
        return c.json({ error: 'No Stripe customer found' }, 404)
      }

      const origin =
        c.req.header('origin') ??
        c.req.header('referer')?.replace(/\/$/, '') ??
        'https://flashy.app'

      console.log('Stripe origin:', origin)

      const session = await stripeService.createCustomerPortalSession(
        stripeCustomerId,
        `${origin}/settings`,
      )

      return c.json({ url: session.url })
    } catch (err) {
      console.error('Portal session error:', err)
      return c.json({ error: 'Failed to create portal session' }, 500)
    }
  })

  // Change Subscription Plan
  app.post('/subscriptions/change-subscription-plan', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { newPlan } = await c.req.json()

      if (!['monthly', 'annual', 'lifetime'].includes(newPlan)) {
        return c.json({ error: 'Invalid plan' }, 400)
      }

      // ✅ Get current subscription from DATABASE, not metadata
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier, stripe_subscription_id, subscription_expiry')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        return c.json({ error: 'User not found' }, 404)
      }

      const currentTier = userData.subscription_tier
      const stripeSubscriptionId = userData.stripe_subscription_id

      let newSubscriptionId = stripeSubscriptionId
      let newExpiry = userData.subscription_expiry ?? null

      // ============================================================
      // LIFETIME UPGRADE
      // ============================================================
      if (newPlan === 'lifetime') {
        if (stripeSubscriptionId) {
          await stripeService.cancelSubscription(stripeSubscriptionId)
        }

        newSubscriptionId = null
        newExpiry = null
      } else {
        // ============================================================
        // MONTHLY / ANNUAL CHANGE
        // ============================================================
        if (!stripeSubscriptionId) {
          return c.json({ error: 'No active Stripe subscription found' }, 404)
        }

        const priceId =
          stripeService.STRIPE_PRICE_IDS[newPlan as 'monthly' | 'annual']

        if (!priceId) {
          return c.json({ error: 'Price ID not configured' }, 500)
        }

        const updatedSubscription =
          await stripeService.updateSubscriptionPrice(
            stripeSubscriptionId,
            priceId,
          )

        newExpiry = new Date(
          updatedSubscription.current_period_end * 1000,
        ).toISOString()
      }

      // ============================================================
      // UPDATE USER METADATA (for backward compatibility)
      // ============================================================
      const { data: userAuthData, error: getUserError } =
        await supabase.auth.admin.getUserById(user.id)

      if (getUserError || !userAuthData) {
        return c.json({ error: 'User not found' }, 404)
      }

      const newMetadata = {
        ...userAuthData.user.user_metadata,
        subscriptionTier: newPlan,
        subscriptionExpiry: newExpiry,
        stripeSubscriptionId: newSubscriptionId,
        subscriptionCancelledAtPeriodEnd: false,
      }

      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: newMetadata,
      })

      // ============================================================
      // USERS TABLE (source of truth)
      // ============================================================
      await supabase
        .from('users')
        .update({
          subscription_tier: newPlan,
          subscription_expiry: newExpiry,
          stripe_subscription_id: newSubscriptionId,
          subscription_cancelled_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // ============================================================
      // SUBSCRIPTIONS TABLE
      // ============================================================
      await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: user.id,
            tier: newPlan,
            status: 'active',
            stripe_subscription_id: newSubscriptionId,
            current_period_end: newExpiry,
            expires_at: newExpiry,
            is_lifetime: newPlan === 'lifetime',
            canceled_at: null,
            notes: `Subscription plan changed from ${currentTier} to ${newPlan}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )


        // ✅ SEND UPGRADE/DOWNGRADE EMAIL
        const { data: emailUserData } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', user.id)
          .single()

        if (emailUserData) {
          const planNames = {
            monthly: 'Premium Monthly',
            annual: 'Premium Annual',
            lifetime: 'Premium Lifetime',
            free: 'Free'
          }

          const tierOrder = { free: 0, monthly: 1, annual: 2, lifetime: 3 }
          const isUpgrade = tierOrder[newPlan as keyof typeof tierOrder] > tierOrder[currentTier as keyof typeof tierOrder]

          if (isUpgrade) {
            const savings = newPlan === 'annual' && currentTier === 'monthly' ? '$24/year' : undefined
            
            await sendSubscriptionUpgradedEmail(
              emailUserData.email,
              emailUserData.display_name || 'there',
              planNames[currentTier as keyof typeof planNames] || currentTier,
              planNames[newPlan as keyof typeof planNames] || newPlan,
              savings
            )
          } else {
            const featuresLost = newPlan === 'free' 
              ? ['Unlimited decks', 'AI features', 'Community publishing', 'Advanced study modes']
              : newPlan === 'monthly' && currentTier === 'annual'
              ? ['Annual billing discount (20% savings)']
              : []
            
            await sendSubscriptionDowngradedEmail(
              emailUserData.email,
              emailUserData.display_name || 'there',
              planNames[currentTier as keyof typeof planNames] || currentTier,
              planNames[newPlan as keyof typeof planNames] || newPlan,
              new Date(newExpiry || Date.now()).toLocaleDateString(),
              featuresLost
            )
          }
        }

        return c.json({
          success: true,
          newPlan,
          subscriptionExpiry: newExpiry,
        })
    } catch (error) {
      console.error('Change subscription plan error:', error)
      return c.json({ error: 'Failed to change subscription plan' }, 500)
    }
  })

  // Fix invalid "premium" subscription tier (migration endpoint)
  app.post('/users/fix-subscription-tier', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Fix subscription tier: Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Fix subscription tier authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ============================================================
      // NO SQL CONVERSION NEEDED
      // This endpoint does not use KV store - only checks and updates
      // user metadata in Supabase Auth
      // 
      // This is a MIGRATION endpoint to fix legacy "premium" tier values
      // Valid tiers: free, monthly, annual, lifetime
      // Invalid tier: "premium" (should be one of the valid tiers)
      // 
      // Only change: Semantic routing (/make-server-8a1502a9/fix-subscription-tier → /users/fix-subscription-tier)
      // ============================================================

      const currentTier = user.user_metadata?.subscriptionTier
      
      console.log(`🔧 Checking subscription tier for user ${user.id}`)
      console.log(`   Current tier: ${currentTier || 'undefined'}`)
      console.log(`   Is moderator: ${user.user_metadata?.isModerator || false}`)
      console.log(`   Is superuser: ${user.user_metadata?.isSuperuser || false}`)
      
      // If tier is the invalid "premium" value, fix it
      if (currentTier === 'premium') {
        console.log(`⚠️  Found invalid subscription tier: "premium"`)
        console.log(`   Fixing user ${user.id}: "premium" -> "free"`)
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            subscriptionTier: 'free'
          }
        })

        if (updateError) {
          console.log(`❌ Fix subscription tier error: ${updateError.message}`)
          return c.json({ error: 'Failed to fix subscription tier' }, 500)
        }

        console.log(`✅ Subscription tier fixed successfully`)

        // Check if user still has premium access through staff roles
        const hasPremiumAccess = user.user_metadata?.isModerator || user.user_metadata?.isSuperuser
        
        return c.json({ 
          success: true, 
          message: 'Subscription tier fixed',
          oldTier: 'premium',
          newTier: 'free',
          hasPremiumAccess,
          note: hasPremiumAccess 
            ? 'You still have premium features through your moderator/superuser role'
            : 'Your subscription tier has been reset to free. Upgrade to premium for advanced features.'
        })
      }

      console.log(`✅ No fix needed - subscription tier is valid`)

      return c.json({ 
        success: true, 
        message: 'No fix needed',
        currentTier: currentTier || 'free'
      })

    } catch (error) {
      console.log(`❌ Fix subscription tier error: ${error}`)
      console.error('Fix subscription tier error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fix subscription tier' }, 500)
    }
  })
}