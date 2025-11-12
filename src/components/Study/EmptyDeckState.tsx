import { Button } from '../../ui/button'
import { ArrowLeft } from 'lucide-react'

interface EmptyDeckStateProps {
  excludeIgnored: boolean
  favoritesOnly: boolean
  isTemporaryStudy: boolean
  studyAllCards: boolean
  onBack: () => void
}

export function EmptyDeckState({ 
  excludeIgnored, 
  favoritesOnly, 
  isTemporaryStudy, 
  studyAllCards,
  onBack 
}: EmptyDeckStateProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-6">📭</div>
        <h2 className="text-2xl mb-4 text-gray-900 dark:text-gray-100">No Cards Available</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {excludeIgnored && favoritesOnly 
            ? "No favorite cards are available (all may be ignored)."
            : excludeIgnored 
            ? "All cards are currently ignored."
            : favoritesOnly 
            ? "No cards have been marked as favorites yet."
            : "This deck doesn't have any cards to study yet."}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            onClick={onBack}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isTemporaryStudy ? 'Back to Community' : (studyAllCards ? 'Back to All Cards' : 'Back to Deck')}
          </Button>
          {(excludeIgnored || favoritesOnly) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Try adjusting your study options or marking cards as favorites.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
