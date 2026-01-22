import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store'
import * as stripeService from './stripe'
import * as emailService from './emailService'
import { registerTicketRoutes } from './ticketRoutes-legacy'
import pdfParse from 'npm:pdf-parse@1.1.1'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

// Register ticket system routes
registerTicketRoutes(app)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Sign up route
app.post('/make-server-8a1502a9/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    console.log(`Sign up request received - Email: ${email}, Name: ${name}`)
    
    if (!email || !password || !name) {
      console.log('Sign up error: Missing required fields')
      return c.json({ error: 'Missing required fields' }, 400)
    }

    if (password.length < 6) {
      console.log('Sign up error: Password too short')
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    // Check if display name is already taken (trim and normalize)
    const normalizedName = name.trim().toLowerCase()
    
    // Fetch all users (with pagination to handle large user bases)
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: userPage } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })
      
      if (userPage?.users && userPage.users.length > 0) {
        allUsers = allUsers.concat(userPage.users)
        hasMore = userPage.users.length === perPage
        page++
      } else {
        hasMore = false
      }
    }
    
    const displayNameTaken = allUsers.some(u => {
      const existingDisplayName = u.user_metadata?.displayName
      if (!existingDisplayName) return false
      return existingDisplayName.trim().toLowerCase() === normalizedName
    })

    if (displayNameTaken) {
      console.log(`Sign up error: Display name already taken: ${name}`)
      return c.json({ error: 'Display name is already taken' }, 400)
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name,
        displayName: name, // Use name as displayName initially
        decksPublic: false, // Default to private decks
        subscriptionTier: 'free', // Default to free tier
        termsAcceptedAt: new Date().toISOString(), // Record terms acceptance timestamp
        privacyAcceptedAt: new Date().toISOString(), // Record privacy policy acceptance timestamp
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log(`Sign up error: ${error.message}`)
      return c.json({ error: error.message }, 400)
    }

    console.log(`User created successfully: ${data.user.id}`)
    
    // Send welcome email (don't block signup if email fails)
    emailService.sendWelcomeEmail(email, name).catch(err => {
      console.error('Failed to send welcome email:', err)
    })
    
    return c.json({ user: data.user })
  } catch (error) {
    console.log(`Sign up exception: ${error}`)
    return c.json({ error: 'Sign up failed' }, 500)
  }
})

// Check if display name is available
app.get('/make-server-8a1502a9/check-displayname/:displayName', async (c) => {
  try {
    const displayName = c.req.param('displayName')
    
    if (!displayName || displayName.trim().length === 0) {
      return c.json({ available: false, error: 'Display name cannot be empty' })
    }

    // Normalize the display name for comparison
    const normalizedName = displayName.trim().toLowerCase()

    // Fetch all users (with pagination to handle large user bases)
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: userPage } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })
      
      if (userPage?.users && userPage.users.length > 0) {
        allUsers = allUsers.concat(userPage.users)
        hasMore = userPage.users.length === perPage
        page++
      } else {
        hasMore = false
      }
    }
    
    const displayNameTaken = allUsers.some(u => {
      const existingDisplayName = u.user_metadata?.displayName
      if (!existingDisplayName) return false
      return existingDisplayName.trim().toLowerCase() === normalizedName
    })

    return c.json({ available: !displayNameTaken })
  } catch (error) {
    console.log(`Check display name exception: ${error}`)
    return c.json({ available: false, error: 'Failed to check display name' })
  }
})

// Update user profile
app.put('/make-server-8a1502a9/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update profile: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { displayName, avatarUrl, decksPublic, subscriptionTier, subscriptionExpiry, isSuperuser, isModerator } = await c.req.json()
    
    // Update user metadata
    const updates: any = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl
    if (decksPublic !== undefined) updates.decksPublic = decksPublic
    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier
    if (subscriptionExpiry !== undefined) updates.subscriptionExpiry = subscriptionExpiry
    
    // Handle isSuperuser - should only be set via SQL by admins
    // This is here for compatibility but won't be used in normal operation
    if (isSuperuser !== undefined) {
      console.log(`⚠️  Attempt to set isSuperuser via API by ${user.email} - this should be done via SQL`)
      // Silently ignore - don't update it via API
    }
    
    // Handle isModerator - allow setting it for any user
    if (isModerator !== undefined) {
      console.log(`🔐 Setting isModerator=${isModerator} for ${user.email}`)
      updates.isModerator = isModerator
      
      // Also update KV store profile - preserve existing isSuperuser
      const existingProfile = await kv.get(`user:${user.id}:profile`) || {}
      await kv.set(`user:${user.id}:profile`, {
        ...(existingProfile as any),
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        displayName: user.user_metadata?.displayName,
        avatarUrl: user.user_metadata?.avatarUrl,
        decksPublic: user.user_metadata?.decksPublic,
        subscriptionTier: user.user_metadata?.subscriptionTier,
        subscriptionExpiry: user.user_metadata?.subscriptionExpiry,
        isSuperuser: (existingProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser || false,
        isModerator: isModerator,
      })
      console.log(`✅ Updated KV store with isModerator=${isModerator}`)
    }

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          ...updates,
        },
      }
    )

    if (updateError) {
      console.log(`Update profile error: ${updateError.message}`)
      return c.json({ error: updateError.message }, 400)
    }

    return c.json({ 
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: updatedUser.user.user_metadata?.name,
        displayName: updatedUser.user.user_metadata?.displayName,
        avatarUrl: updatedUser.user.user_metadata?.avatarUrl,
        decksPublic: updatedUser.user.user_metadata?.decksPublic,
        subscriptionTier: updatedUser.user.user_metadata?.subscriptionTier || 'free',
        subscriptionExpiry: updatedUser.user.user_metadata?.subscriptionExpiry,
        isSuperuser: updatedUser.user.user_metadata?.isSuperuser || false,
        isModerator: updatedUser.user.user_metadata?.isModerator || false,
      }
    })
  } catch (error) {
    console.log(`Update profile exception: ${error}`)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Record terms acceptance (for Google OAuth users)
app.post('/make-server-8a1502a9/record-terms-acceptance', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in record terms acceptance: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { termsAcceptedAt } = await c.req.json()
    
    if (!termsAcceptedAt) {
      return c.json({ error: 'Missing termsAcceptedAt' }, 400)
    }

    // Update user metadata with terms acceptance timestamps
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          termsAcceptedAt,
          privacyAcceptedAt: termsAcceptedAt, // Same timestamp for both
        },
      }
    )

    if (updateError) {
      console.log(`Record terms acceptance error: ${updateError.message}`)
      return c.json({ error: updateError.message }, 400)
    }

    console.log(`Terms acceptance recorded for user ${user.id} at ${termsAcceptedAt}`)
    return c.json({ success: true })
  } catch (error) {
    console.log(`Record terms acceptance exception: ${error}`)
    return c.json({ error: 'Failed to record terms acceptance' }, 500)
  }
})

// Initialize storage buckets for avatars, card images, and card audio
const initializeStorage = async () => {
  try {
    const buckets = [
      { name: 'make-8a1502a9-avatars', sizeLimit: 5242880 }, // 5MB
      { name: 'make-8a1502a9-card-images', sizeLimit: 5242880 }, // 5MB
      { name: 'make-8a1502a9-card-audio', sizeLimit: 10485760 }, // 10MB for audio
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
app.post('/make-server-8a1502a9/upload-avatar', async (c) => {
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

    const bucketName = 'make-8a1502a9-avatars'
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
app.post('/make-server-8a1502a9/upload-card-image', async (c) => {
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

    const bucketName = 'make-8a1502a9-card-images'
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
app.post('/make-server-8a1502a9/upload-card-audio', async (c) => {
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

    const bucketName = 'make-8a1502a9-card-audio'
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

// Get user profile by ID
app.get('/make-server-8a1502a9/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
      console.log(`Get user profile error: ${error?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    // Get user's achievements
    const achievementsData = await kv.get(`user_achievements:${userId}`)
    const achievements = achievementsData?.unlockedAchievementIds || []
    console.log(`Get user profile - achievements for ${userId}:`, achievements)

    // Get user's decks if public
    const decksPublic = user.user.user_metadata?.decksPublic !== false
    let decks: any[] = []
    
    if (decksPublic) {
      const deckPrefix = `deck:${userId}:`
      console.log(`Get user profile - Searching for decks with prefix: "${deckPrefix}"`)
      const decksData = await kv.getByPrefix(deckPrefix)
      console.log(`Get user profile - raw decks data for ${userId}:`, decksData?.length || 0)
      console.log(`Get user profile - decksData sample:`, decksData?.slice(0, 2))
      // getByPrefix already returns the values directly, not {key, value} pairs
      decks = (decksData || [])
        .filter((deck: any) => deck !== null && deck !== undefined)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      console.log(`Get user profile - filtered decks for ${userId}:`, decks.length)
      console.log(`Get user profile - filtered decks sample:`, decks.slice(0, 2))
    }

    return c.json({ 
      user: {
        id: user.user.id,
        displayName: user.user.user_metadata?.displayName,
        name: user.user.user_metadata?.name,
        avatarUrl: user.user.user_metadata?.avatarUrl,
        decksPublic: decksPublic,
        subscriptionTier: user.user.user_metadata?.subscriptionTier || 'free',
        subscriptionExpiry: user.user.user_metadata?.subscriptionExpiry,
        isBanned: user.user.user_metadata?.isBanned || false,
        isModerator: user.user.user_metadata?.isModerator || false,
        achievements: achievements,
        decks: decks,
      }
    })
  } catch (error) {
    console.log(`Get user profile exception: ${error}`)
    return c.json({ error: 'Failed to get user profile' }, 500)
  }
})

// Toggle moderator status (Superuser only)
app.post('/make-server-8a1502a9/users/:userId/moderator', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    // Verify the requester is a superuser
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in moderator toggle: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is a superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      console.log(`Non-superuser ${user.email} attempted to toggle moderator status`)
      return c.json({ error: 'Only superusers can modify moderator status' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const body = await c.req.json()
    const { isModerator } = body

    if (typeof isModerator !== 'boolean') {
      return c.json({ error: 'isModerator must be a boolean' }, 400)
    }

    // Get target user
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUser) {
      console.log(`Target user not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    // Update user's moderator status
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      {
        user_metadata: {
          ...targetUser.user.user_metadata,
          isModerator: isModerator,
        },
      }
    )

    if (updateError) {
      console.log(`Toggle moderator error: ${updateError.message}`)
      return c.json({ error: updateError.message }, 400)
    }

    console.log(`User ${targetUserId} moderator status set to ${isModerator} by ${user.email}`)
    
    return c.json({ 
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        isModerator: updatedUser.user.user_metadata?.isModerator || false,
      }
    })
  } catch (error) {
    console.log(`Toggle moderator exception: ${error}`)
    return c.json({ error: 'Failed to toggle moderator status' }, 500)
  }
})

// Get user's friends list
app.get('/make-server-8a1502a9/users/:userId/friends', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('Get user friends: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get user friends: ${authError?.message || 'No user found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const targetUserId = c.req.param('userId')

    // Get friends from KV store
    const friendsKey = `user:${targetUserId}:friends`
    const friendsData = await kv.get(friendsKey)
    const friendIds = friendsData ? (friendsData as string[]) : []

    console.log(`Getting friends for user ${targetUserId}:`, friendIds)

    // Fetch user details for each friend
    const friendsDetails = []
    for (const friendId of friendIds) {
      try {
        const { data: friendUser, error: friendError } = await supabase.auth.admin.getUserById(friendId)
        if (!friendError && friendUser) {
          console.log(`Found user: ${friendId}`)
          friendsDetails.push({
            id: friendUser.user.id,
            email: friendUser.user.email,
            name: friendUser.user.user_metadata?.name || '',
            displayName: friendUser.user.user_metadata?.displayName || friendUser.user.user_metadata?.name || '',
            avatarUrl: friendUser.user.user_metadata?.avatarUrl,
            decksPublic: friendUser.user.user_metadata?.decksPublic ?? true,
          })
        }
      } catch (err) {
        console.log(`Error fetching friend ${friendId}:`, err)
        // Skip this friend if there's an error
      }
    }

    console.log(`Returning ${friendsDetails.length} friends`)

    return c.json({ 
      friends: friendsDetails,
    })
  } catch (error) {
    console.log(`Get user friends exception: ${error}`)
    return c.json({ error: 'Failed to get user friends' }, 500)
  }
})

// Get a specific user's deck (read-only access)
app.get('/make-server-8a1502a9/users/:userId/decks/:deckId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get user deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const targetUserId = c.req.param('userId')
    const deckId = c.req.param('deckId')
    
    // Get the target user to check if their decks are public
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUser) {
      console.log(`Target user not found: ${getUserError?.message}`)
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if decks are public (unless viewing own deck)
    const decksPublic = targetUser.user.user_metadata?.decksPublic !== false
    if (!decksPublic && user.id !== targetUserId) {
      return c.json({ error: 'This user\'s decks are private' }, 403)
    }

    // Get the deck
    const deck = await kv.get(`deck:${targetUserId}:${deckId}`)
    
    if (!deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Get the cards for this deck
    const cards = await kv.getByPrefix(`card:${targetUserId}:${deckId}:`)
    
    return c.json({ 
      deck,
      cards,
      isOwner: user.id === targetUserId
    })
  } catch (error) {
    console.log(`Get user deck exception: ${error}`)
    return c.json({ error: 'Failed to get deck' }, 500)
  }
})

// Get all decks for user
app.get('/make-server-8a1502a9/decks', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get decks: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const decks = await kv.getByPrefix(`deck:${user.id}:`)
    
    // Migration: Set creatorId for old decks that don't have it
    let migratedCount = 0
    for (const deck of decks) {
      if (!deck.creatorId) {
        deck.creatorId = user.id
        await kv.set(`deck:${user.id}:${deck.id}`, deck)
        migratedCount++
      }
    }
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} decks to add creatorId`)
    }
    
    return c.json({ decks })
  } catch (error) {
    console.log(`Get decks error: ${error}`)
    return c.json({ error: 'Failed to fetch decks' }, 500)
  }
})

// Create a new deck
app.post('/make-server-8a1502a9/decks', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { name, color, emoji, deckType, category, subtopic, difficulty, frontLanguage, backLanguage } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Deck name is required' }, 400)
    }

    // Get current decks to determine position
    const existingDecks = await kv.getByPrefix(`deck:${user.id}:`)
    const maxPosition = existingDecks.reduce((max, deck) => Math.max(max, deck.position || 0), -1)

    const deckId = crypto.randomUUID()
    const deck = {
      id: deckId,
      name,
      color: color || '#10B981',
      emoji: emoji || '📚',
      deckType: deckType || 'classic-flip',
      userId: user.id,
      creatorId: user.id, // User creating the deck is the creator
      createdAt: new Date().toISOString(),
      cardCount: 0,
      position: maxPosition + 1,
      category: category || undefined,
      subtopic: subtopic || undefined,
      difficulty: difficulty || undefined,
      frontLanguage: frontLanguage || undefined,
      backLanguage: backLanguage || undefined,
    }

    await kv.set(`deck:${user.id}:${deckId}`, deck)
    return c.json({ deck })
  } catch (error) {
    console.log(`Create deck error: ${error}`)
    return c.json({ error: 'Failed to create deck' }, 500)
  }
})

// Update deck positions (for drag and drop reordering)
// IMPORTANT: This must come BEFORE /decks/:deckId to avoid route conflicts
app.put('/make-server-8a1502a9/decks/positions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update deck positions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { positions } = await c.req.json()
    
    if (!Array.isArray(positions)) {
      return c.json({ error: 'Invalid positions data' }, 400)
    }

    // Update each deck's position
    for (const { id, position } of positions) {
      const deck = await kv.get(`deck:${user.id}:${id}`)
      if (deck) {
        deck.position = position
        await kv.set(`deck:${user.id}:${id}`, deck)
      }
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.log(`Update deck positions error: ${error}`)
    return c.json({ error: 'Failed to update deck positions' }, 500)
  }
})

// Update a deck
app.put('/make-server-8a1502a9/decks/:deckId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const updates = await c.req.json()
    
    const existingDeck = await kv.get(`deck:${user.id}:${deckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    const updatedDeck = { ...existingDeck, ...updates }
    await kv.set(`deck:${user.id}:${deckId}`, updatedDeck)
    
    return c.json({ deck: updatedDeck })
  } catch (error) {
    console.log(`Update deck error: ${error}`)
    return c.json({ error: 'Failed to update deck' }, 500)
  }
})

// Delete a deck (handles both regular user deletions and superuser moderation deletions)
app.delete('/make-server-8a1502a9/decks/:deckId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in delete deck: ${authError?.message}`)
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

      // Get the deck from community decks
      const communityDecksKey = 'community_decks'
      const communityDecks = await kv.get(communityDecksKey) || []
      const deckIndex = communityDecks.findIndex((d: any) => d.id === deckId)
      
      if (deckIndex === -1) {
        return c.json({ error: 'Deck not found' }, 404)
      }

      const deck = communityDecks[deckIndex]
      const deckAuthorId = deck.userId
      const deckName = deck.name

      // Store deleted deck for restoration
      const deletedItemsKey = 'deleted_items'
      const deletedItems = await kv.get(deletedItemsKey) || []
      deletedItems.push({
        id: crypto.randomUUID(),
        type: 'deck',
        itemId: deckId,
        data: deck,
        deletedBy: user.id,
        deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
        reason: reason.trim(),
        deletedAt: new Date().toISOString()
      })
      await kv.set(deletedItemsKey, deletedItems)

      // Remove deck from community
      communityDecks.splice(deckIndex, 1)
      await kv.set(communityDecksKey, communityDecks)

      // Mark the user's deck as publish-banned
      const userDecksKey = `decks:${deckAuthorId}`
      const userDecks = await kv.get(userDecksKey) || []
      const userDeckIndex = userDecks.findIndex((d: any) => d.id === deckId)
      
      if (userDeckIndex !== -1) {
        userDecks[userDeckIndex].publishBanned = true
        userDecks[userDeckIndex].publishBannedReason = reason.trim()
        userDecks[userDeckIndex].isPublic = false // Unpublish it
        await kv.set(userDecksKey, userDecks)
      }

      // Notify the deck author
      if (deckAuthorId && deckAuthorId !== user.id) {
        const notificationKey = `notifications:${deckAuthorId}`
        const notifications = await kv.get(notificationKey) || []
        
        const notification = {
          id: crypto.randomUUID(),
          type: 'deck_deleted',
          superuserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
          reason: reason.trim(),
          deckName: deckName,
          deckId: deckId,
          createdAt: new Date().toISOString(),
          read: false,
          seen: false
        }
        
        notifications.push(notification)
        await kv.set(notificationKey, notifications)
      }
      
      return c.json({ success: true, message: 'Deck deleted successfully' })
    } else {
      // Regular user deleting their own deck
      // Get the deck first to check if it's published to community
      const deck = await kv.get(`deck:${user.id}:${deckId}`)
      
      if (!deck) {
        return c.json({ error: 'Deck not found' }, 404)
      }
      
      // Delete all cards in the deck
      const cards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
      for (const card of cards) {
        await kv.del(`card:${user.id}:${deckId}:${card.id}`)
      }
      
      // Delete the deck
      await kv.del(`deck:${user.id}:${deckId}`)
      
      // Note: We no longer delete published community decks when deleting from My Decks
      // Users can unpublish separately if desired
      
      return c.json({ success: true })
    }
  } catch (error) {
    console.log(`Delete deck error: ${error}`)
    return c.json({ error: 'Failed to delete deck' }, 500)
  }
})

