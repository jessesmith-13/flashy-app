
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../utils/api'
import './App.css'
import LandingPage from './components/Landing/LandingPage'
import { LoginScreen } from './components/Auth/Login/LoginScreen'
import { SignupScreen } from './components/Auth/Signup/SignupScreen'
import { DecksScreen } from './components/Decks/DecksScreen'
import { UpgradeModal } from './components/UpgradeModal'
import { DeckDetailScreen } from './components/Decks/DeckDetail/DeckDetailScreen'
import { CommunityScreen } from './components/Community/CommunityScreen'
import { Toaster } from './ui/sonner'
import { useAchievementTracking } from '../hooks/useAchievements'
import { StudyScreen } from './components/Study/StudyScreen'
import { StudyOptionsScreen } from './components/Study/StudyOptionsScreen'
import { SettingsScreen } from './components/Settings/SettingsScreen'
import { ProfileScreen } from './components/Profile/ProfileScreen'
import { NotificationsScreen } from './components/Notifications/NotificationsScreen'
import { SharedDeckView } from './components/SharedDeckView'
import { ContactScreen } from './components/Contact/ContactScreen'

export default function App() {
  console.log('App component mounting...')
  const { currentView, setAuth, setCurrentView, updateUser, setFriends, setFriendRequests, darkMode, user } = useStore()
  const [sharedDeckId, setSharedDeckId] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  
  console.log('App state - sharedDeckId:', sharedDeckId, 'checkingSession:', checkingSession, 'currentView:', currentView, 'user:', user ? `logged in as ${user.email}` : 'not logged in')
  
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

  // Clear shared deck when navigating to other views
  useEffect(() => {
    // If currentView changes to something other than the shared deck view
    // and we have a sharedDeckId, clear it and the hash
    if (sharedDeckId && currentView !== 'landing' && currentView !== 'login' && currentView !== 'signup') {
      const hash = window.location.hash
      // Only clear if user is navigating away (not if we're just returning from login)
      if (!hash.includes('/shared/')) {
        console.log('Clearing shared deck state due to view change to:', currentView)
        setSharedDeckId(null)
      }
    }
  }, [currentView])

  useEffect(() => {
    checkForSharedDeck()
    checkSession()
    
    // Listen for hash changes (for navigation within the app)
    const handleHashChange = () => {
      console.log('Hash changed, re-checking for shared deck')
      checkForSharedDeck()
      // Force re-render after hash change by triggering checkingSession briefly
      setCheckingSession(true)
      setTimeout(() => setCheckingSession(false), 100)
    }
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const checkForSharedDeck = () => {
    // Check if URL has /shared/:shareId pattern (path-based) or #/shared/:shareId (hash-based)
    const path = window.location.pathname
    const hash = window.location.hash
    console.log('Checking for shared deck in path:', path, 'hash:', hash)
    
    // Try hash-based routing first (for static deployments)
    const hashMatch = hash.match(/#\/shared\/([^/]+)/)
    if (hashMatch && hashMatch[1]) {
      console.log('Found shared deck ID in hash:', hashMatch[1])
      setSharedDeckId(hashMatch[1])
      // Don't set checkingSession to false here - let checkSession() complete first
      return
    }
    
    // Fall back to path-based routing
    const sharedMatch = path.match(/\/shared\/([^/]+)/)
    if (sharedMatch && sharedMatch[1]) {
      console.log('Found shared deck ID in path:', sharedMatch[1])
      setSharedDeckId(sharedMatch[1])
      // Don't set checkingSession to false here - let checkSession() complete first
    } else {
      console.log('No shared deck found in URL')
      setSharedDeckId(null) // Clear shared deck if not in URL
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
            setSharedDeckId(returnToSharedDeck)
            // checkingSession will be set to false in finally block
            return
          }

          // If there's a shared deck, don't change the view - let SharedDeckView render
          if (!hasSharedDeck) {
            setCurrentView('decks')
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
            setCurrentView('landing')
          }
        }
      } else {
        // No session found - if no shared deck, go to landing page
        if (!hasSharedDeck) {
          setCurrentView('landing')
        }
      }
    } catch (error) {
      console.log('Session check completed - no active session')
      // On error, check if there's a shared deck
      const hash = window.location.hash
      const path = window.location.pathname
      const hasSharedDeck = hash.includes('/shared/') || path.includes('/shared/')
      
      if (!hasSharedDeck) {
        setCurrentView('landing')
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
          {sharedDeckId ? (
            <SharedDeckView 
              shareId={sharedDeckId} 
              onBack={() => {
                setSharedDeckId(null)
                // Clear the hash from URL
                window.location.hash = ''
              }} 
            />
          ) : (
            <>
              {currentView === 'landing' && <LandingPage />}
              {currentView === 'login' && <LoginScreen />}
              {currentView === 'signup' && <SignupScreen />}
              {currentView === 'decks' && <DecksScreen />}
              {currentView === 'deck-detail' && <DeckDetailScreen />}
              {currentView === 'study-options' && <StudyOptionsScreen />}
              {currentView === 'study' && <StudyScreen />}
              {currentView === 'community' && <CommunityScreen />}
              {currentView === 'profile' && <ProfileScreen />}
              {currentView === 'upgrade' && <UpgradeModal open={true} onOpenChange={(open) => !open && setCurrentView('decks')} />}
              {currentView === 'settings' && <SettingsScreen />}
              {currentView === 'contact' && <ContactScreen />}
              {currentView === 'notifications' && <NotificationsScreen />}
            </>
          )}
        </>
      )}
      <Toaster position="top-center" richColors />
    </>
  )
}