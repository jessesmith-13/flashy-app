import { Hono } from 'npm:hono@4'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import * as stripeService from './stripe'
import * as emailService from './emailService'
import { registerTicketRoutes } from './ticketRoutes'
// import pdfParse from 'npm:pdf-parse'
import { Context } from 'npm:hono@4'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

console.log('🚀 SERVER STARTING - SQL VERSION')

// Register ticket system routes
registerTicketRoutes(app)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const avatarBucket = Deno.env.get("AVATAR_BUCKET")!
const cardImagesBucket = Deno.env.get("CARD_IMAGES_BUCKET")!
const cardAudioBucket = Deno.env.get("CARD_AUDIO_BUCKET")!

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Convert snake_case to camelCase for API responses
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase)
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = toCamelCase(obj[key])
      return result
    }, {} as any)
  }
  
  return obj
}

// Convert camelCase to snake_case for database operations
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase)
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      result[snakeKey] = toSnakeCase(obj[key])
      return result
    }, {} as any)
  }
  
  return obj
}

// ============================================================
// AUTH ENDPOINTS
// ============================================================

// Sign up route
app.post('/auth/signup', async (c: Context) => {
  try {
    const { email, password, name } = await c.req.json()

    console.log(`📝 Sign up request - Email: ${email}, Name: ${name}`)

    // ------------------------------------------------------------
    // Basic validation
    // ------------------------------------------------------------
    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    if (password.length < 6) {
      return c.json(
        { error: 'Password must be at least 6 characters' },
        400
      )
    }

    const normalizedName = name.trim().toLowerCase()

    // ------------------------------------------------------------
    // STEP 1: Check display name uniqueness (SERVICE ROLE)
    // ------------------------------------------------------------
    const { data: existingUser, error: nameCheckError } =
      await supabase
        .from('users')
        .select('id')
        .ilike('display_name', normalizedName)
        .maybeSingle()

    if (nameCheckError) {
      console.error('❌ Display name check failed:', nameCheckError.message)
      return c.json({ error: 'Failed to validate display name' }, 500)
    }

    if (existingUser) {
      return c.json(
        { error: 'Display name is already taken' },
        400
      )
    }

    // ------------------------------------------------------------
    // STEP 2: Create Auth user
    // ------------------------------------------------------------
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          displayName: name
        }
      })

    if (authError || !authData?.user) {
      console.error('❌ Auth signup failed:', authError?.message)
      return c.json({ error: authError?.message || 'Signup failed' }, 400)
    }

    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)

    // ------------------------------------------------------------
    // STEP 3: Insert into public.users (SERVICE ROLE, bypass RLS)
    // ------------------------------------------------------------
    const now = new Date().toISOString()

    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        display_name: name,
        avatar_url: null,
        decks_public: false,
        subscription_tier: 'free',
        is_superuser: false,
        is_moderator: false,
        is_banned: false,
        is_reported: false,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        created_at: now,
        updated_at: now
      })

    if (dbError) {
      console.error('❌ Failed to create DB user:', dbError.message)

      // 🔥 Roll back auth user
      await supabase.auth.admin.deleteUser(userId)

      return c.json(
        { error: 'Failed to create user profile' },
        500
      )
    }

    console.log(`✅ User profile created in database: ${userId}`)

    // ------------------------------------------------------------
    // STEP 4: Send welcome email (non-blocking)
    // ------------------------------------------------------------
    emailService
      .sendWelcomeEmail(email, name)
      .catch(err =>
        console.error('⚠️ Failed to send welcome email:', err)
      )

    // ------------------------------------------------------------
    // DONE
    // ------------------------------------------------------------
    return c.json({
      user: {
        id: userId,
        email,
        name,
        displayName: name
      }
    })
  } catch (error) {
    console.error('❌ Sign up exception:', error)
    return c.json({ error: 'Sign up failed' }, 500)
  }
})

// Login route (for testing)
app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    console.log(`📝 Login request received - Email: ${email}`)
    
    if (!email || !password) {
      console.log('❌ Login error: Missing required fields')
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Use Supabase auth to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.log(`❌ Login error: ${error.message}`)
      return c.json({ error: error.message }, 400)
    }

    console.log(`✅ User logged in successfully: ${data.user.id}`)
    
    return c.json({ 
      session: data.session,
      user: data.user 
    })
  } catch (error) {
    console.log(`❌ Login exception: ${error}`)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Check if display name is available
app.get('/auth/check-displayname/:displayName', async (c: Context) => {
  try {
    const displayName = c.req.param('displayName')
    
    console.log(`🔍 Checking display name availability: ${displayName}`)
    
    if (!displayName || displayName.trim().length === 0) {
      console.log('❌ Display name is empty')
      return c.json({ available: false, error: 'Display name cannot be empty' })
    }

    // ============================================================
    // SQL VERSION: Query users table directly
    // ============================================================
    // Same pattern as signup - fast indexed query instead of fetching all users
    // ============================================================
    const normalizedName = displayName.trim().toLowerCase()

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .ilike('display_name', normalizedName) // Case-insensitive comparison
      .single()
    
    // PGRST116 = "not found" error (good - name is available!)
    const isAvailable = !existingUser && checkError?.code === 'PGRST116'
    
    console.log(`✅ Display name "${displayName}" is ${isAvailable ? 'available' : 'taken'}`)
    
    return c.json({ available: isAvailable })
  } catch (error) {
    console.log(`❌ Check display name exception: ${error}`)
    return c.json({ available: false, error: 'Failed to check display name' })
  }
})

// Record terms acceptance (for Google OAuth users)
app.post('/auth/terms/accept', async (c: Context) => {
  try {
    // ============================================================
    // STEP 1: Authentication (same as KV version)
    // ============================================================
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in record terms acceptance: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // STEP 2: Validate request body
    // ============================================================
    const { termsAcceptedAt } = await c.req.json()

    if (!termsAcceptedAt) {
      console.log('❌ Missing termsAcceptedAt')
      return c.json({ error: 'Missing termsAcceptedAt' }, 400)
    }

    console.log(`📝 Recording terms acceptance for user: ${user.id} at ${termsAcceptedAt}`)

    // ============================================================
    // STEP 3: Update database
    // ============================================================
    // SQL VERSION: Update users table directly (no auth metadata)
    // Sets both terms_accepted_at and privacy_accepted_at to same timestamp
    // ============================================================
    const { error: updateError } = await supabase
      .from('users')
      .update({
        terms_accepted_at: termsAcceptedAt,
        privacy_accepted_at: termsAcceptedAt, // Same timestamp for both
      })
      .eq('id', user.id)

    if (updateError) {
      console.log(`❌ Record terms acceptance error: ${updateError.message}`)
      return c.json({ error: updateError.message }, 400)
    }

    console.log(`✅ Terms acceptance recorded for user ${user.id} at ${termsAcceptedAt}`)
    console.log(`✅ Trigger 'on_user_updated' will auto-update updated_at timestamp`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log(`❌ Record terms acceptance exception: ${error}`)
    return c.json({ error: 'Failed to record terms acceptance' }, 500)
  }
})

// ============================================================
// USER ENDPOINTS
// ============================================================

// Update user profile
app.put('/users/:userId/profile', async (c: Context) => {
  try {
    // ============================================================
    // STEP 1: Authentication (same as KV version)
    // ============================================================
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in update profile: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`📝 Updating profile for user: ${user.id}`)

    const { displayName, avatarUrl, decksPublic, subscriptionTier, subscriptionExpiry, isSuperuser, isModerator } = await c.req.json()
    
    // ============================================================
    // STEP 2: Build update object for database
    // ============================================================
    // SQL VERSION: Update the users table directly
    // No more KV store or user_metadata updates
    // ============================================================
    const updates: any = {}
    
    if (displayName !== undefined) {
      console.log(`  → Updating display_name: ${displayName}`)
      updates.display_name = displayName
    }
    if (avatarUrl !== undefined) {
      console.log(`  → Updating avatar_url: ${avatarUrl}`)
      updates.avatar_url = avatarUrl
    }
    if (decksPublic !== undefined) {
      console.log(`  → Updating decks_public: ${decksPublic}`)
      updates.decks_public = decksPublic
    }
    if (subscriptionTier !== undefined) {
      console.log(`  → Updating subscription_tier: ${subscriptionTier}`)
      updates.subscription_tier = subscriptionTier
    }
    if (subscriptionExpiry !== undefined) {
      console.log(`  → Updating subscription_expiry: ${subscriptionExpiry}`)
      updates.subscription_expiry = subscriptionExpiry
    }
    
    // ============================================================
    // STEP 3: Handle special permissions
    // ============================================================
    // isSuperuser should ONLY be set via SQL by admins
    // isModerator can be set via API
    // ============================================================
    if (isSuperuser !== undefined) {
      console.log(`⚠️  Attempt to set isSuperuser=${isSuperuser} via API by ${user.email}`)
      console.log(`⚠️  This should be done via SQL - ignoring request`)
      // Silently ignore - don't update it via API for security
    }
    
    if (isModerator !== undefined) {
      console.log(`🔐 Setting is_moderator=${isModerator} for ${user.email}`)
      updates.is_moderator = isModerator
    }

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      console.log('⚠️  No updates provided')
      // Still fetch and return current user data
      const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      return c.json({ user: toCamelCase(currentUser) })
    }

    // ============================================================
    // STEP 4: Update the database
    // ============================================================
    // SQL VERSION: UPDATE query on users table
    // The trigger 'on_user_updated' will auto-update updated_at
    // ============================================================
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.log(`❌ Update profile error: ${updateError.message}`)
      return c.json({ error: updateError.message }, 400)
    }

    console.log(`✅ Profile updated successfully for user: ${user.id}`)
    console.log(`✅ Trigger 'on_user_updated' will auto-update updated_at timestamp`)

    // ============================================================
    // STEP 5: (Optional) Update auth user_metadata for compatibility
    // ============================================================
    // Keep displayName and avatarUrl in sync with auth metadata
    // This ensures backward compatibility if anything still reads user_metadata
    // ============================================================
    if (displayName !== undefined || avatarUrl !== undefined) {
      const metadataUpdates: any = {}
      if (displayName !== undefined) metadataUpdates.displayName = displayName
      if (avatarUrl !== undefined) metadataUpdates.avatarUrl = avatarUrl
      
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          ...metadataUpdates,
        },
      }).catch(err => {
        console.error('⚠️  Failed to sync auth metadata (non-critical):', err)
      })
      
      console.log(`✅ Synced displayName/avatarUrl to auth metadata for compatibility`)
    }

    // ============================================================
    // STEP 6: Return updated user data
    // ============================================================
    // Convert snake_case to camelCase for API response
    // ============================================================
    return c.json({ user: toCamelCase(updatedUser) })
    
  } catch (error) {
    console.log(`❌ Update profile exception: ${error}`)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Get user profile by ID
app.get('/users/:userId/profile', async (c: Context) => {
  try {
    const userId = c.req.param('userId')
    
    console.log(`👤 Fetching public profile for user: ${userId}`)

    // ============================================================
    // STEP 1: Get user profile from database
    // ============================================================
    // SQL VERSION: Query users table for all profile fields
    // No more relying on auth.user_metadata
    // ============================================================
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, decks_public, subscription_tier, subscription_expiry, is_banned, is_moderator')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.log(`❌ Get user profile error: ${userError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    console.log(`✅ User found: ${user.display_name}`)

    // ============================================================
    // STEP 2: Get user's achievements
    // ============================================================
    // SQL VERSION: Query user_achievements table
    // Returns array of achievement IDs that the user has unlocked
    // ============================================================
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const achievements = achievementsData?.map(a => a.achievement_id) || []
    console.log(`✅ User achievements (${achievements.length}):`, achievements)

    // ============================================================
    // STEP 3: Get user's decks if public
    // ============================================================
    // SQL VERSION: Query decks table filtered by user_id
    // Only include if decksPublic is true
    // Sort by position for consistent ordering
    // ============================================================
    let decks: any[] = []
    
    if (user.decks_public) {
      console.log(`📚 Fetching public decks for user: ${userId}`)
      
      const { data: decksData, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })

      if (decksError) {
        console.log(`⚠️  Error fetching decks: ${decksError.message}`)
      } else {
        decks = decksData || []
        console.log(`✅ Fetched ${decks.length} public decks`)
      }
    } else {
      console.log(`🔒 User decks are private`)
    }

    // ============================================================
    // STEP 4: Return user profile with camelCase conversion
    // ============================================================
    return c.json({ 
      user: {
        id: user.id,
        displayName: user.display_name,
        name: user.display_name, // Use display_name for 'name' field for consistency
        avatarUrl: user.avatar_url,
        decksPublic: user.decks_public,
        subscriptionTier: user.subscription_tier || 'free',
        subscriptionExpiry: user.subscription_expiry,
        isBanned: user.is_banned || false,
        isModerator: user.is_moderator || false,
        achievements: achievements,
        decks: toCamelCase(decks),
      }
    })
  } catch (error) {
    console.log(`❌ Get user profile exception: ${error}`)
    return c.json({ error: 'Failed to get user profile' }, 500)
  }
})

// Get user's friends list
app.get('/users/:userId/friends', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Get user friends: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get user friends: ${authError?.message || 'No user found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const targetUserId = c.req.param('userId')
    
    console.log(`👥 Getting friends for user ${targetUserId}`)

    // ============================================================
    // SQL VERSION: Query friendships table with JOIN
    // ============================================================
    // Get accepted friendships in both directions:
    // 1. Where user is user_id and friend is friend_id
    // 2. Where user is friend_id and friend is user_id
    // Use UNION to combine both directions
    // ============================================================
    
    // Get friends where user is user_id
    const { data: friendsAsUser, error: error1 } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        users!friendships_friend_id_fkey (
          id,
          email,
          display_name,
          avatar_url,
          decks_public
        )
      `)
      .eq('user_id', targetUserId)
      .eq('status', 'accepted')

    // Get friends where user is friend_id
    const { data: friendsAsFriend, error: error2 } = await supabase
      .from('friendships')
      .select(`
        user_id,
        users!friendships_user_id_fkey (
          id,
          email,
          display_name,
          avatar_url,
          decks_public
        )
      `)
      .eq('friend_id', targetUserId)
      .eq('status', 'accepted')

    if (error1 || error2) {
      console.log(`❌ Get friends error: ${error1?.message || error2?.message}`)
      return c.json({ error: 'Failed to get friends' }, 500)
    }

    // Combine and format friends from both directions
    const friendsDetails: any[] = []
    
    // Add friends where user is user_id
    if (friendsAsUser) {
      for (const item of friendsAsUser) {
        const friendData = Array.isArray(item.users) ? item.users[0] : item.users
        if (friendData) {
          friendsDetails.push({
            id: friendData.id,
            email: friendData.email,
            name: friendData.display_name,
            displayName: friendData.display_name,
            avatarUrl: friendData.avatar_url,
            decksPublic: friendData.decks_public ?? true,
          })
        }
      }
    }
    
    // Add friends where user is friend_id
    if (friendsAsFriend) {
      for (const item of friendsAsFriend) {
        const friendData = Array.isArray(item.users) ? item.users[0] : item.users
        if (friendData) {
          friendsDetails.push({
            id: friendData.id,
            email: friendData.email,
            name: friendData.display_name,
            displayName: friendData.display_name,
            avatarUrl: friendData.avatar_url,
            decksPublic: friendData.decks_public ?? true,
          })
        }
      }
    }

    console.log(`✅ Returning ${friendsDetails.length} friends for user ${targetUserId}`)

    return c.json({ 
      friends: friendsDetails,
    })
  } catch (error) {
    console.log(`❌ Get user friends exception: ${error}`)
    return c.json({ error: 'Failed to get user friends' }, 500)
  }
})

// Get a specific user's deck (read-only access)
app.get('/users/:userId/decks/:deckId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get user deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const targetUserId = c.req.param('userId')
    const deckId = c.req.param('deckId')
    
    console.log(`📚 Getting deck ${deckId} for user ${targetUserId}`)

    // ============================================================
    // SQL VERSION: Query users table for privacy check
    // ============================================================
    // Get the target user to check if their decks are public
    const { data: targetUser, error: getUserError } = await supabase
      .from('users')
      .select('id, decks_public')
      .eq('id', targetUserId)
      .single()
    
    if (getUserError || !targetUser) {
      console.log(`❌ Target user not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if decks are public (unless viewing own deck)
    const decksPublic = targetUser.decks_public !== false
    if (!decksPublic && user.id !== targetUserId) {
      console.log(`🔒 User ${targetUserId} decks are private, denying access to ${user.id}`)
      return c.json({ error: 'This user\'s decks are private' }, 403)
    }

    // ============================================================
    // SQL VERSION: Query decks table
    // ============================================================
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('id', deckId)
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Deck not found: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    console.log(`✅ Deck found: ${deck.name}`)

    // ============================================================
    // SQL VERSION: Query cards table
    // ============================================================
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
    
    if (cardsError) {
      console.log(`⚠️  Error fetching cards: ${cardsError.message}`)
    }

    console.log(`✅ Fetched ${cards?.length || 0} cards for deck ${deckId}`)
    
    return c.json({ 
      deck: toCamelCase(deck),
      cards: toCamelCase(cards || []),
      isOwner: user.id === targetUserId
    })
  } catch (error) {
    console.log(`❌ Get user deck exception: ${error}`)
    return c.json({ error: 'Failed to get deck' }, 500)
  }
})

// Fix invalid "premium" subscription tier (migration endpoint)
app.post('/users/fix-subscription-tier', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Fix subscription tier: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Fix subscription tier authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint does not use KV store - only checks and updates
    // user metadata in Supabase Auth
    // 
    // This is a MIGRATION endpoint to fix legacy "premium" tier values
    // Valid tiers: free, monthly, annual, lifetime
    // Invalid tier: "premium" (should be one of the valid tiers)
    // 
    // Only change: Semantic routing (/make-server-8a1502a9/fix-subscription-tier → /users/fix-subscription-tier)
    // ============================================================

    const currentTier = user.user_metadata?.subscriptionTier
    
    console.log(`🔧 Checking subscription tier for user ${user.id}`)
    console.log(`   Current tier: ${currentTier || 'undefined'}`)
    console.log(`   Is moderator: ${user.user_metadata?.isModerator || false}`)
    console.log(`   Is superuser: ${user.user_metadata?.isSuperuser || false}`)
    
    // If tier is the invalid "premium" value, fix it
    if (currentTier === 'premium') {
      console.log(`⚠️  Found invalid subscription tier: "premium"`)
      console.log(`   Fixing user ${user.id}: "premium" -> "free"`)
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          subscriptionTier: 'free'
        }
      })

      if (updateError) {
        console.log(`❌ Fix subscription tier error: ${updateError.message}`)
        return c.json({ error: 'Failed to fix subscription tier' }, 500)
      }

      console.log(`✅ Subscription tier fixed successfully`)

      // Check if user still has premium access through staff roles
      const hasPremiumAccess = user.user_metadata?.isModerator || user.user_metadata?.isSuperuser
      
      return c.json({ 
        success: true, 
        message: 'Subscription tier fixed',
        oldTier: 'premium',
        newTier: 'free',
        hasPremiumAccess,
        note: hasPremiumAccess 
          ? 'You still have premium features through your moderator/superuser role'
          : 'Your subscription tier has been reset to free. Upgrade to premium for advanced features.'
      })
    }

    console.log(`✅ No fix needed - subscription tier is valid`)

    return c.json({ 
      success: true, 
      message: 'No fix needed',
      currentTier: currentTier || 'free'
    })

  } catch (error) {
    console.log(`❌ Fix subscription tier error: ${error}`)
    console.error('Fix subscription tier error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to fix subscription tier' }, 500)
  }
})

// ============================================================
// STORAGE ENDPOINTS
// ============================================================

// Initialize storage buckets for avatars, card images, and card audio
const initializeStorage = async () => {
  // Determine environment prefix
  const ENV_PREFIX =
    process.env.NODE_ENV === "production"
      ? ""
      : process.env.NODE_ENV === "test"
      ? "test-"
      : "dev-";

  try {
    const buckets = [
      { name: `${ENV_PREFIX}avatars`, sizeLimit: 5242880 }, // 5MB
      { name: `${ENV_PREFIX}card-images`, sizeLimit: 5242880 }, // 5MB
      { name: `${ENV_PREFIX}card-audio`, sizeLimit: 10485760 }, // 10MB for audio
    ]
    const { data: existingBuckets } = await supabase.storage.listBuckets()
    
    for (const bucket of buckets) {
      const bucketExists = existingBuckets?.some(b => b.name === bucket.name)
      
      if (!bucketExists) {
        console.log(`Creating ${bucket.name} bucket...`)
        await supabase.storage.createBucket(bucket.name, {
          public: true,
          fileSizeLimit: bucket.sizeLimit,
        })
        console.log(`${bucket.name} bucket created successfully`)
      }
    }
  } catch (error) {
    console.log(`Storage initialization error: ${error}`)
  }
}

// Initialize storage on startup
initializeStorage()

// Upload avatar image
app.post('/storage/avatar', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in upload avatar: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only images are allowed.' }, 400)
    }

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400)
    }

    const bucketName = avatarBucket
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.log(`Upload error: ${uploadError.message}`)
      return c.json({ error: uploadError.message }, 400)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log(`Avatar uploaded successfully: ${publicUrl}`)
    return c.json({ url: publicUrl })
  } catch (error) {
    console.log(`Upload avatar exception: ${error}`)
    return c.json({ error: 'Failed to upload avatar' }, 500)
  }
})

// Upload card image
app.post('/storage/card-image', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in upload card image: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only images are allowed.' }, 400)
    }

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400)
    }

    const bucketName = cardImagesBucket;
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.log(`Upload error: ${uploadError.message}`)
      return c.json({ error: uploadError.message }, 400)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log(`Card image uploaded successfully: ${publicUrl}`)
    return c.json({ url: publicUrl })
  } catch (error) {
    console.log(`Upload card image exception: ${error}`)
    return c.json({ error: 'Failed to upload card image' }, 500)
  }
})

// Upload card audio
app.post('/storage/card-audio', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in upload card audio: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type - support mp3, wav, m4a, ogg
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm']
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return c.json({ error: 'Invalid file type. Only .mp3, .wav, .m4a, and .ogg audio files are allowed.' }, 400)
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400)
    }

    const bucketName = cardAudioBucket;
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.log(`Upload error: ${uploadError.message}`)
      return c.json({ error: uploadError.message }, 400)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log(`Card audio uploaded successfully: ${publicUrl}`)
    return c.json({ url: publicUrl })
  } catch (error) {
    console.log(`Upload card audio exception: ${error}`)
    return c.json({ error: 'Failed to upload card audio' }, 500)
  }
})


// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// Update user role (make/remove moderator) (Superuser only)
app.post('/admin/users/:userId/moderator', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Update user role: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can update user roles' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const body = await c.req.json()
    const { isModerator } = body

    console.log(`🔧 Updating user ${targetUserId} moderator status to ${isModerator}`)
    console.log(`📦 Request body:`, body)
    
    if (typeof isModerator !== 'boolean') {
      console.log(`❌ Invalid isModerator value: ${isModerator}`)
      return c.json({ error: 'isModerator must be a boolean value' }, 400)
    }
    
    // Check target user exists and is not a superuser
    const { data: targetDbData, error: targetError } = await supabase
      .from('users')
      .select('is_superuser, is_moderator')
      .eq('id', targetUserId)
      .single()
    
    if (targetError || !targetDbData) {
      console.log(`❌ User not found: ${targetError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }
    
    if (targetDbData.is_superuser === true) {
      console.log(`❌ Cannot modify superuser roles`)
      return c.json({ error: 'Cannot modify superuser roles' }, 403)
    }

    // Update user moderator status in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_moderator: isModerator })
      .eq('id', targetUserId)

    if (updateError) {
      console.log(`❌ Update user role error: ${updateError.message}`)
      return c.json({ error: 'Failed to update user role' }, 500)
    }

    console.log(`✅ User ${targetUserId} moderator status set to ${isModerator} by ${user.email}`)
    
    // Send notification to the user
    try {
      // Get admin user's display name from database
      const { data: adminUser } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: isModerator ? 'moderator_promoted' : 'moderator_removed',
          message: isModerator 
            ? 'You have been promoted to moderator! You now have moderation privileges.'
            : 'You have been removed from the moderator role. Your moderation privileges have been revoked.',
          related_user_id: user.id,
          requester_display_name: adminUser?.display_name || user.email || 'Admin',
          requester_avatar: adminUser?.avatar_url || null,
          is_read: false
        })
      
      if (notifError) {
        console.log(`⚠️ Failed to send moderator notification: ${notifError.message}`)
        // Don't fail the whole operation if notification fails
      } else {
        console.log(`✅ Notification sent to user ${targetUserId} for moderator ${isModerator ? 'promotion' : 'removal'}`)
      }
    } catch (notificationError) {
      console.error(`⚠️ Failed to send moderator notification: ${notificationError}`)
      // Don't fail the whole operation if notification fails
    }
    
    return c.json({ success: true, message: `User ${isModerator ? 'promoted to' : 'removed from'} moderator` })
  } catch (error) {
    console.log(`❌ Update user role exception: ${error}`)
    return c.json({ error: 'Failed to update user role' }, 500)
  }
})

// Get all users (Superuser only)
app.get('/admin/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Get users: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can view all users' }, 403)
    }

    console.log(`👥 Fetching all users for superuser ${user.id}`)
    
    // ============================================================
    // DATABASE VERSION: Fetch all users from users table
    // ============================================================
    
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, is_superuser, is_moderator, subscription_tier, subscription_expiry, subscription_cancelled_at_period_end, is_banned, banned_reason, banned_at, banned_by, created_at, last_sign_in_at')
      .order('created_at', { ascending: false })
    
    if (listError) {
      console.log(`❌ List users error: ${listError.message}`)
      return c.json({ error: 'Failed to fetch users' }, 500)
    }

    // Format user data with consistent naming
    const formattedUsers = (allUsers || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name || 'Anonymous',
      avatarUrl: u.avatar_url || null,
      isSuperuser: u.is_superuser === true,
      isModerator: u.is_moderator === true,
      subscriptionTier: u.subscription_tier || 'free',
      subscriptionExpiry: u.subscription_expiry || null,
      subscriptionCancelledAtPeriodEnd: u.subscription_cancelled_at_period_end === true,
      isBanned: u.is_banned === true,
      bannedReason: u.banned_reason || null,
      bannedAt: u.banned_at || null,
      bannedBy: u.banned_by || null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at
    }))

    console.log(`✅ Found ${formattedUsers.length} users`)
    
    return c.json({ users: formattedUsers })
  } catch (error) {
    console.log(`❌ Get users exception: ${error}`)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Ban/unban user (Superuser only)
app.post('/admin/users/:userId/ban', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Ban user: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can ban users' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { isBanned, reason } = await c.req.json()

    if (isBanned && (!reason || reason.trim().length === 0)) {
      console.log('❌ Ban reason is required')
      return c.json({ error: 'Ban reason is required' }, 400)
    }

    console.log(`🔨 ${isBanned ? 'Banning' : 'Unbanning'} user ${targetUserId}`)
    
    // ============================================================
    // DATABASE VERSION: Check target user and update ban status
    // ============================================================
    
    // Get target user from database
    const { data: targetUserData, error: getUserError } = await supabase
      .from('users')
      .select('id, email, is_superuser, display_name, avatar_url')
      .eq('id', targetUserId)
      .single()
    
    if (getUserError || !targetUserData) {
      console.log(`❌ User not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    // Don't allow banning superusers
    if (targetUserData.is_superuser === true) {
      console.log(`❌ Cannot ban superusers`)
      return c.json({ error: 'Cannot ban superusers' }, 403)
    }

    // Get admin user's display info from database
    const { data: adminUser } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()

    const now = new Date().toISOString()
    
    // Update ban status in database
    const updateData: any = {
      is_banned: isBanned,
      updated_at: now
    }

    if (isBanned) {
      updateData.banned_reason = reason.trim()
      updateData.banned_at = now
      updateData.banned_by = user.id
    } else {
      updateData.banned_reason = null
      updateData.banned_at = null
      updateData.banned_by = null
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', targetUserId)

    if (updateError) {
      console.log(`❌ Ban user error: ${updateError.message}`)
      return c.json({ error: 'Failed to update ban status' }, 500)
    }

    // If banning, sign out the user by deleting all their sessions
    if (isBanned) {
      try {
        await supabase.auth.admin.signOut(targetUserId)
        console.log(`🚪 Signed out banned user ${targetUserId}`)
      } catch (signOutError) {
        console.log(`⚠️ Failed to sign out banned user: ${signOutError}`)
        // Don't fail the ban if sign out fails
      }
    }

    // ============================================================
    // Send in-app notification to the user
    // ============================================================
    
    try {
      const notificationData: any = {
        user_id: targetUserId,
        is_read: false,
        related_user_id: user.id,
        requester_display_name: adminUser?.display_name || user.email || 'Superuser',
        requester_avatar: adminUser?.avatar_url || null
      }
      
      if (isBanned) {
        notificationData.type = 'account_banned'
        notificationData.message = `Your account has been banned. Reason: ${reason.trim()}`
      } else {
        notificationData.type = 'account_unbanned'
        notificationData.message = 'Your account has been unbanned'
      }
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notificationData)
      
      if (notifError) {
        console.log(`⚠️ Failed to send in-app notification: ${notifError.message}`)
      } else {
        console.log(`✅ In-app notification sent to user ${targetUserId}`)
      }
    } catch (notificationError) {
      console.error(`⚠️ Failed to send in-app notification: ${notificationError}`)
    }

    // ============================================================
    // Send email notification if user is being banned
    // ============================================================
    
    if (isBanned && targetUserData.email) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        
        if (!resendApiKey) {
          console.log('⚠️ RESEND_API_KEY not configured - email sending disabled')
        } else {
          const adminName = adminUser?.display_name || 'Flashy Support'
          
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Flashy <noreply@flashy.app>',
              to: targetUserData.email,
              subject: '⚠️ Your Flashy Account Has Been Suspended',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #F9FAFB; }
                    .email-container { background: white; margin: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .header { background: #DC2626; color: white; padding: 40px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .content p { line-height: 1.6; color: #374151; margin: 16px 0; }
                    .warning-box { 
                      background: #FEF2F2; 
                      border-left: 4px solid #DC2626;
                      padding: 16px 20px; 
                      border-radius: 4px;
                      margin: 20px 0;
                    }
                    .warning-box strong { color: #DC2626; }
                    .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
                    .footer a { color: #4F46E5; text-decoration: none; }
                  </style>
                </head>
                <body>
                  <div class="email-container">
                    <div class="header">
                      <h1>⚠️ Account Suspended</h1>
                    </div>
                    
                    <div class="content">
                      <p>Hello ${targetUserData.display_name || 'there'},</p>
                      
                      <p>Your Flashy account has been suspended by our moderation team.</p>
                      
                      <div class="warning-box">
                        <strong>Reason for suspension:</strong><br>
                        ${reason.trim()}
                      </div>
                      
                      <p>While your account is suspended, you will not be able to:</p>
                      <ul>
                        <li>Access your decks and cards</li>
                        <li>Publish or interact with community content</li>
                        <li>Use any Flashy features</li>
                      </ul>
                      
                      <p>If you believe this suspension was made in error or would like to appeal this decision, please contact our support team.</p>
                      
                      <p>Best regards,<br><strong>${adminName}</strong><br>Flashy Team</p>
                    </div>
                    
                    <div class="footer">
                      <p>This is an automated notification from Flashy.</p>
                      <p><a href="mailto:support@flashy.app">Contact Support</a></p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            }),
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.log(`❌ Failed to send ban email: ${emailResponse.status} - ${errorText}`)
          } else {
            const emailData = await emailResponse.json()
            console.log(`✅ Ban notification email sent to ${targetUserData.email}`)
            console.log(`   Resend ID: ${emailData.id}`)
          }
        }
      } catch (emailError) {
        console.error(`⚠️ Failed to send ban email: ${emailError}`)
        // Don't fail the whole operation if email fails
      }
    }

    console.log(`✅ User ${targetUserId} ${isBanned ? 'banned' : 'unbanned'} by ${user.email}. Reason: ${reason || 'N/A'}`)
    
    return c.json({ success: true, message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` })
  } catch (error) {
    console.log(`❌ Ban user exception: ${error}`)
    return c.json({ error: 'Failed to update ban status' }, 500)
  }
})

// Manual premium upgrade (Superuser only)
app.post('/admin/users/:userId/premium', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Manual premium: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can manually grant premium' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { reason, customReason, tier } = await c.req.json()

    if (!reason || reason.trim().length === 0) {
      console.log('❌ Reason is required')
      return c.json({ error: 'Reason is required' }, 400)
    }

    if (!tier || !['monthly', 'annual', 'lifetime'].includes(tier)) {
      console.log('❌ Valid tier is required')
      return c.json({ error: 'Valid tier is required (monthly, annual, or lifetime)' }, 400)
    }

    console.log(`🎁 Manually upgrading user ${targetUserId} to ${tier} premium`)
    
    // ============================================================
    // DATABASE VERSION: Update subscription in users and subscriptions tables
    // ============================================================
    
    // Get the target user from database - they MUST exist in the users table
    const { data: targetUserData, error: getUserError } = await supabase
      .from('users')
      .select('id, email, is_superuser, display_name, avatar_url, subscription_tier')
      .eq('id', targetUserId)
      .single()
    
    if (getUserError || !targetUserData) {
      console.log(`❌ User not found in database: ${getUserError?.message}`)
      return c.json({ 
        error: 'User not found in database. They must sign up and complete profile first.' 
      }, 404)
    }

    // Don't allow changing superuser subscriptions
    if (targetUserData.is_superuser === true) {
      console.log(`❌ Cannot modify superuser subscriptions`)
      return c.json({ error: 'Cannot modify superuser subscriptions' }, 403)
    }

    // Get admin user info from database
    const { data: adminUser } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single()

    const now = new Date()
    
    // Calculate expiry/period dates based on tier
    let subscriptionExpiry = null
    let currentPeriodStart = now.toISOString()
    let currentPeriodEnd = null
    let expiresAt = null
    
    if (tier === 'monthly') {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 1)
      subscriptionExpiry = expiryDate.toISOString()
      currentPeriodEnd = expiryDate.toISOString()
      expiresAt = expiryDate.toISOString()
    } else if (tier === 'annual') {
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      subscriptionExpiry = expiryDate.toISOString()
      currentPeriodEnd = expiryDate.toISOString()
      expiresAt = expiryDate.toISOString()
    } else if (tier === 'lifetime') {
      // Lifetime has no expiry
      subscriptionExpiry = null
      currentPeriodEnd = null
      expiresAt = null
    }

    // Update users table subscription
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_expiry: subscriptionExpiry,
        subscription_cancelled_at_period_end: false,
        updated_at: now.toISOString()
      })
      .eq('id', targetUserId)

    if (updateUserError) {
      console.log(`❌ Failed to upsert users table: ${updateUserError.message}`)
      console.log(`❌ Full error details:`, JSON.stringify(updateUserError, null, 2))
      return c.json({ error: 'Failed to grant premium', details: updateUserError.message }, 500)
    }

    // Upsert subscriptions table
    const { error: upsertSubError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: targetUserId,
        tier: tier,
        status: 'active',
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        expires_at: expiresAt,
        is_manual: true,
        is_lifetime: tier === 'lifetime',
        source: 'admin',
        notes: `Manual upgrade by ${adminUser?.display_name || adminUser?.email || 'superuser'}. Reason: ${customReason || reason}`,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertSubError) {
      console.log(`⚠️ Failed to update subscriptions table: ${upsertSubError.message}`)
      // Don't fail the whole operation if subscriptions table update fails
    } else {
      console.log(`✅ Subscriptions table updated for user ${targetUserId}`)
    }

    // ============================================================
    // Send notification to the user
    // ============================================================
    
    try {
      const tierDisplay = tier === 'monthly' ? 'monthly premium' : tier === 'annual' ? 'annual premium' : 'lifetime premium'
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'premium_granted',
          message: `You have been granted ${tierDisplay} access!`,
          is_read: false,
          related_user_id: user.id,
          requester_display_name: adminUser?.display_name || 'Flashy Team',
          requester_avatar: null
        })
      
      if (notifError) {
        console.log(`⚠️ Failed to send premium notification: ${notifError.message}`)
      } else {
        console.log(`✅ Notification sent to user ${targetUserId} for premium grant`)
      }
    } catch (notificationError) {
      console.error(`⚠️ Failed to send premium notification: ${notificationError}`)
    }

    const finalReason = customReason || reason
    console.log(`✅ User ${targetUserId} (${targetUserData.email}) manually upgraded to ${tier} premium by ${user.email}. Reason: ${finalReason}`)
    
    return c.json({ success: true, message: 'Premium access granted successfully' })
  } catch (error) {
    console.log(`❌ Manual premium upgrade exception: ${error}`)
    return c.json({ error: 'Failed to grant premium' }, 500)
  }
})

// Demote premium to free (Superuser only)
app.post('/admin/users/:userId/demote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Demote user: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can demote users' }, 403)
    }

    const targetUserId = c.req.param('userId')

    console.log(`📉 Demoting user ${targetUserId} to free tier`)
    
    // ============================================================
    // DATABASE VERSION: Update subscription to free tier
    // ============================================================
    
    // Get the target user from database - they MUST exist in the users table
    const { data: targetUserData, error: getUserError } = await supabase
      .from('users')
      .select('id, email, is_superuser, is_moderator, display_name, avatar_url, subscription_tier')
      .eq('id', targetUserId)
      .single()
    
    if (getUserError || !targetUserData) {
      console.log(`❌ User not found in database: ${getUserError?.message}`)
      return c.json({ 
        error: 'User not found in database. They must sign up and complete profile first.' 
      }, 404)
    }

    // Don't allow changing superuser subscriptions
    if (targetUserData.is_superuser === true) {
      console.log(`❌ Cannot modify superuser subscriptions`)
      return c.json({ error: 'Cannot modify superuser subscriptions' }, 403)
    }

    // Don't allow demoting moderators (they need premium for their role)
    if (targetUserData.is_moderator === true) {
      console.log(`❌ Cannot demote moderators`)
      return c.json({ error: 'Cannot demote moderators. Remove moderator role first.' }, 403)
    }

    const previousTier = targetUserData.subscription_tier || 'free'
    const now = new Date()

    // Update users table to free tier
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'free',
        subscription_expiry: null,
        subscription_cancelled_at_period_end: false,
        updated_at: now.toISOString()
      })
      .eq('id', targetUserId)

    if (updateUserError) {
      console.log(`❌ Failed to update users table: ${updateUserError.message}`)
      return c.json({ error: 'Failed to demote user' }, 500)
    }

    // Update subscriptions table
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', targetUserId)

    if (updateSubError) {
      console.log(`⚠️ Failed to update subscriptions table: ${updateSubError.message}`)
      // Don't fail the whole operation if subscriptions table update fails
    } else {
      console.log(`✅ Subscriptions table updated for user ${targetUserId}`)
    }

    // Get admin user info from database for notifications
    const { data: adminUser } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single()
    
    console.log(`📝 User demoted: ${targetUserData.email} from ${previousTier} to free by ${adminUser?.email || 'superuser'}`)

    // ============================================================
    // DATABASE VERSION: Send notification to the user
    // ============================================================
    
    try {
      const notificationId = crypto.randomUUID()
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: targetUserId,
          type: 'premium_revoked',
          message: 'Your premium access has been revoked',
          related_user_id: user.id,
          requester_display_name: adminUser?.display_name || 'Flashy Team',
          requester_avatar: null,
          created_at: now.toISOString(),
          is_read: false,
          is_seen: false
        })
      
      if (notifError) {
        console.log(`⚠️ Failed to send demotion notification: ${notifError.message}`)
        // Don't fail the whole operation if notification fails
      } else {
        console.log(`✅ Notification sent to user ${targetUserId} for premium revocation`)
      }
    } catch (notificationError) {
      console.error(`⚠️ Failed to send demotion notification: ${notificationError}`)
      // Don't fail the whole operation if notification fails
    }

    console.log(`✅ User ${targetUserId} (${targetUserData.email}) demoted to free tier by ${adminUser?.email || 'superuser'}`)
    
    return c.json({ success: true, message: 'User demoted to free tier' })
  } catch (error) {
    console.log(`❌ Manual demotion exception: ${error}`)
    return c.json({ error: 'Failed to demote user' }, 500)
  }
})

// Get user activity history (Superuser only)
app.get('/admin/users/:userId/activity', async (c) => {
  try {
    console.log('=== 📊 GET USER ACTIVITY START ===')
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`✅ Authenticated user: ${user.email}`)

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ User activity: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can view user activity' }, 403)
    }

    const userIdOrQuery = c.req.param('userId')
    console.log(`🔍 Searching for user: ${userIdOrQuery}`)
    
    // ============================================================
    // DATABASE VERSION: Search for target user in users table
    // ============================================================
    
    // Try to get user by ID first (if it looks like a UUID)
    let targetUser = null
    
    // Check if the input looks like a UUID (36 characters with dashes)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrQuery)
    
    if (isUUID) {
      console.log('🆔 Input appears to be a UUID, searching by ID...')
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userIdOrQuery)
        .single()
      
      if (!error && data) {
        targetUser = data
        console.log(`✅ Found user by ID: ${targetUser.email}`)
      }
    }
    
    // If not found by ID or not a UUID, search by email or name
    if (!targetUser) {
      console.log('🔍 User not found by ID (or not a UUID), searching by email/name...')
      const { data: users, error: listError } = await supabase
        .from('users')
        .select('*')
      
      if (listError) {
        console.log(`❌ Failed to list users: ${listError.message}`)
        return c.json({ error: 'Failed to search users' }, 500)
      }
      
      console.log(`📋 Total users in system: ${users?.length || 0}`)
      
      // Search by email or display name
      const foundUser = users?.find((u: any) => 
        u.email?.toLowerCase().includes(userIdOrQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(userIdOrQuery.toLowerCase())
      )
      
      if (!foundUser) {
        console.log('❌ User not found in search')
        return c.json({ error: 'User not found. Try searching by exact user ID, email, or name.' }, 404)
      }
      
      console.log(`✅ Found user: ${foundUser.email}`)
      targetUser = foundUser
    }
    
    const targetUserId = targetUser.id
    const userName = targetUser.display_name || 'Unknown User'
    
    console.log(`🎯 Target user ID: ${targetUserId}`)
    console.log(`👤 Target user name: ${userName}`)

    const activity = []

    // ============================================================
    // SQL VERSION: Get flags submitted BY this user
    // ============================================================
    
    console.log('🚩 Fetching flags submitted BY user...')
    const { data: flagsByUser, error: flagsByUserError } = await supabase
      .from('flags')
      .select('*')
      .eq('reporter_id', targetUserId)
      .order('created_at', { ascending: false })
    
    if (flagsByUserError) {
      console.log(`⚠️ Error fetching flags by user: ${flagsByUserError.message}`)
    } else {
      console.log(`✅ Flags submitted by user: ${flagsByUser?.length || 0}`)
      
      for (const flag of flagsByUser || []) {
        activity.push({
          id: flag.id,
          type: 'flag_submitted',
          timestamp: flag.created_at,
          userName: userName,
          userId: targetUserId,
          details: {
            targetType: flag.target_type,
            targetId: flag.target_id,
            reason: flag.reason,
            notes: flag.notes,
            status: flag.status
          }
        })
      }
    }

    // ============================================================
    // SQL VERSION: Get flags submitted AGAINST this user's content
    // Complex JOINs to match flags with content ownership
    // ============================================================
    
    console.log('🎯 Fetching flags submitted AGAINST user content...')
    
    // Flags against user's DECKS - manual lookup without JOIN
    const { data: allDeckFlags, error: flagsDecksError } = await supabase
      .from('flags')
      .select('*')
      .eq('target_type', 'deck')
    
    if (flagsDecksError) {
      console.log(`⚠️ Error fetching flags against decks: ${flagsDecksError.message}`)
    } else {
      console.log(`🔍 Checking ${allDeckFlags?.length || 0} deck flags for user ownership...`)
      
      // Check each flag to see if the deck belongs to the target user
      for (const flag of allDeckFlags || []) {
        const { data: deck } = await supabase
          .from('community_decks')
          .select('user_id, user_name, name, emoji')
          .eq('deck_id', flag.target_id)
          .single()
        
        if (deck && deck.user_id === targetUserId) {
          // Get reporter name from database
          let reporterName = flag.reporter_name || 'Unknown User'
          if (flag.reporter_id && !flag.reporter_name) {
            const { data: reporter } = await supabase
              .from('users')
              .select('display_name, email')
              .eq('id', flag.reporter_id)
              .single()
            
            if (reporter) {
              reporterName = reporter.display_name || reporter.email
            }
          }
          
          activity.push({
            id: flag.id,
            type: 'flag_received',
            timestamp: flag.created_at,
            userName: userName,
            userId: targetUserId,
            details: {
              targetType: flag.target_type,
              targetId: flag.target_id,
              reason: flag.reason,
              notes: flag.notes,
              status: flag.status,
              reporterName: reporterName
            }
          })
        }
      }
      
      console.log(`✅ Flags against user's decks: ${activity.filter(a => a.type === 'flag_received' && a.details.targetType === 'deck').length}`)
    }
    
    // Flags against user's CARDS (via deck ownership)
    const { data: flagsAgainstCards, error: flagsCardsError } = await supabase
      .from('flags')
      .select('*')
      .eq('target_type', 'card')
    
    if (flagsCardsError) {
      console.log(`⚠️ Error fetching card flags: ${flagsCardsError.message}`)
    } else {
      console.log(`🔍 Checking ${flagsAgainstCards?.length || 0} card flags for user ownership...`)
      
      // For each card flag, get the card and check if its deck belongs to the user
      for (const flag of flagsAgainstCards || []) {
        const { data: card } = await supabase
          .from('community_cards')
          .select('deck_id')
          .eq('card_id', flag.target_id)
          .single()
        
        if (card?.deck_id) {
          const { data: deck } = await supabase
            .from('community_decks')
            .select('user_id, user_name')
            .eq('deck_id', card.deck_id)
            .single()
          
          if (deck && deck.user_id === targetUserId) {
            // Get reporter name from database
            let reporterName = flag.reporter_name || 'Unknown User'
            if (flag.reporter_id && !flag.reporter_name) {
              const { data: reporter } = await supabase
                .from('users')
                .select('display_name, email')
                .eq('id', flag.reporter_id)
                .single()
              
              if (reporter) {
                reporterName = reporter.display_name || reporter.email
              }
            }
            
            activity.push({
              id: flag.id,
              type: 'flag_received',
              timestamp: flag.created_at,
              userName: userName,
              userId: targetUserId,
              details: {
                targetType: flag.target_type,
                targetId: flag.target_id,
                reason: flag.reason,
                notes: flag.notes,
                status: flag.status,
                reporterName: reporterName
              }
            })
          }
        }
      }
    }
    
    // Flags against user's COMMENTS - manual lookup without JOIN
    const { data: allCommentFlags, error: flagsCommentsError } = await supabase
      .from('flags')
      .select('*')
      .eq('target_type', 'comment')
    
    if (flagsCommentsError) {
      console.log(`⚠️ Error fetching flags against comments: ${flagsCommentsError.message}`)
    } else {
      console.log(`🔍 Checking ${allCommentFlags?.length || 0} comment flags for user ownership...`)
      
      // Check each flag to see if the comment belongs to the target user
      for (const flag of allCommentFlags || []) {
        const { data: comment } = await supabase
          .from('deck_comments')
          .select('user_id, user_name, text, deck_id')
          .eq('comment_id', flag.target_id)
          .single()
        
        if (comment && comment.user_id === targetUserId) {
          // Get reporter name from database
          let reporterName = flag.reporter_name || 'Unknown User'
          if (flag.reporter_id && !flag.reporter_name) {
            const { data: reporter } = await supabase
              .from('users')
              .select('display_name, email')
              .eq('id', flag.reporter_id)
              .single()
            
            if (reporter) {
              reporterName = reporter.display_name || reporter.email
            }
          }
          
          activity.push({
            id: flag.id,
            type: 'flag_received',
            timestamp: flag.created_at,
            userName: userName,
            userId: targetUserId,
            details: {
              targetType: flag.target_type,
              targetId: flag.target_id,
              reason: flag.reason,
              notes: flag.notes,
              status: flag.status,
              reporterName: reporterName
            }
          })
        }
      }
      
      console.log(`✅ Flags against user's comments: ${activity.filter(a => a.type === 'flag_received' && a.details.targetType === 'comment').length}`)
    }

    // ============================================================
    // SQL VERSION: Get deleted items
    // Content deleted OF this user + Moderation actions BY this user
    // ============================================================
    
    console.log('🗑️ Fetching deleted items...')
    
    // Content deleted OF this user - check all tables with is_deleted flag
    
    // Deleted comments by this user
    const { data: deletedComments } = await supabase
      .from('deck_comments')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    // Deleted replies by this user
    const { data: deletedReplies } = await supabase
      .from('comment_replies')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    // Deleted decks by this user
    const { data: deletedDecks } = await supabase
      .from('community_decks')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    // Deleted cards by this user (via community_decks foreign key)
    const { data: deletedCards } = await supabase
      .from('community_cards')
      .select('*, community_decks!inner(user_id)')
      .eq('community_decks.user_id', targetUserId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    // Add deleted comments to activity
    for (const comment of deletedComments || []) {
      activity.push({
        id: comment.id,
        type: 'content_deleted',
        timestamp: comment.deleted_at,
        userName: userName,
        userId: targetUserId,
        details: {
          contentType: 'comment',
          contentId: comment.id,
          content: comment.text,
          deletedBy: comment.deleted_by,
          reason: comment.deleted_reason
        }
      })
    }
    
    // Add deleted replies to activity
    for (const reply of deletedReplies || []) {
      activity.push({
        id: reply.id,
        type: 'content_deleted',
        timestamp: reply.deleted_at,
        userName: userName,
        userId: targetUserId,
        details: {
          contentType: 'reply',
          contentId: reply.id,
          content: reply.text,
          deletedBy: reply.deleted_by,
          reason: reply.deleted_reason
        }
      })
    }
    
    // Add deleted decks to activity
    for (const deck of deletedDecks || []) {
      activity.push({
        id: deck.id,
        type: 'content_deleted',
        timestamp: deck.deleted_at,
        userName: userName,
        userId: targetUserId,
        details: {
          contentType: 'deck',
          contentId: deck.id,
          content: deck.name,
          deletedBy: deck.deleted_by,
          reason: deck.deleted_reason,
          emoji: deck.emoji
        }
      })
    }
    
    // Add deleted cards to activity
    for (const card of deletedCards || []) {
      activity.push({
        id: card.id,
        type: 'content_deleted',
        timestamp: card.deleted_at,
        userName: userName,
        userId: targetUserId,
        details: {
          contentType: 'card',
          contentId: card.id,
          content: `${card.front || ''} / ${card.back || ''}`,
          deletedBy: card.deleted_by,
          reason: card.deleted_reason
        }
      })
    }
    
    console.log(`✅ Total deleted items OF user: ${deletedComments?.length || 0} comments, ${deletedReplies?.length || 0} replies, ${deletedDecks?.length || 0} decks, ${deletedCards?.length || 0} cards`)

    // Moderation actions BY this user (if moderator/superuser) - check database
    const { data: targetActivityDbData } = await supabase
      .from('users')
      .select('is_moderator, is_superuser')
      .eq('id', targetUserId)
      .single()
    
    if (targetActivityDbData?.is_moderator || targetActivityDbData?.is_superuser) {
      console.log('👮 User is moderator/superuser, fetching moderation actions...')
      
      // Fetch items deleted BY this moderator/superuser from all tables
      const { data: modComments } = await supabase
        .from('deck_comments')
        .select('*')
        .eq('deleted_by', targetUserId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })
      
      const { data: modReplies } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('deleted_by', targetUserId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })
      
      const { data: modDecks } = await supabase
        .from('community_decks')
        .select('*')
        .eq('deleted_by', targetUserId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })
      
      const { data: modCards } = await supabase
        .from('community_cards')
        .select('*')
        .eq('deleted_by', targetUserId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })
      
      // Add moderation actions to activity
      for (const comment of modComments || []) {
        activity.push({
          id: comment.id,
          type: 'moderation_action',
          timestamp: comment.deleted_at,
          userName: userName,
          userId: targetUserId,
          details: {
            action: 'deleted_comment',
            contentType: 'comment',
            contentId: comment.id,
            content: comment.text,
            targetUser: comment.user_id,
            reason: comment.deleted_reason
          }
        })
      }
      
      for (const reply of modReplies || []) {
        activity.push({
          id: reply.id,
          type: 'moderation_action',
          timestamp: reply.deleted_at,
          userName: userName,
          userId: targetUserId,
          details: {
            action: 'deleted_reply',
            contentType: 'reply',
            contentId: reply.id,
            content: reply.text,
            targetUser: reply.user_id,
            reason: reply.deleted_reason
          }
        })
      }
      
      for (const deck of modDecks || []) {
        activity.push({
          id: deck.id,
          type: 'moderation_action',
          timestamp: deck.deleted_at,
          userName: userName,
          userId: targetUserId,
          details: {
            action: 'deleted_deck',
            contentType: 'deck',
            contentId: deck.id,
            content: deck.name,
            targetUser: deck.user_id,
            reason: deck.deleted_reason,
            emoji: deck.emoji
          }
        })
      }
      
      for (const card of modCards || []) {
        activity.push({
          id: card.id,
          type: 'moderation_action',
          timestamp: card.deleted_at,
          userName: userName,
          userId: targetUserId,
          details: {
            action: 'deleted_card',
            contentType: 'card',
            contentId: card.id,
            content: `${card.front || ''} / ${card.back || ''}`,
            targetUser: card.user_id,
            reason: card.deleted_reason
          }
        })
      }
      
      console.log(`✅ Moderation actions BY user: ${modComments?.length || 0} comments, ${modReplies?.length || 0} replies, ${modDecks?.length || 0} decks, ${modCards?.length || 0} cards`)
    }

    // ============================================================
    // DATABASE VERSION: Ban history from users table
    // ============================================================
    
    console.log('🚫 Checking ban history...')
    if (targetUser.is_banned) {
      activity.push({
        id: `ban-${targetUserId}`,
        type: 'account_action',
        timestamp: targetUser.banned_at,
        userName: userName,
        userId: targetUserId,
        details: {
          action: 'banned',
          reason: targetUser.banned_reason,
          bannedBy: targetUser.banned_by
        }
      })
    }

    console.log('📊 Sorting activity items by timestamp...')
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log(`✅ Activity items collected: ${activity.length}`)
    console.log('=== 📊 GET USER ACTIVITY SUCCESS ===')

    return c.json({ 
      user: {
        id: targetUserId,
        name: userName,
        email: targetUser.email,
        isModerator: targetUser.is_moderator === true,
        isSuperuser: targetUser.is_superuser === true,
        isBanned: targetUser.is_banned === true
      },
      activity 
    })
  } catch (error) {
    console.log('=== ❌ GET USER ACTIVITY ERROR ===')
    console.log(`Error: ${error}`)
    console.log(`Error message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.log(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    return c.json({ error: 'Failed to fetch user activity' }, 500)
  }
})

// Restore a deleted item (Superuser only)
app.post('/admin/deleted-items/restore', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser, display_name, avatar_url')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Restore item: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can restore items' }, 403)
    }

    const restorerName = userData.display_name || 'Superuser'
    const restorerAvatar = userData.avatar_url || null

    const body = await c.req.json()
    const { itemId, itemType } = body

    if (!itemId || !itemType) {
      console.log('❌ Missing itemId or itemType')
      return c.json({ error: 'Item ID and type are required' }, 400)
    }

    console.log(`♻️ Restoring ${itemType} ${itemId} by superuser ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Restore deleted item based on type
    // ============================================================
    
    let restored = false

    if (itemType === 'comment') {
      // Fetch the deleted comment first
      const { data: deletedComment, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('id', itemId)
        .eq('is_deleted', true)
        .maybeSingle()
      
      if (fetchError) {
        console.log(`❌ Error fetching comment: ${fetchError.message}`)
        return c.json({ error: 'Error fetching comment' }, 500)
      }
      
      if (!deletedComment) {
        console.log(`❌ Comment ${itemId} not found or not deleted`)
        return c.json({ error: 'Comment not found or not deleted' }, 404)
      }

      // Restore the comment by removing is_deleted flag
      const { error: updateError } = await supabase
        .from('comments')
        .update({ 
          is_deleted: false,
          deleted_by: null,
          deleted_reason: null,
          deleted_at: null
        })
        .eq('id', itemId)
      
      if (updateError) {
        console.log(`❌ Error restoring comment: ${updateError.message}`)
        return c.json({ error: 'Failed to restore comment' }, 500)
      }

      restored = true

      // Send notification to the comment author
      const commentAuthorId = deletedComment.user_id
      if (commentAuthorId && commentAuthorId !== user.id) {
        const notificationId = crypto.randomUUID()
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            id: notificationId,
            user_id: commentAuthorId,
            type: 'comment_restored',
            related_user_id: user.id,
            requester_display_name: restorerName,
            requester_avatar: restorerAvatar,
            related_deck_id: deletedComment.deck_id,
            related_comment_id: itemId,
            comment_text: deletedComment.text,
            created_at: new Date().toISOString(),
            is_read: false
          })
        
        if (notifError) {
          console.log(`⚠️ Failed to send notification: ${notifError.message}`)
        }
      }
    } else if (itemType === 'reply') {
      // Fetch the deleted reply first (replies are stored in comments table with parent_comment_id)
      const { data: deletedReply, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('id', itemId)
        .eq('is_deleted', true)
        .not('parent_comment_id', 'is', null)
        .maybeSingle()
      
      if (fetchError) {
        console.log(`❌ Error fetching reply: ${fetchError.message}`)
        return c.json({ error: 'Error fetching reply' }, 500)
      }
      
      if (!deletedReply) {
        console.log(`❌ Reply ${itemId} not found or not deleted`)
        return c.json({ error: 'Reply not found or not deleted' }, 404)
      }

      // Restore the reply
      const { error: updateError } = await supabase
        .from('comments')
        .update({ 
          is_deleted: false,
          deleted_by: null,
          deleted_reason: null,
          deleted_at: null
        })
        .eq('id', itemId)
      
      if (updateError) {
        console.log(`❌ Error restoring reply: ${updateError.message}`)
        return c.json({ error: 'Failed to restore reply' }, 500)
      }

      restored = true

      // Send notification to the reply author
      const replyAuthorId = deletedReply.user_id
      if (replyAuthorId && replyAuthorId !== user.id) {
        const notificationId = crypto.randomUUID()
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            id: notificationId,
            user_id: replyAuthorId,
            type: 'reply_restored',
            related_user_id: user.id,
            requester_display_name: restorerName,
            requester_avatar: restorerAvatar,
            related_deck_id: deletedReply.deck_id,
            related_reply_id: itemId,
            related_comment_id: deletedReply.parent_comment_id,
            comment_text: deletedReply.text,
            created_at: new Date().toISOString(),
            is_read: false
          })
        
        if (notifError) {
          console.log(`⚠️ Failed to send notification: ${notifError.message}`)
        }
      }
    } else if (itemType === 'deck') {
      // Fetch the deleted deck first
      const { data: deletedDeck, error: fetchError } = await supabase
        .from('community_decks')
        .select('*')
        .eq('id', itemId)
        .eq('is_deleted', true)
        .maybeSingle()
      
      if (fetchError) {
        console.log(`❌ Error fetching deck: ${fetchError.message}`)
        return c.json({ error: 'Error fetching deck' }, 500)
      }
      
      if (!deletedDeck) {
        console.log(`❌ Deck ${itemId} not found or not deleted`)
        return c.json({ error: 'Deck not found or not deleted' }, 404)
      }

      // Restore the community deck
      const { error: updateError } = await supabase
        .from('community_decks')
        .update({ 
          is_deleted: false,
          deleted_by: null,
          deleted_reason: null,
          deleted_at: null
        })
        .eq('id', itemId)
      
      if (updateError) {
        console.log(`❌ Error restoring deck: ${updateError.message}`)
        return c.json({ error: 'Failed to restore deck' }, 500)
      }

      restored = true

      // Send notification to the deck author
      const deckAuthorId = deletedDeck.owner_id
      if (deckAuthorId && deckAuthorId !== user.id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            id: crypto.randomUUID(),
            user_id: deckAuthorId,
            type: 'deck_restored',
            related_user_id: user.id,
            requester_display_name: restorerName,
            requester_avatar: restorerAvatar,
            related_deck_id: itemId,
            deck_name: deletedDeck.name,
            created_at: new Date().toISOString(),
            is_read: false
          })

        
        if (notifError) {
          console.log(`⚠️ Failed to send notification: ${notifError.message}`)
        }
      }
    } else if (itemType === 'card') {
      // Fetch the deleted card first
      const { data: deletedCard, error: fetchError } = await supabase
        .from('community_cards')
        .select('*')
        .eq('id', itemId)
        .eq('is_deleted', true)
        .maybeSingle()
      
      if (fetchError) {
        console.log(`❌ Error fetching card: ${fetchError.message}`)
        return c.json({ error: 'Error fetching card' }, 500)
      }
      
      if (!deletedCard) {
        console.log(`❌ Card ${itemId} not found or not deleted`)
        return c.json({ error: 'Card not found or not deleted' }, 404)
      }

      // Restore the card
      const { error: updateError } = await supabase
        .from('community_cards')
        .update({ 
          is_deleted: false,
          deleted_by: null,
          deleted_reason: null,
          deleted_at: null
        })
        .eq('id', itemId)
      
      if (updateError) {
        console.log(`❌ Error restoring card: ${updateError.message}`)
        return c.json({ error: 'Failed to restore card' }, 500)
      }

      restored = true

      // Fetch the deck info for notification
      const { data: cardDeck } = await supabase
        .from('community_decks')
        .select('name, owner_id')
        .eq('id', deletedCard.community_deck_id)
        .single()

      // Send notification to the deck author
      const deckAuthorId = cardDeck?.owner_id
      if (deckAuthorId && deckAuthorId !== user.id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            id: crypto.randomUUID(),
            user_id: deckAuthorId,
            type: 'card_restored',
            related_user_id: user.id,
            requester_display_name: restorerName,
            requester_avatar: restorerAvatar,
            related_deck_id: deletedCard.community_deck_id,
            deck_name: cardDeck?.name,
            comment_text: deletedCard.front,
            created_at: new Date().toISOString(),
            is_read: false
          })
        
        if (notifError) {
          console.log(`⚠️ Failed to send notification: ${notifError.message}`)
        }
      }
    } else {
      console.log(`❌ Invalid item type: ${itemType}`)
      return c.json({ error: 'Invalid item type' }, 400)
    }

    if (!restored) {
      console.log(`❌ Failed to restore item`)
      return c.json({ error: 'Failed to restore item' }, 500)
    }

    console.log(`✅ Item ${itemId} (${itemType}) restored by ${user.email}`)
    
    return c.json({ success: true, message: 'Item restored successfully' })
  } catch (error) {
    console.log(`❌ Restore item exception: ${error}`)
    return c.json({ error: 'Failed to restore item' }, 500)
  }
})


// Delete published community deck (Superuser only)
app.delete('/admin/community/decks/:communityDeckId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser, display_name')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can delete community decks' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const body = await c.req.json()
    const { reason } = body

    console.log(`🗑️ Superuser ${user.id} deleting community deck: ${communityDeckId}`)

    if (!reason || !reason.trim()) {
      console.log('❌ Missing deletion reason')
      return c.json({ error: 'Deletion reason is required' }, 400)
    }

    // ============================================================
    // SQL VERSION: Soft delete community deck
    // ============================================================

    // Get the existing community deck
    const { data: existingDeck, error: deckError } = await supabase
      .from('community_decks')
      .select('id, name, emoji, category, owner_id, owner_name, owner_display_name, original_deck_id, card_count')
      .eq('id', communityDeckId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .single()
    
    if (deckError || !existingDeck) {
      console.log(`❌ Community deck not found: ${deckError?.message}`)
      return c.json({ error: 'Community deck not found' }, 404)
    }

    const deletedAt = new Date().toISOString()
    const deleterName = userData.display_name || 'Superuser'

    // Soft delete the community deck
    const { error: deleteDeckError } = await supabase
      .from('community_decks')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_reason: reason.trim(),
        deleted_at: deletedAt
      })
      .eq('id', communityDeckId)

    if (deleteDeckError) {
      console.log(`❌ Error soft-deleting deck: ${deleteDeckError.message}`)
      return c.json({ error: 'Failed to delete community deck' }, 500)
    }

    console.log(`✅ Soft-deleted community deck in database`)

    // Send notification to deck owner
    if (existingDeck.owner_id && existingDeck.owner_id !== user.id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingDeck.owner_id,
          type: 'deck_deleted',
          message: `Your community deck "${existingDeck.name}" was removed from the community`,
          data: {
            deckName: existingDeck.name,
            deckId: communityDeckId,
            reason: reason.trim(),
            deletedBy: deleterName
          },
          read: false,
          seen: false
        })
      
      if (notifError) {
        console.log(`⚠️ Failed to send notification: ${notifError.message}`)
      } else {
        console.log(`✅ Sent notification to deck owner ${existingDeck.owner_id}`)
      }
    }
    
    console.log(`✅ Superuser soft-deleted community deck: ${communityDeckId}. Reason: ${reason.trim()}`)
    
    return c.json({ success: true, message: 'Community deck deleted successfully' })
  } catch (error) {
    console.log(`❌ Delete community deck exception: ${error}`)
    return c.json({ error: 'Failed to delete community deck' }, 500)
  }
})


// Delete a card from community deck (Superuser only)
app.delete('/admin/community/decks/:communityDeckId/cards/:cardId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser, display_name')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can delete community cards' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const cardId = c.req.param('cardId')
    const { reason } = await c.req.json()

    console.log(`🗑️ Superuser ${user.id} deleting card ${cardId} from community deck ${communityDeckId}`)

    if (!reason || !reason.trim()) {
      console.log('❌ Missing deletion reason')
      return c.json({ error: 'Deletion reason is required' }, 400)
    }

    // ============================================================
    // SQL VERSION: Soft delete card from community deck
    // ============================================================

    // Get the community deck to verify it exists
    const { data: deck, error: deckError } = await supabase
      .from('community_decks')
      .select('id, name, owner_id, owner_name, owner_display_name')
      .eq('id', communityDeckId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Community deck not found: ${deckError?.message}`)
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // Get the card from the deck
    const { data: card, error: cardError } = await supabase
      .from('community_cards')
      .select('id, front, back, card_type, community_deck_id')
      .eq('id', cardId)
      .eq('community_deck_id', communityDeckId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .single()
    
    if (cardError || !card) {
      console.log(`❌ Card not found in deck: ${cardError?.message}`)
      return c.json({ error: 'Card not found' }, 404)
    }

    const deletedAt = new Date().toISOString()
    const deleterName = userData.display_name || 'Superuser'

    // Soft delete the card
    const { error: deleteCardError } = await supabase
      .from('community_cards')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_reason: reason.trim(),
        deleted_at: deletedAt
      })
      .eq('id', cardId)

    if (deleteCardError) {
      console.log(`❌ Error soft-deleting card: ${deleteCardError.message}`)
      return c.json({ error: 'Failed to delete card' }, 500)
    }

    console.log(`✅ Soft-deleted card from database`)

    // Send notification to deck owner
    if (deck.owner_id && deck.owner_id !== user.id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: deck.owner_id,
          type: 'card_deleted',
          message: `A card was removed from your community deck "${deck.name}"`,
          data: {
            deckName: deck.name,
            deckId: communityDeckId,
            cardFront: card.front,
            reason: reason.trim(),
            deletedBy: deleterName
          },
          read: false,
          seen: false
        })
      
      if (notifError) {
        console.log(`⚠️ Failed to send notification: ${notifError.message}`)
      } else {
        console.log(`✅ Sent notification to deck owner ${deck.owner_id}`)
      }
    }
    
    console.log(`✅ Superuser soft-deleted card from community deck: ${communityDeckId}. Reason: ${reason.trim()}`)
    
    return c.json({ success: true, message: 'Card deleted successfully' })
  } catch (error) {
    console.log(`❌ Delete community card exception: ${error}`)
    return c.json({ error: 'Failed to delete card' }, 500)
  }
})

// Toggle featured status for community deck (Superuser only)
app.patch('/admin/community/decks/:communityDeckId/featured', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can feature/unfeature community decks' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')

    console.log(`⭐ Superuser ${user.id} toggling featured status for deck: ${communityDeckId}`)

    // ============================================================
    // SQL VERSION: Toggle featured status in community_decks table
    // ============================================================

    // Get the existing community deck
    const { data: existingDeck, error: deckError } = await supabase
      .from('community_decks')
      .select('id, name, featured, is_published, is_deleted')
      .eq('id', communityDeckId)
      .eq('is_published', true)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .single()
    
    if (deckError || !existingDeck) {
      console.log(`❌ Community deck not found: ${deckError?.message}`)
      return c.json({ error: 'Community deck not found' }, 404)
    }

    const newFeaturedStatus = !existingDeck.featured
    const updatedAt = new Date().toISOString()

    // Toggle featured status
    const { error: updateError } = await supabase
      .from('community_decks')
      .update({
        featured: newFeaturedStatus,
        updated_at: updatedAt
      })
      .eq('id', communityDeckId)

    if (updateError) {
      console.log(`❌ Error toggling featured status: ${updateError.message}`)
      return c.json({ error: 'Failed to toggle featured status' }, 500)
    }

    console.log(`✅ Deck ${newFeaturedStatus ? 'featured' : 'unfeatured'}: ${communityDeckId}`)

    // Fetch the updated deck to return
    const { data: updatedDeck, error: fetchError } = await supabase
      .from('community_decks')
      .select('*')
      .eq('id', communityDeckId)
      .single()

    if (fetchError) {
      console.log(`⚠️ Error fetching updated deck (non-critical): ${fetchError.message}`)
    }

    // Convert to camelCase for frontend
    const deckResponse = updatedDeck ? {
      id: updatedDeck.id,
      name: updatedDeck.name,
      emoji: updatedDeck.emoji,
      category: updatedDeck.category,
      subtopic: updatedDeck.subtopic,
      description: updatedDeck.description,
      featured: updatedDeck.featured,
      isFlagged: updatedDeck.is_flagged,
      isPublished: updatedDeck.is_published,
      ownerId: updatedDeck.owner_id,
      ownerName: updatedDeck.owner_name,
      ownerDisplayName: updatedDeck.owner_display_name,
      ownerAvatar: updatedDeck.owner_avatar,
      originalDeckId: updatedDeck.original_deck_id,
      cardCount: updatedDeck.card_count,
      importCount: updatedDeck.import_count,
      averageRating: updatedDeck.average_rating,
      ratingCount: updatedDeck.rating_count,
      publishedAt: updatedDeck.published_at,
      createdAt: updatedDeck.created_at,
      updatedAt: updatedDeck.updated_at,
      version: updatedDeck.version,
      fromLanguage: updatedDeck.from_language,
      backLanguage: updatedDeck.back_language,
      color: updatedDeck.color,
      difficulty: updatedDeck.difficulty
    } : null
    
    return c.json({ 
      message: `Deck ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully`, 
      deck: deckResponse 
    })
  } catch (error) {
    console.log(`❌ Toggle featured status exception: ${error}`)
    return c.json({ error: 'Failed to toggle featured status' }, 500)
  }
})

// Get all deleted items (Superuser only)
app.get('/admin/deleted-items', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.log(`❌ Get deleted items: Failed to fetch user data: ${userError?.message}`)
      return c.json({ error: 'Failed to verify user permissions' }, 500)
    }

    const isSuperuser = userData.is_superuser === true
    if (!isSuperuser) {
      console.log(`❌ User ${user.id} is not a superuser`)
      return c.json({ error: 'Only superusers can view deleted items' }, 403)
    }

    console.log(`📋 Fetching all deleted items for superuser ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Get all deleted items from various tables
    // ============================================================
    
    // Fetch deleted comments
    const { data: deletedComments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    if (commentsError) {
      console.log(`❌ Error fetching deleted comments: ${commentsError.message}`)
      return c.json({ error: 'Failed to fetch deleted comments' }, 500)
    }

    // Fetch deleted replies
    const { data: deletedReplies, error: repliesError } = await supabase
      .from('replies')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    if (repliesError) {
      console.log(`❌ Error fetching deleted replies: ${repliesError.message}`)
      return c.json({ error: 'Failed to fetch deleted replies' }, 500)
    }

    // Fetch deleted community decks
    const { data: deletedDecks, error: decksError } = await supabase
      .from('community_decks')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    if (decksError) {
      console.log(`❌ Error fetching deleted decks: ${decksError.message}`)
      return c.json({ error: 'Failed to fetch deleted decks' }, 500)
    }

    // Fetch deleted community cards
    const { data: deletedCards, error: cardsError } = await supabase
      .from('community_cards')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    
    if (cardsError) {
      console.log(`❌ Error fetching deleted cards: ${cardsError.message}`)
      return c.json({ error: 'Failed to fetch deleted cards' }, 500)
    }

    console.log(`✅ Found ${deletedComments?.length || 0} comments, ${deletedReplies?.length || 0} replies, ${deletedDecks?.length || 0} decks, ${deletedCards?.length || 0} cards`)
    
    return c.json({ 
      comments: deletedComments || [],
      replies: deletedReplies || [],
      decks: deletedDecks || [],
      cards: deletedCards || []
    })
  } catch (error) {
    console.log(`❌ Get deleted items exception: ${error}`)
    return c.json({ error: 'Failed to fetch deleted items' }, 500)
  }
})

// ============================================================
// DECK ENDPOINTS
// ============================================================

// Get all decks for authenticated user
app.get('/decks', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get decks: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`📚 Getting all decks for user ${user.id}`)

    // ============================================================
    // SQL VERSION: Query decks table
    // ============================================================
    const { data: decks, error: decksError } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (decksError) {
      console.log(`❌ Get decks error: ${decksError.message}`)
      return c.json({ error: 'Failed to fetch decks' }, 500)
    }

    // Migration: Set creator_id for old decks that don't have it
    // This handles decks created before the creator_id field was added
    let migratedCount = 0
    if (decks) {
      for (const deck of decks) {
        if (!deck.creator_id) {
          const { error: updateError } = await supabase
            .from('decks')
            .update({ creator_id: user.id })
            .eq('id', deck.id)
            .eq('user_id', user.id)
          
          if (!updateError) {
            deck.creator_id = user.id
            migratedCount++
          }
        }
      }
      if (migratedCount > 0) {
        console.log(`✅ Migrated ${migratedCount} decks to add creator_id`)
      }
    }

    console.log(`✅ Fetched ${decks?.length || 0} decks for user ${user.id}`)
    
    return c.json({ decks: toCamelCase(decks || []) })
  } catch (error) {
    console.log(`❌ Get decks exception: ${error}`)
    return c.json({ error: 'Failed to fetch decks' }, 500)
  }
})

// Create a new deck
app.post('/decks', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in create deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { name, color, emoji, deckType, category, subtopic, difficulty, frontLanguage, backLanguage } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Deck name is required' }, 400)
    }

    console.log(`📚 Creating new deck "${name}" for user ${user.id}`)

    // ============================================================
    // SQL VERSION: Get max position from existing decks
    // ============================================================
    const { data: existingDecks, error: getError } = await supabase
      .from('decks')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
    
    if (getError) {
      console.log(`⚠️  Error getting max position: ${getError.message}`)
    }

    const maxPosition = existingDecks && existingDecks.length > 0 
      ? (existingDecks[0].position || 0) 
      : -1

    const deckId = crypto.randomUUID()
    
    // ============================================================
    // SQL VERSION: Insert new deck into decks table
    // ============================================================
    const deckData = {
      id: deckId,
      user_id: user.id,
      creator_id: user.id, // User creating the deck is the creator
      name,
      color: color || '#10B981',
      emoji: emoji || '📚',
      deck_type: deckType || 'classic-flip',
      category: category || null,
      subtopic: subtopic || null,
      difficulty: difficulty || null,
      front_language: frontLanguage || null,
      back_language: backLanguage || null,
      card_count: 0,
      position: maxPosition + 1,
      created_at: new Date().toISOString(),
    }

    const { data: deck, error: insertError } = await supabase
      .from('decks')
      .insert(deckData)
      .select()
      .single()
    
    if (insertError || !deck) {
      console.log(`❌ Create deck error: ${insertError?.message}`)
      return c.json({ error: 'Failed to create deck' }, 500)
    }

    console.log(`✅ Created deck ${deckId}: "${name}" at position ${maxPosition + 1}`)
    
    return c.json({ deck: toCamelCase(deck) })
  } catch (error) {
    console.log(`❌ Create deck exception: ${error}`)
    return c.json({ error: 'Failed to create deck' }, 500)
  }
})

