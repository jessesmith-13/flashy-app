import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

// Map old view names to new routes
const viewToRoute: Record<string, string> = {
  'landing': '/',
  'login': '/login',
  'signup': '/signup',
  'decks': '/decks',
  'deck-detail': '/deck-detail', // Note: This needs deckId param
  'study': '/study', // Note: This needs deckId param
  'study-options': '/study-options', // Note: This needs deckId param
  'community': '/community',
  'profile': '/profile',
  'ai-generate': '/ai-generate',
  'upgrade': '/upgrade',
  'all-cards': '/all-cards',
  'settings': '/settings',
  'superuser': '/superuser',
  'moderator': '/moderator',
  'privacy': '/privacy',
  'terms': '/terms',
  'contact': '/contact',
  'notifications': '/notifications',
}

export function useNavigation() {
  const navigate = useNavigate()
  const { selectedDeckId, temporaryStudyDeck, studyAllCards } = useStore()

  const navigateTo = (view: keyof typeof viewToRoute, options?: { skipDeckIdCheck?: boolean }) => {
    const route = viewToRoute[view]
    
    // For routes that require deckId, append it
    if (view === 'deck-detail' || view === 'study' || view === 'study-options') {
      // If skipDeckIdCheck is true, navigate without deckId (for special study modes)
      if (options?.skipDeckIdCheck) {
        navigate(route)
      } else if (selectedDeckId) {
        navigate(`${route}/${selectedDeckId}`)
      } else {
        // For study route, allow navigation without deckId (supports all-cards and temporary decks)
        // For other routes, warn and redirect
        if (view === 'study') {
          navigate(route)
        } else {
          console.warn(`Attempted to navigate to ${view} without selectedDeckId`)
          // Redirect to decks list if no deck is selected
          navigate('/decks')
        }
      }
    } else {
      navigate(route)
    }
  }

  return { navigateTo, navigate }
}