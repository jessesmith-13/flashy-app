import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import * as api from '../../utils/api'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const logoLight="../../public/logoLight.png"
  const logoDark="../../public/logoDark.png"
  const { setAuth, setCurrentView, addFriendRequest } = useStore()

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Watch for changes to dark mode
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setLoading(false)
      }
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.resetPassword(resetEmail)
      setResetSuccess(true)
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetSuccess(false)
        setResetEmail('')
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
          // Account already exists, which is fine - we'll just login
          const errorMsg = signupErr.message || ''
          if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('registered')) {
            console.log('Test account already exists, proceeding to login')
          } else {
            console.log('Signup error (non-critical):', errorMsg)
          }
          // Don't throw - continue to login regardless
        }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <button 
            onClick={() => setCurrentView('landing')}
            className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 mx-auto"
          >
            ← Back to home
          </button>
          <div className="flex justify-center items-center gap-3 mb-4">
            <img 
              src={isDarkMode ? logoDark : logoLight} 
              alt="Flashy Logo" 
              className="h-16 w-auto"
            />
            <h1 className="text-4xl dark:text-gray-100">Flashy</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Welcome back!</p>
        </div>

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We'll send you a password reset link
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {resetSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-sm border border-emerald-200 dark:border-emerald-800">
                Password reset email sent! Check your inbox.
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false)
                  setError('')
                  setResetEmail('')
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mt-4 border-gray-300 dark:border-gray-600"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </div>
          </>
        )}

        <div className="mt-6 text-center space-y-3">
          <div className="pt-3 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">New to Flashy?</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentView('signup')}
              className="w-full"
            >
              Create Account
            </Button>
          </div>
          
          <div className="pt-3 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Just want to try it out?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTestLogin('free')}
                disabled={loading}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {loading ? 'Setting up...' : '👤 Free User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTestLogin('premium')}
                disabled={loading}
                className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                {loading ? 'Setting up...' : '👑 Premium User'}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleTestLogin('superuser')}
              disabled={loading}
              className="w-full mt-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            >
              {loading ? 'Setting up...' : '⚡ Flashy (Superuser)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