// Update an imported deck from community
app.put('/make-server-8a1502a9/decks/:deckId/update-from-community', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update imported deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { name, color, emoji, cards, category, subtopic, version } = await c.req.json()

    // Get the existing deck
    const existingDeck = await kv.get(`deck:${user.id}:${deckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    if (!existingDeck.sourceCommunityDeckId) {
      return c.json({ error: 'This deck was not imported from the community' }, 400)
    }

    // Delete all existing cards
    const existingCards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
    for (const card of existingCards) {
      await kv.del(`card:${user.id}:${deckId}:${card.id}`)
    }

    // Create new cards
    for (let index = 0; index < cards.length; index++) {
      const card = cards[index]
      const cardId = crypto.randomUUID()
      const newCard = {
        id: cardId,
        deckId: deckId,
        front: card.front,
        back: card.back,
        cardType: card.cardType || 'classic-flip',
        options: card.options,
        acceptedAnswers: card.acceptedAnswers,
        frontImageUrl: card.frontImageUrl,
        createdAt: new Date().toISOString(),
        position: index,
      }
      
      await kv.set(`card:${user.id}:${deckId}:${cardId}`, newCard)
    }

    // Update deck metadata
    const updatedDeck = {
      ...existingDeck,
      name,
      color,
      emoji,
      cardCount: cards.length,
      category,
      subtopic,
      communityDeckVersion: version,
    }
    
    await kv.set(`deck:${user.id}:${deckId}`, updatedDeck)

    return c.json({ deck: updatedDeck })
  } catch (error) {
    console.log(`Update imported deck error: ${error}`)
    return c.json({ error: 'Failed to update imported deck' }, 500)
  }
})

// Publish a deck to community
app.post('/make-server-8a1502a9/decks/:deckId/publish', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in publish deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { category, subtopic } = await c.req.json()
    
    if (!category || !subtopic) {
      return c.json({ error: 'Category and subtopic are required' }, 400)
    }

    // Get the deck
    const deck = await kv.get(`deck:${user.id}:${deckId}`)
    
    if (!deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Check if deck is banned from publishing
    if (deck.publishBanned) {
      return c.json({ 
        error: 'This deck has been banned from publishing',
        reason: deck.publishBannedReason || 'No reason provided'
      }, 403)
    }

    // Update the deck with category and subtopic
    const updatedDeck = {
      ...deck,
      category,
      subtopic,
    }
    
    await kv.set(`deck:${user.id}:${deckId}`, updatedDeck)
    
    return c.json({ deck: updatedDeck })
  } catch (error) {
    console.log(`Publish deck error: ${error}`)
    return c.json({ error: 'Failed to publish deck' }, 500)
  }
})

// Unpublish a deck from community
app.post('/make-server-8a1502a9/decks/:communityDeckId/unpublish', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in unpublish deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const communityDeckId = c.req.param('communityDeckId')
    const communityDeck = await kv.get(`community:published:${communityDeckId}`)
    
    if (!communityDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }
    
    // Only the author or superuser can unpublish
    if (communityDeck.authorId !== user.id && user.user_metadata?.role !== 'superuser') {
      return c.json({ error: 'Only the deck author can unpublish this deck' }, 403)
    }
    
    // Delete the community deck
    await kv.del(`community:published:${communityDeckId}`)
    
    // Delete associated ratings
    const ratings = await kv.getByPrefix(`rating:${communityDeckId}:`)
    for (const rating of ratings) {
      await kv.del(`rating:${communityDeckId}:${rating.userId}`)
    }
    
    // Delete associated comments
    const comments = await kv.getByPrefix(`comment:${communityDeckId}:`)
    for (const comment of comments) {
      await kv.del(`comment:${communityDeckId}:${comment.id}`)
    }
    
    // If the user still has the original deck in My Decks, update it
    const userDecks = await kv.getByPrefix(`deck:${user.id}:`)
    const originalDeck = userDecks.find((d: any) => d.communityPublishedId === communityDeckId)
    
    if (originalDeck) {
      originalDeck.communityPublishedId = null
      await kv.set(`deck:${user.id}:${originalDeck.id}`, originalDeck)
    }
    
    console.log(`Community deck ${communityDeckId} unpublished`)
    return c.json({ success: true })
  } catch (error) {
    console.log(`Unpublish deck error: ${error}`)
    return c.json({ error: 'Failed to unpublish deck' }, 500)
  }
})

// Get all cards for a deck
app.get('/make-server-8a1502a9/decks/:deckId/cards', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get cards: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const cards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
    
    return c.json({ cards })
  } catch (error) {
    console.log(`Get cards error: ${error}`)
    return c.json({ error: 'Failed to fetch cards' }, 500)
  }
})

// Batch create multiple cards (for AI generation performance)
// IMPORTANT: This must come BEFORE the single card endpoint to avoid route conflicts
app.post('/make-server-8a1502a9/decks/:deckId/cards/batch', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in batch create cards: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { cards: cardsToCreate } = await c.req.json()
    
    if (!Array.isArray(cardsToCreate) || cardsToCreate.length === 0) {
      return c.json({ error: 'Cards array is required' }, 400)
    }

    console.log(`Batch creating ${cardsToCreate.length} cards for deck ${deckId}`)

    // Get current cards to determine starting position
    const existingCards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
    const maxPosition = existingCards.reduce((max, card) => Math.max(max, card.position || 0), -1)

    // Create all cards with their KV keys and values
    const newCards = cardsToCreate.map((cardData, index) => {
      const cardId = crypto.randomUUID()
      const card = {
        id: cardId,
        deckId,
        front: cardData.front,
        back: cardData.back,
        cardType: cardData.cardType || 'classic-flip',
        createdAt: new Date().toISOString(),
        position: maxPosition + 1 + index,
        ...(cardData.options && { options: cardData.options }),
        ...(cardData.acceptedAnswers && { acceptedAnswers: cardData.acceptedAnswers }),
        ...(cardData.frontImageUrl && { frontImageUrl: cardData.frontImageUrl }),
        ...(cardData.backImageUrl && { backImageUrl: cardData.backImageUrl }),
        ...(cardData.frontAudio && { frontAudio: cardData.frontAudio }),
        ...(cardData.backAudio && { backAudio: cardData.backAudio })
      }
      return {
        key: `card:${user.id}:${deckId}:${cardId}`,
        value: card
      }
    })

    // Batch set all cards using mset which expects separate arrays
    const keys = newCards.map(({ key }) => key)
    const values = newCards.map(({ value }) => value)
    await kv.mset(keys, values)
    
    // Update deck card count
    const deck = await kv.get(`deck:${user.id}:${deckId}`)
    if (deck) {
      deck.cardCount = (deck.cardCount || 0) + cardsToCreate.length
      await kv.set(`deck:${user.id}:${deckId}`, deck)
    }
    
    console.log(`Successfully batch created ${cardsToCreate.length} cards`)
    
    return c.json({ 
      cards: newCards.map(({ value }) => value),
      count: cardsToCreate.length 
    })
  } catch (error) {
    console.error(`Batch create cards error:`, error)
    return c.json({ error: 'Failed to create cards' }, 500)
  }
})

// Create a new card
app.post('/make-server-8a1502a9/decks/:deckId/cards', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { front, back, cardType, options, acceptedAnswers, frontImageUrl, backImageUrl } = await c.req.json()
    
    // Validate that front has either text OR image
    if (!front && !frontImageUrl) {
      return c.json({ error: 'Card front text or image is required' }, 400)
    }
    
    // Validate that back has either text OR image (for classic-flip) or text (for other types)
    if (!back && !backImageUrl) {
      return c.json({ error: 'Card back text or image is required' }, 400)
    }

    // Get current cards to determine position
    const existingCards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
    const maxPosition = existingCards.reduce((max, card) => Math.max(max, card.position || 0), -1)

    const cardId = crypto.randomUUID()
    const card = {
      id: cardId,
      deckId,
      front,
      back,
      cardType: cardType || 'classic-flip',
      createdAt: new Date().toISOString(),
      position: maxPosition + 1,
      ...(options && { options }),
      ...(acceptedAnswers && { acceptedAnswers }),
      ...(frontImageUrl && { frontImageUrl }),
      ...(backImageUrl && { backImageUrl })
    }

    await kv.set(`card:${user.id}:${deckId}:${cardId}`, card)
    
    // Update deck card count
    const deck = await kv.get(`deck:${user.id}:${deckId}`)
    if (deck) {
      deck.cardCount = (deck.cardCount || 0) + 1
      await kv.set(`deck:${user.id}:${deckId}`, deck)
    }
    
    return c.json({ card })
  } catch (error) {
    console.log(`Create card error: ${error}`)
    return c.json({ error: 'Failed to create card' }, 500)
  }
})

// Update card positions (for drag and drop reordering)
// IMPORTANT: This must come BEFORE /decks/:deckId/cards/:cardId to avoid route conflicts
app.put('/make-server-8a1502a9/decks/:deckId/cards/positions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update card positions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const { positions } = await c.req.json()
    
    if (!Array.isArray(positions)) {
      return c.json({ error: 'Invalid positions data' }, 400)
    }

    // Update each card's position
    for (const { id, position } of positions) {
      const card = await kv.get(`card:${user.id}:${deckId}:${id}`)
      if (card) {
        card.position = position
        await kv.set(`card:${user.id}:${deckId}:${id}`, card)
      }
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.log(`Update card positions error: ${error}`)
    return c.json({ error: 'Failed to update card positions' }, 500)
  }
})

// Update a card
app.put('/make-server-8a1502a9/decks/:deckId/cards/:cardId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in update card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const cardId = c.req.param('cardId')
    const updates = await c.req.json()
    
    const existingCard = await kv.get(`card:${user.id}:${deckId}:${cardId}`)
    
    if (!existingCard) {
      return c.json({ error: 'Card not found' }, 404)
    }

    const updatedCard = { ...existingCard, ...updates }
    await kv.set(`card:${user.id}:${deckId}:${cardId}`, updatedCard)
    
    return c.json({ card: updatedCard })
  } catch (error) {
    console.log(`Update card error: ${error}`)
    return c.json({ error: 'Failed to update card' }, 500)
  }
})

// Delete a card (handles both regular user deletions and superuser moderation deletions)
app.delete('/make-server-8a1502a9/decks/:deckId/cards/:cardId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in delete card: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const cardId = c.req.param('cardId')
    
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
    
    // If reason is provided, this is a superuser deletion of a community card
    if (reason) {
      if (!isSuperuser) {
        return c.json({ error: 'Forbidden - Superuser access required' }, 403)
      }

      if (!reason.trim()) {
        return c.json({ error: 'Deletion reason is required' }, 400)
      }

      // Find the deck owner (check community decks first using new storage system)
      const communityDeck = await kv.get(`community:published:${deckId}`)
      
      let deckOwnerId = null
      let deckName = ''
      let card = null
      
      if (communityDeck) {
        // Card deletion from community deck
        deckOwnerId = communityDeck.userId
        deckName = communityDeck.name
        
        console.log(`Attempting to delete card ${cardId} from community deck ${deckId}`)
        console.log(`Community deck has ${communityDeck.cards?.length || 0} cards`)
        
        // Ensure cards have IDs (for legacy decks)
        const cardsWithIds = (communityDeck.cards || []).map((c: any, index: number) => ({
          ...c,
          id: c.id || `${deckId}-card-${index}`
        }))
        
        console.log(`Cards with IDs: ${cardsWithIds.map((c: any) => c.id).join(', ')}`)
        console.log(`Looking for card ID: ${cardId}`)
        
        // Find the card in the community deck
        const cardIndex = cardsWithIds.findIndex((c: any) => c.id === cardId)
        
        if (cardIndex === -1) {
          console.log(`Card not found. Available card IDs: ${cardsWithIds.map((c: any) => c.id).join(', ')}`)
          return c.json({ error: 'Card not found' }, 404)
        }
        
        card = cardsWithIds[cardIndex]
        
        // Store deleted card metadata for superuser restoration tool
        const deletedCardsKey = 'deleted:cards'
        const deletedCards = await kv.get(deletedCardsKey) || []
        deletedCards.push({
          id: crypto.randomUUID(),
          cardId: cardId,
          deckId: deckId,
          cardData: card,
          deckName: deckName,
          deckOwnerId: deckOwnerId,
          deletedBy: user.id,
          deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
          reason: reason.trim(),
          deletedAt: new Date().toISOString()
        })
        await kv.set(deletedCardsKey, deletedCards)
        
        // Soft delete: mark card as deleted instead of removing it
        communityDeck.cards[cardIndex] = {
          ...communityDeck.cards[cardIndex],
          isDeleted: true,
          deletedBy: user.id,
          deletedAt: new Date().toISOString(),
          deletionReason: reason.trim()
        }
        
        // Save updated deck to new storage system
        await kv.set(`community:published:${deckId}`, communityDeck)
        
      } else {
        // Card deletion from user's personal deck (not community)
        // Search through all user decks to find the owner
        const allKeys = await kv.getByPrefix('decks:')
        for (const { key, value } of allKeys) {
          const decks = value || []
          const deck = decks.find((d: any) => d.id === deckId)
          if (deck) {
            deckOwnerId = key.split(':')[1]
            deckName = deck.name
            break
          }
        }

        if (!deckOwnerId) {
          return c.json({ error: 'Deck not found' }, 404)
        }

        // Get the user's decks
        const userDecksKey = `decks:${deckOwnerId}`
        const userDecks = await kv.get(userDecksKey) || []
        const deckIndex = userDecks.findIndex((d: any) => d.id === deckId)
        
        if (deckIndex === -1) {
          return c.json({ error: 'Deck not found' }, 404)
        }

        const deck = userDecks[deckIndex]
        const cardIndex = deck.cards.findIndex((c: any) => c.id === cardId)
        
        if (cardIndex === -1) {
          return c.json({ error: 'Card not found' }, 404)
        }

        card = deck.cards[cardIndex]

        // Store deleted card for restoration
        const deletedItemsKey = 'deleted_items'
        const deletedItems = await kv.get(deletedItemsKey) || []
        deletedItems.push({
          id: crypto.randomUUID(),
          type: 'card',
          itemId: cardId,
          deckId: deckId,
          data: card,
          deletedBy: user.id,
          deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
          reason: reason.trim(),
          deletedAt: new Date().toISOString()
        })
        await kv.set(deletedItemsKey, deletedItems)

        // Remove card from deck
        deck.cards.splice(cardIndex, 1)
        userDecks[deckIndex] = deck
        await kv.set(userDecksKey, userDecks)
      }

      // Notify the deck owner
      if (deckOwnerId && deckOwnerId !== user.id) {
        const notificationKey = `notifications:${deckOwnerId}`
        const notifications = await kv.get(notificationKey) || []
        
        const notification = {
          id: crypto.randomUUID(),
          type: 'card_deleted',
          superuserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
          reason: reason.trim(),
          deckName: deckName,
          deckId: deckId,
          cardFront: card.front,
          cardBack: card.back,
          createdAt: new Date().toISOString(),
          read: false,
          seen: false
        }
        
        notifications.push(notification)
        await kv.set(notificationKey, notifications)
      }
      
      return c.json({ success: true, message: 'Card deleted successfully' })
    } else {
      // Regular user deleting their own card
      await kv.del(`card:${user.id}:${deckId}:${cardId}`)
      
      // Update deck card count
      const deck = await kv.get(`deck:${user.id}:${deckId}`)
      if (deck) {
        deck.cardCount = Math.max(0, (deck.cardCount || 0) - 1)
        await kv.set(`deck:${user.id}:${deckId}`, deck)
      }
      
      return c.json({ success: true })
    }
  } catch (error) {
    console.log(`Delete card error: ${error}`)
    return c.json({ error: 'Failed to delete card' }, 500)
  }
})



// Add deck from community
app.post('/make-server-8a1502a9/community/add-deck', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { communityDeckId, name, color, emoji, cards, category, subtopic, version } = await c.req.json()

    if (!name) {
      return c.json({ error: 'Deck name is required' }, 400)
    }

    // Check if user has already imported this community deck
    let existingImportedDeck = null
    if (communityDeckId) {
      const existingDecks = await kv.getByPrefix(`deck:${user.id}:`)
      existingImportedDeck = existingDecks.find((deck: any) => deck.sourceCommunityDeckId === communityDeckId)
      
      if (existingImportedDeck) {
        // Check if the community deck has been updated by comparing cards
        const existingCards = await kv.getByPrefix(`card:${user.id}:${existingImportedDeck.id}:`)
        const cardsChanged = cards.length !== existingCards.length || 
          !cards.every((card: any, index: number) => {
            const existingCard = existingCards[index]
            return existingCard && 
              card.front === existingCard.front && 
              card.back === existingCard.back &&
              card.cardType === existingCard.cardType
          })
        
        if (!cardsChanged) {
          return c.json({ error: 'You have already added this deck to your collection' }, 400)
        }
        
        // Update the existing deck with new cards
        // First, delete old cards
        for (const existingCard of existingCards) {
          await kv.del(`card:${user.id}:${existingImportedDeck.id}:${existingCard.id}`)
        }
        
        // Then create new cards with correct key pattern
        for (let index = 0; index < cards.length; index++) {
          const card = cards[index]
          const cardId = existingCards[index]?.id || crypto.randomUUID()
          const updatedCard = {
            id: cardId,
            deckId: existingImportedDeck.id,
            front: card.front,
            back: card.back,
            cardType: card.cardType || 'classic-flip',
            options: card.options,
            acceptedAnswers: card.acceptedAnswers,
            frontImageUrl: card.frontImageUrl,
            createdAt: existingCards[index]?.createdAt || new Date().toISOString(),
            position: index,
          }
          
          await kv.set(`card:${user.id}:${existingImportedDeck.id}:${cardId}`, updatedCard)
        }
        
        // Update deck metadata
        const updatedDeck = {
          ...existingImportedDeck,
          name,
          color,
          emoji,
          cardCount: updatedCards.length,
          category,
          subtopic,
          communityDeckVersion: (existingImportedDeck.communityDeckVersion || 0) + 1,
        }
        await kv.set(`deck:${user.id}:${existingImportedDeck.id}`, updatedDeck)
        
        return c.json({ deck: updatedDeck, updated: true })
      }
    }

    // Get existing decks to determine position
    const existingDecks = await kv.getByPrefix(`deck:${user.id}:`)
    const maxPosition = existingDecks.reduce((max, deck) => Math.max(max, deck.position || 0), -1)
    
    // Get community deck to check original author
    let creatorId = user.id // Default to current user
    let communityPublishedId = undefined // Track if this is user's own published deck
    let communityDeckVersion = version || 1 // Default to provided version or 1
    if (communityDeckId) {
      const communityDeck = await kv.get(`community:published:${communityDeckId}`)
      if (communityDeck && communityDeck.authorId) {
        creatorId = communityDeck.authorId // Use original author ID
        // If user is re-adding their own published deck, link it to the community version
        if (communityDeck.authorId === user.id) {
          communityPublishedId = communityDeckId
          // Use the current community deck version to avoid false "update available" notifications
          communityDeckVersion = communityDeck.version || version || 1
          console.log(`User ${user.id} is re-adding their own published deck ${communityDeckId}`)
          console.log(`  Setting communityPublishedId: ${communityPublishedId}`)
          console.log(`  Setting communityDeckVersion: ${communityDeckVersion}`)
        }
      }
    }
    
    // Create new deck
    const deckId = crypto.randomUUID()
    const newDeck = {
      id: deckId,
      name,
      color: color || '#10B981',
      emoji: emoji || '📚',
      userId: user.id,
      creatorId: creatorId, // Store original creator
      createdAt: new Date().toISOString(),
      cardCount: cards?.length || 0,
      deckType: 'classic-flip',
      position: maxPosition + 1,
      category: category || undefined,
      subtopic: subtopic || undefined,
      sourceCommunityDeckId: communityDeckId || undefined,
      communityPublishedId: communityPublishedId, // Link to community if it's user's own deck
      communityDeckVersion: communityDeckVersion,
    }

    await kv.set(`deck:${user.id}:${deckId}`, newDeck)

    // Create cards if provided
    if (cards && cards.length > 0) {
      // Store each card individually with the correct key pattern
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index]
        const cardId = crypto.randomUUID()
        const newCard = {
          id: cardId,
          deckId: deckId,
          front: card.front,
          back: card.back,
          cardType: card.cardType || 'classic-flip',
          options: card.options,
          acceptedAnswers: card.acceptedAnswers,
          frontImageUrl: card.frontImageUrl,
          createdAt: new Date().toISOString(),
          position: index,
        }
        
        await kv.set(`card:${user.id}:${deckId}:${cardId}`, newCard)
      }
    }

    // Increment downloads counter for the community deck
    if (communityDeckId) {
      // Try to get the real published deck
      const communityDeck = await kv.get(`community:published:${communityDeckId}`)
      if (communityDeck) {
        communityDeck.downloads = (communityDeck.downloads || 0) + 1
        await kv.set(`community:published:${communityDeckId}`, communityDeck)
      } else {
        // For mock decks (or any deck without a published entry), track downloads separately
        const currentDownloads = await kv.get(`downloads:${communityDeckId}`) || 0
        await kv.set(`downloads:${communityDeckId}`, currentDownloads + 1)
      }
    }

    return c.json({ deck: newDeck })
  } catch (error) {
    console.log(`Add deck from community error: ${error}`)
    return c.json({ error: 'Failed to add deck from community' }, 500)
  }
})

// Publish deck to community
app.post('/make-server-8a1502a9/community/publish-deck', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { deckId, category, subtopic } = await c.req.json()

    if (!deckId || !category || !subtopic) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Get the deck
    console.log(`Getting deck ${deckId} for user ${user.id}`)
    const deck = await kv.get(`deck:${user.id}:${deckId}`)
    console.log(`Deck found:`, deck ? 'yes' : 'no')
    
    if (!deck) {
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Check if deck is banned from publishing
    if (deck.publishBanned) {
      return c.json({ 
        error: 'This deck has been banned from publishing by a moderator',
        reason: deck.publishBannedReason || 'No reason provided'
      }, 403)
    }

    // Prevent publishing imported decks UNLESS the user is the original creator
    // This allows users to re-add their own published decks and still maintain publishing rights
    if (deck.sourceCommunityDeckId && deck.creatorId !== user.id) {
      return c.json({ error: 'Cannot publish decks imported from the community. Only decks you created can be published.' }, 403)
    }

    // Get the cards using the correct key pattern
    console.log(`Getting cards for deck ${deckId} and user ${user.id}`)
    const cards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
    console.log(`Found ${cards?.length || 0} cards`)
    
    if (!cards || cards.length === 0) {
      return c.json({ error: 'Cannot publish empty deck' }, 400)
    }

    if (cards.length < 10) {
      return c.json({ error: 'Deck must have at least 10 cards to be published' }, 400)
    }

    // Check if this deck has already been published
    let existingPublishedDeck = null
    if (deck.communityPublishedId) {
      existingPublishedDeck = await kv.get(`community:published:${deck.communityPublishedId}`)
      
      if (existingPublishedDeck) {
        console.log(`Found existing published deck ${deck.communityPublishedId}`)
        console.log(`  Published deck version: ${existingPublishedDeck.version}`)
        console.log(`  Published deck cards: ${existingPublishedDeck.cards?.length || 0}`)
        console.log(`  Local deck version: ${deck.communityDeckVersion}`)
        
        // Helper function to safely compare arrays
        const arraysEqual = (a: any[], b: any[]) => {
          if (!a && !b) return true
          if (!a || !b) return false
          if (a.length !== b.length) return false
          return a.every((val, idx) => val === b[idx])
        }

        // Check if the deck has been modified
        console.log(`Comparing deck ${deckId} with published version ${deck.communityPublishedId}`)
        console.log(`Local cards: ${cards.length}, Published cards: ${existingPublishedDeck.cards.length}`)
        
        const cardsChanged = cards.length !== existingPublishedDeck.cards.length || 
          !cards.every((card: any, index: number) => {
            const pubCard = existingPublishedDeck.cards[index]
            if (!pubCard) {
              console.log(`Card ${index}: No matching published card`)
              return false
            }
            
            // Compare all card properties
            const basicMatch = 
              card.front === pubCard.front && 
              card.back === pubCard.back &&
              card.cardType === pubCard.cardType &&
              (card.frontImageUrl || null) === (pubCard.frontImageUrl || null)
            
            // Compare options array for multiple choice
            const optionsMatch = arraysEqual(card.options, pubCard.options)
            
            // Compare accepted answers array for type-to-answer
            const answersMatch = arraysEqual(card.acceptedAnswers, pubCard.acceptedAnswers)
            
            const match = basicMatch && optionsMatch && answersMatch
            if (!match) {
              console.log(`Card ${index} differs:`)
              console.log(`  basicMatch: ${basicMatch}`)
              if (!basicMatch) {
                console.log(`    front: "${card.front}" vs "${pubCard.front}" = ${card.front === pubCard.front}`)
                console.log(`    back: "${card.back}" vs "${pubCard.back}" = ${card.back === pubCard.back}`)
                console.log(`    cardType: "${card.cardType}" vs "${pubCard.cardType}" = ${card.cardType === pubCard.cardType}`)
              }
              console.log(`  optionsMatch: ${optionsMatch}`)
              console.log(`  answersMatch: ${answersMatch}`)
            }
            
            return match
          })
        
        const metadataChanged = 
          deck.name !== existingPublishedDeck.name ||
          deck.color !== existingPublishedDeck.color ||
          deck.emoji !== existingPublishedDeck.emoji ||
          category !== existingPublishedDeck.category ||
          subtopic !== existingPublishedDeck.subtopic ||
          deck.difficulty !== existingPublishedDeck.difficulty
        
        console.log(`Cards changed: ${cardsChanged}, Metadata changed: ${metadataChanged}`)
        if (metadataChanged) {
          console.log(`Metadata differences:`)
          console.log(`  name: "${deck.name}" vs "${existingPublishedDeck.name}" = ${deck.name === existingPublishedDeck.name}`)
          console.log(`  color: "${deck.color}" vs "${existingPublishedDeck.color}" = ${deck.color === existingPublishedDeck.color}`)
          console.log(`  emoji: "${deck.emoji}" vs "${existingPublishedDeck.emoji}" = ${deck.emoji === existingPublishedDeck.emoji}`)
          console.log(`  category: "${category}" vs "${existingPublishedDeck.category}" = ${category === existingPublishedDeck.category}`)
          console.log(`  subtopic: "${subtopic}" vs "${existingPublishedDeck.subtopic}" = ${subtopic === existingPublishedDeck.subtopic}`)
          console.log(`  difficulty: "${deck.difficulty}" vs "${existingPublishedDeck.difficulty}" = ${deck.difficulty === existingPublishedDeck.difficulty}`)
        }
        
        if (!cardsChanged && !metadataChanged) {
          return c.json({ error: 'This deck has already been published. Make changes to publish an update.' }, 400)
        }
        
        // Update the existing published deck and increment version
        existingPublishedDeck.name = deck.name
        existingPublishedDeck.color = deck.color
        existingPublishedDeck.emoji = deck.emoji
        existingPublishedDeck.category = category
        existingPublishedDeck.subtopic = subtopic
        existingPublishedDeck.difficulty = deck.difficulty
        existingPublishedDeck.cardCount = cards.length
        existingPublishedDeck.cards = cards.map((card: any) => ({
          id: card.id, // Preserve card ID for deletion/moderation
          front: card.front,
          back: card.back,
          cardType: card.cardType,
          options: card.options,
          acceptedAnswers: card.acceptedAnswers,
          frontImageUrl: card.frontImageUrl,
        }))
        existingPublishedDeck.updatedAt = new Date().toISOString()
        existingPublishedDeck.version = (existingPublishedDeck.version || 1) + 1
        
        await kv.set(`community:published:${deck.communityPublishedId}`, existingPublishedDeck)
        
        // Update the local deck's version to match the published version
        deck.communityDeckVersion = existingPublishedDeck.version
        await kv.set(`deck:${user.id}:${deckId}`, deck)
        
        return c.json({ message: 'Deck updated successfully', publishedDeck: existingPublishedDeck, updated: true })
      }
    }

    // Get user info
    let displayName = 'Anonymous'
    try {
      const { data: userInfo, error: userError } = await supabase.auth.admin.getUserById(user.id)
      if (!userError && userInfo?.user) {
        displayName = userInfo.user.user_metadata?.displayName || userInfo.user.user_metadata?.name || user.email || 'Anonymous'
      }
    } catch (userInfoError) {
      console.log(`Failed to get user info, using default: ${userInfoError}`)
      displayName = user.email || 'Anonymous'
    }

    // Store the published deck data with cards
    console.log(`Creating published deck with ${cards.length} cards`)
    const publishedDeckId = crypto.randomUUID()
    const now = new Date().toISOString()
    const publishedDeck = {
      id: publishedDeckId,
      originalDeckId: deckId,
      name: deck.name,
      color: deck.color,
      emoji: deck.emoji,
      category,
      subtopic,
      difficulty: deck.difficulty,
      userId: user.id,
      author: displayName,
      authorId: user.id,
      cardCount: cards.length,
      cards: cards.map((card: any) => ({
        id: card.id, // Preserve card ID for deletion/moderation
        front: card.front,
        back: card.back,
        cardType: card.cardType,
        options: card.options,
        acceptedAnswers: card.acceptedAnswers,
        frontImageUrl: card.frontImageUrl,
      })),
      publishedAt: now,
      updatedAt: now, // Initially same as publishedAt
      downloads: 0,
      rating: 4.5, // Default rating
      version: 1, // Initial version
    }

    // Store in community published decks
    console.log(`Storing published deck with ID ${publishedDeckId}`)
    await kv.set(`community:published:${publishedDeckId}`, publishedDeck)
    console.log(`Published deck stored successfully`)
    
    // Update the original deck to track the published version
    deck.communityPublishedId = publishedDeckId
    deck.communityDeckVersion = 1 // Set initial version
    await kv.set(`deck:${user.id}:${deckId}`, deck)
    
    // Also track user's published decks
    const userPublishedDecks = await kv.get(`user:${user.id}:published`) || []
    userPublishedDecks.push(publishedDeckId)
    await kv.set(`user:${user.id}:published`, userPublishedDecks)

    return c.json({ message: 'Deck published successfully', publishedDeck })
  } catch (error) {
    console.log(`Publish deck error: ${error}`)
    console.log(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    return c.json({ error: `Failed to publish deck to community: ${error}` }, 500)
  }
})

// Get published community decks
app.get('/make-server-8a1502a9/community/decks', async (c) => {
  try {
    const publishedDecks = await kv.getByPrefix('community:published:')
    
    // Filter out soft-deleted decks
    const activeDecks = publishedDecks.filter((deck: any) => !deck.isDeleted)
    
    // Add comment count to each deck and validate card data
    const decksWithCounts = await Promise.all(
      activeDecks.map(async (deck: any) => {
        const comments = await kv.get(`deck:${deck.id}:comments`) || []
        const commentCount = Array.isArray(comments) ? comments.reduce((total: number, comment: any) => {
          const countReplies = (c: any): number => {
            // Skip deleted comments and replies
            if (c.isDeleted) return 0
            return 1 + (c.replies?.reduce((sum: number, reply: any) => sum + countReplies(reply), 0) || 0)
          }
          return total + countReplies(comment)
        }, 0) : 0
        
        // Ensure cards array exists and filter out soft-deleted cards
        const cards = (deck.cards || [])
          .map((card: any, index: number) => ({
            ...card,
            // Ensure each card has an ID (for legacy decks without IDs)
            id: card.id || `${deck.id}-card-${index}`
          }))
          .filter((card: any) => !card.isDeleted)
        const actualCardCount = cards.length
        
        return {
          ...deck,
          cards: cards,
          cardCount: actualCardCount, // Use actual cards length instead of stored count
          commentCount
        }
      })
    )
    
    // Filter out decks with no cards (data integrity issue)
    const validDecks = decksWithCounts.filter(deck => deck.cardCount > 0)
    
    return c.json({ decks: validDecks })
  } catch (error) {
    console.log(`Get community decks error: ${error}`)
    return c.json({ error: 'Failed to fetch community decks' }, 500)
  }
})

// Get featured community decks
app.get('/make-server-8a1502a9/community/decks/featured', async (c) => {
  try {
    const allDecks = await kv.getByPrefix('community:published:')
    // Filter out soft-deleted decks and only get featured ones
    const featuredDecks = allDecks.filter((deck: any) => deck.featured === true && !deck.isDeleted)
    
    // Add comment count to each deck and validate card data
    const decksWithCounts = await Promise.all(
      featuredDecks.map(async (deck: any) => {
        const comments = await kv.get(`deck:${deck.id}:comments`) || []
        const commentCount = Array.isArray(comments) ? comments.reduce((total: number, comment: any) => {
          const countReplies = (c: any): number => {
            // Skip deleted comments and replies
            if (c.isDeleted) return 0
            return 1 + (c.replies?.reduce((sum: number, reply: any) => sum + countReplies(reply), 0) || 0)
          }
          return total + countReplies(comment)
        }, 0) : 0
        
        // Ensure cards array exists and filter out soft-deleted cards
        const cards = (deck.cards || [])
          .map((card: any, index: number) => ({
            ...card,
            // Ensure each card has an ID (for legacy decks without IDs)
            id: card.id || `${deck.id}-card-${index}`
          }))
          .filter((card: any) => !card.isDeleted)
        const actualCardCount = cards.length
        
        return {
          ...deck,
          cards: cards,
          cardCount: actualCardCount, // Use actual cards length instead of stored count
          commentCount
        }
      })
    )
    
    // Filter out decks with no cards (data integrity issue)
    const validDecks = decksWithCounts.filter(deck => deck.cardCount > 0)
    
    return c.json({ decks: validDecks })
  } catch (error) {
    console.log(`Get featured community decks error: ${error}`)
    return c.json({ error: 'Failed to fetch featured community decks' }, 500)
  }
})

// Search for users who have published decks to the community
app.get('/make-server-8a1502a9/community/users/search', async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || ''
    
    if (!query || query.length < 2) {
      return c.json({ users: [] })
    }

    // Get all published decks
    const publishedDecks = await kv.getByPrefix('community:published:')
    
    // Filter out soft-deleted decks
    const activeDecks = publishedDecks.filter((deck: any) => !deck.isDeleted)
    
    // Extract unique authors
    const authorsMap = new Map()
    for (const deck of activeDecks) {
      if (deck.authorId && deck.author) {
        const userName = deck.author.toLowerCase()
        // Check if the username matches the search query
        if (userName.includes(query)) {
          if (!authorsMap.has(deck.authorId)) {
            authorsMap.set(deck.authorId, {
              id: deck.authorId,
              name: deck.author,
              deckCount: 0
            })
          }
          authorsMap.get(deck.authorId).deckCount++
        }
      }
    }
    
    // Convert map to array and sort by deck count
    const users = Array.from(authorsMap.values()).sort((a, b) => b.deckCount - a.deckCount)
    
    return c.json({ users })
  } catch (error) {
    console.log(`Search community users error: ${error}`)
    return c.json({ error: 'Failed to search users' }, 500)
  }
})

// Get single community deck by ID
app.get('/make-server-8a1502a9/community/decks/:deckId', async (c) => {
  try {
    const deckId = c.req.param('deckId')
    const deck = await kv.get(`community:published:${deckId}`)
    
    if (!deck || deck.isDeleted) {
      return c.json({ error: 'Deck not found' }, 404)
    }
    
    // Ensure cards have IDs and filter out soft-deleted cards
    if (deck.cards) {
      deck.cards = deck.cards
        .map((card: any, index: number) => ({
          ...card,
          // Ensure each card has an ID (for legacy decks without IDs)
          id: card.id || `${deck.id}-card-${index}`
        }))
        .filter((card: any) => !card.isDeleted)
    }
    
    return c.json({ deck })
  } catch (error) {
    console.log(`Get community deck error: ${error}`)
    return c.json({ error: 'Failed to fetch community deck' }, 500)
  }
})

// Update published community deck
app.put('/make-server-8a1502a9/community/decks/:communityDeckId', async (c) => {
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
    const { name, emoji, color, category, subtopic, difficulty, cards } = await c.req.json()

    if (!communityDeckId || !name || !emoji || !color || !cards) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Get the existing published deck
    const existingDeck = await kv.get(`community:published:${communityDeckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true

    // Verify the user owns this deck OR is a superuser
    if (existingDeck.authorId !== user.id && !isSuperuser) {
      return c.json({ error: 'You can only update your own published decks' }, 403)
    }

    // Update the published deck
    existingDeck.name = name
    existingDeck.color = color
    existingDeck.emoji = emoji
    existingDeck.category = category || existingDeck.category
    existingDeck.subtopic = subtopic || existingDeck.subtopic
    existingDeck.difficulty = difficulty || existingDeck.difficulty
    existingDeck.cardCount = cards.length
    existingDeck.cards = cards.map((card: any) => ({
      front: card.front,
      back: card.back,
      cardType: card.cardType,
      options: card.options,
      acceptedAnswers: card.acceptedAnswers,
      frontImageUrl: card.frontImageUrl,
    }))
    existingDeck.updatedAt = new Date().toISOString()
    existingDeck.version = (existingDeck.version || 1) + 1 // Increment version on update
    
    await kv.set(`community:published:${communityDeckId}`, existingDeck)
    
    return c.json({ message: 'Community deck updated successfully', deck: existingDeck })
  } catch (error) {
    console.log(`Update community deck error: ${error}`)
    return c.json({ error: 'Failed to update community deck' }, 500)
  }
})

