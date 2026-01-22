import { Hono } from 'npm:hono'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export function registerTicketRoutes(app: Hono) {
  // Get ticket details by ID (Moderator/Superuser only)
  app.get('/make-server-8a1502a9/tickets/:ticketId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const flag = await kv.get(`flag:${ticketId}`)
      
      if (!flag) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Map flag to ticket details format
      const ticket = {
        id: (flag as any).id,
        itemType: (flag as any).targetType,
        itemId: (flag as any).targetId,
        itemName: (flag as any).targetName,
        reason: (flag as any).reason,
        details: (flag as any).notes || '',
        reportedBy: (flag as any).reporterName,
        reportedById: (flag as any).reporterId,
        reportedAt: (flag as any).createdAt,
        status: (flag as any).status === 'open' ? 'pending' : (flag as any).status === 'reviewing' ? 'under_review' : (flag as any).status === 'resolved' ? ((flag as any).resolutionReason === 'rejected' ? 'dismissed' : 'resolved') : 'pending',
        // Include assignedTo/assignedToId if there's an actual assignment (regardless of status)
        assignedTo: (flag as any).assignedTo || (flag as any).reviewingByName,
        assignedToId: (flag as any).assignedToId || (flag as any).reviewingBy,
        resolvedAt: (flag as any).resolvedAt,
        resolutionNote: (flag as any).moderatorNotes,
        deckId: (flag as any).targetDetails?.deckId,
        // Escalation fields
        isEscalated: (flag as any).isEscalated || false,
        escalatedBy: (flag as any).escalatedBy,
        escalatedByName: (flag as any).escalatedByName,
        escalationReason: (flag as any).escalationReason,
        escalatedAt: (flag as any).escalatedAt
      }
      
      return c.json(ticket)
    } catch (error) {
      console.log(`Get ticket details error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket details' }, 500)
    }
  })

  // Get ticket comments (Moderator/Superuser only)
  app.get('/make-server-8a1502a9/tickets/:ticketId/comments', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const comments = await kv.get(`ticket:${ticketId}:comments`) || []
      
      return c.json(comments)
    } catch (error) {
      console.log(`Get ticket comments error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket comments' }, 500)
    }
  })

  // Add comment to ticket (Moderator/Superuser only)
  app.post('/make-server-8a1502a9/tickets/:ticketId/comments', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const { content, mentions } = await c.req.json()

      if (!content || !content.trim()) {
        return c.json({ error: 'Comment content is required' }, 400)
      }

      const userName = user.user_metadata?.displayName || user.user_metadata?.name || user.email

      const comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ticketId,
        userId: user.id,
        userName,
        content: content.trim(),
        mentions: mentions || [],
        createdAt: new Date().toISOString()
      }

      // Get existing comments
      const comments = await kv.get(`ticket:${ticketId}:comments`) || []
      const updatedComments = [...(comments as any[]), comment]
      
      await kv.set(`ticket:${ticketId}:comments`, updatedComments)

      // Send notifications to mentioned users
      try {
        console.log(`📬 Processing mentions for ticket comment...`)
        console.log(`📬 Mentions:`, mentions)
        
        for (const mention of mentions || []) {
          console.log(`📬 Processing mention for ${mention.name} (${mention.id})`)
          
          // Don't notify the user who posted the comment
          if (mention.id === user.id) {
            console.log(`📬 Skipping self-mention`)
            continue
          }
          
          // Create notification for the mentioned user
          const notificationKey = `notifications:${mention.id}`
          const notifications = await kv.get(notificationKey) || []
          
          const notification = {
            id: crypto.randomUUID(),
            type: 'ticket_mention',
            fromUserId: user.id,
            fromUserName: userName,
            ticketId: ticketId,
            commentText: content.trim(),
            createdAt: new Date().toISOString(),
            read: false,
            seen: false
          }
          
          await kv.set(notificationKey, [notification, ...(notifications as any[])])
          console.log(`📬 Created ticket mention notification for user ${mention.id}`)
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create mention notifications: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      // Notify the assigned moderator if someone else commented on their ticket
      try {
        const flag = await kv.get(`flag:${ticketId}`)
        
        if (flag) {
          const assignedToId = (flag as any).reviewingBy
          
          // Only notify if there's an assigned moderator and it's not the person who commented
          if (assignedToId && assignedToId !== user.id) {
            console.log(`📬 Notifying assigned moderator ${assignedToId} about new comment`)
            
            const notificationKey = `notifications:${assignedToId}`
            const notifications = await kv.get(notificationKey) || []
            
            const notification = {
              id: crypto.randomUUID(),
              type: 'ticket_comment',
              fromUserId: user.id,
              fromUserName: userName,
              ticketId: ticketId,
              commentText: content.trim(),
              createdAt: new Date().toISOString(),
              read: false,
              seen: false
            }
            
            await kv.set(notificationKey, [notification, ...(notifications as any[])])
            console.log(`📬 Created ticket comment notification for assigned moderator ${assignedToId}`)
          }
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create assignee notification: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      return c.json(comment)
    } catch (error) {
      console.log(`Add ticket comment error: ${error}`)
      return c.json({ error: 'Failed to add comment' }, 500)
    }
  })

  // Get ticket actions/history (Moderator/Superuser only)
  app.get('/make-server-8a1502a9/tickets/:ticketId/actions', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const flag = await kv.get(`flag:${ticketId}`)
      
      if (!flag) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      const actionIds = await kv.get(`ticket:${ticketId}:actions`) || []
      
      // Fetch all action objects
      const actions = []
      for (const actionId of (actionIds as string[])) {
        const action = await kv.get(`action:${actionId}`)
        if (action) {
          actions.push(action)
        }
      }
      
      // Add creation action if not already present
      const hasCreationAction = actions.some((a: any) => a.actionType === 'creation')
      if (!hasCreationAction) {
        const creationAction = {
          id: `action-creation-${(flag as any).id}`,
          ticketId,
          actionType: 'creation',
          performedBy: (flag as any).reporterName,
          performedById: (flag as any).reporterId,
          timestamp: (flag as any).createdAt,
          details: {}
        }
        actions.unshift(creationAction)
      }
      
      return c.json(actions)
    } catch (error) {
      console.log(`Get ticket actions error: ${error}`)
      return c.json({ error: 'Failed to fetch ticket actions' }, 500)
    }
  })

  // Update ticket status (Moderator/Superuser only)
  app.patch('/make-server-8a1502a9/tickets/:ticketId/status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const { status, resolutionNote } = await c.req.json()

      const flag = await kv.get(`flag:${ticketId}`)
      
      if (!flag) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      const userName = user.user_metadata?.displayName || user.user_metadata?.name || user.email
      const oldStatus = (flag as any).status

      // Map ticket statuses back to flag statuses
      let flagStatus = (flag as any).status
      if (status === 'pending') flagStatus = 'open'
      else if (status === 'under_review') flagStatus = 'reviewing'
      else if (status === 'resolved' || status === 'dismissed') flagStatus = 'resolved'

      // Update the flag
      const updatedFlag = {
        ...(flag as any),
        status: flagStatus,
        resolvedAt: (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : (flag as any).resolvedAt,
        resolutionReason: status === 'dismissed' ? 'rejected' : (status === 'resolved' ? 'approved' : (flag as any).resolutionReason),
        moderatorNotes: resolutionNote || (flag as any).moderatorNotes,
        resolvedBy: (status === 'resolved' || status === 'dismissed') ? user.id : (flag as any).resolvedBy,
        resolvedByName: (status === 'resolved' || status === 'dismissed') ? userName : (flag as any).resolvedByName,
        // Auto-assign to current user when status changes to 'reviewing'
        // Reset assignment when status changes to 'open'
        reviewingBy: flagStatus === 'reviewing' ? user.id : (flagStatus === 'open' ? null : (flag as any).reviewingBy),
        reviewingByName: flagStatus === 'reviewing' ? userName : (flagStatus === 'open' ? null : (flag as any).reviewingByName),
      }

      await kv.set(`flag:${ticketId}`, updatedFlag)

      // Get existing action IDs
      const actionIds = await kv.get(`ticket:${ticketId}:actions`) || []
      
      // Create status change action
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const action = {
        id: actionId,
        ticketId,
        actionType: (status === 'resolved' || status === 'dismissed') ? 'resolution' : 'status_change',
        performedBy: userName,
        performedById: user.id,
        timestamp: new Date().toISOString(),
        details: {
          oldValue: oldStatus,
          newValue: flagStatus,
          reason: resolutionNote
        }
      }
      await kv.set(actionId, action)
      
      // Add to actions list
      const updatedActionIds = [...(actionIds as string[]), actionId]
      
      // Create an assignment action if status changed to 'reviewing' and assignee changed
      if (flagStatus === 'reviewing' && (flag as any).reviewingBy !== user.id) {
        const assignmentActionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}-assignment`
        const assignmentAction = {
          id: assignmentActionId,
          ticketId,
          actionType: 'assignment',
          performedBy: userName,
          performedById: user.id,
          timestamp: new Date().toISOString(),
          details: {
            assignedTo: userName,
            assignedToId: user.id
          }
        }
        await kv.set(assignmentActionId, assignmentAction)
        updatedActionIds.push(assignmentActionId)
      }
      
      // Create an unassignment action if status changed from 'reviewing' to 'open'
      if (oldStatus === 'reviewing' && flagStatus === 'open' && (flag as any).reviewingBy) {
        const unassignmentActionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}-unassignment`
        const unassignmentAction = {
          id: unassignmentActionId,
          ticketId,
          actionType: 'unassignment',
          performedBy: userName,
          performedById: user.id,
          timestamp: new Date().toISOString(),
          details: {
            previouslyAssignedTo: (flag as any).reviewingByName
          }
        }
        await kv.set(unassignmentActionId, unassignmentAction)
        updatedActionIds.push(unassignmentActionId)
      }
      
      await kv.set(`ticket:${ticketId}:actions`, updatedActionIds)
      
      return c.json({ message: 'Ticket status updated' })
    } catch (error) {
      console.log(`Update ticket status error: ${error}`)
      return c.json({ error: 'Failed to update ticket status' }, 500)
    }
  })

  // Assign ticket to moderator (Moderator/Superuser only)
  app.post('/make-server-8a1502a9/tickets/:ticketId/assign', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      const ticketId = c.req.param('ticketId')
      const { moderatorId } = await c.req.json()

      const flag = await kv.get(`flag:${ticketId}`)
      
      if (!flag) {
        return c.json({ error: 'Ticket not found' }, 404)
      }

      // Get assigned moderator info
      const { data: assignedUser } = await supabase.auth.admin.getUserById(moderatorId)
      const assignedName = assignedUser?.user?.user_metadata?.displayName || assignedUser?.user?.user_metadata?.name || assignedUser?.user?.email

      // Check if there's a previous assignment (for reassignment tracking)
      const previouslyAssignedTo = (flag as any).reviewingByName
      const previouslyAssignedToId = (flag as any).reviewingBy
      const oldStatus = (flag as any).status

      const updatedFlag = {
        ...(flag as any),
        status: 'reviewing', // Automatically set to reviewing when assigned
        reviewingBy: moderatorId,
        reviewingByName: assignedName,
        assignedToId: moderatorId,
        assignedTo: assignedName
      }

      await kv.set(`flag:${ticketId}`, updatedFlag)

      // Add action entry
      const actionIds = await kv.get(`ticket:${ticketId}:actions`) || []
      const userName = user.user_metadata?.displayName || user.user_metadata?.name || user.email
      
      // If status changed from open to reviewing, add a status change action first
      const updatedActionIds = [...(actionIds as string[])]
      if (oldStatus !== 'reviewing') {
        const statusActionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}-status`
        const statusAction = {
          id: statusActionId,
          ticketId,
          actionType: 'status_change',
          performedBy: userName,
          performedById: user.id,
          timestamp: new Date().toISOString(),
          details: {
            oldValue: oldStatus,
            newValue: 'reviewing'
          }
        }
        await kv.set(`action:${statusActionId}`, statusAction)
        updatedActionIds.push(statusActionId)
      }
      
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const action = {
        id: actionId,
        ticketId,
        actionType: 'assignment',
        performedBy: userName,
        performedById: user.id,
        timestamp: new Date().toISOString(),
        details: {
          assignedTo: assignedName,
          assignedToId: moderatorId,
          // Include previous assignee if this is a reassignment
          ...(previouslyAssignedTo && previouslyAssignedToId ? {
            previouslyAssignedTo,
            previouslyAssignedToId
          } : {})
        }
      }
      
      await kv.set(`action:${actionId}`, action)
      await kv.set(`ticket:${ticketId}:actions`, [...updatedActionIds, actionId])
      
      // Send notification to the assigned moderator (unless they assigned it to themselves)
      try {
        if (moderatorId !== user.id) {
          console.log(`📬 Notifying moderator ${moderatorId} about ticket assignment`)
          
          const notificationKey = `notifications:${moderatorId}`
          const notifications = await kv.get(notificationKey) || []
          
          const notification = {
            id: crypto.randomUUID(),
            type: 'ticket_assigned',
            fromUserId: user.id,
            fromUserName: userName,
            ticketId: ticketId,
            ticketItemType: (flag as any).targetType,
            ticketItemName: (flag as any).targetName,
            ticketReason: (flag as any).reason,
            isReassignment: !!(previouslyAssignedTo && previouslyAssignedToId),
            createdAt: new Date().toISOString(),
            read: false,
            seen: false
          }
          
          await kv.set(notificationKey, [notification, ...(notifications as any[])])
          console.log(`📬 Created ticket assignment notification for moderator ${moderatorId}`)
        }
      } catch (notificationError) {
        console.error(`❌ Failed to create assignment notification: ${notificationError}`)
        // Don't fail the request if notification creation fails
      }
      
      return c.json({ message: 'Ticket assigned successfully' })
    } catch (error) {
      console.log(`Assign ticket error: ${error}`)
      return c.json({ error: 'Failed to assign ticket' }, 500)
    }
  })

  // Get list of moderators (Moderator/Superuser only)
  app.get('/make-server-8a1502a9/moderators', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check if user is moderator or superuser
      const isSuperuser = user.user_metadata?.isSuperuser === true
      const isModerator = user.user_metadata?.isModerator === true
      
      if (!isSuperuser && !isModerator) {
        return c.json({ error: 'Unauthorized - Moderator or Superuser access required' }, 403)
      }

      // Get all users and filter for moderators and superusers
      let allUsers: any[] = []
      let page = 1
      const perPage = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: userPage } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        })
        
        if (userPage && userPage.users && userPage.users.length > 0) {
          allUsers = allUsers.concat(userPage.users)
          page++
        } else {
          hasMore = false
        }
      }

      const moderators = allUsers
        .filter((u: any) => u.user_metadata?.isModerator === true || u.user_metadata?.isSuperuser === true)
        .map((u: any) => ({
          id: u.id,
          name: u.user_metadata?.displayName || u.user_metadata?.name || u.email
        }))
      
      return c.json(moderators)
    } catch (error) {
      console.log(`Get moderators error: ${error}`)
      return c.json({ error: 'Failed to fetch moderators' }, 500)
    }
  })
}