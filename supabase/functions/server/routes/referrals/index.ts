import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerReferralRoutes(app: Hono) {

  // ============================================================
  // Send referral invite (single email)
  // ============================================================
  app.post('/referrals/invite', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Unauthorized' }, 401)

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { email } = await c.req.json()
      if (!email || !email.includes('@')) {
        return c.json({ error: 'Valid email is required' }, 400)
      }

      // Prevent inviting existing users
      const { data: users } = await supabase.auth.admin.listUsers()
      if (users?.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
        return c.json({ error: 'This email is already registered' }, 400)
      }

      const referralCode = `${user.id.substring(0, 8)}-${Date.now()}`
      const now = new Date().toISOString()

      const { data: referral, error } = await supabase
        .from('referrals')
        .insert({
          code: referralCode,
          referrer_id: user.id,
          referrer_name: user.user_metadata?.displayName || user.email,
          invited_email: email.toLowerCase(),
          status: 'pending',
          created_at: now,
        })
        .select()
        .single()

      if (error) {
        return c.json({ error: 'Failed to create referral' }, 500)
      }

      const baseUrl =
        Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '') ||
        'http://localhost:3000'

      return c.json({
        message: 'Referral invite created',
        referralCode,
        referralLink: `${baseUrl}/signup?ref=${referralCode}`,
        referral,
      })

    } catch (error) {
      console.error('Referral invite error:', error)
      return c.json({ error: 'Failed to send referral invite' }, 500)
    }
  })

  // ============================================================
  // Get referral stats
  // ============================================================
  app.get('/referrals/stats', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Unauthorized' }, 401)

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return c.json({ error: 'Failed to fetch referral stats' }, 500)
      }

      const total = referrals.length
      const accepted = referrals.filter(r => r.status === 'accepted').length

      return c.json({
        totalInvites: total,
        pendingReferrals: referrals.filter(r => r.status === 'pending').length,
        acceptedReferrals: accepted,
        expiredReferrals: referrals.filter(r => r.status === 'expired').length,
        conversionRate: total ? Math.round((accepted / total) * 100) : 0,
        invites: referrals,
        completedReferrals: accepted, // legacy
      })

    } catch (error) {
      console.error('Referral stats error:', error)
      return c.json({ error: 'Failed to get referral stats' }, 500)
    }
  })

  // ============================================================
  // Apply referral code during signup
  // ============================================================
  app.post('/referrals/apply', async (c: Context) => {
    try {
      const { referralCode, newUserId } = await c.req.json()
      if (!referralCode || !newUserId) {
        return c.json({ error: 'Referral code and user ID required' }, 400)
      }

      const { data: referral, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('code', referralCode)
        .single()

      if (error || !referral || referral.status !== 'pending') {
        return c.json({ error: 'Invalid or already used referral code' }, 400)
      }

      const now = new Date().toISOString()

      await supabase
        .from('referrals')
        .update({
          status: 'accepted',
          accepted_at: now,
          referee_id: newUserId,
        })
        .eq('code', referralCode)

      // Grant 1 month premium to new user
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + 1)

      await supabase.auth.admin.updateUserById(newUserId, {
        user_metadata: {
          subscriptionTier: 'monthly',
          subscriptionExpiry: expiry.toISOString(),
          referralBonus: true,
        },
      })

      // Extend referrer (unless lifetime)
      const { data: referrer } =
        await supabase.auth.admin.getUserById(referral.referrer_id)

      if (referrer?.user) {
        const tier = referrer.user.user_metadata?.subscriptionTier || 'free'
        if (tier !== 'lifetime') {
          const refExpiry = new Date(
            referrer.user.user_metadata?.subscriptionExpiry || Date.now()
          )
          refExpiry.setMonth(refExpiry.getMonth() + 1)

          await supabase.auth.admin.updateUserById(referral.referrer_id, {
            user_metadata: {
              ...referrer.user.user_metadata,
              subscriptionTier: tier === 'free' ? 'monthly' : tier,
              subscriptionExpiry: refExpiry.toISOString(),
            },
          })
        }
      }

      return c.json({
        success: true,
        message: 'Referral applied successfully',
        referrerId: referral.referrer_id,
        newUserId,
      })

    } catch (error) {
      console.error('Apply referral error:', error)
      return c.json({ error: 'Failed to apply referral' }, 500)
    }
  })

  // ============================================================
  // Batch referral invite emails
  // ============================================================
  app.post('/referrals/send-invite', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) return c.json({ error: 'Unauthorized' }, 401)

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { emails, referralLink } = await c.req.json()

      if (!Array.isArray(emails) || emails.length === 0 || emails.length > 10) {
        return c.json({ error: '1–10 valid emails required' }, 400)
      }

      if (!referralLink) {
        return c.json({ error: 'Referral link required' }, 400)
      }

      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        return c.json({
          success: true,
          sent: emails.length,
          note: 'Email service not configured',
        })
      }

      await Promise.all(
        emails.map(email =>
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Flashy <noreply@flashy.app>',
              to: email,
              subject: 'You’ve been invited to Flashy!',
              html: `<p>${user.user_metadata?.displayName || 'A friend'} invited you.</p><a href="${referralLink}">Join Flashy</a>`,
            }),
          }),
        ),
      )

      return c.json({
        success: true,
        sent: emails.length,
      })

    } catch (error) {
      console.error('Send referral invite error:', error)
      return c.json({ error: 'Failed to send invitation emails' }, 500)
    }
  })
}