// Delete published community deck (Superuser only)
app.delete('/make-server-8a1502a9/community/decks/:communityDeckId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can delete community decks' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const body = await c.req.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return c.json({ error: 'Deletion reason is required' }, 400)
    }

    // Get the existing published deck
    const existingDeck = await kv.get(`community:published:${communityDeckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // Soft delete the community deck
    existingDeck.isDeleted = true
    existingDeck.deletedBy = user.id
    existingDeck.deletedByName = user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser'
    existingDeck.deletedReason = reason.trim()
    existingDeck.deletedAt = new Date().toISOString()
    
    await kv.set(`community:published:${communityDeckId}`, existingDeck)
    
    // Store in deleted items log for superuser tool
    const deletedItemsKey = 'deleted:decks'
    const deletedItems = await kv.get(deletedItemsKey) || []
    deletedItems.push({
      id: communityDeckId,
      deckId: existingDeck.deckId,
      name: existingDeck.name,
      emoji: existingDeck.emoji,
      category: existingDeck.category,
      authorId: existingDeck.userId || existingDeck.authorId,
      authorName: existingDeck.author || existingDeck.userName || 'Unknown User',
      deletedBy: user.id,
      deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
      deletedReason: reason.trim(),
      deletedAt: existingDeck.deletedAt,
      cardCount: existingDeck.cards?.length || 0,
      type: 'deck'
    })
    await kv.set(deletedItemsKey, deletedItems)

    // Mark the user's original deck as "cannot_republish" if they own it
    if (existingDeck.userId && existingDeck.deckId) {
      const userDeck = await kv.get(`deck:${existingDeck.userId}:${existingDeck.deckId}`)
      if (userDeck) {
        userDeck.cannotRepublish = true
        userDeck.cannotRepublishReason = reason.trim()
        await kv.set(`deck:${existingDeck.userId}:${existingDeck.deckId}`, userDeck)
      }
    }

    // Send notification to the deck author if different from deleter
    if (existingDeck.userId && existingDeck.userId !== user.id) {
      const notificationKey = `notifications:${existingDeck.userId}`
      const notifications = await kv.get(notificationKey) || []
      
      notifications.push({
        id: crypto.randomUUID(),
        type: 'deck_deleted',
        message: `Your community deck "${existingDeck.name}" was removed from community`,
        reason: reason.trim(),
        deckName: existingDeck.name,
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      })
      
      await kv.set(notificationKey, notifications)
    }
    
    console.log(`Superuser soft-deleted community deck: ${communityDeckId}. Reason: ${reason}`)
    
    return c.json({ success: true, message: 'Community deck deleted successfully' })
  } catch (error) {
    console.log(`Delete community deck error: ${error}`)
    return c.json({ error: 'Failed to delete community deck' }, 500)
  }
})

// Delete a card from community deck (Superuser only)
app.delete('/make-server-8a1502a9/community/decks/:communityDeckId/cards/:cardId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can delete community cards' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')
    const cardId = c.req.param('cardId')
    const { reason } = await c.req.json()

    if (!reason || !reason.trim()) {
      return c.json({ error: 'Deletion reason is required' }, 400)
    }

    // Get the community deck
    const existingDeck = await kv.get(`community:published:${communityDeckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    console.log(`Attempting to delete card ${cardId} from community deck ${communityDeckId}`)
    console.log(`Community deck has ${existingDeck.cards?.length || 0} cards`)

    // Ensure cards have IDs (for legacy decks without IDs)
    const cardsWithIds = (existingDeck.cards || []).map((c: any, index: number) => ({
      ...c,
      id: c.id || `${communityDeckId}-card-${index}`
    }))

    console.log(`Cards with IDs: ${cardsWithIds.map((c: any) => c.id).join(', ')}`)
    console.log(`Looking for card ID: ${cardId}`)

    // Find the card in the deck
    const cardIndex = cardsWithIds.findIndex((c: any) => c.id === cardId)
    
    if (cardIndex === -1) {
      console.log(`Card not found in deck. Available IDs: ${cardsWithIds.map((c: any) => c.id).join(', ')}`)
      return c.json({ error: 'Card not found' }, 404)
    }

    const card = cardsWithIds[cardIndex]

    // Soft delete the card (update the original cards array, not cardsWithIds)
    existingDeck.cards[cardIndex] = {
      ...existingDeck.cards[cardIndex],
      // Preserve or add the ID
      id: card.id,
      isDeleted: true,
      deletedBy: user.id,
      deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
      deletedReason: reason.trim(),
      deletedAt: new Date().toISOString()
    }
    
    await kv.set(`community:published:${communityDeckId}`, existingDeck)
    
    // Store in deleted items log for superuser tool
    const deletedItemsKey = 'deleted:cards'
    const deletedItems = await kv.get(deletedItemsKey) || []
    deletedItems.push({
      id: cardId,
      deckId: communityDeckId,
      deckName: existingDeck.name,
      front: card.front,
      back: card.back,
      cardType: card.cardType,
      authorId: existingDeck.userId || existingDeck.authorId,
      authorName: existingDeck.author || existingDeck.userName || 'Unknown User',
      deletedBy: user.id,
      deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
      deletedReason: reason.trim(),
      deletedAt: existingDeck.cards[cardIndex].deletedAt,
      type: 'card'
    })
    await kv.set(deletedItemsKey, deletedItems)

    // Also soft-delete from the user's original deck if they own it
    if (existingDeck.userId && existingDeck.deckId) {
      const userDeck = await kv.get(`deck:${existingDeck.userId}:${existingDeck.deckId}`)
      if (userDeck && userDeck.cards) {
        const userCardIndex = userDeck.cards.findIndex((c: any) => c.id === cardId)
        if (userCardIndex !== -1) {
          userDeck.cards[userCardIndex] = {
            ...userDeck.cards[userCardIndex],
            isDeleted: true,
            deletedBy: user.id,
            deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
            deletedReason: reason.trim(),
            deletedAt: new Date().toISOString()
          }
          await kv.set(`deck:${existingDeck.userId}:${existingDeck.deckId}`, userDeck)
        }
      }
    }

    // Send notification to the deck author if different from deleter
    if (existingDeck.userId && existingDeck.userId !== user.id) {
      const notificationKey = `notifications:${existingDeck.userId}`
      const notifications = await kv.get(notificationKey) || []
      
      notifications.push({
        id: crypto.randomUUID(),
        type: 'card_deleted',
        message: `A card was removed from your community deck \"${existingDeck.name}\"`,
        reason: reason.trim(),
        deckName: existingDeck.name,
        deckId: communityDeckId,
        cardFront: card.front,
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      })
      
      await kv.set(notificationKey, notifications)
    }
    
    console.log(`Superuser soft-deleted card from community deck: ${communityDeckId}. Reason: ${reason}`)
    
    return c.json({ success: true, message: 'Card deleted successfully' })
  } catch (error) {
    console.log(`Delete community card error: ${error}`)
    return c.json({ error: 'Failed to delete card' }, 500)
  }
})

// Toggle featured status for community deck (Superuser only)
app.patch('/make-server-8a1502a9/community/decks/:communityDeckId/featured', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can feature/unfeature community decks' }, 403)
    }

    const communityDeckId = c.req.param('communityDeckId')

    // Get the existing published deck
    const existingDeck = await kv.get(`community:published:${communityDeckId}`)
    
    if (!existingDeck) {
      return c.json({ error: 'Community deck not found' }, 404)
    }

    // Toggle featured status
    existingDeck.featured = !existingDeck.featured
    existingDeck.updatedAt = new Date().toISOString()
    
    await kv.set(`community:published:${communityDeckId}`, existingDeck)
    
    console.log(`Superuser ${existingDeck.featured ? 'featured' : 'unfeatured'} community deck: ${communityDeckId}`)
    
    return c.json({ 
      message: `Deck ${existingDeck.featured ? 'featured' : 'unfeatured'} successfully`, 
      deck: existingDeck 
    })
  } catch (error) {
    console.log(`Toggle featured status error: ${error}`)
    return c.json({ error: 'Failed to toggle featured status' }, 500)
  }
})

// Get download counts for deck IDs
app.post('/make-server-8a1502a9/community/downloads', async (c) => {
  try {
    const { deckIds } = await c.req.json()
    
    if (!deckIds || !Array.isArray(deckIds)) {
      return c.json({ error: 'Invalid deck IDs' }, 400)
    }
    
    const downloads: Record<string, number> = {}
    
    for (const deckId of deckIds) {
      const count = await kv.get(`downloads:${deckId}`)
      downloads[deckId] = typeof count === 'number' ? count : 0
    }
    
    return c.json({ downloads })
  } catch (error) {
    console.log(`Get downloads error: ${error}`)
    return c.json({ error: 'Failed to fetch download counts' }, 500)
  }
})

// ===== Flagging System API =====

// Create a new flag (report)
app.post('/make-server-8a1502a9/flags', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { targetType, targetId, reason, notes, targetDetails } = await c.req.json()
    
    // Validate inputs
    if (!targetType || !targetId || !reason) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    if (!['deck', 'user', 'comment', 'card'].includes(targetType)) {
      return c.json({ error: 'Invalid target type' }, 400)
    }
    
    const validReasons = ['inappropriate', 'spam', 'harassment', 'misinformation', 'copyright', 'other']
    if (!validReasons.includes(reason)) {
      return c.json({ error: 'Invalid reason' }, 400)
    }

    // Check if user is superuser
    const userProfile = await kv.get(`user:${user.id}:profile`)
    const isSuperuser = (userProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser

    // Define the existing flags key for later use
    const existingFlagsKey = `flags:target:${targetType}:${targetId}`

    // Check if user already flagged this target (superusers can flag multiple times)
    if (!isSuperuser) {
      const existingFlags = await kv.get(existingFlagsKey) || []
      
      // Get full flag objects to check reporter
      const userAlreadyFlagged = await Promise.all(
        (existingFlags as string[]).map(async (flagId: string) => {
          const flag = await kv.get(`flag:${flagId}`)
          return flag && (flag as any).reporterId === user.id
        })
      ).then(results => results.some(Boolean))
      
      if (userAlreadyFlagged) {
        return c.json({ error: 'You have already flagged this item' }, 400)
      }
    }

    // Create flag
    const flagId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    const flag = {
      id: flagId,
      reporterId: user.id,
      targetType,
      targetId,
      targetDetails: targetDetails || null,
      reason,
      notes: notes || '',
      status: 'open',
      createdAt: now,
      resolvedAt: null
    }
    
    // Store the flag
    await kv.set(`flag:${flagId}`, flag)
    
    // Update indexes
    const allFlags = await kv.get('flags:all') || []
    await kv.set('flags:all', [...(allFlags as string[]), flagId])
    
    const statusFlags = await kv.get(`flags:status:open`) || []
    await kv.set(`flags:status:open`, [...(statusFlags as string[]), flagId])
    
    const targetFlags = await kv.get(existingFlagsKey) || []
    await kv.set(existingFlagsKey, [...(targetFlags as string[]), flagId])
    
    const reporterFlags = await kv.get(`flags:reporter:${user.id}`) || []
    await kv.set(`flags:reporter:${user.id}`, [...(reporterFlags as string[]), flagId])
    
    console.log(`User ${user.id} flagged ${targetType} ${targetId} for ${reason}`)
    
    // Create notification for content owner
    try {
      // Determine the owner of the flagged content
      let ownerId: string | null = null
      let notificationType = ''
      let notificationData: any = {}
      
      if (targetType === 'deck') {
        const deck = await kv.get(`community:published:${targetId}`)
        console.log(`📦 Looking up deck ${targetId}, found:`, deck)
        if (deck) {
          ownerId = (deck as any).userId
          notificationType = 'deck_flagged'
          notificationData = {
            deckName: (deck as any).name,
            reason,
            notes: notes || ''
          }
          console.log(`📦 Deck owner: ${ownerId}, deck name: ${(deck as any).name}`)
        } else {
          console.log(`❌ Deck ${targetId} not found in KV store`)
        }
      } else if (targetType === 'card') {
        console.log(`🃏 Card flagged - targetDetails:`, targetDetails)
        // Get the deck ID from targetDetails, then get the deck to find the owner
        if (targetDetails?.deckId) {
          const deck = await kv.get(`community:published:${targetDetails.deckId}`)
          console.log(`🃏 Looking up deck ${targetDetails.deckId}, found:`, deck)
          if (deck) {
            ownerId = (deck as any).userId
            notificationType = 'card_flagged'
            notificationData = {
              cardFront: targetDetails?.front || 'Card',
              deckName: (deck as any).name,
              reason,
              notes: notes || ''
            }
            console.log(`🃏 Card owner: ${ownerId}, deck name: ${(deck as any).name}`)
          } else {
            console.log(`❌ Deck ${targetDetails.deckId} not found in KV store`)
          }
        } else {
          console.log(`❌ Card targetDetails missing deckId`)
        }
      } else if (targetType === 'comment') {
        console.log(`💬 Comment flagged - targetDetails:`, targetDetails)
        // Get the deck ID from targetDetails, then find the comment in the deck's comments
        if (targetDetails?.deckId) {
          const deckComments = await kv.get(`deck:${targetDetails.deckId}:comments`) || []
          console.log(`💬 Looking up comments for deck ${targetDetails.deckId}, found ${deckComments.length} comments`)
          
          // Search through comments and replies to find the target comment
          const findComment = (comments: any[]): any => {
            for (const c of comments) {
              if (c.id === targetId) return c
              if (c.replies && c.replies.length > 0) {
                const found = findComment(c.replies)
                if (found) return found
              }
            }
            return null
          }
          
          const comment = findComment(deckComments)
          console.log(`💬 Looking up comment ${targetId}, found:`, comment ? 'yes' : 'no')
          
          if (comment) {
            ownerId = (comment as any).userId
            notificationType = 'comment_flagged'
            notificationData = {
              commentText: (comment as any).text,
              reason,
              notes: notes || ''
            }
            console.log(`💬 Comment owner: ${ownerId}`)
          } else {
            console.log(`❌ Comment ${targetId} not found in deck ${targetDetails.deckId}`)
          }
        } else {
          console.log(`❌ Comment targetDetails missing deckId`)
        }
      }
      
      // Create notification if we found an owner (and they're not flagging their own content)
      if (ownerId && ownerId !== user.id) {
        const notificationId = crypto.randomUUID()
        const notification = {
          id: notificationId,
          userId: ownerId,
          type: notificationType,
          ...notificationData,
          read: false,
          seen: false,
          createdAt: now
        }
        
        // Add to user's notifications list (store full object, not just ID)
        const userNotifications = await kv.get(`notifications:${ownerId}`) || []
        await kv.set(`notifications:${ownerId}`, [notification, ...(userNotifications as any[])])
        
        console.log(`✅ Created ${notificationType} notification ${notificationId} for user ${ownerId}`)
        
        // Send email notification
        const { data: ownerData } = await supabase.auth.admin.getUserById(ownerId)
        if (ownerData?.user?.email) {
          const contentName = notificationData.deckName || notificationData.cardFront || notificationData.commentText || 'your content'
          const reviewUrl = `${Deno.env.get('SUPABASE_URL') || 'https://flashy.app'}/#/community`
          
          emailService.sendContentFlaggedEmail(
            ownerData.user.email,
            ownerData.user.user_metadata?.displayName || ownerData.user.user_metadata?.name || 'there',
            targetType as 'deck' | 'card' | 'comment' | 'user',
            contentName,
            reason,
            reviewUrl
          ).catch(err => console.error('Failed to send content flagged email:', err))
        }
      } else if (!ownerId) {
        console.log(`❌ Could not determine owner for ${targetType} ${targetId}`)
      } else if (ownerId === user.id) {
        console.log(`⏭️ Skipping notification - user flagged their own content`)
      }
    } catch (notificationError) {
      console.error(`❌ Failed to create flag notification: ${notificationError}`)
      // Don't fail the request if notification creation fails
    }
    
    return c.json({ message: 'Flag submitted successfully', flag })
  } catch (error) {
    console.log(`Create flag error: ${error}`)
    return c.json({ error: 'Failed to create flag' }, 500)
  }
})