// Update deck positions (for drag and drop reordering)
// IMPORTANT: This must come BEFORE /decks/:deckId to avoid route conflicts
app.put('/decks/positions', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in update deck positions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { positions } = await c.req.json()
    
    if (!Array.isArray(positions)) {
      return c.json({ error: 'Invalid positions data' }, 400)
    }

    console.log(`🔄 Updating positions for ${positions.length} decks for user ${user.id}`)

    // ============================================================
    // SQL VERSION: Update each deck's position
    // ============================================================
    let successCount = 0
    let errorCount = 0

    for (const { id, position } of positions) {
      const { error: updateError } = await supabase
        .from('decks')
        .update({ position })
        .eq('id', id)
        .eq('user_id', user.id) // Security: Only update user's own decks
      
      if (updateError) {
        console.log(`⚠️  Error updating deck ${id}: ${updateError.message}`)
        errorCount++
      } else {
        successCount++
      }
    }
    
    console.log(`✅ Updated ${successCount} deck positions (${errorCount} errors)`)
    
    return c.json({ success: true, updated: successCount, errors: errorCount })
  } catch (error) {
    console.log(`❌ Update deck positions exception: ${error}`)
    return c.json({ error: 'Failed to update deck positions' }, 500)
  }
})

// Update a deck
app.put('/decks/:deckId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in update deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const updates = await c.req.json()
    
    console.log(`✏️  Updating deck ${deckId} for user ${user.id}`)

    // ============================================================
    // SQL VERSION: Update deck and return updated data
    // ============================================================
    
    // Convert camelCase updates to snake_case for database
    const snakeCaseUpdates = toSnakeCase(updates)
    
    // Remove fields that shouldn't be updated via this endpoint
    delete snakeCaseUpdates.id
    delete snakeCaseUpdates.user_id
    delete snakeCaseUpdates.creator_id
    delete snakeCaseUpdates.created_at
    
    const { data: updatedDeck, error: updateError } = await supabase
      .from('decks')
      .update(snakeCaseUpdates)
      .eq('id', deckId)
      .eq('user_id', user.id) // Security: Only update user's own decks
      .select()
      .single()
    
    if (updateError) {
      console.log(`❌ Update deck error: ${updateError.message}`)
      if (updateError.code === 'PGRST116') {
        return c.json({ error: 'Deck not found' }, 404)
      }
      return c.json({ error: 'Failed to update deck' }, 500)
    }

    if (!updatedDeck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    console.log(`✅ Updated deck ${deckId}: ${Object.keys(updates).join(', ')}`)
    
    return c.json({ deck: toCamelCase(updatedDeck) })
  } catch (error) {
    console.log(`❌ Update deck exception: ${error}`)
    return c.json({ error: 'Failed to update deck' }, 500)
  }
})

// Delete a deck (handles both regular user deletions and superuser moderation deletions)
app.delete('/decks/:deckId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in delete deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    
    // Parse request body if present (for superuser deletions)
    let reason = null
    try {
      const body = await c.req.json()
      reason = body.reason
    } catch (e) {
      // No body is fine for regular user deletions
    }
    
    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    // If reason is provided, this is a superuser deletion of a community deck
    if (reason) {
      if (!isSuperuser) {
        return c.json({ error: 'Forbidden - Superuser access required' }, 403)
      }

      if (!reason.trim()) {
        return c.json({ error: 'Deletion reason is required' }, 400)
      }

      console.log(`🛡️ Superuser ${user.id} deleting community deck ${deckId}`)

      // ============================================================
      // SQL VERSION: Superuser moderation deletion
      // ============================================================
      
      // Get the deck to find the author and verify it exists
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('id, user_id, name, is_public')
        .eq('id', deckId)
        .single()
      
      if (deckError || !deck) {
        console.log(`❌ Deck not found: ${deckError?.message}`)
        return c.json({ error: 'Deck not found' }, 404)
      }

      const deckAuthorId = deck.user_id
      const deckName = deck.name

      // Get the full deck data with cards for restoration
      const { data: fullDeck, error: fullDeckError } = await supabase
        .from('decks')
        .select('*, cards(*)')
        .eq('id', deckId)
        .single()

      // Store deleted deck for restoration
      const { error: deletedItemError } = await supabase
        .from('deleted_items')
        .insert({
          type: 'deck',
          item_id: deckId,
          data: fullDeck || deck, // Use full deck if available, otherwise just deck info
          deleted_by: user.id,
          deleted_by_name: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
          reason: reason.trim(),
          deleted_at: new Date().toISOString()
        })
      
      if (deletedItemError) {
        console.log(`⚠️  Failed to store deleted item: ${deletedItemError.message}`)
      }

      // Mark the deck as publish-banned and unpublish it
      const { error: updateError } = await supabase
        .from('decks')
        .update({
          publish_banned: true,
          publish_banned_reason: reason.trim(),
          is_public: false
        })
        .eq('id', deckId)
      
      if (updateError) {
        console.log(`❌ Failed to ban deck: ${updateError.message}`)
        return c.json({ error: 'Failed to delete deck' }, 500)
      }

      // Notify the deck author
      if (deckAuthorId && deckAuthorId !== user.id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: deckAuthorId,
            type: 'deck_deleted',
            superuser_name: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
            reason: reason.trim(),
            deck_name: deckName,
            deck_id: deckId,
            created_at: new Date().toISOString(),
            read: false,
            seen: false
          })
        
        if (notifError) {
          console.log(`⚠️  Failed to send notification: ${notifError.message}`)
        }
      }

      console.log(`✅ Superuser deleted and banned deck ${deckId}`)
      
      return c.json({ success: true, message: 'Deck deleted successfully' })
    } else {
      // Regular user deleting their own deck
      console.log(`🗑️ User ${user.id} deleting own deck ${deckId}`)

      // ============================================================
      // SQL VERSION: Regular user deletion
      // ============================================================
      
      // Get the deck first to verify ownership
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('id', deckId)
        .eq('user_id', user.id) // Security: Only delete user's own decks
        .single()
      
      if (deckError || !deck) {
        console.log(`❌ Deck not found or unauthorized: ${deckError?.message}`)
        return c.json({ error: 'Deck not found' }, 404)
      }
      
      // Delete all cards in the deck (CASCADE should handle this, but being explicit)
      const { error: cardsError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_id', deckId)
      
      if (cardsError) {
        console.log(`⚠️  Error deleting cards: ${cardsError.message}`)
      }
      
      // Delete the deck
      const { error: deleteError } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)
        .eq('user_id', user.id) // Security: Double-check ownership
      
      if (deleteError) {
        console.log(`❌ Failed to delete deck: ${deleteError.message}`)
        return c.json({ error: 'Failed to delete deck' }, 500)
      }

      console.log(`✅ Deleted deck ${deckId} and its cards`)
      
      return c.json({ success: true })
    }
  } catch (error) {
    console.log(`❌ Delete deck exception: ${error}`)
    return c.json({ error: 'Failed to delete deck' }, 500)
  }
})

// Update an imported deck from community (AUTHORITATIVE)
app.put('/decks/:deckId/update-from-community', async (c: Context) => {
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

    const deckId = c.req.param('deckId')

    // ------------------------------------------------------------
    // Fetch personal deck
    // ------------------------------------------------------------
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()

    if (deckError || !deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    if (!deck.source_community_deck_id) {
      return c.json(
        { error: 'Deck is not imported from community' },
        400
      )
    }

    // Prevent updating your own published deck
    if (deck.creator_id === user.id) {
      return c.json(
        { error: 'You cannot update your own deck from community' },
        400
      )
    }

    // ------------------------------------------------------------
    // Fetch community deck
    // ------------------------------------------------------------
    const { data: communityDeck, error: communityError } = await supabase
      .from('community_decks')
      .select('*')
      .eq('id', deck.source_community_deck_id)
      .eq('is_published', true)
      .single()

    if (communityError || !communityDeck) {
      return c.json(
        { error: 'Community deck no longer exists or is unpublished' },
        404
      )
    }

    // ------------------------------------------------------------
    // Freshness check (THIS is the key)
    // ------------------------------------------------------------
    if (
      deck.imported_from_version &&
      communityDeck.version &&
      deck.imported_from_version >= communityDeck.version
    ) {
      return c.json(
        { error: 'Deck is already up to date' },
        400
      )
    }

    // ------------------------------------------------------------
    // Fetch community cards (SOURCE OF TRUTH)
    // ------------------------------------------------------------
    const { data: communityCards, error: cardsError } = await supabase
      .from('community_cards')
      .select('*')
      .eq('community_deck_id', communityDeck.id)
      .order('position', { ascending: true })

    if (cardsError || !communityCards || communityCards.length === 0) {
      return c.json(
        { error: 'Community deck has no cards' },
        400
      )
    }

    const now = new Date().toISOString()

    // ------------------------------------------------------------
    // Replace cards atomically
    // ------------------------------------------------------------
    await supabase
      .from('cards')
      .delete()
      .eq('deck_id', deck.id)

    const newCards = communityCards.map((card, index) => ({
      id: crypto.randomUUID(),
      deck_id: deck.id,
      front: card.front,
      back: card.back,
      card_type: card.card_type,
      options: card.options,
      accepted_answers: card.accepted_answers,
      front_image_url: card.front_image_url,
      back_image_url: card.back_image_url,
      front_audio: card.front_audio,
      back_audio: card.back_audio,
      position: index,
      created_at: now,
    }))

    const { error: insertError } = await supabase
      .from('cards')
      .insert(newCards)

    if (insertError) {
      return c.json(
        { error: 'Failed to insert updated cards' },
        500
      )
    }

    // ------------------------------------------------------------
    // Update deck metadata FROM COMMUNITY
    // ------------------------------------------------------------
    const { data: updatedDeck, error: updateError } =
      await supabase
        .from('decks')
        .update({
          name: communityDeck.name,
          emoji: communityDeck.emoji,
          color: communityDeck.color,
          category: communityDeck.category,
          subtopic: communityDeck.subtopic,
          difficulty: communityDeck.difficulty,
          card_count: communityCards.length,
          imported_from_content_at:
            communityDeck.source_content_updated_at,
          updated_at: now,
        })
        .eq('id', deck.id)
        .select()
        .single()

    if (updateError) {
      return c.json(
        { error: 'Failed to update deck metadata' },
        500
      )
    }

    return c.json({
      deck: toCamelCase(updatedDeck),
      updated: true,
    })
  } catch (error) {
    console.error('❌ Update imported deck exception:', error)
    return c.json({ error: 'Failed to update imported deck' }, 500)
  }
})

// Publish a deck to the community (first publish OR re-publish)
app.post('/decks/:deckId/publish', async (c: Context) => {
  try {
    // ============================================================
    // Auth
    // ============================================================
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } =
      await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { category, subtopic } = await c.req.json()

    if (!category || !subtopic) {
      return c.json({ error: 'Category and subtopic are required' }, 400)
    }

    // ============================================================
    // Fetch source deck (must belong to user)
    // ============================================================
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()

    if (deckError || !deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    if (deck.publish_banned) {
      return c.json(
        {
          error: 'This deck is banned from publishing',
          reason: deck.publish_banned_reason || null
        },
        403
      )
    }

    const now = new Date().toISOString()

    // ============================================================
    // Check for existing community deck
    // ============================================================
    const { data: existingCommunityDeck } = await supabase
      .from('community_decks')
      .select('*')
      .eq('original_deck_id', deckId)
      .maybeSingle()

    // ------------------------------------------------------------
    // CASE 1: Already published → BLOCK
    // ------------------------------------------------------------
    if (existingCommunityDeck?.is_published) {
      return c.json(
        { error: 'Deck is already published. Use update endpoint.' },
        400
      )
    }

    // ============================================================
    // Fetch cards from source deck
    // ============================================================
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })

    if (cardsError || !cards || cards.length === 0) {
      return c.json(
        { error: 'Deck must have at least one card to publish' },
        400
      )
    }

    // ============================================================
    // Get owner display name
    // ============================================================
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const ownerDisplayName =
      userProfile?.display_name ||
      user.user_metadata?.displayName ||
      user.user_metadata?.name ||
      'Unknown'

    // ============================================================
    // CASE 2: Re-publish previously unpublished deck
    // ============================================================
    if (existingCommunityDeck && !existingCommunityDeck.is_published) {
      // Update metadata + republish
      await supabase
        .from('community_decks')
        .update({
          is_published: true,
          published_at: now,
          updated_at: now,
          category,
          subtopic,
          name: deck.name,
          emoji: deck.emoji,
          color: deck.color,
          difficulty: deck.difficulty,
          front_language: deck.front_language,
          back_language: deck.back_language,
          card_count: cards.length,
          source_content_updated_at: deck.content_updated_at
          // version handled by trigger
        })
        .eq('id', existingCommunityDeck.id)

      // Replace cards safely
      await supabase
        .from('community_cards')
        .delete()
        .eq('community_deck_id', existingCommunityDeck.id)

      const communityCards = cards.map(card => ({
        community_deck_id: existingCommunityDeck.id,
        front: card.front,
        back: card.back,
        card_type: card.card_type,
        options: card.options,
        accepted_answers: card.accepted_answers,
        front_image_url: card.front_image_url,
        back_image_url: card.back_image_url,
        front_audio: card.front_audio,
        back_audio: card.back_audio,
        position: card.position,
        created_at: now,
        updated_at: now
      }))

      await supabase.from('community_cards').insert(communityCards)

      // Mark source deck
      await supabase
        .from('decks')
        .update({
          is_published: true,
          category,
          subtopic
        })
        .eq('id', deckId)

      return c.json({ republished: true })
    }

    // ============================================================
    // CASE 3: First-time publish
    // ============================================================
    const { data: communityDeck, error: insertDeckError } =
      await supabase
        .from('community_decks')
        .insert({
          original_deck_id: deckId,
          owner_id: user.id,
          owner_display_name: ownerDisplayName,
          name: deck.name,
          emoji: deck.emoji,
          color: deck.color,
          category,
          subtopic,
          difficulty: deck.difficulty,
          front_language: deck.front_language,
          back_language: deck.back_language,
          card_count: cards.length,
          version: 1,
          is_published: true,
          created_at: now,
          updated_at: now,
          published_at: now,
          source_content_updated_at: deck.content_updated_at
        })
        .select()
        .single()

    if (insertDeckError) {
      return c.json({ error: 'Failed to publish deck' }, 500)
    }

    const communityCards = cards.map(card => ({
      community_deck_id: communityDeck.id,
      front: card.front,
      back: card.back,
      card_type: card.card_type,
      options: card.options,
      accepted_answers: card.accepted_answers,
      front_image_url: card.front_image_url,
      back_image_url: card.back_image_url,
      front_audio: card.front_audio,
      back_audio: card.back_audio,
      position: card.position,
      created_at: now,
      updated_at: now
    }))

    await supabase.from('community_cards').insert(communityCards)

    await supabase
      .from('decks')
      .update({
        is_published: true,
        category,
        subtopic
      })
      .eq('id', deckId)

    return c.json({ published: true, deck: communityDeck })
  } catch (error) {
    console.error('❌ Publish deck exception:', error)
    return c.json({ error: 'Failed to publish deck' }, 500)
  }
})

// Unpublish a deck from community
app.post('/decks/:communityDeckId/unpublish', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const isSuperuser = user.user_metadata?.role === 'superuser'

    // 1️⃣ Fetch community deck
    const { data: communityDeck, error: communityError } = await supabase
      .from('community_decks')
      .select('id, original_deck_id')
      .eq('id', communityDeckId)
      .single()

    if (communityError || !communityDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // 2️⃣ Fetch original deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id, user_id')
      .eq('id', communityDeck.original_deck_id)
      .single()

    if (deckError || !deck) {
      return c.json({ error: 'Original deck not found' }, 404)
    }

    // 3️⃣ Authorization
    if (deck.user_id !== user.id && !isSuperuser) {
      return c.json({ error: 'Only the deck author or a superuser can unpublish this deck' }, 403)
    }

    // 4️⃣ Soft-unpublish community deck
    const { error: unpublishError } = await supabase
      .from('community_decks')
      .update({ is_published: false })
      .eq('id', communityDeckId)

    if (unpublishError) {
      return c.json({ error: 'Failed to unpublish community deck' }, 500)
    }

    // Update personal deck flags
    const { error: deckUpdateError } = await supabase
      .from('decks')
      .update({
        is_published: false,
      })
      .eq('id', communityDeck.original_deck_id)

    if (deckUpdateError) {
      console.error('❌ Failed to update deck publish state:', deckUpdateError.message)
      return c.json({ error: 'Failed to update deck publish state' }, 500)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('❌ Unpublish deck exception:', error)
    return c.json({ error: 'Failed to unpublish deck' }, 500)
  }
})

// Get all cards for a deck
app.get('/decks/:deckId/cards', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get cards: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')

    console.log(`📇 Getting cards for deck ${deckId}`)

    // ============================================================
    // SQL VERSION: Get all cards for a deck
    // ============================================================

    // First, verify the user has access to this deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id) // Security: Only get cards from user's own decks
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Deck not found or access denied: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Get all cards for the deck, ordered by position
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
    
    if (cardsError) {
      console.log(`❌ Error fetching cards: ${cardsError.message}`)
      return c.json({ error: 'Failed to fetch cards' }, 500)
    }

    console.log(`✅ Found ${cards?.length || 0} cards`)

    return c.json({ cards: cards?.map(toCamelCase) || [] })
  } catch (error) {
    console.log(`❌ Get cards exception: ${error}`)
    return c.json({ error: 'Failed to fetch cards' }, 500)
  }
})

// Batch create multiple cards (for AI generation performance)
// IMPORTANT: This must come BEFORE the single card endpoint
app.post('/decks/:deckId/cards/batch', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]

    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } =
      await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.log(`❌ Auth error in batch create cards: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { cards: cardsToCreate } = await c.req.json()

    if (!Array.isArray(cardsToCreate) || cardsToCreate.length === 0) {
      return c.json({ error: 'Cards array is required' }, 400)
    }

    console.log(`📦 Batch creating ${cardsToCreate.length} cards for deck ${deckId}`)

    // ------------------------------------------------------------
    // Verify deck ownership
    // ------------------------------------------------------------
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()

    if (deckError || !deck) {
      console.log(`❌ Deck not found or access denied`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // ------------------------------------------------------------
    // Get current max position
    // ------------------------------------------------------------
    const { data: lastCard } = await supabase
      .from('cards')
      .select('position')
      .eq('deck_id', deckId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const startPosition = lastCard?.position ?? -1

    // ------------------------------------------------------------
    // Prepare cards
    // ------------------------------------------------------------
    const newCards = cardsToCreate.map((card, index) => ({
      id: crypto.randomUUID(),
      deck_id: deckId,
      front: card.front,
      back: card.back,
      card_type: card.cardType ?? 'classic-flip',
      position: startPosition + index + 1,
      created_at: new Date().toISOString(),

      ...(card.correctAnswer && { correct_answer: card.correctAnswer }),
      ...(card.incorrectAnswers && { incorrect_answers: card.incorrectAnswers }),
      ...(card.acceptedAnswers && { accepted_answers: card.acceptedAnswers }),
      ...(card.frontImageUrl && { front_image_url: card.frontImageUrl }),
      ...(card.backImageUrl && { back_image_url: card.backImageUrl }),
      ...(card.audio_url && { front_audio: card.audio_url }),
    }))

    // ------------------------------------------------------------
    // Insert cards
    // ------------------------------------------------------------
    const { data: createdCards, error: insertError } = await supabase
      .from('cards')
      .insert(newCards)
      .select()

    if (insertError) {
      console.log(`❌ Error batch inserting cards: ${insertError.message}`)
      return c.json({ error: 'Failed to create cards' }, 500)
    }

    console.log(`✅ Successfully batch created ${createdCards.length} cards`)

    // ------------------------------------------------------------
    // IMPORTANT:
    // card_count is updated by a DB trigger
    // ------------------------------------------------------------

    return c.json({
      cards: createdCards.map(toCamelCase),
      count: createdCards.length,
    })
  } catch (error) {
    console.error('❌ Batch create cards exception:', error)
    return c.json({ error: 'Failed to create cards' }, 500)
  }
})

// Create a new card
app.post('/decks/:deckId/cards', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in create card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    console.log(`📝 Creating card for deck ${deckId}`)
    
    const { front, back, cardType, options, correctAnswer, incorrectAnswers, acceptedAnswers, frontImageUrl, backImageUrl } = await c.req.json()
    
    // Validate based on card type
    if (cardType === 'classic-flip') {
      // Classic flip: front (text or image) required, back (text or image) required
      if (!front && !frontImageUrl) {
        return c.json({ error: 'Classic flip card requires front text or image' }, 400)
      }
      if (!back && !backImageUrl) {
        return c.json({ error: 'Classic flip card requires back text or image' }, 400)
      }
    } else if (cardType === 'multiple-choice') {
      // Multiple choice: front (text or image) required, correctAnswer required, incorrectAnswers required
      if (!front && !frontImageUrl) {
        return c.json({ error: 'Multiple choice card requires front text or image' }, 400)
      }
      if (!correctAnswer) {
        return c.json({ error: 'Multiple choice card requires correctAnswer' }, 400)
      }
      if (!incorrectAnswers || !Array.isArray(incorrectAnswers) || incorrectAnswers.length === 0) {
        return c.json({ error: 'Multiple choice card requires incorrectAnswers array with at least one option' }, 400)
      }
    } else if (cardType === 'type-answer') {
      // Type answer: front (text or image) required, back required
      if (!front && !frontImageUrl) {
        return c.json({ error: 'Type answer card requires front text or image' }, 400)
      }
      if (!back) {
        return c.json({ error: 'Type answer card requires back (correct answer)' }, 400)
      }
    }

    // Verify deck exists and belongs to user
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id, card_count')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Deck not found: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Get current max position
    const { data: existingCards } = await supabase
      .from('cards')
      .select('position')
      .eq('deck_id', deckId)
      .order('position', { ascending: false })
      .limit(1)
    
    const maxPosition = existingCards && existingCards.length > 0 ? existingCards[0].position : -1
    const newPosition = maxPosition + 1

    // Create the card
    const now = new Date().toISOString()
    
    const cardData: any = {
      deck_id: deckId,
      front,
      back,
      card_type: cardType || 'classic-flip',
      position: newPosition,
      created_at: now,
      updated_at: now
    }

    // Add optional fields
    if (options) cardData.options = options
    if (acceptedAnswers) cardData.accepted_answers = acceptedAnswers
    if (frontImageUrl) cardData.front_image_url = frontImageUrl
    if (backImageUrl) cardData.back_image_url = backImageUrl

    const { data: newCard, error: insertError } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single()
    
    if (insertError) {
      console.log(`❌ Error creating card: ${insertError.message}`)
      return c.json({ error: 'Failed to create card' }, 500)
    }

    // Update deck card count
    await supabase
      .from('decks')
      .update({ card_count: (deck.card_count || 0) + 1 })
      .eq('id', deckId)

    console.log(`✅ Created card ${newCard.id}`)
    
    return c.json({ card: toCamelCase(newCard) })
  } catch (error) {
    console.log(`❌ Create card exception: ${error}`)
    return c.json({ error: 'Failed to create card' }, 500)
  }
})

// Update card positions (for drag and drop reordering)
// IMPORTANT: This must come BEFORE /decks/:deckId/cards/:cardId to avoid route conflicts
app.put('/decks/:deckId/cards/positions', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in update card positions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { positions } = await c.req.json()
    
    if (!Array.isArray(positions)) {
      return c.json({ error: 'Invalid positions data' }, 400)
    }

    console.log(`🔄 Updating positions for ${positions.length} cards`)

    // ============================================================
    // SQL VERSION: Update card positions in bulk
    // ============================================================

    // First, verify the user owns this deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Deck not found or access denied: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Update all card positions in parallel (Supabase will batch them)
    const updatePromises = positions.map(({ id, position }) =>
      supabase
        .from('cards')
        .update({ position })
        .eq('id', id)
        .eq('deck_id', deckId) // Security: Only update cards in this deck
    )

    const results = await Promise.all(updatePromises)
    
    // Check for any errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.log(`⚠️  Some card positions failed to update: ${errors.length} errors`)
      console.log(`First error: ${errors[0].error?.message}`)
    }
    
    console.log(`✅ Updated ${positions.length} card positions`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log(`❌ Update card positions exception: ${error}`)
    return c.json({ error: 'Failed to update card positions' }, 500)
  }
})

// Update a card
app.put('/decks/:deckId/cards/:cardId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in update card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const cardId = c.req.param('cardId')
    const updates = await c.req.json()
    
    console.log(`✏️  Updating card ${cardId}`)

    // ============================================================
    // SQL VERSION: Update a card
    // ============================================================

    // First, verify the user owns this deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()
    
    if (deckError || !deck) {
      console.log(`❌ Deck not found or access denied: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Convert camelCase update fields to snake_case for database
    const dbUpdates: Record<string, any> = {}
    
    if (updates.front !== undefined) dbUpdates.front = updates.front
    if (updates.back !== undefined) dbUpdates.back = updates.back
    if (updates.cardType !== undefined) dbUpdates.card_type = updates.cardType
    if (updates.options !== undefined) dbUpdates.options = updates.options
    if (updates.acceptedAnswers !== undefined) dbUpdates.accepted_answers = updates.acceptedAnswers
    if (updates.frontImageUrl !== undefined) dbUpdates.front_image_url = updates.frontImageUrl
    if (updates.backImageUrl !== undefined) dbUpdates.back_image_url = updates.backImageUrl
    if (updates.frontAudio !== undefined) dbUpdates.front_audio = updates.frontAudio
    if (updates.backAudio !== undefined) dbUpdates.back_audio = updates.backAudio
    if (updates.position !== undefined) dbUpdates.position = updates.position

    // Update the card
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update(dbUpdates)
      .eq('id', cardId)
      .eq('deck_id', deckId) // Security: Only update cards in this deck
      .select()
      .single()
    
    if (updateError) {
      console.log(`❌ Error updating card: ${updateError.message}`)
      if (updateError.code === 'PGRST116') {
        return c.json({ error: 'Card not found' }, 404)
      }
      return c.json({ error: 'Failed to update card' }, 500)
    }
    
    console.log(`✅ Card updated successfully`)
    
    return c.json({ card: toCamelCase(updatedCard) })
  } catch (error) {
    console.log(`❌ Update card exception: ${error}`)
    return c.json({ error: 'Failed to update card' }, 500)
  }
})

// Delete a card from a user's own deck (personal decks only)
app.delete('/decks/:deckId/cards/:cardId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]

    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.log(`❌ Auth error in delete card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const cardId = c.req.param('cardId')

    console.log(`🗑️ User ${user.id} deleting card ${cardId} from deck ${deckId}`)

    // ============================================================
    // STEP 1: Verify the deck belongs to the user AND is not community
    // ============================================================
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id, user_id, is_community, card_count')
      .eq('id', deckId)
      .single()

    if (deckError || !deck) {
      console.log(`❌ Deck not found: ${deckError?.message}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    if (deck.user_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    if (deck.is_community) {
      return c.json(
        { error: 'Community cards must be removed via moderation' },
        403
      )
    }

    // ============================================================
    // STEP 2: Delete the card
    // ============================================================
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('deck_id', deckId)

    if (deleteError) {
      console.log(`❌ Error deleting card: ${deleteError.message}`)
      return c.json({ error: 'Failed to delete card' }, 500)
    }

    // ============================================================
    // STEP 3: Update deck card count (NO supabase.sql)
    // ============================================================
    const newCount = Math.max((deck.card_count ?? 1) - 1, 0)

    const { error: updateError } = await supabase
      .from('decks')
      .update({ card_count: newCount })
      .eq('id', deckId)

    if (updateError) {
      console.log(`⚠️ Error updating card count: ${updateError.message}`)
    }

    console.log(`✅ Card ${cardId} deleted successfully`)
    return c.json({ success: true })
  } catch (error) {
    console.log(`❌ Delete card exception: ${error}`)
    return c.json({ error: 'Failed to delete card' }, 500)
  }
})

// Create shareable link for a deck (snapshot-based)
app.post('/decks/:deckId/share', async (c: Context) => {
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

    const deckId = c.req.param('deckId')

    // Optional body
    let isCommunityDeck = false
    try {
      const body = await c.req.json()
      isCommunityDeck = body.isCommunityDeck === true
    } catch (_) {}

    let deckData
    let cards = []

    // -----------------------------
    // COMMUNITY DECK
    // -----------------------------
    if (isCommunityDeck) {
      const { data: deck, error } = await supabase
        .from('community_decks')
        .select('*')
        .eq('id', deckId)
        .eq('is_published', true)
        .single()

      if (error || !deck) {
        return c.json({ error: 'Community deck not found' }, 404)
      }

      const { data: deckCards } = await supabase
        .from('community_cards')
        .select('*')
        .eq('community_deck_id', deckId)
        .order('position')

      deckData = {
        name: deck.name,
        emoji: deck.emoji,
        color: deck.color,
        category: deck.category,
        subtopic: deck.subtopic,
        difficulty: deck.difficulty,
        authorName: deck.user_name,
        cards: deckCards || []
      }

    // -----------------------------
    // PERSONAL DECK
    // -----------------------------
    } else {
      const { data: deck, error } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId)
        .eq('user_id', user.id)
        .single()

      if (error || !deck) {
        return c.json({ error: 'Deck not found' }, 404)
      }

      const { data: deckCards } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('position')

      deckData = {
        name: deck.name,
        emoji: deck.emoji,
        color: deck.color,
        category: deck.category,
        subtopic: deck.subtopic,
        difficulty: deck.difficulty,
        authorName:
          user.user_metadata?.displayName ||
          user.user_metadata?.name ||
          'Anonymous',
        cards: deckCards || []
      }
    }

    const shareId = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('shared_decks')
      .insert({
        share_id: shareId,
        deck_id: deckId,
        is_community_deck: isCommunityDeck,
        deck_data: deckData,
        created_by: user.id
      })

    if (insertError) {
      return c.json({ error: 'Failed to create share link' }, 500)
    }

    return c.json({
      shareId,
      shareUrl: `/shared/${shareId}`
    })
  } catch (error) {
    console.error('Create share link error:', error)
    return c.json({ error: 'Failed to create share link' }, 500)
  }
})

// Get a shared deck by share ID
app.get('/decks/shared/:shareId', async (c: Context) => {
  try {
    const shareId = c.req.param('shareId')

    const { data, error } = await supabase
      .from('shared_decks')
      .select('share_id, deck_data, created_at')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return c.json({ error: 'Shared deck not found' }, 404)
    }

    return c.json({
      shareId: data.share_id,
      deck: data.deck_data,
      createdAt: data.created_at
    })
  } catch (error) {
    console.error('Get shared deck error:', error)
    return c.json({ error: 'Failed to fetch shared deck' }, 500)
  }
})

// ============================================================
// COMMUNITY ENDPOINTS
// ============================================================
//Add a single deck from community to personal decks
app.post('/community/add-deck', async (c: Context) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1]
    if (!token) return c.json({ error: 'Unauthorized' }, 401)

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { communityDeckId } = await c.req.json()
    if (!communityDeckId) {
      return c.json({ error: 'communityDeckId is required' }, 400)
    }

    // ------------------------------------------------------------
    // Fetch published community deck
    // ------------------------------------------------------------
    const { data: communityDeck } = await supabase
      .from('community_decks')
      .select('*')
      .eq('id', communityDeckId)
      .eq('is_published', true)
      .single()

    if (!communityDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // ------------------------------------------------------------
    // BLOCK: user already owns the original deck
    // (Scenario 1)
    // ------------------------------------------------------------
    const { data: ownsOriginal } = await supabase
      .from('decks')
      .select('id')
      .eq('id', communityDeck.original_deck_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownsOriginal) {
      return c.json(
        { error: 'You already own this deck' },
        400
      )
    }

    // ------------------------------------------------------------
    // Check existing imported deck
    // (Scenarios 4 & 5)
    // ------------------------------------------------------------
    const { data: importedDeck } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', user.id)
      .eq('source_community_deck_id', communityDeckId)
      .maybeSingle()

    // ------------------------------------------------------------
    // Fetch community cards once
    // ------------------------------------------------------------
    const { data: communityCards } = await supabase
      .from('community_cards')
      .select('*')
      .eq('community_deck_id', communityDeckId)
      .order('position')

    if (!communityCards || communityCards.length === 0) {
      return c.json({ error: 'Community deck has no cards' }, 400)
    }

    const now = new Date().toISOString()

    // ============================================================
    // UPDATE EXISTING IMPORT (Scenario 5)
    // ============================================================
    if (importedDeck) {
      if (communityDeck.version <= importedDeck.imported_from_version) {
        return c.json(
          { error: 'You already have the latest version' },
          400
        )
      }

      // Replace cards
      await supabase
        .from('cards')
        .delete()
        .eq('deck_id', importedDeck.id)

      await supabase
        .from('cards')
        .insert(
          communityCards.map((c, i) => ({
            id: crypto.randomUUID(),
            deck_id: importedDeck.id,
            front: c.front,
            back: c.back,
            card_type: c.card_type,
            options: c.options,
            accepted_answers: c.accepted_answers,
            position: i,
            created_at: now
          }))
        )

      // Update metadata + version marker
      await supabase
        .from('decks')
        .update({
          name: communityDeck.name,
          emoji: communityDeck.emoji,
          color: communityDeck.color,
          category: communityDeck.category,
          subtopic: communityDeck.subtopic,
          difficulty: communityDeck.difficulty,
          card_count: communityCards.length,
          imported_from_version: communityDeck.version,
          updated_at: now
        })
        .eq('id', importedDeck.id)

      return c.json({ updated: true, deckId: importedDeck.id })
    }

    // ============================================================
    // CREATE NEW IMPORT (Scenarios 2 & 3)
    // ============================================================
    const newDeckId = crypto.randomUUID()

    const { data, error } =
    await supabase.from('decks').insert({
      id: newDeckId,
      user_id: user.id,
      creator_id: communityDeck.owner_id,
      name: communityDeck.name,
      emoji: communityDeck.emoji,
      color: communityDeck.color,
      category: communityDeck.category,
      subtopic: communityDeck.subtopic,
      difficulty: communityDeck.difficulty,
      card_count: communityCards.length,
      is_community: true,
      is_published: true,
      source_community_deck_id: communityDeckId,
      imported_from_version: communityDeck.version,
      created_at: now
    })

    if (error) {
      console.error('DECK INSERT ERROR', error)
      return c.json({ error: error.message }, 500)
    }

    await supabase.from('cards').insert(
      communityCards.map((c, i) => ({
        id: crypto.randomUUID(),
        deck_id: newDeckId,
        front: c.front,
        back: c.back,
        card_type: c.card_type,
        options: c.options,
        accepted_answers: c.accepted_answers,
        position: i,
        created_at: now
      }))
    )

    // ============================================================
    // UPDATE DOWNLOAD COUNT
    // ============================================================
    const newDownloadCount = (communityDeck.download_count ?? 0) + 1

    await supabase
      .from('community_decks')
      .update({ download_count: newDownloadCount })
      .eq('id', communityDeckId)


        return c.json({ created: true, deckId: newDeckId })
      } catch (err) {
        console.error(err)
        return c.json({ error: 'Failed to add deck from community' }, 500)
      }
    })

// Get published community decks
app.get('/community/decks', async (c: Context) => {
  try {
    console.log(`📚 Fetching published community decks`)

    const { data: communityDecks, error } = await supabase
      .from('community_decks')
      .select(`
        *,
        community_cards (*)
      `)
      .eq('is_published', true)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching community decks:', error.message)
      return c.json({ error: 'Failed to fetch community decks' }, 500)
    }

    if (!communityDecks || communityDecks.length === 0) {
      return c.json({ decks: [] })
    }

    const decksWithCounts = await Promise.all(
      communityDecks.map(async (deck: any) => {
        // --------------------------------------------------
        // Count comments from SQL (exclude flagged)
        // --------------------------------------------------
        const { count: commentCount, error: commentError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('community_deck_id', deck.id)
          .eq('flagged', false)

        if (commentError) {
          console.warn(
            `⚠️ Failed to count comments for deck ${deck.id}`,
            commentError.message
          )
        }

        const cards = (deck.community_cards || []).map(toCamelCase)

        return {
          ...toCamelCase(deck),
          cards,
          cardCount: cards.length,
          commentCount: commentCount || 0
        }
      })
    )

    // Optional safety filter
    const validDecks = decksWithCounts.filter(d => d.cardCount > 0)

    console.log(`✅ Returning ${validDecks.length} community decks`)
    return c.json({ decks: validDecks })
  } catch (error) {
    console.error('❌ Get community decks exception:', error)
    return c.json({ error: 'Failed to fetch community decks' }, 500)
  }
})

