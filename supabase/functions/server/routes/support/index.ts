import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerSupportRoutes(app: Hono) {
  // ============================================================
  // Export user data (GDPR compliance)
  // ============================================================
  app.get('/support/export-data', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Export data: Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Export data: Unauthorized - ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      console.log(`📦 Exporting all data for user: ${user.id}`)

      const [
        decksResult,
        cardsResult,
        studySessionsResult,
        publishedDecksResult,
        commentsResult,
        ratingsResult,
        friendsResult,
        friendRequestsIncomingResult,
        friendRequestsOutgoingResult,
        notificationsResult,
        flagsResult,
        achievementsResult,
        userStatsResult,
      ] = await Promise.all([
        supabase.from('decks').select('*').eq('user_id', user.id),
        supabase.from('cards').select('*').eq('user_id', user.id),
        supabase.from('study_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false }),
        supabase.from('community_decks').select('*').eq('author_id', user.id),
        supabase.from('comments').select('*').eq('user_id', user.id),
        supabase.from('ratings').select('*').eq('user_id', user.id),
        supabase.from('friends').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
        supabase.from('friend_requests').select('*').eq('to_user_id', user.id).eq('status', 'pending'),
        supabase.from('friend_requests').select('*').eq('from_user_id', user.id).eq('status', 'pending'),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('flags').select('*').eq('reporter_id', user.id),
        supabase.from('achievements').select('*').eq('user_id', user.id).single(),
        supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
      ])

      const decks = decksResult.data || []
      const cards = cardsResult.data || []
      const studySessions = studySessionsResult.data || []
      const publishedDecks = publishedDecksResult.data || []
      const userComments = commentsResult.data || []
      const userRatings = ratingsResult.data || []
      const friendsData = friendsResult.data || []
      const friendRequestsIncoming = friendRequestsIncomingResult.data || []
      const friendRequestsOutgoing = friendRequestsOutgoingResult.data || []
      const notifications = notificationsResult.data || []
      const userFlags = flagsResult.data || []
      const achievements = achievementsResult.data || {}
      const userStats = userStatsResult.data || {}

      const userInfo = {
        userId: user.id,
        email: user.email,
        displayName: user.user_metadata?.displayName || user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatarUrl,
        dateCreated: user.created_at,
        lastLogin: user.last_sign_in_at,
        subscriptionTier: user.user_metadata?.subscriptionTier || 'free',
        isSuperuser: user.user_metadata?.isSuperuser || false,
        isModerator: user.user_metadata?.isModerator || false,
        isBanned: user.user_metadata?.isBanned || false,
      }

      const friends = friendsData.map(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id
        return {
          friendId,
          friendsSince: f.created_at,
          status: f.status,
        }
      })

      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: '2.0',
        userAccount: userInfo,
        decks,
        cards,
        studySessions,
        community: {
          publishedDecks,
          comments: userComments,
          ratings: userRatings,
        },
        social: {
          friends,
          friendRequests: {
            incoming: friendRequestsIncoming,
            outgoing: friendRequestsOutgoing,
          },
        },
        notifications,
        flags: userFlags,
        achievements,
        userStats,
      }

      console.log(`✅ Successfully compiled data export for user ${user.id}`)
      return c.json(exportData)
    } catch (error) {
      console.log(`❌ Export data error: ${error}`)
      return c.json({ error: 'Failed to export data' }, 500)
    }
  })

  // ============================================================
  // Contact form submission
  // ============================================================
  app.post('/support/contact', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Contact form: No access token provided')
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Contact form auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ✅ Fetch user info from database instead of metadata
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('display_name, subscription_tier, is_banned')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log(`⚠️ Could not fetch user profile: ${profileError.message}`)
      }

      // Check if user is banned
      if (userProfile?.is_banned) {
        console.log(`❌ Banned user attempted to submit contact form: ${user.id}`)
        return c.json({ error: 'Account suspended' }, 403)
      }

      const { category, subject, message } = await c.req.json()

      if (!category || !subject || !message) {
        return c.json(
          { error: 'Missing required fields (category, subject, message)' },
          400,
        )
      }

      if (message.length < 10 || message.length > 5000) {
        return c.json(
          { error: 'Message must be between 10 and 5000 characters' },
          400,
        )
      }

      const resendApiKey = Deno.env.get('RESEND_API_KEY')

      if (!resendApiKey) {
        console.log('⚠️ RESEND_API_KEY not configured')
        return c.json({
          success: true,
          message: 'Contact form submitted (email disabled)',
          emailSent: false,
        })
      }

      const userName = userProfile?.display_name || 'User'
      const userEmail = user.email || 'no-email@example.com'
      const subscriptionTier = userProfile?.subscription_tier || 'free'

      // ✅ Use SUPPORT_EMAIL env var, or default to test email
      const recipient = Deno.env.get('SUPPORT_EMAIL') || 'flashyflashcards2@gmail.com'
      const isTestMode = recipient === 'flashyflashcards2@gmail.com'

      console.log(`📧 ${isTestMode ? '[TEST MODE] ' : ''}Sending contact form email to ${recipient}`)

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Flashy Support <onboarding@resend.dev>',
          to: recipient,
          reply_to: userEmail,
          subject: `[${category.toUpperCase()}] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">📬 New Contact Form Submission</h2>
              <p><strong>From:</strong> ${userName} (${userEmail})</p>
              <p><strong>User ID:</strong> ${user.id}</p>
              <p><strong>Subscription:</strong> ${subscriptionTier}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${message}</p>
              ${isTestMode ? '<hr style="border: 1px solid #e5e7eb; margin: 20px 0;"><p style="color: #6b7280; font-size: 12px;">🧪 TEST MODE - Set SUPPORT_EMAIL env var to change recipient</p>' : ''}
            </div>
          `,
        }),
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('❌ Resend API error:', resendData)
        return c.json({ 
          error: 'Failed to send email', 
          details: resendData 
        }, 500)
      }

      console.log('✅ Email sent successfully:', resendData.id)

      return c.json({
        success: true,
        message: 'Contact form submitted successfully',
        emailSent: true,
      })
    } catch (error) {
      console.log(`❌ Contact form error: ${error}`)
      return c.json({ error: 'Failed to submit contact form' }, 500)
    }
  })
}