// Get all flags (Superuser only)
app.get('/make-server-8a1502a9/flags', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser or moderator (check both KV store and user metadata)
    const userProfile = await kv.get(`user:${user.id}:profile`)
    const isSuperuser = (userProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser
    const isModerator = (userProfile as any)?.isModerator || user.user_metadata?.isModerator
    
    console.log(`🔐 GET /flags - User ID: ${user.id}`)
    console.log(`🔐 GET /flags - User email: ${user.email}`)
    console.log(`🔐 GET /flags - User metadata:`, user.user_metadata)
    console.log(`🔐 GET /flags - User profile from KV:`, userProfile)
    console.log(`🔐 GET /flags - isSuperuser result: ${isSuperuser}`)
    console.log(`🔐 GET /flags - isModerator result: ${isModerator}`)
    
    if (!isSuperuser && !isModerator) {
      console.log(`❌ Forbidden access attempt by user ${user.id} - not a moderator or superuser`)
      return c.json({ error: 'Forbidden - Moderator or Superuser access required' }, 403)
    }
    
    console.log(`✅ Moderator/Superuser access granted for user ${user.id}`)

    // Get query parameters for filtering
    const url = new URL(c.req.url)
    const statusFilter = url.searchParams.get('status')
    const targetTypeFilter = url.searchParams.get('targetType')
    const flashyFilter = url.searchParams.get('flashy') === 'true'
    const escalatedFilter = url.searchParams.get('escalated') === 'true'
    
    console.log(`🔍 Filters - status: ${statusFilter}, targetType: ${targetTypeFilter}, flashy: ${flashyFilter}, escalated: ${escalatedFilter}`)
    
    // Get flag IDs based on filters
    let flagIds: string[] = []
    
    if (escalatedFilter) {
      // Get only escalated flags
      flagIds = await kv.get('flags:escalated') || []
    } else if (statusFilter) {
      flagIds = await kv.get(`flags:status:${statusFilter}`) || []
    } else {
      flagIds = await kv.get('flags:all') || []
    }
    
    // Fetch all flag objects
    const flags = await Promise.all(
      (flagIds as string[]).map(async (flagId: string) => {
        return await kv.get(`flag:${flagId}`)
      })
    )
    
    // Filter out null values and apply targetType filter if needed
    let validFlags = flags.filter(Boolean)
    
    if (targetTypeFilter) {
      validFlags = validFlags.filter((flag: any) => flag.targetType === targetTypeFilter)
    }
    
    // Enrich flags with reporter and target information
    const enrichedFlags = await Promise.all(
      validFlags.map(async (flag: any) => {
        // Get reporter info
        let reporterName = 'Unknown'
        try {
          const { data: reporterData } = await supabase.auth.admin.getUserById(flag.reporterId)
          if (reporterData?.user) {
            reporterName = reporterData.user.user_metadata?.displayName || 
                          reporterData.user.user_metadata?.name || 
                          reporterData.user.email || 'Unknown'
          }
        } catch (err) {
          console.log(`Failed to fetch reporter info: ${err}`)
        }
        
        // Get target info based on type
        let targetName = 'Unknown'
        let targetDetails = flag.targetDetails || null
        let targetUserName = null
        let targetUserId = null
        
        if (flag.targetType === 'deck') {
          // Check if this is an old card flag (targetId contains "-card-")
          if (flag.targetId.includes('-card-')) {
            // Old card flag stored as deck type
            const deckId = flag.targetId.split('-card-')[0]
            const deck = await kv.get(`community:published:${deckId}`)
            if (deck) {
              // Find the card in the deck
              const cardIndex = parseInt(flag.targetId.split('-card-')[1])
              const card = (deck as any).cards?.[cardIndex]
              const cardNumber = cardIndex + 1
              targetName = card ? `Card #${cardNumber}: ${card.front.substring(0, 40)}...` : 'Card (deleted)'
              targetDetails = {
                deckId: deckId,
                emoji: (deck as any).emoji,
                deckName: (deck as any).name,
                cardIndex: cardIndex,
                cardNumber: cardNumber
              }
              // Get deck author info for old card flags
              targetUserId = (deck as any).author
            }
          } else {
            // Real deck flag
            const deck = await kv.get(`community:published:${flag.targetId}`)
            if (deck) {
              targetName = (deck as any).name
              targetDetails = {
                emoji: (deck as any).emoji,
                author: (deck as any).author
              }
              // Get deck author info
              targetUserId = (deck as any).author
            }
          }
        } else if (flag.targetType === 'user') {
          // For user flags, the target IS the user being reported
          targetUserId = flag.targetId
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(flag.targetId)
            if (userData?.user) {
              targetName = userData.user.user_metadata?.displayName || 
                          userData.user.user_metadata?.name || 
                          userData.user.email || 'Unknown'
              targetUserName = targetName
            }
          } catch (err) {
            console.log(`Failed to fetch user info: ${err}`)
          }
        } else if (flag.targetType === 'comment') {
          // Always try to fetch comment from deck if we have deckId
          console.log(`Comment flag detected - targetDetails:`, targetDetails)
          if (targetDetails?.deckId) {
            console.log(`Comment flag has deckId: ${targetDetails.deckId}`)
            const comments = await kv.get(`deck:${targetDetails.deckId}:comments`) || []
            console.log(`Found ${(comments as any[]).length} comments in deck ${targetDetails.deckId}`)
            const comment = (comments as any[]).find((c: any) => c.id === flag.targetId)
            console.log(`Looking for comment ${flag.targetId}, found:`, comment ? 'YES' : 'NO')
            
            if (comment) {
              // Get comment author info (comments use 'userId' not 'authorId')
              targetUserId = comment.userId
              console.log(`Comment flag: Set targetUserId to ${targetUserId}`)
              
              // Use existing commentText if available, otherwise from comment object
              const commentText = targetDetails?.commentText || comment.text || ''
              const commentPreview = commentText.length > 40 
                ? commentText.substring(0, 40) + '...' 
                : commentText
              targetName = `Comment: "${commentPreview}"`
              
              // Enrich targetDetails with comment text and author
              targetDetails = {
                ...targetDetails,
                commentText: commentText,
                authorId: comment.authorId
              }
            } else {
              // Comment was deleted - use cached commentText if available
              if (targetDetails?.commentText) {
                const commentText = targetDetails.commentText
                const commentPreview = commentText.length > 40 
                  ? commentText.substring(0, 40) + '...' 
                  : commentText
                targetName = `Comment: "${commentPreview}"`
              } else {
                targetName = `Comment ${flag.targetId.substring(0, 8)}... (deleted)`
              }
            }
          } else {
            // No deck context - just show ID
            targetName = `Comment ${flag.targetId.substring(0, 8)}...`
          }
        } else if (flag.targetType === 'card') {
          // New card flag with proper targetDetails
          console.log(`🎴 Card flag detected - targetDetails:`, targetDetails)
          
          // For old flags without targetDetails, try to parse from targetId
          let deckId = targetDetails?.deckId
          if (!deckId && flag.targetId.includes('-card-')) {
            // Old format: {deckId}-card-{cardIndex}
            deckId = flag.targetId.split('-card-')[0]
            console.log(`🎴 Old card flag - parsed deckId from targetId: ${deckId}`)
          }
          
          if (deckId) {
            console.log(`🎴 Card flag has deckId: ${deckId}`)
            const deck = await kv.get(`community:published:${deckId}`)
            console.log(`Found deck for card flag:`, deck ? 'YES' : 'NO')
            if (deck) {
              let card = null
              let cardIndex = -1
              
              // Try to find the card
              // First, check if targetId is in the format {deckId}-card-{index}
              if (flag.targetId.includes('-card-')) {
                cardIndex = parseInt(flag.targetId.split('-card-')[1])
                card = (deck as any).cards?.[cardIndex]
              } else {
                // Otherwise try to find by card.id
                const foundIndex = (deck as any).cards?.findIndex((c: any) => c.id === flag.targetId)
                if (foundIndex !== -1) {
                  cardIndex = foundIndex
                  card = (deck as any).cards?.[foundIndex]
                }
              }
              
              const cardNumber = cardIndex + 1
              targetName = card ? `Card #${cardNumber}: ${card.front.substring(0, 40)}...` : 'Card (deleted)'
              targetDetails = {
                ...targetDetails,
                deckId: deckId, // Ensure deckId is in targetDetails (for old flags)
                deckName: (deck as any).name,
                emoji: (deck as any).emoji,
                cardIndex: cardIndex,
                cardNumber: cardNumber
              }
              // Get deck author info for card flags (use authorId, not author which is the display name)
              targetUserId = (deck as any).authorId
              console.log(`Card flag: Set targetUserId to ${targetUserId}`)
            }
          }
        }
        
        // If we have a targetUserId but no targetUserName yet, fetch it
        if (targetUserId && !targetUserName) {
          console.log(`Fetching targetUserName for targetUserId: ${targetUserId}`)
          try {
            // Check if targetUserId looks like a UUID (contains dashes) or is a username
            const isUuid = targetUserId.includes('-')
            console.log(`isUuid: ${isUuid}`)
            
            if (isUuid) {
              // It's a UUID, fetch from Supabase Auth
              const { data: userData } = await supabase.auth.admin.getUserById(targetUserId)
              if (userData?.user) {
                targetUserName = userData.user.user_metadata?.displayName || 
                                userData.user.user_metadata?.name || 
                                userData.user.email || 'Unknown'
                console.log(`Fetched targetUserName from UUID: ${targetUserName}`)
              } else {
                console.log(`No user data found for UUID: ${targetUserId}`)
              }
            } else {
              // It's a username string, use it directly
              targetUserName = targetUserId
              console.log(`Using username directly: ${targetUserName}`)
            }
          } catch (err) {
            console.log(`Failed to fetch target user info: ${err}`)
            // If fetching fails, just use the targetUserId as the name
            targetUserName = targetUserId
          }
        }
        
        const enrichedFlag = {
          ...flag,
          reporterName,
          targetName,
          targetDetails,
          targetUserName,
          targetUserId
        }
        
        console.log(`Enriched flag ${flag.id}: targetUserId=${targetUserId}, targetUserName=${targetUserName}`)
        
        return enrichedFlag
      })
    )
    
    // Filter by Flashy content author if requested
    let filteredFlags = enrichedFlags
    if (flashyFilter) {
      console.log(`🔍 Filtering for Flashy content only...`)
      console.log(`🔍 Total flags before filter: ${enrichedFlags.length}`)
      filteredFlags = enrichedFlags.filter((flag: any) => {
        // For user flags, check if the reported user is "Flashy"
        if (flag.targetType === 'user') {
          const isFlashy = flag.targetUserName?.toLowerCase() === 'flashy'
          console.log(`User flag: "${flag.targetUserName}" (userId: ${flag.targetUserId}) -> ${isFlashy ? 'KEEP' : 'SKIP'}`)
          return isFlashy
        }
        // For other content types, check if the content author is "Flashy"
        const isFlashy = flag.targetUserName?.toLowerCase() === 'flashy'
        console.log(`${flag.targetType} flag: targetUserName="${flag.targetUserName}" (targetUserId: ${flag.targetUserId}) -> ${isFlashy ? 'KEEP' : 'SKIP'}`)
        return isFlashy
      })
      console.log(`✅ Filtered ${filteredFlags.length} Flashy flags from ${enrichedFlags.length} total flags`)
    }
    
    // Sort by created date (newest first)
    filteredFlags.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return c.json({ flags: filteredFlags })
  } catch (error) {
    console.log(`Get flags error: ${error}`)
    return c.json({ error: 'Failed to fetch flags' }, 500)
  }
})

// Update flag status (Moderator/Superuser only)
app.patch('/make-server-8a1502a9/flags/:flagId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser or moderator (check both KV store and user metadata)
    const userProfile = await kv.get(`user:${user.id}:profile`)
    const isSuperuser = (userProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser
    const isModerator = (userProfile as any)?.isModerator || user.user_metadata?.isModerator
    
    if (!isSuperuser && !isModerator) {
      console.log(`Forbidden access attempt by user ${user.id} - not a moderator or superuser`)
      return c.json({ error: 'Forbidden - Moderator or Superuser access required' }, 403)
    }

    const flagId = c.req.param('flagId')
    const { status, resolutionReason, moderatorNotes } = await c.req.json()
    
    if (!['open', 'reviewing', 'resolved'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400)
    }
    
    // Validate resolutionReason if status is resolved
    if (status === 'resolved' && resolutionReason && !['approved', 'rejected', 'removed'].includes(resolutionReason)) {
      return c.json({ error: 'Invalid resolution reason. Must be: approved, rejected, or removed' }, 400)
    }
    
    const flag = await kv.get(`flag:${flagId}`)
    
    if (!flag) {
      return c.json({ error: 'Flag not found' }, 404)
    }
    
    const oldStatus = (flag as any).status
    
    // Get moderator name
    const moderatorName = user.user_metadata?.displayName || user.user_metadata?.name || user.email
    
    // Update flag
    const updatedFlag = {
      ...(flag as any),
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
      resolutionReason: status === 'resolved' ? resolutionReason : null,
      moderatorNotes: moderatorNotes || (flag as any).moderatorNotes || null,
      resolvedBy: status === 'resolved' ? user.id : null,
      resolvedByName: status === 'resolved' ? moderatorName : null,
      // Auto-assign to current user when status changes to 'reviewing'
      // Reset assignment when status changes to 'open'
      reviewingBy: status === 'reviewing' ? user.id : (status === 'open' ? null : (flag as any).reviewingBy),
      reviewingByName: status === 'reviewing' ? moderatorName : (status === 'open' ? null : (flag as any).reviewingByName),
    }
    
    await kv.set(`flag:${flagId}`, updatedFlag)
    
    // Update status indexes
    if (oldStatus !== status) {
      // Remove from old status index
      const oldStatusFlags = await kv.get(`flags:status:${oldStatus}`) || []
      await kv.set(
        `flags:status:${oldStatus}`, 
        (oldStatusFlags as string[]).filter(id => id !== flagId)
      )
      
      // Add to new status index
      const newStatusFlags = await kv.get(`flags:status:${status}`) || []
      await kv.set(`flags:status:${status}`, [...(newStatusFlags as string[]), flagId])
      
      // Create an action for status change
      const actionId = `action:${flagId}:${Date.now()}`
      const action = {
        id: actionId,
        ticketId: flagId,
        actionType: 'status_change',
        performedBy: moderatorName,
        performedById: user.id,
        timestamp: new Date().toISOString(),
        details: {
          oldValue: oldStatus,
          newValue: status
        }
      }
      await kv.set(actionId, action)
      
      // Add to ticket actions list
      const actionsKey = `ticket:${flagId}:actions`
      const existingActions = await kv.get(actionsKey) || []
      await kv.set(actionsKey, [...(existingActions as string[]), actionId])
    }
    
    // Create an assignment action if status changed to 'reviewing' and assignee changed
    if (status === 'reviewing' && (flag as any).reviewingBy !== user.id) {
      const assignmentActionId = `action:${flagId}:${Date.now()}-assignment`
      const assignmentAction = {
        id: assignmentActionId,
        ticketId: flagId,
        actionType: 'assignment',
        performedBy: moderatorName,
        performedById: user.id,
        timestamp: new Date().toISOString(),
        details: {
          assignedTo: moderatorName,
          assignedToId: user.id
        }
      }
      await kv.set(assignmentActionId, assignmentAction)
      
      // Add to ticket actions list
      const actionsKey = `ticket:${flagId}:actions`
      const existingActions = await kv.get(actionsKey) || []
      await kv.set(actionsKey, [...(existingActions as string[]), assignmentActionId])
    }
    
    // Create an unassignment action if status changed from 'reviewing' to 'open'
    if (oldStatus === 'reviewing' && status === 'open' && (flag as any).reviewingBy) {
      const unassignmentActionId = `action:${flagId}:${Date.now()}-unassignment`
      const unassignmentAction = {
        id: unassignmentActionId,
        ticketId: flagId,
        actionType: 'unassignment',
        performedBy: moderatorName,
        performedById: user.id,
        timestamp: new Date().toISOString(),
        details: {
          previouslyAssignedTo: (flag as any).reviewingByName
        }
      }
      await kv.set(unassignmentActionId, unassignmentAction)
      
      // Add to ticket actions list
      const actionsKey = `ticket:${flagId}:actions`
      const existingActions = await kv.get(actionsKey) || []
      await kv.set(actionsKey, [...(existingActions as string[]), unassignmentActionId])
    }
    
    console.log(`Superuser ${user.id} updated flag ${flagId} status to ${status}`)
    
    return c.json({ message: 'Flag updated successfully', flag: updatedFlag })
  } catch (error) {
    console.log(`Update flag error: ${error}`)
    return c.json({ error: 'Failed to update flag' }, 500)
  }
})

// Escalate flag (Moderator only)
app.post('/make-server-8a1502a9/flags/:flagId/escalate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is moderator (but not superuser - escalation is for moderators who need admin help)
    const userProfile = await kv.get(`user:${user.id}:profile`)
    const isSuperuser = (userProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser
    const isModerator = (userProfile as any)?.isModerator || user.user_metadata?.isModerator
    
    if (!isModerator && !isSuperuser) {
      console.log(`Forbidden escalation attempt by user ${user.id} - not a moderator or superuser`)
      return c.json({ error: 'Forbidden - Moderator or Superuser access required' }, 403)
    }

    const flagId = c.req.param('flagId')
    const { escalationReason } = await c.req.json()
    
    if (!escalationReason || !escalationReason.trim()) {
      return c.json({ error: 'Escalation reason is required' }, 400)
    }
    
    const flag = await kv.get(`flag:${flagId}`)
    
    if (!flag) {
      return c.json({ error: 'Flag not found' }, 404)
    }
    
    // Get moderator name
    const moderatorName = user.user_metadata?.displayName || user.user_metadata?.name || user.email
    
    // Update flag with escalation info
    const updatedFlag = {
      ...(flag as any),
      isEscalated: true,
      escalatedBy: user.id,
      escalatedByName: moderatorName,
      escalationReason: escalationReason.trim(),
      escalatedAt: new Date().toISOString(),
    }
    
    await kv.set(`flag:${flagId}`, updatedFlag)
    
    // Create action record for the escalation
    const escalationAction = {
      id: crypto.randomUUID(),
      ticketId: flagId,
      actionType: 'escalation',
      performedBy: moderatorName,
      performedById: user.id,
      timestamp: new Date().toISOString(),
      details: {
        escalationReason: escalationReason.trim()
      }
    }
    
    await kv.set(`action:${escalationAction.id}`, escalationAction)
    
    // Add to ticket actions list
    const actionsKey = `ticket:${flagId}:actions`
    const existingActions = await kv.get(actionsKey) || []
    await kv.set(actionsKey, [...(existingActions as string[]), escalationAction.id])
    
    // Add to escalated flags index
    const escalatedFlags = await kv.get('flags:escalated') || []
    if (!(escalatedFlags as string[]).includes(flagId)) {
      await kv.set('flags:escalated', [...(escalatedFlags as string[]), flagId])
    }
    
    console.log(`Moderator ${user.id} (${moderatorName}) escalated flag ${flagId} to admin/superuser`)
    console.log(`Escalation reason: ${escalationReason}`)
    
    return c.json({ message: 'Flag escalated successfully', flag: updatedFlag })
  } catch (error) {
    console.log(`Escalate flag error: ${error}`)
    return c.json({ error: 'Failed to escalate flag' }, 500)
  }
})

// ===== Friends API =====

// Get user's friends list
app.get('/make-server-8a1502a9/friends', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get friends: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Get friends from KV store
    const friendsKey = `user:${user.id}:friends`
    const friendsData = await kv.get(friendsKey)
    console.log(`getFriends - friendsKey: ${friendsKey}`)
    console.log(`getFriends - friendsData from KV:`, friendsData)
    const friendIds = friendsData ? (friendsData as string[]) : []
    console.log(`getFriends - friendIds:`, friendIds)

    // Fetch user details for each friend
    const friendsDetails = []
    for (const friendId of friendIds) {
      try {
        const { data: friendUser, error: friendError } = await supabase.auth.admin.getUserById(friendId)
        if (!friendError && friendUser) {
          friendsDetails.push({
            id: friendUser.user.id,
            email: friendUser.user.email,
            name: friendUser.user.user_metadata?.name || '',
            displayName: friendUser.user.user_metadata?.displayName || friendUser.user.user_metadata?.name || '',
            avatarUrl: friendUser.user.user_metadata?.avatarUrl,
            decksPublic: friendUser.user.user_metadata?.decksPublic ?? true,
          })
        }
      } catch (err) {
        console.log(`Error fetching friend ${friendId}:`, err)
        // Skip this friend if there's an error
      }
    }

    console.log(`getFriends - returning friendsDetails:`, friendsDetails)
    return c.json({ friends: friendsDetails })
  } catch (error) {
    console.log(`Get friends error: ${error}`)
    return c.json({ error: 'Failed to fetch friends' }, 500)
  }
})

// Get friend requests
app.get('/make-server-8a1502a9/friends/requests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get friend requests: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const requestIds = await kv.get(`user:${user.id}:friend_requests`) || []
    
    // Fetch user details for each request
    const requestsWithDetails = []
    for (const requestId of requestIds) {
      try {
        const { data: requestUser, error: requestError } = await supabase.auth.admin.getUserById(requestId)
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
        console.log(`Error fetching request user ${requestId}:`, err)
      }
    }
    
    return c.json({ requests: requestsWithDetails })
  } catch (error) {
    console.log(`Get friend requests error: ${error}`)
    return c.json({ error: 'Failed to fetch friend requests' }, 500)
  }
})

// Add friend
app.post('/make-server-8a1502a9/friends/:friendId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in add friend: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    
    // Get current friends list
    const friends = await kv.get(`user:${user.id}:friends`) || []
    
    // Add friend if not already added
    if (!friends.includes(friendId)) {
      friends.push(friendId)
      await kv.set(`user:${user.id}:friends`, friends)
    }

    // Remove from friend requests if it exists
    const requests = await kv.get(`user:${user.id}:friend_requests`) || []
    const updatedRequests = requests.filter((id: string) => id !== friendId)
    await kv.set(`user:${user.id}:friend_requests`, updatedRequests)

    return c.json({ message: 'Friend added successfully' })
  } catch (error) {
    console.log(`Add friend error: ${error}`)
    return c.json({ error: 'Failed to add friend' }, 500)
  }
})

// Remove friend
app.delete('/make-server-8a1502a9/friends/:friendId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in remove friend: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    
    // Get current friends list and remove friend
    const friends = await kv.get(`user:${user.id}:friends`) || []
    const updatedFriends = friends.filter((id: string) => id !== friendId)
    await kv.set(`user:${user.id}:friends`, updatedFriends)

    // Also remove from the other user's friends list (mutual removal)
    const theirFriends = await kv.get(`user:${friendId}:friends`) || []
    const updatedTheirFriends = theirFriends.filter((id: string) => id !== user.id)
    await kv.set(`user:${friendId}:friends`, updatedTheirFriends)

    return c.json({ message: 'Friend removed successfully' })
  } catch (error) {
    console.log(`Remove friend error: ${error}`)
    return c.json({ error: 'Failed to remove friend' }, 500)
  }
})

// Send friend request
app.post('/make-server-8a1502a9/friends/request/:friendId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in send friend request: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const friendId = c.req.param('friendId')
    
    // Add to my pending requests
    const myPending = await kv.get(`user:${user.id}:pending_requests`) || []
    if (!myPending.includes(friendId)) {
      myPending.push(friendId)
      await kv.set(`user:${user.id}:pending_requests`, myPending)
    }
    
    // Add to their incoming requests
    const theirRequests = await kv.get(`user:${friendId}:friend_requests`) || []
    if (!theirRequests.includes(user.id)) {
      theirRequests.push(user.id)
      await kv.set(`user:${friendId}:friend_requests`, theirRequests)
    }

    // Create notification for the recipient
    const notificationKey = `notifications:${friendId}`
    const notifications = await kv.get(notificationKey) || []
    
    // Check if a notification from this user already exists
    const existingNotification = notifications.find((n: any) => 
      n.type === 'friend_request' && n.fromUserId === user.id
    )
    
    // Only create a new notification if one doesn't already exist
    if (!existingNotification) {
      const notification = {
        id: crypto.randomUUID(),
        type: 'friend_request',
        fromUserId: user.id,
        fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
        fromUserAvatar: user.user_metadata?.avatarUrl || null,
        createdAt: new Date().toISOString(),
        read: false
      }
      
      notifications.push(notification)
      await kv.set(notificationKey, notifications)
      console.log(`Friend request notification created from ${user.id} to ${friendId}`)
      
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
        console.error(`Failed to send friend request email: ${emailError}`)
        // Don't fail the whole operation if email fails
      }
    } else {
      console.log(`Friend request notification already exists from ${user.id} to ${friendId}`)
    }

    console.log(`Friend request sent from ${user.id} to ${friendId}`)
    return c.json({ message: 'Friend request sent successfully' })
  } catch (error) {
    console.log(`Send friend request error: ${error}`)
    return c.json({ error: 'Failed to send friend request' }, 500)
  }
})

// Get pending friend requests (requests I sent)
app.get('/make-server-8a1502a9/friends/pending', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get pending requests: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const pending = await kv.get(`user:${user.id}:pending_requests`) || []

    return c.json({ pending })
  } catch (error) {
    console.log(`Get pending requests error: ${error}`)
    return c.json({ error: 'Failed to fetch pending requests' }, 500)
  }
})