// Get featured community decks
app.get('/community/decks/featured', async (c: Context) => {
  try {
    console.log('⭐ Fetching featured community decks')

    // ------------------------------------------------------------
    // 1. Fetch featured + published community decks
    // ------------------------------------------------------------
    const { data: decks, error } = await supabase
      .from('community_decks')
      .select('*')
      .eq('featured', true)
      .eq('is_published', true)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching featured decks:', error.message)
      return c.json(
        { error: 'Failed to fetch featured community decks' },
        500
      )
    }

    if (!decks || decks.length === 0) {
      return c.json({ decks: [] })
    }

    // ------------------------------------------------------------
    // 2. Fetch ALL cards for these decks (single query)
    // ------------------------------------------------------------
    const deckIds = decks.map(d => d.id)

    const { data: allCards, error: cardsError } = await supabase
      .from('community_cards')
      .select('*')
      .in('community_deck_id', deckIds)
      .order('position', { ascending: true })

    if (cardsError) {
      console.error('❌ Error fetching community cards:', cardsError.message)
      return c.json(
        { error: 'Failed to fetch community cards' },
        500
      )
    }

    // Group cards by deck
    const cardsByDeck: Record<string, any[]> = {}
    for (const card of allCards || []) {
      if (!cardsByDeck[card.community_deck_id]) {
        cardsByDeck[card.community_deck_id] = []
      }
      cardsByDeck[card.community_deck_id].push(toCamelCase(card))
    }

    // ------------------------------------------------------------
    // 3. Enrich decks (cards + comment count)
    // ------------------------------------------------------------
    const enrichedDecks = await Promise.all(
      decks.map(async (deck: any) => {
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('community_deck_id', deck.id)
          .eq('flagged', false)

        const cards = cardsByDeck[deck.id] || []

        return {
          ...toCamelCase(deck),
          cards,
          cardCount: cards.length,
          commentCount: commentCount ?? 0
        }
      })
    )

    // ------------------------------------------------------------
    // 4. Safety filter (no-card decks should not render)
    // ------------------------------------------------------------
    const validDecks = enrichedDecks.filter(
      d => d.cardCount > 0
    )

    console.log(`✅ Returning ${validDecks.length} featured decks`)
    return c.json({ decks: validDecks })
  } catch (error) {
    console.error('❌ Get featured community decks exception:', error)
    return c.json(
      { error: 'Failed to fetch featured community decks' },
      500
    )
  }
})

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

// Get single community deck by ID
app.get('/community/decks/:communityDeckId', async (c: Context) => {
  try {
    const communityDeckId = c.req.param('communityDeckId')
    console.log(`📖 Fetching community deck: ${communityDeckId}`)

    // ------------------------------------------------------------
    // Fetch community deck
    // ------------------------------------------------------------
    const { data: deck, error: deckError } = await supabase
      .from('community_decks')
      .select('*')
      .eq('id', communityDeckId)
      .eq('is_published', true)
      .single()

    if (deckError || !deck) {
      console.log(`❌ Community deck not found`)
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // ------------------------------------------------------------
    // Fetch community cards
    // ------------------------------------------------------------
    const { data: cards, error: cardsError } = await supabase
      .from('community_cards')
      .select('*')
      .eq('community_deck_id', communityDeckId)
      .order('position', { ascending: true })

    if (cardsError) {
      console.log(`❌ Failed to fetch community cards`)
      return c.json({ error: 'Failed to fetch deck cards' }, 500)
    }

    // ------------------------------------------------------------
    // Count comments (SQL only)
    // ------------------------------------------------------------
    const { count: commentCount, error: commentError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('community_deck_id', communityDeckId)
      .eq('flagged', false)

    if (commentError) {
      console.warn(
        `⚠️ Failed to count comments for deck ${communityDeckId}`,
        commentError.message
      )
    }

    // ------------------------------------------------------------
    // Build response
    // ------------------------------------------------------------
    const deckResponse = {
      ...toCamelCase(deck),
      cards: (cards || []).map(toCamelCase),
      cardCount: cards?.length || 0,
      commentCount: commentCount || 0,

      // Explicit author fields (from community_decks)
      ownerId: deck.owner_id,
      ownerDisplayName: deck.owner_display_name
    }

    console.log(
      `✅ Returning community deck "${deck.name}" with ${deckResponse.cardCount} cards`
    )

    return c.json({ deck: deckResponse })
  } catch (error) {
    console.error('❌ Get community deck exception:', error)
    return c.json({ error: 'Failed to fetch community deck' }, 500)
  }
})

// Update published community deck
app.put('/community/decks/:communityDeckId', async (c: Context) => {
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

    const communityDeckId = c.req.param('communityDeckId')
    const { name, emoji, color, category, subtopic, difficulty } =
      await c.req.json()

    // ------------------------------------------------------------
    // Fetch community deck
    // ------------------------------------------------------------
    const { data: communityDeck, error: communityError } = await supabase
      .from('community_decks')
      .select('*')
      .eq('id', communityDeckId)
      .eq('is_published', true)
      .single()

    if (communityError || !communityDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // ------------------------------------------------------------
    // Permission check
    // ------------------------------------------------------------
    const isOwner = communityDeck.owner_id === user.id
    const isSuperuser = user.user_metadata?.role === 'superuser'

    if (!isOwner && !isSuperuser) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    // ------------------------------------------------------------
    // Fetch source deck
    // ------------------------------------------------------------
    const { data: sourceDeck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', communityDeck.original_deck_id)
      .single()

    if (deckError || !sourceDeck) {
      return c.json({ error: 'Source deck not found' }, 404)
    }

    // ------------------------------------------------------------
    // Detect changes
    // ------------------------------------------------------------
    const metadataChanged =
      (name !== undefined && name !== communityDeck.name) ||
      (emoji !== undefined && emoji !== communityDeck.emoji) ||
      (color !== undefined && color !== communityDeck.color) ||
      (category !== undefined && category !== communityDeck.category) ||
      (subtopic !== undefined && subtopic !== communityDeck.subtopic) ||
      (difficulty !== undefined && difficulty !== communityDeck.difficulty)

    const cardsChanged =
      sourceDeck.content_updated_at &&
      (
        !communityDeck.source_content_updated_at ||
        sourceDeck.content_updated_at > communityDeck.source_content_updated_at
      )

    console.log('metadata changed?', metadataChanged)
    console.log('cards changed?', cardsChanged)
    console.log('source deck content updated at', sourceDeck.content_updated_at)
    console.log('community deck source content updated at', communityDeck.source_content_updated_at)

    const shouldRepublish = metadataChanged || cardsChanged

    if (!shouldRepublish) {
      return c.json({ error: 'No changes detected' }, 400)
    }

    const now = new Date().toISOString()

    // ------------------------------------------------------------
    // SAFETY: prepare cards FIRST if cards changed
    // ------------------------------------------------------------
    let preparedCommunityCards: any[] | null = null

    if (cardsChanged) {

      await supabase
        .from('community_decks')
        .update({
          source_content_updated_at: sourceDeck.content_updated_at
        })
        .eq('id', communityDeckId)
        
      const { data: sourceCards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', sourceDeck.id)
        .order('position', { ascending: true })

      if (cardsError) {
        return c.json({ error: 'Failed to fetch source cards' }, 500)
      }

      if (!sourceCards || sourceCards.length === 0) {
        return c.json(
          { error: 'Source deck has no cards — cannot republish' },
          400
        )
      }

      preparedCommunityCards = sourceCards.map((card, index) => ({
        community_deck_id: communityDeckId,
        front: card.front,
        back: card.back,
        card_type: card.card_type,
        correct_answer: card.correct_answer,
        incorrect_answers: card.incorrect_answers,
        accepted_answers: card.accepted_answers,
        front_image_url: card.front_image_url,
        back_image_url: card.back_image_url,
        audio_url: card.audio_url,
        position: index,
        updated_at: now
      }))
    }

    // ------------------------------------------------------------
    // Update community deck metadata
    // ------------------------------------------------------------

    const nextVersion = (communityDeck.version ?? 1) + 1
    const { error: updateDeckError } = await supabase
      .from('community_decks')
      .update({
        ...(name !== undefined && { name }),
        ...(emoji !== undefined && { emoji }),
        ...(color !== undefined && { color }),
        ...(category !== undefined && { category }),
        ...(subtopic !== undefined && { subtopic }),
        ...(difficulty !== undefined && { difficulty }),
        ...(cardsChanged && { card_count: sourceDeck.card_count }),
        updated_at: now,
        ...(cardsChanged && { source_content_updated_at: now }),
        version: nextVersion
      })
      .eq('id', communityDeckId)

    if (updateDeckError) {
      return c.json({ error: 'Failed to update community deck' }, 500)
    }

    // ------------------------------------------------------------
    // Replace community cards (SAFE)
    // ------------------------------------------------------------
    if (cardsChanged && preparedCommunityCards) {
      const { error: deleteError } = await supabase
        .from('community_cards')
        .delete()
        .eq('community_deck_id', communityDeckId)

      if (deleteError) {
        return c.json({ error: 'Failed to clear community cards' }, 500)
      }

      const { error: insertError } = await supabase
        .from('community_cards')
        .insert(preparedCommunityCards)

      if (insertError) {
        return c.json({ error: 'Failed to insert community cards' }, 500)
      }
    }

    // ------------------------------------------------------------
    // Success
    // ------------------------------------------------------------
    return c.json({
      success: true,
      metadataUpdated: metadataChanged,
      cardsUpdated: cardsChanged,
      updatedAt: now
    })
  } catch (error) {
    console.error('❌ Update community deck exception:', error)
    return c.json({ error: 'Failed to update community deck' }, 500)
  }
})

// Get download counts for deck IDs
app.post('/community/downloads', async (c: Context) => {
  try {
    const { deckIds } = await c.req.json()
    
    if (!deckIds || !Array.isArray(deckIds)) {
      console.log('❌ Invalid deck IDs provided')
      return c.json({ error: 'Invalid deck IDs' }, 400)
    }

    console.log(`📊 Fetching download counts for ${deckIds.length} decks`)

    // ============================================================
    // SQL VERSION: Get download counts efficiently with GROUP BY
    // ============================================================

    if (deckIds.length === 0) {
      return c.json({ downloads: {} })
    }

    // Query deck_downloads table and count downloads per deck
    const { data: downloadData, error: downloadError } = await supabase
      .from('deck_downloads')
      .select('deck_id')
      .in('deck_id', deckIds)

    if (downloadError) {
      console.log(`❌ Error fetching download counts: ${downloadError.message}`)
      return c.json({ error: 'Failed to fetch download counts' }, 500)
    }

    // Count downloads per deck ID
    const downloads: Record<string, number> = {}
    
    // Initialize all requested deck IDs with 0
    for (const deckId of deckIds) {
      downloads[deckId] = 0
    }

    // Count actual downloads from the data
    if (downloadData) {
      for (const record of downloadData) {
        downloads[record.deck_id] = (downloads[record.deck_id] || 0) + 1
      }
    }

    console.log(`✅ Fetched download counts for ${deckIds.length} decks`)
    
    return c.json({ downloads })
  } catch (error) {
    console.log(`❌ Get downloads exception: ${error}`)
    return c.json({ error: 'Failed to fetch download counts' }, 500)
  }
})

// Rate a deck (premium feature)
app.post('/community/decks/:communityDeckId/rate', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check subscription tier - only non-free users can rate
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.log(`❌ Error fetching user data: ${userError.message}`)
      return c.json({ error: 'Failed to verify subscription' }, 500)
    }
    
    const subscriptionTier = userData?.subscription_tier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`❌ User ${user.id} is on free tier, cannot rate decks`)
      return c.json({ error: 'Premium feature: Upgrade to rate decks' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const body = await c.req.json()
    const { rating } = body

    if (!rating || rating < 1 || rating > 5) {
      console.log(`❌ Invalid rating: ${rating}`)
      return c.json({ error: 'Rating must be between 1 and 5' }, 400)
    }

    console.log(`⭐ User ${user.id} (${subscriptionTier} tier) rating deck ${communityDeckId} with ${rating} stars`)
    
    // ============================================================
    // SCHEMA-CORRECT: UPSERT rating and calculate statistics
    // ============================================================
    
    const now = new Date().toISOString()
    const ratingId = crypto.randomUUID()
    
    // Upsert user's rating (insert or update if already exists)
    const { error: upsertError } = await supabase
      .from('ratings')  // ← CORRECT TABLE (not 'deck_ratings')
      .upsert({
        id: ratingId,
        community_deck_id: communityDeckId,  // ← CORRECT COLUMN (not 'deck_id')
        user_id: user.id,
        rating: rating,
        created_at: now,
        updated_at: now
      }, {
        onConflict: 'community_deck_id,user_id',  // ← CORRECT COLUMN
        ignoreDuplicates: false
      })
    
    if (upsertError) {
      console.log(`❌ Error upserting rating: ${upsertError.message}`)
      return c.json({ error: 'Failed to save rating' }, 500)
    }
    
    console.log(`✅ Rating saved for deck ${communityDeckId}`)
    
    // Calculate average rating and total ratings for this deck
    const { data: stats, error: statsError } = await supabase
      .from('ratings')  // ← CORRECT TABLE
      .select('rating')
      .eq('community_deck_id', communityDeckId)  // ← CORRECT COLUMN
    
    if (statsError) {
      console.log(`❌ Error fetching rating stats: ${statsError.message}`)
      return c.json({ error: 'Failed to calculate rating statistics' }, 500)
    }
    
    const totalRatings = stats?.length || 0
    const averageRating = totalRatings > 0
      ? stats.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0

    console.log(`✅ Deck ${communityDeckId} now has average rating ${averageRating.toFixed(1)} from ${totalRatings} ratings`)
    
    return c.json({ 
      message: 'Rating submitted successfully',
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      userRating: rating
    })
  } catch (error) {
    console.log(`❌ Rate deck exception: ${error}`)
    return c.json({ error: 'Failed to rate deck' }, 500)
  }
})

// Get deck ratings
app.get('/community/decks/:communityDeckId/ratings', async (c: Context) => {
  try {
    const communityDeckId = c.req.param('communityDeckId')
    
    console.log(`📊 Fetching ratings for deck ${communityDeckId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Query ratings and calculate statistics
    // ============================================================
    
    // Get all ratings for this deck
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')  // ← CORRECT TABLE (not 'deck_ratings')
      .select('rating, user_id')
      .eq('community_deck_id', communityDeckId)  // ← CORRECT COLUMN (not 'deck_id')
    
    if (ratingsError) {
      console.log(`❌ Error fetching ratings: ${ratingsError.message}`)
      return c.json({ error: 'Failed to fetch ratings' }, 500)
    }
    
    const totalRatings = ratings?.length || 0
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0
    
    console.log(`✅ Deck ${communityDeckId} has ${totalRatings} ratings with average ${averageRating.toFixed(1)}`)
    
    // Check if current user has rated (if authenticated)
    let userRating = null
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (user && !authError) {
        // Find the user's rating in the results we already fetched
        const userRatingEntry = ratings?.find(r => r.user_id === user.id)
        if (userRatingEntry) {
          userRating = userRatingEntry.rating
          console.log(`✅ User ${user.id} has rated this deck: ${userRating}`)
        }
      }
    }

    return c.json({ 
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      userRating
    })
  } catch (error) {
    console.log(`❌ Get ratings exception: ${error}`)
    return c.json({ error: 'Failed to fetch ratings' }, 500)
  }
})

// Get comments for a deck
app.get('/community/decks/:communityDeckId/comments', async (c: Context) => {
  try {
    const communityDeckId = c.req.param('communityDeckId')
    
    console.log(`💬 Fetching comments for deck ${communityDeckId}`)
    
    // ============================================================
    // SQL VERSION: Query comments and flatten nested structure
    // ============================================================
    
    // Get all non-deleted comments for this deck
    const { data: allComments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('community_deck_id', communityDeckId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (commentsError) {
      console.log(`❌ Error fetching comments: ${commentsError.message}`)
      return c.json({ error: 'Failed to fetch comments' }, 500)
    }
    
    if (!allComments || allComments.length === 0) {
      console.log(`✅ No comments found for deck ${communityDeckId}`)
      return c.json({ comments: [] })
    }
    
    console.log(`📝 Found ${allComments.length} comments for deck ${communityDeckId}`)
    
    // Build a map for quick lookup
    const commentMap = new Map()
    allComments.forEach(comment => {
      commentMap.set(comment.id, comment)
    })
    
    // Helper function to recursively collect all descendant replies
    const collectAllReplies = (commentId: string): any[] => {
      const replies: any[] = []
      
      // Find all direct children
      const directChildren = allComments.filter(c => c.parent_comment_id === commentId)
      
      for (const child of directChildren) {
        // Add this reply (without nested structure)
        replies.push({
          id: child.id,
          userId: child.user_id,
          userName: child.user_name,
          text: child.text,
          createdAt: child.created_at,
          updatedAt: child.updated_at,
          replies: [] // Flatten - no nested replies
        })
        
        // Recursively collect this reply's children
        const grandchildren = collectAllReplies(child.id)
        replies.push(...grandchildren)
      }
      
      return replies
    }
    
    // Get top-level comments (no parent)
    const topLevelComments = allComments.filter(c => !c.parent_comment_id)
    
    console.log(`📊 ${topLevelComments.length} top-level comments, flattening nested structure...`)
    
    // Build 2-level structure: top-level comments with all replies flattened
    const flattenedComments = topLevelComments.map(comment => {
      const allReplies = collectAllReplies(comment.id)
      
      // Sort replies by newest first
      allReplies.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      return {
        id: comment.id,
        userId: comment.user_id,
        userName: comment.user_name,
        text: comment.text,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        replies: allReplies
      }
    })
    
    // Top-level comments are already sorted by created_at DESC from query
    
    console.log(`✅ Returning ${flattenedComments.length} comments with flattened replies`)

    return c.json({ comments: flattenedComments })
  } catch (error) {
    console.log(`❌ Get comments exception: ${error}`)
    return c.json({ error: 'Failed to fetch comments' }, 500)
  }
})

// Post a comment OR reply on a community deck
app.post('/community/decks/:communityDeckId/comments', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const body = await c.req.json()
    const { content, parentCommentId } = body  // Changed from 'text' to 'content', 'parentId' to 'parentCommentId'

    if (!content || content.trim().length === 0) {
      console.log('❌ Empty comment content')
      return c.json({ error: 'Comment content is required' }, 400)
    }

    const userName = user.user_metadata?.name || 'Anonymous'
    const userDisplayName = user.user_metadata?.displayName || userName
    const userAvatar = user.user_metadata?.avatarUrl || null
    const now = new Date().toISOString()
    
    // ============================================================
    // SCHEMA-CORRECT: Insert into comments OR replies table
    // ============================================================
    
    if (parentCommentId) {
      // This is a REPLY - insert into replies table
      const replyId = crypto.randomUUID()
      
      console.log(`💬 User ${user.id} posting REPLY on comment ${parentCommentId}`)
      
      const { error: insertError } = await supabase
        .from('replies')  // ← CORRECT TABLE
        .insert({
          id: replyId,
          comment_id: parentCommentId,  // ← CORRECT COLUMN
          user_id: user.id,
          content: content.trim(),  // ← CORRECT COLUMN (not 'text')
          flagged: false,
          user_name: userName,
          user_display_name: userDisplayName,  // ← CORRECT COLUMN
          user_avatar: userAvatar,
          created_at: now,
          updated_at: now
        })
      
      if (insertError) {
        console.log(`❌ Error inserting reply: ${insertError.message}`)
        return c.json({ error: 'Failed to post reply' }, 500)
      }
      
      console.log(`✅ Reply ${replyId} inserted successfully`)
      
      // Notify parent comment author
      const { data: parentComment } = await supabase
        .from('comments')  // ← CORRECT TABLE
        .select('user_id, content')  // ← CORRECT COLUMN
        .eq('id', parentCommentId)
        .single()
      
      if (parentComment && parentComment.user_id !== user.id) {
        // Get deck info
        const { data: deck } = await supabase
          .from('community_decks')
          .select('name')
          .eq('id', communityDeckId)
          .single()
        
        const notificationId = crypto.randomUUID()
        await supabase.from('notifications').insert({
          id: notificationId,
          user_id: parentComment.user_id,
          type: 'comment_reply',
          message: `${userDisplayName} replied to your comment on "${deck?.name || 'a deck'}"`,
          is_read: false,  // ← CORRECT COLUMN (not 'read')
          created_at: now,
          related_user_id: user.id,
          related_deck_id: communityDeckId,
          related_comment_id: parentCommentId,
          related_reply_id: replyId,
          requester_display_name: userDisplayName,
          requester_avatar: userAvatar,
          deck_name: deck?.name || null,
          comment_text: content.trim()
        })
        
        console.log(`✅ Reply notification created for user ${parentComment.user_id}`)
      }
      
      return c.json({ 
        reply: {
          id: replyId,
          commentId: parentCommentId,
          userId: user.id,
          userName,
          userDisplayName,
          userAvatar,
          content: content.trim(),
          createdAt: now
        },
        message: 'Reply posted successfully' 
      })
      
    } else {
      // This is a TOP-LEVEL COMMENT - insert into comments table
      const commentId = crypto.randomUUID()
      
      console.log(`💬 User ${user.id} posting COMMENT on deck ${communityDeckId}`)
      
      const { error: insertError } = await supabase
        .from('comments')  // ← CORRECT TABLE
        .insert({
          id: commentId,
          community_deck_id: communityDeckId,  // ← CORRECT COLUMN (not 'deck_id')
          user_id: user.id,
          content: content.trim(),  // ← CORRECT COLUMN (not 'text')
          flagged: false,
          user_name: userName,
          user_display_name: userDisplayName,  // ← CORRECT COLUMN
          user_avatar: userAvatar,
          created_at: now,
          updated_at: now
        })
      
      if (insertError) {
        console.log(`❌ Error inserting comment: ${insertError.message}`)
        return c.json({ error: 'Failed to post comment' }, 500)
      }
      
      console.log(`✅ Comment ${commentId} inserted successfully`)
      
      // Notify deck owner
      const { data: deck } = await supabase
        .from('community_decks')
        .select('owner_id, name')  // ← CORRECT COLUMN (not 'user_id')
        .eq('id', communityDeckId)
        .single()
      
      if (deck && deck.owner_id && deck.owner_id !== user.id) {
        const notificationId = crypto.randomUUID()
        await supabase.from('notifications').insert({
          id: notificationId,
          user_id: deck.owner_id,
          type: 'deck_comment',
          message: `${userDisplayName} commented on your deck "${deck.name}"`,
          is_read: false,  // ← CORRECT COLUMN
          created_at: now,
          related_user_id: user.id,
          related_deck_id: communityDeckId,
          related_comment_id: commentId,
          requester_display_name: userDisplayName,
          requester_avatar: userAvatar,
          deck_name: deck.name,
          comment_text: content.trim()
        })
        
        console.log(`✅ Comment notification created for deck owner ${deck.owner_id}`)
      }
      
      return c.json({ 
        comment: {
          id: commentId,
          communityDeckId,
          userId: user.id,
          userName,
          userDisplayName,
          userAvatar,
          content: content.trim(),
          createdAt: now,
          replies: []
        },
        message: 'Comment posted successfully' 
      })
    }
    
  } catch (error) {
    console.log(`❌ Post comment/reply exception: ${error}`)
    return c.json({ error: 'Failed to post comment/reply' }, 500)
  }
})

// Like/unlike a comment or reply
app.post('/community/decks/:communityDeckId/comments/:commentId/like', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const commentId = c.req.param('commentId')

    console.log(`👍 User ${user.id} toggling like on comment/reply ${commentId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Toggle like in comment_likes table
    // ============================================================
    
    const now = new Date().toISOString()
    
    // Check if like already exists
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (checkError) {
      console.log(`❌ Error checking like: ${checkError.message}`)
      return c.json({ error: 'Failed to process like' }, 500)
    }
    
    const alreadyLiked = !!existingLike
    
    if (alreadyLiked) {
      // Unlike - remove the like
      console.log(`👎 Removing like (unlike)`)
      
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
      
      if (deleteError) {
        console.log(`❌ Error removing like: ${deleteError.message}`)
        return c.json({ error: 'Failed to unlike comment' }, 500)
      }
      
      console.log(`✅ Like removed`)
      return c.json({ success: true, liked: false })
    } else {
      // Like - add the like
      console.log(`👍 Adding like`)
      
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          created_at: now
        })
      
      if (insertError) {
        console.log(`❌ Error adding like: ${insertError.message}`)
        return c.json({ error: 'Failed to like comment' }, 500)
      }
      
      console.log(`✅ Like added`)
      
      // Try to find the comment or reply to notify the author
      let authorId: string | null = null
      let isComment = false
      
      // Check if it's a comment
      const { data: comment } = await supabase
        .from('comments')  // ← CORRECT TABLE
        .select('user_id, community_deck_id')  // ← CORRECT COLUMN
        .eq('id', commentId)
        .eq('community_deck_id', communityDeckId)  // ← CORRECT COLUMN
        .maybeSingle()
      
      if (comment) {
        authorId = comment.user_id
        isComment = true
      } else {
        // Check if it's a reply
        const { data: reply } = await supabase
          .from('replies')  // ← CORRECT TABLE
          .select('user_id, comment_id')
          .eq('id', commentId)
          .maybeSingle()
        
        if (reply) {
          // Verify it belongs to this deck via its parent comment
          const { data: parentComment } = await supabase
            .from('comments')
            .select('community_deck_id')
            .eq('id', reply.comment_id)
            .maybeSingle()
          
          if (parentComment?.community_deck_id === communityDeckId) {
            authorId = reply.user_id
            isComment = false
          }
        }
      }
      
      // Notify the author (only if not their own comment/reply)
      if (authorId && authorId !== user.id) {
        console.log(`📬 Notifying ${isComment ? 'comment' : 'reply'} author ${authorId}`)
        
        // Get deck info
        const { data: deck } = await supabase
          .from('community_decks')
          .select('name')
          .eq('id', communityDeckId)
          .single()
        
        const deckName = deck?.name || 'a deck'
        const userDisplayName = user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous'
        const userAvatar = user.user_metadata?.avatarUrl || null
        
        const notificationId = crypto.randomUUID()
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            id: notificationId,
            user_id: authorId,
            type: 'comment_like',
            message: `${userDisplayName} liked your ${isComment ? 'comment' : 'reply'} on "${deckName}"`,  // ← CORRECT FIELD (required)
            is_read: false,  // ← CORRECT COLUMN (not 'read')
            created_at: now,
            related_user_id: user.id,  // ← CORRECT COLUMN (not 'from_user_id')
            related_deck_id: communityDeckId,
            related_comment_id: commentId,
            requester_display_name: userDisplayName,  // ← CORRECT COLUMN (not 'from_user_name')
            requester_avatar: userAvatar,  // ← CORRECT COLUMN (not 'from_user_avatar')
            deck_name: deckName
          })
        
        if (notifError) {
          console.log(`⚠️ Warning: Failed to create notification: ${notifError.message}`)
          // Don't fail the operation if notification fails
        } else {
          console.log(`✅ Notification sent to author`)
        }
      }
      
      return c.json({ success: true, liked: true })
    }
  } catch (error) {
    console.log(`❌ Like comment exception: ${error}`)
    return c.json({ error: 'Failed to like comment' }, 500)
  }
})

// ============================================================
// MODERATION ENDPOINTS
// ============================================================

// Create a new flag (report content)
app.post('/moderation/flags', async (c) => {
  try {
    // ============================================================
    // AUTH
    // ============================================================
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } =
      await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { targetType, targetId, reason, description } = await c.req.json()

    if (!targetType || !targetId || !reason) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const validTargetTypes = ['deck', 'card', 'comment', 'reply', 'user']
    if (!validTargetTypes.includes(targetType)) {
      return c.json({ error: 'Invalid targetType' }, 400)
    }

    const validReasons = [
      'inappropriate',
      'spam',
      'harassment',
      'misinformation',
      'copyright',
      'other'
    ]
    if (!validReasons.includes(reason)) {
      return c.json({ error: 'Invalid reason' }, 400)
    }

    // ============================================================
    // PREVENT DUPLICATE FLAGS
    // ============================================================
    const { data: existingFlag } = await supabase
      .from('flags')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle()

    if (existingFlag) {
      return c.json({ error: 'You have already flagged this item' }, 400)
    }

    // ============================================================
    // RESOLVE TARGET OWNER + CONTENT
    // ============================================================
    let targetOwnerId: string | null = null
    let targetOwnerName: string | null = null
    let targetContent: string | null = null
    let relatedDeckId: string | null = null

    if (targetType === 'deck') {
      const { data } = await supabase
        .from('community_decks')
        .select('id, name, owner_id, owner_display_name')
        .eq('id', targetId)
        .single()

      if (!data) return c.json({ error: 'Deck not found' }, 404)

      targetOwnerId = data.owner_id
      targetOwnerName = data.owner_display_name
      targetContent = data.name
      relatedDeckId = data.id
    }

    if (targetType === 'card') {
      const { data } = await supabase
        .from('community_cards')
        .select('id, front, community_deck_id')
        .eq('id', targetId)
        .single()

      if (!data) return c.json({ error: 'Card not found' }, 404)

      targetContent = data.front
      relatedDeckId = data.community_deck_id

      const { data: deck } = await supabase
        .from('community_decks')
        .select('owner_id, owner_display_name')
        .eq('id', data.community_deck_id)
        .single()

      targetOwnerId = deck?.owner_id || null
      targetOwnerName = deck?.owner_display_name || null
    }

    if (targetType === 'comment') {
      const { data } = await supabase
        .from('comments')
        .select('id, user_id, user_display_name, content, community_deck_id')
        .eq('id', targetId)
        .single()

      if (!data) return c.json({ error: 'Comment not found' }, 404)

      targetOwnerId = data.user_id
      targetOwnerName = data.user_display_name
      targetContent = data.content
      relatedDeckId = data.community_deck_id
    }

    if (targetType === 'reply') {
      const { data } = await supabase
        .from('replies')
        .select('id, user_id, user_display_name, content, comment_id')
        .eq('id', targetId)
        .single()

      if (!data) return c.json({ error: 'Reply not found' }, 404)

      targetOwnerId = data.user_id
      targetOwnerName = data.user_display_name
      targetContent = data.content

      const { data: parent } = await supabase
        .from('comments')
        .select('community_deck_id')
        .eq('id', data.comment_id)
        .single()

      relatedDeckId = parent?.community_deck_id || null
    }

    if (targetType === 'user') {
      const { data } = await supabase.auth.admin.getUserById(targetId)
      if (!data?.user) return c.json({ error: 'User not found' }, 404)

      targetOwnerId = targetId
      targetOwnerName =
        data.user.user_metadata?.displayName ||
        data.user.user_metadata?.name ||
        data.user.email
      targetContent = 'User profile'
    }

    // ============================================================
    // CREATE FLAG
    // ============================================================
    const now = new Date().toISOString()
    const reporterName =
      user.user_metadata?.displayName ||
      user.user_metadata?.name ||
      user.email

    const severity =
      ['harassment', 'copyright', 'misinformation'].includes(reason)
        ? 'high'
        : 'medium'

    const { data: flag, error: flagError } = await supabase
      .from('flags')
      .insert({
        reporter_id: user.id,
        reporter_name: reporterName,
        target_type: targetType,
        target_id: targetId,
        target_owner_id: targetOwnerId,
        target_owner_name: targetOwnerName,
        target_content: targetContent,
        reason,
        description: description || '',
        severity,
        status: 'open',
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (flagError) {
      return c.json({ error: 'Failed to create flag' }, 500)
    }

    // ============================================================
    // MARK CONTENT AS FLAGGED
    // ============================================================
    if (targetType === 'deck') {
      await supabase.from('community_decks').update({ is_flagged: true }).eq('id', targetId)
    }
    if (targetType === 'card') {
      await supabase.from('community_cards').update({ is_flagged: true }).eq('id', targetId)
    }
    if (targetType === 'comment') {
      await supabase.from('comments').update({ is_flagged: true }).eq('id', targetId)
    }
    if (targetType === 'reply') {
      await supabase.from('replies').update({ is_flagged: true }).eq('id', targetId)
    }
    if (targetType === 'user') {
      await supabase.from('users').update({ is_reported: true }).eq('id', targetId)
    }

    // ============================================================
    // CREATE TICKET
    // ============================================================
    await supabase.from('tickets').insert({
      id: crypto.randomUUID(),
      title: `${reason} report`,
      description: targetContent,
      category: 'content_violation',
      priority: 'medium',
      status: 'open',
      related_flag_id: flag.id,
      related_deck_id: relatedDeckId,
      created_by: user.id,
      created_at: now,
      updated_at: now
    })

    // ============================================================
    // NOTIFY OWNER
    // ============================================================
    if (targetOwnerId && targetOwnerId !== user.id) {
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: targetOwnerId,
        type: 'content_flagged',
        message: `${reporterName} reported your content`,
        is_read: false,
        created_at: now,
        related_user_id: user.id,
        related_deck_id: relatedDeckId,
        related_comment_id: targetType === 'comment' ? targetId : null,
        related_reply_id: targetType === 'reply' ? targetId : null,
        requester_display_name: reporterName,
        comment_text: targetContent
      })
    }

    return c.json({ success: true, flag })
  } catch (err) {
    console.error('❌ Create flag exception', err)
    return c.json({ error: 'Failed to create flag' }, 500)
  }
})

// Get all flags with filters (Moderator / Superuser only)
app.get('/moderation/flags', async (c: Context) => {
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

    // ------------------------------------------------------------
    // Role check
    // ------------------------------------------------------------
    const { data: roleData } = await supabase
      .from('users')
      .select('is_superuser, is_moderator')
      .eq('id', user.id)
      .single()

    if (!roleData?.is_superuser && !roleData?.is_moderator) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    // ------------------------------------------------------------
    // Filters
    // ------------------------------------------------------------
    const statusFilter = c.req.query('status')
    const targetTypeFilter = c.req.query('targetType')
    const escalatedFilter = c.req.query('escalated') === 'true'
    const flashyFilter = c.req.query('flashy') === 'true'

    // ------------------------------------------------------------
    // Build SQL query
    // ------------------------------------------------------------
    let query = supabase
      .from('flags')
      .select('*')

    if (escalatedFilter) {
      query = query.eq('is_escalated', true)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (targetTypeFilter) {
      query = query.eq('target_type', targetTypeFilter)
    }

    query = query.order('created_at', { ascending: false })

    const { data: flagsData, error: flagsError } = await query

    if (flagsError) {
      return c.json({ error: 'Failed to fetch flags' }, 500)
    }

    // ------------------------------------------------------------
    // Apply Flashy filter (content author)
    // ------------------------------------------------------------
    let filteredFlags = flagsData || []

    if (flashyFilter) {
      filteredFlags = filteredFlags.filter(flag =>
        flag.target_owner_name?.toLowerCase() === 'flashy'
      )
    }

    // ------------------------------------------------------------
    // Format response
    // ------------------------------------------------------------
    const flags = filteredFlags.map(flag => ({
      id: flag.id,

      reporterId: flag.reporter_id,
      reporterName: flag.reporter_name,

      targetType: flag.target_type,
      targetId: flag.target_id,
      targetContent: flag.target_content,
      targetOwnerId: flag.target_owner_id,
      targetOwnerName: flag.target_owner_name,

      reason: flag.reason,
      description: flag.description,
      severity: flag.severity,
      status: flag.status,
      isEscalated: flag.is_escalated,

      createdAt: flag.created_at,
      updatedAt: flag.updated_at
    }))

    return c.json({ flags })
  } catch (error) {
    console.error('❌ Get flags exception:', error)
    return c.json({ error: 'Failed to fetch flags' }, 500)
  }
})

