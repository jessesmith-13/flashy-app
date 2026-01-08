import { Button } from '../../ui/button'
import { Star, Users, Plus, Check, Upload, X, MessageCircle, EyeOff } from 'lucide-react'
import { DeckRatingDisplay } from './DeckRatingDisplay'
import { toast } from 'sonner'
import { Deck } from '@/types/decks'
import { UICommunityDeck } from '@/types/community'

interface CommunityDeckCardProps {
  deck: UICommunityDeck
  isAdded: boolean
  isDeleted: boolean
  updateAvailable: boolean
  isSuperuser: boolean
  isOwnDeck: boolean
  addingDeckId: string | null
  deletingDeckId: string | null
  featuringDeckId: string | null
  unpublishingDeckId: string | null
  onViewDeck: (deck: UICommunityDeck) => void
  onViewUser: (userId: string) => void
  onAddDeck: (deck: UICommunityDeck) => void
  onUpdateDeck: (communityDeck: UICommunityDeck, importedDeck: Deck) => void
  onToggleFeatured: (deckId: string) => void
  onDeleteDeck: (deckId: string, deckName: string) => void
  onUnpublishDeck: (deckId: string, deckName: string) => void
  importedDeck?: Deck
  isFeatured?: boolean
}

export function CommunityDeckCard({
  deck,
  isAdded,
  isDeleted,
  updateAvailable,
  isSuperuser,
  isOwnDeck,
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
  onUnpublishDeck,
  importedDeck,
  isFeatured = false
}: CommunityDeckCardProps) {
  const cardClassName = isFeatured
    ? "bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-all border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500"
    : "bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500"

  const getDifficultyEmoji = (difficulty?: string): string => {
    switch (difficulty) {
      case 'beginner': return '🟢'
      case 'intermediate': return '🟡'
      case 'advanced': return '🟠'
      case 'expert': return '🔴'
      default: return '🌈'
    }
  }

  const getDifficultyLabel = (difficulty?: string): string => {
    if (!difficulty) return ''
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  }

  const getDifficultyClassName = (difficulty?: string): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'advanced':
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'expert':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400'
    }
  }

  // Determine button state based on ownership and deck status
  const getButtonState = () => {
    console.log('🔍 Button State Debug:', {
      deckId: deck.id,
      deckName: deck.name,
      isOwnDeck,
      isAdded,
      updateAvailable,
      hasImportedDeck: !!importedDeck
    })

    // Priority 1: Update available (for imported decks only)
    console.log (`Update available?`, updateAvailable)
    console.log (`ImportedDeck?`, importedDeck)
    console.log (`isOwnDeck?`, isOwnDeck)
    console.log (`isAdded?`, isAdded)
    console.log (`isDELETED?`, isDeleted)
    if (updateAvailable && importedDeck) {
      return 'update-available'
    }

    // Priority 2: Own deck scenarios
    if (isOwnDeck) {
      if (!isDeleted) {
        // Own deck, still in personal library → Unpublish only
        return 'own-unpublish'
      } else {
        // Own deck, removed from personal library → Both Add + Unpublish
        return 'own-removed'
      }
    }

    // Priority 3: Other user's deck scenarios
    if (isAdded) {
      // Someone else's deck already added
      return 'already-added'
    } else {
      // Someone else's deck not yet added
      return 'add-to-decks'
    }
  }

  const buttonState = getButtonState()

  return (
    <div className={cardClassName}>
      <button
        onClick={() => onViewDeck(deck)}
        className="w-full text-left mb-4"
      >
        <div className="flex items-start justify-between mb-4 gap-2">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
            style={{ backgroundColor: deck.color || undefined}}
          >
            {deck.emoji}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {deck.featured && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured
              </span>
            )}
            {deck.category && (
              <span className="text-xs px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full truncate max-w-[100px]">
                {deck.category}
              </span>
            )}
            {deck.subtopic && (
              <span className="text-xs px-2 py-0.5 sm:py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full truncate max-w-[100px]">
                {deck.subtopic}
              </span>
            )}
            {deck.difficulty && (
              <span className={`text-xs px-2 py-0.5 sm:py-1 rounded-full truncate max-w-[100px] ${getDifficultyClassName(deck.difficulty)}`}>
                {getDifficultyEmoji(deck.difficulty)} {getDifficultyLabel(deck.difficulty)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1 break-words">{deck.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{deck.cardCount || 0} cards</p>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <DeckRatingDisplay deckId={deck.id} />
          <div className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            <span>{deck.downloadCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{deck.commentCount || 0}</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-0.5">
          {deck.publishedAt && (
            <div>Created: {new Date(deck.publishedAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</div>
          )}
          {deck.publishedAt && (
            <div>Updated: {new Date(deck.updatedAt || deck.publishedAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</div>
          )}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onViewUser(deck.ownerId)
        }}
        className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <Users className="w-4 h-4" />
        <span>by {deck.ownerDisplayName}</span>
      </button>

      {/* Superuser Controls */}
      {isSuperuser && (
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFeatured(deck.id)
            }}
            disabled={featuringDeckId === deck.id}
            className="flex-1 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            title={deck.featured ? 'Unfeature this deck' : 'Feature this deck'}
          >
            <Star className={`w-3 h-3 mr-1 ${deck.featured ? 'fill-current' : ''}`} />
            {featuringDeckId === deck.id ? 'Updating...' : (deck.featured ? 'Unfeature' : 'Feature')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteDeck(deck.id, deck.name)
            }}
            disabled={deletingDeckId === deck.id}
            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            title='Delete this deck'
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Consolidated Button Logic - Now with getButtonState() */}
      {buttonState === 'update-available' && importedDeck ? (
        /* Update available */
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 py-1 px-2 rounded-md">
            <Upload className="w-3 h-3" />
            {isFeatured ? 'Update Available' : `Update Available`}
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onUpdateDeck(deck, importedDeck)
            }}
            disabled={addingDeckId === deck.id}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base h-9 sm:h-10"
          >
            <Upload className="w-4 h-4 mr-2" />
            {addingDeckId === deck.id ? 'Updating...' : 'Update Deck'}
          </Button>
        </div>
      ) : buttonState === 'own-unpublish' ? (
        /* Own deck, still in library - Unpublish only */
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onUnpublishDeck(deck.id, deck.name)
          }}
          disabled={unpublishingDeckId === deck.id}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          <EyeOff className="w-4 h-4 mr-2" />
          {unpublishingDeckId === deck.id ? 'Unpublishing...' : 'Unpublish Deck'}
        </Button>
      ) : buttonState === 'own-removed' ? (
        /* Own deck, removed from library - Both Add + Unpublish */
        <div className="space-y-2">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onAddDeck(deck)
            }}
            disabled={addingDeckId === deck.id}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addingDeckId === deck.id ? 'Adding...' : 'Add to My Decks'}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onUnpublishDeck(deck.id, deck.name)
            }}
            disabled={unpublishingDeckId === deck.id}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            {unpublishingDeckId === deck.id ? 'Unpublishing...' : 'Unpublish Deck'}
          </Button>
        </div>
      ) : buttonState === 'already-added' ? (
        /* Someone else's deck already added */
        <Button
          onClick={(e) => {
            e.stopPropagation()
            toast.info('You have already added this deck')
          }}
          disabled
          className="w-full bg-gray-400 text-white cursor-not-allowed"
        >
          <Check className="w-4 h-4 mr-2" />
          Already Added
        </Button>
      ) : (
        /* Someone else's deck not yet added */
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onAddDeck(deck)
          }}
          disabled={addingDeckId === deck.id}
          className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white ${isFeatured ? 'text-sm sm:text-base h-9 sm:h-10' : ''}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          {addingDeckId === deck.id ? 'Adding...' : 'Add to My Decks'}
        </Button>
      )}
    </div>
  )
}