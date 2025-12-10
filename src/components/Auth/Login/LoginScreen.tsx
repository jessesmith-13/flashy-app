import { useState } from 'react'
import { useStore } from '../../../../store/useStore'
import { useNavigation } from '../../../../hooks/useNavigation'
import * as api from '../../../../utils/api'
import { AuthHeader } from './AuthHeader'
import { LoginForm } from './LoginForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { GoogleLoginButton } from './GoogleLoginButton'
import { toast } from 'sonner'

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
      const { session, user } = await api.signIn(email, password)
      
      console.log('Login successful, session:', session ? 'exists' : 'null')
      console.log('User data:', user)
      
      if (session && user) {
        // Check if user is a superuser or moderator
        const isSuperuser = user.user_metadata?.isSuperuser === true
        const isModerator = user.user_metadata?.isModerator === true
        
        setAuth(
          { 
            id: user.id, 
            email: user.email || '', 
            name: user.user_metadata?.name || '',
            displayName: user.user_metadata?.displayName || user.user_metadata?.name || '',
            avatarUrl: user.user_metadata?.avatarUrl,
            decksPublic: user.user_metadata?.decksPublic ?? false,
            subscriptionTier: user.user_metadata?.subscriptionTier || 'free',
            subscriptionExpiry: user.user_metadata?.subscriptionExpiry,
            isSuperuser,
            isModerator,
          },
          session.access_token
        )
        
        // Load friend data
        try {
          const friends = await api.getFriends(session.access_token)
          setFriends(friends.map(f => f.id)) // Extract just the IDs
          
          const requests = await api.getFriendRequests(session.access_token)
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
    } catch (err: any) {
      console.error('Login error:', err)
      console.error('Error message:', err.message)
      console.error('Error name:', err.name)
      
      const errorMessage = err.message || 'Failed to login'
      
      // Check if the error is due to a banned account
      if (err.name === 'ACCOUNT_BANNED') {
        const banReason = err.banReason || ''
        const description = banReason 
          ? `Your account has been banned. Reason: ${banReason}` 
          : 'Your account has been banned. Please contact support for more information.'
        
        toast.error('Account Banned', {
          description,
          duration: 8000,
        })
        setError(errorMessage)
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials or create a new account below.')
      } else {
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
      await api.signInWithGoogle()
      // The redirect will be handled by Supabase
    } catch (err: any) {
      console.error('Google sign-in error:', err)
      setError(err.message || 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (email: string) => {
    setError('')
    setLoading(true)

    try {
      await api.resetPassword(email)
      setResetSuccess(true)
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetSuccess(false)
      }, 3000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to send password reset email')
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