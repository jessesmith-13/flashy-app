import { useState } from 'react'
import { useStore } from '../../../../store/useStore'
import * as api from '../../../../utils/api'
import { AuthHeader } from './AuthHeader'
import { LoginForm } from './LoginForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { GoogleLoginButton } from './GoogleLoginButton'
import { TestLoginButtons } from './TestLoginButtons'

export function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const { setAuth, setCurrentView, addFriendRequest } = useStore()

  const handleLogin = async (email: string, password: string) => {
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login with email:', email)
      const { session, user } = await api.signIn(email, password)
      
      console.log('Login successful, session:', session ? 'exists' : 'null')
      console.log('User data:', user)
      
      if (session && user) {
        // Check if user is the Flashy superuser
        const isSuperuser = user.email === 'flashy@flashy.app'
        
        setAuth(
          { 
            id: user.id, 
            email: user.email || '', 
            name: user.user_metadata?.name || '',
            displayName: user.user_metadata?.displayName || user.user_metadata?.name || '',
            avatarUrl: user.user_metadata?.avatarUrl,
            decksPublic: user.user_metadata?.decksPublic ?? true,
            subscriptionTier: user.user_metadata?.subscriptionTier || 'free',
            subscriptionExpiry: user.user_metadata?.subscriptionExpiry,
            isSuperuser,
          },
          session.access_token
        )
        
        // Add some mock friend requests for demo purposes
        addFriendRequest('user-maria')
        addFriendRequest('user-john')
        
        setCurrentView('decks')
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        console.error('Error message:', err.message)
        const errorMessage = err.message || 'Failed to login'
        if (errorMessage.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials or create a new account below.')
        } else {
          setError(errorMessage)
        }
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
    } catch (err: unknown) {
      console.error('Google sign-in error:', err)
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign in with Google')
      }
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
    } catch (err: unknown) {
      console.error('Password reset error:', err)
      if (err instanceof Error) {
        setError(err.message || 'Failed to send password reset email')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = async (accountType: 'free' | 'premium' | 'superuser' = 'free') => {
    setError('')
    setLoading(true)

    try {
      // Determine account details based on type
      let testEmail: string
      let testPassword: string
      let testName: string
      
      if (accountType === 'superuser') {
        testEmail = 'flashy@flashy.app'
        testPassword = 'flashy123456'
        testName = 'Flashy'
      } else {
        testEmail = accountType === 'premium' ? 'premium@flashy.app' : 'free@flashy.app'
        testPassword = 'test123456'
        testName = accountType === 'premium' ? 'Premium User' : 'Free User'
      }

      console.log(`Attempting to login as ${accountType} test user...`)
      
      // Try to create account first (only if it doesn't exist)
      try {
        await api.signUp(testEmail, testPassword, testName)
        console.log('Test account created successfully')
      } catch (signupErr: unknown) {
        if (signupErr instanceof Error) {
          const errorMsg = signupErr.message || ''
          if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('registered')) {
            console.log('Test account already exists, proceeding to login')
          } else {
            console.log('Signup error (non-critical):', errorMsg)
          }
          // Don't throw - continue to login regardless
        }
        // Account already exists, which is fine - we'll just login
      }

      // Now login with test account
      console.log('Logging in with test account...')
      const { session, user } = await api.signIn(testEmail, testPassword)
      
      if (session && user) {
        // If premium or superuser, update their subscription tier
        if ((accountType === 'premium' || accountType === 'superuser') && user.user_metadata?.subscriptionTier !== 'lifetime') {
          try {
            await api.updateProfile(session.access_token, {
              subscriptionTier: 'lifetime'
            })
            user.user_metadata.subscriptionTier = 'lifetime'
          } catch (updateErr) {
            console.log('Could not update subscription tier:', updateErr)
          }
        }
        
        // Check if user is the Flashy superuser
        const isSuperuser = user.email === 'flashy@flashy.app'
        
        setAuth(
          { 
            id: user.id, 
            email: user.email || '', 
            name: user.user_metadata?.name || '',
            displayName: user.user_metadata?.displayName || user.user_metadata?.name || '',
            avatarUrl: user.user_metadata?.avatarUrl,
            decksPublic: user.user_metadata?.decksPublic ?? true,
            subscriptionTier: user.user_metadata?.subscriptionTier || 'free',
            subscriptionExpiry: user.user_metadata?.subscriptionExpiry,
            isSuperuser,
          },
          session.access_token
        )
        
        // Add some mock friend requests for demo purposes
        addFriendRequest('user-maria')
        addFriendRequest('user-john')
        
        setCurrentView('decks')
      }
    } catch (err: unknown) {
      console.error('Test login error:', err)
      if (err instanceof Error) {
        setError('Failed to create/login test account: ' + err.message)
      }
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
          onBackToHome={() => setCurrentView('landing')}
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

        <TestLoginButtons
          onTestLogin={handleTestLogin}
          onCreateAccount={() => setCurrentView('signup')}
          loading={loading}
        />
      </div>
    </div>
  )
}