// Accept friend request
app.post('/make-server-8a1502a9/friends/accept/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in accept friend request: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = c.req.param('userId')
    
    // Add to both users' friends lists
    const myFriends = await kv.get(`user:${user.id}:friends`) || []
    if (!myFriends.includes(userId)) {
      myFriends.push(userId)
      await kv.set(`user:${user.id}:friends`, myFriends)
    }
    
    const theirFriends = await kv.get(`user:${userId}:friends`) || []
    if (!theirFriends.includes(user.id)) {
      theirFriends.push(user.id)
      await kv.set(`user:${userId}:friends`, theirFriends)
    }
    
    // Remove from my friend requests
    const myRequests = await kv.get(`user:${user.id}:friend_requests`) || []
    const updatedRequests = myRequests.filter((id: string) => id !== userId)
    await kv.set(`user:${user.id}:friend_requests`, updatedRequests)
    
    // Remove from their pending requests
    const theirPending = await kv.get(`user:${userId}:pending_requests`) || []
    const updatedPending = theirPending.filter((id: string) => id !== user.id)
    await kv.set(`user:${userId}:pending_requests`, updatedPending)

    // Remove the friend request notification
    const notificationKey = `notifications:${user.id}`
    const notifications = await kv.get(notificationKey) || []
    const updatedNotifications = notifications.filter((n: any) => 
      !(n.type === 'friend_request' && n.fromUserId === userId)
    )
    await kv.set(notificationKey, updatedNotifications)

    return c.json({ message: 'Friend request accepted' })
  } catch (error) {
    console.log(`Accept friend request error: ${error}`)
    return c.json({ error: 'Failed to accept friend request' }, 500)
  }
})

// Decline friend request
app.post('/make-server-8a1502a9/friends/decline/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in decline friend request: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = c.req.param('userId')
    
    // Remove from my friend requests
    const myRequests = await kv.get(`user:${user.id}:friend_requests`) || []
    const updatedRequests = myRequests.filter((id: string) => id !== userId)
    await kv.set(`user:${user.id}:friend_requests`, updatedRequests)
    
    // Remove from their pending requests
    const theirPending = await kv.get(`user:${userId}:pending_requests`) || []
    const updatedPending = theirPending.filter((id: string) => id !== user.id)
    await kv.set(`user:${userId}:pending_requests`, updatedPending)

    // Remove the friend request notification
    const notificationKey = `notifications:${user.id}`
    const notifications = await kv.get(notificationKey) || []
    const updatedNotifications = notifications.filter((n: any) => 
      !(n.type === 'friend_request' && n.fromUserId === userId)
    )
    await kv.set(notificationKey, updatedNotifications)

    return c.json({ message: 'Friend request declined' })
  } catch (error) {
    console.log(`Decline friend request error: ${error}`)
    return c.json({ error: 'Failed to decline friend request' }, 500)
  }
})

// Rate a deck (premium feature)
app.post('/make-server-8a1502a9/decks/:deckId/rate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in rate deck: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check subscription tier - only non-free users can rate
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      return c.json({ error: 'Premium feature: Upgrade to rate decks' }, 403)
    }

    const deckId = c.req.param('deckId')
    const body = await c.req.json()
    const { rating } = body

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400)
    }

    // Get existing ratings for this deck
    const ratings = await kv.get(`deck:${deckId}:ratings`) || {}
    
    // Add or update user's rating
    ratings[user.id] = {
      rating,
      userName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
      timestamp: new Date().toISOString()
    }
    
    // Save updated ratings
    await kv.set(`deck:${deckId}:ratings`, ratings)
    
    // Calculate average rating
    const allRatings = Object.values(ratings).map((r: any) => r.rating)
    const averageRating = allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length
    const totalRatings = allRatings.length

    return c.json({ 
      message: 'Rating submitted successfully',
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      userRating: rating
    })
  } catch (error) {
    console.log(`Rate deck error: ${error}`)
    return c.json({ error: 'Failed to rate deck' }, 500)
  }
})

// Get deck ratings
app.get('/make-server-8a1502a9/decks/:deckId/ratings', async (c) => {
  try {
    const deckId = c.req.param('deckId')
    
    // Get ratings from KV store
    const ratings = await kv.get(`deck:${deckId}:ratings`) || {}
    
    // Calculate average rating
    const allRatings = Object.values(ratings).map((r: any) => r.rating)
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length 
      : 0
    const totalRatings = allRatings.length
    
    // Check if current user has rated (if authenticated)
    let userRating = null
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken)
      if (user && ratings[user.id]) {
        userRating = ratings[user.id].rating
      }
    }

    return c.json({ 
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      userRating
    })
  } catch (error) {
    console.log(`Get ratings error: ${error}`)
    return c.json({ error: 'Failed to fetch ratings' }, 500)
  }
})

// Get comments for a deck
app.get('/make-server-8a1502a9/decks/:deckId/comments', async (c) => {
  try {
    const deckId = c.req.param('deckId')
    
    // Get comments from KV store
    const comments = await kv.get(`deck:${deckId}:comments`) || []

    // Flatten nested replies to 2-level structure
    const flattenComments = (commentsList: any[]) => {
      return commentsList
        .filter(comment => !comment.isDeleted) // Filter out deleted comments
        .map(comment => {
          if (comment.replies && comment.replies.length > 0) {
            // Collect all replies recursively and flatten them
            const allReplies: any[] = []
            
            const collectReplies = (replies: any[]) => {
              for (const reply of replies) {
                if (!reply.isDeleted) { // Filter out deleted replies
                  allReplies.push({
                    ...reply,
                    replies: [] // Remove nested replies from replies
                  })
                }
                // If this reply has its own replies, add them to the same level
                if (reply.replies && reply.replies.length > 0) {
                  collectReplies(reply.replies)
                }
              }
            }
            
            collectReplies(comment.replies)
            
            // Sort replies by createdAt (newest first)
            allReplies.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            
            return {
              ...comment,
              replies: allReplies
            }
          }
          return comment
        })
        .sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }

    const flattenedComments = flattenComments(comments)

    return c.json({ comments: flattenedComments })
  } catch (error) {
    console.log(`Get comments error: ${error}`)
    return c.json({ error: 'Failed to fetch comments' }, 500)
  }
})

// Post a comment on a deck
app.post('/make-server-8a1502a9/decks/:deckId/comments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in post comment: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const body = await c.req.json()
    const { text, parentId } = body

    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Comment text is required' }, 400)
    }

    // Create comment object
    const comment = {
      id: crypto.randomUUID(),
      deckId,
      userId: user.id,
      userName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
      userAvatar: user.user_metadata?.avatarUrl || null,
      userRole: user.user_metadata?.isSuperuser ? 'flashy' : (user.user_metadata?.isModerator ? 'moderator' : 'user'), // Add user role
      text: text.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      replies: []
    }

    // Get existing comments
    const comments = await kv.get(`deck:${deckId}:comments`) || []
    
    // If this is a reply, add it to the parent's replies array
    // For 2-level threading: find the root comment if replying to a nested reply
    if (parentId) {
      // Find if parentId is a top-level comment or a reply
      const findRootComment = (commentsList: any[], targetId: string): any => {
        for (const c of commentsList) {
          if (c.id === targetId) {
            // Found the parent - it's a top-level comment
            return c
          }
          if (c.replies && c.replies.length > 0) {
            // Check if parent is in the replies
            const isInReplies = c.replies.some((r: any) => r.id === targetId)
            if (isInReplies) {
              // Parent is a reply, return the root comment
              return c
            }
            // Check deeper (though we're flattening, legacy data might exist)
            const found = findRootCommentInReplies(c.replies, targetId, c)
            if (found) return found
          }
        }
        return null
      }
      
      const findRootCommentInReplies = (replies: any[], targetId: string, root: any): any => {
        for (const r of replies) {
          if (r.id === targetId) {
            return root
          }
          if (r.replies && r.replies.length > 0) {
            const found = findRootCommentInReplies(r.replies, targetId, root)
            if (found) return found
          }
        }
        return null
      }
      
      const rootComment = findRootComment(comments, parentId)
      
      if (rootComment) {
        rootComment.replies = rootComment.replies || []
        rootComment.replies.push(comment)
      }
    } else {
      // Top-level comment
      comments.push(comment)
    }
    
    // Save updated comments
    await kv.set(`deck:${deckId}:comments`, comments)

    // Notification logic
    // 1. Detect mentions and notify mentioned users
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g
    const mentions = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1])
    }

    // For each mention, try to find the user and create a notification
    for (const mentionedName of mentions) {
      // Get all users from KV store
      const usersData = await kv.getByPrefix('user:')
      
      // Find user by name or displayName
      const mentionedUser = usersData.find((userData: any) => {
        const userName = userData.user_metadata?.displayName || userData.user_metadata?.name || ''
        return userName.toLowerCase() === mentionedName.toLowerCase()
      })
      
      if (mentionedUser && mentionedUser.id !== user.id) {
        // Don't notify the user who posted the comment
        // Create notification for the mentioned user
        const notificationKey = `notifications:${mentionedUser.id}`
        const notifications = await kv.get(notificationKey) || []
        
        const notification = {
          id: crypto.randomUUID(),
          type: 'mention',
          fromUserId: user.id,
          fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
          fromUserAvatar: user.user_metadata?.avatarUrl || null,
          deckId: deckId,
          commentText: text.trim(),
          createdAt: new Date().toISOString(),
          read: false
        }
        
        notifications.push(notification)
        await kv.set(notificationKey, notifications)
      }
    }

    // 2. If this is a reply, notify the author of the parent comment
    if (parentId) {
      // Find the parent comment author and text
      const findCommentDetails = (commentsList: any[], targetId: string): { userId: string | null, text: string | null } => {
        for (const c of commentsList) {
          if (c.id === targetId) {
            return { userId: c.userId, text: c.text }
          }
          if (c.replies && c.replies.length > 0) {
            const found = findCommentDetails(c.replies, targetId)
            if (found.userId) return found
          }
        }
        return { userId: null, text: null }
      }
      
      const parentDetails = findCommentDetails(comments, parentId)
      const parentAuthorId = parentDetails.userId
      const parentCommentText = parentDetails.text
      
      if (parentAuthorId && parentAuthorId !== user.id) {
        // Don't notify yourself
        const notificationKey = `notifications:${parentAuthorId}`
        const notifications = await kv.get(notificationKey) || []
        
        // Check for duplicate notification
        const isDuplicate = notifications.some((n: any) => 
          n.type === 'reply' && 
          n.fromUserId === user.id && 
          n.deckId === deckId &&
          n.parentCommentId === parentId &&
          n.commentText === text.trim()
        )
        
        if (!isDuplicate) {
          const notification = {
            id: crypto.randomUUID(),
            type: 'reply',
            fromUserId: user.id,
            fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
            fromUserAvatar: user.user_metadata?.avatarUrl || null,
            deckId: deckId,
            parentCommentId: parentId,
            commentText: text.trim(),
            createdAt: new Date().toISOString(),
            read: false
          }
          
          notifications.push(notification)
          await kv.set(notificationKey, notifications)
          
          // Send email notification
          try {
            const { data: parentAuthorData } = await supabase.auth.admin.getUserById(parentAuthorId)
            const deck = await kv.get(`community:published:${deckId}`)
            
            if (parentAuthorData?.user?.email && 
                parentAuthorData.user.user_metadata?.emailNotifications !== false &&
                deck?.name &&
                parentCommentText) {
              await emailService.sendCommentReplyEmail(
                parentAuthorData.user.email,
                parentAuthorData.user.user_metadata?.displayName || parentAuthorData.user.user_metadata?.name || 'User',
                user.user_metadata?.displayName || user.user_metadata?.name || 'Someone',
                deck.name,
                parentCommentText,
                text.trim()
              )
              console.log(`📧 Comment reply email sent to ${parentAuthorData.user.email}`)
            }
          } catch (emailError) {
            console.error(`Failed to send comment reply email: ${emailError}`)
            // Don't fail the whole operation if email fails
          }
        }
      }
    } else {
      // 3. If this is a top-level comment, notify the deck owner
      // Get the deck to find the owner
      const deck = await kv.get(`community:published:${deckId}`)
      
      if (deck && deck.userId && deck.userId !== user.id) {
        // Don't notify yourself
        const notificationKey = `notifications:${deck.userId}`
        const notifications = await kv.get(notificationKey) || []
        
        // Check for duplicate notification
        const isDuplicate = notifications.some((n: any) => 
          n.type === 'deck_comment' && 
          n.fromUserId === user.id && 
          n.deckId === deckId &&
          n.commentText === text.trim()
        )
        
        if (!isDuplicate) {
          const notification = {
            id: crypto.randomUUID(),
            type: 'deck_comment',
            fromUserId: user.id,
            fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
            fromUserAvatar: user.user_metadata?.avatarUrl || null,
            deckId: deckId,
            deckName: deck.name || 'Untitled Deck',
            commentText: text.trim(),
            createdAt: new Date().toISOString(),
            read: false
          }
          
          notifications.push(notification)
          await kv.set(notificationKey, notifications)
        }
      }
    }

    return c.json({ comment, message: 'Comment posted successfully' })
  } catch (error) {
    console.log(`Post comment error: ${error}`)
    return c.json({ error: 'Failed to post comment' }, 500)
  }
})

// Delete a comment (Moderator/Superuser only)
app.delete('/make-server-8a1502a9/decks/:deckId/comments/:commentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in delete comment: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is moderator or superuser
    const isModerator = user.user_metadata?.isModerator === true
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    if (!isModerator && !isSuperuser) {
      return c.json({ error: 'Only moderators and superusers can delete comments' }, 403)
    }

    const deckId = c.req.param('deckId')
    const commentId = c.req.param('commentId')
    const body = await c.req.json()
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return c.json({ error: 'Deletion reason is required' }, 400)
    }

    // Get comments
    const comments = await kv.get(`deck:${deckId}:comments`) || []
    
    // Get deck info for logging
    const communityDeck = await kv.get(`community:published:${deckId}`)
    const deckName = communityDeck?.name || 'Unknown Deck'
    
    // Find and soft delete the comment
    let commentAuthorId = null
    let commentAuthorName = ''
    let commentText = ''
    let found = false
    
    const softDeleteComment = (commentsList: any[]): boolean => {
      for (const comment of commentsList) {
        if (comment.id === commentId) {
          commentAuthorId = comment.userId
          commentAuthorName = comment.userName || 'Unknown User'
          commentText = comment.text
          comment.isDeleted = true
          comment.deletedBy = user.id
          comment.deletedByName = user.user_metadata?.displayName || user.user_metadata?.name || 'Moderator'
          comment.deletedReason = reason.trim()
          comment.deletedAt = new Date().toISOString()
          return true
        }
        if (comment.replies && comment.replies.length > 0) {
          if (softDeleteComment(comment.replies)) {
            return true
          }
        }
      }
      return false
    }
    
    found = softDeleteComment(comments)
    
    if (!found) {
      return c.json({ error: 'Comment not found' }, 404)
    }
    
    // Save updated comments
    await kv.set(`deck:${deckId}:comments`, comments)
    
    // Store in deleted items log for superuser tool
    const deletedItemsKey = 'deleted:comments'
    const deletedItems = await kv.get(deletedItemsKey) || []
    deletedItems.push({
      id: commentId,
      deckId: deckId,
      deckName: deckName,
      userId: commentAuthorId,
      authorName: commentAuthorName,
      text: commentText,
      deletedBy: user.id,
      deletedByName: user.user_metadata?.displayName || user.user_metadata?.name || 'Moderator',
      deletedReason: reason.trim(),
      deletedAt: new Date().toISOString(),
      type: 'comment'
    })
    await kv.set(deletedItemsKey, deletedItems)
    
    // Notify the comment author
    if (commentAuthorId && commentAuthorId !== user.id) {
      const notificationKey = `notifications:${commentAuthorId}`
      const notifications = await kv.get(notificationKey) || []
      
      const notification = {
        id: crypto.randomUUID(),
        type: 'comment_deleted',
        moderatorName: user.user_metadata?.displayName || user.user_metadata?.name || 'Moderator',
        reason: reason.trim(),
        commentText: commentText,
        deckId: deckId,
        createdAt: new Date().toISOString(),
        read: false
      }
      
      notifications.push(notification)
      await kv.set(notificationKey, notifications)
    }
    
    console.log(`Comment ${commentId} deleted by ${user.email} for reason: ${reason}`)
    
    return c.json({ success: true, message: 'Comment deleted successfully' })
  } catch (error) {
    console.log(`Delete comment error: ${error}`)
    return c.json({ error: 'Failed to delete comment' }, 500)
  }
})

// Like/unlike a comment
app.post('/make-server-8a1502a9/decks/:deckId/comments/:commentId/like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in like comment: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const commentId = c.req.param('commentId')

    // Get comments
    const comments = await kv.get(`deck:${deckId}:comments`) || []
    
    let commentAuthorId = null
    let commentAuthorName = ''
    let found = false
    let alreadyLiked = false
    
    const likeComment = (commentsList: any[]): boolean => {
      for (const comment of commentsList) {
        if (comment.id === commentId) {
          commentAuthorId = comment.userId
          commentAuthorName = comment.userName || 'Unknown User'
          
          // Initialize likes array if it doesn't exist
          if (!comment.likes) {
            comment.likes = []
          }
          
          // Check if user already liked this comment
          const likeIndex = comment.likes.indexOf(user.id)
          if (likeIndex > -1) {
            // Unlike - remove user from likes
            comment.likes.splice(likeIndex, 1)
            alreadyLiked = true
          } else {
            // Like - add user to likes
            comment.likes.push(user.id)
          }
          
          return true
        }
        if (comment.replies && comment.replies.length > 0) {
          if (likeComment(comment.replies)) {
            return true
          }
        }
      }
      return false
    }
    
    found = likeComment(comments)
    
    if (!found) {
      return c.json({ error: 'Comment not found' }, 404)
    }
    
    // Save updated comments
    await kv.set(`deck:${deckId}:comments`, comments)
    
    // Notify the comment author (only if it's a new like and not their own comment)
    if (!alreadyLiked && commentAuthorId && commentAuthorId !== user.id) {
      const notificationKey = `notifications:${commentAuthorId}`
      const notifications = await kv.get(notificationKey) || []
      
      // Get deck info
      const communityDeck = await kv.get(`community:published:${deckId}`)
      const deckName = communityDeck?.name || 'Unknown Deck'
      
      const notification = {
        id: crypto.randomUUID(),
        type: 'comment_like',
        fromUserId: user.id,
        fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
        fromUserAvatar: user.user_metadata?.avatarUrl || null,
        deckId: deckId,
        deckName: deckName,
        commentId: commentId,
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      }
      
      notifications.push(notification)
      await kv.set(notificationKey, notifications)
    }
    
    return c.json({ success: true, liked: !alreadyLiked })
  } catch (error) {
    console.log(`Like comment error: ${error}`)
    return c.json({ error: 'Failed to like comment' }, 500)
  }
})

// Get notifications for the current user
app.get('/make-server-8a1502a9/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('Get notifications: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get notifications: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const notificationKey = `notifications:${user.id}`
    console.log(`📬 Fetching notifications for user ${user.id}`)
    console.log(`📬 Notification key: ${notificationKey}`)
    
    let notifications = await kv.get(notificationKey) || []
    console.log(`📬 Found ${notifications.length} notifications for user ${user.id}`)
    if (notifications.length > 0) {
      console.log(`📬 First 3 notifications:`, notifications.slice(0, 3))
      console.log(`📬 Notification types:`, notifications.map((n: any) => n.type))
    }

    // Remove duplicate friend request notifications (same fromUserId)
    const seen = new Map()
    const deduplicatedNotifications = []
    
    for (const notification of notifications) {
      if (notification.type === 'friend_request') {
        const key = `friend_request:${notification.fromUserId}`
        if (!seen.has(key)) {
          seen.set(key, true)
          deduplicatedNotifications.push(notification)
        }
      } else {
        deduplicatedNotifications.push(notification)
      }
    }
    
    // Save deduplicated list if we removed any
    if (deduplicatedNotifications.length !== notifications.length) {
      await kv.set(notificationKey, deduplicatedNotifications)
      console.log(`Removed ${notifications.length - deduplicatedNotifications.length} duplicate notifications for user ${user.id}`)
    }

    return c.json({ notifications: deduplicatedNotifications })
  } catch (error) {
    console.log(`Get notifications error: ${error}`)
    console.log(`Error stack: ${error.stack}`)
    return c.json({ error: 'Failed to fetch notifications' }, 500)
  }
})

// Mark notification as read
app.post('/make-server-8a1502a9/notifications/:notificationId/read', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in mark notification read: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const notificationId = c.req.param('notificationId')
    const notificationKey = `notifications:${user.id}`
    const notifications = await kv.get(notificationKey) || []

    // Mark the notification as read
    const updatedNotifications = notifications.map((n: any) =>
      n.id === notificationId ? { ...n, read: true } : n
    )

    await kv.set(notificationKey, updatedNotifications)

    return c.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.log(`Mark notification read error: ${error}`)
    return c.json({ error: 'Failed to mark notification as read' }, 500)
  }
})

// Mark all notifications as seen (but not read)
app.post('/make-server-8a1502a9/notifications/mark-seen', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in mark notifications seen: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const notificationKey = `notifications:${user.id}`
    const notifications = await kv.get(notificationKey) || []

    // Mark all notifications as seen
    const updatedNotifications = notifications.map((n: any) => ({ ...n, seen: true }))

    await kv.set(notificationKey, updatedNotifications)

    return c.json({ message: 'All notifications marked as seen' })
  } catch (error) {
    console.log(`Mark notifications seen error: ${error}`)
    return c.json({ error: 'Failed to mark notifications as seen' }, 500)
  }
})

// Clear all notifications for the current user
app.delete('/make-server-8a1502a9/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in clear notifications: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const notificationKey = `notifications:${user.id}`
    await kv.set(notificationKey, [])

    return c.json({ message: 'All notifications cleared' })
  } catch (error) {
    console.log(`Clear notifications error: ${error}`)
    return c.json({ error: 'Failed to clear notifications' }, 500)
  }
})

// Get all deleted items (Superuser only)
app.get('/make-server-8a1502a9/deleted-items', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can view deleted items' }, 403)
    }

    // Get all deleted items
    const deletedComments = await kv.get('deleted:comments') || []
    const deletedDecks = await kv.get('deleted:decks') || []
    const deletedCards = await kv.get('deleted:cards') || []
    
    return c.json({ 
      comments: deletedComments,
      decks: deletedDecks,
      cards: deletedCards
    })
  } catch (error) {
    console.log(`Get deleted items error: ${error}`)
    return c.json({ error: 'Failed to fetch deleted items' }, 500)
  }
})

