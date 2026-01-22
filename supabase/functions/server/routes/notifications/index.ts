import type { Context, Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts' // use YOUR existing supabase export

export function registerNotificationsRoutes(app: Hono) {
  // ============================================================
  // GET /notifications - Get notifications for current user
  // ============================================================
  app.get('/notifications', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return c.json({ error: 'Failed to fetch notifications' }, 500)
      }

      const notifications = data ?? []

      // ------------------------------------------------------------
      // Deduplicate friend_request notifications by related_user_id
      // ------------------------------------------------------------
      const seen = new Set<string>()
      const deduplicated: typeof notifications = []
      const duplicateIds: string[] = []

      for (const notification of notifications) {
        if (notification.type === 'friend_request') {
          const key = `friend_request:${notification.related_user_id}`

          if (!seen.has(key)) {
            seen.add(key)
            deduplicated.push(notification)
          } else {
            duplicateIds.push(notification.id)
          }
        } else {
          deduplicated.push(notification)
        }
      }

      // Cleanup duplicates (best-effort)
      if (duplicateIds.length > 0) {
        await supabase.from('notifications').delete().in('id', duplicateIds)
      }

      return c.json({ notifications: deduplicated })
    } catch {
      return c.json({ error: 'Failed to fetch notifications' }, 500)
    }
  })

  // ============================================================
  // POST /notifications/:notificationId/read
  // ============================================================
  app.post('/notifications/:notificationId/read', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const notificationId = c.req.param('notificationId')

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        return c.json({ error: 'Failed to mark notification as read' }, 500)
      }

      return c.json({ message: 'Notification marked as read' })
    } catch {
      return c.json({ error: 'Failed to mark notification as read' }, 500)
    }
  })

  // ============================================================
  // POST /notifications/mark-seen
  // ============================================================
  app.post('/notifications/mark-seen', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_seen: true })
        .eq('user_id', user.id)

      if (error) {
        return c.json({ error: 'Failed to mark notifications as seen' }, 500)
      }

      return c.json({ message: 'All notifications marked as seen' })
    } catch {
      return c.json({ error: 'Failed to mark notifications as seen' }, 500)
    }
  })

  // ============================================================
  // DELETE /notifications - Clear all notifications
  // ============================================================
  app.delete('/notifications', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        return c.json({ error: 'Failed to clear notifications' }, 500)
      }

      return c.json({ message: 'All notifications cleared' })
    } catch {
      return c.json({ error: 'Failed to clear notifications' }, 500)
    }
  })
}
