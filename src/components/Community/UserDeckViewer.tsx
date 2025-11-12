import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft, Play } from 'lucide-react'

interface UserDeckViewerProps {
  deck: any
  cards: any[]
  ownerId: string
  isOwner: boolean
  onBack: () => void
  onStudy: (deck: any, cards: any[]) => void
}

export function UserDeckViewer({ deck, cards, ownerId, isOwner, onBack, onStudy }: UserDeckViewerProps) {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Profile
          </button>

          {/* Deck Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{ backgroundColor: deck.color }}
              >
                {deck.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-2">{deck.name}</h1>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
                  {deck.category && (
                    <>
                      <span>•</span>
                      <span>{deck.category}</span>
                    </>
                  )}
                  {deck.subtopic && (
                    <>
                      <span>•</span>
                      <span>{deck.subtopic}</span>
                    </>
                  )}
                </div>
              </div>
              {!isOwner && cards.length > 0 && (
                <Button
                  onClick={() => onStudy(deck, cards)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Study
                </Button>
              )}
            </div>

            {!isOwner && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You're viewing this deck in read-only mode. You can only study the deck, but cannot edit, delete, or publish it.
                </p>
              </div>
            )}
          </div>

          {/* Cards List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">
              Cards ({cards.length})
            </h2>

            {cards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No cards in this deck yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((card, index) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Front</p>
                            {card.frontImageUrl ? (
                              <img
                                src={card.frontImageUrl}
                                alt="Card front"
                                className="w-full max-w-sm rounded-lg border-2 border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <p className="text-gray-900 dark:text-gray-100">{card.front}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Back</p>
                            {card.backImageUrl ? (
                              <img
                                src={card.backImageUrl}
                                alt="Card back"
                                className="w-full max-w-sm rounded-lg border-2 border-gray-200 dark:border-gray-700"
                              />
                            ) : card.cardType === 'multiple-choice' && card.options ? (
                              <ul className="list-disc list-inside space-y-1">
                                {card.options.map((option: string, i: number) => (
                                  <li
                                    key={i}
                                    className={
                                      option === card.back
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }
                                  >
                                    {option} {option === card.back && '✓'}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-900 dark:text-gray-100">{card.back}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