// Restore a deleted item (Superuser only)
app.post('/make-server-8a1502a9/deleted-items/restore', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can restore items' }, 403)
    }

    const body = await c.req.json()
    const { itemId, itemType } = body

    if (!itemId || !itemType) {
      return c.json({ error: 'Item ID and type are required' }, 400)
    }

    let restored = false

    if (itemType === 'comment') {
      // Get the deleted item to find the deck ID
      const deletedComments = await kv.get('deleted:comments') || []
      const deletedItem = deletedComments.find((item: any) => item.id === itemId)
      
      if (!deletedItem) {
        return c.json({ error: 'Deleted comment not found' }, 404)
      }

      // Restore the comment by removing isDeleted flag
      const comments = await kv.get(`deck:${deletedItem.deckId}:comments`) || []
      
      const restoreComment = (commentsList: any[]): boolean => {
        for (const comment of commentsList) {
          if (comment.id === itemId) {
            delete comment.isDeleted
            delete comment.deletedBy
            delete comment.deletedByName
            delete comment.deletedReason
            delete comment.deletedAt
            return true
          }
          if (comment.replies && comment.replies.length > 0) {
            if (restoreComment(comment.replies)) {
              return true
            }
          }
        }
        return false
      }
      
      restored = restoreComment(comments)
      
      if (restored) {
        await kv.set(`deck:${deletedItem.deckId}:comments`, comments)
        
        // Remove from deleted items log
        const updatedDeletedComments = deletedComments.filter((item: any) => item.id !== itemId)
        await kv.set('deleted:comments', updatedDeletedComments)
        
        // Send notification to the comment author
        if (deletedItem.userId && deletedItem.userId !== user.id) {
          const notificationKey = `notifications:${deletedItem.userId}`
          const notifications = await kv.get(notificationKey) || []
          
          notifications.push({
            id: crypto.randomUUID(),
            type: 'comment_restored',
            message: `Your comment has been restored`,
            commentText: deletedItem.text,
            deckId: deletedItem.deckId,
            deckName: deletedItem.deckName,
            restoredBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
            createdAt: new Date().toISOString(),
            read: false,
            seen: false
          })
          
          await kv.set(notificationKey, notifications)
        }
      }
    } else if (itemType === 'deck') {
      // Restore deck - implementation depends on how decks are stored
      // For now, just remove from deleted log
      const deletedDecks = await kv.get('deleted:decks') || []
      const deletedItem = deletedDecks.find((item: any) => item.id === itemId)
      
      if (deletedItem) {
        // Remove the isDeleted flag from the community deck
        const communityDeck = await kv.get(`community:published:${itemId}`)
        if (communityDeck) {
          delete communityDeck.isDeleted
          delete communityDeck.deletedBy
          delete communityDeck.deletedByName
          delete communityDeck.deletedReason
          delete communityDeck.deletedAt
          await kv.set(`community:published:${itemId}`, communityDeck)
          restored = true
          
          // Also restore the user's ability to republish if they own it
          if (communityDeck.userId && communityDeck.deckId) {
            const userDeck = await kv.get(`deck:${communityDeck.userId}:${communityDeck.deckId}`)
            if (userDeck) {
              delete userDeck.cannotRepublish
              delete userDeck.cannotRepublishReason
              await kv.set(`deck:${communityDeck.userId}:${communityDeck.deckId}`, userDeck)
            }
          }
          
          // Send notification to the deck author
          if (deletedItem.authorId && deletedItem.authorId !== user.id) {
            const notificationKey = `notifications:${deletedItem.authorId}`
            const notifications = await kv.get(notificationKey) || []
            
            notifications.push({
              id: crypto.randomUUID(),
              type: 'deck_restored',
              message: `Your community deck "${deletedItem.name}" has been restored`,
              deckName: deletedItem.name,
              deckId: itemId,
              restoredBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
              createdAt: new Date().toISOString(),
              read: false,
              seen: false
            })
            
            await kv.set(notificationKey, notifications)
          }
        }
        
        // Remove from deleted items log
        const updatedDeletedDecks = deletedDecks.filter((item: any) => item.id !== itemId)
        await kv.set('deleted:decks', updatedDeletedDecks)
      }
    } else if (itemType === 'card') {
      // Get the deleted item to find the deck ID and card ID
      const deletedCards = await kv.get('deleted:cards') || []
      const deletedItem = deletedCards.find((item: any) => item.id === itemId)
      
      if (!deletedItem) {
        return c.json({ error: 'Deleted card not found' }, 404)
      }

      // Restore the card by removing isDeleted flag from the community deck
      const communityDeck = await kv.get(`community:published:${deletedItem.deckId}`)
      if (communityDeck && communityDeck.cards) {
        const cardIndex = communityDeck.cards.findIndex((card: any) => card.id === itemId)
        if (cardIndex !== -1) {
          delete communityDeck.cards[cardIndex].isDeleted
          delete communityDeck.cards[cardIndex].deletedBy
          delete communityDeck.cards[cardIndex].deletedByName
          delete communityDeck.cards[cardIndex].deletedReason
          delete communityDeck.cards[cardIndex].deletedAt
          await kv.set(`community:published:${deletedItem.deckId}`, communityDeck)
          restored = true
          
          // Send notification to the deck author
          if (deletedItem.authorId && deletedItem.authorId !== user.id) {
            const notificationKey = `notifications:${deletedItem.authorId}`
            const notifications = await kv.get(notificationKey) || []
            
            notifications.push({
              id: crypto.randomUUID(),
              type: 'card_restored',
              message: `A card in your deck "${deletedItem.deckName}" has been restored`,
              deckName: deletedItem.deckName,
              deckId: deletedItem.deckId,
              cardFront: deletedItem.front,
              restoredBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
              createdAt: new Date().toISOString(),
              read: false,
              seen: false
            })
            
            await kv.set(notificationKey, notifications)
          }
        }
      }
      
      // Remove from deleted items log
      if (restored) {
        const updatedDeletedCards = deletedCards.filter((item: any) => item.id !== itemId)
        await kv.set('deleted:cards', updatedDeletedCards)
      }
    }

    if (!restored) {
      return c.json({ error: 'Failed to restore item' }, 500)
    }

    console.log(`Item ${itemId} (${itemType}) restored by ${user.email}`)
    
    return c.json({ success: true, message: 'Item restored successfully' })
  } catch (error) {
    console.log(`Restore item error: ${error}`)
    return c.json({ error: 'Failed to restore item' }, 500)
  }
})

// ===== User Management (Superuser only) =====

// Get all users
app.get('/make-server-8a1502a9/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can view all users' }, 403)
    }

    // Get all users from Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.log(`List users error: ${listError.message}`)
      return c.json({ error: 'Failed to fetch users' }, 500)
    }

    // Format user data
    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.user_metadata?.displayName || u.user_metadata?.name || 'Anonymous',
      avatarUrl: u.user_metadata?.avatarUrl || null,
      isSuperuser: u.user_metadata?.isSuperuser === true,
      isModerator: u.user_metadata?.isModerator === true,
      subscriptionTier: u.user_metadata?.subscriptionTier || 'free',
      subscriptionExpiry: u.user_metadata?.subscriptionExpiry || null,
      subscriptionCancelledAtPeriodEnd: u.user_metadata?.subscriptionCancelledAtPeriodEnd === true,
      isBanned: u.user_metadata?.isBanned === true,
      bannedReason: u.user_metadata?.bannedReason || null,
      bannedAt: u.user_metadata?.bannedAt || null,
      bannedBy: u.user_metadata?.bannedBy || null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at
    }))

    return c.json({ users: formattedUsers })
  } catch (error) {
    console.log(`Get users error: ${error}`)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Update user role (make/remove moderator)
app.post('/make-server-8a1502a9/users/:userId/role', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can update user roles' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { isModerator } = await c.req.json()

    // Get the target user
    const { data: targetUserData, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUserData.user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Don't allow changing superuser status through this endpoint
    if (targetUserData.user.user_metadata?.isSuperuser === true) {
      return c.json({ error: 'Cannot modify superuser roles' }, 403)
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...targetUserData.user.user_metadata,
        isModerator: isModerator,
        // Automatically grant lifetime premium when promoting to moderator
        subscriptionTier: isModerator ? 'lifetime' : (targetUserData.user.user_metadata?.subscriptionTier || 'free'),
        subscriptionExpiry: isModerator ? null : targetUserData.user.user_metadata?.subscriptionExpiry,
        subscriptionCancelledAtPeriodEnd: isModerator ? false : targetUserData.user.user_metadata?.subscriptionCancelledAtPeriodEnd
      }
    })

    if (updateError) {
      console.log(`Update user role error: ${updateError.message}`)
      return c.json({ error: 'Failed to update user role' }, 500)
    }

    console.log(`User ${targetUserId} moderator status set to ${isModerator} by ${user.email}`)
    if (isModerator) {
      console.log(`User ${targetUserId} automatically granted lifetime premium subscription`)
    }
    
    // Send notification to the user
    try {
      const notificationId = `notif:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
      const notification = {
        id: notificationId,
        userId: targetUserId,
        type: isModerator ? 'moderator_promoted' : 'moderator_removed',
        message: isModerator 
          ? 'You have been promoted to moderator! You now have moderation privileges and lifetime premium access.'
          : 'You have been removed from the moderator role. Your moderation privileges have been revoked.',
        fromUserName: user.user_metadata?.displayName || user.user_metadata?.name || 'Admin',
        fromUserAvatar: user.user_metadata?.avatarUrl || null,
        fromUserId: user.id,
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      }
      
      // Add to user's notifications list
      const userNotifications = await kv.get(`notifications:${targetUserId}`) || []
      await kv.set(`notifications:${targetUserId}`, [notification, ...(userNotifications as any[])])
      
      console.log(`✅ Notification sent to user ${targetUserId} for moderator ${isModerator ? 'promotion' : 'removal'}`)
    } catch (notificationError) {
      console.error('Failed to send moderator notification:', notificationError)
      // Don't fail the whole operation if notification fails
    }
    
    return c.json({ success: true, message: `User ${isModerator ? 'promoted to' : 'removed from'} moderator` })
  } catch (error) {
    console.log(`Update user role error: ${error}`)
    return c.json({ error: 'Failed to update user role' }, 500)
  }
})

// Ban/Unban user
app.post('/make-server-8a1502a9/users/:userId/ban', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can ban users' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { isBanned, reason } = await c.req.json()

    if (isBanned && (!reason || reason.trim().length === 0)) {
      return c.json({ error: 'Ban reason is required' }, 400)
    }

    // Get the target user
    const { data: targetUserData, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUserData.user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Don't allow banning superusers
    if (targetUserData.user.user_metadata?.isSuperuser === true) {
      return c.json({ error: 'Cannot ban superusers' }, 403)
    }

    // Update user metadata
    const updatedMetadata = {
      ...targetUserData.user.user_metadata,
      isBanned: isBanned
    }

    if (isBanned) {
      updatedMetadata.bannedReason = reason.trim()
      updatedMetadata.bannedAt = new Date().toISOString()
      updatedMetadata.bannedBy = user.user_metadata?.displayName || user.user_metadata?.name || user.email
    } else {
      delete updatedMetadata.bannedReason
      delete updatedMetadata.bannedAt
      delete updatedMetadata.bannedBy
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: updatedMetadata
    })

    if (updateError) {
      console.log(`Ban user error: ${updateError.message}`)
      return c.json({ error: 'Failed to update ban status' }, 500)
    }

    // If banning, sign out the user by deleting all their sessions
    if (isBanned) {
      try {
        await supabase.auth.admin.signOut(targetUserId)
        console.log(`Signed out banned user ${targetUserId}`)
      } catch (signOutError) {
        console.log(`Warning: Failed to sign out banned user: ${signOutError}`)
        // Don't fail the ban if sign out fails
      }
    }

    // Send notification to the user
    const notificationKey = `notifications:${targetUserId}`
    const notifications = await kv.get(notificationKey) || []
    
    if (isBanned) {
      notifications.push({
        id: crypto.randomUUID(),
        type: 'account_banned',
        message: `Your account has been banned`,
        reason: reason.trim(),
        bannedBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      })
    } else {
      notifications.push({
        id: crypto.randomUUID(),
        type: 'account_unbanned',
        message: `Your account has been unbanned`,
        unbannedBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
        createdAt: new Date().toISOString(),
        read: false,
        seen: false
      })
    }
    
    await kv.set(notificationKey, notifications)

    console.log(`User ${targetUserId} ${isBanned ? 'banned' : 'unbanned'} by ${user.email}. Reason: ${reason || 'N/A'}`)
    
    return c.json({ success: true, message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` })
  } catch (error) {
    console.log(`Ban user error: ${error}`)
    return c.json({ error: 'Failed to update ban status' }, 500)
  }
})

// Manual Premium Upgrade (Superuser only)
app.post('/make-server-8a1502a9/users/:userId/premium', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can manually grant premium' }, 403)
    }

    const targetUserId = c.req.param('userId')
    const { reason, customReason, tier } = await c.req.json()

    if (!reason || reason.trim().length === 0) {
      return c.json({ error: 'Reason is required' }, 400)
    }

    if (!tier || !['monthly', 'annual', 'lifetime'].includes(tier)) {
      return c.json({ error: 'Valid tier is required (monthly, annual, or lifetime)' }, 400)
    }

    // Get the target user
    const { data: targetUserData, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUserData.user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Don't allow changing superuser subscriptions
    if (targetUserData.user.user_metadata?.isSuperuser === true) {
      return c.json({ error: 'Cannot modify superuser subscriptions' }, 403)
    }

    // Calculate expiry date based on tier
    let subscriptionExpiry = null
    if (tier === 'monthly') {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 1)
      subscriptionExpiry = expiryDate.toISOString()
    } else if (tier === 'annual') {
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      subscriptionExpiry = expiryDate.toISOString()
    }
    // lifetime has no expiry

    // Update user to selected premium tier
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...targetUserData.user.user_metadata,
        subscriptionTier: tier,
        subscriptionExpiry: subscriptionExpiry,
        subscriptionCancelledAtPeriodEnd: false
      }
    })

    if (updateError) {
      console.log(`Manual premium upgrade error: ${updateError.message}`)
      return c.json({ error: 'Failed to grant premium' }, 500)
    }

    // Create audit log entry
    const auditLogKey = 'audit:manual_premium_upgrades'
    const auditLogs = await kv.get(auditLogKey) || []
    
    const auditEntry = {
      action: 'MANUAL_PREMIUM_UPGRADE',
      targetUserId: targetUserId,
      targetUserEmail: targetUserData.user.email,
      targetUserName: targetUserData.user.user_metadata?.displayName || targetUserData.user.user_metadata?.name || 'Anonymous',
      adminUserId: user.id,
      adminEmail: user.email,
      adminName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
      timestamp: new Date().toISOString(),
      tier: tier,
      expiryDate: subscriptionExpiry,
      reason: reason,
      customReason: customReason || null
    }
    
    auditLogs.push(auditEntry)
    await kv.set(auditLogKey, auditLogs)

    // Send notification to the user
    const notificationKey = `notifications:${targetUserId}`
    const notifications = await kv.get(notificationKey) || []
    
    const tierDisplay = tier === 'monthly' ? 'monthly premium' : tier === 'annual' ? 'annual premium' : 'lifetime premium'
    
    notifications.push({
      id: crypto.randomUUID(),
      type: 'premium_granted',
      message: `You have been granted ${tierDisplay} access!`,
      tier: tier,
      expiryDate: subscriptionExpiry,
      reason: customReason || reason,
      grantedBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Flashy Team',
      createdAt: new Date().toISOString(),
      read: false,
      seen: false
    })
    
    await kv.set(notificationKey, notifications)

    const finalReason = customReason || reason
    console.log(`User ${targetUserId} (${targetUserData.user.email}) manually upgraded to ${tier} premium by ${user.email}. Reason: ${finalReason}`)
    
    // Send admin action email
    if (targetUserData.user.email) {
      const oldTier = targetUserData.user.user_metadata?.subscriptionTier || 'free'
      const tierLabels = {
        free: 'Free',
        monthly: 'Monthly Premium',
        annual: 'Annual Premium',
        lifetime: 'Lifetime Premium'
      }
      
      emailService.sendAdminActionEmail(
        targetUserData.user.email,
        targetUserData.user.user_metadata?.displayName || targetUserData.user.user_metadata?.name || 'there',
        `Subscription upgraded to ${tierLabels[tier as keyof typeof tierLabels]}`,
        finalReason,
        'Immediately',
        `${Deno.env.get('SUPABASE_URL') || 'https://flashy.app'}/#/settings`
      ).catch(err => console.error('Failed to send admin action email:', err))
    }
    
    return c.json({ success: true, message: 'Premium access granted successfully' })
  } catch (error) {
    console.log(`Manual premium upgrade error: ${error}`)
    return c.json({ error: 'Failed to grant premium' }, 500)
  }
})

// Demote Premium to Free (Superuser only)
app.post('/make-server-8a1502a9/users/:userId/demote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      return c.json({ error: 'Only superusers can demote users' }, 403)
    }

    const targetUserId = c.req.param('userId')

    // Get the target user
    const { data: targetUserData, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (getUserError || !targetUserData.user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Don't allow changing superuser subscriptions
    if (targetUserData.user.user_metadata?.isSuperuser === true) {
      return c.json({ error: 'Cannot modify superuser subscriptions' }, 403)
    }

    // Don't allow demoting moderators (they need premium for their role)
    if (targetUserData.user.user_metadata?.isModerator === true) {
      return c.json({ error: 'Cannot demote moderators. Remove moderator role first.' }, 403)
    }

    // Update user to free tier
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...targetUserData.user.user_metadata,
        subscriptionTier: 'free',
        subscriptionExpiry: undefined,
        subscriptionCancelledAtPeriodEnd: false,
        stripeSubscriptionId: undefined
      }
    })

    if (updateError) {
      console.log(`Manual demotion error: ${updateError.message}`)
      return c.json({ error: 'Failed to demote user' }, 500)
    }

    // Create audit log entry
    const auditLogKey = 'audit:manual_premium_downgrades'
    const auditLogs = await kv.get(auditLogKey) || []
    
    const auditEntry = {
      action: 'MANUAL_PREMIUM_DOWNGRADE',
      targetUserId: targetUserId,
      targetUserEmail: targetUserData.user.email,
      targetUserName: targetUserData.user.user_metadata?.displayName || targetUserData.user.user_metadata?.name || 'Anonymous',
      previousTier: targetUserData.user.user_metadata?.subscriptionTier || 'unknown',
      adminUserId: user.id,
      adminEmail: user.email,
      adminName: user.user_metadata?.displayName || user.user_metadata?.name || 'Superuser',
      timestamp: new Date().toISOString()
    }
    
    auditLogs.push(auditEntry)
    await kv.set(auditLogKey, auditLogs)

    // Send notification to the user
    const notificationKey = `notifications:${targetUserId}`
    const notifications = await kv.get(notificationKey) || []
    
    notifications.push({
      id: crypto.randomUUID(),
      type: 'premium_revoked',
      message: 'Your premium access has been revoked',
      revokedBy: user.user_metadata?.displayName || user.user_metadata?.name || 'Flashy Team',
      createdAt: new Date().toISOString(),
      read: false,
      seen: false
    })
    
    await kv.set(notificationKey, notifications)

    console.log(`User ${targetUserId} (${targetUserData.user.email}) demoted to free tier by ${user.email}`)
    
    return c.json({ success: true, message: 'User demoted to free tier' })
  } catch (error) {
    console.log(`Manual demotion error: ${error}`)
    return c.json({ error: 'Failed to demote user' }, 500)
  }
})

