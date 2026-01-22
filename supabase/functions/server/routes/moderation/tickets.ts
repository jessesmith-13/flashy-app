import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

/* ============================================================
   Local DB Types (schema-aligned)
============================================================ */

type Ticket = {
  id: string
  title: string | null
  category: string
  priority: string
  status: string
  description: string
  created_by: string | null
  assigned_to: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
  resolution_reason: string | null
  related_flag_id: string | null
  related_user_id: string | null
  related_deck_id: string | null
  related_card_id: string | null
  flagged_user_id: string | null
  flagged_user_display_name: string | null
  related_deck_title: string | null
  related_user_display_name: string | null
  related_card_title: string | null
  related_comment_text: string | null
  related_comment_id: string | null
  is_escalated: boolean | null
  created_at: string
  updated_at: string
}

type TicketAction = {
  id: string
  ticket_id: string
  action_type: string
  performed_by: string
  performed_by_id: string | null
  timestamp: string
  details: Record<string, unknown>
}

type Mention = {
  id: string
  name: string
}

type UserRow = {
  id: string
  display_name: string | null
  email: string | null
  is_moderator?: boolean
  is_superuser?: boolean
}

type AssignBody = {
  moderatorId: string
}

type StatusUpdateBody = {
  status: string
  resolutionNote?: string
  resolutionReason?: string
}

type ModeratorRow = {
  id: string
  display_name: string | null
  email: string | null
  is_moderator: boolean
  is_superuser: boolean
}