// Update flag status (Moderator/Superuser only)
app.patch('/moderation/flags/:flagId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL VERSION: Check if user is superuser or moderator
    // ============================================================
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_superuser, is_moderator')
      .eq('id', user.id)
      .single()

    const isSuperuser = userData?.is_superuser === true
    const isModerator = userData?.is_moderator === true
    
    if (!isSuperuser && !isModerator) {
      console.log(`❌ Forbidden access attempt by user ${user.id} - not a moderator or superuser`)
      return c.json({ error: 'Forbidden - Moderator or Superuser access required' }, 403)
    }

    const flagId = c.req.param('flagId')
    const { status, resolutionReason, moderatorNotes } = await c.req.json()
    
    console.log(`🔧 Updating flag ${flagId} - new status: ${status}`)
    
    if (!['open', 'reviewing', 'resolved'].includes(status)) {
      console.log(`❌ Invalid status: ${status}`)
      return c.json({ error: 'Invalid status' }, 400)
    }
    
    // Validate resolutionReason if status is resolved
    if (status === 'resolved' && resolutionReason && !['approved', 'rejected', 'removed'].includes(resolutionReason)) {
      console.log(`❌ Invalid resolution reason: ${resolutionReason}`)
      return c.json({ error: 'Invalid resolution reason. Must be: approved, rejected, or removed' }, 400)
    }
    
    // ============================================================
    // SQL VERSION: Get flag from database
    // ============================================================
    
    const { data: flagData, error: flagError } = await supabase
      .from('flags')
      .select('*')
      .eq('id', flagId)
      .single()
    
    if (flagError || !flagData) {
      console.log(`❌ Flag not found: ${flagId}`)
      return c.json({ error: 'Flag not found' }, 404)
    }
    
    const oldStatus = flagData.status
    const oldReviewingBy = flagData.reviewing_by
    
    // Get moderator name
    const moderatorName = user.user_metadata?.displayName || user.user_metadata?.name || user.email || 'Unknown'
    
    // Prepare update data
    const now = new Date().toISOString()
    const updateData: any = {
      status,
      moderator_notes: moderatorNotes || flagData.moderator_notes || null,
    }
    
    // Set resolved fields if status is resolved
    if (status === 'resolved') {
      updateData.resolved_at = now
      updateData.resolution_reason = resolutionReason || null
      updateData.resolved_by = user.id
      updateData.resolved_by_name = moderatorName
    } else {
      updateData.resolved_at = null
      updateData.resolution_reason = null
      updateData.resolved_by = null
      updateData.resolved_by_name = null
    }
    
    // Set reviewing fields based on status
    if (status === 'reviewing') {
      // Auto-assign to current user when status changes to 'reviewing'
      updateData.reviewing_by = user.id
      updateData.reviewing_by_name = moderatorName
    } else if (status === 'open') {
      // Reset assignment when status changes to 'open'
      updateData.reviewing_by = null
      updateData.reviewing_by_name = null
    } else {
      // Keep existing values for other statuses
      updateData.reviewing_by = flagData.reviewing_by
      updateData.reviewing_by_name = flagData.reviewing_by_name
    }
    
    // ============================================================
    // SQL VERSION: Update flag in database
    // ============================================================
    
    const { data: updatedFlagData, error: updateError } = await supabase
      .from('flags')
      .update(updateData)
      .eq('id', flagId)
      .select()
      .single()
    
    if (updateError) {
      console.log(`❌ Error updating flag: ${updateError.message}`)
      return c.json({ error: 'Failed to update flag' }, 500)
    }
    
    console.log(`✅ Updated flag ${flagId} status to ${status}`)
    
    // ============================================================
    // SQL VERSION: Create flag action records
    // ============================================================
    
    const actionsToInsert: any[] = []
    
    // Create status change action if status changed
    if (oldStatus !== status) {
      actionsToInsert.push({
        id: crypto.randomUUID(),
        flag_id: flagId,
        action_type: 'status_change',
        performed_by: moderatorName,
        performed_by_id: user.id,
        timestamp: now,
        details: {
          oldValue: oldStatus,
          newValue: status
        }
      })
    }
    
    // Create assignment action if status changed to 'reviewing' and assignee changed
    if (status === 'reviewing' && oldReviewingBy !== user.id) {
      actionsToInsert.push({
        id: crypto.randomUUID(),
        flag_id: flagId,
        action_type: 'assignment',
        performed_by: moderatorName,
        performed_by_id: user.id,
        timestamp: now,
        details: {
          assignedTo: moderatorName,
          assignedToId: user.id
        }
      })
    }
    
    // Create unassignment action if status changed from 'reviewing' to 'open'
    if (oldStatus === 'reviewing' && status === 'open' && oldReviewingBy) {
      actionsToInsert.push({
        id: crypto.randomUUID(),
        flag_id: flagId,
        action_type: 'unassignment',
        performed_by: moderatorName,
        performed_by_id: user.id,
        timestamp: now,
        details: {
          previouslyAssignedTo: flagData.reviewing_by_name
        }
      })
    }
    
    // Insert actions if any
    if (actionsToInsert.length > 0) {
      const { error: actionsError } = await supabase
        .from('flag_actions')
        .insert(actionsToInsert)
      
      if (actionsError) {
        console.log(`⚠️ Warning: Failed to create flag actions: ${actionsError.message}`)
        // Don't fail the request if action logging fails
      } else {
        console.log(`✅ Created ${actionsToInsert.length} flag action(s)`)
      }
    }
    
    // Convert to camelCase for response
    const updatedFlag = {
      id: updatedFlagData.id,
      reporterId: updatedFlagData.reporter_id,
      targetType: updatedFlagData.target_type,
      targetId: updatedFlagData.target_id,
      targetDetails: updatedFlagData.target_details,
      reason: updatedFlagData.reason,
      notes: updatedFlagData.notes,
      status: updatedFlagData.status,
      createdAt: updatedFlagData.created_at,
      resolvedAt: updatedFlagData.resolved_at,
      resolutionReason: updatedFlagData.resolution_reason,
      moderatorNotes: updatedFlagData.moderator_notes,
      resolvedBy: updatedFlagData.resolved_by,
      resolvedByName: updatedFlagData.resolved_by_name,
      reviewingBy: updatedFlagData.reviewing_by,
      reviewingByName: updatedFlagData.reviewing_by_name,
      isEscalated: updatedFlagData.is_escalated
    }
    
    return c.json({ message: 'Flag updated successfully', flag: updatedFlag })
  } catch (error) {
    console.log(`❌ Update flag exception: ${error}`)
    return c.json({ error: 'Failed to update flag' }, 500)
  }
})

// Escalate flag (Moderator only)
app.post('/moderation/flags/:flagId/escalate', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL VERSION: Check if user is moderator
    // ============================================================
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_moderator')
      .eq('id', user.id)
      .single()

    const isModerator = userData?.is_moderator === true
    
    if (!isModerator) {
      console.log(`❌ Forbidden access attempt by user ${user.id} - not a moderator`)
      return c.json({ error: 'Forbidden - Moderator access required' }, 403)
    }

    const flagId = c.req.param('flagId')
    
    console.log(`🔧 Escalating flag ${flagId}`)
    
    // ============================================================
    // SQL VERSION: Get flag from database
    // ============================================================
    
    const { data: flagData, error: flagError } = await supabase
      .from('flags')
      .select('*')
      .eq('id', flagId)
      .single()
    
    if (flagError || !flagData) {
      console.log(`❌ Flag not found: ${flagId}`)
      return c.json({ error: 'Flag not found' }, 404)
    }
    
    // Check if flag is already escalated
    if (flagData.is_escalated) {
      console.log(`❌ Flag ${flagId} is already escalated`)
      return c.json({ error: 'Flag is already escalated' }, 400)
    }
    
    // Get moderator name
    const moderatorName = user.user_metadata?.displayName || user.user_metadata?.name || user.email || 'Unknown'
    
    // Prepare update data
    const now = new Date().toISOString()
    const updateData: any = {
      is_escalated: true,
      escalated_by: user.id,
      escalated_by_name: moderatorName,
      escalated_at: now
    }
    
    // ============================================================
    // SQL VERSION: Update flag in database
    // ============================================================
    
    const { data: updatedFlagData, error: updateError } = await supabase
      .from('flags')
      .update(updateData)
      .eq('id', flagId)
      .select()
      .single()
    
    if (updateError) {
      console.log(`❌ Error updating flag: ${updateError.message}`)
      return c.json({ error: 'Failed to update flag' }, 500)
    }
    
    console.log(`✅ Escalated flag ${flagId}`)
    
    // ============================================================
    // SQL VERSION: Create flag action records
    // ============================================================
    
    const actionsToInsert: any[] = []
    
    // Create escalation action
    actionsToInsert.push({
      id: crypto.randomUUID(),
      flag_id: flagId,
      action_type: 'escalation',
      performed_by: moderatorName,
      performed_by_id: user.id,
      timestamp: now,
      details: {
        escalatedBy: moderatorName,
        escalatedById: user.id
      }
    })
    
    // Insert actions if any
    if (actionsToInsert.length > 0) {
      const { error: actionsError } = await supabase
        .from('flag_actions')
        .insert(actionsToInsert)
      
      if (actionsError) {
        console.log(`⚠️ Warning: Failed to create flag actions: ${actionsError.message}`)
        // Don't fail the request if action logging fails
      } else {
        console.log(`✅ Created ${actionsToInsert.length} flag action(s)`)
      }
    }
    
    // Convert to camelCase for response
    const updatedFlag = {
      id: updatedFlagData.id,
      reporterId: updatedFlagData.reporter_id,
      targetType: updatedFlagData.target_type,
      targetId: updatedFlagData.target_id,
      targetDetails: updatedFlagData.target_details,
      reason: updatedFlagData.reason,
      notes: updatedFlagData.notes,
      status: updatedFlagData.status,
      createdAt: updatedFlagData.created_at,
      resolvedAt: updatedFlagData.resolved_at,
      resolutionReason: updatedFlagData.resolution_reason,
      moderatorNotes: updatedFlagData.moderator_notes,
      resolvedBy: updatedFlagData.resolved_by,
      resolvedByName: updatedFlagData.resolved_by_name,
      reviewingBy: updatedFlagData.reviewing_by,
      reviewingByName: updatedFlagData.reviewing_by_name,
      isEscalated: updatedFlagData.is_escalated,
      escalatedBy: updatedFlagData.escalated_by,
      escalatedByName: updatedFlagData.escalated_by_name,
      escalatedAt: updatedFlagData.escalated_at
    }
    
    return c.json({ message: 'Flag escalated successfully', flag: updatedFlag })
  } catch (error) {
    console.log(`❌ Escalate flag exception: ${error}`)
    return c.json({ error: 'Failed to escalate flag' }, 500)
  }
})

// Delete a comment (Moderator/Superuser only)
app.delete('/moderation/decks/:communityDeckId/comments/:commentId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

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
    
    const isModerator = userData?.is_moderator === true
    const isSuperuser = userData?.is_superuser === true
    
    if (!isModerator && !isSuperuser) {
      console.log(`❌ User ${user.id} is not authorized to delete comments (mod: ${isModerator}, super: ${isSuperuser})`)
      return c.json({ error: 'Only moderators and superusers can delete comments' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const commentId = c.req.param('commentId')
    
    // Parse body safely (DELETE requests may not have a body)
    let body: any = {}
    try {
      body = await c.req.json()
    } catch (e) {
      console.log('⚠️ No JSON body provided, using default reason')
    }
    
    const { reason, additionalDetails } = body

    if (!reason || reason.trim().length === 0) {
      console.log('❌ Missing deletion reason')
      return c.json({ error: 'Deletion reason is required' }, 400)
    }
    
    // Combine reason and additional details for full deletion reason (for user notifications)
    const fullReason = additionalDetails && additionalDetails.trim().length > 0
      ? `${reason.trim()} - ${additionalDetails.trim()}`
      : reason.trim()

    console.log(`🗑️ ${isSuperuser ? 'Superuser' : 'Moderator'} ${user.id} deleting comment ${commentId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Set is_deleted and create records
    // ============================================================
    
    const now = new Date().toISOString()
    const deletedByName = user.user_metadata?.displayName || user.user_metadata?.name || 'Moderator'
    
    // First, check if this is a comment or a reply
    let isComment = false
    let isReply = false
    let itemData: any = null
    
    // Try to find as a comment first
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('user_id, user_name, content, community_deck_id')
      .eq('id', commentId)
      .eq('community_deck_id', communityDeckId)
      .maybeSingle()
    
    if (comment) {
      isComment = true
      itemData = comment
      console.log(`📝 Found COMMENT by ${comment.user_name} (${comment.user_id})`)
    } else {
      // Try to find as a reply
      const { data: reply, error: replyError } = await supabase
        .from('replies')
        .select('user_id, user_name, content, comment_id')
        .eq('id', commentId)
        .maybeSingle()
      
      if (reply) {
        // Verify the reply belongs to a comment on this deck
        const { data: parentComment } = await supabase
          .from('comments')
          .select('community_deck_id')
          .eq('id', reply.comment_id)
          .maybeSingle()
        
        if (parentComment?.community_deck_id === communityDeckId) {
          isReply = true
          itemData = reply
          console.log(`📝 Found REPLY by ${reply.user_name} (${reply.user_id})`)
        }
      }
    }
    
    if (!itemData) {
      console.log(`❌ Comment or reply not found`)
      return c.json({ error: 'Comment or reply not found' }, 404)
    }
    
    // Get deck name for logging
    const { data: deck } = await supabase
      .from('community_decks')
      .select('name')
      .eq('id', communityDeckId)
      .single()
    
    const deckName = deck?.name || 'Unknown Deck'
    
    // Set is_deleted = true (soft delete)
    const tableName = isComment ? 'comments' : 'replies'
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        is_deleted: true,
        deleted_at: now,
        updated_at: now
      })
      .eq('id', commentId)
    
    if (updateError) {
      console.log(`❌ Error soft deleting ${isComment ? 'comment' : 'reply'}: ${updateError.message}`)
      return c.json({ error: `Failed to delete ${isComment ? 'comment' : 'reply'}` }, 500)
    }
    
    console.log(`✅ ${isComment ? 'Comment' : 'Reply'} soft deleted (is_deleted = true)`)
    
    // Create moderation action log with separated reason and additional_details
    const actionId = crypto.randomUUID()
    const { error: logError } = await supabase
      .from('moderation_actions')
      .insert({
        id: actionId,
        moderator_id: user.id,
        moderator_name: deletedByName,
        action_type: isComment ? 'delete_comment' : 'delete_reply',
        target_type: isComment ? 'comment' : 'reply',
        target_id: commentId,
        reason: reason.trim(),
        additional_details: additionalDetails?.trim() || null,
        metadata: {
          community_deck_id: communityDeckId,
          deck_name: deckName,
          original_user_id: itemData.user_id,
          original_author_name: itemData.user_name,
          content_preview: itemData.content?.substring(0, 200) // First 200 chars for reference
        },
        created_at: now
      })
    
    if (logError) {
      console.log(`⚠️ Warning: Failed to log moderation action: ${logError.message}`)
      // Don't fail the operation if logging fails
    } else {
      console.log(`📋 Logged moderation action to moderation_actions table`)
    }
    
    // Notify the comment/reply author
    if (itemData.user_id && itemData.user_id !== user.id) {
      console.log(`📬 Notifying ${isComment ? 'comment' : 'reply'} author ${itemData.user_id}`)
      
      const notificationId = crypto.randomUUID()
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: itemData.user_id,
          type: isComment ? 'comment_deleted' : 'reply_deleted',
          message: `Your ${isComment ? 'comment' : 'reply'} on "${deckName}" was removed by a moderator: ${fullReason}`,
          is_read: false,
          created_at: now,
          related_deck_id: communityDeckId,
          related_comment_id: isComment ? commentId : itemData.comment_id,
          related_reply_id: isReply ? commentId : null,
          deck_name: deckName,
          comment_text: itemData.content
        })
      
      if (notifError) {
        console.log(`⚠️ Warning: Failed to create notification: ${notifError.message}`)
        // Don't fail the operation if notification fails
      } else {
        console.log(`✅ Notification sent to author`)
      }
    }
    
    console.log(`✅ ${isComment ? 'Comment' : 'Reply'} ${commentId} deleted by ${user.email} for reason: ${fullReason}`)
    
    return c.json({ 
      success: true, 
      message: `${isComment ? 'Comment' : 'Reply'} deleted successfully`,
      deletedType: isComment ? 'comment' : 'reply'
    })
  } catch (error) {
    console.log(`❌ Delete comment exception: ${error}`)
    return c.json({ error: 'Failed to delete comment' }, 500)
  }
})

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
    const { userId, flagId, reason, customReason, message, timeToResolve, targetType, targetId, targetName } = body

    if (!userId || !reason || !timeToResolve) {
      console.log('❌ Missing required fields for warning creation')
      return c.json({ error: 'Missing required fields' }, 400)
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
          flag_id: flagId
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
        targetName: targetName
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

    console.log(`✅ Warning ${warningId} created by ${moderatorName} for user ${userId}`)
    
    return c.json({ success: true, warningId, warning: createdWarning })

  } catch (error) {
    console.log(`❌ Create warning error: ${error}`)
    console.error('Create warning error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: `Failed to create warning: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500)
  }
})

// ============================================================
// FRIENDS ENDPOINTS
// ============================================================

// Get current user's friends list
app.get('/friends', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = user.id
    
    console.log(`🔍 Fetching friends for user ${userId}`)
    
    // ============================================================
    // SQL VERSION: Query friend_requests with status='accepted'
    // ============================================================
    
    const { data: friendsData, error: friendsError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('status', 'accepted')
    
    if (friendsError) {
      console.log(`❌ Error fetching friends: ${friendsError.message}`)
      return c.json({ error: 'Failed to fetch friends' }, 500)
    }
    
    console.log(`📊 Fetched ${friendsData?.length || 0} friends from database`)
    
    // ============================================================
    // Enrich friends with user information
    // ============================================================
    
    const enrichedFriends = await Promise.all(
      (friendsData || []).map(async (friendRow: any) => {
        // Determine the friend's user ID
        const friendId = friendRow.sender_id === userId ? friendRow.recipient_id : friendRow.sender_id
        
        // Get friend info from Supabase Auth
        try {
          const { data: friendUserData, error: friendError } = await supabase.auth.admin.getUserById(friendId)
          if (!friendError && friendUserData?.user) {
            return {
              id: friendUserData.user.id,
              email: friendUserData.user.email,
              name: friendUserData.user.user_metadata?.name || '',
              displayName: friendUserData.user.user_metadata?.displayName || friendUserData.user.user_metadata?.name || '',
              avatarUrl: friendUserData.user.user_metadata?.avatarUrl,
              decksPublic: friendUserData.user.user_metadata?.decksPublic ?? true,
            }
          }
        } catch (err) {
          console.log(`⚠️ Error fetching friend ${friendId}:`, err)
          // Skip this friend if there's an error
        }
        return null
      })
    )
    
    // Filter out null values (failed lookups)
    const validFriends = enrichedFriends.filter(Boolean)
    
    console.log(`✅ getFriends - returning ${validFriends.length} friends with details`)
    
    return c.json({ friends: validFriends })
  } catch (error) {
    console.log(`❌ Get friends exception: ${error}`)
    return c.json({ error: 'Failed to fetch friends' }, 500)
  }
})

// Get friend requests
app.get('/friends/requests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = user.id
    
    console.log(`🔍 Fetching friend requests for user ${userId}`)
    
    // ============================================================
    // SQL VERSION: Query friend requests
    // ============================================================
    
    const { data: requestsData, error: requestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
    
    if (requestsError) {
      console.log(`❌ Error fetching friend requests: ${requestsError.message}`)
      return c.json({ error: 'Failed to fetch friend requests' }, 500)
    }
    
    console.log(`📊 Fetched ${requestsData?.length || 0} friend requests from database`)
    
    // ============================================================
    // Enrich friend requests with user information
    // ============================================================
    
    const requestsWithDetails = []
    for (const requestRow of requestsData || []) {
      try {
        const { data: requestUser, error: requestError } = await supabase.auth.admin.getUserById(requestRow.sender_id)
        if (!requestError && requestUser) {
          requestsWithDetails.push({
            id: requestUser.user.id,
            email: requestUser.user.email,
            name: requestUser.user.user_metadata?.name || '',
            displayName: requestUser.user.user_metadata?.displayName || requestUser.user.user_metadata?.name || '',
            avatarUrl: requestUser.user.user_metadata?.avatarUrl,
          })
        }
      } catch (err) {
        console.log(`⚠️ Error fetching request user ${requestRow.sender_id}:`, err)
        // Skip this request if there's an error
      }
    }
    
    console.log(`✅ getFriendRequests - returning ${requestsWithDetails.length} friend requests with details`)
    
    return c.json({ requests: requestsWithDetails })
  } catch (error) {
    console.log(`❌ Get friend requests exception: ${error}`)
    return c.json({ error: 'Failed to fetch friend requests' }, 500)
  }
})

// Add friend (accept friend request) (legacy - delete)
app.post('/friends/:friendId', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    const userId = user.id
    
    console.log(`🤝 User ${userId} accepting friend request from ${friendId}`)
    
    // ============================================================
    // SQL VERSION: Create friendship and remove friend request
    // ============================================================
    
    // Check if friendship already exists
    const { data: existingFriendship, error: checkError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .limit(1)
    
    if (checkError) {
      console.log(`❌ Error checking existing friendship: ${checkError.message}`)
      return c.json({ error: 'Failed to add friend' }, 500)
    }
    
    // Only create friendship if it doesn't exist
    if (!existingFriendship || existingFriendship.length === 0) {
      const now = new Date().toISOString()
      
      // Insert friendship (bidirectional - insert both directions for simplicity)
      const { error: insertError } = await supabase
        .from('friends')
        .insert([
          {
            id: crypto.randomUUID(),
            user_id: userId,
            friend_id: friendId,
            created_at: now
          },
          {
            id: crypto.randomUUID(),
            user_id: friendId,
            friend_id: userId,
            created_at: now
          }
        ])
      
      if (insertError) {
        console.log(`❌ Error creating friendship: ${insertError.message}`)
        return c.json({ error: 'Failed to add friend' }, 500)
      }
      
      console.log(`✅ Created friendship between ${userId} and ${friendId}`)
    } else {
      console.log(`ℹ️ Friendship already exists between ${userId} and ${friendId}`)
    }
    
    // Remove friend request if it exists
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('sender_id', friendId)
      .eq('recipient_id', userId)
    
    if (deleteError) {
      console.log(`⚠️ Warning: Failed to delete friend request: ${deleteError.message}`)
      // Don't fail the request if friend request deletion fails
    } else {
      console.log(`✅ Removed friend request from ${friendId} to ${userId}`)
    }

    return c.json({ message: 'Friend added successfully' })
  } catch (error) {
    console.log(`❌ Add friend exception: ${error}`)
    return c.json({ error: 'Failed to add friend' }, 500)
  }
})

// Remove friend
app.delete('/friends/:friendId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    const userId = user.id
    
    console.log(`💔 User ${userId} removing friend ${friendId}`)
    
    // ============================================================
    // SQL VERSION: Delete from friends table (both directions)
    // ============================================================
    
    // Delete both directions of the friendship (using service role to bypass RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Delete first direction: user_id -> friend_id
    const { error: deleteError1 } = await adminClient
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId)
    
    if (deleteError1) {
      console.log(`❌ Error removing friendship (direction 1): ${deleteError1.message}`)
    }
    
    // Delete second direction: friend_id -> user_id
    const { error: deleteError2 } = await adminClient
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId)
    
    if (deleteError2) {
      console.log(`❌ Error removing friendship (direction 2): ${deleteError2.message}`)
    }
    
    // If both failed, return error
    if (deleteError1 && deleteError2) {
      return c.json({ error: 'Failed to remove friend' }, 500)
    }
    
    // ============================================================
    // ALSO DELETE THE FRIEND REQUEST (if it exists)
    // ============================================================
    // Clean up the accepted friend request (could be in either direction)
    await adminClient
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`)
    
    console.log(`✅ Removed friendship and friend request between ${userId} and ${friendId}`)

    return c.json({ message: 'Friend removed successfully' })
  } catch (error) {
    console.log(`❌ Remove friend exception: ${error}`)
    return c.json({ error: 'Failed to remove friend' }, 500)
  }
})

// Send friend request
app.post('/friends/request/:friendId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    const userId = user.id
    
    console.log(`📨 User ${userId} sending friend request to ${friendId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Use friend_requests table with status='pending'
    // ============================================================
    
    // Check if friend request already exists (in any state)
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', userId)
      .eq('recipient_id', friendId)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      console.log(`❌ Error checking existing friend request: ${checkError.message}`)
      return c.json({ error: 'Failed to send friend request' }, 500)
    }
    
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        console.log(`ℹ️ Friend request already pending from ${userId} to ${friendId}`)
        return c.json({ message: 'Friend request already sent' })
      } else if (existingRequest.status === 'accepted') {
        console.log(`ℹ️ Already friends: ${userId} and ${friendId}`)
        return c.json({ message: 'Already friends' })
      }
    }
    
    // Check if they are already friends (reverse direction check)
    const { data: reverseRequest, error: reverseError } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', friendId)
      .eq('recipient_id', userId)
      .eq('status', 'accepted')
      .single()
    
    if (reverseRequest) {
      console.log(`ℹ️ Already friends: ${userId} and ${friendId}`)
      return c.json({ message: 'Already friends' })
    }
    
    // Create friend request with pending status
    const now = new Date().toISOString()
    const requestId = crypto.randomUUID()
    
    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        id: requestId,
        sender_id: userId,
        recipient_id: friendId,
        status: 'pending',
        created_at: now,
        updated_at: now
      })
    
    if (insertError) {
      console.log(`❌ Error creating friend request: ${insertError.message}`)
      return c.json({ error: 'Failed to send friend request' }, 500)
    }
    
    console.log(`✅ Created pending friend request ${requestId} from ${userId} to ${friendId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Create notification with correct field names
    // ============================================================
    
    // Check if notification already exists
    const { data: existingNotification, error: notifCheckError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', friendId)
      .eq('type', 'friend_request')
      .eq('related_user_id', userId)
      .single()
    
    if (notifCheckError && notifCheckError.code !== 'PGRST116') {
      console.log(`⚠️ Warning: Error checking existing notification: ${notifCheckError.message}`)
    }
    
    // Only create notification if one doesn't exist
    if (!existingNotification) {
      const notificationId = crypto.randomUUID()
      const displayName = user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous'
      const avatarUrl = user.user_metadata?.avatarUrl || null
      
      const { error: notifInsertError } = await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: friendId,
          type: 'friend_request',
          related_user_id: userId,
          message: `${displayName} sent you a friend request`,
          is_read: false,
          created_at: now,
          requester_display_name: displayName,
          requester_avatar: avatarUrl
        })
      
      if (notifInsertError) {
        console.log(`⚠️ Warning: Failed to create notification: ${notifInsertError.message}`)
        // Don't fail the whole operation if notification creation fails
      } else {
        console.log(`✅ Created notification ${notificationId} for friend request`)
      }
    } else {
      console.log(`ℹ️ Notification already exists for friend request from ${userId} to ${friendId}`)
    }
    
    // Send email notification
    try {
      const { data: friendData } = await supabase.auth.admin.getUserById(friendId)
      if (friendData?.user?.email && friendData.user.user_metadata?.emailNotifications !== false) {
        await emailService.sendFriendRequestEmail(
          friendData.user.email,
          friendData.user.user_metadata?.displayName || friendData.user.user_metadata?.name || 'User',
          user.user_metadata?.displayName || user.user_metadata?.name || 'Someone',
          user.user_metadata?.avatarUrl || null
        )
        console.log(`📧 Friend request email sent to ${friendData.user.email}`)
      }
    } catch (emailError) {
      console.error(`⚠️ Failed to send friend request email: ${emailError}`)
      // Don't fail the whole operation if email fails
    }

    console.log(`✅ Friend request sent from ${userId} to ${friendId}`)
    return c.json({ message: 'Friend request sent successfully' })
  } catch (error) {
    console.log(`❌ Send friend request exception: ${error}`)
    return c.json({ error: 'Failed to send friend request' }, 500)
  }
})

// Get pending friend requests (requests I sent)
app.get('/friends/pending', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = user.id
    
    console.log(`📤 Fetching pending friend requests for user ${userId}`)
    
    // ============================================================
    // SQL VERSION: Query friend_requests table for sent requests
    // ============================================================
    
    const { data: pendingRequests, error: fetchError } = await supabase
      .from('friend_requests')
      .select('id, recipient_id, created_at, status')
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.log(`❌ Error fetching pending requests: ${fetchError.message}`)
      return c.json({ error: 'Failed to fetch pending requests' }, 500)
    }
    
    console.log(`✅ Found ${pendingRequests?.length || 0} pending friend requests`)
    
    // Enrich with user details
    const pendingWithDetails = await Promise.all(
      (pendingRequests || []).map(async (request) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(request.recipient_id)
          
          return {
            id: request.id,
            userId: request.recipient_id,
            displayName: userData?.user?.user_metadata?.displayName || userData?.user?.user_metadata?.name || 'Anonymous',
            avatarUrl: userData?.user?.user_metadata?.avatarUrl || null,
            createdAt: request.created_at,
            status: request.status
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch user data for ${request.recipient_id}: ${error}`)
          return {
            id: request.id,
            userId: request.recipient_id,
            displayName: 'Anonymous',
            avatarUrl: null,
            createdAt: request.created_at,
            status: request.status
          }
        }
      })
    )

    return c.json({ pending: pendingWithDetails })
  } catch (error) {
    console.log(`❌ Get pending requests exception: ${error}`)
    return c.json({ error: 'Failed to fetch pending requests' }, 500)
  }
})

// Accept friend request (alternate route)
app.post('/friends/accept/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const senderId = c.req.param('userId') // The user who sent the request
    const recipientId = user.id // Current user (accepting the request)
    
    console.log(`🤝 User ${recipientId} accepting friend request from ${senderId}`)
    
    // ============================================================
    // SCHEMA-CORRECT: Update existing pending friend request to accepted
    // ============================================================
    
    // Find the pending friend request (where senderId sent request to recipientId)
    const { data: pendingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
      .single()
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        console.log(`❌ No pending friend request found from ${senderId} to ${recipientId}`)
        return c.json({ error: 'No pending friend request found' }, 404)
      }
      console.log(`❌ Error checking friend request: ${checkError.message}`)
      return c.json({ error: 'Failed to accept friend request' }, 500)
    }
    
    // Update the status to 'accepted' in friend_requests
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({
        status: 'accepted',
        updated_at: now
      })
      .eq('id', pendingRequest.id)
    
    if (updateError) {
      console.log(`❌ Error accepting friend request: ${updateError.message}`)
      return c.json({ error: 'Failed to accept friend request' }, 500)
    }
    
    console.log(`✅ Updated friend request status to accepted`)
    
    // ============================================================
    // INSERT INTO FRIENDS TABLE - Create the actual friendship
    // ============================================================
    
    // Create bidirectional friendship entries
    const friendshipId1 = crypto.randomUUID()
    const friendshipId2 = crypto.randomUUID()
    
    const { error: insertError } = await supabase
      .from('friends')
      .insert([
        {
          id: friendshipId1,
          user_id: senderId,
          friend_id: recipientId,
          created_at: now
        },
        {
          id: friendshipId2,
          user_id: recipientId,
          friend_id: senderId,
          created_at: now
        }
      ])
    
    if (insertError) {
      console.log(`❌ Error creating friendship records: ${insertError.message}`)
      return c.json({ error: 'Failed to create friendship' }, 500)
    }
    
    console.log(`✅ Created friendship records in friends table: ${senderId} ↔️ ${recipientId}`)
    
    // Delete the friend request notification (use correct field name: related_user_id)
    const { error: deleteNotifError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', recipientId)
      .eq('type', 'friend_request')
      .eq('related_user_id', senderId)
    
    if (deleteNotifError) {
      console.log(`⚠️ Warning: Failed to delete friend request notification: ${deleteNotifError.message}`)
      // Don't fail the whole operation if notification deletion fails
    } else {
      console.log(`✅ Deleted friend request notification`)
    }

    console.log(`✅ Friend request accepted: ${recipientId} ↔️ ${senderId}`)
    return c.json({ message: 'Friend request accepted' })
  } catch (error) {
    console.log(`❌ Accept friend request exception: ${error}`)
    return c.json({ error: 'Failed to accept friend request' }, 500)
  }
})

// Decline friend request
app.post('/friends/decline/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const senderId = c.req.param('userId') // The user who sent the request
    const recipientId = user.id // Current user (declining the request)
    
    console.log(`🚫 User ${recipientId} declining friend request from ${senderId}`)
    
    // ============================================================
    // SQL VERSION: Update friend request status to declined
    // ============================================================
    
    // Update friend request status to 'declined'
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
    
    if (updateError) {
      console.log(`❌ Error updating friend request: ${updateError.message}`)
      return c.json({ error: 'Failed to decline friend request' }, 500)
    }
    
    console.log(`✅ Updated friend request status to declined`)
    
    // Delete the friend request notification
    const { error: deleteNotifError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', recipientId)
      .eq('type', 'friend_request')
      .eq('related_user_id', senderId)
    
    if (deleteNotifError) {
      console.log(`⚠️ Warning: Failed to delete friend request notification: ${deleteNotifError.message}`)
      // Don't fail the whole operation if notification deletion fails
    } else {
      console.log(`✅ Deleted friend request notification`)
    }

    console.log(`✅ Friend request declined: ${senderId} ❌ ${recipientId}`)
    return c.json({ message: 'Friend request declined' })
  } catch (error) {
    console.log(`❌ Decline friend request exception: ${error}`)
    return c.json({ error: 'Failed to decline friend request' }, 500)
  }
})

// ============================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================

// Get notifications for the current user
app.get('/notifications', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`📬 Fetching notifications for user ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Query notifications and deduplicate friend requests
    // ============================================================
    
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (notifError) {
      console.log(`❌ Error fetching notifications: ${notifError.message}`)
      return c.json({ error: 'Failed to fetch notifications' }, 500)
    }
    
    const notifArray = notifications || []
    console.log(`📬 Found ${notifArray.length} notifications for user ${user.id}`)
    
    if (notifArray.length > 0) {
      console.log(`📬 First 3 notifications:`, notifArray.slice(0, 3))
      console.log(`📬 Notification types:`, notifArray.map((n: any) => n.type))
    }

    // Remove duplicate friend request notifications (same from_user_id)
    const seen = new Map()
    const deduplicatedNotifications = []
    const duplicateIds = []
    
    for (const notification of notifArray) {
      if (notification.type === 'friend_request') {
        const key = `friend_request:${notification.from_user_id}`
        if (!seen.has(key)) {
          seen.set(key, true)
          deduplicatedNotifications.push(notification)
        } else {
          // Mark as duplicate for deletion
          duplicateIds.push(notification.id)
        }
      } else {
        deduplicatedNotifications.push(notification)
      }
    }
    
    // Delete duplicates from database if any found
    if (duplicateIds.length > 0) {
      console.log(`🗑️ Removing ${duplicateIds.length} duplicate friend request notifications`)
      
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', duplicateIds)
      
      if (deleteError) {
        console.log(`⚠️ Warning: Failed to delete duplicate notifications: ${deleteError.message}`)
        // Don't fail the operation if cleanup fails
      } else {
        console.log(`✅ Removed ${duplicateIds.length} duplicate notifications`)
      }
    }

    console.log(`✅ Returning ${deduplicatedNotifications.length} notifications`)
    return c.json({ notifications: deduplicatedNotifications })
  } catch (error) {
    console.log(`❌ Get notifications exception: ${error}`)
    return c.json({ error: 'Failed to fetch notifications' }, 500)
  }
})

// Mark notification as read
app.post('/notifications/:notificationId/read', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const notificationId = c.req.param('notificationId')
    console.log(`✅ Marking notification ${notificationId} as read for user ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Update notification read status
    // ============================================================
    
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)  // Security: only update user's own notifications
    
    if (updateError) {
      console.log(`❌ Error marking notification as read: ${updateError.message}`)
      return c.json({ error: 'Failed to mark notification as read' }, 500)
    }

    console.log(`✅ Notification marked as read`)
    return c.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.log(`❌ Mark notification read exception: ${error}`)
    return c.json({ error: 'Failed to mark notification as read' }, 500)
  }
})

