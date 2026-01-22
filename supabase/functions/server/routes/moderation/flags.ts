import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import {  sendContentFlaggedEmail, sendModeratorActionEmail } from '../../lib/emailService.ts'
import type {
  CreateFlagRequest,
  Flag,
} from '../../types/moderation.ts'

// ============================================================
// Helper: Get user display info from database
// ============================================================
async function getUserDisplayInfo(userId: string): Promise<{ displayName: string; avatar: string | null; email: string | null }> {
  const { data: userData, error } = await supabase
    .from('users')
    .select('display_name, avatar_url, email')
    .eq('id', userId)
    .single()
  
  if (error || !userData) {
    console.log(`⚠️ Warning: Could not fetch user info for ${userId}, using defaults`)
    return { displayName: 'Anonymous', avatar: null, email: null }
  }
  
  return {
    displayName: userData.display_name || 'Anonymous',
    avatar: userData.avatar_url || null,
    email: userData.email || null
  }
}

export function registerFlagRoutes(app: Hono) {
  // ============================================================
  // CREATE FLAG - USER ACTION (Immutable Report)
  // ============================================================
  // Users submit flags to report content violations
  // This auto-creates a ticket for moderators to review
  // Flags are immutable - they're the original evidence
  // All moderation work happens on tickets
  // ============================================================
  
  app.post('/moderation/flag', async (c: Context) => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) return c.json({ error: 'Missing access token' }, 401)

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json<CreateFlagRequest>()
    const { targetType, targetId, reason, notes } = body

    const now = new Date().toISOString()

    // ✅ Get user info from database
    const userInfo = await getUserDisplayInfo(user.id)
    const reporterName = userInfo.displayName

    // ============================================================
    // Handle card ID format: "deckId-card-index" -> actual card UUID
    // ============================================================
    let actualTargetId = targetId
    
    if (targetType === 'card' && targetId.includes('-card-')) {
      // Parse format: "083b9539-4249-47cc-8689-668eb7c0e17d-card-0"
      const parts = targetId.split('-card-')
      if (parts.length === 2) {
        const deckId = parts[0]
        const cardIndex = parseInt(parts[1])
        
        console.log(`🔍 Parsing card ID: deckId=${deckId}, cardIndex=${cardIndex}`)
        
        // Fetch all cards in deck to get the actual UUID at this index
        const { data: allCards } = await supabase
          .from('community_cards')
          .select('id')
          .eq('community_deck_id', deckId)
          .order('created_at', { ascending: true })
        
        if (allCards && allCards[cardIndex]) {
          actualTargetId = allCards[cardIndex].id
          console.log(`✅ Resolved card UUID: ${actualTargetId}`)
        } else {
          console.error(`❌ Could not find card at index ${cardIndex} in deck ${deckId}`)
          return c.json({ error: 'Card not found' }, 404)
        }
      }
    }
    
    // ============================================================
    // Handle comment ID format: "deckId-comment-index" -> actual comment UUID
    // ============================================================
    if (targetType === 'comment' && targetId.includes('-comment-')) {
      // Parse format: "deckId-comment-0"
      const parts = targetId.split('-comment-')
      if (parts.length === 2) {
        const deckId = parts[0]
        const commentIndex = parseInt(parts[1])
        
        console.log(`🔍 Parsing comment ID: deckId=${deckId}, commentIndex=${commentIndex}`)
        
        // Fetch all comments in deck to get the actual UUID at this index
        const { data: allComments } = await supabase
          .from('comments')
          .select('id')
          .eq('community_deck_id', deckId)
          .order('created_at', { ascending: true })
        
        if (allComments && allComments[commentIndex]) {
          actualTargetId = allComments[commentIndex].id
          console.log(`✅ Resolved comment UUID: ${actualTargetId}`)
        } else {
          console.error(`❌ Could not find comment at index ${commentIndex} in deck ${deckId}`)
          return c.json({ error: 'Comment not found' }, 404)
        }
      }
    }
    
    // ============================================================
    // Handle reply ID format: "commentId-reply-index" -> actual reply UUID
    // ============================================================
    if (targetType === 'comment' && targetId.includes('-reply-')) {
      // Parse format: "commentId-reply-0"
      const parts = targetId.split('-reply-')
      if (parts.length === 2) {
        const commentId = parts[0]
        const replyIndex = parseInt(parts[1])
        
        console.log(`🔍 Parsing reply ID: commentId=${commentId}, replyIndex=${replyIndex}`)
        
        // Fetch all replies for this comment to get the actual UUID at this index
        const { data: allReplies } = await supabase
          .from('replies')
          .select('id')
          .eq('comment_id', commentId)
          .order('created_at', { ascending: true })
        
        if (allReplies && allReplies[replyIndex]) {
          actualTargetId = allReplies[replyIndex].id
          console.log(`✅ Resolved reply UUID: ${actualTargetId}`)
        } else {
          console.error(`❌ Could not find reply at index ${replyIndex} for comment ${commentId}`)
          return c.json({ error: 'Reply not found' }, 404)
        }
      }
    }

    // ============================================================
    // 1. Create immutable flag record (the original report)
    // ============================================================
    const { data: flagData, error: flagError } = await supabase
      .from('flags')
      .insert({
        reporter_id: user.id,
        reporter_name: reporterName,
        target_type: targetType,
        target_id: actualTargetId,
        reason,
        description: notes ?? null,
        created_at: now,
      })
      .select()
      .single()

    if (flagError || !flagData) {
      console.error('❌ Failed to create flag:', flagError)
      return c.json({ error: 'Failed to create flag' }, 500)
    }

    console.log(`✅ Flag created: ${flagData.id}`)

    // ============================================================
    // 2. Auto-create ticket for moderators to work on
    // ============================================================
    // Map targetType/targetId to the correct related_* columns
    const ticketInsert: any = {
      title: `${reason}`,  // ✅ Required field
      category: targetType,
      priority: 'medium',
      status: 'open',
      description: notes || '',
      related_flag_id: flagData.id,
      created_by: user.id,  // ✅ Required field
      created_by_display_name: reporterName, 
      created_at: now,
      updated_at: now,
    }

    // ✅ Fetch and populate additional details based on targetType
    if (targetType === 'user') {
      ticketInsert.related_user_id = targetId
      
      // For user flags, the flagged user IS the target user
      ticketInsert.flagged_user_id = targetId
      
      // Fetch flagged user's display name
      const flaggedUserInfo = await getUserDisplayInfo(targetId)
      ticketInsert.flagged_user_display_name = flaggedUserInfo.displayName
      
    } else if (targetType === 'deck') {
      ticketInsert.related_deck_id = targetId
      
      // Fetch deck title and creator
      const { data: deckData } = await supabase
        .from('community_decks')
        .select('name, owner_id')
        .eq('id', targetId)
        .single()
      
      if (deckData) {
        ticketInsert.related_deck_title = deckData.name
        ticketInsert.flagged_user_id = deckData.owner_id
        
        // Fetch flagged user's display name
        const flaggedUserInfo = await getUserDisplayInfo(deckData.owner_id)
        ticketInsert.flagged_user_display_name = flaggedUserInfo.displayName
      }
      
    } else if (targetType === 'card') {
      ticketInsert.related_card_id = actualTargetId
      
      // Fetch card details
      const { data: cardData } = await supabase
        .from('community_cards')
        .select('community_deck_id, card_type, front')
        .eq('id', actualTargetId)
        .single()
      
      if (cardData) {
        ticketInsert.related_deck_id = cardData.community_deck_id
        
        // Get card index in deck
        const { data: allCards } = await supabase
          .from('community_cards')
          .select('id')
          .eq('community_deck_id', cardData.community_deck_id)
          .order('created_at', { ascending: true })
        
        const cardIndex = allCards?.findIndex(c => c.id === actualTargetId) ?? -1
        const cardNumber = cardIndex >= 0 ? cardIndex + 1 : '?'
        
        // Build card title: "Card #X: question/front" (truncated)
        const cardText = cardData.front || 'Untitled card'
        const truncatedText = cardText.length > 60 ? cardText.substring(0, 60) + '...' : cardText
        ticketInsert.related_card_title = `Card #${cardNumber}: ${truncatedText}`
        
        // Fetch deck title and creator
        const { data: deckData } = await supabase
          .from('community_decks')
          .select('name, owner_id')
          .eq('id', cardData.community_deck_id)
          .single()
        
        if (deckData) {
          ticketInsert.related_deck_title = deckData.name
          ticketInsert.flagged_user_id = deckData.owner_id
          
          // Fetch flagged user's display name
          const flaggedUserInfo = await getUserDisplayInfo(deckData.owner_id)
          ticketInsert.flagged_user_display_name = flaggedUserInfo.displayName
        }
      }
      
    } else if (targetType === 'comment') {
      ticketInsert.related_comment_id = targetId
      
      // Try to find comment in comments table first
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('community_deck_id, content, user_id')
        .eq('id', targetId)
        .single()

      console.log(`📝 Comment lookup result:`, { commentData, commentError })
      
      // If not found, try replies table
      if (!commentData) {
        const { data: replyData, error: replyError } = await supabase
          .from('replies')
          .select('comment_id, content, user_id')
          .eq('id', targetId)
          .single()

          console.log(`📝 Reply lookup result:`, { replyData, replyError })
        
        if (replyData) {
          ticketInsert.related_comment_text = replyData.content
          ticketInsert.flagged_user_id = replyData.user_id
          
          // Fetch flagged user's display name
          const flaggedUserInfo = await getUserDisplayInfo(replyData.user_id)
          ticketInsert.flagged_user_display_name = flaggedUserInfo.displayName
          
          // Get the parent comment to find deck_id
          const { data: parentComment } = await supabase
            .from('comments')
            .select('community_deck_id')
            .eq('id', replyData.comment_id)
            .single()
          
          if (parentComment) {
            ticketInsert.related_deck_id = parentComment.community_deck_id
            
            // Fetch deck title
            const { data: deckData } = await supabase
              .from('community_decks')
              .select('name')
              .eq('id', parentComment.community_deck_id)
              .single()
            
            if (deckData) {
              ticketInsert.related_deck_title = deckData.name
            }
          }
        }
      } else {
        // Found in comments table
        ticketInsert.related_comment_text = commentData.content
        ticketInsert.related_deck_id = commentData.community_deck_id
        ticketInsert.flagged_user_id = commentData.user_id
        
        // Fetch flagged user's display name
        const flaggedUserInfo = await getUserDisplayInfo(commentData.user_id)
        ticketInsert.flagged_user_display_name = flaggedUserInfo.displayName
        
        // Fetch deck title
        const { data: deckData } = await supabase
          .from('community_decks')
          .select('title')
          .eq('id', commentData.community_deck_id)
          .single()
        
        if (deckData) {
          ticketInsert.related_deck_title = deckData.title
        }
      }
    }

    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketInsert)
      .select()
      .single()

    if (ticketError) {
      console.error('❌ Failed to create ticket:', ticketError)
      console.error('❌ Ticket error details:', JSON.stringify(ticketError, null, 2))
      // ⚠️ Return error to user so they know ticket wasn't created
      return c.json({ 
        error: 'Flag created but ticket creation failed: ' + ticketError.message,
        details: ticketError 
      }, 500)
    }
    
    console.log(`✅ Ticket created: ${ticketData?.id}`)

    // ============================================================
    // 3. Send email notification to content owner
    // ============================================================
    if (ticketInsert.flagged_user_id && ticketInsert.flagged_user_id !== user.id) {
      // Don't email if user flagged their own content
      
      // Fetch flagged user's email and preferences
      const { data: flaggedUserData } = await supabase
        .from('users')
        .select('id, email, display_name, email_notifications_enabled, email_flagged_content')
        .eq('id', ticketInsert.flagged_user_id)
        .single()

      if (flaggedUserData?.email) {
        // Check if user wants these emails
        const wantsEmails = 
          flaggedUserData.email_notifications_enabled !== false && 
          flaggedUserData.email_flagged_content !== false

        if (wantsEmails) {
          // Determine content name for email
          let contentName = ''
          if (targetType === 'deck') {
            contentName = ticketInsert.related_deck_title || 'Untitled Deck'
          } else if (targetType === 'card') {
            contentName = ticketInsert.related_card_title || 'Card'
          } else if (targetType === 'comment') {
            const truncated = ticketInsert.related_comment_text || 'Comment'
            contentName = truncated.length > 50 ? truncated.substring(0, 50) + '...' : truncated
          } else if (targetType === 'user') {
            contentName = 'Profile'
          }

          // Build review URL
          const reviewUrl = `${Deno.env.get('SUPABASE_URL') || 'https://flashy.app'}/#/${targetType === 'deck' ? 'community' : targetType === 'user' ? 'profile' : 'community'}`

          // Send the email (don't await - send async)
          sendContentFlaggedEmail(
            flaggedUserData.id,
            flaggedUserData.email,
            flaggedUserData.display_name || 'User',
            targetType,
            contentName,
            reason,
            reviewUrl
          ).catch(err => {
            console.error(`⚠️ Failed to send flag notification email: ${err}`)
          })

          console.log(`📧 Sending flag notification email to ${flaggedUserData.email}`)
        } else {
          console.log(`📧 Skipping email (user has notifications disabled)`)
        }
      }
    }

    return c.json({ 
      success: true, 
      message: 'Report submitted successfully',
      flag: flagData as Flag,
      ticket: ticketData  // ✅ Include ticket in response
    })
  })
}