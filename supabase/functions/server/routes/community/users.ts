import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'


export function registerCommunityUsersRoutes(app: Hono) {
  // Search for users who have published decks to the community
  app.get('/community/users/search', async (c: Context) => {
    try {
      const query = c.req.query('q')?.toLowerCase() || ''
      
      console.log(`🔍 Searching community users with query: "${query}"`)
      
      if (!query || query.length < 2) {
        console.log(`⚠️ Query too short, returning empty results`)
        return c.json({ users: [] })
      }

      // ============================================================
      // SCHEMA-CORRECT: Search users by name who have published decks
      // ============================================================

      // Get unique owner IDs from community_decks
      const { data: decks, error: decksError } = await supabase
        .from('community_decks')  // ← CORRECT TABLE
        .select('owner_id')
      
      if (decksError) {
        console.log(`❌ Error fetching community decks: ${decksError.message}`)
        return c.json({ error: 'Failed to search users' }, 500)
      }

      // Get unique owner IDs
      const uniqueOwnerIds = [...new Set((decks || []).map(d => d.owner_id))]
      
      if (uniqueOwnerIds.length === 0) {
        console.log(`⚠️ No community deck owners found`)
        return c.json({ users: [] })
      }

      // Search users by name or display_name
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, display_name, avatar_url')
        .in('id', uniqueOwnerIds)
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
      
      if (usersError) {
        console.log(`❌ Error searching users: ${usersError.message}`)
        return c.json({ error: 'Failed to search users' }, 500)
      }

      // Count decks for each user
      const authorsMap = new Map()
      for (const user of (users || [])) {
        const userDeckCount = decks.filter(d => d.owner_id === user.id).length
        authorsMap.set(user.id, {
          id: user.id,
          name: user.name,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          deckCount: userDeckCount
        })
      }
      
      // Convert to array and sort by deck count
      const usersArray = Array.from(authorsMap.values()).sort((a, b) => b.deckCount - a.deckCount)
      
      console.log(`✅ Found ${usersArray.length} community authors`)
      return c.json({ users: usersArray })
      
    } catch (error) {
      console.log(`❌ Search community users exception: ${error}`)
      return c.json({ error: 'Failed to search users' }, 500)
    }
  })
}