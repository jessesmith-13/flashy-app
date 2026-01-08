import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabaseClient, signOut, getSession, recordTermsAcceptance } from '../utils/api/auth'
import { getFriends, getFriendRequests } from '../utils/api/friends'
import { updateProfile } from '../utils/api/users'
import { getUserProfile } from '../utils/api/auth'
import { LandingPage } from './components/Landing/LandingPage'
import { LoginScreen } from './components/Auth/Login/LoginScreen'
import { SignUpScreen } from './components/Auth/Signup/SignupScreen'
import { ResetPasswordScreen } from './components/Auth/Login/ResetPasswordScreen'
import { DecksScreen } from './components/Decks/DecksScreen'
import { DeckDetailScreen } from './components/Decks/DeckDetail/DeckDetailScreen'
import { StudyOptionsScreen } from './components/Study/StudyOptionsScreen'
import { StudyScreen } from './components/Study/StudyScreen'
import { CommunityScreen } from './components/Community/CommunityScreen'
import { ProfileScreen } from './components/Profile/ProfileScreen'
import { AIGenerateScreen } from './components/AI/AIGenerateScreen'
import { UpgradeModal } from './components/UpgradeModal'
import { PaymentSuccessScreen } from './components/PaymentSuccessScreen'
import { AllCardsScreen } from './components/AllCardsScreen'
import { SettingsScreen } from './components/Settings/SettingsScreen'
import { SuperuserScreen } from './components/Superuser/SuperuserScreen'
import { ModeratorScreen } from './components/Moderation/ModeratorScreen'
import { PrivacyPolicyScreen } from './components/Legal/PrivacyPolicyScreen'
import { TermsScreen } from './components/Legal/TermsScreen'
import { ContactScreen } from './components/Contact/ContactScreen'
import { SharedDeckView } from './components/SharedDeckView'
import { NotificationsScreen } from './components/Notifications/NotificationsScreen'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from './ui/sonner'
import { toast } from 'sonner'
import { SetDisplayModal } from './components/Auth/Signup/SetDisplayModal'
import { SubscriptionTier } from '@/types/users'

// Suppress Supabase auth errors from console
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  // Filter out expected Supabase auth errors
  const message = args[0]?.toString() || ''
  if (
    message.includes('AuthApiError') ||
    message.includes('Invalid Refresh Token') ||
    message.includes('Refresh Token Not Found') ||
    message.includes('project was deleted') ||
    message.includes('Project not found')
  ) {
    // Silently ignore these expected errors
    return
  }
  // Log all other errors normally
  originalConsoleError(...args)
}

// Wrapper component for shared deck route
function SharedDeckRoute() {
  const { shareId } = useParams()
  const navigate = useNavigate()

  return (
    <SharedDeckView
      shareId={shareId || ''}
      onBack={() => navigate('/')}
    />
  )
}

// Helper function to fetch user role from database
async function fetchUserRole(userId: string): Promise<{ isSuperuser: boolean; isModerator: boolean }> {
  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('is_superuser, is_moderator')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user role from database:', error)
      return { isSuperuser: false, isModerator: false }
    }

    return {
      isSuperuser: data?.is_superuser === true,
      isModerator: data?.is_moderator === true
    }
  } catch (error) {
    console.error('Error fetching user role:', error)
    return { isSuperuser: false, isModerator: false }
  }
}

