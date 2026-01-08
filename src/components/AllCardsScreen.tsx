import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useNavigation } from '../../hooks/useNavigation'
import * as api from '../../utils/api'
import { AppLayout } from './Layout/AppLayout'
import { Button } from '../ui/button'
import { ArrowLeft, Play, FlipVertical, CheckCircle, Keyboard } from 'lucide-react'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { Deck } from '@/types/decks'

export function AllCardsScreen() {
  const { accessToken, cards, decks, setCards, setStudyAllCards } = useStore()
  const { navigateTo } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadAllCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAllCards = async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      // Fetch all decks first
      const allDecks = await api.fetchDecks(accessToken)
      
      // Then fetch cards for each deck
      const allCardsPromises = allDecks.map((deck: Deck) => 
        api.fetchCards(accessToken, deck.id)
      )
      const cardsArrays = await Promise.all(allCardsPromises)
      
      // Flatten the arrays
      const allCards = cardsArrays.flat()
      setCards(allCards)
    } catch (error) {
      console.error('Failed to load cards:', error)
      toast.error('Failed to load cards')
    } finally {
      setLoading(false)
    }
  }

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      (card.front?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (card.back?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return matchesSearch
  })

  const getCardTypeIcon = (cardType: string) => {
    switch (cardType) {
      case 'classic-flip':
        return FlipVertical
      case 'multiple-choice':
        return CheckCircle
      case 'type-answer':
        return Keyboard
      default:
        return FlipVertical
    }
  }

  const getDeckName = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId)
    return deck ? deck.name : 'Unknown Deck'
  }

  const getDeckEmoji = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId)
    return deck ? deck.emoji : '📚'
  }

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigateTo('decks')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Flashcards
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">All Cards</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {cards.length} total card{cards.length !== 1 ? 's' : ''} across all decks
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Study All Button */}
          {cards.length > 0 && (
            <div className="mb-6">
              <Button
                onClick={() => {
                  setStudyAllCards(true)
                  navigateTo('study')
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Study All Cards ({cards.length})
              </Button>
            </div>
          )}

          {/* Cards List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading cards...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No cards match your search' : 'No cards yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => {
                const Icon = getCardTypeIcon(card.cardType)
                return (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getDeckEmoji(card.deckId)}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{getDeckName(card.deckId)}</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 mb-1">{card.front}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{card.back}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}