import { useState } from 'react'
import { useStore } from '../../../../store/useStore'
import { useNavigation } from '../../../../hooks/useNavigation'
import { useLocation } from 'react-router-dom'
import * as api from '../../../../utils/api'
import { AuthHeader } from '../Login/AuthHeader'
import { SignupForm } from './SignupForm'
import { SignupSuccess } from './SignupSuccess'
import { GoogleLoginButton } from '../Login/GoogleLoginButton'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { AccountBannedError } from '@/types/errors'

function isAccountBannedError(err: unknown): err is AccountBannedError {
  return (
    err instanceof Error &&
    err.name === 'ACCOUNT_BANNED'
  )
}

export function SignUpScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [newUserDisplayName, setNewUserDisplayName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const { setAuth } = useStore()
  const { navigateTo } = useNavigation()
  const location = useLocation()

  // Extract referral code from URL
  const searchParams = new URLSearchParams(location.search)
  const referralCode = searchParams.get('ref')

  const handleSignup = async (displayName: string, email: string, password: string) => {
    // Validate terms acceptance
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Use and Privacy Policy to sign up')
      return
    }

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
      console.log('User subscription tier:', user.user_metadata?.subscriptionTier)
      
      if (session && user) {
        let finalUser = user
        
        // Apply referral code if present
        if (referralCode) {
          try {
            console.log('Applying referral code:', referralCode)
            const referralResult = await api.applyReferralCode(referralCode, user.id)
            console.log('Referral applied:', referralResult)
            
            // Show success message
            toast.success('Referral bonus applied!', {
              description: 'You and your friend both received 1 month of Premium!',
              duration: 5000
            })
            
            // Re-fetch user data to get updated subscription
            const { user: updatedUser } = await api.signIn(email, password)
            if (updatedUser) {
              finalUser = updatedUser
            }
          } catch (referralError) {
            console.error('Failed to apply referral code:', referralError)
            // Don't block signup if referral fails
            toast.error('Referral code could not be applied', {
              description: referralError instanceof Error ? referralError.message : 'Please contact support',
              duration: 5000
            })
          }
        }
        
        setAuth(
          { 
            id: finalUser.id, 
            email: finalUser.email || '', 
            name: finalUser.user_metadata?.name || displayName,
            displayName: finalUser.user_metadata?.displayName || finalUser.user_metadata?.name || displayName,
            avatarUrl: finalUser.user_metadata?.avatarUrl,
            decksPublic: finalUser.user_metadata?.decksPublic ?? false,
            subscriptionTier: finalUser.user_metadata?.subscriptionTier || 'free',
            subscriptionExpiry: finalUser.user_metadata?.subscriptionExpiry,
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
            navigateTo('decks')
          }, 2000)
        }
      }
    } catch (err: unknown) {
      console.error('Signup error:', err)

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign up'

      if (isAccountBannedError(err)) {
        const description = err.banReason
          ? `Your account has been banned. Reason: ${err.banReason}`
          : 'Your account has been banned. Please contact support for more information.'

        toast.error('Account Banned', {
          description,
          duration: 8000,
        })

        setError(errorMessage)
      } else if (
        errorMessage.includes('User already registered') ||
        errorMessage.includes('already registered')
      ) {
        setError('This email is already registered. Try logging in instead.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    // Validate terms acceptance
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Use and Privacy Policy to sign up')
      return
    }

    try {
      setError('')
      setLoading(true)
      // Save that we're signing up (not logging in) for potential analytics
      sessionStorage.setItem('authAction', 'signup')
      // Store terms acceptance for processing after OAuth callback
      sessionStorage.setItem('termsAccepted', 'true')
      sessionStorage.setItem('termsAcceptedAt', new Date().toISOString())
      await api.signInWithGoogle()
      // The redirect will be handled by Supabase
    } catch (err: unknown) {
      console.error('Google sign-up error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with Google'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleLoginClick = () => {
    // Set a flag so LoginScreen shows the form directly
    sessionStorage.setItem('showLoginForm', 'true')
    navigateTo('login')
  }

  const handleContinue = () => {
    // Check if user was viewing a shared deck before signing up
    const returnToSharedDeck = sessionStorage.getItem('returnToSharedDeck')
    if (returnToSharedDeck) {
      console.log('SignUpScreen - Returning to shared deck after continue:', returnToSharedDeck)
      sessionStorage.removeItem('returnToSharedDeck')
      window.location.hash = `#/shared/${returnToSharedDeck}`
    } else {
      navigateTo('decks')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10">
        <AuthHeader 
          onBackToHome={() => navigateTo('landing')}
          subtitle="Start your learning journey"
        />

        {showSuccess ? (
          <SignupSuccess 
            displayName={newUserDisplayName}
            onContinue={handleContinue}
          />
        ) : (
          <>
            {referralCode && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                  <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm">
                    You were invited by a friend! Sign up to get <strong>1 month of Premium free</strong>
                  </span>
                </div>
              </div>
            )}
            <SignupForm
              onSubmit={handleSignup}
              onLoginClick={handleLoginClick}
              error={error}
              loading={loading}
              acceptedTerms={acceptedTerms}
              acceptedPrivacy={acceptedPrivacy}
              onTermsChange={setAcceptedTerms}
              onPrivacyChange={setAcceptedPrivacy}
            />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

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