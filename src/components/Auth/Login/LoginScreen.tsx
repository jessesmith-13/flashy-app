import { useState } from 'react'
import { useStore } from '../../../../store/useStore'
import { useNavigation } from '../../../../hooks/useNavigation'
import { signIn, resetPassword, signInWithGoogle }from '../../../../utils/api/auth'
import { getFriends, getFriendRequests } from '../../../../utils/api/friends'
import { AuthHeader } from './AuthHeader'
import { LoginForm } from './LoginForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { GoogleLoginButton } from './GoogleLoginButton'
import { toast } from 'sonner'
import { SubscriptionTier } from '@/types/users'

interface AccountBannedError extends Error {
  name: 'ACCOUNT_BANNED'
  banReason?: string
}

function isAccountBannedError(err: unknown): err is AccountBannedError {
  return (
    err instanceof Error &&
    err.name === 'ACCOUNT_BANNED'
  )
}

type Friend = {
  id: string
}

export function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const { setAuth, setFriends, setFriendRequests } = useStore()
  const { navigateTo } = useNavigation()

  const handleLogin = async (email: string, password: string) => {
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login with email:', email)
      
      // ✅ Step 1: Call new backend endpoint that checks ban status from DB
      const { session, user, profile } = await signIn(email, password)
      
      console.log('Login successful, session:', session ? 'exists' : 'null')
      console.log('User data:', user)
      console.log('Profile data from DB:', profile)
      
      if (session && user && profile) {
        // ✅ Step 2: Use database values (not metadata) for auth state
      setAuth(
        { 
          id: user.id, 
          email: user.email || '', 
          name: profile.name || '',
          displayName: profile.displayName || profile.name || '',
          avatarUrl: profile.avatarUrl || undefined,  // ✅ Changed: null → undefined
          decksPublic: profile.decksPublic ?? false,
          subscriptionTier: (profile.subscriptionTier || 'free') as SubscriptionTier,  // ✅ Added type cast
          subscriptionExpiry: profile.subscriptionExpiry || undefined,  // ✅ Changed: null → undefined
          isSuperuser: profile.isSuperuser || false,
          isModerator: profile.isModerator || false,
        },
        session.access_token
      )
        
        // Load friend data
        try {
          const friends = await getFriends(session.access_token) as Friend[]
          setFriends(friends.map(f => f.id)) // Extract just the IDs
          
          const requests = await getFriendRequests(session.access_token)
          setFriendRequests(requests)
        } catch (error) {
          console.error('Failed to load friends data:', error)
        }
        
        // Check if user was viewing a shared deck before logging in
        const returnToSharedDeck = sessionStorage.getItem('returnToSharedDeck')
        if (returnToSharedDeck) {
          console.log('LoginScreen - Returning to shared deck after login:', returnToSharedDeck)
          sessionStorage.removeItem('returnToSharedDeck')
          // Set the hash so App.tsx will pick it up
          window.location.hash = `#/shared/${returnToSharedDeck}`
          // Don't set a view - let App.tsx handle it
        } else {
          navigateTo('decks')
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err)

      if (err instanceof Error) {
        console.error('Error message:', err.message)
        console.error('Error name:', err.name)
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to login'

      // 🔒 Banned account handling
      if (isAccountBannedError(err)) {
        const banReason = err.banReason ?? ''
        const description = banReason
          ? `Your account has been banned. Reason: ${banReason}`
          : 'Your account has been banned. Please contact support for more information.'

        toast.error('Account Banned', {
          description,
          duration: 8000,
        })

        setError(errorMessage)
      } 
      // 🔑 Invalid credentials
      else if (
        err instanceof Error &&
        err.message.includes('Invalid login credentials')
      ) {
        setError(
          'Invalid email or password. Please check your credentials or create a new account below.'
        )
      } 
      // ❌ Fallback
      else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      await signInWithGoogle()
      // Redirect handled by Supabase
    } catch (err: unknown) {
      console.error('Google sign-in error:', err)

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to sign in with Google'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (email: string) => {
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setResetSuccess(true)

      setTimeout(() => {
        setShowForgotPassword(false)
        setResetSuccess(false)
      }, 3000)
    } catch (err: unknown) {
      console.error('Password reset error:', err)

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to send password reset email'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForgotPassword = () => {
    setShowForgotPassword(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
        <AuthHeader 
          onBackToHome={() => navigateTo('landing')}
          subtitle="Welcome back!"
        />

        {showForgotPassword ? (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBack={handleBackToForgotPassword}
            error={error}
            loading={loading}
            success={resetSuccess}
          />
        ) : (
          <>
            <LoginForm
              onSubmit={handleLogin}
              onForgotPassword={() => setShowForgotPassword(true)}
              error={error}
              loading={loading}
            />

            <GoogleLoginButton
              onClick={handleGoogleSignIn}
              loading={loading}
            />
          </>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigateTo('signup')}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm"
          >
            Don't have an account? <span className="underline">Sign up here</span>
          </button>
        </div>
      </div>
    </div>
  )
}