export function registerTicketRoutes(app: Hono) {
  // ============================================================
  // MODERATION TICKET SYSTEM - SINGLE SOURCE OF TRUTH
  // ============================================================
  // Tickets are the active work items for moderators
  // Status flow: open → reviewing → resolved/dismissed
  // 
  // All moderation workflow happens here:
  // - View ticket queue
  // - Assign tickets
  // - Add comments
  // - Update status
  // - Track action history
  //
  // Tickets can optionally reference a flag (original user report)
  // ============================================================

  // ✅ GET /moderation/tickets - List all tickets with optional filters
  app.get('/moderation/tickets', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ List tickets: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ List tickets authentication error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        console.log(`❌ List tickets: Failed to fetch user data`)
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        console.log(`❌ List tickets: User ${user.id} lacks moderator access`)
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      // ------------------------------
      // Query params
      // ------------------------------
      const status = c.req.query('status') as string | undefined
      const priority = c.req.query('priority') as string | undefined
      const category = c.req.query('category') as string | undefined
      const assignedTo = c.req.query('assignedTo') as string | undefined
      const unassigned = c.req.query('unassigned') === 'true'
      const limit = Number(c.req.query('limit') ?? 50)
      const offset = Number(c.req.query('offset') ?? 0)

      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })

      if (status) query = query.eq('status', status)
      if (priority) query = query.eq('priority', priority)
      if (category) query = query.eq('category', category)
      if (assignedTo) query = query.eq('assigned_to', assignedTo)
      if (unassigned) query = query.is('assigned_to', null)

      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      const { count: totalCount, error: countError } = await query

      if (countError) {
        console.log(`❌ Error getting ticket count`)
        return c.json({ error: 'Failed to count tickets' }, 500)
      }

      if (offset >= (totalCount ?? 0)) {
        return c.json({
          tickets: [],
          total: totalCount ?? 0,
          limit,
          offset,
        })
      }

      const { data: tickets, error: ticketsError } =
        await query.range(offset, offset + limit - 1)

      if (ticketsError) {
        console.log(`❌ Error fetching tickets: ${ticketsError.message}`)
        return c.json({ error: 'Failed to fetch tickets' }, 500)
      }

      const enrichedTickets = await Promise.all(
        (tickets ?? []).map(async (ticket) => {
          let assignedToName: string | null = null
          let resolvedByName: string | null = null

          if (ticket.assigned_to) {
            const { data } = await supabase
              .from('users')
              .select('display_name, email')
              .eq('id', ticket.assigned_to)
              .single<{ display_name: string | null; email: string }>()

            assignedToName = data?.display_name ?? data?.email ?? null
          }

          if (ticket.resolved_by) {
            const { data } = await supabase
              .from('users')
              .select('display_name, email')
              .eq('id', ticket.resolved_by)
              .single<{ display_name: string | null; email: string }>()

            resolvedByName = data?.display_name ?? data?.email ?? null
          }

          // ✅ Derive targetType and targetId from related_* columns
          let targetType: string | null = null
          let targetId: string | null = null
          
          if (ticket.related_user_id) {
            targetType = 'user'
            targetId = ticket.related_user_id
          } else if (ticket.related_deck_id) {
            targetType = 'deck'
            targetId = ticket.related_deck_id
          } else if (ticket.related_card_id) {
            targetType = 'card'
            targetId = ticket.related_card_id
          }
          // Add more as needed: related_card_id, related_comment_id, etc.

          return {
            id: ticket.id,
            title: ticket.title,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            description: ticket.description,
            targetType,
            targetId,
            assignedTo: assignedToName,
            assignedToId: ticket.assigned_to,
            resolvedAt: ticket.resolved_at,
            resolvedBy: resolvedByName,
            resolvedById: ticket.resolved_by,
            resolutionNote: ticket.resolution_note,
            resolutionReason: ticket.resolution_reason,
            relatedFlagId: ticket.related_flag_id,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            createdBy: ticket.created_by,
            createdByDisplayName: ticket.created_by_display_name,
            // ✅ Include new fields
            isEscalated: ticket.is_escalated,
            escalatedAt: ticket.escalated_at,
            escalatedById: ticket.escalated_by_id,
            escalatedByDisplayName: ticket.escalated_by_display_name,
            escalatedReason: ticket.escalated_reason,
            // ✅ Include the raw related_* fields for debugging
            relatedUserId: ticket.related_user_id,
            relatedUserDisplayName: ticket.related_user_display_name,
            relatedDeckId: ticket.related_deck_id,
            relatedDeckTitle: ticket.related_deck_title,
            relatedCardId: ticket.related_card_id,
            relatedCardTitle: ticket.related_card_title,
            relatedCommentId: ticket.related_comment_id,
            relatedCommentText: ticket.related_comment_text,
            flaggedUserId: ticket.related_user_id,
            flaggedUserDisplayName: ticket.flagged_user_display_name,
          }
        })
      )

      return c.json({
        tickets: enrichedTickets,
        total: totalCount ?? 0,
        limit,
        offset,
      })
    } catch (error) {
      console.log(`❌ List tickets error: ${error}`)
      return c.json({ error: 'Failed to fetch tickets' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId - Get ticket details
  app.get('/moderation/tickets/:ticketId', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Get ticket: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Get ticket authentication error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')
      console.log(`Fetching details for ticket ID: ${ticketId}`)

      // -----------------------------------
      // Fetch ticket
      // -----------------------------------
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single<{
          id: string
          title: string | null
          category: string
          priority: string
          status: string
          description: string | null
          created_by: string | null
          created_by_display_name: string | null
          assigned_to: string | null
          assigned_display_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_display_name: string | null
          resolution_note: string | null
          resolution_reason: string | null
          related_flag_id: string | null
          related_user_id: string | null
          related_deck_id: string | null
          related_card_id: string | null
          flagged_user_id: string | null
          flagged_user_display_name: string | null
          related_deck_title: string | null
          related_user_display_name: string | null
          related_card_title: string | null
          related_comment_text: string | null
          related_comment_id: string | null
          is_escalated: boolean | null
          escalated_at: string | null
          escalated_by_id: string | null
          escalated_by_display_name: string | null
          escalated_reason: string | null
          created_at: string
          updated_at: string
        }>()

      if (ticketError || !ticket) {
        return c.json({ error: `Ticket ${ticketId} not found` }, 404)
      }

      // -----------------------------------
      // Assigned / resolved user lookups
      // -----------------------------------
      let assignedToName: string | null = null
      let resolvedByName: string | null = null

      if (ticket.assigned_to) {
        const { data } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.assigned_to)
          .single<{ display_name: string | null; email: string }>()

        assignedToName = data?.display_name ?? data?.email ?? null
      }

      if (ticket.resolved_by) {
        const { data } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.resolved_by)
          .single<{ display_name: string | null; email: string }>()

        resolvedByName = data?.display_name ?? data?.email ?? null
      }

      // ✅ Derive targetType and targetId from related_* columns
      let targetType: string | null = null
      let targetId: string | null = null
          
      if (ticket.related_user_id) {
        targetType = 'user'
        targetId = ticket.related_user_id
      } else if (ticket.related_deck_id) {
        targetType = 'deck'
        targetId = ticket.related_deck_id
      }
      // Add more as needed: related_card_id, related_comment_id, etc.

      // -----------------------------------
      // Related flag (optional) - Include original report
      // -----------------------------------
      let flagInfo: {
        flagId: string
        reportedBy: string
        reportedById: string
        reportedAt: string
        reason: string
        details: string | null
      } | null = null

      if (ticket.related_flag_id) {
        const { data: flag } = await supabase
          .from('flags')
          .select('reporter_id, reporter_name, reason, description, created_at')
          .eq('id', ticket.related_flag_id)
          .single<{
            reporter_id: string
            reporter_name: string
            reason: string
            description: string | null
            created_at: string
          }>()

        if (flag) {
          flagInfo = {
            flagId: ticket.related_flag_id,
            reportedBy: flag.reporter_name,
            reportedById: flag.reporter_id,
            reportedAt: flag.created_at,
            reason: flag.reason,
            details: flag.description,
          }
        }
      }

      // -----------------------------------
      // Response
      // -----------------------------------
      return c.json({
            id: ticket.id,
            title: ticket.title,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            description: ticket.description,
            targetType,
            targetId,
            assignedTo: assignedToName,
            assignedToId: ticket.assigned_to,
            resolvedAt: ticket.resolved_at,
            resolvedBy: resolvedByName,
            resolvedById: ticket.resolved_by,
            resolutionNote: ticket.resolution_note,
            resolutionReason: ticket.resolution_reason,
            relatedFlagId: ticket.related_flag_id,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            createdBy: ticket.created_by,
            createdByDisplayName: ticket.created_by_display_name,
            // ✅ Include new fields
            isEscalated: ticket.is_escalated,
            escalatedAt: ticket.escalated_at,
            escalatedById: ticket.escalated_by_id,
            escalatedByDisplayName: ticket.escalated_by_display_name,
            escalatedReason: ticket.escalated_reason,
            flagInfo,
            // ✅ Include the raw related_* fields for debugging
            relatedUserId: ticket.related_user_id,
            relatedUserDisplayName: ticket.related_user_display_name,
            relatedDeckId: ticket.related_deck_id,
            relatedDeckTitle: ticket.related_deck_title,
            relatedCardId: ticket.related_card_id,
            relatedCardTitle: ticket.related_card_title,
            relatedCommentId: ticket.related_comment_id,
            relatedCommentText: ticket.related_comment_text,
            flaggedUserId: ticket.related_user_id,
            flaggedUserDisplayName: ticket.flagged_user_display_name,
      })
    } catch (error) {
      console.log(`❌ Get ticket details error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket details' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId/comments - Get ticket detail comments
  app.get('/moderation/tickets/:ticketId/comments', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')

      // -----------------------------------
      // Fetch comments
      // -----------------------------------
      const { data: comments, error: commentsError } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
        .returns<Array<{
          id: string
          ticket_id: string
          user_id: string
          user_name: string
          content: string
          mentions: Array<{ id: string; name: string }> | null
          created_at: string
        }>>()

      if (commentsError) {
        return c.json({ error: 'Failed to fetch comments' }, 500)
      }

      // -----------------------------------
      // Map response
      // -----------------------------------
      const formattedComments = (comments ?? []).map(comment => ({
        id: comment.id,
        ticketId: comment.ticket_id,
        userId: comment.user_id,
        userName: comment.user_name,
        content: comment.content,
        mentions: comment.mentions ?? [],
        createdAt: comment.created_at,
      }))

      return c.json(formattedComments)
    } catch (error) {
      console.log(`❌ Get ticket comments error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket comments' }, 500)
    }
  })

  // ✅ POST /moderation/tickets/:ticketId/comments - Post a ticket detail comment
  app.post('/moderation/tickets/:ticketId/comments', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')

      // -----------------------------------
      // Parse + validate body
      // -----------------------------------
      const body = await c.req.json<{
        content?: string
        mentions?: Mention[]
      }>()

      const content = body.content?.trim()
      const mentions = body.mentions ?? []

      if (!content) {
        return c.json({ error: 'Comment content is required' }, 400)
      }

      // -----------------------------------
      // Resolve display name
      // -----------------------------------
      const { data: currentUser } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single<{
          display_name: string | null
          email: string | null
        }>()

      const userName =
        currentUser?.display_name ||
        currentUser?.email ||
        user.email ||
        'Moderator'

      const commentId = crypto.randomUUID()
      const createdAt = new Date().toISOString()

      // -----------------------------------
      // Insert comment
      // -----------------------------------
      const { data: comment, error: insertError } = await supabase
        .from('ticket_comments')
        .insert({
          id: commentId,
          ticket_id: ticketId,
          user_id: user.id,
          user_name: userName,
          content,
          mentions,
          created_at: createdAt,
        })
        .select()
        .single<{
          id: string
          ticket_id: string
          user_id: string
          user_name: string
          content: string
          mentions: Mention[] | null
          created_at: string
        }>()

      if (insertError || !comment) {
        return c.json({ error: 'Failed to add comment' }, 500)
      }

      // -----------------------------------
      // Notify mentioned users
      // -----------------------------------
      console.log(`📬 Processing mentions for ticket comment...`)
      console.log(`📬 Mentions received:`, mentions)
      console.log(`📬 Mentions type:`, typeof mentions, Array.isArray(mentions))
      
      for (const mentionIdOrObj of mentions) {
        // Handle both string[] (user IDs) and object[] ({ id, name }) formats
        const mentionId = typeof mentionIdOrObj === 'string' ? mentionIdOrObj : mentionIdOrObj.id
        const mentionName = typeof mentionIdOrObj === 'string' ? 'Unknown' : (mentionIdOrObj as any).name
        
        console.log(`📬 Processing mention for ${mentionName} (${mentionId})`)
        
        if (mentionId === user.id) {
          console.log(`📬 Skipping self-mention`)
          continue
        }

        const { error: notificationError } = await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: mentionId,
          type: 'ticket_mention',
          message: `${userName} mentioned you in ticket ${ticketId}`,
          related_user_id: user.id,
          requester_display_name: userName,
          ticket_id: ticketId,
          comment_text: content,
          created_at: new Date().toISOString(),
          is_read: false,
          is_seen: false,
        })
        
        if (notificationError) {
          console.log(`❌ Failed to create mention notification: ${notificationError.message}`)
        } else {
          console.log(`📬 Created ticket mention notification for user ${mentionId}`)
        }
      }

      // -----------------------------------
      // Notify assigned moderator
      // -----------------------------------
      const { data: ticket } = await supabase
        .from('tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .single<{ assigned_to: string | null }>()

      if (ticket?.assigned_to && ticket.assigned_to !== user.id) {
        console.log(`📬 Notifying assigned moderator ${ticket.assigned_to} about new comment`)
        
        const { error: assigneeNotifError } = await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: ticket.assigned_to,
          type: 'ticket_comment',
          message: `${userName} commented on ticket ${ticketId}`,
          ticket_id: ticketId,
          related_user_id: user.id,
          requester_display_name: userName,
          created_at: new Date().toISOString(),
          is_read: false,
          is_seen: false,
        })
        
        if (assigneeNotifError) {
          console.log(`❌ Failed to create assignee notification: ${assigneeNotifError.message}`)
        } else {
          console.log(`📬 Created ticket comment notification for assigned moderator ${ticket.assigned_to}`)
        }
      }

      // -----------------------------------
      // Response
      // -----------------------------------
      return c.json({
        id: comment.id,
        ticketId: comment.ticket_id,
        userId: comment.user_id,
        userName: comment.user_name,
        content: comment.content,
        mentions: comment.mentions ?? [],
        createdAt: comment.created_at,
      })
    } catch (error) {
      console.log(`❌ Add ticket comment error: ${error}`)
      return c.json({ error: 'Failed to add comment' }, 500)
    }
  })

  // ✅ GET /moderation/tickets/:ticketId/actions - Get ticket action history
  app.get('/moderation/tickets/:ticketId/actions', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')

      // -----------------------------------
      // Verify ticket exists
      // -----------------------------------
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, created_at')
        .eq('id', ticketId)
        .single<{
          id: string
          created_at: string
        }>()

      if (ticketError || !ticket) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // -----------------------------------
      // Fetch actions
      // -----------------------------------
      const { data: actions, error: actionsError } = await supabase
        .from('ticket_actions')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('timestamp', { ascending: true })
        .returns<TicketAction[]>()

      if (actionsError) {
        return c.json({ error: 'Failed to fetch actions' }, 500)
      }

      const formattedActions = (actions ?? []).map(action => ({
        id: action.id,
        ticketId: action.ticket_id,
        actionType: action.action_type,
        performedBy: action.performed_by,
        performedById: action.performed_by_id,
        timestamp: action.timestamp,
        details: action.details ?? {},
      }))

      // -----------------------------------
      // Ensure creation action exists
      // -----------------------------------
      const hasCreationAction = formattedActions.some(
        a => a.actionType === 'creation'
      )

      if (!hasCreationAction) {
        formattedActions.unshift({
          id: `action-creation-${ticket.id}`,
          ticketId,
          actionType: 'creation',
          performedBy: 'System',
          performedById: null,
          timestamp: ticket.created_at,
          details: {},
        })
      }

      return c.json(formattedActions)
    } catch (error) {
      console.log(`❌ Get ticket actions error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket actions' }, 500)
    }
  })

  // ✅ PATCH /moderation/tickets/:ticketId/status - Update ticket status
  app.patch('/moderation/tickets/:ticketId/status', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json<StatusUpdateBody>()
      const { status, resolutionNote, resolutionReason } = body

      // -----------------------------------
      // Fetch existing ticket
      // -----------------------------------
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, status, assigned_to, assigned_to_display_name')
        .eq('id', ticketId)
        .single<Ticket>()

      if (ticketError || !ticket) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      const oldStatus = ticket.status

      // -----------------------------------
      // Resolve actor name
      // -----------------------------------
      const { data: currentUser } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single<{
          display_name: string | null
          email: string | null
        }>()

      const userName =
        currentUser?.display_name ||
        currentUser?.email ||
        user.email ||
        'Moderator'

      // -----------------------------------
      // Build update payload
      // -----------------------------------
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      }

      // ✅ FIXED: Use consistent status values
      if (status === 'resolved' || status === 'dismissed') {
        updates.resolved_at = new Date().toISOString()
        updates.resolved_by = user.id
        updates.resolved_by_display_name = userName
      }

      if (resolutionNote) {
        updates.resolution_note = resolutionNote
      }

      if (resolutionReason) {
        updates.resolution_reason = resolutionReason
      }

      // ✅ FIXED: Use 'reviewing' instead of 'in_progress' or 'under_review'
      if (status === 'reviewing') {
        if (!ticket.assigned_to) {
          updates.assigned_to = user.id
          updates.assigned_to_display_name = userName
        }
      } else if (status === 'open') {
        // ✅ FIXED: Only check for 'open', removed 'pending'
        updates.assigned_to = null
        updates.assigned_to_display_name = null
      }

      // -----------------------------------
      // Update ticket
      // -----------------------------------
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

      if (updateError) {
        return c.json({ error: 'Failed to update ticket status' }, 500)
      }

      // -----------------------------------
      // Create status change action
      // -----------------------------------
      await supabase.from('ticket_actions').insert({
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ticket_id: ticketId,
        action_type:
          status === 'resolved' || status === 'dismissed'
            ? 'resolution'
            : 'status_change',
        performed_by: userName,
        performed_by_id: user.id,
        timestamp: new Date().toISOString(),
        details: {
          oldValue: oldStatus,
          newValue: status,
          reason: resolutionReason,
        },
      })

      return c.json({
        success: true,
        message: 'Ticket status updated successfully',
      })
    } catch (error) {
      console.log(`❌ Update ticket status error: ${error}`)
      return c.json({ error: 'Failed to update ticket status' }, 500)
    }
  })

  // ✅ POST /moderation/tickets/:ticketId/assign - Assign ticket to moderator
  app.post('/moderation/tickets/:ticketId/assign', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json<AssignBody>()
      const { moderatorId } = body

      if (!moderatorId) {
        return c.json({ error: 'Moderator ID is required' }, 400)
      }

      // -----------------------------------
      // Fetch ticket
      // -----------------------------------
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, assigned_to')
        .eq('id', ticketId)
        .single<Ticket>()

      if (ticketError || !ticket) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // -----------------------------------
      // Fetch assigned moderator
      // -----------------------------------
      const { data: assignedUser, error: assignedUserError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', moderatorId)
        .single<UserRow>()

      if (assignedUserError || !assignedUser) {
        return c.json({ error: 'Moderator not found' }, 404)
      }

      const assignedName =
        assignedUser.display_name ||
        assignedUser.email ||
        'Moderator'

      // -----------------------------------
      // Fetch acting user name
      // -----------------------------------
      const { data: currentUser } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single<UserRow>()

      const userName =
        currentUser?.display_name ||
        currentUser?.email ||
        user.email ||
        'Moderator'

      // -----------------------------------
      // Track previous assignment
      // -----------------------------------
      let previouslyAssignedName: string | null = null

      if (ticket.assigned_to) {
        const { data: prevUser } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', ticket.assigned_to)
          .single<UserRow>()

        previouslyAssignedName =
          prevUser?.display_name || prevUser?.email || null
      }

      // -----------------------------------
      // Update ticket - ✅ FIXED: Use 'reviewing' status
      // -----------------------------------
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          assigned_to: moderatorId,
          updated_at: new Date().toISOString(),
          status: 'reviewing',  // ✅ Use 'reviewing' consistently
        })
        .eq('id', ticketId)

      if (updateError) {
        return c.json({ error: 'Failed to assign ticket' }, 500)
      }

      // -----------------------------------
      // Create assignment action
      // -----------------------------------
      const actionDetails: Record<string, unknown> = {
        assignedTo: assignedName,
        assignedToId: moderatorId,
      }

      if (ticket.assigned_to && previouslyAssignedName) {
        actionDetails.previouslyAssignedTo = previouslyAssignedName
        actionDetails.previouslyAssignedToId = ticket.assigned_to
      }

      await supabase.from('ticket_actions').insert({
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ticket_id: ticketId,
        action_type: 'assignment',
        performed_by: userName,
        performed_by_id: user.id,
        timestamp: new Date().toISOString(),
        details: actionDetails,
      })

      // -----------------------------------
      // Notify assigned moderator
      // -----------------------------------
      if (moderatorId !== user.id) {
        const message =
          ticket.assigned_to && previouslyAssignedName
            ? `${userName} reassigned ticket #${ticketId} to you`
            : `${userName} assigned ticket #${ticketId} to you`

        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: moderatorId,
          type: 'ticket_assigned',
          message,
          ticket_id: ticketId,
          related_user_id: user.id,
          requester_display_name: userName,
          created_at: new Date().toISOString(),
          is_read: false,
          is_seen: false,
        })
      }

      return c.json({
        success: true,
        message: 'Ticket assigned successfully',
      })
    } catch (error) {
      console.log(`❌ Assign ticket error: ${error}`)
      return c.json({ error: 'Failed to assign ticket' }, 500)
    }
  })

  // ✅ GET /moderation/moderators - Get list of moderators and superusers
  app.get('/moderation/moderators', async (c: Context) => {
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

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      // -----------------------------------
      // Fetch moderators + superusers
      // -----------------------------------
      const { data: moderatorUsers, error: modError } = await supabase
        .from('users')
        .select('id, display_name, email, is_moderator, is_superuser')
        .or('is_moderator.eq.true,is_superuser.eq.true')
        .returns<ModeratorRow[]>()

      if (modError) {
        return c.json({ error: 'Failed to fetch moderators' }, 500)
      }

      const moderators = (moderatorUsers ?? []).map((u) => ({
        id: u.id,
        name: u.display_name || u.email,
        role: u.is_superuser ? 'superuser' : 'moderator',
      }))

      return c.json(moderators)
    } catch (error) {
      console.log(`❌ Get moderators error: ${error}`)
      return c.json({ error: 'Failed to fetch moderators' }, 500)
    }
  })

  // ✅ POST /moderation/tickets/:ticketId/escalate - Escalate a ticket
  app.post('/moderation/tickets/:ticketId/escalate', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Escalate ticket: No access token provided')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Escalate ticket authentication error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // -----------------------------------
      // Permission check
      // -----------------------------------
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_moderator, is_superuser, display_name')
        .eq('id', user.id)
        .single<{
          is_moderator: boolean
          is_superuser: boolean
          display_name: string | null
        }>()

      if (userError || !userData) {
        return c.json({ error: 'Failed to verify user permissions' }, 500)
      }

      if (!userData.is_moderator && !userData.is_superuser) {
        return c.json(
          { error: 'Unauthorized - Moderator or Superuser access required' },
          403
        )
      }

      const ticketId = c.req.param('ticketId')
      const body = await c.req.json() as { reason: string }
      const { reason } = body

      if (!reason || !reason.trim()) {
        return c.json({ error: 'Escalation reason is required' }, 400)
      }

      const userName = userData.display_name || user.email || 'Moderator'

      // -----------------------------------
      // Verify ticket exists and get current state
      // -----------------------------------
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, is_escalated, assigned_to, created_by')
        .eq('id', ticketId)
        .single<{
          id: string
          is_escalated: boolean | null
          assigned_to: string | null
          created_by: string | null
        }>()

      if (ticketError || !ticket) {
        console.log(`❌ Ticket not found: ${ticketId}`)
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Check if already escalated
      if (ticket.is_escalated) {
        return c.json({ error: 'Ticket is already escalated' }, 400)
      }

      // -----------------------------------
      // Update ticket to escalated
      // -----------------------------------
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          is_escalated: true,
          escalated_at: new Date().toISOString(),
          escalated_by_id: user.id,
          escalated_by_display_name: userName,
          escalated_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)

      if (updateError) {
        console.log(`❌ Failed to escalate ticket: ${updateError.message}`)
        return c.json({ error: 'Failed to escalate ticket' }, 500)
      }

      console.log(`✅ Ticket ${ticketId} escalated by ${userName}`)

      // -----------------------------------
      // Create ticket action for escalation
      // -----------------------------------
      const actionId = crypto.randomUUID()
      const { error: actionError } = await supabase
        .from('ticket_actions')
        .insert({
          id: actionId,
          ticket_id: ticketId,
          action_type: 'escalation',
          performed_by: userName,
          performed_by_id: user.id,
          timestamp: new Date().toISOString(),
          details: {
            escalationReason: reason,
          },
        })

      if (actionError) {
        console.log(`❌ Failed to create escalation action: ${actionError.message}`)
        // Don't fail the request - escalation was successful
      } else {
        console.log(`✅ Escalation action created`)
      }

      // -----------------------------------
      // Notify superusers about escalation
      // -----------------------------------
      const { data: superusers, error: superusersError } = await supabase
        .from('users')
        .select('id')
        .eq('is_superuser', true)

      if (!superusersError && superusers && superusers.length > 0) {
        const notifications = superusers
          .filter((su) => su.id !== user.id) // Don't notify the person who escalated
          .map((su) => ({
            id: crypto.randomUUID(),
            user_id: su.id,
            type: 'ticket_escalated',
            message: `${userName} escalated ticket #${ticketId}: ${reason}`,
            ticket_id: ticketId,
            related_user_id: user.id,
            requester_display_name: userName,
            created_at: new Date().toISOString(),
            is_read: false,
            is_seen: false,
          }))

        if (notifications.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications)

          if (notifError) {
            console.log(`❌ Failed to create escalation notifications: ${notifError.message}`)
          } else {
            console.log(`✅ Created ${notifications.length} escalation notifications for superusers`)
          }
        }
      }

      return c.json({
        success: true,
        message: 'Ticket escalated successfully',
      })
    } catch (error) {
      console.log(`❌ Escalate ticket error: ${error}`)
      return c.json({ error: 'Failed to escalate ticket' }, 500)
    }
  })
}