// Mark all notifications as seen (but not read)
app.post('/notifications/mark-seen', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`👁️ Marking all notifications as seen for user ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Mark all user's notifications as seen
    // ============================================================
    
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_seen: true })
      .eq('user_id', user.id)
    
    if (updateError) {
      console.log(`❌ Error marking notifications as seen: ${updateError.message}`)
      return c.json({ error: 'Failed to mark notifications as seen' }, 500)
    }

    console.log(`✅ All notifications marked as seen`)
    return c.json({ message: 'All notifications marked as seen' })
  } catch (error) {
    console.log(`❌ Mark notifications seen exception: ${error}`)
    return c.json({ error: 'Failed to mark notifications as seen' }, 500)
  }
})

// Clear all notifications for the current user
app.delete('/notifications', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`🗑️ Clearing all notifications for user ${user.id}`)
    
    // ============================================================
    // SQL VERSION: Delete all user's notifications
    // ============================================================
    
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.log(`❌ Error clearing notifications: ${deleteError.message}`)
      return c.json({ error: 'Failed to clear notifications' }, 500)
    }

    console.log(`✅ All notifications cleared`)
    return c.json({ message: 'All notifications cleared' })
  } catch (error) {
    console.log(`❌ Clear notifications exception: ${error}`)
    return c.json({ error: 'Failed to clear notifications' }, 500)
  }
})

// ============================================================
// ACHIEVEMENTS ENDPOINTS
// ============================================================

// Save user achievements
app.post('/achievements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for achievements save')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in save achievements: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    console.log(`📦 Received body:`, JSON.stringify(body))
    
    let achievementsData
    
    if (body.achievementType) {
      console.log(`🏆 Awarding achievement: ${body.achievementType}`)
      
      const { data: existingRow, error: selectError } = await supabase
        .from('user_achievements')
        .select('achievements_data')
        .eq('user_id', user.id)
        .single()
      
      console.log(`📊 Existing row:`, JSON.stringify(existingRow))
      console.log(`📊 Select error:`, selectError?.code)
      
      // Default achievements structure
      const defaultAchievements = {
        unlockedAchievements: [],
        decksCreated: 0,
        totalCards: 0,
        decksPublished: 0,
        decksImported: 0,
        studyStreak: 0,
        totalStudySessions: 0,
        cardsReviewed: 0,
        correctAnswersInRow: 0,
        averageAccuracy: 0,
        totalStudyMinutes: 0,
        lastStudyDate: '',
        studiedToday: false,
        perfectScores: 0,
        studiedBeforeEightAM: false,
        studiedAfterMidnight: false,
        studiedSixtyMinutesNonstop: false,
        studiedThreeHoursInOneDay: false,
        customizedDeckTheme: false,
        hasProfilePicture: false,
        usedDarkMode: false,
        categoriesUsed: 0,
        createdMultipleChoiceCard: false,
        createdTypeAnswerCard: false,
        createdImageCard: false,
        completedBeginnerDeck: false,
        completedIntermediateDeck: false,
        completedAdvancedDeck: false,
        completedExpertDeck: false,
        completedMasterDeck: false,
        friendsAdded: 0,
        commentsLeft: 0,
        ratingsGiven: 0,
        deckFavorites: 0,
        deckDownloads: 0,
        deckRatings: 0,
        usedAI: false,
        aiCardsGenerated: 0,
        isPremium: false,
        flippedCardFiveTimes: false,
        studiedOnLowBattery: false,
        slowCardReview: false
      }
      
      // Handle both no row and null achievements_data
      const existing = (existingRow && existingRow.achievements_data) ? existingRow.achievements_data : defaultAchievements
      
      // Ensure unlockedAchievements exists and is an array
      if (!existing.unlockedAchievements || !Array.isArray(existing.unlockedAchievements)) {
        existing.unlockedAchievements = []
      }
      
      if (!existing.unlockedAchievements.includes(body.achievementType)) {
        existing.unlockedAchievements.push(body.achievementType)
      }
      
      achievementsData = existing
    } else if (body.achievements) {
      console.log(`💾 Saving full achievements for user ${user.email}`)
      achievementsData = body.achievements
    } else {
      console.log('❌ Missing achievements data or achievementType')
      return c.json({ error: 'Missing achievements data or achievementType' }, 400)
    }

    // ============================================================
    // SQL VERSION: UPSERT achievements data
    // Write to BOTH JSONB column AND individual columns
    // ============================================================
    
    const dbRecord = {
      user_id: user.id,
      achievements_data: achievementsData,
      // Array fields
      unlocked_achievement_ids: achievementsData.unlockedAchievements || [],
      // Numeric counters
      decks_created: achievementsData.decksCreated || 0,
      total_cards: achievementsData.totalCards || 0,
      decks_published: achievementsData.decksPublished || 0,
      decks_imported: achievementsData.decksImported || 0,
      study_streak: achievementsData.studyStreak || 0,
      total_study_sessions: achievementsData.totalStudySessions || 0,
      cards_reviewed: achievementsData.cardsReviewed || 0,
      perfect_scores: achievementsData.perfectScores || 0,
      friends_added: achievementsData.friendsAdded || 0,
      comments_left: achievementsData.commentsLeft || 0,
      ratings_given: achievementsData.ratingsGiven || 0,
      deck_favorites: achievementsData.deckFavorites || 0,
      deck_downloads: achievementsData.deckDownloads || 0,
      deck_ratings: achievementsData.deckRatings || 0,
      ai_cards_generated: achievementsData.aiCardsGenerated || 0,
      total_study_minutes: achievementsData.totalStudyMinutes || 0,
      categories_used: achievementsData.categoriesUsed || 0,
      // Boolean flags
      customized_deck_theme: achievementsData.customizedDeckTheme || false,
      has_profile_picture: achievementsData.hasProfilePicture || false,
      studied_before_eight_am: achievementsData.studiedBeforeEightAM || false,
      studied_after_midnight: achievementsData.studiedAfterMidnight || false,
      studied_stay_awake: achievementsData.studiedSixtyMinutesNonstop || false,
      studied_three_hours_one_day: achievementsData.studiedThreeHoursInOneDay || false,
      flipped_card_five_times: achievementsData.flippedCardFiveTimes || false,
      studied_on_low_battery: achievementsData.studiedOnLowBattery || false,
      slow_card_review: achievementsData.slowCardReview || false,
      created_multiple_choice_card: achievementsData.createdMultipleChoiceCard || false,
      created_type_answer_card: achievementsData.createdTypeAnswerCard || false,
      created_image_card: achievementsData.createdImageCard || false,
      used_dark_mode: achievementsData.usedDarkMode || false,
      used_ai: achievementsData.usedAI || false,
      is_premium: achievementsData.isPremium || false,
      perfect_score_marathon: (achievementsData.perfectScores || 0) >= 1
    }
    
    console.log(`🔄 Upserting to database:`, JSON.stringify(dbRecord))
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('user_achievements')
      .upsert(dbRecord, {
        onConflict: 'user_id'
      })
      .select()
    
    if (upsertError) {
      console.log(`❌ Failed to save achievements: ${upsertError.message}`)
      return c.json({ error: 'Failed to save achievements' }, 500)
    }
    
    console.log(`✅ Achievements saved successfully for user ${user.id}`)
    console.log(`📊 Upserted data:`, JSON.stringify(upsertData))
    
    return c.json({ 
      message: 'Achievements saved successfully',
      achievements: achievementsData 
    })
  } catch (error) {
    console.log(`❌ Save achievements exception: ${error}`)
    return c.json({ error: 'Failed to save achievements' }, 500)
  }
})

// Get user achievements
app.get('/achievements', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for achievements get')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get achievements: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`📊 Fetching achievements for user ${user.email}`)

    // ============================================================
    // SQL VERSION: Get achievements data
    // Returns achievements_data JSONB or null if no row exists
    // ============================================================
    
    const { data: achievementRow, error: queryError } = await supabase
      .from('user_achievements')
      .select('achievements_data')
      .eq('user_id', user.id)
      .single()
    
    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.log(`❌ Failed to fetch achievements: ${queryError.message}`)
      return c.json({ error: 'Failed to fetch achievements' }, 500)
    }
    
    if (!achievementRow || !achievementRow.achievements_data) {
      // Return default achievements structure
      console.log(`📊 No achievements found, returning defaults`)
      return c.json({
        achievements: {
          unlockedAchievementIds: [],
          customizedDeckTheme: false,
          hasProfilePicture: false,
          decksPublished: 0,
          studiedBeforeEightAM: false,
          studiedAfterMidnight: false,
          studiedSixtyMinutesNonstop: false,
          studiedThreeHoursInOneDay: false,
          flippedCardFiveTimes: false,
          studiedOnLowBattery: false,
          studiedInDarkMode: false,
          slowCardReview: false,
        }
      })
    }
    
    console.log(`✅ Found achievements for user ${user.id}`)
    return c.json({ achievements: achievementRow.achievements_data })
  } catch (error) {
    console.log(`❌ Get achievements exception: ${error}`)
    return c.json({ error: 'Failed to fetch achievements' }, 500)
  }
})

// ============================================================
// AI ENDPOINTS
// ============================================================

// AI Generate - Chat (Topic-based generation)
app.post('/ai/generate/chat', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for AI generation')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in AI generate chat: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Checks auth (already using Supabase)
    // 2. Checks subscription tier (from user_metadata, not DB)
    // 3. Calls OpenAI API
    // 4. Returns generated cards
    // No KV store operations to convert!
    // ============================================================

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`❌ Free user ${user.id} attempted AI generation - blocked`)
      return c.json({ error: 'AI generation requires a Premium or Pro subscription' }, 403)
    }

    const { topic, numCards, includeImages, cardTypes, difficulty, frontLanguage, backLanguage } = await c.req.json()
    
    if (!topic || !numCards) {
      console.log('❌ Missing topic or numCards')
      return c.json({ error: 'Topic and number of cards are required' }, 400)
    }

    const cardCount = parseInt(numCards)
    if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
      console.log(`❌ Invalid card count: ${cardCount}`)
      return c.json({ error: 'Number of cards must be between 1 and 100' }, 400)
    }

    console.log(`🤖 AI Generate Chat - User: ${user.id}, Topic: "${topic}", Cards: ${cardCount}, Difficulty: ${difficulty || 'mixed'}, Front Language: ${frontLanguage || 'not specified'}, Back Language: ${backLanguage || 'not specified'}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('❌ OpenAI API key not configured')
      return c.json({ error: 'AI service not configured. Please add your OpenAI API key.' }, 500)
    }

    // Build difficulty instruction with MUCH more explicit guidance
    const difficultyInstructions = {
      'beginner': `DIFFICULTY LEVEL: BEGINNER (Elementary/Introductory)
Create flashcards covering the MOST BASIC, FOUNDATIONAL content for complete beginners:
- Select the SIMPLEST, MOST COMMON items from the topic (e.g., for verbs: "to be", "to have", "to go")
- Use straightforward, everyday language
- Focus on basic definitions, essential facts, and fundamental concepts
- Questions should test RECALL of simple, common knowledge
- Example for Spanish verbs: "ser" (to be), "tener" (to have), "ir" (to go), "hacer" (to do)
- Example card: "What does 'ser' mean in English?" → "to be"`,
      
      'intermediate': `DIFFICULTY LEVEL: INTERMEDIATE (College/Professional)
Create flashcards covering MODERATELY COMPLEX content for learners with some background:
- Select COMMON but more specific items from the topic (e.g., regular verbs in all tenses)
- Include some technical terminology and concepts
- Mix basic and moderately complex content
- Questions test understanding and application, not just memorization
- Example for Spanish verbs: regular -ar/-er/-ir verbs, common irregular verbs, present/preterite tenses
- Example card: "Conjugate 'hablar' in present tense (yo)" → "hablo"`,
      
      'advanced': `DIFFICULTY LEVEL: ADVANCED (Graduate/Specialist)
Create flashcards covering SOPHISTICATED, SPECIALIZED content for advanced learners:
- Select LESS COMMON, MORE SPECIALIZED items from the topic (e.g., subjunctive mood, rare verbs)
- Use field-specific terminology and complex concepts
- Focus on nuanced distinctions and advanced applications
- Questions require deeper analysis and synthesis
- Example for Spanish verbs: subjunctive conjugations, irregular stems, advanced tenses (pluperfect, conditional perfect)
- Example card: "Conjugate 'hacer' in imperfect subjunctive (él)" → "hiciera" or "hiciese"`,
      
      'expert': `DIFFICULTY LEVEL: EXPERT (Research/Mastery)
Create flashcards covering RARE, SPECIALIZED, or HIGHLY COMPLEX content for domain experts:
- Select the MOST OBSCURE, SPECIALIZED, or CHALLENGING items from the topic (e.g., archaic verbs, rare forms)
- Use advanced technical language and expect deep expertise
- Focus on edge cases, rare forms, or research-level knowledge
- Questions require expert-level precision and comprehensive understanding
- Example for Spanish verbs: archaic verb forms, rare regional variations, literary verb usage, voseo conjugations
- Example card: "What is the vosotros imperative form of 'poner'?" → "poned"`,
      
      'mixed': `DIFFICULTY LEVEL: MIXED (Progressive Difficulty)
Create a balanced distribution of content across difficulty levels:
- 20% BEGINNER: The most basic, essential items (e.g., "ser", "estar", "ir")
- 40% INTERMEDIATE: Common but moderately complex items (e.g., regular conjugations, common irregulars)
- 30% ADVANCED: Specialized or sophisticated items (e.g., subjunctive, complex tenses)
- 10% EXPERT: Rare, obscure, or highly specialized items (e.g., archaic forms, literary usage)

IMPORTANT: Vary the CONTENT difficulty, not just the question complexity. Choose progressively more obscure/complex/specialized TOPICS.`
    }
    const difficultyInstruction = difficultyInstructions[difficulty || 'mixed'] || difficultyInstructions['mixed']
    console.log(`\n=== DIFFICULTY CONFIGURATION ===`)
    console.log(`Selected difficulty: ${difficulty || 'mixed'}`)
    console.log(`Full instruction:\n${difficultyInstruction}`)
    console.log(`================================\n`)

    // Determine which card types to generate
    const enabledTypes = []
    if (cardTypes?.classicFlip) enabledTypes.push('classic-flip')
    if (cardTypes?.multipleChoice) enabledTypes.push('multiple-choice')
    if (cardTypes?.typeAnswer) enabledTypes.push('type-answer')
    
    // If no types selected, default to classic flip
    if (enabledTypes.length === 0) {
      enabledTypes.push('classic-flip')
    }

    const mixedCardTypes = enabledTypes.length > 1
    console.log(`Card types enabled: ${enabledTypes.join(', ')}`)

    // Request significantly more cards than needed to account for potential filtering/loss
    // Add 50% padding, minimum of 15 extra cards to account for:
    // 1. Invalid cards that get filtered out
    // 2. Token limit cutoffs during generation
    // 3. JSON parsing issues
    // Cap based on token limits: 16384 max tokens / ~120 tokens per card = ~136 max cards
    const idealPaddedCount = Math.ceil(cardCount * 1.5) + 15
    const maxCardsInTokenLimit = Math.floor(16384 / 120) // ~136 cards max with tighter token estimate
    const paddedCardCount = Math.min(idealPaddedCount, maxCardsInTokenLimit)
    console.log(`Requesting ${paddedCardCount} cards (ideal: ${idealPaddedCount}, will trim to ${cardCount})`)
    
    // JSON formatting instruction to append to all prompts
    const jsonFormattingNote = `\n\nIMPORTANT JSON FORMATTING: Ensure all strings are properly escaped. Replace newlines with \\n, escape quotes with \\", and ensure valid JSON.`

    // Build system prompt based on selected card types
    let systemPrompt = ''
    
    if (mixedCardTypes) {
      // Multiple card types selected - distribute evenly
      const cardTypeList = enabledTypes.map(type => {
        if (type === 'classic-flip') return '- "classic-flip": Traditional flashcard with question and answer'
        if (type === 'multiple-choice') return '- "multiple-choice": Question with 4 options where 1 is correct'
        if (type === 'type-answer') return '- "type-answer": Question requiring exact typed answer'
        return ''
      }).filter(Boolean).join('\\n')
      
      systemPrompt = `You are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality flashcards for studying the given topic.

CRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.

${difficultyInstruction}

Create a mix of these card types (distribute evenly):
${cardTypeList}

REQUIRED FORMAT - Each card MUST have ALL of these properties:
- "cardType": REQUIRED - must be one of ${enabledTypes.map(t => `"${t}"`).join(', ')}
- "front": REQUIRED - the question or prompt (never empty)
- "back": REQUIRED - the answer/correct option (never empty)
- "options": REQUIRED for multiple-choice cards - array of exactly 3 INCORRECT options
- "acceptedAnswers": optional for type-answer - array of alternative acceptable answers

CRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.

MULTIPLE CORRECT ANSWERS: About 20-30% of multiple-choice cards should have multiple correct answers when appropriate. Use "correctAnswers" array containing ALL correct answers (including "back").

CRITICAL for multiple-choice: The primary CORRECT answer goes in "back" and 3 INCORRECT answers go in "options". Add "correctAnswers" array for questions with multiple valid answers.

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with note name (e.g., "C major chord", "D minor chord", "E diminished chord")
- BACK: Chord type ONLY without note name (e.g., "Major triad", "Minor triad", "Diminished triad", "Augmented triad")
- Audio will be generated for the FRONT (the specific chord to hear)
- NO audio on the BACK (just the chord type name)
- Example: Front: "C major chord" → Back: "Major triad"
- Example: Front: "D minor chord" → Back: "Minor triad"

FOR CHORD LEARNING (user learns what notes are in a chord):
- FRONT: Question like "What notes make up a C major chord?"
- BACK: The chord name "C major" (which will get audio) or list of notes "C, E, G"
- Example: Front: "What notes make up a C major chord?" → Back: "C major"

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead

Return a JSON object with a "cards" array containing exactly ${paddedCardCount} cards.${jsonFormattingNote}`
    } else {
      // Single card type selected
      const singleType = enabledTypes[0]
      
      if (singleType === 'classic-flip') {
        systemPrompt = `You are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality flashcards for studying the given topic. 

CRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.

${difficultyInstruction}

Each flashcard MUST have these properties:
- "cardType": "classic-flip"
- "front": the question or prompt (never empty)
- "back": the answer/explanation (never empty)

CRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with note name (e.g., "C major chord", "D minor chord", "E diminished chord")
- BACK: Chord type ONLY without note name (e.g., "Major triad", "Minor triad", "Diminished triad", "Augmented triad")
- Audio will be generated for the FRONT (the specific chord to hear)
- NO audio on the BACK (just the chord type name)
- Example: Front: "C major chord" → Back: "Major triad"
- Example: Front: "D minor chord" → Back: "Minor triad"

FOR CHORD LEARNING (user learns what notes are in a chord):
- FRONT: Question like "What notes make up a C major chord?"
- BACK: The chord name "C major" (which will get audio) or list of notes "C, E, G"
- Example: Front: "What notes make up a C major chord?" → Back: "C major"

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead

Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards. Make the cards progressively more challenging.${jsonFormattingNote}`
      } else if (singleType === 'multiple-choice') {
        systemPrompt = `You are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality multiple-choice flashcards for studying the given topic.

CRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.

${difficultyInstruction}

Each flashcard MUST have these properties:
- "cardType": "multiple-choice"
- "front": the question or prompt (never empty)
- "back": the CORRECT answer (never empty)
- "options": array of exactly 3 INCORRECT options

CRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.

MULTIPLE CORRECT ANSWERS: About 20-30% of your cards should have multiple correct answers when appropriate. Use "correctAnswers" array containing ALL correct answers.

CRITICAL: The primary CORRECT answer goes in "back" and 3 INCORRECT answers go in "options". Add "correctAnswers" array for questions with multiple valid answers.

Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards.${jsonFormattingNote}`
      } else if (singleType === 'type-answer') {
        systemPrompt = `You are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality type-answer flashcards for studying the given topic.

CRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.

${difficultyInstruction}

Each flashcard MUST have these properties:
- "cardType": "type-answer"
- "front": the question or prompt (never empty)
- "back": the exact answer expected (never empty)
- "acceptedAnswers": optional array of alternative acceptable answers

CRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.

SPECIAL: MUSIC CHORDS - When creating flashcards about musical chords:

FOR CHORD IDENTIFICATION (user guesses chord type from sound):
- FRONT: Specific chord with note name (e.g., "C major chord", "D minor chord", "E diminished chord")
- BACK: Chord type ONLY without note name (e.g., "Major triad", "Minor triad", "Diminished triad", "Augmented triad")
- Audio will be generated for the FRONT (the specific chord to hear)
- NO audio on the BACK (just the chord type name to type)
- acceptedAnswers should include variations like ["Major triad", "major triad", "Major", "major"]
- Example: Front: "C major chord" → Back: "Major triad" → acceptedAnswers: ["Major triad", "major triad", "Major", "major"]
- Example: Front: "D minor chord" → Back: "Minor triad" → acceptedAnswers: ["Minor triad", "minor triad", "Minor", "minor"]

FOR CHORD LEARNING (user learns what notes are in a chord):
- FRONT: Question like "What notes make up a C major chord?"
- BACK: The chord name "C major" (which will get audio) or list of notes "C, E, G"
- Example: Front: "What notes make up a C major chord?" → Back: "C major"

DO NOT list individual notes (C, E, G) as separate unrelated cards - create chord-focused cards instead

Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards.${jsonFormattingNote}`
      }
    }

    // Adjust temperature based on difficulty for better results
    const temperatureMap = {
      'beginner': 0.6,      // Lower temp for more consistent, straightforward cards
      'intermediate': 0.7,  // Moderate creativity
      'advanced': 0.8,      // Higher creativity for complex concepts
      'expert': 0.9,        // Highest creativity for nuanced, sophisticated content
      'mixed': 0.8          // Balanced
    }
    const temperature = temperatureMap[difficulty || 'mixed'] || 0.8

    console.log(`Using temperature: ${temperature} for difficulty: ${difficulty || 'mixed'}`)
    console.log(`System prompt preview:\n${systemPrompt.substring(0, 300)}...\n`)

    // Build JSON schema for structured output (guarantees valid JSON)
    const responseSchema = {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
              cardType: { 
                type: "string",
                enum: ["classic-flip", "multiple-choice", "type-answer"]
              },
              options: {
                type: "array",
                items: { type: "string" }
              },
              correctAnswers: {
                type: "array",
                items: { type: "string" }
              },
              acceptedAnswers: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["front", "back", "cardType"],
            additionalProperties: false
          }
        }
      },
      required: ["cards"],
      additionalProperties: false
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: cardCount > 50 ? 'gpt-4o' : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Create ${paddedCardCount} flashcards about: ${topic}. Follow the difficulty level instructions precisely.${frontLanguage && backLanguage ? ` Generate the FRONT/QUESTION in ${frontLanguage} and the BACK/ANSWER in ${backLanguage}.` : frontLanguage ? ` Generate the flashcards in ${frontLanguage}.` : backLanguage ? ` Generate the flashcards in ${backLanguage}.` : ''}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: temperature,
        max_tokens: Math.min(16384, paddedCardCount * 120), // ~120 tokens per card, capped at max
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.log(`❌ OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      
      // Handle specific error codes
      if (openaiResponse.status === 429) {
        return c.json({ 
          error: 'OpenAI API rate limit reached. Please try again in a few moments or check your API usage at platform.openai.com' 
        }, 429)
      } else if (openaiResponse.status === 401) {
        return c.json({ 
          error: 'Invalid OpenAI API key. Please check your API key configuration.' 
        }, 500)
      } else if (openaiResponse.status === 402) {
        return c.json({ 
          error: 'OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/account/billing' 
        }, 402)
      } else if (openaiResponse.status === 400) {
        // Bad Request - likely schema or model compatibility issue
        console.error('❌ Chat Generation - Bad Request details:', errorText)
        return c.json({ 
          error: `AI generation failed with invalid request. This may be due to model compatibility. Details: ${errorText}`
        }, 400)
      }
      
      return c.json({ error: `AI generation failed: ${openaiResponse.statusText}. Details: ${errorText}` }, 500)
    }

    const openaiData = await openaiResponse.json()
    console.log('✅ OpenAI response received')
    
    // Parse the response
    let cards
    try {
      let rawContent = openaiData.choices[0].message.content
      console.log('Raw OpenAI response length:', rawContent.length)
      
      let content
      // Try to parse as-is first
      try {
        content = JSON.parse(rawContent)
      } catch (firstError) {
        console.log('First parse failed, attempting to repair JSON...', firstError instanceof Error ? firstError.message : String(firstError))
        
        // Strategy 1: Remove trailing content after last }
        let repairedContent = rawContent
        const lastBrace = repairedContent.lastIndexOf('}')
        if (lastBrace !== -1 && lastBrace < repairedContent.length - 1) {
          repairedContent = repairedContent.substring(0, lastBrace + 1)
          console.log('Strategy 1: Trimmed content after last brace')
        }
        
        try {
          content = JSON.parse(repairedContent)
          console.log('Successfully parsed after Strategy 1')
        } catch (secondError) {
          console.log('Strategy 2: Extracting cards array...', secondError instanceof Error ? secondError.message : String(secondError))
          
          // Strategy 2: Find and extract just the cards array, removing incomplete cards
          const cardsMatch = repairedContent.match(/"cards"\s*:\s*\[([\s\S]*)\]/);
          if (cardsMatch) {
            let cardsArrayContent = cardsMatch[1]
            
            // Remove any incomplete card at the end
            const lastCompleteObj = cardsArrayContent.lastIndexOf('}')
            if (lastCompleteObj !== -1) {
              cardsArrayContent = cardsArrayContent.substring(0, lastCompleteObj + 1)
            }
            
            // Reconstruct the JSON
            repairedContent = `{"cards":[${cardsArrayContent}]}`
            console.log('Strategy 2: Extracted and reconstructed cards array')
            
            try {
              content = JSON.parse(repairedContent)
              console.log('Successfully parsed after Strategy 2')
            } catch (thirdError) {
              console.log('All strategies failed', thirdError instanceof Error ? thirdError.message : String(thirdError))
              throw thirdError
            }
          } else {
            throw secondError
          }
        }
      }
      
      // Handle different possible response formats
      cards = content.cards || content.flashcards || content
      
      // Ensure we have an array
      if (!Array.isArray(cards)) {
        throw new Error('Invalid response format from AI')
      }

      console.log(`AI generated ${cards.length} cards (requested: ${paddedCardCount}, target: ${cardCount})`)
      
      // Log any invalid cards
      const invalidCards = cards.filter((card: any) => !card.front || !card.back)
      if (invalidCards.length > 0) {
        console.log(`⚠️ WARNING: Filtering out ${invalidCards.length} invalid cards:`, JSON.stringify(invalidCards))
      }

      // Validate card structure and filter
      const validCards = cards.filter((card: any) => card.front && card.back)
      console.log(`After filtering: ${validCards.length} valid cards (need: ${cardCount})`)
      
      // Check if we have enough cards
      if (validCards.length < cardCount) {
        console.log(`⚠️ WARNING: Only got ${validCards.length} valid cards, need ${cardCount}. Shortfall: ${cardCount - validCards.length}`)
      }
      
      // Take only what we need (or all if we have less)
      cards = validCards.slice(0, cardCount)
      
      // Ensure each card has a cardType (default to classic-flip)
      // Only include allowed fields to prevent OpenAI from adding unwanted fields like "note"
      cards = cards.map((card: any) => ({
        front: card.front,
        back: card.back,
        cardType: card.cardType || 'classic-flip',
        // Only include these fields if they exist and are needed for the card type
        ...(card.options && Array.isArray(card.options) && { options: card.options }),
        ...(card.correctAnswers && Array.isArray(card.correctAnswers) && { correctAnswers: card.correctAnswers }),
        ...(card.acceptedAnswers && Array.isArray(card.acceptedAnswers) && { acceptedAnswers: card.acceptedAnswers }),
        // Explicitly exclude any other fields like notes, explanation, additionalInfo, etc.
      }))
      
      if (cards.length === 0) {
        throw new Error('No valid cards generated')
      }

      console.log(`✅ Successfully generated ${cards.length} cards (requested: ${cardCount})`)
      console.log(`Card types distribution:`, cards.map((c: any) => c.cardType))
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      console.error('Failed to parse OpenAI response. This usually happens when the AI includes unescaped quotes or special characters.')
      
      const rawContent = openaiData.choices[0].message.content
      console.log('Raw response preview (first 500 chars):', rawContent.substring(0, 500))
      console.log('Raw response preview (last 500 chars):', rawContent.substring(rawContent.length - 500))
      
      return c.json({ 
        error: 'Failed to parse AI response: AI generated malformed JSON. This can happen with complex formatting. Please try again or simplify your request.',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }, 500)
    }

    return c.json({ cards })
  } catch (error) {
    console.log(`❌ AI generate chat exception: ${error}`)
    return c.json({ error: 'Failed to generate flashcards with AI' }, 500)
  }
})

// AI Generate - CSV Upload
app.post('/ai/generate/csv', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for CSV import')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in CSV import: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Checks auth (already using Supabase)
    // 2. Checks subscription tier (from user_metadata, not DB)
    // 3. Parses uploaded CSV file
    // 4. Returns parsed cards
    // No KV store operations to convert!
    // ============================================================

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`❌ Free user ${user.id} attempted CSV import - blocked`)
      return c.json({ error: 'CSV import requires a Premium or Pro subscription' }, 403)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      console.log('❌ No file provided in request')
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      console.log(`❌ Invalid file type: ${file.name}`)
      return c.json({ error: 'Invalid file type. Only CSV files are allowed.' }, 400)
    }

    // Validate file size (1MB max for CSV)
    if (file.size > 1048576) {
      console.log(`❌ File too large: ${file.size} bytes`)
      return c.json({ error: 'File too large. Maximum size is 1MB.' }, 400)
    }

    console.log(`📄 CSV Import - User: ${user.id}, File: ${file.name}, Size: ${file.size} bytes`)

    // Read and parse CSV
    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length < 2) {
      console.log('❌ CSV file has insufficient rows')
      return c.json({ error: 'CSV file must contain at least a header row and one data row' }, 400)
    }

    // Parse header - IMPORTANT: Strip quotes from header names!
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
    
    // Detect format based on header names
    const hasCorrect = headers.some(h => h === 'correct')
    const hasIncorrect = headers.some(h => h === 'incorrect')
    const hasAcceptedAnswers = headers.some(h => h === 'accepted answers' || h === 'acceptedanswers')
    
    let detectedFormat = 'classic-flip'
    if (hasCorrect && hasIncorrect) {
      detectedFormat = 'multiple-choice'
    } else if (hasAcceptedAnswers) {
      detectedFormat = 'type-answer'
    }
    
    console.log(`🔍 Detected CSV format: ${detectedFormat}`)
    console.log(`📋 CSV headers: ${headers.join(', ')}`)
    
    // Find column indices based on detected format
    const questionIndex = headers.findIndex(h => h === 'question' || h === 'front' || h === 'q')
    let answerIndex = -1
    let correctIndex = -1
    let incorrectIndex = -1
    let acceptedAnswersIndex = -1
    
    if (detectedFormat === 'multiple-choice') {
      correctIndex = headers.findIndex(h => h === 'correct')
      incorrectIndex = headers.findIndex(h => h === 'incorrect')
      if (questionIndex === -1 || correctIndex === -1 || incorrectIndex === -1) {
        console.log(`❌ Multiple choice format missing required columns`)
        return c.json({ 
          error: 'Multiple Choice CSV must have "Question", "Correct", and "Incorrect" columns' 
        }, 400)
      }
    } else if (detectedFormat === 'type-answer') {
      answerIndex = headers.findIndex(h => h === 'answer' || h === 'back' || h === 'a')
      acceptedAnswersIndex = headers.findIndex(h => h === 'accepted answers' || h === 'acceptedanswers')
      if (questionIndex === -1 || answerIndex === -1 || acceptedAnswersIndex === -1) {
        console.log(`❌ Type answer format missing required columns`)
        return c.json({ 
          error: 'Type Answer CSV must have "Question", "Answer", and "Accepted Answers" columns' 
        }, 400)
      }
    } else {
      // Classic flip
      answerIndex = headers.findIndex(h => h === 'back' || h === 'answer' || h === 'a')
      if (questionIndex === -1 || answerIndex === -1) {
        console.log(`❌ Classic flip format missing required columns`)
        return c.json({ 
          error: 'Classic Flip CSV must have "Front" and "Back" columns (or "Question" and "Answer")' 
        }, 400)
      }
    }

    // Parse data rows
    const cards = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Simple CSV parsing (handles quoted fields)
      const values = []
      let currentValue = ''
      let insideQuotes = false
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        
        if (char === '"') {
          insideQuotes = !insideQuotes
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim())
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim())
      
      // Extract and clean values based on detected format
      const question = values[questionIndex]?.replace(/^"|"$/g, '').trim()
      
      if (!question) continue
      
      if (detectedFormat === 'multiple-choice') {
        const correct = values[correctIndex]?.replace(/^"|"$/g, '').trim()
        const incorrectRaw = values[incorrectIndex]?.replace(/^"|"$/g, '').trim()
        
        if (correct && incorrectRaw) {
          const separator = incorrectRaw.includes(';') ? ';' : '|'
          const incorrectOptions = incorrectRaw.split(separator).map(opt => opt.trim()).filter(opt => opt.length > 0)
          
          if (incorrectOptions.length > 0) {
            const card = {
              front: question,
              back: correct,
              cardType: 'multiple-choice',
              options: [correct, ...incorrectOptions]
            }
            cards.push(card)
          }
        }
      } else if (detectedFormat === 'type-answer') {
        const answer = values[answerIndex]?.replace(/^"|"$/g, '').trim()
        const acceptedRaw = values[acceptedAnswersIndex]?.replace(/^"|"$/g, '').trim()
        
        if (answer && acceptedRaw) {
          const separator = acceptedRaw.includes(';') ? ';' : '|'
          const acceptedAnswers = acceptedRaw.split(separator).map(ans => ans.trim()).filter(ans => ans.length > 0)
          
          if (acceptedAnswers.length > 0) {
            const card = {
              front: question,
              back: answer,
              cardType: 'type-answer',
              acceptedAnswers: acceptedAnswers
            }
            cards.push(card)
          }
        }
      } else {
        // Classic flip
        const answer = values[answerIndex]?.replace(/^"|"$/g, '').trim()
        
        if (answer) {
          const card = {
            front: question,
            back: answer,
            cardType: 'classic-flip'
          }
          cards.push(card)
        }
      }
    }

    if (cards.length === 0) {
      console.log('❌ No valid cards found in CSV')
      return c.json({ error: 'No valid cards found in CSV file' }, 400)
    }

    console.log(`✅ Successfully parsed ${cards.length} cards from CSV (${detectedFormat} format)`)
    return c.json({ cards })
  } catch (error) {
    console.log(`❌ CSV import exception: ${error}`)
    return c.json({ error: 'Failed to import CSV file' }, 500)
  }
})

// AI Generate - PDF Upload
app.post('/ai/generate/pdf', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for PDF import')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in PDF import: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Checks auth (already using Supabase)
    // 2. Checks subscription tier (from user_metadata, not DB)
    // 3. Extracts text from PDF file
    // 4. Calls OpenAI API to generate flashcards
    // 5. Returns generated cards
    // No KV store operations to convert!
    // ============================================================

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`❌ Free user ${user.id} attempted PDF AI generation - blocked`)
      return c.json({ error: 'PDF import with AI requires a Premium or Pro subscription' }, 403)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    const numCards = body['numCards'] as string
    const customInstructions = body['customInstructions'] as string | undefined
    const cardTypesRaw = body['cardTypes'] as string | undefined
    const frontLanguage = body['frontLanguage'] as string | undefined
    const backLanguage = body['backLanguage'] as string | undefined
    
    if (!file) {
      console.log('❌ No file provided in request')
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      console.log(`❌ Invalid file type: ${file.name}`)
      return c.json({ error: 'Invalid file type. Only PDF files are allowed.' }, 400)
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      console.log(`❌ File too large: ${file.size} bytes`)
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400)
    }

    const cardCount = parseInt(numCards || '15')
    if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
      console.log(`❌ Invalid card count: ${cardCount}`)
      return c.json({ error: 'Number of cards must be between 1 and 100' }, 400)
    }

    // Parse card types
    let cardTypes = { classicFlip: true, multipleChoice: false, typeAnswer: false }
    if (cardTypesRaw) {
      try {
        cardTypes = JSON.parse(cardTypesRaw)
      } catch (e) {
        console.log('⚠️ Failed to parse cardTypes, using defaults')
      }
    }

    // Build card type instructions
    const selectedTypes = []
    if (cardTypes.classicFlip) selectedTypes.push('classic-flip')
    if (cardTypes.multipleChoice) selectedTypes.push('multiple-choice')
    if (cardTypes.typeAnswer) selectedTypes.push('type-answer')
    
    if (selectedTypes.length === 0) {
      selectedTypes.push('classic-flip') // Default fallback
    }

    console.log(`📄 PDF Import - User: ${user.id}, File: ${file.name}, Size: ${file.size} bytes, Cards: ${cardCount}, Types: ${selectedTypes.join(', ')}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('❌ OpenAI API key not configured')
      return c.json({ error: 'AI service not configured. Please add your OpenAI API key.' }, 500)
    }

    // Extract text from PDF using pdf-parse
    console.log('📖 Extracting text from PDF...')
    let pdfText = ''
    
    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      
      // Parse PDF
      const pdfData = await pdfParse(buffer)
      pdfText = pdfData.text
      
      console.log(`✅ PDF text extracted successfully. Length: ${pdfText.length} characters, Pages: ${pdfData.numpages}`)
      
      if (!pdfText || pdfText.trim().length === 0) {
        console.log('❌ No text content found in PDF')
        return c.json({ 
          error: 'No text content found in PDF. The PDF may be scanned images or encrypted.',
          workaround: 'Try using OCR software to extract text, then use AI Chat feature'
        }, 400)
      }
      
      // Truncate if too long (to stay within OpenAI token limits)
      // GPT-4o can handle ~128k tokens, but we'll be conservative
      const maxChars = 50000 // ~12.5k tokens worth of text
      if (pdfText.length > maxChars) {
        console.log(`⚠️ PDF text truncated from ${pdfText.length} to ${maxChars} characters`)
        pdfText = pdfText.substring(0, maxChars) + '\n\n[... document truncated ...]'
      }
    } catch (pdfError) {
      console.error('❌ PDF parsing error:', pdfError)
      return c.json({ 
        error: 'Failed to extract text from PDF. The file may be corrupted, encrypted, or contain only images.',
        details: pdfError instanceof Error ? pdfError.message : String(pdfError),
        workaround: 'Try using AI Chat with manually extracted text or CSV import'
      }, 400)
    }
    
    console.log('🤖 Processing PDF content with AI...')
    
    // Build the system prompt with card type instructions
    let cardTypeInstructions = ''
    if (selectedTypes.length === 1) {
      if (selectedTypes[0] === 'classic-flip') {
        cardTypeInstructions = 'Create classic flip cards. EVERY card MUST have BOTH "front" (question) and "back" (answer) fields - never leave "back" empty. Set cardType to "classic-flip".'
      } else if (selectedTypes[0] === 'multiple-choice') {
        cardTypeInstructions = 'Create multiple-choice cards. EVERY card MUST have "front" (question), "back" (correct answer), and "options" array (2-3 incorrect options). Set cardType to "multiple-choice".'
      } else if (selectedTypes[0] === 'type-answer') {
        cardTypeInstructions = 'Create type-answer cards. EVERY card MUST have "front" (question) and "back" (correct answer), plus optional "acceptedAnswers" array (alternative correct answers). Set cardType to "type-answer".'
      }
    } else {
      cardTypeInstructions = `Create a balanced mix of these card types: ${selectedTypes.join(', ')}. 

DISTRIBUTION REQUIREMENT: Distribute card types as evenly as possible. For example, if creating 15 cards with 3 types selected, create approximately 5 cards of each type. Alternate between different types - do NOT group all cards of the same type together.

SPECIFICATIONS FOR EACH TYPE:
- classic-flip: Must have "front" (question) and "back" (answer) fields. Set cardType to "classic-flip".
- multiple-choice: Must have "front" (question), "back" (correct answer), and "options" array with 2-3 incorrect answers. Set cardType to "multiple-choice".
- type-answer: Must have "front" (question) and "back" (correct answer). Optionally include "acceptedAnswers" array with alternative correct answers. Set cardType to "type-answer".

IMPORTANT: You MUST include the "cardType" field on every single card. Mix the types throughout - do not create all of one type first.`
    }

    let customPrompt = ''
    if (customInstructions) {
      customPrompt = ` Additional instructions: ${customInstructions}`
    }
    
    // Request extra cards as a buffer to account for potential invalid cards
    // This ensures we have enough valid cards after filtering
    const bufferCount = Math.max(3, Math.ceil(cardCount * 0.2)) // Request 20% extra, minimum 3
    const paddedCardCount = cardCount + bufferCount
    console.log(`Requesting ${paddedCardCount} cards (${cardCount} requested + ${bufferCount} buffer) to ensure ${cardCount} valid cards after filtering`)
    
    // Build enhanced prompts with strict requirements
    const systemPrompt = `You are an expert educational content creator. Based on the provided document content, generate EXACTLY ${paddedCardCount} flashcards - no more, no less.

${cardTypeInstructions}${customPrompt}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${paddedCardCount} cards (count carefully!)
2. EVERY card MUST have both "front" and "back" fields with meaningful content
3. NEVER leave "back" empty, null, or undefined
4. IMPORTANT: Properly escape all special characters in JSON strings (quotes, newlines, etc.)
   - Replace all newlines with \\n
   - Escape all double quotes with \\"
   - Ensure valid JSON formatting

CONTENT STRATEGY - FOLLOW THESE RULES IN ORDER:
A. If the document contains PRACTICE QUESTIONS or EXAMPLE QUESTIONS:
   - PRESERVE the original question format and structure
   - DO NOT extract facts about the questions
   - DO NOT summarize the questions
   - Keep fill-in-the-blank, multiple choice, or other question formats intact
   - For fill-in-the-blank questions with passages: include the FULL passage in the "front" with the blank, and put the answer in "back"
   - For multiple choice questions: include the question and all options in "front", and put the correct answer with explanation in "back"
   - Create SIMILAR questions in the same style and format as the examples

B. If the document contains EDUCATIONAL CONTENT (textbook, notes, articles):
   - Create flashcards based on key concepts, definitions, and important facts
   - Transform information into question-answer pairs

C. If you receive custom instructions about format or style:
   - Follow those instructions EXACTLY
   - Maintain the requested format consistently across all cards

Return JSON in this exact format: { "cards": [...] }`

    const userPrompt = `Here is the content from a PDF document:

${pdfText}

Please analyze the content and create EXACTLY ${paddedCardCount} flashcards:
- If this contains practice/example questions: PRESERVE their format and create similar questions
- If this is educational content: extract key concepts and facts
- Must be exactly ${paddedCardCount} cards
- Every single card must have both front and back filled with meaningful content
- CRITICAL: Keep text concise in each card (under 200 words per field) to ensure valid JSON formatting
- CRITICAL: Properly escape all quotes and ensure valid JSON with commas between array elements`
    
    // Build JSON schema for structured output (guarantees valid JSON)
    const responseSchema = {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
              cardType: { 
                type: "string",
                enum: ["classic-flip", "multiple-choice", "type-answer"]
              },
              options: {
                type: "array",
                items: { type: "string" }
              },
              acceptedAnswers: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["front", "back", "cardType"],
            additionalProperties: false
          }
        }
      },
      required: ["cards"],
      additionalProperties: false
    }
    
    // Call OpenAI API to generate flashcards from the extracted PDF text
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: cardCount > 50 ? 'gpt-4o' : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5, // Lower temperature for more reliable JSON formatting
        max_tokens: Math.min(16384, paddedCardCount * 150), // Increased token allowance per card to avoid truncation
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.log(`❌ OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      
      // Handle specific error codes
      if (openaiResponse.status === 429) {
        return c.json({ 
          error: 'OpenAI API rate limit reached. Please try again in a few moments or check your API usage at platform.openai.com' 
        }, 429)
      } else if (openaiResponse.status === 401) {
        return c.json({ 
          error: 'Invalid OpenAI API key. Please check your API key configuration.' 
        }, 500)
      } else if (openaiResponse.status === 402) {
        return c.json({ 
          error: 'OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/account/billing' 
        }, 402)
      } else if (openaiResponse.status === 400) {
        // Bad Request - likely schema or model compatibility issue
        console.error('❌ PDF Generation - Bad Request details:', errorText)
        return c.json({ 
          error: `AI generation failed with invalid request. This may be due to model compatibility. Details: ${errorText}`
        }, 400)
      }
      
      return c.json({ error: `AI generation failed: ${openaiResponse.statusText}. Details: ${errorText}` }, 500)
    }

    const openaiData = await openaiResponse.json()
    console.log('✅ OpenAI response received')
    
    // Parse the JSON response with comprehensive error handling and repair
    let content
    try {
      let rawContent = openaiData.choices[0].message.content
      console.log('Raw OpenAI response length:', rawContent.length)
      
      // Try to parse as-is first
      try {
        content = JSON.parse(rawContent)
      } catch (firstError) {
        console.log('First parse failed, attempting to repair JSON...', firstError instanceof Error ? firstError.message : String(firstError))
        
        // Strategy 1: Remove trailing content after last }
        let repairedContent = rawContent
        const lastBrace = repairedContent.lastIndexOf('}')
        if (lastBrace !== -1 && lastBrace < repairedContent.length - 1) {
          repairedContent = repairedContent.substring(0, lastBrace + 1)
          console.log('Strategy 1: Trimmed content after last brace')
        }
        
        try {
          content = JSON.parse(repairedContent)
          console.log('Successfully parsed after Strategy 1')
        } catch (secondError) {
          console.log('Strategy 2: Extracting cards array...', secondError instanceof Error ? secondError.message : String(secondError))
          
          // Strategy 2: Find and extract just the cards array, removing incomplete cards
          const cardsMatch = repairedContent.match(/"cards"\s*:\s*\[([\s\S]*)\]/);
          if (cardsMatch) {
            let cardsArrayContent = cardsMatch[1]
            
            // Remove any incomplete card at the end
            const lastCompleteObj = cardsArrayContent.lastIndexOf('}')
            if (lastCompleteObj !== -1) {
              cardsArrayContent = cardsArrayContent.substring(0, lastCompleteObj + 1)
            }
            
            // Reconstruct the JSON
            repairedContent = `{"cards":[${cardsArrayContent}]}`
            console.log('Strategy 2: Extracted and reconstructed cards array')
            
            try {
              content = JSON.parse(repairedContent)
              console.log('Successfully parsed after Strategy 2')
            } catch (thirdError) {
              console.log('All strategies failed', thirdError instanceof Error ? thirdError.message : String(thirdError))
              throw thirdError
            }
          } else {
            throw secondError
          }
        }
      }
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      console.error('All repair strategies failed.')
      
      // Log the problematic area
      const rawContent = openaiData.choices[0].message.content
      console.log('Raw response preview (first 500 chars):', rawContent.substring(0, 500))
      console.log('Raw response preview (around error):', rawContent.substring(Math.max(0, 9300), 9450))
      console.log('Raw response preview (last 500 chars):', rawContent.substring(rawContent.length - 500))
      
      return c.json({ 
        error: 'Failed to process PDF file: AI generated malformed JSON. Try reducing the number of cards or simplifying the PDF content.',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }, 500)
    }
    
    // Validate the response
    if (!content.cards || !Array.isArray(content.cards)) {
      console.error('❌ Invalid OpenAI response format:', content)
      return c.json({ error: 'AI generated an invalid response. Please try again.' }, 500)
    }
    
    // Filter out invalid cards (missing front or back)
    let validCards = content.cards.filter((card: any) => {
      const hasFront = card.front && typeof card.front === 'string' && card.front.trim().length > 0
      const hasBack = card.back && typeof card.back === 'string' && card.back.trim().length > 0
      
      if (!hasFront || !hasBack) {
        console.log(`⚠️ Filtered out invalid card - Front: "${card.front || 'missing'}", Back: "${card.back || 'missing'}"`)
        return false
      }
      return true
    })
    
    // Ensure all cards have cardType set (default based on what user selected)
    // If only one type is selected, use that as the default; otherwise default to classic-flip
    const defaultCardType = selectedTypes.length === 1 ? selectedTypes[0] : 'classic-flip'
    
    validCards = validCards.map((card: any) => {
      if (!card.cardType) {
        console.log(`⚠️ Card missing cardType, defaulting to ${defaultCardType}: "${card.front?.substring(0, 50)}..."`)
        card.cardType = defaultCardType
      }
      
      // Validate and fix multiple-choice cards
      if (card.cardType === 'multiple-choice') {
        if (!card.options || !Array.isArray(card.options) || card.options.length === 0) {
          console.log(`⚠️ Multiple-choice card missing options, generating default options: "${card.front?.substring(0, 50)}..."`)
          // Generate some placeholder wrong answers if missing
          card.options = ['Option A', 'Option B', 'Option C']
        }
      }
      
      return card
    })
    
    console.log(`AI generated ${content.cards.length} cards, ${validCards.length} are valid`)
    
    // Ensure we have at least a reasonable number of valid cards (70% threshold)
    const minAcceptableCards = Math.max(1, Math.ceil(cardCount * 0.7))
    if (validCards.length < minAcceptableCards) {
      console.error(`❌ Insufficient valid cards: ${validCards.length} valid cards generated, but at least ${minAcceptableCards} needed (70% of ${cardCount} requested)`)
      return c.json({ 
        error: `Only ${validCards.length} valid flashcards could be generated from the PDF. Please try again or request fewer cards.` 
      }, 400)
    }
    
    // If we got fewer than requested but above the threshold, use what we have
    if (validCards.length < cardCount) {
      console.log(`⚠️ Generated ${validCards.length} out of ${cardCount} requested cards (above 70% threshold, accepting partial result)`)
    }
    
    // Trim to exactly the requested number if we got more
    if (validCards.length > cardCount) {
      console.log(`Trimming ${validCards.length} cards down to exactly ${cardCount}`)
      validCards = validCards.slice(0, cardCount)
    }
    
    console.log(`✅ Successfully returning ${validCards.length} cards from PDF`)
    
    // Return the validated cards
    return c.json({ cards: validCards })
  } catch (error) {
    console.error(`❌ PDF import error:`, error)
    console.error(`PDF import error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    console.error(`PDF import error message:`, error instanceof Error ? error.message : String(error))
    return c.json({ error: `Failed to process PDF file: ${error instanceof Error ? error.message : String(error)}` }, 500)
  }
})

