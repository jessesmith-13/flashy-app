import { useState } from 'react'
import { useStore } from '../../../../store/useStore'
import * as api from '../../../../utils/api'
import { AuthHeader } from '../Login/AuthHeader'
import { SignupForm } from './SignupForm'
import { SignupSuccess } from './SignupSuccess'
import { GoogleLoginButton } from '../Login/GoogleLoginButton'

export function SignupScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [newUserDisplayName, setNewUserDisplayName] = useState('')

  const { setAuth, setCurrentView } = useStore()

  const handleSignup = async (displayName: string, email: string, password: string) => {
    setError('')
    setLoading(true)

    try {
      console.log('Creating account with email:', email, 'display name:', displayName)
      
      // Create user
      await api.signUp(email, password, displayName)
      console.log('Account created successfully')
      
      // Auto-login after signup
      console.log('Logging in with new credentials...')
      const { session, user } = await api.signIn(email, password)
      
      console.log('Login successful, session:', session ? 'exists' : 'null')
      console.log('User data:', user)
      
      if (session && user) {
        setAuth(
          { 
            id: user.id, 
            email: user.email || '', 
            name: user.user_metadata?.name || displayName,
            displayName: user.user_metadata?.displayName || user.user_metadata?.name || displayName,
            avatarUrl: user.user_metadata?.avatarUrl,
            decksPublic: user.user_metadata?.decksPublic ?? true,
          },
          session.access_token
        )
        
        // Show success message briefly before redirecting
        setNewUserDisplayName(displayName)
        setShowSuccess(true)
        
        // Check if user was viewing a shared deck before signing up
        const returnToSharedDeck = sessionStorage.getItem('returnToSharedDeck')
        if (returnToSharedDeck) {
          console.log('SignUpScreen - Returning to shared deck after signup:', returnToSharedDeck)
          sessionStorage.removeItem('returnToSharedDeck')
          // Redirect after showing success message
          setTimeout(() => {
            window.location.hash = `#/shared/${returnToSharedDeck}`
          }, 2000)
        } else {
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            setCurrentView('decks')
          }, 2000)
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      console.error('Error message:', err.message)
      const errorMessage = err.message || 'Failed to sign up'
      if (errorMessage.includes('User already registered') || errorMessage.includes('already registered')) {
        setError('This email is already registered. Try logging in instead.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      setError('')
      setLoading(true)
      // Save that we're signing up (not logging in) for potential analytics
      sessionStorage.setItem('authAction', 'signup')
      await api.signInWithGoogle()
      // The redirect will be handled by Supabase
    } catch (err: any) {
      console.error('Google sign-up error:', err)
      setError(err.message || 'Failed to sign up with Google')
      setLoading(false)
    }
  }

  const handleLoginClick = () => {
    // Set a flag so LoginScreen shows the form directly
    sessionStorage.setItem('showLoginForm', 'true')
    setCurrentView('login')
  }

  const handleContinue = () => {
    // Check if user was viewing a shared deck before signing up
    const returnToSharedDeck = sessionStorage.getItem('returnToSharedDeck')
    if (returnToSharedDeck) {
      console.log('SignUpScreen - Returning to shared deck after continue:', returnToSharedDeck)
      sessionStorage.removeItem('returnToSharedDeck')
      window.location.hash = `#/shared/${returnToSharedDeck}`
    } else {
      setCurrentView('decks')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
        <AuthHeader 
          onBackToHome={() => setCurrentView('landing')}
          subtitle="Start your learning journey"
        />

        {showSuccess ? (
          <SignupSuccess 
            displayName={newUserDisplayName}
            onContinue={handleContinue}
          />
        ) : (
          <>
            <SignupForm
              onSubmit={handleSignup}
              onLoginClick={handleLoginClick}
              error={error}
              loading={loading}
            />

            <GoogleLoginButton
              onClick={handleGoogleSignUp}
              loading={loading}
              text="Sign up with Google"
            />
          </>
        )}
      </div>
    </div>
  )
}