// Get user activity history (Superuser only)
app.get('/make-server-8a1502a9/users/:userId/activity', async (c) => {
  try {
    console.log('=== GET USER ACTIVITY START ===')
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log('Authenticated user:', user.email)

    // Check if user is superuser
    const isSuperuser = user.user_metadata?.isSuperuser === true
    if (!isSuperuser) {
      console.log('User is not a superuser')
      return c.json({ error: 'Only superusers can view user activity' }, 403)
    }

    const userIdOrQuery = c.req.param('userId')
    console.log('Searching for user:', userIdOrQuery)
    
    // Try to get user by ID first (if it looks like a UUID)
    let targetUserResult = null
    
    // Check if the input looks like a UUID (36 characters with dashes)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrQuery)
    
    if (isUUID) {
      console.log('Input appears to be a UUID, searching by ID...')
      try {
        targetUserResult = await supabase.auth.admin.getUserById(userIdOrQuery)
      } catch (error) {
        console.log('Error getting user by ID:', error)
        targetUserResult = { error, data: { user: null } }
      }
    }
    
    // If not found by ID or not a UUID, search by email or name
    if (!targetUserResult || targetUserResult.error || !targetUserResult.data.user) {
      console.log('User not found by ID (or not a UUID), searching by email/name...')
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.log('Failed to list users:', listError)
        return c.json({ error: 'Failed to search users' }, 500)
      }
      
      console.log('Total users in system:', users.length)
      
      // Search by email or display name
      const foundUser = users.find((u: any) => 
        u.email?.toLowerCase().includes(userIdOrQuery.toLowerCase()) ||
        u.user_metadata?.displayName?.toLowerCase().includes(userIdOrQuery.toLowerCase()) ||
        u.user_metadata?.name?.toLowerCase().includes(userIdOrQuery.toLowerCase())
      )
      
      if (!foundUser) {
        console.log('User not found in search')
        return c.json({ error: 'User not found. Try searching by exact user ID, email, or name.' }, 404)
      }
      
      console.log('Found user:', foundUser.email)
      targetUserResult = { data: { user: foundUser }, error: null }
    }
    
    const targetUser = targetUserResult.data.user
    const targetUserId = targetUser.id
    const userName = targetUser.user_metadata?.displayName || targetUser.user_metadata?.name || 'Unknown User'
    
    console.log('Target user ID:', targetUserId)
    console.log('Target user name:', userName)

    const activity = []

    console.log('Fetching flags data...')
    // Get flags submitted BY this user
    const allFlagIds = await kv.get('flags:all') || []
    console.log('Total flag IDs in system:', Array.isArray(allFlagIds) ? allFlagIds.length : 0)
    
    // Fetch actual flag objects
    const allFlags = []
    for (const flagId of allFlagIds) {
      if (typeof flagId === 'string') {
        // Old system - flagId is a string, need to fetch the flag object
        const flag = await kv.get(`flag:${flagId}`)
        if (flag) allFlags.push(flag)
      } else {
        // New system - flagId is already a flag object
        allFlags.push(flagId)
      }
    }
    console.log('Total flags loaded:', allFlags.length)
    
    const flagsByUser = allFlags.filter((flag: any) => flag.reporterId === targetUserId)
    console.log('Flags submitted by user:', flagsByUser.length)
    
    for (const flag of flagsByUser) {
      activity.push({
        id: flag.id,
        type: 'flag_submitted',
        timestamp: flag.createdAt,
        userName: userName,
        userId: targetUserId,
        details: {
          targetType: flag.targetType || flag.itemType,
          targetId: flag.targetId || flag.itemId,
          reason: flag.reason,
          notes: flag.notes || flag.details,
          status: flag.status
        }
      })
    }

    // Get flags submitted AGAINST this user's content
    const flagsAgainstUser = []
    console.log('Checking flags against user content...')
    for (const flag of allFlags) {
      let isUserContent = false
      const flagType = flag.targetType || flag.itemType
      const flagId = flag.targetId || flag.itemId
      const flagDetails = flag.targetDetails || {}
      
      console.log(`Checking flag: type=${flagType}, id=${flagId}`)
      
      // Check if the flagged content belongs to the target user
      if (flagType === 'deck') {
        const deck = await kv.get(`community:published:${flagId}`)
        console.log(`  Deck lookup: ${deck ? 'found' : 'not found'}`, deck ? `userId=${deck.userId}` : '')
        if (deck && deck.userId === targetUserId) {
          isUserContent = true
          flag.authorId = deck.userId
          flag.authorName = deck.userName
        }
      } else if (flagType === 'card') {
        // Cards are flagged with the deckId in targetDetails
        if (flagDetails.deckId) {
          const deck = await kv.get(`community:published:${flagDetails.deckId}`)
          console.log(`  Card's deck lookup: ${deck ? 'found' : 'not found'}`, deck ? `userId=${deck.userId}` : '')
          if (deck && deck.userId === targetUserId) {
            isUserContent = true
            flag.authorId = deck.userId
            flag.authorName = deck.userName
          }
        }
      } else if (flagType === 'comment') {
        // Comments are stored in deck:${deckId}:comments
        if (flagDetails.deckId) {
          const deckComments = await kv.get(`deck:${flagDetails.deckId}:comments`) || []
          console.log(`  Comment lookup in deck ${flagDetails.deckId}: ${deckComments.length} comments`)
          
          // Search through comments and replies to find the target comment
          const findComment = (comments: any[]): any => {
            for (const c of comments) {
              if (c.id === flagId) return c
              if (c.replies && c.replies.length > 0) {
                const found = findComment(c.replies)
                if (found) return found
              }
            }
            return null
          }
          
          const comment = findComment(deckComments)
          console.log(`  Comment found: ${comment ? 'yes' : 'no'}`, comment ? `userId=${comment.userId}` : '')
          if (comment && comment.userId === targetUserId) {
            isUserContent = true
            flag.authorId = comment.userId
            flag.authorName = comment.userName
          }
        }
      }
      
      if (isUserContent) {
        console.log(`  -> Matched! Adding to flags against user`)
        flagsAgainstUser.push(flag)
      }
    }
    console.log('Flags against user content:', flagsAgainstUser.length)

    for (const flag of flagsAgainstUser) {
      // Get reporter name
      let reporterName = flag.reporterName || 'Unknown User'
      if (flag.reporterId && !flag.reporterName) {
        const reporter = await supabase.auth.admin.getUserById(flag.reporterId)
        if (reporter.data?.user) {
          reporterName = reporter.data.user.user_metadata?.displayName || reporter.data.user.user_metadata?.name || reporter.data.user.email
        }
      }
      
      activity.push({
        id: flag.id,
        type: 'flag_received',
        timestamp: flag.createdAt,
        userName: userName,
        userId: targetUserId,
        details: {
          targetType: flag.targetType || flag.itemType,
          targetId: flag.targetId || flag.itemId,
          reason: flag.reason,
          notes: flag.notes || flag.details,
          status: flag.status,
          reporterName: reporterName
        }
      })
    }

    console.log('Fetching deleted items...')
    // Get deleted items
    const deletedComments = await kv.get('deleted:comments') || []
    console.log('Total deleted comments:', Array.isArray(deletedComments) ? deletedComments.length : 0)
    const deletedDecks = await kv.get('deleted:decks') || []
    console.log('Total deleted decks:', Array.isArray(deletedDecks) ? deletedDecks.length : 0)
    const deletedCards = await kv.get('deleted:cards') || []
    console.log('Total deleted cards:', Array.isArray(deletedCards) ? deletedCards.length : 0)

    // Content deleted OF this user
    for (const comment of deletedComments) {
      if (comment.userId === targetUserId) {
        activity.push({
          id: comment.id,
          type: 'content_deleted',
          timestamp: comment.deletedAt,
          userName: userName,
          userId: targetUserId,
          details: {
            contentType: 'comment',
            contentId: comment.commentId,
            content: comment.text,
            deletedBy: comment.deletedByName,
            reason: comment.deletedReason,
            deckName: comment.deckName
          }
        })
      }
    }

    for (const deck of deletedDecks) {
      if (deck.authorId === targetUserId) {
        activity.push({
          id: deck.id,
          type: 'content_deleted',
          timestamp: deck.deletedAt,
          userName: userName,
          userId: targetUserId,
          details: {
            contentType: 'deck',
            contentId: deck.deckId,
            content: deck.name,
            deletedBy: deck.deletedByName,
            reason: deck.deletedReason,
            emoji: deck.emoji
          }
        })
      }
    }

    for (const card of deletedCards) {
      if (card.authorId === targetUserId) {
        activity.push({
          id: card.id,
          type: 'content_deleted',
          timestamp: card.deletedAt,
          userName: userName,
          userId: targetUserId,
          details: {
            contentType: 'card',
            contentId: card.cardId,
            content: `${card.front} / ${card.back}`,
            deletedBy: card.deletedByName,
            reason: card.deletedReason,
            deckName: card.deckName
          }
        })
      }
    }

    console.log('Checking for moderation actions...')
    // Moderation actions BY this user
    if (targetUser.user_metadata?.isModerator || targetUser.user_metadata?.isSuperuser) {
      console.log('User is a moderator/superuser, checking moderation actions')
      for (const comment of deletedComments) {
        if (comment.deletedBy === targetUserId) {
          activity.push({
            id: comment.id,
            type: 'moderation_action',
            timestamp: comment.deletedAt,
            userName: userName,
            userId: targetUserId,
            details: {
              action: 'deleted_comment',
              contentType: 'comment',
              contentId: comment.commentId,
              content: comment.text,
              targetUser: comment.authorName,
              reason: comment.deletedReason,
              deckName: comment.deckName
            }
          })
        }
      }

      for (const deck of deletedDecks) {
        if (deck.deletedBy === targetUserId) {
          activity.push({
            id: deck.id,
            type: 'moderation_action',
            timestamp: deck.deletedAt,
            userName: userName,
            userId: targetUserId,
            details: {
              action: 'deleted_deck',
              contentType: 'deck',
              contentId: deck.deckId,
              content: deck.name,
              targetUser: deck.authorName,
              reason: deck.deletedReason,
              emoji: deck.emoji
            }
          })
        }
      }

      for (const card of deletedCards) {
        if (card.deletedBy === targetUserId) {
          activity.push({
            id: card.id,
            type: 'moderation_action',
            timestamp: card.deletedAt,
            userName: userName,
            userId: targetUserId,
            details: {
              action: 'deleted_card',
              contentType: 'card',
              contentId: card.cardId,
              content: `${card.front} / ${card.back}`,
              targetUser: card.authorName,
              reason: card.deletedReason,
              deckName: card.deckName
            }
          })
        }
      }
    }

    console.log('Checking ban history...')
    // Ban history
    if (targetUser.user_metadata?.isBanned) {
      activity.push({
        id: `ban-${targetUserId}`,
        type: 'account_action',
        timestamp: targetUser.user_metadata.bannedAt,
        userName: userName,
        userId: targetUserId,
        details: {
          action: 'banned',
          reason: targetUser.user_metadata.bannedReason,
          bannedBy: targetUser.user_metadata.bannedBy
        }
      })
    }

    console.log('Sorting activity items...')
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log('Activity items collected:', activity.length)
    console.log('=== GET USER ACTIVITY SUCCESS ===')

    return c.json({ 
      user: {
        id: targetUserId,
        name: userName,
        email: targetUser.email,
        isModerator: targetUser.user_metadata?.isModerator === true,
        isSuperuser: targetUser.user_metadata?.isSuperuser === true,
        isBanned: targetUser.user_metadata?.isBanned === true
      },
      activity 
    })
  } catch (error) {
    console.log(`=== GET USER ACTIVITY ERROR ===`)
    console.log(`Error: ${error}`)
    console.log(`Error message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.log(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    return c.json({ error: 'Failed to fetch user activity' }, 500)
  }
})

// Create a shareable link for a deck
app.post('/make-server-8a1502a9/decks/:deckId/share', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create share link: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const deckId = c.req.param('deckId')
    const body = await c.req.json()
    const { isCommunityDeck } = body

    // Get the deck data
    let deckData
    let cards = []
    
    if (isCommunityDeck) {
      // Get from community decks
      deckData = await kv.get(`community:published:${deckId}`)
      if (deckData) {
        cards = deckData.cards || []
      }
    } else {
      // Get from user's decks
      deckData = await kv.get(`deck:${user.id}:${deckId}`)
      if (deckData) {
        // Fetch cards for this deck
        cards = await kv.getByPrefix(`card:${user.id}:${deckId}:`)
      }
    }

    if (!deckData) {
      console.log(`Share deck error: Deck not found for deckId=${deckId}, isCommunityDeck=${isCommunityDeck}`)
      return c.json({ error: 'Deck not found' }, 404)
    }

    // Generate a unique share ID
    const shareId = crypto.randomUUID()

    // Create shared deck object
    const sharedDeck = {
      shareId,
      deckId,
      isCommunityDeck,
      deckData: {
        name: deckData.name,
        emoji: deckData.emoji,
        color: deckData.color,
        cards: cards,
        category: deckData.category,
        subtopic: deckData.subtopic,
        difficulty: deckData.difficulty,
        authorName: deckData.userName || user.user_metadata?.displayName || user.user_metadata?.name || 'Anonymous',
      },
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    }

    // Store the shared deck
    await kv.set(`shared:deck:${shareId}`, sharedDeck)

    return c.json({ shareId, shareUrl: `/shared/${shareId}` })
  } catch (error) {
    console.log(`Create share link error: ${error}`)
    return c.json({ error: 'Failed to create share link' }, 500)
  }
})

// Get a shared deck by share ID
app.get('/make-server-8a1502a9/shared/:shareId', async (c) => {
  try {
    const shareId = c.req.param('shareId')
    
    // Get the shared deck
    const sharedDeck = await kv.get(`shared:deck:${shareId}`)

    if (!sharedDeck) {
      return c.json({ error: 'Shared deck not found' }, 404)
    }

    return c.json({ sharedDeck })
  } catch (error) {
    console.log(`Get shared deck error: ${error}`)
    return c.json({ error: 'Failed to get shared deck' }, 500)
  }
})

// Flag/Report a community deck or card
app.post('/make-server-8a1502a9/community/flag', async (c) => {
  try {
    const body = await c.req.json()
    const { itemType, itemId, reason, details } = body

    if (!itemType || !itemId || !reason) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Create a flag report
    const flagReport = {
      id: crypto.randomUUID(),
      itemType,
      itemId,
      reason,
      details: details || '',
      createdAt: new Date().toISOString(),
      status: 'pending' // pending, reviewed, resolved
    }

    // Store the flag report
    const flagKey = `flag:${itemType}:${itemId}`
    const existingFlags = await kv.get(flagKey) || []
    existingFlags.push(flagReport)
    await kv.set(flagKey, existingFlags)

    // Also store in a global flags list for moderators
    const allFlags = await kv.get('flags:all') || []
    allFlags.push(flagReport)
    await kv.set('flags:all', allFlags)

    console.log(`Flag report created: ${itemType} ${itemId} for ${reason}`)

    return c.json({ message: 'Report submitted successfully', flagId: flagReport.id })
  } catch (error) {
    console.log(`Flag item error: ${error}`)
    return c.json({ error: 'Failed to submit report' }, 500)
  }
})

// Save user achievements
app.post('/make-server-8a1502a9/achievements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in save achievements: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { achievements } = await c.req.json()
    
    if (!achievements) {
      return c.json({ error: 'Missing achievements data' }, 400)
    }

    const achievementsKey = `user_achievements:${user.id}`
    await kv.set(achievementsKey, achievements)
    
    console.log(`Saved achievements for user ${user.id}`)
    return c.json({ message: 'Achievements saved successfully' })
  } catch (error) {
    console.log(`Save achievements error: ${error}`)
    return c.json({ error: 'Failed to save achievements' }, 500)
  }
})

// Get user achievements
app.get('/make-server-8a1502a9/achievements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get achievements: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const achievementsKey = `user_achievements:${user.id}`
    const achievements = await kv.get(achievementsKey)
    
    if (!achievements) {
      // Return default achievements structure
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
    
    return c.json({ achievements })
  } catch (error) {
    console.log(`Get achievements error: ${error}`)
    return c.json({ error: 'Failed to fetch achievements' }, 500)
  }
})

// AI Generate - Chat (Topic-based generation)
app.post('/make-server-8a1502a9/ai-generate-chat', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in AI generate chat: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`Free user ${user.id} attempted AI generation - blocked`)
      return c.json({ error: 'AI generation requires a Premium or Pro subscription' }, 403)
    }

    const { topic, numCards, includeImages, cardTypes, difficulty, frontLanguage, backLanguage } = await c.req.json()
    
    if (!topic || !numCards) {
      return c.json({ error: 'Topic and number of cards are required' }, 400)
    }

    const cardCount = parseInt(numCards)
    if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
      return c.json({ error: 'Number of cards must be between 1 and 100' }, 400)
    }

    console.log(`AI Generate Chat - User: ${user.id}, Topic: "${topic}", Cards: ${cardCount}, Difficulty: ${difficulty || 'mixed'}, Front Language: ${frontLanguage || 'not specified'}, Back Language: ${backLanguage || 'not specified'}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('OpenAI API key not configured')
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
      console.log(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      
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
        console.error('Chat Generation - Bad Request details:', errorText)
        return c.json({ 
          error: `AI generation failed with invalid request. This may be due to model compatibility. Details: ${errorText}`
        }, 400)
      }
      
      return c.json({ error: `AI generation failed: ${openaiResponse.statusText}. Details: ${errorText}` }, 500)
    }

    const openaiData = await openaiResponse.json()
    console.log('OpenAI response received')
    
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
        console.log(`WARNING: Filtering out ${invalidCards.length} invalid cards:`, JSON.stringify(invalidCards))
      }

      // Validate card structure and filter
      const validCards = cards.filter((card: any) => card.front && card.back)
      console.log(`After filtering: ${validCards.length} valid cards (need: ${cardCount})`)
      
      // Check if we have enough cards
      if (validCards.length < cardCount) {
        console.log(`WARNING: Only got ${validCards.length} valid cards, need ${cardCount}. Shortfall: ${cardCount - validCards.length}`)
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

      console.log(`Successfully generated ${cards.length} cards (requested: ${cardCount})`)
      console.log(`Card types distribution:`, cards.map((c: any) => c.cardType))
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
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
    console.log(`AI generate chat error: ${error}`)
    return c.json({ error: 'Failed to generate flashcards with AI' }, 500)
  }
})

// AI Generate - CSV Upload
app.post('/make-server-8a1502a9/ai-generate-csv', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in CSV import: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`Free user ${user.id} attempted CSV import - blocked`)
      return c.json({ error: 'CSV import requires a Premium or Pro subscription' }, 403)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return c.json({ error: 'Invalid file type. Only CSV files are allowed.' }, 400)
    }

    // Validate file size (1MB max for CSV)
    if (file.size > 1048576) {
      return c.json({ error: 'File too large. Maximum size is 1MB.' }, 400)
    }

    console.log(`CSV Import - User: ${user.id}, File: ${file.name}`)

    // Read and parse CSV
    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length < 2) {
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
    
    console.log(`Detected CSV format: ${detectedFormat}`)
    
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
        return c.json({ 
          error: 'Multiple Choice CSV must have "Question", "Correct", and "Incorrect" columns' 
        }, 400)
      }
    } else if (detectedFormat === 'type-answer') {
      answerIndex = headers.findIndex(h => h === 'answer' || h === 'back' || h === 'a')
      acceptedAnswersIndex = headers.findIndex(h => h === 'accepted answers' || h === 'acceptedanswers')
      if (questionIndex === -1 || answerIndex === -1 || acceptedAnswersIndex === -1) {
        return c.json({ 
          error: 'Type Answer CSV must have "Question", "Answer", and "Accepted Answers" columns' 
        }, 400)
      }
    } else {
      // Classic flip
      answerIndex = headers.findIndex(h => h === 'back' || h === 'answer' || h === 'a')
      if (questionIndex === -1 || answerIndex === -1) {
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
      return c.json({ error: 'No valid cards found in CSV file' }, 400)
    }

    console.log(`Successfully parsed ${cards.length} cards from CSV`)
    return c.json({ cards })
  } catch (error) {
    console.log(`CSV import error: ${error}`)
    return c.json({ error: 'Failed to import CSV file' }, 500)
  }
})

// AI Generate - PDF Upload
app.post('/make-server-8a1502a9/ai-generate-pdf', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in PDF import: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`Free user ${user.id} attempted PDF AI generation - blocked`)
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
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return c.json({ error: 'Invalid file type. Only PDF files are allowed.' }, 400)
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400)
    }

    const cardCount = parseInt(numCards || '15')
    if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
      return c.json({ error: 'Number of cards must be between 1 and 100' }, 400)
    }

    // Parse card types
    let cardTypes = { classicFlip: true, multipleChoice: false, typeAnswer: false }
    if (cardTypesRaw) {
      try {
        cardTypes = JSON.parse(cardTypesRaw)
      } catch (e) {
        console.log('Failed to parse cardTypes, using defaults')
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

    console.log(`PDF Import - User: ${user.id}, File: ${file.name}, Cards: ${cardCount}, Types: ${selectedTypes.join(', ')}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('OpenAI API key not configured')
      return c.json({ error: 'AI service not configured. Please add your OpenAI API key.' }, 500)
    }

    // Extract text from PDF using pdf-parse
    console.log('Extracting text from PDF...')
    let pdfText = ''
    
    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      
      // Parse PDF
      const pdfData = await pdfParse(buffer)
      pdfText = pdfData.text
      
      console.log(`PDF text extracted successfully. Length: ${pdfText.length} characters, Pages: ${pdfData.numpages}`)
      
      if (!pdfText || pdfText.trim().length === 0) {
        return c.json({ 
          error: 'No text content found in PDF. The PDF may be scanned images or encrypted.',
          workaround: 'Try using OCR software to extract text, then use AI Chat feature'
        }, 400)
      }
      
      // Truncate if too long (to stay within OpenAI token limits)
      // GPT-4o can handle ~128k tokens, but we'll be conservative
      const maxChars = 50000 // ~12.5k tokens worth of text
      if (pdfText.length > maxChars) {
        console.log(`PDF text truncated from ${pdfText.length} to ${maxChars} characters`)
        pdfText = pdfText.substring(0, maxChars) + '\n\n[... document truncated ...]'
      }
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return c.json({ 
        error: 'Failed to extract text from PDF. The file may be corrupted, encrypted, or contain only images.',
        details: pdfError instanceof Error ? pdfError.message : String(pdfError),
        workaround: 'Try using AI Chat with manually extracted text or CSV import'
      }, 400)
    }
    
    console.log('Processing PDF content with AI...')
    
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
      console.log(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      
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
        console.error('PDF Generation - Bad Request details:', errorText)
        return c.json({ 
          error: `AI generation failed with invalid request. This may be due to model compatibility. Details: ${errorText}`
        }, 400)
      }
      
      return c.json({ error: `AI generation failed: ${openaiResponse.statusText}. Details: ${errorText}` }, 500)
    }

    const openaiData = await openaiResponse.json()
    
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
      console.error('JSON parsing error:', parseError)
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
      console.error('Invalid OpenAI response format:', content)
      return c.json({ error: 'AI generated an invalid response. Please try again.' }, 500)
    }
    
    // Filter out invalid cards (missing front or back)
    let validCards = content.cards.filter((card: any) => {
      const hasFront = card.front && typeof card.front === 'string' && card.front.trim().length > 0
      const hasBack = card.back && typeof card.back === 'string' && card.back.trim().length > 0
      
      if (!hasFront || !hasBack) {
        console.log(`Filtered out invalid card - Front: "${card.front || 'missing'}", Back: "${card.back || 'missing'}"`)
        return false
      }
      return true
    })
    
    // Ensure all cards have cardType set (default based on what user selected)
    // If only one type is selected, use that as the default; otherwise default to classic-flip
    const defaultCardType = selectedTypes.length === 1 ? selectedTypes[0] : 'classic-flip'
    
    validCards = validCards.map((card: any) => {
      if (!card.cardType) {
        console.log(`Card missing cardType, defaulting to ${defaultCardType}: "${card.front?.substring(0, 50)}..."`)
        card.cardType = defaultCardType
      }
      
      // Validate and fix multiple-choice cards
      if (card.cardType === 'multiple-choice') {
        if (!card.options || !Array.isArray(card.options) || card.options.length === 0) {
          console.log(`Multiple-choice card missing options, generating default options: "${card.front?.substring(0, 50)}..."`)
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
      console.error(`Insufficient valid cards: ${validCards.length} valid cards generated, but at least ${minAcceptableCards} needed (70% of ${cardCount} requested)`)
      return c.json({ 
        error: `Only ${validCards.length} valid flashcards could be generated from the PDF. Please try again or request fewer cards.` 
      }, 400)
    }
    
    // If we got fewer than requested but above the threshold, use what we have
    if (validCards.length < cardCount) {
      console.log(`Generated ${validCards.length} out of ${cardCount} requested cards (above 70% threshold, accepting partial result)`)
    }
    
    // Trim to exactly the requested number if we got more
    if (validCards.length > cardCount) {
      console.log(`Trimming ${validCards.length} cards down to exactly ${cardCount}`)
      validCards = validCards.slice(0, cardCount)
    }
    
    console.log(`Successfully returning ${validCards.length} cards from PDF`)
    
    // Return the validated cards
    return c.json({ cards: validCards })
  } catch (error) {
    console.error(`PDF import error:`, error)
    console.error(`PDF import error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    console.error(`PDF import error message:`, error instanceof Error ? error.message : String(error))
    return c.json({ error: `Failed to process PDF file: ${error instanceof Error ? error.message : String(error)}` }, 500)
  }
})

// ==================== STRIPE PAYMENT ROUTES ====================

// Create Stripe Checkout Session
app.post('/make-server-8a1502a9/create-checkout-session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create checkout session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { planType } = await c.req.json()
    
    if (!planType || !['monthly', 'annual', 'lifetime'].includes(planType)) {
      return c.json({ error: 'Invalid plan type' }, 400)
    }

    // Get the appropriate Stripe price ID
    const priceId = stripeService.STRIPE_PRICE_IDS[planType as keyof typeof stripeService.STRIPE_PRICE_IDS]
    
    // Create checkout session
    const origin = c.req.header('origin') || 'http://localhost:5173'
    const session = await stripeService.createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: user.email!,
      planType: planType as 'monthly' | 'annual' | 'lifetime',
      successUrl: `${origin}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/#/upgrade`,
    })

    console.log(`Checkout session created for user ${user.id}, plan: ${planType}`)
    
    return c.json({ url: session.url })
  } catch (error) {
    console.log(`Create checkout session error: ${error}`)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// Stripe Webhook Handler
app.post('/make-server-8a1502a9/stripe-webhook', async (c) => {
  console.log('=== STRIPE WEBHOOK CALLED ===')
  
  try {
    const signature = c.req.header('stripe-signature')
    
    if (!signature) {
      console.log('❌ Missing stripe signature')
      return c.json({ error: 'Missing stripe signature' }, 400)
    }

    const rawBody = await c.req.text()
    console.log('📦 Webhook body length:', rawBody.length)
    
    // Verify webhook signature
    const event = await stripeService.verifyWebhookSignature(rawBody, signature)
    
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
            
            emailService.sendBillingReceiptEmail(
              userData.user.email,
              userData.user.user_metadata?.displayName || userData.user.user_metadata?.name || 'there',
              amounts[planType as keyof typeof amounts] || '$0.00',
              planLabels[planType as keyof typeof planLabels] || planType,
              session.id,
              new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              session.invoice_pdf || undefined
            ).catch(err => console.error('Failed to send receipt email:', err))
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
            
            // Send cancellation confirmation email
            if (userToDowngrade.email) {
              const planLabels = {
                monthly: 'Monthly Premium',
                annual: 'Annual Premium',
                lifetime: 'Lifetime Premium'
              }
              
              emailService.sendCancellationConfirmationEmail(
                userToDowngrade.email,
                userToDowngrade.user_metadata?.displayName || userToDowngrade.user_metadata?.name || 'there',
                planLabels[oldTier as keyof typeof planLabels] || oldTier,
                endDate
              ).catch(err => console.error('Failed to send cancellation email:', err))
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
            
            emailService.sendFailedPaymentEmail(
              userWithFailedPayment.email,
              userWithFailedPayment.user_metadata?.displayName || userWithFailedPayment.user_metadata?.name || 'there',
              amount,
              retryDate
            ).catch(err => console.error('Failed to send payment failed email:', err))
          }
        }
        
        break
      }
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
    
    return c.json({ received: true })
  } catch (error) {
    console.log(`❌ Stripe webhook error: ${error}`)
    console.log(`   Stack: ${(error as Error).stack}`)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Verify Payment and Upgrade User (fallback if webhook fails)
app.post('/make-server-8a1502a9/verify-payment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in verify payment: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { sessionId } = await c.req.json()
    
    if (!sessionId) {
      return c.json({ error: 'Missing session ID' }, 400)
    }

    console.log(`🔍 Verifying payment for session ${sessionId}`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    console.log(`📋 Session status: ${session.payment_status}`)
    console.log(`   Metadata:`, session.metadata)

    if (session.payment_status !== 'paid') {
      return c.json({ error: 'Payment not completed' }, 400)
    }

    const planType = session.metadata?.planType
    
    if (!planType) {
      return c.json({ error: 'Invalid session metadata' }, 400)
    }

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
    console.log(`✅ Updated user metadata:`, updatedUser?.user?.user_metadata)

    return c.json({ 
      success: true, 
      subscriptionTier,
      subscriptionExpiry 
    })
  } catch (error) {
    console.log(`Verify payment error: ${error}`)
    return c.json({ error: 'Failed to verify payment' }, 500)
  }
})

// Cancel Subscription
app.post('/make-server-8a1502a9/cancel-subscription', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in cancel subscription: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const stripeSubscriptionId = user.user_metadata?.stripeSubscriptionId
    
    if (!stripeSubscriptionId) {
      console.log(`No Stripe subscription ID found for user ${user.id}`)
      return c.json({ error: 'No active subscription found' }, 404)
    }

    console.log(`🗑️ Cancelling Stripe subscription ${stripeSubscriptionId} for user ${user.id}`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    // Cancel the subscription in Stripe (at period end, so they keep access until billing cycle ends)
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    console.log(`✅ Stripe subscription marked for cancellation at period end`)

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

    return c.json({ 
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period'
    })
  } catch (error) {
    console.log(`Cancel subscription error: ${error}`)
    return c.json({ error: 'Failed to cancel subscription' }, 500)
  }
})

// Change Subscription Plan
app.post('/make-server-8a1502a9/change-subscription-plan', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in change subscription plan: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { newPlan } = await c.req.json()
    
    if (!['monthly', 'annual', 'lifetime'].includes(newPlan)) {
      return c.json({ error: 'Invalid plan' }, 400)
    }

    const currentTier = user.user_metadata?.subscriptionTier
    const stripeSubscriptionId = user.user_metadata?.stripeSubscriptionId
    
    console.log(`🔄 Changing plan from ${currentTier} to ${newPlan} for user ${user.id}`)

    // Import Stripe
    const Stripe = (await import('npm:stripe@14')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    })

    let newSubscriptionId = stripeSubscriptionId
    let newExpiry = user.user_metadata?.subscriptionExpiry

    // Handle lifetime separately (one-time payment, no Stripe subscription)
    if (newPlan === 'lifetime') {
      // If they have an existing Stripe subscription, cancel it
      if (stripeSubscriptionId) {
        console.log(`🗑️ Cancelling existing Stripe subscription for lifetime upgrade`)
        await stripe.subscriptions.cancel(stripeSubscriptionId)
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
        return c.json({ error: 'Price ID not configured' }, 500)
      }

      if (!stripeSubscriptionId) {
        return c.json({ error: 'No active Stripe subscription found' }, 404)
      }

      console.log(`🔄 Updating Stripe subscription to ${newPlan} plan (${newPriceId})`)

      // Get the current subscription
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      
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
      console.log(`New period end: ${newExpiry}`)
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

    return c.json({ 
      success: true,
      newPlan,
      subscriptionExpiry: newExpiry
    })
  } catch (error) {
    console.log(`Change subscription plan error: ${error}`)
    return c.json({ error: 'Failed to change subscription plan' }, 500)
  }
})

// Create Customer Portal Session (for managing subscriptions)
app.post('/make-server-8a1502a9/create-portal-session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in create portal session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const stripeCustomerId = user.user_metadata?.stripeCustomerId
    
    if (!stripeCustomerId) {
      return c.json({ error: 'No active subscription found' }, 404)
    }

    const origin = c.req.header('origin') || 'http://localhost:5173'
    const session = await stripeService.createCustomerPortalSession(
      stripeCustomerId,
      `${origin}/settings`
    )

    return c.json({ url: session.url })
  } catch (error) {
    console.log(`Create portal session error: ${error}`)
    return c.json({ error: 'Failed to create portal session' }, 500)
  }
})

