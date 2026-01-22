import { Hono } from 'npm:hono'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export function registerTicketRoutes(app: Hono) {
// ============================================================
  // MODERATION TICKET SYSTEM ENDPOINTS (SQL VERSION)
  // ============================================================
  // These endpoints manage the moderation ticket/flag system:
  // - View ticket details
  // - Add comments to tickets
  // - View ticket action history
  // - Update ticket status (pending, under_review, resolved, dismissed)
  // - Assign tickets to moderators
  // - Get list of moderators
  //
  // All endpoints require moderator or superuser access
  // ============================================================

 // ✅ GET /moderation/tickets - List all tickets with optional filters (Moderator/Superuser only)
  app.get('/moderation/tickets', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ List tickets: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ List tickets authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ List tickets: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ List tickets: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      // Parse query parameters for filtering
      const status = c.req.query('status') // 'open', 'in_progress', 'resolved', 'dismissed'
      const priority = c.req.query('priority') // 'low', 'medium', 'high', 'critical'
      const category = c.req.query('category') // 'user_report', 'content_violation', 'spam', etc.
      const assignedTo = c.req.query('assignedTo') // user ID
      const unassigned = c.req.query('unassigned') // 'true' or 'false'
      const limit = parseInt(c.req.query('limit') || '50')
      const offset = parseInt(c.req.query('offset') || '0')

      console.log(`📋 Fetching tickets with filters:`)
      console.log(`   Status: ${status || 'all'}`)
      console.log(`   Priority: ${priority || 'all'}`)
      console.log(`   Category: ${category || 'all'}`)
      console.log(`   Assigned to: ${assignedTo || 'all'}`)
      console.log(`   Unassigned: ${unassigned || 'false'}`)
      console.log(`   Limit: ${limit}, Offset: ${offset}`)

      // Build query
      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }
      if (category) {
        query = query.eq('category', category)
      }
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo)
      }
      if (unassigned === 'true') {
        query = query.is('assigned_to', null)
      }

      // Order by priority (critical first) and created_at (newest first)
      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply pagination - but first get count to validate offset
      const { count: totalCount, error: countError } = await query

      if (countError) {
        console.log(`❌ Error getting count: ${countError.message || String(countError)}`)
        return c.json({ error: 'Failed to count tickets' }, 500)
      }

      console.log(`📊 Total tickets matching filters: ${totalCount}`)

      // If offset is beyond total, return empty results
      if (offset >= (totalCount || 0)) {
        console.log(`⚠️  Offset ${offset} is beyond total count ${totalCount}, returning empty results`)
        return c.json({
          tickets: [],
          total: totalCount || 0,
          limit,
          offset
        })
      }

      // Apply range for pagination
      query = query.range(offset, offset + limit - 1)

      const { data: tickets, error: ticketsError } = await query

      if (ticketsError) {
        console.log(`❌ Error fetching tickets:`)
        console.log(`Error code: ${ticketsError.code}`)
        console.log(`Error message: ${ticketsError.message}`)
        console.log(`Error details: ${ticketsError.details}`)
        console.log(`Error hint: ${ticketsError.hint}`)
        return c.json({ 
          error: 'Failed to fetch tickets', 
          message: ticketsError.message,
          code: ticketsError.code,
          details: ticketsError.details,
          hint: ticketsError.hint
        }, 500)
      }

      console.log(`✅ Found ${tickets?.length || 0} tickets (total: ${totalCount})`)

      // Enrich tickets with assigned user names
      const enrichedTickets = await Promise.all((tickets || []).map(async (ticket) => {
        let assignedToName = null
        if (ticket.assigned_to) {
          const { data: assignedUser } = await supabase
            .from('users')
            .select('display_name, email')
            .eq('id', ticket.assigned_to)
            .single()
          
          assignedToName = assignedUser?.display_name || assignedUser?.email
        }

        let resolvedByName = null
        if (ticket.resolved_by) {
          const { data: resolvedUser } = await supabase
            .from('users')
            .select('display_name, email')
            .eq('id', ticket.resolved_by)
            .single()
          
          resolvedByName = resolvedUser?.display_name || resolvedUser?.email
        }

        return {
          id: ticket.id,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          description: ticket.description,
          targetType: ticket.target_type,
          targetId: ticket.target_id,
          assignedTo: assignedToName,
          assignedToId: ticket.assigned_to,
          resolvedAt: ticket.resolved_at,
          resolvedBy: resolvedByName,
          resolvedById: ticket.resolved_by,
          resolutionNote: ticket.resolution_note,
          relatedFlagId: ticket.related_flag_id,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at
        }
      }))

      return c.json({
        tickets: enrichedTickets,
        total: totalCount,
        limit,
        offset
      })
    } catch (error) {
      console.log(`❌ List tickets error: ${error}`)
      console.error('List tickets error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fetch tickets' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId - Get ticket details by ID (Moderator/Superuser only)
  app.get('/moderation/tickets/:ticketId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Get ticket: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Get ticket authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Get ticket: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Get ticket: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')

      // ============================================================
      // SQL: SELECT * FROM tickets WHERE id = $1
      // Also fetch related flag if exists, and assigned user info
      // ============================================================

      console.log(`🔍 Fetching ticket details: ${ticketId}`)

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()
      
      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      console.log(`✅ Ticket found: ${ticket.category} - ${ticket.target_type}`)
      console.log(`   Status: ${ticket.status}`)
      console.log(`   Priority: ${ticket.priority}`)

      // Get assigned user info if assigned
      let assignedToName = null
      if (ticket.assigned_to) {
        const { data: assignedUser } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.assigned_to)
          .single()
        
        assignedToName = assignedUser?.display_name || assignedUser?.email
      }

      // Get resolved by user info if resolved
      let resolvedByName = null
      if (ticket.resolved_by) {
        const { data: resolvedUser } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.resolved_by)
          .single()
        
        resolvedByName = resolvedUser?.display_name || resolvedUser?.email
      }

      // Get related flag info if exists
      let flagInfo = null
      if (ticket.related_flag_id) {
        const { data: flag } = await supabase
          .from('flags')
          .select('reporter_id, reporter_name, reason, description, created_at')
          .eq('id', ticket.related_flag_id)
          .single()
        
        if (flag) {
          flagInfo = {
            flagId: ticket.related_flag_id,
            reportedBy: flag.reporter_name,
            reportedById: flag.reporter_id,
            reportedAt: flag.created_at,
            reason: flag.reason,
            details: flag.description
          }
        }
      }

      // Map ticket to response format
      const ticketResponse = {
        id: ticket.id,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        description: ticket.description,
        itemType: ticket.target_type,
        itemId: ticket.target_id,
        assignedTo: assignedToName,
        assignedToId: ticket.assigned_to,
        resolvedAt: ticket.resolved_at,
        resolvedBy: resolvedByName,
        resolvedById: ticket.resolved_by,
        resolutionNote: ticket.resolution_note,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        // Include flag info if this ticket came from a flag
        flag: flagInfo
      }
      
      return c.json(ticketResponse)
    } catch (error) {
      console.log(`❌ Get ticket details error: ${error}`)
      console.error('Get ticket details error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fetch ticket details' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId/comments - Get ticket comments (Moderator/Superuser only)
  app.get('/moderation/tickets/:ticketId/comments', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Get ticket comments: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Get ticket comments authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Get ticket comments: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Get ticket comments: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')

      // ============================================================
      // SQL CONVERSION
      // OLD: const comments = await kv.get(`ticket:${ticketId}:comments`) || []
      // NEW: SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC
      // ============================================================

      console.log(`🔍 Fetching comments for ticket: ${ticketId}`)

      const { data: comments, error: commentsError } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      
      if (commentsError) {
        console.log(`❌ Error fetching comments: ${commentsError.message}`)
        return c.json({ error: 'Failed to fetch comments' }, 500)
      }

      console.log(`✅ Found ${comments?.length || 0} comments`)

      // Map DB fields to expected format (snake_case to camelCase)
      const formattedComments = (comments || []).map(comment => ({
        id: comment.id,
        ticketId: comment.ticket_id,
        userId: comment.user_id,
        userName: comment.user_name,
        content: comment.content,
        mentions: comment.mentions || [],
        createdAt: comment.created_at
      }))
      
      return c.json(formattedComments)
    } catch (error) {
      console.log(`❌ Get ticket comments error: ${error}`)
      console.error('Get ticket comments error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fetch ticket comments' }, 500)
    }
  })

  // ✅ POST /moderation/tickets/:ticketId/comments - Add comment to ticket (Moderator/Superuser only)
  app.post('/moderation/tickets/:ticketId/comments', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Add ticket comment: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Add ticket comment authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Add ticket comment: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Add ticket comment: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json()
      const { content, mentions } = body

      if (!content || !content.trim()) {
        console.log('❌ Add ticket comment: Missing content')
        return c.json({ error: 'Comment content is required' }, 400)
      }

      // Get current user info from database
      const { data: currentUserData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      const userName = currentUserData?.display_name || currentUserData?.email || user.email || 'Moderator'

      // ============================================================
      // SQL CONVERSION
      // OLD: Get comments array, add comment, set back to KV
      // NEW: INSERT INTO ticket_comments
      // ============================================================

      const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const timestamp = new Date().toISOString()

      console.log(`💬 Adding comment to ticket ${ticketId}`)
      console.log(`   From: ${userName} (${user.id})`)
      console.log(`   Content length: ${content.trim().length} characters`)
      console.log(`   Mentions: ${mentions?.length || 0}`)

      const { data: comment, error: insertError } = await supabase
        .from('ticket_comments')
        .insert({
          id: commentId,
          ticket_id: ticketId,
          user_id: user.id,
          user_name: userName,
          content: content.trim(),
          mentions: mentions || [],
          created_at: timestamp
        })
        .select()
        .single()

      if (insertError) {
        console.log(`❌ Error inserting comment: ${insertError.message}`)
        return c.json({ error: 'Failed to add comment' }, 500)
      }

      console.log(`✅ Comment added successfully`)

      // ============================================================
      // NOTIFICATIONS FOR MENTIONS
      // SQL CONVERSION
      // OLD: Get notifications array from KV, add notification, set back
      // NEW: INSERT INTO notifications
      // ============================================================

      // Send notifications to mentioned users
      try {
        console.log(`📬 Processing mentions for ticket comment...`)
        
        for (const mention of mentions || []) {
          console.log(`📬 Processing mention for ${mention.name} (${mention.id})`)
          
          // Don't notify the user who posted the comment
          if (mention.id === user.id) {
            console.log(`📬 Skipping self-mention`)
            continue
          }
          
          // Create notification for the mentioned user
          const notificationId = crypto.randomUUID()
          const notificationTimestamp = new Date().toISOString()

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              id: notificationId,
              user_id: mention.id,
              type: 'ticket_mention',
              from_user_id: user.id,
              from_user_name: userName,
              ticket_id: ticketId,
              comment_text: content.trim(),
              created_at: notificationTimestamp,
              is_read: false,
              is_seen: false
            })

          if (notificationError) {
            console.log(`❌ Failed to create mention notification: ${notificationError.message}`)
          } else {
            console.log(`📬 Created ticket mention notification for user ${mention.id}`)
          }
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create mention notifications: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      // ============================================================
      // NOTIFICATION FOR ASSIGNED MODERATOR
      // SQL CONVERSION
      // OLD: Get flag from KV, get notifications from KV, add notification
      // NEW: Get flag from SQL, INSERT INTO notifications
      // ============================================================

      // Notify the assigned moderator if someone else commented on their ticket
      try {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('assigned_to')
          .eq('id', ticketId)
          .single()
        
        if (ticket) {
          const assignedToId = ticket.assigned_to
          
          // Only notify if there's an assigned moderator and it's not the person who commented
          if (assignedToId && assignedToId !== user.id) {
            console.log(`📬 Notifying assigned moderator ${assignedToId} about new comment`)
            
            const notificationId = crypto.randomUUID()
            const notificationTimestamp = new Date().toISOString()

            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                id: notificationId,
                user_id: assignedToId,
                type: 'ticket_comment',
                message: `${userName} commented on ticket ${ticketId}`,
                related_user_id: user.id,
                requester_display_name: userName,
                created_at: notificationTimestamp,
                is_read: false,
                is_seen: false
              })

            if (notificationError) {
              console.log(`❌ Failed to create assignee notification: ${notificationError.message}`)
            } else {
              console.log(`📬 Created ticket comment notification for assigned moderator ${assignedToId}`)
            }
          }
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create assignee notification: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      // Return formatted comment
      const formattedComment = {
        id: commentId,
        ticketId,
        userId: user.id,
        userName,
        content: content.trim(),
        mentions: mentions || [],
        createdAt: timestamp
      }

      return c.json(formattedComment)
    } catch (error) {
      console.log(`❌ Add ticket comment error: ${error}`)
      console.error('Add ticket comment error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to add comment' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId/actions - Get ticket actions/history (Moderator/Superuser only)
  app.get('/moderation/tickets/:ticketId/actions', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Get ticket actions: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Get ticket actions authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Get ticket actions: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Get ticket actions: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')

      // ============================================================
      // SQL CONVERSION
      // OLD: Get action IDs from KV, then fetch each action
      // NEW: SELECT * FROM ticket_actions WHERE ticket_id = $1 ORDER BY timestamp ASC
      // ============================================================

      console.log(`🔍 Fetching actions for ticket: ${ticketId}`)

      // First verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, created_at')
        .eq('id', ticketId)
        .single()
      
      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Fetch all actions for this ticket
      const { data: actions, error: actionsError } = await supabase
        .from('ticket_actions')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('timestamp', { ascending: true })
      
      if (actionsError) {
        console.log(`❌ Error fetching actions: ${actionsError.message}`)
        return c.json({ error: 'Failed to fetch actions' }, 500)
      }

      console.log(`✅ Found ${actions?.length || 0} actions`)

      // Map DB fields to expected format
      const formattedActions = (actions || []).map(action => ({
        id: action.id,
        ticketId: action.ticket_id,
        actionType: action.action_type,
        performedBy: action.performed_by,
        performedById: action.performed_by_id,
        timestamp: action.timestamp,
        details: action.details || {}
      }))
      
      // Add creation action if not already present
      const hasCreationAction = formattedActions.some(a => a.actionType === 'creation')
      if (!hasCreationAction) {
        const creationAction = {
          id: `action-creation-${ticket.id}`,
          ticketId,
          actionType: 'creation',
          performedBy: 'System',
          performedById: null,
          timestamp: ticket.created_at,
          details: {}
        }
        formattedActions.unshift(creationAction)
      }
      
      return c.json(formattedActions)
    } catch (error) {
      console.log(`❌ Get ticket actions error: ${error}`)
      console.error('Get ticket actions error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fetch ticket actions' }, 500)
    }
  })

  // ✅ PATCH /moderation/tickets/:ticketId/status - Update ticket status (Moderator/Superuser only)
  app.patch('/moderation/tickets/:ticketId/status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Update ticket status: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Update ticket status authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Update ticket status: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Update ticket status: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json()
      const { status, resolutionNote } = body

      // ============================================================
      // SQL CONVERSION
      // OLD: Get ticket from KV, update, set back
      // NEW: UPDATE tickets SET ... WHERE id = $1
      // ============================================================

      console.log(`🔄 Updating ticket status: ${ticketId}`)
      console.log(`   New status: ${status}`)
      console.log(`   Resolution note: ${resolutionNote || 'none'}`)

      // First get the current ticket state
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()
      
      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Get current user info from database
      const { data: currentUserData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      const userName = currentUserData?.display_name || currentUserData?.email || user.email || 'Moderator'
      const oldStatus = ticket.status

      console.log(`   Old status: ${oldStatus}`)
      console.log(`   Performed by: ${userName}`)

      // Build update object
      const updates: any = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // Set resolution fields if resolving/dismissing
      if (status === 'resolved' || status === 'dismissed') {
        updates.resolved_at = new Date().toISOString()
        updates.resolved_by = user.id
      }

      // Set resolution note if provided
      if (resolutionNote) {
        updates.resolution_note = resolutionNote
      }

      // Auto-assign to current user when status changes to 'in_progress' or 'under_review'
      // Reset assignment when status changes back to 'open' or 'pending'
      if (status === 'in_progress' || status === 'under_review') {
        if (!ticket.assigned_to) {
          updates.assigned_to = user.id
        }
      } else if (status === 'open' || status === 'pending') {
        updates.assigned_to = null
      }

      // Update the ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

      if (updateError) {
        console.log(`❌ Error updating ticket: ${updateError.message}`)
        return c.json({ error: 'Failed to update ticket status' }, 500)
      }

      console.log(`✅ Ticket status updated successfully`)

      // ============================================================
      // SQL CONVERSION - TICKET ACTIONS
      // OLD: Get action IDs array, create action objects, save both
      // NEW: INSERT INTO ticket_actions
      // ============================================================

      // Create status change action
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const timestamp = new Date().toISOString()

      const { error: actionError } = await supabase
        .from('ticket_actions')
        .insert({
          id: actionId,
          ticket_id: ticketId,
          action_type: (status === 'resolved' || status === 'dismissed') ? 'resolution' : 'status_change',
          performed_by: userName,
          performed_by_id: user.id,
          timestamp: timestamp,
          details: {
            oldValue: oldStatus,
            newValue: status,
            reason: resolutionNote
          }
        })

      if (actionError) {
        console.log(`⚠️  Failed to create status change action: ${actionError.message}`)
      } else {
        console.log(`📝 Created status change action`)
      }

      // Create an assignment action if status changed to in_progress/under_review and ticket wasn't assigned
      if ((status === 'in_progress' || status === 'under_review') && !ticket.assigned_to) {
        const assignmentActionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}-assignment`
        
        const { error: assignmentError } = await supabase
          .from('ticket_actions')
          .insert({
            id: assignmentActionId,
            ticket_id: ticketId,
            action_type: 'assignment',
            performed_by: userName,
            performed_by_id: user.id,
            timestamp: new Date().toISOString(),
            details: {
              assignedTo: userName,
              assignedToId: user.id
            }
          })

        if (assignmentError) {
          console.log(`⚠️  Failed to create assignment action: ${assignmentError.message}`)
        } else {
          console.log(`📝 Created assignment action`)
        }
      }
      
      // Create an unassignment action if status changed to open/pending
      if ((status === 'open' || status === 'pending') && ticket.assigned_to) {
        const unassignmentActionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}-unassignment`
        
        // Get previously assigned user info
        const { data: prevAssignedUser } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.assigned_to)
          .single()
        
        const prevAssignedName = prevAssignedUser?.display_name || prevAssignedUser?.email || 'Unknown'
        
        const { error: unassignmentError } = await supabase
          .from('ticket_actions')
          .insert({
            id: unassignmentActionId,
            ticket_id: ticketId,
            action_type: 'unassignment',
            performed_by: userName,
            performed_by_id: user.id,
            timestamp: new Date().toISOString(),
            details: {
              previouslyAssignedTo: prevAssignedName
            }
          })

        if (unassignmentError) {
          console.log(`⚠️  Failed to create unassignment action: ${unassignmentError.message}`)
        } else {
          console.log(`📝 Created unassignment action`)
        }
      }
      
      return c.json({ 
        success: true,
        message: 'Ticket status updated successfully'
      })
    } catch (error) {
      console.log(`❌ Update ticket status error: ${error}`)
      console.error('Update ticket status error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to update ticket status' }, 500)
    }
  })

  // ✅ POST /moderation/tickets/:ticketId/assign - Assign ticket to moderator (Moderator/Superuser only)
  app.post('/moderation/tickets/:ticketId/assign', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Assign ticket: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Assign ticket authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Assign ticket: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Assign ticket: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json()
      const { moderatorId } = body

      if (!moderatorId) {
        console.log('❌ Assign ticket: Missing moderator ID')
        return c.json({ error: 'Moderator ID is required' }, 400)
      }

      // ============================================================
      // SQL CONVERSION
      // OLD: Get ticket from KV, update, set back
      // NEW: UPDATE tickets SET ... WHERE id = $1
      // ============================================================

      console.log(`👤 Assigning ticket: ${ticketId}`)
      console.log(`   To moderator: ${moderatorId}`)

      // First get the current ticket state
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()
      
      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Get assigned moderator info from database
      const { data: assignedUserData, error: assignedUserError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', moderatorId)
        .single()
      
      if (assignedUserError || !assignedUserData) {
        console.log(`❌ Assigned moderator not found: ${moderatorId}`)
        return c.json({ error: 'Moderator not found' }, 404)
      }

      const assignedName = assignedUserData.display_name || assignedUserData.email || 'Moderator'

      // Get current user info from database
      const { data: currentUserData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      const userName = currentUserData?.display_name || currentUserData?.email || user.email || 'Moderator'

      // Check if there's a previous assignment (for reassignment tracking)
      const previouslyAssignedTo = ticket.assigned_to
      let previouslyAssignedToName = null
      if (previouslyAssignedTo) {
        const { data: prevUser } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', previouslyAssignedTo)
          .single()
        
        previouslyAssignedToName = prevUser?.display_name || prevUser?.email || 'Unknown'
      }

      console.log(`   Assigned to: ${assignedName}`)
      console.log(`   Assigned by: ${userName}`)
      console.log(`   Previous assignee: ${previouslyAssignedToName || 'none'}`)

      // Update the ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          assigned_to: moderatorId,
          updated_at: new Date().toISOString(),
          status: "reviewing"
        })
        .eq('id', ticketId)

      if (updateError) {
        console.log(`❌ Error assigning ticket: ${updateError.message}`)
        return c.json({ error: 'Failed to assign ticket' }, 500)
      }

      console.log(`✅ Ticket assigned successfully`)

      // ============================================================
      // SQL CONVERSION - TICKET ACTIONS
      // OLD: Get action IDs array, create action objects, save both
      // NEW: INSERT INTO ticket_actions
      // ============================================================
      
      // Create assignment action
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const actionDetails: any = {
        assignedTo: assignedName,
        assignedToId: moderatorId
      }

      // Include previous assignee if this is a reassignment
      if (previouslyAssignedTo && previouslyAssignedToName) {
        actionDetails.previouslyAssignedTo = previouslyAssignedToName
        actionDetails.previouslyAssignedToId = previouslyAssignedTo
      }

      const { error: actionError } = await supabase
        .from('ticket_actions')
        .insert({
          id: actionId,
          ticket_id: ticketId,
          action_type: 'assignment',
          performed_by: userName,
          performed_by_id: user.id,
          timestamp: new Date().toISOString(),
          details: actionDetails
        })

      if (actionError) {
        console.log(`⚠️  Failed to create assignment action: ${actionError.message}`)
      } else {
        console.log(`📝 Created assignment action`)
      }

      // ============================================================
      // NOTIFICATION FOR ASSIGNED MODERATOR
      // SQL CONVERSION
      // OLD: Get notifications from KV, add notification, set back
      // NEW: INSERT INTO notifications
      // ============================================================

      // Send notification to the assigned moderator (unless they assigned it to themselves)
      try {
        if (moderatorId !== user.id) {
          console.log(`📬 Notifying moderator ${moderatorId} about ticket assignment`)
          
          const notificationId = crypto.randomUUID()
          
          // Build notification message
          const message = previouslyAssignedTo && previouslyAssignedToName
            ? `${userName} reassigned ticket #${ticketId} to you`
            : `${userName} assigned ticket #${ticketId} to you`
          
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              id: notificationId,
              user_id: moderatorId,
              type: 'ticket_assigned',
              message: message,
              related_user_id: user.id,
              requester_display_name: userName,
              created_at: new Date().toISOString(),
              is_read: false,
              is_seen: false
            })

          if (notificationError) {
            console.log(`❌ Failed to create assignment notification: ${notificationError.message}`)
          } else {
            console.log(`📬 Created ticket assignment notification for moderator ${moderatorId}`)
          }
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create assignment notification: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      return c.json({ 
        success: true,
        message: 'Ticket assigned successfully' 
      })
    } catch (error) {
      console.log(`❌ Assign ticket error: ${error}`)
      console.error('Assign ticket error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to assign ticket' }, 500)
    }
  })

  // ✅ GET /moderation/moderators - Get list of moderators (Moderator/Superuser only)
  app.get('/moderation/moderators', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Get moderators: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Get moderators authentication error: ${authError?.message || 'User not found'}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single()
      
      if (userError || !userData) {
        console.log(`❌ Get moderators: Failed to fetch user data: ${userError?.message}`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      const isSuperuser = userData.is_superuser === true
      const isModerator = userData.is_moderator === true
      
      if (!isSuperuser && !isModerator) {
        console.log(`❌ Get moderators: User ${user.id} lacks moderator access`)
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      // ============================================================
      // SQL CONVERSION NOTES:
      // This endpoint now checks the database 'users' table for is_moderator/is_superuser flags
      // Then fetches all users from database and returns those with moderator privileges
      // ============================================================

      console.log(`👥 Fetching list of moderators...`)

      // Query database for all moderators and superusers
      const { data: moderatorUsers, error: modError } = await supabase
        .from('users')
        .select('id, display_name, email, is_moderator, is_superuser')
        .or('is_moderator.eq.true,is_superuser.eq.true')
      
      if (modError) {
        console.log(`❌ Failed to fetch moderators: ${modError.message}`)
        return c.json({ error: 'Failed to fetch moderators' }, 500)
      }

      const moderators = (moderatorUsers || []).map((u: any) => ({
        id: u.id,
        name: u.display_name || u.email,
        role: u.is_superuser ? 'superuser' : 'moderator'
      }))
      
      console.log(`✅ Found ${moderators.length} moderators`)

      return c.json(moderators)
    } catch (error) {
      console.log(`❌ Get moderators error: ${error}`)
      console.error('Get moderators error stack:', error instanceof Error ? error.stack : String(error))
      return c.json({ error: 'Failed to fetch moderators' }, 500)
    }
  })
}