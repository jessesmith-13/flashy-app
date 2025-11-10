
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../utils/api'
import './App.css'
import LandingPage from './components/LandingPage'
import { LoginScreen } from './components/LoginScreen'
import { DecksScreen } from './components/DecksScreen'
import { Toaster } from './ui/sonner'
import { useAchievementTracking } from '../hooks/useAchievements'

export default function App() {
  const { currentView, setAuth, setCurrentView, updateUser, setFriends, setFriendRequests, darkMode } = useStore()
  const [sharedDeckId, setSharedDeckId] = useState<string | null>(null)
  
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
    checkForSharedDeck()
  }, [])

  const checkForSharedDeck = () => {
    // Check if URL has /shared/:shareId pattern
    const path = window.location.pathname
    const sharedMatch = path.match(/\/shared\/([^/]+)/)
    if (sharedMatch && sharedMatch[1]) {
      setSharedDeckId(sharedMatch[1])
    }
  }

  const checkSession = async () => {
    try {
      const session = await api.getSession()
      
      if (session && session.user) {
        // Use user metadata directly from session
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
          },
          session.access_token
        )

        // Load friends list
        try {
          const friends = await api.getFriends(session.access_token)
          setFriends(friends)
        } catch (error) {
          console.error('Failed to load friends:', error)
        }

        // Load friend requests
        try {
          const requests = await api.getFriendRequests(session.access_token)
          setFriendRequests(requests)
        } catch (error) {
          console.error('Failed to load friend requests:', error)
        }

        setCurrentView('decks')
      }
    } catch (error) {
      console.error('Session check failed:', error)
    }
  }

  return (
    <>
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'login' && <LoginScreen />}
      {currentView === 'decks' && <DecksScreen />}
      <Toaster position="top-center" richColors />
    </>
  )
}