// AI Text Translation (Premium only)
app.post('/ai/translate', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for AI translation')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in AI translate: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint does not use KV store - only checks user metadata
    // and calls external OpenAI API
    // 
    // Only change: Semantic routing (/make-server-8a1502a9/ai-translate → /ai/translate)
    // ============================================================

    // Check if user has premium subscription (from user metadata)
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`❌ Free user ${user.id} attempted translation - blocked`)
      return c.json({ error: 'Translation requires a Premium or Pro subscription' }, 403)
    }

    const body = await c.req.json()
    const { text, targetLanguage } = body
    
    if (!text || !targetLanguage) {
      console.log('❌ Missing required fields: text or targetLanguage')
      return c.json({ error: 'Text and target language are required' }, 400)
    }

    console.log(`🌐 AI Translate request:`)
    console.log(`   User: ${user.id}`)
    console.log(`   Subscription: ${subscriptionTier}`)
    console.log(`   Target Language: ${targetLanguage}`)
    console.log(`   Text length: ${text.length} characters`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('❌ OpenAI API key not configured')
      return c.json({ error: 'AI service not configured. Please add your OpenAI API key.' }, 500)
    }

    console.log(`🤖 Calling OpenAI API for translation...`)

    // Call OpenAI API for translation
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguage}. Provide ONLY the translation, with no explanations, quotes, or additional text. Preserve the original meaning and tone as closely as possible.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.log(`❌ OpenAI API error: ${openaiResponse.status} - ${errorData}`)
      return c.json({ error: 'Translation service error' }, 500)
    }

    const data = await openaiResponse.json()
    const translatedText = data.choices[0]?.message?.content?.trim()

    if (!translatedText) {
      console.log('❌ No translation received from OpenAI')
      return c.json({ error: 'Failed to generate translation' }, 500)
    }

    console.log(`✅ Translation successful`)
    console.log(`   Original: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)
    console.log(`   Translated: "${translatedText.substring(0, 50)}${translatedText.length > 50 ? '...' : ''}"`)
    
    return c.json({ translatedText })

  } catch (error) {
    console.log(`❌ AI translation error: ${error}`)
    console.error('AI translation error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to translate text' }, 500)
  }
})

// AI Text-to-Speech using OpenAI API (Premium feature)
app.post('/ai/tts', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ TTS: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint does not use KV store - only checks user metadata
    // and calls external OpenAI TTS API
    // 
    // Only change: Semantic routing (/make-server-8a1502a9/tts → /ai/tts)
    // ============================================================

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ TTS authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium access (monthly, annual, lifetime, moderator, or superuser)
    const isPremium = user.user_metadata?.subscriptionTier && 
                      ['monthly', 'annual', 'lifetime'].includes(user.user_metadata.subscriptionTier)
    const isModerator = user.user_metadata?.isModerator === true
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    if (!isPremium && !isModerator && !isSuperuser) {
      console.log(`❌ TTS: User ${user.id} does not have premium access`)
      return c.json({ error: 'Premium subscription required for OpenAI TTS' }, 403)
    }

    const body = await c.req.json()
    const { text, language } = body

    if (!text || text.trim().length === 0) {
      console.log('❌ TTS: No text provided')
      return c.json({ error: 'Text is required' }, 400)
    }

    // Map language to OpenAI voice
    // OpenAI supports: alloy, echo, fable, onyx, nova, shimmer
    // We'll use different voices for variety
    const voiceMap: { [key: string]: string } = {
      'en': 'alloy',
      'es': 'nova',
      'fr': 'shimmer',
      'de': 'onyx',
      'it': 'echo',
      'pt': 'fable',
      'ru': 'alloy',
      'ja': 'shimmer',
      'zh': 'nova',
      'ko': 'echo',
      'ar': 'onyx',
      'hi': 'fable',
      'nl': 'alloy',
      'pl': 'nova',
      'tr': 'shimmer',
      'sv': 'echo',
      'no': 'onyx',
      'da': 'fable',
      'fi': 'alloy',
      'el': 'nova',
      'he': 'shimmer',
      'th': 'echo',
      'vi': 'onyx',
      'id': 'fable',
      'cs': 'alloy',
      'ro': 'nova',
      'hu': 'shimmer',
      'uk': 'echo',
    }

    // Get language code from full language name
    const getLanguageCode = (langName?: string): string => {
      if (!langName) return 'en'
      const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' },
        { code: 'tr', name: 'Turkish' },
        { code: 'sv', name: 'Swedish' },
        { code: 'no', name: 'Norwegian' },
        { code: 'da', name: 'Danish' },
        { code: 'fi', name: 'Finnish' },
        { code: 'el', name: 'Greek' },
        { code: 'he', name: 'Hebrew' },
        { code: 'th', name: 'Thai' },
        { code: 'vi', name: 'Vietnamese' },
        { code: 'id', name: 'Indonesian' },
        { code: 'cs', name: 'Czech' },
        { code: 'ro', name: 'Romanian' },
        { code: 'hu', name: 'Hungarian' },
        { code: 'uk', name: 'Ukrainian' },
      ]
      const lang = languages.find(l => l.name === langName)
      return lang?.code || 'en'
    }

    const langCode = getLanguageCode(language)
    const voice = voiceMap[langCode] || 'alloy'

    console.log(`🔊 TTS request:`)
    console.log(`   User: ${user.id}`)
    console.log(`   Subscription: ${user.user_metadata?.subscriptionTier || 'N/A'}`)
    console.log(`   Language: ${language || 'English'} (${langCode})`)
    console.log(`   Voice: ${voice}`)
    console.log(`   Text length: ${text.length} characters`)

    // Call OpenAI TTS API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('❌ TTS: OpenAI API key not configured')
      return c.json({ error: 'TTS service not configured' }, 500)
    }

    console.log(`🤖 Calling OpenAI TTS API...`)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // Use tts-1 for lower latency, tts-1-hd for higher quality
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 0.9, // Slightly slower for learning
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ OpenAI TTS API error: ${response.status} - ${errorText}`)
      return c.json({ error: 'Failed to generate speech' }, 500)
    }

    // Get audio data as array buffer
    const audioBuffer = await response.arrayBuffer()
    
    // Convert to base64 for easy transmission
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    console.log(`✅ TTS successful`)
    console.log(`   Generated ${audioBuffer.byteLength} bytes of audio`)
    console.log(`   Base64 length: ${base64Audio.length} characters`)

    return c.json({ 
      audioData: base64Audio,
      format: 'mp3'
    })

  } catch (error) {
    console.log(`❌ TTS error: ${error}`)
    console.error('TTS error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to generate speech' }, 500)
  }
})

// ============================================================
// SUBSCRIPTIONS ENDPOINTS
// ============================================================

// Create Stripe Checkout Session
app.post('/subscriptions/checkout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for checkout session creation')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in create checkout session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Checks auth (already using Supabase)
    // 2. Validates plan type
    // 3. Calls Stripe API via stripeService
    // 4. Returns checkout session URL
    // No KV store operations to convert!
    // ============================================================

    const { planType } = await c.req.json()
    
    if (!planType || !['monthly', 'annual', 'lifetime'].includes(planType)) {
      console.log(`❌ Invalid plan type: ${planType}`)
      return c.json({ error: 'Invalid plan type' }, 400)
    }

    console.log(`💳 Creating checkout session - User: ${user.id}, Email: ${user.email}, Plan: ${planType}`)

    // Get the appropriate Stripe price ID
    const priceId = stripeService.STRIPE_PRICE_IDS[planType as keyof typeof stripeService.STRIPE_PRICE_IDS]
    
    if (!priceId) {
      console.log(`❌ No Stripe price ID configured for plan: ${planType}`)
      return c.json({ error: 'Payment configuration error. Please contact support.' }, 500)
    }

    // Create checkout session
    const origin = c.req.header('origin') || 'http://localhost:5173'
    console.log(`Using origin: ${origin}`)
    
    const session = await stripeService.createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: user.email!,
      planType: planType as 'monthly' | 'annual' | 'lifetime',
      successUrl: `${origin}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/#/upgrade`,
    })

    console.log(`✅ Checkout session created - Session ID: ${session.id}, User: ${user.id}, Plan: ${planType}`)
    
    return c.json({ url: session.url })
  } catch (error) {
    console.log(`❌ Create checkout session error: ${error}`)
    console.error('Checkout session error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// Stripe Webhook Handler
app.post('/subscriptions/stripe-webhook', async (c) => {
  console.log('=== 🔔 STRIPE WEBHOOK CALLED ===')
  
  try {
    const signature = c.req.header('stripe-signature')
    
    if (!signature) {
      console.log('❌ Missing stripe signature')
      return c.json({ error: 'Missing stripe signature' }, 400)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Verifies webhook signature (Stripe API)
    // 2. Updates user metadata via Supabase auth.admin
    // 3. Sends emails via emailService
    // No KV store operations to convert!
    // 
    // TEST MODE: For local testing, use 'X-Test-Mode: true' header
    // to bypass signature verification
    // ============================================================

    const rawBody = await c.req.text()
    console.log('📦 Webhook body length:', rawBody.length)
    
    // Check for test mode
    const isTestMode = c.req.header('x-test-mode') === 'true'
    
    let event: any
    
    if (isTestMode) {
      console.log('⚠️  TEST MODE ENABLED - Skipping signature verification')
      // Parse the raw body as a test event
      event = JSON.parse(rawBody)
    } else {
      // Verify webhook signature in production
      event = await stripeService.verifyWebhookSignature(rawBody, signature)
    }
    
    console.log(`✅ Stripe webhook received: ${event.type}`)
    console.log('📋 Event data:', JSON.stringify(event.data.object, null, 2))
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const userId = session.metadata?.userId
        const planType = session.metadata?.planType
        
        console.log(`💳 Payment successful!`)
        console.log(`   User ID: ${userId}`)
        console.log(`   Plan Type: ${planType}`)
        console.log(`   Customer: ${session.customer}`)
        console.log(`   Subscription: ${session.subscription}`)
        console.log(`   Metadata:`, session.metadata)
        
        if (!userId || !planType) {
          console.log('❌ Missing userId or planType in metadata')
          return c.json({ error: 'Missing metadata' }, 400)
        }
        
        // Get user
        const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId)
        
        if (getUserError || !userData) {
          console.log(`❌ User not found: ${getUserError?.message}`)
          break
        }
        
        console.log(`👤 Found user: ${userData.user.email}`)
        console.log(`   Current metadata:`, userData.user.user_metadata)
        
        // Calculate subscription expiry
        let subscriptionExpiry: string | undefined
        if (planType === 'monthly') {
          const expiry = new Date()
          expiry.setMonth(expiry.getMonth() + 1)
          subscriptionExpiry = expiry.toISOString()
        } else if (planType === 'annual') {
          const expiry = new Date()
          expiry.setFullYear(expiry.getFullYear() + 1)
          subscriptionExpiry = expiry.toISOString()
        } else if (planType === 'lifetime') {
          subscriptionExpiry = undefined // Lifetime has no expiry
        }
        
        // Update user's subscription tier to the actual plan type
        const subscriptionTier = planType // 'monthly', 'annual', or 'lifetime'
        
        const newMetadata = {
          ...userData.user.user_metadata,
          subscriptionTier,
          subscriptionExpiry,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        }
        
        console.log(`🔄 Updating user metadata to:`, newMetadata)
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          {
            user_metadata: newMetadata,
          }
        )
        
        if (updateError) {
          console.log(`❌ Failed to update user subscription: ${updateError.message}`)
        } else {
          console.log(`✅ User ${userId} upgraded to ${subscriptionTier}`)
          console.log(`   Expiry: ${subscriptionExpiry || 'Never (lifetime)'}`)
          
          // Update users table for backward compatibility
          const { error: dbUpdateError } = await supabase
            .from('users')
            .update({
              subscription_tier: subscriptionTier,
              subscription_expiry: subscriptionExpiry || null,
              stripe_customer_id: session.customer as string || null,
              stripe_subscription_id: session.subscription as string || null,
              subscription_cancelled_at_period_end: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
          
          if (dbUpdateError) {
            console.log(`⚠️ Failed to update users table: ${dbUpdateError.message}`)
          } else {
            console.log(`✅ Users table updated for user ${userId}`)
          }
          
          // Upsert subscriptions table
          const now = new Date()
          const { error: subUpsertError } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              tier: subscriptionTier,
              status: 'active',
              stripe_customer_id: session.customer as string || null,
              stripe_subscription_id: session.subscription as string || null,
              current_period_start: now.toISOString(),
              current_period_end: subscriptionExpiry || null,
              expires_at: subscriptionExpiry || null,
              is_manual: false,
              is_lifetime: planType === 'lifetime',
              source: 'stripe',
              notes: `Stripe checkout completed. Session ID: ${session.id}`,
              updated_at: now.toISOString()
            }, {
              onConflict: 'user_id'
            })
          
          if (subUpsertError) {
            console.log(`⚠️ Failed to update subscriptions table: ${subUpsertError.message}`)
          } else {
            console.log(`✅ Subscriptions table updated for user ${userId}`)
          }
          
          // Send billing receipt email
          if (userData.user.email) {
            const planLabels = {
              monthly: 'Monthly Premium',
              annual: 'Annual Premium',
              lifetime: 'Lifetime Premium'
            }
            const amounts = {
              monthly: '$6.99',
              annual: '$29.99',
              lifetime: '$89.99'
            }
            
            console.log(`📧 Sending receipt email to ${userData.user.email}`)
            
            emailService.sendBillingReceiptEmail(
              userData.user.email,
              userData.user.user_metadata?.displayName || userData.user.user_metadata?.name || 'there',
              amounts[planType as keyof typeof amounts] || '$0.00',
              planLabels[planType as keyof typeof planLabels] || planType,
              session.id,
              new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              session.invoice_pdf || undefined
            ).catch(err => console.error('❌ Failed to send receipt email:', err))
          }
        }
        
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        console.log(`🗑️ Subscription ${subscription.id} cancelled`)
        
        // Find user by Stripe subscription ID and downgrade to free
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
        
        if (usersError) {
          console.log(`❌ Error fetching users: ${usersError.message}`)
          break
        }
        
        const userToDowngrade = usersData.users.find(
          u => u.user_metadata?.stripeSubscriptionId === subscription.id
        )
        
        if (userToDowngrade) {
          console.log(`👤 Downgrading user ${userToDowngrade.id} to free tier`)
          
          const oldTier = userToDowngrade.user_metadata?.subscriptionTier || 'free'
          const endDate = userToDowngrade.user_metadata?.subscriptionExpiry 
            ? new Date(userToDowngrade.user_metadata.subscriptionExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'immediately'
          
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            userToDowngrade.id,
            {
              user_metadata: {
                ...userToDowngrade.user_metadata,
                subscriptionTier: 'free',
                subscriptionExpiry: undefined,
                subscriptionCancelledAtPeriodEnd: false,
                stripeSubscriptionId: undefined
              }
            }
          )
          
          if (updateError) {
            console.log(`❌ Failed to downgrade user: ${updateError.message}`)
          } else {
            console.log(`✅ User ${userToDowngrade.id} downgraded to free tier`)
            
            // Update users table
            const { error: dbUpdateError } = await supabase
              .from('users')
              .update({
                subscription_tier: 'free',
                subscription_expiry: null,
                subscription_cancelled_at_period_end: false,
                stripe_subscription_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', userToDowngrade.id)
            
            if (dbUpdateError) {
              console.log(`⚠️ Failed to update users table: ${dbUpdateError.message}`)
            } else {
              console.log(`✅ Users table updated for user ${userToDowngrade.id}`)
            }
            
            // Update subscriptions table status
            const { error: subUpdateError } = await supabase
              .from('subscriptions')
              .update({
                status: 'canceled',
                tier: 'free',
                canceled_at: new Date().toISOString(),
                notes: `Subscription canceled by Stripe. Subscription ID: ${subscription.id}`,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userToDowngrade.id)
            
            if (subUpdateError) {
              console.log(`⚠️ Failed to update subscriptions table: ${subUpdateError.message}`)
            } else {
              console.log(`✅ Subscriptions table updated for user ${userToDowngrade.id}`)
            }
            
            // Send cancellation confirmation email
            if (userToDowngrade.email) {
              const planLabels = {
                monthly: 'Monthly Premium',
                annual: 'Annual Premium',
                lifetime: 'Lifetime Premium'
              }
              
              console.log(`📧 Sending cancellation email to ${userToDowngrade.email}`)
              
              emailService.sendCancellationConfirmationEmail(
                userToDowngrade.email,
                userToDowngrade.user_metadata?.displayName || userToDowngrade.user_metadata?.name || 'there',
                planLabels[oldTier as keyof typeof planLabels] || oldTier,
                endDate
              ).catch(err => console.error('❌ Failed to send cancellation email:', err))
            }
          }
        } else {
          console.log(`⚠️ No user found with subscription ID ${subscription.id}`)
        }
        
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        console.log(`🔄 Subscription ${subscription.id} updated, status: ${subscription.status}`)
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        console.log(`❌ Payment failed for subscription ${invoice.subscription}`)
        
        // Find user by Stripe subscription ID
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
        
        if (!usersError && usersData) {
          const userWithFailedPayment = usersData.users.find(
            u => u.user_metadata?.stripeSubscriptionId === invoice.subscription
          )
          
          if (userWithFailedPayment?.email) {
            const amount = `$${(invoice.amount_due / 100).toFixed(2)}`
            const retryDate = invoice.next_payment_attempt 
              ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : 'soon'
            
            console.log(`📧 Sending payment failed email to ${userWithFailedPayment.email}`)
            
            emailService.sendFailedPaymentEmail(
              userWithFailedPayment.email,
              userWithFailedPayment.user_metadata?.displayName || userWithFailedPayment.user_metadata?.name || 'there',
              amount,
              retryDate
            ).catch(err => console.error('❌ Failed to send payment failed email:', err))
          }
        }
        
        break
      }
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
    
    console.log('=== ✅ WEBHOOK PROCESSED SUCCESSFULLY ===')
    return c.json({ received: true })
  } catch (error) {
    console.log(`❌ Stripe webhook error: ${error}`)
    console.log(`   Stack: ${(error as Error).stack}`)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Verify Payment and Upgrade User (fallback if webhook fails)
app.post('/subscriptions/verify-payment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for payment verification')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in verify payment: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Authenticates user (Supabase auth)
    // 2. Retrieves Stripe session via Stripe API
    // 3. Updates user metadata via Supabase auth.admin
    // This is a FALLBACK endpoint if webhook fails
    // No KV store operations to convert!
    // ============================================================

    const { sessionId } = await c.req.json()
    
    if (!sessionId) {
      console.log('❌ Missing session ID')
      return c.json({ error: 'Missing session ID' }, 400)
    }

    console.log(`🔍 Verifying payment for session ${sessionId}`)
    console.log(`   User: ${user.id} (${user.email})`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    console.log(`📋 Session status: ${session.payment_status}`)
    console.log(`   Customer: ${session.customer}`)
    console.log(`   Subscription: ${session.subscription}`)
    console.log(`   Metadata:`, session.metadata)

    if (session.payment_status !== 'paid') {
      console.log(`❌ Payment not completed - Status: ${session.payment_status}`)
      return c.json({ error: 'Payment not completed' }, 400)
    }

    const planType = session.metadata?.planType
    
    if (!planType) {
      console.log('❌ Invalid session metadata - missing planType')
      return c.json({ error: 'Invalid session metadata' }, 400)
    }

    console.log(`💳 Payment verified - Plan: ${planType}`)

    // Calculate subscription expiry
    let subscriptionExpiry: string | undefined
    if (planType === 'monthly') {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + 1)
      subscriptionExpiry = expiry.toISOString()
    } else if (planType === 'annual') {
      const expiry = new Date()
      expiry.setFullYear(expiry.getFullYear() + 1)
      subscriptionExpiry = expiry.toISOString()
    } else if (planType === 'lifetime') {
      subscriptionExpiry = undefined
    }

    // Update user's subscription tier to the actual plan type
    const subscriptionTier = planType // 'monthly', 'annual', or 'lifetime'
    
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(user.id)
    
    if (getUserError || !userData) {
      console.log(`❌ User not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    const newMetadata = {
      ...userData.user.user_metadata,
      subscriptionTier,
      subscriptionExpiry,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    }

    console.log(`🔄 Manually updating user metadata to:`, newMetadata)

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: newMetadata,
      }
    )

    if (updateError) {
      console.log(`❌ Failed to update user: ${updateError.message}`)
      return c.json({ error: 'Failed to update subscription' }, 500)
    }

    console.log(`✅ User ${user.id} manually upgraded to ${subscriptionTier}`)
    console.log(`   Expiry: ${subscriptionExpiry || 'Never (lifetime)'}`)
    console.log(`✅ Updated user metadata:`, updatedUser?.user?.user_metadata)

    // Update users table for backward compatibility
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({
        subscription_tier: subscriptionTier,
        subscription_expiry: subscriptionExpiry || null,
        stripe_customer_id: session.customer as string || null,
        stripe_subscription_id: session.subscription as string || null,
        subscription_cancelled_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (dbUpdateError) {
      console.log(`⚠️ Failed to update users table: ${dbUpdateError.message}`)
    } else {
      console.log(`✅ Users table updated for user ${user.id}`)
    }
    
    // Upsert subscriptions table
    const now = new Date()
    const { error: subUpsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        tier: subscriptionTier,
        status: 'active',
        stripe_customer_id: session.customer as string || null,
        stripe_subscription_id: session.subscription as string || null,
        current_period_start: now.toISOString(),
        current_period_end: subscriptionExpiry || null,
        expires_at: subscriptionExpiry || null,
        is_manual: false,
        is_lifetime: planType === 'lifetime',
        source: 'stripe',
        notes: `Payment verified manually. Session ID: ${sessionId}`,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (subUpsertError) {
      console.log(`⚠️ Failed to update subscriptions table: ${subUpsertError.message}`)
    } else {
      console.log(`✅ Subscriptions table updated for user ${user.id}`)
    }

    return c.json({ 
      success: true, 
      subscriptionTier,
      subscriptionExpiry 
    })
  } catch (error) {
    console.log(`❌ Verify payment error: ${error}`)
    console.error('Payment verification error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to verify payment' }, 500)
  }
})

// Cancel Subscription
app.post('/subscriptions/cancel-subscription', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for subscription cancellation')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in cancel subscription: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Authenticates user (Supabase auth)
    // 2. Calls Stripe API to cancel subscription
    // 3. Updates user metadata via Supabase auth.admin
    // No KV store operations to convert!
    // ============================================================

    const stripeSubscriptionId = user.user_metadata?.stripeSubscriptionId
    
    if (!stripeSubscriptionId) {
      console.log(`❌ No Stripe subscription ID found for user ${user.id}`)
      return c.json({ error: 'No active subscription found' }, 404)
    }

    console.log(`🗑️ Cancelling Stripe subscription ${stripeSubscriptionId}`)
    console.log(`   User: ${user.id} (${user.email})`)
    console.log(`   Current Tier: ${user.user_metadata?.subscriptionTier}`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    // Cancel the subscription in Stripe (at period end, so they keep access until billing cycle ends)
    const cancelledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    console.log(`✅ Stripe subscription marked for cancellation at period end`)
    console.log(`   Current Period End: ${new Date(cancelledSubscription.current_period_end * 1000).toISOString()}`)

    // Update user metadata to reflect cancellation
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(user.id)
    
    if (getUserError || !userData) {
      console.log(`❌ User not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    const newMetadata = {
      ...userData.user.user_metadata,
      subscriptionCancelledAtPeriodEnd: true
    }

    console.log(`🔄 Updating user metadata with cancellation flag`)

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: newMetadata,
      }
    )

    if (updateError) {
      console.log(`❌ Failed to update user metadata: ${updateError.message}`)
      return c.json({ error: 'Failed to update user' }, 500)
    }

    console.log(`✅ User ${user.id} subscription cancelled at period end`)
    console.log(`   Access until: ${new Date(cancelledSubscription.current_period_end * 1000).toLocaleDateString()}`)

    // Update users table
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({
        subscription_cancelled_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (dbUpdateError) {
      console.log(`⚠️ Failed to update users table: ${dbUpdateError.message}`)
    } else {
      console.log(`✅ Users table updated with cancellation flag`)
    }
    
    // Update subscriptions table - keep status active but mark for cancellation
    const { error: subUpdateError } = await supabase
      .from('subscriptions')
      .update({
        canceled_at: new Date().toISOString(),
        notes: `User requested cancellation at period end. Access until ${new Date(cancelledSubscription.current_period_end * 1000).toISOString()}`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
    
    if (subUpdateError) {
      console.log(`⚠️ Failed to update subscriptions table: ${subUpdateError.message}`)
    } else {
      console.log(`✅ Subscriptions table updated with cancellation timestamp`)
    }

    return c.json({ 
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      accessUntil: new Date(cancelledSubscription.current_period_end * 1000).toISOString()
    })
  } catch (error) {
    console.log(`❌ Cancel subscription error: ${error}`)
    console.error('Subscription cancellation error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to cancel subscription' }, 500)
  }
})

// Change Subscription Plan
app.post('/subscriptions/change-subscription-plan', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for plan change')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in change subscription plan: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Authenticates user (Supabase auth)
    // 2. Validates new plan type
    // 3. Calls Stripe API to update/cancel subscription
    // 4. Updates user metadata via Supabase auth.admin
    // No KV store operations to convert!
    // ============================================================

    const { newPlan } = await c.req.json()
    
    if (!['monthly', 'annual', 'lifetime'].includes(newPlan)) {
      console.log(`❌ Invalid plan requested: ${newPlan}`)
      return c.json({ error: 'Invalid plan' }, 400)
    }

    const currentTier = user.user_metadata?.subscriptionTier
    const stripeSubscriptionId = user.user_metadata?.stripeSubscriptionId
    
    console.log(`🔄 Changing subscription plan`)
    console.log(`   User: ${user.id} (${user.email})`)
    console.log(`   From: ${currentTier}`)
    console.log(`   To: ${newPlan}`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    let newSubscriptionId = stripeSubscriptionId
    let newExpiry = user.user_metadata?.subscriptionExpiry

    // Handle lifetime separately (one-time payment, no Stripe subscription)
    if (newPlan === 'lifetime') {
      console.log(`💎 Upgrading to lifetime plan`)
      
      // If they have an existing Stripe subscription, cancel it
      if (stripeSubscriptionId) {
        console.log(`🗑️ Cancelling existing Stripe subscription for lifetime upgrade`)
        await stripe.subscriptions.cancel(stripeSubscriptionId)
        console.log(`✅ Previous subscription cancelled`)
      }
      
      // Lifetime has no expiry
      newSubscriptionId = null
      newExpiry = null
      
      console.log(`✅ User upgraded to lifetime - no subscription ID needed`)
    } else {
      // For monthly/annual changes
      const priceIds = {
        monthly: Deno.env.get('STRIPE_PRICE_ID_MONTHLY'),
        annual: Deno.env.get('STRIPE_PRICE_ID_ANNUAL')
      }
      
      const newPriceId = priceIds[newPlan as 'monthly' | 'annual']
      
      if (!newPriceId) {
        console.log(`❌ Price ID not configured for plan: ${newPlan}`)
        return c.json({ error: 'Price ID not configured' }, 500)
      }

      if (!stripeSubscriptionId) {
        console.log(`❌ No active Stripe subscription found for user ${user.id}`)
        return c.json({ error: 'No active Stripe subscription found' }, 404)
      }

      console.log(`🔄 Updating Stripe subscription to ${newPlan} plan`)
      console.log(`   New Price ID: ${newPriceId}`)

      // Get the current subscription
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      
      console.log(`📋 Current subscription retrieved`)
      console.log(`   Current Price: ${subscription.items.data[0].price.id}`)
      console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`)
      
      // Update the subscription with the new price
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'always_invoice', // Prorate and invoice immediately
        cancel_at_period_end: false, // Remove any cancellation
      })

      // Update expiry based on the new period end
      newExpiry = new Date(updatedSubscription.current_period_end * 1000).toISOString()
      
      console.log(`✅ Stripe subscription updated successfully`)
      console.log(`   New Price: ${newPriceId}`)
      console.log(`   New Period End: ${newExpiry}`)
      console.log(`   Proration: ${updatedSubscription.proration_behavior}`)
    }

    // Update user metadata
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(user.id)
    
    if (getUserError || !userData) {
      console.log(`❌ User not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    const newMetadata = {
      ...userData.user.user_metadata,
      subscriptionTier: newPlan,
      subscriptionExpiry: newExpiry,
      stripeSubscriptionId: newSubscriptionId,
      subscriptionCancelledAtPeriodEnd: false // Clear any cancellation flag
    }

    console.log(`🔄 Updating user metadata with new plan`)

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: newMetadata,
      }
    )

    if (updateError) {
      console.log(`❌ Failed to update user metadata: ${updateError.message}`)
      return c.json({ error: 'Failed to update user' }, 500)
    }

    console.log(`✅ User ${user.id} subscription changed to ${newPlan}`)
    console.log(`   New Expiry: ${newExpiry || 'Never (lifetime)'}`)
    console.log(`   Cancellation Flag Cleared: ${!newMetadata.subscriptionCancelledAtPeriodEnd}`)

    // Update users table
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({
        subscription_tier: newPlan,
        subscription_expiry: newExpiry || null,
        stripe_subscription_id: newSubscriptionId || null,
        subscription_cancelled_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (dbUpdateError) {
      console.log(`⚠️ Failed to update users table: ${dbUpdateError.message}`)
    } else {
      console.log(`✅ Users table updated for user ${user.id}`)
    }
    
    // Upsert subscriptions table
    const now = new Date()
    const { error: subUpsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        tier: newPlan,
        status: 'active',
        stripe_subscription_id: newSubscriptionId || null,
        current_period_end: newExpiry || null,
        expires_at: newExpiry || null,
        is_lifetime: newPlan === 'lifetime',
        canceled_at: null,
        notes: `Subscription plan changed from ${currentTier} to ${newPlan}`,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (subUpsertError) {
      console.log(`⚠️ Failed to update subscriptions table: ${subUpsertError.message}`)
    } else {
      console.log(`✅ Subscriptions table updated for user ${user.id}`)
    }

    return c.json({ 
      success: true,
      newPlan,
      subscriptionExpiry: newExpiry
    })
  } catch (error) {
    console.log(`❌ Change subscription plan error: ${error}`)
    console.error('Plan change error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to change subscription plan' }, 500)
  }
})

// Create Customer Portal Session (for managing subscriptions)
app.post('/subscriptions/create-portal-session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for portal session creation')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in create portal session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint only:
    // 1. Authenticates user (Supabase auth)
    // 2. Retrieves stripeCustomerId from user metadata
    // 3. Calls Stripe API to create portal session
    // No KV store operations to convert!
    // ============================================================

    const stripeCustomerId = user.user_metadata?.stripeCustomerId
    
    if (!stripeCustomerId) {
      console.log(`❌ No Stripe customer ID found for user ${user.id}`)
      return c.json({ error: 'No active subscription found' }, 404)
    }

    console.log(`🎫 Creating customer portal session`)
    console.log(`   User: ${user.id} (${user.email})`)
    console.log(`   Customer ID: ${stripeCustomerId}`)

    const origin = c.req.header('origin') || 'http://localhost:5173'
    const returnUrl = `${origin}/settings`
    
    console.log(`   Return URL: ${returnUrl}`)

    const session = await stripeService.createCustomerPortalSession(
      stripeCustomerId,
      returnUrl
    )

    console.log(`✅ Portal session created`)
    console.log(`   Session ID: ${session.id}`)
    console.log(`   Portal URL: ${session.url}`)

    return c.json({ url: session.url })
  } catch (error) {
    console.log(`❌ Create portal session error: ${error}`)
    console.error('Portal session error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to create portal session' }, 500)
  }
})

// ============================================================
// STUDY ENDPOINTS
// ============================================================

// Save study session
app.post('/study/sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for study session save')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in save study session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: await kv.set(`studySession:${user.id}:${session.id}`, session)
    // NEW: INSERT INTO study_sessions ... ON CONFLICT UPDATE
    // ============================================================

    const body = await c.req.json()
    console.log(`📦 Received body:`, JSON.stringify(body))
    
    // Handle both formats: direct body OR { session: {...} }
    const sessionData = body.session || body
    
    // If no ID provided, this is a new session - generate a UUID
    const sessionId = sessionData.id || crypto.randomUUID()
    const deckId = sessionData.deckId || sessionData.deck_id

    if (!deckId) {
      console.log('❌ Invalid session data - missing deckId')
      console.log(`   Body: ${JSON.stringify(body)}`)
      return c.json({ error: 'Invalid session data - deckId required' }, 400)
    }

    console.log(`📊 Saving study session`)
    console.log(`   User: ${user.id}`)
    console.log(`   Deck: ${deckId}`)
    console.log(`   Session: ${sessionId}`)
    console.log(`   Cards Studied: ${sessionData.cardsStudied || 0}`)
    console.log(`   Correct: ${sessionData.correctCount || 0}`)

    // Prepare session data for database
    const now = new Date().toISOString()
    const dbSessionData = {
      id: sessionId,
      user_id: user.id,
      deck_id: deckId,
      date: sessionData.date || sessionData.startedAt || sessionData.started_at || now,
      started_at: sessionData.startedAt || sessionData.started_at || now,
      ended_at: sessionData.endedAt || sessionData.ended_at || null,
      cards_studied: sessionData.cardsStudied || sessionData.cards_studied || 0,
      correct_count: sessionData.correctCount || sessionData.correct_count || 0,
      incorrect_count: sessionData.incorrectCount || sessionData.incorrect_count || 0,
      skipped_count: sessionData.skippedCount || sessionData.skipped_count || 0,
      study_mode: sessionData.mode || sessionData.studyMode || sessionData.study_mode || 'review',
      time_spent_seconds: sessionData.timeSpentSeconds || sessionData.time_spent_seconds || 0,
      session_data: sessionData, // Store full session object as JSONB
      updated_at: now
    }

    // UPSERT study session (insert or update if exists)
    const { data: savedSession, error: dbError } = await supabase
      .from('study_sessions')
      .upsert(dbSessionData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (dbError) {
      console.log(`❌ Database error saving study session: ${dbError.message}`)
      return c.json({ error: 'Failed to save study session' }, 500)
    }

    console.log(`✅ Study session saved successfully`)
    console.log(`   Duration: ${dbSessionData.time_spent_seconds}s`)
    console.log(`   Accuracy: ${dbSessionData.cards_studied > 0 ? Math.round((dbSessionData.correct_count / dbSessionData.cards_studied) * 100) : 0}%`)

    return c.json({ success: true, session: savedSession })
  } catch (error) {
    console.log(`❌ Save study session error: ${error}`)
    console.error('Study session error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to save study session' }, 500)
  }
})