// Save study session
app.post('/make-server-8a1502a9/study-sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in save study session: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const session = body.session

    if (!session || !session.id || !session.deckId) {
      return c.json({ error: 'Invalid session data' }, 400)
    }

    // Save study session
    await kv.set(`studySession:${user.id}:${session.id}`, session)

    console.log(`Saved study session for user ${user.id}, deck ${session.deckId}`)

    return c.json({ success: true, session })
  } catch (error) {
    console.log(`Save study session error: ${error}`)
    return c.json({ error: 'Failed to save study session' }, 500)
  }
})

// Get all study sessions for a user
app.get('/make-server-8a1502a9/study-sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in get study sessions: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Get all study sessions for this user
    const sessions = await kv.getByPrefix(`studySession:${user.id}:`)
    const validSessions = sessions ? sessions.filter(s => s) : []

    console.log(`Retrieved ${validSessions.length} study sessions for user ${user.id}`)

    return c.json({ sessions: validSessions })
  } catch (error) {
    console.log(`Get study sessions error: ${error}`)
    return c.json({ error: 'Failed to get study sessions' }, 500)
  }
})

// Export user data endpoint
app.get('/make-server-8a1502a9/export-data', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.error('Export data: Missing access token')
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.error('Export data: Unauthorized', authError)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    console.log(`Exporting data for user: ${user.id}`)

    // Initialize all data arrays with safe defaults
    let decks = []
    let cards = []
    let studySessions = []
    let publishedDecks = []
    let userComments = []
    let userRatings = []
    let friends = []
    let friendRequests = { incoming: [], outgoing: [] }
    let notifications = []
    let userFlags = []
    let achievements = {}
    let userStats = {}

    // Safely fetch each data type
    // Note: getByPrefix returns the values directly, not objects with .value property
    try {
      console.log('Fetching decks...')
      const decksData = await kv.getByPrefix(`deck:${user.id}:`)
      decks = decksData ? decksData.filter(v => v) : []
      console.log(`Found ${decks.length} decks`)
    } catch (err) {
      console.error('Error fetching decks:', err)
    }

    try {
      console.log('Fetching cards...')
      const cardsData = await kv.getByPrefix(`card:${user.id}:`)
      cards = cardsData ? cardsData.filter(v => v) : []
      console.log(`Found ${cards.length} cards`)
    } catch (err) {
      console.error('Error fetching cards:', err)
    }

    try {
      console.log('Fetching study sessions...')
      const studySessionsData = await kv.getByPrefix(`studySession:${user.id}:`)
      studySessions = studySessionsData ? studySessionsData.filter(v => v) : []
      console.log(`Found ${studySessions.length} study sessions`)
    } catch (err) {
      console.error('Error fetching study sessions:', err)
    }

    try {
      console.log('Fetching published decks...')
      const publishedDecksData = await kv.getByPrefix(`communityDeck:`)
      publishedDecks = publishedDecksData
        ? publishedDecksData
            .filter(deck => deck && deck.authorId === user.id)
            .map(deck => ({
              ...deck,
              downloads: deck.downloads || 0,
              averageRating: deck.averageRating || 0,
              ratingCount: deck.ratingCount || 0,
              commentCount: deck.commentCount || 0,
            }))
        : []
      console.log(`Found ${publishedDecks.length} published decks`)
    } catch (err) {
      console.error('Error fetching published decks:', err)
    }

    try {
      console.log('Fetching comments...')
      // Comments are stored as deck:${deckId}:comments, so we need to fetch all community decks' comments
      const allCommentsData = await kv.getByPrefix(`deck:`)
      const allComments = []
      
      // Filter for keys that end with :comments and extract the comments arrays
      for (const item of (allCommentsData || [])) {
        if (Array.isArray(item)) {
          // This is a comments array
          allComments.push(...item)
        }
      }
      
      // Now filter for user's comments
      userComments = allComments.filter(comment => comment && comment.userId === user.id)
      console.log(`Found ${userComments.length} comments`)
    } catch (err) {
      console.error('Error fetching comments:', err)
    }

    try {
      console.log('Fetching ratings...')
      // Ratings are stored as deck:${deckId}:ratings as an object with userId keys
      const allRatingsData = await kv.getByPrefix(`deck:`)
      const userRatingsArray = []
      
      // Filter for ratings objects and extract user's ratings
      for (const item of (allRatingsData || [])) {
        if (item && typeof item === 'object' && !Array.isArray(item) && item[user.id] && item[user.id].rating) {
          // This is a ratings object and it has a rating from this user
          userRatingsArray.push({
            ...item[user.id],
            userId: user.id
          })
        }
      }
      
      userRatings = userRatingsArray
      console.log(`Found ${userRatings.length} ratings`)
    } catch (err) {
      console.error('Error fetching ratings:', err)
    }

    try {
      console.log('Fetching friends...')
      const friendsData = await kv.get(`user:${user.id}:friends`)
      friends = friendsData || []
      console.log(`Found ${friends.length} friends`)
    } catch (err) {
      console.error('Error fetching friends:', err)
    }

    try {
      console.log('Fetching friend requests...')
      const incomingRequests = await kv.get(`user:${user.id}:friend_requests`) || []
      const outgoingRequests = await kv.get(`user:${user.id}:pending_requests`) || []
      friendRequests = { incoming: incomingRequests, outgoing: outgoingRequests }
      console.log(`Found ${incomingRequests.length} incoming and ${outgoingRequests.length} outgoing friend requests`)
    } catch (err) {
      console.error('Error fetching friend requests:', err)
    }

    try {
      console.log('Fetching notifications...')
      const notificationsData = await kv.get(`notifications:${user.id}`)
      notifications = notificationsData || []
      console.log(`Found ${notifications.length} notifications`)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }

    try {
      console.log('Fetching flags...')
      const flagsData = await kv.getByPrefix(`flag:`)
      userFlags = flagsData
        ? flagsData
            .filter(flag => flag && flag.reporterId === user.id)
            .map(flag => ({
              flagId: flag.id,
              itemType: flag.itemType,
              itemId: flag.itemId,
              reason: flag.reason,
              details: flag.details,
              timestamp: flag.createdAt,
              status: flag.status,
            }))
        : []
      console.log(`Found ${userFlags.length} flags`)
    } catch (err) {
      console.error('Error fetching flags:', err)
    }

    try {
      achievements = (await kv.get(`achievements:${user.id}`)) || {}
    } catch (err) {
      console.error('Error fetching achievements:', err)
    }

    try {
      userStats = (await kv.get(`userStats:${user.id}`)) || {}
    } catch (err) {
      console.error('Error fetching user stats:', err)
    }

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

    // 1️⃣2️⃣ User Files (Image URLs)
    const userImages = cards
      .flatMap(card => [card?.frontImageUrl, card?.backImageUrl])
      .filter(url => url && url.trim() !== '')

    // 1️⃣3️⃣ Content the User Has Saved or Downloaded
    const importedDecks = decks.filter(deck => deck?.sourceCommunityDeckId)
    const favoriteDecks = decks.filter(deck => deck?.favorite)
    const learnedDecks = decks.filter(deck => deck?.learned)

    // 🔟 Login & Authentication History
    const authHistory = {
      lastSignIn: user.last_sign_in_at,
      emailConfirmed: user.email_confirmed_at,
      providers: user.identities?.map(i => i.provider) || [],
    }

    // 1️⃣1️⃣ Subscription History
    const subscriptionHistory = {
      currentTier: user.user_metadata?.subscriptionTier || 'free',
      renewalDate: user.user_metadata?.subscriptionRenewalDate,
      hasActiveSubscription: ['monthly', 'annual', 'lifetime'].includes(user.user_metadata?.subscriptionTier || 'free'),
    }

    // Compile everything into a structured export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      
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
        friendRequests: friendRequests,
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
      }
    }

    console.log(`Successfully compiled data export for user ${user.id}`)
    return c.json(exportData)

  } catch (error) {
    console.error(`Export data error: ${error}`)
    console.error(`Error stack: ${error?.stack}`)
    return c.json({ error: `Failed to export data: ${error?.message || 'Unknown error'}` }, 500)
  }
})

// Create a warning for a user
app.post('/make-server-8a1502a9/warnings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (!user || authError) {
      console.error('Authorization error while creating warning:', authError)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user is moderator or superuser (check both KV store and user metadata)
    const userProfile = await kv.get(`user:${user.id}:profile`)
    const isSuperuser = (userProfile as any)?.isSuperuser || user.user_metadata?.isSuperuser
    const isModerator = (userProfile as any)?.isModerator || user.user_metadata?.isModerator

    if (!isModerator && !isSuperuser) {
      console.error(`User ${user.id} attempted to warn a user without proper permissions`)
      return c.json({ error: 'Insufficient permissions. Only moderators and superusers can warn users.' }, 403)
    }

    const { userId, flagId, reason, customReason, message, timeToResolve, targetType, targetId, targetName } = await c.req.json()

    if (!userId || !reason || !timeToResolve) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Create warning ID
    const warningId = `warning-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Calculate deadline
    const hoursToResolve = parseInt(timeToResolve)
    const deadline = new Date(Date.now() + hoursToResolve * 60 * 60 * 1000).toISOString()

    // Store warning in KV
    const warning = {
      id: warningId,
      userId,
      flagId,
      moderatorId: user.id,
      moderatorName: user.user_metadata?.displayName || user.user_metadata?.name || user.email,
      reason,
      customReason,
      message,
      timeToResolve: hoursToResolve,
      deadline,
      targetType,
      targetId,
      targetName,
      status: 'active', // active, resolved, expired
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }

    await kv.set(`warning:${warningId}`, warning)

    // Also store in user's warnings list
    const userWarningsKey = `user:${userId}:warnings`
    const userWarnings = await kv.get(userWarningsKey) || []
    userWarnings.push(warningId)
    await kv.set(userWarningsKey, userWarnings)

    // Create notification for the warned user (using the same pattern as other notifications)
    const reasonText = reason === 'other' ? customReason : {
      'inaccurate': 'Inaccurate content',
      'offensive': 'Offensive language',
      'copyright': 'Copyright issue',
      'guidelines': 'Community guidelines violation'
    }[reason] || reason

    const notificationText = `You have received a warning from a moderator regarding your ${targetType}: "${targetName}". Reason: ${reasonText}${message ? `. Message: ${message}` : ''}. Please address this within ${hoursToResolve} hours.`

    const notification = {
      id: crypto.randomUUID(),
      type: 'warning',
      text: notificationText,
      warningId: warningId,
      targetType,
      targetId,
      targetName,
      reason: reasonText,
      message: message || null,
      timeToResolve: hoursToResolve,
      deadline,
      createdAt: new Date().toISOString(),
      read: false,
      seen: false
    }

    // Add to user's notifications using the standard pattern
    const notificationKey = `notifications:${userId}`
    console.log(`📬 Creating warning notification for user ${userId}`)
    console.log(`📬 Notification key: ${notificationKey}`)
    console.log(`📬 Notification object:`, JSON.stringify(notification, null, 2))
    const notifications = await kv.get(notificationKey) || []
    console.log(`📬 Existing notifications count: ${notifications.length}`)
    notifications.unshift(notification)
    await kv.set(notificationKey, notifications)
    console.log(`📬 Stored ${notifications.length} notifications for user ${userId}`)
    console.log(`📬 Verification - notification has reason: ${!!notification.reason}, message: ${!!notification.message}, timeToResolve: ${!!notification.timeToResolve}`)

    console.log(`✅ Warning ${warningId} created by ${user.user_metadata?.displayName || user.email} for user ${userId}`)
    console.log(`✅ Notification successfully created and stored`)
    return c.json({ success: true, warningId })

  } catch (error) {
    console.error('Create warning error:', error)
    return c.json({ error: `Failed to create warning: ${error?.message || 'Unknown error'}` }, 500)
  }
})

// AI Translate Text
app.post('/make-server-8a1502a9/ai-translate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Auth error in translate: ${authError?.message}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium subscription
    const subscriptionTier = user.user_metadata?.subscriptionTier || 'free'
    if (subscriptionTier === 'free') {
      console.log(`Free user ${user.id} attempted translation - blocked`)
      return c.json({ error: 'Translation requires a Premium or Pro subscription' }, 403)
    }

    const { text, targetLanguage } = await c.req.json()
    
    if (!text || !targetLanguage) {
      return c.json({ error: 'Text and target language are required' }, 400)
    }

    console.log(`AI Translate - User: ${user.id}, Target Language: ${targetLanguage}, Text length: ${text.length}`)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('OpenAI API key not configured')
      return c.json({ error: 'AI service not configured. Please add your OpenAI API key.' }, 500)
    }

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
      console.log(`OpenAI API error: ${openaiResponse.status} - ${errorData}`)
      return c.json({ error: 'Translation service error' }, 500)
    }

    const data = await openaiResponse.json()
    const translatedText = data.choices[0]?.message?.content?.trim()

    if (!translatedText) {
      console.log('No translation received from OpenAI')
      return c.json({ error: 'Failed to generate translation' }, 500)
    }

    console.log(`Translation successful: "${text}" -> "${translatedText}"`)
    return c.json({ translatedText })
  } catch (error) {
    console.log(`Translation error: ${error}`)
    return c.json({ error: 'Failed to translate text' }, 500)
  }
})

// Text-to-Speech using OpenAI API (Premium feature)
app.post('/make-server-8a1502a9/tts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('TTS error: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`TTS authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check if user has premium access (monthly, annual, lifetime, moderator, or superuser)
    const isPremium = user.user_metadata?.subscriptionTier && 
                      ['monthly', 'annual', 'lifetime'].includes(user.user_metadata.subscriptionTier)
    const isModerator = user.user_metadata?.isModerator === true
    const isSuperuser = user.user_metadata?.isSuperuser === true
    
    if (!isPremium && !isModerator && !isSuperuser) {
      console.log(`TTS error: User ${user.id} does not have premium access`)
      return c.json({ error: 'Premium subscription required for OpenAI TTS' }, 403)
    }

    const { text, language } = await c.req.json()

    if (!text || text.trim().length === 0) {
      console.log('TTS error: No text provided')
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

    console.log(`TTS request - User: ${user.id}, Language: ${language} (${langCode}), Voice: ${voice}, Text length: ${text.length}`)

    // Call OpenAI TTS API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('TTS error: OpenAI API key not configured')
      return c.json({ error: 'TTS service not configured' }, 500)
    }

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
      console.log(`OpenAI TTS API error: ${response.status} - ${errorText}`)
      return c.json({ error: 'Failed to generate speech' }, 500)
    }

    // Get audio data as array buffer
    const audioBuffer = await response.arrayBuffer()
    
    // Convert to base64 for easy transmission
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    console.log(`TTS successful - Generated ${audioBuffer.byteLength} bytes of audio`)

    return c.json({ 
      audioData: base64Audio,
      format: 'mp3'
    })

  } catch (error) {
    console.log(`TTS error: ${error}`)
    return c.json({ error: 'Failed to generate speech' }, 500)
  }
})

// Send referral invite
app.post('/make-server-8a1502a9/referrals/invite', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      console.log('Referral invite error: No access token provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log(`Referral invite authentication error: ${authError?.message || 'User not found'}`)
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { email } = await c.req.json()

    if (!email || !email.includes('@')) {
      console.log('Referral invite error: Invalid email')
      return c.json({ error: 'Valid email is required' }, 400)
    }

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (emailExists) {
      console.log('Referral invite error: Email already registered')
      return c.json({ error: 'This email is already registered' }, 400)
    }

    const referralCode = `${user.id.substring(0, 8)}-${Date.now()}`

    const referralKey = `referral:${referralCode}`
    await kv.set(referralKey, {
      referrerId: user.id,
      referrerName: user.user_metadata?.displayName || user.email,
      invitedEmail: email.toLowerCase(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      code: referralCode
    })

    const userInvitesKey = `user:${user.id}:invites`
    const userInvites = await kv.get(userInvitesKey) || []
    userInvites.push({
      email: email.toLowerCase(),
      code: referralCode,
      sentAt: new Date().toISOString(),
      status: 'pending'
    })
    await kv.set(userInvitesKey, userInvites)

    console.log(`Referral invite sent from ${user.id} to ${email} with code ${referralCode}`)

    const referralLink = `${Deno.env.get('SUPABASE_URL')}/signup?ref=${referralCode}`

    return c.json({ 
      message: 'Referral invite sent successfully',
      referralCode,
      referralLink,
      note: 'In production, this would be sent via email'
    })

  } catch (error) {
    console.log(`Referral invite error: ${error}`)
    return c.json({ error: 'Failed to send referral invite' }, 500)
  }
})

// Get user's referral stats
app.get('/make-server-8a1502a9/referrals/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userInvitesKey = `user:${user.id}:invites`
    const invites = await kv.get(userInvitesKey) || []

    const completedReferrals = invites.filter((inv: any) => inv.status === 'completed').length
    const pendingReferrals = invites.filter((inv: any) => inv.status === 'pending').length

    return c.json({
      totalInvites: invites.length,
      completedReferrals,
      pendingReferrals,
      invites
    })

  } catch (error) {
    console.log(`Referral stats error: ${error}`)
    return c.json({ error: 'Failed to get referral stats' }, 500)
  }
})

// Check and apply referral code during signup
app.post('/make-server-8a1502a9/referrals/apply', async (c) => {
  try {
    const { referralCode, newUserId } = await c.req.json()

    if (!referralCode || !newUserId) {
      return c.json({ error: 'Referral code and user ID required' }, 400)
    }

    const referralKey = `referral:${referralCode}`
    const referralData = await kv.get(referralKey)

    if (!referralData) {
      console.log(`Invalid referral code: ${referralCode}`)
      return c.json({ error: 'Invalid referral code' }, 400)
    }

    if (referralData.status !== 'pending') {
      console.log(`Referral code already used: ${referralCode}`)
      return c.json({ error: 'Referral code already used' }, 400)
    }

    referralData.status = 'completed'
    referralData.completedAt = new Date().toISOString()
    referralData.newUserId = newUserId
    await kv.set(referralKey, referralData)

    const userInvitesKey = `user:${referralData.referrerId}:invites`
    const userInvites = await kv.get(userInvitesKey) || []
    const inviteIndex = userInvites.findIndex((inv: any) => inv.code === referralCode)
    if (inviteIndex !== -1) {
      userInvites[inviteIndex].status = 'completed'
      userInvites[inviteIndex].completedAt = new Date().toISOString()
      await kv.set(userInvitesKey, userInvites)
    }

    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1)

    const { error: newUserError } = await supabase.auth.admin.updateUserById(newUserId, {
      user_metadata: {
        subscriptionTier: 'monthly',
        subscriptionExpiry: expiryDate.toISOString(),
        subscriptionCancelledAtPeriodEnd: false,
        referralBonus: true
      }
    })

    if (newUserError) {
      console.log(`Failed to grant premium to new user: ${newUserError.message}`)
    }

    const { data: referrerData } = await supabase.auth.admin.getUserById(referralData.referrerId)
    
    if (referrerData?.user) {
      const currentTier = referrerData.user.user_metadata?.subscriptionTier || 'free'
      
      if (currentTier !== 'lifetime') {
        const referrerExpiry = new Date()
        
        if (currentTier === 'monthly' || currentTier === 'annual') {
          if (referrerData.user.user_metadata?.subscriptionExpiry) {
            const currentExpiry = new Date(referrerData.user.user_metadata.subscriptionExpiry)
            if (currentExpiry > new Date()) {
              referrerExpiry.setTime(currentExpiry.getTime())
            }
          }
        }
        
        referrerExpiry.setMonth(referrerExpiry.getMonth() + 1)

        const { error: referrerError } = await supabase.auth.admin.updateUserById(referralData.referrerId, {
          user_metadata: {
            ...referrerData.user.user_metadata,
            subscriptionTier: currentTier === 'free' ? 'monthly' : currentTier,
            subscriptionExpiry: referrerExpiry.toISOString(),
            subscriptionCancelledAtPeriodEnd: false
          }
        })

        if (referrerError) {
          console.log(`Failed to grant premium to referrer: ${referrerError.message}`)
        } else {
          console.log(`Referrer ${referralData.referrerId} bonus applied: ${currentTier} -> extended to ${referrerExpiry.toISOString()}`)
        }
      } else {
        console.log(`Referrer ${referralData.referrerId} has lifetime subscription, no bonus applied`)
      }
    }

    console.log(`Referral completed: ${referralData.referrerId} referred ${newUserId}`)

    // Send reward email to referrer (don't block if email fails)
    if (referrerData?.user?.email && currentTier !== 'lifetime') {
      const { data: newUserData } = await supabase.auth.admin.getUserById(newUserId)
      const newUserName = newUserData?.user?.user_metadata?.displayName || newUserData?.user?.user_metadata?.name || 'Your friend'
      const reward = currentTier === 'free' ? '1 month of Premium' : '1 month subscription extension'
      
      emailService.sendReferralRewardEmail(
        referrerData.user.email,
        referrerData.user.user_metadata?.displayName || referrerData.user.user_metadata?.name || 'there',
        newUserName,
        reward
      ).catch(err => console.error('Failed to send referral reward email:', err))
    }

    return c.json({ 
      success: true,
      message: 'Referral bonus applied! Both you and your friend received 1 month of premium.'
    })

  } catch (error) {
    console.log(`Apply referral error: ${error}`)
    return c.json({ error: 'Failed to apply referral' }, 500)
  }
})

// Send referral invitation email
app.post('/make-server-8a1502a9/referrals/send-invite', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { toEmail, fromName, referralLink } = await c.req.json()

    if (!toEmail || !referralLink) {
      return c.json({ error: 'Email and referral link required' }, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(toEmail)) {
      return c.json({ error: 'Invalid email address' }, 400)
    }

    // Send the referral invite email
    const success = await emailService.sendReferralInviteEmail(
      toEmail,
      fromName || user.user_metadata?.displayName || user.user_metadata?.name || 'A friend',
      referralLink
    )

    if (!success) {
      return c.json({ error: 'Failed to send invitation email' }, 500)
    }

    console.log(`Referral invite sent from ${user.email} to ${toEmail}`)

    return c.json({ 
      success: true,
      message: 'Invitation email sent successfully'
    })

  } catch (error) {
    console.log(`Send referral invite error: ${error}`)
    return c.json({ error: 'Failed to send invitation' }, 500)
  }
})

// Fix invalid "premium" subscription tier (migration endpoint)
app.post('/make-server-8a1502a9/fix-subscription-tier', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Missing access token' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const currentTier = user.user_metadata?.subscriptionTier
    
    // If tier is the invalid "premium" value, fix it
    if (currentTier === 'premium') {
      console.log(`Fixing invalid subscription tier for user ${user.id}: "premium" -> "free"`)
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          subscriptionTier: 'free'
        }
      })

      if (updateError) {
        console.log(`Fix subscription tier error: ${updateError.message}`)
        return c.json({ error: 'Failed to fix subscription tier' }, 500)
      }

      return c.json({ 
        success: true, 
        message: 'Subscription tier fixed',
        oldTier: 'premium',
        newTier: 'free',
        note: 'You still have premium features through your moderator/superuser role'
      })
    }

    return c.json({ 
      success: true, 
      message: 'No fix needed',
      currentTier: currentTier 
    })

  } catch (error) {
    console.log(`Fix subscription tier error: ${error}`)
    return c.json({ error: 'Failed to fix subscription tier' }, 500)
  }
})

// Contact form submission
app.post('/make-server-8a1502a9/contact', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      console.log('Contact form auth error:', authError)
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { category, subject, message } = await c.req.json()
    
    if (!category || !subject || !message) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const userName = user.user_metadata?.displayName || user.user_metadata?.name || 'User'
    const userEmail = user.email || ''
    
    console.log(`📧 Contact form submission from ${userName} (${userEmail}):`, { category, subject })
    
    // Send email to support team (with user's email as reply-to)
    const sentToSupport = await emailService.sendContactFormEmail(
      userEmail,
      userName,
      category,
      subject,
      message
    )
    
    // Send confirmation email to user
    const sentToUser = await emailService.sendContactConfirmationEmail(
      userEmail,
      userName,
      subject
    )
    
    if (!sentToSupport && !sentToUser) {
      console.log('⚠️ Contact form emails not sent (RESEND_API_KEY may not be configured)')
      // Still return success since the form was submitted successfully
    }
    
    return c.json({ 
      success: true,
      message: 'Contact form submitted successfully',
      emailSent: sentToSupport || sentToUser
    })
  } catch (error) {
    console.log(`Contact form submission error: ${error}`)
    return c.json({ error: 'Failed to submit contact form' }, 500)
  }
})

Deno.serve(app.fetch)