// Main app component that handles session checking
function AppContent() {
  const { setAuth, setFriends, setFriendRequests, darkMode, user } = useStore()
  const [checkingSession, setCheckingSession] = useState(true)
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)
  const [isSettingDisplayName, setIsSettingDisplayName] = useState(false)
  const navigate = useNavigate()

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    checkSession()
    
    // Set up automatic session refresh
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        
        if (event === 'SIGNED_OUT') {
          // User signed out
          useStore.getState().logout()
          navigate('/')
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token was refreshed, update the store
          console.log('Token refreshed successfully')
          
          // Check if user is banned
          if (session.user.user_metadata?.isBanned === true) {
            console.log('Token refresh - User is banned, signing out')
            const banReason = session.user.user_metadata?.banReason || ''
            
            const description = banReason 
              ? `Your account has been banned. Reason: ${banReason}` 
              : 'Your account has been banned. Please contact support for more information.'
            
            toast.error('Account Banned', {
              description,
              duration: 6000,
            })
            await signOut()
            useStore.getState().logout()
            navigate('/')
            return
          }
          
          try {
            // Fetch updated friends and friend requests with new token
            const friends = await getFriends(session.access_token)
            setFriends(friends.map((f: { id: string }) => f.id))
            
            const requests = await getFriendRequests(session.access_token)
            setFriendRequests(requests)
            
            // Fetch user role from database instead of metadata
            const { isSuperuser, isModerator } = await fetchUserRole(session.user.id)
            
            // Update auth with refreshed token
            setAuth(
              {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || '',
                displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
                avatarUrl: session.user.user_metadata?.avatarUrl,
                decksPublic: session.user.user_metadata?.decksPublic ?? false,
                subscriptionTier: (session.user.user_metadata?.subscriptionTier || 'free') as SubscriptionTier,
                subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry || undefined,
                isSuperuser,
                isModerator,
              },
              session.access_token
            )
          } catch (error) {
            console.error('Failed to update data after token refresh:', error)
          }
        } else if (event === 'SIGNED_IN' && session) {
          // User signed in
          console.log('User signed in')
        }
      }
    )

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleDisplayNameComplete = async (displayName: string) => {
    setIsSettingDisplayName(true)
    try {
      // Get the session directly - don't rely on state!
      const session = await getSession()
      
      if (!session || !session.access_token) {
        toast.error('No authentication token found')
        return
      }
      
      // SET the display name in the database
      await updateProfile(session.user.id, session.access_token, {displayName})
      
      setShowDisplayNameModal(false)
      
      // Refresh user data
      const userProfile = await getUserProfile(session.access_token)
      
      // Fetch user role from database instead of metadata
      const { isSuperuser, isModerator } = await fetchUserRole(session.user.id)
      
      // Update auth with database values
      setAuth(
        {
          id: session.user.id,
          email: session.user.email || '',
          name: userProfile.display_name || '',
          displayName: userProfile.display_name || '',
          avatarUrl: userProfile.avatar_url || session.user.user_metadata?.avatarUrl,
          decksPublic: userProfile.decks_public ?? false,
          subscriptionTier: (session.user.user_metadata?.subscriptionTier || 'free') as SubscriptionTier,
          subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry || undefined,
          isSuperuser,
          isModerator,
        },
        session.access_token
      )
      
      toast.success('Welcome to Flashy!')
      navigate('/decks')
    } catch (error) {
      console.error('Failed to set display name:', error)
      toast.error('Failed to set display name. Please try again.')
    } finally {
      setIsSettingDisplayName(false)
    }
  }

  const checkSession = async () => {
    console.log('checkSession - Starting...')
    try {
      // Check if there's a shared deck in the URL
      const hash = window.location.hash
      const path = window.location.pathname
      const hasSharedDeck = hash.includes('/shared/') || path.includes('/shared/')
      
      console.log('checkSession - hash:', hash, 'path:', path, 'hasSharedDeck:', hasSharedDeck)
      
      console.log('checkSession - Proceeding with auth check')
      const session = await getSession()
      
      if (session && session.user && session.access_token) {
        // Check if user is banned
        if (session.user.user_metadata?.isBanned === true) {
          const banReason = session.user.user_metadata?.banReason || ''
          console.log('=== USER BANNED ===')
          console.log('Banned user session detected during app load')
          console.log('Ban Reason:', banReason || 'No reason provided')
          console.log('User will be signed out automatically.')
          console.log('Please contact support for more information.')
          console.log('==================')
          
          const description = banReason 
            ? `Your account has been banned. Reason: ${banReason}` 
            : 'Your account has been banned. Please contact support for more information.'
          
          toast.error('Account Banned', {
            description,
            duration: 8000,
          })
          
          await signOut()
          setAuth(null, null)
          navigate('/')
          return
        }

        // Verify the token works by trying to fetch friends
        // If it fails, we'll clear the session
        try {
          // Fetch friends and requests in parallel
          const [friends, requests] = await Promise.all([
            getFriends(session.access_token).catch(err => {
              console.log('Failed to fetch friends during session check:', err)
              return [] // Return empty array on error
            }),
            getFriendRequests(session.access_token).catch(err => {
              console.log('Failed to fetch friend requests during session check:', err)
              return [] // Return empty array on error
            })
          ])
          
          console.log('App.tsx - getFriends returned:', friends)
          console.log('App.tsx - Extracting IDs:', friends.map((f: { id: string }) => f.id))
          setFriends(friends.map((f: { id: string }) => f.id)) // Extract just the IDs
          
          console.log('checkSession - Friend requests fetched:', requests)
          setFriendRequests(requests)
          
          // Fetch user role from database instead of metadata
          const { isSuperuser, isModerator } = await fetchUserRole(session.user.id)
          
          // Token is valid, set auth
          setAuth(
            {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || '',
              displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
              avatarUrl: session.user.user_metadata?.avatarUrl,
              decksPublic: session.user.user_metadata?.decksPublic ?? false,
              subscriptionTier: session.user.user_metadata?.subscriptionTier || 'free',
              subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry,
              isSuperuser,
              isModerator,
            },
            session.access_token
          )

          // Check if user needs to set display name (OAuth users with NULL display_name)
          try {
            const userProfile = await getUserProfile(session.access_token)
            console.log('User profile from database:', userProfile)
            
            // Check if display_name is NULL in the database
            if (userProfile && userProfile.display_name === null) {
              console.log('User has NULL display_name, showing modal')
              
              // SET AUTH FIRST so token is available!
              setAuth(
                {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: '',
                  displayName: '',
                  avatarUrl: userProfile.avatar_url || session.user.user_metadata?.avatarUrl,
                  decksPublic: userProfile.decks_public ?? false,
                  subscriptionTier: (session.user.user_metadata?.subscriptionTier || 'free') as SubscriptionTier,
                  subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry || undefined,
                  isSuperuser,
                  isModerator,
                },
                session.access_token
              )
              
              setShowDisplayNameModal(true)
              setCheckingSession(false)
              return
            }
            
            // Update local state with database values if they exist
            if (userProfile) {
              setAuth(
                {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: userProfile.display_name || session.user.user_metadata?.name || '',
                  displayName: userProfile.display_name || session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
                  avatarUrl: userProfile.avatar_url || session.user.user_metadata?.avatarUrl,
                  decksPublic: userProfile.decks_public ?? session.user.user_metadata?.decksPublic ?? false,
                  subscriptionTier: (session.user.user_metadata?.subscriptionTier || 'free') as SubscriptionTier,
                  subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry || undefined,
                  isSuperuser,
                  isModerator,
                },
                session.access_token
              )
            }
          } catch (error) {
            console.error('Failed to fetch user profile for display name check:', error)
            // Continue with normal flow even if this fails
          }

          // Check if we need to record terms acceptance (for Google OAuth users)
          const termsAccepted = sessionStorage.getItem('termsAccepted')
          const termsAcceptedAt = sessionStorage.getItem('termsAcceptedAt')
          if (termsAccepted === 'true' && termsAcceptedAt && !session.user.user_metadata?.termsAcceptedAt) {
            console.log('Recording terms acceptance for Google OAuth user')
            try {
              await recordTermsAcceptance(session.access_token, termsAcceptedAt)
              console.log('Terms acceptance recorded successfully')
            } catch (error) {
              console.error('Failed to record terms acceptance:', error)
            }
            // Clear the flags
            sessionStorage.removeItem('termsAccepted')
            sessionStorage.removeItem('termsAcceptedAt')
          }

          // Check if user was viewing a shared deck before logging in
          const returnToSharedDeck = sessionStorage.getItem('returnToSharedDeck')
          if (returnToSharedDeck) {
            console.log('Returning to shared deck after login:', returnToSharedDeck)
            sessionStorage.removeItem('returnToSharedDeck')
            // Set the hash and directly update sharedDeckId
            window.location.hash = `#/shared/${returnToSharedDeck}`
            // checkingSession will be set to false in finally block
            return
          }

          // If there's a shared deck or payment-success page, don't change the view
          const isPaymentSuccess = hash.includes('/payment-success')
          console.log('checkSession - Navigation decision:', { hasSharedDeck, isPaymentSuccess, willNavigate: !hasSharedDeck && !isPaymentSuccess })
          if (!hasSharedDeck && !isPaymentSuccess) {
            console.log('checkSession - Navigating to /decks')
            navigate('/decks')
          } else {
            console.log('checkSession - Staying on current page')
          }
        } catch (error) {
          // Token is invalid or expired - clear session
          console.log('Session token is invalid or expired, clearing session')
          console.error('Session validation error:', error instanceof Error ? error.message : String(error))
          if (error instanceof Error && error.stack) {
            console.error('Error stack:', error.stack)
          }
          
          try {
            await signOut()
          } catch (signOutError) {
            // Ignore signOut errors - session might already be expired
            console.log('SignOut failed (session likely already expired)')
            console.error('SignOut error details:', signOutError instanceof Error ? signOutError.message : String(signOutError))
          }
          
          // If there's a shared deck, don't redirect - let them view it as guest
          if (!hasSharedDeck) {
            navigate('/')
          }
        }
      } else {
        // No session found - if no shared deck, go to landing page
        if (!hasSharedDeck) {
          navigate('/')
        }
      }
    } catch (error) {
      console.log('Session check completed - no active session')
      console.error('Session check error details:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // On error, check if there's a shared deck
      const hash = window.location.hash
      const path = window.location.pathname
      const hasSharedDeck = hash.includes('/shared/') || path.includes('/shared/')
      
      if (!hasSharedDeck) {
        navigate('/')
      }
    } finally {
      setCheckingSession(false)
    }
  }

  return (
    <>
      {checkingSession ? (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400">Loading...</div>
        </div>
      ) : (
        <>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route path="/decks" element={<ProtectedRoute><DecksScreen /></ProtectedRoute>} />
            <Route path="/deck-detail/:deckId" element={<ProtectedRoute><DeckDetailScreen /></ProtectedRoute>} />
            <Route path="/study-options/:deckId" element={<ProtectedRoute><StudyOptionsScreen /></ProtectedRoute>} />
            {/* Study route without deckId for all-cards and temporary decks */}
            <Route path="/study" element={<ProtectedRoute><StudyScreen /></ProtectedRoute>} />
            {/* Study route with deckId for regular deck study */}
            <Route path="/study/:deckId" element={<ProtectedRoute><StudyScreen /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityScreen /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
            <Route path="/ai-generate" element={<ProtectedRoute><AIGenerateScreen /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><UpgradeModal open={true} onOpenChange={(open) => !open && navigate('/decks')} /></ProtectedRoute>} />
            <Route path="/payment-success" element={<PaymentSuccessScreen />} />
            <Route path="/all-cards" element={<ProtectedRoute><AllCardsScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/superuser" element={<ProtectedRoute><SuperuserScreen /></ProtectedRoute>} />
            <Route path="/moderator" element={<ProtectedRoute><ModeratorScreen /></ProtectedRoute>} />
            <Route path="/privacy" element={<PrivacyPolicyScreen />} />
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="/contact" element={<ContactScreen />} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
            <Route path="/shared/:shareId" element={<SharedDeckRoute />} />
            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={user ? <Navigate to="/decks" replace /> : <LandingPage />} />
          </Routes>
          
          {/* Display name modal for OAuth users */}
          {showDisplayNameModal && (
            <SetDisplayModal 
              onSubmit={handleDisplayNameComplete}
              isLoading={isSettingDisplayName}
            />
          )}
        </>
      )}
      <Toaster position="top-center" richColors />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
