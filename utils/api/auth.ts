import { API_BASE } from '../../src/supabase/runtime'
import { supabase } from '../../src/lib/supabase'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ============================================================
// AUTH – SIGN UP / SIGN IN
// ============================================================

export const signUp = async (
  email: string,
  password: string,
  name: string
) => {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, password, name }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Sign up failed')
  }

  return data
}

/**
 * Sign in with email/password and fetch fresh user profile from database.
 * This checks ban status from the database (not metadata) and returns
 * fresh isSuperuser and isModerator values.
 */
export const signIn = async (
  email: string,
  password: string
): Promise<{
  session: any
  user: any
  profile: {
    name: string
    displayName: string
    avatarUrl: string | null
    decksPublic: boolean
    subscriptionTier: string
    subscriptionExpiry: string | null
    isSuperuser: boolean
    isModerator: boolean
  }
}> => {
  // Step 1: Authenticate with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.session || !data.user) {
    throw new Error('Login failed - no session returned')
  }

  // 🔍 DEBUG: verify which Supabase project issued this token
  const token = data.session.access_token
  const payload = JSON.parse(atob(token.split('.')[1]))

  console.log(
    'JWT DEBUG → ref:',
    payload.ref,
    'iss:',
    payload.iss
  )

  // Step 2: Fetch fresh user profile from database (includes ban status)
  const response = await fetch(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        'apikey': anonKey,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Handle banned user
    if (response.status === 403 && errorData.banned) {
      const banReason = errorData.banReason || ''
      
      console.log('=== USER BANNED ===')
      console.log('Ban Reason:', banReason || 'No reason provided')
      console.log('==================')
      
      // Sign out the user
      await supabase.auth.signOut()
      
      // Throw custom banned error
      class BannedError extends Error {
        banReason: string
        constructor(message: string, banReason: string) {
          super(message)
          this.name = 'ACCOUNT_BANNED'
          this.banReason = banReason
        }
      }
      
      throw new BannedError(
        'Your account has been banned. Please contact support for more information.',
        banReason
      )
    }
    
    throw new Error(errorData.error || 'Failed to fetch user profile')
  }

  const profile = await response.json()

  return {
    session: data.session,
    user: data.user,
    profile: {
      name: profile.name || '',
      displayName: profile.displayName || profile.name || '',
      avatarUrl: profile.avatarUrl || null,
      decksPublic: profile.decksPublic ?? false,
      subscriptionTier: profile.subscriptionTier || 'free',
      subscriptionExpiry: profile.subscriptionExpiry || null,
      isSuperuser: profile.isSuperuser || false,
      isModerator: profile.isModerator || false,
    },
  }
}

// ============================================================
// AUTH – OAUTH
// ============================================================

export const signInWithGoogle = async () => {
  const { data, error } =
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// ============================================================
// AUTH – PASSWORD MANAGEMENT
// ============================================================

export const resetPassword = async (email: string) => {
  const { data, error } =
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updatePassword = async (newPassword: string) => {
  const { data, error } =
    await supabase.auth.updateUser({
      password: newPassword,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// ============================================================
// AUTH – SESSION
// ============================================================

export const getSession = async () => {
  try {
    const { data, error } =
      await supabase.auth.getSession()

    if (error) {
      if (
        error.message.includes('Refresh Token') ||
        error.message.includes('Auth session missing')
      ) {
        return null
      }

      console.warn('Session error:', error.message)
      return null
    }

    return data.session
  } catch (err) {
    console.warn('Session check failed:', err)
    return null
  }
}

export const signOut = async () => {
  try {
    const { error } =
      await supabase.auth.signOut()

    if (
      error &&
      error.message !== 'Auth session missing!'
    ) {
      throw error
    }
  } catch (err) {
    console.warn('Supabase signOut warning:', err)
  }
}

export const setDisplayName = async (token: string, displayName: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/auth/set-display-name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ displayName }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to set display name')
  }
}

export const getUserProfileOnLogin = async (token: string): Promise<{
  display_name: string | null
  avatar_url: string | null
  decks_public: boolean
  subscription_tier: string
  subscription_expiry: string | null
}> => {
  const response = await fetch(`${API_BASE}/auth/user-profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'apikey': anonKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to fetch user profile')
  }

  return response.json()
}

// ============================================================
// AUTH – TERMS / LEGAL
// ============================================================

export const recordTermsAcceptance = async (
  accessToken: string,
  termsAcceptedAt: string
) => {
  const response = await fetch(
    `${API_BASE}/auth/terms/accept`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ termsAcceptedAt }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error(
      'Failed to record terms acceptance:',
      data.error
    )
    throw new Error(
      data.error || 'Failed to record terms acceptance'
    )
  }

  return data
}