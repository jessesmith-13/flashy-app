import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerTermsAcceptRoutes(app: Hono) {
  app.post('/auth/terms/accept', async c => {
    try {
      // ------------------------------------------------------------
      // Auth
      // ------------------------------------------------------------
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ------------------------------------------------------------
      // Server-side timestamp (do NOT trust client)
      // ------------------------------------------------------------
      const acceptedAt = new Date().toISOString()

      // ------------------------------------------------------------
      // Update DB
      // ------------------------------------------------------------
      const { error: updateError } = await supabase
        .from('users')
        .update({
          terms_accepted_at: acceptedAt,
          privacy_accepted_at: acceptedAt
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ Failed to record terms acceptance:', updateError.message)
        return c.json(
          { error: 'Failed to record terms acceptance' },
          500
        )
      }

      return c.json({ success: true })
    } catch (error) {
      console.error('❌ Record terms acceptance exception:', error)
      return c.json(
        { error: 'Failed to record terms acceptance' },
        500
      )
    }
  })
}