// Get all study sessions for a user
app.get('/study/sessions', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Missing access token for get study sessions')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Auth error in get study sessions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: await kv.getByPrefix(`studySession:${user.id}:`)
    // NEW: SELECT * FROM study_sessions WHERE user_id = $1
    // ENHANCEMENTS:
    // - Optional deckId filter
    // - Optional studyMode filter
    // - Optional date range filter
    // - Pagination (limit/offset)
    // - Ordered by started_at DESC (most recent first)
    // ============================================================

    // Query parameters for filtering
    const deckId = c.req.query('deckId')
    const studyMode = c.req.query('studyMode')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')
    const limit = parseInt(c.req.query('limit') || '100', 10)
    const offset = parseInt(c.req.query('offset') || '0', 10)

    console.log(`📊 Fetching study sessions for user ${user.id}`)
    if (deckId) console.log(`   Filter: Deck ID = ${deckId}`)
    if (studyMode) console.log(`   Filter: Study Mode = ${studyMode}`)
    if (startDate || endDate) console.log(`   Filter: Date Range = ${startDate || 'any'} to ${endDate || 'any'}`)
    console.log(`   Pagination: Limit ${limit}, Offset ${offset}`)

    // Build query with filters
    let query = supabase
      .from('study_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply optional filters
    if (deckId) {
      query = query.eq('deck_id', deckId)
    }

    if (studyMode) {
      query = query.eq('study_mode', studyMode)
    }

    if (startDate) {
      query = query.gte('started_at', startDate)
    }

    if (endDate) {
      query = query.lte('started_at', endDate)
    }

    // Apply ordering and pagination
    query = query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: sessions, error: dbError, count } = await query

    if (dbError) {
      console.log(`❌ Database error fetching study sessions: ${dbError.message}`)
      return c.json({ error: 'Failed to fetch study sessions' }, 500)
    }

    const validSessions = sessions || []

    console.log(`✅ Retrieved ${validSessions.length} study sessions (Total: ${count || 0})`)
    
    // Calculate summary statistics
    if (validSessions.length > 0) {
      const totalCards = validSessions.reduce((sum, s) => sum + (s.cards_studied || 0), 0)
      const totalCorrect = validSessions.reduce((sum, s) => sum + (s.correct_count || 0), 0)
      const avgAccuracy = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0
      
      console.log(`   Total Cards: ${totalCards}, Avg Accuracy: ${avgAccuracy}%`)
    }

    return c.json({ 
      sessions: validSessions,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.log(`❌ Get study sessions error: ${error}`)
    console.error('Get study sessions error details:', error instanceof Error ? error.message : String(error))
    return c.json({ error: 'Failed to get study sessions' }, 500)
  }
})

// ============================================================
// SUPPORT ENDPOINTS
// ============================================================

// Export user data endpoint (GDPR compliance)
app.get('/support/export-data', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Export data: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Export data: Unauthorized - ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`📦 Exporting all data for user: ${user.id}`)

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: Multiple kv.getByPrefix() and kv.get() calls
    // NEW: Multiple SQL SELECT queries from different tables
    // OPTIMIZATION: Execute all queries in parallel using Promise.all
    // ============================================================

    // Execute all queries in parallel for better performance
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
      userStatsResult
    ] = await Promise.all([
      // 1. User's decks
      supabase.from('decks').select('*').eq('user_id', user.id),
      
      // 2. User's cards
      supabase.from('cards').select('*').eq('user_id', user.id),
      
      // 3. Study sessions
      supabase.from('study_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
      
      // 4. Published community decks
      supabase.from('community_decks').select('*').eq('author_id', user.id),
      
      // 5. User's comments
      supabase.from('comments').select('*').eq('user_id', user.id),
      
      // 6. User's ratings
      supabase.from('ratings').select('*').eq('user_id', user.id),
      
      // 7. Friends (both directions)
      supabase.from('friends').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
      
      // 8. Incoming friend requests
      supabase.from('friend_requests').select('*').eq('to_user_id', user.id).eq('status', 'pending'),
      
      // 9. Outgoing friend requests
      supabase.from('friend_requests').select('*').eq('from_user_id', user.id).eq('status', 'pending'),
      
      // 10. Notifications
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      
      // 11. Flags filed by user
      supabase.from('flags').select('*').eq('reporter_id', user.id),
      
      // 12. Achievements
      supabase.from('achievements').select('*').eq('user_id', user.id).single(),
      
      // 13. User stats
      supabase.from('user_stats').select('*').eq('user_id', user.id).single()
    ])

    // Extract data with safe defaults
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

    console.log(`📊 Data collection complete:`)
    console.log(`   Decks: ${decks.length}`)
    console.log(`   Cards: ${cards.length}`)
    console.log(`   Study Sessions: ${studySessions.length}`)
    console.log(`   Published Decks: ${publishedDecks.length}`)
    console.log(`   Comments: ${userComments.length}`)
    console.log(`   Ratings: ${userRatings.length}`)
    console.log(`   Friends: ${friendsData.length}`)
    console.log(`   Friend Requests: ${friendRequestsIncoming.length} incoming, ${friendRequestsOutgoing.length} outgoing`)
    console.log(`   Notifications: ${notifications.length}`)
    console.log(`   Flags: ${userFlags.length}`)

    // 1️⃣ User Account Information
    const userInfo = {
      userId: user.id,
      email: user.email,
      displayName: user.user_metadata?.displayName || user.user_metadata?.name,
      name: user.user_metadata?.name,
      avatarUrl: user.user_metadata?.avatarUrl,
      dateCreated: user.created_at,
      lastLogin: user.last_sign_in_at,
      subscriptionTier: user.user_metadata?.subscriptionTier || 'free',
      subscriptionRenewalDate: user.user_metadata?.subscriptionRenewalDate,
      stripeCustomerId: user.user_metadata?.stripeCustomerId ? '(redacted for security)' : null,
      hasGoogleLogin: user.app_metadata?.provider === 'google' || user.identities?.some(i => i.provider === 'google'),
      isSuperuser: user.user_metadata?.isSuperuser || false,
      isModerator: user.user_metadata?.isModerator || false,
      isBanned: user.user_metadata?.isBanned || false,
      banReason: user.user_metadata?.banReason || null,
    }

    // 2️⃣ User Profile Settings
    const profileSettings = {
      decksPublic: user.user_metadata?.decksPublic ?? true,
      notificationPreferences: {
        emailNotifications: user.user_metadata?.emailNotifications ?? true,
        emailOffers: user.user_metadata?.emailOffers ?? true,
      }
    }

    // 🖼️ User Files (Image URLs)
    const userImages = cards
      .flatMap(card => [card?.front_image_url, card?.back_image_url])
      .filter(url => url && url.trim() !== '')

    // 💾 Content the User Has Saved or Downloaded
    const importedDecks = decks.filter(deck => deck?.source_community_deck_id)
    const favoriteDecks = decks.filter(deck => deck?.favorite)
    const learnedDecks = decks.filter(deck => deck?.learned)

    // 🔐 Login & Authentication History
    const authHistory = {
      lastSignIn: user.last_sign_in_at,
      emailConfirmed: user.email_confirmed_at,
      providers: user.identities?.map(i => i.provider) || [],
    }

    // 💳 Subscription History
    const subscriptionHistory = {
      currentTier: user.user_metadata?.subscriptionTier || 'free',
      renewalDate: user.user_metadata?.subscriptionRenewalDate,
      hasActiveSubscription: ['monthly', 'annual', 'lifetime'].includes(user.user_metadata?.subscriptionTier || 'free'),
    }

    // Process friends data to normalize format
    const friends = friendsData.map(f => {
      // Determine which user is the friend (not the current user)
      const friendId = f.user_id === user.id ? f.friend_id : f.user_id
      return {
        friendId,
        friendsSince: f.created_at,
        status: f.status
      }
    })

    // Compile everything into a structured export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '2.0',
      exportFormat: 'PostgreSQL',
      
      userAccount: userInfo,
      profileSettings: profileSettings,
      
      decks: {
        total: decks.length,
        data: decks,
      },
      
      cards: {
        total: cards.length,
        data: cards,
      },
      
      learningProgress: {
        studySessions: {
          total: studySessions.length,
          data: studySessions,
        },
        achievements: achievements,
        userStats: userStats,
      },
      
      communityActivity: {
        publishedDecks: {
          total: publishedDecks.length,
          data: publishedDecks,
        },
        comments: {
          total: userComments.length,
          data: userComments,
        },
        ratings: {
          total: userRatings.length,
          data: userRatings,
        },
      },
      
      socialData: {
        friends: friends,
        friendRequests: {
          incoming: friendRequestsIncoming,
          outgoing: friendRequestsOutgoing,
        },
      },
      
      notifications: {
        total: notifications.length,
        data: notifications,
      },
      
      flags: {
        total: userFlags.length,
        data: userFlags,
        note: 'This only includes flags you filed, not flags filed against your content',
      },
      
      authHistory: authHistory,
      
      subscriptionHistory: subscriptionHistory,
      
      userFiles: {
        imageUrls: userImages,
        total: userImages.length,
        note: 'These are URLs to images you uploaded. Download them separately if needed.',
      },
      
      savedContent: {
        importedDecks: {
          total: importedDecks.length,
          data: importedDecks,
        },
        favoriteDecks: {
          total: favoriteDecks.length,
          data: favoriteDecks.map(d => ({ id: d?.id, name: d?.name })),
        },
        learnedDecks: {
          total: learnedDecks.length,
          data: learnedDecks.map(d => ({ id: d?.id, name: d?.name })),
        },
      },
      
      metadata: {
        totalDecks: decks.length,
        totalCards: cards.length,
        totalStudySessions: studySessions.length,
        totalPublishedDecks: publishedDecks.length,
        totalComments: userComments.length,
        totalRatings: userRatings.length,
        totalFriends: friends.length,
        totalNotifications: notifications.length,
        totalFlags: userFlags.length,
      }
    }

    console.log(`✅ Successfully compiled data export for user ${user.id}`)
    console.log(`   Total size: ${JSON.stringify(exportData).length} bytes`)
    
    return c.json(exportData)

  } catch (error) {
    console.log(`❌ Export data error: ${error}`)
    console.error('Export data error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500)
  }
})

// Contact form submission
app.post('/support/contact', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    // Verify user is authenticated
    if (!accessToken) {
      console.log('❌ Contact form: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Contact form authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint does not use KV store - only sends emails via
    // external email service (Resend)
    // 
    // Optional future enhancement: Save contact form submissions to
    // a contact_submissions table for record-keeping
    // 
    // Only change: Semantic routing (/make-server-8a1502a9/contact → /support/contact)
    // ============================================================
    
    const body = await c.req.json()
    const { category, subject, message } = body
    
    if (!category || !subject || !message) {
      console.log('❌ Contact form: Missing required fields')
      return c.json({ error: 'Missing required fields (category, subject, message)' }, 400)
    }

    // Validate message length
    if (message.length < 10) {
      console.log('❌ Contact form: Message too short')
      return c.json({ error: 'Message must be at least 10 characters' }, 400)
    }

    if (message.length > 5000) {
      console.log('❌ Contact form: Message too long')
      return c.json({ error: 'Message must be less than 5000 characters' }, 400)
    }
    
    const userName = user.user_metadata?.displayName || user.user_metadata?.name || 'User'
    const userEmail = user.email || 'no-email@example.com'
    const userTier = user.user_metadata?.subscriptionTier || 'free'
    const isModerator = user.user_metadata?.isModerator || false
    const isSuperuser = user.user_metadata?.isSuperuser || false
    
    console.log(`📧 Contact form submission`)
    console.log(`   From: ${userName} (${userEmail})`)
    console.log(`   Category: ${category}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Message length: ${message.length} characters`)
    console.log(`   User tier: ${userTier}`)
    console.log(`   Staff: ${isModerator ? 'moderator' : isSuperuser ? 'superuser' : 'no'}`)
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.log('⚠️  RESEND_API_KEY not configured - email sending disabled')
      console.log('   Contact form submitted but no emails sent')
      
      // Still return success for development
      return c.json({ 
        success: true,
        message: 'Contact form submitted successfully',
        emailSent: false,
        note: 'Email service not configured - in production this would send emails'
      })
    }

    const supportEmail = 'support@flashy.app'
    const timestamp = new Date().toISOString()

    // 1. Send email to support team
    try {
      console.log(`📤 Sending contact form to support team...`)

      const supportEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Flashy Support <noreply@flashy.app>',
          to: supportEmail,
          reply_to: userEmail,
          subject: `[${category.toUpperCase()}] ${subject}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: sans-serif; max-width: 700px; margin: 0 auto; background: #F9FAFB; }
                .email-container { background: white; margin: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .header { background: #4F46E5; color: white; padding: 20px 30px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header .category { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 8px; }
                .content { padding: 30px; }
                .field { margin-bottom: 20px; }
                .field-label { font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .field-value { color: #1F2937; line-height: 1.6; }
                .message-box { background: #F3F4F6; padding: 20px; border-radius: 6px; border-left: 4px solid #4F46E5; white-space: pre-wrap; word-wrap: break-word; }
                .user-info { background: #FEF3C7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #F59E0B; }
                .user-info h3 { margin: 0 0 10px 0; color: #92400E; font-size: 14px; }
                .user-info div { color: #78350F; font-size: 13px; margin: 4px 0; }
                .badge { display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; }
                .badge.premium { background: #FDE68A; color: #92400E; }
                .badge.staff { background: #FEE2E2; color: #991B1B; }
                .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 13px; }
                .reply-button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <h1>📧 New Contact Form Submission</h1>
                  <span class="category">${category.toUpperCase()}</span>
                </div>
                
                <div class="content">
                  <div class="field">
                    <div class="field-label">Subject</div>
                    <div class="field-value"><strong>${subject}</strong></div>
                  </div>
                  
                  <div class="field">
                    <div class="field-label">Message</div>
                    <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
                  </div>
                  
                  <div class="user-info">
                    <h3>👤 User Information</h3>
                    <div><strong>Name:</strong> ${userName}</div>
                    <div><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></div>
                    <div><strong>User ID:</strong> ${user.id}</div>
                    <div><strong>Subscription:</strong> ${userTier.toUpperCase()}
                      ${userTier !== 'free' ? '<span class="badge premium">Premium</span>' : ''}
                    </div>
                    ${isModerator || isSuperuser ? `
                      <div><strong>Staff Role:</strong> ${isSuperuser ? 'Superuser' : 'Moderator'}
                        <span class="badge staff">STAFF</span>
                      </div>
                    ` : ''}
                    <div><strong>Submitted:</strong> ${new Date(timestamp).toLocaleString()}</div>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="mailto:${userEmail}?subject=Re: ${encodeURIComponent(subject)}" class="reply-button">
                      Reply to ${userName}
                    </a>
                  </p>
                </div>
                
                <div class="footer">
                  <p>This message was sent via the Flashy contact form.</p>
                  <p style="color: #9CA3AF; font-size: 11px; margin-top: 8px;">
                    Reply-to is set to the user's email address for easy response.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      })

      if (!supportEmailResponse.ok) {
        const errorText = await supportEmailResponse.text()
        console.log(`❌ Failed to send support email: ${supportEmailResponse.status} - ${errorText}`)
      } else {
        const supportData = await supportEmailResponse.json()
        console.log(`✅ Support email sent successfully (ID: ${supportData.id})`)
      }
    } catch (emailError) {
      console.log(`❌ Support email error: ${emailError}`)
    }

    // 2. Send confirmation email to user
    try {
      console.log(`📤 Sending confirmation email to user...`)

      const confirmationEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Flashy Support <noreply@flashy.app>',
          to: userEmail,
          subject: `We received your message: ${subject}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #F9FAFB; }
                .email-container { background: white; margin: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { padding: 40px 30px; }
                .content p { line-height: 1.6; color: #374151; margin: 16px 0; }
                .message-summary { background: #F3F4F6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5; }
                .message-summary h3 { margin: 0 0 10px 0; color: #1F2937; font-size: 16px; }
                .message-summary .category { color: #4F46E5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .message-summary .subject { color: #1F2937; font-size: 14px; margin-top: 8px; }
                .info-box { background: #EFF6FF; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3B82F6; }
                .info-box p { margin: 4px 0; color: #1E40AF; font-size: 14px; }
                .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
                .footer a { color: #4F46E5; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <h1>✅ Message Received!</h1>
                  <p>We'll get back to you soon</p>
                </div>
                
                <div class="content">
                  <p>Hi <strong>${userName}</strong>,</p>
                  
                  <p>Thank you for contacting Flashy support! We've received your message and our team will review it shortly.</p>
                  
                  <div class="message-summary">
                    <div class="category">${category}</div>
                    <h3 class="subject">${subject}</h3>
                  </div>
                  
                  <div class="info-box">
                    <p><strong>⏱️ Expected Response Time:</strong></p>
                    <p>• ${category === 'bug' ? 'Bug reports: 24-48 hours' : category === 'feature' ? 'Feature requests: 3-5 business days' : category === 'question' ? 'Questions: 12-24 hours' : category === 'billing' ? 'Billing inquiries: 12-24 hours' : 'General inquiries: 2-3 business days'}</p>
                    ${isModerator || isSuperuser ? '<p style="color: #DC2626;">• <strong>Priority support for staff members</strong></p>' : ''}
                  </div>
                  
                  <p>In the meantime, you might find these resources helpful:</p>
                  <ul style="color: #4B5563;">
                    <li><a href="https://flashy.app/help" style="color: #4F46E5;">Help Center</a> - Common questions and guides</li>
                    <li><a href="https://flashy.app/docs" style="color: #4F46E5;">Documentation</a> - Detailed feature documentation</li>
                    <li><a href="https://flashy.app/community" style="color: #4F46E5;">Community Forum</a> - Connect with other users</li>
                  </ul>
                  
                  <p style="color: #6B7280; font-size: 13px; margin-top: 30px;">
                    <strong>Reference ID:</strong> ${user.id.slice(0, 8)}-${Date.now().toString(36)}
                  </p>
                </div>
                
                <div class="footer">
                  <p>Need urgent help? Visit our <a href="https://flashy.app/help">Help Center</a></p>
                  <p style="margin-top: 10px; color: #9CA3AF; font-size: 12px;">
                    This is an automated confirmation. Please do not reply to this email.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      })

      if (!confirmationEmailResponse.ok) {
        const errorText = await confirmationEmailResponse.text()
        console.log(`❌ Failed to send confirmation email: ${confirmationEmailResponse.status} - ${errorText}`)
      } else {
        const confirmationData = await confirmationEmailResponse.json()
        console.log(`✅ Confirmation email sent successfully (ID: ${confirmationData.id})`)
      }
    } catch (emailError) {
      console.log(`❌ Confirmation email error: ${emailError}`)
    }
    
    return c.json({ 
      success: true,
      message: 'Contact form submitted successfully. We\'ll get back to you soon!',
      emailSent: true
    })

  } catch (error) {
    console.log(`❌ Contact form submission error: ${error}`)
    console.error('Contact form error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to submit contact form' }, 500)
  }
})

// ============================================================
// REFERRALS ENDPOINTS
// ============================================================

// Send referral invite
app.post('/referrals/invite', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Referral invite: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Referral invite authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: await kv.set(`referral:${referralCode}`, {...})
    // NEW: INSERT INTO referrals
    // 
    // OLD: await kv.get/set(`user:${user.id}:invites`) array
    // NEW: Query referrals table (no separate list needed)
    // ============================================================

    const body = await c.req.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      console.log('❌ Referral invite: Invalid email')
      return c.json({ error: 'Valid email is required' }, 400)
    }

    console.log(`🎁 Processing referral invite from ${user.id} to ${email}`)

    // Check if email is already registered
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (emailExists) {
      console.log(`❌ Referral invite: Email ${email} already registered`)
      return c.json({ error: 'This email is already registered' }, 400)
    }

    // Generate referral code
    const referralCode = `${user.id.substring(0, 8)}-${Date.now()}`
    const now = new Date().toISOString()

    // Store referral in database
    const referralData = {
      code: referralCode,
      referrer_id: user.id,
      referrer_name: user.user_metadata?.displayName || user.email || 'Unknown',
      invited_email: email.toLowerCase(),
      status: 'pending',
      created_at: now,
      accepted_at: null,
      referee_id: null,
    }

    const { data: createdReferral, error: referralError } = await supabase
      .from('referrals')
      .insert(referralData)
      .select()
      .single()

    if (referralError) {
      console.log(`❌ Database error creating referral: ${referralError.message}`)
      return c.json({ error: 'Failed to create referral' }, 500)
    }

    console.log(`✅ Referral invite created`)
    console.log(`   From: ${user.user_metadata?.displayName || user.email}`)
    console.log(`   To: ${email}`)
    console.log(`   Code: ${referralCode}`)

    // Generate referral link
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '') || 'http://localhost:3000'
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`

    console.log(`🔗 Referral link: ${referralLink}`)
    console.log(`📧 In production, email would be sent to ${email}`)

    return c.json({ 
      message: 'Referral invite sent successfully',
      referralCode,
      referralLink,
      referral: createdReferral,
      note: 'In production, this would be sent via email'
    })

  } catch (error) {
    console.log(`❌ Referral invite error: ${error}`)
    console.error('Referral invite error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to send referral invite' }, 500)
  }
})

// Get user's referral stats
app.get('/referrals/stats', async (c: Context) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Referral stats: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Referral stats authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: await kv.get(`user:${user.id}:invites`) array
    // NEW: SELECT FROM referrals WHERE referrer_id = user.id
    // ============================================================

    console.log(`📊 Fetching referral stats for user ${user.id}`)

    // Get all referrals for this user
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    if (referralsError) {
      console.log(`❌ Database error fetching referrals: ${referralsError.message}`)
      return c.json({ error: 'Failed to fetch referral stats' }, 500)
    }

    // Calculate statistics
    const totalInvites = referrals?.length || 0
    const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
    const acceptedReferrals = referrals?.filter(r => r.status === 'accepted').length || 0
    const expiredReferrals = referrals?.filter(r => r.status === 'expired').length || 0

    // Calculate conversion rate
    const conversionRate = totalInvites > 0 
      ? Math.round((acceptedReferrals / totalInvites) * 100) 
      : 0

    console.log(`✅ Referral stats retrieved`)
    console.log(`   Total invites: ${totalInvites}`)
    console.log(`   Pending: ${pendingReferrals}`)
    console.log(`   Accepted: ${acceptedReferrals}`)
    console.log(`   Expired: ${expiredReferrals}`)
    console.log(`   Conversion rate: ${conversionRate}%`)

    return c.json({
      totalInvites,
      pendingReferrals,
      acceptedReferrals,
      expiredReferrals,
      conversionRate,
      invites: referrals || [],
      // Legacy field names for backward compatibility
      completedReferrals: acceptedReferrals
    })

  } catch (error) {
    console.log(`❌ Referral stats error: ${error}`)
    console.error('Referral stats error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to get referral stats' }, 500)
  }
})

// Check and apply referral code during signup
app.post('/referrals/apply', async (c: Context) => {
  try {
    const body = await c.req.json()
    const { referralCode, newUserId } = body

    if (!referralCode || !newUserId) {
      console.log('❌ Referral apply: Missing referral code or user ID')
      return c.json({ error: 'Referral code and user ID required' }, 400)
    }

    // ============================================================
    // SQL CONVERSION: KV → PostgreSQL
    // OLD: await kv.get(`referral:${referralCode}`)
    // NEW: SELECT FROM referrals WHERE code = $1
    // 
    // OLD: await kv.set(referralKey, updatedData)
    // NEW: UPDATE referrals SET status = 'accepted', ...
    // 
    // OLD: await kv.get/set(`user:${referrerId}:invites`) array
    // NEW: No separate list needed (query table)
    // ============================================================

    console.log(`🎁 Processing referral code: ${referralCode} for new user: ${newUserId}`)

    // Get referral data from database
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('code', referralCode)
      .single()

    if (referralError || !referralData) {
      console.log(`❌ Invalid referral code: ${referralCode}`)
      return c.json({ error: 'Invalid referral code' }, 400)
    }

    // Check if referral is still pending
    if (referralData.status !== 'pending') {
      console.log(`❌ Referral code already used: ${referralCode} (status: ${referralData.status})`)
      return c.json({ error: 'Referral code already used' }, 400)
    }

    const now = new Date().toISOString()

    // Update referral status to accepted
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'accepted',
        accepted_at: now,
        referee_id: newUserId
      })
      .eq('code', referralCode)

    if (updateError) {
      console.log(`❌ Database error updating referral: ${updateError.message}`)
      return c.json({ error: 'Failed to apply referral' }, 500)
    }

    console.log(`✅ Referral marked as accepted`)

    // Grant premium bonus to new user (1 month free)
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1)

    console.log(`🎁 Granting 1 month premium to new user ${newUserId}`)

    const { error: newUserError } = await supabase.auth.admin.updateUserById(newUserId, {
      user_metadata: {
        subscriptionTier: 'monthly',
        subscriptionExpiry: expiryDate.toISOString(),
        subscriptionCancelledAtPeriodEnd: false,
        referralBonus: true
      }
    })

    if (newUserError) {
      console.log(`❌ Failed to grant premium to new user: ${newUserError.message}`)
    } else {
      console.log(`✅ New user ${newUserId} granted premium until ${expiryDate.toISOString()}`)
    }

    // Grant bonus to referrer (1 month extension or new subscription)
    const { data: referrerData } = await supabase.auth.admin.getUserById(referralData.referrer_id)
    
    if (referrerData?.user) {
      const currentTier = referrerData.user.user_metadata?.subscriptionTier || 'free'
      
      console.log(`🎁 Processing referrer bonus for ${referralData.referrer_id} (current tier: ${currentTier})`)
      
      if (currentTier === 'lifetime') {
        console.log(`   Referrer has lifetime subscription, no bonus needed`)
      } else {
        const referrerExpiry = new Date()
        
        // If already has premium, extend from current expiry
        if (currentTier === 'monthly' || currentTier === 'annual') {
          if (referrerData.user.user_metadata?.subscriptionExpiry) {
            const currentExpiry = new Date(referrerData.user.user_metadata.subscriptionExpiry)
            if (currentExpiry > new Date()) {
              referrerExpiry.setTime(currentExpiry.getTime())
            }
          }
        }
        
        // Add 1 month extension
        referrerExpiry.setMonth(referrerExpiry.getMonth() + 1)

        const { error: referrerError } = await supabase.auth.admin.updateUserById(referralData.referrer_id, {
          user_metadata: {
            ...referrerData.user.user_metadata,
            subscriptionTier: currentTier === 'free' ? 'monthly' : currentTier,
            subscriptionExpiry: referrerExpiry.toISOString(),
            subscriptionCancelledAtPeriodEnd: false
          }
        })

        if (referrerError) {
          console.log(`❌ Failed to grant premium to referrer: ${referrerError.message}`)
        } else {
          console.log(`✅ Referrer ${referralData.referrer_id} subscription extended to ${referrerExpiry.toISOString()}`)
        }
      }
    }

    console.log(`✅ Referral completed: ${referralData.referrer_id} referred ${newUserId}`)
    console.log(`   Both users received premium bonuses!`)

    // Send reward email to referrer (don't block if email fails)
    if (referrerData?.user?.email) {
      const currentTier = referrerData.user.user_metadata?.subscriptionTier || 'free'
      
      if (currentTier !== 'lifetime') {
        const { data: newUserData } = await supabase.auth.admin.getUserById(newUserId)
        const newUserName = newUserData?.user?.user_metadata?.displayName || 
                           newUserData?.user?.user_metadata?.name || 
                           'Your friend'
        const reward = currentTier === 'free' ? '1 month of Premium' : '1 month subscription extension'
        
        // Note: emailService would need to be implemented
        // For now, just log
        console.log(`📧 Would send referral reward email to ${referrerData.user.email}`)
        console.log(`   Referrer: ${referralData.referrer_name}`)
        console.log(`   New user: ${newUserName}`)
        console.log(`   Reward: ${reward}`)
      }
    }

    return c.json({ 
      success: true,
      message: 'Referral bonus applied! Both you and your friend received 1 month of premium.',
      referrerId: referralData.referrer_id,
      newUserId: newUserId
    })

  } catch (error) {
    console.log(`❌ Apply referral error: ${error}`)
    console.error('Apply referral error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to apply referral' }, 500)
  }
})

// Send referral invitation emails (batch sending)
app.post('/referrals/send-invite', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('❌ Send invite: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`❌ Send invite authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // ============================================================
    // NO SQL CONVERSION NEEDED
    // This endpoint does not use KV store - only sends email via
    // external email service (Resend)
    // 
    // BATCH SENDING: Accepts array of emails and sends to each one
    // ============================================================

    const body = await c.req.json()
    const { emails, fromName, referralLink } = body

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.log('❌ Send invite: Missing or invalid emails array')
      return c.json({ error: 'Valid emails array required' }, 400)
    }

    if (!referralLink) {
      console.log('❌ Send invite: Missing referral link')
      return c.json({ error: 'Referral link required' }, 400)
    }

    // Limit batch size to prevent abuse
    if (emails.length > 10) {
      console.log(`❌ Send invite: Too many emails (${emails.length} > 10)`)
      return c.json({ error: 'Maximum 10 emails per batch' }, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      console.log(`❌ Send invite: Invalid email formats: ${invalidEmails.join(', ')}`)
      return c.json({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` }, 400)
    }

    const senderName = fromName || 
                       user.user_metadata?.displayName || 
                       user.user_metadata?.name || 
                       'A friend'

    console.log(`📧 Sending ${emails.length} referral invite emails`)
    console.log(`   From: ${senderName} (${user.email})`)
    console.log(`   To: ${emails.join(', ')}`)
    console.log(`   Link: ${referralLink}`)

    // Send the referral invite emails via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.log('⚠️  RESEND_API_KEY not configured - email sending disabled')
      console.log('   In production, this would send actual emails')
      
      // For development, just log and return success
      return c.json({ 
        success: true,
        message: `${emails.length} invitation emails would be sent`,
        sent: emails.length,
        failed: 0,
        results: emails.map(email => ({ email, success: true, note: 'Email service not configured' })),
        note: 'Email service not configured - in production this would send real emails'
      })
    }

    // Email HTML template
    const getEmailHTML = (email: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #F9FAFB; }
          .email-container { background: white; margin: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .content p { line-height: 1.6; color: #374151; margin: 16px 0; }
          .cta-button { 
            display: inline-block;
            background: #4F46E5; 
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .cta-button:hover { background: #4338CA; }
          .features { background: #F3F4F6; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .features h3 { margin-top: 0; color: #1F2937; }
          .features ul { margin: 0; padding-left: 20px; }
          .features li { color: #4B5563; margin: 8px 0; }
          .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          .footer a { color: #4F46E5; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🎓 You're Invited to Flashy!</h1>
            <p>Smart flashcard learning made easy</p>
          </div>
          
          <div class="content">
            <p><strong>${senderName}</strong> has invited you to join Flashy, the intelligent flashcard learning platform.</p>
            
            <div class="features">
              <h3>What you'll get:</h3>
              <ul>
                <li>✨ <strong>1 Month Premium Free</strong> when you sign up</li>
                <li>🤖 AI-powered translation and text-to-speech</li>
                <li>📚 Create unlimited custom flashcard decks</li>
                <li>📊 Advanced study analytics and progress tracking</li>
                <li>🌍 Access thousands of community-created decks</li>
                <li>🎯 Smart spaced repetition system</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${referralLink}" class="cta-button">
                Sign Up & Get Premium Free
              </a>
            </p>
            
            <p style="color: #6B7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${referralLink}" style="color: #4F46E5; word-break: break-all;">${referralLink}</a>
            </p>
            
            <p style="color: #9CA3AF; font-size: 13px; margin-top: 30px;">
              This invitation expires in 30 days. Your friend will also receive a bonus when you sign up!
            </p>
          </div>
          
          <div class="footer">
            <p>Questions? Visit our <a href="https://flashy.app/help">Help Center</a></p>
            <p style="margin-top: 10px; color: #9CA3AF; font-size: 12px;">
              You received this email because ${senderName} invited you to join Flashy.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send emails in parallel
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Flashy <noreply@flashy.app>',
              to: email,
              subject: `${senderName} invited you to join Flashy!`,
              html: getEmailHTML(email)
            })
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`)
          }

          const emailData = await emailResponse.json()
          return { email, success: true, emailId: emailData.id }
        } catch (error) {
          return { email, success: false, error: String(error) }
        }
      })
    )

    // Process results
    const successResults: Array<{ email: string; success: boolean; emailId?: string }> = []
    const failedResults: Array<{ email: string; success: boolean; error?: string }> = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value as { email: string; success: boolean; emailId?: string; error?: string }
        if (data.success) {
          successResults.push({ email: data.email, success: true, emailId: data.emailId })
        } else {
          failedResults.push({ email: data.email, success: false, error: data.error })
        }
      } else {
        failedResults.push({ email: emails[index], success: false, error: result.reason })
      }
    })

    const totalSent = successResults.length
    const totalFailed = failedResults.length

    console.log(`✅ Referral invites sent: ${totalSent}/${emails.length} successful`)
    if (totalFailed > 0) {
      console.log(`❌ Failed emails: ${failedResults.map(r => r.email).join(', ')}`)
    }

    // Return detailed results
    return c.json({ 
      success: totalFailed === 0,
      message: totalFailed === 0 
        ? `All ${totalSent} invitation emails sent successfully` 
        : `${totalSent} emails sent, ${totalFailed} failed`,
      sent: totalSent,
      failed: totalFailed,
      results: [...successResults, ...failedResults]
    })

  } catch (error) {
    console.log(`❌ Send referral invite error: ${error}`)
    console.error('Send referral invite error stack:', error instanceof Error ? error.stack : String(error))
    return c.json({ error: 'Failed to send invitation emails' }, 500)
  }
})

Deno.serve(app.fetch)
