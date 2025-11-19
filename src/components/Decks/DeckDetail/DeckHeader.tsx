import { Button } from '../../../ui/button'
import { ArrowLeft, FileEdit, Upload, Trash2, Play, Plus, Crown, Users, Sparkles } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../ui/alert-dialog'
import type { Deck } from '../../../../store/useStore'

interface DeckHeaderProps {
  deck: Deck
  cardCount: number
  onBack: () => void
  onOpenSettings: () => void
  onOpenPublish: () => void
  onDelete: () => void
  onStartStudy: () => void
  onAddCard: () => void
  onAIGenerate: () => void
  deleting: boolean
  canPublish: boolean
  communityDeckAuthor?: { id: string; name: string } | null
}

export function DeckHeader({
  deck,
  cardCount,
  onBack,
  onOpenSettings,
  onOpenPublish,
  onDelete,
  onStartStudy,
  onAddCard,
  onAIGenerate,
  deleting,
  canPublish,
  communityDeckAuthor
}: DeckHeaderProps) {
  return (
    <>
      {/* Back Button */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Decks
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <FileEdit className="w-5 h-5" />
          </Button>

          {/* Only show publish button for decks created by the user (not imported from community) */}
          {!deck.sourceCommunityDeckId && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-emerald-600 hover:text-emerald-700"
              onClick={onOpenPublish}
            >
              <Upload className="w-5 h-5" />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this deck and all its cards. 
                  {deck.communityPublishedId && ' The deck will also be unpublished from the community.'}
                  {' '}This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Delete Deck'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Deck Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
              style={{ backgroundColor: deck.color }}
            >
              {deck.emoji}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl mb-1 text-gray-900 dark:text-gray-100">
                {deck.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-600 dark:text-gray-400">
                  {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                </p>
                {deck.category && (
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                )}
                {deck.category && (
                  <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {deck.category}
                  </span>
                )}
                {deck.subtopic && (
                  <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {deck.subtopic}
                  </span>
                )}
                {deck.difficulty && (
                  <span className={`text-sm px-2 py-0.5 rounded-full ${
                    deck.difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    deck.difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                    deck.difficulty === 'advanced' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                    deck.difficulty === 'expert' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400'
                  }`}>
                    {deck.difficulty === 'beginner' ? '🟢' :
                     deck.difficulty === 'intermediate' ? '🟡' :
                     deck.difficulty === 'advanced' ? '🟠' :
                     deck.difficulty === 'expert' ? '🔴' : '🌈'} {deck.difficulty.charAt(0).toUpperCase() + deck.difficulty.slice(1)}
                  </span>
                )}
                {deck.communityPublishedId && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    <Users className="w-3 h-3" />
                    Published
                  </span>
                )}
                {canPublish && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                )}
              </div>
              {communityDeckAuthor && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Originally created by {communityDeckAuthor.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={onAddCard}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={onAIGenerate}
                className="flex-1 sm:flex-initial sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button
                onClick={onStartStudy}
                disabled={cardCount === 0}
                className="flex-1 sm:flex-initial sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Study
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}