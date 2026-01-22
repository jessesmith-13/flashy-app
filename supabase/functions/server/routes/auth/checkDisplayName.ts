import type { Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerCheckDisplayNameRoutes(app: Hono) {
  app.get('/auth/check-displayname/:displayName', async c => {
    try {
      const displayName = c.req.param('displayName')

      if (!displayName || displayName.trim().length === 0) {
        return c.json(
          { available: false, error: 'Display name cannot be empty' },
          400
        )
      }

      const normalizedName = displayName.trim().toLowerCase()

      // --------------------------------------------------
      // Query users table (indexed, service role)
      // --------------------------------------------------
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('display_name', normalizedName)
        .maybeSingle()

      if (error) {
        console.error('❌ Display name check failed:', error.message)
        return c.json(
          { available: false, error: 'Failed to check display name' },
          500
        )
      }

      return c.json({ available: !existingUser }, 200)
    } catch (error) {
      console.error('❌ Check display name exception:', error)
      return c.json(
        { available: false, error: 'Failed to check display name' },
        500
      )
    }
  })
}