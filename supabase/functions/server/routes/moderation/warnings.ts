import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { sendModeratorWarningEmail } from '../../lib/emailService.ts'


export function registerWarningsRoutes(app: Hono) {
  // Create a warning for a user (moderator only)
  app.post('/moderation/warnings', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Missing access token for warning creation')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Authorization error while creating warning: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ============================================================
      // SCHEMA-CORRECT: Check moderator permissions from database
      // ============================================================

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.log(`❌ Error fetching user data: ${userError.message}`)
        return c.json({ error: 'Failed to verify permissions' }, 500)
      }

      const isSuperuser = userData?.is_superuser === true
      const isModerator = userData?.is_moderator === true

      if (!isModerator && !isSuperuser) {
        console.log(`❌ User ${user.id} attempted to warn a user without proper permissions`)
        return c.json({ error: 'Insufficient permissions. Only moderators and superusers can warn users.' }, 403)
      }

      const body = await c.req.json()
      const { ticketId, reason, customReason, message, timeToResolve } = body

      console.log(`⚠️ WARNING REQUEST BODY:`, body)

      if (!ticketId || !reason || !timeToResolve) {
        console.log('❌ Missing required fields for warning creation')
        return c.json({ error: 'Missing required fields: ticketId, reason, timeToResolve' }, 400)
      }

      // ============================================================
      // Fetch ticket details to get target information
      // ============================================================
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Log ticket details to debug
      console.log(`🎫 Fetched ticket:`, ticket)
      console.log(`   flagged_user_id: ${ticket.flagged_user_id}`)
      console.log(`   flagged_user_display_name: ${ticket.flagged_user_display_name}`)
      console.log(`   related_user_id: ${ticket.related_user_id}`)
      console.log(`   related_deck_id: ${ticket.related_deck_id}`)
      console.log(`   related_comment_id: ${ticket.related_comment_id}`)
      console.log(`   related_card_id: ${ticket.related_card_id}`)

      // Determine target from ticket
      let targetType = null
      let targetId = null
      let targetName = null
      let userId = null

      // PRIORITY 1: Use flagged_user_id if available (this is the user being warned)
      if (ticket.flagged_user_id) {
        console.log(`👤 Using flagged_user_id from ticket: ${ticket.flagged_user_id}`)
        userId = ticket.flagged_user_id
        const userDisplayName = ticket.flagged_user_display_name || 'Unknown User'
        
        // Still determine what content is being flagged for context
        if (ticket.related_user_id) {
          targetType = 'user'
          targetId = ticket.related_user_id
          targetName = userDisplayName
        } else if (ticket.related_deck_id) {
          targetType = 'deck'
          targetId = ticket.related_deck_id
          targetName = ticket.related_deck_title || 'Unknown Deck'
        } else if (ticket.related_card_id) {
          targetType = 'card'
          targetId = ticket.related_card_id
          targetName = 'Card'
        } else if (ticket.related_comment_id) {
          targetType = 'comment'
          targetId = ticket.related_comment_id
          targetName = ticket.related_comment_text?.substring(0, 50) || 'Unknown Comment'
        }
        
      } else if (ticket.related_user_id) {
        console.log(`👤 Ticket is about a USER`)
        targetType = 'user'
        targetId = ticket.related_user_id
        targetName = ticket.related_user_display_name || 'Unknown User'
        userId = ticket.related_user_id
        
      } else if (ticket.related_deck_id) {
        console.log(`📚 Ticket is about a DECK`)
        targetType = 'deck'
        targetId = ticket.related_deck_id
        targetName = ticket.related_deck_title || 'Unknown Deck'
        
        // For deck warnings, get the deck owner
        const { data: deck, error: deckError } = await supabase
          .from('decks')
          .select('user_id')
          .eq('id', ticket.related_deck_id)
          .single()
        
        if (deckError) {
          console.log(`❌ Error fetching deck: ${deckError.message}`)
        }
        if (!deck) {
          console.log(`❌ Deck ${ticket.related_deck_id} not found`)
        }
        console.log(`📦 Deck query result:`, deck)
        userId = deck?.user_id || null
        
      } else if (ticket.related_card_id) {
        console.log(`🃏 Ticket is about a CARD`)
        targetType = 'card'
        targetId = ticket.related_card_id
        targetName = 'Card'
        
        // Get card's deck owner
        const { data: card, error: cardError } = await supabase
          .from('cards')
          .select('deck_id')
          .eq('id', ticket.related_card_id)
          .single()
        
        if (cardError) {
          console.log(`❌ Error fetching card: ${cardError.message}`)
        }
        if (!card) {
          console.log(`❌ Card ${ticket.related_card_id} not found`)
        }
        console.log(`🃏 Card query result:`, card)
        
        if (card?.deck_id) {
          const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('user_id')
            .eq('id', card.deck_id)
            .single()
          
          if (deckError) {
            console.log(`❌ Error fetching deck from card: ${deckError.message}`)
          }
          console.log(`📦 Card's deck query result:`, deck)
          userId = deck?.user_id || null
        }
        
      } else if (ticket.related_comment_id) {
        console.log(`💬 Ticket is about a COMMENT`)
        targetType = 'comment'
        targetId = ticket.related_comment_id
        targetName = ticket.related_comment_text?.substring(0, 50) || 'Unknown Comment'
        
        // Get comment author
        const { data: comment, error: commentError } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', ticket.related_comment_id)
          .single()
        
        if (commentError) {
          console.log(`❌ Error fetching comment: ${commentError.message}`)
        }
        if (!comment) {
          console.log(`❌ Comment ${ticket.related_comment_id} not found`)
        }
        console.log(`💬 Comment query result:`, comment)
        userId = comment?.user_id || null
        
      } else {
        console.log(`❌ Ticket ${ticketId} has no related target`)
        return c.json({ error: 'Ticket has no related target to warn' }, 400)
      }

      console.log(`🔍 Final userId determined: ${userId}`)

      if (!userId) {
        console.log(`❌ Could not determine user to warn from ticket ${ticketId}`)
        console.log(`   Target type: ${targetType}`)
        console.log(`   Target ID: ${targetId}`)
        return c.json({ error: 'Could not determine user to warn' }, 400)
      }

      console.log(`⚠️ Creating warning for user ${userId}`)
      console.log(`   Moderator: ${user.user_metadata?.displayName || user.email}`)
      console.log(`   Reason: ${reason}`)
      console.log(`   Target: ${targetType} - ${targetName}`)
      console.log(`   Time to resolve: ${timeToResolve} hours`)

      // Calculate deadline
      const hoursToResolve = parseInt(timeToResolve)
      const deadline = new Date(Date.now() + hoursToResolve * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()
      const moderatorName = user.user_metadata?.displayName || user.user_metadata?.name || user.email || 'Moderator'

      // ============================================================
      // SCHEMA-CORRECT: Store warning in moderation_actions table
      // No separate warnings table - everything goes in moderation_actions
      // ============================================================

      const warningId = crypto.randomUUID()
      
      const { data: createdWarning, error: warningError } = await supabase
        .from('moderation_actions')
        .insert({
          id: warningId,
          moderator_id: user.id,
          moderator_name: moderatorName,
          action_type: 'issue_warning',
          target_type: 'user',
          target_id: userId,
          reason: reason,
          additional_details: customReason || message || null,
          metadata: {
            status: 'active', // active, resolved, expired
            time_to_resolve: hoursToResolve,
            deadline: deadline,
            resolved_at: null,
            content_target_type: targetType,
            content_target_id: targetId,
            content_target_name: targetName,
            flag_id: ticket.related_flag_id,
            ticket_id: ticketId
          },
          created_at: now
        })
        .select()
        .single()

      if (warningError) {
        console.log(`❌ Database error creating warning: ${warningError.message}`)
        return c.json({ error: 'Failed to create warning' }, 500)
      }

      console.log(`✅ Warning ${warningId} stored in moderation_actions table`)

      // Create notification text
      const reasonText = reason === 'other' ? customReason : {
        'inaccurate': 'Inaccurate content',
        'offensive': 'Offensive language',
        'copyright': 'Copyright issue',
        'guidelines': 'Community guidelines violation'
      }[reason] || reason

      const notificationText = `You have received a warning from a moderator regarding your ${targetType}: "${targetName}". Reason: ${reasonText}${message ? `. Message: ${message}` : ''}. Please address this within ${hoursToResolve} hours.`

      // Create notification for the warned user
      // SCHEMA-CORRECT: Only use fields that exist in notifications table
      const notificationData = {
        id: crypto.randomUUID(),
        user_id: userId,
        type: 'warning',
        message: notificationText,
        is_read: false,
        created_at: now,
        // Related metadata - moderator who issued the warning
        related_user_id: user.id,
        requester_display_name: moderatorName,
        requester_avatar: user.user_metadata?.avatarUrl || null,
        // Use comment_text to store warning metadata as JSON (for display purposes)
        comment_text: JSON.stringify({
          warningId: warningId,
          reason: reasonText,
          customMessage: message,
          timeToResolve: hoursToResolve,
          deadline: deadline,
          targetType: targetType,
          targetId: targetId,
          targetName: targetName,
          ticketId: ticketId
        })
      }

      console.log(`📬 Creating warning notification for user ${userId}`)

      const { data: createdNotification, error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()

      if (notificationError) {
        console.log(`❌ Database error creating notification: ${notificationError.message}`)
        // Warning was created, but notification failed - log but don't fail request
        console.log(`⚠️ Warning created but notification failed`)
      } else {
        console.log(`✅ Notification successfully created`)
      }

      //============================================================
      // ✅ SEND EMAIL NOTIFICATION FOR MODERATOR WARNING
      // ============================================================
      try {
        // Get warned user's email and display name
        const { data: warnedUser, error: warnedUserError } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single()
        
        if (warnedUserError) {
          console.log(`⚠️ Could not fetch warned user email: ${warnedUserError.message}`)
        } else if (warnedUser?.email) {
          // Build action required text
          const actionRequired = message || `Please review and address the issue with your ${targetType}: "${targetName}"`
          
          // Build review URL - link to the content or moderation page
          const reviewUrl = `${Deno.env.get('SUPABASE_URL') || 'https://flashy.app'}/#/moderator`
          
          // Format deadline for email
          const deadlineDate = new Date(deadline)
          const formattedDeadline = deadlineDate.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          
          await sendModeratorWarningEmail(
            userId,                                      // toUserId
            warnedUser.email,                           // email
            warnedUser.display_name || 'User',          // displayName
            reasonText,                                  // warning
            actionRequired,                              // actionRequired
            formattedDeadline,                          // deadline (formatted)
            reviewUrl                                    // reviewUrl
          )
          
          console.log(`📧 Moderator warning email sent to ${warnedUser.email}`)
        }
      } catch (emailError) {
        console.error(`⚠️ Failed to send moderator warning email: ${emailError}`)
        // Don't fail the whole operation if email fails
      }

      // ============================================================
      // Create ticket action to show in activity timeline
      // ============================================================
      const ticketActionId = crypto.randomUUID()
      const { error: actionError } = await supabase
        .from('ticket_actions')
        .insert({
          id: ticketActionId,
          ticket_id: ticketId,
          action_type: 'warning',
          performed_by: moderatorName,
          performed_by_id: user.id,
          timestamp: now,
          details: {
            warningId: warningId,
            reason: reasonText,
            customMessage: message,
            timeToResolve: hoursToResolve,
            deadline: deadline,
            targetType: targetType,
            targetId: targetId,
            targetName: targetName,
            warnedUserId: userId
          }
        })

      if (actionError) {
        console.log(`❌ Failed to create ticket action: ${actionError.message}`)
        // Don't fail the request - warning was still created
      } else {
        console.log(`✅ Ticket action created for warning in timeline`)
      }

      console.log(`✅ Warning ${warningId} created by ${moderatorName} for user ${userId}`)
      
      return c.json({ success: true, warningId, warning: createdWarning })

    } catch (error) {
      console.log(`❌ Create warning error: ${error}`)
      console.error('Create warning error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: `Failed to create warning: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500)
    }
  })
}