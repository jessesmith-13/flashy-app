import { Star } from 'lucide-react'
import { CommunityDeckCard } from './CommunityDeckCard'

interface CommunityDeckGridProps {
  decks: any[]
  featuredDecks: any[]
  showFeaturedSection: boolean
  showFeaturedOnly: boolean
  searchQuery: string
  filterCategory: string
  userDecks: any[]
  userId: string | null
  isSuperuser: boolean
  addingDeckId: string | null
  deletingDeckId: string | null
  featuringDeckId: string | null
  unpublishingDeckId: string | null
  onViewDeck: (deck: any) => void
  onViewUser: (userId: string) => void
  onAddDeck: (deck: any) => void
  onUpdateDeck: (communityDeck: any, importedDeck: any) => void
  onToggleFeatured: (deckId: string) => void
  onDeleteDeck: (deckId: string, deckName: string) => void
  onUnpublishDeck: (deckId: string, deckName: string) => void
}

export function CommunityDeckGrid({
  decks,
  featuredDecks,
  showFeaturedSection,
  showFeaturedOnly,
  searchQuery,
  filterCategory,
  userDecks,
  userId,
  isSuperuser,
  addingDeckId,
  deletingDeckId,
  featuringDeckId,
  unpublishingDeckId,
  onViewDeck,
  onViewUser,
  onAddDeck,
  onUpdateDeck,
  onToggleFeatured,
  onDeleteDeck,
  onUnpublishDeck
}: CommunityDeckGridProps) {
  return (
    <>
      {/* Featured Decks Section - Only show when no active search/filters and not in featured-only mode */}
      {showFeaturedSection && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-current" />
            <h2 className="text-xl sm:text-2xl text-gray-900 dark:text-gray-100">Featured Decks</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {featuredDecks.map((deck) => {
              const importedDeck = userDecks.find(d => d.sourceCommunityDeckId === deck.id)
              const isAdded = !!importedDeck
              const updateAvailable = importedDeck && (deck.version || 1) > (importedDeck.communityDeckVersion || 1)
              
              return (
                <CommunityDeckCard
                  key={deck.id}
                  deck={deck}
                  isAdded={isAdded}
                  updateAvailable={updateAvailable}
                  isSuperuser={isSuperuser}
                  isOwnDeck={deck.authorId === userId}
                  addingDeckId={addingDeckId}
                  deletingDeckId={deletingDeckId}
                  featuringDeckId={featuringDeckId}
                  unpublishingDeckId={unpublishingDeckId}
                  onViewDeck={onViewDeck}
                  onViewUser={onViewUser}
                  onAddDeck={onAddDeck}
                  onUpdateDeck={onUpdateDeck}
                  onToggleFeatured={onToggleFeatured}
                  onDeleteDeck={onDeleteDeck}
                  onUnpublishDeck={onUnpublishDeck}
                  importedDeck={importedDeck}
                  isFeatured={true}
                />
              )
            })}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mb-6" />
        </div>
      )}

      {/* Section Headers */}
      {showFeaturedOnly && (
        <div className="mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-current" />
          <h2 className="text-xl text-gray-900 dark:text-gray-100">Featured Decks</h2>
        </div>
      )}
      {!showFeaturedOnly && featuredDecks.length > 0 && !searchQuery && filterCategory === 'all' && (
        <div className="mb-4">
          <h2 className="text-xl text-gray-900 dark:text-gray-100">All Community Decks</h2>
        </div>
      )}
      {!showFeaturedOnly && (searchQuery || filterCategory !== 'all') && (
        <div className="mb-4">
          <h2 className="text-xl text-gray-900 dark:text-gray-100">Search Results</h2>
        </div>
      )}

      {/* Decks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const importedDeck = userDecks.find(d => d.sourceCommunityDeckId === deck.id)
          const isAdded = !!importedDeck
          const updateAvailable = importedDeck && (deck.version || 1) > (importedDeck.communityDeckVersion || 1)
          
          return (
            <CommunityDeckCard
              key={deck.id}
              deck={deck}
              isAdded={isAdded}
              updateAvailable={updateAvailable}
              isSuperuser={isSuperuser}
              isOwnDeck={deck.authorId === userId}
              addingDeckId={addingDeckId}
              deletingDeckId={deletingDeckId}
              featuringDeckId={featuringDeckId}
              unpublishingDeckId={unpublishingDeckId}
              onViewDeck={onViewDeck}
              onViewUser={onViewUser}
              onAddDeck={onAddDeck}
              onUpdateDeck={onUpdateDeck}
              onToggleFeatured={onToggleFeatured}
              onDeleteDeck={onDeleteDeck}
              onUnpublishDeck={onUnpublishDeck}
              importedDeck={importedDeck}
              isFeatured={false}
            />
          )
        })}
      </div>

      {decks.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <p className="text-gray-600 dark:text-gray-400">
            {showFeaturedOnly ? 'No featured decks available' : 'No decks found matching your search'}
          </p>
        </div>
      )}
    </>
  )
}
