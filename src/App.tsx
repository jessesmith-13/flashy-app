import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import * as api from '../utils/api'
import LandingPage from './components/Landing/LandingPage'
import { LoginScreen } from './components/Auth/Login/LoginScreen'
import { SignupScreen } from './components/Auth/Signup/SignupScreen'
import { DecksScreen } from './components/Decks/DecksScreen'
import { DeckDetailScreen } from './components/Decks/DeckDetail/DeckDetailScreen'
import { StudyOptionsScreen } from './components/Study/StudyOptionsScreen'
import { StudyScreen } from './components/Study/StudyScreen'
import { CommunityScreen } from './components/Community/CommunityScreen'
import { ProfileScreen } from './components/Profile/ProfileScreen'
import { AIGenerateScreen } from './components/AI/AIGenerateScreen'
import { UpgradeModal } from './components/UpgradeModal'
import { AllCardsScreen } from './components/AllCardsScreen'
import { SettingsScreen } from './components/Settings/SettingsScreen'
import { PrivacyPolicyScreen } from './components/Legal/PrivacyPolicyScreen'
import { TermsScreen } from './components/Legal/TermsScreen'
import { ContactScreen } from './components/Contact/ContactScreen'
import { SharedDeckView } from './components/SharedDeckView'
import { NotificationsScreen } from './components/Notifications/NotificationsScreen'
import  ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from './ui/sonner'
import { useAchievementTracking } from '../hooks/useAchievements'

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

// Main app component that handles session checking
function AppContent() {
  const { setAuth, setFriends, setFriendRequests, darkMode, user } = useStore()
  const [checkingSession, setCheckingSession] = useState(true)
  const navigate = useNavigate()

  // Track achievements
  useAchievementTracking()

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
  }, [])

  const checkSession = async () => {
    console.log('checkSession - Starting...')
    try {
      // Check if there's a shared deck in the URL
      const hash = window.location.hash
      const path = window.location.pathname
      const hasSharedDeck = hash.includes('/shared/') || path.includes('/shared/')
      
      console.log('checkSession - hash:', hash, 'path:', path, 'hasSharedDeck:', hasSharedDeck)
      
      console.log('checkSession - Proceeding with auth check')
      const session = await api.getSession()
      
      if (session && session.user && session.access_token) {
        // Verify the token works by trying to fetch friends
        // If it fails, we'll clear the session
        try {
          const friends = await api.getFriends(session.access_token)
          console.log('App.tsx - getFriends returned:', friends)
          console.log('App.tsx - Extracting IDs:', friends.map(f => f.id))
          setFriends(friends.map(f => f.id)) // Extract just the IDs
          
          const requests = await api.getFriendRequests(session.access_token)
          setFriendRequests(requests)
          
          // Check if user is the Flashy superuser
          const isSuperuser = session.user.email === 'flashy@flashy.app'
          
          // Token is valid, set auth
          setAuth(
            {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || '',
              displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.name || '',
              avatarUrl: session.user.user_metadata?.avatarUrl,
              decksPublic: session.user.user_metadata?.decksPublic ?? true,
              subscriptionTier: session.user.user_metadata?.subscriptionTier || 'free',
              subscriptionExpiry: session.user.user_metadata?.subscriptionExpiry,
              isSuperuser,
            },
            session.access_token
          )

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

          // If there's a shared deck, don't change the view - let SharedDeckView render
          if (!hasSharedDeck) {
            navigate('/decks')
          }
        } catch (error) {
          // Token is invalid or expired - clear session
          console.log('Session token is invalid or expired, clearing session')
          try {
            await api.signOut()
          } catch (signOutError) {
            // Ignore signOut errors - session might already be expired
            console.log('SignOut failed (session likely already expired)')
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
            <Route path="/signup" element={<SignupScreen />} />
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
            <Route path="/all-cards" element={<ProtectedRoute><AllCardsScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/privacy" element={<PrivacyPolicyScreen />} />
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="/contact" element={<ContactScreen />} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
            <Route path="/shared/:shareId" element={<SharedDeckRoute />} />
            {/* Catch-all route for unmatched paths (including preview_page_v2.html) */}
            <Route path="*" element={user ? <Navigate to="/decks" replace /> : <LandingPage />} />
          </Routes>
        </>
      )}
      <Toaster position="top-center" richColors />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}